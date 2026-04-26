// Transitem.cat — Service Worker
// Versió: bumpa-la a cada release amb canvis trencadors a CORE/ASSETS.
// Lògica completa a /shared/js/sw-template.js (importScripts).
importScripts('./shared/js/sw-template.js');

// Bypass del SW per a tots els recursos de la capa stealth.
// Aquestes icones canvien quan l'usuari tria disfressa (i les regenerem).
// Si el SW les cacheja, Chrome agafa versions antigues quan instal·la la PWA
// i la icona a l'escriptori queda desactualitzada. Anant directes a network,
// el query string ?v=N garanteix versions fresques.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  try {
    const url = new URL(e.request.url);
    if (url.origin === self.location.origin && url.pathname.startsWith('/stealth/')) {
      e.respondWith(fetch(e.request));
    }
  } catch (_) {}
});

buildSW({
  cacheName: 'transitem-v37',

  // Fitxers que canvien sovint → network-first amb timeout 2.5s
  core: [
    './',
    './index.html',
    './app.config.js',
    './recursos.js'
  ],

  // Fitxers estables → cache-first
  assets: [
    './favicon.svg',
    './imatges/icon-180.png',
    './imatges/icon-192.png',
    './imatges/icon-512.png',
    './imatges/icon-maskable-512.png',
    './data/cat-municipis.json',
    './data/es-municipalities.json',
    './data/cn-po.geojson',
    './data/cn-communes.geojson',
    './data/andorra.geojson',
    './data/andorra-parroquies.geojson',
    './data/alguer.geojson',
    './data/context-sardenya-corsega.geojson'
  ]
});
