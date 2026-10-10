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

/* ── realistiset tekniikkamittaukset pelaajille (PR 1 / tekniikan määritelmä): EI vakioita (ei d2_taso = 2, ei saman TKI:n koko joukkueelle).
   · TKI (8–13-vuotiaat, joukkueella tki-speksi): pelaajakohtainen hajonta joukkueen keskiarvon ka ympärillä, tki_pvm = tki.pvmSitten.
   · SM-raakatulokset (H-H-testit; 14+ joukkueet joilla tki-speksi tai oma sm-speksi): sm_pallo/sm_juoksu sekunteina, johdettu normirekisteristä
     (EERIKKILA_NORMIT) testihetken iälle ja sukupuolelle; tsi_pvm + hh_pvm = testipäivä; tsi_viimeisin = pallo − juoksu.
   Kaikki deterministisiä (pelaajan indeksi), ei satunnaisuutta. */
const NORMIT = require('../../lib/tm_eerikkila_normit.js').EERIKKILA_NORMIT;
const TKI_POIKKEAMA = [-24, -14, -8, -3, 0, 4, 9, 15, 22, -18, 6, 12];
const SM_TASOPARIT = [[3, 3], [2, 3], [1, 2], [3, 4], [2, 2], [1, 1], [4, 4], [2, 4], [3, 3], [1, 3], [3, 5], [2, 3]];   // [SM-pallo, SM-juoksu]
function smAika(testi, ika, sp, taso) {
  const r = NORMIT[testi][sp === 'M' ? 'pojat' : 'tytot'][Math.min(19, Math.max(10, ika))];
  return { 5: r[0], 4: r[1], 3: r[2], 2: r[3], 1: Math.round((r[3] + 0.5) * 100) / 100 }[taso];
}
function mittaukset(p, j, i, nyt) {
  const tkiPv = j.tki && j.ika >= 8 && j.ika <= 13 ? j.tki.pvmSitten : null, smPv = j.sm ? j.sm.pvmSitten : (j.tki && j.ika > 13 ? j.tki.pvmSitten : null);
  if (tkiPv != null) { p.tki_viimeisin = Math.max(0, Math.min(99, Math.round(j.tki.ka + TKI_POIKKEAMA[i % TKI_POIKKEAMA.length]))); p.tki_pvm = iso(nyt - tkiPv * DAY); }
  if (smPv != null && j.ika >= 10) {
    const pvm = iso(nyt - smPv * DAY), ikaT = Number(pvm.slice(0, 4)) - p.syntymaVuosi, sp = p.sukupuoli, t = SM_TASOPARIT[i % SM_TASOPARIT.length];
    if (ikaT >= 10) {
      p.sm_pallo_viimeisin = smAika('sm_pallo', ikaT, sp, t[0]); p.sm_juoksu_viimeisin = smAika('sm_juoksu', ikaT, sp, t[1]);
      p.tsi_viimeisin = Math.round((p.sm_pallo_viimeisin - p.sm_juoksu_viimeisin) * 100) / 100; p.tsi_pvm = pvm; p.hh_pvm = pvm;
    }
  }
}

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
  let raeJaljella = s.raeN != null ? s.raeN : Math.round(J.reduce((a, j) => a + j.n, 0) * .9);   // syntymäkvartaalit: raeN pelaajalle (RAE-kooste kattavuusportilla)
  J.forEach((j) => { for (let i = 0; i < j.n; i++) {
    const p = { id: j.id + '_' + (i + 1), joukkueet: [j.id], joukkue: j.nimi, syntymaVuosi: vuosi - j.ika, sukupuoli: j.sp === 'T' ? 'N' : 'M', suostumusTila: i < j.suost ? 'annettu' : 'odottaa', jaksofokus: null };
    if (j.jakso) p.jaksofokus = { konsepti_avain: 'k', konsepti_nimi: j.jakso.nimi, domeeni: 'tekninen', alkoi: new Date(nyt - j.jakso.alkuVkSitten * 7 * DAY).toISOString(), kesto_vk: j.jakso.N, lahde: 'valmentaja' };
    if (raeJaljella > 0) { p.rae_kvartaali = ['Q1', 'Q1', 'Q2', 'Q3', 'Q4'][raeJaljella % 5]; raeJaljella--; }
    mittaukset(p, j, i, nyt);
    pelaajat.push(p); } });
  const joukkueDocs = J.map((j) => { const d = { id: j.id, nimi: j.nimi, ikaryhma: j.sp + j.ika, tyyppi: j.tyyppi, valmentajaprofiili: j.profiili, jaksofokus: null };
    if (j.jakso) d.jaksofokus = { osa_alueet: { tekninen_taktinen: { nimi: j.jakso.nimi } }, alku: iso(nyt - j.jakso.alkuVkSitten * 7 * DAY), kesto_vk: j.jakso.N }; return d; });
  const nimet = {}; J.forEach((j) => { nimet[j.id] = j.nimi; });
  const kalenteri = s.kalenteri.map((e) => { const o = { nimi: e.nimi || '', alkaa: nyt + e.h * HR }; if (e.tyyppi) o.tyyppi = e.tyyppi; if (e.j != null && J[e.j]) { o.joukkue = J[e.j].id; o.joukkueet = [J[e.j].id]; o.joukkue_nimi = J[e.j].nimi; } return o; });
  if (s.palaveriPv != null) kalenteri.push({ nimi: 'Jaksopalaveri', tyyppi: 'jaksopalaveri', alkaa: nyt + s.palaveriPv * DAY, poistettu: false, id: 'jp1' });
  const tapahtumat = J.length ? [{ id: 't1', tila: 'suunniteltu', nimi: 'Testijakso', pvm_alku: iso(nyt + 24 * DAY), pvm_loppu: iso(nyt + 31 * DAY) }].concat((s.testiJoukkueet || []).map((ji, i) => ({ id: 't2_' + i, tila: 'suunniteltu', nimi: 'Testipäivä', joukkue: J[ji].id, pvm_alku: iso(nyt + (25 + i) * DAY), pvm_loppu: iso(nyt + (25 + i) * DAY) }))) : [];
  const toimenpiteet = []; s.ehdotukset.forEach((e, k) => e.joukkueet.forEach((ji) => toimenpiteet.push({ id: 'e' + k + '_' + ji, signaali: e.signaali, teksti: J[ji].nimi + ' — ' + TEKSTIT[e.signaali], joukkue: J[ji].nimi, luotu: { seconds: (nyt - e.ikaPv * DAY) / 1000 } })));
  /* Tilanne-syöte (tmTilanneMalli) */
  const aktJ = J.filter((j) => j.n > 0).sort((a, b) => a.ika - b.ika || a.nimi.localeCompare(b.nimi));
  const joukkueet = aktJ.map((j) => ({ jid: j.id, nimi: j.nimi, ika: j.ika, n: j.n, voimassa: !!j.jakso, jakso: j.jakso ? { nimi: j.jakso.nimi, a0: idx - j.jakso.alkuVkSitten, a1: idx - j.jakso.alkuVkSitten + j.jakso.N - 1, N: j.jakso.N } : null, katselmusAuki: !!j.katsAuki, katselmusPv: j.katsPv }));
  const mitattu = aktJ.map((j) => ({ nimi: j.nimi, pvm: j.tki ? iso(nyt - j.tki.pvmSitten * DAY) : null, ms: j.tki ? nyt - j.tki.pvmSitten * DAY : null }));
  const poikkeamat = s.huomiot.filter((h) => J[h.joukkue] && J[h.joukkue].n > 0).map((h) => Object.assign({}, h, { joukkue: J[h.joukkue].nimi }));
  const ehdotukset = s.ehdotukset.map((e) => ({ joukkueet: e.joukkueet.map((ji) => J[ji].nimi), ids: e.joukkueet.map((ji) => 'e' + s.ehdotukset.indexOf(e) + '_' + ji), teksti: tunnisteLista(e.joukkueet.map((ji) => J[ji].nimi)) + ' — ' + TEKSTIT[e.signaali], luotu: { seconds: (nyt - e.ikaPv * DAY) / 1000 }, signaali: e.signaali }));
  const njakso = joukkueet.filter((j) => j.voimassa).length;
  const syote = { nytMs: nyt, joukkueet, seura: { njakso, joukkueita: joukkueet.length }, katselmusKausi: s.katsKausi, mitattu, kausiAlkuMs: Date.UTC(vuosi, 7, 1), testijakso: joukkueet.length ? { a0: idx + 4, a1: idx + 5, nimi: 'Testijakso' } : null,
    palaveri: s.palaveriPv != null && joukkueet.length ? { ms: nyt + s.palaveriPv * DAY, id: 'jp1' } : null, poikkeamat, ehdotukset, idpN: s.idpN, talentit: s.talentit,
    rae: pelaajat.length ? { n: s.raeN != null ? s.raeN : Math.round(pelaajat.length * .9), yht: pelaajat.length, riittava: (s.raeN != null ? s.raeN : pelaajat.length * .9) >= 30, pct: { Q1: 38, Q2: 28, Q3: 20, Q4: 14 }, signaali: null } : null,
    d1: joukkueet.length ? { riittava: s.d1Joukkueita * 3 >= joukkueet.length * 2, joukkueN: s.d1Joukkueita, joukkueYht: joukkueet.length } : null };
  const jaksoVk = {}; J.forEach((j) => { if (j.jakso && j.jakso.alkuVkSitten + 1 <= j.jakso.N) jaksoVk[j.id] = { vk: j.jakso.alkuVkSitten + 1, N: j.jakso.N }; });
  const viestit = (s.viestit || []).map((v, i) => ({ id: 'v' + i, osapuoli: 'valm' + i, nimi: lyhyt(J[v.joukkue].nimi), teksti: v.teksti, ms: nyt - v.hSitten * HR, lukematon: true, saapunut: true }));
  return { nyt, spec: s, jaksoVk, viestit, koosteet, ensin: vkSitten(s.ensinVkSitten), pelaajat, joukkueDocs, nimet, kalenteri, tapahtumat, toimenpiteet, syote };
}

/* Kodin render lib-tasolla (VP:n _renderKotiPulssi, ilman DOM:ia): vaihe lasketaan (D164) → Käynnistys tai Rytmi (lib/tm_vp_koti.js). Palauttaa main + rail -HTML:n yhtenä merkkijonona. o.kieli = valittu kieli (viikonpäivälyhenteet), o.t = käännösfunktio, o.viestit/o.auki. */
function kotiHTML(d, o) {
  o = o || {}; const t = o.t || ((x) => x), esc = (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const KO = require('../../lib/tm_vp_koti.js'), viim = d.koosteet[d.koosteet.length - 1] || {};
  const m = PU.tmPulssiRivit(d.koosteet, { nytMs: d.nyt, ensimmainenVk: d.ensin, katselmusPv: {}, jaksoVk: d.jaksoVk, kuittaukset: [] });
  const kal = d.kalenteri.map((e) => ({ nimi: e.nimi, alkaa: e.alkaa, tyyppi: e.tyyppi, joukkue: e.joukkue, joukkueet: e.joukkueet, joukkue_nimi: e.joukkue_nimi })), vaihe = KO.tmKotiVaihe(m);
  const env = { yhteensa: viim.yhteensa, koosteJ: viim.joukkueet, testit: d.tapahtumat, nimet: d.nimet, kalenteri: kal, viestit: o.viestit || d.viestit, nytMs: d.nyt, seuraNimi: o.seuraNimi || 'Demo FC' };
  const op = Object.assign({ t, esc, kieli: o.kieli, auki: o.auki, pika: [{ teksti: 'Arvioi harjoitus', fn: 'a' }, { teksti: 'Kirjaa mentorointi', fn: 'b' }, { teksti: 'Uusi tapahtuma', fn: 'c' }], fn: { aloitaJaksot: 'aj', kutsu: 'ku', testit: 'te', joukkue: 'j', viesti: 'vi', tilanne: 'ti', kalenteri: 'ka', paivita: 'pa', demo: 'de', tuo: 'tu', auki: 'au', opas: 'op', kuittaa: 'kt', valmentaja: 'va' } });
  const r = vaihe === 'kaynnistys' ? KO.tmKotiKaynnistysHTML(KO.tmKotiKaynnistysMalli(m, env), op) : KO.tmKotiRytmiHTML(KO.tmKotiRytmiMalli(m, env), op);
  return r.main + r.rail;
}
function tilanneHTML(d, o) { o = o || {}; return TT.tmTilanneHTML(TT.tmTilanneMalli(d.syote), { t: o.t || ((x) => x), kieli: o.kieli, fn: {} }); }

module.exports = { TILAT, lataa, kotiHTML, tilanneHTML, tunnisteLista, lyhyt };
