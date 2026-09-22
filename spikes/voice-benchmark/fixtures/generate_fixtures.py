"""
Generate synthetic Italian audio fixtures from utterances-it.json.

Usage:
    python fixtures/generate_fixtures.py --tts openai   # uses OPENAI_API_KEY
    python fixtures/generate_fixtures.py --tts azure    # uses AZURE_SPEECH_KEY + AZURE_SPEECH_REGION

Output: fixtures/audio/<id>.wav  (16 kHz, mono, PCM)
"""
import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

FIXTURES_DIR = Path(__file__).parent
AUDIO_DIR = FIXTURES_DIR / "audio"
UTTERANCES_FILE = FIXTURES_DIR / "utterances-it.json"


def generate_openai(utterances: list[dict]) -> None:
    try:
        import openai
    except ImportError:
        sys.exit("openai package not installed — run: pip install openai")

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        sys.exit("OPENAI_API_KEY not set")

    client = openai.OpenAI(api_key=api_key)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    for u in utterances:
        out_path = AUDIO_DIR / f"{u['id']}.wav"
        if out_path.exists():
            print(f"  skip {u['id']} (exists)")
            continue
        print(f"  generating {u['id']}: {u['text'][:50]}...")
        response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=u["text"],
            response_format="wav",
        )
        out_path.write_bytes(response.content)
    print(f"Done — {len(utterances)} files in {AUDIO_DIR}")


def generate_azure(utterances: list[dict]) -> None:
    try:
        import azure.cognitiveservices.speech as speechsdk
    except ImportError:
        sys.exit("azure-cognitiveservices-speech not installed — run: pip install azure-cognitiveservices-speech")

    key = os.environ.get("AZURE_SPEECH_KEY")
    region = os.environ.get("AZURE_SPEECH_REGION", "westeurope")
    if not key:
        sys.exit("AZURE_SPEECH_KEY not set")

    import soundfile as sf
    import numpy as np

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    speech_config = speechsdk.SpeechConfig(subscription=key, region=region)
    speech_config.speech_synthesis_voice_name = "it-IT-ElsaNeural"
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm
    )

    for u in utterances:
        out_path = AUDIO_DIR / f"{u['id']}.wav"
        if out_path.exists():
            print(f"  skip {u['id']} (exists)")
            continue
        print(f"  generating {u['id']}: {u['text'][:50]}...")
        audio_config = speechsdk.audio.AudioOutputConfig(filename=str(out_path))
        synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=speech_config, audio_config=audio_config
        )
        result = synthesizer.speak_text_async(u["text"]).get()
        if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
            print(f"  WARNING: {u['id']} synthesis failed: {result.reason}")
    print(f"Done — files in {AUDIO_DIR}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Italian audio fixtures")
    parser.add_argument("--tts", choices=["openai", "azure"], required=True)
    parser.add_argument(
        "--category",
        help="Generate only utterances from this category",
    )
    args = parser.parse_args()

    data = json.loads(UTTERANCES_FILE.read_text(encoding="utf-8"))
    utterances = data["utterances"]
    if args.category:
        utterances = [u for u in utterances if u["category"] == args.category]
    if not utterances:
        sys.exit("No utterances matched the filter")

    print(f"Generating {len(utterances)} utterances via {args.tts}...")
    if args.tts == "openai":
        generate_openai(utterances)
    else:
        generate_azure(utterances)


if __name__ == "__main__":
    main()
