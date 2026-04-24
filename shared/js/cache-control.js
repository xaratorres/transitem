/* cache-control.js — gestió de Cache Storage del Service Worker.
 *
 * Dos modes auto-detectats:
 *
 *  RICH MODE (Ciutadata pattern): si existeixen `#config-cache-size` i
 *  `#config-cache-toast` al DOM, es comporta així:
 *   - Mostra mida actual via navigator.storage.estimate()
 *   - Toast feedback ("Dades guardades netejades" / "No s'ha pogut")
 *   - NO fa reload (mantè estat de la pàgina)
 *   - Botó disabled + "Netejant…" durant l'operació
 *   - Refresca la mida després
 *
 *  SIMPLE MODE (default): només esborra caches i fa reload.
 *
 * API:
 *   window.SharedCacheControl.clear()        — esborra caches (mode segons UI)
 *   window.SharedCacheControl.refreshSize()  — actualitza el text de mida (rich mode only)
 *
 * Personalització via APP_CONFIG.cacheControl (totes opcionals):
 *   buttonSelector:    '#btn-clear-cache'        (default)
 *   sizeSelector:      '#config-cache-size'      (default; opcional)
 *   toastSelector:     '#config-cache-toast'     (default; opcional)
 *   labelDefault:      'Netejar'                  (default)
 *   labelClearing:     'Netejant…'                (default)
 *   toastSuccess:      'Dades guardades netejades' (default)
 *   toastError:        "No s'ha pogut netejar"     (default)
 *   sizePrefix:        'Ocupat: '                 (default)
 *   toastDurationMs:   2500                       (default)
 */
(function () {
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.cacheControl) || {};

  const BUTTON_SELECTOR = cfg.buttonSelector || '#btn-clear-cache';
  const SIZE_SELECTOR = cfg.sizeSelector || '#config-cache-size';
  const TOAST_SELECTOR = cfg.toastSelector || '#config-cache-toast';
  const LABEL_DEFAULT = cfg.labelDefault || 'Netejar';
  const LABEL_CLEARING = cfg.labelClearing || 'Netejant…';
  const TOAST_SUCCESS = cfg.toastSuccess || 'Dades guardades netejades';
  const TOAST_ERROR = cfg.toastError || "No s'ha pogut netejar";
  const SIZE_PREFIX = cfg.sizePrefix || 'Ocupat: ';
  const TOAST_DURATION_MS = cfg.toastDurationMs || 2500;

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async function refreshSize() {
    const sizeEl = document.querySelector(SIZE_SELECTOR);
    if (!sizeEl) return;
    if (!navigator.storage || !navigator.storage.estimate) {
      sizeEl.textContent = '';
      return;
    }
    try {
      const est = await navigator.storage.estimate();
      sizeEl.textContent = est.usage ? SIZE_PREFIX + formatBytes(est.usage) : '';
    } catch (_) {
      sizeEl.textContent = '';
    }
  }

  async function clearSimple() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (_) {}
    location.reload();
  }

  async function clearRich(btn, toast) {
    btn.disabled = true;
    btn.textContent = LABEL_CLEARING;
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      await refreshSize();
      toast.textContent = TOAST_SUCCESS;
    } catch (_) {
      toast.textContent = TOAST_ERROR;
    } finally {
      btn.disabled = false;
      btn.textContent = LABEL_DEFAULT;
      toast.style.display = '';
      setTimeout(() => { toast.style.display = 'none'; }, TOAST_DURATION_MS);
    }
  }

  async function clear() {
    const btn = document.querySelector(BUTTON_SELECTOR);
    const toast = document.querySelector(TOAST_SELECTOR);
    // Rich mode requereix botó + toast presents
    if (btn && toast) return clearRich(btn, toast);
    return clearSimple();
  }

  function init() {
    const btn = document.querySelector(BUTTON_SELECTOR);
    if (btn) btn.addEventListener('click', clear);
    // Refresca mida al boot (silenci si elements absents)
    refreshSize();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SharedCacheControl = { clear, refreshSize };
})();
