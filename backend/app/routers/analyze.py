from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..face_engine import decode_image, engine
from ..models import AnalyzedFace, AnalyzeResponse, BBox

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    image: UploadFile = File(...),
    include_embedding: bool = Form(default=False),
) -> AnalyzeResponse:
    try:
        img = decode_image(await image.read())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    faces = engine.get_faces(img)
    h, w = img.shape[:2]
    out = []
    for f in faces:
        x1, y1, x2, y2 = f.bbox.tolist()
        emb = None
        if include_embedding and hasattr(f, "normed_embedding"):
            emb = f.normed_embedding.astype(float).tolist()
        gender = None
        if getattr(f, "sex", None) is not None:
            gender = "male" if f.sex == "M" or f.sex == 1 else "female"
        age = int(f.age) if getattr(f, "age", None) is not None else None
        out.append(
            AnalyzedFace(
                bbox=BBox(x1=x1, y1=y1, x2=x2, y2=y2),
                kps=f.kps.tolist(),
                det_score=float(f.det_score),
                age=age,
                gender=gender,
                embedding=emb,
            )
        )
    return AnalyzeResponse(faces=out, width=w, height=h)
