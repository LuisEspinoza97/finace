import { useState } from 'react'
import { fecha, moneda } from '../../lib/formato'
import type { RegistroHistorico } from '../../lib/historico'

type Props = {
  registros: RegistroHistorico[]
}

const ANCHO = 800
const ALTO = 260
const MARGEN = { arriba: 20, abajo: 30, izq: 8, der: 8 }
const SERIES = [
  { clave: 'entradas' as const, etiqueta: 'Entradas', color: 'var(--in)' },
  { clave: 'salidas' as const, etiqueta: 'Salidas', color: 'var(--out)' },
  { clave: 'neto_real' as const, etiqueta: 'Neto real', color: 'var(--ink2)' },
]

type Activo = { periodo: number; serie: number } | null

export default function GraficoComparativo({ registros }: Props) {
  const [activo, setActivo] = useState<Activo>(null)

  if (registros.length === 0) {
    return <p className="texto-muted">Todavía no hay periodos guardados para comparar.</p>
  }

  const valores = registros.flatMap((r) => SERIES.map((s) => Math.abs(r.resumen[s.clave])))
  const maxValor = Math.max(...valores, 1)

  const anchoUtil = ANCHO - MARGEN.izq - MARGEN.der
  const anchoGrupo = anchoUtil / registros.length
  const anchoBarra = (anchoGrupo * 0.7) / SERIES.length
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo

  function y(valor: number) {
    return MARGEN.arriba + altoUtil - (Math.abs(valor) / maxValor) * altoUtil
  }

  return (
    <div className="contenedor-grafico">
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <line x1={MARGEN.izq} x2={ANCHO - MARGEN.der} y1={MARGEN.arriba + altoUtil} y2={MARGEN.arriba + altoUtil}
               stroke="var(--axis)" strokeWidth={1} />

          {registros.map((reg, i) => {
            const xGrupo = MARGEN.izq + i * anchoGrupo + anchoGrupo * 0.15
            return (
              <g key={reg.id}>
                {SERIES.map((s, j) => {
                  const valor = reg.resumen[s.clave]
                  const alturaBarra = altoUtil - (y(valor) - MARGEN.arriba)
                  const xBarra = xGrupo + j * anchoBarra
                  return (
                    <rect key={s.clave}
                         x={xBarra} y={y(valor)} width={anchoBarra * 0.85} height={alturaBarra}
                         fill={s.color}
                         onMouseEnter={() => setActivo({ periodo: i, serie: j })}
                         onMouseLeave={() => setActivo(null)} />
                  )
                })}
                <text x={xGrupo + (anchoBarra * SERIES.length) / 2} y={ALTO - 10}
                     textAnchor="middle" style={{ fontSize: 10, fill: 'var(--ink2)' }}>
                  {reg.resumen.desde.slice(0, 7)}
                </text>
              </g>
            )
          })}
        </svg>

        {activo && (() => {
          const reg = registros[activo.periodo]
          const s = SERIES[activo.serie]
          return (
            <div className="tooltip-grafico" style={{ left: `${((activo.periodo + 0.5) / registros.length) * 100}%` }}>
              <div>{fecha(reg.resumen.desde)} – {fecha(reg.resumen.hasta)}</div>
              <div className="tabular">{s.etiqueta}: {moneda(reg.resumen[s.clave])}</div>
            </div>
          )
        })()}
      </div>

      <div className="leyenda-ordinal">
        {SERIES.map((s) => (
          <span key={s.clave} className="leyenda-item">
            <span className="leyenda-color" style={{ background: s.color }} />
            {s.etiqueta}
          </span>
        ))}
      </div>

      <details>
        <summary>Ver los datos en tabla</summary>
        <table className="tabla-datos">
          <thead><tr><th>Periodo</th><th>Entradas</th><th>Salidas</th><th>Neto real</th></tr></thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id}>
                <td>{fecha(r.resumen.desde)} – {fecha(r.resumen.hasta)}</td>
                <td className="tabular">{moneda(r.resumen.entradas)}</td>
                <td className="tabular">{moneda(r.resumen.salidas)}</td>
                <td className="tabular">{moneda(r.resumen.neto_real)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
