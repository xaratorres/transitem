/* brand-home.js — fa clicable el títol/brand de la topbar perquè vagi a inici.
 *
 * Problema d'UX: a les nostres PWA, l'usuari obre la vista mapa (o equivalent
 * "secundària") i no sempre intueix com tornar a la pantalla d'inici, sobretot
 * a mòbil. La convenció web més estesa és que el logo/títol de la capçalera
 * porti a home — aquest helper l'aplica de manera consistent a totes les
 * eines.
 *
 * Ús:
 *   SharedBrandHome.attach({
 *     selector: '.brand',           // element clicable (ex: '.brand', '.brand-name')
 *     onClick: () => setVista('llista'),  // què cal fer per anar a inici
 *     ariaLabel: 'Tornar a l\'inici',     // opcional (default: 'Tornar a l\'inici')
 *   });
 *
 * Comportament:
 *   - Afegeix role="button", tabindex="0", aria-label, cursor: pointer.
 *   - Click i Enter/Space disparen `onClick`.
 *   - Idempotent: si es crida més d'un cop sobre el mateix element, no
 *     duplica listeners (es marca amb `__brandHomeAttached`).
 *
 * Recomanació: si la teva eina té múltiples vistes persistides, combina-ho
 * amb start-home.js (force la vista d'inici a cada càrrega nova).
 */
(function (root) {
  function attach(opts) {
    opts = opts || {};
    const selector = opts.selector;
    const onClick = opts.onClick;
    const ariaLabel = opts.ariaLabel || 'Tornar a l\'inici';
    if (!selector || typeof onClick !== 'function') return;

    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el || el.__brandHomeAttached) return;
    el.__brandHomeAttached = true;

    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', ariaLabel);
    if (!el.title) el.title = ariaLabel;
    el.style.cursor = 'pointer';
    // Suprimeix el highlight blau de tap a iOS perquè queda lleig sobre el logo
    el.style.webkitTapHighlightColor = 'transparent';

    el.addEventListener('click', e => { e.preventDefault(); onClick(); });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    });
  }

  const api = { attach };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.SharedBrandHome = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
