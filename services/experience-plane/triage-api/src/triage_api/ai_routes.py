"""
ai_routes.py — Gemini AI-powered intelligence endpoints

Provides real AI analysis using Google Gemini 2.5 Flash Preview.
Generates strategic insights, probability forecasts, and intelligence briefs
from live event data.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter

from .cache import cache

router = APIRouter(prefix="/v1/ai", tags=["ai"])

GEMINI_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ok(data: Any, source: str = "gemini") -> dict:
    return {"success": True, "data": data, "source": source, "timestamp": _now_iso()}


def _fail(error: str) -> dict:
    return {"success": False, "data": None, "source": "gemini", "error": error, "timestamp": _now_iso()}


async def _call_gemini(prompt: str, system_instruction: str = "") -> dict | None:
    """Call Google Gemini API and return parsed JSON response."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return None

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-preview-04-17")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    payload: dict[str, Any] = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 4096,
            "responseMimeType": "application/json",
        },
    }

    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    try:
        async with httpx.AsyncClient(timeout=GEMINI_TIMEOUT) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            result = resp.json()

        # Extract text from Gemini response
        candidates = result.get("candidates", [])
        if not candidates:
            return None

        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        if not text:
            return None

        # Parse JSON from response
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown code block
        if "```json" in text:
            json_str = text.split("```json")[1].split("```")[0].strip()
            return json.loads(json_str)
        elif "```" in text:
            json_str = text.split("```")[1].split("```")[0].strip()
            return json.loads(json_str)
        return None
    except Exception:
        return None


async def _gather_live_context() -> str:
    """Gather current live event data for AI context."""
    from .live_routes import live_events
    try:
        events_resp = await live_events()
        events = events_resp.get("data", []) if events_resp.get("success") else []
        if events:
            summaries = []
            for ev in events[:15]:
                summaries.append(
                    f"- [{ev.get('severity', 'medium').upper()}] {ev.get('source', 'Unknown')}: "
                    f"{ev.get('title', 'No title')} | Location: {ev.get('location', 'Unknown')}"
                )
            return "\n".join(summaries)
    except Exception:
        pass
    return "No live event data currently available."


# ──────────────────────────────────────────────────────────────────────────────
# Strategic Insights
# ──────────────────────────────────────────────────────────────────────────────

INSIGHTS_SYSTEM = """You are a senior geopolitical intelligence analyst at a global situational awareness platform.
Your role is to synthesize raw event feeds into strategic insights that decision-makers can act on.
Always be factual, cite the events you're analyzing, and provide actionable analysis.
Never fabricate events or data — only analyze what is provided."""

INSIGHTS_PROMPT_TEMPLATE = """Based on these current intelligence events, generate exactly 3 strategic insights.

CURRENT EVENTS:
{events}

For each insight, provide:
- title: A concise headline (max 15 words)
- summary: 2-3 sentence analysis of what's happening
- why_it_matters: 1-2 sentences on strategic significance
- likely_next: 1-2 sentences on probable next developments (48-72h)
- confidence: Integer 0-100 representing analytical confidence
- region: Primary geographic region affected
- category: One of: "Energy Security", "Conflict", "Economic", "Technology", "Maritime", "Cyber"

Return as a JSON array of 3 objects."""


@router.post("/insights")
async def generate_insights():
    """Generate strategic insights using Gemini AI based on current live events."""
    cached = cache.get("ai_insights", ttl_seconds=900)  # 15-min cache
    if cached:
        return cached

    context = await _gather_live_context()
    prompt = INSIGHTS_PROMPT_TEMPLATE.format(events=context)

    result = await _call_gemini(prompt, INSIGHTS_SYSTEM)
    if result and isinstance(result, list) and len(result) > 0:
        response = _ok(result, "gemini_ai")
        cache.set("ai_insights", response)
        return response

    return _fail("Gemini API unavailable or returned invalid response")


# ──────────────────────────────────────────────────────────────────────────────
# Probability Forecasts
# ──────────────────────────────────────────────────────────────────────────────

FORECAST_SYSTEM = """You are a superforecaster specializing in geopolitical and economic probability estimation.
Apply calibrated probabilistic reasoning. Base estimates on historical base rates, current indicators, and trend analysis.
Be precise with probabilities and clearly articulate your reasoning chain."""

FORECAST_PROMPT_TEMPLATE = """Based on these current events and your knowledge, estimate probabilities for these scenarios.

CURRENT EVENTS:
{events}

SCENARIOS TO ASSESS:
1. Major China-Taiwan military escalation (12 months)
2. Iran achieves nuclear breakout capability (6 months)
3. Russia-NATO direct military confrontation (12 months)
4. Global recession - GDP contraction in 3+ major economies (18 months)
5. Oil price spike above $150/barrel (6 months)
6. Major cyber attack on US critical infrastructure (12 months)

For each scenario, provide:
- scenario: The scenario description
- category: One of "Conflict", "Proliferation", "Economic", "Energy", "Cyber"
- probability: Integer 0-100 (calibrated estimate)
- timeframe: The assessment timeframe
- factors: Array of 3 key contributing factors
- direction: "increasing", "stable", or "decreasing" vs prior assessment

Return as a JSON array of 6 objects."""


@router.post("/forecast")
async def generate_forecasts():
    """Generate probability forecasts using Gemini AI."""
    cached = cache.get("ai_forecasts", ttl_seconds=1800)  # 30-min cache
    if cached:
        return cached

    context = await _gather_live_context()
    prompt = FORECAST_PROMPT_TEMPLATE.format(events=context)

    result = await _call_gemini(prompt, FORECAST_SYSTEM)
    if result and isinstance(result, list) and len(result) > 0:
        response = _ok(result, "gemini_ai")
        cache.set("ai_forecasts", response)
        return response

    return _fail("Gemini API unavailable or returned invalid response")


# ──────────────────────────────────────────────────────────────────────────────
# Intelligence Brief
# ──────────────────────────────────────────────────────────────────────────────

BRIEF_SYSTEM = """You are the lead briefer for a strategic intelligence watch floor.
Write concise, structured intelligence briefs suitable for senior decision-makers.
Use clear, direct language. Prioritize actionable information. No speculation — only analysis."""

BRIEF_PROMPT_TEMPLATE = """Generate a 30-second intelligence brief based on these current events.

CURRENT EVENTS:
{events}

Provide:
- headline: A single-sentence headline capturing the most critical development
- changed: Array of 3-5 key changes/developments in the last period
- stable: Array of 2-3 ongoing situations that remain unchanged
- watchlist: Array of 2-3 emerging situations to monitor
- risk_assessment: Brief overall risk paragraph (2-3 sentences)

Return as a single JSON object."""


@router.post("/brief")
async def generate_brief():
    """Generate a 30-second intelligence brief from live data."""
    cached = cache.get("ai_brief", ttl_seconds=900)
    if cached:
        return cached

    context = await _gather_live_context()
    prompt = BRIEF_PROMPT_TEMPLATE.format(events=context)

    result = await _call_gemini(prompt, BRIEF_SYSTEM)
    if result and isinstance(result, dict):
        response = _ok(result, "gemini_ai")
        cache.set("ai_brief", response)
        return response

    return _fail("Gemini API unavailable or returned invalid response")
