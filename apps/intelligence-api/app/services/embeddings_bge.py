from __future__ import annotations

import hashlib
import math

from app.config import get_settings


class BgeEmbeddingService:
    """Lean BGE-compatible embedding boundary.

    The production path can swap the deterministic fallback for an ONNX model
    loader without changing callers. The fallback keeps Vercel/test execution
    small and produces stable 384-d vectors for pgvector integration tests.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.dimensions = self.settings.bge_vector_dimensions
        self.model_name = self.settings.bge_model

    def embed(self, text: str) -> list[float]:
        tokens = [token.lower() for token in text.split() if token.strip()]
        vector = [0.0] * self.dimensions
        for token in tokens or [text[:64] or "empty"]:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimensions
            sign = 1.0 if digest[4] % 2 else -1.0
            vector[index] += sign
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [round(value / norm, 8) for value in vector]

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        return [self.embed(text) for text in texts]

    def profile_hash(self, text: str) -> str:
        return hashlib.sha256(f"{self.model_name}:{text}".encode("utf-8")).hexdigest()


embeddings = BgeEmbeddingService()
