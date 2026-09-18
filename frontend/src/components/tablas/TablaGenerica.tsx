import { ReactNode } from 'react'

type Columna<T> = { header: string; render: (fila: T) => ReactNode; numerica?: boolean }

type Props<T> = {
  filas: T[]
  columnas: Columna<T>[]
  vacio?: string
}

export default function TablaGenerica<T>({ filas, columnas, vacio = 'Sin datos.' }: Props<T>) {
  if (filas.length === 0) return <p className="texto-muted">{vacio}</p>
  return (
    <table className="tabla-datos">
      <thead>
        <tr>{columnas.map((c, i) => <th key={i}>{c.header}</th>)}</tr>
      </thead>
      <tbody>
        {filas.map((fila, i) => (
          <tr key={i}>
            {columnas.map((c, j) => (
              <td key={j} className={c.numerica ? 'tabular' : undefined}>{c.render(fila)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
