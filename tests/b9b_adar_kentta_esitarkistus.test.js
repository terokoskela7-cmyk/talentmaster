/**
 * B9b jatko (PM 7.11.2026, ADAR b): suostumuksen esitarkistus ADARin muihin kirjoituspolkuihin.
 * - Kenttätarkkailut (Pelihavainto_Kentta): uusi tarkkailu perutulle → ei kirjoitusta, luonnos säilyy, syy näkyviin.
 *   Jo luodun tarkkailun päivitys sallitaan (Rules estää vain createn). permission-denied + peruttu → oikea syy.
 * - ADAR-pikakortin pelaajalle jakaminen: kartta voi olla vanha (suostumus peruttu kesken istunnon) → virhepolku lukee tuoreen
 *   pelaajadokumentin, jolloin syy on "Suostumus peruttu" eikä "vain oman joukkueesi". Vanhan offline-jonon synkka ohittaa perutut nimettyinä.
 * Tekstit = B9:n valmiit käännökset (ei uutta sv:tä). Ajettu vm:ssä oikealla lähteellä ja oikealla lib/tm_suostumus.js:llä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);
const TS = req('../lib/tm_suostumus.js');
const HK = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'tm_henkilosto_i18n.js'), 'utf8');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const KENTTA = lue('TalentMaster_Pelihavainto_Kentta.html'), ADAR = lue('TalentMaster_ADAR_Pikakortti.html');
function pura(src, tunniste) {
  const i = src.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') syv++; else if (src[k] === '}') { syv--; if (!syv) return src.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const PERUTTU = { etunimi: 'Testi', suostumusTila: 'peruttu', suostumus: { peruttu: { aika: 'y' } } };
const UUSI_KUTSU = { etunimi: 'Testi', suostumusTila: 'odottaa', suostumus: { peruttu: { aika: 'y' } } };   // peruttu voittaa
const OK = { etunimi: 'Testi', suostumusTila: 'annettu' };
const HYLATTY = () => Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });

/* Pieni Firestore-tynkä: polku → data; set kirjataan; setHeittaa → permission-denied. */
function db(alku, { setHeittaa } = {}) {
  const D = new Map(Object.entries(alku)), kirjoitukset = [];
  const ref = (p) => ({
    collection: (c) => ({ doc: (id) => ref(p + '/' + c + '/' + id) }),
    get: async () => ({ exists: D.has(p), data: () => D.get(p) }),
    set: async (d) => { if (setHeittaa) throw HYLATTY(); kirjoitukset.push(p); D.set(p, Object.assign({}, D.get(p), d)); },
  });
  return { db: { collection: (c) => ({ doc: (id) => ref(c + '/' + id) }) }, D, kirjoitukset };
}

describe('Kenttätarkkailu (Pelihavainto_Kentta): esitarkistus ennen uutta tarkkailua', () => {
  const PEL = 'seurat/kpv/pelaajat/a', TARK = PEL + '/kenttatarkkailut/t1';
  const aja = async (alku, opts) => {
    const { db: _db, kirjoitukset } = db(alku, opts);
    const el = { tallennusteksti: { textContent: '' }, btnTallenna: { disabled: false } };
    const kutsut = [];
    const ctx = {
      _db, _auth: { currentUser: { getIdToken: async () => 't' } }, S: { seuraId: 'kpv', pelaajaId: 'a' },
      q: (id) => el[id], phT: (t) => t, tarkkailuId: () => 't1', tarkkailuPayload: () => ({ tyyppi: 'kenttatarkkailu' }),
      poistaLuonnos: () => kutsut.push('poistaLuonnos'), asetaTallennustila: (t) => kutsut.push('tila:' + t),
      firebase: { firestore: { FieldValue: { serverTimestamp: () => 'ts' } } }, window: { TM_SUOSTUMUS: TS }, console: { error() {} },
    };
    vm.createContext(ctx);
    vm.runInContext(pura(KENTTA, 'async function suostumusPeruttu(') + '\n' + pura(KENTTA, 'function naytaPeruttu(') + '\n'
      + pura(KENTTA, 'async function tallennaFirestoreen(') + '\nthis.f = tallennaFirestoreen;', ctx);
    const tulos = await ctx.f({ lopullinen: true });
    return { tulos, kirjoitukset, teksti: el.tallennusteksti.textContent, kutsut, nappi: el.btnTallenna.disabled };
  };
  const PERUTTU_TEKSTI = 'Suostumus peruttu — kirjaukset ovat tallessa laitteella';

  it('peruttu + uusi tarkkailu → ei kirjoitusta, luonnos säilyy (ei poistaLuonnos), syy näkyviin, nappi vapautuu', async () => {
    for (const p of [PERUTTU, UUSI_KUTSU]) {
      const r = await aja({ [PEL]: Object.assign({}, p) });
      expect(r).toEqual({ tulos: false, kirjoitukset: [], teksti: PERUTTU_TEKSTI, kutsut: [], nappi: false });
    }
  });
  it('jo luotu tarkkailu päivittyy perutullekin (Rules estää vain createn) — esitarkistus ei estä jatkamista', async () => {
    const r = await aja({ [PEL]: Object.assign({}, PERUTTU), [TARK]: { tyyppi: 'kenttatarkkailu' } });
    expect(r.tulos).toBe(true); expect(r.kirjoitukset).toEqual([TARK]); expect(r.kutsut).toEqual(['poistaLuonnos', 'tila:verkossa']);
  });
  it('suostumus kunnossa → kirjoitus kuten ennen', async () => {
    const r = await aja({ [PEL]: Object.assign({}, OK) });
    expect(r.tulos).toBe(true); expect(r.kirjoitukset).toEqual([TARK]);
  });
  it('permission-denied: peruttu → oikea syy; muu syy → "Ei oikeutta" kuten ennen', async () => {
    /* Peruttu vasta set-hetkellä (esitarkistuksen ja kirjoituksen välissä) simuloidaan: jo luotu dokumentti → esitarkistus ohitetaan. */
    const r = await aja({ [PEL]: Object.assign({}, PERUTTU), [TARK]: {} }, { setHeittaa: true });
    expect(r.tulos).toBe(false); expect(r.teksti).toBe(PERUTTU_TEKSTI);
    const r2 = await aja({ [PEL]: Object.assign({}, OK) }, { setHeittaa: true });
    expect(r2.teksti).toBe('Ei oikeutta tallentaa tälle pelaajalle — ota yhteys seuran pääkäyttäjään');
  });
  it('lib/tm_suostumus.js ladataan sivulla, ja molemmilla teksteillä on valmis sv (ei uutta käännöstä)', () => {
    expect(KENTTA).toMatch(/<script src="lib\/tm_suostumus\.js"><\/script>/);
    expect(HK).toContain("'Suostumus peruttu': 'Samtycke återkallat'");
    expect(HK).toContain("'kirjaukset ovat tallessa laitteella': ");
  });
});

describe('ADAR-pikakortti: tuore suostumusluku (kartta voi olla vanha)', () => {
  const PEL = 'seurat/kpv/pelaajat/a';
  const konteksti = (alku, kartta) => {
    const { db: _db } = db(alku);
    const ctx = { window: { TM_SUOSTUMUS: TS, _pelaajaMap: kartta, _omatJoukkueet: ['j1'] }, tmHT: (t) => t, tmLibT: (k) => (k === 'kts_suostumus_peruttu' ? 'Suostumus peruttu' : null),
      _PH_DB: _db, _adarNakeeKaikki: () => false };
    ctx._phPelaajaRef = (sid, pid) => _db.collection('seurat').doc(sid).collection('pelaajat').doc(pid);
    vm.createContext(ctx);
    vm.runInContext(['function _adarPeruttu(', 'function _adarPeruttuTeksti(', 'function _adarEstonSyy(', 'async function _adarPeruttuTuore('].map((t) => pura(ADAR, t)).join('\n')
      + '\nthis.tuore = _adarPeruttuTuore; this.syy = _adarEstonSyy;', ctx);
    return ctx;
  };

  it('kartassa vielä "annettu", palvelimella peruttu → tuore luku päivittää kartan ja syy = Suostumus peruttu', async () => {
    const kartta = { a: { nimi: 'Testi', suostumusTila: 'annettu' } };
    const ctx = konteksti({ [PEL]: Object.assign({}, PERUTTU) }, kartta);
    expect(ctx.syy('a')).toBe('Voit havainnoida vain oman joukkueesi pelaajia');   // vanha kartta → väärä syy ilman tuoretta lukua
    expect(await ctx.tuore('kpv', 'a')).toBe(true);
    expect(ctx.syy('a')).toBe('Suostumus peruttu');
    expect(TS.tmSuostumusPeruttu(kartta.a)).toBe(true);
  });
  it('ei peruttu / pelaaja puuttuu / lukuvirhe → false, kartta ennallaan', async () => {
    const kartta = { a: { nimi: 'Testi', suostumusTila: 'annettu' } };
    expect(await konteksti({ [PEL]: Object.assign({}, OK) }, kartta).tuore('kpv', 'a')).toBe(false);
    expect(await konteksti({}, kartta).tuore('kpv', 'a')).toBe(false);
    const ctx = konteksti({}, kartta); ctx._phPelaajaRef = () => ({ get: async () => { throw new Error('verkko'); } });
    expect(await ctx.tuore('kpv', 'a')).toBe(false);
    expect(kartta.a.suostumusTila).toBe('annettu');
  });
  it('tallennuksen virhepolku lukee tuoreen tilan ENNEN syyn muodostamista (vain hylkäyksessä)', () => {
    const f = pura(ADAR, 'async function _phTallenna(');
    const i = f.indexOf('await _adarPeruttuTuore(seuraId, pelaajaId)'), j = f.indexOf('var syy = _hylatty ? _adarEstonSyy(pelaajaId)');
    expect(i).toBeGreaterThan(-1); expect(j).toBeGreaterThan(i);
    expect(f.slice(i - 80, i)).toContain('if (_hylatty && !_adarPeruttu(pelaajaId))');
    expect(f).toContain('}).catch(async function (err) {');
  });

  it('vanhan offline-jonon synkka: peruttu → pois jonosta, ei kirjoitusta, nimettynä toastiin', async () => {
    const kartta = {};
    const ctx = konteksti({ [PEL]: Object.assign({}, PERUTTU), 'seurat/kpv/pelaajat/b': Object.assign({}, OK) }, kartta);
    const poistetut = [], kirjoitetut = [], toastit = [];
    Object.assign(ctx, {
      _PH_AUTH: { currentUser: {} },
      _idbHaeKaikki: async () => [{ localId: 1, seura_id: 'kpv', pelaaja_id: 'a', luotu: 'x' }, { localId: 2, seura_id: 'kpv', pelaaja_id: 'b', luotu: 'x' }],
      _idbPoista: async (id) => { poistetut.push(id); },
      _phKirjoitaHavaintoJaPikakentat: async (ref, data, sid, pid) => { kirjoitetut.push(pid); },
      _showToast: (m) => toastit.push(m),
    });
    ctx.window.firebase = { firestore: { FieldValue: { serverTimestamp: () => 'ts' } } };
    ctx._phPelaajaRef = (sid, pid) => { const r = ctx._PH_DB.collection('seurat').doc(sid).collection('pelaajat').doc(pid); r.collection = () => ({ doc: () => ({}) }); return r; };
    vm.runInContext(pura(ADAR, 'async function _synkronoiOfflineJono(') + '\nthis.synkka = _synkronoiOfflineJono;', ctx);
    await ctx.synkka();
    expect(kirjoitetut).toEqual(['b']);
    expect(poistetut).toEqual([1, 2]);
    expect(toastit).toEqual(['✓ Offline-merkinnät synkronoitu · Suostumus peruttu: 1']);
  });
});
