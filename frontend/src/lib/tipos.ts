// Espejo de lo que devuelve app.core.analisis.analizar() en el backend.

export type Resumen = {
  banco: string
  cuenta: string
  desde: string
  hasta: string
  dias: number
  saldo_inicial: number
  saldo_final: number
  entradas: number
  salidas: number
  n_entradas: number
  n_salidas: number
  neto: number
  gasto_diario: number
  tasa_ahorro: number
  extraordinarios: number
  entradas_recurrentes: number
  neto_real: number
  saldo_minimo: number
}

export type Alerta = {
  nivel: 'critico' | 'serio' | 'atencion' | 'bien'
  texto: string
}

export type MovimientoExtraordinario = {
  fecha: string
  descripcion: string
  monto: number
}

export type Tramo = {
  label: string
  n: number
  monto: number
  pct_n: number
  pct_monto: number
}

export type Fragmentacion = {
  n_movimientos: number
  monto: number
  pct_movimientos: number
  pct_monto: number
  umbral: number
}

export type PuntoSerie = {
  fecha: string
  entro: number
  salio: number
  saldo: number | null
}

export type Grupo = {
  grupo: string
  monto: number
  pct: number
  objetivo: number
  sobregasto: boolean
}

export type Categoria = {
  categoria: string
  grupo: string
  monto: number
  n: number
  pct: number
  objetivo: number
  exceso: number
  sobregasto: boolean
}

export type MovimientoTop = {
  fecha: string
  descripcion: string
  monto: number
  categoria: string
}

export type Recurrente = {
  concepto: string
  monto: number
  veces: number
  total: number
}

export type Duplicado = {
  fecha: string
  descripcion: string
  monto: number
  veces: number
}

export type Comisiones = {
  total: number
  n: number
  interes_ganado: number
  neto: number
  pct_salidas: number
  detalle: { fecha: string; descripcion: string; monto: number }[]
}

export type SinClasificar = {
  descripcion: string
  n: number
  monto: number
}

export type Movimiento = {
  fecha: string
  descripcion: string
  monto: number
  saldo: number | null
  categoria: string
}

export type Analisis = {
  resumen: Resumen
  alerta: Alerta
  extraordinarios: MovimientoExtraordinario[]
  tramos_salidas: Tramo[]
  tramos_entradas: Tramo[]
  fragmentacion: Fragmentacion
  serie: PuntoSerie[]
  grupos: Grupo[]
  categorias: Categoria[]
  top_salidas: MovimientoTop[]
  top_entradas: MovimientoTop[]
  recurrentes: Recurrente[]
  duplicados: Duplicado[]
  comisiones: Comisiones
  sin_clasificar: SinClasificar[]
  avisos: string[]
  movimientos: Movimiento[]
}
