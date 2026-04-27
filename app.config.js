/**
 * app.config.js — Transitem.cat
 * Llegit pels mòduls compartits a /shared/.
 * Veure C:\Projectes\_shared\templates\app.config.example.js per documentació de camps.
 */
window.APP_CONFIG = {
  meta: {
    name: 'Transitem.cat',
    shortName: 'Transitem',
    description: 'Guia de recursos per a persones trans i no binàries als territoris de parla catalana.',
    version: '0.2',
    territory: 'Països Catalans',
    year: 2026,
    dataFile: 'recursos.js',
    storagePrefix: 'transitem',
    sharedVersion: '0.20.0',
    startUrl: './',
    themeColor: '#ffffff'
  },

  splash: {
    // Allarguem el splash per a Transitem perquè doni temps a veure
    // l'animació "sola"/"sol"/"soli" (la "i" es queda més estona, vegeu
    // index.html). Default de SharedSplash és 2400ms.
    autoDismissMs: 5000,
    removeAfterMs: 1300
  },

  onboarding: {
    version: '0.4',
    typewriter: false,
    // body buit: el contingut HTML inline a #onboarding-text té estils
    // específics (hint-ajudam, fase de revisió) no suportats encara per
    // segments. SharedOnboarding respecta el HTML inline si body és [].
    body: [],
    buttonLabel: 'Entesos'
  },

  // Llegit per shared/js/changelog.js (auto-registre). Ordenat de més nou
  // a més antic. Bumpa `onboarding.version` quan afegeixis una entry nova,
  // i als usuaris que ja havien acceptat la versió anterior se'ls mostrarà
  // el modal en mode 'changelog' amb només les noves bullets.
  changelog: [
    {
      version: '0.4',
      date: '2026-04-27',
      items: [
        'Dues categories noves: Legal (lleis i normes) i Guia / protocol (tràmits oficials, protocols educatius)',
        '9 nous recursos: 4 lleis (Catalunya 19/2020, 17/2020, 13/2025; estatal 4/2023) i 5 guies (targeta amb nom sentit, protocol alumnat trans, denúncia per discriminació, AOC, protocols violència àmbit educatiu)'
      ]
    },
    {
      version: '0.3',
      date: '2026-04-27',
      items: [
        'Cerca d\'entitats també a la vista mapa, sincronitzada amb la del llistat',
        'Compartir un filtre concret per URL (ex: ?territori=cat&servei=sanitari)',
        'Botó "↓ CSV" per descarregar la llista filtrada al teu ordinador',
        'Mapa: títol "Transitem" clicable per tornar a inici, amb millor centrat i pinch-zoom controlat a mòbil',
        'Cerca insensible a accents (escriu "transit" o "tràns" igual)',
        'Animació nova al splash i botó X de tancament millorat als modals'
      ]
    }
  ],

  about: {
    intro: 'Transitem.cat és un directori pràctic i obert de recursos per a persones trans i no binàries als territoris de parla catalana: serveis públics, associacions, col·lectius i grups de suport que acompanyen el camí de descoberta o la transició.',
    sections: [
      { title: 'Com funciona', body: "Cada fitxa explica per a què serveix, a qui s'adreça, què ofereix, i té dades de contacte directes. Si no saps per on començar, obre Ajuda'm i respon les preguntes — et filtrarem els recursos que encaixen millor amb tu." },
      { title: 'Per a qui', body: "El projecte és també per a famílies, parelles, amistats i entorn. Ningú està sol/a en aquest procés." },
      { title: 'Responsabilitat', body: 'Les entitats llistades són de tercers. Transitem només agrega la informació i enllaça cap a les fonts originals.' }
    ]
  },

  legalKit: {
    projectLabel: 'Transitem',
    accentColor: 'var(--pink-ink)',
    description: 'Ens pots escriure per consultes, correccions, aportacions (afegir entitats, corregir dades…) o per exercir els drets RGPD. Responem amb discreció i confidencialitat.',
    devMode: true,
    devModeNotice: '<div class="contact-notice"><strong>Formulari en fase de desenvolupament.</strong> Aquest canal encara no és operatiu. Mentrestant, escriu-nos a <a href="mailto:rerumscriptor@gmail.com">rerumscriptor@gmail.com</a>.</div>'
  },

  install: {
    bannerCopy: {
      ios: 'A iPhone, toca el botó compartir i tria "Afegir a la pantalla d\'inici".',
      android: 'Instal·la Transitem a la teva pantalla d\'inici.'
    }
  }
};
