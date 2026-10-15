#!/usr/bin/env node
'use strict';
/**
 * luo_harjoitepankki_pohja.js — tyhjä harjoituspankin tarkistus-/vientipohja seuralle (Excel). Sama rakenne kuin KPV:n kuittauspohja (Cowork 14.10.2026), jota tuo_harjoitepankki_kuittaus.js lukee:
 *   välilehdet Harjoitteet · listat · OHJE. Sarakkeet: id · nimi · pankki · teema (seura) · tyyppi · ikä · tavoite · Mitä harjoitellaan · Toissijainen · Lähde · video_url · kuittaus · kommentti.
 *   "Mitä harjoitellaan" = D248:n 14 nimeä + "ei TalentMaster-konseptia" (pudotusvalikko, ei konseptikoodeja); Lähde = oma / SoccerTutor / SPL-korttipohja / muu · en tiedä; kuittaus = OK / Muutettu / Poista.
 *   node scripts/luo_harjoitepankki_pohja.js --seura-nimi SJK [--rivit 150] [--kieli fi|sv] [--salli-puutteet] [--ulos SJK_harjoituspankki_tarkistus.xlsx]
 *   --kieli sv: otsikot, välilehdet, OHJE ja listojen näkyvät arvot ruotsiksi (kielitaulu scripts/vientipohja_kieli.js; sv-tekstit Gemini-erästä 53). Sisäiset avaimet pysyvät: id, video_url, kuittaus-arvot.
 * Pohjassa EI ole seuran aineistoa: seuran rivit (id/nimi/…) täytetään erikseen (id = pankin dokumentin id).
 */
const fs = require('fs');
const H = require('../lib/tm_harjoitepankki.js');
const { kirjoitaXlsx } = require('./xlsx_kirjoita');
const K = require('./vientipohja_kieli');

const KUITTAUKSET = K.KUITTAUKSET;
// fi-oletukset (taaksepäin yhteensopiva API; teksti tulee kielitaulusta — scripts/vientipohja_kieli.js)
const OTSIKOT = (seura) => K.pohjaSisalto(K.kielitaulu('fi'), seura).otsikot;
const LAHTEET = (seura) => K.pohjaSisalto(K.kielitaulu('fi'), seura).lahteet;
const KONSEPTI_NIMET = () => K.pohjaSisalto(K.kielitaulu('fi'), 'x').konseptit;
const ohje = (seura, n) => K.pohjaSisalto(K.kielitaulu('fi'), seura, n).ohje;
const lainaa = (nimi) => (/^[A-Za-z0-9_]+$/.test(nimi) ? nimi : "'" + nimi.replace(/'/g, "''") + "'");   // kaavan välilehtiviite: lainausmerkit vain jos nimessä muuta kuin ASCII-kirjaimia/numeroita

/** → Buffer (.xlsx). opts { seura: 'SJK', rivit: 150, kieli: 'fi'|'sv', sanasto?, salliPuutteet? } — rivit = montako riviä pudotusvalikot kattavat.
 *  kieli 'sv': puuttuva sv-teksti (Gemini-erä 53 ei vielä viety) → heittää, ellei salliPuutteet (silloin puuttuva teksti jää suomeksi). Sisäiset avaimet (id, video_url, kuittaus-arvot) eivät käänny. */
function luoPohja(opts) {
  opts = opts || {};
  const seura = String(opts.seura || 'seura').trim() || 'seura', n = Math.max(1, Math.min(2000, Number(opts.rivit) || 200));
  const kt = K.kielitaulu(opts.kieli || 'fi', opts.sanasto ? { sanasto: opts.sanasto } : undefined);
  if (kt.puuttuu.length && !opts.salliPuutteet) throw new Error('sv-pohja: ' + kt.puuttuu.length + ' tekstiä puuttuu (Gemini-erä 53 ei vielä viety: scripts/i18n_vie_sv_vientipohja.cjs): ' + kt.puuttuu.slice(0, 8).join(', ') + (kt.puuttuu.length > 8 ? ' …' : '') + '. Ohita vain --salli-puutteet.');
  const c = K.pohjaSisalto(kt, seura, null), vl = c.valilehdet;
  const listat = []; for (let i = 0; i < c.konseptit.length; i++) listat.push([c.konseptit[i], c.lahteet[i] || '', KUITTAUKSET[i] || '']);
  const alue = (col) => col + '2:' + col + (n + 1), L = lainaa(vl.listat);
  return kirjoitaXlsx({ sheets: [
    { nimi: vl.ohje, rivit: c.ohje.map((t) => [t]), leveys: [130], rivita: true },
    { nimi: vl.harjoitteet, rivit: [c.otsikot], otsikko: true, jaa: true, leveys: [10, 32, 18, 24, 14, 14, 60, 26, 24, 22, 28, 12, 30],
      validoinnit: [{ sqref: alue('H'), kaava: L + '!$A$1:$A$' + c.konseptit.length }, { sqref: alue('I'), kaava: L + '!$A$1:$A$' + c.konseptit.length }, { sqref: alue('J'), kaava: L + '!$B$1:$B$' + c.lahteet.length }, { sqref: alue('L'), kaava: L + '!$C$1:$C$' + KUITTAUKSET.length }] },
    { nimi: vl.listat, rivit: listat, leveys: [30, 22, 14] },
  ] });
}

function argv(a) { const o = {}; for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { if (a[i] === '--salli-puutteet') o['salli-puutteet'] = '1'; else o[a[i].slice(2)] = a[++i]; } return o; }
if (require.main === module) {
  const o = argv(process.argv.slice(2)), seura = o['seura-nimi'] || 'seura', kieli = o.kieli || 'fi', ulos = o.ulos || (seura.replace(/[^A-Za-z0-9_-]+/g, '_') + '_harjoituspankki_tarkistus' + (kieli === 'fi' ? '' : '_' + kieli) + '.xlsx');
  try { fs.writeFileSync(ulos, luoPohja({ seura, rivit: o.rivit, kieli, salliPuutteet: o['salli-puutteet'] === '1' })); } catch (e) { console.error(e.message); process.exit(2); }
  console.log('Kirjoitettu ' + ulos + ' (tyhjä pohja, kieli ' + kieli + ').');
}
module.exports = { luoPohja, OTSIKOT, LAHTEET, KUITTAUKSET, KONSEPTI_NIMET, ohje };
