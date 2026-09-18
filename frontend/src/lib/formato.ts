const fmtMoneda = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function moneda(valor: number): string {
  const signo = valor < 0 ? '-' : ''
  return signo + fmtMoneda.format(Math.abs(valor))
}

export function porcentaje(valor: number, decimales = 1): string {
  return `${(valor * 100).toFixed(decimales)}%`
}

export function fecha(iso: string): string {
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}
