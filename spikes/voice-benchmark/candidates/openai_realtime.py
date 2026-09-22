"""
Mode B candidate: OpenAI Realtime API.

Uses a WebSocket session (gpt-4o-realtime-preview) for end-to-end speech-to-speech.
This is the primary ADR-007 Mode B candidate.

Requires: OPENAI_API_KEY in environment.

Reference: https://platform.openai.com/docs/api-reference/realtime
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
import time
from typing import AsyncIterator

from .base import VoiceCandidate

_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview"
_LANGUAGE = "it"


class OpenAIRealtimeCandidate(VoiceCandidate):
    candidate_id = "openai-realtime"

    def __init__(self) -> None:
        self._api_key = os.environ.get("OPENAI_API_KEY", "")
        self._active_ws = None

    async def transcribe(self, audio_path: str) -> str:
        """Send audio via the Realtime API and return the transcript.

        Opens a fresh session per call (spike simplification; production would
        reuse sessions for lower per-turn overhead).
        """
        if not self._api_key:
            raise RuntimeError("OPENAI_API_KEY not set")

        try:
            import websockets
        except ImportError:
            raise RuntimeError("websockets package not installed — run: pip install websockets")

        import soundfile as sf
        import numpy as np

        audio_data, sample_rate = sf.read(audio_path, dtype="int16")
        if len(audio_data.shape) > 1:
            audio_data = audio_data[:, 0]  # mono
        audio_b64 = base64.b64encode(audio_data.tobytes()).decode()

        transcript = ""
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "OpenAI-Beta": "realtime=v1",
        }

        async with websockets.connect(_REALTIME_URL, additional_headers=headers) as ws:
            self._active_ws = ws

            # Configure the session for Italian STT
            await ws.send(json.dumps({
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "instructions": "Transcribe Italian speech accurately. Output only the transcript.",
                    "input_audio_format": "pcm16",
                    "output_audio_format": "pcm16",
                    "input_audio_transcription": {"model": "whisper-1"},
                    "turn_detection": None,  # manual turn management
                },
            }))

            # Append audio buffer
            await ws.send(json.dumps({
                "type": "input_audio_buffer.append",
                "audio": audio_b64,
            }))
            await ws.send(json.dumps({"type": "input_audio_buffer.commit"}))
            await ws.send(json.dumps({"type": "response.create"}))

            # Collect transcript events
            async for raw in ws:
                msg = json.loads(raw)
                event_type = msg.get("type", "")

                if event_type == "conversation.item.input_audio_transcription.completed":
                    transcript = msg.get("transcript", "").strip().lower()

                if event_type in ("response.done", "error"):
                    break

        self._active_ws = None
        return transcript

    async def synthesize(self, text: str) -> AsyncIterator[bytes]:
        """Stream audio synthesis via Realtime API session."""
        if not self._api_key:
            raise RuntimeError("OPENAI_API_KEY not set")

        try:
            import websockets
        except ImportError:
            raise RuntimeError("websockets package not installed")

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "OpenAI-Beta": "realtime=v1",
        }

        async with websockets.connect(_REALTIME_URL, additional_headers=headers) as ws:
            self._active_ws = ws

            await ws.send(json.dumps({
                "type": "session.update",
                "session": {
                    "modalities": ["audio"],
                    "output_audio_format": "pcm16",
                    "turn_detection": None,
                },
            }))
            await ws.send(json.dumps({
                "type": "conversation.item.create",
                "item": {
                    "type": "message",
                    "role": "user",
                    "content": [{"type": "input_text", "text": f"Say in Italian: {text}"}],
                },
            }))
            await ws.send(json.dumps({"type": "response.create"}))

            async for raw in ws:
                msg = json.loads(raw)
                if msg.get("type") == "response.audio.delta":
                    chunk = base64.b64decode(msg.get("delta", ""))
                    yield chunk
                if msg.get("type") in ("response.done", "error"):
                    break

        self._active_ws = None

    async def interrupt(self) -> float:
        """Truncate the current response (native barge-in)."""
        if self._active_ws is None:
            return 0.0
        t0 = time.perf_counter()
        try:
            await self._active_ws.send(json.dumps({"type": "response.cancel"}))
        except Exception:
            pass
        return (time.perf_counter() - t0) * 1000

    def metadata(self) -> dict:
        return {
            "candidate_id": self.candidate_id,
            "mode": "realtime",
            "vendor": "OpenAI",
            "model": "gpt-4o-realtime-preview",
            "language": "it-IT",
            "eu_region_available": False,  # NEEDS VERIFICATION — no confirmed EU endpoint as of 2026-09-22
            "eu_region_note": "NEEDS VERIFICATION — OpenAI does not publish per-region data-residency guarantees for Realtime API",
            "barge_in": "native (response.cancel event)",
            "notes": "Primary Mode B candidate per ADR-007. Low latency, native barge-in.",
        }
