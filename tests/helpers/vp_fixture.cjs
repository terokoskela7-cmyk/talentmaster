'use strict';
/* D168 · fixture-tilat (tests/fixtures/vp/*.json = speksit) → täysi data annetulle ajanhetkelle (nytMs).
   Käyttö: const F = require('./helpers/vp_fixture.cjs'); const d = F.lataa('pilotti', NYT);
   d = { nyt, spec, koosteet, ensin, pelaajat, joukkueDocs, nimet, kalenteri, tapahtumat, toimenpiteet, syote }
     · koosteet/ensin/pelaajat/joukkueDocs/kalenteri/tapahtumat/toimenpiteet = VP-sivun raakadata (kuvaskripti ajaa oikean VP:n)
     · syote = tmTilanneMalli:n syöte (design-testit ajavat libit suoraan; poikkeamat/ehdotukset annettu valmiina)
   Ei oikeita nimiä: joukkueet "P12 Pilotti", "P10 Demo", pelaajat vain id:llä. */
const fs = require('fs'), path = require('path');
const V = require('../../lib/tm_viikko.js'), TT = require('../../lib/tm_vp_tilanne.js'), PU = require('../../lib/tm_seuran_pulssi.js');
const DAY = 86400000, HR = 3600000, TILAT = ['tyhja', 'pilotti', 'kypsa', 'kuormitus'];
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const spec = (nimi) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'vp', nimi + '.json'), 'utf8'));
const lyhyt = (nimi) => { const m = /[A-Za-zÅÄÖ]?\d{1,2}/.exec(String(nimi)); return m ? m[0].toUpperCase() : String(nimi); };
/* D144: uniikit lyhyet tunnisteet, enintään kuusi + "+N" */
const tunnisteLista = (nimet) => { const u = nimet.map(lyhyt).filter((x, i, a) => a.indexOf(x) === i); return u.slice(0, 6).join(', ') + (u.length > 6 ? ' +' + (u.length - 6) : ''); };
const TEKSTIT = { tki_alhainen: 'pelaajia alle pronssitason. Fokusoi tekniikkaharjoittelu.', hh_taso_alhainen: 'pelaajia alle Eerikkilä-tason. Aloita yksilöllinen ohjelma.', flei_kartoitus_puuttuu: 'harjoitettavuuskartoitus (kehon valmius) tekemättä. Varaa kartoituspäivä.', suunta_lasku: 'H-H taso laskussa. Tarkista kuormitus.', tki_lahella_merkkia: 'pelaajia lähellä pronssia. Kohdenna omatoimiharjoittelu.' };

function lataa(tila, nytMs) {
  const s = spec(tila), nyt = nytMs, vuosi = new Date(nyt).getUTCFullYear(), J = s.joukkueet, idx = TT.viikkoIdx(nyt);
  const ids = {}; J.forEach((j) => { ids[j.id] = j; });
  const vkSitten = (w) => V.tmIsoViikkoMs(nyt - w * 7 * DAY).tunniste;
  /* koosteet: 4 viikkoa */
  const koosteet = [3, 2, 1, 0].map((w) => {
    const jm = {}, y = { n_pelaajat: 0, n_ilman_joukkuetta: 0, n_suostumus: 0, n_kirjautunut_30: 0, n_huoltaja_30: 0, n_aktiivinen_7: 0, n_aktiivinen_30: 0, n_toiminto_7: 0, n_perhe_kuittaus_7: 0, n_harjoite_7: 0, n_harjoite_30: 0 };
    J.forEach((j) => {
      const n = j.n, jakso = !!(j.jakso && j.jakso.alkuVkSitten >= w), akt = Math.round(n * j.aktPros / 100), harj = Math.round(n * j.harjPros / 100), kats = j.katsAuki && w === 0;
      jm[j.id] = { nimi: j.nimi, ikavaihe: j.ika <= 12 ? 'leikkija' : j.ika <= 15 ? 'rakentaja' : 'showcase', tyyppi: j.tyyppi, profiili: j.profiili, jakso, n_pelaajat: n, n_jaksolla: jakso ? n : 0, n_valinta_odottaa: 0,
        n_katselmus: kats ? Math.ceil(n / 2) : 0, n_vastanneet: kats ? Math.round(n * j.vastPros / 100) : 0, n_vastausperusta: kats ? n : 0, n_katselmus_ajallaan: j.jakso ? 1 : 0, n_katselmus_perusta: j.jakso ? 1 : 0,
        n_suostumus: j.suost, n_kirjautunut_30: akt, n_huoltaja_30: Math.round(j.suost * .6), n_aktiivinen_7: akt, n_aktiivinen_30: akt, n_toiminto_7: Math.round(akt / 2), n_perhe_kuittaus_7: Math.round(j.suost / 2), n_harjoite_7: harj, n_harjoite_30: harj, jakso_nimi: jakso ? j.jakso.nimi : null };
      if (kats) jm[j.id].n_katselmus_pv = j.katsPv;
      y.n_pelaajat += n; y.n_suostumus += j.suost; y.n_aktiivinen_7 += akt; y.n_aktiivinen_30 += akt; y.n_harjoite_7 += harj; y.n_harjoite_30 += harj; y.n_kirjautunut_30 += akt; y.n_huoltaja_30 += Math.round(j.suost * .6);
    });
    return { vk: vkSitten(w), versio: 5, laskettu: { seconds: (nyt - (w === 0 ? 2 * HR : w * 7 * DAY)) / 1000 }, yhteensa: y, joukkueet: jm };
  });
  const pelaajat = [];
  J.forEach((j) => { for (let i = 0; i < j.n; i++) {
    const p = { id: j.id + '_' + (i + 1), joukkueet: [j.id], joukkue: j.nimi, syntymaVuosi: vuosi - j.ika, sukupuoli: j.sp === 'T' ? 'N' : 'M', suostumusTila: i < j.suost ? 'annettu' : 'odottaa', jaksofokus: null };
    if (j.jakso) p.jaksofokus = { konsepti_avain: 'k', konsepti_nimi: j.jakso.nimi, domeeni: 'tekninen', alkoi: new Date(nyt - j.jakso.alkuVkSitten * 7 * DAY).toISOString(), kesto_vk: j.jakso.N, lahde: 'valmentaja' };
    if (j.tki) { p.tki_viimeisin = j.tki.ka; p.tki_pvm = iso(nyt - j.tki.pvmSitten * DAY); p.d2_taso = 2; }
    pelaajat.push(p); } });
  const joukkueDocs = J.map((j) => { const d = { id: j.id, nimi: j.nimi, ikaryhma: j.sp + j.ika, tyyppi: j.tyyppi, valmentajaprofiili: j.profiili, jaksofokus: null };
    if (j.jakso) d.jaksofokus = { osa_alueet: { tekninen_taktinen: { nimi: j.jakso.nimi } }, alku: iso(nyt - j.jakso.alkuVkSitten * 7 * DAY), kesto_vk: j.jakso.N }; return d; });
  const nimet = {}; J.forEach((j) => { nimet[j.id] = j.nimi; });
  const kalenteri = s.kalenteri.map((e) => ({ nimi: e.nimi, alkaa: nyt + e.h * HR }));
  if (s.palaveriPv != null) kalenteri.push({ nimi: 'Jaksopalaveri', tyyppi: 'jaksopalaveri', alkaa: nyt + s.palaveriPv * DAY, poistettu: false, id: 'jp1' });
  const tapahtumat = J.length ? [{ id: 't1', tila: 'suunniteltu', nimi: 'Testijakso', pvm_alku: iso(nyt + 24 * DAY), pvm_loppu: iso(nyt + 31 * DAY) }] : [];
  const toimenpiteet = []; s.ehdotukset.forEach((e, k) => e.joukkueet.forEach((ji) => toimenpiteet.push({ id: 'e' + k + '_' + ji, signaali: e.signaali, teksti: J[ji].nimi + ' — ' + TEKSTIT[e.signaali], joukkue: J[ji].nimi, luotu: { seconds: (nyt - e.ikaPv * DAY) / 1000 } })));
  /* Tilanne-syöte (tmTilanneMalli) */
  const aktJ = J.filter((j) => j.n > 0).sort((a, b) => a.ika - b.ika || a.nimi.localeCompare(b.nimi));
  const joukkueet = aktJ.map((j) => ({ jid: j.id, nimi: j.nimi, ika: j.ika, n: j.n, voimassa: !!j.jakso, jakso: j.jakso ? { nimi: j.jakso.nimi, a0: idx - j.jakso.alkuVkSitten, a1: idx - j.jakso.alkuVkSitten + j.jakso.N - 1, N: j.jakso.N } : null, katselmusAuki: !!j.katsAuki, katselmusPv: j.katsPv }));
  const mitattu = aktJ.map((j) => ({ nimi: j.nimi, pvm: j.tki ? iso(nyt - j.tki.pvmSitten * DAY) : null, ms: j.tki ? nyt - j.tki.pvmSitten * DAY : null }));
  const poikkeamat = s.huomiot.filter((h) => J[h.joukkue] && J[h.joukkue].n > 0).map((h) => Object.assign({}, h, { joukkue: J[h.joukkue].nimi }));
  const ehdotukset = s.ehdotukset.map((e) => ({ ids: e.joukkueet.map((ji) => 'e' + s.ehdotukset.indexOf(e) + '_' + ji), teksti: tunnisteLista(e.joukkueet.map((ji) => J[ji].nimi)) + ' — ' + TEKSTIT[e.signaali], luotu: { seconds: (nyt - e.ikaPv * DAY) / 1000 }, signaali: e.signaali }));
  const njakso = joukkueet.filter((j) => j.voimassa).length;
  const syote = { nytMs: nyt, joukkueet, seura: { njakso, joukkueita: joukkueet.length }, katselmusKausi: s.katsKausi, mitattu, kausiAlkuMs: Date.UTC(vuosi, 7, 1), testijakso: joukkueet.length ? { a0: idx + 4, a1: idx + 5, nimi: 'Testijakso' } : null,
    palaveri: s.palaveriPv != null && joukkueet.length ? { ms: nyt + s.palaveriPv * DAY, id: 'jp1' } : null, poikkeamat, ehdotukset, idpN: s.idpN, talentit: s.talentit,
    rae: pelaajat.length ? { n: Math.round(pelaajat.length * .9), yht: pelaajat.length, riittava: pelaajat.length >= 30, pct: { Q1: 38, Q2: 28, Q3: 20, Q4: 14 }, signaali: null } : null,
    d1: joukkueet.length ? { riittava: s.d1Joukkueita * 3 >= joukkueet.length * 2, joukkueN: s.d1Joukkueita, joukkueYht: joukkueet.length } : null };
  return { nyt, spec: s, koosteet, ensin: vkSitten(s.ensinVkSitten), pelaajat, joukkueDocs, nimet, kalenteri, tapahtumat, toimenpiteet, syote };
}

/* Kodin render lib-tasolla (VP:n _renderKotiPulssi, ilman DOM:ia): palauttaa HTML */
function kotiHTML(d, o) {
  o = o || {}; const t = o.t || ((x) => x), esc = (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const viim = d.koosteet[d.koosteet.length - 1] || {};
  const m = PU.tmPulssiRivit(d.koosteet, { nytMs: d.nyt, ensimmainenVk: d.ensin, katselmusPv: {}, jaksoVk: {}, kuittaukset: [] });
  const ko = { t, esc }, kal = d.kalenteri.map((e) => ({ nimi: e.nimi, alkaa: e.alkaa }));
  const ov = Object.assign({ suostumus: { n: d.pelaajat.length, annettu: d.pelaajat.filter((p) => p.suostumusTila === 'annettu').length }, suostumusKooste: viim.yhteensa ? viim.yhteensa.n_suostumus : null, seuraavaKatselmus: null, pika: null, fn: { kuittaa: 'k', joukkue: 'j', aloitaJakso: 'a', sulje: 's', perheet: 'p', valmentaja: 'v', paivita: 'u', tilanne: 'ti', muistuta: 'mu' } }, ko);
  return PU.tmPulssiHTML(m, ov) + PU.tmPulssiTulossaHTML(kal, d.nyt, Object.assign({ tanaan: true }, ko)) + PU.tmPulssiTulossaHTML(kal, d.nyt, ko);
}
function tilanneHTML(d, o) { o = o || {}; return TT.tmTilanneHTML(TT.tmTilanneMalli(d.syote), { t: o.t || ((x) => x), fn: {} }); }

module.exports = { TILAT, lataa, kotiHTML, tilanneHTML, tunnisteLista, lyhyt };
