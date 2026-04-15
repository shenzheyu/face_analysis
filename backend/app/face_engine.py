import ctypes
import logging
import os
import sys
from pathlib import Path
from typing import Any

import cv2
import numpy as np


def _preload_cuda_libs() -> None:
    """Preload GPU libs bundled in pip packages (cudnn / cublas) before onnxruntime
    opens its provider .so. Without this, onnxruntime-gpu silently falls back to CPU
    when distro-level cudnn is missing but `nvidia-cudnn-cu12` is installed in the venv.
    """
    site = Path(sys.prefix) / "lib" / f"python{sys.version_info.major}.{sys.version_info.minor}" / "site-packages" / "nvidia"
    if not site.exists():
        return
    lib_dirs = [p for p in site.glob("*/lib") if p.is_dir()]
    if not lib_dirs:
        return
    os.environ["LD_LIBRARY_PATH"] = os.pathsep.join(
        [str(d) for d in lib_dirs] + [os.environ.get("LD_LIBRARY_PATH", "")]
    )
    for libname in ("libcudnn.so.9", "libcublas.so.12", "libcublasLt.so.12"):
        for d in lib_dirs:
            p = d / libname
            if p.exists():
                try:
                    ctypes.CDLL(str(p), mode=ctypes.RTLD_GLOBAL)
                except OSError:
                    logging.getLogger(__name__).exception("failed to preload %s", p)
                break


_preload_cuda_libs()

import onnxruntime as ort  # noqa: E402
from insightface.app import FaceAnalysis  # noqa: E402
from insightface.model_zoo import get_model  # noqa: E402

from . import config  # noqa: E402

log = logging.getLogger(__name__)


class FaceEngine:
    def __init__(self) -> None:
        self.app: FaceAnalysis | None = None
        self.swapper: Any | None = None
        self.provider: str = "CPUExecutionProvider"
        self.device_id: int = -1
        self.swapper_error: str | None = None

    def load(self) -> None:
        available = ort.get_available_providers()
        want_gpu = config.FACE_GPU_ID >= 0 and "CUDAExecutionProvider" in available

        if want_gpu:
            providers = [
                ("CUDAExecutionProvider", {"device_id": config.FACE_GPU_ID}),
                "CPUExecutionProvider",
            ]
            ctx_id = config.FACE_GPU_ID
        else:
            providers = ["CPUExecutionProvider"]
            ctx_id = -1

        log.info("Loading FaceAnalysis(%s) providers=%s", config.FACE_MODEL_PACK, providers)
        self.app = FaceAnalysis(name=config.FACE_MODEL_PACK, providers=providers)
        self.app.prepare(ctx_id=ctx_id, det_size=(config.FACE_DET_SIZE, config.FACE_DET_SIZE))

        actual = self.app.models["detection"].session.get_providers()
        self.provider = actual[0] if actual else "CPUExecutionProvider"
        self.device_id = ctx_id if self.provider == "CUDAExecutionProvider" else -1

        if config.FACE_SWAPPER_PATH.exists():
            try:
                log.info("Loading swapper: %s", config.FACE_SWAPPER_PATH)
                self.swapper = get_model(
                    str(config.FACE_SWAPPER_PATH),
                    providers=[p if isinstance(p, str) else p[0] for p in providers],
                )
            except Exception as exc:
                log.exception("Failed to load swapper")
                self.swapper_error = str(exc)
        else:
            self.swapper_error = f"swapper model not found at {config.FACE_SWAPPER_PATH}"
            log.warning(self.swapper_error)

    def get_faces(self, bgr_image: np.ndarray) -> list:
        assert self.app is not None, "FaceEngine not loaded"
        return self.app.get(bgr_image)

    def swap(self, target_bgr: np.ndarray, target_face, source_face) -> np.ndarray:
        if self.swapper is None:
            raise RuntimeError(self.swapper_error or "swapper unavailable")
        return self.swapper.get(target_bgr, target_face, source_face, paste_back=True)

    def health(self) -> dict:
        return {
            "detector": self.app is not None,
            "swapper": self.swapper is not None,
            "swapper_error": self.swapper_error,
            "provider": self.provider,
            "device_id": self.device_id,
            "model_pack": config.FACE_MODEL_PACK,
            "det_size": config.FACE_DET_SIZE,
        }


engine = FaceEngine()


def decode_image(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image; unsupported format or corrupted data")
    return img


def encode_image_png(bgr_image: np.ndarray) -> bytes:
    ok, buf = cv2.imencode(".png", bgr_image)
    if not ok:
        raise RuntimeError("cv2.imencode failed")
    return buf.tobytes()
