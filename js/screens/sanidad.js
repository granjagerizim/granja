// Sanidad: lista con alertas, y formulario que permite aplicar a varios animales a la vez.
import * as S from '../store.js';
import * as L from '../logic.js';
import { h, pagina, filaLista, ir, vacio, fab, formulario, aviso, chip, claseEstado, opcionesAnimal, tarjeta } from '../ui.js';

export async function sanidad() {
  const [regs, animales] = await Promise.all([S.todos('sanidad'), S.todos('animales')]);
  const estados = L.estadosSanidad(regs, animales);
  let ver = estados.some(e => e.estado === 'Vencida' || e.estado === 'Próxima') ? 'alertas' : 'todas';
  const cuerpo = h('div');
  const orden = { Vencida: 0, 'Próxima': 1 };
  let fAn = '', fMed = '';
  const med = e => `${e.rec.tipo || ''}${e.rec.producto ? ' · ' + e.rec.producto : ''}`;
  const dibujar = () => {
    cuerpo.replaceChildren();
    const nAl = L.alertasSanidad(estados).length;
    cuerpo.append(h('div', { class: 'filtros' },
      h('button', { class: 'chip-btn' + (ver === 'alertas' ? ' activo' : ''), onclick: () => { ver = 'alertas'; dibujar(); } }, `Alertas (${nAl})`),
      h('button', { class: 'chip-btn' + (ver === 'todas' ? ' activo' : ''), onclick: () => { ver = 'todas'; dibujar(); } }, `Todas (${estados.length})`)));
    let lista = [...estados];
    if (ver === 'todas') {
      const meds = [...new Set(estados.map(med))].sort();
      const ans = animales.filter(a => !a.deleted).sort((x, y) => String(x.arete).localeCompare(String(y.arete), 'es', { numeric: true }));
      const selAn = h('select', { onchange: e => { fAn = e.target.value; dibujar(); } }, h('option', { value: '' }, 'Animal: todos'), ...ans.map(a => h('option', { value: String(a.arete) }, L.etiquetaAnimal(a.arete, animales))));
      const selMed = h('select', { onchange: e => { fMed = e.target.value; dibujar(); } }, h('option', { value: '' }, 'Medicamento: todos'), ...meds.map(m => h('option', { value: m }, m)));
      selAn.value = fAn; selMed.value = fMed;
      cuerpo.append(h('div', { class: 'dos' }, selAn, selMed));
      if (fAn) lista = lista.filter(e => String(e.rec.animal) === fAn);
      if (fMed) lista = lista.filter(e => med(e) === fMed);
      cuerpo.append(h('div', { class: 'resumen-linea' }, `Mostrando ${lista.length} de ${estados.length} aplicaciones`));
    }
    if (ver === 'alertas') lista = L.alertasSanidad(lista);
    else lista.sort((a, b) => (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9) || (b.rec.fecha || '').localeCompare(a.rec.fecha || ''));
    if (!lista.length) cuerpo.append(vacio(ver === 'alertas' ? 'Todo al día: no hay vacunas ni desparasitaciones vencidas o próximas.' : 'Aún no hay aplicaciones registradas.'));
    cuerpo.append(...lista.map(e => filaLista({
      titulo: L.etiquetaAnimal(e.rec.animal, animales),
      sub: `${e.rec.tipo || ''}${e.rec.producto ? ' · ' + e.rec.producto : ''} · ${L.fechaCorta(e.rec.fecha)}`,
      derecha: e.estado ? chip(e.estado, claseEstado(e.estado)) : null,
      subDerecha: e.proxima ? `próx. ${L.fechaCorta(e.proxima)}` : null,
      onclick: () => ir('/sanidad/' + e.rec.id) })));
  };
  dibujar();
  return pagina('Sanidad', {}, cuerpo, fab('Nueva aplicación', () => ir('/sanidad/nuevo')));
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
