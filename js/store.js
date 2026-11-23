// Almacén local (IndexedDB): una tabla por cada entrada de TABLAS + cola de envío (outbox) + ajustes (meta).
// Todo se guarda primero aquí, así la app funciona sin señal; sync.js lo envía a la hoja de Google.
import { TABLAS } from './config.js';

const NOMBRE = 'granja';
const VERSION = 10 + Object.keys(TABLAS).length;   // agregar una tabla en config.js sube la versión y crea su almacén
const idb = globalThis.indexedDB;
let dbp = null;
const escuchas = new Set();
export const alCambiar = fn => { escuchas.add(fn); return () => escuchas.delete(fn); };
const avisar = (tabla) => escuchas.forEach(f => { try { f(tabla); } catch (e) { console.error(e); } });

function abrir() {
  return (dbp ||= new Promise((res, rej) => {
    const r = idb.open(NOMBRE, VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const t of Object.keys(TABLAS)) if (!d.objectStoreNames.contains(t)) d.createObjectStore(t, { keyPath: 'id' });
      if (!d.objectStoreNames.contains('outbox')) d.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
      if (!d.objectStoreNames.contains('fotoblobs')) d.createObjectStore('fotoblobs', { keyPath: 'id' });   // fotos completas (solo en este celular + Drive)
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
}
const pedir = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function tx(almacenes, modo, fn) {
  const d = await abrir();
  return new Promise((res, rej) => {
    const t = d.transaction(almacenes, modo);
    let salida;
    Promise.resolve(fn(t)).then(v => { salida = v; }, rej);
    t.oncomplete = () => res(salida);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

export const nuevoId = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---- lectura ----
export async function todos(tabla, conBorrados = false) {
  const lista = await tx(tabla, 'readonly', t => pedir(t.objectStore(tabla).getAll()));
  return conBorrados ? lista : lista.filter(r => !r.deleted);
}
export const uno = (tabla, id) => tx(tabla, 'readonly', t => pedir(t.objectStore(tabla).get(id)));

// ---- escritura (siempre deja el registro en la cola de envío) ----
export async function guardar(tabla, rec) {
  const r = { ...rec, id: rec.id || nuevoId(), updatedAt: Date.now() };
  await tx([tabla, 'outbox'], 'readwrite', async t => {
    t.objectStore(tabla).put(r);
    await encolar(t, tabla, r);
  });
  avisar(tabla);
  return r;
}
export async function guardarVarios(tabla, recs) {
  const base = Date.now();
  const lista = recs.map((rec, i) => ({ ...rec, id: rec.id || nuevoId(), updatedAt: base + i }));
  await tx([tabla, 'outbox'], 'readwrite', async t => {
    for (const r of lista) { t.objectStore(tabla).put(r); await encolar(t, tabla, r); }
  });
  avisar(tabla);
  return lista;
}
export async function borrar(tabla, id) {
  const actual = await uno(tabla, id);
  if (!actual) return;
  return guardar(tabla, { ...actual, deleted: 1 });   // borrado lógico: así también se borra en el otro celular
}
async function encolar(t, tabla, rec) {
  const ob = t.objectStore('outbox');
  const previos = await pedir(ob.getAll());
  for (const p of previos) if (p.tabla === tabla && p.rec.id === rec.id) ob.delete(p.seq);   // solo la última versión
  ob.add({ tabla, rec });
}

// ---- cola de envío ----
export const colaPendiente = () => tx('outbox', 'readonly', t => pedir(t.objectStore('outbox').getAll()));
export async function colaQuitar(seqs) {
  await tx('outbox', 'readwrite', t => { for (const s of seqs) t.objectStore('outbox').delete(s); });
}

// ---- cambios que llegan de la hoja de Google: gana el más reciente ----
export async function aplicarRemoto(tabla, recs) {
  if (!TABLAS[tabla] || !recs.length) return 0;
  let n = 0;
  await tx(tabla, 'readwrite', async t => {
    const st = t.objectStore(tabla);
    for (const r of recs) {
      const local = await pedir(st.get(String(r.id)));
      if (!local || Number(r.updatedAt) > Number(local.updatedAt)) { st.put({ ...r, id: String(r.id) }); n++; }
    }
  });
  if (n) avisar(tabla);
  return n;
}

// ---- fotos completas: viven en este celular y en Drive; no pasan por la hoja ----
export const guardarBlob = (id, datos, subida = false) => tx('fotoblobs', 'readwrite', t => { t.objectStore('fotoblobs').put({ id, datos, subida }); });
export const obtenerBlob = id => tx('fotoblobs', 'readonly', t => pedir(t.objectStore('fotoblobs').get(id)));
export const blobsPendientes = async () => (await tx('fotoblobs', 'readonly', t => pedir(t.objectStore('fotoblobs').getAll()))).filter(b => !b.subida);
export const marcarSubida = async id => { const b = await obtenerBlob(id); if (b) await guardarBlob(id, b.datos, true); };
export const quitarBlob = id => tx('fotoblobs', 'readwrite', t => { t.objectStore('fotoblobs').delete(id); });

// ---- ajustes ----
export const getMeta = k => tx('meta', 'readonly', t => pedir(t.objectStore('meta').get(k)));
export const setMeta = (k, v) => tx('meta', 'readwrite', t => { t.objectStore('meta').put(v, k); });

// ---- respaldo completo ----
export async function exportarTodo() {
  const out = { app: 'granja', version: 1, fecha: new Date().toISOString(), tablas: {} };
  for (const t of Object.keys(TABLAS)) out.tablas[t] = await todos(t, true);
  return out;
}
export async function importarTodo(obj) {
  if (!obj || obj.app !== 'granja' || !obj.tablas) throw new Error('El archivo no es un respaldo de esta app.');
  let n = 0;
  for (const [t, recs] of Object.entries(obj.tablas)) {
    if (!TABLAS[t]) continue;
    const base = Date.now();
    await tx([t, 'outbox'], 'readwrite', async tr => {
      for (const [i, r] of recs.entries()) {
        const rec = { ...r, updatedAt: base + i };       // se reenvía todo a la hoja
        tr.objectStore(t).put(rec); await encolar(tr, t, rec); n++;
      }
    });
    avisar(t);
  }
  return n;
}
