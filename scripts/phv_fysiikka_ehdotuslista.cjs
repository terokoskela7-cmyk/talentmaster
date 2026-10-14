#!/usr/bin/env node
/* Kasvupyrähdys-fysiikan EHDOTUSLISTA (Tero 14.10.2026: "tee ensin ehdotuslista; Tero hyväksyy listan ennen kuin mitään valitaan automaattisesti").
   Lukee VAIN lähdeaineiston (harjoitelogiikka_v4.js PANKKI.D/S · lib/tm-prescription.js · lib/hpp_rehab_protokollat.js) ja tulostaa taulukon docs/design/idp-v2/42_kasvupyrahdys_fysiikka_ehdotuslista.md.
   EI valitse mitään: sarake "Konekatsaus" on pelkkä mekaaninen luokittelu lähteen omista PHV-kentistä (ei kliininen arvio); päätössarake jää Teron täytettäväksi.
   Ajo: node scripts/phv_fysiikka_ehdotuslista.cjs [--stdout]   (idempotentti; ei kirjoita muualle) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), UT = path.join(ROOT, 'docs/design/idp-v2/42_kasvupyrahdys_fysiikka_ehdotuslista.md');
const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();
const lyhyt = (s, n) => { s = cell(s); return s.length > (n || 110) ? s.slice(0, n || 110).trim() + '…' : s; };
/* Mekaaninen luokittelu lähteen omasta PHV-tekstistä (ei kliininen):
   'normaali'  = lähteen PHV-teksti alkaa "Normaali" / kertoo liikkeen turvalliseksi sellaisenaan
   'kevennetty' = lähteellä on oma kevennetty PHV-ohje (käytetään sitä; esim. "2×10s kevyesti")
   'pois'      = PHV-teksti poistaa osan liikkeestä ("… pois", "Vältä …") → vain kevennetyllä ohjeella
   'ei_tietoa' = lähteellä ei ole PHV-ohjetta → ei ehdoteta */
function luokka(phv) {
  const t = cell(phv); if (!t) return 'ei_tietoa';
  const pois = /\bpois\b|\bvältä\b|\bei (tehdä|kyykkyä|\S*hyppy\S*)|\bjätä\b|\bpelkkä\b/i.test(t);
  if (pois) return 'pois';
  if (/^normaali\b|turvallisia|\bparas valinta|oikea valinta|erityisen tärkeä/i.test(t)) return 'normaali';
  return 'kevennetty';
}
const NYT = { normaali: 'ehdotus: sellaisenaan', kevennetty: 'ehdotus: lähteen kevennetyllä ohjeella', pois: 'ehdotus: vain kevennettynä (osa pois)', ei_tietoa: 'ei ehdoteta (ei PHV-ohjetta)' };
const rivit = [];
// 1) harjoitelogiikka_v4.js: PANKKI.D (aktivointi) ja PANKKI.S (kohdennettu)
const H = require(path.join(ROOT, 'harjoitelogiikka_v4.js')), P = H.PANKKI;
Object.keys(P.D).forEach((ketju) => P.D[ketju].forEach((h, i) => rivit.push({ lahde: 'harjoitelogiikka D', id: 'D.' + ketju + '.' + i, ketju: ketju.toUpperCase(), nimi: h.nimi, ika: 'stage ' + (h.stage != null ? [].concat(h.stage).join('–') : '–') + ' · 3 ikävaihetta', ohje: h.ohje_rakentaja || h.ohje_leikkija, phv: h.phv, phv_ok: '–', video: !!h.yt })));
Object.keys(P.S).forEach((ketju) => P.S[ketju].forEach((vk, i) => (vk.stage_tasot || []).forEach((h, j) => rivit.push({ lahde: 'harjoitelogiikka S', id: 'S.' + ketju + '.' + (vk.vk || i) + '.' + j, ketju: ketju.toUpperCase(), nimi: h.nimi, ika: 'stage ' + [].concat(h.stage).join('–') + ' · ' + [h.ohje_leikkija && 'leikkijä', h.ohje_rakentaja && 'rakentaja', h.ohje_showcase && 'showcase'].filter(Boolean).join('/'), ohje: h.ohje_rakentaja || h.ohje_leikkija, phv: h.phv, phv_ok: '–', video: !!h.yt }))));
// 2) lib/tm-prescription.js (pre-harkka): PANKKI.<KETJU>.aktivointi + S1.. (phv_ohje)
const sb = { console: { log() {}, warn() {}, error() {} }, module: { exports: {} } }; sb.window = sb; vm.createContext(sb);
['tm-methodology', 'tm-profile', 'tm-microcycles', 'tm-prescription-teksti', 'tm-prescription'].forEach((f) => { try { vm.runInContext(fs.readFileSync(path.join(ROOT, 'lib', f + '.js'), 'utf8'), sb); } catch (e) { /* valinnainen */ } });
const PP = sb.TM && sb.TM.prescription && sb.TM.prescription.PANKKI || {};
Object.keys(PP).forEach((ketju) => Object.keys(PP[ketju]).forEach((k) => { const h = PP[ketju][k]; if (h && h.nimi) rivit.push({ lahde: 'pre-harkka (tm-prescription)', id: ketju + '.' + k, ketju: ketju, nimi: h.nimi, ika: h.ohje_rakentaja ? '3 ikävaihetta' : 'yksi ohje', ohje: h.ohje_rakentaja || h.ohje, phv: h.phv_ohje, phv_ok: '–', video: !!h.yt }); }));
// 3) HPP-pankki (kuntoutus): phv_ok
const sb2 = { console, module: { exports: {} } }; vm.createContext(sb2); vm.runInContext(fs.readFileSync(path.join(ROOT, 'lib/hpp_rehab_protokollat.js'), 'utf8') + ';this.__e=(typeof HPP_EXERCISES!=="undefined")?HPP_EXERCISES:{};', sb2);
Object.keys(sb2.__e).forEach((id) => { const h = sb2.__e[id]; rivit.push({ lahde: 'HPP-pankki (kuntoutus)', id: id, ketju: h.fascia || h.vaihe || '', nimi: h.n || h.nimi || id, ika: 'ei ikävaiheohjeita', ohje: h.ohje || h.d, phv: h.huomio, phv_ok: h.phv_ok === true ? 'true' : (h.phv_ok === false ? 'false' : '–'), hpp: true, video: false }); });
const KONE = (r) => r.hpp ? (r.phv_ok === 'false' ? 'ei ehdoteta (phv_ok=false)' : r.phv_ok === 'true' ? 'kuntoutusharjoite — ei automaattiseen valintaan; phv_ok=true (Teron päätös)' : 'ei ehdoteta (phv_ok puuttuu)') : NYT[luokka(r.phv)];
const lasku = {}; rivit.forEach((r) => { const k = r.hpp ? 'hpp' : luokka(r.phv); lasku[k] = (lasku[k] || 0) + 1; });
const lahteet = [...new Set(rivit.map((r) => r.lahde))];
let md = '# 42 · Kasvupyrähdys-fysiikka: ehdotuslista (Teron hyväksyttäväksi)\n\n'
  + '> **Tämä lista ei valitse mitään.** Kasvupyrähdyspelaajan (PH) fysiikkaharjoite näytetään toimintakortissa vain jakson omasta fysiikkasnapshotista, kunnes Tero on hyväksynyt tämän listan. Fysiikkalinja on Teron / TalentMasterid Oy:n aineistoa, joten turvallisuusvalinta kuuluu Terolle eikä koodille.\n'
  + '> Luotu: `node scripts/phv_fysiikka_ehdotuslista.cjs` (lukee lähdeaineiston; kenttien sanatarkat PHV-tekstit alla).\n\n'
  + '## Miten luettava\n\n'
  + '- **PHV-vaiheet:** ennen (PRE) · nyt (PH, kasvupyrähdys) · jälkeen (POST/AN) — kanoninen sanasto (CLAUDE.md §14). Lähteissä on vain yksi PHV-kenttä per harjoite (`phv` / `phv_ohje` / `phv_ok`), ei erillisiä ohjeita ennen / jälkeen.\n'
  + '- **Konekatsaus** on mekaaninen luokittelu lähteen omasta PHV-tekstistä, **ei kliininen arvio**: *sellaisenaan* (teksti alkaa "Normaali" tai kertoo liikkeen turvalliseksi) · *kevennetty ohje* (lähteellä oma kevennetty versio) · *osa pois* (teksti poistaa osan liikkeestä → vain kevennettynä) · *ei ehdoteta* (ei PHV-ohjetta).\n'
  + '- **Ennen / jälkeen:** ehdotus on käyttää samaa harjoitetta **normaalilla ikävaiheohjeella** (leikkijä / rakentaja / showcase) — ellei Tero toisin päätä. Lähteissä ei ole PRE/POST-kohtaisia rajoituksia.\n'
  + '- **HPP-pankki** on kuntoutusprotokollien harjoitekirjasto (`phv_ok`): ei ehdoteta automaattiseen valintaan; lista on mukana, jotta Tero voi merkitä sopivat.\n'
  + '- **Tero:** täytä viimeinen sarake (ennen / nyt / jälkeen: kyllä / ei / vain kevennettynä). Hyväksytty lista viedään koodiin omana PR:nään + testit.\n\n'
  + '## Yhteenveto\n\n| Luokka | Rivejä |\n|---|---:|\n' + Object.keys(lasku).sort().map((k) => '| ' + ({ normaali: 'sellaisenaan', kevennetty: 'kevennetty ohje', pois: 'osa pois', ei_tietoa: 'ei PHV-ohjetta', hpp: 'HPP (kuntoutus)' }[k]) + ' | ' + lasku[k] + ' |').join('\n') + '\n| **Yhteensä** | **' + rivit.length + '** |\n\n';
lahteet.forEach((l) => {
  const lista = rivit.filter((r) => r.lahde === l);
  md += '## ' + l + ' (' + lista.length + ')\n\n| id | ketju | nimi | ikä / stage | ohje (lyhennetty) | PHV-teksti / phv_ok (sanatarkasti) | Konekatsaus (nyt) | Tero: ennen / nyt / jälkeen |\n|---|---|---|---|---|---|---|---|\n'
    + lista.map((r) => '| ' + [r.id, r.ketju, r.nimi, r.ika, lyhyt(r.ohje, 90), (r.hpp ? 'phv_ok: ' + r.phv_ok + (r.phv ? ' · ' : '') : '') + cell(r.phv), KONE(r), ' '].map(cell).join(' | ') + ' |').join('\n') + '\n\n';
});
if (process.argv.includes('--stdout')) process.stdout.write(md); else { fs.writeFileSync(UT, md); console.log('Kirjoitettu ' + path.relative(ROOT, UT) + ': ' + rivit.length + ' riviä · ' + JSON.stringify(lasku)); }
