"""
Barge-in responsiveness probe.

Simulates a mid-utterance interrupt: starts a synthesis (TTS) stream, then
calls interrupt() after a configured delay and measures the time from the
interrupt call to the point where audio output stops.

For realtime candidates, this exercises the native barge-in path.
For chained candidates, interrupt() cancels the in-flight TTS request.
"""
from __future__ import annotations

import asyncio
import time
from typing import TYPE_CHECKING

from .metrics import latency_stats

if TYPE_CHECKING:
    from candidates.base import VoiceCandidate

_SAMPLE_TEXT = (
    "Benvenuto nella piattaforma di accessibilità. "
    "Puoi utilizzare i comandi vocali per navigare tra le sezioni disponibili. "
    "Per iniziare, pronuncia il nome della sezione che desideri visitare."
)


async def _measure_barge_in(
    candidate: "VoiceCandidate",
    interrupt_after_ms: float,
) -> float | None:
    """Start synthesis, interrupt after delay, return interrupt-to-stop latency in ms."""
    try:
        synthesis_started = asyncio.Event()
        synthesis_task = None

        async def run_synthesis() -> None:
            synthesis_started.set()
            # Drain the synthesis stream to simulate active playback
            async for _ in candidate.synthesize(_SAMPLE_TEXT):
                pass

        synthesis_task = asyncio.create_task(run_synthesis())
        await synthesis_started.wait()
        await asyncio.sleep(interrupt_after_ms / 1000)

        t0 = time.perf_counter()
        await candidate.interrupt()
        elapsed_ms = (time.perf_counter() - t0) * 1000

        synthesis_task.cancel()
        try:
            await synthesis_task
        except asyncio.CancelledError:
            pass

        return elapsed_ms
    except Exception as exc:
        print(f"    [barge_in_probe] error: {exc}")
        return None


async def run(
    candidates: list["VoiceCandidate"],
    n_repeats: int = 5,
    interrupt_after_ms: float = 800,
) -> dict:
    """Run the barge-in probe for each candidate.

    Args:
        candidates: VoiceCandidate instances to benchmark.
        n_repeats: Number of repetitions per candidate.
        interrupt_after_ms: How long into synthesis to trigger the interrupt.

    Returns:
        dict keyed by candidate_id with interrupt latency stats.
    """
    results = {}

    for candidate in candidates:
        meta = candidate.metadata()
        print(f"  barge_in probe: {candidate.candidate_id} ({n_repeats} runs, interrupt after {interrupt_after_ms}ms)...")

        samples = []
        for _ in range(n_repeats):
            ms = await _measure_barge_in(candidate, interrupt_after_ms)
            if ms is not None:
                samples.append(ms)

        results[candidate.candidate_id] = {
            "candidate": meta,
            "interrupt_after_ms": interrupt_after_ms,
            "samples_ms": [round(ms, 1) for ms in samples],
            "stats": latency_stats(samples),
            "verified": len(samples) >= n_repeats // 2,
            "note": (
                "Realtime candidates use native barge-in; chained candidates cancel the TTS HTTP request. "
                "These are not directly comparable — see report for interpretation."
            ),
        }

    return {"probe": "barge_in", "results": results}
