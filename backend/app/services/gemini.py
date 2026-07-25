"""Clipboard AI service — Gemini + the invisible adaptation engine.

INVISIBLE INFRASTRUCTURE (REDESIGN_BRIEF §10): the system prompt is silently
rewritten from engagement signals. There is intentionally no UI surface for
this on the client; this is the server-side implementation.

Without GEMINI_API_KEY, runs a safe seeded fallback so the prototype is
fully functional offline.
"""
import os

try:
    import google.generativeai as genai  # type: ignore
    _GEMINI_AVAILABLE = True
except Exception:
    _GEMINI_AVAILABLE = False

from app.config import settings
from app.services.registry import WORK_PATHS  # noqa (kept for future path-aware hints)

PERSONAS = {
    "friend": "Tone: Calm, relaxed, conversational. Talk like a laid-back friend who genuinely cares. Use casual language. No pressure, just presence.",
    "analyst": "Tone: Thoughtful, reflective, structured. Help the user break things down logically. Offer clear frameworks and observations. Be insightful but warm.",
    "hype": "Tone: Upbeat, energetic, hype-coach energy. Use encouraging phrases like 'Let's go!', 'You've got this!', 'Keep pushing forward!'. Be enthusiastic but genuine.",
    "mentor": "Tone: Wise, experienced, steady. Speak like a trusted older advisor who has seen it all. Share perspective with patience and care.",
}

SAFETY_TEMPLATE = (
    "You are The Clipboard, a helpful coach for athletes transitioning out of sport. "
    "If the user expresses intent to harm themselves or others, do not coach; respond "
    "briefly and gently direct them to call 911 or call/text 988 (US Suicide & Crisis Lifeline).\n"
    "{persona}\n"
    "{adaptation}"
)


def _summarize_adaptation(history: list[dict]) -> str:
    """Derive the invisible adaptation paragraph from recent engagement signals.

    Signals: response length (journaling fatigue vs. reflection), question-type
    responsiveness. Kept deliberately conservative.
    """
    recent_user = [m for m in history if m.get("role") == "user"][-4:]
    if not recent_user:
        return ""

    avg_len = sum(len((m.get("text") or "")) for m in recent_user) / max(len(recent_user), 1)
    if avg_len < 20:
        return (
            "User Profile Update: The user gives very short answers. They may be experiencing "
            "journaling fatigue.\n"
            "Tone Directive: Pivot to closed-ended, multiple-choice style questions. Offer options."
        )
    if avg_len >= 120:
        return (
            "User Profile Update: The user is reflective and willing to journal.\n"
            "Tone Directive: Act as 'The Analyst'. Be thoughtful, reflective, and structured. "
            "Help them break things down logically."
        )
    return ""


def _build_prompt(persona_id: str, adaptation: str) -> str:
    persona = PERSONAS.get(persona_id, PERSONAS["friend"])
    return SAFETY_TEMPLATE.format(persona=persona, adaptation=adaptation or "")


def _fallback_reply(history: list[dict]) -> dict:
    """Safe, deterministic mock used when no Gemini key is set.

    Mirrors the prototype's invisible-adaptation behavior so the flow is
    demonstrable without external dependencies.
    """
    last_user = next((m for m in reversed(history) if m.get("role") == "user"), None)
    text = (last_user or {}).get("text", "")
    if len(history) <= 2:
        if len(text) < 20:
            return {
                "text": "I hear you. Rest days can be tough. Which of these sounds most like what you're feeling right now?",
                "options": [
                    "I feel guilty for not working out.",
                    "My body hurts, so I know I need it.",
                    "I'm just bored without practice.",
                ],
            }
        return {
            "text": "That makes a lot of sense. It sounds like you're navigating the tension between your old schedule and your new reality. Let's break that down. What's one thing you miss about the old routine, and one thing you enjoy about having free time today?",
        }
    return {"text": "Thanks for sharing that. I'm taking note of how you're feeling."}


def chat(history: list[dict], persona_id: str = "friend") -> dict:
    """Return {'text': str, 'options': list[str]} for the next AI message."""
    adaptation = _summarize_adaptation(history)
    system_prompt = _build_prompt(persona_id, adaptation)

    if not settings.gemini_api_key or not _GEMINI_AVAILABLE:
        return _fallback_reply(history)

    try:
        genai.configure(api_key=settings.gemini_api_key)  # type: ignore
        model = genai.GenerativeModel("gemini-1.5-flash", system_instruction=system_prompt)  # type: ignore
        contents = [{"role": "user" if m["role"] == "user" else "model", "parts": [m["text"]]} for m in history]
        resp = model.generate_content(contents)
        return {"text": resp.text, "options": []}
    except Exception:
        # Never crash a coaching conversation — fall back gracefully.
        return _fallback_reply(history)