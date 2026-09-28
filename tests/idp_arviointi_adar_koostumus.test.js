/**
 * TalentMaster™ — R3.B: D4 Peliäly ADAR-koostumuslohko (v3 "koostumus näkyviin").
 * Read-only näkymä: reuse p.adar_viimeisin (a/d/ac/r 1–3) + tmAdarIkaTier-ikäportti. EI autosavea.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');
/* OIKEA lib, ei tynkää: portaan ja bändin on tultava samasta lähteestä kuin tuotannossa,
   muuten testi voisi olla vihreä vaikka VP ja valmentajan sovellus näyttävät eri asiaa. */
const LIB = createRequire(import.meta.url)('../lib/tm_pelialy_yksilo.js');

function extract(sig) {
  const lines = HTML.split('\n');
  const s = lines.findIndex((l) => l.includes(sig));
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}

let AK;
beforeAll(() => {
  /* Libin symbolit annetaan PARAMETREINA, jotta lohko näkee ne samoina kuin selaimessa. */
  const tehdas = new Function(
    'tmAdarIkaPorras', 'tmAdarBand', 'TM_ADAR_NIMET', 'TM_ADAR_PORTAAT',
    'var vpT = function(x){return x;};\n' +
    'var _jsvEsc = function(s){return String(s==null?"":s);};\n' +
    'var _pvmLyhyt = function(s){return "1.6.2025";};\n' +
    'var _seuraId = "kpv";\n' +
    'var window = { _tmIBtn: function(){ return "<span class=\\"ibtn\\">ⓘ</span>"; } };\n' +
    'var _vpRistiinarvio = function(p){ return "<div class=\\"jsp-ristiin\\">Yhtenevyys</div>"; };\n' +
    extract('function _vpArvAdarKoostumusHTML(p, ika) {') + '\n return { ak: _vpArvAdarKoostumusHTML };'
  );
  AK = tehdas(LIB.tmAdarIkaPorras, LIB.tmAdarBand, LIB.TM_ADAR_NIMET, LIB.TM_ADAR_PORTAAT).ak;
});

/* 2A-SIIRTYMÄ: lohko näytti vielä nimiä "Havaitse/Päätä/Toimi/Arvioi", ikäportin
   `tmAdarIkaTier` ja tekstin "avautuu 16 v" — valmentajan sovellus oli jo portaissa, joten
   sama pelaaja näytti VP:lle ja valmentajalle eri asiaa. Testit ajavat yhä AIDON funktion,
   mutta odottavat porrasmallia. */
describe('ADAR-koostumus — 4 osaa + porras', () => {
  it('U13 (13) ilman tallennettua porrasta: ikäsuositus porras 3, Palautuminen lukossa', () => {
    const h = AK({ adar_viimeisin: { a: 3, d: 2, ac: 3, r: 2, yht: 2.6, pvm: '2025-06-01' } }, 13);
    expect(h).toContain('D4 Peliäly · pelihavainnosta · 1–3');
    expect(h).toContain('Porras 3 / 4');
    ['Havainnointi', 'Päätös', 'Toteutus', 'Palautuminen'].forEach((n) => expect(h).toContain(n));
    expect(h).toContain('jsp-adar-row locked');       // Palautuminen lukossa portaalla 3
    expect(h).toContain('porras 4');                  // lukittu rivi kertoo portaan
    expect(h, 'ikäportin kieli ei saa palata').not.toContain('avautuu 16 v');
    expect(h).not.toContain('U13-portti');
    expect(h).not.toContain('Havaitse');
  });
  it('TALLENNETTU porras voittaa iän (12-vuotias portaalla 4 saa kaikki)', () => {
    const h = AK({ havainto_porras: 4, adar_viimeisin: { a: 3, d: 2, ac: 3, r: 2, yht: 2.5 } }, 12);
    expect(h).toContain('Porras 4 / 4');
    expect(h).not.toContain('jsp-adar-row locked');
  });
  it('U16 (16): kaikki 4 aktiivista (ei lukittua)', () => {
    const h = AK({ adar_viimeisin: { a: 3, d: 2, ac: 3, r: 2, yht: 2.5 } }, 16);
    expect(h).not.toContain('jsp-adar-row locked');
    expect(h).not.toContain('avautuu 16 v');
  });
  it('TIKKAAT näyttävät avautuneet askeleet', () => {
    const h = AK({ havainto_porras: 2, adar_viimeisin: { a: 3, d: 1 } }, 11);
    expect(h).toContain('jsp-adar-ladder');
    expect((h.match(/<i class="on"><\/i>/g) || []).length, 'kaksi askelta auki portaalla 2')
      .toBeGreaterThanOrEqual(2);
  });
  it('UUSI PORRAS merkitään vain tallennetulla portaalla ja alle 3 havainnolla', () => {
    const nostettu = { havainto_porras: 2, havainto_porras_ehdotus: { hist: [1] },
      adar_viimeisin: { a: 3, d: 1 } };
    expect(AK(nostettu, 11)).toContain('uusi porras');
    const vakiintunut = { havainto_porras: 2, havainto_porras_ehdotus: { hist: [2, 2, 3] },
      adar_viimeisin: { a: 3, d: 2 } };
    expect(AK(vakiintunut, 11), 'vakiintunut ulottuvuus ei ole enää uusi').not.toContain('uusi porras');
  });
  it('HAVAINNOT-linkki avaa historian', () => {
    const h = AK({ adar_havaintoja: 6, adar_viimeisin: { a: 3 } }, 13);
    expect(h).toContain('jsp-hh-link');
    expect(h).toContain('Havainnot · 6');
  });
  it('scale3: arvo 3 → 3 täyttä (teal) · arvo 2 → low-luokka (amber) + av-teksti', () => {
    const h = AK({ adar_viimeisin: { a: 3, d: 2, ac: 3, r: 2 } }, 16);
    expect(h).toContain('jsp-scale3 low');       // Päätös 2/3 → low
    expect(h).toContain('<b>3</b>/3 · hallitsee');
    expect(h).toContain('<b>2</b>/3 · kehittyvä');
  });
  it('Kokonais-summa aktiivisista osista (U16 kaikki 4: 3+2+3+2 = 10/12)', () => {
    expect(AK({ adar_viimeisin: { a: 3, d: 2, ac: 3, r: 2 } }, 16)).toContain('Kokonais <b style="color:var(--ink2)">10/12</b>');
  });
  it('ei ADAR-dataa → tyhjätila-CTA (ent. f3:n empty-state konsolidoitu; entry point EI häviä)', () => {
    const h = AK({}, 13);
    expect(h).toContain('Ei pelihavaintoja');
    expect(h).toContain('Lisää pelihavainto');   // add-CTA
    expect(h).not.toContain('jsp-adar-row');      // ei osarivejä ilman dataa
  });

  it('R3.B-korjaus: f3:n arvokkaat osat taitettu (ristiinarvio + add-CTA + ⓘ) — ei hukata', () => {
    const h = AK({ adar_viimeisin: { a: 3, d: 2, ac: 3, r: 2 } }, 16);
    expect(h).toContain('jsp-ristiin');            // _vpRistiinarvio taitettu sisään
    expect(h).toContain('Lisää pelihavainto');     // add-CTA
    expect(h).toContain('ibtn');                   // ⓘ header
  });
});

describe('kytkentä _vpArviointiHTML:ään (v3-järjestys)', () => {
  it('ADAR-koostumus renderöidään ENNEN D3-kalibraatiota', () => {
    const iAdar = HTML.indexOf('_vpArvAdarKoostumusHTML(p, ika)');
    const iD3 = HTML.indexOf('_vpD3KalibraatioHTML(p);');
    expect(iAdar).toBeGreaterThan(0);
    expect(iAdar).toBeLessThan(iD3);
  });
  /* Lohko on LUKUNÄKYMÄ: ei inline-käsittelijöitä eikä automaattitallennusta. Navigointi-CTA
     ("Lisää pelihavainto") on sallittu, mutta se kulkee delegoidun kuuntelijan kautta — inline
     onclick tässä olisi ensimmäinen askel kohti kirjoittavaa kontrollia lukulohkossa. */
  it('read-only: ei onclick/autosavea koostumuslohkossa', () => {
    /* Kommentit riisutaan: sääntöä KUVAAVA kommentti ei saa punertaa vartijaa, joka valvoo
       koodia. Ilman riisuntaa vartija rankaisisi juuri siitä, että sääntö on kirjattu. */
    const T = extract('function _vpArvAdarKoostumusHTML(p, ika) {')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    expect(T).not.toContain('onclick');
    expect(T).not.toContain('tallentu');
  });

  it('EI VACUOUS: riisunta ei tyhjennä lohkoa — koodi on yhä tarkistettavana', () => {
    const T = extract('function _vpArvAdarKoostumusHTML(p, ika) {')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    expect(T).toContain('jsp-ph-cta');          // navigointi-CTA on yhä lohkossa
    expect(T.length).toBeGreaterThan(400);
  });
});
