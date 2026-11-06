/* QG-1c · kääntämättömät t()-literaalit sv-läpiajon korpukseen.
   Ongelma (PM 2.11., VP → Läge): näkymä renderöi suomea, jota tunnistin ei löytänyt ("Onko mitattu tällä kaudella?", "2talenttia · 4 ehdokasta",
   "kooste mån 06.00"). Teksti ei ollut missään käännöskartassa, joten korpus ei tuntenut sitä, eikä heuristiikka osunut lyhyisiin tai taivutettuihin muotoihin.
   Ratkaisu: lähdekoodin käännöskutsujen literaalit (t('…'), masterT('…'), vpT('…'), T('…'), _t('…')), joita EI ole yhdessäkään kartassa, ovat
   määritelmän mukaan kääntämättömiä käyttöliittymätekstejä. Jos sellainen näkyy sv-tilassa, se on suomea.
     · kokonaiset: literaali ilman paikkamerkkejä → korpukseen kuten kartan fi-teksti
     · mallit: literaali paikkamerkeillä ('{asia} · {n} joukkuetta') → säännöllinen lauseke koko tekstille; kiinteässä osassa pitää olla ≥ 5 kirjainta
   Avaintyyliset literaalit (tm_lang-avaimet 'yleiset.x', 'kes_alue_') eivät ole näkyvää tekstiä → ohitetaan. Puhdas funktio: lukee vain tiedostoja. */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
const { lueKuori } = createRequire(import.meta.url)('../../scripts/kuoren_lahde.js');

const KUTSU = /(?<![\w$.])(?:t|_t|masterT|vpT|_vpT|T)\(\s*'((?:[^'\\\n]|\\.){2,})'/g;
const AVAINTYYLI = /^[a-z0-9_.]+$/i;
const PAIKKA = /\{\w+\}/g;
const kirjaimet = (s) => (String(s).match(/[a-zåäö]/gi) || []).length;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const unescape = (s) => s.replace(/\\(.)/g, (m, c) => (c === 'n' ? '\n' : c));

export function lahdetiedostot(juuri) {
  return [...readdirSync(juuri).filter((f) => /^TalentMaster_.*\.html$/.test(f)), ...readdirSync(join(juuri, 'lib')).filter((f) => f.endsWith('.js') && !/i18n|^tm_lang\.js$/.test(f)).map((f) => 'lib/' + f)];
}

/** tunnettu(teksti) → true, jos teksti on jo kartassa (käännetty tai odottaa) → ei lisätä. */
export function tLiteraalit(juuri, tunnettu) {
  const nahty = new Set(), kokonaiset = [], mallit = [];
  for (const f of lahdetiedostot(juuri)) {
    const s = lueKuori(f, juuri);   // seura/-osat mukana
    for (const m of s.matchAll(KUTSU)) {
      const lit = unescape(m[1]).replace(/\s+/g, ' ').trim();
      if (nahty.has(lit)) continue; nahty.add(lit);
      if (AVAINTYYLI.test(lit) || /[<>]/.test(lit) || kirjaimet(lit) < 3 || tunnettu(lit)) continue;
      if (!PAIKKA.test(lit)) { kokonaiset.push({ teksti: lit, f }); continue; }
      PAIKKA.lastIndex = 0;
      const osat = lit.split(PAIKKA);
      if (kirjaimet(osat.join('')) < 5) continue;   // '{a} · {b}' tms. osuisi kaikkeen
      mallit.push({ teksti: lit, f, re: new RegExp('^' + osat.map((o) => esc(o.toLowerCase())).join('.+?') + '$') });
    }
  }
  return { kokonaiset, mallit };
}
