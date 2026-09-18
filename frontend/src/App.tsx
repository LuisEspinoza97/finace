import { useEffect, useState } from 'react'
import Login from './pages/Login'
import Subir from './pages/Subir'
import Dashboard from './pages/Dashboard'
import { sesionActiva } from './lib/api'
import { guardarEnHistorico } from './lib/historico'
import type { Analisis } from './lib/tipos'

type Pantalla = 'cargando' | 'login' | 'subir' | 'dashboard'
type Tema = 'light' | 'dark'

function temaInicial(): Tema {
  const guardado = localStorage.getItem('tema')
  if (guardado === 'light' || guardado === 'dark') return guardado
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('cargando')
  const [tema, setTema] = useState<Tema>(temaInicial)
  const [datos, setDatos] = useState<Analisis | null>(null)
  const [archivoOriginal, setArchivoOriginal] = useState<File | null>(null)

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

  function irALogin() {
    setDatos(null)
    setArchivoOriginal(null)
    setPantalla('login')
  }

  function alTerminarAnalisis(json: Analisis, archivo: File, guardarHistorico: boolean) {
    setDatos(json)
    setArchivoOriginal(archivo)
    if (guardarHistorico) void guardarEnHistorico(json.resumen)
    setPantalla('dashboard')
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
      {pantalla === 'subir' && <Subir onListo={alTerminarAnalisis} onSalir={irALogin} />}
      {pantalla === 'dashboard' && datos && (
        <Dashboard
          datos={datos}
          oscuro={tema === 'dark'}
          archivoOriginal={archivoOriginal}
          onActualizarDatos={setDatos}
          onReiniciar={() => { setDatos(null); setArchivoOriginal(null); setPantalla('subir') }}
          onSalir={irALogin}
        />
      )}
    </>
  )
}
