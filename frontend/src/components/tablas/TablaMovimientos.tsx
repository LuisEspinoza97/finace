import { useMemo, useState } from 'react'
import { fecha, moneda } from '../../lib/formato'
import type { Movimiento } from '../../lib/tipos'

type Props = {
  movimientos: Movimiento[]
}

export default function TablaMovimientos({ movimientos }: Props) {
  const [busqueda, setBusqueda] = useState('')

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return movimientos
    return movimientos.filter((m) =>
      m.descripcion.toLowerCase().includes(q) || m.categoria.toLowerCase().includes(q))
  }, [movimientos, busqueda])

  return (
    <div>
      <input
        className="buscador"
        type="search"
        placeholder="Buscar por descripción o categoría..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      <div className="tabla-scroll">
        <table className="tabla-datos">
          <thead>
            <tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Monto</th><th>Saldo</th></tr>
          </thead>
          <tbody>
            {filtrados.map((m, i) => (
              <tr key={i}>
                <td>{fecha(m.fecha)}</td>
                <td>{m.descripcion}</td>
                <td>{m.categoria}</td>
                <td className="tabular" style={{ color: m.monto < 0 ? 'var(--out)' : 'var(--in)' }}>
                  {moneda(m.monto)}
                </td>
                <td className="tabular">{m.saldo != null ? moneda(m.saldo) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtrados.length === 0 && <p className="texto-muted">Ningún movimiento coincide con "{busqueda}".</p>}
    </div>
  )
}
