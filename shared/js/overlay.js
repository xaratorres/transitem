/* overlay.js — gestor genèric de overlays/modals.
 *
 * Munta automàticament al boot:
 *   - Click al backdrop tanca l'overlay
 *   - Click a [data-close="overlay-id"] tanca l'overlay corresponent
 *   - Tecla ESC tanca tots els overlays oberts
 *
 * Exposa window.SharedOverlay = { open, close }.
 *
 * Esdeveniments per que els projectes puguin hookar lògica específica:
 *   - 'overlay:open'  detail = { id }
 *   - 'overlay:close' detail = { id }
 *
 * Exemple d'ús per netejar URL hash quan tanca un overlay específic:
 *   document.addEventListener('overlay:close', e => {
 *     if (e.detail.id === 'overlay-fitxa' && location.hash) {
 *       history.replaceState(null, '', location.pathname + location.search);
 *     }
 *   });
 *
 * Markup esperat:
 *   <div id="overlay-X" class="overlay">
 *     <div class="modal">
 *       <button class="modal-close" data-close="overlay-X">…</button>
 *       …
 *     </div>
 *   </div>
 */
(function () {
  function resolve(idOrEl) {
    return typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  }

  function open(idOrEl) {
    const ov = resolve(idOrEl);
    if (!ov) return;
    ov.classList.add('open');
    ov.setAttribute('aria-hidden', 'false');
    document.dispatchEvent(new CustomEvent('overlay:open', { detail: { id: ov.id } }));
  }

  function close(idOrEl) {
    const ov = resolve(idOrEl);
    if (!ov) return;
    ov.classList.remove('open');
    ov.setAttribute('aria-hidden', 'true');
    document.dispatchEvent(new CustomEvent('overlay:close', { detail: { id: ov.id } }));
  }

  function init() {
    document.querySelectorAll('.overlay').forEach(ov => {
      ov.addEventListener('click', e => {
        if (e.target === ov) close(ov);
      });
    });
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => close(btn.dataset.close));
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.overlay.open').forEach(close);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SharedOverlay = { open, close };
})();
