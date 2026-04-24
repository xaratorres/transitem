/* onboarding.js — modal d'onboarding versionat (amb typewriter opcional).
 *
 * Llegeix `APP_CONFIG.onboarding` i:
 *  - Renderitza el body (segments amb suport bold) dins #onboarding-text
 *  - Suporta typewriter caràcter-a-caràcter (Ciutadata gold standard)
 *  - Dos modes: 'splash' (primer cop, amb typewriter si activat) i
 *    'reopen' (cridat des de Config "Reveure tutorial", render directe)
 *  - Gestiona "mostrar només si no s'ha vist en aquesta versió"
 *    Storage key: `${prefix}-onboarded-v${version}`
 *  - Auto-marca com a vist a qualsevol forma de tancament
 *
 * Markup esperat (configurable via cfg.overlayId / cfg.cardSelector):
 *   <div id="overlay-onboarding" class="overlay">
 *     <div class="modal">
 *       <div id="onboarding-text"></div>
 *       <button id="btn-entesos">Entesos</button>
 *       <!-- Opcional, només Ciutadata: footer per mode 'reopen' -->
 *       <div id="onboarding-footer-tancar" style="display:none">
 *         <button id="btn-tancar-onboarding">Tancar</button>
 *       </div>
 *     </div>
 *   </div>
 *
 * API:
 *   window.SharedOnboarding.maybeStart()      — mostra si no s'ha vist
 *   window.SharedOnboarding.show(mode)        — força mostrar; mode='splash'|'reopen'
 *   window.SharedOnboarding.markSeen()        — marca vist sense mostrar
 *   window.SharedOnboarding.isSeen()          — getter
 *
 * Configuració via APP_CONFIG.onboarding:
 *   version       string  — bump per re-mostrar a usuaris
 *   body          array   — segments {text, bold} o array d'arrays per paragraphs.
 *                           [] = respecta el HTML inline (no toca contingut).
 *   typewriter    boolean — anima caràcter a caràcter (mode 'splash')
 *   buttonLabel   string  — text del botó d'acceptar (default 'Entesos')
 *   overlayId     string  — id de l'overlay (default 'overlay-onboarding')
 */
(function () {
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.onboarding) || {};
  const meta = (window.APP_CONFIG && window.APP_CONFIG.meta) || {};

  const VERSION = cfg.version || '1';
  const STORAGE_KEY = `${meta.storagePrefix || 'app'}-onboarded-v${VERSION}`;
  const BUTTON_LABEL = cfg.buttonLabel || 'Entesos';
  const TYPEWRITER = !!cfg.typewriter;
  const OVERLAY_ID = cfg.overlayId || 'overlay-onboarding';
  const RAW_BODY = Array.isArray(cfg.body) ? cfg.body : [];

  // Normalitza body: pot ser array de segments [{text}] o array d'arrays [[{text}]].
  // Detecta si el primer element és array → múltiples paragraphs.
  function normalizeParagraphs() {
    if (RAW_BODY.length === 0) return [];
    if (Array.isArray(RAW_BODY[0])) return RAW_BODY;
    return [RAW_BODY];
  }
  const PARAGRAPHS = normalizeParagraphs();

  function isSeen() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) { return false; }
  }
  function markSeen() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
  }

  function getOverlay() { return document.getElementById(OVERLAY_ID); }
  function getTextEl() { return document.getElementById('onboarding-text'); }
  function getButton() { return document.getElementById('btn-entesos'); }
  function getFooterTancar() { return document.getElementById('onboarding-footer-tancar'); }
  function getBtnTancar() { return document.getElementById('btn-tancar-onboarding'); }

  // ─── Render ─────────────────────────────────────────
  function renderFullBody() {
    if (PARAGRAPHS.length === 0) return; // respect HTML inline
    const el = getTextEl();
    if (!el) return;
    el.innerHTML = '';
    PARAGRAPHS.forEach((segs, i) => {
      if (i > 0) {
        el.appendChild(document.createElement('br'));
        el.appendChild(document.createElement('br'));
      }
      segs.forEach(seg => {
        const target = seg.bold ? document.createElement('strong') : null;
        const lines = String(seg.text || '').split('\n');
        lines.forEach((line, li) => {
          if (li > 0) (target || el).appendChild(document.createElement('br'));
          (target || el).appendChild(document.createTextNode(line));
        });
        if (target) el.appendChild(target);
      });
    });
  }

  // ─── Typewriter (estil Ciutadata) ───────────────────
  let typingTimer = null;
  function stopTyping() {
    if (typingTimer !== null) { clearTimeout(typingTimer); typingTimer = null; }
  }

  function typewriterBody(onDone) {
    const el = getTextEl();
    if (!el) { onDone && onDone(); return; }
    el.innerHTML = '<span class="cursor"></span>';
    typeParagraphs(el, 0, onDone || (() => {}));
  }

  function typeParagraphs(textEl, idx, onDone) {
    if (idx >= PARAGRAPHS.length) { onDone(); return; }
    if (idx > 0) {
      const cursor = textEl.querySelector('.cursor');
      textEl.insertBefore(document.createElement('br'), cursor);
      textEl.insertBefore(document.createElement('br'), cursor);
    }
    typeSegments(textEl, PARAGRAPHS[idx], 0, () => {
      typingTimer = setTimeout(() => {
        typingTimer = null;
        typeParagraphs(textEl, idx + 1, onDone);
      }, 180);
    });
  }

  function typeSegments(textEl, segs, si, onDone) {
    if (si >= segs.length) { onDone(); return; }
    const seg = segs[si];
    const cursor = textEl.querySelector('.cursor');
    let container;
    if (seg.bold) {
      container = document.createElement('strong');
      textEl.insertBefore(container, cursor);
    } else {
      container = textEl;
    }
    let i = 0;
    (function next() {
      if (i >= seg.text.length) { typeSegments(textEl, segs, si + 1, onDone); return; }
      const ch = seg.text[i++];
      if (ch === '\n') {
        const br = document.createElement('br');
        seg.bold ? container.appendChild(br) : textEl.insertBefore(br, cursor);
      } else {
        const tn = document.createTextNode(ch);
        seg.bold ? container.appendChild(tn) : textEl.insertBefore(tn, cursor);
      }
      typingTimer = setTimeout(() => { typingTimer = null; next(); }, 20);
    })();
  }

  // ─── Show / close ───────────────────────────────────
  function show(mode) {
    mode = mode || 'splash';
    const ov = getOverlay();
    if (!ov) return;
    stopTyping();

    // Toggle classe 'splash' (Ciutadata l'usa per estilitzar el primer cop)
    ov.classList.toggle('splash', mode === 'splash');
    ov.classList.add('open');
    ov.setAttribute('aria-hidden', 'false');

    const btn = getButton();
    const footerTancar = getFooterTancar();

    if (mode === 'reopen') {
      // Mode reopen: render directe, sense typewriter, sense btn Entesos
      if (btn) btn.style.display = 'none';
      if (footerTancar) footerTancar.style.display = '';
      renderFullBody();
    } else {
      // Mode splash (primer cop): render normal o typewriter
      if (btn) {
        btn.style.display = '';
        btn.classList.remove('visible');
        btn.textContent = BUTTON_LABEL;
      }
      if (footerTancar) footerTancar.style.display = 'none';

      if (TYPEWRITER && PARAGRAPHS.length > 0) {
        typewriterBody(() => {
          if (btn) btn.classList.add('visible');
        });
      } else {
        renderFullBody();
        if (btn) btn.classList.add('visible');
      }
    }

    bindButtons();
  }

  function close() {
    stopTyping();
    const ov = getOverlay();
    if (!ov) return;
    ov.classList.remove('open');
    ov.setAttribute('aria-hidden', 'true');
  }

  function bindButtons() {
    const btn = getButton();
    if (btn && !btn.dataset.sharedBound) {
      btn.dataset.sharedBound = '1';
      btn.addEventListener('click', () => {
        markSeen();
        close();
      });
    }
    const btnT = getBtnTancar();
    if (btnT && !btnT.dataset.sharedBound) {
      btnT.dataset.sharedBound = '1';
      btnT.addEventListener('click', () => { close(); });
    }
  }

  function maybeStart() {
    if (isSeen()) return;
    show('splash');
  }

  // Auto-marca com a vist a qualsevol forma de tancament via SharedOverlay
  document.addEventListener('overlay:close', e => {
    if (e.detail && e.detail.id === OVERLAY_ID) markSeen();
  });

  // També si l'overlay no està registrat per SharedOverlay (Ciutadata té
  // id="onboarding" que no segueix la convenció), capturem clic backdrop +
  // ESC manualment.
  function initFallbackHandlers() {
    const ov = getOverlay();
    if (!ov) return;
    // Si l'id NO comença per 'overlay-' (no el captura SharedOverlay), muntem listeners propis
    if (!ov.id.startsWith('overlay-')) {
      ov.addEventListener('click', e => {
        if (e.target === ov && ov.classList.contains('open')) {
          markSeen(); close();
        }
      });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && ov.classList.contains('open')) {
          markSeen(); close();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFallbackHandlers);
  } else {
    initFallbackHandlers();
  }

  window.SharedOnboarding = { maybeStart, show, markSeen, isSeen, close };
})();
