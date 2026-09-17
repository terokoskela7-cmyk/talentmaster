/**
 * TalentMaster™ — Kaaviopankin FASETIT (D1) + keskeneräinen luonnos (D2).
 *
 * Suunnitteluperiaate: FASETIT, EI JÄYKKIÄ KANSIOITA. Sama kaavio on yhtä aikaa teema, pelaaja,
 * joukkue ja tila — kansio olisi pakottanut yhden sijainnin. Teema antaa kansion tunnun
 * taittuvina osioina; muut suodattimet leikkaavat sen läpi.
 *
 *   A) NÄKYVYYS ENSIN — mikään suodatin ei saa tuoda näkyviin mitään
 *   B) TEEMA — pelivaihe curriculumista (brief oletti `arkkityyppi`, sitä ei ole)
 *   C) PELAAJA + MINULLE — "mitä Topiakselle on tehty" · valmentajan fokus
 *   D) HAKU + TILA — yhdessä (AND) muiden kanssa
 *   E) TOIMINNOT EIVÄT KULJE INDEKSILLÄ — suodatus siirsi järjestystä
 *   F) D2 YKSITYINEN LUONNOS — policy + rulesin pariteetti + julkaisu
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const UI = readFileSync(join(ROOT, 'lib', 'tm_kaavio_ui.js'), 'utf8');
const RULES = readFileSync(join(ROOT, 'tm_admin', 'firestore.rules'), 'utf8');
const P = require_(join(ROOT, 'lib', 'tm_kaavio_policy.js'));
const TT = require_(join(ROOT, 'lib', 'tm_teknistaktiset.js'));

const RIVIT = UI.split('\n');
const runko = (nimi) => {
  const a = RIVIT.findIndex((l) => new RegExp('^(?:async\\s+)?function ' + nimi + '\\s*\\(').test(l));
  if (a < 0) throw new Error('funktiota ei löytynyt: ' + nimi);
  for (let i = a + 1; i < RIVIT.length; i++) if (RIVIT[i] === '}') return RIVIT.slice(a, i + 1).join('\n');
  throw new Error('sulkua ei löytynyt: ' + nimi);
};

const LIBIT = ['tm_teknistaktiset.js', 'tm_konsepti_resolve.js', 'tm_kaavio_render.js',
               'tm_kaavio_policy.js', 'tm_kaavio_validate.js', 'tm_kaavio_editori.js',
               'tm_kaavio_konsepti.js', 'tm_kaavio_ui.js'];
const LISTAT = {
  joukkueet: () => [{ id: 'u13', nimi: 'P13' }, { id: 'u15', nimi: 'P15' }],
  pelaajat: () => [{ id: 'topias', nimi: 'Topias' }, { id: 'aada', nimi: 'Aada' }],
  valmentajat: () => [{ id: 'c1', nimi: 'Mikko' }, { id: 'c2', nimi: 'Sanna' }]
};
function sivu({ rooli, uid, joukkueet }) {
  const sb = {
    console, Math, JSON, String, Number, Object, Array, Boolean, Promise, Date, RegExp, Error,
    setTimeout, clearTimeout, parseFloat, parseInt, isNaN,
    document: { getElementById: () => null, querySelectorAll: () => [], body: { insertAdjacentHTML: () => {} } }
  };
  sb.window = {};
  vm.createContext(sb);
  LIBIT.forEach((f) => vm.runInContext(readFileSync(join(ROOT, 'lib', f), 'utf8'), sb));
  sb.window.TM_KAAVIO_HOST = Object.assign({
    db: null, t: (fi) => fi, lang: () => 'fi', toast: () => {},
    ctx: () => ({ rooli: rooli || 'valmentaja', uid: uid || 'c1', seuraId: 'A',
                  joukkueet: joukkueet || ['u13'], superAdmin: false, anon: false })
  }, LISTAT);
  return sb;
}
const aja = (sb, e) => vm.runInContext(e, sb);

/* Testijoukko: avaimet valitaan CURRICULUMISTA, jotta teema ei ole keksitty. */
const avainVaiheella = (vaihe) => {
  const kaikki = [].concat(TT.TM_TT_YOUTH || [], TT.TM_TT_JOUKKUE || []);
  Object.values(TT.TM_TT_FUNDAMENTIT || {}).forEach((a) => kaikki.push(...a));
  const o = kaikki.filter((k) => (k.ryhma || k.faasi || k.dim) === vaihe)[0];
  return o && o.avain;
};
const HYOK = avainVaiheella('hyokkays'), PUOL = avainVaiheella('puolustus');

const kaavio = (id, avain, review) => ({
  id, seuraId: 'A',
  spec: { avain, suunta: 'ylos', pelimuoto: '8v8', pelaajat: [{ id: 'P1', joukkue: 'oma', rooli: 'tuki', x: 50, y: 50 }] },
  review: Object.assign({ status: 'hyvaksytty', nakyvyys: 'seura', versio: 1, luonut: 'c1' }, review || {})
});
const AINEISTO = [
  kaavio('k1', HYOK, { nakyvyys: 'pelaaja', pelaajaIds: ['topias'], status: 'luonnos' }),
  kaavio('k2', HYOK, { nakyvyys: 'joukkue', joukkueId: 'u13' }),
  kaavio('k3', PUOL, { nakyvyys: 'pelaaja', pelaajaIds: ['aada'] }),
  kaavio('k4', PUOL, { nakyvyys: 'valmentaja', valmentajaId: 'c1', status: 'odottaa' }),
  kaavio('k5', HYOK, { nakyvyys: 'joukkue', joukkueId: 'u15' })
];
const suodata = (sb, s) => aja(sb, '_kaavioSuodata(' + JSON.stringify(AINEISTO) + ',' + JSON.stringify(s) + ', _kaavioCtxNyt()).map(function(k){return k.id})');

describe('A — näkyvyys ensin, suodatin vasta sen päällä', () => {
  it('pankki suodattaa kaavioVoiLukea():lla ENNEN fasetteja', () => {
    const fn = runko('avaaKaaviopankki');
    const i = fn.indexOf('kaavioVoiLukea'), j = fn.indexOf('_kaavioSuodatinHTML');
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
    expect(fn).toContain('_kaavioTila.nakyvat = _kaavioTila.lista.filter');
  });
  it('sisältö rakennetaan VAIN luetusta listasta, ei raakalistasta', () => {
    const fn = runko('_kaavioPankkiSisaltoHTML');
    expect(fn).toContain('_kaavioTila.nakyvat');
    expect(fn).not.toContain('_kaavioTila.lista');
  });
  it('suodatinpalkin luvut lasketaan luetusta listasta', () => {
    expect(runko('_kaavioSuodatinHTML')).toContain('_kaavioTila.nakyvat');
  });
});

describe('B — teema = pelivaihe (curriculumista, ei keksitty)', () => {
  it('PREMISSI: konsepteilla EI ole arkkityyppi-kenttää, mutta ryhma/faasi/dim kattaa kaikki', () => {
    const kaikki = [].concat(TT.TM_TT_YOUTH || [], TT.TM_TT_JOUKKUE || []);
    Object.values(TT.TM_TT_FUNDAMENTIT || {}).forEach((a) => kaikki.push(...a));
    expect(kaikki.filter((k) => k.arkkityyppi)).toEqual([]);
    expect(kaikki.filter((k) => !(k.ryhma || k.faasi || k.dim))).toEqual([]);
    expect(kaikki.length).toBeGreaterThan(100);
  });
  it('teema resolvoituu konseptista', () => {
    const sb = sivu({});
    expect(aja(sb, '_kaavioTeema(' + JSON.stringify(AINEISTO[0]) + ')')).toBe('hyokkays');
    expect(aja(sb, '_kaavioTeema(' + JSON.stringify(AINEISTO[2]) + ')')).toBe('puolustus');
  });
  it('tuntematon avain → muut (vanhat/omat konseptit eivät katoa)', () => {
    const sb = sivu({});
    expect(aja(sb, "_kaavioTeema({spec:{avain:'ei_ole_olemassa'}})")).toBe('muut');
    expect(aja(sb, '_kaavioTeema({})')).toBe('muut');
  });
  it('teemasuodatin rajaa', () => {
    const sb = sivu({});
    expect(suodata(sb, { teema: 'hyokkays' })).toEqual(['k1', 'k2', 'k5']);
    expect(suodata(sb, { teema: 'puolustus' })).toEqual(['k3', 'k4']);
    expect(suodata(sb, {})).toEqual(['k1', 'k2', 'k3', 'k4', 'k5']);   // ei-vacuous
  });
  it('tyhjät teemat eivät renderöidy chipeiksi', () => {
    expect(runko('_kaavioSuodatinHTML')).toMatch(/filter\(function \(t\) \{ return teemaMaarat\[t\]; \}\)/);
  });
});

describe('C — pelaaja ja "minulle"', () => {
  it('pelaajasuodatin = vain HÄNELLE kohdistetut (joukkue-/seurataso ei ole "hänelle tehty")', () => {
    const sb = sivu({});
    expect(suodata(sb, { pelaajaId: 'topias' })).toEqual(['k1']);
    expect(suodata(sb, { pelaajaId: 'aada' })).toEqual(['k3']);
  });
  it('pelaaja + teema leikkaavat ristiin', () => {
    const sb = sivu({});
    expect(suodata(sb, { pelaajaId: 'topias', teema: 'hyokkays' })).toEqual(['k1']);
    expect(suodata(sb, { pelaajaId: 'topias', teema: 'puolustus' })).toEqual([]);
  });
  it('"minulle" = valmentajalle osoitettu TAI oma joukkue', () => {
    const sb = sivu({ uid: 'c1', joukkueet: ['u13'] });
    expect(suodata(sb, { minulle: true })).toEqual(['k2', 'k4']);   // u13 + valmentajaId c1
  });
  it('toinen valmentaja saa eri tuloksen — fokus on henkilökohtainen', () => {
    const sb = sivu({ uid: 'c2', joukkueet: ['u15'] });
    expect(suodata(sb, { minulle: true })).toEqual(['k5']);
  });
  it('EI RAJAUS VAAN FOKUS: ilman suodatinta valmentaja näkee yhä kaikki', () => {
    const sb = sivu({ uid: 'c2', joukkueet: ['u15'] });
    expect(suodata(sb, {}).length).toBe(AINEISTO.length);
  });
});

describe('D — haku ja tila, AND muiden kanssa', () => {
  it('haku osuu lokalisoituun nimeen ja avaimeen', () => {
    const sb = sivu({});
    const nimi = aja(sb, '(_kaavioOtsikko(' + JSON.stringify(AINEISTO[0].spec) + ') || {}).nimi');
    expect(nimi).toBeTruthy();
    expect(suodata(sb, { haku: String(nimi).slice(0, 5) }).length).toBeGreaterThan(0);
    expect(suodata(sb, { haku: HYOK })).toEqual(['k1', 'k2', 'k5']);
    expect(suodata(sb, { haku: '8v8' }).length).toBe(AINEISTO.length);
    expect(suodata(sb, { haku: 'zzz-ei-osu' })).toEqual([]);
  });
  it('tilasuodatin', () => {
    const sb = sivu({});
    expect(suodata(sb, { tila: 'luonnos' })).toEqual(['k1']);
    expect(suodata(sb, { tila: 'odottaa' })).toEqual(['k4']);
  });
  it('kaikki yhdessä (AND)', () => {
    const sb = sivu({});
    expect(suodata(sb, { teema: 'hyokkays', tila: 'luonnos', pelaajaId: 'topias' })).toEqual(['k1']);
    expect(suodata(sb, { teema: 'puolustus', tila: 'luonnos' })).toEqual([]);
  });
  it('haku debounceataan (joka näppäin renderöisi SVG-esikatselut uudelleen)', () => {
    expect(runko('_kaavioHakuMuuttui')).toMatch(/clearTimeout[\s\S]*setTimeout/);
  });
});

describe('E — kortin toiminnot eivät kulje järjestysnumerolla', () => {
  it('avain on stabiili ja erottaa kanonisen seuratasosta', () => {
    const sb = sivu({});
    expect(aja(sb, "_kaavioKorttiAvain({id:'k1'})")).toBe('seu_k1');
    expect(aja(sb, "_kaavioKorttiAvain({id:'y_h0',kanoninen:true})")).toBe('kan_y_h0');
  });
  it('toiminnot etsivät avaimella, eivät indeksillä', () => {
    ['_kaavioToiminto', '_kaavioNostaSeuratasolle'].forEach((f) => {
      expect(runko(f), f).toContain('_kaavioEtsiKaavio(');
      expect(runko(f), f).not.toMatch(/\bnakyvat\[i\]|\)\[i\]/);
    });
  });
  it('kortti välittää avaimen, ei indeksiä', () => {
    const k = runko('_kaavioKorttiHTML');
    expect(k).toContain('_kaavioNappiHTML(t, kav)');
    expect(k).toMatch(/_kaavioNostaSeuratasolle\(\\'' \+ kav/);
  });
  it('esikatselut piirretään DOMista (data-kaavio), ei lasketusta järjestyksestä', () => {
    expect(runko('_kaavioPiirraEsikatselut')).toContain('[data-kaavio]');
  });
});

describe('F — D2: yksityinen luonnos', () => {
  const y = (ex) => ({ seuraId: 'A', review: Object.assign({ status: 'luonnos', nakyvyys: 'joukkue', joukkueId: 'u13', luonut: 'c1', yksityinen: true }, ex || {}) });
  const A = { rooli: 'valmentaja', seuraId: 'A', uid: 'c1', joukkueet: ['u13'] };
  const B = { rooli: 'valmentaja', seuraId: 'A', uid: 'c2', joukkueet: ['u13'] };
  const VP = { rooli: 'vp', seuraId: 'A', uid: 'v1' };

  it('näkyy tekijälle, ei muille', () => {
    expect(P.kaavioVoiLukea(y(), A)).toBe(true);
    expect(P.kaavioVoiLukea(y(), B)).toBe(false);
  });
  it('johto EI näe keskeneräistä (tulkinta: yksityinen = ei valmis kenellekään)', () => {
    expect(P.kaavioVoiLukea(y(), VP)).toBe(false);
  });
  it('SA näkee (ylläpito)', () => {
    expect(P.kaavioVoiLukea(y(), { superAdmin: true })).toBe(true);
  });
  it('julkaisun jälkeen näkyy kaikille — EI-VACUOUS (sama dokumentti, yksi kenttä)', () => {
    expect(P.kaavioVoiLukea(y({ yksityinen: false }), B)).toBe(true);
    expect(P.kaavioVoiLukea(y({ yksityinen: false }), VP)).toBe(true);
  });
  it('TAAKSEPÄIN: kenttä puuttuu → julkinen (vanhat luonnokset eivät katoa)', () => {
    const vanha = { seuraId: 'A', review: { status: 'luonnos', nakyvyys: 'joukkue', luonut: 'c1' } };
    expect(P.kaavioYksityinen(vanha)).toBe(false);
    expect(P.kaavioVoiLukea(vanha, B)).toBe(true);
  });
  it('hyväksytty ei voi olla yksityinen (katselmuksen läpäissyt on julkaistu)', () => {
    expect(P.kaavioYksityinen(y({ status: 'hyvaksytty' }))).toBe(false);
    expect(P.kaavioVoiLukea(y({ status: 'hyvaksytty' }), B)).toBe(true);
  });
  it('julkaisu on TEKIJÄN toimi', () => {
    expect(P.kaavioToiminnot(y(), A)).toContain('julkaise');
    expect(P.kaavioToiminnot(y({ yksityinen: false }), A)).not.toContain('julkaise');
    expect(P.kaavioToiminnot(y(), { superAdmin: true })).not.toContain('julkaise');
  });
  it('RULES-PARITEETTI: sama ehto säännössä (yksityinen && luonut != uid → ei lukua)', () => {
    const i = RULES.indexOf('function kaavioLukuOk()');
    expect(i).toBeGreaterThan(0);
    const f = RULES.slice(i, RULES.indexOf('}', i));
    expect(f).toMatch(/!kaavioYksityinen\(resource\.data\)/);
    expect(f).toMatch(/kaavioTekija\(resource\.data\) == request\.auth\.uid/);
    const yks = RULES.slice(RULES.indexOf('function kaavioYksityinen(d)'), RULES.indexOf('function kaavioTekija'));
    expect(yks).toMatch(/kaavioTila\(d\) != 'hyvaksytty'/);      // sama poikkeus kuin policyssa
    expect(yks).toMatch(/get\('yksityinen', false\)/);            // sama fail-open-oletus (taaksepäin)
    expect(RULES).toMatch(/allow read:[\s\S]{0,200}kaavioLukuOk\(\)/);
  });
  it('UI: luonti asettaa yksityisen oletuksena, Tallenna ei julkaise', () => {
    expect(runko('_kaavioLuoJaMuokkaa')).toContain('yksityinen: true');
    expect(runko('_kaavioTallenna')).toContain("'review.yksityinen': _kaavioYksityinenNyt(m)");
    expect(runko('_kaavioJulkaise')).toContain("'review.yksityinen': false");
  });
  it('UI: julkaisu tallentaa ensin (muuten julkaistaisiin vanhempi versio kuin ruudulla)', () => {
    expect(runko('_kaavioJulkaiseEditorista')).toMatch(/_kaavioTallentamattomia\(\)[\s\S]*_kaavioTallenna\(\)/);
  });
  it('UI: yksityisyys on NÄKYVÄ kortissa ja tallennusrivillä', () => {
    expect(runko('_kaavioKorttiHTML')).toContain('yksityinen luonnos · vain sinä');
    expect(runko('_kaavioTallennusKohdeHTML')).toContain('yksityinen luonnos · vain sinä');
  });
});
