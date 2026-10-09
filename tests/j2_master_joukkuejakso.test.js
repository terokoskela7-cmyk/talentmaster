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

function ymp({ rooli = 'valmentaja', joukkue = 'KPV U13', liput = { kentta: true }, doc: doc0 = { nimi: 'KPV U13', ikaryhma: 'U13' }, kaada = false, verkko = true, sa = false, pelaajat = [], pelaajaKaada = [], haeKaada = false, julkiset = undefined, julkisetVirhe = false } = {}) {
  const doc = doc0 ? JSON.parse(JSON.stringify(doc0)) : null;
  const pdb = JSON.parse(JSON.stringify(pelaajat)), log = { pelaajaUpd: [], luvut: [], upd: [], toastit: [], token: 0, el: {}, modal: null, uudetKentat: null };
  const el = (id) => (log.el[id] = log.el[id] || { id, innerHTML: '', value: '', style: {}, remove() { delete log.el[id]; if (id === '_mJjModal') log.modal = null; } });
  const jDoc = (id) => ({ get: async () => { log.luvut.push('joukkueet/' + id); return { exists: !!doc, data: () => JSON.parse(JSON.stringify(doc)) }; },
    update: async (u) => { if (kaada) throw Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }); log.upd.push({ polku: 'seurat/kpv/joukkueet/' + id, data: u });
      Object.keys(u).forEach((k) => { doc[k] = (u[k] && u[k].__arrayUnion) ? (doc[k] || []).concat(JSON.parse(JSON.stringify(u[k].__arrayUnion))) : JSON.parse(JSON.stringify(u[k])); }); } });   // Firestore-käytös: palvelin säilyttää päivityksen
  const db = { collection: (c) => ({ doc: (sid) => ({ get: async () => { log.luvut.push(c + '/' + sid); return { exists: true, data: () => ({ nimi: 'KPV', liput: liput }) }; },
    collection: (c2) => (c2 === 'pelaajat' ? { where: (kentta, op, arvo) => ({ get: async () => { log.luvut.push('pelaajat?' + kentta + op + arvo); if (haeKaada || log.haeKaada) throw new Error('unavailable'); const rivit = pdb.filter((p) => p.jaksofokus && p.jaksofokus.joukkuejakso_viite && p.jaksofokus.joukkuejakso_viite.jid === arvo); return { docs: rivit.map((p) => ({ id: p.id, data: () => JSON.parse(JSON.stringify(p)) })) }; } }),
      doc: (pid) => ({ update: async (u) => { if ((pelaajaKaada.indexOf(pid) >= 0 || (log.kaadaIdt || []).indexOf(pid) >= 0) && !log.pelaajaSalli) throw new Error('permission-denied'); log.pelaajaUpd.push({ id: pid, data: u }); const p = pdb.find((x) => x.id === pid); const v = u['jaksofokus.joukkuejakso_viite']; if (p && v) p.jaksofokus.joukkuejakso_viite = JSON.parse(JSON.stringify(v)); } }) } : c2 === 'liput' ? { doc: (id) => ({ get: async () => { log.luvut.push('liput/' + id); if (julkisetVirhe) throw new Error('permission-denied'); return { exists: julkiset !== undefined, data: () => julkiset }; } }) } : { doc: (id) => jDoc(id) }) }) }) };
  const sb = {
    _db: db, _seuraId: 'kpv', _demo: false, _rooli: rooli, _superAdmin: sa, _joukkue: joukkue, masterT: (x) => x, console: { warn: (...a) => (log.warn = log.warn || []).push(a) }, TM_VIRHEKOODI: require('../lib/tm_virhekoodi.js'), Date, Object, Array, Promise, Math, JSON, String, Number,
    _mEsc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    tmPaivaIso: (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
    toast: (t, k) => log.toastit.push([t, k]), _mVerkkoEnnenSulkua: () => verkko, _mTuoreToken: async () => { log.token++; }, _ohjLataaKirjasto: async () => OHJ, _mLataaTeemat: async () => {},
    firebase: { auth: () => ({ currentUser: { uid: 'u' } }), firestore: { FieldValue: { arrayUnion: (...a) => ({ __arrayUnion: a }) } } },
    window: { TM_LIPUT: require('../lib/tm_liput.js'), TM_JOUKKUEJAKSO: L.JJ, TM_JOUKKOALOITUS: require('../lib/tm_joukkoaloitus.js'), TM_VALMENNUSLINJA: L.VL, _mTeemat: TEEMAT, _ohjKirjasto: OHJ },
    document: { getElementById: (id) => (id === 'seasonJoukkuejakso' || /^_jj|^_mJjModal/.test(id) ? (id === '_mJjModal' && !log.modal ? null : el(id)) : null),
      createElement: () => ({ set innerHTML(h) { log.modalHtml = h; }, get firstChild() { return { _on: 1 }; } }), body: { appendChild(n) { if (n && n._on) { log.modal = true; el('_mJjModal'); } } } },
  };
  vm.createContext(sb);
  vm.runInContext(['function _joukkueTunniste(', 'async function _mJjLataaLiput(', 'function _mJjSaaMuokata(', 'function _mJjCtx(', 'async function _mJjRender(', 'function _mJjVoiLuoda(', 'window._mJjAvaa = async function', 'window._mJjSulje = function', 'window._mJjTallenna = async function', 'async function _mJjSynkkaPelaajiin(', 'window._mJjSynkkaUudelleen = async function'].map(pura).join(';\n') + ';\nthis._mJjRender = _mJjRender;\nthis._mJjSaaMuokata = _mJjSaaMuokata;', sb);
  sb.window._mJjLiput = {};
  return { sb, log, el, pdb };
}
const kortti = (e) => e.log.el.seasonJoukkuejakso ? e.log.el.seasonJoukkuejakso.innerHTML : '';
const syota = (e, arvot) => { Object.keys(arvot).forEach((k) => { e.el(k).value = arvot[k]; }); };
const LOMAKE = { _jjTekn: 'teema:teema_45_1', _jjTeknOma: '', _jjFyys: 'ohj:ohjelmat_105_1', _jjFyysOma: '', _jjHen: 'Seuraava suoritus virheen jälkeen', _jjSos: '', _jjAlku: TANAAN, _jjKesto: '6' };

describe('lippu liput.kentta (D25)', () => {
  it('ilman lippua (KPV nyt: liput puuttuu) ei näy mitään eikä joukkuedokumenttia lueta; lippu false → sama', async () => {
    for (const liput of [{}, null, { kentta: false }, { kentta: 'true' }]) { const e = ymp({ liput }); await e.sb._mJjRender(); expect(kortti(e), JSON.stringify(liput)).toBe(''); expect(e.log.luvut).toEqual(['seurat/kpv', 'liput/julkiset']); }
  });
  it('demo ja seuraton: ei lueta lainkaan; liput luetaan kerran per seura (välimuisti)', async () => {
    const d = ymp(); d.sb._demo = true; await d.sb._mJjRender(); expect(d.log.luvut).toEqual([]);
    const e = ymp(); await e.sb._mJjRender(); await e.sb._mJjRender(); expect(e.log.luvut.filter((x) => x === 'seurat/kpv')).toHaveLength(1);
  });
});

describe('K1 osa 2 · lippu liput/julkiset (yksi totuus) + vanha seurat.liput.kentta fallback', () => {
  it('uusi dokumentti {kentta:true} avaa kortin vaikka vanhaa lippua ei ole; {kentta:false} sulkee vaikka vanha olisi true; ei boolean-arvoa → vanha fallback', async () => {
    const avaa = ymp({ liput: {}, julkiset: { kentta: true } }); await avaa.sb._mJjRender(); expect(kortti(avaa)).toContain('Aloita joukkuejakso');
    const kiinni = ymp({ liput: { kentta: true }, julkiset: { kentta: false } }); await kiinni.sb._mJjRender(); expect(kortti(kiinni)).toBe('');
    for (const julkiset of [undefined, {}, { kentta: 'true' }, { muu: true }]) { const e = ymp({ liput: { kentta: true }, julkiset }); await e.sb._mJjRender(); expect(kortti(e), JSON.stringify(julkiset)).toContain('Aloita joukkuejakso'); }
    // virhe luettaessa liput/julkiset (esim. Rules ei vielä deployattu) → fallback vanhaan lippuun, UI ei jumita
    const virhe = ymp({ liput: { kentta: true }, julkisetVirhe: true }); await virhe.sb._mJjRender(); expect(kortti(virhe)).toContain('Aloita joukkuejakso'); const virheIlman = ymp({ liput: {}, julkisetVirhe: true }); await virheIlman.sb._mJjRender(); expect(kortti(virheIlman)).toBe('');
    for (const julkiset of [undefined, {}, { kentta: 1 }]) { const e = ymp({ liput: {}, julkiset }); await e.sb._mJjRender(); expect(kortti(e), JSON.stringify(julkiset)).toBe(''); }
  });
});

describe.each([['valmentaja', 'valmentaja'], ['vp', 'vp']])('KPV U13 · %s', (_n, rooli) => {
  it('kortti: joukkue valittu → luetaan joukkueet/kpv_u13; ei jaksoa → "Joukkueella ei ole jaksoa" + Aloita joukkuejakso', async () => {
    const e = ymp({ rooli }); await e.sb._mJjRender();
    expect(e.log.luvut).toEqual(['seurat/kpv', 'liput/julkiset', 'joukkueet/kpv_u13']); expect(kortti(e)).toContain('Joukkueella ei ole jaksoa'); expect(kortti(e)).toContain('Aloita joukkuejakso'); expect(kortti(e)).toContain('_mJjAvaa()');
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
  it('J4 B: viikkotavoitteet-rivit kulkevat tallennukseen (jaksofokus.viikot) ja kortti näyttää kuluvan viikon tavoitteen; KIELLETYT → ei kirjoitusta', async () => {
    const e = ymp({ rooli }); await e.sb._mJjRender(); await e.sb.window._mJjAvaa(); expect(e.log.modalHtml).toContain('id="_jjVk_1"');
    syota(e, Object.assign({}, LOMAKE, { _jjVk_1: 'Syöttö kahdella kosketuksella', _jjVk_2: 'Pelaa kolmiot' })); await e.sb.window._mJjTallenna(); await new Promise((r) => setTimeout(r, 5));
    expect(e.log.upd[0].data.jaksofokus.viikot).toEqual([{ vk: 1, tavoite: 'Syöttö kahdella kosketuksella', lahde: 'valmentaja' }, { vk: 2, tavoite: 'Pelaa kolmiot', lahde: 'valmentaja' }]); expect(kortti(e)).toContain('Viikon tavoite'); expect(kortti(e)).toContain('Syöttö kahdella kosketuksella');
    const huono = ymp({ rooli }); await huono.sb._mJjRender(); await huono.sb.window._mJjAvaa(); syota(huono, Object.assign({}, LOMAKE, { _jjVk_1: 'Tämä on heikkous' })); await huono.sb.window._mJjTallenna(); expect(huono.log.upd).toEqual([]); expect(huono.log.toastit.some(([t, k]) => k === 'error' && /viikon 1 tavoite sisältää kielletyn sanan/.test(t))).toBe(true);
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
    expect(e.log.toastit.some(([t, k]) => /Tallennus epäonnistui — tarkista oikeutesi.*\(permission-denied\)$/.test(t) && k === 'error')).toBe(true); expect(e.log.modal).toBe(true);   // D53: koodi toastissa, virhe konsoliin, modaali auki
    expect(e.log.warn.some((a) => a[0] === '[J2] kirjoitus:')).toBe(true); expect(kortti(e)).toContain('Joukkueella ei ole jaksoa');
  });
  it('joukkuedokumenttia ei ole → ohje, EI kirjoitusyritystä eikä modaalia', async () => {
    const e = ymp({ rooli, doc: null }); await e.sb._mJjRender();
    expect(kortti(e)).toContain(rooli === 'vp' ? 'Joukkuedokumenttia ei ole — luo joukkue ensin.' : 'Pyydä VP:tä luomaan joukkue'); expect(kortti(e)).not.toContain('Aloita joukkuejakso');
    await e.sb.window._mJjAvaa(); expect(e.log.modal).toBeNull(); expect(e.log.upd).toEqual([]);
  });
});

describe('roolit ja joukkueen valinta', () => {
  it('VP ilman valittua joukkuetta ("Kaikki joukkueet"): ohje, ei lukua; ei kirjoitusta', async () => {
    const e = ymp({ rooli: 'vp', joukkue: '' }); await e.sb._mJjRender(); expect(kortti(e)).toContain('Valitse joukkue nähdäksesi joukkueen jakson.'); expect(e.log.luvut).toEqual(['seurat/kpv', 'liput/julkiset']);
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
    expect(MA).toContain('<script src="lib/tm_tukitavoitteet.js?v=3"></script>'); expect(MA).toContain('<script src="lib/tm_joukkuejakso.js?v=4"></script>'); expect(MA).toContain('<script src="lib/tm_idp.js?v=13"></script>'); expect(MA).toContain('id="seasonJoukkuejakso"');
    const adapteri = MA.slice(MA.indexOf('/* ═══ J2 — JOUKKUEJAKSO'), MA.indexOf('/* K1 / A (docs/CODE_BRIEF_K1_TAMAN_TUEKSI.md §3)'));
    expect(adapteri).toContain("liput.kentta !== true"); expect((adapteri.match(/\.update\(|\.set\(|\.add\(|\.delete\(/g) || [])).toEqual(['.update(']); expect(adapteri).toContain("collection('joukkueet').doc(d.jid).update(k.update)");
    expect(adapteri).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(adapteri).not.toMatch(/\b(SBL|SFL|DIAG|DFL)\b/);
    expect(MA).toContain("if (typeof _mJjRender === 'function') _mJjRender();   // J2");
  });
});

/* ══ K1 / A — joukkuejakson snapshot pelaajien jaksoihin (J2-propagointi) ══ */
describe('K1/A · J2-tallennus propagoi viikkotavoitteet pelaajien joukkuejakso_viite:en', () => {
  const VAN = (viite) => ({ id: 'x', jaksofokus: { konsepti_avain: 'k', joukkuejakso_viite: viite } });
  const DOC0 = (alku) => ({ nimi: 'KPV U13', ikaryhma: 'U13', jaksofokus: { konsepti_avain: 'teema_45_1', konsepti_nimi: 'Syöttötaito ja -peli', domeeni: 'tekninen', laji: 'jalkapallo', lahde: 'seura', osa_alueet: { tekninen_taktinen: { nimi: 'Syöttötaito ja -peli', lahde: 'seura', avain: 'teema_45_1' }, fyysinen: { avain: 'fy_rajahtavyys', nimi: 'Räjähtävä voima', ohjelma_id: 'ohjelmat_105_1', lahde: 'seura' }, henkinen: { kuvaus: 'Seuraava suoritus virheen jälkeen' } }, alku, kesto_vk: 6 } });
  const P = (id, viite) => Object.assign(VAN(viite), { id });
  const NYT = new Date(); const A1 = TANAAN;
  const lisaaPv = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const muokkaa = async (e, arvot) => { await e.sb._mJjRender(); await e.sb.window._mJjAvaa(); syota(e, Object.assign({}, LOMAKE, arvot)); await e.sb.window._mJjTallenna(); await new Promise((r) => setTimeout(r, 5)); };
  // perustaa joukkueelle jakson oikealla lomakkeella (identiteetti/domeeni samoin kuin tuotanto), lisää pelaajat vasta sen jälkeen ja nollaa lokin
  const perusta = async (pelaajat, opts) => { const e = ymp(Object.assign({ doc: { nimi: 'KPV U13', ikaryhma: 'U13' }, haeKaada: false }, opts || {})); await muokkaa(e, {}); e.pdb.push(...JSON.parse(JSON.stringify(pelaajat))); e.log.pelaajaUpd.length = 0; e.log.upd.length = 0; e.log.luvut.length = 0; e.log.toastit.length = 0; return e; };
  const viiteIdt = (e) => e.log.pelaajaUpd.map((u) => u.id).sort();

  it('viikkotavoite muuttuu: päivittyvät vain pelaajat, joilla sama jid + alku (myös vanha {jid, alku} -viite); toisen joukkueen ja toisen jakson pelaajat eivät; päivitys = YKSI dot-path-kenttä; snapshotissa vain sallitut avaimet', async () => {
    const e = await perusta([P('a', { jid: 'kpv_u13', alku: A1 }), P('b', { jid: 'kpv_u13', alku: A1, kesto_vk: 6, nimi: 'Vanha', viikot: [] }), P('c', { jid: 'kpv_u13', alku: '2020-01-06' }), P('d', { jid: 'kpv_u14', alku: A1 }), { id: 'e', jaksofokus: null }]);
    await muokkaa(e, { _jjVk_1: 'Syöttö kahdella kosketuksella' });
    expect(viiteIdt(e)).toEqual(['a', 'b']); expect(e.log.luvut).toContain('pelaajat?jaksofokus.joukkuejakso_viite.jid==kpv_u13');
    e.log.pelaajaUpd.forEach((u) => { expect(Object.keys(u.data)).toEqual(['jaksofokus.joukkuejakso_viite']); const v = u.data['jaksofokus.joukkuejakso_viite']; expect(Object.keys(v).sort()).toEqual(['alku', 'jid', 'kesto_vk', 'nimi', 'viikot']); expect(v).toMatchObject({ jid: 'kpv_u13', alku: A1, kesto_vk: 6, nimi: 'Syöttötaito ja -peli', viikot: [{ vk: 1, tavoite: 'Syöttö kahdella kosketuksella' }] }); });
    expect(e.log.toastit.some(([t, k]) => /Joukkuejakso tallennettu ✓/.test(t) && k === 'ok')).toBe(true); expect(kortti(e)).not.toContain('tm-jj-synkka');
  });
  it('ALKU MUUTTUU (sama jakso): pelaajat haetaan edeltävällä alulla ja heidän viite.alku päivittyy uuteen; uudelleenajo vanhalla parilla ei osu jo päivitettyihin', async () => {
    const e = await perusta([P('a', { jid: 'kpv_u13', alku: A1 }), P('b', { jid: 'kpv_u13', alku: lisaaPv(A1, 7) })]);
    await muokkaa(e, { _jjAlku: lisaaPv(A1, 7) }); expect(viiteIdt(e)).toEqual(['a']); expect(e.log.pelaajaUpd[0].data['jaksofokus.joukkuejakso_viite'].alku).toBe(lisaaPv(A1, 7));
  });
  it('UUSI JOUKKUEJAKSO (eri taito) ei koske vanhan jakson snapshotteja', async () => {
    const e = await perusta([P('a', { jid: 'kpv_u13', alku: A1, kesto_vk: 6, nimi: 'Syöttötaito ja -peli', viikot: [] })]);
    await muokkaa(e, { _jjTekn: '__oma', _jjTeknOma: 'Toinen taito', _jjAlku: lisaaPv(A1, 14) }); expect(e.log.upd.length).toBeGreaterThan(0); expect(e.log.pelaajaUpd).toEqual([]);
  });
  it('EPÄONNISTUNEET: joukkue tallentuu, onnistuneet päivittyvät, epäonnistuneista näkyy valmentajalle "N pelaajan viikkotavoite ei päivittynyt, yritä uudelleen" (toast + kortin ilmoitus) ja Yritä uudelleen päivittää loput', async () => {
    const e = await perusta([P('a', { jid: 'kpv_u13', alku: A1 }), P('b', { jid: 'kpv_u13', alku: A1 }), P('c', { jid: 'kpv_u13', alku: A1 })]); e.log.kaadaIdt = ['b', 'c'];
    await muokkaa(e, { _jjVk_1: 'Uusi' });
    expect(e.log.upd).toHaveLength(1); expect(viiteIdt(e)).toEqual(['a']); expect(e.log.toastit.some(([t, k]) => /Joukkuejakso tallennettu — 2 pelaajan viikkotavoite ei päivittynyt, yritä uudelleen/.test(t) && k === 'error')).toBe(true);
    expect(kortti(e)).toContain('tm-jj-synkka'); expect(kortti(e)).toContain('2 pelaajan viikkotavoite ei päivittynyt, yritä uudelleen'); expect(kortti(e)).toContain('_mJjSynkkaUudelleen');
    e.log.pelaajaSalli = true; e.log.pelaajaUpd.length = 0; await e.sb.window._mJjSynkkaUudelleen(); await new Promise((r) => setTimeout(r, 5));
    expect(viiteIdt(e)).toEqual(['a', 'b', 'c']); expect(kortti(e)).not.toContain('tm-jj-synkka'); expect(e.log.toastit.some(([t, k]) => /Viikkotavoitteet päivitetty ✓/.test(t) && k === 'ok')).toBe(true);
  });
  it('pelaajahaku epäonnistuu → joukkue silti tallennettu, ilmoitus + uudelleenyritys; offline-uudelleenyritys ei kirjoita; demo ei hae', async () => {
    const e = await perusta([P('a', { jid: 'kpv_u13', alku: A1 })]); e.log.haeKaada = true; await muokkaa(e, { _jjVk_1: 'X' });
    expect(e.log.upd).toHaveLength(1); expect(e.log.pelaajaUpd).toEqual([]); expect(kortti(e)).toContain('tm-jj-synkka'); expect(e.log.toastit.some(([t, k]) => /ei päivittynyt, yritä uudelleen/.test(t) && k === 'error')).toBe(true);
    const o = await perusta([P('a', { jid: 'kpv_u13', alku: A1 })]); o.log.kaadaIdt = ['a']; await muokkaa(o, { _jjVk_1: 'X' }); o.sb._mVerkkoEnnenSulkua = () => false; o.log.pelaajaSalli = true; await o.sb.window._mJjSynkkaUudelleen(); expect(o.log.pelaajaUpd).toEqual([]);
  });
  it('lähdetaso: propagointi vain pelaajadokin jaksofokus.joukkuejakso_viite-kenttään (dot-path), ei Rules-muutosta, ei kovakoodattuja värejä', () => {
    const k1 = MA.slice(MA.indexOf('/* K1 / A (docs/CODE_BRIEF_K1_TAMAN_TUEKSI.md §3)'), MA.indexOf('/* Vastuuhenkilö (additiivinen kenttä'));
    expect((k1.match(/\.update\(/g) || []).length).toBe(1); expect(k1).toContain("collection('pelaajat').doc(u.id).update(u.update)"); expect(k1).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(k1).not.toMatch(/\.set\(|\.delete\(|\.add\(/);
  });
});
