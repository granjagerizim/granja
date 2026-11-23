// Piezas de interfaz reutilizables: crear elementos, avisos, formularios generados desde config.js.
import { TABLAS } from './config.js';
import * as S from './store.js';
import { activo, etiquetaAnimal, hoy, num } from './logic.js';

// h('div', {class:'x', onclick: fn}, 'texto', otroElemento)
export function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat(Infinity)) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

export function aviso(texto, ms = 2600) {
  let c = document.getElementById('avisos');
  if (!c) { c = h('div', { id: 'avisos' }); document.body.append(c); }
  const a = h('div', { class: 'aviso' }, texto); c.append(a);
  setTimeout(() => a.remove(), ms);
}
export const confirmar = texto => Promise.resolve(window.confirm(texto));
export const ir = ruta => { location.hash = '#' + ruta; };

// Opciones de la lista de animales (activos, o todos si se pide)
export async function opcionesAnimal({ soloHembras = false, incluir = null } = {}) {
  const an = (await S.todos('animales')).filter(a => (activo(a) || String(a.arete) === String(incluir)) && (!soloHembras || a.sexo === 'Hembra'));
  an.sort((a, b) => String(a.arete).localeCompare(String(b.arete), 'es', { numeric: true }));
  return an.map(a => ({ v: String(a.arete), t: etiquetaAnimal(a.arete, an) }));
}

// ---------- formulario genérico ----------
// Crea el formulario de una tabla a partir de TABLAS[tabla].campos.
export async function formulario(tabla, rec, { alGuardar, alEliminar, alCancelar, valoresIniciales = {}, noRequeridos = [], ocultar = [] } = {}) {
  const def = TABLAS[tabla];
  const nuevo = !rec || !rec.id;
  const datos = { ...valoresIniciales, ...(rec || {}) };
  const controles = {};
  const filas = {};
  const hembras = await opcionesAnimal({ soloHembras: true, incluir: datos.animal });
  const todas = await opcionesAnimal({ incluir: datos.animal });

  const otros = {};                                   // cuadros de texto de los campos "libre" (opción "Otro…")
  const existentes = await S.todos(tabla);
  const valorDe = c => {
    const v = c.libre && controles[c.k].value === '__otro__' ? otros[c.k].value : controles[c.k].value;
    return c.tipo === 'numero' ? v.replace(',', '.').trim() : v.trim();
  };
  const leer = () => Object.fromEntries(def.campos.map(c => [c.k, valorDe(c)]));
  const actualizarVisibles = () => {
    const r = leer();
    for (const c of def.campos) if (c.visibleSi) filas[c.k].classList.toggle('oculto', !c.visibleSi(r));
  };

  for (const c of def.campos) {
    let ini = datos[c.k];
    if ((ini === undefined || ini === '') && nuevo && c.defecto) ini = c.defecto === 'hoy' ? hoy() : c.defecto;
    ini = ini ?? '';
    let ctl;
    if (c.tipo === 'lista' || c.tipo === 'animal') {
      const ops = c.tipo === 'animal' ? (c.soloHembras ? hembras : todas) : (c.opciones || []).map(o => ({ v: o, t: o }));
      const lista = [...ops];
      if (c.libre) for (const e of existentes) { const v = String(e[c.k] || '').trim(); if (v && !e.deleted && !lista.some(o => o.v === v)) lista.push({ v, t: v }); }   // valores ya usados antes
      if (ini !== '' && !lista.some(o => o.v === String(ini))) lista.unshift({ v: String(ini), t: String(ini) });   // valor ya guardado que no está en la lista
      ctl = h('select', {}, h('option', { value: '' }, c.req ? 'Elige…' : '—'), lista.map(o => h('option', { value: o.v }, o.t)), c.libre ? h('option', { value: '__otro__' }, 'Otro (escribir)…') : null);
      ctl.value = String(ini);
      if (c.libre) {
        otros[c.k] = h('input', { type: 'text', class: 'oculto', placeholder: 'Escribe el nuevo valor', autocomplete: 'off' });
        otros[c.k].addEventListener('input', actualizarVisibles);
        ctl.addEventListener('change', () => { const es = ctl.value === '__otro__'; otros[c.k].classList.toggle('oculto', !es); if (es) otros[c.k].focus(); });
      }
    } else if (c.tipo === 'notas') ctl = h('textarea', { rows: 2 }, String(ini));
    else if (c.tipo === 'fecha') ctl = h('input', { type: 'date', value: ini });
    else if (c.tipo === 'numero') ctl = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', value: ini });
    else ctl = h('input', { type: 'text', autocomplete: 'off', value: ini });
    ctl.addEventListener('input', actualizarVisibles);
    controles[c.k] = ctl;
    filas[c.k] = h('label', { class: 'campo' + (ocultar.includes(c.k) ? ' oculto' : '') }, h('span', {}, c.label, c.req ? ' *' : ''), ctl, otros[c.k] || null, c.ayuda ? h('small', {}, c.ayuda) : null);
  }

  const error = h('div', { class: 'error oculto' });
  const form = h('form', { class: 'formulario', onsubmit: async ev => {
    ev.preventDefault();
    const r = leer();
    const falta = def.campos.find(c => c.req && !noRequeridos.includes(c.k) && (!c.visibleSi || c.visibleSi(r)) && !r[c.k]);
    if (falta) { error.textContent = `Falta: ${falta.label}`; error.classList.remove('oculto'); controles[falta.k].focus(); return; }
    const mal = def.campos.find(c => c.tipo === 'numero' && r[c.k] !== '' && !isFinite(Number(r[c.k])));
    if (mal) { error.textContent = `"${mal.label}" debe ser un número`; error.classList.remove('oculto'); controles[mal.k].focus(); return; }
    const salida = { ...(rec || {}) };
    for (const c of def.campos) {
      if (c.visibleSi && !c.visibleSi(r)) { delete salida[c.k]; continue; }
      salida[c.k] = c.tipo === 'numero' && r[c.k] !== '' ? Number(r[c.k]) : r[c.k];
    }
    await alGuardar(salida);
  } },
  def.campos.map(c => filas[c.k]),
  error,
  h('div', { class: 'botones' },
    h('button', { type: 'submit', class: 'btn primario' }, 'Guardar'),
    h('button', { type: 'button', class: 'btn', onclick: () => alCancelar && alCancelar() }, 'Cancelar')),
  !nuevo && alEliminar ? h('button', { type: 'button', class: 'btn peligro', onclick: async () => { if (await confirmar('¿Eliminar este registro?')) alEliminar(); } }, 'Eliminar') : null);
  actualizarVisibles();
  return form;
}

// ---------- pequeños componentes ----------
export const tarjeta = (titulo, ...contenido) => h('section', { class: 'tarjeta' }, titulo ? h('h2', {}, titulo) : null, ...contenido);
export const chip = (texto, clase = '') => h('span', { class: 'chip ' + clase }, texto);
export const claseEstado = e => ({ Vencida: 'rojo', 'Próxima': 'ambar', 'Al día': 'verde', Gestante: 'verde', Atrasado: 'rojo', Próximo: 'ambar' }[e] || 'gris');
export function filaLista({ titulo, sub, derecha, subDerecha, color, onclick, imagen }) {
  return h('button', { class: 'fila', onclick, style: color ? `--c:${color}` : null },
    imagen ? h('img', { class: 'avatar', src: imagen, alt: '' }) : null,
    h('div', { class: 'fila-izq' }, h('div', { class: 'fila-titulo' }, titulo), sub ? h('div', { class: 'fila-sub' }, sub) : null),
    h('div', { class: 'fila-der' }, derecha ? h('div', { class: 'fila-monto' }, derecha) : null, subDerecha ? h('div', { class: 'fila-sub' }, subDerecha) : null));
}
export const vacio = texto => h('div', { class: 'vacio' }, texto);
export function pagina(titulo, { atras = null, acciones = null } = {}, ...contenido) {
  return h('div', { class: 'pagina' }, titulo ? h('div', { class: 'barra-titulo' }, atras ? h('button', { class: 'atras', onclick: () => (atras === true ? history.back() : ir(atras)) }, '‹') : null, h('h1', {}, titulo), acciones) : null, ...contenido);
}
export const fab = (texto, onclick) => h('button', { class: 'fab', onclick, 'aria-label': texto }, '+');
export { num };
