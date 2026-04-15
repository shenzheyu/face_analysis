import os
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)

FACE_GPU_ID = int(os.getenv("FACE_GPU_ID", "0"))
FACE_DET_SIZE = int(os.getenv("FACE_DET_SIZE", "640"))
FACE_MODEL_PACK = os.getenv("FACE_MODEL_PACK", "buffalo_l")
FACE_SIM_THRESHOLD = float(os.getenv("FACE_SIM_THRESHOLD", "0.35"))

FACE_DB_PATH = Path(os.getenv("FACE_DB_PATH", DATA_DIR / "face_db.json"))
FACE_SWAPPER_PATH = Path(
    os.getenv("FACE_SWAPPER_PATH", DATA_DIR / "models" / "inswapper_128.onnx")
)

ALLOWED_ORIGINS = os.getenv(
    "FACE_CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")
