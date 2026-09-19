"""Login de usuario unico. Sin registro, sin tabla de usuarios: las
credenciales viven en variables de entorno y la sesion es un JWT en cookie
httpOnly.

Uso para generar el hash de la contrasena (se pega en APP_PASSWORD_HASH):

    python -m app.auth hash
"""

from __future__ import annotations

import getpass
import os
import secrets
import sys
import time
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, HTTPException, Request, Response
from passlib.context import CryptContext
from pydantic import BaseModel

JWT_ALGORITHM = "HS256"
JWT_TTL = timedelta(days=7)
COOKIE_NAME = "sesion"

# "strict" cuando frontend y backend comparten dominio (el nginx de
# docker-compose hace de proxy, ver frontend/nginx.conf). Si los despliegas
# en dominios separados (ej. dos servicios de Render), el navegador los trata
# como sitios distintos y "strict" bloquea la cookie: en ese caso hay que
# definir COOKIE_SAMESITE=none.
COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "strict").lower()

# Bloqueo progresivo: a partir del intento 6, la espera se duplica en cada
# fallo adicional (1 min, 2 min, 4 min, ...). Es en memoria de proceso: un
# solo usuario, no hace falta persistirlo.
MAX_INTENTOS = 5
ESPERA_BASE = timedelta(minutes=1)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    sys.exit("JWT_SECRET no esta definido. El servidor no arranca sin el "
              "(generarlo al vuelo invalidaria las sesiones en cada reinicio).")

APP_USUARIO = os.environ.get("APP_USUARIO")
APP_PASSWORD_HASH = os.environ.get("APP_PASSWORD_HASH")
if not (APP_USUARIO and APP_PASSWORD_HASH):
    sys.exit("APP_USUARIO y APP_PASSWORD_HASH deben estar definidos en el entorno.")

# Hash de relleno para que verificar un usuario que no existe tome el mismo
# tiempo que verificar uno que si existe (evita que la respuesta filtre por
# tiempo si el usuario configurado es correcto).
_HASH_RELLENO = pwd_context.hash(secrets.token_hex(16))

router = APIRouter()

_intentos_fallidos = 0
_bloqueado_hasta = 0.0


class Credenciales(BaseModel):
    usuario: str
    password: str


def _crear_token() -> str:
    ahora = datetime.now(timezone.utc)
    payload = {"sub": APP_USUARIO, "iat": ahora, "exp": ahora + JWT_TTL}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _token_valido(token: str) -> bool:
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return True
    except jwt.PyJWTError:
        return False


def requiere_sesion(request: Request) -> None:
    token = request.cookies.get(COOKIE_NAME)
    if not token or not _token_valido(token):
        raise HTTPException(status_code=401, detail="Sesion invalida o expirada.")


@router.post("/api/login")
def login(cred: Credenciales, response: Response):
    global _intentos_fallidos, _bloqueado_hasta

    ahora = time.monotonic()
    if ahora < _bloqueado_hasta:
        restante = round(_bloqueado_hasta - ahora)
        raise HTTPException(status_code=429,
                            detail=f"Demasiados intentos fallidos. Espera {restante}s.")

    # Siempre se corre un bcrypt.verify, exista o no el usuario, para que la
    # respuesta tarde lo mismo en ambos casos.
    hash_objetivo = APP_PASSWORD_HASH if cred.usuario == APP_USUARIO else _HASH_RELLENO
    password_ok = pwd_context.verify(cred.password, hash_objetivo)
    valido = password_ok and cred.usuario == APP_USUARIO

    if not valido:
        _intentos_fallidos += 1
        if _intentos_fallidos >= MAX_INTENTOS:
            _bloqueado_hasta = ahora + ESPERA_BASE.total_seconds() * (2 ** (_intentos_fallidos - MAX_INTENTOS))
        raise HTTPException(status_code=401, detail="Usuario o contrasena incorrectos.")

    _intentos_fallidos = 0
    _bloqueado_hasta = 0.0
    token = _crear_token()
    response.set_cookie(COOKIE_NAME, token, httponly=True, secure=True,
                        samesite=COOKIE_SAMESITE, max_age=int(JWT_TTL.total_seconds()))
    return {"ok": True}


@router.post("/api/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, httponly=True, secure=True, samesite=COOKIE_SAMESITE)
    return {"ok": True}


@router.get("/api/yo")
def yo(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    return {"autenticado": bool(token and _token_valido(token))}


def _hash_interactivo() -> None:
    password = getpass.getpass("Contrasena: ")
    confirmacion = getpass.getpass("Confirma la contrasena: ")
    if password != confirmacion:
        sys.exit("Las contrasenas no coinciden.")
    print(pwd_context.hash(password))


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "hash":
        _hash_interactivo()
    else:
        sys.exit("Uso: python -m app.auth hash")
