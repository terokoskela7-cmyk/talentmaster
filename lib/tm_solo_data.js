/* ════════════════════════════════════════════════════════════════════════
   tm_solo_data.js — Solo Player™ P0 datakerros (SOLO_P0_TIETOMALLI_SPEC.md).
   Firestore = totuus, localStorage = offline-cache. Vanhempi omistaa (parent_uid).
   ERILLINEN klubin seurat/-puusta. Dual-export: module.exports (Vitest) || window.TM_SOLO.
   Selain antaa db = firebase.firestore(), fb = firebase (FieldValue/serverTimestamp).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // PlayerCode-aakkosto: A–Z + 2–9, POIS sekoittuvat 0/O · 1/I/L (spec §8). 31 merkkiä.
  var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var CODE_RE = /^TMP-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

  // PURE — generoi PlayerCode. rnd injektoitavissa (testit); oletus Math.random.
  function tmGeneroiPlayerCode(rnd) {
    rnd = rnd || Math.random;
    var s = '';
    for (var i = 0; i < 6; i++) s += ALPHABET.charAt(Math.floor(rnd() * ALPHABET.length));
    return 'TMP-' + s;
  }
  function tmPlayerCodeKelpaa(code) { return typeof code === 'string' && CODE_RE.test(code); }

  // Varaa uniikki PlayerCode playerCodes-indeksiin (törmäys → uusi, max 5 yritystä).
  async function tmVaraaPlayerCode(db, fb, parent_uid, playerId, rnd) {
    for (var yr = 0; yr < 5; yr++) {
      var code = tmGeneroiPlayerCode(rnd);
      var ref = db.collection('playerCodes').doc(code);
      var snap = await ref.get();
      if (!snap.exists) {
        await ref.set({ playerId: playerId, parent_uid: parent_uid, luotu: fb.firestore.FieldValue.serverTimestamp() });
        return code;
      }
    }
    throw new Error('PlayerCode-varaus epäonnistui (5 törmäystä).');
  }

  // Luo vanhempi + lapsiprofiili + suostumukset + playerCode (Polku A / migraatio).
  // opts: { uid, email, parentNimi?, ehdot:{tos,privacy}, profiili:{...}, benchmark?, olemassaPlayerCode?, rnd? }
  // Suostumus EI KOSKAAN oletuksena (§7): perus pakko, benchmark opt-in.
  async function tmLuoSoloProfiili(db, fb, opts) {
    if (!opts || !opts.uid || !opts.email) throw new Error('tmLuoSoloProfiili: uid + email pakollisia.');
    if (!(opts.ehdot && opts.ehdot.tos && opts.ehdot.privacy)) throw new Error('Käyttöehdot + tietosuojaseloste pakko hyväksyä ennen tallennusta.');
    var TS = function () { return fb.firestore.FieldValue.serverTimestamp(); };
    var playerRef = db.collection('players').doc();          // auto-id (EI Auth uid)
    var playerId = playerRef.id;

    var code = (opts.olemassaPlayerCode && tmPlayerCodeKelpaa(opts.olemassaPlayerCode))
      ? opts.olemassaPlayerCode
      : await tmVaraaPlayerCode(db, fb, opts.uid, playerId, opts.rnd);
    if (opts.olemassaPlayerCode && tmPlayerCodeKelpaa(opts.olemassaPlayerCode)) {
      // migroitu vanha koodi → varmista indeksi
      await db.collection('playerCodes').doc(code).set({ playerId: playerId, parent_uid: opts.uid, luotu: TS() }, { merge: true });
    }

    var batch = db.batch();
    batch.set(db.collection('parents').doc(opts.uid), {
      email: opts.email,
      nimi: opts.parentNimi || null,
      luotu: TS(), paivitetty: TS(),
      lapset: fb.firestore.FieldValue.arrayUnion(playerId),
      entitlement: { status: 'free', stripe_customer_id: null, current_period_end: null },
      suostumus_versio: 'v1',
      hyvaksytyt_ehdot: { tos: true, privacy: true, pvm: TS() }
    }, { merge: true });

    var pl = Object.assign({}, opts.profiili || {}, {
      playerId: playerId, parent_uid: opts.uid, playerCode: code, seuraId: null,
      kortti_taso: (opts.profiili && opts.profiili.kortti_taso) || 'starter',
      luotu: TS(), paivitetty: TS()
    });
    batch.set(playerRef, pl);

    batch.set(playerRef.collection('suostumukset').doc('perus'), {
      ok: true, tyyppi: 'perus', antaja_uid: opts.uid, antaja_email: opts.email, versio: 'v1', pvm: TS()
    });
    if (opts.benchmark === true) {
      batch.set(playerRef.collection('suostumukset').doc('benchmark'), {
        ok: true, tyyppi: 'benchmark', antaja_uid: opts.uid, antaja_email: opts.email, versio: 'v1', pvm: TS()
      });
    }
    await batch.commit();
    return { playerId: playerId, playerCode: code };
  }

  // localStorage → Firestore (kerta, idempotentti, §3). Palauttaa playerId tai null.
  // ls = localStorage; opts = { uid, email, ehdot, benchmark? } (suostumus onboardingista).
  async function tmMigroiLocalStorage(db, fb, ls, opts) {
    ls = ls || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!ls) return null;
    var jo = ls.getItem('tm_migrated');
    if (jo) return jo;                                       // idempotentti
    var profRaw = ls.getItem('tm_solo_profiili');
    var code = ls.getItem('tm_player_code');
    if (!profRaw && !code) return null;                     // ei migroitavaa
    var prof = {}; try { prof = JSON.parse(profRaw || '{}') || {}; } catch (e) { prof = {}; }
    var hist = []; try { hist = JSON.parse(ls.getItem('tm_tkk_historia') || '[]') || []; } catch (e) { hist = []; }
    var profiili = Object.assign({}, prof);
    if (hist.length) profiili.tkk_historia = hist;
    var res = await tmLuoSoloProfiili(db, fb, {
      uid: opts.uid, email: opts.email, parentNimi: opts.parentNimi || null,
      ehdot: opts.ehdot, benchmark: opts.benchmark === true,
      profiili: profiili,
      olemassaPlayerCode: (code && tmPlayerCodeKelpaa(code)) ? code : null,
      rnd: opts.rnd
    });
    ls.setItem('tm_migrated', res.playerId);                // ÄLÄ poista muuta localStoragea (offline-cache)
    return res.playerId;
  }

  // Lataa vanhemman lapset (kysely on totuus, ei lapset-denorm). where parent_uid==uid.
  async function tmHaeLapset(db, uid) {
    var snap = await db.collection('players').where('parent_uid', '==', uid).get();
    return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  }

  // Johda kortti pelaajadatasta — DETERMINISTINEN (§28-lattia, EI satunnaislukuja), §7.22 (oma matka, ei vertailua).
  // Palauttaa { ovr, tavoite, stats, statKeys, tier, ika }. nyt = vuosi (testeille); oletus kuluva vuosi.
  function tmJohdaKortti(p, nyt) {
    p = p || {};
    nyt = nyt || new Date().getFullYear();
    var ika = p.synVuosi ? (nyt - p.synVuosi) : 12;
    var ovr = Math.max(42, Math.min(62, Math.round(42 + (ika - 8) * 1.5)));
    var keys = ['Nopeus', 'Tekniikka', 'Peliäly', 'Fysiikka', 'Hallinta', 'Räjähtävyys'];
    var v = {}; keys.forEach(function (k) { v[k] = ovr; });
    var TILT = { hyokkaaja: { Nopeus: 2, 'Räjähtävyys': 1 }, keskikentta: { Tekniikka: 2, 'Peliäly': 1 }, puolustaja: { Fysiikka: 2, Hallinta: 1 }, maalivahti: { Fysiikka: 2 } };
    var t = TILT[p.pp] || {};
    Object.keys(t).forEach(function (k) { v[k] += t[k]; });
    var SKILL = { sbl: 'Nopeus', sfl: 'Räjähtävyys', dfl: 'Fysiikka', ll: 'Hallinta', diag: 'Tekniikka' };
    if (p.vahvuus && SKILL[p.vahvuus]) v[SKILL[p.vahvuus]] += 2;
    if (p.ketju && SKILL[p.ketju]) v[SKILL[p.ketju]] -= 1;
    keys.forEach(function (k) { v[k] = Math.max(40, Math.min(70, v[k])); });
    // Tavoite-OVR (v1 potentiaali): baseline + ikäpohjainen headroom (nuoremmalla enemmän kasvuvaraa). Täysi RAE/ikkuna-johto myöhemmin.
    var headroom = Math.max(8, Math.min(24, (18 - ika) * 2 + 4));
    var tavoite = Math.min(99, ovr + headroom);
    return { ovr: ovr, tavoite: tavoite, stats: v, statKeys: keys, tier: p.kortti_taso || 'starter', ika: ika };
  }

  var API = {
    tmGeneroiPlayerCode: tmGeneroiPlayerCode,
    tmJohdaKortti: tmJohdaKortti,
    tmPlayerCodeKelpaa: tmPlayerCodeKelpaa,
    tmVaraaPlayerCode: tmVaraaPlayerCode,
    tmLuoSoloProfiili: tmLuoSoloProfiili,
    tmMigroiLocalStorage: tmMigroiLocalStorage,
    tmHaeLapset: tmHaeLapset,
    ALPHABET: ALPHABET
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_SOLO = API;
})(typeof window !== 'undefined' ? window : this);
