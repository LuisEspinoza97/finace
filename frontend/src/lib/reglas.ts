export type ReglaUsuario = {
  clave: string
  categoria: string
}

const CLAVE_STORAGE = 'reglas_usuario'

// Las mismas 23 categorias de backend/app/core/categorias.py. SIN CLASIFICAR
// no se ofrece como destino: para eso existe la categoria por defecto.
export const CATEGORIAS_DISPONIBLES = [
  'Vivienda',
  'Servicios basicos',
  'Alimentacion / Supermercado',
  'Salud y farmacia',
  'Transporte esencial',
  'Educacion',
  'Restaurantes y cafeterias',
  'Entretenimiento y ocio',
  'Compras y ropa',
  'Suscripciones digitales',
  'Viajes',
  'Pago tarjeta de credito',
  'Prestamos y cuotas',
  'Comisiones e intereses',
  'Transferencias y retiros',
  'Impuestos y seguros',
  'Delivery apps',
  'Tiendas de conveniencia',
  'Recargas y microconsumos',
  'Sueldo',
  'Ingresos negocio',
  'Otros ingresos',
]

export function obtenerReglas(): ReglaUsuario[] {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE)
    if (!crudo) return []
    const datos = JSON.parse(crudo)
    if (!Array.isArray(datos)) return []
    return datos.filter((r): r is ReglaUsuario =>
      typeof r?.clave === 'string' && typeof r?.categoria === 'string')
  } catch {
    return []
  }
}

function guardarReglas(reglas: ReglaUsuario[]): void {
  localStorage.setItem(CLAVE_STORAGE, JSON.stringify(reglas))
}

export function agregarRegla(clave: string, categoria: string): ReglaUsuario[] {
  const reglas = obtenerReglas()
  const claveNormalizada = clave.trim().toUpperCase()
  const siguientes = [...reglas.filter((r) => r.clave !== claveNormalizada),
                      { clave: claveNormalizada, categoria }]
  guardarReglas(siguientes)
  return siguientes
}

export function borrarRegla(clave: string): ReglaUsuario[] {
  const siguientes = obtenerReglas().filter((r) => r.clave !== clave)
  guardarReglas(siguientes)
  return siguientes
}

// Toda regla de 4 letras o menos puede coincidir dentro de otra palabra sin
// que el usuario lo note (ver los ejemplos ya documentados en categorias.py:
// "SPI" dentro de apellidos, "CUOTA" dentro de ALICUOTA, "MAX" dentro de
// PRIMAX). Se avisa siempre, no se bloquea: la decision final es del usuario.
export function advertenciaClaveCorta(clave: string): string | null {
  const limpia = clave.trim()
  if (limpia.length > 0 && limpia.length <= 4) {
    return `"${limpia}" tiene ${limpia.length} letras y podría aparecer dentro de otra palabra ` +
      `(por ejemplo, "CUOTA" también está dentro de "ALICUOTA"). Si puedes, usa una palabra más larga o con un espacio.`
  }
  return null
}

export function exportarReglas(): void {
  const reglas = obtenerReglas()
  const blob = new Blob([JSON.stringify(reglas, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reglas-radiografia-financiera-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importarReglas(archivo: File): Promise<ReglaUsuario[]> {
  const texto = await archivo.text()
  const datos = JSON.parse(texto)
  if (!Array.isArray(datos)) throw new Error('El archivo no contiene una lista de reglas.')
  const reglas = datos.filter((r): r is ReglaUsuario =>
    typeof r?.clave === 'string' && typeof r?.categoria === 'string')
  guardarReglas(reglas)
  return reglas
}
