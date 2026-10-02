/**
 * Palautteen ilmoituskello (Master + VP): ikoni (🎙️ äänelle), vanhat notifit ennallaan, klikkaus vie suoraan palautteeseen (linkki.aid).
 * Ajetaan inline-funktiot vm-hiekkalaatikossa (renderöinti + deep-link), ei pelkkää merkkijonotarkistusta.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');

function poimi(lahde, alku) {
  const i = lahde.indexOf(alku);
  if (i < 0) throw new Error('ei löydy: ' + alku);
  let sy = 0;
  for (let j = lahde.indexOf('{', i); j < lahde.length; j++) {
    if (lahde[j] === '{') sy++;
    else if (lahde[j] === '}') { sy--; if (!sy) return lahde.slice(i, j + 1) + (lahde[j + 1] === ';' ? ';' : ''); }
  }
  throw new Error('sulkeet: ' + alku);
}

const UUSI_AANI = { _id: 'n1', tyyppi: 'palaute', teksti: 'Rasmus antoi äänipalautetta harjoituksestasi 2.10. (KPV U13).', onAani: true, tekija_etunimi: 'Rasmus', joukkue: 'KPV U13', pvm: '2026-10-02', luettu: false, linkki: { nakyma: 'palaute', aid: 'a1' } };
const UUSI_TEKSTI = { ...UUSI_AANI, _id: 'n2', teksti: 'Rasmus antoi palautetta harjoituksestasi 2.10. (KPV U13).', onAani: false };
const VANHA = { _id: 'n3', tyyppi: 'palaute', teksti: 'Sait uutta palautetta harjoitusarvioinnistasi (KPV U13).', luettu: false, linkki: { nakyma: 'palaute', aid: 'a0' } };
const REVIEW = { _id: 'n4', tyyppi: 'review', teksti: 'Review erääntyy 3 pv: X (U12).', luettu: true };

function renderoi(tiedosto, lista) {
  const S = lue(tiedosto);
  const el = { innerHTML: '' };
  const ctx = {
    document: { getElementById: (id) => (id === 'notifLista' ? el : null) },
    _notifLista: lista, masterT: (s) => s, vpT: (s) => s,
    _mEsc: (s) => String(s), _hlEsc: (s) => String(s), _notifAikaSitten: () => 'tänään',
  };
  vm.createContext(ctx);
  vm.runInContext(poimi(S, 'function _notifRender()'), ctx);
  vm.runInContext('_notifRender()', ctx);
  return el.innerHTML;
}

describe.each([['Master', 'TalentMaster_Master_v16.html'], ['VP', 'TalentMaster_VP_v25.html']])('%s: _notifRender', (_n, tiedosto) => {
  const html = renderoi(tiedosto, [UUSI_AANI, UUSI_TEKSTI, VANHA, REVIEW]);
  const rivit = html.split('<div onclick=').slice(1);
  it('EI VACUOUS: 4 riviä', () => { expect(rivit.length).toBe(4); });
  it('äänipalaute: 🎙️ + uusi teksti', () => {
    expect(rivit[0]).toContain('🎙️');
    expect(rivit[0]).toContain('Rasmus antoi äänipalautetta harjoituksestasi 2.10. (KPV U13).');
  });
  it('tekstipalaute (onAani:false): 💬', () => {
    expect(rivit[1]).toContain('💬'); expect(rivit[1]).not.toContain('🎙️');
  });
  it('vanha notif (ei uusia kenttiä) renderöityy kuten ennen: 💬 + vanha teksti', () => {
    expect(rivit[2]).toContain('💬'); expect(rivit[2]).not.toContain('🎙️');
    expect(rivit[2]).toContain('Sait uutta palautetta harjoitusarvioinnistasi (KPV U13).');
  });
  it('muut tyypit ennallaan (review 🔔)', () => { expect(rivit[3]).toContain('🔔'); });
  it('onAani vain palautetyypille', () => {
    expect(renderoi(tiedosto, [{ ...REVIEW, onAani: true }])).toContain('🔔');
  });
});

describe('Master: klikkaus vie kyseiseen palautteeseen', () => {
  const S = lue('TalentMaster_Master_v16.html');
  it('"Saatu palaute" -lohkolla on aid-kohtainen ankkuri', () => {
    expect(S).toMatch(/id="saatuPalaute_' \+ _mEsc\(b\.a\.id\)/);
  });
  it('_notifAvaa: odottaa avaaValmentajaKehitys ja fokusoi linkki.aid:n; fokusointi vierittää + korostaa', async () => {
    const kutsut = []; const elementit = {};
    const el = { style: {}, scrollIntoView: (o) => kutsut.push(['scroll', o]) };
    elementit.saatuPalaute_a1 = el;
    const ctx = {
      _notifLista: [UUSI_AANI], _auth: { currentUser: { uid: 'u' } }, _seuraId: 'kpv', setTimeout: () => 0,
      _db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ update: async () => {} }) }) }) }) }) }) },
      document: { getElementById: (id) => elementit[id] || (id === 'notifPanel' ? { classList: { remove() {} } } : null) },
      avaaValmentajaKehitys: async () => { kutsut.push(['avattu']); },
    };
    vm.createContext(ctx);
    vm.runInContext(poimi(S, 'function _notifFokusoiPalaute('), ctx);
    vm.runInContext('window = {};', ctx);
    vm.runInContext(poimi(S, 'window._notifAvaa = async function'), ctx);
    await vm.runInContext('window._notifAvaa("n1")', ctx);
    expect(kutsut.map((k) => k[0])).toEqual(['avattu', 'scroll']);   // ensin avaus, sitten vieritys
    expect(el.style.borderColor).toBe('var(--teal)');
  });
  it('aid puuttuu tai lohkoa ei löydy → ei virhettä', () => {
    const ctx = { document: { getElementById: () => null }, setTimeout: () => 0 };
    vm.createContext(ctx);
    vm.runInContext(poimi(S, 'function _notifFokusoiPalaute('), ctx);
    expect(() => vm.runInContext('_notifFokusoiPalaute("x"); _notifFokusoiPalaute(undefined);', ctx)).not.toThrow();
  });
});

describe('VP: klikkaus avaa kyseisen arvioinnin palautteen', () => {
  it('palaute + aid → Raportointi → Harjoittelun laatu → _hlAvaaTapahtuma(aid); reviewit ennallaan', async () => {
    const S = lue('TalentMaster_VP_v25.html');
    const ajot = [];
    const ctx = {
      _notifLista: [UUSI_AANI, { ...REVIEW, linkki: { nakyma: 'reviewit' } }], auth: { currentUser: { uid: 'u' } }, _uid: 'u', _seuraId: 'kpv', console,
      db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ update: async () => {} }) }) }) }) }) }) },
      document: { getElementById: () => ({ classList: { remove() {} } }) },
      setWs: (w) => ajot.push('ws:' + w), _rapSeg: (s) => ajot.push('seg:' + s),
      _hlArvioinnit: null, _hlLataaJaRender: async () => { ajot.push('lataa'); ctx._hlArvioinnit = [{ _id: 'a1' }]; },
      _hlAvaaTapahtuma: (id) => ajot.push('avaa:' + id),
    };
    vm.createContext(ctx);
    vm.runInContext('window = {};', ctx);
    vm.runInContext(poimi(S, 'window._notifAvaa = async function'), ctx);
    await vm.runInContext('window._notifAvaa("n1")', ctx);
    expect(ajot).toEqual(['ws:raportointi', 'seg:laatu', 'lataa', 'avaa:a1']);
    ajot.length = 0;
    await vm.runInContext('window._notifAvaa("n4")', ctx);   // review → ei palaute-polkua (ei reviewit-ws:ää tässä stubissa: setWs('reviewit'))
    expect(ajot).toEqual(['ws:reviewit']);
  });
});
