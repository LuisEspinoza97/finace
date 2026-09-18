from app.core.categorias import detectar


def test_primax_es_transporte_no_suscripciones():
    _, cat, _ = detectar("PRIMAX GASOLINERA LOJA")
    assert cat == "Transporte esencial"


def test_alicuota_es_vivienda_no_prestamos():
    _, cat, _ = detectar("ALICUOTA CONJUNTO LAS FLORES")
    assert cat == "Vivienda"


def test_uber_eats_es_delivery():
    _, cat, _ = detectar("UBER EATS PEDIDO 123")
    assert cat == "Delivery apps"


def test_uber_trip_es_transporte():
    _, cat, _ = detectar("UBER TRIP VIAJE 456")
    assert cat == "Transporte esencial"


def test_transferencia_generica_sin_comercio():
    _, cat, _ = detectar("TRANSFERENCIA INTERNET")
    assert cat == "Transferencias y retiros"


def test_sin_clasificar_cuando_no_hay_regla():
    _, cat, _ = detectar("COMERCIO DESCONOCIDO XYZ")
    assert cat == "SIN CLASIFICAR"


def test_regla_de_usuario_clasifica_lo_que_no_tenia_regla():
    _, cat, _ = detectar("MI TIENDA FAVORITA", [("MI TIENDA FAVORITA", "Compras y ropa")])
    assert cat == "Compras y ropa"


def test_regla_de_usuario_sobrescribe_una_regla_base():
    _, cat, _ = detectar("NETFLIX", [("NETFLIX", "Entretenimiento y ocio")])
    assert cat == "Entretenimiento y ocio"


def test_sin_reglas_de_usuario_se_comporta_como_antes():
    _, cat, _ = detectar("NETFLIX", None)
    assert cat == "Suscripciones digitales"
