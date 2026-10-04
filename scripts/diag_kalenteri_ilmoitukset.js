#!/usr/bin/env node
/* diag_kalenteri_ilmoitukset.js — KUIVA, VAIN LUKU (V2 P0.4 PR 3, 4.10.2026). EI --apply-polkua, EI siivousta.
 * Laskee pelaajien kalenteri-ilmoituksista (seurat/{sid}/pelaajat/{pid}/notifikaatiot) per seura:
 *   1) ennen 2.10.2026 klo 23:45 +0300 luodut (#723:n deploy: sitä ennen klo-teksti ja "huominen" laskettiin UTC:llä → 2–3 h väärin)
 *   2) tuplat: sama pelaaja + sama tapahtuma (linkki) + sama tyyppi useana dokumenttina — muutosilmoitukset erikseen
 *      (ennen PR 2:n kiinteitä tunnisteita jokainen muutos lisäsi uuden rivin), sekä täsmälleen sama teksti (varma tupla)
 * Siivousta EI tehdä: P0.4 PR 1 (client) piilottaa menneiden tapahtumien muistutus/muutos-ilmoitukset eikä oikeiden pelaajien
 * dataan kirjoiteta (§0). Tämä vain mittaa laajuuden — Tero päättää jatkosta.
 *
 * Ajo (gcloud ADC, EI palvelutilin avainta; Tero ajaa):
 *   node scripts/diag_kalenteri_ilmoitukset.js                       (kaikki seurat)
 *   node scripts/diag_kalenteri_ilmoitukset.js --seura=kpv
 *   node scripts/diag_kalenteri_ilmoitukset.js --ennen=2026-10-02T23:45:00+03:00
 * VAIN .get() (collectionGroup('notifikaatiot'), suodatus koodissa) — ei set/update/delete/batch/add/create.
 * Tulosteessa EI nimiä eikä ilmoitustekstejä: vain seura, pelaaja-/ilmoitus-ID:t ja lukumäärät.
 */
const path = require('path');

const KATKAISU_OLETUS = '2026-10-02T23:45:00+03:00';
const TYYPIT = ['muistutus', 'muutos', 'peruttu'];

// Polku seurat/{sid}/pelaajat/{pid}/notifikaatiot/{id} → { sid, pid, id } | null (henkilökunnan kayttajat/… -ilmoitukset pois)
function tmIlmoituksenPolku(polku) {
  const m = String(polku || '').match(/^seurat\/([^/]+)\/pelaajat\/([^/]+)\/notifikaatiot\/([^/]+)$/);
  return m ? { sid: m[1], pid: m[2], id: m[3] } : null;
}

/**
 * PUHDAS: rivit [{ sid, pid, id, tyyppi, linkki, teksti, luotuMs, luettu }] → per seura + yhteensä.
 *   ennenKatkaisua[tyyppi]   — luotu < katkaisuMs
 *   tuplaRyhmat[tyyppi]      — (pid + linkki + tyyppi) -ryhmiä joissa >1 dokumenttia
 *   tuplaYlimaaraisia[tyyppi]— ylimääräisiä dokumentteja (Σ n-1)
 *   samaTekstiYlimaaraisia   — täsmälleen sama (pid + linkki + tyyppi + teksti) → varma tupla (Σ n-1)
 *   esimerkit                — enintään 3 ryhmää / seura: { pid, linkki, tyyppi, n, idt[] }
 */
function tmLaskeIlmoitusDiag(rivit, katkaisuMs) {
  const per = {};
  const uusi = () => ({
    ilmoituksia: 0, lukemattomia: 0, ennenKatkaisua: { muistutus: 0, muutos: 0, peruttu: 0, muu: 0 },
    ennenKatkaisuaLukemattomia: 0, tuplaRyhmat: { muistutus: 0, muutos: 0, peruttu: 0 }, tuplaYlimaaraisia: { muistutus: 0, muutos: 0, peruttu: 0 },
    samaTekstiYlimaaraisia: 0, esimerkit: [],
  });
  const ryhmat = {}, tekstit = {};
  (rivit || []).forEach((r) => {
    if (!r || !r.sid) return;
    const s = per[r.sid] = per[r.sid] || uusi();
    s.ilmoituksia++;
    if (r.luettu === false) s.lukemattomia++;
    const t = TYYPIT.indexOf(r.tyyppi) >= 0 ? r.tyyppi : 'muu';
    if (r.luotuMs != null && r.luotuMs < katkaisuMs) { s.ennenKatkaisua[t]++; if (r.luettu === false) s.ennenKatkaisuaLukemattomia++; }
    if (TYYPIT.indexOf(r.tyyppi) >= 0 && r.linkki) {
      const k = [r.sid, r.pid, r.tyyppi, r.linkki].join('|');
      (ryhmat[k] = ryhmat[k] || { sid: r.sid, pid: r.pid, tyyppi: r.tyyppi, linkki: r.linkki, idt: [] }).idt.push(r.id);
      const kt = k + '|' + String(r.teksti || '');
      tekstit[kt] = tekstit[kt] || { sid: r.sid, n: 0 }; tekstit[kt].n++;
    }
  });
  Object.keys(ryhmat).forEach((k) => {
    const g = ryhmat[k]; if (g.idt.length < 2) return;
    const s = per[g.sid];
    s.tuplaRyhmat[g.tyyppi]++; s.tuplaYlimaaraisia[g.tyyppi] += g.idt.length - 1;
    if (s.esimerkit.length < 3) s.esimerkit.push({ pid: g.pid, linkki: g.linkki, tyyppi: g.tyyppi, n: g.idt.length, idt: g.idt.slice(0, 5) });
  });
  Object.keys(tekstit).forEach((k) => { if (tekstit[k].n > 1) per[tekstit[k].sid].samaTekstiYlimaaraisia += tekstit[k].n - 1; });
  const yht = uusi();
  Object.keys(per).forEach((sid) => {
    const s = per[sid];
    yht.ilmoituksia += s.ilmoituksia; yht.lukemattomia += s.lukemattomia; yht.ennenKatkaisuaLukemattomia += s.ennenKatkaisuaLukemattomia; yht.samaTekstiYlimaaraisia += s.samaTekstiYlimaaraisia;
    ['muistutus', 'muutos', 'peruttu', 'muu'].forEach((t) => { yht.ennenKatkaisua[t] += s.ennenKatkaisua[t]; });
    TYYPIT.forEach((t) => { yht.tuplaRyhmat[t] += s.tuplaRyhmat[t]; yht.tuplaYlimaaraisia[t] += s.tuplaYlimaaraisia[t]; });
  });
  delete yht.esimerkit;
  return { perSeura: per, yhteensa: yht };
}

function tmRiviDokista(sid, pid, id, d) {
  const l = d && d.luotu;
  const ms = (l && typeof l.toMillis === 'function') ? l.toMillis() : (typeof l === 'string' ? Date.parse(l) : (l instanceof Date ? l.getTime() : null));
  return { sid, pid, id, tyyppi: d && d.tyyppi, linkki: d && d.linkki, teksti: d && d.teksti, luotuMs: (ms != null && !isNaN(ms)) ? ms : null, luettu: d ? d.luettu : undefined };
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (n, d) => { const o = argv.find((x) => x.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : d; };
  const SEURA = arg('seura', null);
  const katkaisuMs = Date.parse(arg('ennen', KATKAISU_OLETUS));
  if (isNaN(katkaisuMs)) throw new Error('--ennen: virheellinen aika');
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore();
  const snap = await db.collectionGroup('notifikaatiot').get();
  const rivit = [];
  snap.forEach((doc) => {
    const p = tmIlmoituksenPolku(doc.ref.path);
    if (!p || (SEURA && p.sid !== SEURA)) return;
    rivit.push(tmRiviDokista(p.sid, p.pid, p.id, doc.data()));
  });
  const r = tmLaskeIlmoitusDiag(rivit, katkaisuMs);
  console.log('Katkaisu: ' + new Date(katkaisuMs).toISOString() + ' (ennen tätä luodut)\n');
  Object.keys(r.perSeura).sort().forEach((sid) => {
    const s = r.perSeura[sid];
    console.log(sid + ': ilmoituksia ' + s.ilmoituksia + ' (lukemattomia ' + s.lukemattomia + ')');
    console.log('  ennen katkaisua: muistutus ' + s.ennenKatkaisua.muistutus + ' · muutos ' + s.ennenKatkaisua.muutos + ' · peruttu ' + s.ennenKatkaisua.peruttu + ' · muu ' + s.ennenKatkaisua.muu + ' (lukemattomia ' + s.ennenKatkaisuaLukemattomia + ')');
    console.log('  tuplaryhmiä (pelaaja+tapahtuma+tyyppi, >1 dokumenttia): muutos ' + s.tuplaRyhmat.muutos + ' (ylimääräisiä ' + s.tuplaYlimaaraisia.muutos + ') · muistutus ' + s.tuplaRyhmat.muistutus + ' (' + s.tuplaYlimaaraisia.muistutus + ') · peruttu ' + s.tuplaRyhmat.peruttu + ' (' + s.tuplaYlimaaraisia.peruttu + ')');
    console.log('  täsmälleen sama teksti (varma tupla), ylimääräisiä: ' + s.samaTekstiYlimaaraisia);
    s.esimerkit.forEach((e) => console.log('    esim: ' + e.tyyppi + ' pid=' + e.pid + ' ' + e.linkki + ' n=' + e.n + ' idt=' + e.idt.join(',')));
  });
  const y = r.yhteensa;
  console.log('\nYHTEENSÄ: ilmoituksia ' + y.ilmoituksia + ' · ennen katkaisua ' + (y.ennenKatkaisua.muistutus + y.ennenKatkaisua.muutos + y.ennenKatkaisua.peruttu + y.ennenKatkaisua.muu) + ' · muutos-tuplia (ylimääräisiä) ' + y.tuplaYlimaaraisia.muutos + ' · varmoja tuplia ' + y.samaTekstiYlimaaraisia);
  console.log('\nVAIN LUKU — mitään ei kirjoitettu. Siivousta ei ole toteutettu (client piilottaa menneiden tapahtumien ilmoitukset, #775).');
}

if (require.main === module) main().catch((e) => { console.error('VIRHE', e.message); process.exit(1); });
module.exports = { tmIlmoituksenPolku, tmLaskeIlmoitusDiag, tmRiviDokista, KATKAISU_OLETUS };
