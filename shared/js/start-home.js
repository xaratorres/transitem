/* start-home.js — helper reutilitzable per a PWA multi-vista.
 *
 * Problema: si guardem la vista activa (llista/mapa/…) a localStorage per
 * recordar l'estat entre toggles dins de la sessió, cada nova obertura de
 * l'app també restaura l'última vista. Si l'usuari va deixar el mapa obert,
 * entra directament al mapa, cosa que no sempre és el que vol.
 *
 * Aquest helper força que cada càrrega nova comenci a la vista d'inici
 * (home), sense tocar la resta del sistema de persistència.
 *
 * Ús:
 *   import { forceStartView } from './shared/js/start-home.js';
 *   forceStartView({ key: 'transitem-vista', homeValue: 'llista' });
 *
 * O via <script src> si no fas servir mòduls: assigna SharedStartHome al
 * global i crida-ho:
 *   SharedStartHome.forceStartView({ key: 'transitem-vista', homeValue: 'llista' });
 *
 * Paràmetres:
 *   key        clau de localStorage que desa la vista actual (ex:
 *              'transitem-vista', 'ciutadata-vista'…)
 *   homeValue  valor que identifica la vista d'inici (ex: 'llista', 'inici')
 *
 * Comportament:
 *   - Sobreescriu la clau amb `homeValue` abans que cap codi la llegeixi.
 *   - No toca cap altra clau del localStorage.
 *   - Segur de cridar múltiples vegades; no fa res si no hi ha localStorage.
 */
(function (root) {
  function forceStartView(opts) {
    opts = opts || {};
    const key = opts.key;
    const homeValue = opts.homeValue;
    if (!key || homeValue == null) return;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, homeValue);
      }
    } catch (_) { /* privacy mode, storage disabled, etc. */ }
  }

  const api = { forceStartView };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.SharedStartHome = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
