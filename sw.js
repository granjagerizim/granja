// Service worker: guarda los archivos de la app para que abra sin señal.
// Estrategia: se sirve lo guardado al instante y se actualiza en segundo plano
// (los cambios a la app se ven la siguiente vez que se abre con señal; no hace falta cambiar versiones).
// Solo si se AGREGA un archivo nuevo a la app, añadirlo a ARCHIVOS para que quede disponible sin señal desde el primer uso.
const CACHE = 'granja-app';
const ARCHIVOS = [
  './', './index.html', './manifest.webmanifest', './css/app.css', './seed.json',
  './js/app.js', './js/config.js', './js/logic.js', './js/store.js', './js/sync.js', './js/ui.js', './js/fotos.js',
  './js/screens/inicio.js', './js/screens/gastos.js', './js/screens/leche.js', './js/screens/sanidad.js',
  './js/screens/animales.js', './js/screens/reproduccion.js', './js/screens/ajustes.js', './js/screens/fotos.js', './js/screens/ingresos.js',
  './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;          // lo de Google (sincronización) no se toca
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const guardado = await cache.match(req, { ignoreSearch: true });
    const red = fetch(req).then(r => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    if (guardado) { e.waitUntil(red); return guardado; }
    return (await red) || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  })());
});

// "Buscar actualización" (botón en Ajustes): vuelve a bajar todos los archivos de la app y los guarda; responde cuando termina.
self.addEventListener('message', e => {
  if (!e.data || e.data.tipo !== 'actualizar') return;
  e.waitUntil((async () => {
    let ok = true;
    try {
      const cache = await caches.open(CACHE);
      await Promise.all(ARCHIVOS.map(async a => { const r = await fetch(a, { cache: 'reload' }); if (!r.ok) throw new Error(a); await cache.put(a, r); }));
    } catch { ok = false; }
    e.source && e.source.postMessage({ tipo: 'actualizado', ok });
  })());
});
