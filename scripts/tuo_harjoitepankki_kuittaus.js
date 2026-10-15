#!/usr/bin/env node
'use strict';
/**
 * tuo_harjoitepankki_kuittaus.js — seuran harjoituspankin KUITTAUSPOHJAN tuonti (doc 40 §13: "Mitä harjoitellaan" + Lähde + video_url + ikäkaista). DRY-RUN OLETUKSENA; --apply vain Teron ajamana kun seura on kuitannut.
 *
 *   node scripts/tuo_harjoitepankki_kuittaus.js --seura kpv --tiedosto KPV_harjoituspankki_tarkistus.xlsx [--ei-lue] [--apply]
 *
 * SÄÄNTÖ (Tero 14.10.2026): rivi tuodaan vain kun KUITTAUS = OK tai Muutettu · Poista-riviä ei tuoda · tyhjää kuittausta ei tuoda (ei konseptia → ei toimintakorttiin ennen seuran kuittausta).
 *   Linkitys id:llä (kpvh_NN = pankin dokumentin id), ei nimellä. Tyhjä Lähde = "muu / en tiedä" → näytetään kuten oma harjoite. Vain https-video_url hyväksytään.
 * KOHDE: seurat/{seura}/harjoitepankki/{id} — vain nämä kentät (set merge): konsepti, konsepti_toissijainen, lahde_tyyppi, kolmas_osapuoli (vain SoccerTutor → true), video_url, ika_min, ika_max, ika_teksti (+ versio+1, paivitetty). `tila` EI muutu → näkyy toimintakortissa vain jos rivi on jo hyväksytty.
 *   Tuodut tekstit: ei mitään uutta — tuonti kirjoittaa vain luokittelukentät. SoccerTutor-rivin teksti piilotetaan näytössä (toimintakortti: vain nimi ja kuva).
 * ⚠ SEURAN AINEISTO EI REPOON: tiedosto annetaan polkuna; raportti tulostaa vain id:t, luvut ja luokitteluarvoja (ei harjoitetekstejä, ei kommentteja).
 * Sarakkeet haetaan otsikon NIMELLÄ (alias, ei sijainnilla) — sama periaate kuin tuo_valmennuslinja.js.
 */
const fs = require('fs');
const { lueXlsx } = require('./xlsx_luku');
const H = require('../lib/tm_harjoitepankki.js');
const K = require('../lib/tm_kt_toimintakortti.js');
const VK = require('./vientipohja_kieli');   // pohjan kielitaulu: sv-pohja luetaan samoin kuin fi-pohja

const ALIAS = { id: 'id', nimi: 'nimi', pankki: 'pankki', teema: 'teema', teema_kpv: 'teema', tyyppi: 'tyyppi', ika: 'ika', ikakaista: 'ika', tavoite: 'tavoite', mita_harjoitellaan: 'mita', toissijainen: 'toissijainen', lahde: 'lahde', video_url: 'video', kuittaus: 'kuittaus', kommentti: 'kommentti' };
const norm = (v) => String(v == null ? '' : v).trim();
const otsikko = (h) => norm(h).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, (m) => '_' + m.replace(/[()]/g, '')).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const ID_RE = /^[a-z0-9_]+$/;

/** xlsx-välilehti (rivit[][]) → [{id, nimi, mita, toissijainen, lahde, video, kuittaus, ika, …}]; puuttuva vaadittu sarake → heittää.
 *  Pohjan kieli (fi | sv) tunnistetaan otsikoista ja listojen arvoista kielitaulun (scripts/vientipohja_kieli.js) kautta: sv-otsikot → samat sisäiset avaimet, sv-arvot (Mitä harjoitellaan, Lähde) → fi-arvot,
 *  joten loppu tuonti (suunnittele) toimii identtisesti. opts.sanasto = testisanasto (VK.kielitaulu). */
function lueTaulu(rivit, opts) {
  if (!rivit || !rivit.length) throw new Error('tyhjä välilehti');
  const sv = VK.kielitaulu('sv', opts && opts.sanasto ? { sanasto: opts.sanasto } : undefined), svAlias = VK.otsikkoAliasit(sv, otsikko), am = VK.arvoKartat(sv);
  const avainOtsikolle = (h) => { const n = otsikko(h), kanta = n.replace(/_.*$/, ''); return ALIAS[n] || svAlias[n] || ALIAS[kanta] || svAlias[kanta]; };
  const kartta = {}; rivit[0].forEach((h, i) => { const k = avainOtsikolle(h); if (k && kartta[k] == null) kartta[k] = i; });
  const puuttuu = ['id', 'nimi', 'mita', 'kuittaus'].filter((k) => kartta[k] == null); if (puuttuu.length) throw new Error('puuttuvat sarakkeet: ' + puuttuu.join(', '));
  const peruste = (x) => norm(x).replace(/\s*\([^)]*\)\s*$/, '');
  return rivit.slice(1).filter((r) => r.some((c) => norm(c))).map((r) => {
    const o = {}; Object.keys(kartta).forEach((k) => { o[k] = norm(r[kartta[k]]); });
    if (o.kuittaus && am.kuittaus[am.n(o.kuittaus)]) o.kuittaus = am.kuittaus[am.n(o.kuittaus)];   // sv-näyttöarvo → sisäinen arvo (OK · Muutettu · Poista); fi-arvot ennallaan
    ['mita', 'toissijainen'].forEach((k) => { if (o[k] && am.konsepti[am.n(o[k])]) o[k] = am.konsepti[am.n(o[k])]; });
    if (o.lahde && am.lahde[am.n(peruste(o.lahde))]) o.lahde = am.lahde[am.n(peruste(o.lahde))];
    return o;
  });
}
/** Työkirjan välilehdet → harjoitetaulu: välilehti nimeltä Harjoitteet (fi tai sv), muuten ensimmäinen jonka otsikot kelpaavat (OHJE-välilehti ei kelpaa). */
function valitseTaulu(sheets, opts) {
  const taulut = [VK.kielitaulu('fi'), VK.kielitaulu('sv', opts && opts.sanasto ? { sanasto: opts.sanasto } : undefined)], nimet = Object.keys(sheets);
  const nimi = nimet.find((n) => VK.valilehdenRooli(n, taulut) === 'harjoitteet') || nimet.find((n) => { try { lueTaulu(sheets[n], opts); return true; } catch (e) { return false; } });
  if (!nimi) throw new Error('Harjoitteet-välilehteä ei löydy (eikä mitään välilehteä jonka otsikot kelpaavat)');
  return lueTaulu(sheets[nimi], opts);
}

/**
 * Puhdas suunnittelu. taulu = lueTaulu(...); nykyinen = { [id]: pankin dokumentti } | null (ei luettu).
 * → { rivit: [{ id, kuittaus, tuodaan, syy, patch }], raportti }
 */
function suunnittele(taulu, nykyinen) {
  const lue = nykyinen != null, rp = {
    yhteensa: taulu.length, duplikaatit: [], virheelliset: [],
    kuittaus: { ok: 0, muutettu: 0, poista: 0, tyhja: 0, tuntematon: [] }, tuodaan: [], eiTuoda: { poista: [], tyhja: 0, tuntematon: [] },
    pankki: { luettu: lue, dokumentteja: lue ? Object.keys(nykyinen).length : null, ilmanDokumenttia: [], eiHyvaksytty: [], arkistoitu: [], eiTaulukossa: [], eiTaulukossaTilat: {} },   // vertailu KAIKILLE taulukon riveille kuittauksesta riippumatta (vain jos pankki luettiin)
    esitaytto: { konsepti: {}, konseptiYht: 0, eiKonseptia: [], eiKonseptiaTyypit: {}, tyhja: [], tuntematon: [], toissijainenAnnettu: 0, toissijainenTuntematon: [], toissijainenSamaKuinEnsisijainen: [] },
    lahde: { oma: 0, soccertutor: [], spl: 0, muu: 0, tyhjaMuuna: 0, tuntematon: [] }, video: { annettu: 0, https: 0, eiHttps: [] }, ika: { jasennetty: 0, jasentymaton: [], tyhja: [] },
  };
  const nahty = {}, rivit = [];
  taulu.forEach((r) => {
    const id = r.id; if (!id || !ID_RE.test(id)) { rp.virheelliset.push(id || '(tyhjä id)'); return; }
    if (nahty[id]) { rp.duplikaatit.push(id); return; } nahty[id] = 1;
    if (lue) { const d = nykyinen[id]; if (!d) rp.pankki.ilmanDokumenttia.push(id); else { if (d.arkistoitu === true) rp.pankki.arkistoitu.push(id); if (d.tila !== 'hyvaksytty') rp.pankki.eiHyvaksytty.push(id + ' (' + (d.tila || 'ei tilaa') + ')'); } }
    const ku = H.tmHarjoiteKuittaus(r.kuittaus), kons = H.tmHarjoiteKonsepti(r.mita), toiss = H.tmHarjoiteKonsepti(r.toissijainen), lt = H.tmHarjoiteLahdeTyyppi(r.lahde), ika = H.tmHarjoiteParsiIka(r.ika);
    // ── esitäytön kattavuus (riippumaton kuittauksesta) ──
    if (kons.tila === 'konsepti') { rp.esitaytto.konsepti[kons.avain] = (rp.esitaytto.konsepti[kons.avain] || 0) + 1; rp.esitaytto.konseptiYht++; } else if (kons.tila === 'ei_konseptia') { rp.esitaytto.eiKonseptia.push(id); const ty = norm(r.tyyppi) || '(tyyppi tyhjä)'; rp.esitaytto.eiKonseptiaTyypit[ty] = (rp.esitaytto.eiKonseptiaTyypit[ty] || 0) + 1; } else if (kons.tila === 'tyhja') rp.esitaytto.tyhja.push(id); else rp.esitaytto.tuntematon.push(id + ' ("' + norm(r.mita) + '")');
    if (norm(r.toissijainen)) { if (toiss.tila === 'konsepti') { rp.esitaytto.toissijainenAnnettu++; if (toiss.avain === kons.avain) rp.esitaytto.toissijainenSamaKuinEnsisijainen.push(id); } else rp.esitaytto.toissijainenTuntematon.push(id + ' ("' + norm(r.toissijainen) + '")'); }
    if (lt.tila === 'tuntematon') rp.lahde.tuntematon.push(id + ' ("' + norm(r.lahde) + '")'); else if (lt.tyyppi === 'soccertutor') rp.lahde.soccertutor.push(id); else rp.lahde[lt.tyyppi]++;
    if (lt.tila === 'tyhja') rp.lahde.tyhjaMuuna++;
    if (norm(r.video)) { rp.video.annettu++; if (K.tmKtVideoKelpaa(r.video, { vainHttps: true })) rp.video.https++; else rp.video.eiHttps.push(id); }
    if (ika._jasentymaton) rp.ika.jasentymaton.push(id + ' ("' + ika.ika_teksti + '")'); else if (ika.ika_max == null && ika.ika_min == null) rp.ika.tyhja.push(id); else rp.ika.jasennetty++;
    // ── kuittaus → tuodaanko ──
    if (ku === 'ok' || ku === 'muutettu') rp.kuittaus[ku]++; else if (ku === 'poista') { rp.kuittaus.poista++; rp.eiTuoda.poista.push(id); } else if (ku === 'tyhja') { rp.kuittaus.tyhja++; rp.eiTuoda.tyhja++; } else { rp.kuittaus.tuntematon.push(id + ' ("' + norm(r.kuittaus) + '")'); rp.eiTuoda.tuntematon.push(id); }
    const tuodaan = ku === 'ok' || ku === 'muutettu';
    let patch = null, syy = tuodaan ? null : ku === 'poista' ? 'poista' : ku === 'tyhja' ? 'ei kuitattu' : 'tuntematon kuittaus';
    if (tuodaan) {
      patch = { lahde_tyyppi: lt.tyyppi, kolmas_osapuoli: lt.tyyppi === 'soccertutor' };
      if (kons.tila === 'konsepti') patch.konsepti = kons.avain; else if (kons.tila === 'ei_konseptia') patch.konsepti = null;   // tyhjä/tuntematon → ei kosketa
      if (toiss.tila === 'konsepti' && toiss.avain !== kons.avain) patch.konsepti_toissijainen = toiss.avain; else if (!norm(r.toissijainen)) patch.konsepti_toissijainen = null;
      if (norm(r.video) && K.tmKtVideoKelpaa(r.video, { vainHttps: true })) patch.video_url = norm(r.video).trim();
      if (!ika._jasentymaton && (ika.ika_max != null || ika.ika_min != null)) { patch.ika_min = ika.ika_min; patch.ika_max = ika.ika_max; patch.ika_teksti = ika.ika_teksti; }
      rp.tuodaan.push(id);
      if (lue && !nykyinen[id]) { patch = null; syy = 'ei dokumenttia pankissa'; }
    }
    rivit.push({ id, kuittaus: ku, tuodaan: !!patch, syy, patch });
  });
  if (lue) Object.keys(nykyinen).forEach((id) => { if (nahty[id]) return; rp.pankki.eiTaulukossa.push(id); const d = nykyinen[id] || {}, t = d.arkistoitu === true ? 'arkistoitu' : (d.tila || 'ei tilaa'); rp.pankki.eiTaulukossaTilat[t] = (rp.pankki.eiTaulukossaTilat[t] || 0) + 1; });
  return { rivit, raportti: rp };
}

function tulosta(r, opts) {
  const p = r.raportti, e = p.esitaytto, L = [], nimi = (a) => a.length ? ' (' + a.join('; ') + ')' : '';
  L.push((opts && opts.apply ? 'APPLY' : 'DRY-RUN') + ' — harjoituspankin kuittaus · seura ' + (opts && opts.seura) + ' · ' + p.yhteensa + ' riviä' + (p.duplikaatit.length || p.virheelliset.length ? ' · duplikaatti-id: ' + p.duplikaatit.length + ' · virheellinen id: ' + p.virheelliset.length : ''));
  L.push('\n[1] KUITTAUS (tuodaan vain OK / Muutettu)');
  L.push('  OK ' + p.kuittaus.ok + ' · Muutettu ' + p.kuittaus.muutettu + ' · Poista ' + p.kuittaus.poista + ' · TYHJÄ (ei vielä kuitattu) ' + p.kuittaus.tyhja + ' · tuntematon arvo ' + p.kuittaus.tuntematon.length + nimi(p.kuittaus.tuntematon));
  L.push('  → TUODAAN NYT: ' + p.tuodaan.length + ' riviä · ei tuoda: ' + (p.yhteensa - p.tuodaan.length - p.duplikaatit.length - p.virheelliset.length) + ' (tyhjä kuittaus ' + p.eiTuoda.tyhja + ', Poista ' + p.eiTuoda.poista.length + ', tuntematon ' + p.eiTuoda.tuntematon.length + ')');
  L.push('\n[2] ESITÄYTÖN KATTAVUUS "Mitä harjoitellaan" (riippumaton kuittauksesta; ' + p.yhteensa + ' riviä)');
  L.push('  vastaa TalentMaster-konseptia: ' + e.konseptiYht + ' · ' + Object.keys(e.konsepti).sort().map((k) => (H.KONSEPTIT.filter((x) => x[0] === k)[0] || [k, k])[1] + ' ' + e.konsepti[k]).join(' · '));
  L.push('  "ei TalentMaster-konseptia" (Teron esitäyttö; ei hakua, ei TM-peliharjoitetta vaihtoehtona): ' + e.eiKonseptia.length + nimi(e.eiKonseptia));
  L.push('    syy — pankin tyyppi-sarake: ' + Object.keys(e.eiKonseptiaTyypit).sort().map((k) => k + ' ' + e.eiKonseptiaTyypit[k]).join(' · '));
  L.push('  TYHJÄ (ei esitäyttöä): ' + e.tyhja.length + nimi(e.tyhja));
  L.push('  tunnistamaton arvo (ei D248-listassa): ' + e.tuntematon.length + nimi(e.tuntematon));
  L.push('  Toissijainen: annettu ' + e.toissijainenAnnettu + ' · tunnistamaton ' + e.toissijainenTuntematon.length + nimi(e.toissijainenTuntematon) + ' · sama kuin ensisijainen ' + e.toissijainenSamaKuinEnsisijainen.length + nimi(e.toissijainenSamaKuinEnsisijainen));
  L.push('\n[3] LÄHDE: oma ' + p.lahde.oma + ' · SoccerTutor ' + p.lahde.soccertutor.length + nimi(p.lahde.soccertutor) + ' · SPL ' + p.lahde.spl + ' · muu/en tiedä ' + p.lahde.muu + ' (joista tyhjä → muu ' + p.lahde.tyhjaMuuna + ') · tunnistamaton ' + p.lahde.tuntematon.length + nimi(p.lahde.tuntematon));
  L.push('[4] VIDEO_URL: annettu ' + p.video.annettu + ' · https ' + p.video.https + ' · ei-https (ei tuoda) ' + p.video.eiHttps.length + nimi(p.video.eiHttps));
  L.push('[5] IKÄKAISTA → ika_min/ika_max: jäsennetty ' + p.ika.jasennetty + ' · jäsentymätön ' + p.ika.jasentymaton.length + nimi(p.ika.jasentymaton) + ' · tyhjä ' + p.ika.tyhja.length + nimi(p.ika.tyhja));
  const k = p.pankki;
  if (k.luettu) {
    L.push('[6] PANKKIA VASTEN (luettu: ' + k.dokumentteja + ' dokumenttia; vertailu kaikille ' + (p.yhteensa - p.duplikaatit.length - p.virheelliset.length) + ' taulukon riville kuittauksesta riippumatta)');
    L.push('  taulukon rivit ilman dokumenttia: ' + k.ilmanDokumenttia.length + nimi(k.ilmanDokumenttia));
    L.push('  taulukon rivit joiden dokumentti ei ole hyväksytty (ei näy toimintakortissa): ' + k.eiHyvaksytty.length + nimi(k.eiHyvaksytty));
    L.push('  taulukon rivit joiden dokumentti on arkistoitu: ' + k.arkistoitu.length + nimi(k.arkistoitu));
    L.push('  pankin dokumentit joita taulukossa ei ole: ' + k.eiTaulukossa.length + (k.eiTaulukossa.length ? ' [' + Object.keys(k.eiTaulukossaTilat).sort().map((t) => t + ' ' + k.eiTaulukossaTilat[t]).join(' · ') + ']' : '') + nimi(k.eiTaulukossa));
  } else L.push('[6] pankkia vasten ei verrattu (--ei-lue): dokumenttien olemassaolo, tila ja arkistointi tarkistetaan vasta luvussa.');
  return L.join('\n');
}

function argv(a) { const o = {}; for (let i = 0; i < a.length; i++) { const x = a[i]; if (x.startsWith('--')) { const k = x.slice(2); if (['apply', 'ei-lue'].indexOf(k) >= 0) o[k] = true; else o[k] = a[++i]; } } return o; }

async function main(args) {
  const o = argv(args);
  if (!o.seura || !o.tiedosto) { console.error('Käyttö: node scripts/tuo_harjoitepankki_kuittaus.js --seura <seuraId> --tiedosto <xlsx> [--ei-lue] [--apply]'); return 2; }
  if (!/^[a-z0-9_]+$/.test(o.seura)) { console.error('Kelpaamaton --seura'); return 2; }
  const x = lueXlsx(fs.readFileSync(o.tiedosto)), taulu = valitseTaulu(x.sheets);
  let db = null, admin = null, nykyinen = null;
  if (!o['ei-lue'] || o.apply) {
    admin = require('firebase-admin'); admin.initializeApp({ credential: admin.credential.applicationDefault() }); db = admin.firestore();   // gcloud ADC (ei SA-avainta)
    nykyinen = {}; const s = await db.collection('seurat/' + o.seura + '/harjoitepankki').get(); s.forEach((d) => { nykyinen[d.id] = d.data(); });
  }
  const r = suunnittele(taulu, nykyinen); console.log(tulosta(r, { seura: o.seura, apply: !!o.apply }));
  if (!o.apply) { console.log('\n(dry-run: mitään ei kirjoitettu. --apply vain Teron ajamana, kun seura on kuitannut tiedoston.)'); return 0; }
  const kirjoitettavat = r.rivit.filter((x) => x.tuodaan); if (!kirjoitettavat.length) { console.log('\nEi kirjoitettavaa (ei kuitattuja rivejä).'); return 0; }
  const FV = admin.firestore.FieldValue, juuri = 'seurat/' + o.seura + '/harjoitepankki/'; let batch = db.batch(), n = 0, k = 0;
  for (const x of kirjoitettavat) {
    const ref = db.doc(juuri + x.id); if (ref.path.indexOf(juuri) !== 0) throw new Error('Polku seuran ulkopuolella: ' + ref.path);
    batch.set(ref, Object.assign({}, x.patch, { versio: (typeof nykyinen[x.id].versio === 'number' ? nykyinen[x.id].versio : 1) + 1, paivitetty: FV.serverTimestamp() }), { merge: true }); n++;
    if (++k >= 400) { await batch.commit(); batch = db.batch(); k = 0; }
  }
  if (k) await batch.commit(); console.log('\nKirjoitettu ' + n + ' dokumenttia (' + juuri + ').'); return 0;
}

module.exports = { lueTaulu, valitseTaulu, suunnittele, tulosta, argv, ALIAS };
if (require.main === module) main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error(e && e.stack || e); process.exit(1); });
