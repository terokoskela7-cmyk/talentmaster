/**
 * IDP-yhdistäminen PR A (docs/IDP_YHDISTAMINEN.md §3.1): Seurahallinnan IDP-nappi → VP_v25:n pelaajan
 * työpöytä Kehitys-välilehdelle URL-sisääntulolla ?seura=&pelaaja=&nakyma=kehitys.
 *
 * Vartioi: oikea pelaaja avautuu oikealle välilehdelle; väärä seura / tuntematon / puuttuva pelaaja
 * → EI avausta eikä virhettä (normaali etusivu, ei tietovuotoa: haku vain jo ladatusta oman seuran
 * listasta); avaus kerran; demotilassa ei avausta. Funktiot PURETAAN LÄHTEESTÄ ja AJETAAN (vm).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
function funktio(tunniste) {
  const i = VP.indexOf(tunniste);
  expect(i, tunniste + ' puuttuu VP:stä').toBeGreaterThan(-1);
  let syv = 0;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) {
    if (VP[k] === '{') syv++;
    else if (VP[k] === '}') { syv--; if (syv === 0) return VP.slice(i, k + 1); }
  }
  throw new Error('rungon loppua ei löytynyt: ' + tunniste);
}
const PELAAJAT = [{ id: 'm93GBdOaGCUuenMiCL0I', joukkue: 'KPV U13' }, { id: 'toinen', joukkue: 'KPV U15' }];

function ymparisto({ search, seuraId = 'kpv', pelaajat = PELAAJAT, demo = false }) {
  const kutsut = [], varoitukset = [], toastit = [];
  const ctx = {
    URLSearchParams, location: { search }, _seuraId: seuraId, _pelaajat: pelaajat, _isDemoMode: demo,
    console: { warn: (...a) => varoitukset.push(a.join(' ')) }, toast: (...a) => toastit.push(a),
    window: { _pdcSiirryCockpittiin: (pid, tab) => kutsut.push([pid, tab]) },
  };
  vm.createContext(ctx);
  vm.runInContext(funktio('function _vpUrlSyvalinkki(') + '\nvar _vpSyvalinkkiKaytetty = false;\n' + funktio('function _vpAvaaUrlSyvalinkki('), ctx);
  return { ctx, kutsut, varoitukset, toastit };
}

describe('VP_v25 URL-sisääntulo ?seura=&pelaaja=&nakyma=kehitys', () => {
  it('oikea seura + oman seuran pelaaja → työpöytä Kehitys-välilehdelle (3)', () => {
    const y = ymparisto({ search: '?seura=kpv&pelaaja=m93GBdOaGCUuenMiCL0I&nakyma=kehitys' });
    y.ctx._vpAvaaUrlSyvalinkki();
    expect(y.kutsut).toEqual([['m93GBdOaGCUuenMiCL0I', 3]]);
    expect(y.toastit).toEqual([]);
  });
  it('ilman nakyma-parametria → Aloitus (0)', () => {
    const y = ymparisto({ search: '?seura=kpv&pelaaja=toinen' });
    y.ctx._vpAvaaUrlSyvalinkki();
    expect(y.kutsut).toEqual([['toinen', 0]]);
  });
  it('väärä seura (URL ≠ käyttäjän seura) → ei avausta, ei virhettä', () => {
    const y = ymparisto({ search: '?seura=sjk&pelaaja=m93GBdOaGCUuenMiCL0I&nakyma=kehitys' });
    y.ctx._vpAvaaUrlSyvalinkki();
    expect(y.kutsut).toEqual([]); expect(y.toastit).toEqual([]); expect(y.varoitukset).toEqual([]);
  });
  it('tuntematon pelaaja (ei oman seuran listassa, esim. muun seuran pelaaja) → ei avausta, ei virhettä', () => {
    const y = ymparisto({ search: '?seura=kpv&pelaaja=muun-seuran-pelaaja&nakyma=kehitys' });
    y.ctx._vpAvaaUrlSyvalinkki();
    expect(y.kutsut).toEqual([]); expect(y.toastit).toEqual([]);
  });
  it('puuttuva pelaaja-parametri tai seura → normaali etusivu', () => {
    for (const search of ['', '?seura=kpv', '?seura=kpv&nakyma=kehitys', '?pelaaja=']) {
      const y = ymparisto({ search }); y.ctx._vpAvaaUrlSyvalinkki(); expect(y.kutsut).toEqual([]);
    }
    const ilmanSeuraa = ymparisto({ search: '?seura=kpv&pelaaja=toinen', seuraId: null });
    ilmanSeuraa.ctx._vpAvaaUrlSyvalinkki(); expect(ilmanSeuraa.kutsut).toEqual([]);
  });
  it('avaus vain kerran (SA:n seuravaihto ajaa lataaKaikki uudelleen); demotilassa ei avausta', () => {
    const y = ymparisto({ search: '?seura=kpv&pelaaja=toinen&nakyma=kehitys' });
    y.ctx._vpAvaaUrlSyvalinkki(); y.ctx._vpAvaaUrlSyvalinkki();
    expect(y.kutsut).toHaveLength(1);
    const d = ymparisto({ search: '?seura=kpv&pelaaja=toinen&nakyma=kehitys', demo: true });
    d.ctx._vpAvaaUrlSyvalinkki(); expect(d.kutsut).toEqual([]);
  });
  it('kytkentä: lataaKaikki kutsuu sisääntuloa renderöinnin jälkeen; ei-SA:n seura tulee claimista (URL ei ohita)', () => {
    const lk = funktio('async function lataaKaikki(');
    expect(lk.indexOf('_vpAvaaUrlSyvalinkki()')).toBeGreaterThan(lk.indexOf('renderPelaajat()'));
    expect(VP).toContain('_seuraId = token.claims.seuraId || null;');
  });
  it('Seurahallinta ja UTJ eivät enää avaa vanhaa IDP-korttia; Seuran nappi osoittaa VP:n sisääntuloon', () => {
    const seura = readFileSync(join(juuri, 'TalentMaster_Seura.html'), 'utf8');
    expect(seura).not.toContain('TalentMaster_IDP_Kortti_v4.html');
    expect(seura).toContain("window.open('TalentMaster_VP_v25.html?seura=${encodeURIComponent(tila.seuraId)}&pelaaja=${encodeURIComponent(pelaajaId)}&nakyma=kehitys', '_blank');");
  });
});
