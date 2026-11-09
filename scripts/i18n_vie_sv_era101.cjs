#!/usr/bin/env node
/* sv-erä 101 (VP:n Kenttä-lippu, #1244; PM 9.11.2026): 69 riviä → VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_101_palautus.json (PM) ↔ docs/i18n/sv_kaannoserae_101_gemini.json (lähetetty erä, osio vp_kentta).
   Kaista: Tero. Code EI kirjoita ruotsia (§0): jokainen kartan sv on PM:n rivi merkki merkiltä. Poikkeus on PM:n erikseen ohjeistama PALOITTELU (ks. REITIT): läpiajon rivit ovat renderöityjä esimerkkejä
   (luku/etuliite mukana), koodissa avain on pala. Pala johdetaan PM:n rivistä VAIN mekaanisesti (etuliitteen/luvun poisto, luku → {n}) ja jokainen johdettu rivi VERIFIOIDAAN kokoamalla se takaisin: kokoa(avain, sv) === PM:n rivi.
   Kohteet: lib/tm_vp_i18n.js TM_VP_I18N.sv (VP-kartta, avain = fi-teksti tai johdettu pala; libit hakevat vpT:n kautta) · TP_TOIMENPIDE_HANNAT (rivit 65–69: palvelimen ehdotusten uudet muodot, käännös näyttöhetkellä). Kirjastokartta lib/tm_lib_i18n.js on vain libien omille avaimille (tests/i18n_sv_era_lib.test.js).
   Idempotentti; virhe → mitään ei kirjoiteta. Ajo: node scripts/i18n_vie_sv_era101.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, lisaaKarttaan, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_101_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_101_gemini.json', OSIO = 'vp_kentta';
const HANNAT_FI = /^(?:fyysiset testit|tekniikka) kehityskohteena/;   // rivit 65–69 → TP_TOIMENPIDE_HANNAT
const otsake = 'sv-käännöserä 101 (PM 9.11.2026; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era101.cjs) — VP:n Kenttä-lippu (#1244)';

/* Paloittelu. Oletus: avain = erän rivin fi, sv = PM:n sv. Poikkeukset (rivi → [{avain, sv(PM:n sv:stä), kokoa(avain, sv) → esimerkkirivi}]):
   · "N · Otsikko" -rivit: koodissa numero on literaali ('2 · ' + t('Poikkeamat')) → avain = otsikko
   · luvulliset esimerkit → paikkamerkki {n}
   · "s/kausi" ja "cm/kausi" (PM 9.11.: käännä pala, ei kokonaisia esimerkkilukuja) → yksiköt s/säsong, cm/säsong */
const ESIM_NUMERO = (fi, sv, luku) => { const a = fi.replace(luku, '{n}'), b = sv.replace(luku, '{n}'); return { avain: a, sv: b, kokoa: (A, S) => [A.replace('{n}', luku), S.replace('{n}', luku)] }; };
const OSA = (fi, sv, etuliite) => ({ avain: fi.slice(etuliite.length), sv: sv.slice(etuliite.length), kokoa: (A, S) => [etuliite + A, etuliite + S], tarkista: sv.startsWith(etuliite) });
const REITIT = {
  'Ei jaksoa 6': (f, s) => ESIM_NUMERO(f, s, '6'),
  '2 · Poikkeamat': (f, s) => OSA(f, s, '2 · '),
  '3 · Ehdotukset': (f, s) => OSA(f, s, '3 · '),
  '6 pelaajalla taso laskenut → tarkista kuormitus/motivaatio': (f, s) => ESIM_NUMERO(f, s, '6'),
  'Kasvutahti vaatii ≥2 kasvumittausta — nyt 0. Toinen mittaus avaa tahdin ja kasvuviivan.': (f, s) => ({ avain: f.replace('nyt 0.', 'nyt {n}.'), sv: s.replace('nu 0.', 'nu {n}.'), kokoa: (A, S) => [A.replace('{n}', '0'), S.replace('{n}', '0')], tarkista: f.includes('nyt 0.') && s.includes('nu 0.') }),
  'Tekniikka ·': (f, s) => ({ avain: f + ' ', sv: s + ' ', kokoa: (A, S) => [A.trimEnd(), S.trimEnd()] }),   // koodissa vpT('Tekniikka · ') (loppuvälilyönti; erän avain on trimmattu)
  '4 havaintoa': (f, s) => ESIM_NUMERO(f, s, '4'),
  'SM-pohjainen — teknisk på kommande': (f, s) => { const j = ' — teknisk på kommande'; return { avain: 'SM-pohjainen', sv: s.slice(0, s.length - j.length), kokoa: (A, S) => [A + j, S + j], tarkista: f.endsWith(j) && s.endsWith(j) }; },
};
for (const r of ['⚡ -0.15 s/kausi', '⚡ +1.88 cm/kausi', '⚡ -0.28 s/kausi', '⚡ -1.56 s/kausi', '⚡ -3.03 s/kausi', '⚡ -1.36 s/kausi', '⚡ -0.94 s/kausi']) {
  REITIT[r] = (f, s) => { const m = /^(⚡ [+-]?[\d.]+) (s|cm)\/kausi$/.exec(f), n = /^(⚡ [+-]?[\d.]+) (s|cm)\/säsong$/.exec(s); return { avain: m ? m[2] + '/kausi' : null, sv: n ? n[2] + '/säsong' : null, kokoa: m && n ? (A, S) => [m[1] + ' ' + A, n[1] + ' ' + S] : null, tarkista: !!(m && n && m[1] === n[1] && m[2] === n[2]) }; };
}
/* "· Ponnauttelu 33.5→32 ✓": nimi on jo oma rivinsä (Ponnauttelu); koodi kokoaa '· ' + nimi + ' ' + a→b + ' ✓' → ei omaa avainta (nimi reititetään), mutta kokoonpano verifioidaan */
const KOKOONPANO = { '· Ponnauttelu 33.5→32 ✓': (PM, nimiSv) => '· ' + nimiSv + ' 33.5→32 ✓' };
const merkit = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(',');

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [], varoitukset = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot, G = JSON.parse(lue(LAHETYS)).osiot;
  if (JSON.stringify(Object.keys(P)) !== '["' + OSIO + '"]' || JSON.stringify(Object.keys(G)) !== '["' + OSIO + '"]') return { virheet: ['osiot ≠ [' + OSIO + ']'], lisatty: 0, ohitettu, varoitukset, kirjoitettu: false };
  const PR = P[OSIO].rivit, GR = G[OSIO].rivit;
  if (JSON.stringify(Object.keys(PR).sort()) !== JSON.stringify(Object.keys(GR).sort())) virheet.push('avaimet ≠ lähetetty erä');
  let sVp = lue('lib/tm_vp_i18n.js');
  const common = lataaSv(lue('lib/tm_i18n_common.js'), 'TM_I18N_COMMON'), vp = lataaSv(sVp, 'TM_VP_I18N');
  const libUudet = [], korvaa = [], hannat = [], nahty = new Map();
  for (const [k, r] of Object.entries(PR)) {
    const g = GR[k] || {};
    if (r.fi !== k || g.fi !== k || g.sv !== '') { virheet.push(k + ': fi ≠ lähetetty erä'); continue; }
    if (typeof r.sv !== 'string' || !r.sv.trim()) { virheet.push(k + ': sv puuttuu'); continue; }
    const syy = sopii(k, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
    if (HANNAT_FI.test(k)) {   // toimenpidehäntä: [fi-häntä, sv-häntä], {n} sellaisenaan
      if (merkit(k) !== merkit(r.sv)) { virheet.push(k + ': paikkamerkit eroavat'); continue; }
      hannat.push([k, r.sv]); continue;
    }
    if (KOKOONPANO[k]) {   // pala on jo oma rivinsä: verifioi vain että PM:n rivi = nimen sv + loppu
      const nimi = k.replace(/^· (\S+) .*$/, '$1'), nimiSv = (PR[nimi] || {}).sv;
      if (!nimiSv || KOKOONPANO[k](r.sv, nimiSv) !== r.sv) virheet.push(k + ': kokoonpano ≠ PM:n rivi (nimen sv: ' + nimiSv + ')');
      ohitettu.push(k); continue;
    }
    const reitti = REITIT[k] ? REITIT[k](k, r.sv) : { avain: k, sv: r.sv, kokoa: null };
    if (reitti.tarkista === false) { virheet.push(k + ': paloittelu ei sovi PM:n riviin'); continue; }
    if (reitti.sv == null) { virheet.push(k + ': palaa ei voitu johtaa'); continue; }
    if (reitti.kokoa) { const [fi2, sv2] = reitti.kokoa(reitti.avain, reitti.sv); if (fi2 !== k || sv2 !== r.sv) { virheet.push(k + ': kokoonpano ≠ PM:n rivi'); continue; } }
    const a = reitti.avain, sv = reitti.sv;
    if (nahty.has(a)) { if (nahty.get(a) !== sv) virheet.push(a + ': sama avain kahdesti eri sv:llä'); continue; }
    nahty.set(a, sv);
    const ol = typeof common[a] === 'string' ? common[a] : vp[a];   // vpT-järjestys: common → VP
    if (ol === a && sv !== a && typeof vp[a] === 'string' && typeof common[a] !== 'string') { korvaa.push([a, sv]); continue; }   // VP-kartassa rivi on identiteetti (käännös puuttui) → PM:n sv tilalle
    if (typeof ol === 'string') { if (ol === sv) ohitettu.push(a); else virheet.push(a + ': kartassa jo eri sv (' + ol + ') ≠ PM (' + sv + ') — PM päättää'); continue; }
    libUudet.push([a, sv]);
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, varoitukset, kirjoitettu: false };
  if (libUudet.length) sVp = lisaaKarttaan(sVp, libUudet, otsake);
  for (const [a, sv] of korvaa) { const vanha = '    ' + q(a) + ': ' + q(a) + ','; if (!sVp.includes(vanha)) return { virheet: ['korvattavaa riviä ei löydy: ' + a], lisatty: 0, ohitettu, varoitukset, kirjoitettu: false }; sVp = sVp.replace(vanha, '    ' + q(a) + ': ' + q(sv) + ',   // erä 101: identiteettirivi korvattu PM:n sv:llä'); libUudet.push([a, sv]); }
  const hannatUudet = hannat.filter(([fi]) => !sVp.includes(q(fi)));
  if (hannatUudet.length) {
    const a = sVp.indexOf('var TP_TOIMENPIDE_HANNAT = ['), b = sVp.indexOf('\n];', a); if (a < 0 || b < 0) return { virheet: ['TP_TOIMENPIDE_HANNAT-taulukkoa ei löydy'], lisatty: 0, ohitettu, varoitukset, kirjoitettu: false };
    sVp = sVp.slice(0, b) + ',\n  // ' + otsake + ': palvelimen signaalien (hh_taso_alhainen, tki_alhainen) nykyiset muodot\n' + hannatUudet.map(([fi, sv]) => '  [' + q(fi) + ', ' + q(sv) + ']').join(',\n') + sVp.slice(b);
  }
  const vl = lataaSv(sVp, 'TM_VP_I18N'); for (const [a, sv] of libUudet) if (vl[a] !== sv) virheet.push('verifiointi VP ' + a);
  for (const [fi, sv] of hannat) { if (!sVp.includes(q(fi)) || !sVp.includes(q(sv))) virheet.push('verifiointi hännät ' + fi); }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, varoitukset, kirjoitettu: false };
  const kirjoita = !!(opts.kirjoita && (libUudet.length || hannatUudet.length));
  if (kirjoita) { fs.writeFileSync(path.join(juuri, 'lib/tm_vp_i18n.js'), sVp); }
  return { virheet, lisatty: libUudet.length, hannat: hannatUudet.length, ohitettu, varoitukset, kirjoitettu: kirjoita, uudetAvaimet: libUudet.map((x) => x[0]) };
}
module.exports = { vie, PALAUTUS, LAHETYS, REITIT };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t, null, 1));
}
