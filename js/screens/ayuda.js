// Ayuda e instrucciones de uso. Para cambiar un texto basta editar la lista TEMAS (título + párrafos o viñetas).
import { h, pagina, tarjeta } from '../ui.js';
import { APP, AVISO_SANIDAD_DIAS } from '../config.js';

const TEMAS = [
  ['🏠 Inicio', [
    'Es el panel de la granja: arriba los módulos (Gastos, Ingresos, Leche, Sanidad, Animales, Reproducción) y abajo resúmenes: leche de hoy, alertas sanitarias, próximos partos y cuántos animales hay.',
    'Toca cualquier módulo o tarjeta para entrar.',
  ]],
  ['💵 Gastos', [
    ['Más → Gastos, botón + para anotar uno. Escribe fecha, quién pagó, monto y descripción.',
     'La categoría se asigna sola según la descripción (ej. "sal mineral" → Alimento). Puedes cambiarla a mano.',
     'Arriba está el cuadro de inversión: cuánto puso cada socio, cuánto le corresponde y quién le debe a quién.',
     'Para corregir o borrar un gasto, tócalo en la lista.'],
  ]],
  ['💰 Ingresos', [
    ['Más → Ingresos, botón +. Sirve para ventas de ganado, leche, queso, etc.',
     'Indica quién cobró el dinero y a quién corresponde: normalmente "Sociedad (mitad y mitad)"; si es de uno solo, elige "Solo Omar" o "Solo Kirwuin".',
     'Los ingresos se descuentan en el balance de la pantalla Gastos.',
     'Si es la venta de un animal registrado, elígelo en el formulario y quedará marcado como Vendido.'],
  ]],
  ['🐄 Animales', [
    ['Cada animal tiene nombre y N.º identificador (el número no se repite). Ese número une sus vacunas, partos, leche y fotos: mejor no cambiarlo después; el nombre sí se puede cambiar.',
     'En la ficha ves sus datos, compra (precio, vendedor, fecha), propietario, sanidad y fotos.',
     'Propietario: si el animal es de otra persona (ej. un familiar) no entra en el balance de gastos.',
     'Fotos: "Agregar foto" (cámara o galería). La primera queda de perfil; toca una foto para cambiar el perfil, ponerle nota o eliminarla. Funcionan sin señal.'],
  ]],
  ['🥛 Leche', [
    ['Pestaña Leche: escribe los litros de la mañana y de la tarde por vaca y pulsa "Guardar ordeño".',
     'Si repites el ordeño del mismo día, se corrige el anterior (no se duplica).'],
  ]],
  ['💉 Sanidad', [
    ['Pestaña Sanidad, botón +. Puedes vacunar o desparasitar a varios animales a la vez.',
     'Las aplicaciones registradas sin "Repetir en (días)" aparecen como "Sin fecha": se guardan y se listan, pero no generan aviso.',
     'Para que la app avise, escribe en "Repetir en (días)" cada cuánto se repite (ej. 180). Sin ese dato no hay aviso.',
     `Una vacuna pasa a "Próxima" (ámbar) cuando faltan ${AVISO_SANIDAD_DIAS} días o menos, y a "Vencida" (rojo) si ya pasó la fecha.`,
     'El número rojo sobre la pestaña Sanidad suma las vencidas y próximas. También aparecen en Inicio.',
     'En la ficha del animal, cada medicamento o procedimiento es un desplegable: tócalo para ver todas sus aplicaciones.',
     'La pestaña Sanidad muestra lo pendiente: toca Vencidas, Próximas o Al día para filtrar, y cambia entre Por fecha, Por animal y Por medicamento.',
     'Al aplicar la nueva dosis del mismo producto, la anterior queda como "Renovada" y deja de avisar.',
     'La app no suena con la app cerrada: el aviso se ve al abrirla.'],
  ]],
  ['🤰 Reproducción', [
    ['Más → Reproducción. Registra montas, diagnósticos de preñez, partos, etc.',
     'Con la fecha de monta se calcula el parto probable (283 días) y el animal figura como Preñada. Los próximos partos aparecen en Inicio.'],
  ]],
  ['🔄 Sincronización y señal', [
    ['La app guarda todo en el celular, así que funciona sin internet.',
     'Cuando vuelve la señal, envía sola los registros a la hoja de Google y recibe los del otro celular.',
     'Arriba a la derecha: "✓ Sincronizado" = todo enviado; "N pendientes" = esperan señal (es normal en la granja); en rojo = hubo un problema, toca para reintentar.',
     'Si dos personas cambian el mismo registro sin señal, gana el cambio más reciente.'],
  ]],
  ['📱 Celular nuevo, perdido o roto', [
    ['Tus datos están en la hoja de Google, no solo en el celular.',
     'En el celular nuevo: abre la app, instálala, ve a Más → Ajustes y pega la URL y la clave (o abre el enlace de configuración que te envíe el otro socio). Se descargan todos los datos.',
     'Solo se perderían los registros que nunca llegaron a sincronizarse.',
     'No pulses "Cargar datos iniciales" en un celular nuevo.'],
  ]],
  ['⚙️ Ajustes y respaldo', [
    ['Más → Ajustes: nombre de la granja, conexión, enlace de configuración para otro celular y respaldo.',
     'Recomendado: una vez al mes pulsa "Descargar respaldo" y guarda el archivo.',
     '"🔄 Buscar actualización" baja la última versión de la app sin tocar tus datos.'],
  ]],
];

export async function ayuda() {
  const cuerpo = h('div', { class: 'ayuda' }, ...TEMAS.map(([titulo, bloques], i) => h('details', i === 0 ? { open: true } : {},
    h('summary', {}, titulo),
    ...bloques.map(b => Array.isArray(b) ? h('ul', {}, ...b.map(t => h('li', {}, t))) : h('p', {}, b)))));
  return pagina('Ayuda', { atras: '/mas' }, tarjeta(null, h('small', {}, 'Toca un tema para ver cómo se usa.')), cuerpo, h('small', { style: 'text-align:center' }, `Versión ${APP.version}`));
}
