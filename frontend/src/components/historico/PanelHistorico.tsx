import { ChangeEvent, useEffect, useRef, useState } from 'react'
import {
  borrarHistorico, exportarHistorico, importarHistorico, listarHistorico, type RegistroHistorico,
} from '../../lib/historico'
import GraficoComparativo from './GraficoComparativo'

export default function PanelHistorico() {
  const [registros, setRegistros] = useState<RegistroHistorico[] | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const inputArchivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listarHistorico().then(setRegistros)
  }, [])

  async function recargar() {
    setRegistros(await listarHistorico())
  }

  async function borrarTodo() {
    if (!window.confirm('¿Borrar todo el histórico guardado en este navegador? No se puede deshacer.')) return
    await borrarHistorico()
    await recargar()
    setMensaje('Histórico borrado.')
  }

  async function importar(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    try {
      const n = await importarHistorico(archivo)
      await recargar()
      setMensaje(`Se importaron ${n} periodos nuevos.`)
    } catch {
      setMensaje('No pude leer ese archivo como histórico válido.')
    }
  }

  return (
    <div>
      <p className="texto-muted">
        El histórico vive solo en este navegador — el servidor no guarda nada. Si cambias de
        dispositivo o borras los datos del navegador, lo pierdes: exporta el JSON regularmente,
        es tu única copia de seguridad.
      </p>

      <h3>Comparar meses</h3>
      {registros == null ? (
        <p className="texto-muted">Cargando…</p>
      ) : (
        <GraficoComparativo registros={registros} />
      )}

      {mensaje && <p className="texto-muted">{mensaje}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button className="boton-secundario" onClick={exportarHistorico}>Exportar histórico (JSON)</button>
        <button className="boton-secundario" onClick={() => inputArchivo.current?.click()}>Importar histórico</button>
        <input ref={inputArchivo} type="file" accept="application/json" style={{ display: 'none' }} onChange={importar} />
        <button className="boton-secundario" onClick={borrarTodo}>Borrar todo el histórico</button>
      </div>
    </div>
  )
}
