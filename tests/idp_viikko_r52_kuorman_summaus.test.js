/**
 * TalentMaster™ — R5.2: Kuorman koostaminen — kaikki päivän sessiot summautuvat.
 * Juurisyy: kirjaukset/{pvm}.sessiot[] kirjoitettiin set({merge:true})-setillä → Firestore korvaa arrayn (arrayt eivät
 * mergeydy) → joukkueharjoitus + pelaajan oma sessio eivät summautuneet (viimeisin kirjoittaja voitti) → sRPE+ACWR aliarvio.
 * Fix: sessio-avain (sk) + read-modify-write molemmissa kirjoittajissa (VP valmentaja + Pelaaja_v7) → kaikki sessiot summautuvat.
 * Invariantti: sRPE johdetaan (rpe×kesto), EI tallenneta. §7.22: pelaaja ei näe ACWR:ää.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');
const PELAAJA = readFileSync(join(__dir, '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const SW = readFileSync(join(__dir, '..', 'sw_pelaaja.js'), 'utf8');

function extract(sig) {
  const lines = HTML.split('\n');
  const s = lines.findIndex((l) => l.includes(sig));
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}

describe('summaus-logiikka suoritettuna (sk + merge + päivän AU)', () => {
  let SK, MERGE, AU, SRPE;
  beforeAll(() => {
    const src = extract('function _vpViikkoSrpe(rpe, kesto) {').split('\n')[0] + '\n'   // yksirivinen
      + extract('function _vpViikkoSessioSk(s) {').split('\n')[0] + '\n'
      + extract('function _vpViikkoMergeSessio(existing, sessio) {') + '\n'
      + extract('function _vpViikkoPaivaAU(row) {') + '\n'
      + 'return { SK:_vpViikkoSessioSk, MERGE:_vpViikkoMergeSessio, AU:_vpViikkoPaivaAU, SRPE:_vpViikkoSrpe };';
    const r = new Function(src)();
    SK = r.SK; MERGE = r.MERGE; AU = r.AU; SRPE = r.SRPE;
  });
  it('sk: valmentaja → "valmentaja" · pelaaja → "pelaaja:"+tyyppi', () => {
    expect(SK({ lahde: 'valmentaja', tyyppi: 'treeni' })).toBe('valmentaja');
    expect(SK({ lahde: 'pelaaja', tyyppi: 'T' })).toBe('pelaaja:T');
    expect(SK({ sk: 'valmentaja', lahde: 'pelaaja' })).toBe('valmentaja');   // eksplisiittinen sk voittaa
  });
  it('merge säilyttää muut sessiot, korvaa saman sk:n (idempotentti)', () => {
    const coach = { sk: 'valmentaja', rpe: 6, kesto_min: 75 };
    const playerT = { sk: 'pelaaja:T', lahde: 'pelaaja', tyyppi: 'T', rpe: 5, kesto_min: 30 };
    let sessiot = MERGE([coach], playerT);
    expect(sessiot).toHaveLength(2);                       // molemmat säilyvät
    sessiot = MERGE(sessiot, { sk: 'valmentaja', rpe: 7, kesto_min: 80 });   // valmentaja päivittää omaansa
    expect(sessiot).toHaveLength(2);                       // ei duplikaattia, pelaaja säilyy
    expect(sessiot.find((s) => s.sk === 'valmentaja').rpe).toBe(7);
    expect(sessiot.find((s) => s.sk === 'pelaaja:T').rpe).toBe(5);
  });
  it('KUORMAN KOOSTAMINEN: päivän AU = kaikkien sessioiden sRPE-summa (juurisyy korjattu)', () => {
    // joukkueharjoitus (6×75=450) + pelaajan oma T (5×30=150) + pelaajan S (4×20=80) = 680
    const sessiot = [
      { sk: 'valmentaja', rpe: 6, kesto_min: 75 },
      { sk: 'pelaaja:T', rpe: 5, kesto_min: 30 },
      { sk: 'pelaaja:S', rpe: 4, kesto_min: 20 }
    ];
    expect(AU({ sessiot: sessiot })).toBe(450 + 150 + 80);
    // fallback: ei sessiot-dataa → litteä rpe/kesto (backward-compat)
    expect(AU({ rpe: 6, kesto_min: 75 })).toBe(450);
    // ilman rpe:tä → sRPE 0 (johdettu, korrekti)
    expect(AU({ sessiot: [{ sk: 'pelaaja:T', kesto_min: 40 }] })).toBe(0);
  });
});

describe('VP-kirjoitus/luku (RMW + summa)', () => {
  it('_vpViikkoTallennaRivi: sessio-sk (R5.3: rivilahdeSk, oletus valmentaja) + RMW sulautus (ei array-clobber)', () => {
    expect(HTML).toContain('const sessio = { sk: _rsk,');           // R5.3 — rivilahdeSk (oletus 'valmentaja')
    expect(HTML).toContain("const _rsk = row.rivilahdeSk || 'valmentaja';");
    expect(HTML).toContain('data.sessiot = _vpViikkoMergeSessio((snap.data() || {}).sessiot, sessio);');
  });
  it('_vpViikkoLataa: säilyttää kaikki sessiot + muokattava rivi = valmentaja-sessio', () => {
    const L = HTML.slice(HTML.indexOf('async function _vpViikkoLataa'), HTML.indexOf('async function _vpViikkoLataa') + 1400);
    expect(L).toContain('row.sessiot = Array.isArray(d.sessiot) ? d.sessiot : [];');
    expect(L).toContain("row.sessiot.find(function (s) { return _vpViikkoSessioSk(s) === 'valmentaja'; })");
  });
  it('kuorma + nauha käyttävät _vpViikkoPaivaAU:ta (päivän kokonaiskuorma)', () => {
    expect(HTML).toContain('au: _vpViikkoPaivaAU(r)');       // kuorma-block sRPE-palkit
    expect(HTML).toContain('const au = _vpViikkoPaivaAU(row);');   // nauhan palkki
    expect(HTML).toContain('return Math.max(m, _vpViikkoPaivaAU(r));');   // srpeMax
  });
});

describe('Pelaaja_v7-kirjoitus (pelaajan rasitus omaksi sessioksi, RMW)', () => {
  it('pelaajan sessio sk="pelaaja:"+tyyppi + RMW säilyttää valmentajan sessiot', () => {
    expect(PELAAJA).toContain("const _sk = 'pelaaja:' + tyyppi;");
    expect(PELAAJA).toContain('kirjausData.sessiot = _existing.filter(function (s) { return _skOf(s) !== _sk; }).concat([_sessioP]);');
    expect(PELAAJA).toContain("lahde: 'pelaaja'");
  });
  it('§7.22: pelaaja näkee oman rasituksensa, EI ACWR/kuormarankingia (kommentti-invariantti)', () => {
    expect(PELAAJA).toContain('EI ACWR-lukua/kuormarankingia');
  });
  it('invariantti: sRPE johdetaan (rpe×kesto), EI tallenneta — sessioon ei kirjoiteta srpe-kenttää', () => {
    const seg = PELAAJA.slice(PELAAJA.indexOf('const _sessioP ='), PELAAJA.indexOf('const _sessioP =') + 220);
    expect(seg).not.toContain('srpe');
    expect(seg).toContain('rpe:');
    expect(seg).toContain('kesto_min:');
  });
});

describe('SW-cache-versio nostettu (§27, Pelaaja-app HTML muuttui)', () => {
  it('tm-pelaaja-v10 tai uudempi (K5a nosti → v11)', () => {
    expect(SW).toMatch(/const CACHE = 'tm-pelaaja-v(1[0-9]|[2-9][0-9])';/);   // ≥v10 (R5.2 v10, K5a v11)
    expect(SW).not.toContain("'tm-pelaaja-v9'");
  });
});
