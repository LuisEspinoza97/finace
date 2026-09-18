import { ChangeEvent, useRef, useState } from 'react'
import {
  advertenciaClaveCorta, agregarRegla, borrarRegla, CATEGORIAS_DISPONIBLES,
  exportarReglas, importarReglas, obtenerReglas, type ReglaUsuario,
} from '../../lib/reglas'

type Props = {
  claveSugerida?: string
  onCambio?: () => void
}

export default function GestorReglas({ claveSugerida, onCambio }: Props) {
  const [reglas, setReglas] = useState<ReglaUsuario[]>(obtenerReglas)
  const [clave, setClave] = useState(claveSugerida ?? '')
  const [categoria, setCategoria] = useState(CATEGORIAS_DISPONIBLES[0])
  const [mensaje, setMensaje] = useState<string | null>(null)
  const inputArchivo = useRef<HTMLInputElement>(null)

  const advertencia = advertenciaClaveCorta(clave)

  function crear() {
    if (!clave.trim()) return
    setReglas(agregarRegla(clave, categoria))
    setClave('')
    setMensaje(null)
    onCambio?.()
  }

  function eliminar(c: string) {
    setReglas(borrarRegla(c))
    onCambio?.()
  }

  async function importar(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    try {
      const nuevas = await importarReglas(archivo)
      setReglas(nuevas)
      setMensaje(`Se importaron ${nuevas.length} reglas. Reemplazaron las que tenías antes.`)
      onCambio?.()
    } catch {
      setMensaje('No pude leer ese archivo como reglas válidas.')
    }
  }

  return (
    <div>
      <p className="texto-muted">
        Estas reglas viven solo en este navegador. Se aplican por encima de las 194 reglas base
        del sistema — la última coincidencia gana.
      </p>

      <div className="form-regla">
        <div className="campo">
          <label htmlFor="clave-regla">Palabra clave (tal como aparece en el movimiento)</label>
          <input
            id="clave-regla"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Ej: MI TIENDA FAVORITA"
          />
          {advertencia && <p className="texto-advertencia">{advertencia}</p>}
        </div>
        <div className="campo">
          <label htmlFor="categoria-regla">Categoría</label>
          <select id="categoria-regla" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS_DISPONIBLES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="boton-primario" style={{ width: 'auto' }} onClick={crear} disabled={!clave.trim()}>
          Crear regla
        </button>
      </div>

      {mensaje && <p className="texto-muted">{mensaje}</p>}

      <h3 style={{ marginTop: 20 }}>Tus reglas ({reglas.length})</h3>
      {reglas.length === 0 ? (
        <p className="texto-muted">Todavía no has creado ninguna.</p>
      ) : (
        <table className="tabla-datos">
          <thead><tr><th>Clave</th><th>Categoría</th><th></th></tr></thead>
          <tbody>
            {reglas.map((r) => (
              <tr key={r.clave}>
                <td>{r.clave}</td>
                <td>{r.categoria}</td>
                <td><button className="boton-secundario" onClick={() => eliminar(r.clave)}>Borrar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="boton-secundario" onClick={exportarReglas}>Exportar reglas (JSON)</button>
        <button className="boton-secundario" onClick={() => inputArchivo.current?.click()}>Importar reglas</button>
        <input ref={inputArchivo} type="file" accept="application/json" style={{ display: 'none' }} onChange={importar} />
      </div>
    </div>
  )
}
