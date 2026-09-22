"""
Transcription accuracy probe.

Feeds each fixture .wav file through the candidate's transcribe() method and
computes WER (Word Error Rate) and CER (Character Error Rate) against the
ground-truth transcript in utterances-it.json.
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import TYPE_CHECKING

from .metrics import word_error_rate

if TYPE_CHECKING:
    from candidates.base import VoiceCandidate

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"
AUDIO_DIR = FIXTURES_DIR / "audio"
UTTERANCES_FILE = FIXTURES_DIR / "utterances-it.json"


def _char_error_rate(hypothesis: str, reference: str) -> float:
    """Character-level edit distance / len(reference)."""
    from .metrics import _edit_distance
    h = list(hypothesis)
    r = list(reference)
    return _edit_distance(h, r) / max(len(r), 1)


async def run(
    candidates: list["VoiceCandidate"],
    categories: list[str] | None = None,
) -> dict:
    """Run the accuracy probe for each candidate.

    Args:
        candidates: VoiceCandidate instances to benchmark.
        categories: Restrict to these utterance categories (None = all).

    Returns:
        dict keyed by candidate_id with per-utterance and aggregate WER/CER.
    """
    utterances_data = json.loads(UTTERANCES_FILE.read_text(encoding="utf-8"))
    utterances = utterances_data["utterances"]
    if categories:
        utterances = [u for u in utterances if u["category"] in categories]

    results = {}

    for candidate in candidates:
        meta = candidate.metadata()
        print(f"  accuracy probe: {candidate.candidate_id} ({len(utterances)} utterances)...")
        per_utterance = []
        wer_scores = []
        cer_scores = []
        missing_audio = 0

        for u in utterances:
            audio_path = AUDIO_DIR / f"{u['id']}.wav"
            if not audio_path.exists():
                missing_audio += 1
                per_utterance.append({
                    "id": u["id"],
                    "category": u["category"],
                    "skipped": True,
                    "reason": "audio-fixture-missing",
                })
                continue

            try:
                hypothesis = await candidate.transcribe(str(audio_path))
                reference = u["ground_truth"]
                w = word_error_rate(hypothesis.lower(), reference)
                c = _char_error_rate(hypothesis.lower(), reference)
                wer_scores.append(w)
                cer_scores.append(c)
                per_utterance.append({
                    "id": u["id"],
                    "category": u["category"],
                    "hypothesis": hypothesis,
                    "reference": reference,
                    "wer": round(w, 4),
                    "cer": round(c, 4),
                    "skipped": False,
                })
            except Exception as exc:
                per_utterance.append({
                    "id": u["id"],
                    "category": u["category"],
                    "skipped": True,
                    "reason": str(exc),
                })

        measured = len(wer_scores)
        results[candidate.candidate_id] = {
            "candidate": meta,
            "utterances_attempted": len(utterances),
            "utterances_measured": measured,
            "utterances_skipped": len(utterances) - measured,
            "missing_audio_fixtures": missing_audio,
            "aggregate": {
                "mean_wer": round(sum(wer_scores) / measured, 4) if measured else None,
                "mean_cer": round(sum(cer_scores) / measured, 4) if measured else None,
            },
            "per_utterance": per_utterance,
            "verified": measured > 0,
        }

    return {"probe": "accuracy", "results": results}
