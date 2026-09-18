import os

from tests.conftest import PASSWORD_PRUEBA


def test_login_correcto_pone_cookie(cliente):
    r = cliente.post("/api/login", json={"usuario": os.environ["APP_USUARIO"],
                                          "password": PASSWORD_PRUEBA})
    assert r.status_code == 200
    assert "sesion" in r.cookies


def test_password_incorrecta_da_401(cliente):
    r = cliente.post("/api/login", json={"usuario": os.environ["APP_USUARIO"],
                                          "password": "clave-mala"})
    assert r.status_code == 401


def test_usuario_inexistente_no_filtra_nada(cliente):
    r_usuario_malo = cliente.post("/api/login", json={"usuario": "no-existe",
                                                       "password": "cualquiera"})
    r_password_mala = cliente.post("/api/login", json={"usuario": os.environ["APP_USUARIO"],
                                                        "password": "clave-mala"})
    assert r_usuario_malo.status_code == r_password_mala.status_code == 401
    assert r_usuario_malo.json()["detail"] == r_password_mala.json()["detail"]


def test_sin_cookie_da_401_en_endpoint_protegido(cliente):
    r = cliente.post("/api/analizar",
                     files={"archivo": ("f.pdf", b"%PDF-1.4 relleno", "application/pdf")})
    assert r.status_code == 401


def test_jwt_manipulado_da_401(cliente):
    cliente.cookies.set("sesion", "esto-no-es-un-jwt-valido")
    r = cliente.post("/api/analizar",
                     files={"archivo": ("f.pdf", b"%PDF-1.4 relleno", "application/pdf")})
    assert r.status_code == 401


def test_yo_refleja_el_estado_de_la_sesion(cliente):
    assert cliente.get("/api/yo").json() == {"autenticado": False}
    cliente.post("/api/login", json={"usuario": os.environ["APP_USUARIO"],
                                     "password": PASSWORD_PRUEBA})
    assert cliente.get("/api/yo").json() == {"autenticado": True}


def test_logout_borra_la_sesion(cliente_autenticado):
    assert cliente_autenticado.get("/api/yo").json()["autenticado"] is True
    cliente_autenticado.post("/api/logout")
    assert cliente_autenticado.get("/api/yo").json()["autenticado"] is False


def test_bloqueo_progresivo_tras_5_intentos_fallidos(cliente):
    for _ in range(5):
        r = cliente.post("/api/login", json={"usuario": os.environ["APP_USUARIO"],
                                              "password": "clave-mala"})
        assert r.status_code == 401
    bloqueado = cliente.post("/api/login", json={"usuario": os.environ["APP_USUARIO"],
                                                  "password": "clave-mala"})
    assert bloqueado.status_code == 429

    # ni siquiera con la contrasena correcta se puede entrar durante el bloqueo
    intento_correcto_bloqueado = cliente.post(
        "/api/login", json={"usuario": os.environ["APP_USUARIO"], "password": PASSWORD_PRUEBA})
    assert intento_correcto_bloqueado.status_code == 429
