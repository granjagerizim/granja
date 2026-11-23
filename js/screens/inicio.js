// Pantalla de inicio: balance entre socios, leche, alertas sanitarias, próximos partos.
import * as S from '../store.js';
import * as L from '../logic.js';
import { AVISO_SANIDAD_DIAS } from '../config.js';
import { h, pagina, tarjeta, chip, claseEstado, filaLista, ir, vacio } from '../ui.js';

export async function inicio() {
  const [animales, leche, sanidad, repro] = await Promise.all(['animales', 'leche', 'sanidad', 'reproduccion'].map(t => S.todos(t)));
  const lr = L.resumenLeche(leche);
  const alertas = L.alertasSanidad(L.estadosSanidad(sanidad, animales));
  const partos = L.proximosPartos(animales, repro);
  const activos = animales.filter(L.activo);
  const nombre = a => L.etiquetaAnimal(a, animales);

  const modulo = (icono, texto, ruta) => h('button', { class: 'modulo', onclick: () => ir(ruta) }, h('span', { class: 'modulo-ico' }, icono), h('span', {}, texto));
  const modulos = h('div', { class: 'modulos' },
    modulo('💵', 'Gastos', '/gastos'), modulo('💰', 'Ingresos', '/ingresos'), modulo('🥛', 'Leche', '/leche'),
    modulo('💉', 'Sanidad', '/sanidad'), modulo('🐄', 'Animales', '/animales'), modulo('🐮', 'Reproducción', '/reproduccion'));

  const lecheT = tarjeta('Leche',
    lr.ultimoDia
      ? [h('div', { class: 'dos' },
          h('div', {}, h('div', { class: 'grande' }, `${lr.litrosUltimo.toFixed(1)} L`), h('small', {}, `Ordeño del ${L.fechaCorta(lr.ultimoDia)}`)),
          h('div', {}, h('div', { class: 'grande' }, `${lr.promedio.toFixed(1)} L`), h('small', {}, `Promedio diario (${lr.ventana} d)`))),
         lr.porVaca.slice(0, 5).map(v => h('div', { class: 'mini' }, h('span', {}, nombre(v.animal)), h('b', {}, `${v.litros.toFixed(1)} L`))),
         h('small', {}, `Total 30 días: ${lr.total30.toFixed(1)} L`)]
      : vacio('Aún no hay ordeños registrados.'));

  const alertasT = tarjeta(`Alertas sanitarias${alertas.length ? ` (${alertas.length})` : ''}`,
    alertas.length
      ? alertas.slice(0, 6).map(a => filaLista({
        titulo: nombre(a.rec.animal), sub: `${a.rec.tipo}${a.rec.producto ? ' · ' + a.rec.producto : ''}`,
        derecha: chip(a.estado, claseEstado(a.estado)), subDerecha: a.dias < 0 ? `hace ${-a.dias} d` : `en ${a.dias} d`,
        onclick: () => ir('/sanidad/' + a.rec.id) }))
      : vacio(`Sin vacunas ni desparasitaciones vencidas o próximas (${AVISO_SANIDAD_DIAS} días).`));

  const partosT = tarjeta('Próximos partos',
    partos.length
      ? partos.slice(0, 5).map(p => filaLista({
        titulo: nombre(p.animal.arete), sub: `Parto probable ${L.fechaCorta(p.fecha)}`,
        derecha: chip(p.dias < 0 ? 'Atrasado' : p.dias <= 30 ? 'En ' + p.dias + ' d' : 'En ' + p.dias + ' d', p.dias < 0 ? 'rojo' : p.dias <= 30 ? 'ambar' : 'gris'),
        onclick: () => ir('/animales/' + p.animal.id) }))
      : vacio('Sin hembras preñadas con fecha de parto.'));

  const hato = tarjeta('Ganado',
    h('div', { class: 'dos' },
      h('div', {}, h('div', { class: 'grande' }, activos.length), h('small', {}, 'animales activos')),
      h('div', {}, h('div', { class: 'grande' }, activos.filter(a => L.estadoRepro(a, repro).estado === 'Preñada').length), h('small', {}, 'preñadas'))),
    h('button', { class: 'btn', onclick: () => ir('/animales') }, 'Ver animales'));

  return pagina(null, {}, modulos, lecheT, alertasT, partosT, hato);
}
