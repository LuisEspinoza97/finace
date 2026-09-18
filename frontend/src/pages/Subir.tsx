import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import { analizar, ErrorApi, logout } from '../lib/api'
import type { Analisis } from '../lib/tipos'

type Props = {
  onListo: (datos: Analisis) => void
  onSalir: () => void
}

export default function Subir({ onListo, onSalir }: Props) {
  const [arrastrando, setArrastrando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function procesar(archivo: File) {
    setError(null)
    setProcesando(true)
    try {
      const json = await analizar(archivo)
      onListo(json as Analisis)
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
        <button className="boton-secundario" onClick={salir}>Cerrar sesión</button>
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

        {error && <div className="mensaje-error" style={{ maxWidth: 560 }}>{error}</div>}
      </div>
    </div>
  )
}
