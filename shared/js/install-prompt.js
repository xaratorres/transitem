/* install-prompt.js — gestió completa d'instal·lació PWA.
 *
 * Cobertura:
 *  - Android Chrome/Edge: captura `beforeinstallprompt`, exposa prompt()
 *  - iOS Safari: detecta plataforma (no hi ha API d'install nativa, només
 *    instruccions manuals via "Compartir > Afegir a la pantalla d'inici")
 *  - Standalone mode: detecta si l'app ja corre instal·lada
 *  - `appinstalled` event: marca instal·lada quan l'usuari completa el flux
 *  - `getInstalledRelatedApps`: detecta instal·lacions prèvies en altres
 *    perfils del navegador
 *  - localStorage: persisteix l'estat per recordar entre visites
 *
 * Cada projecte renderitza la seva UI escoltant l'event `install:state-change`.
 * El mòdul shared NO toca el DOM directament (excepte per via prompt()).
 *
 * API:
 *   window.SharedInstall.getState() → {
 *     installed, isStandalone, isIOS, isChromiumDesktop, hasDeferredPrompt
 *   }
 *   window.SharedInstall.prompt() → Promise<{ outcome: 'accepted'|'dismissed'|'unavailable' }>
 *   window.SharedInstall.markInstalled(value: boolean)
 *   window.SharedInstall.isInstalled() → boolean
 *
 * Event: 'install:state-change' detail = state object.
 *   Disparat al boot, quan arriba beforeinstallprompt, quan s'instal·la
 *   (appinstalled), o quan es crida markInstalled().
 *
 * Personalització via APP_CONFIG.install (totes opcionals):
 *   installedKey: '<prefix>.pwa.installed'  // clau localStorage
 */
(function () {
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.install) || {};
  const meta = (window.APP_CONFIG && window.APP_CONFIG.meta) || {};

  const STORAGE_KEY = cfg.installedKey || `${meta.storagePrefix || 'app'}.pwa.installed`;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const isChromiumDesktop =
    /Chrome|Edg|OPR/i.test(navigator.userAgent) && !/Mobi|Android/i.test(navigator.userAgent);

  let deferredPrompt = null;

  function readStored() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) { return false; }
  }
  function writeStored(v) {
    try {
      if (v) localStorage.setItem(STORAGE_KEY, '1');
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function isInstalled() {
    return isStandalone || readStored();
  }

  function getState() {
    return {
      installed: isInstalled(),
      isStandalone,
      isIOS,
      isChromiumDesktop,
      hasDeferredPrompt: !!deferredPrompt
    };
  }

  function emit() {
    document.dispatchEvent(new CustomEvent('install:state-change', { detail: getState() }));
  }

  function markInstalled(value) {
    writeStored(!!value);
    emit();
  }

  async function prompt() {
    if (!deferredPrompt) return { outcome: 'unavailable' };
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (choice.outcome === 'accepted') writeStored(true);
    emit();
    return choice;
  }

  // Capturar beforeinstallprompt (Android Chrome/Edge)
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    emit();
  });

  // appinstalled event (després d'instal·lar via qualsevol via)
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    writeStored(true);
    emit();
  });

  // Detecció via getInstalledRelatedApps (manifest amb related_applications)
  if (typeof navigator.getInstalledRelatedApps === 'function') {
    navigator.getInstalledRelatedApps().then(apps => {
      if (apps && apps.length > 0) markInstalled(true);
    }).catch(() => {});
  }

  // Si ja som standalone, marca'l
  if (isStandalone) writeStored(true);

  // Emet estat inicial al següent tick (perquè els listeners arribin a temps)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', emit);
  } else {
    setTimeout(emit, 0);
  }

  window.SharedInstall = { getState, prompt, markInstalled, isInstalled };
})();
