/* search.js — utilitats per cercadors (normalització + clear button).
 *
 * Dues peces:
 *
 *  1. `SharedSearch.norm(s)` — normalitza un string per cerca:
 *     - toLowerCase
 *     - NFD normalize + strip diacritics (accents, dièresi, etc.)
 *     Ex: "Trànsit" → "transit", "Balears" → "balears"
 *
 *     Ús: `SharedSearch.norm('Trànsit').includes(SharedSearch.norm(q))`
 *
 *  2. `SharedSearch.attachClear(input)` — afegeix un botó X dins l'input
 *     per netejar la cerca. Visible quan hi ha text. Substitueix la X
 *     nativa de WebKit (amagada per CSS, no apareix a mòbil).
 *
 *     Ús: `SharedSearch.attachClear(document.getElementById('search-input'))`
 *
 *     Requereix `shared/css/search.css` al projecte.
 *
 * API:
 *   window.SharedSearch.norm(s)
 *   window.SharedSearch.attachClear(input)
 */
(function () {
  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function attachClear(input) {
    if (!input || input.__clearAttached) return;
    input.__clearAttached = true;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'search-clear-x';
    btn.setAttribute('aria-label', 'Neteja la cerca');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

    const parent = input.parentElement;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    parent.appendChild(btn);

    // Reserva espai a la dreta perquè el text no trepitgi la X
    input.style.paddingRight = '36px';

    const sync = () => btn.classList.toggle('visible', !!input.value);
    input.addEventListener('input', sync);
    sync();

    btn.addEventListener('click', () => {
      input.value = '';
      sync();
      input.focus();
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  window.SharedSearch = { norm, attachClear };
})();
