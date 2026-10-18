/* A (18.10.2026): klipin fromNimi ei jää tyhjäksi kun Firebase-tilin displayName puuttuu — Master ja VP täyttävät sen lähetyshetkellä kayttajat-dokin etunimestä + sukunimestä (ei sähköpostia).
   Syy: lahettajaNimi() luki ennen vain firebase.auth().currentUser.displayName; Google-/sähköpostitilillä ilman nimeä tulos oli '' → pelaajan kortissa "Valmentaja". Vanhat klipit pysyvät "Valmentaja". */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const TN = require('../lib/tm_tekija_nimi.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
function adapteri(sivu) {   // lahettajaNimi-ominaisuuden lähde sivun _mvC():stä
  const s = lue(sivu), a = s.indexOf('lahettajaNimi: ', s.indexOf('function _mvC()')), b = s.indexOf('}, /* A:', a);
  expect(a, sivu).toBeGreaterThan(0); expect(b, sivu).toBeGreaterThan(a);
  return s.slice(a, b + 1);
}
const aja = (sivu, ymp) => { const sb = Object.assign({}, ymp); sb.window = Object.assign({ tmTekijaNimiTalletus: TN.tmTekijaNimiTalletus }, (ymp && ymp.window) || {}); vm.createContext(sb); return vm.runInContext('({ ' + adapteri(sivu) + ' })', sb).lahettajaNimi(); };
const auth = (displayName) => ({ auth: () => ({ currentUser: displayName === null ? null : { displayName } }) });

describe('Master: lähettäjän nimi', () => {
  const S = 'TalentMaster_Master_v16.html';
  it('displayName voittaa', async () => { expect(await aja(S, { firebase: auth('Mikko Ek'), window: { _valmentajaData: { etunimi: 'Matti', sukunimi: 'Meikäläinen' } } })).toBe('Mikko Ek'); });
  it('displayName puuttuu → kayttajat-dokin etunimi + sukunimi', async () => { expect(await aja(S, { firebase: auth(''), window: { _valmentajaData: { etunimi: 'Tero', sukunimi: 'Koskela' } } })).toBe('Tero Koskela'); });
  it('sähköposti ei kelpaa nimeksi; ei mitään → tyhjä (näyttö: "Valmentaja")', async () => { expect(await aja(S, { firebase: auth('tero@x.fi'), window: { _valmentajaData: { etunimi: 'Tero' } } })).toBe('Tero'); expect(await aja(S, { firebase: auth(null), window: {} })).toBe(''); });
});
describe('VP: lähettäjän nimi', () => {
  const S = 'TalentMaster_VP_v25.html';
  it('displayName voittaa eikä lue dokumenttia', async () => { let luettu = 0; expect(await aja(S, { firebase: auth('Mikko Ek'), _vpOmaNimi: async () => { luettu++; return 'X'; } })).toBe('Mikko Ek'); expect(luettu).toBe(0); });
  it('displayName puuttuu → _vpOmaNimi (kayttajat-dokki)', async () => { expect(await aja(S, { firebase: auth(''), _vpOmaNimi: async () => 'Tero Koskela' })).toBe('Tero Koskela'); });
  it('ei nimeä missään → tyhjä', async () => { expect(await aja(S, { firebase: auth(''), _vpOmaNimi: async () => null })).toBe(''); });
});
describe('molemmat lähetykset odottavat nimeä (async)', () => {
  it('_mvLaheta: lahettajaNimi: await C.lahettajaNimi()', () => { for (const f of ['TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html']) expect(lue(f)).toContain('lahettajaNimi: await C.lahettajaNimi(),'); });
});
