"""
Voice Provider Benchmark — WP-004 entry point.

Usage:
    python run_benchmark.py [--dry-run] [--probe PROBE] [--candidate CANDIDATE]

Options:
    --dry-run           Print candidate metadata and exit; no API calls.
    --probe PROBE       Run only this probe: latency | accuracy | barge_in | cost
    --candidate ID      Run only this candidate: openai-realtime | whisper-openai-tts | azure-chained

Results are written to results/YYYYMMDD-HHMMSS.json.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from candidates.openai_realtime import OpenAIRealtimeCandidate
from candidates.whisper_openai_tts import WhisperOpenAITTSCandidate
from candidates.azure_chained import AzureChainedCandidate
from harness import latency_probe, accuracy_probe, barge_in_probe, cost_estimator


ALL_CANDIDATES = {
    "openai-realtime": OpenAIRealtimeCandidate,
    "whisper-openai-tts": WhisperOpenAITTSCandidate,
    "azure-chained": AzureChainedCandidate,
}

ALL_PROBES = ["latency", "accuracy", "barge_in", "cost"]


def print_metadata_table(candidates: list) -> None:
    print("\n=== Candidate Metadata ===")
    print(f"{'ID':<25} {'Mode':<12} {'Vendor':<20} {'EU Region':<15} {'Language'}")
    print("-" * 90)
    for c in candidates:
        m = c.metadata()
        eu = "Yes" if m.get("eu_region_available") else "NEEDS VERIFICATION"
        print(f"{m['candidate_id']:<25} {m['mode']:<12} {m['vendor']:<20} {eu:<15} {m['language']}")
    print()


def print_summary_table(results: dict) -> None:
    print("\n=== Benchmark Summary ===")

    # Latency
    if "latency" in results:
        print("\n--- Latency (ms, p50 / p95) ---")
        for cid, r in results["latency"]["results"].items():
            stats = r.get("stats", {})
            p50 = stats.get("p50") or "N/A"
            p95 = stats.get("p95") or "N/A"
            verified = "measured" if r.get("verified") else "NEEDS VERIFICATION"
            print(f"  {cid:<30} p50={p50}ms  p95={p95}ms  [{verified}]")

    # Accuracy
    if "accuracy" in results:
        print("\n--- Accuracy (WER — lower is better) ---")
        for cid, r in results["accuracy"]["results"].items():
            agg = r.get("aggregate", {})
            wer = agg.get("mean_wer")
            wer_str = f"{wer:.2%}" if wer is not None else "N/A"
            n = r.get("utterances_measured", 0)
            verified = f"measured ({n} utterances)" if r.get("verified") else "NEEDS VERIFICATION"
            print(f"  {cid:<30} WER={wer_str}  [{verified}]")

    # Barge-in
    if "barge_in" in results:
        print("\n--- Barge-in interrupt latency (ms, p50) ---")
        for cid, r in results["barge_in"]["results"].items():
            stats = r.get("stats", {})
            p50 = stats.get("p50") or "N/A"
            verified = "measured" if r.get("verified") else "NEEDS VERIFICATION"
            print(f"  {cid:<30} p50={p50}ms  [{verified}]")

    # Cost
    if "cost" in results:
        print("\n--- Cost per session-minute (USD) ---")
        for cid, r in results["cost"]["results"].items():
            cost = r.get("cost_per_session_minute_usd", "N/A")
            verified = "measured" if r.get("verified") else "NEEDS VERIFICATION"
            print(f"  {cid:<30} ${cost}  [{verified}]")

    print()


async def run_probes(
    candidates: list,
    probes: list[str],
) -> dict:
    results = {}

    if "latency" in probes:
        print("\n[1/4] Running latency probe...")
        results["latency"] = await latency_probe.run(candidates)

    if "accuracy" in probes:
        print("\n[2/4] Running accuracy probe...")
        results["accuracy"] = await accuracy_probe.run(candidates)

    if "barge_in" in probes:
        print("\n[3/4] Running barge-in probe...")
        results["barge_in"] = await barge_in_probe.run(candidates)

    if "cost" in probes:
        print("\n[4/4] Running cost estimator...")
        results["cost"] = cost_estimator.run()

    return results


def write_results(results: dict, candidates: list) -> Path:
    out_dir = ROOT / "results"
    out_dir.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_path = out_dir / f"{ts}.json"
    payload = {
        "spike": "WP-004",
        "timestamp": datetime.now().isoformat(),
        "candidates": [c.metadata() for c in candidates],
        "probes": results,
    }
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description="WP-004 Voice Provider Benchmark")
    parser.add_argument("--dry-run", action="store_true", help="Print metadata only, no API calls")
    parser.add_argument("--probe", choices=ALL_PROBES, help="Run only this probe")
    parser.add_argument("--candidate", choices=list(ALL_CANDIDATES), help="Run only this candidate")
    args = parser.parse_args()

    # Build candidate list
    candidate_ids = [args.candidate] if args.candidate else list(ALL_CANDIDATES)
    candidates = [ALL_CANDIDATES[cid]() for cid in candidate_ids]

    print_metadata_table(candidates)

    if args.dry_run:
        print("Dry run complete — no API calls made.")
        return

    # Check for API keys
    missing = []
    if any(c.candidate_id in ("openai-realtime", "whisper-openai-tts") for c in candidates):
        if not os.environ.get("OPENAI_API_KEY"):
            missing.append("OPENAI_API_KEY")
    if any(c.candidate_id == "azure-chained" for c in candidates):
        if not os.environ.get("AZURE_SPEECH_KEY"):
            missing.append("AZURE_SPEECH_KEY")
    if missing:
        print(f"WARNING: Missing environment variables: {', '.join(missing)}")
        print("  Affected candidates will report NEEDS VERIFICATION for measured probes.")
        print("  Set these in .env or your shell, or use --dry-run to skip API calls.\n")

    probes = [args.probe] if args.probe else ALL_PROBES
    results = asyncio.run(run_probes(candidates, probes))

    print_summary_table(results)
    out_path = write_results(results, candidates)
    print(f"Results written to: {out_path}")
    print("\nNext step: update aua/docs/architecture/voice-benchmark-report.md with these numbers.")


if __name__ == "__main__":
    main()
