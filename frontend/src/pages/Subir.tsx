import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import { analizar, ErrorApi, logout } from '../lib/api'

type Props = {
  onSalir: () => void
}

export default function Subir({ onSalir }: Props) {
  const [arrastrando, setArrastrando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<unknown>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function procesar(archivo: File) {
    setError(null)
    setResultado(null)
    setProcesando(true)
    try {
      const json = await analizar(archivo)
      setResultado(json)
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
        {!resultado && (
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
        )}

        {error && <div className="mensaje-error" style={{ maxWidth: 560 }}>{error}</div>}

        {resultado != null && (
          <>
            <pre className="json-crudo tabular">{JSON.stringify(resultado, null, 2)}</pre>
            <button className="boton-secundario" onClick={() => setResultado(null)}>
              Analizar otro extracto
            </button>
          </>
        )}
      </div>
    </div>
  )
}
