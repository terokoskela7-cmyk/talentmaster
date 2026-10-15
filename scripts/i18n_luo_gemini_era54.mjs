#!/usr/bin/env node
/* Gemini-erä 54 (Sibbo-reititys; #1077:n jatko). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = reitityksen UUDET avaimet joilla ei ole sv:tä + vientipohjan kuittaus-aliakset. EI toista erän 53 rivejä (eikä muiden lähetettyjen erien).
     (1) tm_lang  — suostumuslomakkeen dynaamiset viestit ja kuitti (suostumus.*; odotuslista tests/tm_lang_sv_odotuslista.cjs)
     (2) lib.tm_harjoitusarviointi — harjoitusarviointilomakkeen tekstit joille sv puuttuu masterT- tai vpT-ketjusta (avain = fi-teksti → TM_LIB_I18N)
     (3) master_kartta — Kehitystyöpöydän ikävaiheiden nimet Masterin ketjussa (VP:llä on jo sv)
     (4) vientipohja — kuittaus-näyttöarvot (OK · Muutettu · Poista; tallennettava arvo ei muutu) + OHJE-rivi 5 paikanvaraajilla
   Idempotentti: jo täytetty sv säilyy. Ajo: node scripts/i18n_luo_gemini_era54.mjs [--tiedosto=docs/i18n/sv_kaannoserae_54_gemini.json] */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { laske, harjoitusarviointiAvaimet, lisaAvaimetPuuttuu } from '../tools/i18n/sv_kattavuus.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_54_gemini.json'));
if (!arg('tiedosto', null) && existsSync(join(ROOT, 'docs/i18n/sv_kaannoserae_54_palautus.json'))) { console.error('Erä 54 on palautettu (docs/i18n/sv_kaannoserae_54_palautus.json) — lähetettyä erätiedostoa ei regeneroida.'); process.exit(3); }
const _log = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('[TM Lang]') && !String(a[0]).startsWith('[tm-')) _log(...a); };
const lue = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
let nyk = null; try { nyk = lue('docs/i18n/' + OUT.split('/').pop()); } catch (e) { /* uusi */ }
const vanha = (osio, avain) => { const r = nyk && nyk.osiot && nyk.osiot[osio] && nyk.osiot[osio].rivit && nyk.osiot[osio].rivit[avain]; return r && typeof r.sv === 'string' ? r.sv : ''; };
// erän 53 rivit (lähetetty ja palautettu) — ei toisteta
const E53 = lue('docs/i18n/sv_kaannoserae_53_gemini.json'), e53 = { avain: new Set(), fi: new Set() };
for (const o of Object.values(E53.osiot)) for (const [k, r] of Object.entries(o.rivit)) { e53.avain.add(k); if (r.fi) e53.fi.add(r.fi); }
const osiot = {};
const lisaa = (osio, konteksti, lahde, avain, rivi) => { if (!osiot[osio]) osiot[osio] = { _konteksti: konteksti, _lahde: lahde, rivit: {} }; osiot[osio].rivit[avain] = Object.assign(rivi, { sv: vanha(osio, avain) }); };

const tulos = laske(join(ROOT, 'docs/i18n/sv_lapiajo_tulos.json'), { ilmanOmaaEraa: true });

/* (1) tm_lang — suostumus */
const KOOSTUS = {
  kutsu_alku: 'Otsikko kootaan: kutsu_alku + " " + seuran nimi (tai, jos nimeä ei ole, kutsu_seuralta). Suomessa "Kutsu seuralta" / "Kutsu KPV".',
  kutsu_seuralta: 'Käytetään kutsu_alku-sanan perässä kun seuran nimeä ei ole annettu.',
  kuitti_ika: 'Kuitin rivin otsikko; arvo kootaan: ikä + " " + kuitti_vuotta.', kuitti_vuotta: 'Kuitin ikärivin yksikkö (esim. "14 vuotta").',
  kuitti_hyvaksytty: 'Kuitin rivin arvo kootaan: lukumäärä + " " + tämä teksti (esim. "3 kpl hyväksytty").',
  tunnukset_lahetetty: 'Onnistumisviestin otsikko (kuvake edessä koodissa).',
  lahetys_alku: 'Kappale kootaan järjestyksessä: lahetys_alku + " " + (osoitteeseen + " " + sähköpostiosoite | sahkopostiisi) + lahetys_loppu. Sähköpostiosoite lisätään koodissa lihavoituna.',
  osoitteeseen: 'Liitetään lahetys_alku-lauseen perään ennen sähköpostiosoitetta: lahetys_alku + " " + osoitteeseen + " " + osoite. Myös tallennettu_lahetys_alku + " " + osoitteeseen + " " + osoite + " " + epaonnistui.',
  sahkopostiisi: 'Liitetään lahetys_alku-lauseen perään kun osoitetta ei ole: lahetys_alku + " " + sahkopostiisi + lahetys_loppu.',
  lahetys_loppu: 'Lauseen jatko heti edellisen perässä (alkaa pisteellä, joka päättää edellisen lauseen). Käännä niin että tämä toimii yhdistettynä lahetys_alku-lauseeseen.',
  linkki_7pv: 'Lihavoitu; perässä " " + linkki_7pv_loppu.', linkki_7pv_loppu: 'Jatkaa linkki_7pv-lausetta (alkaa ajatusviivalla).',
  linkki_1h: 'Lihavoitu; perässä " " + linkki_vanhene + " " + linkki ("vanhemman sivu") + " " + linkki_unohdin.',
  linkki_vanhene: 'Lause jatkuu linkillä: linkki_vanhene + " <linkki: linkki_vanhemman_sivu> " + linkki_unohdin.',
  linkki_vanhemman_sivu: 'Klikattavan linkin teksti lauseen keskellä ("avaa vanhemman sivu").',
  linkki_unohdin: 'Lauseen loppu linkin jälkeen. Lainausmerkit ovat suomalaiset ” ”; "Unohdin salasanan" on vanhemman sivun kirjautumisen nappi — käytä samaa sanamuotoa kuin Vanhempi-sovelluksessa.',
  tallennettu_lahetys_alku: 'Kappale kootaan: tallennettu_lahetys_alku + [" " + osoitteeseen + " " + osoite] + " " + lahetys_virhe_loppu + " " + pyyda_seuraa (lihavoitu) + " " + seuran_hallinta_ohje.',
  lahetys_virhe_loppu: 'Edellisen lauseen loppu (sisältää pisteen).', pyyda_seuraa: 'Lihavoitu kehotus.', seuran_hallinta_ohje: 'Sulkulause jonka polku kuvaa Seurahallinnan valikkoa (seuran hallinta → pelaaja → lähetä pelaajasivulinkki).',
  virhe_pakolliset: 'Lomakkeen vaiheen 1 validointiviesti (toast) kun pakollisia kenttiä on tyhjänä; tähti viittaa lomakkeen tähdellä merkittyihin kenttiin.',
  tallennetaan: 'Lähetysnapin teksti tallennuksen aikana (kolme pistettä ASCII-pisteinä).',
  tallennus_virhe: 'Virheilmoituksen alku; koodi lisää perään välilyönnin ja virheen tekstin.',
};
{
  const L = require('../lib/tm_lang.js').TM_LANG, hae = (k, p) => p.split('.').reduce((o, x) => (o == null ? undefined : o[x]), L[k]);
  const suost = tulos.nakymat.find((n) => n.id === 'suostumus');
  for (const r of suost.odottavat.filter((x) => x.lahde === 'tm_lang')) {
    const avain = r.avain, lyhyt = avain.replace(/^suostumus\./, '');
    lisaa('tm_lang', 'HUOLTAJA (vanhempi) ja lapsi: rekisteröinti- ja suostumuslomake (TalentMaster_Rekisterointi_Suostumus.html) — vahvistuskuitti, virheilmoitukset ja kutsulinkin viestit. Avain = pisteytetty polku lib/tm_lang.js:ssä (suostumus.*). Osa riveistä on lauseen osia, jotka koodi liittää yhteen (huom-kenttä kertoo kokoamisjärjestyksen): käännä niin että ne toimivat yhdistettynä. Lomake on GDPR-polussa: pidä selkeänä, älä pehmennä äläkä lisää lupauksia. Termistö: docs/i18n/termisto.fi-sv.json (lukittu); käytä samoja termejä kuin erässä 53 — erän 53 palautus: docs/i18n/sv_kaannoserae_53_palautus.json (osio kovakoodatut.suostumus). Säilytä välimerkit, <, >, ”-merkit täsmälleen.', 'lib/tm_lang.js', avain, { fi: hae('fi', avain), en: hae('en', avain), ...(KOOSTUS[lyhyt] ? { huom: KOOSTUS[lyhyt] } : {}) });
  }
}
/* (2) lib.tm_harjoitusarviointi */
for (const r of harjoitusarviointiAvaimet()) {
  if ((r.master && r.vp) || e53.fi.has(r.fi) || e53.avain.has(r.fi)) continue;
  lisaa('lib.tm_harjoitusarviointi', 'HENKILÖKUNTA (valmentaja tai VP): harjoitusarviointilomake (lib/tm_harjoitusarviointi.js; sama lomake Masterissa ja VP:ssä; Sibbo-Vargarna, sopimuksen kohta 4.2). Kaksi mallia: A = harjoittelun laatu (liukurit 0–10, prosentit, kyllä/ei), B = valmennustaidot (asteikko 1–5; "matala" ja "korkea" ovat asteikon päiden kuvaukset, 1 = matala, 5 = korkea). Arviointitapa itsearvio tai havainnointi; ikävaihe lapsuus (5–11) / nuoruus (12–15). Avain = suomenkielinen teksti sellaisenaan. Termistö: docs/i18n/termisto.fi-sv.json (lukittu); käytä samoja termejä kuin erässä 53 (osio kovakoodatut.harjoitusarviointi, docs/i18n/sv_kaannoserae_53_palautus.json) ja jo käännetyissä lomakkeen riveissä. Säilytä numerot, %-merkit, ·, … ja välimerkit täsmälleen. viite_sv = sama teksti jo käännettynä VP:n tai Masterin kartassa (johdonmukaisuusapu: käytä samaa muotoa ellei asiayhteys vaadi toista).', 'lib/tm_harjoitusarviointi.js', r.fi, { fi: r.fi, ...(r.viite ? { viite_sv: r.viite } : {}), tila: (r.master ? 'puuttuu vpT-ketjusta' : r.vp ? 'puuttuu masterT-ketjusta' : 'puuttuu molemmista') });
}
/* (3) master_kartta — ikävaiheiden nimet */
for (const r of lisaAvaimetPuuttuu('kehitystyopoyta')) {
  if (r.ok || e53.fi.has(r.fi)) continue;
  lisaa('master_kartta', 'HENKILÖKUNTA (Master + Kehitystyöpöytä-sivu): pelaajan ikävaiheen nimi kehyksen otsikkorivillä (joukkue · ikävaihe), esim. "U13 · Rakentaja". Ikävaiheet: 10–12 Leikkijä · 13–15 Rakentaja · 16–19 Showcase (CLAUDE.md §14). viite_sv = sama nimi VP:n kartassa; käytä samaa muotoa (nimien täytyy olla samat kaikissa sovelluksissa).', 'lib/tm_kehitystyopoyta.js tmKtIkavaihe', r.fi, { fi: r.fi, ...(r.viite ? { viite_sv: r.viite } : {}) });
}
/* (4) vientipohja — kuittaus-aliakset */
{
  const VK = require('./vientipohja_kieli.js'), fi = VK.kaannettavat();
  const huom = { kuit_ok: 'Pudotusvalikon näyttöarvo (sv-pohja). Tuonti tallentaa sisäisesti aina "OK". Jos ruotsissa sopii sama sana, kirjoita se.', kuit_muutettu: 'Pudotusvalikon näyttöarvo: valmentaja on muuttanut harjoitteen luokittelua ja hyväksyy sen. Tuonti tallentaa sisäisesti "Muutettu". Lyhyt, yksiselitteinen sana (ei lause).', kuit_poista: 'Pudotusvalikon näyttöarvo: harjoitetta ei tuoda (poisto). Tuonti tallentaa sisäisesti "Poista". Lyhyt, yksiselitteinen sana (ei lause).', ohje_5v: 'KORVAA erän 53 rivin ohje_5: sama teksti, mutta arvot ovat paikanvaraajina {ok} {muutettu} {poista} (korvataan pohjassa edellä käännetyillä näyttöarvoilla). Säilytä paikanvaraajat täsmälleen.' };
  for (const id of VK.VALINNAISET) lisaa('vientipohja', 'HENKILÖKUNTA / SEURA (Sibbo-Vargarna): seuran harjoituspankin tarkistus-Excel (#1077:n vientipohja). Kuittaus-sarakkeen pudotusvalikon NÄKYVÄT arvot (kuit_*): ne valitaan listasta, ja tuonti hyväksyy sekä suomen- että ruotsinkielisen arvon. Käännä lyhyesti ja yksiselitteisesti. Paikanvaraajat {ok} {muutettu} {poista} säilytetään täsmälleen. Termistö: docs/i18n/termisto.fi-sv.json (lukittu); käytä samaa sanastoa kuin erän 53 osiossa vientipohja (docs/i18n/sv_kaannoserae_53_palautus.json).', 'scripts/vientipohja_kieli.js', id, { fi: fi[id], ...(huom[id] ? { huom: huom[id] } : {}) });
}
const rivejaOsioittain = Object.fromEntries(Object.entries(osiot).map(([k, o]) => [k, Object.keys(o.rivit).length]));
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 54 (Sibbo-reititys: reitityksen uudet avaimet + vientipohjan kuittaus-aliakset; EI erän 53 rivejä; sv tyhjä → Gemini)',
  _pvm: (nyk && nyk._pvm) || new Date().toISOString().slice(0, 10),
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (en, huom, tila, viite_sv) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.',
  _rivit_yhteensa: Object.values(rivejaOsioittain).reduce((a, b) => a + b, 0),
  _rivit_osioittain: rivejaOsioittain,
  osiot,
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
console.log('kirjoitettu ' + OUT.replace(ROOT + '/', '') + ': ' + ulos._rivit_yhteensa + ' riviä · ' + JSON.stringify(rivejaOsioittain));
