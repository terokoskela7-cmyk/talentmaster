'use strict';
/**
 * Projekti 07 / PR 3: erottelun valvonnan AJASTETTU ajo (P1 = Cloud Function omassa moduulissaan). index.js vain kytkee kaksi ajastusta tähän.
 *  · valvontaPaivittain  — joka päivä 05:30 Europe/Helsinki, KEVYT: vain E1–E7 -tulokset (P2)
 *  · valvontaViikko      — maanantaisin 05:00, TÄYSI: kaikki mittarit (E, F, H, K, M) + K3-kasvu edellisiin viikkoajoihin verrattuna
 * Sama lukukerros (valvonta_luku.js) ja sama logiikka (tm_valvonta.js) kuin käsiajurissa scripts/valvonta_aja.js. P10: demo-seurat ohitetaan (OHITETUT_SEURAT); P11: sallitut (valvonta_sallitut.json).
 *
 * KUIVA-AJO (VALVONTA_KUIVA): ajo on KUIVA, ellei VALVONTA_KUIVA ole täsmälleen '0' → ei mitään kirjoitusta, vain lokirivit (seura, koodi, kokoelma, lukumäärät). Ensimmäinen viikko ajetaan kuivana.
 *   Fail-safe: ympäristömuuttujan puuttuminen (CI-deploy ei lue functions/.env, CLAUDE.md §39) = kuiva. Tuotantoon siirto: aseta VALVONTA_KUIVA=0 palvelulle (Teron päätös viikon jälkeen).
 * KIRJOITUS (P3/P5): vain `kirjaaAudit` → audit-kokoelma, toiminto 'valvonta_ajo'. Ei muita kirjoituksia (tests/valvonta_kirjoitusvartija.test.js). Ei Rules-muutosta.
 * Sähköposti (P4/P6) tulee PR 4:ssä (Secret Manager VALVONTA_VASTAANOTTAJA); tämä PR ei lähetä mitään.
 * PII (P4/VAIHE0 §3.3): audit-rivi ja loki sisältävät vain seura-id:t, tarkistuskoodit, kokoelmien nimet ja lukumäärät; tmVOnkoPii ennen kirjoitusta; virheestä vain koodi.
 */
const V = require('./tm_valvonta.js');
const R = require('./tm_valvonta_raportti.js');
const L = require('./valvonta_luku.js');

const TOIMINTO = 'valvonta_ajo';
const SEURA_RE = /^[a-z0-9_-]{1,40}$/, KOK_RE = /^[a-z_]{1,40}$/;

const onKuiva = (env) => (env || process.env).VALVONTA_KUIVA !== '0';
function sallitutRivit() { const j = require('./valvonta_sallitut.json'), v = V.tmVSallitutVirheet(j.rivit); if (v.length) throw new Error('valvonta_sallitut.json virheellinen: ' + v.join('; ')); return j.rivit; }
function aliasRivit() { const j = require('./valvonta_aliakset.json'), v = V.tmVAliasVirheet(j.rivit); if (v.length) throw new Error('valvonta_aliakset.json virheellinen: ' + v.join('; ')); return j.rivit; }

/** Kevyt päivittäinen ajo: vain E1–E7 (P2). Täysi: kaikki. */
const suodataTyypille = (tulokset, tyyppi) => (tyyppi === 'viikko' ? tulokset : tulokset.filter((t) => /^E[1-7]/.test(t.koodi)));

/** K3-syöte seuroittain (vain ei-ohitetut seurat): { sid: { toimenpiteet: n, seuranta_kuittaukset: n, viestit_klippi: n } }. Vain seura-id:t ja lukumäärät. */
function kasvuLuvut(aineisto, ohitetut) {
  const o = {}; aineisto.seurat.forEach((s) => { if (ohitetut.indexOf(s.sid) < 0 && SEURA_RE.test(s.sid)) o[s.sid] = V.tmVKasvuLuvut(s.kokoelmat); });
  return o;
}
/** K3 (kokoelman viikkokasvu): nyt vs 1. ja 2. edellinen VIIKKOajo. Ei edellistä → ei K3-rivejä. → tulosrivit { seura, koodi:'K3', kokoelma, lkm (kasvu), taso }. */
function k3Tulokset(nyt, ed1, ed2) {
  const out = []; if (!ed1) return out;
  Object.keys(nyt || {}).forEach((sid) => Object.keys(nyt[sid] || {}).forEach((k) => {
    const a = nyt[sid][k], b = ((ed1 || {})[sid] || {})[k], c = ((ed2 || {})[sid] || {})[k];
    if (typeof a !== 'number' || typeof b !== 'number' || !KOK_RE.test(k)) return;
    const taso = V.tmVKasvuTaso(a, b, typeof c === 'number' ? c : null); if (taso !== 'ok') out.push({ seura: sid, koodi: 'K3', kokoelma: k, lkm: Math.max(0, a - b), taso });
  }));
  return out;
}
const aika = (x) => (x && typeof x.toMillis === 'function' ? x.toMillis() : (x instanceof Date ? x.getTime() : Number(x) || 0));
/** Edelliset valvonta_ajo-rivit (uusin ensin): audit-indeksi toiminto ASC + aikaleima DESC on jo olemassa (firestore.indexes.json). Vain luku. */
async function edellisetAjot(db, tyyppi) {
  const snap = await db.collection('audit').where('toiminto', '==', TOIMINTO).orderBy('aikaleima', 'desc').limit(40).get();
  return snap.docs.map((d) => d.data() || {}).filter((x) => x.tyyppi === tyyppi);
}
const rivitTuloksiksi = (rivit) => (Array.isArray(rivit) ? rivit : []).map((r) => ({ seura: r.s, koodi: r.k, kokoelma: r.c, lkm: r.n }));

/** Kirjoittaa audit-rivin. ENSIMMÄINEN JA AINOA kirjoituskutsu valvontamoduulissa (P3). */
async function kirjaaAudit(deps, rivi) {
  await deps.db.collection('audit').add(Object.assign({}, rivi, { lahde: 'valvonta', aikaleima: deps.FieldValue.serverTimestamp() }));
}

/** Koko ajo (testattava): deps = { db, FieldValue, loki?, nytMs?, env? }, tyyppi 'paivittain'|'viikko'. → { kuiva, raportti, audit, kirjattu }. */
async function aja(deps, tyyppi) {
  const loki = deps.loki || console, kuiva = onKuiva(deps.env), nytMs = deps.nytMs || Date.now(), ohitetut = V.OHITETUT_SEURAT;
  const aineisto = await L.kerayAineisto(deps.db, { nytMs });
  const kaikki = V.tmVAjaKaikki({ seurat: aineisto.seurat, auditRivit: aineisto.auditRivit, nytMs, ohitetut, sallitut: sallitutRivit(), aliakset: aliasRivit() });
  let tulokset = suodataTyypille(kaikki, tyyppi), edellinen = [], kasvu = null;
  let edelliset = []; try { edelliset = await edellisetAjot(deps.db, tyyppi); } catch (e) { loki.error('valvonta: edellisen ajon luku epäonnistui koodi=' + R.tmVTurvallinenVirhe(e).koodi); }
  if (edelliset[0]) edellinen = rivitTuloksiksi(edelliset[0].rivit);
  if (tyyppi === 'viikko') { kasvu = kasvuLuvut(aineisto, ohitetut); tulokset = tulokset.concat(k3Tulokset(kasvu, edelliset[0] && edelliset[0].kasvu, edelliset[1] && edelliset[1].kasvu)); }
  const raportti = R.tmVRaportti({ tulokset, ajettu: new Date(nytMs).toISOString(), tyyppi, edellinen, ohitetut, eiEhtinyt: aineisto.virheet.map((v) => v.seura).filter((s) => s !== '-') });
  const audit = Object.assign(R.tmVAuditRivi(raportti), kasvu ? { kasvu } : {});
  const pii = R.tmVOnkoPii(audit, []); if (!pii.ok) throw new Error('valvonta: PII-vartija hylkäsi rivin');
  const y = raportti.yhteenveto;
  loki.log('valvonta ' + tyyppi + (kuiva ? ' KUIVA' : '') + ' valmis · ERROR ' + y.virheita + ' · WARN ' + y.varoituksia + ' · ei ehtinyt ' + y.eiEhtinyt + ' · hylätty ' + y.hylatty + ' · lukuvirheitä ' + aineisto.virheet.length);
  raportti.rivit.forEach((r) => { if (r.lkm > 0 || r.taso !== 'ok') loki.log('valvonta ' + R.tmVRiviTeksti(r)); });
  aineisto.virheet.forEach((v) => loki.error(R.tmVLokiVirhe(v.seura, { code: v.koodi })));
  if (kuiva) return { kuiva: true, raportti, audit, kirjattu: false };
  await kirjaaAudit(deps, audit);
  return { kuiva: false, raportti, audit, kirjattu: true };
}
/** index.js:n kytkentä: onRun-käsittelijä. Virhe → loki (vain koodi) + heitto, jotta Cloud Scheduler/Monitoring näkee epäonnistumisen. */
function ajastettuKasittelija(deps, tyyppi) {
  return async () => {
    try { await aja(deps, tyyppi); } catch (e) { (deps.loki || console).error('valvonta ' + tyyppi + ' epäonnistui koodi=' + R.tmVTurvallinenVirhe(e).koodi); throw e; }
    return null;
  };
}
module.exports = { aja, ajastettuKasittelija, onKuiva, suodataTyypille, k3Tulokset, kasvuLuvut, kirjaaAudit, edellisetAjot, TOIMINTO };
