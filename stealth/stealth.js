/**
 * Stealth — capa de disfressa per a Transitem.
 * Permet a l'usuari triar una icona i nom alternatiu (Calculadora, Notes,
 * Meteo, Receptes) per la PWA, perquè la presència de l'app instal·lada al
 * dispositiu no reveli que es tracta d'un recurs trans.
 *
 * Aquest mòdul és AUTOCONTINGUT: no depèn de /shared/ i no toca cap altre
 * fitxer del projecte. S'activa només si l'usuari obre el selector i tria
 * una disfressa.
 *
 * IMPORTANT: el script s'ha de carregar al <head> SENSE defer, perquè el
 * swap del manifest i les icones es faci abans que el navegador les llegeixi.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'transitem-disguise';
  var BASE = 'stealth/';
  // Bumpa això cada cop que regenerem les icones (notes/receptes), per forçar
  // Chrome a invalidar la cache d'icones del manifest. Es propaga al manifest
  // data URL, així Chrome el veu com a diferent i re-baixa les imatges.
  var ICON_VERSION = '4';

  var DISGUISES = {
    calculadora: {
      label: 'Calculadora',
      title: 'Calculadora',
      bg: '#2c3e50',
      icon192: 'icones/calculadora-192.png',
      icon512: 'icones/calculadora-512.png',
      icon180: 'icones/calculadora-180.png',
      manifest: 'manifests/calculadora.json',
    },
    notes: {
      label: 'Notes',
      title: 'Notes',
      bg: '#fbbf24',
      icon192: 'icones/notes-192.png',
      icon512: 'icones/notes-512.png',
      icon180: 'icones/notes-180.png',
      manifest: 'manifests/notes.json',
    },
    meteo: {
      label: 'Meteo',
      title: 'Meteo',
      bg: '#3b82f6',
      icon192: 'icones/meteo-192.png',
      icon512: 'icones/meteo-512.png',
      icon180: 'icones/meteo-180.png',
      manifest: 'manifests/meteo.json',
    },
    receptes: {
      label: 'Receptes',
      title: 'Receptes',
      bg: '#ea580c',
      icon192: 'icones/receptes-192.png',
      icon512: 'icones/receptes-512.png',
      icon180: 'icones/receptes-180.png',
      manifest: 'manifests/receptes.json',
    },
  };

  function readChoice() {
    try { return localStorage.getItem(STORAGE_KEY) || null; } catch (e) { return null; }
  }
  function writeChoice(v) {
    try {
      if (v) localStorage.setItem(STORAGE_KEY, v);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  // Construeix un manifest inline amb paths absoluts (no depèn de cap fitxer
  // extern). El navegador rep aquest manifest com a data URL i l'aplica
  // immediatament, sense els problemes de cache que té amb fitxers externs
  // canviants.
  function buildManifestJSON(key) {
    var d = DISGUISES[key];
    var origin = location.origin + '/';
    var v = '?v=' + ICON_VERSION;
    return {
      name: d.title,
      short_name: d.title,
      description: d.title,
      start_url: origin,
      scope: origin,
      display: 'standalone',
      background_color: d.bg,
      theme_color: d.bg,
      orientation: 'portrait',
      icons: [
        { src: origin + BASE + d.icon192 + v, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: origin + BASE + d.icon512 + v, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: origin + BASE + 'icones/' + key + '-maskable.png' + v, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    };
  }

  function manifestDataUrl(key) {
    var json = JSON.stringify(buildManifestJSON(key));
    // btoa funciona amb ASCII, i el JSON dels manifests és ASCII (sense ñ ni accents).
    return 'data:application/manifest+json;base64,' + btoa(json);
  }

  // Retorna el <link rel="manifest"> creant-lo si no existeix. Important:
  // l'HTML NO declara cap <link rel="manifest"> per evitar que el navegador
  // faci pre-fetch del manifest abans que stealth.js apliqui la disfressa.
  function getOrCreateManifestLink() {
    var mf = document.querySelector('link[rel="manifest"]');
    if (!mf) {
      mf = document.createElement('link');
      mf.rel = 'manifest';
      (document.head || document.documentElement).appendChild(mf);
    }
    return mf;
  }

  function applyDisguise(key) {
    var d = DISGUISES[key];
    if (!d) return;
    // Manifest: inline com a data URL per garantir que Chrome el re-llegeix
    // sempre i no aplica cap cache del manifest anterior.
    var mf = getOrCreateManifestLink();
    mf.href = manifestDataUrl(key);
    var v = '?v=' + ICON_VERSION;
    // Apple touch icon
    var apple = document.querySelector('link[rel="apple-touch-icon"]');
    if (apple) apple.href = BASE + d.icon180 + v;
    // Favicons PNG
    var pngs = document.querySelectorAll('link[rel="icon"][type="image/png"]');
    pngs.forEach(function (l) {
      if ((l.getAttribute('sizes') || '').indexOf('512') !== -1) l.href = BASE + d.icon512 + v;
      else l.href = BASE + d.icon192 + v;
    });
    // Favicon SVG (fallback): el reemplacem per la PNG 192
    var svgIcon = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
    if (svgIcon) {
      svgIcon.type = 'image/png';
      svgIcon.href = BASE + d.icon192 + v;
    }
    // Title + apple title + theme color
    if (d.title) document.title = d.title;
    var appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', d.title);
    var theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.setAttribute('content', d.bg);
  }

  // 1. APLICACIÓ PRECOÇ (abans del primer paint si possible)
  // Cal crear sempre el <link rel="manifest"> aquí (l'HTML no el declara)
  // perquè la PWA sigui instal·lable. Apunta a manifest.json si no hi ha
  // disfressa, o al data URL inline si n'hi ha.
  var current = readChoice();
  if (current && DISGUISES[current]) {
    applyDisguise(current);
    // El pre-hide (camuflar contingut abans del loader) només té sentit en
    // standalone — al navegador no mostrem loader, per tant tampoc cal amagar.
    var qs = new URLSearchParams(location.search);
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;
    if ((isStandalone || qs.get('stealthforce') === '1') && qs.get('nostealth') !== '1') {
      var hideStyle = document.createElement('style');
      hideStyle.id = 'stealth-prehide';
      hideStyle.textContent =
        'html { background: ' + DISGUISES[current].bg + ' !important; }' +
        'body > *:not(.stealth-loader) { visibility: hidden !important; }';
      (document.head || document.documentElement).appendChild(hideStyle);
      setTimeout(function () {
        var p = document.getElementById('stealth-prehide');
        if (p) p.remove();
      }, 3000);
    }
  } else {
    // Sense disfressa: crear el <link rel="manifest"> apuntant al manifest
    // original perquè la PWA sigui instal·lable amb la icona de Transitem.
    var mfDefault = getOrCreateManifestLink();
    mfDefault.href = 'manifest.json';
  }

  // API pública: només `current()` és consumida des de fora (per
  // `loader.js` i `install-flow.js`). El selector built-in que hi havia
  // aquí era codi mort — el flux real d'instal·lació té el seu propi
  // selector a `install-flow.js > showStep2`.
  window.Stealth = {
    current: function () { return readChoice(); },
  };
})();
