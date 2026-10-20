/* K3b · Masterin IDP-kortti EI muutu: korttien HTML (muokkaus- ja katselutilat) verrataan ennen refaktorointia otettuun kultaiseen kuvaan (tests/fixtures/k3b_master_idp_kortti.json).
   Kortti ajetaan vm-hiekkalaatikossa oikealla Masterin lähdekoodilla (pura-funktio) + oikealla lib/tm_idp_lomake.js:llä; ympäröivät rivit (teema, jakso, vastuuhenkilö) ovat tynkiä, koska ne eivät kuulu muutokseen.
   Kuvan uudelleenotto: K3B_KULTAINEN=1 npx vitest run tests/k3b_master_ennallaan.test.js (vain kun kortin ulkoasu muuttuu tarkoituksella). */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8'), MA = lue('TalentMaster_Master_v16.html'), KUVA = join(juuri, 'tests/fixtures/k3b_master_idp_kortti.json');
function pura(H, t, pakollinen = true) { const i = H.indexOf(t); if (i < 0) { if (pakollinen) throw new Error('puuttuu: ' + t); return ''; } let d = 0; for (let k = H.indexOf('{', i); k < H.length; k++) { if (H[k] === '{') d++; else if (H[k] === '}') { d--; if (!d) return H.slice(i, k + 1); } } throw new Error('sulkeet'); }
const TAKS = [{ dim: 'D2', kategoria: 'tekniikka', avain: 'ensitouch', nimi_fi: 'Ensikosketus', mitattavissa: false }, { dim: 'D2', kategoria: 'tekniikka', avain: 'syotto', nimi_fi: 'Syöttö', mitattavissa: true }, { dim: 'D4', kategoria: 'pelialy', avain: 'ennakointi', nimi_fi: 'Ennakointi', mitattavissa: false }];
function ymp() {
  const c = { console, Math, JSON, Object, Array, String, Number, isNaN, ARVIOINTI_TAKSONOMIA: TAKS, masterT: (x) => x, _mTeemaRivi: () => '<!--teema-->', _mAloitaJaksoRivi: () => '<!--aloita-->', _mVastuuhenkiloRivi: () => '<!--vastuu-->',
    _mIdpValitavoitteetHTML: () => '<!--vt-->', _mIdpKehityskaariHTML: () => '<!--kaari-->', _fmtTestiArvo: (v) => String(v), _devIkaSp: () => ({ ika: 13, sp: 'M' }), tmTaksonomiaByAvain: (a) => TAKS.filter((x) => x.avain === a)[0] || null,
    tmTeemat: (t) => { const s = {}, o = []; (t || TAKS).forEach((i) => { const a = i.dim + '_' + i.kategoria; if (!s[a]) { s[a] = { avain: a, dim: i.dim, kategoria: i.kategoria, nimi: i.dim + ' · ' + i.kategoria }; o.push(s[a]); } }); return o; },
    tmTeemaKohteet: (a, t) => (t || TAKS).filter((i) => (i.dim + '_' + i.kategoria) === a) };
  c.window = c; vm.createContext(c);
  vm.runInContext(lue('lib/tm_idp_lomake.js'), c);
  const src = [pura(MA, 'function _mEsc('), pura(MA, 'function _mIdpKorttiHTML('), pura(MA, 'function _mIdpFokusValintaHTML(', false), pura(MA, 'function _mIdpLomakeCtx(', false)].filter(Boolean).join('\n');
  vm.runInContext(src + '\nthis._kortti = _mIdpKorttiHTML;', c);
  return c;
}
const T = (o) => Object.assign({ status: 'ehdotettu', fokus: { alue: 'syotto', dim: 'D2', nimi: 'Syöttö', lahde: 'mitattu' }, mittari: { testId: 'syotto', yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: 14.2, pvm: '2026-09-01' }, tavoitearvo: 12.5, kuvaus: 'Syöttö <b>liikkeestä</b>', pelaajan_tavoite: 'Haluan "oppia" syöttämään', aikaraami: { kausi: 'syksy 2026', kesto_vk: 6 }, perustelu: { teksti: 'Perustelu', pelilause: null, kultaikkuna: true, kypsyysvaroitus: 'Varoitus' }, luotu: '2026-10-01T10:00:00.000Z', arviot: [] }, o || {});
const TILAT = {
  ei_tavoitetta_muokattava: [{ id: 'p1' }, true],
  ehdotettu_mitattu_muokkaus: [{ id: 'p1', arviointi_havaittu: { ennakointi: 2 }, _mIdpTavoite: T(), _mIdpMuokkaus: true }, true],
  ehdotettu_mitattu_korosta_teema: [{ id: 'p1', _mIdpTavoite: T(), _mIdpMuokkaus: true, _mIdpFokTeema: 'D4_pelialy', _mIdpValitseFokus: true, _mIdpKandN: 2 }, true],
  aktiivinen_taso_muokkaus: [{ id: 'p2', _mIdpTavoite: T({ status: 'aktiivinen', fokus: { alue: 'ennakointi', dim: 'D4', nimi: 'Ennakointi', lahde: 'havaittu' }, mittari: { testId: 'ennakointi', yksikko: 'taso', suunta: 'suurempi' }, lahto: { arvo: 2, pvm: null }, tavoitearvo: 3 }), _mIdpMuokkaus: true }, true],
  vapaa_muokkaus: [{ id: 'p3', _mIdpTavoite: T({ status: 'aktiivinen', fokus: { alue: 'vapaa', dim: null, nimi: 'Oma <fokus>', vapaa: true }, mittari: { testId: null, yksikko: 'vapaa', suunta: null }, lahto: { arvo: null, pvm: null }, tavoitearvo: null }), _mIdpMuokkaus: true }, true],
  aktiivinen_katselu: [{ id: 'p1', _mIdpTavoite: T({ status: 'aktiivinen' }) }, true],
  ehdotettu_katselu_vain_luku: [{ id: 'p1', _mIdpTavoite: T() }, false]
};
describe('K3b · Masterin IDP-kortin HTML ennallaan', () => {
  const nyt = {}; for (const [nimi, [p, ed]] of Object.entries(TILAT)) nyt[nimi] = ymp()._kortti(JSON.parse(JSON.stringify(p)), ed);
  if (process.env.K3B_KULTAINEN) writeFileSync(KUVA, JSON.stringify(nyt, null, 1));
  it.each(Object.keys(TILAT))('%s', (nimi) => { expect(existsSync(KUVA)).toBe(true); const kuva = JSON.parse(readFileSync(KUVA, 'utf8')); expect(nyt[nimi]).toBe(kuva[nimi]); });
  it('kultaisessa kuvassa on varmasti muokkauslomake (ei tyhjää vertailua)', () => { const kuva = JSON.parse(readFileSync(KUVA, 'utf8')); expect(kuva.ehdotettu_mitattu_muokkaus).toMatch(/_mktTavArvo[\s\S]*_mktTavKuvaus[\s\S]*_mktTavAani/); expect(kuva.ehdotettu_mitattu_muokkaus).toContain('jsp-kt-fokval'); });
});
