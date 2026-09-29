/* ════════════════════════════════════════════════════════════════════════
   pelaajakirjautuminen.js — Vaihe 0 / PR 1 (CODE_BRIEF_PELAAJAN_TUNNISTUS v2)

   Pelaaja kirjautuu PALVELIMEN kautta: { liittoTunnus, pin } → custom token.
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
function normalisoiPin(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return /^[0-9]{4,8}$/.test(s) ? s : null;
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
function pelaajaClaims(seuraId, pelaajaId) {
  return { rooli: 'pelaaja', pelaajaSeuraId: seuraId, pelaajaId: pelaajaId };
}

/* ── KÄSITTELIJÄ (Admin SDK injektoidaan → testattavissa ilman emulaattoria) ──
   deps = { db, auth, FieldValue, HttpsError, audit(tapahtuma, tiedot), nyt() } */
function luoKasittelija(deps) {
  const { db, auth, HttpsError } = deps;
  const nytF = deps.nyt || (() => Date.now());
  const audit = deps.audit || (async () => {});

  async function haeEhdokkaat(tunnus) {
    const kentat = ['tunniste', 'palloID', 'palloId'];
    const tulos = new Map();
    for (const k of kentat) {
      const snap = await db.collectionGroup('pelaajat').where(k, '==', tunnus).limit(10).get();
      snap.docs.forEach((d) => {
        // Vain seurojen pelaajat (seurat/{sid}/pelaajat/{pid}); Solo-`pelaajat` ohitetaan.
        const seura = d.ref.parent.parent;
        if (!seura || seura.parent.id !== 'seurat') return;
        tulos.set(seura.id + '/' + d.id, { seuraId: seura.id, pelaajaId: d.id, data: d.data() || {} });
      });
    }
    return Array.from(tulos.values());
  }

  async function pinOikein(ehdokas, pin) {
    const pinRef = db.collection('_pelaajaPin').doc(ehdokas.seuraId + '_' + ehdokas.pelaajaId);
    const pinSnap = await pinRef.get();
    if (pinSnap.exists && pinSnap.data() && pinSnap.data().hash) {
      return { ok: tarkistaPin(pin, pinSnap.data().hash), pinRef, siirretty: false, scrypt: true };
    }
    const vanha = ehdokas.data.pin;
    if (vanha == null || String(vanha).trim() === '') return { ok: false, pinRef, siirretty: false };
    return { ok: vakioaikainenSama(String(vanha).trim(), pin), pinRef, siirretty: true };
  }

  return async function pelaajaKirjaudu(data, context) {
    const nyt = nytF();
    const tunnus = normalisoiTunnus(data && (data.liittoTunnus != null ? data.liittoTunnus : data.tunnus));
    const pin = normalisoiPin(data && data.pin);
    if (!tunnus || !pin) throw new HttpsError('invalid-argument', VIRHE_TUNNISTUS);

    const ip = String((context && context.rawRequest && context.rawRequest.ip) || 'tuntematon');
    const ipRef = db.collection('_kirjautumisyritykset').doc('ip_' + laskuriAvain(ip));
    const tRef = db.collection('_kirjautumisyritykset').doc('t_' + laskuriAvain(tunnus));

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
    if (varaus.t.lukittuKerran) await audit('pelaaja_kirjautuminen_lukittu', { avain: laskuriAvain(tunnus), severity: 'alert' });

    // 2) PIN-tarkistus vasta varauksen jälkeen.
    const ehdokkaat = await haeEhdokkaat(tunnus);
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
      if (osumat.length > 1) await audit('pelaaja_kirjautuminen_moniselitteinen', { avain: laskuriAvain(tunnus), severity: 'alert' });
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
    if (deps.FieldValue) await ipRef.set({ virheet: deps.FieldValue.increment(-1) }, { merge: true }).catch(() => {});
    const token = await auth.createCustomToken(pelaajaUid(o.seuraId, o.pelaajaId), pelaajaClaims(o.seuraId, o.pelaajaId));
    await audit('pelaaja_kirjautuminen', { seuraId: o.seuraId, pelaajaId: o.pelaajaId, severity: 'info' });
    return { token: token, seuraId: o.seuraId, pelaajaId: o.pelaajaId };
  };
}

module.exports = {
  normalisoiTunnus, normalisoiPin, laskuriAvain,
  onLukittu, kirjaaVirhe, ipYlittyy, kirjaaIpVirhe, varaaYritys,
  hajautaPin, tarkistaPin, pelaajaUid, pelaajaClaims, luoKasittelija,
  LUKITUS_YRITYKSET, LUKITUS_MS, IP_KATTO, VIRHE_TUNNISTUS, VIRHE_LUKITTU,
};
