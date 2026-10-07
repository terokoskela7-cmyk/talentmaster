#!/usr/bin/env node
'use strict';
/**
 * tuo_harjoitepankki.js — T1 (docs/CODE_BRIEF_T1_HARJOITEPANKKI_TUONTI.md): seuran harjoitepankin tuonti Firestoreen (+ kaaviokuvat Storageen). DRY-RUN OLETUKSENA; --apply vain Teron hyväksynnällä.
 *
 *   node scripts/tuo_harjoitepankki.js --seura kpv --kpv-json <kpv_harjoitteet.json> [--kuvat-zip <kpv_harjoitteet_kuvat.zip>] [--tarkistaja "Nimi"] [--pvm YYYY-MM-DD]
 *        [--arkistoi-vanhat] [--ei-lue] [--apply]
 *
 * ⚠ SEURAN AINEISTO EI REPOON (julkinen repo): tiedostot annetaan paikallisesti polkuna; skripti ei kopioi niitä minnekään eikä tulosta harjoitetekstejä (vain id:t, nimet ja luvut).
 * KOHDE (vain seurat/{seura}/harjoitepankki/{id} + Storage seurat/{seura}/harjoitepankki/{id}.jpg): ID = lähteen id (kpvh_01) → uudelleenajo päivittää eikä tuplaa; versio +1 vain muuttuneille; additiivinen (set merge) — vanhat kentät säilyvät.
 * TILA: KPV:n aineisto on seuran kuratoimaa → 'hyvaksytty' (--tarkistaja + --pvm) ; SoccerTutor-lähteinen (esim. kpvh_88) → 'luonnos' + kolmas_osapuoli:true. kaytto 'joukkue' (koti vain jos lähde sanoo).
 * VANHAT RIVIT: aiemman testituonnin rivit (id ei kuulu tähän aineistoon) listataan; --arkistoi-vanhat merkitsee ne arkistoitu:true (EI poistoa). Ilman lippua niihin ei kosketa.
 * KUVAT: Storage-polku seurat/{seura}/harjoitepankki/{id}.jpg; kuva_url = polku (ei julkista URL:ää). Apply ilman kuvia mahdollinen (--kuvat-zip valinnainen).
 */
const fs = require('fs');
const H = require('../lib/tm_harjoitepankki.js');
const { lueZip } = require('./xlsx_luku');

const ID_RE = /^[a-z0-9_]+$/;
const KOLMAS_RE = /fifa|spl\b|soccertutor|ekkono/i;   // vain INFO-listaus (tarkistettavaksi); luonnokseksi menee vain SoccerTutor (lib)
const EI_VERTAILUA = ['versio', 'paivitetty', 'luotu', 'tarkistettu_pvm', 'tarkistaja'];

const jarj = (o) => { if (Array.isArray(o)) return o.map(jarj); if (o && typeof o === 'object') { const r = {}; Object.keys(o).sort().forEach((k) => { r[k] = jarj(o[k]); }); return r; } return o; };
const sama = (a, b) => JSON.stringify(jarj(a)) === JSON.stringify(jarj(b));
const ilmanMeta = (d) => { const r = Object.assign({}, d); EI_VERTAILUA.forEach((k) => delete r[k]); return r; };

/**
 * Puhdas suunnittelu: syöte { harjoitteet[], meta }, nykyinen { [id]: data } (Firestore), kuvat Set<id> (zipistä), opts { seura, tarkistaja, pvm, arkistoiVanhat }.
 * → { docs:[{id, op:'luo'|'paivita'|'ei_muutosta', data, versio, kuva:bool}], arkistoitavat:[id], raportti }
 */
function suunnittele(syote, nykyinen, kuvat, opts) {
  opts = opts || {}; nykyinen = nykyinen || {}; kuvat = kuvat || new Set();
  const rp = { yhteensa: 0, hyvaksytty: 0, luonnos: [], uudet: 0, paivitettavat: 0, muuttumattomat: 0, arkistoitavat: [], vanhatYhteensa: 0, kuvatLadattavana: 0, ilmanKuvaa: [], ylimaaraisetKuvat: [], jasentymattomat: [], tilasto: { alue_mitta: 0, alue_koko: 0, alue_osa: 0, alue_ei: 0, pelaajamaara: 0, pelaajamaara_ei: 0, ika_rajattu: 0, ika_ei: 0, kesto: 0, kesto_ei: 0, vuosikello: 0, tasot: 0 }, kolmannenOsapuolenLahteet: [], duplikaatit: [], virheet: [], huomautukset: [] };
  const rivit = Array.isArray(syote && syote.harjoitteet) ? syote.harjoitteet : [];
  if (!rivit.length) rp.virheet.push('syötteessä ei harjoitteita');
  if (syote && syote.meta && syote.meta.lkm != null && syote.meta.lkm !== rivit.length) rp.huomautukset.push('meta.lkm ' + syote.meta.lkm + ' ≠ harjoitteita ' + rivit.length);
  if (syote && syote.meta && syote.meta.seura && opts.seura && String(syote.meta.seura).toLowerCase() !== String(opts.seura).toLowerCase()) rp.huomautukset.push('meta.seura "' + syote.meta.seura + '" ≠ --seura "' + opts.seura + '"');
  const nahty = {}, docs = [];
  rivit.forEach((rivi) => {
    let n; try { n = H.tmHarjoiteNormalisoi(rivi, 'kpv', { tarkistaja: opts.tarkistaja || null, pvm: opts.pvm || null }); } catch (e) { rp.virheet.push(String(e && e.message || e).replace(/^tm_harjoitepankki:\s*/, '')); return; }
    if (!ID_RE.test(n.id)) { rp.virheet.push('kelpaamaton id "' + n.id + '" (vain a–z, 0–9, _)'); return; }
    if (nahty[n.id]) { rp.duplikaatit.push(n.id); rp.virheet.push('duplikaatti-id ' + n.id); return; } nahty[n.id] = 1;
    rp.yhteensa++;
    const data = n.data;
    if (data.tila === 'hyvaksytty') rp.hyvaksytty++; else rp.luonnos.push({ id: n.id, nimi: data.nimi, syy: data.kolmas_osapuoli ? 'kolmannen osapuolen lähde (SoccerTutor)' : 'luonnos' });
    if (KOLMAS_RE.test(String(rivi.lahde || '') + ' ' + String(rivi.huom || ''))) rp.kolmannenOsapuolenLahteet.push({ id: n.id, nimi: data.nimi, tila: data.tila });
    if (n.jasentymattomat.length) rp.jasentymattomat.push({ id: n.id, kentat: n.jasentymattomat });
    const t = rp.tilasto; t['alue_' + (data.alue_tyyppi === 'mitta' ? 'mitta' : data.alue_tyyppi === 'koko' ? 'koko' : data.alue_tyyppi === 'osa' ? 'osa' : 'ei')]++; t[data.pelaajamaara ? 'pelaajamaara' : 'pelaajamaara_ei']++; t[data.ika_min != null || data.ika_max != null ? 'ika_rajattu' : 'ika_ei']++; t[data.kesto_min != null ? 'kesto' : 'kesto_ei']++; if (data.vuosikello.length) t.vuosikello++; if (data.tasot.length) t.tasot++;
    const kuva = kuvat.has(n.id);
    if (kuva) { data.kuva_url = 'seurat/' + opts.seura + '/harjoitepankki/' + n.id + '.jpg'; rp.kuvatLadattavana++; } else rp.ilmanKuvaa.push(n.id);
    const ennen = nykyinen[n.id];
    let op = 'luo', versio = 1;
    if (ennen) { versio = (typeof ennen.versio === 'number' ? ennen.versio : 1); const vanhaSamaan = {}; Object.keys(data).forEach((k) => { vanhaSamaan[k] = ennen[k] === undefined ? null : ennen[k]; }); if (sama(ilmanMeta(data), ilmanMeta(vanhaSamaan)) && (data.tila !== 'hyvaksytty' || (ennen.tarkistaja === data.tarkistaja && ennen.tarkistettu_pvm === data.tarkistettu_pvm))) op = 'ei_muutosta'; else { op = 'paivita'; versio += 1; } }
    if (op === 'luo') rp.uudet++; else if (op === 'paivita') rp.paivitettavat++; else rp.muuttumattomat++;
    docs.push({ id: n.id, op, data, versio, kuva });
  });
  kuvat.forEach((id) => { if (!nahty[id]) rp.ylimaaraisetKuvat.push(id); });
  Object.keys(nykyinen).forEach((id) => { if (nahty[id]) return; rp.vanhatYhteensa++; if (nykyinen[id] && nykyinen[id].arkistoitu !== true) rp.arkistoitavat.push(id); });
  if (docs.some((d) => d.data.tila === 'hyvaksytty') && !opts.tarkistaja) rp.huomautukset.push('--tarkistaja puuttuu: hyväksytyille rivin tarkistaja jää tyhjäksi; apply vaatii sen');
  return { docs, arkistoitavat: opts.arkistoiVanhat ? rp.arkistoitavat.slice() : [], raportti: rp };
}

function tulosta(r, apply, opts) {
  const rp = r.raportti, L = [];
  L.push((apply ? 'APPLY' : 'DRY-RUN') + ' — harjoitepankki · seura ' + (opts && opts.seura) + ' · ' + rp.yhteensa + ' harjoitetta');
  L.push('  hyväksytty: ' + rp.hyvaksytty + ' · luonnos: ' + rp.luonnos.length + (rp.luonnos.length ? ' (' + rp.luonnos.map((x) => x.id + ' ' + x.syy).join('; ') + ')' : ''));
  const t = rp.tilasto; L.push('  jäsennys: alue mitta ' + t.alue_mitta + ' · koko kenttä ' + t.alue_koko + ' · osa ' + t.alue_osa + ' · ei aluetta ' + t.alue_ei + ' | pelaajamäärä ' + t.pelaajamaara + '/' + (t.pelaajamaara + t.pelaajamaara_ei) + ' | ikärajattu ' + t.ika_rajattu + ' (ilman rajaa ' + t.ika_ei + ') | kesto ' + t.kesto + '/' + (t.kesto + t.kesto_ei) + ' | vuosikello ' + t.vuosikello + ' | tasot ' + t.tasot);
  L.push('  uusia: ' + rp.uudet + ' · päivitettäviä: ' + rp.paivitettavat + ' · muuttumattomia: ' + rp.muuttumattomat);
  L.push('  vanhoja rivejä (ei tässä aineistossa): ' + rp.vanhatYhteensa + ' · arkistoitavia: ' + rp.arkistoitavat.length + (opts && opts.arkistoiVanhat ? ' → ARKISTOIDAAN (--arkistoi-vanhat)' : ' (ei kosketa ilman --arkistoi-vanhat)'));
  if (rp.arkistoitavat.length) L.push('    ' + rp.arkistoitavat.join(', '));
  L.push('  kuvia ladattavana: ' + rp.kuvatLadattavana + ' · ilman kuvaa: ' + rp.ilmanKuvaa.length + (rp.ilmanKuvaa.length ? ' (' + rp.ilmanKuvaa.join(', ') + ')' : '') + ' · zipissä ilman riviä: ' + rp.ylimaaraisetKuvat.length + (rp.ylimaaraisetKuvat.length ? ' (' + rp.ylimaaraisetKuvat.join(', ') + ')' : ''));
  if (rp.jasentymattomat.length) L.push('  jäsentymättömät kentät (' + rp.jasentymattomat.length + ' riviä; teksti säilyy *_teksti-kentissä): ' + rp.jasentymattomat.map((x) => x.id + ' [' + x.kentat.join(' | ') + ']').join('; '));
  if (rp.kolmannenOsapuolenLahteet.length) L.push('  lähdemaininta FIFA/SPL/SoccerTutor/Ekkono (INFO — tarkista): ' + rp.kolmannenOsapuolenLahteet.map((x) => x.id + '(' + x.tila + ')').join(', '));
  if (rp.huomautukset.length) L.push('  huomautukset:\n    - ' + rp.huomautukset.join('\n    - '));
  if (rp.virheet.length) L.push('  VIRHEET (apply estetty) ' + rp.virheet.length + ':\n    - ' + rp.virheet.join('\n    - '));
  return L.join('\n');
}

function argv(a) { const o = { _: [] }; for (let i = 0; i < a.length; i++) { const x = a[i]; if (x.startsWith('--')) { const k = x.slice(2); if (['apply', 'ei-lue', 'arkistoi-vanhat'].indexOf(k) >= 0) o[k] = true; else o[k] = a[++i]; } else o._.push(x); } return o; }
const paikallinenPvm = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };   // paikallinen päivä (§7.26)

async function main(args) {
  const o = argv(args);
  if (!o.seura || !o['kpv-json']) { console.error('Käyttö: node scripts/tuo_harjoitepankki.js --seura <seuraId> --kpv-json <kpv_harjoitteet.json> [--kuvat-zip <zip>] [--tarkistaja "Nimi"] [--pvm YYYY-MM-DD] [--arkistoi-vanhat] [--ei-lue] [--apply]'); return 2; }
  if (!/^[a-z0-9_]+$/.test(o.seura)) { console.error('Kelpaamaton --seura'); return 2; }
  const syote = JSON.parse(fs.readFileSync(o['kpv-json'], 'utf8'));
  let kuvaData = {}, kuvat = new Set();
  if (o['kuvat-zip']) { const z = lueZip(fs.readFileSync(o['kuvat-zip'])); Object.keys(z).forEach((nimi) => { const m = /^(?:.*\/)?([a-z0-9_]+)\.jpe?g$/i.exec(nimi); if (m && z[nimi]) { kuvaData[m[1]] = z[nimi]; kuvat.add(m[1]); } }); }
  const opts = { seura: o.seura, tarkistaja: o.tarkistaja || null, pvm: o.pvm || paikallinenPvm(), arkistoiVanhat: !!o['arkistoi-vanhat'] };
  let db = null, nykyinen = {}, admin = null;
  if (!o['ei-lue']) {
    admin = require('firebase-admin'); admin.initializeApp({ credential: admin.credential.applicationDefault(), storageBucket: process.env.TM_STORAGE_BUCKET || 'talentmaster-pilot.firebasestorage.app' }); db = admin.firestore();   // gcloud ADC (ei SA-avainta)
    const s = await db.collection('seurat/' + o.seura + '/harjoitepankki').get(); s.forEach((d) => { nykyinen[d.id] = d.data(); });
  }
  const r = suunnittele(syote, nykyinen, kuvat, opts);
  console.log(tulosta(r, !!o.apply, opts));
  if (!o.apply) { console.log('\n(dry-run: mitään ei kirjoitettu. --apply vain Teron hyväksynnällä.)'); return 0; }
  if (r.raportti.virheet.length) { console.error('\nApply estetty: korjaa virheet ensin.'); return 1; }
  if (!o.tarkistaja) { console.error('\nApply estetty: vaaditaan --tarkistaja (hyväksyjän nimi).'); return 1; }
  if (!db) { console.error('\nApply estetty: --ei-lue ei salli kirjoitusta.'); return 1; }
  const FV = admin.firestore.FieldValue, juuri = 'seurat/' + o.seura + '/harjoitepankki/', bucket = admin.storage().bucket();
  let n = 0, k = 0, batch = db.batch(), kaytetty = 0;
  for (const d of r.docs) {   // kuvat ENSIN (dokumentti viittaa vain olemassa olevaan tiedostoon)
    if (!d.kuva) continue; const polku = juuri + d.id + '.jpg'; if (polku.indexOf(juuri) !== 0) throw new Error('Polku seuran ulkopuolella: ' + polku);
    await bucket.file(polku).save(kuvaData[d.id], { contentType: 'image/jpeg', resumable: false, metadata: { cacheControl: 'private, max-age=3600' } }); k++;
  }
  for (const d of r.docs) {
    if (d.op === 'ei_muutosta') continue;
    const ref = db.doc(juuri + d.id); if (ref.path.indexOf(juuri) !== 0) throw new Error('Polku seuran ulkopuolella: ' + ref.path);
    batch.set(ref, Object.assign({}, d.data, { versio: d.versio, paivitetty: FV.serverTimestamp() }, d.op === 'luo' ? { luotu: FV.serverTimestamp() } : {}), { merge: d.op !== 'luo' });
    n++; if (++kaytetty >= 400) { await batch.commit(); batch = db.batch(); kaytetty = 0; }
  }
  for (const id of r.arkistoitavat) { const ref = db.doc(juuri + id); batch.set(ref, { arkistoitu: true, paivitetty: FV.serverTimestamp() }, { merge: true }); n++; if (++kaytetty >= 400) { await batch.commit(); batch = db.batch(); kaytetty = 0; } }   // EI poistoa
  if (kaytetty) await batch.commit();
  console.log('\nKirjoitettu ' + n + ' dokumenttia (' + juuri + ') ja ladattu ' + k + ' kuvaa (Storage ' + juuri + '*.jpg).'); return 0;
}

module.exports = { suunnittele, tulosta, argv, ID_RE };
if (require.main === module) main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error(e && e.stack || e); process.exit(1); });
