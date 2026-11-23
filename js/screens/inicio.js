// Pantalla de inicio: balance entre socios, leche, alertas sanitarias, próximos partos.
import * as S from '../store.js';
import * as L from '../logic.js';
import { SOCIOS, COLOR_SOCIO, AVISO_SANIDAD_DIAS } from '../config.js';
import { h, pagina, tarjeta, chip, claseEstado, filaLista, ir, vacio } from '../ui.js';

export async function inicio() {
  const [gastos, animales, leche, sanidad, repro] = await Promise.all(['gastos', 'animales', 'leche', 'sanidad', 'reproduccion'].map(t => S.todos(t)));
  const b = L.balance(gastos);
  const lr = L.resumenLeche(leche);
  const alertas = L.alertasSanidad(L.estadosSanidad(sanidad, animales));
  const partos = L.proximosPartos(animales, repro);
  const activos = animales.filter(L.activo);
  const nombre = a => L.etiquetaAnimal(a, animales);

  const atajos = h('div', { class: 'atajos' },
    h('button', { class: 'btn primario', onclick: () => ir('/gastos/nuevo') }, '💵 Gasto'),
    h('button', { class: 'btn primario', onclick: () => ir('/leche') }, '🥛 Ordeño'),
    h('button', { class: 'btn primario', onclick: () => ir('/sanidad/nuevo') }, '💉 Sanidad'));

  const dinero = tarjeta('Inversión en la granja',
    h('div', { class: 'grande' }, L.dinero(b.total)),
    h('div', { class: 'socios' }, b.filas.map(f => h('div', { class: 'socio', style: `--c:${COLOR_SOCIO[f.socio]}` },
      h('span', { class: 'socio-nombre' }, f.socio), h('b', {}, L.dinero(f.pagado)),
      h('small', {}, b.total ? Math.round(f.pagado / b.total * 1000) / 10 + '% del total' : '')))),
    b.deuda ? h('div', { class: 'deuda' }, `${b.deuda.de} le debe ${L.dinero(b.deuda.monto)} a ${b.deuda.a}`) : h('div', { class: 'deuda ok' }, 'Están a mano'),
    b.sinSocio > 0 ? h('div', { class: 'error' }, `⚠ Hay ${L.dinero(b.sinSocio)} sin socio asignado`) : null);

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
      : vacio('Sin hembras gestantes con fecha de parto.'));

  const hato = tarjeta('Hato',
    h('div', { class: 'dos' },
      h('div', {}, h('div', { class: 'grande' }, activos.length), h('small', {}, 'animales activos')),
      h('div', {}, h('div', { class: 'grande' }, activos.filter(a => L.estadoRepro(a, repro).estado === 'Gestante').length), h('small', {}, 'gestantes'))),
    h('button', { class: 'btn', onclick: () => ir('/animales') }, 'Ver animales'));

  return pagina(null, {}, atajos, dinero, lecheT, alertasT, partosT, hato);
}
