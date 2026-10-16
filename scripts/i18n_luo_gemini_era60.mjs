#!/usr/bin/env node
/* Gemini-erä 60 (Pikakortin sv-tilan viimeiset suomenkieliset tekstit, 16.10.): "Muuta porrasta" -arkin rivit, merkit, chip-laskuri, päiväteksti, ok-näkymä, offline-toast, aria-label.
   Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää. Kaikki rivit ovat henkilosto_kartta (tmHT, avain = fi-teksti sellaisenaan; paikkamerkit {n} {nimi} {aika} {lista} säilytetään).
   Kaksi löydettyä tekstiä käyttää jo viedyt käännökset ("Tallennettu" = Sparat, "Valmis" = Klar) → ei rivejä. Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era60.mjs [--tiedosto=docs/i18n/sv_kaannoserae_60_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_60_gemini.json'));
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (avain) => { const r = nyk && nyk.osiot && nyk.osiot.henkilosto_kartta && nyk.osiot.henkilosto_kartta.rivit[avain]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const VIITE = ' Termistö: "Porras" = Steg (Steg 4 / 4), havainto = observation, pelaaja = spelare, aiemmat vastaavat: "{n} pv sitten" = "för {n} d sedan", "✓ tänään" = "✓ idag", "Tallennettu" = "Sparat".';
const H = {
  'Porras {n} / 4': 'UUSI (parametrisoitu; ennen "Porras" + luku + " / 4" yhdisteltynä). Otsikko ja tikkaiden aria-label: porras {n} neljästä, esim. "Porras 4 / 4" → "Steg 4 / 4". Säilytä {n} ja " / 4".' + VIITE,
  'Porras {n} · {lista}': 'UUSI. "Muuta porrasta" -arkin rivi: porras {n} ja perässä portaan ulottuvuudet {lista} (esim. "Havainnointi + Päätös + Toteutus", käännetään erikseen, älä käännä paikkamerkkiä). Esim. "Porras 3 · Havainnointi + Päätös + Toteutus" → "Steg 3 · Observation + Beslut + Aktion". Säilytä {n}, {lista} ja väli-piste "·".' + VIITE,
  'ikäsuositus': 'UUSI. Pieni merkki "Muuta porrasta" -arkin rivin alla: porras on pelaajan IKÄÄ vastaava oletus/suositus (ei pelaajan oma porras). Pienellä alkukirjaimella, kuten "nykyinen"; näytetään joskus yhdessä: "ikäsuositus · nykyinen".',
  'nykyinen': 'UUSI. Pieni merkki arkin rivin alla: tämä on pelaajalle tallennettu NYKYINEN porras. Pienellä alkukirjaimella; joskus yhdessä: "ikäsuositus · nykyinen".',
  '{n} valittu': 'UUSI (parametrisoitu; ennen luku + " valittu"). Ulottuvuuden "Mitä näit?" -linkin perässä: kuinka monta havaintovaihtoehtoa on valittu, esim. "Mitä näit? ▾ · 2 valittu" → "Vad såg du? ▾ · 2 valda". Säilytä {n}; huom. luku voi olla 1 (ei monikkoa vaativaa muotoa jos vältettävissä, esim. "valda: {n}" tai neutraali muoto).',
  'eilen': 'UUSI. Pelaajalistan meta-teksti: viimeisin havainto tehtiin eilen. Pienellä alkukirjaimella (kuten "ei havaintoja", "{n} pv sitten").' + VIITE,
  'Tallessa laitteella': 'UUSI. Otsikko tallennuksen jälkeen, kun verkko puuttuu: havainto on tallennettu laitteelle ja lähtee, kun yhteys palaa. (Verkon kanssa otsikko on "Tallennettu" = "Sparat".)' + VIITE,
  'Seuraavana: {nimi} · {aika}': 'UUSI (parametrisoitu; ennen yhdisteltynä). Alapalkin yhteenveto tallennuksen jälkeen: seuraava pelaaja {nimi} ja hänen viimeisin havaintonsa {aika} (esim. "eilen", "3 pv sitten", "ei havaintoja"; käännetään erikseen). Säilytä {nimi}, {aika} ja " · ".' + VIITE,
  '✓ Offline-merkinnät synkronoitu': 'UUSI. Ilmoitus (toast): verkottomana tallennetut havainnot lähetettiin onnistuneesti. Säilytä alkumerkki "✓". Sisarlause: "✓ {n} synkronoitu · {m} ei kelvannut".' + VIITE,
  'Konteksti': 'UUSI. Ruudunlukijan (aria-label) nimi ryhmälle, jossa valmentaja valitsee missä havainto tehtiin (Harjoitus / Pienpeli / Ottelu). Yksi sana: konteksti/sammanhang.'
};
const rivit = {}; for (const [k, h] of Object.entries(H)) rivit[k] = { fi: k, huom: h, sv: vanha(k) };
const n = Object.keys(rivit).length;
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 60 (Pikakortin sv-tilan viimeiset suomenkieliset tekstit; sv tyhjä → Gemini)',
  _pvm: '2026-10-16',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.',
  _rivit_yhteensa: n,
  _rivit_osioittain: { henkilosto_kartta: n },
  osiot: { henkilosto_kartta: { _konteksti: 'HENKILÖKUNTA (valmentaja kentällä, puhelin): ADAR-pikakortin (Pelihavainto) käyttöliittymän tekstit — porrasarkki ("Muuta porrasta"), pelaajalistan päiväteksti, tallennuksen jälkeinen näkymä, offline-ilmoitus ja ruudunlukijan nimi. Avain = suomenkielinen teksti sellaisenaan (Pikakortti tmHT). Sävy: valmentajalle suunnattu, konkreettinen, lyhyt (kapea näyttö). Paikkamerkit {n} {nimi} {aika} {lista} säilytetään. Termistö lukittu (docs/i18n/termisto.fi-sv.json).', _lahde: 'TalentMaster_ADAR_Pikakortti.html (tmHT)', rivit } }
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
console.log('Kirjoitettu ' + n + ' riviä → ' + OUT.replace(ROOT + '/', ''));
