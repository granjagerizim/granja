// "Más" (menú) y Ajustes: conexión con la hoja de Google, datos iniciales, respaldo.
import * as S from '../store.js';
import * as Y from '../sync.js';
import * as L from '../logic.js';
import { APP } from '../config.js';
import { h, pagina, tarjeta, aviso, ir, confirmar } from '../ui.js';

export async function mas() {
  const item = (icono, texto, ruta) => h('button', { class: 'fila', onclick: () => ir(ruta) }, h('div', { class: 'fila-izq' }, h('div', { class: 'fila-titulo' }, `${icono}  ${texto}`)), h('div', { class: 'fila-der' }, '›'));
  return pagina('Más', {}, tarjeta(null, item('💵', 'Gastos', '/gastos'), item('💰', 'Ingresos', '/ingresos'), item('🐮', 'Reproducción', '/reproduccion'), item('⚙️', 'Ajustes y respaldo', '/ajustes')));
}

// Vuelve a bajar la app desde internet y la recarga. Los datos no se tocan.
async function buscarActualizacion() {
  if (!navigator.onLine) return aviso('Sin conexión: conéctate a internet e inténtalo de nuevo', 3500);
  const sw = navigator.serviceWorker && (navigator.serviceWorker.controller || (await navigator.serviceWorker.ready).active);
  if (!sw) { location.reload(); return; }
  aviso('Buscando actualización…', 8000);
  const respuesta = new Promise(res => { navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.tipo === 'actualizado') res(e.data.ok); }, { once: false }); setTimeout(() => res(false), 20000); });
  sw.postMessage({ tipo: 'actualizar' });
  if (await respuesta) { aviso('App actualizada ✓', 1500); setTimeout(() => location.reload(), 900); }
  else aviso('No se pudo actualizar ahora. Revisa tu conexión.', 3500);
}

let instalador = null;
globalThis.addEventListener?.('beforeinstallprompt', e => { e.preventDefault(); instalador = e; });

export async function ajustes() {
  const url = (await S.getMeta('url')) || '', clave = (await S.getMeta('clave')) || '';
  const estadoTxt = h('div', { class: 'estado-sync' });
  const pintar = async () => {
    await Y.refrescarPendientes();
    const e = Y.estado;
    estadoTxt.textContent = !e.configurado ? 'Sin configurar: pega la URL y la clave.' :
      `${e.error ? '⚠ ' + e.error + ' · ' : ''}${e.pendientes} registro(s) pendiente(s) de enviar · ${e.ultimo ? 'última sincronización ' + new Date(e.ultimo).toLocaleString('es') : 'aún no sincronizado'}`;
  };
  const inUrl = h('input', { type: 'url', value: url, placeholder: 'https://script.google.com/macros/s/…/exec', autocomplete: 'off' });
  const inClave = h('input', { type: 'text', value: clave, placeholder: 'La clave que escribiste en el script', autocomplete: 'off' });

  const conexion = tarjeta('Conexión con la hoja de Google',
    h('label', { class: 'campo' }, h('span', {}, 'URL del script (termina en /exec)'), inUrl),
    h('label', { class: 'campo' }, h('span', {}, 'Clave'), inClave),
    h('div', { class: 'botones' }, h('button', { class: 'btn primario', onclick: async () => {
      await S.setMeta('url', inUrl.value.trim()); await S.setMeta('clave', inClave.value.trim());
      await S.setMeta('desde', 0);                        // pide todo de nuevo
      aviso('Conectando…'); await Y.sincronizar(); await pintar();
      aviso(Y.estado.error ? 'No se pudo: ' + Y.estado.error : 'Conectado y sincronizado ✓', 3500);
    } }, 'Guardar y sincronizar'), h('button', { class: 'btn', onclick: async () => { aviso('Sincronizando…'); await Y.sincronizar(); await pintar(); aviso(Y.estado.error ? 'No se pudo: ' + Y.estado.error : 'Sincronizado ✓', 3000); } }, 'Sincronizar ahora')),
    estadoTxt,
    h('button', { class: 'btn', onclick: async () => {
      const u = await S.getMeta('url'), c = await S.getMeta('clave');
      if (!u || !c) return aviso('Primero guarda la URL y la clave');
      const enlace = `${location.origin}${location.pathname}#/ajustes?cfg=${btoa(encodeURIComponent(JSON.stringify({ url: u, clave: c })))}`;
      try { await navigator.clipboard.writeText(enlace); aviso('Enlace copiado. Envíalo por mensaje al otro celular (es privado).', 4500); } catch { window.prompt('Copia este enlace:', enlace); }
    } }, 'Copiar enlace de configuración para el otro celular'));

  const actual = await S.uno('ajustes', 'granja');
  const inNombre = h('input', { type: 'text', value: (actual && !actual.deleted && actual.nombre) || APP.nombre, maxlength: 40, autocomplete: 'off' });
  const nombreT = tarjeta('Nombre de la granja',
    h('small', {}, 'Aparece arriba en la app, en los dos celulares.'), inNombre,
    h('button', { class: 'btn primario', onclick: async () => {
      const n = inNombre.value.trim();
      if (!n) return aviso('Escribe un nombre');
      await S.guardar('ajustes', { id: 'granja', nombre: n }); aviso('Nombre guardado'); Y.sincronizar();
    } }, 'Guardar nombre'));

  const seedT = tarjeta('Datos iniciales',
    h('small', {}, 'Carga los 153 gastos del libro de Excel y los 6 animales comprados el 19-11-2026. Hazlo una sola vez, en un solo celular.'),
    h('button', { class: 'btn', onclick: async () => {
      if (!(await confirmar('¿Cargar los gastos y animales del libro de Excel? Si ya los cargaste antes, no se duplican.'))) return;
      const seed = await (await fetch('./seed.json')).json();
      for (const [t, recs] of Object.entries(seed)) await S.guardarVarios(t, recs);
      aviso(`Cargados ${seed.gastos.length} gastos y ${seed.animales.length} animales`, 3500); Y.sincronizar(); pintar();
    } }, 'Cargar datos iniciales'));

  const respaldo = tarjeta('Respaldo',
    h('small', {}, 'Tus datos ya están en la hoja de Google y las fotos, en la carpeta "Granja - Fotos" de tu Drive. Esta copia es un seguro adicional (incluye las miniaturas): guárdala de vez en cuando, por ejemplo 1 vez al mes.'),
    h('button', { class: 'btn', onclick: async () => {
      const datos = await S.exportarTodo();
      const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(datos)], { type: 'application/json' })), download: `granja-respaldo-${L.hoy()}.json` });
      document.body.append(a); a.click(); a.remove(); aviso('Respaldo descargado');
    } }, 'Descargar respaldo'),
    h('label', { class: 'btn' }, 'Restaurar desde respaldo', h('input', { type: 'file', accept: '.json,application/json', class: 'oculto', onchange: async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const n = await S.importarTodo(JSON.parse(await f.text())); aviso(`Restaurados ${n} registros`, 3500); Y.sincronizar(); pintar(); } catch (err) { aviso(err.message, 4000); }
    } })));

  const otros = tarjeta('Esta app',
    instalador ? h('button', { class: 'btn primario', onclick: async () => { instalador.prompt(); instalador = null; } }, 'Instalar en este celular') : h('small', {}, 'Para instalarla: menú ⋮ del navegador → "Instalar aplicación" o "Agregar a la pantalla de inicio".'),
    h('button', { class: 'btn', onclick: buscarActualizacion }, '🔄 Buscar actualización'),
    h('small', {}, `${APP.nombre} v${APP.version}`));
  await pintar();
  return pagina('Ajustes', { atras: '/mas' }, nombreT, conexion, seedT, respaldo, otros);
}
