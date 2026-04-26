/* changelog.js — registre de canvis visibles per a l'usuari (mòduls Nexe).
 *
 * Patró portat de Focus (Batllies / Remuneracions). Cada projecte registra
 * el seu propi CHANGELOG via APP_CONFIG.changelog (auto-detectat aquí) o
 * cridant SharedChangelog.register([...]) abans que es mostri l'onboarding.
 *
 * Format de cada entry:
 *   { version: '0.3', date: '2026-04', items: ['Bullet 1', 'Bullet 2'] }
 *
 * Regles:
 *  - Ordenat de més nou a més antic (la primera entry és la versió actual).
 *  - La `version` ha de coincidir amb `APP_CONFIG.onboarding.version` (o
 *    `meta.version`) perquè l'onboarding sàpiga si l'usuari ja l'ha vista.
 *  - Bumpa només quan hi ha canvis notables per a l'usuari final. Si no
 *    afegeixes items, el modal mostra el fallback "Millores internes".
 *
 * API:
 *   SharedChangelog.register(entries[])         — substitueix el CHANGELOG actual
 *   SharedChangelog.entriesSince(lastSeenVersion) — entries posteriors (exclosa)
 *   SharedChangelog.getAll()                    — clone del CHANGELOG sencer
 *   SharedChangelog.currentVersion()            — primera entry o null
 */
(function (root) {
  let CHANGELOG = [];

  function register(entries) {
    if (Array.isArray(entries)) {
      CHANGELOG = entries.slice();
    }
  }

  function entriesSince(lastSeenVersion) {
    if (!lastSeenVersion) return CHANGELOG.slice();
    const idx = CHANGELOG.findIndex(e => e.version === lastSeenVersion);
    if (idx === -1) return CHANGELOG.slice(); // versió desconeguda → mostra tot
    return CHANGELOG.slice(0, idx);
  }

  function getAll() { return CHANGELOG.slice(); }
  function currentVersion() { return CHANGELOG.length ? CHANGELOG[0].version : null; }

  // Auto-registra des d'APP_CONFIG.changelog si existeix.
  const cfg = (root.APP_CONFIG && root.APP_CONFIG.changelog) || null;
  if (Array.isArray(cfg)) register(cfg);

  root.SharedChangelog = { register, entriesSince, getAll, currentVersion };
})(typeof window !== 'undefined' ? window : globalThis);
