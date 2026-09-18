import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import { analizar, ErrorApi, logout } from '../lib/api'
import type { Analisis } from '../lib/tipos'
import Modal from '../components/Modal'
import GestorReglas from '../components/reglas/GestorReglas'
import PanelHistorico from '../components/historico/PanelHistorico'

type Props = {
  onListo: (datos: Analisis, archivo: File, guardarHistorico: boolean) => void
  onSalir: () => void
}

export default function Subir({ onListo, onSalir }: Props) {
  const [arrastrando, setArrastrando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardarHistorico, setGuardarHistorico] = useState(true)
  const [modalAbierto, setModalAbierto] = useState<'reglas' | 'historico' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function procesar(archivo: File) {
    setError(null)
    setProcesando(true)
    try {
      const json = await analizar(archivo)
      onListo(json as Analisis, archivo, guardarHistorico)
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setProcesando(false)
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setArrastrando(false)
    const archivo = e.dataTransfer.files[0]
    if (archivo) void procesar(archivo)
  }

  function onSeleccion(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (archivo) void procesar(archivo)
    e.target.value = ''
  }

  async function salir() {
    await logout()
    onSalir()
  }

  return (
    <div className="pantalla">
      <div className="barra-superior">
        <span>Radiografía Financiera</span>
        <div className="barra-superior-acciones">
          <button className="boton-secundario" onClick={() => setModalAbierto('reglas')}>Reglas</button>
          <button className="boton-secundario" onClick={() => setModalAbierto('historico')}>Histórico</button>
          <button className="boton-secundario" onClick={salir}>Cerrar sesión</button>
        </div>
      </div>

      <div className="pantalla-contenido">
        <div
          className={`zona-subida${arrastrando ? ' activa' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={onDrop}
        >
          {procesando ? (
            <p>Analizando tu estado de cuenta...</p>
          ) : (
            <>
              <p>Arrastra aquí el PDF de tu estado de cuenta</p>
              <p>o</p>
              <button className="disparador" onClick={() => inputRef.current?.click()}>
                Elegir archivo
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                onChange={onSeleccion}
              />
            </>
          )}
        </div>

        <label className="opcion-historico">
          <input
            type="checkbox"
            checked={guardarHistorico}
            onChange={(e) => setGuardarHistorico(e.target.checked)}
          />
          Guardar este análisis en el histórico de este navegador (para comparar meses después)
        </label>

        {error && <div className="mensaje-error" style={{ maxWidth: 560 }}>{error}</div>}
      </div>

      {modalAbierto === 'reglas' && (
        <Modal titulo="Reglas de categorización" onCerrar={() => setModalAbierto(null)}>
          <GestorReglas />
        </Modal>
      )}
      {modalAbierto === 'historico' && (
        <Modal titulo="Histórico" onCerrar={() => setModalAbierto(null)}>
          <PanelHistorico />
        </Modal>
      )}
    </div>
  )
}
