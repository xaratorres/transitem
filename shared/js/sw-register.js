/* sw-register.js — registra el Service Worker (patró Denunciem: simple, sense reload).
 *
 * Comportament:
 *  - Registra `./sw.js` al boot (silencia errors).
 *  - NO força reload a `controllerchange`: els canvis s'apliquen al proper
 *    refresh natural de l'usuari. El SW fa `cache: 'reload'` per CORE, així
 *    les noves versions arriben sense interrupcions.
 *
 * Inclou-lo a l'<head> amb defer:
 *   <script src="./shared/js/sw-register.js" defer></script>
 *
 * Personalització via APP_CONFIG.sw (totes opcionals):
 *   path: './sw.js'   // ruta del SW (default)
 */
(function () {
  if (!('serviceWorker' in navigator)) return;
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.sw) || {};
  const SW_PATH = cfg.path || './sw.js';
  navigator.serviceWorker.register(SW_PATH).catch(() => {});
})();
