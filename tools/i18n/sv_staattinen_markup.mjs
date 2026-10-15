#!/usr/bin/env node
/* Staattisen MARKUPIN vartija (sv_staattinen.mjs skannaa vain inline-skriptit; HTML-runko jäi sokeaksi pisteeksi — Sibbo 1.11. vaihe 1).
   Löytää HTML-rungosta käyttäjälle näkyvät tekstit (tekstisolmut + placeholder/aria-label/title/alt) joilla ei ole i18n-reittiä:
   data-i18n (koko elementti) · data-i18n-tn (elementin ensimmäinen tekstisolmu) · data-i18n-pl (placeholder) · data-i18n-al (aria-label).
   Ei suomi-heuristiikkaa: mikä tahansa näkyvä sana joka ei ole sallittu (brändi/lyhenne/tyhjä) on löydös → deterministinen.
   Ajo: node tools/i18n/sv_staattinen_markup.mjs <tiedosto.html> [--json] */
import { readFileSync } from 'fs';
import { parse } from 'parse5';

/* Sallittu = ei käännettävää: brändi, lyhenne, kielten omat nimet (endonyymit; kielivalitsin on tarkoituksella kolmikielinen), rekisterinpitäjän nimi. */
const SALLITUT = /^(?:TalentMaster™?|TALENTMASTER™?|GDPR|PalloID|PIN|U\d+|KPV|Suomi|Svenska|English|Kieli \/ Språk \/ Language|TalentMaster \/ Tero Koskela|[\s·—–\-/:()%.,+*0-9&#;]|™)+$/;
const EI_NAYTETA = new Set(['script', 'style', 'noscript', 'template']);
const ATTR = [['placeholder', 'data-i18n-pl'], ['aria-label', 'data-i18n-al'], ['title', 'data-i18n-ti'], ['alt', 'data-i18n-al']];
const sana = (t) => /[A-Za-zÅÄÖåäö]{2,}/.test(t.replace(/&[a-z#0-9]+;/gi, ' '));

export function skannaaMarkup(src) {
  const doc = parse(src, { sourceCodeLocationInfo: true }), loydot = [];
  const attr = (n, k) => (n.attrs || []).find((a) => a.name === k);
  (function kavele(n, reititetty) {
    if (n.nodeName === '#comment') return;
    if (n.tagName && EI_NAYTETA.has(n.tagName)) return;
    if (n.tagName === 'head') { for (const c of n.childNodes) if (c.tagName === 'title') kavele(c, false); return; }   // head: vain <title> on käyttäjälle näkyvää
    const koko = reititetty || !!(n.attrs && attr(n, 'data-i18n'));
    if (n.attrs) for (const [a, reitti] of ATTR) { const x = attr(n, a); if (x && sana(x.value) && !SALLITUT.test(x.value.trim()) && !attr(n, reitti)) loydot.push({ rivi: n.sourceCodeLocation.startLine, tyyppi: a, teksti: x.value.trim() }); }
    let tnKatettu = false;
    for (const c of n.childNodes || []) {
      if (c.nodeName === '#text') {
        const t = c.value.trim(); if (!t || !sana(t) || SALLITUT.test(t)) continue;
        if (koko) continue;
        if (attr(n, 'data-i18n-tn') && !tnKatettu) { tnKatettu = true; continue; }
        loydot.push({ rivi: c.sourceCodeLocation.startLine, tyyppi: 'teksti', teksti: t });
      } else kavele(c, koko);
    }
  })(doc, false);
  return loydot;
}

if (process.argv[1] && process.argv[1].endsWith('sv_staattinen_markup.mjs') && process.argv[2]) {
  const l = skannaaMarkup(readFileSync(process.argv[2], 'utf8'));
  if (process.argv.includes('--json')) console.log(JSON.stringify(l, null, 1)); else for (const x of l) console.log(`${x.rivi}\t${x.tyyppi}\t${x.teksti}`);
  console.log('YHTEENSÄ ' + l.length);
}
