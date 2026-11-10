#!/usr/bin/env node
/* diag_hiljaiset_rajat.js — VAIN LUKU (projekti 06, VAIHE0 "Lisäys: hiljaiset rajat"). ADC: gcloud auth application-default login.
 * Tero ajaa: ! node scripts/diag_hiljaiset_rajat.js [--seura=kpv] [--projekti=talentmaster-pilot] [--pelaajat]
 *
 * MIKSI: `.limit(N)` ilman järjestystä tai ilman ilmoitusta leikkaa listan hiljaa: koodi käsittelee tulosta täydellisenä, vaikka dokumentteja on enemmän.
 * Tämä on oikeellisuusvirhe (väärä kooste / puuttuva rivi), ei suorituskykyasia.
 *
 * REKISTERI (alla) listaa KAIKKI `.limit(N)`-kohdat (N≠1) elävässä koodissa luokiteltuina. Testi tests/diag_hiljaiset_rajat.test.js vertaa rekisteriä
 * koodiin tiedostoittain: uusi limit() ilman rekisterimerkintää kaataa testin.
 *   LEIKKAA  = tulosta käytetään täydellisenä → skripti mittaa kuinka lähellä dataa on rajaa (kohta `mittaa`)
 *   UUSIMMAT = tarkoituksellinen "uusimmat N" (orderBy desc + limit) → ei hiljainen virhe, ei mitata
 *   RAJATTU  = ylärajattu rakenteesta (esim. 6 per jakso, 14 pv, 31 pv) tai haku, jossa N on varmuusmarginaali
 *   HAKU     = avainhaku (limit 10 / 5), tulos ei ole lista
 * limit(1) (olemassaolo- ja avainhaut) ei ole rekisterissä. Esim. VP:n mentoroinnin viimeisin pvm haetaan valmentajittain limit(1) (projekti 06, korjattu) → ei rekisterissä.
 *
 * TULOSTE: vain LUKUMÄÄRÄT seuroittain (ei nimiä, ei uid:eja, ei sisältöä). Ryhmittäin (valmentaja, käyttäjä) vain suurin ryhmäkoko ja montako ryhmää ylittää rajan.
 * Tila: OK < 70 % rajasta · LÄHELLÄ 70–99 % · YLITTYY ≥ 100 % (data jo leikkautuu).
 * Ei kirjoita mitään. --pelaajat lisää pelaajakohtaiset laskennat (count() per pelaaja; hitaampi). */
'use strict';

const REKISTERI = [
  // ── Palvelin ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { tiedosto: 'functions/seuran_kooste.js', n: 3, kohdat: [
    { haku: 'pelaajat/{p}/kirjaukset|viikkokatsaukset documentId-väli', raja: 'IKKUNA_PV+1 (31)', luokka: 'RAJATTU', huom: 'id = päivä, 30 pv ikkuna → enintään 30 dokumenttia' },
    { haku: 'kalenteri where pvm >= ikkunan alku (EI järjestystä)', raja: 500, luokka: 'LEIKKAA', mittaa: 'kalenteri_ikkuna', huom: 'kooste: RSVP-kattavuus; yli 500 → mielivaltaiset 500 mukana' },
    { haku: 'viestit where tyyppi == klippi_vastaus | klippi_kuittaus (EI järjestystä)', raja: 2000, luokka: 'LEIKKAA', mittaa: 'viestit_klippi', huom: 'kaksi kyselyä, kumpi omalla rajallaan' } ] },
  { tiedosto: 'functions/index.js', n: 1, kohdat: [{ haku: 'collectionGroup(pelaajat) where huoltajaEmail == email', raja: 10, luokka: 'HAKU', huom: 'huoltajan lasten haku; >10 lasta ei realistinen' }] },
  { tiedosto: 'functions/pelaajakirjautuminen.js', n: 1, kohdat: [{ haku: 'collectionGroup(pelaajat) where tunniste|palloID == tunnus', raja: 10, luokka: 'HAKU', huom: 'törmäystunnistus' }] },
  { tiedosto: 'functions/auditloki.js', n: 1, kohdat: [{ haku: 'auditloki-erä (ERA), sivutettu', raja: 'ERA', luokka: 'RAJATTU', huom: 'silmukka jatkuu kunnes tyhjä' }] },
  // ── lib ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { tiedosto: 'lib/tm_reflektio.js', n: 1, kohdat: [{ haku: 'kayttajat/{uid}/reflektiot (EI järjestystä)', raja: 100, luokka: 'LEIKKAA', mittaa: 'reflektiot_kayttaja', huom: 'yli 100 reflektiota → mielivaltaiset 100' }] },
  // ── VP ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { tiedosto: 'TalentMaster_VP_v25.html', n: 13, kohdat: [
    { haku: 'valmentajan havainnot where valmentajaUid', raja: 200, luokka: 'LEIKKAA', mittaa: 'havainnot_valmentaja', huom: 'valmentajan profiili' },
    { haku: 'valmentajan harjoitusarvioinnit where valmentajaUid', raja: 200, luokka: 'LEIKKAA', mittaa: 'harjoitusarvioinnit_valmentaja', huom: 'valmentajan profiili (rivi ~5258); EI järjestystä' },
    { haku: 'ohjelmat where laatija_uid', raja: 200, luokka: 'LEIKKAA', mittaa: 'ohjelmat_laatija', huom: 'EI järjestystä' },
    { haku: 'pelaaja/vp_muistiinpanot orderBy luotu desc', raja: 20, luokka: 'UUSIMMAT', huom: '' },
    { haku: 'pelaaja/viikkokatsaukset where jakso_alkoi', raja: 6, luokka: 'RAJATTU', huom: 'enintään yksi per viikko jaksossa' },
    { haku: 'harjoitusarvioinnit where valmentajaUid (palaute)', raja: 100, luokka: 'LEIKKAA', mittaa: 'harjoitusarvioinnit_valmentaja', huom: 'EI järjestystä' },
    { haku: 'mentoroinnit where valmentajaId orderBy aika desc (valmentajan historia, näytetään 10)', raja: 10, luokka: 'UUSIMMAT', huom: 'KORJATTU (projekti 06): suodatus palvelimella, indeksi valmentajaId + aika DESC' },
    { haku: 'kalenteri where poistettu == false (EI järjestystä)', raja: 300, luokka: 'LEIKKAA', mittaa: 'kalenteri_ei_poistettu', huom: 'yli 300 → mielivaltaiset 300' },
    { haku: 'notifikaatiot orderBy luotu desc', raja: 50, luokka: 'UUSIMMAT', huom: '' },
    { haku: 'harjoitusarvioinnit orderBy pvm desc (seuran koko)', raja: 500, luokka: 'LEIKKAA', mittaa: 'harjoitusarvioinnit', huom: 'uusimmat 500; vanhemmat puuttuvat tilastosta' },
    { haku: 'toimenpiteet where tyyppi == pulssi (EI järjestystä)', raja: 300, luokka: 'LEIKKAA', mittaa: 'toimenpiteet_pulssi', huom: 'pulssikuittaukset' },
    { haku: 'viestit where vastaanottajaUid (EI järjestystä)', raja: 100, luokka: 'LEIKKAA', mittaa: 'viestit_kayttaja', huom: 'samalla rivillä kaksi kyselyä' },
    { haku: 'viestit where lahettajaUid (EI järjestystä)', raja: 100, luokka: 'LEIKKAA', mittaa: 'viestit_kayttaja', huom: '' },
  ] },
  // ── Master ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { tiedosto: 'TalentMaster_Master_v16.html', n: 9, kohdat: [
    { haku: 'testitapahtumat orderBy luotu desc', raja: 50, luokka: 'LEIKKAA', mittaa: 'testitapahtumat', huom: 'lista näytetään täydellisenä; vanhemmat tapahtumat puuttuvat' },
    { haku: 'pelaaja/kirjaukset orderBy paivitetty desc', raja: 7, luokka: 'UUSIMMAT', huom: '' },
    { haku: 'viestit/notifikaatiot orderBy aika|luotu desc', raja: 20, luokka: 'UUSIMMAT', huom: 'vastaanottajan viimeisimmät' },
    { haku: 'pelaaja/viikkokatsaukset where jakso_alkoi', raja: 6, luokka: 'RAJATTU', huom: '' },
    { haku: 'viestit where vastaanottajaUid ja tyyppi in klippi* (onSnapshot)', raja: 600, luokka: 'LEIKKAA', mittaa: 'viestit_klippi_vastaanottaja', huom: 'EI järjestystä' },
    { haku: 'harjoitusarvioinnit where valmentajaUid', raja: 100, luokka: 'LEIKKAA', mittaa: 'harjoitusarvioinnit_valmentaja', huom: 'EI järjestystä' },
    { haku: 'kayttajat/{uid}/reflektiot', raja: 100, luokka: 'LEIKKAA', mittaa: 'reflektiot_kayttaja', huom: 'EI järjestystä' },
    { haku: 'notifikaatiot orderBy luotu desc', raja: 50, luokka: 'UUSIMMAT', huom: '' },
    { haku: 'pelaaja/kenttatarkkailut orderBy luotu desc', raja: 20, luokka: 'UUSIMMAT', huom: '' } ] },
  { tiedosto: 'TalentMaster_Kehitystyopoyta.html', n: 1, kohdat: [{ haku: 'pelaaja/viikkokatsaukset where jakso_alkoi', raja: 6, luokka: 'RAJATTU', huom: '' }] },
  { tiedosto: 'TalentMaster_Testaus_v9.html', n: 1, kohdat: [{ haku: 'testitapahtumat orderBy pvm desc', raja: 50, luokka: 'LEIKKAA', mittaa: 'testitapahtumat', huom: 'vanhemmat testitapahtumat eivät valittavissa' }] },
  // ── Pelaaja / Vanhempi ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { tiedosto: 'TalentMaster_Pelaaja_v7.html', n: 6, kohdat: [
    { haku: 'notifikaatiot orderBy luotu desc', raja: 20, luokka: 'UUSIMMAT', huom: '' },
    { haku: 'kehut orderBy luotu desc', raja: 10, luokka: 'UUSIMMAT', huom: '' },
    { haku: 'kirjaukset (EI järjestystä) → snap.size', raja: 60, luokka: 'LEIKKAA', mittaa: 'kirjaukset_pelaaja', huom: 'laskuri katkeaa 60:een; yli 60 kirjausta → luku aina 60' },
    { haku: 'kirjaukset orderBy paivitetty desc', raja: 60, luokka: 'UUSIMMAT', huom: '' },
    { haku: 'kirjaukset orderBy paivitetty desc', raja: 30, luokka: 'UUSIMMAT', huom: '' },
    { haku: 'havainnot where tila == valmis, nakyvyys == pelaaja (onSnapshot)', raja: 50, luokka: 'LEIKKAA', mittaa: 'havainnot_pelaajalle', huom: 'EI järjestystä; yli 50 → mielivaltaiset 50' } ] },
  { tiedosto: 'TalentMaster_Vanhempi_v2.html', n: 3, kohdat: [
    { haku: 'notifikaatiot orderBy luotu desc', raja: 20, luokka: 'UUSIMMAT', huom: '' },
    { haku: 'kirjaukset where luotu >= viikko sitten', raja: 14, luokka: 'RAJATTU', huom: '7 pv ikkuna' },
    { haku: 'havainnot where nakyvyys == pelaaja (EI järjestystä)', raja: 50, luokka: 'LEIKKAA', mittaa: 'havainnot_pelaajalle', huom: 'yli 50 → mielivaltaiset 50' } ] },
];

/* tila / ryhmaYhteenveto / ikkunanAlku / mittaritaulukko: yksi totuus lib/tm_valvonta.js (projekti 07 / PR 1). REKISTERI jää tähän: se kuvaa lähdekoodin .limit-kohdat, ei dataa. */
const V = require('../lib/tm_valvonta.js');
const { ryhmaYhteenveto, ikkunanAlku } = V, tila = V.tmVTila;

module.exports = { REKISTERI, tila, ryhmaYhteenveto, ikkunanAlku };

async function ajaMain() {
  const path = require('path');
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  const argv = process.argv.slice(2);
  const arg = (n, d) => { const o = argv.find((a) => a.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : d; };
  const projekti = arg('projekti', 'talentmaster-pilot'), vainSeura = arg('seura', null), pelaajat = argv.indexOf('--pelaajat') >= 0;
  admin.initializeApp({ projectId: projekti });
  const db = admin.firestore();
  const alku = ikkunanAlku(Date.now());

  console.log('# Rekisteri: kaikki .limit(N≠1) -kohdat (' + REKISTERI.reduce((a, t) => a + t.n, 0) + ' kpl, ' + REKISTERI.length + ' tiedostoa)');
  REKISTERI.forEach((t) => {
    console.log(t.tiedosto + ' (' + t.n + ')');
    t.kohdat.forEach((k) => console.log('  [' + k.luokka + '] ' + String(k.raja).padEnd(6) + k.haku + (k.huom ? ' — ' + k.huom : '')));
  });

  const luku = async (q) => (await q.count().get()).data().count;
  const ryhmittele = async (q, kentta) => { const m = {}; (await q.select(kentta).get()).docs.forEach((d) => { const v = d.get(kentta); if (v != null) m[v] = (m[v] || 0) + 1; }); return m; };
  const rivit = [];   // {seura, mittari, raja, maara|suurin, ylittaa?, lahella?}
  const lisaa = (seura, mittari, raja, maara, extra) => rivit.push(Object.assign({ seura, mittari, raja, maara, tila: tila(maara, raja) }, extra || {}));
  const lisaaRyhma = (seura, mittari, raja, kartta) => { const y = ryhmaYhteenveto(kartta, raja); rivit.push({ seura, mittari, raja, maara: y.suurin, tila: tila(y.suurin, raja), ryhmia: y.ryhmia, ylittaa: y.ylittaa, lahella: y.lahella }); };

  const seurat = (await db.collection('seurat').select().get()).docs.map((d) => d.id).filter((id) => !vainSeura || id === vainSeura);
  for (const sid of seurat) {
    const S = db.collection('seurat').doc(sid);
    for (const m of V.MITTARIT) {
      const nimi = V.mittarinNimi(m, alku);
      if (m.tyyppi === 'alikokoelma_ryhma') {
        const kayt = await S.collection(m.kokoelma).select().get(), kartta = {};
        for (const k of kayt.docs) { const n = await luku(k.ref.collection(m.alikokoelma)); if (n) kartta[k.id] = n; }
        lisaaRyhma(sid, nimi, m.raja, kartta);
        continue;
      }
      let q = S.collection(m.kokoelma);
      V.mittarinEhto(m, alku).forEach((e) => { q = q.where(e[0], e[1], e[2]); });
      if (m.tyyppi === 'maara') lisaa(sid, nimi, m.raja, await luku(q)); else lisaaRyhma(sid, nimi, m.raja, await ryhmittele(q, m.ryhmaKentta));
    }
    if (pelaajat) {
      const ps = await S.collection('pelaajat').select().get(), kartat = V.PELAAJAMITTARIT.map(() => ({}));
      for (const p of ps.docs) {
        for (let i = 0; i < V.PELAAJAMITTARIT.length; i++) {
          let q = p.ref.collection(V.PELAAJAMITTARIT[i].alikokoelma);
          V.mittarinEhto(V.PELAAJAMITTARIT[i], alku).forEach((e) => { q = q.where(e[0], e[1], e[2]); });
          kartat[i][p.id] = await luku(q);
        }
      }
      V.PELAAJAMITTARIT.forEach((m, i) => lisaaRyhma(sid, m.nimi, m.raja, kartat[i]));
    }
  }

  console.log('\n# Mittaus (projekti ' + projekti + ', ' + seurat.length + ' seuraa) — vain lukumäärät');
  const merkki = { YLITTYY: '‼ YLITTYY', 'LÄHELLÄ': '! LÄHELLÄ', OK: 'OK' };
  seurat.forEach((sid) => {
    console.log(sid);
    rivit.filter((r) => r.seura === sid).forEach((r) => {
      const ryhma = r.ryhmia != null ? ' (suurin ryhmä; ryhmiä ' + r.ryhmia + ', rajan ylittäviä ' + r.ylittaa + ', lähellä ' + r.lahella + ')' : '';
      console.log('  ' + (merkki[r.tila] || '').padEnd(10) + ' ' + String(r.maara).padStart(6) + ' / ' + String(r.raja).padEnd(5) + ' ' + r.mittari + ryhma);
    });
  });
  const yli = rivit.filter((r) => r.tila === 'YLITTYY'), lahella = rivit.filter((r) => r.tila === 'LÄHELLÄ');
  console.log('\nYHTEENVETO: YLITTYY ' + yli.length + ' · LÄHELLÄ ' + lahella.length + ' · OK ' + (rivit.length - yli.length - lahella.length) + ' (mittaria ' + rivit.length + ')');
  if (yli.length) { console.log('Raja ylittyy → data leikkautuu jo nyt:'); yli.forEach((r) => console.log('  ' + r.seura + ': ' + r.mittari + ' = ' + r.maara + ' / ' + r.raja)); }
  if (!pelaajat) console.log('Pelaajakohtaiset (kirjaukset 60, havainnot 50) jätetty pois; lisää --pelaajat.');
}

if (require.main === module) ajaMain().catch((e) => { console.error('Virhe:', e && e.message); process.exit(2); });
