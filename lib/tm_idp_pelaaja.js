/* ════════════════════════════════════════════════════════════════════════
   tm_idp_pelaaja.js — Pelaajan aikajana ja konseptin ymmärrys (siirretty lib/tm_idp.js:stä, K1d 20.10.2026; tm_idp.js delegoi tänne, API ennallaan).
   §7.22 EHDOTON: ei numeroita/tasoja/vertailua/deltoja/uhkaa pelaajalle. Muuntaa 3a/3b-tavoitteen + arviot[] POSITIIVISEKSI matkaesitykseksi pelaajan kielellä. Pelaaja = lukija.
   KIELLETTY ulostulossa: tasoluku, arvosana, percentiili, vertailu, negatiivinen/numerodelta, tavoitejäämä, DVI-nuoli, TKI. Vain: virstanpylväät positiivisesti + seuraava askel + prosessikehu (Dweck/SDT).
   K1d: KAIKKI pelaajalle näkyvät tekstit käännösavaimiin (FI-oletus tässä; opts.t(avain) = adapterin lib-kääntäjä, Pelaaja _p7K1T → sv libikartasta) — sv-pelaaja näkee ruotsia.
   · tmPelaajaKaari(tavoite, opts)    → { otsikko, aani, mitattava, pisteet[{luokka,otsikko,teksti,win}], seuraavaAskel{otsikko,teksti}, kehu } | null     (opts.t)
   · tmPelaajaKonsepti(tavoite, opts) → { mika, miksi, mietiKysymys } | null
   · idpAbsParannus(tavoite, arvo)    → abs-parannus lähdöstä (suunta-aware) | null
   Dual-export: module.exports || window.TM_IDP_PELAAJA.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    ip_aloitit: 'Aloitit tästä', ip_lahto_valmentaja: 'Valmentaja asetti tavoitteen.', ip_lahto_yhdessa: 'Asetitte tavoitteen yhdessä valmentajan kanssa.',
    ip_nyt: 'Nyt', ip_nyt_note: '”{note}” — hienoa kehitystä!', ip_nyt_win: 'Olet edistynyt hienosti — jatka samaan malliin!', ip_nyt_pysyt: 'Pysyt matkalla — jokainen harjoitus vie eteenpäin.',
    ip_askel: 'Otit askeleen', ip_askel_note: '”{note}” 👏', ip_askel_sujuu: '{fokus} sujuu jo paremmin kuin alussa 👏',
    ip_jatkoit: 'Jatkoit työtä', ip_jatkoit_note: '”{note}”', ip_jatkoit_pysyit: 'Pysyit matkalla — hienoa sinnikkyyttä.',
    ip_seuraava: 'Seuraava askel', ip_seuraava_teksti: 'Muista tavoitteesi joka harjoituksessa: {fokus}.', ip_kehu: 'Hienoa että jatkat työtä — jokainen yritys vie eteenpäin.',
    ip_tavoitteesi: 'tavoitteesi', ip_mika_oletus: 'Kehität tätä: {fokus}.', ip_miksi_oletus: 'Se auttaa sinua pelissä ja tekee joukkueestasi vaarallisemman.', ip_mieti: 'Milloin viimeksi onnistuit tässä pelissä?'
  };
  function _txt(o, k, m) {
    var v = (o && typeof o.t === 'function') ? o.t(k) : k; v = (v && v !== k) ? v : FI[k];
    return String(v).replace(/\{(\w+)\}/g, function (_, n) { return m && m[n] != null ? m[n] : ''; });
  }

  // Abs-parannus lähdöstä (suunta-aware). Positiivinen = pelaaja edistynyt. Palauttaa null jos ei laskettavissa.
  function idpAbsParannus(tavoite, arvo) {
    var mit = (tavoite && tavoite.mittari) || {};
    var la = tavoite && tavoite.lahto ? tavoite.lahto.arvo : null;
    if (arvo == null || la == null) return null;
    return (mit.suunta === 'pienempi') ? (la - arvo) : (arvo - la);
  }

  // Pelaajan matka-aikajana. null jos ei aktiivista tavoitetta. Kaikki tekstit positiivisia — regressiota EI näytetä.
  function tmPelaajaKaari(tavoite, opts) {
    opts = opts || {};
    if (!tavoite || !tavoite.fokus) return null;
    var status = tavoite.status || 'aktiivinen';
    if (status === 'hylatty' || status === 'vaihdettu') return null;   // hylätty/korvattu tavoite ei näy pelaajalle
    var fokusNimi = tavoite.fokus.nimi || _txt(opts, 'ip_tavoitteesi');
    var mit = tavoite.mittari || {}, yks = mit.yksikko || '';
    var mitattava = (typeof tavoite.mitattava === 'boolean') ? tavoite.mitattava : (yks !== 'taso' && yks !== 'vapaa');   // PR 1f: puhdistettu tavoite (idp_pelaaja) kantaa mitattava-lipun
    var arviot = tavoite.arviot || [], aani = (tavoite.pelaajan_tavoite || '').trim();
    var pisteet = [];
    // Lähtöpiste — aina positiivinen aloitus. K1d: ilman pelaajan omaa ääntä ei väitetä että tavoite asetettiin yhdessä.
    pisteet.push({ luokka: 'lahto', otsikko: _txt(opts, 'ip_aloitit'), teksti: _txt(opts, aani ? 'ip_lahto_yhdessa' : 'ip_lahto_valmentaja'), win: false });
    for (var i = 0; i < arviot.length; i++) {
      var a = arviot[i] || {};
      var viimeinen = (i === arviot.length - 1);
      // Positiivisuus: mitattavalle abs-parannus > 0; muuten pelaajan oma fiilis (≥3 tai ei annettu → positiivinen matka).
      var abs = mitattava ? idpAbsParannus(tavoite, a.arvo) : null;
      var win = (typeof a.win === 'boolean') ? a.win   // PR 1f: puhdistettu arvio (idp_pelaaja) kantaa valmiin win-lipun, ei lukuja
        : mitattava ? (abs != null && abs > 0) : (a.pelaajan_arvio == null || a.pelaajan_arvio >= 3);
      var note = (a.pelaajan_note || '').trim();
      var otsikko, teksti;
      if (viimeinen) {
        otsikko = _txt(opts, 'ip_nyt');
        teksti = note ? _txt(opts, 'ip_nyt_note', { note: note }) : _txt(opts, win ? 'ip_nyt_win' : 'ip_nyt_pysyt');
      } else if (win) {
        otsikko = _txt(opts, 'ip_askel');
        teksti = note ? _txt(opts, 'ip_askel_note', { note: note }) : _txt(opts, 'ip_askel_sujuu', { fokus: fokusNimi });
      } else {
        otsikko = _txt(opts, 'ip_jatkoit');
        teksti = note ? _txt(opts, 'ip_jatkoit_note', { note: note }) : _txt(opts, 'ip_jatkoit_pysyit');
      }
      pisteet.push({ luokka: viimeinen ? 'nyt' : 'review', otsikko: otsikko, teksti: teksti, win: win });
    }
    // Seuraava askel — prosessitavoite (SDT-autonomia), ei tavoitejäämää/numeroa. K1d: neutraali lause kaikille tavoitteille.
    return {
      otsikko: fokusNimi, aani: aani, mitattava: mitattava, pisteet: pisteet,
      seuraavaAskel: { otsikko: _txt(opts, 'ip_seuraava'), teksti: _txt(opts, 'ip_seuraava_teksti', { fokus: fokusNimi }) },
      kehu: _txt(opts, 'ip_kehu')
    };
  }

  // Konseptin ymmärrys (§0b jaettu ymmärrys): mikä / miksi / mieti-kysymys. Pelaajan kielellä, ei numeroita.
  function tmPelaajaKonsepti(tavoite, opts) {
    if (!tavoite || !tavoite.fokus) return null;
    var fokusNimi = tavoite.fokus.nimi || '';
    var kuvaus = (tavoite.kuvaus || '').trim();
    var pelilause = (tavoite.perustelu && tavoite.perustelu.pelilause) ? String(tavoite.perustelu.pelilause).trim() : '';
    return {
      mika: kuvaus || _txt(opts, 'ip_mika_oletus', { fokus: fokusNimi }),
      miksi: pelilause || _txt(opts, 'ip_miksi_oletus'),
      mietiKysymys: _txt(opts, 'ip_mieti')
    };
  }

  var API = { FI: FI, idpAbsParannus: idpAbsParannus, tmPelaajaKaari: tmPelaajaKaari, tmPelaajaKonsepti: tmPelaajaKonsepti };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_IDP_PELAAJA = API;
})(typeof window !== 'undefined' ? window : this);
