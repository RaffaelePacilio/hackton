"""
Mode A candidate: Azure Cognitive Services STT + Neural TTS (chained pipeline).

STT: Azure Speech-to-Text, it-IT locale.
TTS: it-IT-ElsaNeural (Neural voice, West Europe region).

EU data residency: available via West Europe region (confirmed).

Requires: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION in environment.
"""
from __future__ import annotations

import asyncio
import io
import os
import queue
import time
from typing import AsyncIterator

from .base import VoiceCandidate


class AzureChainedCandidate(VoiceCandidate):
    candidate_id = "azure-chained"

    def __init__(self) -> None:
        self._key = os.environ.get("AZURE_SPEECH_KEY", "")
        self._region = os.environ.get("AZURE_SPEECH_REGION", "westeurope")
        self._cancel_event: asyncio.Event | None = None
        self._synthesizer = None

    def _speech_config(self):
        try:
            import azure.cognitiveservices.speech as speechsdk
        except ImportError:
            raise RuntimeError(
                "azure-cognitiveservices-speech not installed — run: pip install azure-cognitiveservices-speech"
            )
        if not self._key:
            raise RuntimeError("AZURE_SPEECH_KEY not set")
        cfg = speechsdk.SpeechConfig(subscription=self._key, region=self._region)
        cfg.speech_recognition_language = "it-IT"
        cfg.speech_synthesis_voice_name = "it-IT-ElsaNeural"
        return cfg, speechsdk

    async def transcribe(self, audio_path: str) -> str:
        cfg, speechsdk = self._speech_config()

        audio_cfg = speechsdk.audio.AudioConfig(filename=audio_path)
        recognizer = speechsdk.SpeechRecognizer(speech_config=cfg, audio_config=audio_cfg)

        loop = asyncio.get_event_loop()
        future: asyncio.Future[str] = loop.create_future()

        def on_recognized(evt):
            if not future.done():
                loop.call_soon_threadsafe(future.set_result, evt.result.text.strip().lower())

        def on_canceled(evt):
            if not future.done():
                loop.call_soon_threadsafe(
                    future.set_exception,
                    RuntimeError(f"Azure recognition canceled: {evt.result.cancellation_details}"),
                )

        recognizer.recognized.connect(on_recognized)
        recognizer.canceled.connect(on_canceled)
        recognizer.start_continuous_recognition()

        try:
            return await asyncio.wait_for(future, timeout=30)
        finally:
            recognizer.stop_continuous_recognition()

    async def synthesize(self, text: str) -> AsyncIterator[bytes]:
        cfg, speechsdk = self._speech_config()
        self._cancel_event = asyncio.Event()

        audio_queue: queue.Queue[bytes | None] = queue.Queue()

        pull_stream = speechsdk.audio.PullAudioOutputStream()

        def synthesis_callback(evt):
            if evt.result.reason == speechsdk.ResultReason.SynthesizingAudio:
                audio_queue.put(evt.result.audio_data)
            elif evt.result.reason in (
                speechsdk.ResultReason.SynthesizingAudioCompleted,
                speechsdk.ResultReason.Canceled,
            ):
                audio_queue.put(None)  # sentinel

        stream_cfg = speechsdk.audio.AudioOutputConfig(stream=pull_stream)
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=cfg, audio_config=stream_cfg)
        synthesizer.synthesizing.connect(synthesis_callback)
        synthesizer.synthesis_completed.connect(synthesis_callback)
        synthesizer.synthesis_canceled.connect(synthesis_callback)

        self._synthesizer = synthesizer
        synthesizer.speak_text_async(text)

        loop = asyncio.get_event_loop()
        while True:
            if self._cancel_event.is_set():
                break
            chunk = await loop.run_in_executor(None, audio_queue.get)
            if chunk is None:
                break
            yield chunk

        self._synthesizer = None
        self._cancel_event = None

    async def interrupt(self) -> float:
        t0 = time.perf_counter()
        if self._cancel_event is not None:
            self._cancel_event.set()
        if self._synthesizer is not None:
            try:
                self._synthesizer.stop_speaking_async()
            except Exception:
                pass
        return (time.perf_counter() - t0) * 1000

    def metadata(self) -> dict:
        return {
            "candidate_id": self.candidate_id,
            "mode": "chained",
            "vendor": "Microsoft Azure",
            "model_stt": "Azure Speech Standard (it-IT)",
            "model_tts": "it-IT-ElsaNeural",
            "language": "it-IT",
            "eu_region_available": True,
            "eu_region": self._region,
            "barge_in": "stop_speaking_async() + cancel event",
            "notes": (
                "EU data residency confirmed via West Europe region. "
                "First-class Italian language support (it-IT locale). "
                "Mode A chained candidate per ADR-007 fallback strategy."
            ),
        }
