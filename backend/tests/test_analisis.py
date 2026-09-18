from datetime import date

from app.core.analisis import ingresos_extraordinarios
from app.core.parsers import Extracto, Movimiento


def _extracto(movs):
    return Extracto("Banco Pichincha", "****0000", date(2024, 7, 1), date(2024, 7, 31),
                     0.0, 0.0, movs)


def test_entrada_que_pesa_92_por_ciento_se_marca():
    movs = [
        Movimiento(date(2024, 7, 5), "DEPOSITO EXTRAORDINARIO", 1150.0),
        Movimiento(date(2024, 7, 10), "SUELDO EMPRESA", 50.0),
        Movimiento(date(2024, 7, 15), "REEMBOLSO", 50.0),
    ]
    extra = ingresos_extraordinarios(_extracto(movs))
    assert len(extra) == 1
    assert extra[0].monto == 1150.0


def test_tres_sueldos_iguales_no_marcan_nada():
    movs = [
        Movimiento(date(2024, 7, 5), "SUELDO EMPRESA", 500.0),
        Movimiento(date(2024, 7, 5), "SUELDO EMPRESA", 500.0),
        Movimiento(date(2024, 7, 5), "SUELDO EMPRESA", 500.0),
    ]
    assert ingresos_extraordinarios(_extracto(movs)) == []
