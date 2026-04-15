import json
import logging
import threading
import time
import uuid
from dataclasses import dataclass, field

import numpy as np

from . import config

log = logging.getLogger(__name__)


@dataclass
class FaceRecord:
    id: str
    name: str
    embedding: list[float]
    created_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "embedding": self.embedding,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "FaceRecord":
        return cls(
            id=d["id"],
            name=d["name"],
            embedding=list(d["embedding"]),
            created_at=float(d.get("created_at", time.time())),
        )


def _normalize(v: np.ndarray) -> np.ndarray:
    n = float(np.linalg.norm(v))
    return v / n if n > 0 else v


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(_normalize(a), _normalize(b)))


class FaceDB:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._records: list[FaceRecord] = []
        self._matrix: np.ndarray | None = None  # (N, D), L2-normalized

    def load(self) -> None:
        path = config.FACE_DB_PATH
        if not path.exists():
            log.info("face_db: no existing store at %s", path)
            return
        try:
            data = json.loads(path.read_text())
            self._records = [FaceRecord.from_dict(x) for x in data]
            self._rebuild_matrix()
            log.info("face_db: loaded %d records", len(self._records))
        except Exception:
            log.exception("face_db: failed to load %s; starting empty", path)
            self._records = []
            self._matrix = None

    def _rebuild_matrix(self) -> None:
        if not self._records:
            self._matrix = None
            return
        mat = np.asarray([r.embedding for r in self._records], dtype=np.float32)
        norms = np.linalg.norm(mat, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        self._matrix = mat / norms

    def _persist(self) -> None:
        tmp = config.FACE_DB_PATH.with_suffix(config.FACE_DB_PATH.suffix + ".tmp")
        tmp.write_text(json.dumps([r.to_dict() for r in self._records]))
        tmp.replace(config.FACE_DB_PATH)

    def enroll(self, name: str, embedding: np.ndarray) -> FaceRecord:
        rec = FaceRecord(
            id=uuid.uuid4().hex,
            name=name,
            embedding=embedding.astype(np.float32).tolist(),
        )
        with self._lock:
            self._records.append(rec)
            self._rebuild_matrix()
            self._persist()
        return rec

    def delete(self, face_id: str) -> bool:
        with self._lock:
            before = len(self._records)
            self._records = [r for r in self._records if r.id != face_id]
            if len(self._records) == before:
                return False
            self._rebuild_matrix()
            self._persist()
            return True

    def list_all(self) -> list[FaceRecord]:
        with self._lock:
            return list(self._records)

    def search(self, embedding: np.ndarray, top_k: int = 5) -> list[tuple[FaceRecord, float]]:
        with self._lock:
            if self._matrix is None or not self._records:
                return []
            query = _normalize(embedding.astype(np.float32))
            sims = self._matrix @ query
            k = min(top_k, len(self._records))
            idx = np.argpartition(-sims, k - 1)[:k]
            idx = idx[np.argsort(-sims[idx])]
            return [(self._records[i], float(sims[i])) for i in idx]


db = FaceDB()
