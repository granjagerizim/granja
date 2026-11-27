// ============================================================================
//  CONFIGURACIÓN DE LA APP  (aquí se cambian casi todas las cosas)
//  - Socios, listas desplegables, categorías de gastos y palabras clave.
//  - Campos de cada formulario (agregar un campo = agregar una línea).
//  Después de cambiar algo, basta recargar la app.
// ============================================================================

export const APP = { nombre: 'Granja', version: '1.4.0' };

// Socios y reparto de gastos (deben sumar 1). Los nombres deben coincidir con los de la hoja.
export const SOCIOS = ['Omar', 'Kirwuin'];
export const PARTES = { Omar: 0.5, Kirwuin: 0.5 };
export const COLOR_SOCIO = { Omar: '#2e7d32', Kirwuin: '#c62828' };   // verde / rojo

// Parámetros del hato
export const GESTACION_DIAS = 283;      // días de gestación para calcular el parto probable
export const AVISO_SANIDAD_DIAS = 15;   // una vacuna pasa a "Próxima" cuando faltan estos días o menos

// Listas desplegables
export const LISTAS = {
  propietario: ['Sociedad Omar y Kirwuin', 'Elisa Villalobos'],
  categoriaAnimal: ['Vaca', 'Toro', 'Novilla', 'Novillo', 'Becerra', 'Becerro', 'Otro'],
  sexo: ['Hembra', 'Macho'],
  raza: ['Mestiza', 'Cebú', 'Brahman', 'Gyr', 'Girolando', 'Holstein', 'Pardo Suizo', 'Carora'],
  origen: ['Comprado', 'Nacido en la granja'],
  estadoAnimal: ['Activo', 'Vendido', 'Muerto'],
  tipoSanidad: ['Vacuna', 'Desparasitación', 'Vitamina / suplemento', 'Tratamiento', 'Revisión veterinaria', 'Otro'],
  // Los nombres de los eventos reproductivos los usa la lógica (logic.js): no cambiarlos.
  evento: ['Celo', 'Monta', 'Inseminación', 'Preñez confirmada', 'Preñez negativa', 'Parto', 'Aborto', 'Secado'],
  resultadoCria: ['Viva', 'Muerta'],
};

// Categorías de gastos. El orden de CLAVES importa: gana la primera palabra que aparezca en la descripción.
// Si ninguna coincide, el gasto queda en "Otros". (Se ignoran mayúsculas y tildes.)
export const CATEGORIAS_GASTO = ["Compra de la granja", "Gestión y comisiones", "Mano de obra", "Maquinaria y arado", "Servicios básicos", "Construcción e infraestructura", "Siembra y cultivos", "Riego y agua", "Animales y alimento", "Herramientas y dotación", "Otros"];

// Tipos de ingreso (se puede escribir uno nuevo desde el formulario con "Otro")
// A quién pertenece un ingreso: por defecto a la sociedad (mitad y mitad); a veces es de un solo socio
export const REPARTO_SOCIEDAD = 'Sociedad (mitad y mitad)';
export const REPARTOS = [REPARTO_SOCIEDAD, ...SOCIOS.map(s => 'Solo ' + s)];
export const CATEGORIAS_INGRESO = ['Venta de ganado', 'Leche', 'Queso', 'Otros derivados', 'Otros ingresos'];
export const CLAVES = [
  ["novilla", "Animales y alimento"],
  ["novillo", "Animales y alimento"],
  ["compra granja", "Compra de la granja"],
  ["aporte inicial", "Compra de la granja"],
  ["jean", "Gestión y comisiones"],
  ["amigo", "Gestión y comisiones"],
  ["colaboración", "Gestión y comisiones"],
  ["colaboracion", "Gestión y comisiones"],
  ["tramite", "Gestión y comisiones"],
  ["trámite", "Gestión y comisiones"],
  ["trabaj", "Mano de obra"],
  ["trabj", "Mano de obra"],
  ["trsbaj", "Mano de obra"],
  ["willo", "Mano de obra"],
  ["albañil", "Mano de obra"],
  ["obrero", "Mano de obra"],
  ["ayudante", "Mano de obra"],
  ["pozero", "Mano de obra"],
  ["sembrador", "Mano de obra"],
  ["hora", "Maquinaria y arado"],
  ["maquina", "Maquinaria y arado"],
  ["máquina", "Maquinaria y arado"],
  ["arado", "Maquinaria y arado"],
  ["luz", "Servicios básicos"],
  ["breke", "Servicios básicos"],
  ["cable", "Servicios básicos"],
  ["bombillo", "Servicios básicos"],
  ["lámpara", "Servicios básicos"],
  ["lampara", "Servicios básicos"],
  ["poste", "Servicios básicos"],
  ["voltaje", "Servicios básicos"],
  ["cajera", "Servicios básicos"],
  ["cemento", "Construcción e infraestructura"],
  ["bloque", "Construcción e infraestructura"],
  ["cercha", "Construcción e infraestructura"],
  ["arena", "Construcción e infraestructura"],
  ["orcon", "Construcción e infraestructura"],
  ["ramada", "Construcción e infraestructura"],
  ["galpon", "Construcción e infraestructura"],
  ["galpón", "Construcción e infraestructura"],
  ["corral", "Construcción e infraestructura"],
  ["lona", "Construcción e infraestructura"],
  ["lámina", "Construcción e infraestructura"],
  ["lamina", "Construcción e infraestructura"],
  ["pintura", "Construcción e infraestructura"],
  ["semilla", "Siembra y cultivos"],
  ["matas", "Siembra y cultivos"],
  ["paja", "Siembra y cultivos"],
  ["maiz", "Siembra y cultivos"],
  ["maíz", "Siembra y cultivos"],
  ["veneno", "Siembra y cultivos"],
  ["fumig", "Siembra y cultivos"],
  ["tordon", "Siembra y cultivos"],
  ["manguera", "Riego y agua"],
  ["maguera", "Riego y agua"],
  ["bomba", "Riego y agua"],
  ["bombona", "Riego y agua"],
  ["gallito", "Riego y agua"],
  ["abrazadera", "Riego y agua"],
  ["anillo", "Riego y agua"],
  ["rollo", "Riego y agua"],
  ["union", "Riego y agua"],
  ["conexion", "Riego y agua"],
  ["coneccion", "Riego y agua"],
  ["conector", "Riego y agua"],
  ["llave", "Riego y agua"],
  ["tubo", "Riego y agua"],
  ["toma", "Riego y agua"],
  ["pozo", "Riego y agua"],
  ["agua", "Riego y agua"],
  ["riego", "Riego y agua"],
  ["pescad", "Animales y alimento"],
  ["pescao", "Animales y alimento"],
  ["cachama", "Animales y alimento"],
  ["bocachico", "Animales y alimento"],
  ["alimento", "Animales y alimento"],
  ["tripa", "Animales y alimento"],
  ["pollo", "Animales y alimento"],
  ["herramienta", "Herramientas y dotación"],
  ["heramienta", "Herramientas y dotación"],
  ["carretilla", "Herramientas y dotación"],
  ["soldar", "Herramientas y dotación"],
  ["maquinita", "Herramientas y dotación"],
  ["pala", "Herramientas y dotación"],
  ["lima", "Herramientas y dotación"],
  ["martillo", "Herramientas y dotación"],
  ["tenaza", "Herramientas y dotación"],
  ["barreton", "Herramientas y dotación"],
  ["guaya", "Herramientas y dotación"],
  ["neverita", "Herramientas y dotación"],
  ["platera", "Herramientas y dotación"],
  ["banquito", "Herramientas y dotación"],
  ["gancho", "Herramientas y dotación"],
  ["alambre", "Herramientas y dotación"]
];

// ----------------------------------------------------------------------------
//  TABLAS Y CAMPOS
//  tipo: texto | numero | fecha | lista | animal | notas
//  Cada tabla es una pestaña en la hoja de Google (se crea sola la primera vez).
//  visibleSi: (registro) => true/false  -> muestra/oculta el campo según otros valores
// ----------------------------------------------------------------------------
export const TABLAS = {
  gastos: {
    etiqueta: 'Gasto', plural: 'Gastos',
    campos: [
      { k: 'fecha', label: 'Fecha', tipo: 'fecha', defecto: 'hoy' },
      { k: 'quien', label: 'Quién pagó', tipo: 'lista', opciones: SOCIOS, req: true },
      { k: 'monto', label: 'Monto ($)', tipo: 'numero', req: true },
      { k: 'descripcion', label: 'Descripción', tipo: 'texto', req: true, ayuda: 'La categoría se asigna sola según lo que escribas.' },
      { k: 'categoria', label: 'Categoría (solo si quieres forzarla)', tipo: 'lista', opciones: [...CATEGORIAS_GASTO], opcional: true },
      { k: 'notas', label: 'Notas', tipo: 'notas' },
    ],
  },
  ingresos: {
    etiqueta: 'Ingreso', plural: 'Ingresos',
    campos: [
      { k: 'fecha', label: 'Fecha', tipo: 'fecha', defecto: 'hoy' },
      { k: 'quien', label: 'Quién cobró', tipo: 'lista', opciones: SOCIOS, req: true, ayuda: 'El socio que recibió el dinero. Cuenta para saber quién le debe a quién.' },
      { k: 'monto', label: 'Monto ($)', tipo: 'numero', req: true },
      { k: 'reparto', label: 'A quién corresponde', tipo: 'lista', opciones: REPARTOS, defecto: REPARTO_SOCIEDAD, req: true, ayuda: 'Normalmente es de la sociedad (mitad y mitad). Elige "Solo …" si es el dinero de un solo socio.' },
      { k: 'categoria', label: 'Tipo de ingreso', tipo: 'lista', opciones: [...CATEGORIAS_INGRESO], req: true, libre: true },
      { k: 'descripcion', label: 'Descripción', tipo: 'texto', req: true, ayuda: 'Por ejemplo: "venta de 2 becerros" o "leche de la semana".' },
      { k: 'animal', label: 'Animal vendido (opcional)', tipo: 'animal', visibleSi: r => r.categoria === 'Venta de ganado', ayuda: 'Si eliges uno, queda marcado como Vendido en su ficha.' },
      { k: 'cantidad', label: 'Cantidad (opcional)', tipo: 'numero' },
      { k: 'unidad', label: 'Unidad (opcional)', tipo: 'lista', opciones: ['litros', 'kg', 'unidades'], libre: true },
      { k: 'comprador', label: 'Comprador (opcional)', tipo: 'texto' },
      { k: 'notas', label: 'Notas', tipo: 'notas' },
    ],
  },
  ajustes: {                      // un solo registro (id "granja") con el nombre de la granja; se comparte entre los celulares
    etiqueta: 'Ajuste', plural: 'Ajustes',
    campos: [{ k: 'nombre', label: 'Nombre de la granja', tipo: 'texto' }],
  },
  animales: {
    etiqueta: 'Animal', plural: 'Animales',
    campos: [
      { k: 'nombre', label: 'Nombre', tipo: 'texto' },
      { k: 'arete', label: 'N.º identificador (único)', tipo: 'texto', req: true, ayuda: 'Número propio de cada animal (puede ser el de su arete). Con él se enlazan sus vacunas, ordeños, partos y fotos; no lo cambies después.' },
      { k: 'categoria', label: 'Categoría', tipo: 'lista', opciones: LISTAS.categoriaAnimal, req: true },
      { k: 'sexo', label: 'Sexo', tipo: 'lista', opciones: LISTAS.sexo, req: true },
      { k: 'raza', label: 'Raza', tipo: 'lista', opciones: LISTAS.raza, libre: true },
      { k: 'color', label: 'Color / señas', tipo: 'texto' },
      { k: 'fechaNac', label: 'Fecha de nacimiento', tipo: 'fecha' },
      { k: 'fechaIngreso', label: 'Fecha de ingreso', tipo: 'fecha' },
      { k: 'propietario', label: 'Propietario', tipo: 'lista', opciones: LISTAS.propietario, libre: true, defecto: 'Sociedad Omar y Kirwuin', ayuda: 'Si el animal es de otra persona, no entra en la sociedad.' },
      { k: 'origen', label: 'Origen', tipo: 'lista', opciones: LISTAS.origen },
      { k: 'fechaCompra', label: 'Fecha de compra', tipo: 'fecha', visibleSi: r => r.origen === 'Comprado' },
      { k: 'precio', label: 'Precio de compra (USD)', tipo: 'numero', visibleSi: r => r.origen === 'Comprado' },
      { k: 'vendedor', label: 'Comprado a (vendedor)', tipo: 'texto', visibleSi: r => r.origen === 'Comprado' },
      { k: 'peso', label: 'Peso al comprar (kg)', tipo: 'numero', visibleSi: r => r.origen === 'Comprado' },
      { k: 'madre', label: 'Madre (N.º)', tipo: 'animal' },
      { k: 'padre', label: 'Padre (N.º)', tipo: 'animal' },
      { k: 'estado', label: 'Estado', tipo: 'lista', opciones: LISTAS.estadoAnimal, defecto: 'Activo' },
      { k: 'fechaSalida', label: 'Fecha de salida', tipo: 'fecha', visibleSi: r => r.estado === 'Vendido' || r.estado === 'Muerto' },
      { k: 'notas', label: 'Observaciones', tipo: 'notas' },
    ],
  },
  fotos: {
    etiqueta: 'Foto', plural: 'Fotos',
    // La imagen no es un campo: la miniatura (miniatura) y la referencia a Drive (driveId) las maneja js/fotos.js
    campos: [
      { k: 'animal', label: 'Animal', tipo: 'animal', req: true },
      { k: 'fecha', label: 'Fecha de la foto', tipo: 'fecha', req: true, defecto: 'hoy' },
      { k: 'nota', label: 'Nota (opcional)', tipo: 'texto', ayuda: 'Por ejemplo: "recién llegada", "después del parto".' },
    ],
  },
  leche: {
    etiqueta: 'Ordeño', plural: 'Ordeños',
    campos: [
      { k: 'fecha', label: 'Fecha', tipo: 'fecha', defecto: 'hoy', req: true },
      { k: 'animal', label: 'Animal', tipo: 'animal', req: true },
      { k: 'manana', label: 'Mañana (L)', tipo: 'numero' },
      { k: 'tarde', label: 'Tarde (L)', tipo: 'numero' },
      { k: 'notas', label: 'Notas', tipo: 'notas' },
    ],
  },
  sanidad: {
    etiqueta: 'Aplicación', plural: 'Sanidad',
    campos: [
      { k: 'fecha', label: 'Fecha', tipo: 'fecha', defecto: 'hoy', req: true },
      { k: 'animal', label: 'Animal', tipo: 'animal', req: true },
      { k: 'tipo', label: 'Tipo', tipo: 'lista', opciones: LISTAS.tipoSanidad, req: true },
      { k: 'producto', label: 'Producto / enfermedad', tipo: 'texto' },
      { k: 'dosis', label: 'Dosis', tipo: 'texto' },
      { k: 'aplico', label: 'Aplicó / veterinario', tipo: 'texto' },
      { k: 'costo', label: 'Costo ($) (informativo)', tipo: 'numero' },
      { k: 'repetirDias', label: 'Repetir en (días)', tipo: 'numero', ayuda: 'Si lo llenas, la app calcula la próxima fecha y avisa.' },
      { k: 'notas', label: 'Notas', tipo: 'notas' },
    ],
  },
  reproduccion: {
    etiqueta: 'Evento', plural: 'Reproducción',
    campos: [
      { k: 'fecha', label: 'Fecha', tipo: 'fecha', defecto: 'hoy', req: true },
      { k: 'animal', label: 'Hembra', tipo: 'animal', req: true, soloHembras: true },
      { k: 'evento', label: 'Evento', tipo: 'lista', opciones: LISTAS.evento, req: true },
      { k: 'toro', label: 'Toro / semen usado', tipo: 'texto', visibleSi: r => r.evento === 'Monta' || r.evento === 'Inseminación' },
      { k: 'partoProbable', label: 'Parto probable (si lo sabes)', tipo: 'fecha', visibleSi: r => ['Monta', 'Inseminación', 'Preñez confirmada'].includes(r.evento), ayuda: 'En Monta/Inseminación se calcula solo; úsalo si compraron la vaca ya preñada.' },
      { k: 'cria', label: 'N.º de la cría', tipo: 'texto', visibleSi: r => r.evento === 'Parto', ayuda: 'Después registra la cría como animal nuevo (con su madre).' },
      { k: 'sexoCria', label: 'Sexo de la cría', tipo: 'lista', opciones: LISTAS.sexo, visibleSi: r => r.evento === 'Parto' },
      { k: 'resultado', label: 'Resultado', tipo: 'lista', opciones: LISTAS.resultadoCria, visibleSi: r => r.evento === 'Parto' },
      { k: 'notas', label: 'Notas', tipo: 'notas' },
    ],
  },
};
