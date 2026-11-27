// Arranque de la app: navegación por rutas (#/gastos, #/leche…), barra de estado de sincronización, service worker.
import * as S from './store.js';
import * as Y from './sync.js';
import { h, aviso, ir } from './ui.js';
import { inicio } from './screens/inicio.js';
import { gastos, gastoForm } from './screens/gastos.js';
import { leche, lecheForm } from './screens/leche.js';
import { sanidad, sanidadForm } from './screens/sanidad.js';
import { animales, animalFicha, animalForm, animalSanidad } from './screens/animales.js';
import { reproduccion, reproduccionForm } from './screens/reproduccion.js';
import { ingresos, ingresoForm } from './screens/ingresos.js';
import { fotoVista } from './screens/fotos.js';
import { APP } from './config.js';
import { mas, ajustes } from './screens/ajustes.js';
import { ayuda } from './screens/ayuda.js';
import * as L from './logic.js';

// Cada ruta: [patrón, función(parámetros, query)] y a qué pestaña de abajo pertenece
const RUTAS = [
  [/^\/$/, () => inicio(), 'inicio'],
  [/^\/gastos$/, () => gastos(), 'mas'],
  [/^\/gastos\/([^/]+)$/, p => gastoForm(p[0]), 'mas'],
  [/^\/ingresos$/, () => ingresos(), 'mas'],
  [/^\/ingresos\/([^/]+)$/, p => ingresoForm(p[0]), 'mas'],
  [/^\/leche$/, () => leche(), 'leche'],
  [/^\/leche\/([^/]+)$/, p => lecheForm(p[0]), 'leche'],
  [/^\/sanidad$/, () => sanidad(), 'sanidad'],
  [/^\/sanidad\/([^/]+)$/, (p, q) => sanidadForm(p[0], q), 'sanidad'],
  [/^\/animales$/, () => animales(), 'animales'],
  [/^\/animales\/nuevo$/, () => animalForm('nuevo'), 'animales'],
  [/^\/animales\/([^/]+)\/editar$/, p => animalForm(p[0]), 'animales'],
  [/^\/animales\/([^/]+)\/sanidad$/, p => animalSanidad(p[0]), 'animales'],
  [/^\/animales\/([^/]+)$/, p => animalFicha(p[0]), 'animales'],
  [/^\/fotos\/([^/]+)$/, p => fotoVista(p[0]), 'animales'],
  [/^\/reproduccion$/, () => reproduccion(), 'mas'],
  [/^\/reproduccion\/([^/]+)$/, (p, q) => reproduccionForm(p[0], q), 'mas'],
  [/^\/mas$/, () => mas(), 'mas'],
  [/^\/ajustes$/, () => ajustes(), 'mas'],
  [/^\/ayuda$/, () => ayuda(), 'mas'],
];
const NAV = [['inicio', '🏠', 'Inicio', '/'], ['animales', '🐄', 'Animales', '/animales'], ['leche', '🥛', 'Leche', '/leche'], ['sanidad', '💉', 'Sanidad', '/sanidad'], ['mas', '☰', 'Más', '/mas']];

const main = document.getElementById('main');
const nav = document.getElementById('nav');
const estadoEl = document.getElementById('estado');
let versionPintada = 0;

// Nombre de la granja (editable en Ajustes; se comparte entre los celulares)
async function pintarNombre() {
  let nombre = APP.nombre;
  try { const a = await S.uno('ajustes', 'granja'); if (a && !a.deleted && a.nombre) nombre = a.nombre; } catch { /* usa el nombre por defecto */ }
  document.querySelector('.marca').textContent = '🐄 ' + nombre;
  document.title = nombre;
}

// Número rojo en la pestaña Sanidad: vacunas vencidas o próximas
async function pintarInsignia() {
  try {
    const [san, an] = await Promise.all([S.todos('sanidad'), S.todos('animales')]);
    const n = L.alertasSanidad(L.estadosSanidad(san, an)).length;
    const btn = nav.querySelector('[data-k="sanidad"]');
    let b = btn.querySelector('.insignia');
    if (!n) { b && b.remove(); return; }
    if (!b) { b = h('span', { class: 'insignia' }); btn.append(b); }
    b.textContent = n > 99 ? '99+' : String(n);
  } catch { /* sin número si falla */ }
}

async function configDesdeEnlace(query) {
  if (!query.cfg) return false;
  try {
    const { url, clave } = JSON.parse(decodeURIComponent(atob(query.cfg)));
    await S.setMeta('url', url); await S.setMeta('clave', clave); await S.setMeta('desde', 0);
    aviso('Configuración recibida. Sincronizando…', 3500); Y.sincronizar();
  } catch { aviso('El enlace de configuración no es válido', 4000); }
  return true;
}

async function dibujar() {
  const crudo = location.hash.replace(/^#/, '') || '/';
  const [ruta, qs = ''] = crudo.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs));
  if (await configDesdeEnlace(query)) { history.replaceState(null, '', '#/ajustes'); }
  const r = RUTAS.find(([re]) => re.test(ruta === '' ? '/' : ruta)) || RUTAS[0];
  const params = (r[0].exec(ruta || '/') || []).slice(1).map(decodeURIComponent);
  const mi = ++versionPintada;
  try {
    const vista = await r[1](params, query);
    if (mi !== versionPintada) return;                       // el usuario ya navegó a otra pantalla
    main.replaceChildren(vista); window.scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    main.replaceChildren(h('div', { class: 'pagina' }, h('div', { class: 'error' }, 'Ocurrió un error al abrir esta pantalla: ' + e.message), h('button', { class: 'btn', onclick: () => ir('/') }, 'Ir al inicio')));
  }
  nav.querySelectorAll('button').forEach(b => b.classList.toggle('activo', b.dataset.k === r[2]));
  pintarInsignia();
}

nav.append(...NAV.map(([k, ico, txt, ruta]) => h('button', { 'data-k': k, onclick: () => ir(ruta) }, h('span', { class: 'nav-ico' }, ico), h('span', {}, txt))));
addEventListener('hashchange', dibujar);

// Estado de sincronización (arriba a la derecha)
Y.alEstado(e => {
  let t, c = 'gris';
  if (!e.configurado) { t = 'Configurar'; c = 'ambar'; }
  else if (e.sincronizando) { t = 'Sincronizando…'; }
  else if (e.error) { t = `⚠ ${e.error}${e.pendientes ? ` · ${e.pendientes} pend.` : ''}`; c = 'rojo'; }
  else if (e.pendientes) { t = `${e.pendientes} pendiente${e.pendientes > 1 ? 's' : ''}`; c = 'ambar'; }
  else { t = '✓ Sincronizado'; c = 'verde'; }
  estadoEl.textContent = t; estadoEl.className = 'estado chip ' + c;
});
estadoEl.addEventListener('click', () => { if (!Y.estado.configurado) ir('/ajustes'); else { aviso('Sincronizando…'); Y.sincronizar(); } });

// Cuando cambian los datos (por mí o por la sincronización), se refresca la pantalla si es una lista/resumen (no un formulario)
let t = null;
S.alCambiar(() => {
  pintarNombre(); pintarInsignia();
  if (document.querySelector('form, .tabla-ordeno input:focus')) return;       // no interrumpir mientras se escribe
  clearTimeout(t); t = setTimeout(dibujar, 300);
});

await Y.refrescarPendientes();
await pintarNombre();
await dibujar();
Y.iniciarAutoSync();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW', e));
