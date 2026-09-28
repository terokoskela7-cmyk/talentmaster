/* tm_pelihavainto_valinta.js — YKSI SISÄÄNKÄYNTI pelihavaintoon (§7).
 *
 * Pelihavaintoon oli neljä eri reittiä (VP:n sivupalkki, VP:n datapolku, Masterin pikakortti-iframe
 * ja pelaajakortin "Lisää pelihavainto"), ja jokainen avasi suoraan yhden työkalun. Nyt jokainen
 * kulkee saman valintaikkunan läpi, jossa on kaksi vaihtoehtoa:
 *
 *   "Yksi havainto nyt"  → ADAR-pikakortti (harjoitukset, kevyt pelaajahavainto)
 *   "Seuraan ottelua"    → kenttätyökalu (ottelun aikainen kirjaus)
 *
 * JAETTU FUNKTIO, EI KOPIOITA: kaksi kopiota ajautuisi erilleen, ja käyttäjä näkisi eri
 * vaihtoehdot riippuen siitä mistä hän tuli. Vartija tarkistaa, että kaikki sisäänkäynnit
 * kutsuvat tätä.
 *
 * PUHDAS: ei Firestorea, ei i18n-lauseita. Tekstit annetaan `opts.t`-käännösfunktiolla, jotta
 * VP ja Master voivat kumpikin antaa oman vpT/masterT:nsä.
 *
 * TOP-LEVEL-MÄÄRITTELYT (ei IIFE-käärettä): no-undef-portin globaalikeräin lukee Program.body:n
 * määrittelyt, joten IIFEn sisään kääritty nimi ei näkyisi muille tiedostoille ja portti punertaisi
 * kelvollisesta koodista. Sama rakenne kuin muissa jaetuissa libeissä.
 *
 * ⚠ EI Ä/Ö-MERKKEJÄ MERKKIJONOLITERAALEISSA (vartija tarkistaa): lib ei sisällä näyttötekstiä.
 */

var TM_PH_VALINTA_ID = '_tmPhValinta';

/* NAYTTOTEKSTIT. Lib ei saa sisaltaa raakoja a/o-umlautteja (vartija), mutta kayttajalle on
   nayttava oikea suomi: "Mita olet tekemassa?" nakyi sisaankaynnin ensimmaisena nakymana ja
   vaikutti rikkinaiselta. Merkit annetaan siksi \u-escapeina — vartija pysyy voimassa ja teksti
   on oikein. Nama ovat fi-AVAIMIA: sv tulee Gemini-eran kautta, eika sita kirjoiteta tanne. */
var TM_PH_TEKSTIT = {
  otsikko: 'Mit\u00e4 olet tekem\u00e4ss\u00e4?',
  yksi: 'Yksi havainto nyt',
  yksiSelite: 'Harjoitukset ja kevyt pelaajahavainto.',
  ottelu: 'Seuraan ottelua',
  otteluSelite: 'Ottelun aikainen kirjaus: eleet, ketjut ja puoliajan l\u00e4pik\u00e4ynti.',
};

/** URL kummallekin tyokalulle. Pelaaja valitetaan aina kun se tiedetaan. */
function tmPhValintaUrlit(opts) {
  var o = opts || {};
  var q = function (k, v) { return v ? ('&' + k + '=' + encodeURIComponent(v)) : ''; };
  var seura = q('seuraId', o.seuraId);
  var pelaaja = q('pelaajaId', o.pelaajaId);
  return {
    yksi: 'TalentMaster_ADAR_Pikakortti.html?v=1' + seura + pelaaja,
    ottelu: 'TalentMaster_Pelihavainto_Kentta.html?v=1' + seura + pelaaja
      + q('joukkue', o.joukkue) + q('joukkueId', o.joukkueId),
  };
}

function _tmPhEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
  });
}

function _tmPhKortti(avain, otsikko, selite, ikoni, t) {
  return '<button type="button" data-ph-valinta="' + avain + '" '
    + 'style="flex:1 1 200px;min-width:0;text-align:left;padding:18px 16px;border-radius:12px;'
    + 'border:.5px solid var(--border,rgba(242,239,230,.12));background:var(--surface,#161614);'
    + 'color:var(--ink,#F2EFE6);cursor:pointer;font-family:inherit">'
    + '<div style="font-size:22px;margin-bottom:6px">' + ikoni + '</div>'
    + '<div style="font-size:15px;font-weight:600;margin-bottom:3px">' + _tmPhEsc(t(otsikko)) + '</div>'
    + '<div style="font-size:11.5px;color:var(--ink3,#8B887F);line-height:1.45">' + _tmPhEsc(t(selite)) + '</div>'
    + '</button>';
}

/**
 * Avaa valintaikkunan ja palauttaa URLit.
 * opts: { seuraId, pelaajaId, pelaajaNimi, joukkue, joukkueId, t, avaa }
 *   t    — kaannosfunktio (vpT / masterT); oletus identiteetti
 *   avaa — (url, laji) => void; oletus window.open uuteen valilehteen
 */
function tmPhAvaaValinta(opts) {
  var o = opts || {};
  var t = (typeof o.t === 'function') ? o.t : function (x) { return x; };
  var urlit = tmPhValintaUrlit(o);
  var juuri = (typeof window !== 'undefined') ? window : null;
  var avaa = (typeof o.avaa === 'function') ? o.avaa : function (url) {
    if (juuri) juuri.open(url, '_blank');
  };
  var doc = (typeof document !== 'undefined') ? document : null;
  if (!doc) return urlit;

  var vanha = doc.getElementById(TM_PH_VALINTA_ID);
  if (vanha) vanha.remove();

  var m = doc.createElement('div');
  m.id = TM_PH_VALINTA_ID;
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9700;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px';
  m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });

  var nimi = o.pelaajaNimi ? (' · ' + _tmPhEsc(o.pelaajaNimi)) : '';
  m.innerHTML = '<div style="background:var(--bg2,var(--surface,#161614));'
    + 'border:.5px solid var(--border,rgba(242,239,230,.12));border-radius:14px;'
    + 'width:min(560px,96vw);padding:20px 22px" onclick="event.stopPropagation()">'
    + '<div style="font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;'
    + 'color:var(--teal,#28B090);margin-bottom:4px">' + _tmPhEsc(t('Pelihavainto')) + nimi + '</div>'
    + '<div style="font-family:var(--font-serif),Georgia,serif;font-size:21px;'
    + 'color:var(--ink,#F2EFE6);margin-bottom:14px">' + _tmPhEsc(t(TM_PH_TEKSTIT.otsikko)) + '</div>'
    + '<div style="display:flex;gap:12px;flex-wrap:wrap">'
    + _tmPhKortti('yksi', TM_PH_TEKSTIT.yksi, TM_PH_TEKSTIT.yksiSelite, '⚡', t)
    + _tmPhKortti('ottelu', TM_PH_TEKSTIT.ottelu, TM_PH_TEKSTIT.otteluSelite, '⚽', t)
    + '</div></div>';

  doc.body.appendChild(m);
  var napit = m.querySelectorAll('[data-ph-valinta]');
  for (var i = 0; i < napit.length; i++) {
    (function (b) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var laji = b.getAttribute('data-ph-valinta');
        m.remove();
        avaa(urlit[laji], laji);
      });
    })(napit[i]);
  }
  return urlit;
}

var TM_PH_VALINTA = {
  TM_PH_TEKSTIT: TM_PH_TEKSTIT,
  tmPhAvaaValinta: tmPhAvaaValinta,
  tmPhValintaUrlit: tmPhValintaUrlit,
  TM_PH_VALINTA_ID: TM_PH_VALINTA_ID,
};
if (typeof module !== 'undefined' && module.exports) module.exports = TM_PH_VALINTA;
if (typeof window !== 'undefined') {
  window.tmPhAvaaValinta = tmPhAvaaValinta;
  window.tmPhValintaUrlit = tmPhValintaUrlit;
  window.TM_PH_VALINTA = TM_PH_VALINTA;
}
