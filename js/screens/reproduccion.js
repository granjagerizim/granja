// Reproducción: lista de eventos (celo, monta, preñez, partos…) y formulario.
import * as S from '../store.js';
import * as L from '../logic.js';
import { h, pagina, filaLista, ir, vacio, fab, formulario, aviso, chip } from '../ui.js';

const claseEvento = { Parto: 'verde', Aborto: 'rojo', 'Preñez confirmada': 'verde', 'Preñez negativa': 'ambar' };

export async function reproduccion() {
  const [evs, an] = await Promise.all([S.todos('reproduccion'), S.todos('animales')]);
  const lista = [...evs].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.updatedAt - a.updatedAt));
  const partos = evs.filter(e => e.evento === 'Parto');
  const resumen = h('div', { class: 'resumen-linea' },
    `${partos.length} partos · ${evs.filter(e => e.evento === 'Monta' || e.evento === 'Inseminación').length} servicios · ${evs.filter(e => e.evento === 'Aborto').length} abortos`);
  return pagina('Reproducción', { atras: '/mas' }, resumen,
    lista.length ? lista.map(e => filaLista({
      titulo: L.etiquetaAnimal(e.animal, an), sub: [L.fechaCorta(e.fecha), e.toro, e.cria ? 'cría ' + e.cria : ''].filter(Boolean).join(' · '),
      derecha: chip(e.evento, claseEvento[e.evento] || 'gris'), onclick: () => ir('/reproduccion/' + e.id) })) : vacio('Aún no hay eventos registrados.'),
    fab('Nuevo evento', () => ir('/reproduccion/nuevo')));
}

export async function reproduccionForm(id, query = {}) {
  const rec = id === 'nuevo' ? null : await S.uno('reproduccion', id);
  const form = await formulario('reproduccion', rec, {
    valoresIniciales: query.animal ? { animal: query.animal } : {},
    alGuardar: async r => { await S.guardar('reproduccion', r); aviso('Evento guardado'); ir('/reproduccion'); },
    alEliminar: async () => { await S.borrar('reproduccion', id); aviso('Evento eliminado'); ir('/reproduccion'); },
    alCancelar: () => history.back(),
  });
  return pagina(rec ? 'Editar evento' : 'Nuevo evento', { atras: '/reproduccion' }, form);
}
