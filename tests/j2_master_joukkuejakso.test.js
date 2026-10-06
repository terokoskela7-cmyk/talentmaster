/**
 * J2 — Master_v16 Kausi → "Joukkueen jakso" -adapteri (lippu seurat/{id}.liput.kentta). Funktiot puretaan lähteestä ja ajetaan vm:ssä oikeilla libeillä.
 * Fixture: KPV U13 (joukkueet/kpv_u13); roolit: valmentaja (kpv_u13) JA VP. Kirjoitus vain joukkueet/kpv_u13 (update: jaksofokus [+ jaksofokus_historia]) — Rules v3.37, ei muutosta.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const require = createRequire(import.meta.url);
const MA = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_Master_v16.html'), 'utf8');
const L = { JJ: require('../lib/tm_joukkuejakso.js'), TT: require('../lib/tm_tukitavoitteet.js'), JM: require('../lib/tm_jakso_malli.js'), KS: require('../lib/tm_kehityssilmukka.js'), VL: require('../lib/tm_valmennuslinja.js'), FY: require('../lib/tm_fyysteemat.js') };
function pura(t) { const i = MA.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0; for (let k = MA.indexOf('{', i); k < MA.length; k++) { if (MA[k] === '{') d++; else if (MA[k] === '}' && !--d) return MA.slice(i, k + 1); } throw new Error('sulkeet'); }
const TANAAN = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
const OHJ = [{ id: 'ohjelmat_105_1', nimi: 'Räjähtävä voima', tila: 'hyvaksytty', teema_avain: 'fy_rajahtavyys', lahde: 'seura' }];
const TEEMAT = L.VL.tmTeemaKerros({ jaksot: [{ id: 'teema_45_1', joukkue: 'KPV U13', alkaa: '2020-01-01', paattyy: '2099-12-31', teema: 'Syöttötaito ja -peli', tila: 'hyvaksytty' }] }, null);

function ymp({ rooli = 'valmentaja', joukkue = 'KPV U13', liput = { kentta: true }, doc: doc0 = { nimi: 'KPV U13', ikaryhma: 'U13' }, kaada = false, verkko = true, sa = false } = {}) {
  const doc = doc0 ? JSON.parse(JSON.stringify(doc0)) : null;
  const log = { luvut: [], upd: [], toastit: [], token: 0, el: {}, modal: null, uudetKentat: null };
  const el = (id) => (log.el[id] = log.el[id] || { id, innerHTML: '', value: '', style: {}, remove() { delete log.el[id]; if (id === '_mJjModal') log.modal = null; } });
  const jDoc = (id) => ({ get: async () => { log.luvut.push('joukkueet/' + id); return { exists: !!doc, data: () => JSON.parse(JSON.stringify(doc)) }; },
    update: async (u) => { if (kaada) throw new Error('permission-denied'); log.upd.push({ polku: 'seurat/kpv/joukkueet/' + id, data: u });
      Object.keys(u).forEach((k) => { doc[k] = (u[k] && u[k].__arrayUnion) ? (doc[k] || []).concat(JSON.parse(JSON.stringify(u[k].__arrayUnion))) : JSON.parse(JSON.stringify(u[k])); }); } });   // Firestore-käytös: palvelin säilyttää päivityksen
  const db = { collection: (c) => ({ doc: (sid) => ({ get: async () => { log.luvut.push(c + '/' + sid); return { exists: true, data: () => ({ nimi: 'KPV', liput: liput }) }; },
    collection: (c2) => ({ doc: (id) => jDoc(id) }) }) }) };
  const sb = {
    _db: db, _seuraId: 'kpv', _demo: false, _rooli: rooli, _superAdmin: sa, _joukkue: joukkue, masterT: (x) => x, console: { warn() {} }, Date, Object, Array, Promise, Math, JSON, String, Number,
    _mEsc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    tmPaivaIso: (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
    toast: (t, k) => log.toastit.push([t, k]), _mVerkkoEnnenSulkua: () => verkko, _mTuoreToken: async () => { log.token++; }, _ohjLataaKirjasto: async () => OHJ, _mLataaTeemat: async () => {},
    firebase: { auth: () => ({ currentUser: { uid: 'u' } }), firestore: { FieldValue: { arrayUnion: (...a) => ({ __arrayUnion: a }) } } },
    window: { TM_JOUKKUEJAKSO: L.JJ, TM_VALMENNUSLINJA: L.VL, _mTeemat: TEEMAT, _ohjKirjasto: OHJ },
    document: { getElementById: (id) => (id === 'seasonJoukkuejakso' || /^_jj|^_mJjModal/.test(id) ? (id === '_mJjModal' && !log.modal ? null : el(id)) : null),
      createElement: () => ({ set innerHTML(h) { log.modalHtml = h; }, get firstChild() { return { _on: 1 }; } }), body: { appendChild(n) { if (n && n._on) { log.modal = true; el('_mJjModal'); } } } },
  };
  vm.createContext(sb);
  vm.runInContext(['function _joukkueTunniste(', 'async function _mJjLataaLiput(', 'function _mJjSaaMuokata(', 'function _mJjCtx(', 'async function _mJjRender(', 'function _mJjVoiLuoda(', 'window._mJjAvaa = async function', 'window._mJjSulje = function', 'window._mJjTallenna = async function'].map(pura).join(';\n') + ';\nthis._mJjRender = _mJjRender;\nthis._mJjSaaMuokata = _mJjSaaMuokata;', sb);
  sb.window._mJjLiput = {};
  return { sb, log, el };
}
const kortti = (e) => e.log.el.seasonJoukkuejakso ? e.log.el.seasonJoukkuejakso.innerHTML : '';
const syota = (e, arvot) => { Object.keys(arvot).forEach((k) => { e.el(k).value = arvot[k]; }); };
const LOMAKE = { _jjTekn: 'teema:teema_45_1', _jjTeknOma: '', _jjFyys: 'ohj:ohjelmat_105_1', _jjFyysOma: '', _jjHen: 'Seuraava suoritus virheen jälkeen', _jjSos: '', _jjAlku: TANAAN, _jjKesto: '6' };

describe('lippu liput.kentta (D25)', () => {
  it('ilman lippua (KPV nyt: liput puuttuu) ei näy mitään eikä joukkuedokumenttia lueta; lippu false → sama', async () => {
    for (const liput of [{}, null, { kentta: false }, { kentta: 'true' }]) { const e = ymp({ liput }); await e.sb._mJjRender(); expect(kortti(e), JSON.stringify(liput)).toBe(''); expect(e.log.luvut).toEqual(['seurat/kpv']); }
  });
  it('demo ja seuraton: ei lueta lainkaan; liput luetaan kerran per seura (välimuisti)', async () => {
    const d = ymp(); d.sb._demo = true; await d.sb._mJjRender(); expect(d.log.luvut).toEqual([]);
    const e = ymp(); await e.sb._mJjRender(); await e.sb._mJjRender(); expect(e.log.luvut.filter((x) => x === 'seurat/kpv')).toHaveLength(1);
  });
});

describe.each([['valmentaja', 'valmentaja'], ['vp', 'vp']])('KPV U13 · %s', (_n, rooli) => {
  it('kortti: joukkue valittu → luetaan joukkueet/kpv_u13; ei jaksoa → "Joukkueella ei ole jaksoa" + Aloita joukkuejakso', async () => {
    const e = ymp({ rooli }); await e.sb._mJjRender();
    expect(e.log.luvut).toEqual(['seurat/kpv', 'joukkueet/kpv_u13']); expect(kortti(e)).toContain('Joukkueella ei ole jaksoa'); expect(kortti(e)).toContain('Aloita joukkuejakso'); expect(kortti(e)).toContain('_mJjAvaa()');
  });
  it('Aloita → modaali samoilla valinnoilla (teema esivalittu, seuran ohjelma + fy_*-teemat, Oma); Tallenna → YKSI update joukkueet/kpv_u13: jaksofokus (osa_alueet), ei muuta kenttää', async () => {
    const e = ymp({ rooli }); await e.sb._mJjRender(); await e.sb.window._mJjAvaa();
    expect(e.log.modal).toBe(true); expect(e.log.modalHtml).toContain('Aloita joukkuejakso'); expect(e.log.modalHtml).toContain('Räjähtävä voima'); expect(e.log.modalHtml).toContain('Fyysiset teemat'); expect(e.log.modalHtml).toContain('Oma…'); expect(e.log.modalHtml).toMatch(/value="teema:teema_45_1" selected/);
    syota(e, LOMAKE); await e.sb.window._mJjTallenna();
    expect(e.log.upd).toHaveLength(1); expect(e.log.upd[0].polku).toBe('seurat/kpv/joukkueet/kpv_u13'); expect(Object.keys(e.log.upd[0].data)).toEqual(['jaksofokus']);
    const jf = e.log.upd[0].data.jaksofokus; expect(jf.osa_alueet.fyysinen).toEqual({ avain: 'fy_rajahtavyys', nimi: 'Räjähtävä voima', ohjelma_id: 'ohjelmat_105_1', lahde: 'seura' }); expect(jf).toMatchObject({ kesto_vk: 6, alku: TANAAN, asetti: { rooli: rooli, pvm: TANAAN } });
    expect(e.log.token).toBe(1); expect(e.log.toastit.some(([t, k]) => /Joukkuejakso tallennettu/.test(t) && k === 'ok')).toBe(true); expect(e.log.modal).toBeFalsy();
    await new Promise((r) => setTimeout(r, 5));   // kortin uudelleenpiirto on asynkroninen (lukee joukkuedokin)
    expect(kortti(e)).toContain('Syöttötaito ja -peli'); expect(kortti(e)).toContain('Räjähtävä voima'); expect(kortti(e)).toContain('Viikko 1/6'); expect(kortti(e)).toContain('Muokkaa joukkuejaksoa');   // kortti piirtyy uudelleen onnistumisen jälkeen
  });
  it('vaihto toiseen teemaan: update sisältää historian (arrayUnion) — Rules sallii vain nämä kaksi kenttää', async () => {
    const e = ymp({ rooli }); await e.sb._mJjRender(); await e.sb.window._mJjAvaa(); syota(e, LOMAKE); await e.sb.window._mJjTallenna();
    await e.sb.window._mJjAvaa(); syota(e, Object.assign({}, LOMAKE, { _jjTekn: '__oma', _jjTeknOma: 'Oma teema', _jjFyys: 'fy:fy_ketteryys' })); await e.sb.window._mJjTallenna();
    expect(e.log.upd).toHaveLength(2); expect(Object.keys(e.log.upd[1].data).sort()).toEqual(['jaksofokus', 'jaksofokus_historia']); expect(e.log.upd[1].data.jaksofokus_historia.__arrayUnion[0]).toMatchObject({ konsepti_avain: 'teema_45_1', sulkutapa: 'korvattu' });
  });
  it('validointivirhe (kielletty sana) → ei kirjoitusta, selkeä virhetoast, lomake jää auki; offline → ei kirjoitusta', async () => {
    const e = ymp({ rooli }); await e.sb._mJjRender(); await e.sb.window._mJjAvaa(); syota(e, Object.assign({}, LOMAKE, { _jjSos: 'Tämä on heikkous' })); await e.sb.window._mJjTallenna();
    expect(e.log.upd).toEqual([]); expect(e.log.token).toBe(0); expect(e.log.toastit.some(([t, k]) => /Joukkuejaksoa ei voi tallentaa/.test(t) && /kielletyn sanan/.test(t) && k === 'error')).toBe(true); expect(e.log.modal).toBe(true);
    const o = ymp({ rooli, verkko: false }); await o.sb._mJjRender(); await o.sb.window._mJjAvaa(); syota(o, LOMAKE); await o.sb.window._mJjTallenna(); expect(o.log.upd).toEqual([]); expect(o.log.token).toBe(0); expect(o.log.modal).toBe(true);
  });
  it('kirjoitus epäonnistuu → ohje-toast (ei hiljaista), paikallinen tila EI muutu, lomake jää auki', async () => {
    const e = ymp({ rooli, kaada: true }); await e.sb._mJjRender(); await e.sb.window._mJjAvaa(); syota(e, LOMAKE); await e.sb.window._mJjTallenna();
    expect(e.log.toastit.some(([t, k]) => /Tallennus epäonnistui — tarkista oikeutesi/.test(t) && k === 'error')).toBe(true); expect(e.log.modal).toBe(true); expect(kortti(e)).toContain('Joukkueella ei ole jaksoa');
  });
  it('joukkuedokumenttia ei ole → ohje, EI kirjoitusyritystä eikä modaalia', async () => {
    const e = ymp({ rooli, doc: null }); await e.sb._mJjRender();
    expect(kortti(e)).toContain(rooli === 'vp' ? 'Joukkuedokumenttia ei ole — luo joukkue ensin.' : 'Pyydä VP:tä luomaan joukkue'); expect(kortti(e)).not.toContain('Aloita joukkuejakso');
    await e.sb.window._mJjAvaa(); expect(e.log.modal).toBeNull(); expect(e.log.upd).toEqual([]);
  });
});

describe('roolit ja joukkueen valinta', () => {
  it('VP ilman valittua joukkuetta ("Kaikki joukkueet"): ohje, ei lukua; ei kirjoitusta', async () => {
    const e = ymp({ rooli: 'vp', joukkue: '' }); await e.sb._mJjRender(); expect(kortti(e)).toContain('Valitse joukkue nähdäksesi joukkueen jakson.'); expect(e.log.luvut).toEqual(['seurat/kpv']);
  });
  it('muokkausoikeus: vp, UTJ, talenttivalmentaja, valmentaja, SA — muut (fysiikkavalmentaja, seurasihteeri) vain luku (ei nappia, modaali ei aukea)', async () => {
    for (const [r, sa, saa] of [['vp', false, true], ['urheilutoimenjohtaja', false, true], ['talenttivalmentaja', false, true], ['valmentaja', false, true], [null, true, true], ['fysiikkavalmentaja', false, false], ['seurasihteeri', false, false]]) {
      const e = ymp({ rooli: r, sa }); expect(e.sb._mJjSaaMuokata(), String(r)).toBe(saa);
    }
    const e = ymp({ rooli: 'fysiikkavalmentaja' }); await e.sb._mJjRender(); expect(kortti(e)).toContain('Joukkueella ei ole jaksoa'); expect(kortti(e)).not.toContain('Aloita joukkuejakso'); await e.sb.window._mJjAvaa(); expect(e.log.modal).toBeNull();
  });
  it('olemassa oleva jakso: kortti näyttää neljä aluetta; Muokkaa avaa saman lomakkeen esitäytettynä', async () => {
    const jf = L.JJ.tmJoukkuejaksoKirjoitus({ id: 'kpv_u13' }, L.JJ.tmJoukkuejaksoRakenna(L.JJ.tmJoukkuejaksoSyote((id) => ({ _jjTekn: 'teema:teema_45_1', _jjFyys: 'fy:fy_nopeus', _jjHen: 'Seuraava suoritus virheen jälkeen', _jjSos: 'Kannustetaan ääneen', _jjAlku: TANAAN, _jjKesto: '8' })[id] || ''),
      L.JJ.tmJoukkuejaksoTiedot({ id: 'kpv_u13', nimi: 'KPV U13' }, { joukkue: 'KPV U13', teemat: TEEMAT, ohjelmat: OHJ, tanaan: TANAAN }), {}), { nytISO: new Date().toISOString() }).paikallinen.jaksofokus;
    const e = ymp({ rooli: 'vp', doc: { nimi: 'KPV U13', ikaryhma: 'U13', jaksofokus: jf } }); await e.sb._mJjRender();
    for (const s of ['Syöttötaito ja -peli', 'Nopeus', 'Seuraava suoritus virheen jälkeen', 'Kannustetaan ääneen', '8 vk', 'Katselmusikkuna']) expect(kortti(e), s).toContain(s);
    await e.sb.window._mJjAvaa(); expect(e.log.modalHtml).toContain('Muokkaa joukkuejaksoa'); expect(e.log.modalHtml).toMatch(/value="fy:fy_nopeus" selected/); expect(e.log.modalHtml).toMatch(/value="8" selected/);
  });
});

describe('lähdetason rakenne', () => {
  it('kortti vain lipulla; skriptit ladataan; tm_idp ?v nostettu; ei Rules- eikä muuta kirjoitusta kuin joukkueet/{jid}.update', () => {
    expect(MA).toContain('<script src="lib/tm_tukitavoitteet.js?v=3"></script>'); expect(MA).toContain('<script src="lib/tm_joukkuejakso.js?v=1"></script>'); expect(MA).toContain('<script src="lib/tm_idp.js?v=12"></script>'); expect(MA).toContain('id="seasonJoukkuejakso"');
    const adapteri = MA.slice(MA.indexOf('/* ═══ J2 — JOUKKUEJAKSO'), MA.indexOf('/* Vastuuhenkilö (additiivinen kenttä'));
    expect(adapteri).toContain("liput.kentta !== true"); expect((adapteri.match(/\.update\(|\.set\(|\.add\(|\.delete\(/g) || [])).toEqual(['.update(']); expect(adapteri).toContain("collection('joukkueet').doc(d.jid).update(k.update)");
    expect(adapteri).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(adapteri).not.toMatch(/\b(SBL|SFL|DIAG|DFL)\b/);
    expect(MA).toContain("if (typeof _mJjRender === 'function') _mJjRender();   // J2");
  });
});
