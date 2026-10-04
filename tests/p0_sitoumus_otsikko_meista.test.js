/**
 * Pelaaja-app V2 · Vaihe 0 · P0.1 + P0.2
 *  P0.1 Sitoumuskortin otsikko = jakson nimi (vanha "Sinun äänesi & sitoumus" pieneksi yläotsikoksi; ei jaksoa → vanha otsikko).
 *  P0.2 Meistä-paikkamerkki ("Sisältö tulossa" · "Vaihe B3") ei näy pelaajalle.
 * Funktiot PURETAAN LÄHTEESTÄ ja AJETAAN (vm); tynkien nimet = tuotannon nimet.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');
function pura(tunniste) {
  const i = HTML.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = HTML.indexOf('{', i); k < HTML.length; k++) { if (HTML[k] === '{') syv++; else if (HTML[k] === '}') { syv--; if (!syv) return HTML.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const esc = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function sitoumus({ fokus, sit = {}, vanhentunut = false, alkoi = null } = {}) {
  const sb = {
    _pelaaja: { jaksofokus: fokus ? { konsepti_nimi: fokus } : null }, _p7Tavoite: null,
    window: { _p7Sitoumus: sit }, localStorage: { getItem: () => null },
    _p7SitoumusRekisteri: () => ({ q1: 'K1', q2: 'K2', q3: 'K3' }), _p7Vanhentunut: () => vanhentunut,
    _p7SitoumusPvmFi: (x) => (x ? '1.10.2026' : ''), _p7JaksoAlkoi: () => alkoi, _thEsc: esc,
  };
  vm.createContext(sb); vm.runInContext(pura('function rMinaSitoumus()') + '\nthis.f = rMinaSitoumus;', sb);
  return sb.f();
}

describe('P0.1 sitoumuskortin otsikko = jakson nimi', () => {
  it('jakso asetettu → otsikkona jakson nimi isolla, "Sinun äänesi & sitoumus" yläotsikkona', () => {
    const h = sitoumus({ fokus: 'Pujottelu & kuljetus' });
    const iNimi = h.indexOf('Pujottelu &amp; kuljetus'), iYla = h.indexOf('Sinun äänesi &amp; sitoumus'.replace('&amp;', '&'));
    expect(iNimi).toBeGreaterThan(-1); expect(iYla).toBeGreaterThan(-1);
    expect(iYla).toBeLessThan(iNimi);                                   // yläotsikko ensin, jakson nimi otsikkona
    expect(h).toMatch(/font-size:20px[^>]*>Pujottelu &amp; kuljetus<\/div>/);
    expect(h).not.toContain('Tälle jaksolle:');                         // nimi ei toistu rivinä
    expect(h).not.toContain('Jaksofokus:');
  });
  it('uusi jakso (vanhentunut): nimi otsikkona, alkamispäivä omalla rivillä; ei jaksoa → vanha otsikko + lempeä tyhjä tila', () => {
    const v = sitoumus({ fokus: 'Syöttö', vanhentunut: true, alkoi: '2026-10-01', sit: { jakso_alkoi: '2026-08-01', fokus_nimi: 'Vanha' } });
    expect(v).toMatch(/font-size:20px[^>]*>Syöttö<\/div>/); expect(v).toContain('📍 Alkoi 1.10.2026'); expect(v).not.toContain('Jaksofokus:');
    const e = sitoumus({});
    expect(e).toContain('🤝 Sinun äänesi & sitoumus</div>'); expect(e).toContain('Kun sinulle asetetaan jaksofokus'); expect(e).not.toMatch(/font-size:20px/);
  });
});

describe('P0.2 Meistä-paikkamerkki piiloon', () => {
  it('rMeista ei renderöi "Sisältö tulossa" / "Vaihe B3"; Valmentajalta-osio ja otsikko säilyvät', () => {
    const sb = { hdr: (x) => '[HDR ' + x + ']', T: (k) => k, rValmentajalta: () => '[VALMENTAJALTA]' };
    vm.createContext(sb); vm.runInContext(pura('function rMeista()') + '\nthis.f = rMeista;', sb);
    const h = sb.f();
    expect(h).toContain('[HDR meista]'); expect(h).toContain('[VALMENTAJALTA]');
    expect(h).not.toContain('Sisältö tulossa'); expect(h).not.toContain('Vaihe B3');
  });
  it('lähteessä ei paikkamerkkitekstejä missään renderissä', () => {
    expect(HTML).not.toMatch(/Sisältö tulossa<\/div>/); expect(HTML).not.toContain('Joukkue, valmentajat, kalenteri — Vaihe B3');
  });
});
