// Ingresos: ventas de ganado, leche, queso y otros productos de la granja.
import * as S from '../store.js';
import * as L from '../logic.js';
import { COLOR_SOCIO, SOCIOS } from '../config.js';
import { h, pagina, tarjeta, filaLista, ir, vacio, fab, formulario, aviso } from '../ui.js';

export async function ingresos() {
  const todos = await S.todos('ingresos');
  let filtroQuien = '', busqueda = '', verTipos = false;
  const cuerpo = h('div');

  const dibujar = () => {
    cuerpo.replaceChildren();
    const b = L.balance([], todos);
    cuerpo.append(tarjeta('Ingresos de la granja',
      h('div', { class: 'grande' }, L.dinero(b.totalIngresos)),
      h('div', { class: 'socios' }, b.filas.map(f => h('div', { class: 'socio', style: `--c:${COLOR_SOCIO[f.socio]}` },
        h('span', { class: 'socio-nombre' }, 'Cobró ' + f.socio), h('b', {}, L.dinero(f.cobrado))))),
      h('small', {}, `${todos.filter(i => !i.deleted).length} ingresos registrados`),
      h('button', { class: 'btn', onclick: () => { verTipos = !verTipos; dibujar(); } }, verTipos ? 'Ocultar tipos' : 'Ver por tipo de ingreso')));
    if (verTipos) {
      const cats = L.ingresosPorCategoria(todos);
      cuerpo.append(tarjeta('Por tipo', cats.length ? cats.map(c => h('div', { class: 'cat' },
        h('div', { class: 'cat-fila' }, h('span', {}, c.cat), h('b', {}, L.dinero(c.total))),
        h('div', { class: 'barra' }, h('i', { style: `width:${Math.max(2, c.total / (b.totalIngresos || 1) * 100)}%` })),
        h('small', {}, `${c.n} ingresos`))) : vacio('Aún no hay ingresos.')));
    }
    cuerpo.append(h('div', { class: 'filtros' },
      ['', ...SOCIOS].map(q => h('button', { class: 'chip-btn' + (filtroQuien === q ? ' activo' : ''), onclick: () => { filtroQuien = q; dibujar(); } }, q || 'Todos')),
      h('input', { type: 'search', placeholder: 'Buscar…', value: busqueda, oninput: e => { busqueda = e.target.value; clearTimeout(dibujar.t); dibujar.t = setTimeout(() => { dibujar(); document.querySelector('.filtros input')?.focus(); }, 250); } })));
    const q = L.norm(busqueda);
    const lista = todos.filter(i => !i.deleted && (!filtroQuien || i.quien === filtroQuien) && (!q || L.norm([i.descripcion, i.categoria, i.comprador].join(' ')).includes(q)))
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.updatedAt - a.updatedAt));
    if (!lista.length) cuerpo.append(vacio(todos.length ? 'No hay ingresos que mostrar.' : 'Aún no hay ingresos. Toca + para registrar una venta.'));
    cuerpo.append(...lista.slice(0, 300).map(i => filaLista({
      titulo: i.descripcion || '(sin descripción)',
      sub: [L.fechaCorta(i.fecha), i.categoria, String(i.reparto || '').startsWith('Solo ') ? '👤 ' + i.reparto : '', i.cantidad ? `${i.cantidad} ${i.unidad || ''}`.trim() : '', i.comprador].filter(Boolean).join(' · '),
      derecha: L.dinero(L.num(i.monto)), subDerecha: 'Cobró ' + (i.quien || '—'), color: COLOR_SOCIO[i.quien], onclick: () => ir('/ingresos/' + i.id) })));
  };
  dibujar();
  return pagina('Ingresos', { atras: '/mas' }, cuerpo, fab('Nuevo ingreso', () => ir('/ingresos/nuevo')));
}

export async function ingresoForm(id) {
  const rec = id === 'nuevo' ? null : await S.uno('ingresos', id);
  const form = await formulario('ingresos', rec, {
    alGuardar: async r => {
      await S.guardar('ingresos', r);
      let msg = 'Ingreso guardado';
      if (!rec && r.categoria === 'Venta de ganado' && r.animal) {            // al registrar la venta de un animal, queda marcado como vendido
        const a = (await S.todos('animales')).find(x => String(x.arete) === String(r.animal));
        if (a) { await S.guardar('animales', { ...a, estado: 'Vendido', fechaSalida: r.fecha || a.fechaSalida }); msg += ' · animal marcado como vendido'; }
      }
      aviso(msg, 3000); ir('/ingresos');
    },
    alEliminar: async () => { await S.borrar('ingresos', id); aviso('Ingreso eliminado'); ir('/ingresos'); },
    alCancelar: () => history.back(),
  });
  return pagina(rec ? 'Editar ingreso' : 'Nuevo ingreso', { atras: '/ingresos' }, form);
}
