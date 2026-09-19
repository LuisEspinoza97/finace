import { obtenerReglas } from './reglas'

declare global {
  interface Window { __API_URL__?: string }
}

// Prioridad: window.__API_URL__ (config.js, generado al ARRANCAR el
// contenedor a partir de la env var API_URL -- ver
// frontend/docker-entrypoint.d/40-runtime-config.sh) sobre
// import.meta.env.VITE_API_URL (solo aplica a `npm run dev`/`npm run
// build`, se fija al COMPILAR). El primero existe para poder cambiar la
// URL del backend en Render sin reconstruir la imagen -- Render a veces
// le agrega un sufijo random al nombre del servicio si ya esta tomado, y
// eso no se sabe hasta despues del primer deploy.
const BASE_URL = window.__API_URL__ || import.meta.env.VITE_API_URL || 'http://localhost:8000'

export class ErrorApi extends Error {}

async function leerError(r: Response): Promise<never> {
  let detalle = `Error ${r.status}`
  try {
    const cuerpo = await r.json()
    if (typeof cuerpo?.detail === 'string') detalle = cuerpo.detail
  } catch {
    // el cuerpo no era JSON, se usa el mensaje generico
  }
  throw new ErrorApi(detalle)
}

export async function login(usuario: string, password: string): Promise<void> {
  const r = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, password }),
  })
  if (!r.ok) await leerError(r)
}

export async function logout(): Promise<void> {
  await fetch(`${BASE_URL}/api/logout`, { method: 'POST', credentials: 'include' })
}

export async function sesionActiva(): Promise<boolean> {
  const r = await fetch(`${BASE_URL}/api/yo`, { credentials: 'include' })
  if (!r.ok) return false
  const cuerpo = await r.json()
  return Boolean(cuerpo?.autenticado)
}

export async function analizar(archivo: File): Promise<unknown> {
  const form = new FormData()
  form.append('archivo', archivo)
  form.append('reglas', JSON.stringify(obtenerReglas()))
  const r = await fetch(`${BASE_URL}/api/analizar`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  if (!r.ok) await leerError(r)
  return r.json()
}
