"""
Mode A candidate: OpenAI Whisper STT + OpenAI TTS (chained pipeline).

STT: whisper-1 via audio/transcriptions endpoint (Italian).
TTS: tts-1 voice "alloy" via audio/speech endpoint.

Requires: OPENAI_API_KEY in environment.
"""
from __future__ import annotations

import asyncio
import io
import os
import time
from typing import AsyncIterator

from .base import VoiceCandidate


class WhisperOpenAITTSCandidate(VoiceCandidate):
    candidate_id = "whisper-openai-tts"

    def __init__(self) -> None:
        self._api_key = os.environ.get("OPENAI_API_KEY", "")
        self._cancel_event: asyncio.Event | None = None

    def _client(self):
        try:
            import openai
        except ImportError:
            raise RuntimeError("openai package not installed — run: pip install openai")
        return openai.AsyncOpenAI(api_key=self._api_key)

    async def transcribe(self, audio_path: str) -> str:
        if not self._api_key:
            raise RuntimeError("OPENAI_API_KEY not set")

        client = self._client()
        with open(audio_path, "rb") as f:
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                language="it",
                response_format="text",
            )
        return str(response).strip().lower()

    async def synthesize(self, text: str) -> AsyncIterator[bytes]:
        if not self._api_key:
            raise RuntimeError("OPENAI_API_KEY not set")

        self._cancel_event = asyncio.Event()
        client = self._client()

        async with client.audio.speech.with_streaming_response.create(
            model="tts-1",
            voice="alloy",
            input=text,
            response_format="pcm",
        ) as response:
            async for chunk in response.iter_bytes(chunk_size=4096):
                if self._cancel_event.is_set():
                    break
                yield chunk

        self._cancel_event = None

    async def interrupt(self) -> float:
        """Signal cancel to the in-flight synthesis stream."""
        t0 = time.perf_counter()
        if self._cancel_event is not None:
            self._cancel_event.set()
        return (time.perf_counter() - t0) * 1000

    def metadata(self) -> dict:
        return {
            "candidate_id": self.candidate_id,
            "mode": "chained",
            "vendor": "OpenAI",
            "model_stt": "whisper-1",
            "model_tts": "tts-1",
            "language": "it-IT",
            "eu_region_available": False,  # NEEDS VERIFICATION
            "eu_region_note": "NEEDS VERIFICATION — OpenAI does not publish per-region data-residency for these endpoints",
            "barge_in": "HTTP request cancellation (client-side)",
            "notes": "Mode A chained candidate. Good Italian Whisper accuracy; higher latency than realtime due to round-trips.",
        }
