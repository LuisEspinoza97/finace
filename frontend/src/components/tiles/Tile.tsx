type Props = {
  etiqueta: string
  valor: string
  color?: string
}

export default function Tile({ etiqueta, valor, color }: Props) {
  return (
    <div className="tile">
      <div className="tile-etiqueta">{etiqueta}</div>
      <div className="tile-valor tabular" style={color ? { color } : undefined}>{valor}</div>
    </div>
  )
}
