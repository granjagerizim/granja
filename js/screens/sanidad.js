// Sanidad: resumen (vencidas / próximas / al día) con tres vistas de lo pendiente, y formulario que permite aplicar a varios animales a la vez.
import * as S from '../store.js';
import * as L from '../logic.js';
import { h, pagina, filaLista, ir, vacio, fab, formulario, aviso, chip, claseEstado, opcionesAnimal, tarjeta } from '../ui.js';

let vista = 'fecha';
let filtro = '';   // '', 'Vencida', 'Próxima' o 'Al día' (se activa tocando los cuadros de arriba)
const COLOR = { Vencida: '#b3261e', 'Próxima': '#c98a00', 'Al día': '#5aa469', 'Sin fecha': '#9aa39a' };
const NOMBRE_FILTRO = { Vencida: 'vencidas', 'Próxima': 'próximas', 'Al día': 'al día', 'Sin fecha': 'sin fecha de repetición' };
const orden = e => (e.dias === null || e.dias === undefined ? 1e9 : e.dias);

// Texto relativo: "venció hace 12 días", "en 5 días", "en 3 meses"
function cuando(d) {
  const n = Math.abs(d), t = n >= 60 ? `${Math.round(n / 30)} meses` : n === 1 ? '1 día' : `${n} días`;
  return d < 0 ? `venció hace ${t}` : d === 0 ? 'toca hoy' : `en ${t}`;
}

export async function sanidad() {
  const [regs, animales] = await Promise.all([S.todos('sanidad'), S.todos('animales')]);
  const idDe = arete => (animales.find(a => String(a.arete) === String(arete)) || {}).id;
  // Solo lo pendiente: la próxima dosis de cada animal + medicamento (el historial está en la ficha de cada animal)
  const estados = L.estadosSanidad(regs, animales);
  const conFecha = estados.filter(e => e.estado === 'Vencida' || e.estado === 'Próxima' || e.estado === 'Al día');
  // Aplicaciones sin "Repetir en (días)": no generan aviso, pero se listan (la más reciente por animal + medicamento)
  const nombreMed = e => `${e.rec.tipo || ''}|${e.rec.producto || ''}`;
  const ultimas = new Map();
  for (const e of estados.filter(x => !x.estado)) { const k = String(e.rec.animal) + '|' + L.norm(nombreMed(e)); const a = ultimas.get(k); if (!a || (e.rec.fecha || '') > (a.rec.fecha || '')) ultimas.set(k, e); }
  const sinFecha = [...ultimas.values()].map(e => ({ ...e, estado: 'Sin fecha', dias: null }));
  const todos = [...conFecha, ...sinFecha];
  const cuenta = est => todos.filter(e => e.estado === est).length;
  const med = e => `${e.rec.tipo || ''}${e.rec.producto ? ' · ' + e.rec.producto : ''}`;
  const fila = (e, conAnimal = true, conMed = true) => filaLista({
    titulo: conAnimal ? L.etiquetaAnimal(e.rec.animal, animales) : med(e), sub: conMed && conAnimal ? med(e) : `Última aplicación: ${L.fechaCorta(e.rec.fecha)}`,
    derecha: chip(e.estado, claseEstado(e.estado)), subDerecha: e.dias === null ? `aplicada el ${L.fechaCorta(e.rec.fecha)}` : cuando(e.dias), color: COLOR[e.estado],
    onclick: () => ir('/animales/' + idDe(e.rec.animal)) });
  const cuerpo = h('div', { class: 'pagina-int' });

  const resumen = h('div', { class: 'resumen3' });
  const pintarResumen = () => {
    resumen.classList.toggle('filtrando', !!filtro);
    resumen.classList.toggle('cuatro', cuenta('Sin fecha') > 0);
    resumen.replaceChildren(...[['Vencida', 'Vencidas', 'rojo'], ['Próxima', 'Próximas', 'ambar'], ['Al día', 'Al día', 'verde'], ['Sin fecha', 'Sin fecha', 'gris']].filter(([est]) => est !== 'Sin fecha' || cuenta(est) > 0).map(([est, txt, c]) =>
      h('button', { class: 'num3 ' + c + (filtro === est ? ' activo' : ''), 'aria-pressed': String(filtro === est), onclick: () => { filtro = filtro === est ? '' : est; dibujar(); } }, h('b', {}, cuenta(est)), h('span', {}, txt))));
  };

  const dibujar = () => {
    pintarResumen();
    const pend = filtro ? todos.filter(e => e.estado === filtro) : todos;
    cuerpo.replaceChildren(h('div', { class: 'filtros' }, ...[['fecha', 'Por fecha'], ['animal', 'Por animal'], ['med', 'Por medicamento']].map(([k, t]) =>
      h('button', { class: 'chip-btn' + (vista === k ? ' activo' : ''), onclick: () => { vista = k; dibujar(); } }, t))));
    if (filtro) cuerpo.append(h('div', { class: 'aviso-filtro' }, h('span', {}, `Mostrando solo: ${NOMBRE_FILTRO[filtro]} (${pend.length})`), h('button', { class: 'chip-btn', onclick: () => { filtro = ''; dibujar(); } }, 'Quitar filtro ✕')));
    if (!pend.length) { cuerpo.append(vacio(filtro ? 'No hay aplicaciones en este estado.' : 'Aún no hay aplicaciones registradas.')); return; }
    if (vista === 'fecha') {
      const grupos = [['Vencidas', e => e.dias !== null && e.dias < 0], ['Esta semana', e => e.dias !== null && e.dias >= 0 && e.dias <= 7], ['Este mes', e => e.dias !== null && e.dias > 7 && e.dias <= 30], ['Más adelante', e => e.dias !== null && e.dias > 30], ['Sin fecha de repetición', e => e.dias === null]];
      for (const [titulo, f] of grupos) {
        const items = pend.filter(f).sort((a, b) => titulo === 'Sin fecha de repetición' ? (b.rec.fecha || '').localeCompare(a.rec.fecha || '') : a.dias - b.dias);
        if (!items.length) continue;
        const lista = items.map(e => fila(e));
        if (titulo === 'Más adelante' && !filtro) cuerpo.append(h('details', { class: 'grupo-san' }, h('summary', {}, h('span', { class: 'grupo-tit' }, `${titulo} (${items.length})`), h('small', {}, 'al día')), ...lista));
        else cuerpo.append(h('div', { class: 'tipo-tit' }, `${titulo} · ${items.length}`), ...lista);
      }
    } else if (vista === 'animal') {
      const porAn = new Map();
      for (const e of pend) { const k = String(e.rec.animal); if (!porAn.has(k)) porAn.set(k, []); porAn.get(k).push(e); }
      const filas = [...porAn.entries()].map(([arete, es]) => {
        es.sort((a, b) => orden(a) - orden(b));
        const v = es.filter(e => e.estado === 'Vencida').length, p = es.filter(e => e.estado === 'Próxima').length;
        return { arete, es, v, p, sig: es[0] };
      }).sort((a, b) => b.v - a.v || b.p - a.p || orden(a.sig) - orden(b.sig));
      cuerpo.append(...filas.map(({ arete, v, p, sig }) => filaLista({
        titulo: L.etiquetaAnimal(arete, animales),
        sub: sig.dias === null ? `Última: ${med(sig)} · ${L.fechaCorta(sig.rec.fecha)}` : v || p ? `Siguiente: ${med(sig)} · ${cuando(sig.dias)}` : `Próxima: ${med(sig)} · ${cuando(sig.dias)}`,
        derecha: v ? chip(`${v} vencida${v > 1 ? 's' : ''}`, 'rojo') : p ? chip(`${p} próxima${p > 1 ? 's' : ''}`, 'ambar') : sig.dias === null ? chip('Sin fecha', 'gris') : chip('Al día ✓', 'verde'),
        color: v ? COLOR.Vencida : p ? COLOR['Próxima'] : sig.dias === null ? COLOR['Sin fecha'] : COLOR['Al día'], onclick: () => ir('/animales/' + idDe(arete)) })));
    } else {
      const porMed = new Map();
      for (const e of pend) { const k = med(e); if (!porMed.has(k)) porMed.set(k, []); porMed.get(k).push(e); }
      const grupos = [...porMed.entries()].map(([m, es]) => ({ m, es: es.sort((a, b) => orden(a) - orden(b)), v: es.filter(e => e.estado === 'Vencida').length, p: es.filter(e => e.estado === 'Próxima').length }))
        .sort((a, b) => b.v - a.v || b.p - a.p);
      cuerpo.append(...grupos.map(g => h('details', { class: 'grupo-san', open: g.v > 0 ? true : null },
        h('summary', {}, h('div', { class: 'grupo-cab' }, h('span', { class: 'grupo-tit' }, g.m), h('small', {}, `${g.es.length} animales`)),
          h('div', { class: 'chips-res' }, g.v ? chip(`${g.v} vencida${g.v > 1 ? 's' : ''}`, 'rojo') : null, g.p ? chip(`${g.p} próxima${g.p > 1 ? 's' : ''}`, 'ambar') : null, !g.v && !g.p ? (g.es.every(e => e.dias === null) ? chip('Sin fecha', 'gris') : chip('Al día ✓', 'verde')) : null)),
        ...g.es.map(e => fila(e, true, false))))); 
      // en esta vista cada fila muestra "Última aplicación" bajo el animal
    }
  };
  dibujar();
  return pagina('Sanidad', {}, resumen, cuerpo, fab('Nueva aplicación', () => ir('/sanidad/nuevo')));
}

export async function sanidadForm(id, query = {}) {
  const nuevo = id === 'nuevo';
  const rec = nuevo ? null : await S.uno('sanidad', id);
  const seleccion = new Set(query.animal ? [query.animal] : []);
  let extra = null;
  if (nuevo) {
    const ops = await opcionesAnimal();
    const chips = h('div', { class: 'chips' });
    const dib = () => { chips.replaceChildren(...ops.map(o => h('button', { type: 'button', class: 'chip-btn' + (seleccion.has(o.v) ? ' activo' : ''), onclick: () => { seleccion.has(o.v) ? seleccion.delete(o.v) : seleccion.add(o.v); dib(); } }, o.t))); };
    dib();
    extra = tarjeta('¿A qué animales?', h('small', {}, 'Toca uno o varios. Se crea un registro por animal con los mismos datos.'),
      h('div', { class: 'chips-acciones' },
        h('button', { type: 'button', class: 'chip-btn', onclick: () => { ops.forEach(o => seleccion.add(o.v)); dib(); } }, 'Todos'),
        h('button', { type: 'button', class: 'chip-btn', onclick: () => { seleccion.clear(); dib(); } }, 'Ninguno')), chips);
  }
  const form = await formulario('sanidad', rec, {
    noRequeridos: nuevo ? ['animal'] : [], ocultar: nuevo ? ['animal'] : [],
    alGuardar: async r => {
      if (!nuevo) { await S.guardar('sanidad', r); aviso('Guardado'); return ir('/sanidad'); }
      const animales = new Set(seleccion); if (r.animal) animales.add(r.animal);
      if (!animales.size) { aviso('Elige al menos un animal', 3500); return; }
      const { animal, id: _i, ...comun } = r;
      await S.guardarVarios('sanidad', [...animales].map(a => ({ ...comun, animal: a })));
      aviso(animales.size > 1 ? `Guardado para ${animales.size} animales` : 'Guardado'); ir('/sanidad');
    },
    alEliminar: async () => { await S.borrar('sanidad', id); aviso('Registro eliminado'); ir('/sanidad'); },
    alCancelar: () => history.back(),
  });
  return pagina(nuevo ? 'Nueva aplicación' : 'Editar aplicación', { atras: '/sanidad' }, extra, form);
}
