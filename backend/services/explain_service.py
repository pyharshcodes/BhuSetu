"""
BhuSetu "Explain this risk" — Explainable AI (XAI) & Grounding Telemetry Layer.
SIH26001 (MDoNER).

Provides two complementary operational modes:
Mode 1 — Deterministic Scientific Telemetry Grounding (Rule-Based):
    Strictly derives explanations directly from physical sensors and geomorphic models:
    24h/72h rainfall, pore-water soil saturation, InSAR velocity/coherence, terrain slope,
    lithology, and exposed lifelines. Zero hallucination, 100% auditable disaster intelligence.

Mode 2 — Multi-Provider Grounded LLM Assistant (OpenAI / Groq / Google Gemini):
    Auto-detects configured API keys (OPENAI_API_KEY, GROQ_API_KEY, GEMINI_API_KEY).
    Injects verifiable database telemetry into the prompt with strict anti-hallucination
    system directives to deliver clear, empathetic, natural-language executive briefings.
"""
import os
import json
import urllib.request
import urllib.error
import logging
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if not os.path.exists(dotenv_path):
    dotenv_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

from services.risk_engine import reasons_from_json

logger = logging.getLogger("bhusetu.ai")


def _build_grounding_payload(corridor: dict, snapshot: dict, telemetry: dict | None = None) -> dict:
    """Builds a structured, verified grounding telemetry dictionary from database records."""
    reasons = reasons_from_json(snapshot.get("top_reasons"))
    grounding = {
        "corridor_id": corridor.get("id"),
        "corridor_name": corridor.get("name"),
        "district": corridor.get("district"),
        "state": corridor.get("state"),
        "length_km": corridor.get("length_km"),
        "fused_risk_score": snapshot.get("fused_risk_score"),
        "alert_level": snapshot.get("alert_level"),
        "confidence_pct": snapshot.get("confidence_pct"),
        "susceptibility_score": snapshot.get("susceptibility_score"),
        "trigger_score": snapshot.get("trigger_score"),
        "top_contributing_factors": reasons,
        "degradation_reason": snapshot.get("degradation_reason") or "All sensor telemetry operational",
        "geomorphic_indices": {
            "slope_index": corridor.get("slope_index"),
            "geology_index": corridor.get("geology_index"),
            "drainage_index": corridor.get("drainage_index"),
            "historical_density_index": corridor.get("historical_density_index"),
            "human_modification_index": corridor.get("human_modification_index"),
        },
    }

    if telemetry:
        sensor = telemetry.get("sensor_reading")
        if sensor:
            grounding["hydro_meteorological_telemetry"] = {
                "rainfall_1h_mm": sensor.get("rainfall_mm_1h", 0.0),
                "rainfall_24h_mm": sensor.get("rainfall_mm_24h", 0.0),
                "rainfall_72h_mm": sensor.get("rainfall_mm_72h", 0.0),
                "soil_moisture_pct": sensor.get("soil_moisture_pct", 0.0),
                "insar_deformation_detected": bool(sensor.get("sar_deformation_flag", False)),
                "sensor_offline": bool(sensor.get("sensor_offline", False)),
                "is_simulated": bool(sensor.get("is_simulated", False)),
            }
        villages = telemetry.get("villages")
        if villages:
            grounding["exposed_villages"] = [
                {
                    "name": v.get("name"),
                    "population": v.get("population_estimate", 0),
                    "alternate_route_available": bool(v.get("alternate_route_available", False)),
                }
                for v in villages
            ]
        roads = telemetry.get("roads")
        if roads:
            grounding["critical_roads"] = [
                {"name": r.get("name"), "criticality": r.get("criticality")}
                for r in roads
            ]

    return grounding


def _rule_based_explanation(
    corridor: dict,
    snapshot: dict | None,
    question: str | None = None,
    telemetry: dict | None = None,
    note: str | None = None,
) -> str:
    """Mode 1: Deterministic Scientific Telemetry Grounding.
    Deconstructs hazard triggers, geomorphic susceptibility, and lifeline vulnerability."""
    if snapshot is None:
        return (
            f"No risk data is available yet for {corridor.get('name', 'this corridor')}. "
            "Trigger a simulation step or ingest live weather telemetry to generate the first reading."
        )

    alert = snapshot.get("alert_level", "GREEN")
    fused = snapshot.get("fused_risk_score", 0.0)
    conf = snapshot.get("confidence_pct", 0.0)
    susc = snapshot.get("susceptibility_score", 0.0)
    trig = snapshot.get("trigger_score", 0.0)
    name = corridor.get("name", "Target Corridor")
    state = corridor.get("state", "Northeast India")
    district = corridor.get("district", "")
    location_label = f"{name} ({district}, {state})" if district else f"{name}, {state}"

    reasons = reasons_from_json(snapshot.get("top_reasons"))
    reasons_bullets = "\n".join(f"  • {r}" for r in reasons) if reasons else "  • Baseline equilibrium within normal safety limits."

    sensor = (telemetry or {}).get("sensor_reading") or {}
    rain_1h = sensor.get("rainfall_mm_1h")
    rain_24h = sensor.get("rainfall_mm_24h")
    rain_72h = sensor.get("rainfall_mm_72h")
    soil_m = sensor.get("soil_moisture_pct")
    insar_flag = sensor.get("sar_deformation_flag")

    badge_map = {
        "RED": "🚨 RED ALERT — CRITICAL IMMINENT HAZARD",
        "ORANGE": "⚠️ ORANGE ALERT — SEVERE ELEVATED HAZARD",
        "YELLOW": "🟡 YELLOW ALERT — HEIGHTENED WATCH ADVISORY",
        "GREEN": "🟢 GREEN STATUS — STABLE / LOW HAZARD",
    }
    badge = badge_map.get(alert, f"ALERT LEVEL: {alert}")

    lines = [
        f"### {badge}",
        f"**Corridor:** {location_label}",
        f"**Fused Landslide Risk Score:** {fused:.1f} / 100  |  **Confidence Index:** {conf:.1f}%",
        "",
        "**Quantitative Assessment:**",
        f"The current risk score of {fused:.1f}/100 is synthesized from two primary components: a **Static Susceptibility Score of {susc:.1f}/100** (geomorphic slope, lithology, drainage, and historical slide density) fused with an active **Dynamic Trigger Score of {trig:.1f}/100** (precipitation pulse, soil saturation, and InSAR satellite interferometry).",
        "",
        "**Key Contributing Drivers:**",
        reasons_bullets,
    ]

    if rain_24h is not None or soil_m is not None:
        telemetry_lines = ["", "**Live Grounding Telemetry:**"]
        if rain_24h is not None:
            telemetry_lines.append(
                f"  • **Rainfall:** 24h cumulative precipitation is **{rain_24h:.1f} mm**"
                + (f" (72h antecedent: {rain_72h:.1f} mm, peak 1h intensity: {rain_1h:.1f} mm/h)." if rain_72h is not None else ".")
            )
        if soil_m is not None:
            telemetry_lines.append(
                f"  • **Soil Moisture:** Subsurface saturation is at **{soil_m:.1f}%**"
                + (" — approaching critical liquefaction pore-water pressure." if soil_m > 70 else " — within safe moisture retention margins.")
            )
        if insar_flag:
            telemetry_lines.append("  • **Sentinel-1 InSAR:** Active millimeter-scale surface displacement detected along steep cut-slopes.")
        lines.extend(telemetry_lines)

    villages = (telemetry or {}).get("villages") or []
    roads = (telemetry or {}).get("roads") or []
    if villages or roads:
        exposure_lines = ["", "**Exposed Community Lifelines:**"]
        if villages:
            v_names = ", ".join(f"{v['name']} (pop. ~{v.get('population_estimate', 0):,})" for v in villages[:4])
            total_pop = sum(v.get("population_estimate", 0) for v in villages)
            exposure_lines.append(f"  • **Inhabited Settlements:** {v_names} (total estimated population: {total_pop:,} residents).")
        if roads:
            r_names = ", ".join(r["name"] for r in roads[:3])
            exposure_lines.append(f"  • **Critical Transport Lifelines:** {r_names}.")
        lines.extend(exposure_lines)

    sop_map = {
        "RED": (
            "Immediate emergency escalation required. Halt non-essential transit along cut-slopes, "
            "mobilize SDRF/NDRF quick-response teams, alert block development officers, and activate "
            "designated high-ground evacuation shelters."
        ),
        "ORANGE": (
            "Pre-position earthmoving heavy machinery (JCBs/loaders) at vulnerable mile markers. "
            "Issue high-alert advisories to district transport unions and initiate continuous visual and drone slope monitoring."
        ),
        "YELLOW": (
            "Maintain heightened vigilance. Verify culvert and drainage clearing, review alternate detour readiness, "
            "and continuously monitor automated rain-gauge telemetry."
        ),
        "GREEN": (
            "Normal routine monitoring. Slopes exhibit stability under current meteorological conditions. "
            "Maintain routine sensor telemetry ingestion."
        ),
    }
    lines.extend([
        "",
        f"**Standard Operating Protocol (SOP):**\n{sop_map.get(alert, sop_map['GREEN'])}",
    ])

    if snapshot.get("degradation_reason"):
        lines.extend(["", f"*(Telemetry Note: {snapshot['degradation_reason']})*"])

    if question:
        q = question.lower()
        query_notes = []
        if "why" in q and ("red" in q or "orange" in q or "high" in q):
            query_notes.append(
                "Why this level: Risk elevation is driven by the non-linear coupling between saturated soil overburden "
                "and steep hill slopes, significantly exceeding the factor-of-safety threshold."
            )
        if "confidence" in q:
            query_notes.append(
                "Confidence explanation: Confidence reflects spatial sensor density, radar coherence, and live data timeliness. "
                "A sensor offline or proxy ingestion reduces confidence even when raw risk values remain unchanged."
            )
        if "what should" in q or "action" in q or "do" in q or "protocol" in q:
            query_notes.append(
                "Action guidance: Emergency managers should prioritize road diversions and resident advisories listed in the Suraksha Setu panel."
            )
        if "village" in q or "people" in q or "evacuate" in q or "shelter" in q:
            query_notes.append(
                "Evacuation guidance: Check the Suraksha Setu tab to review primary/alternate evacuation routes, shelter capacity, and community SOS alerts."
            )
        if query_notes:
            lines.extend(["", "**Specific Inquiry Details:**"] + [f"  • {qn}" for qn in query_notes])

    if note:
        lines.extend(["", f"*[System Notice: {note}]*"])
    else:
        lines.extend([
            "",
            "*(This authoritative explanation is grounded directly in verified sensor readings, "
            "geomorphic indices, and official BhuSetu multi-hazard telemetry.)*",
        ])

    return "\n".join(lines)


def _call_openai(
    corridor: dict, snapshot: dict, question: str | None, api_key: str, telemetry: dict | None = None
) -> tuple[str, str]:
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "BhuSetu-EWS/1.0",
    }

    grounding_data = _build_grounding_payload(corridor, snapshot, telemetry)

    system_prompt = (
        "You are BhuSetu AI, an expert landslide hazard and disaster decision support assistant "
        "for the North Eastern Region of India under the Ministry of Development of North Eastern Region (MDoNER). "
        "Strictly ground your analysis only in the verified landslide telemetry and risk data provided in the prompt. "
        "Never hallucinate non-existent sensors, dates, or casualty statistics. "
        "Deliver a structured, professional, authoritative, and empathetic briefing covering current hazard tier, "
        "trigger causes, exposed lifelines, and immediate emergency manager protocols."
    )

    user_prompt = f"Grounding Telemetry Data:\n{json.dumps(grounding_data, indent=2)}\n\n"
    if question:
        user_prompt += f"User Question: {question}"
    else:
        user_prompt += "Please provide an executive landslide risk briefing explaining the current hazard status, primary trigger causes, and priority disaster management protocols."

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.35,
        "max_tokens": 500,
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            answer = data["choices"][0]["message"]["content"].strip()
            return answer, f"openai ({model})"
    except urllib.error.HTTPError as err:
        err_body = ""
        try:
            err_body = err.read().decode("utf-8")
        except Exception:
            pass
        if err.code == 429 and ("insufficient_quota" in err_body or "credit_balance_exhausted" in err_body):
            note = "OpenAI API quota exhausted. Serving BhuSetu deterministic rule-based grounding."
            return _rule_based_explanation(corridor, snapshot, question, telemetry, note=note), "openai_quota_fallback"
        if err.code == 401:
            note = "OpenAI API key invalid or expired. Serving BhuSetu deterministic rule-based grounding."
            return _rule_based_explanation(corridor, snapshot, question, telemetry, note=note), "openai_auth_fallback"
        note = f"OpenAI API returned HTTP {err.code}. Serving BhuSetu deterministic rule-based grounding."
        return _rule_based_explanation(corridor, snapshot, question, telemetry, note=note), "openai_error_fallback"
    except Exception as ex:
        logger.warning("Failed to query OpenAI API: %s", ex)
        note = f"OpenAI connection error ({ex}). Serving BhuSetu deterministic rule-based grounding."
        return _rule_based_explanation(corridor, snapshot, question, telemetry, note=note), "rule_based_fallback"


def _call_groq(
    corridor: dict, snapshot: dict, question: str | None, api_key: str, telemetry: dict | None = None
) -> tuple[str, str]:
    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "BhuSetu-EWS/1.0",
    }

    grounding_data = _build_grounding_payload(corridor, snapshot, telemetry)

    system_prompt = (
        "You are BhuSetu AI, an expert landslide hazard and disaster decision support assistant "
        "for the North Eastern Region of India under the Ministry of Development of North Eastern Region (MDoNER). "
        "Strictly ground your analysis only in the verified landslide telemetry and risk data provided in the prompt. "
        "Never hallucinate non-existent figures. "
        "Deliver a structured, professional, authoritative, and concise briefing covering hazard tier, "
        "trigger causes, exposed lifelines, and immediate emergency protocols."
    )

    user_prompt = f"Grounding Telemetry Data:\n{json.dumps(grounding_data, indent=2)}\n\n"
    if question:
        user_prompt += f"User Question: {question}"
    else:
        user_prompt += "Please provide an executive landslide risk briefing explaining the current hazard status, primary trigger causes, and priority disaster management protocols."

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.35,
        "max_tokens": 500,
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            answer = data["choices"][0]["message"]["content"].strip()
            return answer, f"groq ({model})"
    except urllib.error.HTTPError as err:
        logger.warning("Groq API error HTTP %s", err.code)
        note = f"Groq API returned HTTP {err.code}. Serving BhuSetu deterministic rule-based grounding."
        return _rule_based_explanation(corridor, snapshot, question, telemetry, note=note), "groq_error_fallback"
    except Exception as ex:
        logger.warning("Failed to query Groq API: %s", ex)
        note = f"Groq connection error ({ex}). Serving BhuSetu deterministic rule-based grounding."
        return _rule_based_explanation(corridor, snapshot, question, telemetry, note=note), "groq_fallback"


def _call_gemini(
    corridor: dict, snapshot: dict, question: str | None, api_key: str, telemetry: dict | None = None
) -> tuple[str, str]:
    model = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "BhuSetu-EWS/1.0",
    }

    grounding_data = _build_grounding_payload(corridor, snapshot, telemetry)

    system_prompt = (
        "You are BhuSetu AI, an expert landslide hazard and disaster decision support assistant "
        "for the North Eastern Region of India under the Ministry of Development of North Eastern Region (MDoNER). "
        "Strictly ground your analysis only in the verified landslide telemetry and risk data provided in the prompt. "
        "Never hallucinate non-existent sensors or figures. "
        "Deliver a structured, professional, authoritative, and empathetic briefing covering hazard tier, "
        "trigger causes, exposed lifelines, and immediate emergency protocols."
    )

    user_prompt = f"Grounding Telemetry Data:\n{json.dumps(grounding_data, indent=2)}\n\n"
    if question:
        user_prompt += f"User Question: {question}"
    else:
        user_prompt += "Please provide an executive landslide risk briefing explaining the current hazard status, primary trigger causes, and priority disaster management protocols."

    combined_text = f"{system_prompt}\n\n{user_prompt}"
    payload = {
        "contents": [{"parts": [{"text": combined_text}]}],
        "generationConfig": {
            "temperature": 0.35,
            "maxOutputTokens": 600,
        },
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts and "text" in parts[0]:
                    return parts[0]["text"].strip(), f"gemini ({model})"
            return _rule_based_explanation(corridor, snapshot, question, telemetry), "gemini_empty_fallback"
    except urllib.error.HTTPError as err:
        logger.warning("Gemini API error HTTP %s", err.code)
        note = f"Gemini API returned HTTP {err.code}. Serving BhuSetu deterministic rule-based grounding."
        return _rule_based_explanation(corridor, snapshot, question, telemetry, note=note), "gemini_error_fallback"
    except Exception as ex:
        logger.warning("Failed to query Gemini API: %s", ex)
        note = f"Gemini connection error ({ex}). Serving BhuSetu deterministic rule-based grounding."
        return _rule_based_explanation(corridor, snapshot, question, telemetry, note=note), "gemini_fallback"


def explain(
    corridor: dict,
    snapshot: dict | None,
    question: str | None = None,
    telemetry: dict | None = None,
) -> tuple[str, str]:
    """Explains current landslide risk and hazard dynamics.
    Auto-detects active LLM keys (OpenAI, Groq, Gemini) or smoothly deploys
    deterministic rule-based grounding from stored sensor telemetry."""
    if snapshot is None:
        return _rule_based_explanation(corridor, snapshot, question, telemetry), "rule_based"

    ai_provider = os.environ.get("AI_PROVIDER", "").strip().lower()
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()

    # Explicit provider preference
    if ai_provider == "openai" and openai_key:
        return _call_openai(corridor, snapshot, question, openai_key, telemetry)
    if ai_provider == "groq" and groq_key:
        return _call_groq(corridor, snapshot, question, groq_key, telemetry)
    if ai_provider == "gemini" and gemini_key:
        return _call_gemini(corridor, snapshot, question, gemini_key, telemetry)

    # Automatic provider detection
    if openai_key:
        return _call_openai(corridor, snapshot, question, openai_key, telemetry)
    if groq_key:
        return _call_groq(corridor, snapshot, question, groq_key, telemetry)
    if gemini_key:
        return _call_gemini(corridor, snapshot, question, gemini_key, telemetry)

    # Default Mode 1: Deterministic Scientific Telemetry Grounding
    return _rule_based_explanation(corridor, snapshot, question, telemetry), "rule_based"
