/**
 * TalentMaster™ — §7.22 · Pelaajan kehon valmius: EI RAAKA-ARVOJA LAPSELLE.
 *
 * §7.22 (CLAUDE.md §7.22 / §16): pelaajalle ei näytetä tasolukuja, normivertailua eikä
 * numeerista arviota. Ketjun raaka-arvo (1.0–3.0) oli näkyvissä ketjurivin oikeassa reunassa.
 * Nyt taso välittyy PALKIN pituudella ja heikoimman ketjun amber-korostuksella — arvo säilyy
 * datassa (ohjaa palkkia + heikoin-valintaa), vain NÄKYVÄ numero on poissa.
 *
 * REGRESSIO: VP/Master ovat HENKILÖKUNNAN työkaluja → niissä luvut säilyvät. Tämä sviitti
 * vartioi molempia suuntia: 0 lukua pelaajalla JA luvut yhä henkilökunnalla.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const PELAAJA = readFileSync(join(ROOT, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');

// rTestit = pelaajan kehon valmius -näkymä. Ankkuroitu, ei rivinumeroitu.
function rTestitLohko() {
  const rivit = PELAAJA.split('\n');
  const a = rivit.findIndex((l) => l.startsWith('function rTestit()'));
  expect(a).toBeGreaterThan(0);
  let b = -1;
  for (let i = a + 1; i < rivit.length; i++) if (rivit[i].startsWith('}')) { b = i; break; }
  expect(b).toBeGreaterThan(a);
  return rivit.slice(a, b + 1);
}
// Ketjurivi = chains.map(...)-lohko (nimi + miksi + palkki).
function ketjuLohko() {
  const rivit = rTestitLohko();
  const a = rivit.findIndex((l) => l.includes('${chains.map(c=>`'));
  const b = rivit.findIndex((l, i) => i > a && l.includes("`).join('')}"));
  expect(a).toBeGreaterThan(-1);
  expect(b).toBeGreaterThan(a);
  return rivit.slice(a, b + 1).join('\n');
}

describe('§7.22 — ketjurivillä ei näkyvää raaka-arvoa', () => {
  it('ketjulohkossa EI ole arvon renderöintiä (toFixed / c.arvo näyttökentässä)', () => {
    const lohko = ketjuLohko();
    expect(lohko).not.toContain('toFixed');
    // c.arvo saa esiintyä VAIN palkin leveydessä (width:…%), ei tekstisolmuna
    const arvoInterp = [...lohko.matchAll(/\$\{[^}]*c\.arvo[^}]*\}/g)].map((m) => m[0]);
    expect(arvoInterp.length).toBeGreaterThan(0);           // ei-vacuous: arvo ohjaa yhä palkkia
    for (const x of arvoInterp) {
      expect(x, x).toMatch(/Math\.min\(100/);               // vain palkkilaskenta
      expect(x, x).not.toMatch(/toFixed|>\s*$/);
    }
  });
  it('ketjulohkossa 0 näkyvää numeroa (tekstisolmut ja ${}-ulostulot)', () => {
    const lohko = ketjuLohko();
    // tekstisolmut >…< ilman interpolointia
    const tekstit = [...lohko.matchAll(/>([^<>${}]+)</g)].map((m) => m[1].trim()).filter(Boolean);
    expect(tekstit.filter((t) => /\d/.test(t))).toEqual([]);
    // interpoloinnit jotka päätyvät NÄYTTÖÖN (eivät style-attribuuttiin)
    const naytto = [...lohko.matchAll(/>\s*(\$\{[^}]*\})/g)].map((m) => m[1]);
    for (const x of naytto) expect(x, x).not.toMatch(/arvo|flei|toFixed|Math\./);
  });
  it('palkki ja heikoin-korostus säilyvät (taso välittyy ilman lukua)', () => {
    const lohko = ketjuLohko();
    expect(lohko).toContain('width:${c.arvo>0?Math.min(100,c.arvo/3*100):0}%');
    expect(lohko).toContain("c.koodi===heikoin.koodi?'#E8A020'");
  });
  it('heikoin ketju nimetään yhä (nimi + miksi, ei lukua)', () => {
    const lohko = rTestitLohko().join('\n');
    expect(lohko).toContain('Heikoin ketju: <strong>${heikoin.nimi}</strong>');
    expect(lohko).toContain('${heikoin.miksi}');
    expect(lohko).not.toMatch(/heikoin\.arvo\.toFixed/);
  });
});

describe('§7.22 — hero näyttää TILAN, ei numeroa (vaihtoehto B)', () => {
  const heroLohko = () => {
    const rivit = rTestitLohko();
    const a = rivit.findIndex((l) => l.includes("_tT('kehon_valmius')"));
    expect(a).toBeGreaterThan(-1);
    return rivit.slice(a, a + 5).join('\n');
  };

  it('hero renderöi tilasanan, EI numeroa eikä "pistettä 100:sta"', () => {
    const hero = heroLohko();
    expect(hero).toContain('${_valmiusTila.sana}');
    expect(hero).not.toContain('${flei');
    expect(hero).not.toMatch(/pistettä|\/\s*100/);
    expect(hero).not.toMatch(/font-size:48px/);
    const tekstit = [...hero.matchAll(/>([^<>${}]+)</g)].map((m) => m[1].trim()).filter(Boolean);
    expect(tekstit.filter((x) => /\d/.test(x))).toEqual([]);
  });
  it('otsikko on "Kehon valmius" — ei "indeksi"', () => {
    const lohko = rTestitLohko().join('\n');
    expect(lohko).not.toContain('KEHON VALMIUSINDEKSI');
    expect(lohko).toContain("_tT('kehon_valmius')");
  });
  it('sana ja väri tulevat SAMASTA kynnyksestä (70/40) — eivät voi erota', () => {
    const lohko = rTestitLohko().join('\n');
    const m = lohko.match(/const _valmiusTila =[\s\S]*?;\n/);
    expect(m).toBeTruthy();
    const def = m[0];
    // Neljä haaraa, kukin { sana, vari } -parina → yksi lähde molemmille.
    expect((def.match(/sana:/g) || []).length).toBe(4);
    expect((def.match(/vari:/g) || []).length).toBe(4);
    expect(def).toContain('flei >= 70');
    expect(def).toContain('flei >= 40');
    expect(def).toContain('var(--teal)');
    expect(def).toContain('#E8A020');
    expect(def).toContain('#E04040');
    // Ei mitään MUUTA kynnystä kuin 70/40 (ei uusia maagisia lukuja)
    expect(def.match(/flei >= (\d+)/g)).toEqual(['flei >= 70', 'flei >= 40']);
  });
  it('neljä tilaa: ei-dataa on OMA neutraali tilansa (ei punainen "huolto")', () => {
    const lohko = rTestitLohko().join('\n');
    for (const k of ['valmiustila_ei_dataa', 'valmiustila_valmis', 'valmiustila_kehittyy', 'valmiustila_huolto']) {
      expect(lohko, k).toContain(k);
    }
    expect(lohko).toMatch(/\(!flei\)\s*\?\s*\{ sana: _tT\('valmiustila_ei_dataa'\), vari: 'var\(--ink3/);
  });
  it('tilasanat resolvoituvat fi JA sv (pelaajan i18n-mekanismi)', async () => {
    const vm = await import('vm');
    const sb = { console: { log() {}, warn() {} }, localStorage: { getItem: () => null, setItem() {} } };
    sb.window = sb; vm.createContext(sb);
    vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_lang.js'), 'utf8'), sb);
    const avaimet = ['valmiustila_valmis', 'valmiustila_kehittyy', 'valmiustila_huolto', 'valmiustila_ei_dataa'];
    const fi = avaimet.map((k) => sb.t('mittarit.' + k));
    expect(fi).toEqual(['Valmis treenaamaan', 'Kehittyy', 'Tarvitsee huoltoa', 'Ei mitattu vielä']);
    sb.tmAsetaKieli('sv');
    const sv = avaimet.map((k) => sb.t('mittarit.' + k));
    for (let i = 0; i < sv.length; i++) {
      expect(typeof sv[i]).toBe('string');
      expect(sv[i], avaimet[i]).not.toBe(fi[i]);   // aito käännös, ei fi-fallback
    }
  });
});

describe('REGRESSIO — henkilökunnan työkalut säilyttävät luvut', () => {
  it('VP: kehon valmius -profiili näyttää yhä kokonaisluvun (X / 100)', () => {
    expect(VP).toContain("<span class=\"flei-kokonais\">' + fleiPct + ' / 100</span>");
  });
  it('VP: ketjupalkin prosenttilaskenta ennallaan', () => {
    expect(VP).toContain("Math.round(((k[1]-1)/2)*100)");
  });
  it('VP: pelaajakortin Kehon valmius -rivi näyttää yhä arvon', () => {
    expect(VP).toContain("p.flei_viimeisin + ' / 100'");
  });
});

describe('DATA säilyy — vain näkyvä numero poistettiin', () => {
  it('pelaaja lukee yhä raaka-arvot (p.sbl…) ja laskee heikoimman', () => {
    const lohko = rTestitLohko().join('\n');
    expect(lohko).toContain('arvo: (p && p[a]) || 0');
    expect(lohko).toContain('[...chains].sort((a,b)=>a.arvo-b.arvo)[0]');
  });
});

describe('§7.22 — KOKO kehon valmius -näkymässä 0 näkyvää numeroa', () => {
  it('hero + ketjut yhdessä: yksikään näyttöön päätyvä teksti tai ${} ei tuota numeroa', () => {
    const lohko = rTestitLohko().join('\n');
    // vain KEHON VALMIUS -osio (ennen CMJ-osiota, joka on eri mittari)
    const osio = lohko.slice(0, lohko.indexOf('CMJ-TESTI') > 0 ? lohko.indexOf('CMJ-TESTI') : lohko.length);
    // >…<-heuristiikka nappaa myös JS-ilmaisuja (esim. `heikoin.arvo>0?\``), koska > ja <
    // esiintyvät koodissa. Suodatetaan pois kandidaatit joissa on JS-syntaksia — jäljelle jää
    // aito tekstisolmu. (Aito näkyvä luku, esim. "62 / 100", ei sisällä näitä merkkejä.)
    const jsRoska = (x) => /[`?=]|&&|\|\||\bvar\b|=>/.test(x);
    const tekstit = [...osio.matchAll(/>([^<>${}]+)</g)].map((m) => m[1].trim()).filter(Boolean).filter((x) => !jsRoska(x));
    expect(tekstit.filter((x) => /\d/.test(x))).toEqual([]);
    // Yhden rivin mittaiset ${}-ulostulot tekstipositiossa (monirivinen .map(...) on rakenne, ei arvo).
    const naytto = [...osio.matchAll(/>\s*(\$\{[^}\n]*\})/g)].map((m) => m[1]).filter((x) => !/\.map\(/.test(x));
    expect(naytto.length).toBeGreaterThan(0);   // ei-vacuous: skanneri löysi oikeasti ulostuloja
    for (const x of naytto) expect(x, x).not.toMatch(/toFixed|Math\.|\bflei\b|c\.arvo/);
  });
});

describe('EI-TYHJYYS — portti tunnistaa paluun lukuun', () => {
  it('jos toFixed-luku palautetaan ketjuriville, testi punertaa', () => {
    const lohko = ketjuLohko();
    const mutatoitu = lohko.replace(
      '<div style="display:flex;align-items:center;margin-bottom:4px">',
      '<div style="display:flex;align-items:center;margin-bottom:4px"><div>${c.arvo.toFixed(1)}</div>'
    );
    expect(mutatoitu).not.toBe(lohko);
    expect(mutatoitu).toContain('toFixed');   // ← juuri se mitä 1. testi kieltää
    const tekstit = [...mutatoitu.matchAll(/>\s*(\$\{[^}]*\})/g)].map((m) => m[1]);
    expect(tekstit.some((x) => /toFixed/.test(x))).toBe(true);
  });
});
