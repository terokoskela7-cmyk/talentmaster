/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   tm_alusta.js — YKSI ALUSTASANASTO (§22 alustaherkkyys, PR F 4.10.2026)

   Ennen kolme sanastoa: Testaus_v9 ALUSTA_NIMET (koodit) · Pikakirjaus + Excel_Tuonti (vapaatekstit "Tekonurmi",
   "Halli / parketti" … ilman Mondoa) · tm_kehityskaari _alustaLyhyt (tekstihaku) → ennätys/kehityskaari ei tunnistanut
   samaa alustaa eri työkaluista. Nyt: valikot TÄSTÄ listasta, tallennus = KOODI (+ alusta_nimi näyttöön), vertailu
   tmAlustaKoodi(a) === tmAlustaKoodi(b) → vanha data toimii lukuhetken normalisoinnilla (EI datamigraatiota).

   ALUSTAT          = valittavat [{ koodi, nimi }] — Mondo ensin (suurin osa juoksutesteistä tehdään Mondolla)
   tmAlustaKoodi(a) = mikä tahansa vanha koodi/vapaateksti → kanoninen koodi
                       · tyhjä / null / 'tuntematon' → 'tuntematon' (ei tietoa ≠ "muu")
                       · moniselitteinen vanha teksti → YLEISKOODI (ei valittavissa, ei arvata tarkempaa):
                         "Tekonurmi"/"keinonurmi" → 'keinonurmi' · "Luonnonnurmi"/"nurmi" → 'luonnonnurmi' · "Halli" → 'sisahalli'
                       · tunnistamaton → 'muu'
   tmAlustaNimi(a)  = näyttönimi (fi) koodista tai vanhasta arvosta
   tmAlustaSama(a,b)= vertailukelpoisuus §22 (koodien yhtäsuuruus)
   ══════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  // Valittavat (järjestys = valikon järjestys). keinonurmi_hiekka UUSI: Pikakirjauksessa/Excelissä oli "Hiekkatekonurmi"
  // (hiekkatäytteinen 2G-keinonurmi) — fyysisesti eri alusta kuin kumirouhe-3G/4G → oma koodi, ei sulauteta.
  var ALUSTAT = [
    { koodi: 'mondo_yleisurheilualusta', nimi: 'Mondo / yleisurheilualusta' },
    { koodi: 'keinonurmi_3g', nimi: 'Keinonurmi (3G)' },
    { koodi: 'keinonurmi_4g5g', nimi: 'Keinonurmi (4G/5G)' },
    { koodi: 'keinonurmi_hiekka', nimi: 'Keinonurmi (hiekka / 2G)' },
    { koodi: 'luonnonnurmi_kuiva', nimi: 'Luonnonnurmi — kuiva' },
    { koodi: 'luonnonnurmi_marka', nimi: 'Luonnonnurmi — märkä' },
    { koodi: 'sisahalli_puu', nimi: 'Sisähalli — puulattia' },
    { koodi: 'sisahalli_kumi', nimi: 'Sisähalli — kumi/tartan' },
    { koodi: 'muu', nimi: 'Muu' }
  ];
  // Vanhan datan yleiskoodit (EI valikossa): tarkenne puuttui alkuperäisestä syötteestä → ei keksitä sitä.
  var YLEISKOODIT = {
    keinonurmi: 'Keinonurmi (tyyppi ei tiedossa)',
    luonnonnurmi: 'Luonnonnurmi',
    sisahalli: 'Sisähalli',
    tuntematon: 'Alusta ei tiedossa'
  };
  var NIMI = {};
  ALUSTAT.forEach(function (a) { NIMI[a.koodi] = a.nimi; });
  Object.keys(YLEISKOODIT).forEach(function (k) { NIMI[k] = YLEISKOODIT[k]; });

  function tmAlustaKoodi(arvo) {
    if (arvo == null) return 'tuntematon';
    var s = String(arvo).trim();
    if (!s) return 'tuntematon';
    if (NIMI[s]) return s;                                   // jo kanoninen (myös yleiskoodit + 'tuntematon')
    var t = s.toLowerCase();
    if (/^muu\b/.test(t)) return 'muu';                    // "Muu — tarkenne" (Testaus_v9 kuvaus) voittaa avainsanat
    if (/mondo|yleisurheilu|tartan.*rata|juoksurata/.test(t)) return 'mondo_yleisurheilualusta';
    if (/hiekka/.test(t)) return 'keinonurmi_hiekka';
    if (/(^|[^0-9])3\s*g\b/.test(t)) return 'keinonurmi_3g';
    if (/(^|[^0-9])[45]\s*g\b/.test(t)) return 'keinonurmi_4g5g';
    if (/teko|keino/.test(t)) return 'keinonurmi';
    if (/luonnon|^nurmi$|\bnurmi\b/.test(t)) {
      if (/märk|mark|wet/.test(t)) return 'luonnonnurmi_marka';
      if (/kuiv|dry/.test(t)) return 'luonnonnurmi_kuiva';
      return 'luonnonnurmi';
    }
    if (/parketti|puu/.test(t)) return 'sisahalli_puu';
    if (/kumi|tartan/.test(t)) return 'sisahalli_kumi';
    if (/halli|sisä|sisa/.test(t)) return 'sisahalli';
    return 'muu';
  }
  // PÄÄALUSTA (päätös 4.10.2026): juoksutestien ensisijainen vertailualusta = Mondo / yleisurheilualusta (suurin osa
  // juoksutesteistä tehdään Mondolla). EI muuntokaavaa alustojen välillä — muut alustat ovat omia rivejään ilman vertailua.
  var PAAALUSTA_JUOKSU = 'mondo_yleisurheilualusta';
  var JUOKSUTESTIT = ['lin5m', 'lin10m', 'lin30m', 'kasirata', 'sm_juoksu', 'sm_pallo', 'mas'];
  function tmPaaalusta(testi) { return JUOKSUTESTIT.indexOf(testi) >= 0 ? PAAALUSTA_JUOKSU : null; }
  function tmAlustaNimi(arvo) { return NIMI[tmAlustaKoodi(arvo)] || 'Muu'; }
  function tmAlustaSama(a, b) { return tmAlustaKoodi(a) === tmAlustaKoodi(b); }
  // <option>-lista valikoille (valittu = koodi tai vanha arvo). Ensimmäinen tyhjä "(valitse)" jos tyhjaTeksti annettu.
  function tmAlustaOptiot(valittu, tyhjaTeksti) {
    var v = valittu ? tmAlustaKoodi(valittu) : '';
    var esc = function (x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    return (tyhjaTeksti != null ? '<option value="">' + esc(tyhjaTeksti) + '</option>' : '')
      + ALUSTAT.map(function (a) { return '<option value="' + a.koodi + '"' + (a.koodi === v ? ' selected' : '') + '>' + esc(a.nimi) + '</option>'; }).join('');
  }

  var API = { ALUSTAT: ALUSTAT, YLEISKOODIT: YLEISKOODIT, PAAALUSTA_JUOKSU: PAAALUSTA_JUOKSU, JUOKSUTESTIT: JUOKSUTESTIT, tmPaaalusta: tmPaaalusta,
    tmAlustaKoodi: tmAlustaKoodi, tmAlustaNimi: tmAlustaNimi,
    tmAlustaSama: tmAlustaSama, tmAlustaOptiot: tmAlustaOptiot };
  if (global) { global.TM_ALUSTA = API; global.tmAlustaKoodi = tmAlustaKoodi; global.tmAlustaNimi = tmAlustaNimi; }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
