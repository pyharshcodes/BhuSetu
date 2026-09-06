"""
"Explain this risk" assistant.

If AI_PROVIDER + a matching API key are set in the environment, a real
implementation would call out to that provider here (left as an explicit,
documented extension point below). Otherwise — and always in this sandbox
build, which has no network access — this falls back to a deterministic,
rule-based explanation built directly from the latest stored risk snapshot.
It never hallucinates because it only restates numbers already in the
database.
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


def _rule_based_explanation(
    corridor: dict, snapshot: dict | None, question: str | None, note: str | None = None
) -> str:
    if snapshot is None:
        return (
            f"No risk data is available yet for {corridor['name']}. "
            "Trigger a simulation step to generate the first reading."
        )

    reasons = reasons_from_json(snapshot["top_reasons"])
    reasons_text = " ".join(f"- {r}" for r in reasons)

    base = (
        f"{corridor['name']} is currently at {snapshot['alert_level']} risk "
        f"(score {snapshot['fused_risk_score']}/100, confidence {snapshot['confidence_pct']}%). "
        f"This combines a static susceptibility score of {snapshot['susceptibility_score']}/100 "
        f"(terrain, geology and history — changes slowly) with a dynamic trigger score of "
        f"{snapshot['trigger_score']}/100 (rainfall and soil moisture — changes hour to hour). "
        f"Key contributing factors: {reasons_text}"
    )

    if snapshot.get("degradation_reason"):
        base += f" Note: {snapshot['degradation_reason']}"

    if question:
        q = question.lower()
        if "why" in q and ("red" in q or "orange" in q or "high" in q):
            base += (
                " The level reflects both how likely a slope failure is (hazard) and what would be "
                "affected if it happened (roads, villages) — not rainfall alone."
            )
        elif "confidence" in q:
            base += (
                " Confidence reflects data quality: if a sensor is offline or a proxy is used, "
                "confidence is reduced even if the risk score itself stays the same."
            )
        elif "what should" in q or "action" in q or "do" in q:
            base += " See the recommended-actions panel for the specific steps tied to this alert level."

    if note:
        base += f"\n\n[AI Notice: {note}]"
    else:
        base += (
            " (This explanation is generated from the platform's own stored risk data using rule-based "
            "logic grounded directly in real sensor snapshots.)"
        )
    return base


def _call_openai(corridor: dict, snapshot: dict, question: str | None, api_key: str) -> tuple[str, str]:
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "BhuSetu-EWS/1.0",
    }

    reasons = reasons_from_json(snapshot.get("top_reasons"))
    grounding_data = {
        "corridor_name": corridor.get("name"),
        "state": corridor.get("state"),
        "alert_level": snapshot.get("alert_level"),
        "fused_risk_score": snapshot.get("fused_risk_score"),
        "confidence_pct": snapshot.get("confidence_pct"),
        "susceptibility_score": snapshot.get("susceptibility_score"),
        "trigger_score": snapshot.get("trigger_score"),
        "top_contributing_factors": reasons,
        "degradation_reason": snapshot.get("degradation_reason"),
    }

    system_prompt = (
        "You are BhuSetu AI, an expert landslide hazard and disaster decision support assistant "
        "for the North Eastern Region of India under the Ministry of Development of North Eastern Region (MDoNER). "
        "Analyze the provided landslide telemetry and risk data strictly without hallucinating non-existent figures. "
        "Provide clear, actionable, and empathetic insights for district emergency managers and vulnerable citizens."
    )

    user_prompt = f"Grounding Telemetry Data:\n{json.dumps(grounding_data, indent=2)}\n\n"
    if question:
        user_prompt += f"User Question: {question}"
    else:
        user_prompt += "Please explain the current landslide risk level, the main contributing causes, and immediate priority actions."

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 400,
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
            err_json = json.loads(err_body)
            err_code = err_json.get("error", {}).get("code", "")
            err_msg = err_json.get("error", {}).get("message", "")
        except Exception:
            err_code = ""
            err_msg = str(err)

        if err.code == 429 and ("insufficient_quota" in err_body or err_code == "credit_balance_exhausted"):
            logger.warning("OpenAI API quota exhausted (credit_balance_exhausted). Falling back to rule-based engine.")
            note = (
                "OpenAI API key was contacted, but returned HTTP 429 (credit balance exhausted / insufficient_quota). "
                "Add credits at https://platform.openai.com/settings/organization/billing/ to enable GPT-4o. "
                "Serving BhuSetu deterministic rule-based reasoning in the meantime."
            )
            return _rule_based_explanation(corridor, snapshot, question, note=note), "openai_quota_exhausted_fallback"

        if err.code == 401:
            note = "OpenAI API key is invalid or expired. Serving BhuSetu rule-based reasoning."
            return _rule_based_explanation(corridor, snapshot, question, note=note), "openai_auth_error_fallback"

        note = f"OpenAI error (HTTP {err.code}: {err_msg[:60]}). Serving BhuSetu rule-based reasoning."
        return _rule_based_explanation(corridor, snapshot, question, note=note), "openai_error_fallback"

    except Exception as ex:
        logger.warning(f"Failed to query OpenAI API: {ex}")
        note = f"OpenAI connection error ({str(ex)}). Serving BhuSetu rule-based reasoning."
        return _rule_based_explanation(corridor, snapshot, question, note=note), "rule_based_fallback"


def _call_groq(corridor: dict, snapshot: dict, question: str | None, api_key: str) -> tuple[str, str]:
    model = os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b")
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "BhuSetu-EWS/1.0",
    }

    reasons = reasons_from_json(snapshot.get("top_reasons"))
    grounding_data = {
        "corridor_name": corridor.get("name"),
        "state": corridor.get("state"),
        "alert_level": snapshot.get("alert_level"),
        "fused_risk_score": snapshot.get("fused_risk_score"),
        "confidence_pct": snapshot.get("confidence_pct"),
        "susceptibility_score": snapshot.get("susceptibility_score"),
        "trigger_score": snapshot.get("trigger_score"),
        "top_contributing_factors": reasons,
        "degradation_reason": snapshot.get("degradation_reason"),
    }

    system_prompt = (
        "You are BhuSetu AI, an expert landslide hazard and disaster decision support assistant "
        "for the North Eastern Region of India under the Ministry of Development of North Eastern Region (MDoNER). "
        "Analyze the provided landslide telemetry and risk data strictly without hallucinating non-existent figures. "
        "Provide clear, actionable, concise, and empathetic insights for district emergency managers and vulnerable citizens."
    )

    user_prompt = f"Grounding Telemetry Data:\n{json.dumps(grounding_data, indent=2)}\n\n"
    if question:
        user_prompt += f"User Question: {question}"
    else:
        user_prompt += "Please explain the current landslide risk level, the main contributing causes, and immediate priority actions."

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 450,
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            answer = data["choices"][0]["message"]["content"].strip()
            return answer, f"groq ({model})"
    except urllib.error.HTTPError as err:
        err_body = ""
        try:
            err_body = err.read().decode("utf-8")
        except Exception:
            err_body = str(err)
        logger.warning(f"Groq API error {err.code}: {err_body[:100]}")
        note = f"Groq API returned HTTP {err.code}. Serving BhuSetu rule-based reasoning."
        return _rule_based_explanation(corridor, snapshot, question, note=note), "groq_error_fallback"
    except Exception as ex:
        logger.warning(f"Failed to query Groq API: {ex}")
        note = f"Groq connection error ({str(ex)}). Serving BhuSetu rule-based reasoning."
        return _rule_based_explanation(corridor, snapshot, question, note=note), "groq_fallback"


def explain(corridor: dict, snapshot: dict | None, question: str | None = None):
    ai_provider = os.environ.get("AI_PROVIDER", "").lower()
    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()

    if ai_provider == "groq" and groq_key:
        if snapshot is not None:
            return _call_groq(corridor, snapshot, question, groq_key)
        return _rule_based_explanation(corridor, snapshot, question), "groq"

    if ai_provider == "openai" and openai_key:
        if snapshot is not None:
            return _call_openai(corridor, snapshot, question, openai_key)
        return _rule_based_explanation(corridor, snapshot, question), "openai"

    return _rule_based_explanation(corridor, snapshot, question), "rule_based"

