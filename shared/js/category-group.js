/* category-group.js — helpers per al patró <details class="category-group">.
 *
 * Complement del CSS a shared/css/category-group.css.
 *
 * API pública:
 *   window.SharedCategoryGroup.addPlegarButton(grup, [label])
 *     Afegeix un botó al peu d'un <details class="category-group"> que el tanca
 *     i fa scroll cap al summary. Label per defecte: 'Plegar'.
 *
 * Ús típic (a renderLlista / renderGroup del projecte):
 *   const grup = document.createElement('details');
 *   grup.className = 'category-group';
 *   // ...omplir summary + items...
 *   SharedCategoryGroup.addPlegarButton(grup);
 *   host.appendChild(grup);
 */

(function () {
  'use strict';

  const CHEVRON_UP =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="m18 15-6-6-6 6"/></svg>';

  /**
   * Crea i adjunta un botó "Plegar" al final del `<details>` passat.
   * Al clicar-lo, tanca el details i fa scroll cap al seu summary.
   *
   * @param {HTMLDetailsElement} grup Element <details class="category-group">.
   * @param {string} [label='Plegar'] Text visible del botó.
   * @returns {HTMLButtonElement|null} El botó creat, o null si grup no és vàlid.
   */
  function addPlegarButton(grup, label) {
    if (!grup || grup.tagName !== 'DETAILS') return null;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-group-plegar';
    btn.innerHTML = CHEVRON_UP + ' ' + (label || 'Plegar');

    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      grup.open = false;
      const sum = grup.querySelector('summary');
      if (sum && sum.scrollIntoView) {
        sum.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    grup.appendChild(btn);
    return btn;
  }

  window.SharedCategoryGroup = { addPlegarButton };
})();
