import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from .. import config
from ..face_db import cosine_similarity, db
from ..face_engine import decode_image, engine
from ..models import (
    CompareResponse,
    EnrollResponse,
    FaceRecordOut,
    ListResponse,
    SearchHit,
    SearchResponse,
)

router = APIRouter(prefix="/recognize")


def _extract_embedding(image_bytes: bytes) -> np.ndarray:
    img = decode_image(image_bytes)
    faces = engine.get_faces(img)
    if not faces:
        raise HTTPException(status_code=422, detail="No face detected in image")
    faces.sort(key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]), reverse=True)
    face = faces[0]
    if not hasattr(face, "normed_embedding"):
        raise HTTPException(status_code=500, detail="Embedding model missing from pack")
    return np.asarray(face.normed_embedding, dtype=np.float32)


@router.post("/enroll", response_model=EnrollResponse)
async def enroll(
    image: UploadFile = File(...),
    name: str = Form(...),
) -> EnrollResponse:
    emb = _extract_embedding(await image.read())
    rec = db.enroll(name=name, embedding=emb)
    return EnrollResponse(id=rec.id, name=rec.name, created_at=rec.created_at)


@router.post("/search", response_model=SearchResponse)
async def search(
    image: UploadFile = File(...),
    top_k: int = Form(default=5),
) -> SearchResponse:
    emb = _extract_embedding(await image.read())
    hits = db.search(emb, top_k=top_k)
    return SearchResponse(
        hits=[SearchHit(id=r.id, name=r.name, similarity=s) for r, s in hits],
        threshold=config.FACE_SIM_THRESHOLD,
    )


@router.post("/compare", response_model=CompareResponse)
async def compare(
    image1: UploadFile = File(...),
    image2: UploadFile = File(...),
) -> CompareResponse:
    e1 = _extract_embedding(await image1.read())
    e2 = _extract_embedding(await image2.read())
    sim = cosine_similarity(e1, e2)
    return CompareResponse(
        similarity=sim,
        is_same=sim >= config.FACE_SIM_THRESHOLD,
        threshold=config.FACE_SIM_THRESHOLD,
    )


@router.get("/list", response_model=ListResponse)
def list_all() -> ListResponse:
    records = db.list_all()
    return ListResponse(
        records=[FaceRecordOut(id=r.id, name=r.name, created_at=r.created_at) for r in records],
        count=len(records),
    )


@router.delete("/{face_id}")
def delete(face_id: str) -> dict:
    if not db.delete(face_id):
        raise HTTPException(status_code=404, detail="face_id not found")
    return {"deleted": face_id}
