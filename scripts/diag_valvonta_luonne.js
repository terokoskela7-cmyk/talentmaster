#!/usr/bin/env node
/* diag_valvonta_luonne.js — Projekti 07 / PR 2b: valvonnan löydösten LUONNE ilman nimiä. VAIN LUKU, gcloud ADC. Tero ajaa:  ! node scripts/diag_valvonta_luonne.js [--projekti=talentmaster-pilot] [--kaikki]
 *  1) E6 (sama PalloID/tunniste usealla pelaajadokumentilla): onko kyse CLAUDE.md §10:n testipelaajista, arkistoiduista dokumenteista, testiarvoisesta tunnisteesta (12345678, toistomerkit…)
 *     vai samannimisestä pelaajasta (siirto seurasta toiseen). Tulostaa vain lukumäärät per ryhmä ja seura — ei nimiä, ei tunnisteita, ei pelaaja-id:itä.
 *  2) E1b (orvot joukkueviitteet): luokitus lukumäärinä — kirjoitusasu (sama joukkue eri kirjoitettuna), osittainen osuma, avainsana (esim. "koko seura"), id-muotoinen (poistetun joukkueen id), muu.
 * Korjausta EI tehdä tämän perusteella: PM päättää (E6: ennen päätöstä ei muuteta mitään). Sama logiikka kuin lib/tm_valvonta.js (tmVE6Luonne, tmVOrpojenLuonne); sama lukukerros kuin käsiajurissa. */
'use strict';
if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan: node scripts/diag_valvonta_luonne.js');
const path = require('path');
const V = require(path.join(__dirname, '..', 'lib', 'tm_valvonta.js'));
const R = require(path.join(__dirname, '..', 'lib', 'tm_valvonta_raportti.js'));
const L = require(path.join(__dirname, '..', 'functions', 'valvonta_luku.js'));

/* CLAUDE.md §10: nimetyt testipelaajat (vertailu vain muistissa; nimiä ei tulosteta) */
const TESTINIMET = ['Topias O´Koskela', 'Toppari Testi', 'Testi Pelaaja', 'Testi Test', 'Tero Testaaja'], TESTI_IDT = ['m93GBdOaGCUuenMiCL0I'];
const KOKOELMAT = ['kalenteri', 'harjoitusarvioinnit', 'pelaajat', 'toimenpiteet', 'viestit', 'mentoroinnit', 'kooste_joukkue'];
const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n), kyllaEi = (b) => (b ? 'kyllä' : 'ei');

function muotoile(aineisto, opts) {
  const rivit = [], ohi = opts.ohitetut;
  rivit.push('# Valvonta · diagnostiikka (vain luku) · löydösten luonne · ' + opts.projekti + ' · ' + new Date(aineisto.nytMs).toISOString());
  rivit.push('seuroja luettu ' + aineisto.seurat.length + ' · lukuvirheitä ' + aineisto.virheet.length);
  aineisto.virheet.forEach((v) => rivit.push('LUKUVIRHE seura=' + v.seura + ' koodi=' + v.koodi));

  const ryhmat = V.tmVE6Luonne(aineisto.seurat, TESTINIMET, TESTI_IDT);
  rivit.push('', '## E6: samaa tunnistetta käyttävät pelaajadokumentit — ryhmiä ' + ryhmat.length);
  rivit.push(pad('ryhmä', 7) + pad('dok', 5) + pad('seurat (dok)', 34) + pad('samassa seurassa', 18) + pad('testipelaajia', 15) + pad('arkistoituja', 14) + pad('testiarvo', 11) + pad('muoto', 16) + 'samanniminen');
  ryhmat.forEach((r, i) => rivit.push(pad(i + 1, 7) + pad(r.koko, 5) + pad(Object.keys(r.seurat).sort().map((s) => s + ':' + r.seurat[s]).join(' '), 34) + pad(kyllaEi(r.sisaSeura), 18) + pad(r.testipelaajia + ' / ' + r.koko, 15) + pad(r.arkistoituja + ' / ' + r.koko, 14) + pad(kyllaEi(r.testiarvo), 11) + pad(r.muoto, 16) + kyllaEi(r.samaNimi)));
  const kaikki = ryhmat.filter((r) => r.testipelaajia === r.koko).length, arkisto = ryhmat.filter((r) => r.arkistoituja > 0).length;
  rivit.push('yhteenveto: ryhmää, joissa KAIKKI dokumentit ovat §10-testipelaajia: ' + kaikki + ' / ' + ryhmat.length + ' · ryhmää, joissa jokin dokumentti on arkistoitu: ' + arkisto + ' · testiarvoisia tunnisteita: ' + ryhmat.filter((r) => r.testiarvo).length + ' · samannimisiä (siirto seurasta toiseen): ' + ryhmat.filter((r) => r.samaNimi).length);

  const I = V.tmVIndeksit(aineisto.seurat.map((s) => ({ sid: s.sid, joukkueet: s.joukkueet, pelaajat: (s.kokoelmat || {}).pelaajat, kayttajat: s.kayttajat })));
  rivit.push('', '## E1b: orpojen joukkueviitteiden luonne (dokumentteja per luokka; vain seurat, joissa orpoja on)');
  rivit.push(pad('seura', 18) + pad('kokoelma', 22) + lpad('orpoja', 8) + lpad('kirjoitusasu', 14) + lpad('osittainen', 12) + lpad('avainsana', 11) + lpad('id_muotoinen', 14) + lpad('muu', 6));
  let yht = 0;
  aineisto.seurat.filter((s) => ohi.indexOf(s.sid) < 0).forEach((s) => KOKOELMAT.forEach((kok) => {
    if (!(s.kokoelmat || {})[kok]) return;
    const o = V.tmVOrpojenLuonne(s.sid, kok, s.kokoelmat[kok], s.joukkueet, I); if (!o.orpoja) return; yht += o.orpoja;
    rivit.push(pad(s.sid, 18) + pad(kok, 22) + lpad(o.orpoja, 8) + lpad(o.luokat.kirjoitusasu, 14) + lpad(o.luokat.osittainen, 12) + lpad(o.luokat.avainsana, 11) + lpad(o.luokat.id_muotoinen, 14) + lpad(o.luokat.muu, 6));
  }));
  if (!yht) rivit.push('(ei orpoja)');
  return rivit.join('\n') + '\n';
}

async function ajaMain() {
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  const argv = process.argv.slice(2), arg = (n, d) => { const o = argv.find((a) => a.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : d; };
  const projekti = arg('projekti', 'talentmaster-pilot'), nyt = arg('nyt', null), nytMs = nyt ? Date.parse(nyt) : Date.now();
  if (isNaN(nytMs)) throw new Error('--nyt: ei kelpaa ISO-ajaksi');
  admin.initializeApp({ projectId: projekti });
  const aineisto = await L.kerayAineisto(admin.firestore(), { nytMs }), ohitetut = argv.indexOf('--kaikki') >= 0 ? [] : V.OHITETUT_SEURAT;
  const ulos = muotoile(aineisto, { ohitetut, projekti });
  const pii = R.tmVOnkoPii(ulos, TESTINIMET.concat(TESTI_IDT));   // vartija: ei sähköpostia, ei testipelaajien nimiä eikä id:itä
  if (!pii.ok) throw new Error('tuloste hylätty: PII-vartija (' + pii.rikkomukset.map((r) => r.tyyppi).join(',') + ')');
  process.stdout.write(ulos);
}
if (require.main === module) ajaMain().catch((e) => { console.error('Virhe: ' + R.tmVTurvallinenVirhe(e).koodi); process.exit(2); });
