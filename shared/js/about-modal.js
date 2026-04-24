/* about-modal.js — gestió del modal "Sobre".
 *
 * Filosofia: el contingut visual del modal Sobre varia molt entre projectes
 * (Denunciem té sobre-cos plain, Ciutadata té <details> col·lapsables,
 * Transitem té hero "T" + sobre-cos). El shared només aporta valor on
 * realment hi ha uniformitat:
 *
 *  1. AUTO-FOOTER: actualitza el .modal-footer amb "${territory} · v${version} · ${year}"
 *     llegint d'APP_CONFIG.meta. Així al bumpar la versió, el modal s'actualitza
 *     sense haver de buscar el text inline.
 *
 *  2. RENDER OPCIONAL DE SECTIONS: si el projecte defineix
 *     `APP_CONFIG.about.sections = [{title, body}]`, els renderitza com
 *     <details> dins .sobre-cos (Ciutadata pattern). Si no, respecta
 *     l'HTML inline (Transitem cas).
 *
 *  3. RENDER OPCIONAL D'INTRO: si `APP_CONFIG.about.intro`, l'afegeix com
 *     a primer <p>. Si no, respecta inline.
 *
 * Markup esperat (mínim):
 *   <div id="overlay-sobre" class="overlay">
 *     <div class="modal">
 *       …contingut…
 *       <div class="modal-footer"><small>...</small></div>
 *     </div>
 *   </div>
 *
 * API:
 *   window.SharedAbout.show()  — obre el modal (via SharedOverlay si existeix)
 *   window.SharedAbout.close()
 */
(function () {
  const meta = (window.APP_CONFIG && window.APP_CONFIG.meta) || {};
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.about) || {};

  // ID configurable via APP_CONFIG.about.overlayId (default 'overlay-sobre').
  // Ciutadata té id="overlay" (genèric), Transitem/Denunciem usen 'overlay-sobre'.
  const OVERLAY_ID = cfg.overlayId || 'overlay-sobre';

  function getOverlay() { return document.getElementById(OVERLAY_ID); }

  function buildFooterText() {
    const parts = [];
    if (meta.territory) parts.push(meta.territory);
    // cfg.footerExtra: array de tags addicionals entre territory i version
    // (ex: ['Dades obertes'] per Ciutadata → "Catalunya · Dades obertes · v2.32")
    if (Array.isArray(cfg.footerExtra)) {
      cfg.footerExtra.forEach(tag => { if (tag) parts.push(String(tag)); });
    }
    if (meta.version) parts.push(`v${meta.version}`);
    if (meta.year) parts.push(String(meta.year));
    return parts.join(' · ');
  }

  function applyFooter() {
    const ov = getOverlay();
    if (!ov) return;
    const footer = ov.querySelector('.modal-footer small');
    if (!footer) return;
    const text = buildFooterText();
    if (text) footer.textContent = text;
  }

  function applyIntro() {
    if (!cfg.intro) return;
    const ov = getOverlay();
    if (!ov) return;
    const cos = ov.querySelector('.sobre-cos');
    if (!cos) return;
    // Only inject if cos is empty (respect inline content otherwise)
    if (cos.children.length > 0) return;
    const p = document.createElement('p');
    p.textContent = cfg.intro;
    cos.appendChild(p);
  }

  function applySections() {
    if (!Array.isArray(cfg.sections) || cfg.sections.length === 0) return;
    const ov = getOverlay();
    if (!ov) return;
    const cos = ov.querySelector('.sobre-cos');
    if (!cos) return;
    cfg.sections.forEach(sec => {
      const det = document.createElement('details');
      det.className = 'collapsible';                 // estil shared/css/collapsible.css
      const sum = document.createElement('summary');
      // El text va dins un <span> perquè en alguns contextos el navegador
      // no aplica el `color` directament al <summary> (display: list-item
      // hereda del marker). Els descendants sí reben els colors.
      const sumLabel = document.createElement('span');
      sumLabel.className = 'collapsible-label';
      sumLabel.textContent = sec.title || '';
      sum.appendChild(sumLabel);
      det.appendChild(sum);
      const body = document.createElement('div');
      body.className = 'collapsible-body';
      const p = document.createElement('p');
      p.textContent = sec.body || '';
      body.appendChild(p);
      det.appendChild(body);
      cos.appendChild(det);
    });
  }

  function show() {
    const ov = getOverlay();
    if (!ov) return;
    if (window.SharedOverlay) window.SharedOverlay.open(OVERLAY_ID);
    else ov.classList.add('open');
  }

  function close() {
    if (window.SharedOverlay) window.SharedOverlay.close(OVERLAY_ID);
    else {
      const ov = getOverlay();
      if (ov) ov.classList.remove('open');
    }
  }

  function init() {
    applyFooter();
    applyIntro();
    applySections();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SharedAbout = { show, close };
})();
