from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from ..face_engine import decode_image, encode_image_png, engine

router = APIRouter()


def _pick_largest(faces):
    if not faces:
        return None
    return max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))


@router.post("/swap", responses={200: {"content": {"image/png": {}}}})
async def swap(
    source_image: UploadFile = File(..., description="face to copy from"),
    target_image: UploadFile = File(..., description="image to paste face onto"),
) -> Response:
    if engine.swapper is None:
        raise HTTPException(
            status_code=503,
            detail=engine.swapper_error or "swapper model not loaded",
        )

    try:
        src = decode_image(await source_image.read())
        tgt = decode_image(await target_image.read())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    src_face = _pick_largest(engine.get_faces(src))
    if src_face is None:
        raise HTTPException(status_code=422, detail="No face found in source image")

    tgt_faces = engine.get_faces(tgt)
    if not tgt_faces:
        raise HTTPException(status_code=422, detail="No face found in target image")

    result = tgt
    for tf in tgt_faces:
        result = engine.swap(result, tf, src_face)

    return Response(content=encode_image_png(result), media_type="image/png")
