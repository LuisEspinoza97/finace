"""Genera texto sintetico que imita la salida de `pdftotext -layout` para un
estado de cuenta de Banco Pichincha. Cifras inventadas, no un extracto real."""

ENCABEZADO = """\
                              BANCO PICHINCHA
                          ESTADO DE CUENTA DE AHORROS

CUENTA: 2200123456
FECHA ULTIMO CORTE (FACTURA)   01-07-2024
FECHA ESTE CORTE                31-07-2024

SALDO ANTERIOR                                  500.00
SALDO ACTUAL                                    556.50

DETALLE DE MOVIMIENTOS
FECHA     OFIC.  N.DOC.     DESCRIPCION                          DEBITO   CREDITO    SALDO
"""

PIE_CUADRA = """
DEPOSITO / CREDITOS  (1)   1000.00
CHEQUES / DEBITOS    (2)   943.50
"""


def texto_pichincha_cuadrado() -> str:
    """3 movimientos que cuadran: 500.00 + 1000.00 - 943.50 = 556.50."""
    lineas = [
        "05-jul.   12     8164451    SUELDO EMPRESA XYZ                    0.00  1000.00   1500.00",
        "10-jul.   12     8164452    PRIMAX GASOLINERA LOJA                43.50     0.00   1456.50",
        "20-jul.   12     8164453    ALICUOTA CONJUNTO LAS FLORES         900.00     0.00    556.50",
    ]
    return ENCABEZADO + "\n".join(lineas) + "\n" + PIE_CUADRA


def texto_pichincha_no_cuadra() -> str:
    """Mismas lineas pero SALDO ACTUAL manipulado para que no cuadre."""
    texto = texto_pichincha_cuadrado()
    return texto.replace("SALDO ACTUAL                                    556.50",
                          "SALDO ACTUAL                                    999.99")
