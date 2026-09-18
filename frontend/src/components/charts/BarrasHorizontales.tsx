import { useState } from 'react'
import { moneda, porcentaje } from '../../lib/formato'

export type ItemBarra = {
  etiqueta: string
  valor: number
  subEtiqueta?: string
  pct?: number
  objetivoValor?: number
  sobregasto?: boolean
}

type Props = {
  items: ItemBarra[]
  color: string
  colorSobregasto?: string
  columnas: { etiqueta: string; valor: string; pct?: string; objetivo?: string }
}

export default function BarrasHorizontales({ items, color, colorSobregasto = 'var(--crit)', columnas }: Props) {
  const [activo, setActivo] = useState<number | null>(null)

  if (items.length === 0) {
    return <p className="texto-muted">Sin datos.</p>
  }

  const escala = Math.max(...items.map((i) => Math.max(i.valor, i.objetivoValor ?? 0))) || 1

  return (
    <div className="contenedor-grafico">
      <div className="barras-horizontales">
        {items.map((item, i) => {
          const anchoPct = Math.min(100, (item.valor / escala) * 100)
          const objetivoPct = item.objetivoValor != null ? Math.min(100, (item.objetivoValor / escala) * 100) : null
          return (
            <div key={i} className="fila-barra"
                onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)}>
              <div className="fila-barra-etiqueta">
                {item.etiqueta}
                {item.subEtiqueta && <span className="texto-muted"> · {item.subEtiqueta}</span>}
              </div>
              <div className="fila-barra-pista">
                <div className="fila-barra-relleno"
                    style={{ width: `${anchoPct}%`, background: item.sobregasto ? colorSobregasto : color }} />
                {objetivoPct != null && (
                  <div className="fila-barra-objetivo" style={{ left: `${objetivoPct}%` }} />
                )}
              </div>
              <div className="fila-barra-valor tabular">
                {moneda(item.valor)}{item.pct != null && ` · ${porcentaje(item.pct)}`}
              </div>

              {activo === i && (
                <div className="tooltip-grafico" style={{ left: '50%', top: '-8px' }}>
                  <div>{item.etiqueta}</div>
                  <div className="tabular">{moneda(item.valor)}</div>
                  {item.pct != null && <div className="tabular">{porcentaje(item.pct)} del total</div>}
                  {item.objetivoValor != null && (
                    <div className="tabular">Objetivo: {moneda(item.objetivoValor)}</div>
                  )}
                  {item.sobregasto && <div>Por encima del objetivo</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <details>
        <summary>Ver los datos en tabla</summary>
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>{columnas.etiqueta}</th>
              <th>{columnas.valor}</th>
              {columnas.pct && <th>{columnas.pct}</th>}
              {columnas.objetivo && <th>{columnas.objetivo}</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>{item.etiqueta}{item.subEtiqueta ? ` (${item.subEtiqueta})` : ''}</td>
                <td className="tabular">{moneda(item.valor)}</td>
                {columnas.pct && <td className="tabular">{item.pct != null ? porcentaje(item.pct) : '—'}</td>}
                {columnas.objetivo && (
                  <td className="tabular">
                    {item.objetivoValor != null ? moneda(item.objetivoValor) : '—'}
                    {item.sobregasto ? ' (sobregasto)' : ''}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
