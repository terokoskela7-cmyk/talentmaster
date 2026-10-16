#!/usr/bin/env node
/* Gemini-erä 62 (Pikakortti yhdelle näytölle, 16.10.): "Muuta porrasta" -arkin rivit, merkit, chip-laskuri, päiväteksti, ok-näkymä, offline-toast, aria-label.
   Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää. Kaikki rivit ovat henkilosto_kartta (tmHT, avain = fi-teksti sellaisenaan; paikkamerkit {n} {nimi} {aika} {lista} säilytetään).
   Kaksi löydettyä tekstiä käyttää jo viedyt käännökset ("Tallennettu" = Sparat, "Valmis" = Klar) → ei rivejä. Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era60.mjs [--tiedosto=docs/i18n/sv_kaannoserae_62_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_62_gemini.json'));
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (avain) => { const r = nyk && nyk.osiot && nyk.osiot.henkilosto_kartta && nyk.osiot.henkilosto_kartta.rivit[avain]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const VIITE = ' Termistö: "Porras" = Steg, havainto = observation, pelaaja = spelare, aiemmat vastaavat: "{n} pv sitten" = "för {n} d sedan", "Tallennettu" = "Sparat", "pelaaja näkee" = "spelaren ser", "vain valmentajille" = "endast för tränare" (viimeiset kaksi ovat jo koodissa — käytä samaa sanastoa).';
const H = {
  'Vaihda': 'UUSI. Pieni linkki pelaajarivin oikeassa reunassa (kapea puhelinnäyttö): vaihda toiseen pelaajaan. Yksi sana, verbi imperatiivissa (aiempi pidempi: "Vaihda pelaaja").' + VIITE,
  'Muuta': 'UUSI. Pieni linkki porrasrivin oikeassa reunassa ("PORRAS 3 / 4 ▬▬▬▬ Muuta"): avaa porraksen valinnan. Yksi sana, imperatiivi (aiempi pidempi: "Muuta porrasta").' + VIITE,
  'Pelaaja näkee': 'UUSI. Kytkimen nimi alapalkissa: kytkin päällä = pelaaja näkee tämän havainnon viestin sovelluksessaan, pois = vain valmentajat. Lyhyt, kuvaa tilaa (ei toimintoa). Aiempi: "Näytä pelaajalle".' + VIITE,
  'Mitä näit?': 'UUSI (ilman nuolta; aiempi "Mitä näit? ▾" oli avattava linkki). Pieni versaali yläotsikko palauteruudussa, jonka perässä samalla rivillä valintapainikkeet (esim. "Katsoo ylös", "Lukee pelaajat"): mitä valmentaja havaitsi pelaajasta. Kysymysmerkki säilyy.' + VIITE,
  '+ Viesti pelaajalle': 'UUSI. Alapalkin linkki, joka avaa vapaaehtoisen viestikentän pelaajalle. Säilytä alkumerkki "+". Lyhyt (kapea näyttö).' + VIITE,
  'Viesti ✓': 'UUSI. Sama linkki kun viesti on jo kirjoitettu: "Viesti" + valintamerkki ✓. Säilytä "✓".' + VIITE,
  '{nimi} tallennettu': 'UUSI (parametrisoitu). Tallennuksen jälkeinen ilmoitus, kun seuraava pelaaja avautuu heti: "{nimi} tallennettu" → perään tulee erikseen " · porras {n}" ja " · pelaaja näkee" / " · vain valmentajille". Esim. "Topias tallennettu". Säilytä {nimi}.' + VIITE,
  'porras {n}': 'UUSI (parametrisoitu). Ilmoituksen osa, näkyy vain kun pelaajan porras nousi: "Topias tallennettu · porras 3 · pelaaja näkee". Pienellä alkukirjaimella (Steg {n}). Säilytä {n}.' + VIITE,
  '{nimi} tallessa laitteella · lähtee, kun yhteys palaa': 'UUSI (parametrisoitu). Ilmoitus kun verkkoa ei ole: havainto on tallessa laitteella ja lähtee automaattisesti kun yhteys palaa. Säilytä {nimi} ja väli-piste " · ".' + VIITE,
  '{nimi}: havaintoa ei tallennettu': 'UUSI (parametrisoitu). Pysyvän varoituspalkin teksti: pelaajan {nimi} havainto EI tallentunut (palkissa on perässä "Avaa"-linkki, jolla havainto avataan uudelleen). Kaksoispiste säilyy. Esim. "Topias: havaintoa ei tallennettu".' + VIITE,
  '{n} v': 'KORJAUS (puuttui sv-kartasta, sv-tilassa näkyi suomen "v"). Pelaajarivin ikä: "13 v" = 13 vuotta. Lyhenne, ruotsiksi "{n} år". Säilytä {n}.' + VIITE
};
const rivit = {}; for (const [k, h] of Object.entries(H)) rivit[k] = { fi: k, huom: h, sv: vanha(k) };
const n = Object.keys(rivit).length;
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 62 (Pikakortti yhdelle näytölle: uudet lyhyet tekstit + ilmoitukset; sv tyhjä → Gemini)',
  _pvm: '2026-10-16',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.',
  _rivit_yhteensa: n,
  _rivit_osioittain: { henkilosto_kartta: n },
  osiot: { henkilosto_kartta: { _konteksti: 'HENKILÖKUNTA (valmentaja kentällä, puhelin): ADAR-pikakortin (Pelihavainto) käyttöliittymän tekstit — porrasarkki ("Muuta porrasta"), pelaajalistan päiväteksti, tallennuksen jälkeinen näkymä, offline-ilmoitus ja ruudunlukijan nimi. Avain = suomenkielinen teksti sellaisenaan (Pikakortti tmHT). Sävy: valmentajalle suunnattu, konkreettinen, lyhyt (kapea näyttö). Paikkamerkit {n} {nimi} {aika} {lista} säilytetään. Termistö lukittu (docs/i18n/termisto.fi-sv.json).', _lahde: 'TalentMaster_ADAR_Pikakortti.html (tmHT)', rivit } }
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
console.log('Kirjoitettu ' + n + ' riviä → ' + OUT.replace(ROOT + '/', ''));
