import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "globe.gl";
import type { GlobeInstance } from "globe.gl";
import type { Alert } from "./types";
import { EARTH_BUMP_URL, EARTH_TEXTURE_URL, loadCountriesGeoJson } from "./mapAssets";
import { resolveAlertGeo, resolveCascadeNodeGeo, seededCoordinates } from "./liveAlertUtils";

interface CascadeResult {
  node: string;
  type: string;
  icon: string;
  risk: number;
  risk_pct: number;
  depth: number;
  time_label: string;
  path: string[];
  evidence_path?: CascadePathEdge[];
  evidence_summary?: string;
  impact_note?: string;
}

interface CascadeNode {
  id: string;
  type: string;
  icon: string;
}

interface CascadeEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
}

interface CascadePathEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
  direction?: string;
}

interface MatchEvidence {
  node: string;
  type: string;
  score: number;
  direct: boolean;
  strategic_links: number;
  accepted?: boolean;
  matched_terms: string[];
  reasons: string[];
}

interface EvidenceReport {
  summary: string;
  mapping_basis: string[];
  strongest_paths: string[];
  caveats: string[];
  relevance_score: number;
  domain_terms: string[];
  disruption_terms: string[];
  blocker_terms: string[];
}

interface OperatorBrief {
  headline: string;
  summary: string;
  what_changes_now: string[];
  near_future: string[];
  if_disruption_lasts: string[];
  exposed_entities: string[];
  watch_items: string[];
  why_it_matters: string;
}

interface CascadeData {
  success: boolean;
  error?: string;
  suggestion?: string;
  analysis_mode?: string;
  trigger?: string;
  primary_trigger?: string;
  total_affected?: number;
  cascade_results?: CascadeResult[];
  timeline?: {
    immediate: CascadeResult[];
    short_term: CascadeResult[];
    long_term: CascadeResult[];
  };
  graph_data?: {
    nodes: CascadeNode[];
    edges: CascadeEdge[];
  };
  ai_analysis?: string;
  matched_nodes?: string[];
  match_evidence?: MatchEvidence[];
  candidate_evidence?: MatchEvidence[];
  evidence_report?: EvidenceReport;
  operator_brief?: OperatorBrief;
}

interface CascadePageProps {
  alert: Alert;
  onClose: () => void;
}

interface GlobePointDatum {
  id: string;
  kind: string;
  lat: number;
  lng: number;
  altitude: number;
  radius: number;
  color: string;
  label: string;
}

interface GlobeArcDatum {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  altitude: number;
  stroke: number;
  dashLength: number;
  dashGap: number;
  dashAnimateTime: number;
  color: string;
  label: string;
}

interface GlobeRingDatum {
  id: string;
  lat: number;
  lng: number;
  altitude: number;
  color: string;
  maxRadius: number;
  speed: number;
  period: number;
}

interface GlobeLabelDatum {
  id: string;
  lat: number;
  lng: number;
  text: string;
  color: string;
  altitude: number;
  size: number;
}

function riskColor(risk: number): string {
  if (risk >= 0.7) return "#ff4444";
  if (risk >= 0.5) return "#ff8800";
  if (risk >= 0.3) return "#ffaa00";
  if (risk >= 0.15) return "#44aaff";
  return "#44ff88";
}

function severityColor(severity: string | undefined): string {
  if (severity === "critical") return "#ff4444";
  if (severity === "high") return "#ff8800";
  if (severity === "medium") return "#ffaa00";
  return "#44aa44";
}

function escapeHtml(value: string | undefined): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPct(value: number | undefined): string {
  return `${Math.round((value || 0) * 100)}%`;
}

function tuneNodeShape(altitude: number, radius: number): Pick<GlobePointDatum, "altitude" | "radius"> {
  return {
    altitude: altitude * 0.42,
    radius: radius * 1.55,
  };
}

function isSameLocation(a: { lat: number; lon: number }, b: { lat: number; lon: number }): boolean {
  return Math.abs(a.lat - b.lat) < 0.3 && Math.abs(a.lon - b.lon) < 0.3;
}

function formatAlertTimestamp(timestamp: string | undefined): string {
  const parsed = Date.parse(timestamp || "");
  if (!Number.isFinite(parsed)) return "Live";
  return new Date(parsed).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function triggerLabelHtml(alert: Alert, nodeLabel: string): string {
  return `
    <div style="min-width:240px;background:rgba(7,11,19,0.96);border:1px solid rgba(255,90,90,0.24);padding:12px 13px;border-radius:10px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:${severityColor(alert.severity)};margin-bottom:6px;">LIVE TRIGGER</div>
      <div style="font-size:13px;font-weight:700;line-height:1.45;margin-bottom:6px;">${escapeHtml(alert.snapshot || nodeLabel)}</div>
      <div style="font-size:10px;color:#97a3b6;">${escapeHtml(nodeLabel)}${alert.source ? ` | ${escapeHtml(alert.source)}` : ""}</div>
    </div>
  `;
}

function impactLabelHtml(result: CascadeResult): string {
  return `
    <div style="min-width:220px;background:rgba(7,11,19,0.96);border:1px solid rgba(68,255,136,0.18);padding:12px 13px;border-radius:10px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:${riskColor(result.risk)};margin-bottom:6px;">CASCADE IMPACT</div>
      <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${escapeHtml(result.node)}</div>
      <div style="font-size:10px;color:#97a3b6;margin-bottom:4px;">${escapeHtml(result.type.toUpperCase())} | ${escapeHtml(result.time_label)}</div>
      <div style="font-size:11px;color:#d7dfef;">Risk ${escapeHtml(String(result.risk_pct))}%</div>
      ${result.impact_note ? `<div style="font-size:10px;color:#d7dfef;line-height:1.45;margin-top:6px;">${escapeHtml(result.impact_note)}</div>` : ""}
      ${result.evidence_summary ? `<div style="font-size:10px;color:#97a3b6;line-height:1.45;margin-top:6px;">${escapeHtml(result.evidence_summary)}</div>` : ""}
    </div>
  `;
}

function matchedNodeLabelHtml(nodeName: string): string {
  return `
    <div style="min-width:200px;background:rgba(7,11,19,0.96);border:1px solid rgba(102,224,255,0.18);padding:12px 13px;border-radius:10px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#66e0ff;margin-bottom:6px;">MATCHED ENTITY</div>
      <div style="font-size:13px;font-weight:700;">${escapeHtml(nodeName)}</div>
    </div>
  `;
}

function arcLabelHtml(title: string, body: string, color: string): string {
  return `
    <div style="min-width:210px;background:rgba(7,11,19,0.96);border:1px solid rgba(68,255,136,0.18);padding:12px 13px;border-radius:10px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:${color};margin-bottom:6px;">${escapeHtml(title)}</div>
      <div style="font-size:11px;line-height:1.5;color:#d7dfef;">${escapeHtml(body)}</div>
    </div>
  `;
}

function buildCascadeDescription(alert: Alert): string {
  const rawSignals = (alert.drivers || []).filter((driver) => {
    const normalized = driver.toLowerCase();
    return (
      !normalized.endsWith(" headline") &&
      !normalized.startsWith("location:") &&
      !normalized.startsWith("category:") &&
      !normalized.startsWith("updated:")
    );
  });

  return rawSignals.slice(0, 2).join(". ");
}

export function CascadePage({ alert, onClose }: CascadePageProps) {
  const [data, setData] = useState<CascadeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countriesGeoJson, setCountriesGeoJson] = useState<any>(null);
  const [selectedOverlayHtml, setSelectedOverlayHtml] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeInstance | null>(null);

  const triggerGeo = useMemo(
    () => resolveAlertGeo(alert) || seededCoordinates(alert.alert_id || alert.snapshot || "live-trigger"),
    [alert]
  );
  const cascadeDescription = useMemo(() => buildCascadeDescription(alert), [alert]);
  const triggerNodeLabel = data?.primary_trigger || data?.matched_nodes?.[0] || alert.snapshot || "Trigger";

  useEffect(() => {
    let cancelled = false;

    loadCountriesGeoJson()
      .then((geoData) => {
        if (!cancelled) setCountriesGeoJson(geoData);
      })
      .catch((error) => {
        console.warn("[CascadePage] Failed to load countries GeoJSON:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchCascade = async () => {
      setLoading(true);
      setSelectedOverlayHtml(null);

      try {
        const response = await fetch("/v1/cascade/from-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alert_title: alert.snapshot || "",
            alert_description: cascadeDescription,
            alert_severity: alert.severity || "high",
            alert_category: alert.category || "",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`cascade_request_failed:${response.status}`);
        }

        const json = (await response.json()) as CascadeData;
        if (!controller.signal.aborted) {
          setData(json);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setData({
            success: false,
            error: error instanceof Error ? error.message : "Cascade request failed",
            matched_nodes: [],
            cascade_results: [],
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchCascade();
    return () => controller.abort();
  }, [alert, cascadeDescription]);

  const countryPolygons = useMemo(() => {
    const features = countriesGeoJson?.features || [];
    return features.filter((feature: any) => feature?.properties?.ISO_A2 !== "AQ");
  }, [countriesGeoJson]);

  const visuals = useMemo(() => {
    const triggerColor = severityColor(alert.severity);
    const triggerPoint: GlobePointDatum = {
      id: "cascade-trigger",
      kind: "trigger",
      lat: triggerGeo.lat,
      lng: triggerGeo.lon,
      ...tuneNodeShape(0.12, 0.22),
      color: triggerColor,
      label: triggerLabelHtml(alert, triggerNodeLabel),
    };

    const matchedNodes = (data?.matched_nodes || []).slice(0, 6);
    const matchedPoints: GlobePointDatum[] = matchedNodes.slice(1).map((nodeName, index) => {
      const nodeGeo = resolveCascadeNodeGeo(nodeName, "matched", triggerGeo);
      return {
        id: `matched-${nodeName}-${index}`,
        kind: "matched",
        lat: nodeGeo.lat,
        lng: nodeGeo.lon,
        ...tuneNodeShape(0.08, 0.16),
        color: "#66e0ff",
        label: matchedNodeLabelHtml(nodeName),
      };
    }).filter((point) => !isSameLocation({ lat: point.lat, lon: point.lng }, triggerGeo));

    const impactResults = (data?.cascade_results || []).slice(0, 18);
    const impactPoints: GlobePointDatum[] = impactResults.map((result, index) => {
      const nodeGeo = resolveCascadeNodeGeo(result.node, result.type, triggerGeo);
      return {
        id: `impact-${result.node}-${index}`,
        kind: "impact",
        lat: nodeGeo.lat,
        lng: nodeGeo.lon,
        ...tuneNodeShape(
          result.depth <= 1 ? 0.1 : result.depth <= 3 ? 0.085 : 0.072,
          result.risk >= 0.6 ? 0.18 : result.risk >= 0.35 ? 0.15 : 0.12
        ),
        color: riskColor(result.risk),
        label: impactLabelHtml(result),
      };
    }).filter((point) => !isSameLocation({ lat: point.lat, lon: point.lng }, triggerGeo));

    const incomingArcs: GlobeArcDatum[] = matchedPoints.map((point, index) => ({
      id: `incoming-${point.id}`,
      startLat: point.lat,
      startLng: point.lng,
      endLat: triggerGeo.lat,
      endLng: triggerGeo.lon,
      altitude: 0.22 + (index % 3) * 0.03,
      stroke: 0.55,
      dashLength: 0.36,
      dashGap: 0.14,
      dashAnimateTime: 1600,
      color: "#66e0ff",
      label: arcLabelHtml("Inbound Signal", `${matchedNodes[index + 1] || "Matched node"} is feeding into the trigger cascade.`, "#66e0ff"),
    }));

    const outgoingArcs: GlobeArcDatum[] = impactResults.map((result, index) => {
      const target = resolveCascadeNodeGeo(result.node, result.type, triggerGeo);
      return {
        id: `outgoing-${result.node}-${index}`,
        startLat: triggerGeo.lat,
        startLng: triggerGeo.lon,
        endLat: target.lat,
        endLng: target.lon,
        altitude: Math.min(0.34, 0.16 + result.depth * 0.05),
        stroke: result.risk >= 0.6 ? 0.72 : result.risk >= 0.35 ? 0.58 : 0.46,
        dashLength: 0.42,
        dashGap: 0.18,
        dashAnimateTime: 1400 + result.depth * 220,
        color: riskColor(result.risk),
        label: arcLabelHtml(
          "Cascade Ray",
          result.evidence_summary || `${result.node} shows ${result.risk_pct}% risk in the ${result.time_label.toLowerCase()} horizon.`,
          riskColor(result.risk)
        ),
      };
    }).filter((arc) => !isSameLocation({ lat: arc.endLat, lon: arc.endLng }, triggerGeo));

    const rings: GlobeRingDatum[] = [
      {
        id: "trigger-ring",
        lat: triggerGeo.lat,
        lng: triggerGeo.lon,
        altitude: 0.048,
        color: triggerColor,
        maxRadius: 3.1,
        speed: 1.15,
        period: 1700,
      },
      ...impactResults.slice(0, 4).map((result, index) => {
        const geo = resolveCascadeNodeGeo(result.node, result.type, triggerGeo);
        return {
          id: `impact-ring-${index}`,
          lat: geo.lat,
          lng: geo.lon,
          altitude: 0.034,
          color: riskColor(result.risk),
          maxRadius: 1.45,
          speed: 0.8,
          period: 2400 + index * 300,
        };
      }),
    ];

    const labels: GlobeLabelDatum[] = [
      {
        id: "label-trigger",
        lat: triggerGeo.lat,
        lng: triggerGeo.lon,
        text: "Trigger",
        color: triggerColor,
        altitude: 0.078,
        size: 0.42,
      },
      ...impactResults.slice(0, 8).map((result, index) => {
        const geo = resolveCascadeNodeGeo(result.node, result.type, triggerGeo);
        return {
          id: `label-${index}`,
          lat: geo.lat,
          lng: geo.lon,
          text: result.node.length > 20 ? `${result.node.slice(0, 18)}...` : result.node,
          color: riskColor(result.risk),
          altitude: 0.062,
          size: 0.31,
        };
      }),
    ];

    return {
      points: [triggerPoint, ...matchedPoints, ...impactPoints],
      arcs: [...incomingArcs, ...outgoingArcs],
      rings,
      labels,
    };
  }, [alert, data, triggerGeo, triggerNodeLabel]);

  useEffect(() => {
    if (!containerRef.current || globeRef.current) return;

    const element = containerRef.current;
    const globe = new Globe(element);

    globe
      .globeImageUrl(EARTH_TEXTURE_URL)
      .bumpImageUrl(EARTH_BUMP_URL)
      .backgroundImageUrl("")
      .atmosphereColor("#3388ff")
      .atmosphereAltitude(0.22)
      .width(element.clientWidth)
      .height(element.clientHeight);

    try {
      const scene = globe.scene();
      const THREE = (window as any).THREE;
      if (scene && THREE?.Color) {
        scene.background = new THREE.Color(0x050911);
      }
    } catch {
      // Ignore background tweaks if THREE is not available on window.
    }

    const controls = globe.controls() as any;
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.26;
      controls.enablePan = false;
      controls.enableZoom = true;
      controls.zoomSpeed = 0.9;
      controls.minDistance = 150;
      controls.maxDistance = 430;
      controls.enableDamping = true;
    }

    const resizeObserver = new ResizeObserver(() => {
      if (element.clientWidth > 0 && element.clientHeight > 0) {
        globe.width(element.clientWidth).height(element.clientHeight);
      }
    });
    resizeObserver.observe(element);

    globeRef.current = globe;

    return () => {
      resizeObserver.disconnect();
      globe._destructor();
      globeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    globe
      .polygonsData(countryPolygons)
      .polygonAltitude(0.004)
      .polygonCapColor(() => "rgba(60, 200, 120, 0.08)")
      .polygonSideColor(() => "rgba(60, 200, 120, 0.03)")
      .polygonStrokeColor(() => "rgba(68, 255, 136, 0.2)")
      .polygonsTransitionDuration(0);
  }, [countryPolygons]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    globe
      .pointsData(visuals.points)
      .pointLat("lat")
      .pointLng("lng")
      .pointColor("color")
      .pointAltitude("altitude")
      .pointRadius("radius")
      .pointResolution(12)
      .pointLabel("label")
      .pointsMerge(false)
      .pointsTransitionDuration(0)
      .onPointClick((point: any) => {
        if (point?.label) {
          setSelectedOverlayHtml(point.label);
        }
      })
      .arcsData(visuals.arcs)
      .arcStartLat("startLat")
      .arcStartLng("startLng")
      .arcEndLat("endLat")
      .arcEndLng("endLng")
      .arcAltitude("altitude")
      .arcStroke("stroke")
      .arcColor("color")
      .arcLabel("label")
      .arcDashLength("dashLength")
      .arcDashGap("dashGap")
      .arcDashAnimateTime("dashAnimateTime")
      .arcsTransitionDuration(0)
      .onArcClick((arc: any) => {
        if (arc?.label) {
          setSelectedOverlayHtml(arc.label);
        }
      })
      .ringsData(visuals.rings)
      .ringLat("lat")
      .ringLng("lng")
      .ringAltitude("altitude")
      .ringColor("color")
      .ringMaxRadius("maxRadius")
      .ringPropagationSpeed("speed")
      .ringRepeatPeriod("period")
      .labelsData(visuals.labels)
      .labelLat("lat")
      .labelLng("lng")
      .labelText("text")
      .labelColor("color")
      .labelAltitude("altitude")
      .labelSize("size")
      .labelIncludeDot(false)
      .labelsTransitionDuration(0);

    globe.pointOfView(
      {
        lat: triggerGeo.lat,
        lng: triggerGeo.lon,
        altitude: 1.85,
      },
      1100
    );
  }, [triggerGeo, visuals]);

  const cascadeNodesCount = data?.cascade_results?.length || 0;
  const matchedNodesCount = data?.match_evidence?.length || data?.matched_nodes?.length || 0;
  const evidenceItems = data?.match_evidence?.length ? data.match_evidence : data?.candidate_evidence || [];
  const signalTerms = [
    ...(data?.evidence_report?.domain_terms || []).map((term) => ({ label: term, kind: "Operational" })),
    ...(data?.evidence_report?.disruption_terms || []).map((term) => ({ label: term, kind: "Disruption" })),
    ...(data?.evidence_report?.blocker_terms || []).map((term) => ({ label: term, kind: "Blocked By" })),
  ];

  return (
    <div className="cascade-page">
      <div className="cascade-header">
        <button className="cascade-back-btn" onClick={onClose}>
          Back to Dashboard
        </button>
        <h1 className="cascade-title">LIVE CASCADE GLOBE</h1>
        <div className="cascade-stats">
          <span className="cascade-stat">{cascadeNodesCount} cascade nodes</span>
          <span className="cascade-stat">{matchedNodesCount || 1} trigger matches</span>
        </div>
      </div>

      <div className="cascade-trigger-card">
        <div className="trigger-severity" style={{ background: severityColor(alert.severity) }}>
          {(alert.severity || "high").toUpperCase()}
        </div>
        <div className="trigger-content">
          <h2>{alert.snapshot || "Alert trigger"}</h2>
          <p>{cascadeDescription || "Tracking live trigger conditions."}</p>
        </div>
        <div className="trigger-meta">
          <span>{alert.source || "Live feed"}</span>
          <span>{formatAlertTimestamp(alert.timestamp)}</span>
          <span>Confidence {formatPct(alert.confidence)}</span>
          {alert.link ? (
            <a href={alert.link} target="_blank" rel="noreferrer" className="cascade-trigger-link">
              Open source
            </a>
          ) : null}
        </div>
      </div>

      <div className="cascade-body">
        <div className="cascade-globe-panel">
          <h3>Live Cascade Globe</h3>
          <div className="cascade-globe-stage">
            <div ref={containerRef} className="cascade-globe" />

            {loading ? (
              <div className="cascade-loading">
                <div className="cascade-loading-spinner" />
                <span>Projecting live rays across the globe...</span>
              </div>
            ) : null}

            {!loading && data?.success === false ? (
              <div className="cascade-empty-state">
                <strong>{data.operator_brief?.headline || "Could not map this alert cleanly into the cascade graph."}</strong>
                <span>{data.operator_brief?.summary || data.evidence_report?.summary || data.error || "The trigger is still pinned on the globe so you can retry from another live headline."}</span>
                {data.suggestion ? <span>{data.suggestion}</span> : null}
              </div>
            ) : null}

            {selectedOverlayHtml ? (
              <div className="cascade-detail-card" dangerouslySetInnerHTML={{ __html: selectedOverlayHtml }} />
            ) : null}
          </div>

          <div className="cascade-legend">
            <span><span className="legend-dot" style={{ background: severityColor(alert.severity) }} />Trigger</span>
            <span><span className="legend-dot" style={{ background: "#66e0ff" }} />Inbound matches</span>
            <span><span className="legend-dot" style={{ background: "#ff8800" }} />Cascade rays</span>
            <span><span className="legend-dot" style={{ background: "#44aaff" }} />Downstream nodes</span>
          </div>
        </div>

        <div className="cascade-right-panel">
          <div className="cascade-timeline">
            <h3>Impact Timeline</h3>
            {data?.timeline ? (
              <>
                <TimelineSection
                  title="Immediate (0-7 days)"
                  items={data.timeline.immediate}
                  color="#ff4444"
                />
                <TimelineSection
                  title="Short-Term (7-30 days)"
                  items={data.timeline.short_term}
                  color="#ff8800"
                />
                <TimelineSection
                  title="Long-Term (1-6 months)"
                  items={data.timeline.long_term}
                  color="#44aaff"
                />
              </>
            ) : (
              <div className="timeline-section">
                <span className="timeline-empty">Waiting for mapped cascade impacts...</span>
              </div>
            )}
          </div>

          <div className="cascade-ai-analysis">
            <h3>Operational Outlook</h3>
            <div className="ai-analysis-content">
              <p className="evidence-summary">
                {data?.operator_brief?.headline ||
                  "Live cascade notes will appear here when the alert maps cleanly into the knowledge graph."}
              </p>
              {data?.operator_brief?.summary ? (
                <p className="briefing-summary">{data.operator_brief.summary}</p>
              ) : null}
              {data?.operator_brief?.why_it_matters ? (
                <div className="briefing-why">
                  <h4>Why This Matters</h4>
                  <p>{data.operator_brief.why_it_matters}</p>
                </div>
              ) : null}

              <BriefingList title="What Changes Now" items={data?.operator_brief?.what_changes_now} />
              <BriefingList title="Next 7-30 Days" items={data?.operator_brief?.near_future} />
              <BriefingList title="If The Disruption Lasts" items={data?.operator_brief?.if_disruption_lasts} />
              <BriefingList title="Most Exposed" items={data?.operator_brief?.exposed_entities} />
              <BriefingList title="What To Watch" items={data?.operator_brief?.watch_items} />

              <div className="evidence-group">
                <h4>Why The Model Triggered</h4>
                <p className="evidence-subsummary">
                  {data?.evidence_report?.summary ||
                    "Graph-backed evidence will appear here when the alert maps cleanly into the knowledge graph."}
                </p>
              </div>

              {evidenceItems.length ? (
                <div className="evidence-group">
                  <h4>{data?.match_evidence?.length ? "Matched Graph Signals" : "Signals Seen In The Headline"}</h4>
                  <div className="evidence-list">
                    {evidenceItems.map((item) => (
                      <EvidenceCard key={`${item.node}-${item.score}`} item={item} />
                    ))}
                  </div>
                </div>
              ) : null}

              {data?.evidence_report?.strongest_paths?.length ? (
                <div className="evidence-group">
                  <h4>Evidence Trail</h4>
                  <div className="evidence-path-list">
                    {data.evidence_report.strongest_paths.map((pathLine, index) => (
                      <p key={`${pathLine}-${index}`}>{pathLine}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {signalTerms.length ? (
                <div className="evidence-group">
                  <h4>Signal Terms</h4>
                  <div className="evidence-chip-row">
                    {signalTerms.map((item, index) => (
                      <span key={`${item.kind}-${item.label}-${index}`} className="evidence-chip">
                        {item.kind}: {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {data?.evidence_report?.caveats?.length ? (
                <div className="evidence-group">
                  <h4>Guardrails</h4>
                  {data.evidence_report.caveats.map((line, index) => (
                    <p key={`${line}-${index}`}>{line}</p>
                  ))}
                </div>
              ) : null}

              {data?.suggestion ? <p className="evidence-suggestion">{data.suggestion}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineSection({ title, items, color }: { title: string; items: CascadeResult[]; color: string }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="timeline-section">
      <h4 style={{ color }}>{title}</h4>
      <div className="timeline-items">
        {items.map((item) => (
          <div key={`${item.node}-${item.time_label}`} className="timeline-item">
            <div className="timeline-dot" style={{ background: riskColor(item.risk) }} />
            <div className="timeline-item-content">
              <div className="timeline-item-head">
                <span className="timeline-node">{item.icon} {item.node}</span>
                <span className="timeline-risk" style={{ color: riskColor(item.risk) }}>
                  {item.risk_pct}% risk
                </span>
              </div>
              {item.impact_note ? (
                <span className="timeline-note">{item.impact_note}</span>
              ) : null}
              {item.evidence_summary ? (
                <span className="timeline-path">{item.evidence_summary}</span>
              ) : null}
            </div>
            <span className="timeline-time">{item.time_label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BriefingList({ title, items }: { title: string; items: string[] | undefined }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="evidence-group">
      <h4>{title}</h4>
      <div className="briefing-list">
        {items.map((item, index) => (
          <p key={`${title}-${index}`} className="briefing-line">{item}</p>
        ))}
      </div>
    </div>
  );
}

function EvidenceCard({ item }: { item: MatchEvidence }) {
  return (
    <div className="evidence-card">
      <div className="evidence-card-header">
        <span className="evidence-card-node">{item.node}</span>
        <span className="evidence-card-score">Score {Math.round(item.score * 100)}%</span>
      </div>
      <div className="evidence-card-meta">
        {item.type.toUpperCase()} {item.direct ? " | Direct match" : ""} {item.strategic_links ? ` | ${item.strategic_links} graph links` : ""}
      </div>
      {item.reasons.map((reason, index) => (
        <p key={`${reason}-${index}`} className="evidence-card-reason">{reason}</p>
      ))}
      {item.matched_terms.length ? (
        <div className="evidence-chip-row">
          {item.matched_terms.map((term) => (
            <span key={term} className="evidence-chip">{term}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
