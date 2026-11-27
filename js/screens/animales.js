// Animales: lista, ficha con resumen e historial, y formulario.
import * as S from '../store.js';
import * as L from '../logic.js';
import { TABLAS, LISTAS } from '../config.js';
import * as F from '../fotos.js';
import { tarjetaFotos } from './fotos.js';
import { h, pagina, tarjeta, filaLista, ir, vacio, fab, formulario, aviso, chip, claseEstado } from '../ui.js';

export async function animales() {
  const [an, repro, san, fotos] = await Promise.all([S.todos('animales'), S.todos('reproduccion'), S.todos('sanidad'), S.todos('fotos')]);
  const perfiles = F.miniaturasPerfil(an, fotos);
  const alertas = new Map();
  for (const e of L.alertasSanidad(L.estadosSanidad(san, an))) alertas.set(String(e.rec.animal), (alertas.get(String(e.rec.animal)) || 0) + (e.estado === 'Vencida' ? 1 : 0.001));
  const SOC = 'Sociedad Omar y Kirwuin';
  const esSoc = a => !a.propietario || a.propietario === SOC;
  const todosA = an.filter(a => !a.deleted);
  const cuenta = { activos: todosA.filter(L.activo).length, sociedad: todosA.filter(a => L.activo(a) && esSoc(a)).length, terceros: todosA.filter(a => L.activo(a) && !esSoc(a)).length, inactivos: todosA.filter(a => !L.activo(a)).length };
  let vista = 'lista', filtro = 'activos';     // vista: lista | propietario | categoria · filtro: activos | sociedad | terceros | inactivos
  const NOMBRE = { activos: 'activos', sociedad: 'de la sociedad', terceros: 'de terceros', inactivos: 'vendidos o dados de baja' };
  const resumen = h('div', { class: 'resumen3' });
  const cuerpo = h('div', { class: 'pagina-int' });
  const pintarResumen = () => {
    resumen.classList.toggle('cuatro', cuenta.inactivos > 0);
    resumen.replaceChildren(...[['activos', 'Activos', 'verde'], ['sociedad', 'Sociedad', 'neutro'], ['terceros', 'De terceros', 'neutro'], ['inactivos', 'Inactivos', 'gris']].filter(([k]) => k !== 'inactivos' || cuenta.inactivos > 0).map(([k, t, c]) =>
      h('button', { class: 'num3 ' + c + (filtro === k ? ' activo' : ''), 'aria-pressed': String(filtro === k), onclick: () => { filtro = k; dibujar(); } }, h('b', {}, cuenta[k]), h('span', {}, t))));
    resumen.classList.toggle('filtrando', filtro !== 'activos');
  };
  const fila = (a, conProp = true) => {
    const r = L.estadoRepro(a, repro);
    const al = alertas.get(String(a.arete));
    return filaLista({
      titulo: L.etiquetaAnimal(a.arete, an), imagen: perfiles.get(String(a.arete)),
      sub: [a.categoria, conProp && !esSoc(a) ? '👤 ' + a.propietario : '', a.raza, L.edadTexto(a.fechaNac), L.activo(a) ? '' : a.estado].filter(Boolean).join(' · '),
      derecha: h('span', {}, r.estado && r.estado !== 'Sin datos' ? chip(r.estado, claseEstado(r.estado)) : null, al >= 1 ? chip('⚠ vacuna', 'rojo') : null),
      onclick: () => ir('/animales/' + a.id) });
  };
  const dibujar = () => {
    pintarResumen();
    cuerpo.replaceChildren(h('div', { class: 'filtros' }, ...[['lista', 'Lista'], ['propietario', 'Por propietario'], ['categoria', 'Por categoría']].map(([k, t]) =>
      h('button', { class: 'chip-btn' + (vista === k ? ' activo' : ''), onclick: () => { vista = k; dibujar(); } }, t))));
    if (filtro !== 'activos') cuerpo.append(h('div', { class: 'aviso-filtro' }, h('span', {}, `Mostrando solo: ${NOMBRE[filtro]} (${cuenta[filtro]})`), h('button', { class: 'chip-btn', onclick: () => { filtro = 'activos'; dibujar(); } }, 'Quitar filtro ✕')));
    const lista = todosA.filter(a => filtro === 'inactivos' ? !L.activo(a) : L.activo(a) && (filtro === 'activos' || (filtro === 'sociedad') === esSoc(a)))
      .sort((a, b) => String(a.arete).localeCompare(String(b.arete), 'es', { numeric: true }));
    if (!lista.length) { cuerpo.append(vacio(todosA.length ? 'No hay animales en este grupo.' : 'Aún no hay animales. Toca + para registrar el primero.')); return; }
    if (vista === 'lista') { cuerpo.append(...lista.map(a => fila(a))); return; }
    const grupos = new Map();
    for (const a of lista) { const k = vista === 'propietario' ? (esSoc(a) ? SOC : a.propietario) : (a.categoria || 'Sin categoría'); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(a); }
    const orden = [...grupos.keys()].sort((x, y) => vista === 'propietario' ? (x === SOC ? -1 : y === SOC ? 1 : x.localeCompare(y, 'es')) : LISTAS.categoriaAnimal.indexOf(x) - LISTAS.categoriaAnimal.indexOf(y));
    cuerpo.append(...orden.map(k => {
      const es = grupos.get(k), venc = es.filter(a => alertas.get(String(a.arete)) >= 1).length, prenadas = es.filter(a => L.estadoRepro(a, repro).estado === 'Preñada').length;
      return h('details', { class: 'grupo-san', open: orden.length <= 2 ? true : null },
        h('summary', {}, h('div', { class: 'grupo-cab' }, h('span', { class: 'grupo-tit' }, k), h('small', {}, `${es.length} animal${es.length > 1 ? 'es' : ''}`)),
          h('div', { class: 'chips-res' }, venc ? chip(`${venc} con vacuna vencida`, 'rojo') : null, prenadas ? chip(`${prenadas} preñada${prenadas > 1 ? 's' : ''}`, 'verde') : null)),
        ...es.map(a => fila(a, vista !== 'propietario')));
    }));
  };
  dibujar();
  return pagina('Animales', { atras: '/mas' }, resumen, cuerpo, fab('Nuevo animal', () => ir('/animales/nuevo')));
}

export async function animalFicha(id, query = {}) {
  const volver = query.de === 'sanidad' ? '/sanidad' : '/animales';   // si llegaste desde Sanidad, la flecha ‹ vuelve ahí
  const [an, repro, san, leche, fotos] = await Promise.all([S.todos('animales'), S.todos('reproduccion'), S.todos('sanidad'), S.todos('leche'), S.todos('fotos')]);
  const a = an.find(x => x.id === id);
  if (!a) return pagina('Animal', { atras: volver }, vacio('No se encontró este animal.'));
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

  const sanT = tarjeta(`Salud (${est.length} aplicaciones)`,
    est.length ? gruposSanidad(est).map(g => h('details', { class: 'grupo-san' },
      h('summary', {},
        h('div', { class: 'grupo-cab' },
          h('span', { class: 'grupo-tit' }, `${g.titulo} (${g.regs.length})`),
          h('small', {}, `Última: ${L.fechaCorta(g.ultima.rec.fecha)}${g.ultima.proxima ? ' · próx. ' + L.fechaCorta(g.ultima.proxima) : ''}`)),
        g.ultima.estado ? chip(g.ultima.estado, claseEstado(g.ultima.estado)) : null),
      ...g.regs.map(e => h('button', { class: 'fila', onclick: () => ir('/sanidad/' + e.rec.id) },
        h('div', { class: 'fila-izq' }, h('div', { class: 'fila-titulo' }, L.fechaCorta(e.rec.fecha)), h('small', {}, [e.rec.dosis, e.rec.aplico].filter(Boolean).join(' · '))),
        h('div', { class: 'fila-der' }, e.estado ? chip(e.estado, claseEstado(e.estado)) : null))))) : vacio('Sin aplicaciones registradas.'),
    h('button', { class: 'btn', onclick: () => ir('/sanidad/nuevo?animal=' + encodeURIComponent(a.arete)) }, '+ Registrar vacuna / tratamiento'));
  return pagina('Ficha', { atras: volver }, ficha, tarjetaFotos(a, fotos), repT, lecheT, sanT);
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
