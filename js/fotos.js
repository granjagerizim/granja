// Fotos de los animales. La foto se reduce en el celular (≈150 KB): la miniatura viaja con la hoja de Google
// y la foto completa se guarda en Drive. Todo funciona sin señal; se sube cuando vuelve.
import * as S from './store.js';
import * as Y from './sync.js';
import { hoy } from './logic.js';

const LADO_GRANDE = 1280, LADO_MINI = 320, TOPE_MINI = 40000;     // una celda de Sheets admite 50.000 caracteres

async function cargarImagen(archivo) {
  if (globalThis.createImageBitmap) { try { return await createImageBitmap(archivo, { imageOrientation: 'from-image' }); } catch { /* se prueba con <img> */ } }
  const url = URL.createObjectURL(archivo);
  try {
    return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo leer la imagen')); i.src = url; });
  } finally { setTimeout(() => URL.revokeObjectURL(url), 5000); }
}
function redimensionar(img, lado, calidad) {
  const w0 = img.width, h0 = img.height, k = Math.min(1, lado / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', calidad);
}
export async function procesar(archivo) {
  const img = await cargarImagen(archivo);
  const grande = redimensionar(img, LADO_GRANDE, 0.8);
  let miniatura = '';
  for (const [lado, q] of [[LADO_MINI, 0.7], [LADO_MINI, 0.55], [240, 0.5], [200, 0.4]]) {
    miniatura = redimensionar(img, lado, q);
    if (miniatura.length <= TOPE_MINI) break;
  }
  img.close?.();
  return { grande, miniatura };
}

const aFecha = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Agrega una o varias fotos a un animal (arete = su número identificador). La primera pasa a ser la de perfil.
export async function agregar(animal, archivos) {
  let n = 0, primera = null;
  for (const f of archivos) {
    if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|heic)$/i.test(f.name || '')) continue;
    const { grande, miniatura } = await procesar(f);
    const fecha = f.lastModified ? aFecha(f.lastModified) : hoy();      // la fecha en que se tomó la foto, si el celular la conoce
    const rec = await S.guardar('fotos', { animal: String(animal.arete), fecha, nota: '', miniatura });
    await S.guardarBlob(rec.id, grande, false);                         // después del registro, para que la subida siempre encuentre su ficha
    primera ||= rec; n++;
  }
  if (primera) {
    const actual = await S.uno('animales', animal.id);
    if (actual && !actual.fotoPerfil) await S.guardar('animales', { ...actual, fotoPerfil: primera.id });
  }
  return n;
}

export async function fijarPerfil(animal, fotoId) {
  const actual = await S.uno('animales', animal.id);
  await S.guardar('animales', { ...actual, fotoPerfil: fotoId });
}

export async function quitar(foto) {
  await S.borrar('fotos', foto.id);
  await S.quitarBlob(foto.id);                                          // en Drive se conserva el archivo (por seguridad)
  const animales = await S.todos('animales');
  for (const a of animales) if (a.fotoPerfil === foto.id) {
    const otras = (await S.todos('fotos')).filter(x => x.animal === String(a.arete) && x.id !== foto.id).sort((x, y) => String(y.fecha).localeCompare(String(x.fecha)));
    await S.guardar('animales', { ...a, fotoPerfil: otras[0]?.id || '' });
  }
}

// Foto completa: la del propio celular, o la que está en Drive. Devuelve null si no está disponible todavía.
export async function completa(foto) {
  const local = await S.obtenerBlob(foto.id);
  if (local) return local.datos;
  if (!foto.driveId) return null;
  try { const datos = await Y.bajarFoto(foto.id); await S.guardarBlob(foto.id, datos, true); return datos; } catch { return null; }
}

// Mapa animal(arete) → miniatura de su foto de perfil, para listas
export function miniaturasPerfil(animales, fotos) {
  const porId = new Map(fotos.map(f => [f.id, f]));
  return new Map(animales.filter(a => a.fotoPerfil && porId.get(a.fotoPerfil)).map(a => [String(a.arete), porId.get(a.fotoPerfil).miniatura]));
}
