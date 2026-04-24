/* legal-kit.js — gestió de overlay-legal + overlay-privacy + overlay-contact.
 *
 * Pattern compartit entre Denunciem, Ciutadata i Transitem:
 *  - 3 overlays amb stack de navegació (open un, després openfrom altre,
 *    enrere torna al primer)
 *  - Contact form amb honeypot, consent, validació, fetch /api/contact
 *  - Click backdrop / ESC tanquen tota la pila
 *
 * Markup esperat (cada projecte té els overlays propis amb el seu text legal):
 *   <div id="overlay-legal"   class="overlay">…</div>
 *   <div id="overlay-privacy" class="overlay">…</div>
 *   <div id="overlay-contact" class="overlay">
 *     <div class="modal">
 *       <button data-legal-back>…</button>
 *       <button data-legal-close>…</button>
 *       <h2>Contacte</h2>
 *       <div id="contact-body"></div>      ← omplert per aquest mòdul
 *     </div>
 *   </div>
 *
 * Atributs delegats:
 *   data-legal-open="legal|privacy|contact"      — obre l'overlay
 *   data-legal-openfrom="legal|privacy|contact"  — obre afegint a la pila
 *   data-legal-back                              — enrere a la pila
 *   data-legal-close                             — tanca tot
 *
 * El backend POST a /api/contact gestionat per shared/api/contact.js.
 *
 * Personalització via APP_CONFIG.legalKit:
 *   projectLabel:    string  (default: APP_CONFIG.meta.shortName)
 *   accentColor:     string  CSS color/var per links del consent (default 'var(--ink)')
 *   description:     string  text introductori del form (override)
 *   devMode:         boolean mostra avís "formulari en desenvolupament"
 *   devModeNotice:   string  HTML per mostrar quan devMode (default genèric)
 *
 * API: window.SharedLegalKit.{open, close} (per cridar des d'altres llocs).
 */
(function () {
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.legalKit) || {};
  const meta = (window.APP_CONFIG && window.APP_CONFIG.meta) || {};

  const PROJECT_LABEL = cfg.projectLabel || meta.shortName || meta.name || 'App';
  const ACCENT = cfg.accentColor || 'var(--ink)';
  const DESCRIPTION = cfg.description ||
    "Ens pots escriure per consultes, correccions, aportacions o per exercir els drets RGPD. Responem amb discreció.";
  const DEV_MODE = !!cfg.devMode;
  const DEV_NOTICE = cfg.devModeNotice ||
    '<div class="contact-notice"><strong>Formulari en fase de desenvolupament.</strong> Aquest canal encara no és operatiu.</div>';

  const overlays = {};
  const stack = [];

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function render() {
    Object.keys(overlays).forEach(k => {
      const el = overlays[k]; if (!el) return;
      const top = stack[stack.length - 1];
      el.classList.toggle('open', top === k);
      const back = el.querySelector('[data-legal-back]');
      if (back) back.classList.toggle('visible', stack.length > 1 && top === k);
    });
    document.body.style.overflow = stack.length ? 'hidden' : '';
    if (stack[stack.length - 1] === 'contact') renderContactBody();
  }

  function open(key) {
    if (!overlays[key]) return;
    if (stack[stack.length - 1] === key) return;
    stack.push(key); render();
  }
  function back() { stack.pop(); render(); }
  function closeAll() { stack.length = 0; render(); }

  // ─── Contact form state ────────────────────────────
  let contactState = 'idle';  // 'idle' | 'sending' | 'ok' | 'error'
  let contactMsg = '';
  let contactValues = { name: '', email: '', subject: '', message: '', consent: false, website: '' };

  function renderContactBody() {
    const body = document.getElementById('contact-body');
    if (!body) return;

    if (contactState === 'ok') {
      body.innerHTML =
        '<div class="contact-success">' +
          '<div class="tick">✓</div>' +
          '<h3 style="margin:0 0 0.4rem">Missatge enviat</h3>' +
          '<p style="font-size:0.82rem;color:var(--ink-3)">Gràcies! Et respondrem tan aviat com puguem.</p>' +
        '</div>';
      return;
    }

    const notice = DEV_MODE ? DEV_NOTICE : '';
    body.innerHTML =
      notice +
      '<p style="font-size:0.85rem;color:var(--ink-2);margin:0 0 0.9rem">' + esc(DESCRIPTION) + '</p>' +
      '<form id="contact-form" autocomplete="off">' +
        '<div class="contact-field"><label>Nom (opcional)</label><input type="text" name="name" maxlength="120" value="' + esc(contactValues.name) + '"></div>' +
        '<div class="contact-field"><label>Email *</label><input type="email" name="email" required maxlength="200" value="' + esc(contactValues.email) + '"></div>' +
        '<div class="contact-field"><label>Assumpte</label><input type="text" name="subject" maxlength="200" value="' + esc(contactValues.subject) + '"></div>' +
        '<div class="contact-field"><label>Missatge *</label><textarea name="message" required minlength="10" maxlength="5000">' + esc(contactValues.message) + '</textarea></div>' +
        '<div class="contact-honeypot"><label>No omplis: <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
        '<label class="contact-consent"><input type="checkbox" name="consent" required' + (contactValues.consent ? ' checked' : '') +
          '><span>He llegit i accepto la <button type="button" data-legal-openfrom="privacy" style="background:none;border:0;padding:0;font:inherit;color:' + ACCENT + ';cursor:pointer;text-decoration:underline">política de privacitat</button>. Les dades s\'utilitzen exclusivament per respondre la consulta.</span></label>' +
        (contactState === 'error' ? '<div class="contact-error">' + esc(contactMsg) + '</div>' : '') +
        '<button type="submit" class="contact-submit"' + (contactState === 'sending' ? ' disabled' : '') + '>' +
          (contactState === 'sending' ? 'Enviant…' : 'Enviar missatge') +
        '</button>' +
      '</form>';

    const form = body.querySelector('#contact-form');
    if (form) form.addEventListener('submit', onSubmit);

    // També enganxem listeners als data-legal-openfrom dins el body
    // (per cobrir cas Denunciem que els afegia així)
    body.querySelectorAll('[data-legal-openfrom]').forEach(b => {
      b.addEventListener('click', () => open(b.getAttribute('data-legal-openfrom')));
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    if (contactState === 'sending') return;
    const f = e.target;
    contactValues = {
      name: f.name.value, email: f.email.value, subject: f.subject.value,
      message: f.message.value, consent: f.consent.checked, website: f.website.value
    };
    contactState = 'sending';
    contactMsg = '';
    renderContactBody();

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({}, contactValues, { project: PROJECT_LABEL }))
    })
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(res => {
        if (res.ok) contactState = 'ok';
        else { contactState = 'error'; contactMsg = (res.data && res.data.error) || "No s'ha pogut enviar el missatge."; }
        renderContactBody();
      })
      .catch(() => {
        contactState = 'error';
        contactMsg = 'Error de connexió. Torna-ho a provar.';
        renderContactBody();
      });
  }

  // ─── Init: vincula overlays + delegació de clics + ESC ──
  function init() {
    overlays.legal   = document.getElementById('overlay-legal');
    overlays.privacy = document.getElementById('overlay-privacy');
    overlays.contact = document.getElementById('overlay-contact');

    // Si no existeix cap dels 3 overlays, no muntem res (projecte sense legal kit)
    if (!overlays.legal && !overlays.privacy && !overlays.contact) return;

    // Delegació global per data-* (cobreix botons afegits dinàmicament)
    document.addEventListener('click', e => {
      const openEl = e.target.closest && e.target.closest('[data-legal-open]');
      if (openEl) { open(openEl.getAttribute('data-legal-open')); return; }
      const fromEl = e.target.closest && e.target.closest('[data-legal-openfrom]');
      if (fromEl) { open(fromEl.getAttribute('data-legal-openfrom')); return; }
      const closeEl = e.target.closest && e.target.closest('[data-legal-close]');
      if (closeEl) { closeAll(); return; }
      const backEl = e.target.closest && e.target.closest('[data-legal-back]');
      if (backEl) { back(); return; }
    });

    // Backdrop click tanca tot
    Object.keys(overlays).forEach(k => {
      const el = overlays[k]; if (!el) return;
      el.addEventListener('click', e => { if (e.target === el) closeAll(); });
    });

    // ESC tanca tot
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && stack.length) closeAll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SharedLegalKit = { open, close: closeAll };
})();
