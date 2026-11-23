// Galería de fotos dentro de la ficha del animal, y visor de una foto.
import * as S from '../store.js';
import * as F from '../fotos.js';
import * as L from '../logic.js';
import { h, pagina, tarjeta, aviso, ir, vacio, formulario } from '../ui.js';

export function tarjetaFotos(animal, fotos, onCambio) {
  const mias = fotos.filter(f => f.animal === String(animal.arete)).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  const entrada = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'oculto', onchange: async e => {
    const archivos = [...e.target.files]; e.target.value = '';
    if (!archivos.length) return;
    aviso('Guardando foto…', 8000);
    try { const n = await F.agregar(animal, archivos); aviso(n === 1 ? 'Foto guardada' : `${n} fotos guardadas`, 2500); onCambio && onCambio(); }
    catch (err) { aviso('No se pudo guardar la foto: ' + err.message, 4000); }
  } });
  return tarjeta(`Fotos (${mias.length})`,
    mias.length ? h('div', { class: 'galeria' }, ...mias.map(f => h('button', { class: 'foto-mini' + (animal.fotoPerfil === f.id ? ' perfil' : ''), onclick: () => ir('/fotos/' + f.id), title: f.nota || '' },
      h('img', { src: f.miniatura, alt: 'Foto del ' + L.fechaCorta(f.fecha), loading: 'lazy' }), h('span', {}, L.fechaCorta(f.fecha))))) : vacio('Aún no hay fotos de este animal.'),
    h('button', { class: 'btn', onclick: () => entrada.click() }, '📷 Agregar foto'), entrada);
}

export async function fotoVista(id) {
  const f = await S.uno('fotos', id);
  if (!f || f.deleted) return pagina('Foto', { atras: '/animales' }, vacio('No se encontró esta foto.'));
  const animales = await S.todos('animales');
  const a = animales.find(x => String(x.arete) === String(f.animal));
  const atras = a ? '/animales/' + a.id : '/animales';
  const img = h('img', { class: 'foto-grande', src: f.miniatura, alt: 'Foto' });
  const estado = h('small', { class: 'estado-sync' });
  F.completa(f).then(d => {
    if (d) { img.src = d; estado.textContent = ''; }
    else estado.textContent = f.driveId ? 'Mostrando la versión pequeña: la foto completa se descarga cuando haya señal.' : 'La foto completa aún no se ha subido; se verá bien al sincronizar.';
  });
  const esPerfil = a && a.fotoPerfil === f.id;
  const form = await formulario('fotos', f, {
    alGuardar: async r => { await S.guardar('fotos', r); aviso('Guardado'); ir(atras); },
    alEliminar: async () => { await F.quitar(f); aviso('Foto eliminada'); ir(atras); },
    alCancelar: () => ir(atras),
  });
  return pagina(a ? L.etiquetaAnimal(a.arete, animales) : 'Foto', { atras }, img, estado,
    a ? h('button', { class: 'btn' + (esPerfil ? '' : ' primario'), disabled: esPerfil, onclick: async () => { await F.fijarPerfil(a, f.id); aviso('Es la foto de perfil'); ir(atras); } }, esPerfil ? '⭐ Es la foto de perfil' : '⭐ Usar como foto de perfil') : null,
    tarjeta('Datos de la foto', form));
}
