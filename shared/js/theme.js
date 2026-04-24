/* theme.js — gestió mode nit (dark/light).
 *
 * S'auto-inicialitza al boot:
 *  - Llegeix `${meta.storagePrefix}-dark` de localStorage; si no existeix, fa
 *    fallback a `prefers-color-scheme: dark`.
 *  - Aplica `html.classList.dark` i actualitza la meta theme-color.
 *  - Si troba `#toggle-dark`, li munta el listener i toggleja la classe `.on`.
 *
 * Emet event `theme:change` amb detail `{ dark }` perquè els projectes
 * puguin reaccionar a canvis (ex: refrescar mapes, gràfics, etc.).
 *
 * Personalització via APP_CONFIG (totes opcionals):
 *   theme: {
 *     toggleSelector: '#toggle-dark',  // selector del botó (default)
 *     activeClass: 'on',                // classe que s'aplica al botó (default)
 *     darkColor: '#111112',             // theme-color meta (default)
 *     lightColor: '#ffffff'             // theme-color meta (default)
 *   }
 *
 * API exposada:
 *   window.SharedTheme.set(dark: boolean)
 *   window.SharedTheme.toggle()
 *   window.SharedTheme.isDark()
 */
(function () {
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.theme) || {};
  const meta = (window.APP_CONFIG && window.APP_CONFIG.meta) || {};

  const STORAGE_KEY = `${meta.storagePrefix || 'app'}-dark`;
  const TOGGLE_SELECTOR = cfg.toggleSelector || '#toggle-dark';
  const ACTIVE_CLASS = cfg.activeClass || 'on';
  const DARK_COLOR = cfg.darkColor || '#111112';
  const LIGHT_COLOR = cfg.lightColor || '#ffffff';

  function isDark() {
    return document.documentElement.classList.contains('dark');
  }

  function set(dark) {
    document.documentElement.classList.toggle('dark', dark);

    // Meta theme-color (per la barra del navegador / sistema)
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = dark ? DARK_COLOR : LIGHT_COLOR;

    // Botó toggle (si existeix)
    const btn = document.querySelector(TOGGLE_SELECTOR);
    if (btn) btn.classList.toggle(ACTIVE_CLASS, dark);

    // Persist
    try { localStorage.setItem(STORAGE_KEY, dark ? '1' : '0'); } catch (_) {}

    document.dispatchEvent(new CustomEvent('theme:change', { detail: { dark } }));
  }

  function toggle() { set(!isDark()); }

  function init() {
    let saved;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (_) { saved = null; }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    set(saved !== null ? saved === '1' : prefersDark);

    const btn = document.querySelector(TOGGLE_SELECTOR);
    if (btn) btn.addEventListener('click', toggle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SharedTheme = { set, toggle, isDark };
})();
