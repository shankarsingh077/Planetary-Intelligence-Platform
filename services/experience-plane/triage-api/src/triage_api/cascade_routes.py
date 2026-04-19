"""
Cascade Intelligence API Routes

Endpoints:
  POST /v1/cascade/simulate   — Run cascade from a trigger node
  GET  /v1/cascade/graph      — Get full knowledge graph for visualization
  POST /v1/cascade/from-alert — Map alert text → nodes → cascade → AI analysis
"""

import os
import json
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any

from .cascade_engine import analyze_alert_mapping, simulate_cascade, get_graph_json, get_graph

router = APIRouter(prefix="/v1/cascade", tags=["cascade"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


class SimulateRequest(BaseModel):
    trigger: str
    event_description: str = ""
    initial_risk: float = 0.80


class AlertCascadeRequest(BaseModel):
    alert_title: str
    alert_description: str = ""
    alert_severity: str = "high"
    alert_category: str = ""


def _now_iso():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


ENERGY_NODES = {
    "Crude Oil", "Natural Gas", "LNG", "LPG", "Coal", "Oil Prices", "Gas Prices",
    "Diesel Prices", "Jet Fuel Prices", "Energy Supply Chain", "Refining Sector",
    "Power Utilities", "Petrochemical Industry",
}
SHIPPING_NODES = {
    "Global Shipping", "Shipping Rates (BDI)", "Container Freight Rates", "War Risk Insurance",
    "Suez Canal", "Strait of Hormuz", "Bab el-Mandeb", "Malacca Strait", "Panama Canal",
    "Cape of Good Hope", "Taiwan Strait",
}
FOOD_NODES = {
    "Wheat", "Corn", "Rice", "Soybeans", "Palm Oil", "Fertilizers", "Potash",
    "Food Supply Chain", "Food Price Index", "Agriculture Sector", "Coffee", "Sugar",
}
SEMICONDUCTOR_NODES = {
    "Semiconductors", "Semiconductor Supply Chain", "Semiconductor Index", "TSMC",
    "Samsung Foundry", "Intel Fabs", "ASML", "Consumer Electronics", "Automotive Industry",
    "Defense Industry", "Aerospace Industry",
}
MACRO_NODES = {
    "Global Inflation", "Financial Markets", "Global Trade", "US Dollar Index",
}

SPECIFIC_IMPACT_NOTES = {
    "Crude Oil": "Prompt oil cargoes and refinery feedstock pricing would be the first market to reprice.",
    "LPG": "Cooking fuel and petrochemical feedstock markets would tighten quickly, especially for import-heavy Asian buyers.",
    "LNG": "Spot LNG replacement cargoes would become more expensive and harder to secure on short notice.",
    "Natural Gas": "Gas balances would tighten after LNG and pipeline-linked pricing starts moving higher.",
    "Oil Prices": "Benchmark crude would reprice first, lifting transport, fuel, and input costs across the system.",
    "Gas Prices": "Gas-sensitive utilities and industrial buyers would face higher procurement costs within days.",
    "Diesel Prices": "Trucking, farm operations, and industrial logistics usually feel this kind of repricing quickly.",
    "Jet Fuel Prices": "Airlines and air cargo operators would see fuel costs move up before ticket prices fully adjust.",
    "Energy Supply Chain": "Refining, storage, fuel distribution, and cargo scheduling would all absorb the first operational stress.",
    "Refining Sector": "Refiners would face tighter feedstock economics and more volatile product margins.",
    "Power Utilities": "Utilities would have to absorb higher fuel input costs or pass them through into power prices.",
    "Petrochemical Industry": "Chemical producers would face feedstock cost pressure before downstream goods reprice.",
    "Global Shipping": "Expect rerouting, longer voyage times, and more congestion at substitute routes or hubs.",
    "Shipping Rates (BDI)": "Freight benchmarks usually move after rerouting and longer voyages start tying up vessel capacity.",
    "Container Freight Rates": "Container costs would rise as carriers stretch routes, capacity, and insurance assumptions.",
    "War Risk Insurance": "Insurers would likely reprice exposed routes quickly, raising voyage costs even before trade volumes fall.",
    "Industrial Manufacturing": "Manufacturers would face tighter margins from higher power, freight, and input costs.",
    "Agriculture Sector": "Farm economics would come under pressure through fertilizer, diesel, and transport costs.",
    "Food Supply Chain": "Food processors and importers would start absorbing higher freight and input costs.",
    "Food Price Index": "Food inflation usually appears later, once freight, fertilizer, and energy costs flow through inventories.",
    "Global Trade": "Trade volumes usually weaken later, once freight, insurance, and financing costs stay elevated.",
    "Global Inflation": "Broader inflation pressure appears only if the initial shock persists long enough to move through prices and wages.",
    "Financial Markets": "Rates, FX, and equities would react once traders believe the shock will last beyond the initial headline.",
    "Semiconductors": "Chip availability and lead times would tighten fastest for downstream electronics and auto supply chains.",
    "Semiconductor Supply Chain": "Production, packaging, and cross-border delivery lead times would likely lengthen first.",
    "Semiconductor Index": "Semiconductor equities would react quickly to any sign of prolonged production or logistics stress.",
    "Consumer Electronics": "Device makers would face component timing and freight cost pressure before retail prices move.",
    "Automotive Industry": "Automotive production is sensitive to both chip availability and transport delays.",
    "Defense Industry": "Defense suppliers are exposed when electronics, specialty metals, or strategic transport become constrained.",
    "Airlines": "Airlines would face a near-term margin squeeze from higher jet fuel and insurance costs.",
    "Japan": "Japan is highly sensitive to imported oil and LNG disruptions, so replacement cargo costs rise quickly.",
    "India": "India is exposed through imported crude, LPG, and freight costs that feed directly into energy and food bills.",
    "South Korea": "South Korea is highly exposed to imported energy and trade-linked manufacturing costs.",
    "China": "China would feel the shock through commodity imports, industrial inputs, and shipping costs.",
    "Germany": "Germany is exposed through imported energy, manufacturing inputs, and trade-sensitive industry.",
}

GENERIC_TYPE_NOTES = {
    "country": "This country is linked to the disruption through a direct import, production, or logistics dependency in the graph.",
    "index": "This market indicator would move only if the initial shock lasts long enough to change real pricing behavior.",
    "sector": "This sector would absorb the shock through cost, transport, or supply constraints rather than immediate physical disruption.",
    "commodity": "This commodity sits close to the initial shock and would feel price or availability pressure first.",
    "chokepoint": "This route becomes relevant because traffic can be diverted toward or away from it as the disruption evolves.",
    "port": "This port matters as carriers rebalance routes, capacity, and turnaround times.",
    "company": "This company is exposed because it sits on a concentrated part of the supply chain.",
}


def _dedupe_lines(items: list[str], limit: int) -> list[str]:
    seen: set[str] = set()
    lines: list[str] = []
    for item in items:
        if not item or item in seen:
            continue
        seen.add(item)
        lines.append(item)
        if len(lines) >= limit:
            break
    return lines


def _infer_themes(results: list[dict[str, Any]]) -> set[str]:
    themes: set[str] = set()
    for result in results:
        node = result.get("node", "")
        if node in ENERGY_NODES:
            themes.add("energy")
        if node in SHIPPING_NODES:
            themes.add("shipping")
        if node in FOOD_NODES:
            themes.add("food")
        if node in SEMICONDUCTOR_NODES:
            themes.add("chips")
        if node in MACRO_NODES:
            themes.add("macro")
    return themes


def _impact_note_for_result(result: dict[str, Any]) -> str:
    node = result.get("node", "")
    node_type = result.get("type", "")
    return SPECIFIC_IMPACT_NOTES.get(node, GENERIC_TYPE_NOTES.get(node_type, "This node becomes more exposed as the disruption propagates outward."))


def _compose_outlook_line(result: dict[str, Any]) -> str:
    return f"{result['node']}: {_impact_note_for_result(result)}"


def _select_exposure_lines(results: list[dict[str, Any]], limit: int = 4) -> list[str]:
    prioritized = (
        [result for result in results if result.get("type") == "country"]
        + [result for result in results if result.get("type") == "sector"]
        + [result for result in results if result.get("type") == "index"]
    )
    if not prioritized:
        prioritized = results
    return _dedupe_lines([_compose_outlook_line(result) for result in prioritized], limit)


def _build_watch_items(trigger: str, themes: set[str], results: list[dict[str, Any]]) -> list[str]:
    watch_items: list[str] = []
    if trigger in SHIPPING_NODES:
        watch_items.append("Track rerouting, transit delays, and whether alternate lanes start adding days to voyage times.")
    if "energy" in themes:
        watch_items.append("Watch prompt crude, LNG, diesel, and jet fuel repricing along with any refinery run cuts.")
    if "shipping" in themes:
        watch_items.append("Watch war-risk insurance quotes, freight benchmarks, and congestion at substitute ports or canals.")
    if "food" in themes:
        watch_items.append("Watch fertilizer costs, grain export restrictions, and food import tenders in exposed buyers.")
    if "chips" in themes:
        watch_items.append("Watch fab utilization, export-control headlines, and lead-time changes for auto and electronics customers.")
    if "macro" in themes or any(result.get("type") == "index" for result in results[:8]):
        watch_items.append("Watch whether the shock broadens into inflation expectations, FX moves, or wider risk-off pricing.")
    if not watch_items:
        watch_items.append("Watch whether the headline develops into a real outage, closure, rerouting event, or sustained price move.")
    return _dedupe_lines(watch_items, 5)


def _build_operator_brief(
    trigger: str,
    results: list[dict[str, Any]],
    timeline: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    immediate = timeline.get("immediate", [])[:4]
    short_term = timeline.get("short_term", [])[:4]
    long_term = timeline.get("long_term", [])[:4]
    themes = _infer_themes(results[:15])

    first_wave = ", ".join(item["node"] for item in immediate[:3]) or "the closest downstream nodes"
    second_wave = ", ".join(item["node"] for item in short_term[:3]) or "broader trade and pricing channels"
    headline = f"Likely next effects: {first_wave}"
    summary = (
        f"If disruption around {trigger} persists, the first wave is most likely to hit {first_wave}. "
        f"Over the next several days, pressure is likely to spread into {second_wave}."
    )

    why_fragments: list[str] = []
    if "energy" in themes:
        why_fragments.append("energy and fuel costs")
    if "shipping" in themes:
        why_fragments.append("shipping, insurance, and transit times")
    if "food" in themes:
        why_fragments.append("food and fertilizer costs")
    if "chips" in themes:
        why_fragments.append("electronics and automotive supply")
    if "macro" in themes:
        why_fragments.append("broader inflation and trade conditions")
    why_it_matters = (
        "This matters because the shock can spread from a local trigger into "
        + ", ".join(why_fragments)
        + "."
    ) if why_fragments else "This matters if the disruption stops being a headline and starts changing physical flows, prices, or lead times."

    return {
        "headline": headline,
        "summary": summary,
        "what_changes_now": _dedupe_lines([_compose_outlook_line(item) for item in immediate], 4),
        "near_future": _dedupe_lines([_compose_outlook_line(item) for item in short_term], 4),
        "if_disruption_lasts": _dedupe_lines([_compose_outlook_line(item) for item in long_term], 4),
        "exposed_entities": _select_exposure_lines(results[:12], limit=4),
        "watch_items": _build_watch_items(trigger, themes, results),
        "why_it_matters": why_it_matters,
    }


def _build_no_cascade_brief(mapping: dict[str, Any]) -> dict[str, Any]:
    reason = mapping.get("reason", "The alert does not yet map cleanly to an operational disruption.")
    return {
        "headline": "No operational cascade yet",
        "summary": reason,
        "what_changes_now": [],
        "near_future": [],
        "if_disruption_lasts": [],
        "exposed_entities": [],
        "watch_items": [
            "Wait for explicit signs of closure, rerouting, outage, sanctions, export controls, or supply disruption.",
            "Headlines naming ports, straits, pipelines, factories, commodities, or benchmark prices will produce more useful cascade results.",
        ],
        "why_it_matters": "This headline reads as legal, political, or general reporting rather than a direct disruption to transport, energy, supply, or markets.",
    }


@router.post("/simulate")
async def cascade_simulate(req: SimulateRequest):
    """Run cascade simulation from a trigger node."""
    try:
        results = simulate_cascade(
            trigger_node=req.trigger,
            initial_risk=req.initial_risk,
            include_reverse=False,
        )

        if not results:
            # Try to find closest matching node
            G = get_graph()
            trigger_lower = req.trigger.lower()
            candidates = [n for n in G.nodes() if trigger_lower in n.lower()]
            if candidates:
                results = simulate_cascade(candidates[0], req.initial_risk, include_reverse=False)

        results = _decorate_cascade_results(results, min_risk=0.05)

        # Get subgraph for visualization (only affected nodes + trigger)
        affected_nodes = [req.trigger] + [r["node"] for r in results[:30]]
        graph_data = _get_subgraph(affected_nodes)

        # Group by time horizon
        immediate = [r for r in results if r["depth"] <= 1]
        short_term = [r for r in results if 1 < r["depth"] <= 3]
        long_term = [r for r in results if r["depth"] > 3]
        timeline = {
            "immediate": immediate[:10],
            "short_term": short_term[:10],
            "long_term": long_term[:10],
        }
        operator_brief = _build_operator_brief(
            req.trigger,
            results,
            timeline,
        )

        # Generate AI analysis if Gemini available
        ai_analysis = ""
        if GEMINI_API_KEY and req.event_description:
            ai_analysis = await _generate_cascade_analysis(
                req.trigger, req.event_description, results[:15]
            )

        return {
            "success": True,
            "trigger": req.trigger,
            "event_description": req.event_description,
            "total_affected": len(results),
            "cascade_results": results[:30],  # Top 30
            "timeline": timeline,
            "graph_data": graph_data,
            "operator_brief": operator_brief,
            "ai_analysis": ai_analysis,
            "timestamp": _now_iso(),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/graph")
async def cascade_graph():
    """Get the full knowledge graph for visualization."""
    try:
        data = get_graph_json()
        return {
            "success": True,
            "data": data,
            "timestamp": _now_iso(),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/from-alert")
async def cascade_from_alert(req: AlertCascadeRequest):
    """Map an alert to graph nodes and run an evidence-backed cascade."""
    try:
        mapping = analyze_alert_mapping(
            req.alert_title,
            req.alert_description,
            req.alert_category,
        )
        matched_nodes = mapping["matched_nodes"]

        if not matched_nodes or not mapping["should_simulate"]:
            return {
                "success": False,
                "error": mapping["reason"],
                "suggestion": (
                    "Cascade activates only when the alert names affected infrastructure, commodities, ports, "
                    "shipping lanes, strategic producers, or other graph-backed disruption signals."
                ),
                "analysis_mode": "graph_evidence",
                "matched_nodes": matched_nodes,
                "match_evidence": mapping["matched_evidence"],
                "candidate_evidence": mapping["candidate_evidence"],
                "operator_brief": _build_no_cascade_brief(mapping),
                "evidence_report": _build_evidence_report(mapping, []),
                "timestamp": _now_iso(),
            }

        # Step 2: Run cascade from the primary trigger node
        primary_trigger = matched_nodes[0]
        match_types = {item["node"]: item.get("type", "") for item in mapping["matched_evidence"]}
        risk_by_severity = {
            "critical": 0.90, "high": 0.80, "medium": 0.60, "low": 0.40
        }
        initial_risk = risk_by_severity.get(req.alert_severity, 0.70)

        results = simulate_cascade(primary_trigger, initial_risk, include_reverse=False)

        # Also run cascades from secondary nodes and merge
        for secondary in matched_nodes[1:]:
            if match_types.get(secondary) == "country":
                continue
            secondary_results = simulate_cascade(secondary, initial_risk * 0.7, include_reverse=False)
            for r in secondary_results:
                existing = next((x for x in results if x["node"] == r["node"]), None)
                if existing:
                    existing["risk"] = max(existing["risk"], r["risk"])
                    existing["risk_pct"] = round(existing["risk"] * 100, 1)
                    if existing["risk"] == r["risk"]:
                        existing["path"] = r.get("path", existing.get("path", []))
                        existing["path_edges"] = r.get("path_edges", existing.get("path_edges", []))
                else:
                    results.append(r)

        results.sort(key=lambda x: x["risk"], reverse=True)
        results = _decorate_cascade_results(results, min_risk=0.10)

        if not results:
            return {
                "success": False,
                "error": "The alert mapped into the graph, but there are no downstream evidence-backed impacts above the risk threshold yet.",
                "suggestion": "Wait for more explicit disruption details or try a more operational headline tied to routes, commodities, or infrastructure.",
                "analysis_mode": "graph_evidence",
                "matched_nodes": matched_nodes,
                "match_evidence": mapping["matched_evidence"],
                "candidate_evidence": mapping["candidate_evidence"],
                "primary_trigger": primary_trigger,
                "operator_brief": {
                    "headline": f"No material downstream impacts yet from {primary_trigger}",
                    "summary": "The alert matches the graph, but the current disruption signal is still too weak to produce high-confidence downstream effects above the display threshold.",
                    "what_changes_now": [],
                    "near_future": [],
                    "if_disruption_lasts": [],
                    "exposed_entities": [],
                    "watch_items": [
                        "Watch for explicit closures, export controls, supply outages, rerouting, or sustained price moves.",
                        "A more operational follow-up headline will produce a more useful cascade.",
                    ],
                    "why_it_matters": "The model is intentionally withholding weak downstream claims until the disruption signal gets stronger.",
                },
                "evidence_report": _build_evidence_report(mapping, []),
                "timestamp": _now_iso(),
            }

        # Step 3: Get subgraph
        affected_nodes = matched_nodes + [r["node"] for r in results[:25]]
        graph_data = _get_subgraph(affected_nodes)

        # Step 4: Group by timeline
        immediate = [r for r in results if r["depth"] <= 1]
        short_term = [r for r in results if 1 < r["depth"] <= 3]
        long_term = [r for r in results if r["depth"] > 3]
        timeline = {
            "immediate": immediate[:8],
            "short_term": short_term[:8],
            "long_term": long_term[:8],
        }
        operator_brief = _build_operator_brief(
            primary_trigger,
            results,
            timeline,
        )

        return {
            "success": True,
            "analysis_mode": "graph_evidence",
            "alert": {
                "title": req.alert_title,
                "severity": req.alert_severity,
                "category": req.alert_category,
            },
            "matched_nodes": matched_nodes,
            "match_evidence": mapping["matched_evidence"],
            "candidate_evidence": mapping["candidate_evidence"],
            "primary_trigger": primary_trigger,
            "total_affected": len(results),
            "cascade_results": results[:30],
            "timeline": timeline,
            "graph_data": graph_data,
            "operator_brief": operator_brief,
            "ai_analysis": "",
            "evidence_report": _build_evidence_report(mapping, results),
            "timestamp": _now_iso(),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def _get_subgraph(node_ids: list[str]) -> dict:
    """Extract a subgraph containing only the given nodes + their interconnections."""
    G = get_graph()
    node_set = set(n for n in node_ids if n in G)
    nodes = []
    for n in node_set:
        data = G.nodes[n]
        nodes.append({
            "id": n,
            "type": data.get("type", "unknown"),
            "icon": {"country": "🌍", "chokepoint": "⚓", "commodity": "📦",
                     "infrastructure": "🏭", "sector": "📊", "port": "🚢",
                     "company": "🏢", "index": "📈"}.get(data.get("type", ""), "❓"),
        })
    edges = []
    for u, v, data in G.edges(data=True):
        if u in node_set and v in node_set:
            edges.append({
                "source": u,
                "target": v,
                "weight": data.get("weight", 0.5),
                "type": data.get("type", "unknown"),
            })
    return {"nodes": nodes, "edges": edges}


def _format_path_summary(result: dict[str, Any]) -> str:
    path = result.get("path", [])
    if len(path) < 2:
        return ""

    path_edges = result.get("path_edges", [])
    if not path_edges:
        return " -> ".join(path[:4])

    def edge_phrase(edge_type: str) -> str:
        return {
            "production": "feeds",
            "export": "exports into",
            "transit": "moves through",
            "gateway": "funnels into",
            "import_dependency": "exposes",
            "import": "supplies",
            "supply": "supplies",
            "input": "feeds",
            "transport": "moves into",
            "cost": "raises cost in",
            "enabler": "enables",
            "pricing": "reprices",
            "market": "moves",
            "manufacturing": "feeds",
            "nearshoring": "supports",
        }.get(edge_type, edge_type.replace("_", " "))

    segments = []
    for edge in path_edges[:4]:
        segments.append(f"{edge['source']} {edge_phrase(edge.get('type', 'unknown'))} {edge['target']}")
    return " -> ".join(segments)


def _decorate_cascade_results(results: list[dict[str, Any]], min_risk: float) -> list[dict[str, Any]]:
    decorated: list[dict[str, Any]] = []
    for result in results:
        if result.get("risk", 0) < min_risk:
            continue
        entry = dict(result)
        entry["evidence_path"] = entry.get("path_edges", [])
        entry["evidence_summary"] = _format_path_summary(entry)
        entry["impact_note"] = _impact_note_for_result(entry)
        decorated.append(entry)
    return decorated


def _build_evidence_report(mapping: dict[str, Any], results: list[dict[str, Any]]) -> dict[str, Any]:
    matched_nodes = mapping.get("matched_nodes", [])
    if results:
        primary_trigger = matched_nodes[0] if matched_nodes else "the trigger"
        first_wave = ", ".join(result["node"] for result in results[:3]) or "the closest downstream nodes"
        next_wave = ", ".join(result["node"] for result in results[3:6]) or "broader follow-on effects"
        summary = (
            f"The model has enough evidence to run a cascade from {primary_trigger}. "
            f"The strongest early pressure points are {first_wave}, followed by {next_wave} if the disruption persists."
        )
    else:
        summary = mapping.get(
            "reason",
            "The alert does not yet have enough graph-backed disruption evidence to justify a cascade.",
        )

    mapping_basis = []
    for item in mapping.get("matched_evidence", []):
        terms = ", ".join(item.get("matched_terms", []) or ["direct match"])
        mapping_basis.append(f"{item['node']} matched via {terms}.")

    strongest_paths = []
    for result in results[:5]:
        if result.get("evidence_summary"):
            strongest_paths.append(
                f"{result['node']}: {result['evidence_summary']} ({result['risk_pct']}% risk, {result['time_label']})"
            )

    caveats = ["Only graph-backed paths are shown here. The route no longer promotes LLM-only node guesses."]
    if mapping.get("domain_terms"):
        caveats.append(f"Operational signal terms detected: {', '.join(mapping['domain_terms'][:5])}.")
    if mapping.get("disruption_terms"):
        caveats.append(f"Disruption terms detected: {', '.join(mapping['disruption_terms'][:5])}.")
    if mapping.get("blocker_terms"):
        caveats.append(f"Non-operational blocker terms detected: {', '.join(mapping['blocker_terms'][:5])}.")

    return {
        "summary": summary,
        "mapping_basis": mapping_basis,
        "strongest_paths": strongest_paths,
        "caveats": caveats,
        "relevance_score": mapping.get("relevance_score", 0),
        "domain_terms": mapping.get("domain_terms", []),
        "disruption_terms": mapping.get("disruption_terms", []),
        "blocker_terms": mapping.get("blocker_terms", []),
    }


async def _generate_cascade_analysis(trigger: str, event_desc: str, results: list) -> str:
    """Use Gemini to generate an intelligence analysis of the cascade."""
    if not GEMINI_API_KEY:
        return ""

    top_risks = "\n".join([
        f"- {r['node']} ({r['type']}): {r['risk_pct']}% risk, {r['time_label']}"
        for r in results[:12]
    ])

    prompt = f"""You are a geopolitical intelligence analyst. Analyze this cascade of risks:

TRIGGER EVENT: {event_desc or trigger}
TRIGGER NODE: {trigger}

CASCADE RESULTS (top affected entities):
{top_risks}

Generate a concise intelligence briefing with:
1. SITUATION SUMMARY (2-3 sentences)
2. IMMEDIATE RISKS (0-7 days) — top 3-4 risks with probability
3. SHORT-TERM CASCADE (7-30 days) — downstream effects
4. LONG-TERM STRUCTURAL IMPACTS (1-6 months) — if the situation persists
5. KEY MONITORING INDICATORS — what to watch

Keep it professional, concise, and actionable. Use bullet points.
Total length: 300-500 words max."""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.4, "maxOutputTokens": 1500},
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        pass
    return ""


async def _ai_map_alert(alert_text: str) -> list[str]:
    """Use Gemini to map an alert to knowledge graph nodes."""
    if not GEMINI_API_KEY:
        return []

    G = get_graph()
    node_list = ", ".join(list(G.nodes())[:80])

    prompt = f"""Given this intelligence alert:
"{alert_text}"

Which of these knowledge graph nodes are DIRECTLY affected?
Available nodes: {node_list}

Return ONLY a JSON array of 1-5 node names, most relevant first.
Example: ["Iran", "Strait of Hormuz", "Crude Oil"]"""

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 200},
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                # Extract JSON array from response
                import re
                match = re.search(r'\[.*?\]', text, re.DOTALL)
                if match:
                    nodes = json.loads(match.group())
                    return [n for n in nodes if n in G]
    except Exception:
        pass
    return []
