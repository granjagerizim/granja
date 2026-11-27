// Cálculos de la app (funciones puras, sin acceso a pantalla ni a datos locales).
// Reproducen la lógica del libro de Excel. Se prueban en tests/logica.test.mjs.
import { SOCIOS, PARTES, REPARTO_SOCIEDAD, CLAVES, CATEGORIAS_GASTO, GESTACION_DIAS, AVISO_SANIDAD_DIAS } from './config.js';

// ---------- utilidades de fecha (fechas como texto 'AAAA-MM-DD') ----------
export const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
export const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
export function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const utc = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const diasEntre = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);   // b - a
export function sumarDias(s, n) {
  const d = new Date(utc(s) + n * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
export const esFecha = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

// ---------- animales ----------
export const activo = a => a.estado !== 'Vendido' && a.estado !== 'Muerto';
export function edadTexto(fechaNac, ref = hoy()) {
  if (!esFecha(fechaNac)) return '';
  const [y1, m1, d1] = fechaNac.split('-').map(Number), [y2, m2, d2] = ref.split('-').map(Number);
  let meses = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  if (meses < 0) return '';
  return meses < 12 ? `${meses} meses` : `${Math.floor(meses / 12)} años ${meses % 12} m`;
}

// ---------- gastos ----------
const CLAVES_N = CLAVES.map(([p, c]) => [norm(p), c]);
export function categoriaGasto(g) {
  if (g.categoria) return g.categoria;
  const d = norm(g.descripcion);
  for (const [p, c] of CLAVES_N) if (p && d.includes(p)) return c;
  return 'Otros';
}
// Gastos: los paga un socio, o "Sociedad (mitad y mitad)" (dinero común: se suma mitad a cada socio).
// Ingresos: todos son de la sociedad; no generan deuda entre socios.
// Cada socio aportó lo que pagó (más su mitad de los gastos en sociedad); lo justo es que cada uno aporte su parte del total.
export function balance(gastos, ingresos = []) {
  const gs = gastos.filter(g => !g.deleted), is = ingresos.filter(i => !i.deleted);
  const total = gs.reduce((s, g) => s + num(g.monto), 0);
  const totalIngresos = is.reduce((s, i) => s + num(i.monto), 0);
  const neto = total - totalIngresos;
  const propio = Object.fromEntries(SOCIOS.map(s => [s, 0])), enSociedad = Object.fromEntries(SOCIOS.map(s => [s, 0]));
  let sinSocio = 0;
  for (const g of gs) {
    if (g.quien === REPARTO_SOCIEDAD) for (const s of SOCIOS) enSociedad[s] += num(g.monto) * PARTES[s];
    else if (g.quien in propio) propio[g.quien] += num(g.monto);
    else sinSocio += num(g.monto);
  }
  const filas = SOCIOS.map(s => {
    const pagado = propio[s] + enSociedad[s], corresponde = total * PARTES[s];
    return { socio: s, pagado, propio: propio[s], enSociedad: enSociedad[s], corresponde, diferencia: pagado - corresponde };
  });
  // quien tiene diferencia negativa le debe a quien tiene positiva (con 2 socios, es una sola deuda)
  const deudor = filas.reduce((a, b) => (b.diferencia < a.diferencia ? b : a));
  const acreedor = filas.reduce((a, b) => (b.diferencia > a.diferencia ? b : a));
  const monto = Math.abs(deudor.diferencia);
  return { total, totalIngresos, neto, filas, sinSocio, deuda: monto < 0.005 ? null : { de: deudor.socio, a: acreedor.socio, monto } };
}
export function ingresosPorCategoria(ingresos) {
  const m = new Map();
  for (const i of ingresos) {
    if (i.deleted) continue;
    const c = i.categoria || 'Otros ingresos';
    if (!m.has(c)) m.set(c, { cat: c, total: 0, n: 0, porSocio: Object.fromEntries(SOCIOS.map(s => [s, 0])) });
    const e = m.get(c); e.total += num(i.monto); e.n++;
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}
export function gastosPorCategoria(gastos) {
  const m = new Map(CATEGORIAS_GASTO.map(c => [c, { cat: c, total: 0, n: 0, porSocio: Object.fromEntries(SOCIOS.map(s => [s, 0])) }]));
  for (const g of gastos) {
    if (g.deleted) continue;
    const c = categoriaGasto(g);
    if (!m.has(c)) m.set(c, { cat: c, total: 0, n: 0, porSocio: Object.fromEntries(SOCIOS.map(s => [s, 0])) });
    const e = m.get(c); e.total += num(g.monto); e.n++;
    if (g.quien === REPARTO_SOCIEDAD) for (const s of SOCIOS) e.porSocio[s] += num(g.monto) * PARTES[s]; else if (g.quien in e.porSocio) e.porSocio[g.quien] += num(g.monto);
  }
  return [...m.values()].filter(e => e.n > 0).sort((a, b) => b.total - a.total);   // sort estable: empates en orden de la lista
}

// ---------- leche ----------
export const litros = r => num(r.manana) + num(r.tarde);
export function resumenLeche(regs, ref = hoy()) {
  const rs = regs.filter(r => !r.deleted && esFecha(r.fecha) && litros(r) > 0);
  const desde = sumarDias(ref, -29);
  const en30 = rs.filter(r => r.fecha >= desde && r.fecha <= ref);
  const total30 = en30.reduce((s, r) => s + litros(r), 0);
  const primero = rs.length ? rs.reduce((m, r) => (r.fecha < m ? r.fecha : m), rs[0].fecha) : null;
  const ventana = primero ? Math.max(1, Math.min(30, diasEntre(primero, ref) + 1)) : 30;
  const ultimoDia = rs.length ? rs.reduce((m, r) => (r.fecha > m ? r.fecha : m), rs[0].fecha) : null;
  const litrosUltimo = ultimoDia ? rs.filter(r => r.fecha === ultimoDia).reduce((s, r) => s + litros(r), 0) : 0;
  const pv = new Map();
  for (const r of en30) pv.set(r.animal, (pv.get(r.animal) || 0) + litros(r));
  const porVaca = [...pv.entries()].map(([animal, l]) => ({ animal, litros: l, promedio: l / ventana })).sort((a, b) => b.litros - a.litros);
  return { total30, ventana, promedio: total30 ? total30 / ventana : 0, ultimoDia, litrosUltimo, porVaca };
}
export function litrosPorDia(regs, dias = 14, ref = hoy()) {
  const out = [];
  for (let i = dias - 1; i >= 0; i--) {
    const f = sumarDias(ref, -i);
    out.push({ fecha: f, litros: regs.filter(r => !r.deleted && r.fecha === f).reduce((s, r) => s + litros(r), 0) });
  }
  return out;
}

// ---------- sanidad ----------
export function estadosSanidad(regs, animales, ref = hoy()) {
  const rs = regs.filter(r => !r.deleted);
  const baja = new Set(animales.filter(a => !activo(a)).map(a => String(a.arete)));
  const mismo = (a, b) => String(a.animal) === String(b.animal) && norm(a.tipo) === norm(b.tipo) && norm(a.producto) === norm(b.producto);
  return rs.map(r => {
    const rep = num(r.repetirDias);
    const proxima = esFecha(r.fecha) && rep > 0 ? sumarDias(r.fecha, rep) : '';
    let estado = '';
    if (proxima) {
      if (baja.has(String(r.animal))) estado = 'Baja';
      else if (rs.some(o => o !== r && mismo(o, r) && esFecha(o.fecha) && o.fecha > r.fecha)) estado = 'Renovada';
      else if (proxima < ref) estado = 'Vencida';
      else if (proxima <= sumarDias(ref, AVISO_SANIDAD_DIAS)) estado = 'Próxima';
      else estado = 'Al día';
    }
    return { rec: r, proxima, estado, dias: proxima ? diasEntre(ref, proxima) : null };
  });
}
export const alertasSanidad = es => es.filter(e => e.estado === 'Vencida' || e.estado === 'Próxima').sort((a, b) => a.dias - b.dias);

// ---------- reproducción ----------
const GRUPO_A = ['Monta', 'Inseminación', 'Preñez confirmada'];
const GRUPO_B = ['Parto', 'Aborto', 'Preñez negativa'];
const SERVICIO = ['Monta', 'Inseminación'];
export function estadoRepro(animal, eventos) {
  if (animal.sexo !== 'Hembra') return { estado: '', partoProbable: '', ultimoParto: '', nPartos: 0 };
  const evs = eventos.filter(e => !e.deleted && String(e.animal) === String(animal.arete) && esFecha(e.fecha))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (a.updatedAt || 0) - (b.updatedAt || 0)));
  const ultimo = grupo => [...evs].reverse().find(e => grupo.includes(e.evento));
  const A = ultimo(GRUPO_A), B = ultimo(GRUPO_B), S = ultimo(SERVICIO);
  const partos = evs.filter(e => e.evento === 'Parto');
  let estado = 'Sin datos', partoProbable = '';
  if (A || B) {
    if (A && (!B || A.fecha > B.fecha)) {
      estado = 'Preñada';
      if (esFecha(A.partoProbable)) partoProbable = A.partoProbable;
      else if (S && (!B || S.fecha > B.fecha)) partoProbable = sumarDias(S.fecha, GESTACION_DIAS);
    } else estado = 'Vacía';
  }
  return { estado, partoProbable, ultimoParto: partos.length ? partos[partos.length - 1].fecha : '', nPartos: partos.length };
}
export function proximosPartos(animales, eventos, ref = hoy()) {
  return animales.filter(a => !a.deleted && activo(a)).map(a => ({ a, r: estadoRepro(a, eventos) }))
    .filter(x => x.r.partoProbable).map(x => ({ animal: x.a, fecha: x.r.partoProbable, dias: diasEntre(ref, x.r.partoProbable) }))
    .sort((x, y) => x.dias - y.dias);
}

// ---------- varios ----------
export const etiquetaAnimal = (arete, animales) => {
  const a = animales.find(x => String(x.arete) === String(arete));
  if (!a) return String(arete || '');
  return a.nombre ? `${a.nombre} · N.º ${a.arete}` : `N.º ${a.arete}`;
};
export const dinero = n => '$' + (Math.round(n * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fechaCorta = s => (esFecha(s) ? s.split('-').reverse().join('/') : '');
