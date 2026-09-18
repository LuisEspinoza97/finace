export const RAMPA_ORDINAL = ['var(--o1)', 'var(--o2)', 'var(--o3)', 'var(--o4)', 'var(--o5)']

// Los extremos claros de la rampa cambian segun el tema: en claro son los dos
// primeros pasos (o1, o2), en oscuro los dos ultimos (o4, o5). Ahi el texto
// necesita tinta oscura; en el resto, tinta clara.
export function colorTextoSegmento(indice: number, oscuro: boolean): string {
  const usaTintaOscura = oscuro ? indice >= 3 : indice <= 1
  return usaTintaOscura ? '#0b0b0b' : '#ffffff'
}
