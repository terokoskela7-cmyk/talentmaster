/* TalentMaster — jaettu henkilöstö-i18n (Vaihe 0). Vain JAETUT stringit + lukittu glossaari.
   Arvot konformoivat tm_lang.js:ään (glossaari-SSOT). Sivukohtaiset kartat (tm_vp_i18n.js, tuleva
   tm_master_i18n.js, tm_seura_i18n.js) EIVÄT saa määritellä näitä avaimia uudelleen (konsistenssitesti).
   Lataus: tm_lang.js → tm_i18n_common.js → <sivukartta>. Avain = KANONINEN suomi. Puuttuva → fi-fallback. */
var TM_I18N_COMMON = {
  sv: {
    /* — Yleisnapit / -toiminnot (≥2 henkilöstösivulla) — */
    'Tallenna': 'Spara', 'Peruuta': 'Avbryt', 'Sulje': 'Stäng', 'Takaisin': 'Tillbaka',
    'Poista': 'Ta bort', 'Muokkaa': 'Redigera', 'Lähetä': 'Skicka', 'Kopioi': 'Kopiera',
    'Lataa': 'Ladda ner', 'Hae nimellä...': 'Sök på namn...',
    /* — Kirjautuminen / chrome — */
    'Kirjaudu ulos': 'Logga ut', 'Kirjaudu sisään': 'Logga in', 'Sähköposti': 'E-post',
    'Salasana': 'Lösenord', 'Asetukset': 'Inställningar', 'Avaa valikko': 'Öppna meny',
    /* — Roolien näyttönimet (enum-roolistringit 'vp'/'valmentaja' EIVÄT tänne) — */
    'Valmennuspäällikkö': 'Fotbollsutvecklare',   // kanoni (V8, Teron päätös): Fotbollsutvecklare — EI kapeampi variantti
    'Valmentaja': 'Tränare', 'Talenttivalmentaja': 'Talangtränare', 'Fysiikkavalmentaja': 'Fystränare',
    'Testivastaava': 'Testansvarig', 'Fysioterapeutti': 'Fysioterapeut', 'Seurasihteeri': 'Klubbsekreterare',
    'Urheilutoimenjohtaja': 'Sportchef', 'Super Admin': 'Super Admin',
    /* — Perusnavigointi / -entiteetit — */
    'Pelaajat': 'Spelare', 'Pelaaja': 'Spelare', 'Joukkueet': 'Lag', 'Joukkue': 'Lag',
    'Henkilöstö': 'Personal', 'Kalenteri': 'Kalender', 'Raportointi': 'Rapportering',
    /* — LUKITTU GLOSSAARI (konformi tm_lang.js / §14 / §34) — */
    'Kehon valmius': 'Kroppslig beredskap',            // kanoni (ei muita drift-variantteja)
    'Pujottelu': 'Slalom',                             // EI Dribbling (Kim-virhe)
    'Syöttö': 'Passning', 'Ponnauttelu': 'Jonglering',
    'Kuljetus-laukaus': 'Föring och skott', 'Pituuspotku': 'Längdspark'
  },
  en: {
    'Tallenna': 'Save', 'Peruuta': 'Cancel', 'Sulje': 'Close', 'Takaisin': 'Back',
    'Poista': 'Delete', 'Muokkaa': 'Edit', 'Lähetä': 'Send', 'Kopioi': 'Copy', 'Lataa': 'Download',
    'Kirjaudu ulos': 'Log out', 'Kirjaudu sisään': 'Log in', 'Sähköposti': 'Email',
    'Salasana': 'Password', 'Asetukset': 'Settings',
    'Valmennuspäällikkö': 'Development Lead',
    'Kehon valmius': 'Physical readiness'
    // additiivinen; puuttuva → fi-fallback
  }
};

// Geneerinen resolvi: COMMON VOITTAA (lukittu glossaari), sitten sivukartta, muuten fi-fallback.
function tmI18nResolve(fi, pageMap) {
  if (fi == null) return fi;
  var k; try { k = (typeof tmNykyinenKieli === 'function' && tmNykyinenKieli()) || 'fi'; } catch (e) { k = 'fi'; }
  if (k === 'fi') return fi;
  var c = TM_I18N_COMMON[k]; if (c && typeof c[fi] === 'string') return c[fi];
  var p = pageMap && pageMap[k]; if (p && typeof p[fi] === 'string') return p[fi];
  return fi;
}

// Geneerinen sweep: data-i18n → textContent · -ph → placeholder · -title → title ·
// -html → innerHTML (säilyttää fi:n rikkaan HTML:n data-i18n-orig:iin, kääntää sv:ksi tasaisena).
function tmLokalisoiCommon(root, pageMap) {
  var scope = root || document;
  scope.querySelectorAll('[data-i18n]').forEach(function (el) {
    var fi = el.getAttribute('data-i18n'); if (fi) el.textContent = tmI18nResolve(fi, pageMap);
  });
  scope.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
    var fi = el.getAttribute('data-i18n-ph'); if (fi) el.setAttribute('placeholder', tmI18nResolve(fi, pageMap));
  });
  scope.querySelectorAll('[data-i18n-title]').forEach(function (el) {
    var fi = el.getAttribute('data-i18n-title'); if (fi) el.setAttribute('title', tmI18nResolve(fi, pageMap));
  });
  scope.querySelectorAll('[data-i18n-html]').forEach(function (el) {
    var fi = el.getAttribute('data-i18n-html'); if (!fi) return;
    if (!el.hasAttribute('data-i18n-orig')) el.setAttribute('data-i18n-orig', el.innerHTML);
    var sv = tmI18nResolve(fi, pageMap);
    el.innerHTML = (sv !== fi) ? sv : el.getAttribute('data-i18n-orig');
  });
}

if (typeof window !== 'undefined') { window.TM_I18N_COMMON = TM_I18N_COMMON; window.tmI18nResolve = tmI18nResolve; window.tmLokalisoiCommon = tmLokalisoiCommon; }
if (typeof module !== 'undefined' && module.exports) { module.exports = { TM_I18N_COMMON: TM_I18N_COMMON, tmI18nResolve: tmI18nResolve, tmLokalisoiCommon: tmLokalisoiCommon }; }
