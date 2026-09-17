/**
 * TalentMaster™ — Rosterin jako joukkueisiin + pelaajahaku.
 *
 * Lähde (Sibbon valmennuspäällikkö): "Yhden joukkueen alla melkein 50 pelaajaa — liikaa.
 * Moni seura on jakanut pelaajat joukkueisiin pienemmiksi ryhmiksi. Pelaajahaku tärkeä."
 *
 * Tämä on TYÖKALU-, EI MALLIONGELMA: pelaajalla on jo joukkueet[] (monijäsenyys) ja
 * seurat/{sid}/joukkueet-kokoelma on olemassa. Puuttui bulk-siirto ja rajaus/haku.
 *
 *   A) LEGACY-SYNKKA — siirto kirjoittaa joukkueet[] JA joukkue (§18). Osan ainoa datakriittinen kohta.
 *   B) SIIRTO vs. LISÄYS — korvaa vs. union
 *   C) VALMENTAJAN VALITSIN — vain omat joukkueet, ei "kaikki"
 *   D) VP — rajaus on FOKUS, ei piilotus
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const S = readFileSync(join(ROOT, 'TalentMaster_Seura.html'), 'utf8');
const M = readFileSync(join(ROOT, 'TalentMaster_Master_v16.html'), 'utf8');
const V = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
const pala = (src, nimi, loppu) => {
  const i = src.indexOf('function ' + nimi + '(');
  expect(i, nimi).toBeGreaterThan(0);
  return src.slice(i, src.indexOf(loppu || '\n}', i) + 2);
};

describe('A — legacy-synkka: siirto kirjoittaa MOLEMMAT rakenteet', () => {
  const fn = pala(S, '_pelSiirraValitut', '\n}\n');
  it('kirjoittaa joukkueet[] JA legacy joukkue-nimen', () => {
    expect(fn).toMatch(/joukkueet: uudet/);
    expect(fn).toMatch(/joukkue: nimet\[0\]/);
    expect(fn).toMatch(/joukkueNimi: nimet\[0\]/);
    expect(fn).toMatch(/joukkueetNimet: nimet/);
  });
  it('MIKSI: valmentajan näkymä kyselee legacy-nimikentällä → ilman synkkaa pelaaja katoaisi', () => {
    // Premissi tarkistettu Masterista, ei oletettu.
    expect(M).toMatch(/where\('joukkue',\s*'==',\s*_joukkue\)/);
    expect(fn).toMatch(/LEGACY/);
  });
  it('aikaleima kuten muissa kirjoituksissa', () => {
    expect(fn).toMatch(/muokattu:\s*firebase\.firestore\.FieldValue\.serverTimestamp\(\)/);
  });
  it('kirjoittaa update():lla — ei luo puuttuvaa pelaajadokumenttia (#540:n linja)', () => {
    expect(fn).toMatch(/\.doc\(pid\)\.update\(/);
    expect(fn).not.toMatch(/\.set\([^)]*merge/);
  });
});

describe('B — siirto korvaa, lisäys yhdistää', () => {
  /* Sama laskenta kuin tuotannossa, luettuna lähteestä: testi ei saa keksiä rinnakkaista
     totuutta siitä mitä "siirto" ja "lisäys" tarkoittavat. */
  const laske = (tapa, vanhat, kohdeId) => {
    const sb = { tapa, vanhat, kohdeId, out: null };
    vm.createContext(sb);
    const rivi = pala(S, '_pelSiirraValitut', '\n}\n')
      .split('\n').filter((l) => l.includes('var uudet =') || l.includes('? [kohdeId]') || l.includes(': (vanhat.indexOf'))
      .join('\n').replace(/^\s*var uudet =/, 'out =');
    vm.runInContext('var out; ' + rivi + '; this.out = out;', sb);
    return sb.out;
  };
  it('siirto KORVAA vanhat', () => {
    expect(laske('siirto', ['u13_a', 'u13_b'], 'u13_musta')).toEqual(['u13_musta']);
  });
  it('lisäys YHDISTÄÄ (monijäsenyys säilyy)', () => {
    expect(laske('lisays', ['u13_a'], 'u13_musta')).toEqual(['u13_a', 'u13_musta']);
  });
  it('lisäys on idempotentti — sama joukkue ei tuplaannu', () => {
    expect(laske('lisays', ['u13_a', 'u13_musta'], 'u13_musta')).toEqual(['u13_a', 'u13_musta']);
  });
  it('siirto joukkueettomalle pelaajalle toimii', () => {
    expect(laske('siirto', [], 'u13_musta')).toEqual(['u13_musta']);
  });
});

describe('C — valmentajan joukkuevalitsin', () => {
  const fn = pala(M, '_rakennaValmentajaJoukkueValitsin', '\n}\n');
  it('näkyy vasta ≥2 joukkueella — yhdellä se olisi turha kontrolli', () => {
    expect(fn).toMatch(/nimet\.length < 2\) return/);
  });
  it('EI "kaikki joukkueet" -vaihtoehtoa: se lataisi koko seuran möykyn', () => {
    expect(fn).not.toMatch(/Kaikki joukkueet/);
    expect(pala(M, '_rakennaSAJoukkueValitsin', '\n}\n')).toMatch(/Kaikki joukkueet/);   // SA:lla on, ei-vacuous
  });
  it('valinta muistetaan ja rosteri ladataan uudelleen', () => {
    expect(fn).toMatch(/localStorage\.setItem\('tm-valm-joukkue'/);
    expect(fn).toMatch(/_lataaPelaajat\(\)/);
    expect(fn).toMatch(/_paivitaKaikkiNakymat\(\)/);
  });
  it('lähteet kattavat molemmat rakenteet (§18) + nykyisen joukkueen', () => {
    const n = pala(M, '_valmentajanJoukkueNimet', '\n}\n');
    ['joukkueetNimet', 'joukkueet', 'd.joukkue', '_joukkue'].forEach((k) => expect(n, k).toContain(k));
    expect(n).toMatch(/normalisioiJoukkue/);   // 'sjk_p14' ja 'SJK P14' eivät saa olla kaksi eri joukkuetta
  });
  it('kutsutaan kirjautumisen jälkeen kun valmentajadata on luettu', () => {
    const i = M.indexOf('window._valmentajaData = d;');
    const j = M.indexOf('_rakennaValmentajaJoukkueValitsin();');
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
  });
  it('pelaajahaku on valmentajan PÄÄlistassa (ei vain yhdessä pickerissä)', () => {
    expect(M).toMatch(/id="pelHaku"/);
    expect(M).toMatch(/_suodataPelaajat\(this\.value\)/);
    expect(M).toMatch(/id="playerPicker"/);
  });
});

describe('D — VP: rajaus on fokus, ei piilotus', () => {
  const fn = pala(V, 'renderPelaajatFiltered', '\n}\n');
  it('rajaus ajetaan signaalisuodattimen PÄÄLLE (AND), ei sen sijaan', () => {
    const iSig = fn.indexOf("_activeFilter === 'erityistuki'");
    const iJoukkue = fn.indexOf('_vpPelJoukkue) filtered = filtered.filter');
    expect(iSig).toBeGreaterThan(0);
    expect(iJoukkue).toBeGreaterThan(iSig);
  });
  it('haku kattaa nimen, numeron ja joukkueen', () => {
    expect(fn).toMatch(/_tmHenkiloNimi\(p\)/);
    expect(fn).toMatch(/p\.numero/);
    expect(fn).toMatch(/p\.joukkue/);
  });
  it('haku debounceataan (≈200 riviä + badget uudelleen joka näppäimellä)', () => {
    expect(pala(V, '_vpPelHaku', '\n}\n')).toMatch(/clearTimeout[\s\S]*setTimeout/);
  });
  it('rajattu tyhjä tila on ERI kuin "ei pelaajia kategoriassa"', () => {
    expect(fn).toMatch(/Ei osumia näillä rajauksilla\./);
    expect(fn).toMatch(/Ei pelaajia tässä kategoriassa/);
  });
  it('laskuri kertoo rajauksen: n / kaikki', () => {
    expect(fn).toMatch(/_ennenRajausta/);
  });
  it('valitsin täytetään LADATUSTA datasta (ei tyhjiä joukkueita)', () => {
    expect(pala(V, '_vpPelTaytaJoukkueValitsin', '\n}\n')).toMatch(/_pelaajat \|\| \[\]\)\.map\(p => p\.joukkue\)/);
  });
});
