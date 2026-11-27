/* lang_lahde.cjs — tm_lang.js:n lähdeteksti ENTISESSÄ yksitiedostoisessa muodossa (erä (a): sv/en erotettiin tiedostoihin lib/tm_lang_sv.js, tm_lang_en.js).
   Sv-käännöserien vientiskriptit (scripts/i18n_vie_sv_era*.cjs) ja niiden testit etsivät/muokkaavat `sv: {` / `en: {` -lohkoja tekstinä → lue() rakentaa vanhan muodon
   (tavu tavulta sama kuin ennen jakoa; todistaa tests/tm_lang_paketit.test.js) ja kirjoita() jakaa muutetun tekstin takaisin kolmeen tiedostoon.
   Käyttö: const LL = require('./lang_lahde.cjs'); const teksti = LL.lue(juuri); … LL.kirjoita(juuri, uusiTeksti). */
const fs = require('fs'), path = require('path');
const MARKKERI = /  \/\/ @@KIELIPAKETIT@@[^\n]*/;
const VIIVAT = (n) => '─'.repeat(n);
const OTS_SV = '  // ── RUOTSI ' + VIIVAT(52), OTS_EN = '  // ── ENGLANTI ' + VIIVAT(50);
const ALKU = '  var haarukka = {\n', LOPPU = '\n  };\n  if (typeof module';
const TIEDOSTOT = { fi: 'lib/tm_lang.js', sv: 'lib/tm_lang_sv.js', en: 'lib/tm_lang_en.js' };
const lueT = (juuri, f) => fs.readFileSync(path.join(juuri, f), 'utf8');
function sisus(paketti) {   // haarukan sisältö (rivit sv:/en:-avaimen jälkeen, ilman sulkevaa '  },')
  const i = paketti.indexOf(ALKU), j = paketti.indexOf(LOPPU);
  if (i < 0 || j < i) throw new Error('lang_lahde: paketin rakenne ei täsmää');
  return paketti.slice(i + ALKU.length, j);
}
function lue(juuri) {
  const fi = lueT(juuri, TIEDOSTOT.fi);
  if (!MARKKERI.test(fi)) return fi;   // vanha yksitiedostoinen muoto (esim. vertailutesti)
  const sv = sisus(lueT(juuri, TIEDOSTOT.sv)), en = sisus(lueT(juuri, TIEDOSTOT.en));
  const lohkot = OTS_SV + '\n  sv: {\n' + sv + '\n  },\n\n' + OTS_EN + '\n  en: {\n' + en + '\n  },\n';
  return fi.replace(new RegExp(MARKKERI.source + '\\n'), () => lohkot);
}
function kirjoita(juuri, teksti) {
  const m = /\n  \/\/ ── RUOTSI [─]+\n  sv: \{\n([\s\S]*?)\n  \},\n\n  \/\/ ── ENGLANTI [─]+\n  en: \{\n([\s\S]*?)\n  \},\n\};/.exec(teksti);
  if (!m) throw new Error('lang_lahde: sv/en-lohkoja ei löydy yhdistetystä tekstistä');
  const fi = teksti.slice(0, m.index) + '\n  // @@KIELIPAKETIT@@ sv → lib/tm_lang_sv.js · en → lib/tm_lang_en.js (scripts/lang_lahde.cjs yhdistää/jakaa vanhaa yksitiedostoista tekstiä käyttäville työkaluille)\n};' + teksti.slice(m.index + m[0].length);
  const vaihda = (k, uusi) => { const v = lueT(juuri, TIEDOSTOT[k]), i = v.indexOf(ALKU), j = v.indexOf(LOPPU); fs.writeFileSync(path.join(juuri, TIEDOSTOT[k]), v.slice(0, i + ALKU.length) + uusi + v.slice(j)); };
  vaihda('sv', m[1]); vaihda('en', m[2]); fs.writeFileSync(path.join(juuri, TIEDOSTOT.fi), fi);
}
/** Kirjoitus polkukohtaisesti: lib/tm_lang.js → jako; muut tiedostot tavallisesti. */
const TIEDOSTO = (f) => /(^|\/)lib\/tm_lang\.js$/.test(f);
/** Tiedoston luku juuresta: lib/tm_lang.js → yhdistetty (vanha yksitiedostoinen) teksti; muut tavallisesti. */
const lueTied = (juuri, f) => (TIEDOSTO(f) ? lue(juuri) : fs.readFileSync(path.join(juuri, f), 'utf8'));
/** Tiedoston kirjoitus juureen: lib/tm_lang.js → jako kolmeen tiedostoon; muut tavallisesti. */
const kt = (juuri, f, teksti) => { if (TIEDOSTO(f)) kirjoita(juuri, teksti); else fs.writeFileSync(path.join(juuri, f), teksti); };
module.exports = { lue, kirjoita, TIEDOSTO, TIEDOSTOT, lueTied, kt };
