from app.core.parsers import Pichincha
from tests.fixtures import texto_pichincha_cuadrado, texto_pichincha_no_cuadra


def test_cuadre_correcto():
    ext = Pichincha.parsear(texto_pichincha_cuadrado())
    assert ext.validar() == []
    assert round(ext.saldo_inicial + ext.entradas - ext.salidas, 2) == ext.saldo_final


def test_no_cuadra_da_error():
    ext = Pichincha.parsear(texto_pichincha_no_cuadra())
    errores = ext.validar()
    assert errores
    assert "no cuadra" in errores[0]


def test_reconoce_pichincha():
    assert Pichincha.reconoce(texto_pichincha_cuadrado())


def test_no_reconoce_otro_banco():
    assert not Pichincha.reconoce("BANCO GUAYAQUIL ESTADO DE CUENTA")
