'use strict';
/**
 * VALMENNUSAPURI — pilotin Cloud Function (Vaihe 2)
 * ==================================================
 * Valmentaja kysyy → funktio lisää ohjeistuksen + tietopohjan (VALMENNUSOPAS) → Claude → vastaus.
 *
 * MIKSI OMA FUNKTIO EIKÄ aiProxy:
 *   aiProxy ottaa tehtävän ja datan selaimesta. Valmennusapurin system prompt (ohjeistus + koko
 *   tietopohja) EI SAA koskaan kulkea selaimen kautta: opasta ei luovuteta valmentajille. Siksi
 *   funktio lataa ohjeistuksen ja tietopohjan itse, palvelinpuolella.
 *
 * MISTÄ TIETOPOHJA TULEE:
 *   Cloud Storage, polku `valmennusapuri/` (oletus-bucket). EI git-repoon: repo on GitHubissa.
 *   Storage-säännöt estävät kaiken client-luvun (storage.rules: default deny) → vain tämä funktio
 *   (Admin SDK) lukee tiedostot.
 *     valmennusapuri/OHJEISTUS_v0.7.md          ← uusin versio valitaan automaattisesti
 *     valmennusapuri/tietopohja/00_jarjestelma.md … 50_arviointi_ja_kehityskeskustelu.md
 *
 * MALLI: oletuksena Claude Vertex AI:n EU-alueen kautta (data pysyy EU:ssa). Kehityksessä voi
 *   käyttää suoraa Anthropic API:a: VALMENNUSAPURI_PROVIDER=anthropic (ANTHROPIC_API_KEY-secret).
 *
 * PÄÄSY: super admin aina (CLAUDE.md §3) + pilottilista `valmennusapuri_pilotti/{uid}`
 *   ({ aktiivinen: true, seuraId, nimi }). Muut → permission-denied.
 *
 * LOKI: jokainen kysymys + vastaus → `valmennusapuri_loki/{id}` (laadunseuranta, NotebookLM-
 *   pistokokeet). Ei client-pääsyä (Firestore Rules: ei match-blokkia = deny); SA lukee Consolesta.
 *
 * Tämä moduuli EI koske firebase-adminiin latausvaiheessa → index.js:n offline-testit (e2e_node22)
 * lataavat sen ilman GCP-projektia. Kaikki I/O tulee kasittelija()-tehtaan riippuvuuksina.
 */

// ── Vakiot ──────────────────────────────────────────────────────────────────
const SA_UID = 'dqUzvJA61Wb9fgj5UiK0riSA4NI2';            // CLAUDE.md §3 — ei koskaan riko
const KIELET = ['fi', 'sv', 'en'];
const MAX_VIESTEJA = 12;                                    // historiasta mukaan viimeiset N viestiä
const MAX_MERKKEJA_VIESTI = 4000;
const MAX_MERKKEJA_YHTEENSA = 24000;
const MAX_TOKENS = 4000;
const TIETOPOHJA_CACHE_MS = 10 * 60 * 1000;

// Sama koodisto kuin testiajurissa (valmennusapuri/testaus/aja_testit.mjs)
const KOODI = /\b(?:Y|J)-[HPSE]\d{1,2}[a-h]?\b|\b(?:T|LP|KK|KY|KH|LA|MV)-[HP]\d[a-h]?\b/g;

function asetukset(env) {
  const e = env || process.env;
  return {
    provider: (e.VALMENNUSAPURI_PROVIDER || 'vertex').toLowerCase(),
    malli: e.VALMENNUSAPURI_MALLI || 'claude-sonnet-5',
    alue: e.VALMENNUSAPURI_ALUE || 'eu',            // EU-monialue-endpoint (aiplatform.eu.rep.googleapis.com) — data pysyy EU:ssa. 'europe-west1' EI ole tuettu Claude Sonnet 5:lle.
    projekti: e.GCLOUD_PROJECT || e.GCP_PROJECT || 'talentmaster-pilot',
    bucket: e.VALMENNUSAPURI_BUCKET || '',                  // tyhjä = Firebasen oletus-bucket
    polku: e.VALMENNUSAPURI_POLKU || 'valmennusapuri/',
    paivaKiintio: Number(e.VALMENNUSAPURI_PAIVAKIINTIO || 40),
  };
}

// ── Virheet ─────────────────────────────────────────────────────────────────
function virhe(koodi, viesti) {
  const e = new Error(viesti);
  e.tmKoodi = koodi;
  return e;
}

// ── Puhtaat apufunktiot (testattavat) ───────────────────────────────────────

/** Validoi keskustelun. Palauttaa { viestit, kieli } tai heittää tmKoodi='invalid-argument'. */
function validoiKysely(data) {
  if (!data || !Array.isArray(data.viestit) || data.viestit.length === 0) {
    throw virhe('invalid-argument', 'viestit puuttuu');
  }
  const viestit = data.viestit.map(function (v) {
    if (!v || (v.role !== 'user' && v.role !== 'assistant') || typeof v.content !== 'string') {
      throw virhe('invalid-argument', 'virheellinen viesti');
    }
    const content = v.content.trim();
    if (!content) throw virhe('invalid-argument', 'tyhjä viesti');
    if (content.length > MAX_MERKKEJA_VIESTI) throw virhe('invalid-argument', 'viesti on liian pitkä');
    return { role: v.role, content: content };
  });
  if (viestit[viestit.length - 1].role !== 'user') {
    throw virhe('invalid-argument', 'viimeisen viestin pitää olla valmentajan');
  }
  const kieli = KIELET.indexOf(data.kieli) >= 0 ? data.kieli : 'fi';
  return { viestit: rajaaHistoria(viestit), kieli: kieli };
}

/** Pitää viimeiset MAX_VIESTEJA viestiä ja merkkikaton; ensimmäinen on aina valmentajan. */
function rajaaHistoria(viestit) {
  let v = viestit.slice(-MAX_VIESTEJA);
  while (v.length && v[0].role !== 'user') v = v.slice(1);
  let yhteensa = v.reduce(function (s, x) { return s + x.content.length; }, 0);
  while (yhteensa > MAX_MERKKEJA_YHTEENSA && v.length > 1) {
    yhteensa -= v[0].content.length;
    v = v.slice(1);
    while (v.length > 1 && v[0].role !== 'user') { yhteensa -= v[0].content.length; v = v.slice(1); }
  }
  // Rooleja ei saa olla kahta peräkkäin samaa → yhdistä
  const ulos = [];
  v.forEach(function (x) {
    if (ulos.length && ulos[ulos.length - 1].role === x.role) {
      ulos[ulos.length - 1] = { role: x.role, content: ulos[ulos.length - 1].content + '\n\n' + x.content };
    } else {
      ulos.push(x);
    }
  });
  return ulos;
}

/**
 * Varmistus: poistaa sisäiset koodit vastauksesta. Ohjeistus kieltää koodit jo, tämä on toinen
 * suojakerros. Poikkeus (ohjeistus sääntö 0): jos valmentaja käytti itse koodia, ei suodateta.
 */
function suodataKoodit(teksti, kayttajanTekstit) {
  const valmentajaKaytti = (kayttajanTekstit || []).some(function (t) {
    KOODI.lastIndex = 0;
    return KOODI.test(t);
  });
  KOODI.lastIndex = 0;
  if (valmentajaKaytti) return { teksti: teksti, poistettu: [] };
  const poistettu = teksti.match(KOODI) || [];
  if (!poistettu.length) return { teksti: teksti, poistettu: [] };
  const k = KOODI.source;
  const sulkeissa = new RegExp('\\s*\\(\\s*(?:' + k + ')(?:\\s*[,/–-]\\s*(?:' + k + '))*\\s*\\)', 'g');
  const kauttaviivalla = new RegExp('\\s*/\\s*(?:' + k + ')', 'g');
  const puhdas = teksti
    .replace(sulkeissa, '')
    .replace(kauttaviivalla, '')
    .replace(new RegExp('(?:' + k + ')\\s*[:–-]?\\s*', 'g'), '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;:!?)])/g, '$1');
  return { teksti: puhdas, poistettu: Array.from(new Set(poistettu)) };
}

/** Valitsee uusimman OHJEISTUS_vX.Y.md:n (numeerinen järjestys: v0.10 > v0.9). */
function valitseOhjeistus(nimet) {
  const versioidut = nimet.filter(function (n) { return /^OHJEISTUS_v[\d.]+\.md$/.test(n); })
    .sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
  return versioidut.length ? versioidut[versioidut.length - 1] : null;
}

/** Sama system-rakenne kuin laatutestauksessa (aja_testit.mjs) → testattu kokoonpano. */
function rakennaSystem(ohjeistus, tiedostot) {
  const tietopohja = tiedostot
    .slice()
    .sort(function (a, b) { return a.nimi.localeCompare(b.nimi); })
    .map(function (t) { return '<tiedosto nimi="' + t.nimi + '">\n' + t.sisalto + '\n</tiedosto>'; })
    .join('\n\n');
  return [
    { type: 'text', text: ohjeistus },
    { type: 'text', text: '<tietopohja>\n' + tietopohja + '\n</tietopohja>', cache_control: { type: 'ephemeral' } },
  ];
}

function ohjeVersio(ohjeistus) {
  const m = ohjeistus.match(/\(versio ([\d.]+)\)/);
  return m ? m[1] : '?';
}

/** Päiväkiintiön avain: uid + päivämäärä (Suomen aika). */
function paivanAvain(uid, nyt) {
  const pvm = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Helsinki' }).format(nyt || new Date());
  return uid + '_' + pvm;
}

/** Pääsypäätös: SA aina; muuten aktiivinen pilottidokumentti. */
function onKayttoOikeus(onSA, pilottiData) {
  if (onSA) return true;
  if (!pilottiData) return false;
  return pilottiData.aktiivinen !== false;
}

/** Mallin vastauksen tekstiosat + käyttötiedot. */
function puraVastaus(json) {
  const teksti = (json.content || [])
    .filter(function (b) { return b.type === 'text'; })
    .map(function (b) { return b.text; })
    .join('\n')
    .trim();
  const u = json.usage || {};
  return {
    teksti: teksti,
    syy: json.stop_reason || null,
    tokenit: {
      syote: u.input_tokens || 0,
      tuotos: u.output_tokens || 0,
      valimuistiLuettu: u.cache_read_input_tokens || 0,
      valimuistiKirjoitettu: u.cache_creation_input_tokens || 0,
    },
  };
}

// ── Mallikutsu (Vertex EU tai suora Anthropic) ──────────────────────────────
function vertexUrl(a) {
  // 'global' -> yhteinen globaali endpoint. 'eu'/'us' -> monialue-endpoint (data pysyy alueella,
  // mutta reititetään usean alueen kesken -> parempi saatavuus). Muu arvo (esim. 'europe-west1')
  // -> perinteinen yhden alueen endpoint (Claude Sonnet 5:lle EI tuettu, ks. VAIHE2_KAYTTOONOTTO.md).
  let host;
  if (a.alue === 'global') {
    host = 'aiplatform.googleapis.com';
  } else if (a.alue === 'eu' || a.alue === 'us') {
    host = 'aiplatform.' + a.alue + '.rep.googleapis.com';
  } else {
    host = a.alue + '-aiplatform.googleapis.com';
  }
  return 'https://' + host + '/v1/projects/' + a.projekti + '/locations/' + a.alue +
    '/publishers/anthropic/models/' + a.malli + ':rawPredict';
}

async function kutsuMallia(admin, a, system, viestit) {
  let url;
  let headers;
  let body;
  if (a.provider === 'anthropic') {
    const avain = process.env.ANTHROPIC_API_KEY;
    if (!avain) throw virhe('failed-precondition', 'ANTHROPIC_API_KEY puuttuu');
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'content-type': 'application/json', 'x-api-key': avain, 'anthropic-version': '2023-06-01' };
    body = { model: a.malli, max_tokens: MAX_TOKENS, system: system, messages: viestit };
  } else {
    const token = await admin.credential.applicationDefault().getAccessToken();
    url = vertexUrl(a);
    headers = { 'content-type': 'application/json', authorization: 'Bearer ' + token.access_token };
    body = { anthropic_version: 'vertex-2023-10-16', max_tokens: MAX_TOKENS, system: system, messages: viestit };
  }
  let viimeisin = '';
  for (let yritys = 1; yritys <= 2; yritys++) {
    const res = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });
    if (res.ok) {
      const tulos = puraVastaus(await res.json());
      if (tulos.teksti) return tulos;
      viimeisin = 'tyhjä vastaus (' + tulos.syy + ')';
    } else {
      viimeisin = 'HTTP ' + res.status + ': ' + (await res.text()).slice(0, 300);
      const uudelleen = res.status === 429 || res.status === 529 || res.status >= 500;
      if (!uudelleen) break;
    }
    if (yritys < 2) await new Promise(function (r) { setTimeout(r, 1500); });
  }
  throw virhe('unavailable', 'Mallikutsu epäonnistui: ' + viimeisin);
}

// ── Tietopohja Storagesta (välimuistissa instanssin eliniän, max 10 min) ────
let _tpCache = null;

async function haeTietopohja(admin, a) {
  if (_tpCache && Date.now() - _tpCache.aika < TIETOPOHJA_CACHE_MS) return _tpCache.arvo;
  const bucket = a.bucket ? admin.storage().bucket(a.bucket) : admin.storage().bucket();
  const [tiedostot] = await bucket.getFiles({ prefix: a.polku });
  const juuri = [];
  const tp = [];
  tiedostot.forEach(function (f) {
    const suhteellinen = f.name.slice(a.polku.length);
    if (!suhteellinen.endsWith('.md')) return;
    if (suhteellinen.indexOf('tietopohja/') === 0) tp.push(f);
    else if (suhteellinen.indexOf('/') < 0) juuri.push(f);
  });
  const ohjeNimi = valitseOhjeistus(juuri.map(function (f) { return f.name.slice(a.polku.length); }));
  if (!ohjeNimi || !tp.length) {
    throw virhe('failed-precondition', 'Tietopohja puuttuu Storagesta (' + a.polku + ')');
  }
  const ohjeTiedosto = juuri.find(function (f) { return f.name === a.polku + ohjeNimi; });
  const ohjeistus = (await ohjeTiedosto.download())[0].toString('utf8');
  const sisallot = await Promise.all(tp.map(async function (f) {
    return { nimi: f.name.slice((a.polku + 'tietopohja/').length), sisalto: (await f.download())[0].toString('utf8') };
  }));
  const arvo = { system: rakennaSystem(ohjeistus, sisallot), versio: ohjeVersio(ohjeistus), tiedostoja: sisallot.length };
  _tpCache = { aika: Date.now(), arvo: arvo };
  return arvo;
}

// ── Kiintiö (transaktio) ─────────────────────────────────────────────────────
async function kuluKiintio(db, uid, kiintio) {
  const ref = db.collection('valmennusapuri_kaytto').doc(paivanAvain(uid));
  return db.runTransaction(async function (tx) {
    const snap = await tx.get(ref);
    const kaytetty = snap.exists ? (snap.data().maara || 0) : 0;
    if (kaytetty >= kiintio) throw virhe('resource-exhausted', 'Päivän kysymyskiintiö (' + kiintio + ') on täynnä');
    tx.set(ref, { uid: uid, maara: kaytetty + 1, paivitetty: new Date().toISOString() }, { merge: true });
    return kaytetty + 1;
  });
}

async function lueKaytetty(db, uid) {
  const snap = await db.collection('valmennusapuri_kaytto').doc(paivanAvain(uid)).get();
  return snap.exists ? (snap.data().maara || 0) : 0;
}

// ── Käsittelijä (onCall) ─────────────────────────────────────────────────────
/**
 * @param {object} admin      firebase-admin
 * @param {object} functions  firebase-functions/v1 (HttpsError)
 * @param {object} [riip]     testejä varten: { haeTietopohja, kutsuMallia, env }
 */
function kasittelija(admin, functions, riip) {
  const r = riip || {};
  const _hae = r.haeTietopohja || haeTietopohja;
  const _kutsu = r.kutsuMallia || kutsuMallia;

  function httpsVirhe(e) {
    if (e instanceof functions.https.HttpsError) return e;
    const koodi = e.tmKoodi || 'internal';
    return new functions.https.HttpsError(koodi, koodi === 'internal' ? 'Sisäinen virhe' : e.message);
  }

  return async function (data, context) {
    if (!context || !context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu sisään.');
    }
    const uid = context.auth.uid;
    const a = asetukset(r.env);
    const db = admin.firestore();
    try {
      const adminSnap = await db.collection('admins').doc(uid).get();
      const onSA = uid === SA_UID || adminSnap.exists;
      const pilottiSnap = onSA ? null : await db.collection('valmennusapuri_pilotti').doc(uid).get();
      const pilotti = pilottiSnap && pilottiSnap.exists ? pilottiSnap.data() : null;
      if (!onKayttoOikeus(onSA, pilotti)) {
        throw new functions.https.HttpsError('permission-denied', 'Ei pilottioikeutta.');
      }

      const toiminto = (data && data.toiminto) || 'kysy';

      if (toiminto === 'tila') {
        return { oikeus: true, paivaKiintio: onSA ? null : a.paivaKiintio, kaytetty: onSA ? 0 : await lueKaytetty(db, uid) };
      }

      if (toiminto === 'palaute') {
        const lokiId = data && data.lokiId;
        const arvio = data && data.arvio;
        if (typeof lokiId !== 'string' || !lokiId || ['hyva', 'huono'].indexOf(arvio) < 0) {
          throw virhe('invalid-argument', 'virheellinen palaute');
        }
        const kommentti = typeof data.kommentti === 'string' ? data.kommentti.trim().slice(0, 1000) : '';
        const ref = db.collection('valmennusapuri_loki').doc(lokiId);
        const snap = await ref.get();
        if (!snap.exists || (snap.data().uid !== uid && !onSA)) {
          throw new functions.https.HttpsError('permission-denied', 'Ei oikeutta tähän vastaukseen.');
        }
        await ref.update({ palaute: { arvio: arvio, kommentti: kommentti, aika: new Date().toISOString() } });
        return { ok: true };
      }

      if (toiminto !== 'kysy') throw virhe('invalid-argument', 'tuntematon toiminto');

      const kysely = validoiKysely(data);
      if (!onSA) await kuluKiintio(db, uid, a.paivaKiintio);

      const alku = Date.now();
      const tp = await _hae(admin, a);
      const malli = await _kutsu(admin, a, tp.system, kysely.viestit);
      const kayttajan = kysely.viestit.filter(function (v) { return v.role === 'user'; }).map(function (v) { return v.content; });
      const suodatettu = suodataKoodit(malli.teksti, kayttajan);
      if (suodatettu.poistettu.length) {
        console.warn('[valmennusapuri] koodit poistettu vastauksesta:', suodatettu.poistettu.join(', '));
      }

      const loki = await db.collection('valmennusapuri_loki').add({
        uid: uid,
        seuraId: (pilotti && pilotti.seuraId) || null,
        kysymys: kayttajan[kayttajan.length - 1],
        historiaViesteja: kysely.viestit.length,
        vastaus: suodatettu.teksti,
        kieli: kysely.kieli,
        ohjeVersio: tp.versio,
        provider: a.provider,
        malli: a.malli,
        alue: a.provider === 'vertex' ? a.alue : null,
        tokenit: malli.tokenit,
        stopReason: malli.syy,
        poistetutKoodit: suodatettu.poistettu,
        kestoMs: Date.now() - alku,
        aika: new Date().toISOString(),
        palaute: null,
      });

      return { vastaus: suodatettu.teksti, lokiId: loki.id, ohjeVersio: tp.versio, katkesi: malli.syy === 'max_tokens' };
    } catch (e) {
      if (!(e instanceof functions.https.HttpsError) && !e.tmKoodi) console.error('[valmennusapuri]', e);
      throw httpsVirhe(e);
    }
  };
}

module.exports = {
  kasittelija,
  // testattavat puhtaat funktiot
  validoiKysely,
  rajaaHistoria,
  suodataKoodit,
  valitseOhjeistus,
  rakennaSystem,
  ohjeVersio,
  paivanAvain,
  onKayttoOikeus,
  puraVastaus,
  vertexUrl,
  asetukset,
  SA_UID,
};
