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

  function applyDisguise(key) {
    var d = DISGUISES[key];
    if (!d) return;
    // Manifest
    var mf = document.querySelector('link[rel="manifest"]');
    if (mf) mf.href = BASE + d.manifest;
    // Apple touch icon
    var apple = document.querySelector('link[rel="apple-touch-icon"]');
    if (apple) apple.href = BASE + d.icon180;
    // Favicons PNG
    var pngs = document.querySelectorAll('link[rel="icon"][type="image/png"]');
    pngs.forEach(function (l) {
      if ((l.getAttribute('sizes') || '').indexOf('512') !== -1) l.href = BASE + d.icon512;
      else l.href = BASE + d.icon192;
    });
    // Favicon SVG (fallback): el reemplacem per la PNG 192
    var svgIcon = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
    if (svgIcon) {
      svgIcon.type = 'image/png';
      svgIcon.href = BASE + d.icon192;
    }
    // Title + apple title + theme color
    if (d.title) document.title = d.title;
    var appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', d.title);
    var theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.setAttribute('content', d.bg);
  }

  // 1. APLICACIÓ PRECOÇ (abans del primer paint si possible)
  var current = readChoice();
  if (current && DISGUISES[current]) {
    applyDisguise(current);
  }

  // 2. SELECTOR (UI)
  function openSelector() {
    if (document.getElementById('stealth-modal')) return;
    var ov = document.createElement('div');
    ov.id = 'stealth-modal';
    ov.className = 'stealth-overlay';
    ov.innerHTML = [
      '<div class="stealth-dialog" role="dialog" aria-label="Triar icona de disfressa">',
      '  <button class="stealth-close" aria-label="Tancar">×</button>',
      '  <h2>Disfressa de la icona</h2>',
      '  <p class="stealth-intro">Tria una icona i nom alternatius per a l\'app. Útil si vols que la teva pantalla d\'inici no reveli que tens una eina trans.</p>',
      '  <div class="stealth-grid">',
      '    <button class="stealth-opt" data-key="">',
      '      <div class="stealth-icon stealth-icon-default"></div>',
      '      <span>Transitem<small>(per defecte)</small></span>',
      '    </button>',
      Object.keys(DISGUISES).map(function (k) {
        var d = DISGUISES[k];
        return '<button class="stealth-opt" data-key="' + k + '">' +
          '<img class="stealth-icon" src="' + BASE + d.icon192 + '" alt="">' +
          '<span>' + d.label + '</span>' +
          '</button>';
      }).join(''),
      '  </div>',
      '  <p class="stealth-note"><strong>Important:</strong> Si ja tens l\'app instal·lada al dispositiu, hauràs de desinstal·lar-la i tornar-la a instal·lar des del navegador per veure la nova icona. Si encara no està instal·lada, tria primer i instal·la després.</p>',
      '</div>',
    ].join('');
    document.body.appendChild(ov);

    function close() { ov.remove(); }
    ov.addEventListener('click', function (e) {
      if (e.target === ov) close();
    });
    ov.querySelector('.stealth-close').addEventListener('click', close);

    var current = readChoice();
    ov.querySelectorAll('.stealth-opt').forEach(function (btn) {
      var k = btn.getAttribute('data-key');
      if ((k || '') === (current || '')) btn.classList.add('is-active');
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key') || null;
        writeChoice(key);
        // Reapliquem o restablim sense recarregar
        if (key && DISGUISES[key]) {
          applyDisguise(key);
        } else {
          // Restablir: més fiable amb una recàrrega
          location.reload();
          return;
        }
        close();
      });
    });
  }

  // 3. API pública
  window.Stealth = {
    open: openSelector,
    openSelector: openSelector,
    current: function () { return readChoice(); },
    list: function () { return Object.keys(DISGUISES); },
  };
})();
