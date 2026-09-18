"""
Parsers de estados de cuenta — arquitectura de plugins.

Para agregar un banco: escribe una clase que herede de BancoParser, registrala
con @registrar y listo. El resto del sistema no cambia.

El parser de Banco Pichincha de este archivo esta PROBADO contra un estado de
cuenta real de 61 movimientos: cuadra al centavo contra la seccion CONCILIACION
del propio banco (conteo de debitos, de creditos, y ambos totales).

Dependencia externa: `pdftotext` (poppler-utils). Es la unica forma fiable de
conservar la estructura de columnas de un PDF bancario:
    subprocess.run(["pdftotext", "-layout", pdf, "-"])
NO uses pypdf/PyPDF2 para esto: devuelve el texto sin columnas y las cifras se
mezclan con la descripcion.
"""

from __future__ import annotations

import re
import subprocess
import unicodedata
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date


# --------------------------------------------------------------- modelo

@dataclass
class Movimiento:
    fecha: date
    descripcion: str
    monto: float          # CON SIGNO: negativo = salio, positivo = entro
    saldo: float | None = None
    referencia: str = ""

    @property
    def es_gasto(self) -> bool:
        return self.monto < 0


@dataclass
class Extracto:
    banco: str
    cuenta: str                      # enmascarada: solo los ultimos 4 digitos
    desde: date
    hasta: date
    saldo_inicial: float
    saldo_final: float
    movimientos: list[Movimiento] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)

    @property
    def entradas(self) -> float:
        return round(sum(m.monto for m in self.movimientos if m.monto > 0), 2)

    @property
    def salidas(self) -> float:
        return round(-sum(m.monto for m in self.movimientos if m.monto < 0), 2)

    def validar(self) -> list[str]:
        """Cuadre aritmetico. Un extracto que no cuadra NO se analiza: se rechaza.

        Es la unica defensa real contra un parser que se comio una linea.
        """
        errores = []
        calculado = round(self.saldo_inicial + self.entradas - self.salidas, 2)
        if abs(calculado - self.saldo_final) > 0.01:
            errores.append(
                f"El extracto no cuadra: {self.saldo_inicial:.2f} + {self.entradas:.2f} "
                f"- {self.salidas:.2f} = {calculado:.2f}, pero el banco dice "
                f"{self.saldo_final:.2f} (diferencia {calculado - self.saldo_final:+.2f})."
            )
        if not self.movimientos:
            errores.append("No se encontro ningun movimiento en el PDF.")
        return errores


# --------------------------------------------------------------- registro

_PARSERS: list[type["BancoParser"]] = []


def registrar(cls):
    _PARSERS.append(cls)
    return cls


class BancoParser(ABC):
    nombre: str = ""

    @classmethod
    @abstractmethod
    def reconoce(cls, texto: str) -> bool:
        """True si este texto de PDF pertenece a este banco."""

    @classmethod
    @abstractmethod
    def parsear(cls, texto: str) -> Extracto:
        ...


def texto_de_pdf(ruta: str) -> str:
    """pdftotext -layout. El flag -layout es obligatorio: sin el se pierden las columnas."""
    r = subprocess.run(["pdftotext", "-layout", ruta, "-"],
                       capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        raise RuntimeError(f"pdftotext fallo: {r.stderr[:200]}")
    return r.stdout


def parsear_pdf(ruta: str) -> Extracto:
    texto = texto_de_pdf(ruta)
    for cls in _PARSERS:
        if cls.reconoce(texto):
            extracto = cls.parsear(texto)
            errores = extracto.validar()
            if errores:
                raise ValueError(" ".join(errores))
            return extracto
    raise ValueError(
        "No reconozco el formato de este PDF. Bancos soportados: "
        + ", ".join(c.nombre for c in _PARSERS)
    )


# --------------------------------------------------------------- utilidades

MESES = {"ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
         "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12}


def _num(s: str) -> float:
    """'1,086.37' -> 1086.37. Ecuador usa coma de miles y punto decimal."""
    return float(s.replace(",", ""))


def _sin_tildes(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn").upper()


# --------------------------------------------------------------- Pichincha

@registrar
class Pichincha(BancoParser):
    """Banco Pichincha — estado de cuenta de ahorros/corriente.

    Formato de cada linea de movimiento (ancho fijo, requiere -layout):

        FECHA     OFIC.  N.DOC.     DESCRIPCION            DEBITO  CREDITO   SALDO
        06-jul.   12     8164454    TRANSFERENCIA INTERNET   7.50     0.00   31.07

    TRAMPAS de este formato, todas encontradas en un PDF real:

    1. El N.DOC se PARTE en dos lineas: el ultimo digito cae solo en la linea
       siguiente. Como el regex exige que la linea empiece con una fecha, esas
       lineas huerfanas se ignoran solas. No intentes "reparar" la linea.

    2. La fecha del movimiento NO trae el anio ("06-jul."). Hay que tomarlo del
       periodo del encabezado. Si el periodo cruza diciembre-enero, los meses
       >= el mes de inicio son del anio inicial y el resto del siguiente.

    3. La descripcion NO trae el nombre del comercio. El banco escribe
       "TRANSFERENCIA INTERNET" para casi todo. Es una limitacion del banco, no
       del parser: no inventes un comercio que no esta en el documento.

    4. Un mismo concepto aparece como debito Y como credito, asi que el signo
       sale de la columna, jamas de la descripcion.
    """

    nombre = "Banco Pichincha"

    LINEA = re.compile(
        r"^\s*(\d{2})-(\w{3})\.\s+"      # 06-jul.
        r"(\d+)\s+"                       # oficina
        r"(\d+)\s+"                       # n. documento
        r"(.+?)\s+"                       # descripcion (no greedy)
        r"([\d.,]+)\s+"                   # debito
        r"([\d.,]+)\s+"                   # credito
        r"([\d.,]+)\s*$"                  # saldo
    )
    CORTE = re.compile(r"FECHA (?:ULTIMO CORTE \(FACTURA\)|ESTE CORTE)\s+(\d{2})-(\d{2})-(\d{4})")
    SALDO_ANT = re.compile(r"SALDO ANTERIOR\s+([\d.,]+)")
    SALDO_ACT = re.compile(r"SALDO ACTUAL\s+([\d.,]+)")
    CUENTA = re.compile(r"CUENTA:?\s+(\d+)")
    CONCILIA = re.compile(r"(?:DEPOSITO / CREDITOS|CHEQUES / DEBITOS)\s+\((\d+)\)\s+([\d.,]+)")

    @classmethod
    def reconoce(cls, texto: str) -> bool:
        t = _sin_tildes(texto)
        return "BANCO PICHINCHA" in t and "DETALLE DE MOVIMIENTOS" in t

    @classmethod
    def parsear(cls, texto: str) -> Extracto:
        plano = _sin_tildes(texto)

        fechas = cls.CORTE.findall(plano)
        if len(fechas) < 2:
            raise ValueError("No encontre las fechas de corte en el encabezado.")
        (d1, m1, y1), (d2, m2, y2) = fechas[0], fechas[1]
        desde = date(int(y1), int(m1), int(d1))
        hasta = date(int(y2), int(m2), int(d2))

        sa = cls.SALDO_ANT.search(plano)
        sf = cls.SALDO_ACT.search(plano)
        if not (sa and sf):
            raise ValueError("No encontre SALDO ANTERIOR / SALDO ACTUAL.")

        cta = cls.CUENTA.search(plano)
        cuenta = "****" + cta.group(1)[-4:] if cta else "****"

        movs: list[Movimiento] = []
        for linea in texto.splitlines():
            m = cls.LINEA.match(linea)
            if not m:
                continue
            dia, mes, _ofi, doc, desc, deb, cre, sal = m.groups()
            mes_n = MESES.get(mes.lower())
            if not mes_n:
                continue
            anio = desde.year if mes_n >= desde.month else hasta.year
            debito, credito = _num(deb), _num(cre)
            if debito == 0 and credito == 0:
                continue
            movs.append(Movimiento(
                fecha=date(anio, mes_n, int(dia)),
                descripcion=re.sub(r"\s+", " ", desc.strip()).lstrip("*"),
                monto=round(-debito if debito else credito, 2),
                saldo=_num(sal),
                referencia=doc,
            ))

        ext = Extracto(cls.nombre, cuenta, desde, hasta,
                       _num(sa.group(1)), _num(sf.group(1)), movs)

        # Contraste extra contra la seccion CONCILIACION del propio banco.
        conc = cls.CONCILIA.findall(plano)
        if len(conc) == 2:
            (nc, tc), (nd, td) = conc
            if int(nc) != sum(1 for x in movs if x.monto > 0):
                ext.avisos.append(f"El banco declara {nc} creditos y encontre "
                                  f"{sum(1 for x in movs if x.monto > 0)}.")
            if int(nd) != sum(1 for x in movs if x.monto < 0):
                ext.avisos.append(f"El banco declara {nd} debitos y encontre "
                                  f"{sum(1 for x in movs if x.monto < 0)}.")
            if abs(_num(tc) - ext.entradas) > 0.01:
                ext.avisos.append(f"Total de creditos declarado {tc} vs calculado {ext.entradas:.2f}.")
            if abs(_num(td) - ext.salidas) > 0.01:
                ext.avisos.append(f"Total de debitos declarado {td} vs calculado {ext.salidas:.2f}.")
        return ext


# --------------------------------------------------------------- plantilla
#
# Para el siguiente banco, copia esto y completa. Pega primero la salida de
# `pdftotext -layout extracto.pdf -` y escribe el regex mirando ESA salida.
#
# @registrar
# class Guayaquil(BancoParser):
#     nombre = "Banco Guayaquil"
#     LINEA = re.compile(r"...")
#
#     @classmethod
#     def reconoce(cls, texto): return "BANCO GUAYAQUIL" in _sin_tildes(texto)
#
#     @classmethod
#     def parsear(cls, texto) -> Extracto: ...
#
# Bancos ecuatorianos que vale la pena cubrir despues: Guayaquil, Produbanco,
# Internacional, Bolivariano, Austro, Loja, y las cooperativas (JEP, Jardin
# Azuayo). Varias entregan tambien CSV/XLS: si el banco ofrece CSV, soportalo
# ANTES que el PDF — es mas fiable y no necesita pdftotext.
