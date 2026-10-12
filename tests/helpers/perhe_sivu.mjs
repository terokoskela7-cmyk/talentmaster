/* Pelaaja_v7 / Vanhempi_v2 OIKEA sivu file://-osoitteesta selaintesteille: ulkoiset CDN-skriptit (Sentry, Firebase) korvataan sallivalla
   Firebase-tyngällä (ei verkkoa, ei oikeaa dataa), sivun omat lib-skriptit ja pääskripti ajetaan sellaisenaan. Testi ajaa oman koodinsa
   sivun globaaleja vasten (`kutsu`, ajetaan sivun latauksen jälkeen) — esim. asettaa _pelaaja/_lapsi, mock-Firestoren ja kielen. */
import fs from 'fs'; import os from 'os'; import path from 'path';
const TYNKA = 'window.__mk=function(){var f=function(){return window.__mk()};return new Proxy(f,{get:function(t,p){if(p==="then")return undefined;if(p===Symbol.toPrimitive)return function(){return ""};if(p==="toString")return function(){return ""};return window.__mk()},apply:function(){return window.__mk()}})};window.firebase=window.__mk();';
/* html: sivun lähde; juuri: repon juuri; kutsu: JS-merkkijono, ajetaan setTimeout(…, 600) jälkeen; valmistuminen = #probe-out ("ok" | "VIRHE …") */
export function perheSivu(html, juuri, kutsu) {
  let h = html.replace(/<script[^>]+src="https:\/\/[^"]+"[^>]*><\/script>/g, '');
  const j = h.indexOf('<head>') + 6, i = h.lastIndexOf('</body>');
  const probe = '(function(){var out=function(x){var o=document.createElement("pre");o.id="probe-out";o.textContent=x;o.style.display="none";document.body.appendChild(o)};setTimeout(function(){Promise.resolve().then(function(){' + kutsu + '}).then(function(){out("ok")},function(e){out("VIRHE "+(e&&e.stack||e))})},600)})();';
  const p = path.join(os.tmpdir(), 'perhe_' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(p, h.slice(0, j) + '<base href="file://' + juuri + '/"><script>' + TYNKA + '</script>' + h.slice(j, i) + '<script>' + probe + '</script>' + h.slice(i));
  return p;
}
