import { useState } from 'react'
import { moneda, porcentaje } from '../lib/formato'
import { analizar, ErrorApi } from '../lib/api'
import type { Analisis } from '../lib/tipos'
import Tile from '../components/tiles/Tile'
import GraficoLineaArea from '../components/charts/GraficoLineaArea'
import BarrasApiladas100 from '../components/charts/BarrasApiladas100'
import BarrasHorizontales, { ItemBarra } from '../components/charts/BarrasHorizontales'
import TablaGenerica from '../components/tablas/TablaGenerica'
import TablaMovimientos from '../components/tablas/TablaMovimientos'
import Modal from '../components/Modal'
import GestorReglas from '../components/reglas/GestorReglas'
import PanelHistorico from '../components/historico/PanelHistorico'
import type { Recurrente, Duplicado, SinClasificar } from '../lib/tipos'

type Props = {
  datos: Analisis
  oscuro: boolean
  archivoOriginal: File | null
  onActualizarDatos: (datos: Analisis) => void
  onReiniciar: () => void
  onSalir: () => void
}

const COLOR_NIVEL: Record<string, string> = {
  critico: 'var(--crit)',
  serio: 'var(--serious)',
  atencion: 'var(--warn)',
  bien: 'var(--goodtx)',
}

export default function Dashboard({ datos, oscuro, archivoOriginal, onActualizarDatos, onReiniciar, onSalir }: Props) {
  const { resumen, alerta } = datos
  const [modalAbierto, setModalAbierto] = useState<'reglas' | 'historico' | null>(null)
  const [claveSugerida, setClaveSugerida] = useState<string | undefined>(undefined)
  const [reaplicando, setReaplicando] = useState(false)
  const [errorReaplicar, setErrorReaplicar] = useState<string | null>(null)

  function abrirReglasPara(descripcion: string) {
    setClaveSugerida(descripcion)
    setModalAbierto('reglas')
  }

  async function reaplicarReglas() {
    if (!archivoOriginal) return
    setReaplicando(true)
    setErrorReaplicar(null)
    try {
      const nuevo = await analizar(archivoOriginal)
      onActualizarDatos(nuevo as Analisis)
    } catch (err) {
      setErrorReaplicar(err instanceof ErrorApi ? err.message : 'No se pudo volver a analizar el archivo.')
    } finally {
      setReaplicando(false)
    }
  }

  const hayExtraordinarios = resumen.extraordinarios > 0
  const cifraGrande = hayExtraordinarios ? resumen.neto_real : resumen.neto
  const colorCifra = COLOR_NIVEL[alerta.nivel] ?? 'var(--ink)'
  const explicacion = hayExtraordinarios
    ? `Entraron ${moneda(resumen.entradas)} en total, pero ${moneda(resumen.extraordinarios)} ` +
      `fueron un ingreso extraordinario (ver detalle abajo). Sin contarlo, tu flujo real fue ` +
      `${moneda(resumen.neto_real)}; contándolo, el periodo cerró en ${moneda(resumen.neto)}.`
    : alerta.texto

  const itemsSalidas: ItemBarra[] = datos.top_salidas.map((m) => ({
    etiqueta: m.descripcion,
    subEtiqueta: m.categoria,
    valor: m.monto,
    pct: resumen.salidas ? m.monto / resumen.salidas : undefined,
  }))
  const itemsEntradas: ItemBarra[] = datos.top_entradas.map((m) => ({
    etiqueta: m.descripcion,
    subEtiqueta: m.categoria,
    valor: m.monto,
    pct: resumen.entradas ? m.monto / resumen.entradas : undefined,
  }))

  const itemsCategorias: ItemBarra[] = datos.categorias.map((c) => ({
    etiqueta: c.categoria,
    valor: c.monto,
    pct: c.pct,
    objetivoValor: c.objetivo * resumen.salidas,
    sobregasto: c.sobregasto,
  }))
  const itemsGrupos: ItemBarra[] = datos.grupos.map((g) => ({
    etiqueta: g.grupo,
    valor: g.monto,
    pct: g.pct,
    objetivoValor: g.objetivo * resumen.salidas,
    sobregasto: g.sobregasto,
  }))

  const categoriaDominante = [...datos.categorias].sort((a, b) => b.pct - a.pct)[0]
  const esLimitacionDelBanco = categoriaDominante &&
    categoriaDominante.pct > 0.5 &&
    (categoriaDominante.categoria === 'Transferencias y retiros' || categoriaDominante.categoria === 'SIN CLASIFICAR')

  return (
    <div className="pantalla">
      <div className="barra-superior">
        <span>Radiografía Financiera</span>
        <div className="barra-superior-acciones">
          <button className="boton-secundario" onClick={() => setModalAbierto('reglas')}>Reglas</button>
          <button className="boton-secundario" onClick={() => setModalAbierto('historico')}>Histórico</button>
          <button className="boton-secundario" onClick={onReiniciar}>Analizar otro extracto</button>
          <button className="boton-secundario" onClick={onSalir}>Cerrar sesión</button>
        </div>
      </div>

      <div className="dashboard">
        {archivoOriginal && (
          <div className="banner-reaplicar">
            <span>¿Creaste o cambiaste una regla? Vuelve a analizar el mismo PDF para aplicarla.</span>
            <button className="boton-secundario" onClick={reaplicarReglas} disabled={reaplicando}>
              {reaplicando ? 'Aplicando...' : 'Reaplicar mis reglas'}
            </button>
          </div>
        )}
        {errorReaplicar && <div className="mensaje-error">{errorReaplicar}</div>}

        {datos.avisos.length > 0 && (
          <div className="banner-aviso">
            El banco declara cifras que no coinciden exactamente con lo que calculé:
            <ul>
              {datos.avisos.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        )}

        <section className="seccion">
          <div className="veredicto">
            <div className="subtitulo">
              {resumen.banco} · {resumen.cuenta} · {resumen.desde} a {resumen.hasta}
            </div>
            <div className="cifra tabular" style={{ color: colorCifra }}>{moneda(cifraGrande)}</div>
            <p className="explicacion">{explicacion}</p>

            {hayExtraordinarios && (
              <details style={{ textAlign: 'left', marginTop: 12 }}>
                <summary>Ver el ingreso extraordinario</summary>
                <TablaGenerica
                  filas={datos.extraordinarios}
                  columnas={[
                    { header: 'Fecha', render: (m) => m.fecha },
                    { header: 'Descripción', render: (m) => m.descripcion },
                    { header: 'Monto', render: (m) => moneda(m.monto), numerica: true },
                  ]}
                />
              </details>
            )}
          </div>
        </section>

        <section className="seccion">
          <div className="grid-tiles">
            <Tile etiqueta="Entradas" valor={moneda(resumen.entradas)} color="var(--in)" />
            <Tile etiqueta="Salidas" valor={moneda(resumen.salidas)} color="var(--out)" />
            <Tile etiqueta="Saldo final" valor={moneda(resumen.saldo_final)} />
            <Tile etiqueta="Gasto diario promedio" valor={moneda(resumen.gasto_diario)} />
          </div>
        </section>

        <section className="seccion">
          <h2>Saldo día a día</h2>
          <p className="subtitulo">El mínimo y el máximo del periodo, marcados sobre la línea.</p>
          <GraficoLineaArea serie={datos.serie} />
        </section>

        <section className="seccion">
          <h2>Dónde está el ruido</h2>
          <p className="subtitulo">
            Cuántos movimientos vs. cuánto dinero mueven, por tamaño de la salida.
          </p>
          <BarrasApiladas100 tramos={datos.tramos_salidas} oscuro={oscuro} />
          <p style={{ marginTop: 12 }}>
            {datos.fragmentacion.n_movimientos} de tus {resumen.n_salidas} salidas fueron de menos de $20
            ({porcentaje(datos.fragmentacion.pct_movimientos / 100)} de los movimientos) y juntas mueven{' '}
            {moneda(datos.fragmentacion.monto)} ({porcentaje(datos.fragmentacion.pct_monto / 100)} de lo que gastaste).
          </p>
        </section>

        <section className="seccion">
          <h2>Top 10 salidas</h2>
          <BarrasHorizontales
            items={itemsSalidas}
            color="var(--out)"
            columnas={{ etiqueta: 'Descripción', valor: 'Monto', pct: '% de las salidas' }}
          />
        </section>

        <section className="seccion">
          <h2>Todas las entradas</h2>
          <BarrasHorizontales
            items={itemsEntradas}
            color="var(--in)"
            columnas={{ etiqueta: 'Descripción', valor: 'Monto', pct: '% de las entradas' }}
          />
        </section>

        <section className="seccion">
          <h2>Por categoría</h2>
          <p className="subtitulo">La línea marca el objetivo saludable; en rojo, lo que se pasó.</p>
          <BarrasHorizontales
            items={itemsCategorias}
            color="var(--out)"
            columnas={{ etiqueta: 'Categoría', valor: 'Monto', pct: '% de las salidas', objetivo: 'Objetivo' }}
          />
          {esLimitacionDelBanco && (
            <p className="texto-muted" style={{ marginTop: 8 }}>
              El {porcentaje(categoriaDominante.pct)} de tus salidas cayó en "{categoriaDominante.categoria}"
              porque el banco no siempre dice el nombre del comercio. Es una limitación del extracto, no del
              motor de categorización — revisa la tabla de movimientos al final para más detalle.
            </p>
          )}
        </section>

        <section className="seccion">
          <h2>Por grupo</h2>
          <BarrasHorizontales
            items={itemsGrupos}
            color="var(--out)"
            columnas={{ etiqueta: 'Grupo', valor: 'Monto', pct: '% de las salidas', objetivo: 'Objetivo' }}
          />
        </section>

        <section className="seccion">
          <h2>Recurrentes</h2>
          <p className="subtitulo">Mismo concepto y mismo monto, dos veces o más. Así viven las suscripciones.</p>
          <TablaGenerica<Recurrente>
            filas={datos.recurrentes}
            vacio="No encontré cobros recurrentes exactos."
            columnas={[
              { header: 'Concepto', render: (r) => r.concepto },
              { header: 'Monto c/u', render: (r) => moneda(r.monto), numerica: true },
              { header: 'Veces', render: (r) => r.veces, numerica: true },
              { header: 'Total', render: (r) => moneda(r.total), numerica: true },
            ]}
          />

          <h2 style={{ marginTop: 24 }}>Duplicados</h2>
          <p className="subtitulo">Misma fecha, descripción y monto. Revisa si es un cobro doble.</p>
          <TablaGenerica<Duplicado>
            filas={datos.duplicados}
            vacio="No encontré movimientos duplicados."
            columnas={[
              { header: 'Fecha', render: (d) => d.fecha },
              { header: 'Descripción', render: (d) => d.descripcion },
              { header: 'Monto', render: (d) => moneda(d.monto), numerica: true },
              { header: 'Veces', render: (d) => d.veces, numerica: true },
            ]}
          />

          <h2 style={{ marginTop: 24 }}>Comisiones</h2>
          <p className="subtitulo">
            Pagaste {moneda(datos.comisiones.total)} en comisiones ({porcentaje(datos.comisiones.pct_salidas / 100)}{' '}
            de tus salidas) y ganaste {moneda(datos.comisiones.interes_ganado)} en intereses: neto{' '}
            {moneda(datos.comisiones.neto)}.
          </p>
          <TablaGenerica
            filas={datos.comisiones.detalle}
            vacio="No encontré comisiones cobradas."
            columnas={[
              { header: 'Fecha', render: (c) => c.fecha },
              { header: 'Descripción', render: (c) => c.descripcion },
              { header: 'Monto', render: (c) => moneda(c.monto), numerica: true },
            ]}
          />
        </section>

        <section className="seccion">
          <h2>Sin clasificar</h2>
          <p className="subtitulo">
            El motor no reconoció estos comercios. Crea una regla para que los reconozca la próxima vez.
          </p>
          <TablaGenerica<SinClasificar>
            filas={datos.sin_clasificar}
            vacio="El motor clasificó todos tus movimientos."
            columnas={[
              { header: 'Descripción', render: (s) => s.descripcion },
              { header: 'Veces', render: (s) => s.n, numerica: true },
              { header: 'Monto', render: (s) => moneda(s.monto), numerica: true },
              {
                header: '', render: (s) => (
                  <button className="boton-secundario" onClick={() => abrirReglasPara(s.descripcion)}>
                    Crear regla
                  </button>
                ),
              },
            ]}
          />
        </section>

        <section className="seccion">
          <h2>Todos los movimientos</h2>
          <TablaMovimientos movimientos={datos.movimientos} />
        </section>
      </div>

      {modalAbierto === 'reglas' && (
        <Modal titulo="Reglas de categorización" onCerrar={() => { setModalAbierto(null); setClaveSugerida(undefined) }}>
          <GestorReglas claveSugerida={claveSugerida} />
        </Modal>
      )}
      {modalAbierto === 'historico' && (
        <Modal titulo="Histórico" onCerrar={() => setModalAbierto(null)}>
          <PanelHistorico />
        </Modal>
      )}
    </div>
  )
}
