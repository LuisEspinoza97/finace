import type { Resumen } from './tipos'

export type RegistroHistorico = {
  id: number
  guardadoEn: string
  resumen: Resumen
}

const NOMBRE_DB = 'radiografia-historico'
const NOMBRE_STORE = 'periodos'
const VERSION_DB = 1

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(NOMBRE_DB, VERSION_DB)
    peticion.onupgradeneeded = () => {
      const db = peticion.result
      if (!db.objectStoreNames.contains(NOMBRE_STORE)) {
        db.createObjectStore(NOMBRE_STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    peticion.onsuccess = () => resolve(peticion.result)
    peticion.onerror = () => reject(peticion.error)
  })
}

export async function guardarEnHistorico(resumen: Resumen): Promise<void> {
  const db = await abrirDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(NOMBRE_STORE, 'readwrite')
    tx.objectStore(NOMBRE_STORE).add({ guardadoEn: new Date().toISOString(), resumen })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function listarHistorico(): Promise<RegistroHistorico[]> {
  const db = await abrirDB()
  const registros = await new Promise<RegistroHistorico[]>((resolve, reject) => {
    const tx = db.transaction(NOMBRE_STORE, 'readonly')
    const peticion = tx.objectStore(NOMBRE_STORE).getAll()
    peticion.onsuccess = () => resolve(peticion.result as RegistroHistorico[])
    peticion.onerror = () => reject(peticion.error)
  })
  db.close()
  return registros.sort((a, b) => a.resumen.desde.localeCompare(b.resumen.desde))
}

export async function borrarHistorico(): Promise<void> {
  const db = await abrirDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(NOMBRE_STORE, 'readwrite')
    tx.objectStore(NOMBRE_STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function exportarHistorico(): Promise<void> {
  const registros = await listarHistorico()
  const blob = new Blob([JSON.stringify(registros, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `historico-radiografia-financiera-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function firma(r: Resumen): string {
  return `${r.banco}|${r.cuenta}|${r.desde}|${r.hasta}|${r.saldo_final}`
}

export async function importarHistorico(archivo: File): Promise<number> {
  const texto = await archivo.text()
  const datos = JSON.parse(texto)
  if (!Array.isArray(datos)) throw new Error('El archivo no contiene un histórico válido.')

  const existentes = await listarHistorico()
  const firmasExistentes = new Set(existentes.map((r) => firma(r.resumen)))

  const db = await abrirDB()
  let importados = 0
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(NOMBRE_STORE, 'readwrite')
    const store = tx.objectStore(NOMBRE_STORE)
    for (const item of datos) {
      if (!item?.resumen || firmasExistentes.has(firma(item.resumen))) continue
      store.add({ guardadoEn: item.guardadoEn ?? new Date().toISOString(), resumen: item.resumen })
      importados++
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return importados
}
