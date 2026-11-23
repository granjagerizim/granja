// Leche: captura rápida del ordeño del día (una fila por vaca) e historial.
import * as S from '../store.js';
import * as L from '../logic.js';
import { h, pagina, tarjeta, filaLista, ir, aviso, formulario } from '../ui.js';

export async function leche() {
  const [animales, regs] = await Promise.all([S.todos('animales'), S.todos('leche')]);
  let fecha = L.hoy();
  const vacas = animales.filter(a => L.activo(a) && a.categoria === 'Vaca').sort((a, b) => String(a.arete).localeCompare(String(b.arete), 'es', { numeric: true }));
  const cuerpo = h('div');

  const dibujar = () => {
    cuerpo.replaceChildren();
    const delDia = new Map(regs.filter(r => r.fecha === fecha).map(r => [String(r.animal), r]));
    const entradas = new Map();
    const total = h('b', {}, '0.0 L');
    const recalcular = () => { total.textContent = [...entradas.values()].reduce((s, [m, t]) => s + L.num(m.value) + L.num(t.value), 0).toFixed(1) + ' L'; };

    cuerpo.append(tarjeta(null, h('label', { class: 'campo' }, h('span', {}, 'Fecha del ordeño'),
      h('input', { type: 'date', value: fecha, onchange: e => { if (e.target.value) { fecha = e.target.value; dibujar(); } } }))));

    if (!vacas.length) cuerpo.append(h('div', { class: 'vacio' }, 'No hay vacas activas. Aquí aparecen los animales de categoría "Vaca" (las novillas pasan a Vaca después de su primer parto). Revisa la sección Animales.'));
    else {
      cuerpo.append(h('div', { class: 'tabla-ordeno' },
        h('div', { class: 'ord-fila ord-cab' }, h('span', {}, 'Vaca'), h('span', {}, 'Mañana (L)'), h('span', {}, 'Tarde (L)')),
        vacas.map(v => {
          const r = delDia.get(String(v.arete));
          const m = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', value: r?.manana ?? '', placeholder: '0', oninput: recalcular });
          const t = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', value: r?.tarde ?? '', placeholder: '0', oninput: recalcular });
          entradas.set(String(v.arete), [m, t]);
          return h('div', { class: 'ord-fila' }, h('span', { class: 'ord-nombre' }, L.etiquetaAnimal(v.arete, animales)), m, t);
        })));
      recalcular();
      cuerpo.append(h('div', { class: 'ord-total' }, h('span', {}, 'Total del día'), total),
        h('button', { class: 'btn primario ancho', onclick: async () => {
          const aGuardar = [];
          for (const [arete, [m, t]] of entradas) {
            const vm = m.value.trim().replace(',', '.'), vt = t.value.trim().replace(',', '.');
            if ((vm !== '' && !isFinite(Number(vm))) || (vt !== '' && !isFinite(Number(vt)))) { aviso(`Revisa los litros de ${arete}: deben ser números`, 3500); return; }
            const previo = delDia.get(arete);
            if (vm === '' && vt === '') { if (previo) aGuardar.push({ ...previo, deleted: 1 }); continue; }
            if (previo && String(previo.manana ?? '') === vm && String(previo.tarde ?? '') === vt) continue;   // sin cambios
            aGuardar.push({ ...(previo || {}), id: previo?.id || `l_${fecha}_${arete}`, fecha, animal: arete, manana: vm === '' ? '' : Number(vm), tarde: vt === '' ? '' : Number(vt) });
          }
          if (!aGuardar.length) { aviso('No hay cambios que guardar'); return; }
          await S.guardarVarios('leche', aGuardar);
          aviso(`Ordeño guardado (${aGuardar.length} vaca${aGuardar.length > 1 ? 's' : ''})`);
          const nuevos = await S.todos('leche'); regs.length = 0; regs.push(...nuevos); dibujar();
        } }, 'Guardar ordeño'));
    }

    const dias = L.litrosPorDia(regs, 14).reverse().filter(d => d.litros > 0);
    cuerpo.append(tarjeta('Últimos días', dias.length
      ? dias.map(d => filaLista({ titulo: L.fechaCorta(d.fecha), derecha: `${d.litros.toFixed(1)} L`, onclick: () => { fecha = d.fecha; dibujar(); window.scrollTo(0, 0); } }))
      : h('div', { class: 'vacio' }, 'Aún no hay ordeños en los últimos 14 días.')));
  };
  dibujar();
  return pagina('Leche', {}, cuerpo);
}

export async function lecheForm(id) {
  const rec = await S.uno('leche', id);
  const form = await formulario('leche', rec, {
    alGuardar: async r => { await S.guardar('leche', r); aviso('Ordeño guardado'); ir('/leche'); },
    alEliminar: async () => { await S.borrar('leche', id); aviso('Ordeño eliminado'); ir('/leche'); },
    alCancelar: () => history.back(),
  });
  return pagina('Editar ordeño', { atras: '/leche' }, form);
}
