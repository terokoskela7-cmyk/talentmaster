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
    ip_tavoitteesi: 'tavoitteesi', ip_mika_oletus: 'Kehität tätä: {fokus}.', ip_miksi_oletus: 'Se auttaa sinua pelissä ja tekee joukkueestasi vaarallisemman.', ip_mieti: 'Milloin viimeksi onnistuit tässä pelissä?',
    // sv-aukot P7 (28.10.2026): tm_idp.js IDP_PELILAUSE / IDP_PELILAUSE_DIM / oletus — tallentuu tavoitteeseen fi-tekstinä (perustelu.pelilause); pelaajalle käännetään avaimella. Vartija: tests/sv_aukot_p7.test.js (sama teksti kuin tm_idp.js).
    ip_pl_short_passing: 'Näkyy ottelussa: uskallus avata peli eteenpäin paineessa.', ip_pl_long_passing: 'Näkyy pelissä: pelin kääntö ja tilanvaihto pitkällä syötöllä.', ip_pl_passing_variety: 'Näkyy pelissä: oikea syöttötapa tilanteeseen.',
    ip_pl_hide_pass: 'Näkyy pelissä: syötön piilottaminen puolustajalta.', ip_pl_ball_control: 'Näkyy pelissä: ensikosketus pitää pallon pelissä.', ip_pl_ball_striking: 'Näkyy pelissä: pallonkäsittely liikkeessä.',
    ip_pl_ball_protection: 'Näkyy pelissä: pallon suojaus selkä maaliin päin.', ip_pl_dribbling: 'Näkyy pelissä: pelaajan ohitus ahtaassa tilassa.', ip_pl_running_with_ball: 'Näkyy pelissä: tilan voittaminen kuljettamalla.',
    ip_pl_link_up: 'Näkyy pelissä: yhteispeli hyökkäyksen rakentelussa.', ip_pl_finishing: 'Näkyy pelissä: viimeistely maalipaikasta.', ip_pl_shooting_accuracy: 'Näkyy pelissä: laukauksen tarkkuus maalintekopaikassa.',
    ip_pl_heading: 'Näkyy pelissä: pääpeli erikoistilanteissa.', ip_pl_weaker_foot: 'Näkyy pelissä: molempijalkaisuus ratkaisuhetkellä.', ip_pl_vision: 'Näkyy pelissä: syöttöikkunan näkeminen ennen palloa.',
    ip_pl_decision_making: 'Näkyy pelissä: oikea ratkaisu oikeaan aikaan.', ip_pl_anticipation: 'Näkyy pelissä: pelin lukeminen ennakkoon.', ip_pl_positioning: 'Näkyy pelissä: oikea paikka ennen palloa.',
    ip_pl_play_under_pressure: 'Näkyy pelissä: rauhallisuus prässin alla.', ip_pl_timing: 'Näkyy pelissä: liikkeen ajoitus ratkaisuhetkellä.', ip_pl_defending_1v1: 'Näkyy pelissä: kaksinkamppailun voittaminen puolustaen.',
    ip_pl_tackling: 'Näkyy pelissä: pallon riisto oikealla hetkellä.', ip_pl_pressing: 'Näkyy pelissä: prässin ajoitus ja intensiteetti.', ip_pl_acceleration: 'Näkyy pelissä: räjähtävä lähtö kaksinkamppailuun.',
    ip_pl_speed: 'Näkyy pelissä: irtiotto ja tilan voittaminen.', ip_pl_mobility: 'Näkyy pelissä: suunnanmuutos ja tasapaino tilanteissa.', ip_pl_power: 'Näkyy pelissä: kaksinkamppailuvoima ja ilmapallot.',
    ip_pl_endurance: 'Näkyy pelissä: työteho koko ottelun ajan.', ip_pl_balance: 'Näkyy pelissä: tasapaino kontaktissa.', ip_pl_dim_D1: 'Näkyy pelissä: fyysinen kilpailukyky tilanteissa.', ip_pl_dim_D2: 'Näkyy pelissä: pallollinen ratkaisu ottelussa.',
    ip_pl_dim_D3: 'Näkyy pelissä: pää kestää ratkaisuhetkellä.', ip_pl_dim_D4: 'Näkyy pelissä: pelin lukeminen ja ratkaisut.', ip_pl_dim_D5: 'Näkyy pelissä: joukkueen tukeminen ja vuorovaikutus.',
    ip_pl_oletus: 'Tavoite näkyy pelissä — ei irrallinen testisuoritus.'
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
    var plAvain = pelilause ? Object.keys(FI).filter(function (k) { return k.indexOf('ip_pl_') === 0 && FI[k] === pelilause; })[0] : null;   // generoitu lause → avain; valmentajan oma teksti → sellaisenaan
    return {
      mika: kuvaus || _txt(opts, 'ip_mika_oletus', { fokus: fokusNimi }),
      miksi: plAvain ? _txt(opts, plAvain) : (pelilause || _txt(opts, 'ip_miksi_oletus')),
      mietiKysymys: _txt(opts, 'ip_mieti')
    };
  }

  var API = { FI: FI, idpAbsParannus: idpAbsParannus, tmPelaajaKaari: tmPelaajaKaari, tmPelaajaKonsepti: tmPelaajaKonsepti };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_IDP_PELAAJA = API;
})(typeof window !== 'undefined' ? window : this);
