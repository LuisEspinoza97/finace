"""
Taxonomia y motor de categorizacion — Radiografia Financiera.

Extraido de un analisis real de estados de cuenta ecuatorianos.
Las reglas estan ORDENADAS: si varias coinciden, gana la que este MAS ABAJO.
Por eso lo generico va arriba y lo especifico abajo.

NO reordenes la lista sin correr tests/test_categorizador.py.
"""

from dataclasses import dataclass

# ---------------------------------------------------------------- grupos
G_NEC = "NECESIDADES BASICAS"
G_EST = "ESTILO DE VIDA"
G_DEU = "DEUDAS Y FINANCIERO"
G_FUG = "FUGAS / GASTOS HORMIGA"
G_ING = "INGRESOS"

# Presupuesto saludable, adaptado de la regla 50/30/20. Es un SUPUESTO editable.
OBJETIVO_GRUPO = {G_NEC: 0.50, G_EST: 0.25, G_DEU: 0.20, G_FUG: 0.05}


@dataclass(frozen=True)
class Categoria:
    nombre: str
    grupo: str
    objetivo: float   # fraccion del gasto total que se considera sana
    incluye: str


CATEGORIAS: list[Categoria] = [
    Categoria('Vivienda', G_NEC, 0.25, 'Arriendo, alicuota, condominio'),
    Categoria('Servicios basicos', G_NEC, 0.08, 'Luz, agua, internet, telefonia'),
    Categoria('Alimentacion / Supermercado', G_NEC, 0.15, 'Compra de despensa'),
    Categoria('Salud y farmacia', G_NEC, 0.05, 'Consultas, medicinas, seguro medico'),
    Categoria('Transporte esencial', G_NEC, 0.07, 'Combustible, bus, mantenimiento vehiculo'),
    Categoria('Educacion', G_NEC, 0.04, 'Matriculas, cursos, libros'),
    Categoria('Restaurantes y cafeterias', G_EST, 0.08, 'Comer fuera'),
    Categoria('Entretenimiento y ocio', G_EST, 0.04, 'Cine, bares, eventos, deporte'),
    Categoria('Compras y ropa', G_EST, 0.06, 'Ropa, hogar, tecnologia'),
    Categoria('Suscripciones digitales', G_EST, 0.02, 'Streaming, software, nube'),
    Categoria('Viajes', G_EST, 0.03, 'Hoteles, pasajes, turismo'),
    Categoria('Pago tarjeta de credito', G_DEU, 0.05, 'Pagos a TC'),
    Categoria('Prestamos y cuotas', G_DEU, 0.05, 'Cuotas de credito'),
    Categoria('Comisiones e intereses', G_DEU, 0.01, 'Comisiones bancarias, intereses, SPI'),
    Categoria('Transferencias y retiros', G_DEU, 0.05, 'Movimientos entre cuentas / cajero - revisa si son gasto real'),
    Categoria('Impuestos y seguros', G_DEU, 0.02, 'SRI, matricula, polizas'),
    Categoria('Delivery apps', G_FUG, 0.01, 'PedidosYa, Uber Eats, Rappi'),
    Categoria('Tiendas de conveniencia', G_FUG, 0.01, 'Minimarket, tienda de barrio'),
    Categoria('Recargas y microconsumos', G_FUG, 0.01, 'Saldo celular, apps, micropagos'),
    Categoria('SIN CLASIFICAR', G_FUG, 0.0, 'Revisar y crear regla en la hoja Reglas'),
    Categoria('Sueldo', G_ING, 0.0, 'Nomina / rol de pagos'),
    Categoria('Ingresos negocio', G_ING, 0.0, 'Cobros de clientes, ventas'),
    Categoria('Otros ingresos', G_ING, 0.0, 'Reembolsos, intereses, extras'),
]

POR_NOMBRE = {c.nombre: c for c in CATEGORIAS}
SIN_CLASIFICAR = "SIN CLASIFICAR"

# ---------------------------------------------------------------- reglas
# (palabra_clave_en_mayusculas, categoria)
# GANA LA ULTIMA COINCIDENCIA. Lo generico arriba, lo especifico abajo.
REGLAS: list[tuple[str, str]] = [
    ('CNT', 'Servicios basicos'),
    ('EERSSA', 'Servicios basicos'),
    ('ELECTRICA', 'Servicios basicos'),
    ('AGUA POTABLE', 'Servicios basicos'),
    ('UMAPAL', 'Servicios basicos'),
    ('NETLIFE', 'Servicios basicos'),
    ('PUNTONET', 'Servicios basicos'),
    ('TVCABLE', 'Servicios basicos'),
    ('CLARO', 'Servicios basicos'),
    ('MOVISTAR', 'Servicios basicos'),
    ('CONECEL', 'Servicios basicos'),
    ('OTECEL', 'Servicios basicos'),
    ('ARRIENDO', 'Vivienda'),
    ('ALQUILER', 'Vivienda'),
    ('ALICUOTA', 'Vivienda'),
    ('CONDOMINIO', 'Vivienda'),
    ('SUPERMAXI', 'Alimentacion / Supermercado'),
    ('MEGAMAXI', 'Alimentacion / Supermercado'),
    ('AKI', 'Alimentacion / Supermercado'),
    ('GRAN AKI', 'Alimentacion / Supermercado'),
    ('MI COMISARIATO', 'Alimentacion / Supermercado'),
    ('CORAL', 'Alimentacion / Supermercado'),
    ('SANTA MARIA', 'Alimentacion / Supermercado'),
    ('TIA', 'Alimentacion / Supermercado'),
    ('MERCADO', 'Alimentacion / Supermercado'),
    ('PANADERIA', 'Alimentacion / Supermercado'),
    ('COMISARIATO', 'Alimentacion / Supermercado'),
    ('FARMACIA', 'Salud y farmacia'),
    ('SANA SANA', 'Salud y farmacia'),
    ('CRUZ AZUL', 'Salud y farmacia'),
    ('FYBECA', 'Salud y farmacia'),
    ('PHARMACYS', 'Salud y farmacia'),
    ('MEDICITY', 'Salud y farmacia'),
    ('CLINICA', 'Salud y farmacia'),
    ('HOSPITAL', 'Salud y farmacia'),
    ('LABORATORIO', 'Salud y farmacia'),
    ('IESS', 'Salud y farmacia'),
    ('ODONTO', 'Salud y farmacia'),
    ('PRIMAX', 'Transporte esencial'),
    ('PETROECUADOR', 'Transporte esencial'),
    ('ESTACION DE SERVICIO', 'Transporte esencial'),
    ('TERPEL', 'Transporte esencial'),
    ('GASOLINERA', 'Transporte esencial'),
    ('COMBUSTIBLE', 'Transporte esencial'),
    ('LUBRICADORA', 'Transporte esencial'),
    ('PEAJE', 'Transporte esencial'),
    ('MECANICA', 'Transporte esencial'),
    ('LLANTA', 'Transporte esencial'),
    ('COOPERATIVA DE TRANSPORTE', 'Transporte esencial'),
    ('UNIVERSIDAD', 'Educacion'),
    ('MATRICULA', 'Educacion'),
    ('COLEGIO', 'Educacion'),
    ('UDEMY', 'Educacion'),
    ('COURSERA', 'Educacion'),
    ('PLATZI', 'Educacion'),
    ('LIBRERIA', 'Educacion'),
    ('RESTAURANT', 'Restaurantes y cafeterias'),
    ('CAFETERIA', 'Restaurantes y cafeterias'),
    ('CAFE', 'Restaurantes y cafeterias'),
    ('KFC', 'Restaurantes y cafeterias'),
    ('MCDONALD', 'Restaurantes y cafeterias'),
    ('BURGER', 'Restaurantes y cafeterias'),
    ('PIZZA', 'Restaurantes y cafeterias'),
    ('SUBWAY', 'Restaurantes y cafeterias'),
    ('POLLO', 'Restaurantes y cafeterias'),
    ('JUAN VALDEZ', 'Restaurantes y cafeterias'),
    ('SWEET & COFFEE', 'Restaurantes y cafeterias'),
    ('CEVICHE', 'Restaurantes y cafeterias'),
    ('ASADERO', 'Restaurantes y cafeterias'),
    ('CINEMARK', 'Entretenimiento y ocio'),
    ('SUPERCINES', 'Entretenimiento y ocio'),
    ('BAR ', 'Entretenimiento y ocio'),
    ('DISCOTECA', 'Entretenimiento y ocio'),
    ('LICORERIA', 'Entretenimiento y ocio'),
    ('GIMNASIO', 'Entretenimiento y ocio'),
    ('GYM', 'Entretenimiento y ocio'),
    ('STEAM', 'Entretenimiento y ocio'),
    ('PLAYSTATION', 'Entretenimiento y ocio'),
    ('XBOX', 'Entretenimiento y ocio'),
    ('DE PRATI', 'Compras y ropa'),
    ('ETAFASHION', 'Compras y ropa'),
    ('MARATHON', 'Compras y ropa'),
    ('KYWI', 'Compras y ropa'),
    ('FERRISARIATO', 'Compras y ropa'),
    ('SUKASA', 'Compras y ropa'),
    ('ARTEFACTA', 'Compras y ropa'),
    ('COMANDATO', 'Compras y ropa'),
    ('CREDITOS ECONOMICOS', 'Compras y ropa'),
    ('AMAZON', 'Compras y ropa'),
    ('ALIEXPRESS', 'Compras y ropa'),
    ('MERCADO LIBRE', 'Compras y ropa'),
    ('SHEIN', 'Compras y ropa'),
    ('TEMU', 'Compras y ropa'),
    ('NETFLIX', 'Suscripciones digitales'),
    ('SPOTIFY', 'Suscripciones digitales'),
    ('DISNEY', 'Suscripciones digitales'),
    ('HBO', 'Suscripciones digitales'),
    ('HBO MAX', 'Suscripciones digitales'),
    ('PRIME VIDEO', 'Suscripciones digitales'),
    ('YOUTUBE', 'Suscripciones digitales'),
    ('GOOGLE', 'Suscripciones digitales'),
    ('APPLE', 'Suscripciones digitales'),
    ('ICLOUD', 'Suscripciones digitales'),
    ('MICROSOFT', 'Suscripciones digitales'),
    ('OFFICE 365', 'Suscripciones digitales'),
    ('ADOBE', 'Suscripciones digitales'),
    ('CANVA', 'Suscripciones digitales'),
    ('CHATGPT', 'Suscripciones digitales'),
    ('OPENAI', 'Suscripciones digitales'),
    ('ANTHROPIC', 'Suscripciones digitales'),
    ('CLAUDE', 'Suscripciones digitales'),
    ('DROPBOX', 'Suscripciones digitales'),
    ('GITHUB', 'Suscripciones digitales'),
    ('DIGITALOCEAN', 'Suscripciones digitales'),
    ('CLOUDFLARE', 'Suscripciones digitales'),
    ('HOSTING', 'Suscripciones digitales'),
    ('DOMINIO', 'Suscripciones digitales'),
    ('HOTEL', 'Viajes'),
    ('HOSTAL', 'Viajes'),
    ('AVIANCA', 'Viajes'),
    ('LATAM', 'Viajes'),
    ('BOOKING', 'Viajes'),
    ('AIRBNB', 'Viajes'),
    ('AEROLINEA', 'Viajes'),
    ('PAGO TARJETA', 'Pago tarjeta de credito'),
    ('TARJETA DE CREDITO', 'Pago tarjeta de credito'),
    ('PAGO DE TC', 'Pago tarjeta de credito'),
    ('PAGO TC', 'Pago tarjeta de credito'),
    ('PAGO DINERS', 'Pago tarjeta de credito'),
    ('PAGO VISA', 'Pago tarjeta de credito'),
    ('PAGO MASTERCARD', 'Pago tarjeta de credito'),
    ('CANCELACION TARJETA', 'Pago tarjeta de credito'),
    ('PRESTAMO', 'Prestamos y cuotas'),
    ('CREDITO DIRECTO', 'Prestamos y cuotas'),
    ('PAGO CUOTA', 'Prestamos y cuotas'),
    ('CUOTA CREDITO', 'Prestamos y cuotas'),
    ('DIVIDENDO', 'Prestamos y cuotas'),
    ('COMISION', 'Comisiones e intereses'),
    ('INTERES', 'Comisiones e intereses'),
    ('MANTENIMIENTO CUENTA', 'Comisiones e intereses'),
    ('COSTO SERVICIO', 'Comisiones e intereses'),
    ('PAGO SPI', 'Comisiones e intereses'),
    ('IMPUESTO', 'Impuestos y seguros'),
    ('SRI', 'Impuestos y seguros'),
    ('MATRICULACION', 'Impuestos y seguros'),
    ('SEGURO', 'Impuestos y seguros'),
    ('POLIZA', 'Impuestos y seguros'),
    ('TRANSFERENCIA', 'Transferencias y retiros'),
    ('TRANSF', 'Transferencias y retiros'),
    ('RETIRO', 'Transferencias y retiros'),
    ('CAJERO', 'Transferencias y retiros'),
    ('ATM', 'Transferencias y retiros'),
    ('DEUNA', 'Transferencias y retiros'),
    ('MERCADO PAGO', 'Transferencias y retiros'),
    ('PAGO MOVIL', 'Transferencias y retiros'),
    ('UBER', 'Transporte esencial'),
    ('DIDI', 'Transporte esencial'),
    ('CABIFY', 'Transporte esencial'),
    ('INDRIVE', 'Transporte esencial'),
    ('PEDIDOSYA', 'Delivery apps'),
    ('UBER EATS', 'Delivery apps'),
    ('RAPPI', 'Delivery apps'),
    ('GLOVO', 'Delivery apps'),
    ('DIDI FOOD', 'Delivery apps'),
    ('MINIMARKET', 'Tiendas de conveniencia'),
    ('TIENDA', 'Tiendas de conveniencia'),
    ('ABARROTES', 'Tiendas de conveniencia'),
    ('OXXO', 'Tiendas de conveniencia'),
    ('RECARGA', 'Recargas y microconsumos'),
    ('RECARGA SALDO', 'Recargas y microconsumos'),
    ('APP STORE', 'Recargas y microconsumos'),
    ('GOOGLE PLAY', 'Recargas y microconsumos'),
    ('ROL DE PAGOS', 'Sueldo'),
    ('SUELDO', 'Sueldo'),
    ('NOMINA', 'Sueldo'),
    ('REMUNERACION', 'Sueldo'),
    ('ACREDITACION SUELDO', 'Sueldo'),
    ('DECIMO', 'Sueldo'),
    ('COBRO CLIENTE', 'Ingresos negocio'),
    ('VISTARED', 'Ingresos negocio'),
    ('FACTURA COBRADA', 'Ingresos negocio'),
    ('TRANSFERENCIA RECIBIDA', 'Ingresos negocio'),
    ('DEPOSITO', 'Otros ingresos'),
    ('REEMBOLSO', 'Otros ingresos'),
    ('INTERES GANADO', 'Otros ingresos'),
    ('TRANSFERENCIA INTERNET', 'Transferencias y retiros'),
    ('TRANSFERENCIA INTERBANCARIA', 'Transferencias y retiros'),
    ('RETSINTJ', 'Transferencias y retiros'),
    ('PAGO MOVIST', 'Servicios basicos'),
    ('REMESA RIA', 'Otros ingresos'),
    ('INTERES A SU FAVOR', 'Otros ingresos'),
    ('COSTO REFERENCIA BANCARIA', 'Comisiones e intereses'),
    ('COMISION TRANSFERENCIA INTERBANCARIA', 'Comisiones e intereses'),
    ('IVA COBRADO', 'Comisiones e intereses'),
]


# ---------------------------------------------------------------- motor

def detectar(descripcion: str) -> tuple[str, str, str]:
    """Devuelve (comercio_detectado, categoria, grupo) para una descripcion.

    Gana la ULTIMA regla que coincida, por eso se recorre al reves y se corta
    en el primer acierto. Si nada coincide -> SIN CLASIFICAR.
    """
    texto = (descripcion or "").upper()
    for clave, categoria in reversed(REGLAS):
        if clave in texto:
            return clave, categoria, POR_NOMBRE[categoria].grupo
    return "", SIN_CLASIFICAR, POR_NOMBRE[SIN_CLASIFICAR].grupo


# ---------------------------------------------------------------- avisos
#
# FALSOS POSITIVOS REALES ya corregidos aqui. No los reintroduzcas:
#
#   "MAX "        capturaba "PRIMAX GASOLINERA" -> gasolina caia en Suscripciones.
#                 Usa "HBO MAX" en su lugar.
#   "VISA"        el banco escribe "CONSUMO VISA SUPERMAXI": la marca de la
#   "MASTERCARD"  tarjeta no es el comercio. Usa "PAGO VISA", "PAGO TC", etc.
#   "DINERS"
#   "SPI"         coincide dentro de apellidos comunes (ESPIN..., ...SPINA).
#                 Usa "PAGO SPI".
#   "CUOTA"       coincide dentro de ALICUOTA (gasto de vivienda). Usa "PAGO CUOTA".
#   "VENTA"       coincide en demasiados contextos de gasto.
#   "SALDO"       coincide con "SALDO ANTERIOR" del encabezado. Usa "RECARGA SALDO".
#   "MOBIL"       coincide con MOBILE / AUTOMOVIL.
#
# Antes de agregar una regla corta (<=4 letras), preguntate si puede aparecer
# DENTRO de otra palabra. Si puede, alargala o ponle un espacio.
