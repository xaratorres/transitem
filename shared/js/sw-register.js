/* sw-register.js — registra el Service Worker amb auto-reload (Ciutadata pattern).
 *
 * Comportament:
 *  - Registra `./sw.js` al boot (silencia errors).
 *  - Si ja hi havia un SW controlant la pàgina i n'arriba un de nou
 *    (controllerchange), recarrega la pàgina perquè l'usuari vegi els
 *    canvis sense haver de refrescar manualment.
 *  - Abans de recarregar, marca `sessionStorage[${prefix}-skip-splash]=1`
 *    perquè SharedSplash no mostri el splash dues vegades.
 *
 * Inclou-lo a l'<head> amb defer:
 *   <script src="./shared/js/sw-register.js" defer></script>
 *
 * Personalització via APP_CONFIG.sw (totes opcionals):
 *   path: './sw.js'                   // ruta del SW (default)
 *   skipSplashOnReload: true          // marca skip-splash a controllerchange (default)
 */
(function () {
  if (!('serviceWorker' in navigator)) return;

  const cfg = (window.APP_CONFIG && window.APP_CONFIG.sw) || {};
  const meta = (window.APP_CONFIG && window.APP_CONFIG.meta) || {};

  const SW_PATH = cfg.path || './sw.js';
  const SKIP_SPLASH = cfg.skipSplashOnReload !== false;
  const SKIP_KEY = `${meta.storagePrefix || 'app'}-skip-splash`;

  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    if (SKIP_SPLASH) {
      try { sessionStorage.setItem(SKIP_KEY, '1'); } catch (_) {}
    }
    window.location.reload();
  });

  navigator.serviceWorker.register(SW_PATH).then(reg => {
    // Comprova si hi ha una versió nova del SW a cada càrrega.
    // Si n'hi ha una, s'instal·larà i (gràcies a skipWaiting + clients.claim)
    // prendrà control immediatament; aleshores `controllerchange` recarregarà
    // la pàgina perquè l'usuari vegi els canvis sense cap acció manual.
    try { reg.update(); } catch (_) {}
  }).catch(() => {});
})();
