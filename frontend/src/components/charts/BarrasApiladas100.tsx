import { useState } from 'react'
import { moneda } from '../../lib/formato'
import { colorTextoSegmento, RAMPA_ORDINAL } from '../../lib/colores'
import type { Tramo } from '../../lib/tipos'

type Props = {
  tramos: Tramo[]
  oscuro: boolean
}

const ANCHO = 800
const ALTO_BARRA = 48
const GAP = 3
const SEP_FILAS = 44

type Activo = { fila: 'n' | 'monto'; indice: number } | null

export default function BarrasApiladas100({ tramos, oscuro }: Props) {
  const [activo, setActivo] = useState<Activo>(null)

  function segmentos(clave: 'pct_n' | 'pct_monto') {
    let acumulado = 0
    return tramos.map((t, i) => {
      const anchoBruto = (t[clave] / 100) * ANCHO
      const x = acumulado + (i > 0 ? GAP / 2 : 0)
      const ancho = Math.max(0, anchoBruto - (i > 0 && i < tramos.length - 1 ? GAP : GAP / 2))
      acumulado += anchoBruto
      return { x, ancho, t, i }
    })
  }

  const filaN = segmentos('pct_n')
  const filaMonto = segmentos('pct_monto')
  const alto = ALTO_BARRA * 2 + SEP_FILAS + 20

  function etiquetaCabe(ancho: number) {
    return ancho > 55
  }

  return (
    <div className="contenedor-grafico">
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${ANCHO} ${alto}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <text x={0} y={14} style={{ fontSize: 13, fill: 'var(--ink2)' }}>Movimientos</text>
          {filaN.map(({ x, ancho, t, i }) => (
            <g key={i}
               onMouseEnter={() => setActivo({ fila: 'n', indice: i })}
               onMouseLeave={() => setActivo(null)}>
              <rect x={x} y={22} width={ancho} height={ALTO_BARRA} fill={RAMPA_ORDINAL[i]} />
              {etiquetaCabe(ancho) && (
                <text x={x + ancho / 2} y={22 + ALTO_BARRA / 2 + 5} textAnchor="middle"
                     className="tabular" fill={colorTextoSegmento(i, oscuro)} style={{ fontSize: 13 }}>
                  {t.pct_n.toFixed(0)}%
                </text>
              )}
            </g>
          ))}

          <text x={0} y={22 + ALTO_BARRA + SEP_FILAS - 8} style={{ fontSize: 13, fill: 'var(--ink2)' }}>Dinero</text>
          {filaMonto.map(({ x, ancho, t, i }) => (
            <g key={i}
               onMouseEnter={() => setActivo({ fila: 'monto', indice: i })}
               onMouseLeave={() => setActivo(null)}>
              <rect x={x} y={22 + ALTO_BARRA + SEP_FILAS} width={ancho} height={ALTO_BARRA} fill={RAMPA_ORDINAL[i]} />
              {etiquetaCabe(ancho) && (
                <text x={x + ancho / 2} y={22 + ALTO_BARRA + SEP_FILAS + ALTO_BARRA / 2 + 5} textAnchor="middle"
                     className="tabular" fill={colorTextoSegmento(i, oscuro)} style={{ fontSize: 13 }}>
                  {t.pct_monto.toFixed(0)}%
                </text>
              )}
            </g>
          ))}
        </svg>

        {activo && (() => {
          const fila = activo.fila === 'n' ? filaN : filaMonto
          const seg = fila[activo.indice]
          const porcentajePos = (seg.x + seg.ancho / 2) / ANCHO
          return (
            <div className="tooltip-grafico" style={{ left: `${porcentajePos * 100}%` }}>
              <div>{seg.t.label}</div>
              <div className="tabular">{seg.t.n} movimientos ({seg.t.pct_n.toFixed(1)}%)</div>
              <div className="tabular">{moneda(seg.t.monto)} ({seg.t.pct_monto.toFixed(1)}%)</div>
            </div>
          )
        })()}
      </div>

      <div className="leyenda-ordinal">
        {tramos.map((t, i) => (
          <span key={i} className="leyenda-item">
            <span className="leyenda-color" style={{ background: RAMPA_ORDINAL[i] }} />
            {t.label}
          </span>
        ))}
      </div>

      <details>
        <summary>Ver los datos en tabla</summary>
        <table className="tabla-datos">
          <thead><tr><th>Tramo</th><th>Movimientos</th><th>% mov.</th><th>Monto</th><th>% monto</th></tr></thead>
          <tbody>
            {tramos.map((t) => (
              <tr key={t.label}>
                <td>{t.label}</td>
                <td className="tabular">{t.n}</td>
                <td className="tabular">{t.pct_n.toFixed(1)}%</td>
                <td className="tabular">{moneda(t.monto)}</td>
                <td className="tabular">{t.pct_monto.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
