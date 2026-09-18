from pathlib import Path

from fastapi.testclient import TestClient

import app.routers.analisis as analisis_router
from app.core.parsers import Extracto, Movimiento
from app.main import app
from datetime import date

client = TestClient(app)


def _pdf_valido(cuerpo: bytes = b"contenido cualquiera") -> bytes:
    return b"%PDF-1.4\n" + cuerpo


def test_rechaza_archivo_sin_magic_bytes_pdf():
    r = client.post("/api/analizar", files={"archivo": ("f.pdf", b"esto no es un pdf", "application/pdf")})
    assert r.status_code == 415


def test_rechaza_archivo_mayor_a_10mb():
    grande = _pdf_valido(b"0" * (10 * 1024 * 1024 + 1))
    r = client.post("/api/analizar", files={"archivo": ("f.pdf", grande, "application/pdf")})
    assert r.status_code == 413


def test_extracto_que_no_cuadra_da_422(monkeypatch):
    def falla(ruta):
        raise ValueError("El extracto no cuadra: ...")
    monkeypatch.setattr(analisis_router, "parsear_pdf", falla)
    r = client.post("/api/analizar", files={"archivo": ("f.pdf", _pdf_valido(), "application/pdf")})
    assert r.status_code == 422
    assert "no cuadra" in r.json()["detail"]


def test_banco_no_reconocido_da_415(monkeypatch):
    def falla(ruta):
        raise ValueError("No reconozco el formato de este PDF. Bancos soportados: Banco Pichincha")
    monkeypatch.setattr(analisis_router, "parsear_pdf", falla)
    r = client.post("/api/analizar", files={"archivo": ("f.pdf", _pdf_valido(), "application/pdf")})
    assert r.status_code == 415
    assert "Bancos soportados" in r.json()["detail"]


def test_exito_devuelve_json_y_no_deja_archivo_temporal(monkeypatch):
    rutas_usadas = []

    def falso_parseo(ruta):
        rutas_usadas.append(ruta)
        assert Path(ruta).exists()
        return Extracto("Banco Pichincha", "****0000", date(2024, 7, 1), date(2024, 7, 31),
                        100.0, 100.0, [Movimiento(date(2024, 7, 5), "SUELDO", 50.0),
                                        Movimiento(date(2024, 7, 6), "COMPRA", -50.0)])

    monkeypatch.setattr(analisis_router, "parsear_pdf", falso_parseo)
    r = client.post("/api/analizar", files={"archivo": ("f.pdf", _pdf_valido(), "application/pdf")})
    assert r.status_code == 200
    assert "resumen" in r.json()
    assert rutas_usadas, "el parser deberia haber sido llamado"
    assert not Path(rutas_usadas[0]).exists()
