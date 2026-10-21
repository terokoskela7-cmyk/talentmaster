#!/usr/bin/env node
/* sv-erä 82 (Seura-tuonti: olemassa olevat pelaajat, monta sähköpostia, kutsuikkuna; CODE_BRIEF_SEURA_TUONTI_OLEMASSA 21.10.2026) — lähetystiedosto PM:lle.
   Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, PM kirjoittaa. Avain = suomenkielinen teksti sellaisenaan (tmHT-reititin: lib/tm_henkilosto_i18n.js, osio henkilosto_kartta).
   Mukana vain rivit, joita ei vielä ole henkilöstökartassa eikä yhteisessä kartassa (tm_henkilosto_i18n.js / tm_i18n_common.js). Idempotentti: täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era82.mjs [--tiedosto=docs/i18n/sv_kaannoserae_82_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_82_gemini.json'));
const _log = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('[TM Lang]') && !String(a[0]).startsWith('[tm-')) _log(...a); };
const HS = (require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N || require('../lib/tm_henkilosto_i18n.js')).sv, CS = (require('../lib/tm_i18n_common.js').TM_I18N_COMMON || require('../lib/tm_i18n_common.js')).sv;
const KONTEKSTI = 'HENKILÖKUNTA: Seurahallinta (VP/sihteeri/UTJ). Avain = suomenkielinen teksti sellaisenaan. Paikanvaraajat ({n}, {osoite}, {vanha}, {uusi}) säilytetään täsmälleen. Excel-tuonnin esikatselu ja yhteenveto: rivin tila "Uusi" / "Jo järjestelmässä" + mikä eroaa Excelistä; pelaajakortin kutsuikkuna ja kutsuhistoria. Termit: huoltaja = vårdnadshavare, suostumus = samtycke, kutsu = inbjudan, kehityssuunnitelma = utvecklingsplan (sama kuin termisto.fi-sv). Sävy: selkeä, arkinen.';
const RIVIT = {
  '📧 Lähetä sähköpostilla': 'Pelaajakortin kutsuikkunan nappi (aiemmin kovakoodattu). Toimintokehote.',
  '📋 Avaa kehityssuunnitelma': 'Pelaajakortin nappi (aiemmin "Avaa kehityskortti (IDP)"; sanasto K1d: Kehityssuunnitelma, ei IDP). Sama termi kuin termistössä "Kehityssuunnitelma".',
  'Puuttuu: syntymävuosi': 'Pelaajalistan suodatinnappi; perässä koodissa lukumäärä sulkeissa. Sihteeri näkee pelaajat, joilta syntymävuosi puuttuu.',
  '8.  Yksi sähköposti per solu. Toinen huoltaja lisätään myöhemmin sovelluksessa.': 'Excel-pohjan Ohje-sarakkeen rivi 8. Säilytä numero ja kaksi välilyöntiä alussa.',
  '9.  Tallenna → lataa takaisin TalentMasteriin.': 'Excel-pohjan Ohje-sarakkeen rivi 9 (aiemmin rivi 8). Säilytä numero ja kaksi välilyöntiä alussa.',
  'Päivitä olemassa olevat pelaajat Excelin mukaan': 'Esikatselun valintaruudun teksti: päivittää järjestelmässä jo olevien pelaajien joukkueen, puuttuvan syntymävuoden ja puuttuvan sähköpostin.',
  'jo järjestelmässä': 'Esikatselun yhteenvetorivi: "{n} pelaajaa tunnistettu · 3 jo järjestelmässä". Pieni kirjain, ei pistettä.',
  'Uusi': 'Esikatselun rivin tila (pelaajaa ei ole vielä järjestelmässä). Yksi sana.',
  'Jo järjestelmässä': 'Esikatselun rivin tila (pelaaja on jo järjestelmässä).',
  'Päivitä': 'Rivikohtaisen valintaruudun teksti (päivitä tämä pelaaja Excelin mukaan).',
  'Yksi sähköposti per solu': 'Esikatselun punainen virhe: huoltajan sähköpostisolussa oli monta osoitetta. Ei pistettä.',
  'Sähköposti virheellinen – kutsua ei lähetetä': 'Esikatselun punainen virhe: osoite ei kelpaa. Ei pistettä.',
  'Kutsu lähtee: {osoite}. Muut huoltajat lisätään myöhemmin.': 'Esikatselun huomautus monen osoitteen solulle. {osoite} = ensimmäinen osoite, säilytä.',
  'Joukkue: {vanha} → {uusi}': 'Esikatselun ero-rivi: pelaajan joukkue vaihtuu. {vanha} ja {uusi} = joukkueiden nimet, säilytä nuoli.',
  'Syntymävuosi puuttuu → {uusi}': 'Esikatselun ero-rivi: järjestelmästä puuttuu syntymävuosi, Excelistä asetetaan {uusi} (vuosiluku).',
  'Syntymävuosi: {vanha} (Excelissä {uusi})': 'Esikatselun ero-rivi: syntymävuosi on eri; ei vaihdeta. {vanha} ja {uusi} = vuosilukuja.',
  'Sähköposti puuttuu → lisätään': 'Esikatselun ero-rivi: huoltajan sähköposti puuttuu järjestelmästä ja lisätään Excelistä.',
  'Sähköposti eri – ei vaihdeta (suostumus annettu)': 'Esikatselun ero-rivi: Excelin osoite eroaa, mutta suostumus on jo annettu (huoltaja tunnistettu) → osoitetta ei vaihdeta.',
  'Sähköposti eri → päivitetään': 'Esikatselun ero-rivi: Excelin osoite eroaa ja suostumusta ei ole annettu → osoite päivitetään.',
  'Suostumus: annettu': 'Esikatselun ero-rivi: huoltajan suostumuksen tila.',
  'Suostumus: kutsu lähetetty': 'Esikatselun ero-rivi: kutsu on lähetetty, suostumusta odotetaan.',
  'Suostumus: ei kutsua': 'Esikatselun ero-rivi: kutsua ei ole lähetetty.',
  '{n} uutta': 'Tuonnin yhteenveto: uusia pelaajia {n} kpl. Yhteenveto kokonaisuudessaan: "3 uutta · 11 päivitetty (joukkue vaihtui: 11) · 2 ennallaan · kutsuja 14". Palaset yhdistetään koodissa erottimella " · ".',
  '{n} päivitetty': 'Tuonnin yhteenvetopala: päivitettyjä pelaajia {n} kpl.',
  'joukkue vaihtui: {n}': 'Tuonnin yhteenvetopala (sulkeissa "{n} päivitetty"-palan perässä): montako pelaajaa vaihtoi joukkuetta.',
  '{n} ennallaan': 'Tuonnin yhteenvetopala: pelaajia, joihin ei tehty muutoksia.',
  'kutsuja {n}': 'Tuonnin yhteenvetopala: lähetettyjen kutsujen määrä.',
  '✉️ Lähetetty': 'Kutsuhistorian tila: sähköposti on lähtenyt.',
  '⚠️ Lähetys epäonnistui': 'Kutsuhistorian tila: sähköpostin lähetys epäonnistui.',
  '✓ Hyväksytty': 'Kutsuhistorian tila: huoltaja on antanut suostumuksen (aiemmin kovakoodattu).',
};
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (k) => { const r = nyk && nyk.osiot && nyk.osiot.henkilosto_kartta && nyk.osiot.henkilosto_kartta.rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const rivit = {};
for (const [fi, huom] of Object.entries(RIVIT)) { if (fi in HS || fi in CS) continue; rivit[fi] = { fi, huom, sv: vanha(fi) }; }
const ulos = { _otsikko: 'Käännöserä 82 (Seura-tuonti: olemassa olevat pelaajat, monta sähköpostia, kutsuikkuna) — sv: PM kirjoittaa', osiot: { henkilosto_kartta: { _konteksti: KONTEKSTI, _lahde: 'TalentMaster_Seura.html (tmHT) + lib/tm_seura_tuonti.js', rivit } } };
writeFileSync(OUT, JSON.stringify(ulos, null, 2) + '\n');
console.log(JSON.stringify({ tiedosto: OUT.replace(ROOT + '/', ''), rivit: Object.keys(rivit).length }));
