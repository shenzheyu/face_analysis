from fastapi import APIRouter, File, HTTPException, UploadFile

from ..face_engine import decode_image, engine
from ..models import BBox, DetectedFace, DetectResponse

router = APIRouter()


@router.post("/detect", response_model=DetectResponse)
async def detect(image: UploadFile = File(...)) -> DetectResponse:
    try:
        img = decode_image(await image.read())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    faces = engine.get_faces(img)
    h, w = img.shape[:2]
    out = []
    for f in faces:
        x1, y1, x2, y2 = f.bbox.tolist()
        out.append(
            DetectedFace(
                bbox=BBox(x1=x1, y1=y1, x2=x2, y2=y2),
                kps=f.kps.tolist(),
                det_score=float(f.det_score),
            )
        )
    return DetectResponse(faces=out, width=w, height=h)
