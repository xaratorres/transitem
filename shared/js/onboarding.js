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
 *   window.SharedOnboarding.maybeStart()      — splash si null; changelog si versió ≠
 *   window.SharedOnboarding.show(mode)        — força mostrar; mode='splash'|'reopen'|'changelog'
 *   window.SharedOnboarding.markSeen()        — marca vist sense mostrar
 *   window.SharedOnboarding.isSeen()          — getter
 *   window.SharedOnboarding.lastSeenVersion() — versió que va acceptar l'usuari (o null)
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
  // Storage:
  //  - LEGACY: `${prefix}-onboarded-v${VERSION}` (un per versió). El conservem
  //    només per detectar si un usuari ja havia vist alguna versió, perquè el
  //    pas a versió "X" no es vegi sempre com a primera-vegada.
  //  - NOU:    `${prefix}-onboarded-version` = darrera versió acceptada per
  //    l'usuari. Permet decidir entre splash (null) i changelog (≠ actual).
  const PREFIX = meta.storagePrefix || 'app';
  const STORAGE_KEY = `${PREFIX}-onboarded-v${VERSION}`;
  const LAST_SEEN_KEY = `${PREFIX}-onboarded-version`;
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
    try {
      // Acceptem qualsevol marcador (legacy o nou) com a "ja he vist alguna
      // versió". El changelog farà servir lastSeenVersion() per detectar la
      // versió concreta i mostrar només les novetats posteriors.
      if (localStorage.getItem(STORAGE_KEY) === '1') return true;
      if (localStorage.getItem(LAST_SEEN_KEY)) return true;
      return false;
    } catch (_) { return false; }
  }
  function markSeen() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
      localStorage.setItem(LAST_SEEN_KEY, VERSION);
    } catch (_) {}
  }
  // Versió que l'usuari va acceptar per última vegada. Migració: si només té
  // les keys legacy `${prefix}-onboarded-v${X}=1`, n'agafem la més antiga (els
  // keys legacy són per VERSION concreta; assumim que si va veure v1 i no
  // tenim v2, la última vista és v1).
  function lastSeenVersion() {
    try {
      const v = localStorage.getItem(LAST_SEEN_KEY);
      if (v) return v;
      // Migració: primera key legacy que trobem
      const re = new RegExp('^' + PREFIX + '\\-onboarded\\-v(.+)$');
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k !== LAST_SEEN_KEY) {
          const m = k.match(re);
          if (m && localStorage.getItem(k) === '1') {
            try { localStorage.setItem(LAST_SEEN_KEY, m[1]); } catch (_) {}
            return m[1];
          }
        }
      }
      return null;
    } catch (_) { return null; }
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

  // ─── Render changelog ───────────────────────────────
  // Mode 'changelog': substitueix #onboarding-text per la llista de novetats
  // de les versions posteriors a la última vista per l'usuari.
  function escAttr(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function renderChangelog(entries) {
    const el = getTextEl();
    if (!el) return;
    if (!entries || !entries.length) {
      el.innerHTML = '<p class="onboarding-changelog-empty">Millores internes, correccions i ajustos tècnics que no afecten l\'ús del web.</p>';
      return;
    }
    let html = '<h3 class="onboarding-changelog-title">Què hi ha de nou</h3>';
    entries.forEach(entry => {
      html += '<div class="onboarding-changelog-entry">';
      html += `<div class="onboarding-changelog-meta"><strong>v${escAttr(entry.version)}</strong> <span>· ${escAttr(entry.date || '')}</span></div>`;
      if (entry.items && entry.items.length) {
        html += '<ul class="onboarding-changelog-items">';
        entry.items.forEach(item => { html += `<li>${escAttr(item)}</li>`; });
        html += '</ul>';
      } else {
        html += '<p class="onboarding-changelog-fallback">Millores internes i correccions.</p>';
      }
      html += '</div>';
    });
    el.innerHTML = html;
  }

  // ─── Show / close ───────────────────────────────────
  function show(mode) {
    mode = mode || 'splash';
    const ov = getOverlay();
    if (!ov) return;
    stopTyping();

    // Toggle classe 'splash' (Ciutadata l'usa per estilitzar el primer cop)
    ov.classList.toggle('splash', mode === 'splash');
    ov.classList.toggle('changelog', mode === 'changelog');
    ov.classList.add('open');
    ov.setAttribute('aria-hidden', 'false');

    const btn = getButton();
    const footerTancar = getFooterTancar();

    if (mode === 'changelog') {
      // Mode changelog: render directe de bullets, sense typewriter.
      if (btn) {
        btn.style.display = '';
        btn.classList.add('visible');
        btn.textContent = BUTTON_LABEL;
      }
      if (footerTancar) footerTancar.style.display = 'none';
      const entries = (window.SharedChangelog && SharedChangelog.entriesSince(lastSeenVersion())) || [];
      renderChangelog(entries);
    } else if (mode === 'reopen') {
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
    const last = lastSeenVersion();
    if (!last) {
      // Primera vegada: tutorial complet de benvinguda.
      show('splash');
      return;
    }
    // Ja ha vist alguna versió. Si la nova és diferent i hi ha changelog
    // amb entries posteriors, mostrem-li el resum de novetats.
    if (last !== VERSION && window.SharedChangelog) {
      const entries = SharedChangelog.entriesSince(last);
      if (entries.length) {
        show('changelog');
        return;
      }
    }
    // Mateixa versió o canvis sense entries: no mostrem res.
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

  window.SharedOnboarding = { maybeStart, show, markSeen, isSeen, close, lastSeenVersion };
})();
