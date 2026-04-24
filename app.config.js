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

  brand: {
    primary: '#7BC0E8',
    primaryDark: '#5BA3D0',
    secondary: '#F5A9B8',
    splashFont: 'Playfair Display',
    splashTitle: { part1: 'Transitem', part2: '' },
    splashSub: 'No estàs sol/a en aquest procés.',
    splashHint: 'Toca per entrar'
  },

  onboarding: {
    version: '1',
    title: 'Benvingut/da a Transitem',
    typewriter: false,
    // body buit: el contingut HTML inline a #onboarding-text té estils
    // específics (hint-ajudam, fase de revisió) no suportats encara per
    // segments. SharedOnboarding respecta el HTML inline si body és [].
    body: [],
    revisionChip: 'En revisió',
    buttonLabel: 'Entesos'
  },

  about: {
    title: 'Sobre Transitem',
    hero: { type: 'letter', text: 'T' },
    intro: 'Transitem.cat és un directori pràctic i obert de recursos per a persones trans i no binàries als territoris de parla catalana: serveis públics, associacions, col·lectius i grups de suport que acompanyen el camí de descoberta o la transició.',
    sections: [
      { title: 'Com funciona', body: "Cada fitxa explica per a què serveix, a qui s'adreça, què ofereix, i té dades de contacte directes. Si no saps per on començar, obre Ajuda'm i respon les preguntes — et filtrarem els recursos que encaixen millor amb tu." },
      { title: 'Per qui', body: "El projecte és també per a famílies, parelles, amistats i entorn. Ningú està sol/a en aquest procés." },
      { title: 'Responsabilitat', body: 'Les entitats llistades són de tercers. Transitem només agrega la informació i enllaça cap a les fonts originals.' }
    ]
  },

  contact: {
    title: 'Contacte',
    description: 'Vols proposar-nos un recurs o reportar una errada?',
    consentText: 'Accepto el tractament de les meves dades segons la política de privacitat.'
  },

  legalKit: {
    projectLabel: 'Transitem',
    accentColor: 'var(--pink-ink)',
    description: 'Ens pots escriure per consultes, correccions, aportacions (afegir entitats, corregir dades…) o per exercir els drets RGPD. Responem amb discreció i confidencialitat.',
    devMode: false
  },

  install: {
    bannerCopy: {
      ios: 'A iPhone, toca el botó compartir i tria "Afegir a la pantalla d\'inici".',
      android: 'Instal·la Transitem a la teva pantalla d\'inici.'
    }
  },

  navbar: {
    brand: 'Transitem',
    buttons: ['ajudam', 'vista', 'sobre', 'config']
  },

  legal: {
    links: []
  }
};
