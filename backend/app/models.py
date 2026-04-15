from pydantic import BaseModel, Field


class BBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class DetectedFace(BaseModel):
    bbox: BBox
    kps: list[list[float]] = Field(description="5-point landmarks, shape (5,2)")
    det_score: float


class AnalyzedFace(DetectedFace):
    age: int | None = None
    gender: str | None = None
    embedding: list[float] | None = None


class DetectResponse(BaseModel):
    faces: list[DetectedFace]
    width: int
    height: int


class AnalyzeResponse(BaseModel):
    faces: list[AnalyzedFace]
    width: int
    height: int


class EnrollResponse(BaseModel):
    id: str
    name: str
    created_at: float


class FaceRecordOut(BaseModel):
    id: str
    name: str
    created_at: float


class ListResponse(BaseModel):
    records: list[FaceRecordOut]
    count: int


class SearchHit(BaseModel):
    id: str
    name: str
    similarity: float


class SearchFaceResult(BaseModel):
    bbox: BBox
    kps: list[list[float]]
    det_score: float
    hits: list[SearchHit]


class SearchResponse(BaseModel):
    faces: list[SearchFaceResult]
    width: int
    height: int
    threshold: float


class CompareResponse(BaseModel):
    similarity: float
    is_same: bool
    threshold: float


class StreamHit(BaseModel):
    id: str | None = None
    name: str | None = None
    similarity: float


class StreamFace(BaseModel):
    bbox: BBox
    kps: list[list[float]]
    det_score: float
    hit: StreamHit | None = None


class StreamResponse(BaseModel):
    faces: list[StreamFace]
    width: int
    height: int
    threshold: float


class HealthResponse(BaseModel):
    detector: bool
    swapper: bool
    swapper_error: str | None = None
    provider: str
    device_id: int
    model_pack: str
    det_size: int
    db_count: int
