#!/usr/bin/env node
'use strict';
/**
 * luo_harjoitepankki_pohja.js — tyhjä harjoituspankin tarkistus-/vientipohja seuralle (Excel). Sama rakenne kuin KPV:n kuittauspohja (Cowork 14.10.2026), jota tuo_harjoitepankki_kuittaus.js lukee:
 *   välilehdet Harjoitteet · listat · OHJE. Sarakkeet: id · nimi · pankki · teema (seura) · tyyppi · ikä · tavoite · Mitä harjoitellaan · Toissijainen · Lähde · video_url · kuittaus · kommentti.
 *   "Mitä harjoitellaan" = D248:n 14 nimeä + "ei TalentMaster-konseptia" (pudotusvalikko, ei konseptikoodeja); Lähde = oma / SoccerTutor / SPL-korttipohja / muu · en tiedä; kuittaus = OK / Muutettu / Poista.
 *   node scripts/luo_harjoitepankki_pohja.js --seura-nimi SJK [--rivit 150] [--ulos SJK_harjoituspankki_tarkistus.xlsx]
 * Pohjassa EI ole seuran aineistoa: seuran rivit (id/nimi/…) täytetään erikseen (id = pankin dokumentin id).
 */
const fs = require('fs');
const H = require('../lib/tm_harjoitepankki.js');
const { kirjoitaXlsx } = require('./xlsx_kirjoita');

const OTSIKOT = (seura) => ['id', 'nimi', 'pankki', 'teema (' + seura + ')', 'tyyppi', 'ikä', 'tavoite', 'Mitä harjoitellaan', 'Toissijainen', 'Lähde', 'video_url', 'kuittaus', 'kommentti'];
const KUITTAUKSET = ['OK', 'Muutettu', 'Poista'];
const LAHTEET = (seura) => ['oma (' + seura + ')', 'SoccerTutor', 'SPL-korttipohja', 'muu / en tiedä'];
const KONSEPTI_NIMET = () => H.KONSEPTIT.map((x) => x[1]).concat([H.EI_KONSEPTIA]);

function ohje(seura, n) {
  return [seura + ' · harjoituspankin tarkistus TalentMasteriin', '', 'Mitä tämä on',
    'Tässä ovat ' + seura + ':n harjoituspankin harjoitteet' + (n ? ' (' + n + ')' : '') + '. Kahteen sarakkeeseen kysytään teiltä tieto, jota ei ole alkuperäisessä aineistossa.', '', 'Mitä tarkistat',
    '1. MITÄ HARJOITELLAAN: mitä taitoa harjoite ensisijaisesti kehittää. Vaihda tarvittaessa pudotusvalikosta.', '   Tämän perusteella valmentaja näkee sovelluksessa oikean harjoitteen, kun pelaajan jakso harjoittelee samaa asiaa.',
    '2. TOISSIJAINEN: vapaaehtoinen, jos harjoite tukee selvästi myös toista asiaa.',
    '3. LÄHDE: onko harjoite ' + seura + ':n oma, SoccerTutor-kortti vai Palloliiton (SPL) korttipohja. Tämä on tärkeä: SoccerTutor-korttien tekstiä emme voi näyttää sovelluksessa, vain nimen ja kuvan. Tyhjä = "muu / en tiedä" (näytetään kuten oma harjoite).',
    '4. VIDEO_URL: jos harjoitteesta on video (YouTube, Vimeo, Drive), liitä linkki. Linkin pitää aueta ilman kirjautumista ja alkaa https://. Muita linkkejä ei tuoda.',
    '5. KUITTAUS: OK · Muutettu · Poista. Vain OK ja Muutettu -rivit tuodaan; tyhjä kuittaus = ei vielä tarkistettu, jolloin rivi ei näy toimintakortissa. KOMMENTTI-sarakkeeseen voi kirjoittaa kysymyksen.', '',
    'Älä poista, lajittele tai siirrä rivejä. Älä muuta sarakkeiden otsikoita.', 'Arvioitu aika: 30–45 min.', '', 'Mitä harjoitellaan -vaihtoehdot'].concat(KONSEPTI_NIMET().map((x) => '• ' + x));
}

/** → Buffer (.xlsx). opts { seura: 'SJK', rivit: 150 } — rivit = montako riviä pudotusvalikot kattavat. */
function luoPohja(opts) {
  opts = opts || {}; const seura = String(opts.seura || 'seura').trim() || 'seura', n = Math.max(1, Math.min(2000, Number(opts.rivit) || 200)), ots = OTSIKOT(seura);
  const listat = []; const kons = KONSEPTI_NIMET(), la = LAHTEET(seura); for (let i = 0; i < kons.length; i++) listat.push([kons[i], la[i] || '', KUITTAUKSET[i] || '']);
  const alue = (c) => c + '2:' + c + (n + 1);
  return kirjoitaXlsx({ sheets: [
    { nimi: 'OHJE', rivit: ohje(seura, null).map((t) => [t]), leveys: [130], rivita: true },
    { nimi: 'Harjoitteet', rivit: [ots], otsikko: true, jaa: true, leveys: [10, 32, 18, 24, 14, 14, 60, 26, 24, 22, 28, 12, 30],
      validoinnit: [{ sqref: alue('H'), kaava: 'listat!$A$1:$A$' + kons.length }, { sqref: alue('I'), kaava: 'listat!$A$1:$A$' + kons.length }, { sqref: alue('J'), kaava: 'listat!$B$1:$B$' + la.length }, { sqref: alue('L'), kaava: 'listat!$C$1:$C$' + KUITTAUKSET.length }] },
    { nimi: 'listat', rivit: listat, leveys: [30, 22, 14] },
  ] });
}

function argv(a) { const o = {}; for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) o[a[i].slice(2)] = a[++i]; return o; }
if (require.main === module) {
  const o = argv(process.argv.slice(2)), seura = o['seura-nimi'] || 'seura', ulos = o.ulos || (seura.replace(/[^A-Za-z0-9_-]+/g, '_') + '_harjoituspankki_tarkistus.xlsx');
  fs.writeFileSync(ulos, luoPohja({ seura, rivit: o.rivit })); console.log('Kirjoitettu ' + ulos + ' (tyhjä pohja: Harjoitteet · listat · OHJE).');
}
module.exports = { luoPohja, OTSIKOT, LAHTEET, KUITTAUKSET, KONSEPTI_NIMET, ohje };
