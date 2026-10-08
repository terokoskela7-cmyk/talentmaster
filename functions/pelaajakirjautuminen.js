/* ════════════════════════════════════════════════════════════════════════
   pelaajakirjautuminen.js — Vaihe 0 / PR 1 (CODE_BRIEF_PELAAJAN_TUNNISTUS v2)

   Pelaaja kirjautuu PALVELIMEN kautta: { liittoTunnus, pin } TAI linkistä { seuraId, pelaajaId, pin }
   → custom token.
   Korvaa selaimen PIN-haun (Pelaaja_v7 `_kirjauduPinilla`: anonyymi auth + where('pin','==',…)
   kovakoodatusta seuralistasta), joka vaati koko pelaajakokoelman anonyymin lukuoikeuden.

   KOLME INVARIANTTIA:
     1. Claim on `pelaajaSeuraId`, EI `seuraId` (ks. Rules v3.25 onPelaaja). seuraId-claim avaisi
        onOmaSeura()-haarat pelaajalle ja näyttäisi valmentajien havainnot.
     2. Virhe EI kerro kumpi osa oli väärin: tuntematon tunnus ja väärä PIN → sama viesti.
        Lukitus lasketaan myös olemattomalle tunnukselle (ei tunnusten luettelointia).
     3. Lukitus TUNNUSKOHTAINEN (5 väärää → 15 min), ei seurakohtainen: seurakohtainen lukitus
        antaisi arvaajan lukita koko seuran. Lisäksi IP-katto.

   PIN-hajautus: scrypt + suola kokoelmaan `_pelaajaPin/{seuraId}_{pelaajaId}` (vain Admin SDK).
   Siirtymä: jos hajautusta ei ole, verrataan vanhaan `pin`-kenttään (vakioaikainen vertailu) ja
   onnistuessa hajautus kirjoitetaan. Vanha kenttä poistetaan PR 4:ssä.

   Puhtaat osat (normalisointi, lukitus, hajautus) testataan tests/pelaajakirjautuminen.test.js.
════════════════════════════════════════════════════════════════════════ */
'use strict';
const { suostumusAnnettu, SUOSTUMUS_PUUTTUU } = require('./suostumus');
const crypto = require('crypto');

const LUKITUS_YRITYKSET = 5;
const LUKITUS_MS = 15 * 60 * 1000;
const IP_KATTO = 30;                    // väärää yritystä / IP / ikkuna
const IP_IKKUNA_MS = 15 * 60 * 1000;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };
const VIRHE_TUNNISTUS = 'Tunnus tai PIN on väärin.';
const VIRHE_LUKITTU = 'Liian monta yritystä. Yritä uudelleen 15 minuutin kuluttua.';

/* PalloID: numerot, välilyönnit ja väliviivat pois. Geneerinen `liittoTunnus` (FOGIS ym. myöhemmin):
   muut merkit säilyvät isoina kirjaimina. Tyhjä → null. */
function normalisoiTunnus(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(/[\s-]/g, '').toUpperCase();
  if (!s || s.length > 32 || !/^[0-9A-Z]+$/.test(s)) return null;
  return s;
}
/* PR 4: PIN on 4 (vanha) tai 6 (uusi) numeroa. Muut pituudet hylätään ennen hakua. */
function normalisoiPin(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return /^([0-9]{4}|[0-9]{6})$/.test(s) ? s : null;
}

/* Laskurin avain: tunnuksen hajautus (ei selkotekstinä kokoelmassa). */
function laskuriAvain(tunnus) {
  return crypto.createHash('sha256').update('tm-kirjautuminen:' + tunnus).digest('hex').slice(0, 40);
}

/* LUKITUSTILA — puhdas. tila = { virheet, lukittuAsti } | null. */
function onLukittu(tila, nyt) {
  return !!(tila && typeof tila.lukittuAsti === 'number' && tila.lukittuAsti > nyt);
}
function kirjaaVirhe(tila, nyt) {
  const vanha = (tila && !onLukittu(tila, nyt) && tila.lukittuAsti && tila.lukittuAsti <= nyt)
    ? { virheet: 0 } : (tila || { virheet: 0 });
  const virheet = (vanha.virheet || 0) + 1;
  if (virheet >= LUKITUS_YRITYKSET) return { virheet: 0, lukittuAsti: nyt + LUKITUS_MS, lukittuKerran: true };
  return { virheet, lukittuAsti: null };
}
function ipYlittyy(tila, nyt) {
  if (!tila || typeof tila.alku !== 'number' || nyt - tila.alku > IP_IKKUNA_MS) return false;
  return (tila.virheet || 0) >= IP_KATTO;
}
function kirjaaIpVirhe(tila, nyt) {
  if (!tila || typeof tila.alku !== 'number' || nyt - tila.alku > IP_IKKUNA_MS) return { alku: nyt, virheet: 1 };
  return { alku: tila.alku, virheet: (tila.virheet || 0) + 1 };
}

/* YRITYKSEN VARAUS — puhdas, ajetaan TRANSAKTIOSSA ennen PIN-tarkistusta.
   Aiemmin laskuri luettiin, PIN tarkistettiin (scrypt ~50 ms) ja laskuri kirjoitettiin vasta sitten
   ilman transaktiota: 200 rinnakkaista pyyntöä luki kaikki tilan "0 virhettä", ja lopuksi laskuriin
   jäi 1 — 5 yrityksen lukitus ei rajoittanut mitään. Nyt jokainen yritys VARATAAN atomisesti:
   laskuri kasvaa ennen tarkistusta, ja 5. varaus asettaa lukituksen seuraaville.
   → { sallittu:false } tai { sallittu:true, t, ip } (uudet tilat kirjoitettavaksi). */
function varaaYritys(tTila, ipTila, nyt) {
  if (onLukittu(tTila, nyt) || ipYlittyy(ipTila, nyt)) return { sallittu: false };
  return { sallittu: true, t: kirjaaVirhe(tTila, nyt), ip: kirjaaIpVirhe(ipTila, nyt) };
}

/* PIN-HAJAUTUS — scrypt, muoto 'scrypt$N$r$p$suola$hash' (hex). */
function hajautaPin(pin, suola) {
  const s = suola || crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(String(pin), s, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }).toString('hex');
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, s, h].join('$');
}
function vakioaikainenSama(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  if (x.length !== y.length) { crypto.timingSafeEqual(x, x); return false; }
  return crypto.timingSafeEqual(x, y);
}
function tarkistaPin(pin, hajautus) {
  const osat = String(hajautus || '').split('$');
  if (osat.length !== 6 || osat[0] !== 'scrypt') return false;
  const [, N, r, p, suola, h] = osat;
  const laskettu = crypto.scryptSync(String(pin), suola, h.length / 2, { N: +N, r: +r, p: +p }).toString('hex');
  return vakioaikainenSama(laskettu, h);
}

/* Näennäinen hajautus: ajetaan, kun yhtään scryptiä ei muuten laskettu (tuntematon tunnus tai vain
   selkoteksti-PIN), jotta vastausajasta ei voi päätellä, onko PalloID olemassa. */
const NAENNAINEN_HAJAUTUS = hajautaPin('0000', '00000000000000000000000000000000');

function pelaajaUid(seuraId, pelaajaId) { return 'pel_' + seuraId + '_' + pelaajaId; }

/* Suostumus ennen kirjautumista (1.10.2026): seuran pelaaja ei kirjaudu ilman huoltajan suostumusta.
   Tarkistus VASTA yksiselitteisen ja oikean PIN:n jälkeen → väärä PIN / tuntematon tunnus saa yhä saman
   virheen (VIRHE_TUNNISTUS), eikä suostumustila paljastu ilman oikeaa PIN:iä. */
const VIRHE_SUOSTUMUS = 'Huoltajasi ei ole vielä antanut lupaa. Pyydä vanhempaasi skannaamaan kortin QR-koodi.';

/* PR 4 · Lukitusavaimet (kokoelma _kirjautumisyritykset). Tunnistekohtaiset: PalloID-reitti 't_' + tunnus,
   linkkireitti 'tp_' + seuraId/pelaajaId. PELAAJAKOHTAINEN 'p_' + seuraId/pelaajaId on yhteinen molemmille
   reiteille → 5 väärää / 15 min per pelaaja riippumatta reitistä (ennen 5 + 5). */
function pelaajaLukitusAvain(seuraId, pelaajaId) { return 'p_' + laskuriAvain(seuraId + '/' + pelaajaId); }
function linkkiLukitusAvain(seuraId, pelaajaId) { return 'tp_' + laskuriAvain(seuraId + '/' + pelaajaId); }
function palloIdLukitusAvain(tunnus) { return 't_' + laskuriAvain(tunnus); }
function pelaajaClaims(seuraId, pelaajaId) {
  return { rooli: 'pelaaja', pelaajaSeuraId: seuraId, pelaajaId: pelaajaId };
}

/* ── YHTEINEN KIRJAUTUMISYDIN ─────────────────────────────────────────────────────────────
   Sama logiikka seuran pelaajalle (pelaajaKirjaudu) ja Solo-lapselle (soloLapsiKirjaudu):
   varaus transaktiossa ENNEN PIN-tarkistusta (tunnus + IP), näennäinen scrypt, sama virhe
   tunnukselle ja PIN:lle, moniselitteinen osuma hylätään, selkoteksti-PIN → hajautus siirtymässä.
   Malli (`malli`) kertoo vain sen, mikä eroaa:
     laskuriEtuliite   · lukitusavaimen etuliite (eri tunnusavaruudet eivät lukitse toisiaan)
     normalisoi(data)  · → tunnus tai null
     haeEhdokkaat(db, tunnus) · → [{ avain, data, pinRef, vanhaPin, uid, claims, palaute }]
     auditEtuliite     · audit-tapahtumien etuliite */
function luoKirjautuja(deps, malli) {
  const { db, auth, HttpsError } = deps;
  const nytF = deps.nyt || (() => Date.now());
  const audit = deps.audit || (async () => {});

  async function pinOikein(ehdokas, pin) {
    const pinSnap = await ehdokas.pinRef.get();
    if (pinSnap.exists && pinSnap.data() && pinSnap.data().hash) {
      return { ok: tarkistaPin(pin, pinSnap.data().hash), siirretty: false, scrypt: true };
    }
    const vanha = ehdokas.vanhaPin;
    if (vanha == null || String(vanha).trim() === '') return { ok: false, siirretty: false };
    return { ok: vakioaikainenSama(String(vanha).trim(), pin), siirretty: true };
  }

  return async function kirjaudu(data, context) {
    const nyt = nytF();
    const tunnus = malli.normalisoi(data);
    const pin = normalisoiPin(data && data.pin);
    if (!tunnus || !pin) throw new HttpsError('invalid-argument', VIRHE_TUNNISTUS);

    const ip = String((context && context.rawRequest && context.rawRequest.ip) || 'tuntematon');
    const ipRef = db.collection('_kirjautumisyritykset').doc('ip_' + laskuriAvain(ip));
    const tRef = db.collection('_kirjautumisyritykset').doc(malli.laskuriEtuliite + laskuriAvain(tunnus));

    // 1) VARAA yritys atomisesti ENNEN PIN-tarkistusta (rinnakkaiset pyynnöt eivät ohita lukitusta).
    const varaus = await db.runTransaction(async (tx) => {
      const [ipSnap, tSnap] = await Promise.all([tx.get(ipRef), tx.get(tRef)]);
      const v = varaaYritys(tSnap.exists ? tSnap.data() : null, ipSnap.exists ? ipSnap.data() : null, nyt);
      if (!v.sallittu) return v;
      tx.set(tRef, Object.assign({}, v.t, { paivitetty: nyt }));
      tx.set(ipRef, Object.assign({}, v.ip, { paivitetty: nyt }));
      return v;
    });
    if (!varaus.sallittu) throw new HttpsError('resource-exhausted', VIRHE_LUKITTU);
    if (varaus.t.lukittuKerran) await audit(malli.auditEtuliite + '_lukittu', { avain: laskuriAvain(tunnus), severity: 'alert' });

    // 2) PIN-tarkistus vasta varauksen jälkeen.
    const ehdokkaat = await malli.haeEhdokkaat(db, tunnus);

    /* 2b) PR 4 · PELAAJAKOHTAINEN varaus (yhteinen PalloID- ja linkkireitille): ehdokkaan selvittyä ja
       ENNEN PIN-tarkistusta, samalla transaktiomallilla. Lukittu → sama virhe kuin tunnuslukituksessa;
       näennäinen scrypt tasaa vastausajan. */
    const pRefs = ehdokkaat.filter((e) => e.lukitusAvain).map((e) => db.collection('_kirjautumisyritykset').doc(e.lukitusAvain));
    if (pRefs.length) {
      const pVaraus = await db.runTransaction(async (tx) => {
        const snaps = await Promise.all(pRefs.map((r) => tx.get(r)));
        if (snaps.some((sn) => onLukittu(sn.exists ? sn.data() : null, nyt))) return { sallittu: false };
        const uudet = snaps.map((sn) => kirjaaVirhe(sn.exists ? sn.data() : null, nyt));
        uudet.forEach((u, i) => tx.set(pRefs[i], Object.assign({}, u, { paivitetty: nyt })));
        return { sallittu: true, lukittuKerran: uudet.some((u) => u.lukittuKerran) };
      });
      if (!pVaraus.sallittu) {
        tarkistaPin(pin, NAENNAINEN_HAJAUTUS);
        throw new HttpsError('resource-exhausted', VIRHE_LUKITTU);
      }
      if (pVaraus.lukittuKerran) await audit(malli.auditEtuliite + '_lukittu', { avain: 'pelaaja', severity: 'alert' });
    }

    const osumat = [];
    let scryptAjettu = false;
    for (const e of ehdokkaat) {
      const t = await pinOikein(e, pin);
      if (t.scrypt) scryptAjettu = true;
      if (t.ok) osumat.push(Object.assign({}, e, t));
    }
    if (!scryptAjettu) tarkistaPin(pin, NAENNAINEN_HAJAUTUS);   // tasaa vastausajan (ks. NAENNAINEN_HAJAUTUS)

    if (osumat.length !== 1) {
      // Väärä PIN, tuntematon tunnus TAI moniselitteinen. Yritys on jo varattu (laskettu) kohdassa 1.
      if (osumat.length > 1) await audit(malli.auditEtuliite + '_moniselitteinen', { avain: laskuriAvain(tunnus), severity: 'alert' });
      throw new HttpsError('unauthenticated', VIRHE_TUNNISTUS);
    }

    const o = osumat[0];
    if (o.siirretty) {
      // Siirtymä: vanha selkoteksti-PIN oli oikein → tallennetaan hajautus (vanha kenttä jää PR 4:ään asti).
      await o.pinRef.set({ hash: hajautaPin(pin), luotu: nyt, lahde: 'siirto_kirjautumisessa' });
    }
    /* Onnistui: tunnuksen laskuri nollataan. IP-laskurista palautetaan TÄMÄN yrityksen varaus
       (IP-katto koskee epäonnistuneita — muuten saman verkon (koulu/seuran WiFi) onnistuneet
       kirjautumiset kuluttaisivat kattoa). Laskuria ei nollata. */
    await tRef.delete().catch(() => {});
    if (o.lukitusAvain) await db.collection('_kirjautumisyritykset').doc(o.lukitusAvain).delete().catch(() => {});
    if (deps.FieldValue) await ipRef.set({ virheet: deps.FieldValue.increment(-1) }, { merge: true }).catch(() => {});
    // PIN oli oikein (laskurit nollattu yllä), mutta seuran pelaajalla ei ole huoltajan suostumusta → ei tokenia.
    if (o.suostumusOk === false) {
      await audit('pelaaja_kirjautuminen_estetty_suostumus', Object.assign({ severity: 'info' }, o.auditTiedot || {}));
      throw new HttpsError('failed-precondition', VIRHE_SUOSTUMUS, { syy: SUOSTUMUS_PUUTTUU });
    }
    const token = await auth.createCustomToken(o.uid, o.claims);
    await kirjaaKirjautuminen(db, o, nyt);   // S1.1: vain onnistuneella kirjautumisella (suostumus + PIN ok), kerran päivässä
    await audit(malli.auditEtuliite, Object.assign({ severity: 'info' }, o.auditTiedot || {}));
    return Object.assign({ token: token }, o.palaute);
  };
}

/* S1.1 Käyttöaste — pelaajan kirjautumisaikaleima palvelimella: `viimeisinKirjautuminen` (sama nimi kuin henkilökunnalla, camelCase; tests/kirjautumisaikaleima.test.js) =
   Helsingin päivä 'YYYY-MM-DD' (päivätarkkuus riittää; 30 pv -mittari). Kirjoitus VAIN jos päivä vaihtui (ei joka kirjautumisella) ja VAIN seuran pelaajalle (ei Solo-lapselle).
   Best-effort: virhe ei koskaan kaada kirjautumista (kirjautuminen on jo onnistunut; mittari voi puuttua yhdeltä päivältä). Client ei saa kirjoittaa kenttää (Rules v3.54). GDPR: päivämäärä, ei sisältöä. */
const _paivaFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' });
function helsinginPaiva(ms) { return _paivaFmt.format(new Date(ms)); }
async function kirjaaKirjautuminen(db, o, nytMs) {
  try {
    const c = o && o.claims;
    if (!c || c.rooli !== 'pelaaja' || !c.pelaajaSeuraId || !c.pelaajaId) return false;
    const tanaan = helsinginPaiva(nytMs), vanha = o.viimeisinKirjautuminen;
    if (typeof vanha === 'string' && vanha.slice(0, 10) === tanaan) return false;
    await db.collection('seurat').doc(c.pelaajaSeuraId).collection('pelaajat').doc(c.pelaajaId).update({ viimeisinKirjautuminen: tanaan });
    return true;
  } catch (e) { return false; }
}

/* Pelaajadokumentin PalloID (kolme historiallista kenttänimeä, §7.13). */
function pelaajanPalloId(data) {
  const v = data && (data.palloID || data.palloId || data.tunniste);
  return v == null || String(v).trim() === '' ? null : String(v).trim();
}

/* Linkkitunniste: Firestore-dokumentin id — ei '/'-merkkiä, ei '.'/'..', ei __-alkuisia (varattu).
   Sallii ääkköset (vanhat docId:t muotoa sukunimi_etunimi, Excel_Tuonti). */
function normalisoiDocId(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.length > 128 || s.includes('/') || s === '.' || s === '..' || /^__.*__$/.test(s)) return null;
  return s;
}

/* ── SEURAN PELAAJA, LINKKIREITTI (Kirjautumisen helpotus): { seuraId, pelaajaId, pin } ──
   Pelaajan henkilökohtainen linkki (?p=&seura=) kertoo KUKA; PIN todistaa. Sama ydin, sama PIN-hajautus
   (_pelaajaPin/{sid}_{pid}), sama token ja claimit ja sama virhe kuin PalloID-reitillä. Lukitus omassa
   avaruudessaan ('tp_'), jotta reitit eivät lukitse toisiaan. Tunnus = seuraId + '/' + pelaajaId
   ('/' ei voi esiintyä docId:ssä → ei törmäyksiä). Olematon pelaaja → 0 ehdokasta (näennäinen scrypt). */
function luoLinkkiKirjautuja(deps) {
  return luoKirjautuja(deps, {
    laskuriEtuliite: 'tp_',
    auditEtuliite: 'pelaaja_kirjautuminen',
    normalisoi: (data) => {
      const sid = normalisoiDocId(data && data.seuraId);
      const pid = normalisoiDocId(data && data.pelaajaId);
      return sid && pid ? sid + '/' + pid : null;
    },
    haeEhdokkaat: async (db, tunnus) => {
      const i = tunnus.indexOf('/');
      const seuraId = tunnus.slice(0, i), pelaajaId = tunnus.slice(i + 1);
      const d = await db.collection('seurat').doc(seuraId).collection('pelaajat').doc(pelaajaId).get();
      if (!d.exists) return [];
      const data = d.data() || {};
      return [{
        pinRef: db.collection('_pelaajaPin').doc(seuraId + '_' + pelaajaId),
        vanhaPin: data.pin,
        lukitusAvain: pelaajaLukitusAvain(seuraId, pelaajaId),
        uid: pelaajaUid(seuraId, pelaajaId),
        claims: pelaajaClaims(seuraId, pelaajaId),
        auditTiedot: { seuraId: seuraId, pelaajaId: pelaajaId, reitti: 'linkki' },
        suostumusOk: suostumusAnnettu(data),
        viimeisinKirjautuminen: data.viimeisinKirjautuminen,
        palaute: { seuraId: seuraId, pelaajaId: pelaajaId, palloId: pelaajanPalloId(data) },
      }];
    },
  });
}

/* ── SEURAN PELAAJA (Vaihe 0 / PR 1): { liittoTunnus (PalloID), pin } ──
   Sama callable ottaa myös linkkimuodon { seuraId, pelaajaId, pin } (ks. luoLinkkiKirjautuja).
   Reitti valitaan syötteen muodosta; PalloID voittaa, jos molemmat annetaan. */
function luoKasittelija(deps) {
  const linkki = luoLinkkiKirjautuja(deps);
  const palloId = luoPalloIdKirjautuja(deps);
  return async function pelaajaKirjaudu(data, context) {
    const onPalloId = data && (data.liittoTunnus != null || data.tunnus != null);
    if (!onPalloId && data && data.seuraId != null && data.pelaajaId != null) return linkki(data, context);
    return palloId(data, context);
  };
}

function luoPalloIdKirjautuja(deps) {
  return luoKirjautuja(deps, {
    laskuriEtuliite: 't_',
    auditEtuliite: 'pelaaja_kirjautuminen',
    normalisoi: (data) => normalisoiTunnus(data && (data.liittoTunnus != null ? data.liittoTunnus : data.tunnus)),
    haeEhdokkaat: async (db, tunnus) => {
      const tulos = new Map();
      for (const k of ['tunniste', 'palloID', 'palloId']) {
        const snap = await db.collectionGroup('pelaajat').where(k, '==', tunnus).limit(10).get();
        snap.docs.forEach((d) => {
          // Vain seurojen pelaajat (seurat/{sid}/pelaajat/{pid}); Solo-`pelaajat` ohitetaan.
          const seura = d.ref.parent.parent;
          if (!seura || seura.parent.id !== 'seurat') return;
          const data = d.data() || {};
          tulos.set(seura.id + '/' + d.id, {
            pinRef: db.collection('_pelaajaPin').doc(seura.id + '_' + d.id),
            vanhaPin: data.pin,
            lukitusAvain: pelaajaLukitusAvain(seura.id, d.id),
            uid: pelaajaUid(seura.id, d.id),
            claims: pelaajaClaims(seura.id, d.id),
            auditTiedot: { seuraId: seura.id, pelaajaId: d.id },
            suostumusOk: suostumusAnnettu(data),
            viimeisinKirjautuminen: data.viimeisinKirjautuminen,
            palaute: { seuraId: seura.id, pelaajaId: d.id, palloId: pelaajanPalloId(data) },
          });
        });
      }
      return Array.from(tulos.values());
    },
  });
}

/* ── SOLO-LAPSI (Vaihe 0 / PR 2b): { playerCode (TMP-XXXXXX), pin } ──
   Eri tunnistemalli kuin seuran pelaajalla: ylätason `players`, tunnus playerCode, ei seuraa.
   ⚠ Claimit { rooli:'solo_lapsi', soloPlayerId } — EI seuraId/pelaajaSeuraId/pelaajaId: Solo-lapsi
   ei saa missään tilanteessa läpäistä seurapelaajan (onPelaajaItse) eikä seuran (onOmaSeura) sääntöjä. */
function normalisoiSoloKoodi(v) {
  if (v == null) return null;
  const s = String(v).trim().toUpperCase().replace(/\s/g, '');
  const m = /^TMP-?([A-Z0-9]{4,12})$/.exec(s);
  return m ? 'TMP-' + m[1] : null;
}
function soloUid(playerId) { return 'solo_' + playerId; }
function soloClaims(playerId) { return { rooli: 'solo_lapsi', soloPlayerId: playerId }; }

function luoSoloKasittelija(deps) {
  return luoKirjautuja(deps, {
    laskuriEtuliite: 'so_',
    auditEtuliite: 'solo_kirjautuminen',
    normalisoi: (data) => normalisoiSoloKoodi(data && data.playerCode),
    haeEhdokkaat: async (db, koodi) => {
      /* playerCodes/{koodi} → playerId; pelaajadokumentin playerCode:n on täsmättävä (indeksi voi
         sisältää varauksia ilman pelaajaa). Tuntematon koodi → [] (näennäinen scrypt tasaa ajan). */
      const ix = await db.collection('playerCodes').doc(koodi).get();
      const playerId = ix.exists && ix.data() ? ix.data().playerId : null;
      if (!playerId) return [];
      const p = await db.collection('players').doc(String(playerId)).get();
      if (!p.exists) return [];
      const data = p.data() || {};
      if (data.playerCode !== koodi) return [];
      return [{
        pinRef: db.collection('_soloPin').doc(String(playerId)),
        vanhaPin: data.child_pin,
        uid: soloUid(playerId),
        claims: soloClaims(playerId),
        auditTiedot: { playerId: playerId },
        palaute: { playerId: playerId, playerCode: koodi },
      }];
    },
  });
}

module.exports = {
  normalisoiTunnus, normalisoiPin, laskuriAvain,
  onLukittu, kirjaaVirhe, ipYlittyy, kirjaaIpVirhe, varaaYritys,
  hajautaPin, tarkistaPin, pelaajaUid, pelaajaClaims, luoKasittelija, normalisoiDocId, pelaajanPalloId,
  pelaajaLukitusAvain, linkkiLukitusAvain, palloIdLukitusAvain,
  luoKirjautuja, kirjaaKirjautuminen, helsinginPaiva, luoSoloKasittelija, normalisoiSoloKoodi, soloUid, soloClaims,
  LUKITUS_YRITYKSET, LUKITUS_MS, IP_KATTO, VIRHE_TUNNISTUS, VIRHE_LUKITTU, VIRHE_SUOSTUMUS,
};
