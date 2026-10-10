#!/usr/bin/env node
/* sv-käännöserien kooste (Gemini-kierros): kokoa tyhjät sv-rivit yhteen tiedostoon, vie täytetty kooste takaisin erille.
   Code EI kirjoita eikä muokkaa ruotsia (CLAUDE.md §0): `kokoa` jättää kaikki sv-kentät tyhjiksi; `vie` kopioi Geminin sv-arvot
   merkki merkiltä erätiedostojen vastaaviin kenttiin — muuta se ei kirjoita (ei lib/-karttoja, ei dataa).

   Käyttö:
     node scripts/i18n_kooste.cjs kokoa [--ulos=docs/i18n/sv_kaannoserae_kooste.json]
     node scripts/i18n_kooste.cjs tarkista [kooste.json]            rakenne vs. erät (puuttuva/ylimääräinen avain → exit 1)
     node scripts/i18n_kooste.cjs vie [kooste.json] [--kirjoita]    kuiva-ajo oletuksena; --kirjoita päivittää erätiedostot

   Kooste: rivit = { <id>: { fi, sv, nakyma, lukija, kayttoyhteys, koodissa, avaimet:[{era, osio, avain}] } }.
   Sama suomenkielinen teksti on mukana kerran; `avaimet` listaa kaikki erien rivit, joihin käännös viedään.
   Identiteetti = (era, osio, avain). Avain, joka on erässä tyhjänä mutta puuttuu koosteesta = PUUTTUVA; avain, joka on koosteessa
   mutta ei löydy erästä (tai jonka fi eroaa) = YLIMÄÄRÄINEN. Molemmat kaatavat ajon. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ERA_HAKEMISTO = path.join(ROOT, 'docs/i18n');
const OLETUS_KOOSTE = path.join(ERA_HAKEMISTO, 'sv_kaannoserae_kooste.json');

/* Mukaan tulevat erät (3 on jo viety, 2026-10-08-erä on suljettu). */
const ERAT = ['2', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', 's11'];
const eraTiedosto = (era) => 'sv_kaannoserae_' + era + '.json';

/* ── käyttöyhteys: osio → näkymä, lukija, lyhyt kuvaus ── */
const VP = { nakyma: 'VP-dashboard', lukija: ['henkilökunta (VP)'] };
const OSIO_TIETO = {
  vp_kartta: { ...VP, kuvaus: 'VP-sivun (TalentMaster_VP_v25.html) käyttöliittymäteksti: napit, tilat, ohjelauseet. VP lukee.' },
  master_kartta: { nakyma: 'Master (valmentajan työpöytä)', lukija: ['henkilökunta (valmentaja)'], kuvaus: 'Masterin (TalentMaster_Master_v16.html) käyttöliittymäteksti: toastit, napit, tilat. Valmentaja lukee.' },
  'lib.tm_tanaan_signaali': { nakyma: 'Tänään-kortti (Master/VP)', lukija: ['henkilökunta (valmentaja, VP)'], kuvaus: '"Seuraava askel" -signaalikortin teksti (lib/tm_tanaan_signaali.js).' },
  'lib.tm_seuran_pulssi': { ...VP, nakyma: 'VP Koti — Seuran pulssi', kuvaus: 'Pulssitaulukon otsikot, tilat, signaalikortit ja lauseet (lib/tm_seuran_pulssi.js). VP lukee.' },
  'lib.tm_vp_tilanne': { ...VP, nakyma: 'VP Koti — Tilanne', kuvaus: 'Tilanne-näkymän otsikot, kysymyskortit, signaalit, huomiot ja ehdotukset (lib/tm_vp_tilanne.js, lib/tm_seuran_pulssi.js). VP lukee.' },
  'lib.tm_vp_tilanne_harva': { ...VP, nakyma: 'VP Koti — Tilanne harvalla datalla', kuvaus: 'Tilanne-näkymän tila, kun dataa on vähän (mockup 29; lib/tm_seuran_pulssi.js). VP lukee.' },
  'lib.tm_vp_navi': { ...VP, nakyma: 'VP — navigaatio ja Viestit', kuvaus: 'VP:n navigaatio v3 ja Viestit v0 (lib/tm_vp_navi.js). VP lukee.' },
  'lib.tm_vp_koti': { ...VP, nakyma: 'VP Koti', kuvaus: 'VP:n Koti: Käynnistys- ja Rytmi-vaihe, Tällä viikolla -lista, Jaksolla nyt, joukkuekortit (lib/tm_vp_koti.js). VP lukee.' },
  s11: { ...VP, nakyma: 'VP Koti — Sovelluksen käyttö', kuvaus: 'Seuran käyttöaste (S1.1): pelaajien ja perheiden käyttö joukkueittain, viikoittain. VP lukee; luvut ovat aikuisten työkalua.' },
};
/* tm_lang: avainetuliite → näkymä (pelaaja- ja huoltajasovellus) */
const TM_LANG_TIETO = [
  { alku: 'vanhempi.', nakyma: 'Vanhempi-sovellus — sähköpostin vahvistus ja kalenterin lataus', lukija: ['huoltaja'], kuvaus: 'Huoltaja vahvistaa sähköpostinsa nähdäkseen lapsen kalenterin; virhe- ja tilaviestit.' },
  { alku: 'huoltajakutsu.', nakyma: 'Huoltajakutsun linkkisivu (TalentMaster_Huoltajakutsu.html)', lukija: ['huoltaja'], kuvaus: 'Huoltaja avaa kutsulinkin ja asettaa salasanan; linkki vanhentunut / käytetty / virheellinen -tilat.' },
];
const OLETUS_TIETO = { nakyma: '(ei määritelty)', lukija: [], kuvaus: '' };
function tieto(osio, avain) {
  if (osio === 'tm_lang') {
    const t = TM_LANG_TIETO.find((x) => avain.startsWith(x.alku));
    return t || { nakyma: 'Pelaaja- tai Vanhempi-sovellus', lukija: ['pelaaja', 'huoltaja'], kuvaus: 'tm_lang.js-avain ' + avain };
  }
  return OSIO_TIETO[osio] || OLETUS_TIETO;
}

/* ── erien luku ── */
function muotoile(teksti, J) {
  for (const sisennys of [1, 2]) if (JSON.stringify(J, null, sisennys) + '\n' === teksti || JSON.stringify(J, null, sisennys) === teksti) return { sisennys, loppurivi: teksti.endsWith('\n') };
  throw new Error('erätiedoston JSON-muotoilu ei ole sisennys 1 tai 2 — vienti muuttaisi koko tiedoston muotoilua');
}
function lueEra(hakemisto, era) {
  const polku = path.join(hakemisto, eraTiedosto(era));
  const teksti = fs.readFileSync(polku, 'utf8');
  const J = JSON.parse(teksti);
  return { era, polku, J, muoto: muotoile(teksti, J) };
}
/* osio → rivit-objekti; s11:ssä rivit ovat ylimmällä tasolla (osio 's11') */
function osiot(E) {
  if (E.era === 's11') return { s11: E.J.rivit };
  const o = {};
  for (const [nimi, v] of Object.entries(E.J.osiot)) o[nimi] = v.rivit;
  return o;
}
const tyhja = (r) => typeof r === 'object' && r !== null && !(typeof r.sv === 'string' && r.sv.trim() !== '');

/* Kaikki tyhjät sv-rivit: [{era, osio, avain, fi, en}] erien järjestyksessä */
function tyhjatRivit(hakemisto) {
  const ulos = [];
  for (const era of ERAT) {
    const E = lueEra(hakemisto, era);
    for (const [osio, rivit] of Object.entries(osiot(E))) {
      for (const [avain, r] of Object.entries(rivit)) {
        if (!tyhja(r)) continue;
        if (typeof r.fi !== 'string') throw new Error('rivillä ei fi-tekstiä: ' + era + '/' + osio + '/' + avain);
        ulos.push({ era, osio, avain, fi: r.fi, en: r.en, viite: r.viite_sv });
      }
    }
  }
  return ulos;
}

/* ── koodiviitteet (vain kokoa; paras mahdollinen haku, ei validointia) ── */
function koodiLahteet() {
  const tiedostot = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'lib'))) if (/^tm_.*\.js$/.test(f) && !/i18n|_lang/.test(f)) tiedostot.push('lib/' + f);
  for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_Huoltajakutsu.html', 'TalentMaster_Pelaaja_v7.html']) if (fs.existsSync(path.join(ROOT, f))) tiedostot.push(f);
  return tiedostot.map((f) => ({ f, rivit: fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n') }));
}
function koodissa(lahteet, fi, avaimet) {
  const neulat = new Set();
  if (fi.trim().length >= 3) {
    neulat.add(fi.trim());
    neulat.add(fi.trim().replace(/'/g, "\\'"));
    neulat.add(fi.trim().replace(/"/g, '\\"'));
  }
  for (const a of avaimet) if (/^[a-z_]+(\.[a-z0-9_]+)+$|^[a-z]+_[a-z0-9_]+$/.test(a.avain)) neulat.add(a.avain);
  const osumat = [];
  for (const L of lahteet) {
    for (let i = 0; i < L.rivit.length && osumat.length < 3; i++) {
      if ([...neulat].some((n) => L.rivit[i].includes(n))) osumat.push(L.f + ':' + (i + 1));
    }
    if (osumat.length >= 3) break;
  }
  return osumat;
}

/* ── kokoa ── */
function kokoa(hakemisto, opts) {
  opts = opts || {};
  const rivit = tyhjatRivit(hakemisto);
  const ryhmat = new Map();   // fi → rivit
  for (const r of rivit) {
    if (!ryhmat.has(r.fi)) ryhmat.set(r.fi, []);
    ryhmat.get(r.fi).push(r);
  }
  const lahteet = opts.koodiviitteet === false ? null : koodiLahteet();
  const ulos = {};
  let n = 0;
  for (const [fi, rs] of ryhmat) {
    n++;
    const id = 'r' + String(n).padStart(3, '0');
    const avaimet = rs.map((r) => ({ era: r.era, osio: r.osio, avain: r.avain }));
    const tiedot = rs.map((r) => tieto(r.osio, r.avain));
    const nakymat = [...new Set(tiedot.map((t) => t.nakyma))];
    const lukijat = [...new Set(tiedot.flatMap((t) => t.lukija))];
    const kuvaukset = [...new Set(tiedot.map((t) => t.kuvaus).filter(Boolean))];
    const rivi = { fi, sv: '', nakyma: nakymat.join(' · '), lukija: lukijat, kayttoyhteys: kuvaukset.join(' | ') };
    const enArvot = [...new Set(rs.map((r) => r.en).filter((x) => typeof x === 'string' && x))];
    if (enArvot.length) rivi.en = enArvot.length === 1 ? enArvot[0] : enArvot;
    const viitteet = [...new Set(rs.map((r) => r.viite).filter((x) => typeof x === 'string' && x))];
    if (viitteet.length) rivi.viite_sv = viitteet.length === 1 ? viitteet[0] : viitteet;   // erässä jo ollut ehdotus, kopioitu sellaisenaan
    if (lahteet) { const k = koodissa(lahteet, fi, avaimet); if (k.length) rivi.koodissa = k; }
    rivi.avaimet = avaimet;
    ulos[id] = rivi;
  }
  return { rivit: ulos, ennen: rivit.length, jalkeen: ryhmat.size };
}

/* ── tarkista: kooste vs. erät ── */
const PAIKKA = /\{[A-Za-z0-9_]+\}/g, TAGI = /<\/?[a-zA-Z][a-zA-Z0-9]*/g;
const joukko = (s, re) => (String(s).match(re) || []).sort().join('|');
const avainTunniste = (a) => JSON.stringify([a.era, a.osio, a.avain]);

/* Rakenne: id-joukko, avaimet, fi. `tayta` = vaadi myös täytetty sv (vientiä varten). Palauttaa virhelistan. */
function tarkista(kooste, hakemisto, opts) {
  opts = opts || {};
  const virheet = [];
  const lisaa = (v) => virheet.push(v);
  if (!kooste || typeof kooste !== 'object' || typeof kooste.rivit !== 'object' || kooste.rivit === null || Array.isArray(kooste.rivit)) return ['kooste.rivit puuttuu tai ei ole objekti'];
  const erat = {};
  for (const era of ERAT) { const E = lueEra(hakemisto, era); erat[era] = { E, osiot: osiot(E) }; }
  const nahdyt = new Map();   // avainTunniste → koosteen id
  for (const [id, r] of Object.entries(kooste.rivit)) {
    if (typeof r !== 'object' || r === null) { lisaa(id + ': rivi ei ole objekti'); continue; }
    if (typeof r.fi !== 'string') { lisaa(id + ': fi puuttuu'); continue; }
    if (!Array.isArray(r.avaimet) || !r.avaimet.length) { lisaa(id + ': avaimet puuttuvat'); continue; }
    for (const a of r.avaimet) {
      const t = avainTunniste(a);
      if (nahdyt.has(t)) lisaa('YLIMÄÄRÄINEN (kahdesti: ' + nahdyt.get(t) + ' ja ' + id + '): ' + t);
      nahdyt.set(t, id);
      const rivit = erat[a.era] && erat[a.era].osiot[a.osio];
      const eraRivi = rivit && rivit[a.avain];
      if (!eraRivi) { lisaa('YLIMÄÄRÄINEN avain (ei löydy erästä): ' + id + ' ' + t); continue; }
      if (eraRivi.fi !== r.fi) lisaa('fi muuttunut tai väärä rivi: ' + id + ' ' + t + ' — erässä ' + JSON.stringify(eraRivi.fi) + ', koosteessa ' + JSON.stringify(r.fi));
    }
    if (opts.tayta) {
      if (typeof r.sv !== 'string' || !r.sv.trim()) lisaa(id + ': sv tyhjä' + (r.kysymys ? ' (Geminin kysymys: ' + r.kysymys + ')' : '') + ' — ' + JSON.stringify(r.fi));
      else {
        if (joukko(r.fi, PAIKKA).replace(/\{gen\}\|?/g, '') !== joukko(r.sv, PAIKKA)) lisaa(id + ': paikkamerkit eroavat (fi: ' + joukko(r.fi, PAIKKA) + ' ≠ sv: ' + joukko(r.sv, PAIKKA) + ')');
        if (joukko(r.fi, TAGI) !== joukko(r.sv, TAGI)) lisaa(id + ': HTML-tagit eroavat');
        if (/^\s/.test(r.fi) !== /^\s/.test(r.sv) || /\s$/.test(r.fi) !== /\s$/.test(r.sv)) lisaa(id + ': alku-/loppuvälilyönti eroaa fi:stä — ' + JSON.stringify(r.fi));
      }
    }
  }
  /* puuttuvat: tyhjä erässä, ei koosteessa */
  for (const era of ERAT) {
    for (const [osio, rivit] of Object.entries(erat[era].osiot)) {
      for (const [avain, r] of Object.entries(rivit)) {
        if (tyhja(r) && !nahdyt.has(avainTunniste({ era, osio, avain }))) lisaa('PUUTTUVA avain (tyhjä erässä, ei koosteessa): ' + avainTunniste({ era, osio, avain }));
      }
    }
  }
  return virheet;
}

/* ── vie ── */
function vie(kooste, hakemisto, opts) {
  opts = opts || {};
  const virheet = tarkista(kooste, hakemisto, { tayta: true });
  if (virheet.length) return { virheet, kirjoitettu: 0 };
  const muutokset = {};   // era → E
  let n = 0;
  for (const r of Object.values(kooste.rivit)) {
    for (const a of r.avaimet) {
      const E = muutokset[a.era] || (muutokset[a.era] = lueEra(hakemisto, a.era));
      const eraRivi = osiot(E)[a.osio][a.avain];
      if (typeof eraRivi.sv === 'string' && eraRivi.sv.trim() && eraRivi.sv !== r.sv) { virheet.push('erässä on jo eri sv, ei ylikirjoiteta: ' + avainTunniste(a)); continue; }
      eraRivi.sv = r.sv;
      n++;
    }
  }
  if (virheet.length) return { virheet, kirjoitettu: 0 };
  if (opts.kirjoita) {
    for (const E of Object.values(muutokset)) fs.writeFileSync(E.polku, JSON.stringify(E.J, null, E.muoto.sisennys) + (E.muoto.loppurivi ? '\n' : ''));
  }
  return { virheet, kirjoitettu: n, erat: Object.keys(muutokset) };
}

/* ── CLI ── */
function main() {
  const [, , komento, ...muut] = process.argv;
  const arg = (nimi, oletus) => { const a = muut.find((x) => x.startsWith('--' + nimi + '=')); return a ? a.slice(nimi.length + 3) : oletus; };
  const tiedosto = path.resolve(ROOT, muut.find((x) => !x.startsWith('--')) || OLETUS_KOOSTE);
  const lueKooste = () => JSON.parse(fs.readFileSync(tiedosto, 'utf8'));
  if (komento === 'kokoa') {
    const ulos = path.resolve(ROOT, arg('ulos', path.relative(ROOT, OLETUS_KOOSTE)));
    const { rivit, ennen, jalkeen } = kokoa(ERA_HAKEMISTO);
    const K = {
      _tiedosto: 'TalentMaster — sv-käännöskooste Geminille',
      _tila: 'LÄHETETTÄVÄ: erien 2, 4–11, s11 ja 12–14 kaikki tyhjät sv-rivit yhdessä; duplikaatit yhdistetty (sama fi kerran, kaikki avaimet listattu).',
      _rivit_ennen_duplikaatteja: ennen,
      _rivit_duplikaattien_jalkeen: jalkeen,
      _erat: ERAT,
      ohje_geminille: ['Lue ENSIN docs/i18n/GEMINI_OHJE_kooste.md (termistö, sävy, §7.22-rajat).', 'Täytä jokaiseen tyhjään "sv"-kenttään ruotsinkielinen käännös. Älä muuta avaimia, id-tunnisteita, "fi"-arvoja äläkä rakennetta; älä lisää tai poista rivejä. Palauta koko JSON samassa järjestyksessä.', 'Kentät nakyma, lukija, kayttoyhteys ja koodissa kertovat missä teksti näkyy ja kuka sen lukee — ne ovat vain apuna. Jos rivi on epäselvä, jätä sv tyhjäksi ja kirjoita kenttä "kysymys" samaan objektiin.'],
      rivit,
    };
    fs.writeFileSync(ulos, JSON.stringify(K, null, 1) + '\n');
    console.log('kooste kirjoitettu: ' + path.relative(ROOT, ulos) + '\n  rivit ennen duplikaatteja: ' + ennen + '\n  rivit duplikaattien jälkeen: ' + jalkeen);
    return;
  }
  if (komento === 'tarkista' || komento === 'vie') {
    const K = lueKooste();
    if (komento === 'tarkista') {
      const v = tarkista(K, ERA_HAKEMISTO);
      if (v.length) { console.error('KOOSTE EI TÄSMÄÄ ERIIN (' + v.length + '):\n- ' + v.join('\n- ')); process.exit(1); }
      console.log('kooste täsmää erien tyhjiin riveihin (' + Object.keys(K.rivit).length + ' riviä)');
      return;
    }
    const kirjoita = muut.includes('--kirjoita');
    const t = vie(K, ERA_HAKEMISTO, { kirjoita });
    if (t.virheet.length) { console.error('VIENTI KAATUI (' + t.virheet.length + '), mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
    console.log((kirjoita ? 'viety' : 'kuiva-ajo OK, ei kirjoitettu') + ': ' + t.kirjoitettu + ' erärivin sv, erät ' + t.erat.join(', '));
    return;
  }
  console.error('käyttö: i18n_kooste.cjs kokoa|tarkista|vie [tiedosto] [--kirjoita]');
  process.exit(2);
}
if (require.main === module) main();
module.exports = { ERAT, kokoa, tarkista, vie, tyhjatRivit, lueEra };
