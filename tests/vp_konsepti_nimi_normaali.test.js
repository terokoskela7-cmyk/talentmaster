/* Konseptin näyttönimi (VP): _vpKonseptiNimiNimella + _vpKonseptiNimiNormaali ajetaan oikeasta VP-lähteestä vm-sandboxissa oikealla kaanonilla ja MASTER-sidecarilla (ei uusia sv-tekstejä).
   Lukitsee: isoilla kirjoitettu osa → normaali kirjoitusasu; sulkeissa oleva (englanninkielinen) termi säilyy; fi-tila ennallaan; kaikki 14 y_h/y_p-nimeä + sekakirjaimiset (j_h6, j_s1, la_h4). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const VP = teksti('TalentMaster_VP_v25.html');
const MASTER = JSON.parse(teksti('docs/i18n/curriculum_kaannettava.sv.MASTER.json'));
const { normaali } = require('../scripts/i18n_vie_sv_era102.cjs');

function funktio(nimi) {   // koko funktio-lohko sulkeiden täsmäyksellä
  const alku = VP.indexOf('function ' + nimi + '('); if (alku < 0) throw new Error(nimi);
  let syv = 0;
  for (let k = VP.indexOf('{', alku); k < VP.length; k++) { if (VP[k] === '{') syv++; else if (VP[k] === '}' && --syv === 0) return VP.slice(alku, k + 1); }
  throw new Error('loppua ei löydy: ' + nimi);
}
function ymparisto(kieli) {
  const sb = { console, tmNykyinenKieli: () => kieli }; sb.window = sb; vm.createContext(sb);
  for (const f of ['lib/tm_teknistaktiset.js', 'lib/tm_konsepti_resolve.js', 'lib/tm_teknistaktiset_sv.js']) vm.runInContext(teksti(f), sb);
  vm.runInContext(['_vpTaksLang', '_ttSvKartta', '_vpKonseptiNimiNormaali', '_vpKonseptiNimiNimella'].map(funktio).join('\n') + '\nvar _vpKnNimellaKartta = null;', sb);
  return sb;
}
const SV = ymparisto('sv'), FI = ymparisto('fi');
const AVAIMET14 = [...Array(10).keys()].map((n) => 'y_h' + n).concat([1, 2, 3, 4].map((n) => 'y_p' + n));
const fiNimi = (a) => FI.tmKonseptiKaanon(a).nimi;

describe('_vpKonseptiNimiNimella — kaikki 14 y_h/y_p-nimeä', () => {
  it('kaanonissa jokaisella on fi-nimi ja MASTER-sv', () => { for (const a of AVAIMET14) { expect(fiNimi(a), a).toBeTruthy(); expect(MASTER[a + '.nimi'], a).toBeTruthy(); } });
  it('fi-tila: nimi sellaisenaan', () => { for (const a of AVAIMET14) expect(FI._vpKonseptiNimiNimella(fiNimi(a)), a).toBe(fiNimi(a)); });
  it('sv-tila: MASTER normaalilla kirjoitusasulla (lukittu)', () => {
    const odotus = { y_h0: 'Orientering och avläsning', y_h1: 'Mottagning', y_h2: 'Passningsspel', y_h3: 'Tempodrivning', y_h4: 'Finter och utmaningar', y_h5: 'Bolltäckning', y_h6: 'Erbjuda understöd', y_h7: 'Frigörelse från markering', y_h8: 'Spel på bredd och djup', y_h9: 'Avslut',
      y_p1: '1v1-försvarsspel', y_p2: 'Markering', y_p3: 'Understöd i försvarsspel', y_p4: 'Försvara yta och överlämning av markering' };
    for (const a of AVAIMET14) expect(SV._vpKonseptiNimiNimella(fiNimi(a)), a).toBe(odotus[a]);
  });
});

describe('sekakirjaimiset ja sulkeita sisältävät nimet', () => {
  it('lukittu: isoilla kirjoitettu osa normaaliksi, sulkeissa oleva säilyy sellaisenaan', () => {
    const odotus = { j_h6: 'Defensiv vaksamhet under anfallsspel (rest defence)', j_s1: 'Omställning från anfall till försvar (återerövringspress vid bolltapp)', la_h4: '1v1 och att skapa övertag' };
    for (const [a, o] of Object.entries(odotus)) { expect(MASTER[a + '.nimi'], a).toBeTruthy(); expect(SV._vpKonseptiNimiNimella(fiNimi(a)), a).toBe(o); expect(FI._vpKonseptiNimiNimella(fiNimi(a)), a).toBe(fiNimi(a)); }
  });
  it('normalisoija: normaali teksti ei muutu, sulkeet säilyvät, ensimmäinen kirjain isoksi', () => {
    const N = SV._vpKonseptiNimiNormaali;
    expect(N('Målvakt')).toBe('Målvakt'); expect(N('MOTTAGNING')).toBe('Mottagning'); expect(N('Spel (EN TERM)')).toBe('Spel (EN TERM)'); expect(N('Del (X) och (Y)')).toBe('Del (X) och (Y)');
    expect(N('FÖRSVAR (press) OCH ANFALL')).toBe('Försvar (press) och anfall');
  });
  it('kaikki 116 MASTER-nimeä sv-tilassa: ei jää kokonaan isoksi (ei sulkeiden ulkopuolella isoja sanoja), eikä sulkeiden sisältö muutu', () => {
    const nimet = Object.entries(MASTER).filter(([k]) => /\.nimi$/.test(k) && !k.startsWith('pelipaikka.'));
    expect(nimet.length).toBeGreaterThanOrEqual(100);
    for (const [k, v] of nimet) {
      const r = SV._vpKonseptiNimiNormaali(v), ulko = r.replace(/\([^)]*\)/g, '');
      expect(ulko === ulko.toUpperCase() && ulko !== ulko.toLowerCase() && ulko.replace(/[^A-ZÅÄÖ]/g, '').length > 1, k + ': ' + r).toBe(false);
      expect(r.match(/\([^)]*\)/g) || [], k).toEqual(v.match(/\([^)]*\)/g) || []);
      expect(r, k).toBe(normaali(v));   // vientiskriptin kopio samaa logiikkaa (sn_y_* -vertailu)
    }
  });
});
