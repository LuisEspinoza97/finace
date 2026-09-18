"""Endpoint de analisis."""

from __future__ import annotations

import json
import logging
import tempfile
import time
from pathlib import Path

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.auth import requiere_sesion
from app.core.analisis import analizar
from app.core.categorias import POR_NOMBRE
from app.core.parsers import parsear_pdf

logger = logging.getLogger("radiografia")

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

MAX_BYTES = 10 * 1024 * 1024
MAGIC_PDF = b"%PDF-"


def _parsear_reglas_usuario(crudo: str) -> list[tuple[str, str]]:
    """Reglas creadas por el usuario en su navegador (localStorage), mandadas
    en cada peticion. Se ignora silenciosamente cualquier entrada mal formada
    o con una categoria que no existe: es mejor perder una regla invalida que
    romper el analisis completo."""
    try:
        crudas = json.loads(crudo)
    except json.JSONDecodeError:
        return []
    if not isinstance(crudas, list):
        return []
    reglas = []
    for r in crudas:
        if not isinstance(r, dict):
            continue
        clave = str(r.get("clave", "")).strip().upper()
        categoria = str(r.get("categoria", "")).strip()
        if clave and categoria in POR_NOMBRE:
            reglas.append((clave, categoria))
    return reglas


@router.post("/api/analizar", dependencies=[Depends(requiere_sesion)])
@limiter.limit("20/minute")
async def analizar_endpoint(request: Request, archivo: UploadFile, reglas: str = Form("[]")):
    contenido = await archivo.read()

    if len(contenido) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera los 10 MB.")
    if not contenido.startswith(MAGIC_PDF):
        raise HTTPException(status_code=415, detail="El archivo no es un PDF valido.")

    reglas_usuario = _parsear_reglas_usuario(reglas)

    tmp_path: str | None = None
    inicio = time.monotonic()
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(contenido)
            tmp_path = tmp.name

        try:
            extracto = parsear_pdf(tmp_path)
        except ValueError as e:
            mensaje = str(e)
            if mensaje.startswith("No reconozco el formato"):
                raise HTTPException(status_code=415, detail=mensaje) from e
            raise HTTPException(status_code=422, detail=mensaje) from e

        resultado = analizar(extracto, reglas_usuario)
        duracion = round(time.monotonic() - inicio, 3)
        logger.info("analisis ok banco=%s n_movimientos=%d duracion=%s",
                    extracto.banco, len(extracto.movimientos), duracion)
        return resultado
    finally:
        if tmp_path is not None:
            Path(tmp_path).unlink(missing_ok=True)
