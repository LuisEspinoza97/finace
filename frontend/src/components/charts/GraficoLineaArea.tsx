import { MouseEvent, useRef, useState } from 'react'
import { fecha as formatearFecha, moneda } from '../../lib/formato'
import type { PuntoSerie } from '../../lib/tipos'

type Props = {
  serie: PuntoSerie[]
}

const ANCHO = 800
const ALTO = 280
const MARGEN = { arriba: 28, abajo: 28, izquierda: 8, derecha: 8 }

export default function GraficoLineaArea({ serie }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [indiceActivo, setIndiceActivo] = useState<number | null>(null)

  const puntos = serie.filter((p) => p.saldo != null) as (PuntoSerie & { saldo: number })[]

  if (puntos.length === 0) {
    return <p className="texto-muted">No hay saldos diarios para graficar.</p>
  }

  const fechasMs = puntos.map((p) => new Date(p.fecha).getTime())
  const minFecha = Math.min(...fechasMs)
  const maxFecha = Math.max(...fechasMs)
  const saldos = puntos.map((p) => p.saldo)
  const minSaldo = Math.min(...saldos)
  const maxSaldo = Math.max(...saldos)
  const rangoSaldo = maxSaldo - minSaldo || 1

  const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo

  function x(ms: number) {
    if (maxFecha === minFecha) return MARGEN.izquierda + anchoUtil / 2
    return MARGEN.izquierda + ((ms - minFecha) / (maxFecha - minFecha)) * anchoUtil
  }
  function y(saldo: number) {
    return MARGEN.arriba + altoUtil - ((saldo - minSaldo) / rangoSaldo) * altoUtil
  }

  const coords = puntos.map((p) => ({ px: x(new Date(p.fecha).getTime()), py: y(p.saldo), p }))
  const lineaPath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.px},${c.py}`).join(' ')
  const areaPath = `${lineaPath} L${coords[coords.length - 1].px},${MARGEN.arriba + altoUtil} L${coords[0].px},${MARGEN.arriba + altoUtil} Z`

  const indiceMin = saldos.indexOf(minSaldo)
  const indiceMax = saldos.indexOf(maxSaldo)

  const ticksY = [minSaldo, (minSaldo + maxSaldo) / 2, maxSaldo]

  function moverMouse(e: MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const xRelativo = ((e.clientX - rect.left) / rect.width) * ANCHO
    let masCercano = 0
    let distMin = Infinity
    coords.forEach((c, i) => {
      const d = Math.abs(c.px - xRelativo)
      if (d < distMin) { distMin = d; masCercano = i }
    })
    setIndiceActivo(masCercano)
  }

  const activo = indiceActivo != null ? coords[indiceActivo] : null

  return (
    <div className="contenedor-grafico">
      <div style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseMove={moverMouse}
          onMouseLeave={() => setIndiceActivo(null)}
        >
          {ticksY.map((t, i) => (
            <line key={i} x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha}
                 y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
          ))}

          <path d={areaPath} fill="var(--in)" fillOpacity={0.12} stroke="none" />
          <path d={lineaPath} fill="none" stroke="var(--in)" strokeWidth={2} />

          {activo && (
            <line x1={activo.px} x2={activo.px} y1={MARGEN.arriba} y2={MARGEN.arriba + altoUtil}
                 stroke="var(--axis)" strokeWidth={1} />
          )}

          {coords.map((c, i) => {
            const esExtremo = i === indiceMin || i === indiceMax
            if (!esExtremo && i !== indiceActivo) return null
            return <circle key={i} cx={c.px} cy={c.py} r={esExtremo ? 4 : 3} fill="var(--in)" />
          })}

          <g className="tabular" style={{ fontSize: 11, fill: 'var(--ink2)' }}>
            <text x={coords[indiceMax].px} y={coords[indiceMax].py - 10} textAnchor="middle">
              Máximo: {moneda(maxSaldo)}
            </text>
            <text x={coords[indiceMin].px} y={coords[indiceMin].py + 20} textAnchor="middle">
              Mínimo: {moneda(minSaldo)}
            </text>
          </g>
        </svg>

        {activo && (
          <div className="tooltip-grafico" style={{ left: `${(activo.px / ANCHO) * 100}%` }}>
            <div>{formatearFecha(activo.p.fecha)}</div>
            <div className="tabular">Saldo: {moneda(activo.p.saldo)}</div>
          </div>
        )}
      </div>

      <details>
        <summary>Ver los datos en tabla</summary>
        <table className="tabla-datos">
          <thead><tr><th>Fecha</th><th>Entró</th><th>Salió</th><th>Saldo</th></tr></thead>
          <tbody>
            {puntos.map((p) => (
              <tr key={p.fecha}>
                <td>{formatearFecha(p.fecha)}</td>
                <td className="tabular">{moneda(p.entro)}</td>
                <td className="tabular">{moneda(p.salio)}</td>
                <td className="tabular">{moneda(p.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
