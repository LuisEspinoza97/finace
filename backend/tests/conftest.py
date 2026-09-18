"""Credenciales de prueba. NO son reales: existen solo para que app.auth
pueda arrancar en los tests (exige APP_USUARIO/APP_PASSWORD_HASH/JWT_SECRET)."""

import os

import pytest

os.environ.setdefault("APP_USUARIO", "usuario_prueba")
os.environ.setdefault(
    "APP_PASSWORD_HASH",
    "$2b$12$IfbPVGgYfbHqGZ64h5a9mevAItAK7xFya3XnUKoz5jz7Hl0kFijm2",  # hash de PASSWORD_PRUEBA
)
os.environ.setdefault("JWT_SECRET", "secreto-de-pruebas-no-usar-en-produccion")

PASSWORD_PRUEBA = "ClaveDePrueba123"


@pytest.fixture(autouse=True)
def _reset_bloqueo_login():
    import app.auth as auth
    auth._intentos_fallidos = 0
    auth._bloqueado_hasta = 0.0
    yield
    auth._intentos_fallidos = 0
    auth._bloqueado_hasta = 0.0


@pytest.fixture
def cliente():
    from fastapi.testclient import TestClient
    from app.main import app
    # base_url en https: la cookie de sesion es Secure y el cliente de
    # pruebas solo la reenvia si las peticiones van sobre https.
    return TestClient(app, base_url="https://testserver")


@pytest.fixture
def cliente_autenticado(cliente):
    r = cliente.post("/api/login", json={"usuario": os.environ["APP_USUARIO"],
                                          "password": PASSWORD_PRUEBA})
    assert r.status_code == 200
    return cliente
