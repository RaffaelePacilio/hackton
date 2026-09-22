"""
Abstract VoiceCandidate interface for all benchmark candidates.

Each candidate implements transcribe(), synthesize(), interrupt(), and metadata().
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator


class VoiceCandidate(ABC):
    """Abstract base class for all voice benchmark candidates."""

    candidate_id: str  # Unique identifier (e.g. "openai-realtime")

    @abstractmethod
    async def transcribe(self, audio_path: str) -> str:
        """Transcribe a .wav file and return the transcript string.

        Args:
            audio_path: Absolute or relative path to a 16 kHz mono PCM WAV file.

        Returns:
            Normalized transcript (lowercase, stripped).
        """

    @abstractmethod
    async def synthesize(self, text: str) -> AsyncIterator[bytes]:
        """Synthesize text to audio, yielding PCM chunks.

        Args:
            text: Italian text to synthesize.

        Yields:
            Raw audio bytes chunks (PCM or provider-native format).
        """

    @abstractmethod
    async def interrupt(self) -> float:
        """Cancel any in-flight synthesis or realtime session turn.

        Returns:
            Time in ms from interrupt call to confirmed cancellation
            (0.0 if the candidate cannot measure this).
        """

    @abstractmethod
    def metadata(self) -> dict:
        """Return static metadata about this candidate.

        Keys:
            candidate_id, mode ("realtime" | "chained"), vendor, model_stt,
            model_tts, language, eu_region_available, notes.
        """
