/* install-banner.js — banner flotant per promoció d'install (Ciutadata pattern).
 *
 * Auto-detecció: si NO existeix `#install-banner` al DOM, no fa res
 * (mòdul opcional; només els projectes que el vulguin tenen el HTML).
 *
 * Cooperació amb install-prompt.js:
 *  - SharedInstall gestiona la state machine (deferredPrompt, isIOS, etc.)
 *  - Aquest mòdul escolta `install:state-change` per actualitzar el text
 *  - El click "Afegir" crida SharedInstall.prompt()
 *  - `appinstalled` (via state-change amb installed=true) → amaga banner
 *
 * Markup esperat (cada projecte el manté inline; CSS també):
 *   <div id="install-banner" hidden>
 *     <img src="..." alt="...">
 *     <div id="install-banner-text"><span id="install-banner-msg"></span></div>
 *     <button id="install-btn">Afegir</button>
 *     <button id="install-dismiss">✕</button>
 *   </div>
 *
 * El banner NO s'inicia automàticament — el projecte decideix quan cridar
 * SharedInstallBanner.start() (típicament: al boot si onboarding ja vist,
 * o al click "Entesos" de l'onboarding).
 *
 * API:
 *   window.SharedInstallBanner.start(delayMs)  — programa mostrar banner
 *   window.SharedInstallBanner.show()          — mostra immediat
 *   window.SharedInstallBanner.hide(remember)  — amaga (remember=marca seen)
 *   window.SharedInstallBanner.pause()         — pausa el setTimeout pendent
 *   window.SharedInstallBanner.resume()        — reprèn després de pause
 *   window.SharedInstallBanner.hideTemp()      — amaga temporalment (modal open)
 *   window.SharedInstallBanner.showTemp()      — torna a mostrar (modal close)
 *
 * Configuració via APP_CONFIG.installBanner:
 *   delayMs:        7000                        (default; ms abans de mostrar)
 *   bannerId:       'install-banner'            (default; selector arrel)
 *   msgId:          'install-banner-msg'        (default)
 *   btnId:          'install-btn'               (default)
 *   dismissId:      'install-dismiss'           (default)
 *   showClass:      'show'                       (default; classe per mostrar)
 *   seenKey:        '<prefix>-install-banner-seen' (default; key localStorage)
 *   iosMessage:     '<HTML>'                     (default messatge per iOS)
 *   androidMessage: '<HTML>'                     (default messatge per Android)
 *   transitionMs:   500                          (default; ms de la animació hide)
 */
(function () {
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.installBanner) || {};
  const meta = (window.APP_CONFIG && window.APP_CONFIG.meta) || {};

  const BANNER_ID = cfg.bannerId || 'install-banner';
  const MSG_ID = cfg.msgId || 'install-banner-msg';
  const BTN_ID = cfg.btnId || 'install-btn';
  const DISMISS_ID = cfg.dismissId || 'install-dismiss';
  const SHOW_CLASS = cfg.showClass || 'show';
  const DELAY_MS = cfg.delayMs || 7000;
  const TRANSITION_MS = cfg.transitionMs || 500;
  const SEEN_KEY = cfg.seenKey || `${meta.storagePrefix || 'app'}-install-banner-seen`;
  const IOS_MSG = cfg.iosMessage || 'A iPhone toca <strong>compartir</strong> i <em>"Afegir a la pantalla d\'inici"</em>';
  const ANDROID_MSG = cfg.androidMessage || 'Per afegir com a app selecciona el botó d\'instal·lació';

  const banner = document.getElementById(BANNER_ID);
  if (!banner) return; // No banner DOM → no-op

  const msg = document.getElementById(MSG_ID);
  const btn = document.getElementById(BTN_ID);
  const dismiss = document.getElementById(DISMISS_ID);

  function isSeen() {
    try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (_) { return false; }
  }
  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (_) {}
  }
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  let bannerTimer = null;
  let bannerStart = null;
  let bannerRemaining = DELAY_MS;
  let tempHidden = false;

  function show() {
    if (isStandalone() || isSeen()) return;
    bannerStart = null;
    banner.hidden = false;
    requestAnimationFrame(() => banner.classList.add(SHOW_CLASS));
  }

  function hide(remember) {
    bannerStart = null;
    banner.classList.remove(SHOW_CLASS);
    if (remember) markSeen();
    setTimeout(() => { banner.hidden = true; }, TRANSITION_MS);
  }

  function start(delay) {
    if (isStandalone() || isSeen()) return;
    if (bannerTimer !== null) clearTimeout(bannerTimer);
    bannerRemaining = typeof delay === 'number' ? delay : DELAY_MS;
    bannerStart = Date.now();
    bannerTimer = setTimeout(show, bannerRemaining);
  }

  function pause() {
    if (bannerTimer === null) return;
    clearTimeout(bannerTimer);
    bannerRemaining = Math.max(0, bannerRemaining - (Date.now() - bannerStart));
    bannerTimer = null;
  }

  function resume() {
    if (bannerTimer !== null || bannerStart === null) return;
    bannerStart = Date.now();
    bannerTimer = setTimeout(show, bannerRemaining);
  }

  function hideTemp() {
    if (!banner.classList.contains(SHOW_CLASS)) return;
    banner.classList.remove(SHOW_CLASS);
    tempHidden = true;
  }

  function showTemp() {
    if (!tempHidden) return;
    tempHidden = false;
    requestAnimationFrame(() => banner.classList.add(SHOW_CLASS));
  }

  // ── Cooperació amb SharedInstall ─────────────────────
  function applyState(state) {
    if (!state) return;
    if (state.installed || state.isStandalone) {
      hide(true);
      return;
    }
    if (state.isIOS) {
      if (msg) msg.innerHTML = IOS_MSG;
      if (btn) btn.style.display = 'none';
    } else if (state.hasDeferredPrompt) {
      if (msg) msg.innerHTML = ANDROID_MSG;
      if (btn) btn.style.display = '';
    }
  }

  // Estat inicial al boot
  if (window.SharedInstall) applyState(window.SharedInstall.getState());

  // Reaccionar a canvis (beforeinstallprompt arriba, appinstalled, etc.)
  document.addEventListener('install:state-change', e => applyState(e.detail));

  // Click "Afegir" → prompt natiu
  if (btn) btn.addEventListener('click', async () => {
    if (!window.SharedInstall) return;
    const r = await window.SharedInstall.prompt();
    if (r && r.outcome === 'accepted') hide(true);
  });

  // Dismiss → amaga + recorda
  if (dismiss) dismiss.addEventListener('click', () => hide(true));

  window.SharedInstallBanner = { start, show, hide, pause, resume, hideTemp, showTemp };
})();
