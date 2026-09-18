"""
Motor de analisis — convierte un Extracto en hallazgos.

Cada funcion devuelve datos planos (dict/list) listos para JSON. Ninguna imprime
ni formatea: el formato es trabajo del frontend.

El orden de este archivo es el orden en que un analista mira un extracto:
primero si cuadra, luego si el flujo es real, luego donde esta el ruido, y solo
al final el detalle por categoria.
"""

from __future__ import annotations

import statistics
from collections import Counter, defaultdict
from datetime import date, timedelta

from app.core.categorias import CATEGORIAS, OBJETIVO_GRUPO, POR_NOMBRE, detectar
from app.core.parsers import Extracto, Movimiento

TRAMOS = [
    (0, 5, "Menos de $5"),
    (5, 20, "$5 a $20"),
    (20, 100, "$20 a $100"),
    (100, 500, "$100 a $500"),
    (500, float("inf"), "Mas de $500"),
]


# ------------------------------------------------------------------ 1. flujo

def resumen(ext: Extracto) -> dict:
    dias = (ext.hasta - ext.desde).days + 1
    entradas, salidas = ext.entradas, ext.salidas
    extra = ingresos_extraordinarios(ext)
    monto_extra = round(sum(m.monto for m in extra), 2)
    return {
        "banco": ext.banco,
        "cuenta": ext.cuenta,
        "desde": ext.desde.isoformat(),
        "hasta": ext.hasta.isoformat(),
        "dias": dias,
        "saldo_inicial": ext.saldo_inicial,
        "saldo_final": ext.saldo_final,
        "entradas": entradas,
        "salidas": salidas,
        "n_entradas": sum(1 for m in ext.movimientos if m.monto > 0),
        "n_salidas": sum(1 for m in ext.movimientos if m.monto < 0),
        "neto": round(entradas - salidas, 2),
        "gasto_diario": round(salidas / dias, 2) if dias else 0.0,
        "tasa_ahorro": round((entradas - salidas) / entradas, 4) if entradas else 0.0,
        # La cifra que de verdad importa: el flujo sin los golpes de suerte.
        "extraordinarios": monto_extra,
        "entradas_recurrentes": round(entradas - monto_extra, 2),
        "neto_real": round(entradas - monto_extra - salidas, 2),
        "saldo_minimo": min((m.saldo for m in ext.movimientos if m.saldo is not None),
                            default=ext.saldo_final),
    }


def ingresos_extraordinarios(ext: Extracto) -> list[Movimiento]:
    """Entradas que distorsionan la lectura del mes.

    Criterio: una entrada es extraordinaria si por si sola pesa >= 40% de todo lo
    que entro, O si supera 5 veces la mediana Y ademas pesa >= 15% del total.

    El guard del 15% NO es opcional. Sin el, una cuenta con muchos movimientos
    diminutos tiene una mediana ridicula (ej. $6) y entradas normales de $100
    quedan marcadas como extraordinarias, inflando el diagnostico. Probado: en un
    extracto real sin el guard marcaba $5339 en vez de los $5000 correctos.

    Son heuristicas — el analisis SIEMPRE muestra ambas cifras (con y sin
    extraordinarios) en vez de decidir por el usuario.
    """
    entradas = [m for m in ext.movimientos if m.monto > 0]
    if len(entradas) < 3:
        return []
    total = sum(m.monto for m in entradas)
    if not total:
        return []
    mediana = statistics.median(m.monto for m in entradas)
    return [m for m in entradas
            if m.monto / total >= 0.40
            or (mediana and m.monto >= 5 * mediana and m.monto / total >= 0.15)]


def nivel_alerta(r: dict) -> dict:
    """Semaforo. Se juzga por el neto REAL, no por el neto con extraordinarios:
    un mes que solo cierra en positivo gracias a un deposito unico no es un mes sano."""
    if r["neto_real"] < 0 and r["extraordinarios"] > 0:
        return {"nivel": "critico",
                "texto": "Sin el ingreso extraordinario, el periodo cierra en negativo."}
    if r["neto"] < 0:
        return {"nivel": "critico", "texto": "Gastaste mas de lo que entro."}
    if r["tasa_ahorro"] < 0.10:
        return {"nivel": "serio", "texto": "Ahorras menos del 10% de lo que entra."}
    if r["tasa_ahorro"] < 0.20:
        return {"nivel": "atencion", "texto": "Ahorro bajo, entre 10% y 20%."}
    return {"nivel": "bien", "texto": "Ahorro saludable, sobre el 20%."}


# ------------------------------------------------------------- 2. el ruido

def por_tramo(ext: Extracto, gastos: bool = True) -> list[dict]:
    """Cuantos movimientos vs cuanto dinero, por tamano de transaccion.

    Es el grafico que mas revela: casi siempre la mitad de los movimientos mueve
    menos del 5% del dinero. Eso no es un problema de plata, es de ruido.
    """
    sel = [abs(m.monto) for m in ext.movimientos
           if (m.monto < 0) == gastos]
    total = sum(sel) or 1
    out = []
    for lo, hi, label in TRAMOS:
        g = [v for v in sel if lo <= v < hi]
        out.append({"label": label, "n": len(g), "monto": round(sum(g), 2),
                    "pct_n": round(len(g) / len(sel) * 100, 1) if sel else 0.0,
                    "pct_monto": round(sum(g) / total * 100, 1)})
    return out


def fragmentacion(ext: Extracto) -> dict:
    """Resume el hallazgo del ruido en una frase medible."""
    tr = por_tramo(ext, gastos=True)
    chicos = tr[0]["n"] + tr[1]["n"]
    monto = round(tr[0]["monto"] + tr[1]["monto"], 2)
    n = sum(t["n"] for t in tr) or 1
    total = sum(t["monto"] for t in tr) or 1
    return {"n_movimientos": chicos, "monto": monto,
            "pct_movimientos": round(chicos / n * 100, 1),
            "pct_monto": round(monto / total * 100, 1), "umbral": 20}


# ------------------------------------------------------------- 3. el tiempo

def serie_diaria(ext: Extracto) -> list[dict]:
    """Saldo al cierre de cada dia CON movimiento (no rellena dias vacios:
    el grafico interpola y se lee igual, con menos puntos)."""
    dias: dict[date, dict] = defaultdict(lambda: {"entro": 0.0, "salio": 0.0, "saldo": None})
    for m in ext.movimientos:
        d = dias[m.fecha]
        if m.monto > 0:
            d["entro"] += m.monto
        else:
            d["salio"] += -m.monto
        if m.saldo is not None:
            d["saldo"] = m.saldo
    return [{"fecha": f.isoformat(), "entro": round(v["entro"], 2),
             "salio": round(v["salio"], 2), "saldo": v["saldo"]}
            for f, v in sorted(dias.items())]


# --------------------------------------------------------- 4. lo repetido

def recurrentes(ext: Extracto, minimo: int = 2) -> list[dict]:
    """Mismo concepto + mismo monto exacto, >= 2 veces. Asi viven las suscripciones.

    LIMITE CONOCIDO: un cobro que cambia de valor (luz, agua) no se detecta. Para
    esos hace falta comparar varios meses, y este sistema no guarda historico en
    el servidor. Se resuelve en el navegador, comparando extractos importados.
    """
    c = Counter((detectar(m.descripcion)[0] or m.descripcion, round(m.monto, 2))
                for m in ext.movimientos if m.monto < 0)
    out = [{"concepto": k[0], "monto": round(-k[1], 2), "veces": v,
            "total": round(-k[1] * v, 2)}
           for k, v in c.items() if v >= minimo]
    return sorted(out, key=lambda x: -x["total"])


def duplicados(ext: Extracto) -> list[dict]:
    """Misma fecha + misma descripcion + mismo monto. Casi siempre es un cobro
    doble o un error de digitacion — se marca para que el usuario revise, nunca
    se elimina automaticamente."""
    c = Counter((m.fecha, m.descripcion, m.monto) for m in ext.movimientos)
    return [{"fecha": f.isoformat(), "descripcion": d, "monto": v, "veces": n}
            for (f, d, v), n in c.items() if n > 1]


def comisiones(ext: Extracto) -> dict:
    """Lo que el banco te cobro por mover tu propio dinero."""
    claves = ("COMISION", "COSTO", "IVA COBRADO", "MANTENIMIENTO", "TARIFA", "CARGO")
    items = [m for m in ext.movimientos
             if m.monto < 0 and any(k in m.descripcion.upper() for k in claves)]
    interes = round(sum(m.monto for m in ext.movimientos
                        if m.monto > 0 and "INTERES" in m.descripcion.upper()), 2)
    total = round(-sum(m.monto for m in items), 2)
    return {
        "total": total, "n": len(items), "interes_ganado": interes,
        "neto": round(interes - total, 2),
        "pct_salidas": round(total / ext.salidas * 100, 2) if ext.salidas else 0.0,
        "detalle": [{"fecha": m.fecha.isoformat(), "descripcion": m.descripcion,
                     "monto": round(-m.monto, 2)} for m in items],
    }


# ------------------------------------------------------- 5. las categorias

def por_categoria(ext: Extracto) -> list[dict]:
    tot: dict[str, float] = defaultdict(float)
    cuenta: dict[str, int] = defaultdict(int)
    for m in ext.movimientos:
        if m.monto >= 0:
            continue
        _, cat, _ = detectar(m.descripcion)
        tot[cat] += -m.monto
        cuenta[cat] += 1
    salidas = ext.salidas or 1
    out = []
    for c in CATEGORIAS:
        if c.grupo == "INGRESOS" or c.nombre not in tot:
            continue
        monto = round(tot[c.nombre], 2)
        pct = monto / salidas
        out.append({"categoria": c.nombre, "grupo": c.grupo, "monto": monto,
                    "n": cuenta[c.nombre], "pct": round(pct, 4),
                    "objetivo": c.objetivo,
                    "exceso": round(max(0.0, monto - c.objetivo * salidas), 2),
                    "sobregasto": pct > c.objetivo})
    return sorted(out, key=lambda x: -x["monto"])


def por_grupo(ext: Extracto) -> list[dict]:
    tot: dict[str, float] = defaultdict(float)
    for m in ext.movimientos:
        if m.monto >= 0:
            continue
        tot[detectar(m.descripcion)[2]] += -m.monto
    salidas = ext.salidas or 1
    return [{"grupo": g, "monto": round(tot.get(g, 0.0), 2),
             "pct": round(tot.get(g, 0.0) / salidas, 4), "objetivo": obj,
             "sobregasto": tot.get(g, 0.0) / salidas > obj}
            for g, obj in OBJETIVO_GRUPO.items()]


def top(ext: Extracto, gastos: bool = True, n: int = 10) -> list[dict]:
    sel = [m for m in ext.movimientos if (m.monto < 0) == gastos]
    sel.sort(key=lambda m: -abs(m.monto))
    return [{"fecha": m.fecha.isoformat(), "descripcion": m.descripcion,
             "monto": round(abs(m.monto), 2),
             "categoria": detectar(m.descripcion)[1]} for m in sel[:n]]


def sin_clasificar(ext: Extracto) -> list[dict]:
    """Lo que el motor no supo categorizar. Se muestra al usuario para que cree
    la regla: es asi como el sistema aprende sus comercios."""
    out = defaultdict(lambda: {"n": 0, "monto": 0.0})
    for m in ext.movimientos:
        if detectar(m.descripcion)[1] == "SIN CLASIFICAR":
            k = out[m.descripcion]
            k["n"] += 1
            k["monto"] += abs(m.monto)
    return sorted(({"descripcion": d, **v} for d, v in out.items()),
                  key=lambda x: -x["monto"])


# ------------------------------------------------------------- 6. el todo

def analizar(ext: Extracto) -> dict:
    r = resumen(ext)
    return {
        "resumen": r,
        "alerta": nivel_alerta(r),
        "extraordinarios": [{"fecha": m.fecha.isoformat(), "descripcion": m.descripcion,
                             "monto": m.monto} for m in ingresos_extraordinarios(ext)],
        "tramos_salidas": por_tramo(ext, True),
        "tramos_entradas": por_tramo(ext, False),
        "fragmentacion": fragmentacion(ext),
        "serie": serie_diaria(ext),
        "grupos": por_grupo(ext),
        "categorias": por_categoria(ext),
        "top_salidas": top(ext, True, 10),
        "top_entradas": top(ext, False, 15),
        "recurrentes": recurrentes(ext),
        "duplicados": duplicados(ext),
        "comisiones": comisiones(ext),
        "sin_clasificar": sin_clasificar(ext),
        "avisos": ext.avisos,
        "movimientos": [{"fecha": m.fecha.isoformat(), "descripcion": m.descripcion,
                         "monto": m.monto, "saldo": m.saldo,
                         "categoria": detectar(m.descripcion)[1]}
                        for m in ext.movimientos],
    }
