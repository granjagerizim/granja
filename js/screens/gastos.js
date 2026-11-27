// Gastos: lista con filtros, resumen por categoría y formulario.
import * as S from '../store.js';
import * as L from '../logic.js';
import { COLOR_SOCIO, SOCIOS, REPARTO_SOCIEDAD } from '../config.js';
import { h, pagina, tarjeta, filaLista, ir, vacio, fab, formulario, aviso, chip } from '../ui.js';

export async function gastos() {
  const [todos, ing] = await Promise.all([S.todos('gastos'), S.todos('ingresos')]);
  let filtroQuien = '', busqueda = '', verCategorias = false;
  const cuerpo = h('div');

  const dibujar = () => {
    cuerpo.replaceChildren();
    const b = L.balance(todos, ing);
    const hayIngresos = b.totalIngresos > 0;
    cuerpo.append(tarjeta('Inversión en la granja',
      h('small', {}, 'Total gastado'), h('div', { class: 'grande' }, L.dinero(b.total)),
      hayIngresos ? h('div', { class: 'lineas' }, h('div', {}, `Ingresos de la sociedad: ${L.dinero(b.totalIngresos)}`), h('div', {}, `Balance (gastos − ingresos): ${L.dinero(b.neto)}`)) : null,
      h('div', { class: 'socios' }, b.filas.map(f => h('div', { class: 'socio', style: `--c:${COLOR_SOCIO[f.socio]}` },
        h('span', { class: 'socio-nombre' }, f.socio), h('b', {}, L.dinero(f.pagado)),
        h('small', {}, b.total ? Math.round(f.pagado / b.total * 1000) / 10 + '% del total' : '')))),
      b.deuda ? h('div', { class: 'deuda' }, `${b.deuda.de} le debe ${L.dinero(b.deuda.monto)} a ${b.deuda.a}`) : h('div', { class: 'deuda ok' }, 'Están a mano'),
      b.sinSocio > 0 ? h('div', { class: 'error' }, `⚠ Hay ${L.dinero(b.sinSocio)} sin socio asignado`) : null,
      h('button', { class: 'btn', onclick: () => { verCategorias = !verCategorias; dibujar(); } }, verCategorias ? 'Ocultar categorías' : 'Ver por categoría')));
    if (verCategorias) {
      const cats = L.gastosPorCategoria(todos);
      cuerpo.append(tarjeta('Por categoría', cats.map(c => h('div', { class: 'cat' },
        h('div', { class: 'cat-fila' }, h('span', {}, c.cat), h('b', {}, L.dinero(c.total))),
        h('div', { class: 'barra' }, h('i', { style: `width:${Math.max(2, c.total / (b.total || 1) * 100)}%` })),
        h('small', {}, `${c.n} gastos · ` + SOCIOS.map(s => `${s} ${L.dinero(c.porSocio[s])}`).join(' · '))))));
    }
    cuerpo.append(h('div', { class: 'filtros' },
      ['', ...SOCIOS].map(q => h('button', { class: 'chip-btn' + (filtroQuien === q ? ' activo' : ''), onclick: () => { filtroQuien = q; dibujar(); } }, q || 'Todos')),
      h('input', { type: 'search', placeholder: 'Buscar…', value: busqueda, oninput: e => { busqueda = e.target.value; clearTimeout(dibujar.t); dibujar.t = setTimeout(() => { dibujar(); document.querySelector('.filtros input')?.focus(); }, 250); } })));
    const q = L.norm(busqueda);
    const lista = todos.filter(g => (!filtroQuien || g.quien === filtroQuien) && (!q || L.norm(g.descripcion + ' ' + L.categoriaGasto(g)).includes(q)))
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.updatedAt - a.updatedAt));
    if (!lista.length) cuerpo.append(vacio('No hay gastos que mostrar.'));
    cuerpo.append(...lista.slice(0, 300).map(g => filaLista({
      titulo: g.descripcion || '(sin descripción)', sub: [L.fechaCorta(g.fecha), L.categoriaGasto(g)].filter(Boolean).join(' · '),
      derecha: L.dinero(L.num(g.monto)), subDerecha: g.quien === REPARTO_SOCIEDAD ? 'Sociedad' : g.quien, color: COLOR_SOCIO[g.quien], onclick: () => ir('/gastos/' + g.id) })));
    if (lista.length > 300) cuerpo.append(vacio(`Se muestran 300 de ${lista.length}. Usa el buscador.`));
  };
  dibujar();
  return pagina('Gastos', { atras: '/mas' }, cuerpo, fab('Nuevo gasto', () => ir('/gastos/nuevo')));
}

export async function gastoForm(id) {
  const rec = id === 'nuevo' ? null : await S.uno('gastos', id);
  const form = await formulario('gastos', rec, {
    vistaPrevia: { descripcion: r => {
      if (!r.descripcion) return null;
      const auto = L.categoriaGasto({ descripcion: r.descripcion });
      if (r.categoria && r.categoria !== auto) return null;   // si la cambió a mano, no se muestra la sugerencia
      return { texto: `Categoría sugerida: ${auto}`, clase: 'verde' };
    },
    },
    autoCampo: { k: 'categoria', desde: r => (r.descripcion ? L.categoriaGasto({ descripcion: r.descripcion }) : '') },
    alGuardar: async r => { if (r.categoria === L.categoriaGasto({ descripcion: r.descripcion })) r.categoria = '';   // si coincide con la automática, se deja automática
      await S.guardar('gastos', r); aviso('Gasto guardado'); ir('/gastos'); },
    alEliminar: async () => { await S.borrar('gastos', id); aviso('Gasto eliminado'); ir('/gastos'); },
    alCancelar: () => history.back(),
  });
  return pagina(rec ? 'Editar gasto' : 'Nuevo gasto', { atras: '/gastos' }, form);
}
