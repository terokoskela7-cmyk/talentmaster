/* ════════════════════════════════════════════════════════════════════════
   tm_sanasto.js — D248 SANASTO (Tero, lukittu 13.10.; docs/design/idp-v2/07_avoimet_paatokset.html): käyttäjälle arkikieltä. Dual-export: module.exports || window.TM_SANASTO.
   Kenttien nimet tietokannassa EIVÄT muutu — vain käyttöliittymän tekstit. YKSI paikka sanoille (ei kovakoodattuina kuoriin). Uusi sivu (kehitystyöpöytä B2b→) ottaa sanaston käyttöön heti; vanhat näkymät päivitetään sitä mukaa kuin ne uusitaan (massakorvausta ei tehdä).
   · FI                                → sanaston fi-avaimet (sn_*): Mitä harjoitellaan · Ydinasiat · Kysy pelaajalta · Peliharjoite · osaa jo / tällä viikolla / myöhemmin · Mittaukset · Jakson arviointi · Pelaajan lupaus · Kohti pelipaikkaa · Huomio · Kasvupyrähdys ennen/nyt/jälkeen · 14 harjoiteltavan asian nimeä
   · tmSanastoKonseptiNimi(avain, vanha) → D248:n nimi Y-H0…Y-P4:lle (y_h0 … y_p4); muulle vanha nimi (seuran oma / pelipaikka)
   · tmSanastoPhv(koodi)               → 'ennen' | 'nyt' | 'jälkeen' | null (PRE → ennen · PH → nyt · POST/AN → jälkeen; LAH → 'lähestyy' (ehdotus: ei D248:ssa); tuntematon → null)
   · tmSanastoKorvaa(teksti, avain)    → fi-teksti arkikielelle: avainkohtaiset korvaukset (SANAT) ensin, sitten sanamuodot (sitoumus → pelaajan lupaus, katselmus → jakson arviointi, signaali → huomio, konsepti → harjoiteltava asia, cue → kysymys)
   · tmSanastoT(t, o)                  → t-funktio uudelle sivulle: o = { kieli: () => 'fi'|…, fi: {avain→fi-teksti (kirjastojen FI-kartat)} }; fi-tilassa teksti kulkee korvauksen läpi; muilla kielillä t sellaisenaan (sv Gemini-erästä; sn_-avaimet FI-oletuksella)
   · KIELLETYT / tmSanastoKielletyt(teksti) → sanat, joita uuden sivun fi-teksteissä ei saa esiintyä: konsepti, cue, katselmus, signaali, sitoumus (+ sitoutu-). Testi ajaa tämän sivun renderöintiin.
   PURE. Ei hex-värejä.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    sn_mita_harjoitellaan: 'Mitä harjoitellaan', sn_mita_harjoittelet: 'Mitä harjoittelet', sn_ydinasiat: 'Ydinasiat', sn_kysy_pelaajalta: 'Kysy pelaajalta', sn_kysy_itseltasi: 'Kysy itseltäsi', sn_peliharjoite: 'Peliharjoite',
    sn_osaa_jo: 'osaa jo', sn_talla_viikolla: 'tällä viikolla', sn_myohemmin: 'myöhemmin', sn_osaat_jo: 'osaat jo', sn_mittaukset: 'Mittaukset', sn_jakson_arviointi: 'Jakson arviointi', sn_pelaajan_lupaus: 'Pelaajan lupaus', sn_lupaukseni: 'Lupaukseni',
    sn_kohti_pelipaikkaa: 'Kohti pelipaikkaa', sn_huomio: 'Huomio', sn_ydinasiat_tyhja: 'Ydinasiat tulevat, kun jakso alkaa.', sn_ensimmainen_jakso: 'Ensimmäinen jakso: aloita tästä', sn_kasvupyrahdys: 'Kasvupyrähdys', sn_phv_ennen: 'ennen', sn_phv_nyt: 'nyt', sn_phv_jalkeen: 'jälkeen', sn_phv_lahestyy: 'lähestyy',
    sn_y_h0: 'Katse ja havainnointi', sn_y_h1: '1. kosketus', sn_y_h2: 'Syöttäminen', sn_y_h3: 'Kuljettaminen', sn_y_h4: 'Harhauttaminen', sn_y_h5: 'Pallon suojaaminen', sn_y_h6: 'Pelattavaksi liikkuminen', sn_y_h7: 'Irtautuminen vartijasta', sn_y_h8: 'Leveys ja syvyys', sn_y_h9: 'Maalinteko',
    sn_y_p1: '1v1-puolustaminen', sn_y_p2: 'Vartiointi', sn_y_p3: 'Varmistaminen', sn_y_p4: 'Alueen puolustaminen'
  };
  /* Avainkohtaiset / kokonaisten merkkijonojen korvaukset (voittavat sanamuotokorvaukset). Avain = kirjaston avain TAI fi-teksti sellaisenaan. */
  var SANAT = {
    kt_nayto: 'sn_mittaukset', 'kt_nayttö': 'sn_mittaukset', kt_osat: 'sn_ydinasiat', kt_kysymykset: 'sn_kysy_pelaajalta', kt_katselmus: 'sn_jakson_arviointi', kt_ei_osia: 'sn_ydinasiat_tyhja', ts_ei_tietoa: 'sn_ensimmainen_jakso', kt_phv: 'sn_kasvupyrahdys',
    kt_st_itsenaisesti: 'sn_osaa_jo', kt_st_viikon_osa: 'sn_talla_viikolla', kt_st_ei_viela: 'sn_myohemmin',
    'Taito': 'sn_mita_harjoitellaan', 'Osat': 'sn_ydinasiat', 'Näyttö': 'sn_mittaukset'
  };
  var MUODOT = [   // [regex, korvaus] — isot alkukirjaimet säilytetään (alkuun osuva muoto)
    [/sitoumuksen/gi, 'pelaajan lupauksen'], [/sitoumuksia/gi, 'pelaajan lupauksia'], [/sitoumuksesta/gi, 'pelaajan lupauksesta'], [/sitoumusta/gi, 'pelaajan lupausta'], [/sitoumus/gi, 'pelaajan lupaus'],
    [/sitoutuneeksi/gi, 'luvanneeksi'], [/sitoutunut/gi, 'luvannut'], [/sitoutui/gi, 'antoi lupauksen'], [/sitoutuu/gi, 'lupaa'], [/sitoutuminen/gi, 'lupaus'],
    [/katselmuksen/gi, 'jakson arvioinnin'], [/katselmuksessa/gi, 'jakson arvioinnissa'], [/katselmusta/gi, 'jakson arviointia'], [/katselmus/gi, 'jakson arviointi'],
    [/signaalin/gi, 'huomion'], [/signaali/gi, 'huomio'],
    [/konseptin/gi, 'harjoiteltavan asian'], [/konseptipeli/gi, 'peliharjoite'], [/konsepti/gi, 'harjoiteltava asia'],
    [/\bcuet\b/gi, 'kysymykset'], [/\bcue\b/gi, 'kysymys']
  ];
  var KIELLETYT = [/konsept/i, /\bcue/i, /katselm/i, /signaal/i, /sitoumu/i, /sitoutu/i];
  function _fi(avain) { return FI[avain] != null ? FI[avain] : avain; }
  function _isoAlku(src, uusi) { return /^[A-ZÅÄÖ]/.test(src) ? uusi.charAt(0).toUpperCase() + uusi.slice(1) : uusi; }
  function tmSanastoKorvaa(teksti, avain) {
    var t = String(teksti == null ? '' : teksti);
    if (avain != null && Object.prototype.hasOwnProperty.call(SANAT, avain) && SANAT[avain]) return _fi(SANAT[avain]);
    if (Object.prototype.hasOwnProperty.call(SANAT, t) && SANAT[t]) return _fi(SANAT[t]);
    MUODOT.forEach(function (m) { t = t.replace(m[0], function (osuma) { return _isoAlku(osuma, m[1]); }); });
    return t;
  }
  function tmSanastoKonseptiNimi(avain, vanha) { var k = 'sn_' + String(avain || '').toLowerCase(); return /^sn_y_[hp]\d$/.test(k) ? _fi(k) : vanha; }
  function tmSanastoPhv(koodi) { var k = String(koodi || '').toUpperCase(); return k === 'PRE' ? _fi('sn_phv_ennen') : k === 'PH' ? _fi('sn_phv_nyt') : (k === 'POST' || k === 'AN') ? _fi('sn_phv_jalkeen') : k === 'LAH' ? _fi('sn_phv_lahestyy') : null; }
  function tmSanastoKielletyt(teksti) { var s = String(teksti == null ? '' : teksti), l = []; KIELLETYT.forEach(function (re) { var m = re.exec(s); if (m) l.push(m[0]); }); return l; }
  function tmSanastoT(t, o) {
    o = o || {}; var kartta = o.fi || {};
    return function (k) {
      var kieli = typeof o.kieli === 'function' ? o.kieli() : 'fi', v = typeof t === 'function' ? t(k) : k;
      if (kieli !== 'fi') return (v === k && FI[k] != null) ? FI[k] : v;   // muut kielet: Gemini-erä; sanaston avaimille FI-oletus kunnes sv saapuu
      var teksti = (v !== k) ? v : (FI[k] != null ? FI[k] : (kartta[k] != null ? kartta[k] : k));
      return tmSanastoKorvaa(teksti, k);
    };
  }
  var API = { FI: FI, SANAT: SANAT, KIELLETYT: KIELLETYT, tmSanastoKorvaa: tmSanastoKorvaa, tmSanastoKonseptiNimi: tmSanastoKonseptiNimi, tmSanastoPhv: tmSanastoPhv, tmSanastoKielletyt: tmSanastoKielletyt, tmSanastoT: tmSanastoT };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_SANASTO = API;
})(typeof window !== 'undefined' ? window : this);
