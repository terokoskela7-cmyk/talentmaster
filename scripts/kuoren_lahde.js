'use strict';
/**
 * kuoren_lahde.js — kuoren koko lähde yhtenä tekstinä (rivikattojen purku, S0).
 *
 * Miksi: Seura.html:n koodia siirretään sellaisenaan `seura/`-kansion tiedostoihin (S1–S4). Testit ja
 * työkalut, jotka lukevat kuoren lähdettä tekstinä (toContain, funktion poiminta, vm-ajo, i18n-skannaus),
 * näkisivät muuten vain tyhjän kohdan. lueKuori() liittää kuoren omat osatiedostot takaisin samaan
 * kohtaan, josta ne siirrettiin:
 *   <script src="seura/x.js"></script>          → <script data-kuoriosa="seura/x.js">…sisältö…</script>
 *   <link rel="stylesheet" href="seura/x.css">  → <style data-kuoriosa="seura/x.css">…sisältö…</style>
 *
 * Vain OSAKANSIOT-listan polut laajennetaan. Jaetut kirjastot (lib/) jäävät tageiksi, koska niillä on omat
 * testinsä ja niiden tagia tarkistetaan (esim. '<script src="lib/tm_esc.js"></script>').
 * Tiedosto, joka ei viittaa osakansioon, palautuu muuttumattomana.
 *
 * Raakaa rakennetta tarvitsevat (kasvukatto laskee rivejä, SDK-versioportti lukee head-tagit) lukevat
 * tiedoston suoraan.
 */
const fs = require('fs');
const path = require('path');

const JUURI = path.join(__dirname, '..');
const OSAKANSIOT = ['seura/'];

const onOsa = (p) => OSAKANSIOT.some((k) => p.startsWith(k));
const ilmanKyselya = (p) => p.replace(/^\.\//, '').replace(/[?#].*$/, '');

const RE_SCRIPT = /<script\b([^>]*)\bsrc\s*=\s*(["'])([^"']+)\2([^>]*)>\s*<\/script>/gi;
const RE_LINK = /<link\b[^>]*>/gi;

/** Kuoren osatiedostot lähdejärjestyksessä: [{ polku, tapa: 'script'|'css' }]. */
function kuorenOsat(html) {
  const osat = [];
  const re = new RegExp(RE_SCRIPT.source + '|' + RE_LINK.source, 'gi');
  for (const m of html.matchAll(re)) {
    if (m[3] !== undefined) {
      const p = ilmanKyselya(m[3]);
      if (onOsa(p)) osat.push({ polku: p, tapa: 'script' });
    } else {
      const t = m[0];
      const href = /\bhref\s*=\s*(["'])([^"']+)\1/i.exec(t);
      if (href && /\brel\s*=\s*(["'])stylesheet\1/i.test(t) && onOsa(ilmanKyselya(href[2]))) osat.push({ polku: ilmanKyselya(href[2]), tapa: 'css' });
    }
  }
  return osat;
}

/** Liittää osatiedostojen sisällön tagien paikalle. Puuttuva osatiedosto heittää (ei hiljaista tyhjää). */
function laajennaKuori(html, juuri) {
  const j = juuri || JUURI;
  const lue = (p) => {
    const t = path.join(j, p);
    if (!fs.existsSync(t)) throw new Error('kuoren_lahde: osatiedosto puuttuu: ' + p);
    return fs.readFileSync(t, 'utf8');
  };
  let ulos = html.replace(RE_SCRIPT, (koko, _a, _q, src) => {
    const p = ilmanKyselya(src);
    return onOsa(p) ? '<script data-kuoriosa="' + p + '">\n' + lue(p) + '\n</script>' : koko;
  });
  ulos = ulos.replace(RE_LINK, (t) => {
    const href = /\bhref\s*=\s*(["'])([^"']+)\1/i.exec(t);
    if (!href || !/\brel\s*=\s*(["'])stylesheet\1/i.test(t)) return t;
    const p = ilmanKyselya(href[2]);
    return onOsa(p) ? '<style data-kuoriosa="' + p + '">\n' + lue(p) + '\n</style>' : t;
  });
  return ulos;
}

/** Lukee tiedoston juuresta. HTML-kuori laajennetaan osatiedostoillaan, muut palautuvat sellaisenaan. */
function lueKuori(tiedosto, juuri) {
  const j = juuri || JUURI;
  const s = fs.readFileSync(path.join(j, tiedosto), 'utf8');
  return /\.html$/i.test(tiedosto) ? laajennaKuori(s, j) : s;
}

module.exports = { lueKuori, laajennaKuori, kuorenOsat, OSAKANSIOT };
