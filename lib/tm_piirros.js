// tm_piirros.js — PIIRROKSET VAIHE 1: fasciallinjat (D1) + pelipaikkakartta (D4).
//
// Inline-SVG. EI ulkoisia origineja, EI Firebase-SDK:ta, EI kuvatiedostoja → toimii offline
// (PWA), ei kosketa App Checkiin eikä CSP:hen. Hyväksytty visuaalinen kieli:
// "Claude outputs/fascia_mockup_v2.html" (Tero hyväksynyt) — polut 1:1 siitä.
//
// ⚠ ANATOMIA on visuaalinen lähtökohta, EI lopullinen atlas. Polut tarkennetaan
//    fysiikkavastaavan kanssa (Tero koordinoi). Avaimet/koodit ovat lukittuja (§14 FLEI).
//
// BRÄNDI: EI yhtään hex-väriä tässä tiedostossa. Kaikki värit tulevat CSS-tokeneista
//   luokkien kautta (.tmp-figure/.tmp-chain/.tmp-node/.tmp-pos-*) — sama SVG palvelee
//   molempia teemoja ilman duplikaattia. Brändi-gate (tests/piirros_vaihe1.test.js) failaa
//   jos tähän tiedostoon ilmestyy hex tai kovakoodattu rgb.
//
// i18n: lib EI käännä itse. Kutsuja antaa `opts.t` (esim. vpT / masterT); ilman sitä
//   palautetaan kanoninen suomi. SVG-tekstit eivät näy render-gatelle → kattavuuden takaa
//   oma skanni: jokainen näkyvä teksti kulkee t():n läpi (todistettu merkkaavalla t:llä).

// ── Vartalo-silhuetit (hairline). viewBox 0 0 120 280. ──────────────────────────────────
var _TMP_FIG_ETU =
  '<circle class="tmp-figure" cx="60" cy="25" r="13"/>' +
  '<path class="tmp-figure" d="M60 38 L60 49"/>' +
  '<path class="tmp-figure" d="M42 56 Q60 49 78 56' +
  ' M42 56 L36 76 Q33 96 35 116 L39 120' +
  ' M78 56 L84 76 Q87 96 85 116 L81 120' +
  ' M45 56 Q60 62 75 56 L77 120 Q60 128 43 120 Z' +
  ' M50 120 L48 190 L47 240 L47 264' +
  ' M70 120 L72 190 L73 240 L73 264"/>';
var _TMP_FIG_TAKA = _TMP_FIG_ETU +
  '<path class="tmp-figure-faint" d="M60 56 L60 120 M53 120 L52 240 M67 120 L68 240"/>';

// ── Ketjut (§14 FLEI — avaimet lukittuja, EI käännetä) ──────────────────────────────────
// nimi/nakyma/lihakset = KANONINEN SUOMI = käännösavain. Kutsuja kääntää ne t():llä.
var TM_FASCIA = [
  { avain: 'sbl', koodi: 'SBL', nimi: 'Vauhtiketju', nakyma: 'taka', taka: true,
    lihakset: 'pohje · takareisi · selkä · niska',
    ketju: '<path class="tmp-chain" d="M52 264 L50 232 Q52 200 55 176 L58 130 L60 90 L60 52 Q60 24 57 26"/>' +
           '<circle class="tmp-node" cx="51" cy="248" r="2.4"/><circle class="tmp-node" cx="53" cy="204" r="2.4"/>' +
           '<circle class="tmp-node" cx="59" cy="130" r="2.4"/><circle class="tmp-node" cx="60" cy="70" r="2.4"/>' },
  { avain: 'sfl', koodi: 'SFL', nimi: 'Lähtöketju', nakyma: 'etu', taka: false,
    lihakset: 'säären etuosa · nelipäinen · vatsa · rinta',
    ketju: '<path class="tmp-chain" d="M68 262 L70 232 Q67 202 64 178 L62 148 L60 118 L60 82 L60 54"/>' +
           '<circle class="tmp-node" cx="69" cy="246" r="2.4"/><circle class="tmp-node" cx="65" cy="196" r="2.4"/>' +
           '<circle class="tmp-node" cx="61" cy="130" r="2.4"/><circle class="tmp-node" cx="60" cy="80" r="2.4"/>' },
  { avain: 'll', koodi: 'LL', nimi: 'Sivuketju', nakyma: 'sivu', taka: false,
    lihakset: 'pohjeluu · IT-jänne · vinot vatsat',
    ketju: '<path class="tmp-chain" d="M81 258 L83 214 Q82 182 82 158 L84 122 L82 84 L74 58"/>' +
           '<path class="tmp-chain tmp-chain-2" d="M39 258 L37 214 Q38 182 38 158 L36 122 L38 84 L46 58"/>' +
           '<circle class="tmp-node" cx="82" cy="230" r="2.4"/><circle class="tmp-node" cx="83" cy="150" r="2.4"/>' +
           '<circle class="tmp-node" cx="82" cy="100" r="2.4"/>' },
  { avain: 'diag', koodi: 'SPL', nimi: 'Diagonaaliketju', nakyma: 'kierto', taka: false,
    lihakset: 'hartia → vastakk. lonkka → jalkaterä',
    ketju: '<path class="tmp-chain" d="M78 58 Q66 84 60 104 Q52 130 50 160 L50 210 L52 260"/>' +
           '<path class="tmp-chain tmp-chain-3" d="M42 58 Q54 86 60 104"/>' +
           '<circle class="tmp-node" cx="78" cy="58" r="2.4"/><circle class="tmp-node" cx="60" cy="104" r="2.4"/>' +
           '<circle class="tmp-node" cx="50" cy="160" r="2.4"/>' },
  { avain: 'dfl', koodi: 'DFL', nimi: 'Hallintaketju', nakyma: 'syvä', taka: false,
    lihakset: 'sisäkaari · lähentäjät · lantionpohja · pallea',
    ketju: '<path class="tmp-chain-deep" d="M55 262 L57 210 L59 156 L60 118 L60 86 L60 50 L60 40"/>' +
           '<path class="tmp-chain" d="M59 156 L60 86"/>' +
           '<circle class="tmp-node" cx="58" cy="206" r="2.4"/><circle class="tmp-node" cx="60" cy="118" r="2.4"/>' +
           '<circle class="tmp-node-h" cx="60" cy="86" r="3"/>' }
];

function _tmpT(opts) {
  var t = opts && opts.t;
  return (typeof t === 'function') ? t : function (s) { return s; };
}
function _tmpEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function tmFasciaKetju(avain) {
  var a = String(avain || '').toLowerCase();
  for (var i = 0; i < TM_FASCIA.length; i++) if (TM_FASCIA[i].avain === a) return TM_FASCIA[i];
  return null;
}
function tmFasciaAvaimet() { return TM_FASCIA.map(function (k) { return k.avain; }); }

// tmFasciaKuva(avain, opts) → inline-SVG. '' jos tuntematon avain (graceful, ei kaadu).
// opts: { t: käännösfn, koko: 'summary'|'iso' (oletus summary), labelit: bool (oletus true) }
function tmFasciaKuva(avain, opts) {
  opts = opts || {};
  var k = tmFasciaKetju(avain);
  if (!k) return '';
  var t = _tmpT(opts);
  var nimi = _tmpEsc(t(k.nimi));
  var lihakset = _tmpEsc(t(k.lihakset));
  var nakyma = _tmpEsc(t(k.nakyma));
  var fig = k.taka ? _TMP_FIG_TAKA : _TMP_FIG_ETU;
  var luokka = 'tmp-fascia' + (opts.koko === 'iso' ? ' tmp-fascia--iso' : '');
  var svg = '<svg class="' + luokka + '" viewBox="0 0 120 280" role="img" aria-label="' + nimi + ' — ' + lihakset + '">'
          + fig + k.ketju + '</svg>';
  if (opts.labelit === false) return svg;
  // Selkokielistys V1.2: fascialyhenne (SBL/SFL/…) on Myersin ammattitermi eikä aukea
  // käyttäjälle → `koodi:false` piilottaa sen. Oletus EI-ammattilaispinnoilla on piilotettu;
  // kutsuja pyytää koodin erikseen (koodi:true) jos asiantuntijapinta sitä joskus haluaa.
  var koodiHtml = (opts.koodi === true) ? '<span class="tmp-koodi">' + _tmpEsc(k.koodi) + '</span>' : '';
  return '<figure class="tmp-kortti">' + svg
       + '<figcaption class="tmp-cap">'
       + '<span class="tmp-nimi">' + nimi + '</span>'
       + '<span class="tmp-view">' + nakyma + '</span>'
       + koodiHtml
       + '<span class="tmp-mus">' + lihakset + '</span>'
       + '</figcaption></figure>';
}

// ── Pelipaikkakartta (D4) ───────────────────────────────────────────────────────────────
// Koodit = TM_TT_PELIPAIKAT (MV/LP/T/KK/KY/LA/KH). Kentällä on kaksi paikkaa niille
// koodeille joilla on kaksi roolia (LP/T/KK/LA) — korostus osuu ENSIMMÄISEEN osumaan,
// jotta merkintä on deterministinen eikä molempia puolia korosteta yhtä aikaa.
var TM_POS_RUUDUKKO = [
  ['MV', 80, 232], ['LP', 26, 200], ['LP', 134, 200], ['T', 58, 202], ['T', 102, 202],
  ['KK', 60, 150], ['KK', 100, 150], ['KY', 80, 116], ['LA', 26, 120], ['LA', 134, 120], ['KH', 80, 64]
];
// Normalisointi: koodi tai suomalaisnimi → kanoninen koodi. null jos ei tunnisteta.
// (Sama sopimus kuin appien _ttNormPositio; lib on yksi totuus jaettavaksi.)
function tmPositioNormalisoi(v) {
  if (!v) return null;
  var s = String(v).trim();
  if (!s) return null;
  var up = s.toUpperCase();
  var PP = (typeof TM_TT_PELIPAIKAT !== 'undefined') ? TM_TT_PELIPAIKAT : null;
  if (PP && PP[up]) return up;
  if (!PP) return null;
  var low = s.toLowerCase();
  for (var k in PP) {
    var nimi = String(PP[k].nimi || '').toLowerCase();
    if (nimi && (low === nimi || nimi.indexOf(low) === 0 || low.indexOf(nimi) === 0)) return k;
  }
  return null;
}
// Validointi: toissijainen on VALINNAINEN, mutta EI saa olla sama kuin ensisijainen.
// → { ok, syy } — syy on kanoninen suomi (käännösavain), kutsuja kääntää.
function tmPositioValidoi(ensisijainen, toissijainen) {
  var e = tmPositioNormalisoi(ensisijainen), t2 = tmPositioNormalisoi(toissijainen);
  if (toissijainen && !t2) return { ok: false, syy: 'Tuntematon pelipaikka' };
  if (t2 && !e) return { ok: false, syy: 'Aseta ensisijainen pelipaikka ensin' };
  if (t2 && e && t2 === e) return { ok: false, syy: 'Toissijainen ei voi olla sama kuin ensisijainen' };
  return { ok: true, syy: null };
}
// tmPelipaikkaKartta(ensisijainen, toissijainen, opts) → inline-SVG.
function tmPelipaikkaKartta(ensisijainen, toissijainen, opts) {
  opts = opts || {};
  var t = _tmpT(opts);
  var e = tmPositioNormalisoi(ensisijainen), t2 = tmPositioNormalisoi(toissijainen);
  if (t2 && t2 === e) t2 = null;                     // validointi: 2° ei voi olla sama kuin 1°
  var kaytetty = {};                                  // koodi → jo korostettu (ensimmäinen osuma)
  var dots = TM_POS_RUUDUKKO.map(function (p) {
    var koodi = p[0], x = p[1], y = p[2], rank = 0;
    if (koodi === e && !kaytetty[koodi]) { rank = 1; kaytetty[koodi] = true; }
    else if (koodi === t2 && !kaytetty[koodi]) { rank = 2; kaytetty[koodi] = true; }
    var cls = 'tmp-pos-dot' + (rank === 1 ? ' tmp-p1' : rank === 2 ? ' tmp-p2' : '');
    // 1° = TÄYTETTY teal-piste → koodilabel tarvitsee oman luokan (teal tealin päällä katoaisi).
    // 2° = katkoviiva-ääriviiva (läpinäkyvä) → teal-label erottuu sellaisenaan.
    var lbl = 'tmp-pos-lbl' + (rank === 1 ? ' tmp-on1' : rank === 2 ? ' tmp-on' : '');
    var merkki = rank ? '<text class="tmp-pos-rank" x="' + (x + 9) + '" y="' + (y - 7) + '" text-anchor="middle">'
                        + (rank === 1 ? '1°' : '2°') + '</text>' : '';
    return '<circle class="' + cls + '" cx="' + x + '" cy="' + y + '" r="8.5"/>'
         + '<text class="' + lbl + '" x="' + x + '" y="' + (y + 3) + '" text-anchor="middle">' + _tmpEsc(koodi) + '</text>'
         + merkki;
  }).join('');
  var otsikko = _tmpEsc(t('Pelipaikkakartta'));
  return '<svg class="tmp-pitch-svg" viewBox="0 0 160 250" role="img" aria-label="' + otsikko + '">'
       + '<rect class="tmp-pitch" x="8" y="8" width="144" height="234"/>'
       + '<line class="tmp-pitch" x1="8" y1="125" x2="152" y2="125"/>'
       + '<circle class="tmp-pitch" cx="80" cy="125" r="20"/>'
       + '<rect class="tmp-pitch" x="48" y="8" width="64" height="30"/>'
       + '<rect class="tmp-pitch" x="48" y="212" width="64" height="30"/>'
       + dots + '</svg>';
}
// Selite (1° / 2°) — tekstit t():n läpi.
function tmPelipaikkaSelite(opts) {
  var t = _tmpT(opts || {});
  return '<div class="tmp-legend">'
       + '<span><i class="tmp-dot1"></i>' + _tmpEsc(t('ensisijainen')) + '</span>'
       + '<span><i class="tmp-dot2"></i>' + _tmpEsc(t('toissijainen')) + '</span></div>';
}

// ── PELAAJAPINNAN nimikartta (§7.22) ──────────────────────────────────────────────────────
// TARKOITUKSELLISESTI ERI kuin kaanon: pelaajalle ymmärrettävin muoto (Etuketju/Kiertoketju/
// Syvyysketju) vs. VP/Master-kaanon (Lähtöketju/Diagonaaliketju/Hallintaketju). ÄLÄ yhtenäistä.
// `miksi` = mitä + miksi lapsen kielellä — EI lukuja, EI vertailua, EI tasoja (§7.22).
// Yksi lähde: sekä ketjurivi että "heikoin ketju" lukevat tästä → ne eivät voi erota.
var TM_FASCIA_PELAAJA = {
  sbl:  { nimi: 'Vauhtiketju',  miksi: 'Kehon takapuoli — täältä tulee vauhti ja ponnistus.' },
  sfl:  { nimi: 'Etuketju',     miksi: 'Kehon etupuoli — täältä tulee kiihdytys ja potku.' },
  ll:   { nimi: 'Sivuketju',    miksi: 'Kehon sivut — täältä tulee tasapaino ja suunnanmuutos.' },
  diag: { nimi: 'Kiertoketju',  miksi: 'Kehon kierto — täältä tulee voima potkuun ja syöttöön.' },
  dfl:  { nimi: 'Syvyysketju',  miksi: 'Syvä keskusta — täältä tulee ryhti ja hallinta.' }
};
// tmFasciaPelaaja(avain, opts) → { avain, nimi, miksi } | null. Tekstit t():n läpi (kutsuja kääntää).
function tmFasciaPelaaja(avain, opts) {
  var a = String(avain || '').toLowerCase();
  var o = TM_FASCIA_PELAAJA[a];
  if (!o) return null;
  var t = _tmpT(opts || {});
  return { avain: a, nimi: t(o.nimi), miksi: t(o.miksi) };
}
function tmFasciaPelaajaAvaimet() { return Object.keys(TM_FASCIA_PELAAJA); }

var TM_PIIRROS_API = {
  TM_FASCIA: TM_FASCIA, TM_POS_RUUDUKKO: TM_POS_RUUDUKKO,
  tmFasciaKetju: tmFasciaKetju, tmFasciaAvaimet: tmFasciaAvaimet, tmFasciaKuva: tmFasciaKuva,
  tmPositioNormalisoi: tmPositioNormalisoi, tmPositioValidoi: tmPositioValidoi,
  tmPelipaikkaKartta: tmPelipaikkaKartta, tmPelipaikkaSelite: tmPelipaikkaSelite,
  TM_FASCIA_PELAAJA: TM_FASCIA_PELAAJA, tmFasciaPelaaja: tmFasciaPelaaja, tmFasciaPelaajaAvaimet: tmFasciaPelaajaAvaimet
};
if (typeof module !== 'undefined' && module.exports) module.exports = TM_PIIRROS_API;
if (typeof window !== 'undefined') { for (var _pk in TM_PIIRROS_API) { try { window[_pk] = TM_PIIRROS_API[_pk]; } catch (e) {} } }
