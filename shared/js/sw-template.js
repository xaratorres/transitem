/* sw-template.js — factory pattern per Service Workers de PWA planes.
 *
 * Aquest fitxer s'importa des del sw.js del projecte via importScripts():
 *
 *   // sw.js del projecte (5 línies)
 *   importScripts('./shared/js/sw-template.js');
 *   buildSW({
 *     cacheName: 'transitem-v4',
 *     core:   ['./', './index.html', './recursos.js'],
 *     assets: ['./favicon.svg', './data/cat-municipis.json', ...]
 *   });
 *
 * Incorpora el gold standard de Ciutadata:
 *  - Install tolerant: Promise.all(map(c.add().catch())) — una icona caiguda
 *    no impedeix instal·lar el SW (vs c.addAll() que aborta tot).
 *  - Network-first amb timeout 2.5s per `core`: garanteix primera pintura
 *    en <2.5s a xarxes lentes (3G), caient a cache si la xarxa tarda.
 *  - Cache-first per `assets`: serveix immediat de cache, refresca en
 *    background.
 *  - Activate cleanup: esborra caches antics quan canvies cacheName.
 *
 * IMPORTANT: bumpa `cacheName` (ex: v3 → v4) per:
 *  - Forçar reactivar el SW després de canvis a `core`/`assets`
 *  - Esborrar caches antics que ja no necessites
 *
 * Opcions (totes opcionals excepte `cacheName`):
 *   cacheName        nom del cache (obligatori; ex: 'transitem-v4')
 *   core             array d'URLs network-first (default: [])
 *   assets           array d'URLs cache-first (default: [])
 *   networkTimeoutMs timeout per network-first (default: 2500)
 *   navigateFallback URL fallback per navigate quan offline (default: './index.html')
 */
self.buildSW = function (cfg) {
  if (!cfg || !cfg.cacheName) {
    throw new Error('buildSW: cacheName és obligatori');
  }
  const CACHE = cfg.cacheName;
  const CORE = Array.isArray(cfg.core) ? cfg.core : [];
  const ASSETS = Array.isArray(cfg.assets) ? cfg.assets : [];
  const NETWORK_TIMEOUT_MS = typeof cfg.networkTimeoutMs === 'number' ? cfg.networkTimeoutMs : 2500;
  const NAV_FALLBACK = cfg.navigateFallback || './index.html';

  // Pre-computem els paths absoluts del CORE per `isCoreRequest` ràpid.
  // Convenció: './foo' viu a /foo. './' equival a / i /index.html.
  const CORE_PATHS = new Set();
  for (const u of CORE) {
    let p = u.replace(/^\.\//, '/');
    if (!p.startsWith('/')) p = '/' + p;
    CORE_PATHS.add(p);
    if (p === '/') CORE_PATHS.add('/index.html');
  }

  function isCoreRequest(req) {
    if (req.mode === 'navigate') return true;
    try {
      const url = new URL(req.url);
      return CORE_PATHS.has(url.pathname);
    } catch (_) {
      return false;
    }
  }

  // ── Install ────────────────────────────────────────
  self.addEventListener('install', e => {
    e.waitUntil(
      caches.open(CACHE)
        .then(c => Promise.all(
          // c.add() individual amb .catch() perquè un fitxer caigut no
          // avorti tot el cache (vs addAll que sí ho fa).
          [...CORE, ...ASSETS].map(u => c.add(u).catch(() => {}))
        ))
        .then(() => self.skipWaiting())
    );
  });

  // ── Activate ───────────────────────────────────────
  self.addEventListener('activate', e => {
    e.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
        .then(() => self.clients.claim())
    );
  });

  // ── Fetch ──────────────────────────────────────────
  self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    let url;
    try { url = new URL(e.request.url); } catch (_) { return; }
    if (url.origin !== self.location.origin) return;

    if (isCoreRequest(e.request)) {
      // NETWORK-FIRST amb timeout. Per als CORE fem `cache: 'reload'`
      // perquè evitem que l'HTTP cache del navegador retorni una versió antiga.
      // Així el SW sempre intenta agafar la versió fresca del servidor.
      const freshReq = new Request(e.request, { cache: 'reload' });
      e.respondWith(
        new Promise(resolve => {
          let settled = false;

          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            caches.match(e.request)
              .then(c => c || caches.match(NAV_FALLBACK))
              .then(r => resolve(r || fetch(e.request)));
          }, NETWORK_TIMEOUT_MS);

          fetch(freshReq)
            .then(res => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              if (res.ok) {
                const clone = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, clone));
              }
              resolve(res);
            })
            .catch(() => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              caches.match(e.request)
                .then(c => c || caches.match(NAV_FALLBACK))
                .then(resolve);
            });
        })
      );
      return;
    }

    // CACHE-FIRST per assets estables (stale-while-revalidate)
    e.respondWith(
      caches.match(e.request).then(cached => {
        const network = fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  });
};
