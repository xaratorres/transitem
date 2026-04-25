/**
 * Stealth Diagnostic — secció "Estat tècnic" a Configuració.
 *
 * Mostra dades clau per saber si el mode incògnit està funcionant
 * correctament al dispositiu de l'usuari. Especialment útil al mòbil,
 * on no es pot obrir DevTools fàcilment.
 */
(function () {
  'use strict';

  var DISGUISE_LABELS = {
    calculadora: 'Calculadora',
    notes: 'Notes',
    meteo: 'Meteo',
    receptes: 'Receptes',
  };

  function row(label, value, ok) {
    var color = ok === true ? '#059669' : ok === false ? '#dc2626' : '#475569';
    var icon = ok === true ? '✓ ' : ok === false ? '⚠ ' : '';
    return '<div style="display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #e5e7eb;padding:4px 0">' +
      '<span>' + label + '</span>' +
      '<strong style="color:' + color + ';text-align:right">' + icon + value + '</strong>' +
      '</div>';
  }

  async function collect() {
    var standalone = window.matchMedia('(display-mode: standalone)').matches ||
                     window.navigator.standalone === true;
    var disguise = null;
    try { disguise = localStorage.getItem('transitem-disguise'); } catch (e) {}
    var disguiseLabel = disguise ? (DISGUISE_LABELS[disguise] || disguise) : 'cap (mode normal)';

    var swCacheNames = '?';
    try {
      var keys = await caches.keys();
      swCacheNames = keys.length ? keys.join(', ') : '(cap)';
    } catch (e) { swCacheNames = 'no disponible'; }

    var swCtrl = navigator.serviceWorker && navigator.serviceWorker.controller ? 'sí' : 'no';

    var manifestHref = document.querySelector('link[rel="manifest"]');
    manifestHref = manifestHref ? manifestHref.href : '(cap)';
    var manifestType = manifestHref.startsWith('data:') ? 'data URL (disfressa)'
                     : manifestHref.endsWith('manifest.json') ? 'manifest.json (normal)'
                     : manifestHref;

    var ua = navigator.userAgent;
    var browser = /Edg\//.test(ua) ? 'Edge'
                : /OPR\//.test(ua) ? 'Opera'
                : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
                : /Firefox/.test(ua) ? 'Firefox'
                : /Chrome/.test(ua) ? 'Chrome'
                : /Safari/.test(ua) ? 'Safari'
                : 'desconegut';
    var os = /Android/.test(ua) ? 'Android'
           : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
           : /Windows/.test(ua) ? 'Windows'
           : /Mac/.test(ua) ? 'macOS'
           : /Linux/.test(ua) ? 'Linux'
           : 'desconegut';

    return {
      disguise: disguiseLabel,
      hasDisguise: !!disguise,
      standalone: standalone,
      browser: browser,
      os: os,
      swCacheNames: swCacheNames,
      swCtrl: swCtrl,
      manifestType: manifestType,
    };
  }

  function expectedStandalone(d) {
    // Si té disfressa i diu instal·lada però no és standalone → problema
    return d.hasDisguise ? d.standalone : null;
  }

  async function render() {
    var list = document.getElementById('stealth-diag-list');
    if (!list) return;
    var d = await collect();
    var html = '';
    html += row('Disfressa activa', d.disguise, d.hasDisguise);
    html += row('App oberta com a standalone', d.standalone ? 'sí' : 'no',
                expectedStandalone(d));
    html += row('Manifest', d.manifestType);
    html += row('Navegador', d.browser);
    html += row('Sistema operatiu', d.os);
    html += row('Service Worker actiu', d.swCtrl, d.swCtrl === 'sí');
    html += row('Caches', d.swCacheNames);
    // Diagnòstic textual
    var diag = '';
    if (d.hasDisguise && !d.standalone) {
      diag = '<div style="margin-top:10px;padding:10px;background:#fef3c7;border-radius:8px;color:#92400e"><strong>Atenció:</strong> tens una disfressa activa però l\'app no està oberta com a app independent. Si has obert des de la pantalla d\'inici i veus la barra del navegador, vol dir que el teu navegador no ha creat una PWA real, sinó una drecera. Prova amb Chrome o un altre navegador.</div>';
    } else if (d.hasDisguise && d.standalone) {
      diag = '<div style="margin-top:10px;padding:10px;background:#dcfce7;border-radius:8px;color:#166534"><strong>Tot correcte:</strong> l\'app està oberta en mode incògnit i com a app independent.</div>';
    } else if (!d.hasDisguise && d.standalone) {
      diag = '<div style="margin-top:10px;padding:10px;background:#e0f2fe;border-radius:8px;color:#075985">L\'app està instal·lada en mode normal (sense disfressa).</div>';
    } else {
      diag = '<div style="margin-top:10px;padding:10px;background:#f3f4f6;border-radius:8px;color:#475569">Estàs al navegador, sense disfressa. Per provar el mode incògnit, instal·la l\'app.</div>';
    }
    list.innerHTML = html + diag;
  }

  function ensureVisible() {
    var section = document.getElementById('stealth-diag-section');
    if (!section) return;
    section.hidden = false;
    var btn = document.getElementById('stealth-diag-refresh');
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', render);
    }
    // Render lazy: només quan l'usuari obre el desplegable per primera vegada
    var details = document.getElementById('stealth-diag-details');
    if (details && !details.dataset.bound) {
      details.dataset.bound = '1';
      details.addEventListener('toggle', function () {
        if (details.open) render();
      });
    }
  }

  // Render inicial al boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureVisible);
  } else {
    ensureVisible();
  }

  window.StealthDiagnostic = { refresh: render };
})();
