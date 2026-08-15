/**
 * TalentMaster™ — R5.3: Kuorma-viimeistely (R5.2:n 2 avointa havaintoa).
 * (1) Nauhan monisessio-merkki "· N sessiota" → valmentaja näkee että palkki on monen session summa.
 * (2) Tuplalaskenta-vartija: kun rivi näyttää PELAAJAN session (ei valmentaja-sessiota), valmentajan tallennus KORVAA
 *     sen (rivilahdeSk) — EI luo uutta 'valmentaja'-kopiota pelaajan arvoilla → ei tuplalaskentaa.
 * Summauslogiikka (_vpViikkoPaivaAU/_vpViikkoMergeSessio/_vpViikkoSessioSk) KOSKEMATON.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

function extract(sig) {
  const lines = HTML.split('\n');
  const s = lines.findIndex((l) => l.includes(sig));
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}

describe('(1) nauhan monisessio-merkki', () => {
  it('_vpViikkoNauhaHTML: nLoad (kuormaa tuottavat sessiot) + "· N sessiota" kun >1 (ei Oura-koodauksen muutosta)', () => {
    const N = extract('function _vpViikkoNauhaHTML(p, st) {');
    expect(N).toContain('const nLoad = (row.sessiot || []).filter(function (s) { return _vpViikkoSrpe(s.rpe, s.kesto_min) > 0; }).length;');
    expect(N).toContain("(nLoad > 1) ?");
    expect(N).toContain("' sessiota</div>'");
    expect(N).toContain('+ src + multi + ftag + bar');   // mountattu Oura-korttiin muuttamatta väri/muoto-koodausta
  });
});

describe('(2) tuplalaskenta-vartija — hydraatio + tallennus', () => {
  it('_vpViikkoLataa: row.rivilahdeSk = näytetyn session avain (valmentaja tai pelaaja)', () => {
    expect(HTML).toContain("row.rivilahdeSk = sess ? _vpViikkoSessioSk(sess) : 'valmentaja';");
  });
  it('_vpViikkoTallennaRivi: kirjoittaa rivin ESITTÄMÄÄN sessioon (rivilahdeSk), ei aina valmentaja-kopiota', () => {
    expect(HTML).toContain("const _rsk = row.rivilahdeSk || 'valmentaja';");
    expect(HTML).toContain('const sessio = { sk: _rsk,');
    expect(HTML).not.toContain("const sessio = { sk: 'valmentaja',");   // R5.2:n kova 'valmentaja' korvattu
  });
  it('init-oletus sisältää rivilahdeSk + sessiot', () => {
    expect(HTML).toContain("sessiot: [], rivilahdeSk: 'valmentaja'");
  });
});

describe('summauslogiikka KOSKEMATON (R5.2:n helperit ennallaan)', () => {
  it('_vpViikkoPaivaAU / _vpViikkoMergeSessio / _vpViikkoSessioSk säilyvät', () => {
    expect(HTML).toContain('function _vpViikkoPaivaAU(row) {');
    expect(HTML).toContain('function _vpViikkoMergeSessio(existing, sessio) {');
    expect(HTML).toContain('function _vpViikkoSessioSk(s) {');
  });
});

describe('SKENAARIO suoritettuna: valmentaja vahvistaa pelaajan session → EI tuplalaskentaa', () => {
  let SK, MERGE, AU;
  beforeAll(() => {
    const src = extract('function _vpViikkoSrpe(rpe, kesto) {').split('\n')[0] + '\n'
      + extract('function _vpViikkoSessioSk(s) {').split('\n')[0] + '\n'
      + extract('function _vpViikkoMergeSessio(existing, sessio) {') + '\n'
      + extract('function _vpViikkoPaivaAU(row) {') + '\n'
      + 'return { SK:_vpViikkoSessioSk, MERGE:_vpViikkoMergeSessio, AU:_vpViikkoPaivaAU };';
    const r = new Function(src)();
    SK = r.SK; MERGE = r.MERGE; AU = r.AU;
  });
  it('päivällä VAIN pelaajan sessio → rivilahdeSk = pelaajan avain → tallennus korvaa (1 sessio, ei 300)', () => {
    const player = { sk: 'pelaaja:T', lahde: 'pelaaja', tyyppi: 'T', rpe: 5, kesto_min: 30 };   // 150 AU
    const rivilahdeSk = SK(player);
    expect(rivilahdeSk).toBe('pelaaja:T');
    // R5.3 — valmentaja tallentaa rivin: sessio.sk = rivilahdeSk → merge KORVAA pelaajan session
    const coachSave = MERGE([player], { sk: rivilahdeSk, lahde: 'pelaaja', rpe: 5, kesto_min: 30 });
    expect(coachSave).toHaveLength(1);         // ei duplikaattia
    expect(AU({ sessiot: coachSave })).toBe(150);   // yksinkertainen kuorma, EI tuplaa
  });
  it('OLD-bugi dokumentoituna: sk="valmentaja" olisi tuottanut 2 sessiota = 300 (tuplalaskenta)', () => {
    const player = { sk: 'pelaaja:T', lahde: 'pelaaja', tyyppi: 'T', rpe: 5, kesto_min: 30 };
    const bug = MERGE([player], { sk: 'valmentaja', rpe: 5, kesto_min: 30 });   // R5.2:n käytös tässä reunatapauksessa
    expect(bug).toHaveLength(2);
    expect(AU({ sessiot: bug })).toBe(300);    // ← juuri tämä tuplalaskenta korjattiin
  });
  it('YLEISTAPAUS ennallaan: valmentajan tiimisessio + pelaajan oma → 2 sessiota summautuvat (ei muutu)', () => {
    const coach = { sk: 'valmentaja', rpe: 6, kesto_min: 75 };   // 450
    const player = { sk: 'pelaaja:T', lahde: 'pelaaja', rpe: 5, kesto_min: 30 };   // 150
    // valmentajan rivi rivilahdeSk='valmentaja' → päivittää omaansa, pelaaja säilyy
    const after = MERGE([coach, player], { sk: 'valmentaja', rpe: 7, kesto_min: 80 });   // 560
    expect(after).toHaveLength(2);
    expect(AU({ sessiot: after })).toBe(560 + 150);
  });
});
