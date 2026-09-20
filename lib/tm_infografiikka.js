/* ══════════════════════════════════════════════════════════════════════════
   tm_infografiikka.js — JAETUT raportointikomponentit (Oura × KISS)

   SSOT: "Claude outputs/RAPORTOINTI_KISS_design_kartta_v1.html" (kolme kerrosta:
   Oura-synteesi → KISS-päätöskortit → syvennys).

   MITÄ TÄMÄ ON: puhtaita string/SVG-renderöijiä, kuten `tm_kehityskaari.js`.
   EI omaa dataa, EI Firestore-kyselyitä, EI laskentamoottoreita. Kutsuja tuo
   valmiit luvut; tämä kirjasto päättää vain miltä ne näyttävät.

   MIKSI JAETTU: kalibraatiopari renderöidään sekä Raportoinnissa että
   valmentajakortilla. Kaksi toteutusta olisi sama driftirakenne joka tuotti
   `lasnaolo_n`- ja `viimeisinKirjautuminen`-aukot.

   PERIAATELUKOT (kartasta — älä löysää ilman päätöstä):
   · OURA: teal on AINOA vahva aksentti · sanallinen tila, EI arvosanaa tai
     tulostaulua · yksityiskohta tapin takana · vaimea paletti.
   · Viitetason ALLE jäävä = HIMMENNETTY TEAL, ei amber eikä punainen.
     Kehityskohde ei ole virhe.
   · Väri ei koskaan yksin: aina ikoni + teksti (saavutettavuus + §5).
   · Ero aina myös LUKUNA — palkin pituus ei saa olla ainoa tieto.
   · HONEST-EMPTY: puuttuva data → "kertyy kun…", EI nollaa eikä keksittyä.
   · §7.22: ei rankingia pelaajalle — nämä ovat aikuisnäkymien komponentteja.
   ══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var VERSIO = '1.0.0';

  /* i18n: kutsuja voi antaa oman kääntäjän; muuten käytetään appin omaa. */
  function _t(s, opts) {
    try {
      var fn = (opts && opts.t) || global.vpT || global.masterT;
      return (typeof fn === 'function') ? fn(s) : s;
    } catch (e) { return s; }
  }
  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function _num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }

  /* ── KERROS 1 · Oura-synteesi ─────────────────────────────────────────────
     Rengas: kaari = DATAN KATTAVUUS (0–1), EI arvosana. Keskellä sanallinen
     tila. Tämä on se kohta jossa tulostaulu ("5/7 yllä") on tietoisesti
     poistettu — se olisi ranking. */
  function synteesiRengas(tila, kattavuus, opts) {
    var k = _num(kattavuus);
    if (k == null) k = 0;
    k = Math.max(0, Math.min(1, k));
    var R = 52, C = 2 * Math.PI * R;
    var yli = Math.round(C * (1 - k) * 10) / 10;
    var lbl = _esc(tila || _t('Kerää', opts));
    return '<div style="display:flex;align-items:center;gap:16px">'
      + '<svg viewBox="0 0 120 120" width="108" height="108" role="img" aria-label="'
      + _esc(_t('Datan kattavuus', opts)) + '" style="flex:0 0 auto">'
      + '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="var(--border)" stroke-width="7"></circle>'
      + '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="var(--teal)" stroke-width="7"'
      + ' stroke-linecap="round" stroke-dasharray="' + (Math.round(C * 10) / 10) + '"'
      + ' stroke-dashoffset="' + yli + '" transform="rotate(-90 60 60)"></circle>'
      + '<text x="60" y="58" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="20"'
      + ' font-weight="400" fill="var(--ink)">' + lbl + '</text>'
      + '<text x="60" y="76" text-anchor="middle" font-size="9" fill="var(--ink3)">'
      + _esc(_t('kattavuus', opts)) + ' ' + Math.round(k * 100) + '%</text>'
      + '</svg>';
  }

  /** Synteesin tekstipuoli (Cormorant-lause + konteksti). Sulkee rengas-diviin. */
  function synteesiTeksti(otsikko, lause, konteksti, opts) {
    return '<div style="flex:1;min-width:0">'
      + '<div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3);margin-bottom:4px">'
      + _esc(konteksti || '') + '</div>'
      + '<div style="font-family:\'Cormorant Garamond\',serif;font-weight:400;font-size:22px;line-height:1.25;color:var(--ink)">'
      + _esc(otsikko || '') + '</div>'
      + (lause ? '<div style="font-size:12.5px;color:var(--ink2);margin-top:6px;line-height:1.5">' + _esc(lause) + '</div>' : '')
      + '</div></div>';
  }

  /* ── KERROS 2 · KISS-päätöskortti ────────────────────────────────────────
     Päätös ennen dataa. Reunaväri = vakavuus, MUTTA aina ikoni + teksti. */
  function paatoskortti(o, opts) {
    o = o || {};
    var vakava = o.sev === 'amber';
    var reuna = vakava ? 'var(--amber)' : 'var(--teal)';
    var cta = o.cta ? '<button onclick="' + _esc(o.fn || '') + '" style="margin-left:auto;align-self:center;'
      + 'padding:6px 14px;border-radius:7px;border:.5px solid ' + reuna + ';background:transparent;color:' + reuna
      + ';font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">' + _esc(o.cta) + '</button>' : '';
    return '<div style="display:flex;gap:12px;align-items:flex-start;background:var(--card);'
      + 'border:.5px solid var(--border);border-left:2px solid ' + reuna + ';border-radius:10px;'
      + 'padding:12px 14px;margin-bottom:8px">'
      + '<div style="font-size:18px;line-height:1.2;flex:0 0 auto">' + _esc(o.ik || '•') + '</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:13.5px;color:var(--ink);line-height:1.35">' + _esc(o.teksti || '') + '</div>'
      + (o.alanimi ? '<div style="font-size:11.5px;color:var(--ink3);margin-top:3px;line-height:1.45">' + _esc(o.alanimi) + '</div>' : '')
      + '</div>' + cta + '</div>';
  }

  /** Honest-empty päätöskorttien tilalle — kertoo MILLOIN kortteja ilmestyy. */
  function eiSignaaleja(opts) {
    return '<div style="background:var(--card);border:.5px solid var(--border);border-radius:10px;'
      + 'padding:12px 14px;font-size:12.5px;color:var(--ink2);line-height:1.5">✅ '
      + _esc(_t('Ei kriittisiä signaaleja juuri nyt.', opts)) + ' '
      + '<span style="color:var(--ink3)">'
      + _esc(_t('Kun valmentaja hiljenee, nostoehdokas ilmaantuu tai kalibraatiokuilu kasvaa, näet ne täällä toimenpiteinä.', opts))
      + '</span></div>';
  }

  /* ── KERROS 3 · Bullet-mittari ───────────────────────────────────────────
     Palkki = arvo · viiva = viitetaso · oikealla ERO LUKUNA.
     Viitetason alle = himmennetty teal (kehityskohde), EI amber/punainen. */
  function bulletRivi(o, opts) {
    o = o || {};
    var arvo = _num(o.arvo), viite = _num(o.viite);
    var yks = o.yksikko || '';
    if (arvo == null) {
      /* HONEST-EMPTY: ei nollapalkkia joka näyttäisi mitatulta tulokselta. */
      return '<div style="padding:8px 0;border-top:.5px solid var(--border)">'
        + '<div style="font-size:12px;color:var(--ink2)">' + _esc(o.label || '') + '</div>'
        + '<div style="font-size:11.5px;color:var(--ink3);margin-top:2px">'
        + _esc(o.tyhja || _t('kertyy kun mittauksia on', opts)) + '</div></div>';
    }
    var max = Math.max(arvo, viite == null ? arvo : viite, 1);
    var lev = Math.round(arvo / max * 100);
    var alle = (viite != null && arvo < viite);
    var vari = alle ? 'rgba(40,176,144,.42)' : 'var(--teal)';   // himmennetty teal, ei amber
    var ero = (viite == null) ? null : Math.round((arvo - viite) * 10) / 10;
    var eroTxt = (ero == null) ? '' : ((ero > 0 ? '+' : '') + ero + (o.eroYksikko || yks));
    return '<div style="padding:8px 0;border-top:.5px solid var(--border)">'
      + '<div style="display:flex;align-items:baseline;gap:8px">'
      + '<div style="flex:1;min-width:0;font-size:12px;color:var(--ink2)">' + _esc(o.label || '')
      + (o.alanimi ? ' <span style="color:var(--ink3);font-size:11px">' + _esc(o.alanimi) + '</span>' : '') + '</div>'
      + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:19px;font-weight:400;color:var(--ink)">'
      + arvo + _esc(yks) + '</div>'
      + (eroTxt ? '<div style="width:74px;text-align:right;font-size:11px;color:'
        + (alle ? 'var(--ink3)' : 'var(--teal)') + '">' + _esc(eroTxt) + '</div>' : '<div style="width:74px"></div>')
      + '</div>'
      + '<div style="position:relative;height:6px;background:rgba(242,239,230,.07);border-radius:3px;margin-top:5px">'
      + '<div style="position:absolute;left:0;top:0;bottom:0;width:' + lev + '%;background:' + vari + ';border-radius:3px"></div>'
      + (viite == null ? '' : '<div style="position:absolute;top:-2px;bottom:-2px;left:' + Math.round(viite / max * 100)
        + '%;width:1.5px;background:var(--ink3)"></div>')
      + '</div></div>';
  }

  /* ── KERROS 3 · RAE-jakauma (syntymäkvartaali) ───────────────────────── */
  function raeJakauma(bq, opts) {
    bq = bq || {};
    var q = ['Q1', 'Q2', 'Q3', 'Q4'];
    var yht = q.reduce(function (s, k) { return s + (_num(bq[k]) || 0); }, 0);
    if (!yht) {
      return '<div style="font-size:11.5px;color:var(--ink3)">'
        + _esc(_t('Syntymäkvartaalit kertyvät kun pelaajilla on syntymäaika.', opts)) + '</div>';
    }
    return '<div style="display:flex;gap:6px;align-items:flex-end;height:64px;margin-top:6px">'
      + q.map(function (k) {
        var n = _num(bq[k]) || 0, pct = Math.round(n / yht * 100);
        return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">'
          + '<div style="font-size:11px;color:var(--ink2)">' + pct + '%</div>'
          + '<div style="width:100%;height:' + Math.max(3, Math.round(pct * 0.42)) + 'px;'
          + 'background:' + (k === 'Q4' ? 'var(--teal)' : 'rgba(40,176,144,.38)') + ';border-radius:3px 3px 0 0"></div>'
          + '<div style="font-size:10px;color:var(--ink3)">' + k + '</div></div>';
      }).join('') + '</div>';
  }

  /* ── Kalibraatiopari (JAETTU: Raportointi + valmentajakortti) ────────────
     Sininen VAIN toiselle sarjalle (itsearvio), teal havainnoinnille.
     Aina 🪞/👁-leima → väri ei ole ainoa erottaja. */
  function kalibraatioPari(itse, hav, opts) {
    var a = _num(itse), b = _num(hav);
    if (a == null || b == null) {
      return '<div style="font-size:11.5px;color:var(--ink3)">'
        + _esc(_t('Kalibraatio kertyy kun itsearvio ja havainnointi on molemmat kirjattu.', opts)) + '</div>';
    }
    var kuilu = Math.round((a - b) * 10) / 10;
    var rivi = function (ik, nimi, arvo, vari) {
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">'
        + '<span style="font-size:13px">' + ik + '</span>'
        + '<span style="flex:0 0 96px;font-size:11.5px;color:var(--ink3)">' + _esc(nimi) + '</span>'
        + '<div style="flex:1;height:6px;background:rgba(242,239,230,.07);border-radius:3px">'
        + '<div style="height:6px;width:' + Math.round(Math.max(0, Math.min(1, arvo / 5)) * 100) + '%;background:' + vari + ';border-radius:3px"></div></div>'
        + '<span style="font-family:\'Cormorant Garamond\',serif;font-size:17px;color:var(--ink)">' + arvo + '</span></div>';
    };
    return rivi('🪞', _t('Itsearvio', opts), a, 'var(--blue)')
      + rivi('👁', _t('Havainnointi', opts), b, 'var(--teal)')
      + '<div style="font-size:11.5px;color:var(--ink3);margin-top:4px">'
      + _esc(_t('Kuilu', opts)) + ' ' + (kuilu > 0 ? '+' : '') + kuilu + ' · '
      + _esc(_t('poikkeama on keskustelunavaus, ei arvostelu', opts)) + '</div>';
  }

  var API = {
    VERSIO: VERSIO,
    synteesiRengas: synteesiRengas,
    synteesiTeksti: synteesiTeksti,
    paatoskortti: paatoskortti,
    eiSignaaleja: eiSignaaleja,
    bulletRivi: bulletRivi,
    raeJakauma: raeJakauma,
    kalibraatioPari: kalibraatioPari,
  };

  global.TM_INFO = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
