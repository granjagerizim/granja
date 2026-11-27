// Sanidad: resumen (vencidas / próximas / al día) con tres vistas de lo pendiente, y formulario que permite aplicar a varios animales a la vez.
import * as S from '../store.js';
import * as L from '../logic.js';
import { REPITE, AVISO_SANIDAD_DIAS } from '../config.js';
import { h, pagina, filaLista, ir, vacio, fab, formulario, aviso, chip, claseEstado, opcionesAnimal, tarjeta } from '../ui.js';

let vista = 'fecha';   // 'fecha' | 'animal' | 'med' | 'recientes'
let filtro = '';       // '', 'Vencida', 'Próxima', 'Al día' o 'Por completar' (se activa tocando los cuadros de arriba)
let cuantas = 30;      // filas visibles en "Recientes"
const COLOR = { Vencida: '#b3261e', 'Próxima': '#c98a00', 'Al día': '#5aa469', 'Por completar': '#9aa39a' };
const NOMBRE_FILTRO = { Vencida: 'vencidas', 'Próxima': 'próximas', 'Al día': 'al día', 'Por completar': 'por completar' };
const orden = e => (e.dias === null || e.dias === undefined ? 1e9 : e.dias);

// Texto relativo: "venció hace 12 días", "en 5 días", "en 3 meses"
function cuando(d) {
  const n = Math.abs(d), t = n >= 60 ? `${Math.round(n / 30)} meses` : n === 1 ? '1 día' : `${n} días`;
  return d < 0 ? `venció hace ${t}` : d === 0 ? 'toca hoy' : `en ${t}`;
}

export async function sanidad() {
  const [regs, animales] = await Promise.all([S.todos('sanidad'), S.todos('animales')]);
  const idDe = arete => (animales.find(a => String(a.arete) === String(arete)) || {}).id;
  const activoAn = arete => { const a = animales.find(x => String(x.arete) === String(arete)); return !a || L.activo(a); };
  const med = e => `${e.rec.tipo || ''}${e.rec.producto ? ' · ' + e.rec.producto : ''}`;
  // Estado de cada registro: los que tienen fecha de repetición (Vencida / Próxima / Al día), Renovada, Baja;
  // sin repetición: "Único" si se marcó "No, es único", y "Por completar" si nunca se respondió (registros antiguos).
  const todosReg = L.estadosSanidad(regs, animales).map(e => ({ ...e, estado: e.estado || (e.rec.repite === REPITE.no ? 'Único' : 'Por completar') }));
  const conFecha = todosReg.filter(e => e.estado === 'Vencida' || e.estado === 'Próxima' || e.estado === 'Al día');
  const ultimos = new Map();   // por completar: el más reciente de cada animal + medicamento
  for (const e of todosReg.filter(x => x.estado === 'Por completar' && activoAn(x.rec.animal))) { const k = String(e.rec.animal) + '|' + L.norm(med(e)); const a = ultimos.get(k); if (!a || (e.rec.fecha || '') > (a.rec.fecha || '')) ultimos.set(k, e); }
  const pendientes = [...conFecha, ...[...ultimos.values()].map(e => ({ ...e, dias: null }))];
  const cuenta = est => pendientes.filter(e => e.estado === est).length;
  const enc = encodeURIComponent;

  // Fila de un registro; al tocarla se despliegan las acciones
  const filaBase = (e, conAnimal, conMed, soloFecha, onclick) => filaLista({
    titulo: conAnimal ? L.etiquetaAnimal(e.rec.animal, animales) : med(e), sub: conMed && conAnimal ? med(e) : `Última aplicación: ${L.fechaCorta(e.rec.fecha)}`,
    derecha: chip(e.estado, claseEstado(e.estado)), subDerecha: soloFecha || e.dias === null ? `aplicada el ${L.fechaCorta(e.rec.fecha)}` : cuando(e.dias), color: COLOR[e.estado], onclick });
  const fila = (e, conAnimal = true, conMed = true, soloFecha = false) => {
    const r = e.rec;
    const editar = () => ir('/sanidad/' + r.id);
    const ficha = () => ir('/animales/' + idDe(r.animal) + '?de=sanidad');
    const periodica = Number(r.repetirDias) > 0;
    const nueva = () => ir(`/sanidad/nuevo?animal=${enc(r.animal)}&tipo=${enc(r.tipo || '')}&producto=${enc(r.producto || '')}&dosis=${enc(r.dosis || '')}&aplico=${enc(r.aplico || '')}` + (periodica ? `&repite=${enc(REPITE.si)}&repetirDias=${enc(r.repetirDias)}` : ''));
    const completar = e.estado === 'Por completar';
    const panel = h('div', { class: 'panel-acc', hidden: true },
      completar ? h('button', { class: 'btn primario', onclick: editar }, 'Completar datos') : h('button', { class: 'btn primario', onclick: nueva }, 'Nueva dosis'),
      completar ? h('button', { class: 'btn', onclick: nueva }, 'Nueva dosis') : h('button', { class: 'btn', onclick: editar }, 'Editar registro'),
      h('button', { class: 'btn', onclick: ficha }, 'Ver ficha'));
    return h('div', { class: 'acc' }, filaBase(e, conAnimal, conMed, soloFecha, () => { panel.hidden = !panel.hidden; }), panel);
  };

  const cuerpo = h('div', { class: 'pagina-int' });
  const resumen = h('div', { class: 'resumen3' });
  const pintarResumen = () => {
    resumen.classList.toggle('filtrando', !!filtro);
    resumen.classList.toggle('cuatro', cuenta('Por completar') > 0);
    resumen.replaceChildren(...[['Vencida', 'Vencidas', 'rojo'], ['Próxima', 'Próximas', 'ambar'], ['Al día', 'Al día', 'verde'], ['Por completar', 'Por completar', 'gris']].filter(([est]) => est !== 'Por completar' || cuenta(est) > 0).map(([est, txt, c]) =>
      h('button', { class: 'num3 ' + c + (filtro === est ? ' activo' : ''), 'aria-pressed': String(filtro === est), onclick: () => { filtro = filtro === est ? '' : est; dibujar(); } }, h('b', {}, cuenta(est)), h('span', {}, txt))));
  };

  const dibujar = () => {
    pintarResumen();
    const base = vista === 'recientes' ? todosReg : pendientes;
    const pend = filtro ? base.filter(e => e.estado === filtro) : base;
    cuerpo.replaceChildren(h('div', { class: 'filtros' }, ...[['fecha', 'Por fecha'], ['animal', 'Por animal'], ['med', 'Medicamento'], ['recientes', 'Recientes']].map(([k, t]) =>
      h('button', { class: 'chip-btn' + (vista === k ? ' activo' : ''), onclick: () => { vista = k; dibujar(); } }, t))));
    if (filtro) cuerpo.append(h('div', { class: 'aviso-filtro' }, h('span', {}, `Mostrando solo: ${NOMBRE_FILTRO[filtro]} (${pend.length})`), h('button', { class: 'chip-btn', onclick: () => { filtro = ''; dibujar(); } }, 'Quitar filtro ✕')));
    if (!pend.length) { cuerpo.append(vacio(filtro ? 'No hay aplicaciones en este estado.' : vista === 'recientes' ? 'Aún no hay aplicaciones registradas.' : 'No hay nada pendiente. Las aplicaciones únicas están en Recientes y en la ficha de cada animal.')); return; }
    if (vista === 'fecha') {
      const grupos = [['Vencidas', e => e.dias !== null && e.dias < 0], ['Esta semana', e => e.dias !== null && e.dias >= 0 && e.dias <= 7], ['Este mes', e => e.dias !== null && e.dias > 7 && e.dias <= 30], ['Más adelante', e => e.dias !== null && e.dias > 30], ['Por completar', e => e.dias === null]];
      for (const [titulo, f] of grupos) {
        const items = pend.filter(f).sort((a, b) => titulo === 'Por completar' ? (b.rec.fecha || '').localeCompare(a.rec.fecha || '') : a.dias - b.dias);
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
        sub: sig.dias === null ? `Por completar: ${med(sig)} · ${L.fechaCorta(sig.rec.fecha)}` : v || p ? `Siguiente: ${med(sig)} · ${cuando(sig.dias)}` : `Próxima: ${med(sig)} · ${cuando(sig.dias)}`,
        derecha: v ? chip(`${v} vencida${v > 1 ? 's' : ''}`, 'rojo') : p ? chip(`${p} próxima${p > 1 ? 's' : ''}`, 'ambar') : sig.dias === null ? chip('Por completar', 'gris') : chip('Al día ✓', 'verde'),
        color: v ? COLOR.Vencida : p ? COLOR['Próxima'] : sig.dias === null ? COLOR['Por completar'] : COLOR['Al día'], onclick: () => ir('/animales/' + idDe(arete) + '?de=sanidad') })));
    } else if (vista === 'med') {
      const porMed = new Map();
      for (const e of pend) { const k = med(e); if (!porMed.has(k)) porMed.set(k, []); porMed.get(k).push(e); }
      const grupos = [...porMed.entries()].map(([m, es]) => ({ m, es: es.sort((a, b) => orden(a) - orden(b)), v: es.filter(e => e.estado === 'Vencida').length, p: es.filter(e => e.estado === 'Próxima').length }))
        .sort((a, b) => b.v - a.v || b.p - a.p);
      cuerpo.append(...grupos.map(g => h('details', { class: 'grupo-san', open: g.v > 0 ? true : null },
        h('summary', {}, h('div', { class: 'grupo-cab' }, h('span', { class: 'grupo-tit' }, g.m), h('small', {}, `${g.es.length} animales`)),
          h('div', { class: 'chips-res' }, g.v ? chip(`${g.v} vencida${g.v > 1 ? 's' : ''}`, 'rojo') : null, g.p ? chip(`${g.p} próxima${g.p > 1 ? 's' : ''}`, 'ambar') : null, !g.v && !g.p ? (g.es.every(e => e.dias === null) ? chip('Por completar', 'gris') : chip('Al día ✓', 'verde')) : null)),
        ...g.es.map(e => fila(e, true, false)))));
    } else {
      // Recientes: las últimas aplicaciones de cualquier tipo, de la más nueva a la más antigua
      const lista = [...pend].sort((a, b) => (b.rec.fecha || '').localeCompare(a.rec.fecha || '') || String(b.rec.id).localeCompare(String(a.rec.id)));
      cuerpo.append(...lista.slice(0, cuantas).map(e => fila(e, true, true, true)));
      if (lista.length > cuantas) cuerpo.append(h('button', { class: 'btn', onclick: () => { cuantas += 30; dibujar(); } }, `Ver más (${lista.length - cuantas} restantes)`));
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
  if (!nuevo && rec) {
    const an = (await S.todos('animales')).find(a => String(a.arete) === String(rec.animal));
    if (an) extra = tarjeta(null, h('button', { type: 'button', class: 'btn', onclick: () => ir('/animales/' + an.id + '?de=sanidad') }, 'Ver ficha de ' + (an.nombre || 'este animal')));
  }
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
    valoresIniciales: nuevo ? Object.fromEntries(['tipo', 'producto', 'dosis', 'aplico', 'repite', 'repetirDias'].filter(k => query[k]).map(k => [k, query[k]]))
      : (rec && !rec.repite && Number(rec.repetirDias) > 0 ? { repite: REPITE.si } : {}),   // registros antiguos con días de repetición
    vistaPrevia: { repetirDias: r => {
      const n = Number(String(r.repetirDias).replace(',', '.'));
      if (!L.esFecha(r.fecha) || !(n > 0)) return null;
      const prox = L.sumarDias(r.fecha, n), d = L.diasEntre(L.hoy(), prox);
      const estado = d < 0 ? 'Vencida' : d <= AVISO_SANIDAD_DIAS ? 'Próxima' : 'Al día';
      const cuandoT = d < 0 ? `venció hace ${-d === 1 ? '1 día' : -d + ' días'}` : d === 0 ? 'toca hoy' : `en ${d === 1 ? '1 día' : d + ' días'}`;
      return { texto: `Próxima dosis: ${L.fechaCorta(prox)} (${cuandoT}) · quedará ${estado}` + (d < 0 ? '. Ojo: los días se cuentan desde la fecha de aplicación, no desde hoy.' : ''), clase: d < 0 ? 'rojo' : d <= AVISO_SANIDAD_DIAS ? 'ambar' : 'verde' };
    } },
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
