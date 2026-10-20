from __future__ import annotations

import hmac
import os

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status

from . import __version__
from .import_processor import ImportValidationError, MAX_FILE_BYTES, preview_import


app = FastAPI(
    title="Logicore Velocity Processing Service",
    version=__version__,
    docs_url=None if os.getenv("APP_ENV") == "production" else "/docs",
    redoc_url=None,
)


def require_service_token(x_service_token: str | None = Header(default=None)) -> None:
    configured = os.getenv("PROCESSING_SERVICE_TOKEN", "")
    if not configured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service token is not configured")
    if not x_service_token or not hmac.compare_digest(x_service_token, configured):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid service token")


@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": True, "service": "logicore-python-processing", "version": __version__}


@app.post("/v1/imports/preview", dependencies=[Depends(require_service_token)])
async def import_preview(
    data_type: str = Form(...),
    file: UploadFile = File(...),
) -> dict[str, object]:
    content = await file.read(MAX_FILE_BYTES + 1)
    try:
        return preview_import(filename=file.filename or "upload", content=content, data_type=data_type)
    except ImportValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    finally:
        await file.close()
