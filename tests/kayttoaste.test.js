/**
 * S1.1 Käyttöaste — lib/tm_kayttoaste.js (Admin "Pilotin tila" + VP "Sovelluksen käyttö"): lukumäärät, trendi, pieni joukkue, ikäjärjestys, tietosuoja.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const KA = require('../lib/tm_kayttoaste.js');
const KO = require('../lib/tm_seuran_kooste.js');

const J = (nimi, n, ak30, o) => Object.assign({ nimi, ikavaihe: 'rakentaja', n_pelaajat: n, n_suostumus: n - 1, n_kirjautunut_30: 3, n_aktiivinen_7: 1, n_aktiivinen_30: ak30, n_huoltaja_30: 0 }, o || {});
const dok = (vk, jouk) => ({ vk, versio: 2, joukkueet: jouk });
const KAIKKI = [
  dok('2026-W39', { u15: J('KPV U15', 20, 2), u11: J('KPV P11', 4, 1), u13: J('KPV U13', 12, 3) }),
  dok('2026-W40', { u15: J('KPV U15', 20, 4), u11: J('KPV P11', 4, 1), u13: J('KPV U13', 12, 3) }),
  dok('2026-W41', { u15: J('KPV U15', 20, 8), u11: J('KPV P11', 4, 2), u13: J('KPV U13', 12, 3) }),
];

describe('tmKayttoasteLaske', () => {
  const s = KA.tmKayttoasteLaske(KAIKKI);
  const c = (k, x = s) => x.solut.find((y) => y.k === k);
  it('seurataso: pelaajia, osoittajat summattu joukkueiden yli, prosentti kun ≥ 5 pelaajaa', () => {
    expect(s.pelaajia).toBe(36); expect(s.pieni).toBe(false); expect(s.vk).toBe('2026-W41');
    expect(c('n_aktiivinen_30')).toMatchObject({ osoittaja: 13, nimittaja: 36, teksti: '36 %' });
    expect(c('n_suostumus')).toMatchObject({ osoittaja: 33, teksti: '92 %' });
  });
  it('trendi: edellinen viikko + suunta + neljän viikon sarja', () => {
    expect(c('n_aktiivinen_30')).toMatchObject({ suunta: 'ylos', edellinen: 8, edellinenTeksti: '22 %' });
    expect(c('n_aktiivinen_30').sarja).toEqual([6, 8, 13]);
    expect(c('n_kirjautunut_30').suunta).toBe('sama');
  });
  it('pieni joukkue (< 5): lukumäärä, ei prosenttia (D45-sääntö 4)', () => {
    const p = KA.tmKayttoasteLaske(KAIKKI, 'u11');
    expect(p.pieni).toBe(true); expect(p.solut.find((x) => x.k === 'n_aktiivinen_30').teksti).toBe('2/4'); expect(p.solut.find((x) => x.k === 'n_suostumus').teksti).toBe('3/4');
    const iso = KA.tmKayttoasteLaske(KAIKKI, 'u15'); expect(iso.solut.find((x) => x.k === 'n_aktiivinen_30').teksti).toBe('40 %');
  });
  it('tyhjä / versio 1 (uusin dokumentti ilman uusia kenttiä) → null', () => {
    expect(KA.tmKayttoasteLaske([])).toBeNull(); expect(KA.tmKayttoasteLaske(null)).toBeNull();
    expect(KA.tmKayttoasteLaske([{ vk: 'x', versio: 1, joukkueet: { a: { n_pelaajat: 3 } } }])).toBeNull();
  });
  it('v1-historia + v2 uusin: trendi ei sekoitu (edellinen null), luvut näkyvät', () => {
    const t = KA.tmKayttoasteLaske([{ vk: 'a', versio: 1, joukkueet: { u15: { n_pelaajat: 20 } } }, KAIKKI[2]]);
    expect(t).not.toBeNull(); expect(t.solut[0].edellinen).toBeNull(); expect(t.solut[0].suunta).toBeNull();
  });
});

describe('tmKayttoasteJoukkueet — ikäjärjestys, ei mittarijärjestystä', () => {
  it('nuorin ensin vaikka aktiivisuus olisi päinvastainen; pysyy samana kun luvut muuttuvat', () => {
    const jarj = (koosteet) => KA.tmKayttoasteJoukkueet(koosteet).map((x) => x.nimi);
    expect(jarj(KAIKKI)).toEqual(['KPV P11', 'KPV U13', 'KPV U15']);
    const muu = KAIKKI.map((d) => dok(d.vk, { u15: J('KPV U15', 20, 19), u11: J('KPV P11', 4, 0), u13: J('KPV U13', 12, 6) }));
    expect(jarj(muu)).toEqual(['KPV P11', 'KPV U13', 'KPV U15']);
  });
});

describe('tmKayttoasteHTML', () => {
  it('taulukko: seurarivi + joukkueet, otsikot, trendi; escapataan', () => {
    const h = KA.tmKayttoasteHTML(KAIKKI, { nimi: 'KPV <b>' });
    expect(h).toContain('data-kayttoaste="taulu"'); expect(h).toContain('KPV &lt;b&gt;'); expect(h).not.toContain('<b>');
    expect(h).toContain('Aktiivinen 7 pv'); expect(h).toContain('Huoltaja 30 pv'); expect(h).toContain('2/4'); expect(h).toContain('ed. 22 %');
    expect(h.indexOf('KPV P11')).toBeLessThan(h.indexOf('KPV U15'));
  });
  it('joukkueet:false → vain seurarivi; tyhjä → ohjeteksti', () => {
    expect(KA.tmKayttoasteHTML(KAIKKI, { joukkueet: false })).not.toContain('KPV U15');
    expect(KA.tmKayttoasteHTML([], {})).toContain('data-kayttoaste="tyhja"');
  });
  it('opts.t kääntää otsikot; ei hex-värejä (vain CSS-muuttujat)', () => {
    const h = KA.tmKayttoasteHTML(KAIKKI, { t: (x) => '«' + x + '»' }); expect(h).toContain('«Pelaajia»');
    expect(h).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
  it('tietosuoja: tuloste ei sisällä pelaajan nimiä/ID:itä/kenttänimiä', () => {
    const h = KA.tmKayttoasteHTML(KAIKKI, {});
    for (const k of ['etunimi', 'sukunimi', 'pelaajaId', 'viimeisinKirjautuminen', 'huoltajaEmail']) expect(h.toLowerCase().includes(k.toLowerCase()), k).toBe(false);
    const doc = KAIKKI[2]; expect(KO.tmKoosteRikkomukset(doc)).toEqual([]);
  });
});

// ── Kytkennät: Admin "Pilotin tila" ja VP_v25 Koti ──
import vm from 'vm';
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
function poimiFunktio(src, nimi) {   // function-lause rungon sulkuun asti
  const a = src.indexOf('async function ' + nimi + '(') >= 0 ? src.indexOf('async function ' + nimi + '(') : src.indexOf('function ' + nimi + '(');
  let d = 0, k = src.indexOf('{', a);
  for (let i = k; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}') { d--; if (!d) return src.slice(a, i + 1); } }
  throw new Error('funktiota ei löydy: ' + nimi);
}
describe('Admin — Pilotin tila: Käyttöaste (osio libissä, kuoressa vain liima)', () => {
  const A = lue('TalentMaster_Admin.html');
  it('skriptit ladataan; kehys lisätään suppilon jälkeen; lataus renderin lopussa; liima kutsuu paivitaSeuranKooste europe-west1:stä', () => {
    for (const f of ['tm_seuran_kooste.js', 'tm_joukkuejakso.js', 'tm_kayttoaste.js']) expect(A).toMatch(new RegExp('<script src="lib/' + f.replace('.', '\\.') + '\\?v=\\d+"></script>'));
    expect(A).toContain('window.TM_KAYTTOASTE.tmKayttoasteKehysHTML()'); expect(A).toMatch(/if \(el\) el\.innerHTML = html;\s*window\.kayttoasteLataa\(\);/);
    expect(A).toContain("httpsCallable('paivitaSeuranKooste')"); expect(A).toContain("firebase.app().functions('europe-west1')"); expect(A).toContain('window.kayttoastePaivitaKaikki');
  });
  const koost = [dok('2026-W40', { u13: J('KPV U13', 12, 2) }), dok('2026-W41', { u13: J('KPV U13', 12, 5) })];
  const luo = (extra) => {
    const els = { kayttoasteAlue: { innerHTML: '', insertAdjacentHTML(_p, h) { this.innerHTML += h; } }, kayttoastePaivitaBtn: { disabled: false, textContent: '' } };
    const kyselyt = [];
    const db = { collection: () => ({ doc: (sid) => ({ collection: (k) => ({ orderBy: (f, d) => ({ limit: (n) => ({ get: async () => { kyselyt.push({ sid, k, f, d, n }); if (sid === 'rikki') throw new Error('ei oikeutta'); return { docs: koost.slice().reverse().map((x) => ({ data: () => x })) }; } }) }) }) }) }) };
    const kutsut = [];
    const A2 = KA.tmKayttoasteAdmin(Object.assign({ db, document: { getElementById: (id) => els[id] }, FieldPath: { documentId: () => 'id' }, kutsu: async (d) => { kutsut.push(d.seuraId); return { data: d.seuraId === 'tuore' ? { tuore: true } : {} }; },
      seurat: () => [{ id: 'kpv', nimi: 'KPV' }, { id: 'rikki', nimi: 'Rikki' }, { id: 'demo', nimi: 'Demo', demo: true }, { id: 'vanha', nimi: 'Vanha', tila: 'arkistoitu' }, { id: 'pois', nimi: 'Pois', aktiivinen: false }], esc: (x) => String(x) }, extra || {}));
    return { A2, els, kyselyt, kutsut };
  };
  it('lataa: 4 viimeisintä koostetta (kooste, id desc, limit 4); demo/arkistoitu/ei-aktiivinen pois; yhden seuran virhe ei kaada muita', async () => {
    const { A2, els, kyselyt } = luo(); await A2.lataa();
    expect(kyselyt.map((x) => x.sid)).toEqual(['kpv', 'rikki']); expect(kyselyt[0]).toMatchObject({ k: 'kooste', f: 'id', d: 'desc', n: 4 });
    expect(els.kayttoasteAlue.innerHTML).toContain('data-kayttoaste-seura="kpv"'); expect(els.kayttoasteAlue.innerHTML).toContain('Luku epäonnistui');
    for (const e of ['Demo', 'Vanha', 'Pois']) expect(els.kayttoasteAlue.innerHTML).not.toContain(e);
  });
  it('Päivitä kaikki: paivitaSeuranKooste jokaiselle aktiiviselle seuralle (ei demo/arkistoitu), sitten lataus; nappi palautuu; yhteenvetorivi', async () => {
    const { A2, els, kutsut } = luo(); const r = await A2.paivitaKaikki();
    expect(kutsut).toEqual(['kpv', 'rikki']); expect(r).toEqual({ ok: 2, tuore: 0, virheita: 0 });
    expect(els.kayttoastePaivitaBtn.disabled).toBe(false); expect(els.kayttoastePaivitaBtn.textContent).toContain('Päivitä kaikki'); expect(els.kayttoasteAlue.innerHTML).toContain('2 päivitetty');
  });
  it('Päivitä kaikki: palvelimen jäähy ("tuore") ja kutsuvirhe lasketaan; virhe ei pysäytä muita', async () => {
    const { A2, els } = luo({ seurat: () => [{ id: 'a' }, { id: 'tuore' }, { id: 'b' }], kutsu: async (d) => { if (d.seuraId === 'b') throw new Error('permission-denied'); return { data: d.seuraId === 'tuore' ? { tuore: true } : {} }; } });
    const r = await A2.paivitaKaikki(); expect(r).toEqual({ ok: 1, tuore: 1, virheita: 1 }); expect(els.kayttoasteAlue.innerHTML).toContain('1 tuore'); expect(els.kayttoasteAlue.innerHTML).toContain('1 virhettä');
  });
  it('kehys: nappi + alue; ei hex-värejä paitsi olemassa olevan Admin-tyylin rgba', () => { const h = KA.tmKayttoasteKehysHTML(); expect(h).toContain('id="kayttoasteAlue"'); expect(h).toContain('kayttoastePaivitaKaikki()'); });
});

describe('VP_v25 — Koti: Sovelluksen käyttö', () => {
  const V = lue('TalentMaster_VP_v25.html');
  it('kortti lisätään Kotiin (lipusta riippumatta) ja ladataan renderin jälkeen; skriptit ladataan', () => {
    expect(V).toContain('<div id="vpKayttoasteKortti"'); expect(V).toMatch(/el\.innerHTML = h;\s*vpKayttoasteLataa\(\);/);
    expect(V).toMatch(/<script src="lib\/tm_kayttoaste\.js\?v=\d+"><\/script>/); expect(V).toMatch(/<script src="lib\/tm_seuran_kooste\.js\?v=\d+"><\/script>/);
  });
  it('vpKayttoasteLataa: oman seuran kooste → taulukko; lukuvirhe (ei oikeutta) → kortti piiloon, ei virhettä', async () => {
    const f = poimiFunktio(V, 'vpKayttoasteLataa');
    const koost = [dok('2026-W40', { u13: J('KPV U13', 12, 2) }), dok('2026-W41', { u13: J('KPV U13', 12, 5) })];
    const mk = (heita) => { const els = { vpKayttoasteKortti: { innerHTML: 'vanha' } };
      const sb = { document: { getElementById: (id) => els[id] }, _seuraId: 'kpv', _db: { collection: () => ({ doc: (sid) => { sb.luettu = sid; return { collection: () => ({ orderBy: () => ({ limit: () => ({ get: async () => { if (heita) throw new Error('permission-denied'); return { docs: koost.slice().reverse().map((d) => ({ data: () => d })) }; } }) }) }) }; } }) }, firebase: { firestore: { FieldPath: { documentId: () => 'id' } } }, vpT: (x) => x, window: { TM_KAYTTOASTE: KA } };
      vm.createContext(sb); vm.runInContext(f + '\nthis.__f = vpKayttoasteLataa;', sb); return { sb, els }; };
    const a = mk(false); await a.sb.__f(); expect(a.sb.luettu).toBe('kpv'); expect(a.els.vpKayttoasteKortti.innerHTML).toContain('Sovelluksen käyttö'); expect(a.els.vpKayttoasteKortti.innerHTML).toContain('data-kayttoaste="taulu"');
    const b = mk(true); await b.sb.__f(); expect(b.els.vpKayttoasteKortti.innerHTML).toBe('');
  });
});


describe('Gemini-erä S1.1 (docs/i18n/sv_kaannoserae_s11.json) — elävä', () => {
  const ERA = JSON.parse(lue('docs/i18n/sv_kaannoserae_s11.json')).rivit;
  it('jokainen lib/tm_kayttoaste.js:n t()-literaali, mittarin otsikko ja VP-kortin vpT-teksti on erässä (aja: node scripts/i18n_luo_gemini_era_s11.cjs)', () => {
    const lib = lue('lib/tm_kayttoaste.js'), vp = lue('TalentMaster_VP_v25.html');
    const a = vp.indexOf('async function vpKayttoasteLataa'), kortti = vp.slice(a, vp.indexOf('window.vpKayttoasteLataa', a));
    const avaimet = [...lib.matchAll(/\bt\('((?:[^'\\]|\\.)*)'\)/g)].map((m) => m[1]).concat([...lib.matchAll(/\blbl: '([^']+)'/g)].map((m) => m[1]), [...kortti.matchAll(/vpT\('((?:[^'\\]|\\.)*)'\)/g)].map((m) => m[1]));
    expect(avaimet.length).toBeGreaterThan(8);
    expect(avaimet.filter((k) => !ERA[k])).toEqual([]);
    Object.entries(ERA).forEach(([k, r]) => { expect(r.fi).toBe(k); expect(typeof r.sv).toBe('string'); });
  });
});
