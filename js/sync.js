// Sincronización con la hoja de Google (vía el script de apps-script/Code.gs).
// Envía la cola de cambios pendientes y trae lo que hizo el otro celular. Si no hay señal, no pasa nada:
// queda pendiente y se reintenta solo.
import * as S from './store.js';
import { TABLAS } from './config.js';

export const estado = { pendientes: 0, sincronizando: false, ultimo: null, error: null, configurado: false };
const escuchas = new Set();
export const alEstado = fn => { escuchas.add(fn); fn(estado); return () => escuchas.delete(fn); };
const emitir = () => escuchas.forEach(f => f(estado));
let enCurso = null;

// Tipos de cada campo, para que la hoja guarde bien textos, fechas y números
function tiposDe(tablas) {
  const out = {};
  for (const t of tablas) if (TABLAS[t]) out[t] = Object.fromEntries(TABLAS[t].campos.map(c => [c.k, c.tipo === 'numero' ? 'number' : 'text']));
  return out;
}

// Envía un POST al script de Google y devuelve su respuesta ya leída
async function enviar(url, cuerpo, ms = 30000) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), ms);
  try {
    // text/plain evita la consulta previa (CORS) que Google no responde
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo), signal: ctl.signal });
    return await resp.json();
  } finally { clearTimeout(to); }
}

// Fotos completas: se suben a Drive cuando hay señal (la miniatura ya viajó con la hoja)
async function subirFotos(url, clave) {
  for (const b of await S.blobsPendientes()) {
    const rec = await S.uno('fotos', b.id);
    if (!rec) continue;                                         // el registro aún no existe: se reintenta luego
    if (rec.deleted) { await S.quitarBlob(b.id); continue; }
    const j = await enviar(url, { clave, accion: 'subirFoto', id: b.id, datos: String(b.datos).split(',')[1] }, 90000);
    if (!j.ok) throw new Error(j.error || 'No se pudo subir la foto');
    await S.marcarSubida(b.id);
    await S.guardar('fotos', { ...(await S.uno('fotos', b.id)), driveId: j.driveId });
  }
}

// Trae una foto completa desde Drive (se usa al abrir una foto que subió el otro celular)
export async function bajarFoto(id) {
  const url = await S.getMeta('url'), clave = await S.getMeta('clave');
  if (!url || !clave) throw new Error('Sin configurar');
  const j = await enviar(url, { clave, accion: 'bajarFoto', id }, 90000);
  if (!j.ok) throw new Error(j.error || 'No se pudo bajar la foto');
  return `data:${j.tipo || 'image/jpeg'};base64,${j.datos}`;
}

export async function refrescarPendientes() {
  estado.pendientes = (await S.colaPendiente()).length + (await S.blobsPendientes()).length;
  const url = await S.getMeta('url'), clave = await S.getMeta('clave');
  estado.configurado = !!(url && clave);
  emitir();
}

export function sincronizar() {
  return (enCurso ||= (async () => {
    try {
      const url = await S.getMeta('url'), clave = await S.getMeta('clave');
      estado.configurado = !!(url && clave);
      if (!estado.configurado) { await refrescarPendientes(); return; }
      if (globalThis.navigator && navigator.onLine === false) { estado.error = 'Sin conexión'; await refrescarPendientes(); return; }
      estado.sincronizando = true; estado.error = null; emitir();
      const cola = await S.colaPendiente();
      const desde = (await S.getMeta('desde')) || 0;
      const tablasEnvio = [...new Set(cola.map(o => o.tabla))];
      const cuerpo = { clave, desde, tipos: tiposDe(tablasEnvio), ops: cola.map(o => ({ t: o.tabla, r: o.rec })) };
      const j = await enviar(url, cuerpo);
      if (!j.ok) throw new Error(j.error || 'Respuesta inválida del servidor');
      await S.colaQuitar(cola.map(o => o.seq));          // solo lo que se envió; lo creado durante el envío queda en cola
      for (const [t, recs] of Object.entries(j.cambios || {})) await S.aplicarRemoto(t, recs);
      await S.setMeta('desde', j.ahora);
      estado.ultimo = Date.now(); await S.setMeta('ultimaSync', estado.ultimo);
      await subirFotos(url, clave);                      // si falla, el resto ya quedó sincronizado; la foto se reintenta
    } catch (e) {
      estado.error = e.name === 'AbortError' ? 'Tiempo agotado' : (e.message === 'Failed to fetch' ? 'Sin conexión' : e.message);
    } finally {
      estado.sincronizando = false; enCurso = null;
      await refrescarPendientes();
    }
  })());
}

// Dispara la sincronización en los momentos útiles
let temporizador = null;
export function iniciarAutoSync() {
  const pronto = (ms = 1500) => { clearTimeout(temporizador); temporizador = setTimeout(sincronizar, ms); };
  S.alCambiar(() => { refrescarPendientes(); pronto(); });
  globalThis.addEventListener?.('online', () => pronto(500));
  globalThis.document?.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pronto(500); });
  setInterval(() => { if (estado.pendientes || !estado.ultimo || Date.now() - estado.ultimo > 120000) sincronizar(); }, 60000);
  S.getMeta('ultimaSync').then(v => { estado.ultimo = v || null; });
  pronto(300);
}
