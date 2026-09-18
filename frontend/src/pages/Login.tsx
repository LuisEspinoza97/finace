import { FormEvent, useState } from 'react'
import { ErrorApi, login } from '../lib/api'

type Props = {
  onEntrar: () => void
}

export default function Login({ onEntrar }: Props) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      await login(usuario, password)
      onEntrar()
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="pantalla">
      <div className="pantalla-contenido">
        <form className="tarjeta" onSubmit={enviar}>
          <h1>Radiografía Financiera</h1>
          {error && <div className="mensaje-error">{error}</div>}
          <div className="campo">
            <label htmlFor="usuario">Usuario</label>
            <input
              id="usuario"
              autoFocus
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="campo">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button className="boton-primario" type="submit" disabled={cargando}>
            {cargando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
