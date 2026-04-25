/**
 * Stealth Install Flow — orquestració del flux d'instal·lació amb opció
 * de mode incògnit.
 *
 * Activat per `StealthInstall.start()` (cridat des del botó "Instal·lar"
 * de Configuració). Mostra un modal multipas:
 *
 *   1. "Vols mode incògnit?"
 *        Sí → pas 2  |  No → pas 3
 *   2. Selector de disfressa (Calculadora, Notes, Meteo, Receptes)
 *        Tria → guarda disfressa + reload (perquè el navegador llegeixi el
 *        nou manifest) → al reload, auto-resumeix al pas 3
 *   3. Instal·lació:
 *        - Android Chrome/Edge amb deferredPrompt: dispara SharedInstall.prompt()
 *        - iOS Safari: instruccions "Compartir > Afegir a la pantalla d'inici"
 *        - Altres: instruccions menú navegador
 *
 * Depèn de: window.Stealth (selector + apply), window.SharedInstall (prompt).
 */
(function () {
  'use strict';

  var FLAG_KEY = 'transitem-install-pending';
  var DISGUISE_KEY = 'transitem-disguise';
  var BASE = 'stealth/';

  var DISGUISES = {
    calculadora: { label: 'Calculadora', bg: '#2c3e50', fg: '#ffffff', icon: 'icones/calculadora-192.png' },
    notes:       { label: 'Notes',       bg: '#fbbf24', fg: '#451a03', icon: 'icones/notes-192.png' },
    meteo:       { label: 'Meteo',       bg: '#3b82f6', fg: '#ffffff', icon: 'icones/meteo-192.png' },
    receptes:    { label: 'Receptes',    bg: '#ea580c', fg: '#ffffff', icon: 'icones/receptes-192.png' },
  };

  function detectPlatform() {
    var ua = navigator.userAgent;
    var isIOS = /iphone|ipad|ipod/i.test(ua);
    var isAndroid = /android/i.test(ua);
    var isMobile = isIOS || isAndroid || /Mobi/i.test(ua);
    return { isIOS: isIOS, isAndroid: isAndroid, isMobile: isMobile };
  }

  function closeModal() {
    var m = document.getElementById('stealth-install-modal');
    if (m) m.remove();
  }

  function ensureModal() {
    closeModal();
    var ov = document.createElement('div');
    ov.id = 'stealth-install-modal';
    ov.className = 'stealth-overlay';
    ov.innerHTML = '<div class="stealth-dialog" role="dialog" aria-label="Instal·lar app"><button class="stealth-close" aria-label="Tancar">×</button><div class="stealth-body"></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeModal(); });
    ov.querySelector('.stealth-close').addEventListener('click', closeModal);
    return ov.querySelector('.stealth-body');
  }

  // ── PAS 1 ─────────────────────────────────────
  function showStep1() {
    var body = ensureModal();
    body.innerHTML = [
      '<h2>Instal·lar Transitem</h2>',
      '<p class="stealth-intro">Vols afegir l\'app al teu dispositiu en <strong>mode incògnit</strong>?</p>',
      '<p class="stealth-intro" style="margin-top:-8px">En mode incògnit, la icona i el nom de l\'app seran d\'una calculadora, notes, meteo o receptes — no es veurà que es tracta d\'una eina trans.</p>',
      '<div class="stealth-actions">',
      '  <button class="stealth-btn-primary" data-act="incognit">Sí, mode incògnit</button>',
      '  <button class="stealth-btn-secondary" data-act="normal">No, instal·lar normal</button>',
      '</div>',
    ].join('');
    body.querySelector('[data-act="incognit"]').addEventListener('click', showStep2);
    body.querySelector('[data-act="normal"]').addEventListener('click', function () {
      // Si abans hi havia disfressa, l'eliminem
      try { localStorage.removeItem(DISGUISE_KEY); } catch (e) {}
      // Si calia canviar de manifest, reload; si ja era el normal, anem directe
      var prev = (window.Stealth && window.Stealth.current && window.Stealth.current()) || null;
      if (prev) {
        try { localStorage.setItem(FLAG_KEY, '1'); } catch (e) {}
        location.reload();
      } else {
        proceedInstall(true);
      }
    });
  }

  // ── PAS 2 ─────────────────────────────────────
  function showStep2() {
    var body = ensureModal();
    var current = (window.Stealth && window.Stealth.current && window.Stealth.current()) || null;
    var grid = Object.keys(DISGUISES).map(function (k) {
      var d = DISGUISES[k];
      var active = (k === current) ? ' is-active' : '';
      return '<button class="stealth-opt' + active + '" data-key="' + k + '">' +
        '<img class="stealth-icon" src="' + BASE + d.icon + '" alt="">' +
        '<span>' + d.label + '</span></button>';
    }).join('');
    body.innerHTML = [
      '<h2>Tria una icona</h2>',
      '<p class="stealth-intro">Aquesta serà la icona i el nom que apareixerà a la pantalla d\'inici del teu dispositiu.</p>',
      '<div class="stealth-grid">', grid, '</div>',
      '<div class="stealth-actions">',
      '  <button class="stealth-btn-secondary" data-act="back">Enrere</button>',
      '</div>',
    ].join('');
    body.querySelectorAll('.stealth-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        try { localStorage.setItem(DISGUISE_KEY, key); } catch (e) {}
        try { localStorage.setItem(FLAG_KEY, '1'); } catch (e) {}
        // Cal reload perquè el navegador llegeixi el manifest nou abans del prompt
        location.reload();
      });
    });
    body.querySelector('[data-act="back"]').addEventListener('click', showStep1);
  }

  // ── PAS 3: instal·lació ──────────────────────
  // fromGesture=true si la crida ve directament d'un click de l'usuari
  // (necessari per poder cridar SharedInstall.prompt() sense bloqueig).
  function proceedInstall(fromGesture) {
    var st = window.SharedInstall && window.SharedInstall.getState();
    var plat = detectPlatform();
    var current = (window.Stealth && window.Stealth.current && window.Stealth.current()) || null;

    if (st && st.installed) {
      showAlreadyInstalled(current);
      return;
    }

    if (st && st.hasDeferredPrompt) {
      if (fromGesture) {
        // Crida directa: tenim user gesture, podem disparar prompt natiu
        closeModal();
        window.SharedInstall.prompt().then(function (r) {
          if (r && r.outcome !== 'accepted') showInstructions(plat, current, true);
        }).catch(function () { showInstructions(plat, current, true); });
      } else {
        // Sense gesture (auto-resume després de reload): cal un click intermedi
        showPromptReady(current);
      }
      return;
    }

    // Cap prompt natiu disponible → instruccions
    showInstructions(plat, current, false);
  }

  function showPromptReady(current) {
    var body = ensureModal();
    var iconSrc = current ? (BASE + DISGUISES[current].icon) : 'imatges/icon-192.png?v=1';
    var name = current ? DISGUISES[current].label : 'Transitem';
    body.innerHTML = [
      '<h2>A punt per instal·lar</h2>',
      '<div class="stealth-install-preview">',
      '  <img src="' + iconSrc + '" alt="" class="stealth-install-icon">',
      '  <div class="stealth-install-name">' + name + '</div>',
      '</div>',
      '<p class="stealth-intro">Premsa el botó per instal·lar l\'app. El navegador et demanarà confirmació.</p>',
      '<div class="stealth-actions">',
      '  <button class="stealth-btn-primary" data-act="install">Instal·lar ara</button>',
      '  <button class="stealth-btn-secondary" data-act="manual">Veure instruccions manuals</button>',
      '</div>',
    ].join('');
    var plat = detectPlatform();
    body.querySelector('[data-act="install"]').addEventListener('click', function () {
      // Aquest click SÍ és user gesture
      closeModal();
      window.SharedInstall.prompt().then(function (r) {
        if (r && r.outcome !== 'accepted') showInstructions(plat, current, true);
      }).catch(function () { showInstructions(plat, current, true); });
    });
    body.querySelector('[data-act="manual"]').addEventListener('click', function () {
      showInstructions(plat, current, false);
    });
  }

  function showAlreadyInstalled(current) {
    var body = ensureModal();
    body.innerHTML = [
      '<h2>Ja la tens instal·lada</h2>',
      '<p class="stealth-intro">L\'app Transitem ja està al teu dispositiu.',
      current ? ' La icona actual és <strong>' + DISGUISES[current].label + '</strong>.' : '',
      '</p>',
      '<p class="stealth-note"><strong>Per canviar la icona:</strong> desinstal·la l\'app del dispositiu i torna a fer aquest procés triant una altra opció.</p>',
      '<div class="stealth-actions"><button class="stealth-btn-primary" data-act="ok">Entesos</button></div>',
    ].join('');
    body.querySelector('[data-act="ok"]').addEventListener('click', closeModal);
  }

  function showInstructions(plat, current, wasDismissed) {
    var body = ensureModal();
    var iconSrc = current ? (BASE + DISGUISES[current].icon) : 'imatges/icon-192.png?v=1';
    var name = current ? DISGUISES[current].label : 'Transitem';
    var title = wasDismissed ? 'Has cancel·lat la instal·lació' : 'Com instal·lar';
    var intro;
    if (plat.isIOS) {
      intro = 'Al teu iPhone/iPad:';
    } else if (plat.isAndroid) {
      intro = 'Al teu mòbil Android:';
    } else {
      intro = 'Al teu navegador d\'escriptori:';
    }
    var steps;
    if (plat.isIOS) {
      steps = [
        'Toca el botó <strong>Compartir</strong> (la fletxa amunt) a la barra inferior de Safari.',
        'Desplaça\'t i tria <strong>"Afegir a la pantalla d\'inici"</strong>.',
        'Confirma. La icona <strong>' + name + '</strong> apareixerà a la pantalla d\'inici.',
      ];
    } else if (plat.isAndroid) {
      steps = [
        'Obre el menú del navegador (els tres punts <strong>⋮</strong>).',
        'Tria <strong>"Instal·lar aplicació"</strong> o <strong>"Afegir a la pantalla d\'inici"</strong>.',
        'Confirma. La icona <strong>' + name + '</strong> apareixerà a la pantalla d\'inici.',
      ];
    } else {
      steps = [
        'A la barra d\'adreces, busca la icona d\'<strong>instal·lació</strong> (un monitor amb una fletxa) o obre el menú <strong>⋮</strong>.',
        'Tria <strong>"Instal·lar Transitem"</strong> o <strong>"Crear drecera"</strong>.',
        'L\'app s\'obrirà com a finestra independent i tindrà la icona <strong>' + name + '</strong>.',
      ];
    }
    body.innerHTML = [
      '<h2>' + title + '</h2>',
      '<div class="stealth-install-preview">',
      '  <img src="' + iconSrc + '" alt="" class="stealth-install-icon">',
      '  <div class="stealth-install-name">' + name + '</div>',
      '</div>',
      '<p class="stealth-intro">' + intro + '</p>',
      '<ol class="stealth-steps">',
      steps.map(function (s) { return '<li>' + s + '</li>'; }).join(''),
      '</ol>',
      current ? '<p class="stealth-note"><strong>Important:</strong> al menú del navegador veuràs el nom <strong>' + name + '</strong>, no "Transitem". Aquesta és la disfressa que has triat.</p>' : '',
      '<div class="stealth-actions"><button class="stealth-btn-primary" data-act="ok">Entesos</button></div>',
    ].join('');
    body.querySelector('[data-act="ok"]').addEventListener('click', closeModal);
  }

  // ── Inici ─────────────────────────────────────
  function start() {
    showStep1();
  }

  // Auto-resume després de reload (després de pas 2 o canvi a "normal")
  function autoResume() {
    var pending;
    try { pending = localStorage.getItem(FLAG_KEY) === '1'; } catch (e) { pending = false; }
    if (!pending) return;
    try { localStorage.removeItem(FLAG_KEY); } catch (e) {}
    // Esperem que SharedInstall hagi tingut temps de capturar beforeinstallprompt
    setTimeout(proceedInstall, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoResume);
  } else {
    autoResume();
  }

  window.StealthInstall = { start: start };
})();
