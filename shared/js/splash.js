/* splash.js — gestió genèrica del splash screen.
 *
 * Comportament:
 *  - Si troba `#splash` al DOM, hi munta listeners per dismiss-via-click
 *    i un timeout d'auto-dismiss.
 *  - Si `sessionStorage[${prefix}-skip-splash]` és '1', dismiss immediat
 *    (cas: SW update reload — Ciutadata pattern, evita splash dues vegades).
 *  - El dismiss afegeix `.out` al splash; després d'un delay curt el
 *    treu del DOM perquè no segueixi capturant clics ni recursos.
 *  - Emet event `splash:dismiss` perquè els projectes puguin reaccionar
 *    (ex: dispar onboarding modal després del splash).
 *
 * El CSS del splash és per-projecte (varia massa: Transitem té split-bg
 * blue/pink amb Playfair, Denunciem té Inter amb dos spans coloreats).
 * Aquest mòdul només gestiona la LÒGICA.
 *
 * Personalització via APP_CONFIG (totes opcionals):
 *   splash: {
 *     autoDismissMs: 2400,     // auto-dismiss timeout (default)
 *     removeAfterMs: 1300,     // ms abans de remove() del DOM (default)
 *     selector: '#splash',     // selector del splash (default)
 *     outClass: 'out'          // classe que activa la transició out (default)
 *   }
 *
 * API exposada:
 *   window.SharedSplash.dismiss()    — dismiss manual (idempotent)
 *   window.SharedSplash.isDismissed() — estat
 */
(function () {
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.splash) || {};
  const meta = (window.APP_CONFIG && window.APP_CONFIG.meta) || {};

  const SELECTOR = cfg.selector || '#splash';
  const OUT_CLASS = cfg.outClass || 'out';
  const AUTO_DISMISS_MS = cfg.autoDismissMs || 2400;
  const REMOVE_AFTER_MS = cfg.removeAfterMs || 1300;
  const SKIP_KEY = `${meta.storagePrefix || 'app'}-skip-splash`;

  let dismissed = false;
  let splashEl = null;
  let removeTimer = null;

  function isDismissed() { return dismissed; }

  function dismiss() {
    if (dismissed || !splashEl) return;
    dismissed = true;
    splashEl.classList.add(OUT_CLASS);
    document.dispatchEvent(new CustomEvent('splash:dismiss'));
    if (removeTimer) clearTimeout(removeTimer);
    removeTimer = setTimeout(() => {
      if (splashEl && splashEl.parentNode) splashEl.remove();
    }, REMOVE_AFTER_MS);
  }

  function init() {
    splashEl = document.querySelector(SELECTOR);
    if (!splashEl) return;

    // Skip-splash flag: si ve un SW update reload, no mostrem splash dos cops
    let shouldSkip = false;
    try { shouldSkip = sessionStorage.getItem(SKIP_KEY) === '1'; } catch (_) {}
    if (shouldSkip) {
      try { sessionStorage.removeItem(SKIP_KEY); } catch (_) {}
      dismiss();
      return;
    }

    splashEl.addEventListener('click', dismiss);
    setTimeout(dismiss, AUTO_DISMISS_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SharedSplash = { dismiss, isDismissed };
})();
