/**
 * Sisarusbugi — tuotantoselvitys (VAIN LUKU). Brief: sisarusbugi 30.9.2026, osa 1.
 *
 * Vika: Seura-sivun uuden pelaajan rekisteröinti haki olemassa olevaa pelaajaa PELKÄLLÄ huoltajan
 * sähköpostilla → toisen lapsen kutsu ja suostumus kohdistuivat huoltajan ensimmäiselle lapselle,
 * eikä toista lasta luotu.
 *
 * Tulostaa VAIN lukumääriä, seuratunnisteita, pelaajatunnisteita ja päivämääriä — EI nimiä eikä
 * sähköposteja (nimet ja osoitteet verrataan normalisoituina muistissa).
 *
 * Ajo: cd functions && node ../scripts/sisarustarkistus.js   (gcloud ADC)
 */
'use strict';
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'talentmaster-pilot' });
const db = admin.firestore();

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const email = (s) => String(s || '').trim().toLowerCase();
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : (v ? Date.parse(v) || null : null));
const pv = (m) => (m ? new Date(m).toISOString().slice(0, 10) : '-');
const PV = 24 * 3600 * 1000;
const nimi = (x) => norm([x.etunimi, x.sukunimi].filter(Boolean).join(' ') || x.nimi);
const palloIdt = (x) => [x.tunniste, x.palloID, x.palloId].filter((v) => v != null).map((v) => String(v).trim());

(async () => {
  // Pelaajat (vain seurojen alta) ja seurojen nimet → id
  const seuraNimi = new Map();
  (await db.collection('seurat').get()).forEach((d) => { if (d.data().nimi) seuraNimi.set(norm(d.data().nimi), d.id); seuraNimi.set(norm(d.id), d.id); });
  const pelaajat = [];
  (await db.collectionGroup('pelaajat').get()).forEach((d) => {
    const s = d.ref.parent.parent;
    if (!s || s.parent.id !== 'seurat') return;
    pelaajat.push({ sid: s.id, pid: d.id, x: d.data() || {} });
  });
  const huoltajanLapset = new Map();   // sid|email → [pelaaja]
  pelaajat.forEach((p) => {
    const e = email(p.x.huoltajaEmail);
    if (!e) return;
    const k = p.sid + '|' + e;
    if (!huoltajanLapset.has(k)) huoltajanLapset.set(k, []);
    huoltajanLapset.get(k).push(p);
  });

  // Audit
  const kutsut = [], suostumukset = [];
  (await db.collection('audit').where('toiminto', 'in', ['rekisterikutsu_lahetetty', 'suostumus_annettu']).get()).forEach((d) => {
    const x = d.data();
    (x.toiminto === 'rekisterikutsu_lahetetty' ? kutsut : suostumukset).push(x);
  });

  // 1 · Kadonneet sisarukset
  console.log('=== 1 · KUTSUT, joiden huoltajalla on pelaaja mutta kutsun nimi ei vastaa yhtäkään hänen pelaajaansa ===');
  let n1 = 0;
  const per1 = {};
  for (const k of kutsut) {
    const e = email(k.hEmail);
    if (!e || !k.pelaajaNimi) continue;
    const sid = k.seuraId || seuraNimi.get(norm(k.seura)) || null;
    const avaimet = sid ? [sid + '|' + e] : [...huoltajanLapset.keys()].filter((a) => a.endsWith('|' + e));
    for (const a of avaimet) {
      const lapset = huoltajanLapset.get(a);
      if (!lapset || !lapset.length) continue;
      if (lapset.some((p) => nimi(p.x) === norm(k.pelaajaNimi))) continue;
      const t = ms(k.aikaleima);
      const suost = suostumukset.filter((s) => lapset.some((p) => p.pid === s.pelaajaId && p.sid === (s.seuraId || p.sid))
        && ms(s.aikaleima) >= t && ms(s.aikaleima) <= t + 14 * PV);
      n1++;
      const [seura] = a.split('|');
      per1[seura] = (per1[seura] || 0) + 1;
      console.log('  seura=' + seura, 'kutsu=' + pv(t), 'huoltajan pelaajat=' + lapset.map((p) => p.pid).join(','),
        'suostumus 0–14 pv kutsun jälkeen=' + (suost.length ? 'KYLLÄ → ' + [...new Set(suost.map((s) => s.pelaajaId))].join(',') + ' (' + suost.map((s) => pv(ms(s.aikaleima))).join(',') + ')' : 'ei'));
    }
  }
  console.log('  yhteensä', n1, 'seuroittain', JSON.stringify(per1));

  // 2 · Epäilyttävät suostumukset (vain huoltajat, joilla 2+ lasta samassa seurassa)
  console.log('\n=== 2 · EPÄILYTTÄVÄT SUOSTUMUKSET (ehdokkaat; huoltajalla 2+ lasta seurassa) ===');
  const seuranNimet = new Map();   // sid → Map(nimi → [pid])
  pelaajat.forEach((p) => {
    if (!seuranNimet.has(p.sid)) seuranNimet.set(p.sid, new Map());
    const m = seuranNimet.get(p.sid); const n = nimi(p.x);
    if (n) { if (!m.has(n)) m.set(n, []); m.get(n).push(p.pid); }
  });
  let n2 = 0;
  for (const [, lapset] of huoltajanLapset) {
    if (lapset.length < 2) continue;
    for (const p of lapset) {
      const antaja = norm((p.x.suostumus && p.x.suostumus.antaja) || p.x.suostumuksenAntaja);
      const syyt = [];
      const muut = antaja ? (seuranNimet.get(p.sid).get(antaja) || []).filter((id) => id !== p.pid) : [];
      if (muut.length) syyt.push('antaja = toisen pelaajan nimi (' + muut.join(',') + ')');
      const luotu = ms(p.x.tuotu || p.x.luotu), annettu = ms((p.x.suostumus && p.x.suostumus.annettu) || p.x.suostumusAnnettu);
      if (luotu && annettu && pv(luotu) !== pv(annettu)) syyt.push('luotu ' + pv(luotu) + ' ≠ suostumus ' + pv(annettu));
      if (!syyt.length) continue;
      n2++;
      console.log('  seura=' + p.sid, 'pelaaja=' + p.pid, 'sisaruksia=' + (lapset.length - 1), syyt.join(' · '));
    }
  }
  console.log('  ehdokkaita', n2);

  // 3 · PalloID 23456789
  const pid3 = pelaajat.filter((p) => palloIdt(p.x).includes('23456789'));
  console.log('\n=== 3 · PalloID 23456789 ===');
  console.log('  pelaajia', pid3.length, pid3.map((p) => p.sid + '/' + p.pid).join(' '));

  // 4 · Monilapsiset huoltajat
  const per4 = {};
  let n4 = 0, lapsia4 = 0;
  for (const [a, lapset] of huoltajanLapset) {
    if (lapset.length < 2) continue;
    n4++; lapsia4 += lapset.length;
    const [sid] = a.split('|');
    per4[sid] = (per4[sid] || 0) + 1;
  }
  console.log('\n=== 4 · HUOLTAJAT, joilla 2+ lasta samassa seurassa ===');
  console.log('  huoltajia', n4, '· lapsia yhteensä', lapsia4, '· seuroittain', JSON.stringify(per4));
  console.log('\nkutsuja auditissa', kutsut.length, '· suostumuksia auditissa', suostumukset.length, '· pelaajia', pelaajat.length);
})().catch((e) => { console.error('virhe:', e.code || e.message); process.exit(1); });
