// Transitem.cat — Service Worker
// Versió: bumpa-la a cada release amb canvis trencadors a CORE/ASSETS.
// Lògica completa a /shared/js/sw-template.js (importScripts).
importScripts('./shared/js/sw-template.js');

buildSW({
  cacheName: 'transitem-v4',

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
