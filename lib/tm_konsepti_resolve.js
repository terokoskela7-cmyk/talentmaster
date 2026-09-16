// tm_konsepti_resolve.js — KERROSMALLIN TIER 1: seurakohtainen konseptikerros.
//
//   TIER 0  KAANON       lib/tm_teknistaktiset.js       read-only, generoitu (ÄLÄ MUOKKAA)
//   TIER 1  SEURAKERROS  seurat/{sid}/konseptit/{avain} ← tämä tiedosto
//   TIER 2  YKSILÖ       _ttValinta[pid] · tt_positio_aktiivinen · idp_kausi.tavoitteet[]
//
// Linjaus: "TalentMasterin totuus ei ole ainoa." Kaanon on OLETUS, ei pakko. Seura voi korvata
// yksittäisiä kenttiä, piilottaa konseptin tai lisätä omansa — ilman että kaanon katoaa.
//
// PERIAATTEET
//  1. Shallow merge KENTTÄ KERRALLAAN: { ...kaanon, ...override }. Kenttä jota seura EI ole
//     muuttanut tulee yhä kaanonista. `kpi` KORVAUTUU kokonaan (ei alkioittaista mergeä) —
//     osittainen kpi-merge tekisi numeroinnista arvaamattoman.
//  2. Seuran teksti on VAPAATA SUOMEA Firestoressa → sillä EI ole sv-käännöstä (kuten
//     TM_TESTI_OHJEET-sidecar tai pelaajan muistiinpanot). Resolvoitu objekti kantaa siksi
//     `_seura_kentat`-listan: sv-kerroksen (VP `_ttKonsepti`) on OHITETTAVA nämä kentät, muuten
//     kaanonin ruotsi ylikirjoittaisi seuran oman tekstin. Ks. tests/konsepti_seurakerros.test.js.
//  3. EI KOSKAAN kirjoiteta libiin. Lib = kaanon; Firestore = muokattava kerros.
//  4. Kerros on seurakohtainen CACHE-avaimeltaan → A:n override ei voi vuotaa B:lle (eristys).
//
// Lib on PUHDAS: se ei tunne Firestorea. Sovellus lataa dokumentit ja syöttää ne
// tmKonseptiAsetaKerros():lla (sama kuvio kuin muilla jaetuilla libeillä → testattavissa).

var _TM_K_KERROS = {};   // seuraId → { avain: overrideDoc }
var _TM_K_LADATTU = {};  // seuraId → true

// Kirjanpitokentät EIVÄT ole sisältöä: ne eivät koskaan päädy _seura_kentat-listaan eivätkä
// ohita sv-kerrosta. (`piilotettu` on listauslogiikkaa, ei näyttötekstiä.)
var TM_K_META_KENTAT = ['paivitetty', 'muokkaaja_uid', 'lahde', 'piilotettu', 'oma', 'avain'];

function _tmKObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
function _tmKKopio(o) { var n = {}, k; for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) n[k] = o[k]; return n; }

// ── Kerroksen hallinta ────────────────────────────────────────────────────────────────────
// docs = { avain: overrideDoc } TAI [{ avain, ...kentat }]. Idempotentti.
function tmKonseptiAsetaKerros(seuraId, docs) {
  if (!seuraId) return;
  var kartta = {};
  if (Array.isArray(docs)) {
    docs.forEach(function (d) { if (d && d.avain) kartta[String(d.avain)] = d; });
  } else if (_tmKObj(docs)) {
    for (var k in docs) if (Object.prototype.hasOwnProperty.call(docs, k)) kartta[String(k)] = docs[k];
  }
  _TM_K_KERROS[seuraId] = kartta;
  _TM_K_LADATTU[seuraId] = true;
}
function tmKonseptiTyhjennaKerros(seuraId) {
  if (seuraId) { delete _TM_K_KERROS[seuraId]; delete _TM_K_LADATTU[seuraId]; }
  else { _TM_K_KERROS = {}; _TM_K_LADATTU = {}; }
}
function tmKonseptiKerrosLadattu(seuraId) { return !!_TM_K_LADATTU[seuraId]; }
function tmKonseptiKerros(seuraId) { return (seuraId && _TM_K_KERROS[seuraId]) || {}; }

// ── Kaanon (TIER 0) ───────────────────────────────────────────────────────────────────────
function _tmKKaanonLista() {
  var out = [];
  try { if (typeof TM_TT_YOUTH !== 'undefined' && TM_TT_YOUTH) out = out.concat(TM_TT_YOUTH); } catch (e) {}
  try { if (typeof TM_TT_JOUKKUE !== 'undefined' && TM_TT_JOUKKUE) out = out.concat(TM_TT_JOUKKUE); } catch (e) {}
  try {
    if (typeof TM_TT_FUNDAMENTIT !== 'undefined' && TM_TT_FUNDAMENTIT) {
      for (var pos in TM_TT_FUNDAMENTIT) out = out.concat(TM_TT_FUNDAMENTIT[pos] || []);
    }
  } catch (e) {}
  return out;
}
function tmKonseptiKaanon(avain) {
  var a = String(avain || '').toLowerCase().replace(/-/g, '_');
  if (!a) return null;
  var kaikki = _tmKKaanonLista();
  for (var i = 0; i < kaikki.length; i++) if (kaikki[i] && kaikki[i].avain === a) return kaikki[i];
  return null;
}

// ── Resoluutio ────────────────────────────────────────────────────────────────────────────
// Palauttaa KOPION (kaanon-objektia ei mutatoida — se on jaettu kaikkien kutsujien kesken).
// null = avainta ei ole kaanonissa eikä seurakerroksessa.
function tmKonseptiYhdista(kaanon, ovr) {
  if (!ovr) return kaanon ? _tmKKopio(kaanon) : null;
  var o = kaanon ? _tmKKopio(kaanon) : {};
  var seuraKentat = [];
  for (var k in ovr) {
    if (!Object.prototype.hasOwnProperty.call(ovr, k)) continue;
    if (ovr[k] === undefined) continue;
    o[k] = ovr[k];
    if (TM_K_META_KENTAT.indexOf(k) < 0) seuraKentat.push(k);
  }
  o.lahde = 'seura';
  o._seura_kentat = seuraKentat;     // sv-kerros OHITTAA nämä (seuran fi renderöityy sellaisenaan)
  if (!kaanon) o.oma = true;
  return o;
}
function tmKonseptiResolvoi(avain, seuraId) {
  var a = String(avain || '').toLowerCase().replace(/-/g, '_');
  if (!a) return null;
  var kaanon = tmKonseptiKaanon(a);
  var ovr = tmKonseptiKerros(seuraId)[a] || null;
  if (!kaanon && !ovr) return null;
  var o = tmKonseptiYhdista(kaanon, ovr);
  if (o && !o.avain) o.avain = a;
  return o;
}
// Onko konsepti seuran muokkaama (näyttöä varten: "muokattu"-merkki + kaanonin vertailu).
function tmKonseptiOnMuokattu(k) { return !!(k && k.lahde === 'seura' && k._seura_kentat && k._seura_kentat.length); }
function tmKonseptiOnPiilotettu(avain, seuraId) {
  var o = tmKonseptiKerros(seuraId)[String(avain || '').toLowerCase().replace(/-/g, '_')];
  return !!(o && o.piilotettu === true);
}
// Seuran OMAT konseptit (avain alkaa 'seura_', ei kaanonissa). Vaihe-/pelipaikkagate on kutsujan
// vastuulla kuten kaanonillakin; oma konsepti voi kantaa ika/pelimuoto/dim-kenttiä samalla tavalla.
function tmKonseptiOmat(seuraId) {
  var kartta = tmKonseptiKerros(seuraId), out = [];
  for (var a in kartta) {
    if (!Object.prototype.hasOwnProperty.call(kartta, a)) continue;
    if (a.indexOf('seura_') !== 0) continue;
    if (kartta[a] && kartta[a].piilotettu === true) continue;
    var o = tmKonseptiYhdista(null, kartta[a]);
    if (o) { o.avain = a; out.push(o); }
  }
  return out;
}
// listaa: kaanon-lista (esim. tmTtItems(p)) → resolvoitu lista. Piilotetut pois, seuran omat perään.
function tmKonseptiListaa(kaanonItems, seuraId) {
  var out = (kaanonItems || []).filter(function (it) {
    return it && it.avain && !tmKonseptiOnPiilotettu(it.avain, seuraId);
  }).map(function (it) { return tmKonseptiResolvoi(it.avain, seuraId) || it; });
  return out.concat(tmKonseptiOmat(seuraId));
}

// ── Pelipaikkakonseptit 1° + 2° (Piirrokset Vaihe 1 · B2) ─────────────────────────────────
// Kun pelaajalle on asetettu TOISSIJAINEN pelipaikka, pelipaikkafundamentit tarjotaan
// KUMMALLEKIN: ensisijainen painottuen (pp_rank 1, ensin), toissijainen tukena (pp_rank 2).
// Youth-konseptit (koodi 'Y…') eivät ole pelipaikkasidonnaisia → ei rankia.
// MOLEMMAT kulkevat saman seurakerroksen läpi (tmKonseptiListaa) — seura voi muokata tai
// piilottaa myös toissijaisen pelipaikan konsepteja.
function _tmKOnYouth(it) { return !!(it && it.koodi && String(it.koodi).charAt(0).toUpperCase() === 'Y'); }
function tmKonseptiPelipaikkalista(itemsEnsi, itemsTois, seuraId) {
  var ensi = tmKonseptiListaa(itemsEnsi || [], seuraId);
  var nahty = {}, out = [];
  ensi.forEach(function (it) {
    if (!it || !it.avain || nahty[it.avain]) return;
    nahty[it.avain] = true;
    var o = _tmKKopio(it);
    if (!_tmKOnYouth(it)) o.pp_rank = 1;
    out.push(o);
  });
  if (!itemsTois || !itemsTois.length) return out;
  tmKonseptiListaa(itemsTois, seuraId).forEach(function (it) {
    if (!it || !it.avain || nahty[it.avain]) return;   // 1° voittaa päällekkäisyydessä
    if (_tmKOnYouth(it)) return;                        // youth tuli jo 1°-listalta
    nahty[it.avain] = true;
    var o = _tmKKopio(it);
    o.pp_rank = 2;
    out.push(o);
  });
  return out;
}

// ── Vienti ────────────────────────────────────────────────────────────────────────────────
var TM_KONSEPTI_API = {
  TM_K_META_KENTAT: TM_K_META_KENTAT,
  tmKonseptiAsetaKerros: tmKonseptiAsetaKerros,
  tmKonseptiTyhjennaKerros: tmKonseptiTyhjennaKerros,
  tmKonseptiKerrosLadattu: tmKonseptiKerrosLadattu,
  tmKonseptiKerros: tmKonseptiKerros,
  tmKonseptiKaanon: tmKonseptiKaanon,
  tmKonseptiYhdista: tmKonseptiYhdista,
  tmKonseptiResolvoi: tmKonseptiResolvoi,
  tmKonseptiOnMuokattu: tmKonseptiOnMuokattu,
  tmKonseptiOnPiilotettu: tmKonseptiOnPiilotettu,
  tmKonseptiOmat: tmKonseptiOmat,
  tmKonseptiListaa: tmKonseptiListaa,
  tmKonseptiPelipaikkalista: tmKonseptiPelipaikkalista
};
if (typeof module !== 'undefined' && module.exports) module.exports = TM_KONSEPTI_API;
if (typeof window !== 'undefined') { for (var _kk in TM_KONSEPTI_API) { try { window[_kk] = TM_KONSEPTI_API[_kk]; } catch (e) {} } }
