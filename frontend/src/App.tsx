import { useEffect, useState } from 'react'
import Login from './pages/Login'
import Subir from './pages/Subir'
import { sesionActiva } from './lib/api'

type Pantalla = 'cargando' | 'login' | 'subir'
type Tema = 'light' | 'dark'

function temaInicial(): Tema {
  const guardado = localStorage.getItem('tema')
  if (guardado === 'light' || guardado === 'dark') return guardado
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('cargando')
  const [tema, setTema] = useState<Tema>(temaInicial)

  useEffect(() => {
    document.documentElement.dataset.theme = tema
  }, [tema])

  useEffect(() => {
    sesionActiva().then((activa) => setPantalla(activa ? 'subir' : 'login'))
  }, [])

  function alternarTema() {
    const nuevo = tema === 'light' ? 'dark' : 'light'
    localStorage.setItem('tema', nuevo)
    setTema(nuevo)
  }

  return (
    <>
      <button
        className="toggle-tema"
        style={{ position: 'fixed', bottom: 12, left: 12, zIndex: 10 }}
        onClick={alternarTema}
        aria-label="Cambiar tema"
      >
        {tema === 'light' ? '🌙 Oscuro' : '☀️ Claro'}
      </button>

      {pantalla === 'cargando' && null}
      {pantalla === 'login' && <Login onEntrar={() => setPantalla('subir')} />}
      {pantalla === 'subir' && <Subir onSalir={() => setPantalla('login')} />}
    </>
  )
}
