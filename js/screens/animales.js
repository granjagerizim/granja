// Animales: lista, ficha con resumen e historial, y formulario.
import * as S from '../store.js';
import * as L from '../logic.js';
import { TABLAS } from '../config.js';
import * as F from '../fotos.js';
import { tarjetaFotos } from './fotos.js';
import { h, pagina, tarjeta, filaLista, ir, vacio, fab, formulario, aviso, chip, claseEstado } from '../ui.js';

export async function animales() {
  const [an, repro, san, fotos] = await Promise.all([S.todos('animales'), S.todos('reproduccion'), S.todos('sanidad'), S.todos('fotos')]);
  const perfiles = F.miniaturasPerfil(an, fotos);
  const alertas = new Map();
  for (const e of L.alertasSanidad(L.estadosSanidad(san, an))) alertas.set(String(e.rec.animal), (alertas.get(String(e.rec.animal)) || 0) + (e.estado === 'Vencida' ? 1 : 0.001));
  let soloActivos = true, propFiltro = '';
  const propietarios = [...new Set(an.filter(a => !a.deleted && a.propietario).map(a => a.propietario))].sort((a, b) => a.localeCompare(b, 'es'));
  const cuerpo = h('div');
  const dibujar = () => {
    cuerpo.replaceChildren();
    cuerpo.append(h('div', { class: 'filtros' },
      h('button', { class: 'chip-btn' + (soloActivos ? ' activo' : ''), onclick: () => { soloActivos = true; dibujar(); } }, 'Activos'),
      h('button', { class: 'chip-btn' + (!soloActivos ? ' activo' : ''), onclick: () => { soloActivos = false; dibujar(); } }, 'Todos')));
    if (propietarios.length > 1) cuerpo.append(h('div', { class: 'filtros' },
      h('button', { class: 'chip-btn' + (!propFiltro ? ' activo' : ''), onclick: () => { propFiltro = ''; dibujar(); } }, 'De todos'),
      ...propietarios.map(p => h('button', { class: 'chip-btn' + (propFiltro === p ? ' activo' : ''), onclick: () => { propFiltro = p; dibujar(); } }, p))));
    const lista = an.filter(a => !soloActivos || L.activo(a)).filter(a => !propFiltro || a.propietario === propFiltro).sort((a, b) => String(a.arete).localeCompare(String(b.arete), 'es', { numeric: true }));
    if (!lista.length) cuerpo.append(vacio('Aún no hay animales. Toca + para registrar el primero.'));
    cuerpo.append(...lista.map(a => {
      const r = L.estadoRepro(a, repro);
      const al = alertas.get(String(a.arete));
      return filaLista({
        titulo: L.etiquetaAnimal(a.arete, an), imagen: perfiles.get(String(a.arete)),
        sub: [a.categoria, a.propietario && a.propietario !== 'Sociedad Omar y Kirwuin' ? '👤 ' + a.propietario : '', a.raza, L.edadTexto(a.fechaNac), L.activo(a) ? '' : a.estado].filter(Boolean).join(' · '),
        derecha: h('span', {}, r.estado && r.estado !== 'Sin datos' ? chip(r.estado, claseEstado(r.estado)) : null, al >= 1 ? chip('⚠ vacuna', 'rojo') : null),
        onclick: () => ir('/animales/' + a.id) });
    }));
  };
  dibujar();
  return pagina('Animales', { atras: '/mas' }, cuerpo, fab('Nuevo animal', () => ir('/animales/nuevo')));
}

export async function animalFicha(id) {
  const [an, repro, san, leche, fotos] = await Promise.all([S.todos('animales'), S.todos('reproduccion'), S.todos('sanidad'), S.todos('leche'), S.todos('fotos')]);
  const a = an.find(x => x.id === id);
  if (!a) return pagina('Animal', { atras: '/animales' }, vacio('No se encontró este animal.'));
  const r = L.estadoRepro(a, repro);
  const est = L.estadosSanidad(san, an).filter(e => String(e.rec.animal) === String(a.arete));
  const lr = L.resumenLeche(leche.filter(x => String(x.animal) === String(a.arete)));
  const dato = (k, v) => (v === undefined || v === '' || v === null ? null : h('div', { class: 'dato' }, h('span', {}, k), h('b', {}, v)));
  const madre = a.madre ? L.etiquetaAnimal(a.madre, an) : '', padre = a.padre ? L.etiquetaAnimal(a.padre, an) : '';

  const perfilFoto = a.fotoPerfil ? fotos.find(f => f.id === a.fotoPerfil) : null;
  const ficha = tarjeta(L.etiquetaAnimal(a.arete, an),
    perfilFoto ? h('button', { class: 'perfil-foto', onclick: () => ir('/fotos/' + perfilFoto.id) }, h('img', { src: perfilFoto.miniatura, alt: 'Foto de perfil' })) : null,
    dato('N.º identificador', a.arete),
    dato('Categoría', a.categoria), dato('Propietario', a.propietario), dato('Sexo', a.sexo), dato('Raza', a.raza), dato('Color / señas', a.color),
    dato('Edad', L.edadTexto(a.fechaNac)), dato('Nacimiento', L.fechaCorta(a.fechaNac)), dato('Ingreso', L.fechaCorta(a.fechaIngreso)),
    dato('Origen', a.origen), dato('Comprado a', a.vendedor), dato('Fecha de compra', L.fechaCorta(a.fechaCompra)),
    dato('Precio de compra', a.precio !== undefined && a.precio !== '' ? L.dinero(L.num(a.precio)) + ' USD' : ''), dato('Peso al comprar', a.peso !== undefined && a.peso !== '' ? L.num(a.peso) + ' kg' : ''),
    dato('Madre', madre), dato('Padre', padre), dato('Estado', a.estado), dato('Salida', L.fechaCorta(a.fechaSalida)), dato('Observaciones', a.notas),
    h('button', { class: 'btn', onclick: () => ir(`/animales/${a.id}/editar`) }, 'Editar ficha'));

  const repT = a.sexo === 'Hembra' ? tarjeta('Reproducción',
    dato('Estado', r.estado), dato('Parto probable', L.fechaCorta(r.partoProbable)), dato('Último parto', L.fechaCorta(r.ultimoParto)), dato('Partos', r.nPartos),
    h('button', { class: 'btn', onclick: () => ir('/reproduccion/nuevo?animal=' + encodeURIComponent(a.arete)) }, '+ Registrar evento')) : null;

  const lecheT = a.sexo === 'Hembra' && lr.total30 ? tarjeta('Leche (30 días)', dato('Total', lr.total30.toFixed(1) + ' L'), dato('Promedio por día', lr.promedio.toFixed(1) + ' L')) : null;

  const grupos = gruposSanidad(est);
  const sanT = tarjeta(`Sanidad (${est.length} aplicaciones)`,
    grupos.length ? grupos.map(g => filaLista({
      titulo: g.titulo, sub: `Última: ${L.fechaCorta(g.ultima.rec.fecha)} · ${g.regs.length} ${g.regs.length > 1 ? 'aplicaciones' : 'aplicación'}`,
      derecha: g.ultima.estado ? chip(g.ultima.estado, claseEstado(g.ultima.estado)) : null, subDerecha: g.ultima.proxima ? 'próx. ' + L.fechaCorta(g.ultima.proxima) : null,
      onclick: () => ir('/animales/' + a.id + '/sanidad') })) : vacio('Sin aplicaciones registradas.'),
    est.length ? h('button', { class: 'btn', onclick: () => ir('/animales/' + a.id + '/sanidad') }, 'Ver historial completo') : null,
    h('button', { class: 'btn', onclick: () => ir('/sanidad/nuevo?animal=' + encodeURIComponent(a.arete)) }, '+ Registrar vacuna / tratamiento'));
  return pagina('Ficha', { atras: '/animales' }, ficha, tarjetaFotos(a, fotos), repT, lecheT, sanT);
}

export async function animalForm(id) {
  const rec = id === 'nuevo' ? null : await S.uno('animales', id);
  // Para un animal nuevo se sugiere el siguiente número libre
  const nums = (await S.todos('animales', true)).map(x => String(x.arete).trim()).filter(x => /^\d+$/.test(x)).map(Number);
  const siguiente = String((nums.length ? Math.max(...nums) : 0) + 1);
  const form = await formulario('animales', rec, {
    valoresIniciales: rec ? {} : { arete: siguiente },
    alGuardar: async r => {
      const dup = (await S.todos('animales')).find(x => x.id !== r.id && String(x.arete).trim() === String(r.arete).trim());
      if (dup) { aviso(`Ya existe un animal con el N.º ${r.arete}`, 3500); return; }
      const g = await S.guardar('animales', r); aviso('Animal guardado'); ir('/animales/' + g.id);
    },
    alEliminar: async () => { await S.borrar('animales', id); aviso('Animal eliminado'); ir('/animales'); },
    alCancelar: () => history.back(),
  });
  return pagina(rec ? 'Editar animal' : 'Nuevo animal', { atras: rec ? '/animales/' + id : '/animales' }, form);
}

// Agrupa las aplicaciones de un animal por tipo + producto (la más reciente primero)
function gruposSanidad(est) {
  const m = new Map();
  for (const e of est) { const k = L.norm(e.rec.tipo) + '|' + L.norm(e.rec.producto); if (!m.has(k)) m.set(k, []); m.get(k).push(e); }
  return [...m.values()].map(regs => {
    regs.sort((x, y) => (y.rec.fecha || '').localeCompare(x.rec.fecha || ''));
    const r = regs[0].rec;
    return { titulo: `${r.tipo || ''}${r.producto ? ' · ' + r.producto : ''}`, regs, ultima: regs[0] };
  }).sort((x, y) => (y.ultima.rec.fecha || '').localeCompare(x.ultima.rec.fecha || ''));
}

export async function animalSanidad(id) {
  const [an, san] = await Promise.all([S.todos('animales'), S.todos('sanidad')]);
  const a = an.find(x => x.id === id);
  if (!a) return pagina('Historial', { atras: '/animales' }, vacio('No se encontró este animal.'));
  const est = L.estadosSanidad(san, an).filter(e => String(e.rec.animal) === String(a.arete));
  return pagina('Historial sanitario', { atras: '/animales/' + a.id },
    tarjeta(null, h('b', {}, L.etiquetaAnimal(a.arete, an)), h('small', {}, `${est.length} aplicaciones en total`)),
    h('small', {}, 'Toca un producto para ver todas sus aplicaciones.'),
    ...gruposSanidad(est).map(g => h('details', { class: 'grupo-san' },
      h('summary', {},
        h('span', { class: 'grupo-tit' }, `${g.titulo} (${g.regs.length})`),
        g.ultima.estado ? chip(g.ultima.estado, claseEstado(g.ultima.estado)) : null),
      ...g.regs.map(e => h('button', { class: 'fila', onclick: () => ir('/sanidad/' + e.rec.id) },
        h('div', { class: 'fila-izq' }, h('div', { class: 'fila-titulo' }, L.fechaCorta(e.rec.fecha)), h('small', {}, [e.rec.dosis, e.rec.aplico].filter(Boolean).join(' · '))),
        h('div', { class: 'fila-der' }, e.estado ? chip(e.estado, claseEstado(e.estado)) : null))))));
}
