/**
 * Stealth Loader — pantalla de càrrega fake camuflada.
 *
 * S'activa només si:
 *   - hi ha una disfressa activa (localStorage 'transitem-disguise')
 *   - la URL no conté ?nostealth=1
 *
 * Mostra una pantalla de "descarregant dades" amb una barra que avança ràpid
 * i després s'alenteix. L'única manera d'entrar a l'app real és arrossegar
 * la barra de progrés fins al principi (esquerra, < 5%).
 *
 * Autocontingut: depèn només de window.Stealth (carregat per stealth.js).
 */
(function () {
  'use strict';

  function removePreHide() {
    var p = document.getElementById('stealth-prehide');
    if (p) p.remove();
  }

  // No fer res si no hi ha disfressa o si testing
  var qs = new URLSearchParams(location.search);
  if (qs.get('nostealth') === '1') { removePreHide(); return; }
  var current = (window.Stealth && window.Stealth.current && window.Stealth.current()) || null;
  if (!current) { removePreHide(); return; }

  // El loader fake només té sentit quan l'app s'obre INSTAL·LADA (standalone).
  // Al navegador la URL ja revela transitem.cat, així que el camuflatge no hi
  // aporta. La disfressa (manifest, icones) sí s'aplica sempre per consistència.
  // Bypass: ?stealthforce=1 per provar el loader al navegador durant desenvolupament.
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                     window.navigator.standalone === true;
  if (!isStandalone && qs.get('stealthforce') !== '1') { removePreHide(); return; }

  var DISGUISE_LABELS = {
    calculadora: { name: 'Calculadora', bg: '#2c3e50', fg: '#ecf0f1', icon: 'stealth/icones/calculadora-192.png' },
    notes:       { name: 'Notes',       bg: '#fbbf24', fg: '#451a03', icon: 'stealth/icones/notes-192.png' },
    meteo:       { name: 'Meteo',       bg: '#3b82f6', fg: '#ffffff', icon: 'stealth/icones/meteo-192.png' },
    receptes:    { name: 'Receptes',    bg: '#ea580c', fg: '#ffffff', icon: 'stealth/icones/receptes-192.png' },
  };
  var info = DISGUISE_LABELS[current];
  if (!info) return;

  var STATUS_MESSAGES = [
    'Establint connexió segura...',
    'Verificant credencials del dispositiu...',
    'Descarregant base de dades local...',
    'Sincronitzant fitxers...',
    'Verificant integritat dels paquets...',
    'Aplicant actualitzacions...',
    'Optimitzant cache...',
    'Carregant preferències...',
    'Comprovant servidor...',
    'Quasi a punt...',
  ];

  var SERVERS = ['eu-west-1', 'eu-central-2', 'eu-south-1'];
  var TOTAL_MB = (Math.random() * 24 + 18).toFixed(1);
  var TOTAL_FILES = Math.floor(Math.random() * 200 + 380);
  var serverLabel = SERVERS[Math.floor(Math.random() * SERVERS.length)];
  var version = 'v3.' + Math.floor(Math.random() * 6 + 2) + '.' + Math.floor(Math.random() * 12);

  // Inject overlay tan aviat com hi hagi <body>. Si encara no hi és, espera.
  function inject() {
    if (!document.body) return setTimeout(inject, 0);

    var loader = document.createElement('div');
    loader.className = 'stealth-loader';
    loader.style.setProperty('--sl-bg', info.bg);
    loader.style.setProperty('--sl-fg', info.fg);
    loader.innerHTML = [
      '<div class="sl-app-name">',
      '  <img class="sl-app-icon" src="' + info.icon + '" alt="">',
      '  <span>' + info.name + '</span>',
      '</div>',
      '<div class="sl-version">' + version + '</div>',
      '<div class="sl-status" data-sl-status>Iniciant...</div>',
      '<div class="sl-bar-wrap">',
      '  <div class="sl-bar-track" data-sl-track>',
      '    <div class="sl-bar-fill" data-sl-fill></div>',
      '  </div>',
      '  <div class="sl-bar-handle" data-sl-handle></div>',
      '</div>',
      '<div class="sl-meta">',
      '  <span data-sl-bytes>0.0 MB / ' + TOTAL_MB + ' MB</span>',
      '  <span data-sl-files>0 / ' + TOTAL_FILES + ' fitxers</span>',
      '</div>',
      '<div class="sl-server">Servidor: ' + serverLabel + ' · ' + version + '</div>',
    ].join('');

    document.body.appendChild(loader);
    // Treure el pre-hide aplicat per stealth.js: el loader ja tapa l'app
    removePreHide();

    var elStatus = loader.querySelector('[data-sl-status]');
    var elFill = loader.querySelector('[data-sl-fill]');
    var elHandle = loader.querySelector('[data-sl-handle]');
    var elTrack = loader.querySelector('[data-sl-track]');
    var elBytes = loader.querySelector('[data-sl-bytes]');
    var elFiles = loader.querySelector('[data-sl-files]');

    var progress = 0;        // 0-100
    var displayed = 0;       // valor renderitzat
    var dragging = false;
    var msgIndex = 0;

    function setVisual(p) {
      elFill.style.width = p + '%';
      elHandle.style.left = p + '%';
      var mb = (p / 100 * TOTAL_MB).toFixed(1);
      var files = Math.floor(p / 100 * TOTAL_FILES);
      elBytes.textContent = mb + ' MB / ' + TOTAL_MB + ' MB';
      elFiles.textContent = files + ' / ' + TOTAL_FILES + ' fitxers';
    }

    function rotateStatus() {
      msgIndex = (msgIndex + 1) % STATUS_MESSAGES.length;
      elStatus.textContent = STATUS_MESSAGES[msgIndex];
    }
    elStatus.textContent = STATUS_MESSAGES[0];
    var statusTimer = setInterval(rotateStatus, 1400);

    // Auto-progrés: ràpid fins 70%, lent fins 95%, ralentit fins 99%
    var lastTick = Date.now();
    var TICK_MS = 50;
    var tickTimer = setInterval(function () {
      if (dragging) { lastTick = Date.now(); return; }
      var now = Date.now();
      var dt = Math.min((now - lastTick) / 1000, TICK_MS / 500);
      lastTick = now;
      var speed;
      if (progress < 70) speed = 55;
      else if (progress < 95) speed = 6;
      else if (progress < 99) speed = 0.7;
      else speed = 0.05;
      progress = Math.min(99.5, progress + speed * dt);
      displayed = progress;
      setVisual(displayed);
    }, TICK_MS);

    // Drag handler
    function pctFromEvent(ev) {
      var rect = elTrack.getBoundingClientRect();
      var x = (ev.clientX != null ? ev.clientX : (ev.touches && ev.touches[0] ? ev.touches[0].clientX : 0));
      var p = ((x - rect.left) / rect.width) * 100;
      return Math.max(0, Math.min(100, p));
    }

    function onPointerDown(ev) {
      ev.preventDefault();
      dragging = true;
      elHandle.classList.add('is-dragging');
      elHandle.setPointerCapture && elHandle.setPointerCapture(ev.pointerId);
    }
    function onPointerMove(ev) {
      if (!dragging) return;
      ev.preventDefault();
      var p = pctFromEvent(ev);
      displayed = p;
      setVisual(p);
      if (p < 5) {
        // Unlock!
        unlock();
      }
    }
    function onPointerUp(ev) {
      if (!dragging) return;
      dragging = false;
      elHandle.classList.remove('is-dragging');
      // Si no ha desbloquejat, retorna a la posició auto
      if (displayed >= 5) {
        displayed = progress;
        setVisual(displayed);
      }
    }

    elHandle.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    function unlock() {
      clearInterval(tickTimer);
      clearInterval(statusTimer);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      loader.style.transition = 'opacity 0.25s ease';
      loader.style.opacity = '0';
      setTimeout(function () { loader.remove(); }, 280);
    }
  }

  inject();
})();
