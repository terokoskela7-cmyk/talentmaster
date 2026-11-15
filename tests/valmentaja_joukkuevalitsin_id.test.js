/**
 * Valmentajan joukkuevalitsin: YKSI rivi per joukkuetunniste, nimi joukkuedokumentista (CLAUDE.md §7.18).
 * Vika (staging, 14.11.2026): kayttajat.joukkueet = ['kuorma_s01_u8_a'] + joukkueetNimet = ['Testijoukkue U8 A'] → vanha valitsin vertasi
 * normalisoituja merkkijonoja ('KUORMA S01 U8 A' ≠ 'TESTIJOUKKUE U8 A') → sama joukkue kahtena rivinä. Sama vika oikeilla seuroilla, kun id ≠ nimen slug.
 *
 *   (a) id ≠ nimen slug (kuorma/Sibbo-tyyppi) → yksi rivi, teksti = joukkueen nimi
 *   (b) id = slug (sjk_p14 / SJK P14) → yksi rivi
 *   (c) vanha tallennettu NIMI → oikea joukkue valittuna (kanonisoidaan tunnisteeksi); uusi tallennus = tunniste
 *   (d) pelaajalista valitulle joukkueelle sama kuin ennen (lataus ei muutu; _joukkue = docin nimi → sama tunniste, sama jäsenyys)
 *   + arkistoidut / aktiivinen===false pois · legacy-varalla · RUNTIME: Masterin oikea valitsinkoodi vm-sandboxissa
 *   + generaattori (aineisto.js: joukkue = nimi) + diag-skripti (lukumäärät, ei nimiä)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const M = readFileSync(join(ROOT, 'TalentMaster_Master_v16.html'), 'utf8');
const J = require('../lib/tm_joukkue.js');
const DIAG = require('../scripts/diag_valmentaja_joukkueet.js');

const KUORMA = [['kuorma_s01_u8_a', 'Testijoukkue U8 A'], ['kuorma_s01_u11_b', 'Testijoukkue U11 B'], ['kuorma_s01_u13_a', 'Testijoukkue U13 A'], ['kuorma_s01_u16_b', 'Testijoukkue U16 B'], ['kuorma_s01_u18_a', 'Testijoukkue U18 A']];
const kuormaDocs = KUORMA.map(([id, nimi]) => ({ id, nimi }));
const kuormaValm = { joukkue: 'Testijoukkue U8 A', joukkueNimi: 'Testijoukkue U8 A', joukkueet: KUORMA.map((x) => x[0]), joukkueetNimet: KUORMA.map((x) => x[1]) };

describe('(a) id ≠ nimen slug → yksi rivi per tunniste, nimi docista', () => {
  it('kuorma staging: 5 joukkuetta = 5 riviä (ei 10), tekstit ovat joukkuedokumenttien nimet', () => {
    const l = J.tmValmentajanJoukkueet(kuormaValm, kuormaDocs, 'Testijoukkue U8 A');
    expect(l).toHaveLength(5);
    expect(l.map((x) => x.nimi).sort()).toEqual(KUORMA.map((x) => x[1]).sort());
    expect(l.every((x) => x.id && /^kuorma_s01_/.test(x.id))).toBe(true);
    expect(l.some((x) => /^KUORMA/.test(x.nimi))).toBe(false);   // ei tunnisteesta muodostettua nimeä
  });
  it('Sibbo-tyyppi: id sibbovargarna_2014_bl + nimi "2014 Blå" → yksi rivi', () => {
    const docs = [{ id: 'sibbovargarna_2014_bl', nimi: '2014 Blå' }, { id: 'sibbovargarna_2014_vit', nimi: '2014 Vit' }];
    const l = J.tmValmentajanJoukkueet({ joukkue: 'sibbovargarna_2014_bl', joukkueet: docs.map((d) => d.id), joukkueetNimet: ['2014 Blå', '2014 Vit'] }, docs, 'sibbovargarna_2014_bl');
    expect(l.map((x) => x.nimi)).toEqual(['2014 Blå', '2014 Vit']);
  });
  it('automaattinen Firestore-id ei näy riviteksti: nimi tulee docista', () => {
    const docs = [{ id: 'aB3xK9Qm2LpZ', nimi: 'P12 Musta' }, { id: 'Zy7wN1RtU4vC', nimi: 'P12 Valkoinen' }];
    const l = J.tmValmentajanJoukkueet({ joukkueet: docs.map((d) => d.id) }, docs, '');
    expect(l.map((x) => x.nimi)).toEqual(['P12 Musta', 'P12 Valkoinen']);
  });
});

describe('(b) id = nimen slug → yksi rivi', () => {
  const docs = [{ id: 'sjk_p14', nimi: 'SJK P14' }, { id: 'sjk_p15', nimi: 'SJK P15' }];
  it('sjk_p14 / SJK P14 kaikissa kentissä → 2 riviä (ei 4)', () => {
    const l = J.tmValmentajanJoukkueet({ joukkue: 'SJK P14', joukkueNimi: 'SJK P14', joukkueet: ['sjk_p14', 'sjk_p15'], joukkueetNimet: ['SJK P14', 'SJK P15'] }, docs, 'SJK P14');
    expect(l).toEqual([{ id: 'sjk_p14', nimi: 'SJK P14' }, { id: 'sjk_p15', nimi: 'SJK P15' }]);
  });
  it('legacy-slug ilman docia yhdistyy nimirivinä (sjk_p14 ja SJK P14 = sama; ilman joukkuedokumentteja)', () => {
    const l = J.tmValmentajanJoukkueet({ joukkueetNimet: ['SJK P14'], joukkueet: ['sjk_p14'], joukkue: 'sjk_p14' }, [], '');
    expect(l).toEqual([{ id: null, nimi: 'SJK P14' }]);
  });
  it('legacy-slug osuu docin nimeen (slug → näyttömuoto → doc), ei kaksoisriviä', () => {
    const l = J.tmValmentajanJoukkueet({ joukkue: 'sjk_p14', joukkueNimi: 'SJK P14' }, [{ id: 'abc123', nimi: 'SJK P14' }], '');
    expect(l).toEqual([{ id: 'abc123', nimi: 'SJK P14' }]);
  });
});

describe('arkistoidut ja ei-aktiiviset pois; legacy vain varalla', () => {
  const docs = [{ id: 'a', nimi: 'A' }, { id: 'b', nimi: 'B', arkistoitu: true }, { id: 'c', nimi: 'C', aktiivinen: false }, { id: 'd', nimi: 'D', aktiivinen: true }];
  it('arkistoitu === true ja aktiivinen === false eivät tule riveiksi (ei tunnisteesta eikä nimestä)', () => {
    const l = J.tmValmentajanJoukkueet({ joukkueet: ['a', 'b', 'c', 'd'], joukkueetNimet: ['A', 'B', 'C', 'D'], joukkue: 'B' }, docs, 'C');
    expect(l.map((x) => x.id)).toEqual(['a', 'd']);
  });
  it('legacy-nimi joka ei löydy docista näytetään nimenä kuten ennen; löytyvä yhdistyy tunnisteeseen', () => {
    const l = J.tmValmentajanJoukkueet({ joukkueet: ['a'], joukkueetNimet: ['A', 'Vanha Joukkue'], joukkue: 'a' }, docs, '');
    expect(l).toEqual([{ id: 'a', nimi: 'A' }, { id: null, nimi: 'Vanha Joukkue' }]);
  });
  it('legacy-nimi tunnisteen paikalla (joukkueet[] = ["A"]) kanonisoidaan docin tunnisteeksi', () => {
    expect(J.tmValmentajanJoukkueet({ joukkueet: ['A', 'D'] }, docs, '')).toEqual([{ id: 'a', nimi: 'A' }, { id: 'd', nimi: 'D' }]);
  });
  it('tyhjä / puuttuva data ei kaada', () => {
    expect(J.tmValmentajanJoukkueet(null, null, null)).toEqual([]);
    expect(J.tmValmentajanJoukkueet({}, docs, undefined)).toEqual([]);
  });
});

describe('(c) tallennettu valinta: tunniste (uusi) tai nimi (vanha) → oikea joukkue', () => {
  const l = J.tmValmentajanJoukkueet(kuormaValm, kuormaDocs, '');
  const nimiIdlla = (id) => kuormaDocs.find((d) => d.id === id).nimi;
  it('uusi tallennus = tunniste', () => {
    expect(J.tmValitseValmentajaJoukkue(l, 'kuorma_s01_u13_a', 'Testijoukkue U8 A', kuormaDocs).nimi).toBe('Testijoukkue U13 A');
  });
  it('vanha tallennettu NIMI kanonisoidaan tunnisteeksi (kenenkään valinta ei katoa)', () => {
    const v = J.tmValitseValmentajaJoukkue(l, 'Testijoukkue U16 B', 'Testijoukkue U8 A', kuormaDocs);
    expect(v.id).toBe('kuorma_s01_u16_b'); expect(v.nimi).toBe(nimiIdlla('kuorma_s01_u16_b'));
    expect(J.tmValitseValmentajaJoukkue(l, 'testijoukkue u16 b', '', kuormaDocs).id).toBe('kuorma_s01_u16_b');   // kirjainkoko
  });
  it('vanha tallennettu slug-asu ("sjk_p15") ja isolla kirjoitettu ("SJK P15") osuvat samaan joukkueeseen', () => {
    const docs = [{ id: 'sjk_p14', nimi: 'SJK P14' }, { id: 'sjk_p15', nimi: 'SJK P15' }], ll = J.tmValmentajanJoukkueet({ joukkueet: ['sjk_p14', 'sjk_p15'] }, docs, '');
    expect(J.tmValitseValmentajaJoukkue(ll, 'SJK P15', '', docs).id).toBe('sjk_p15');
    expect(J.tmValitseValmentajaJoukkue(ll, 'sjk_p15', '', docs).id).toBe('sjk_p15');
  });
  it('ei onnistu → nykyinen _joukkue → muuten oletus (ensimmäinen)', () => {
    expect(J.tmValitseValmentajaJoukkue(l, 'Poistettu Joukkue', 'Testijoukkue U13 A', kuormaDocs).id).toBe('kuorma_s01_u13_a');
    expect(J.tmValitseValmentajaJoukkue(l, 'Poistettu Joukkue', 'Muu', kuormaDocs)).toBe(l[0]);
    expect(J.tmValitseValmentajaJoukkue(l, null, null, kuormaDocs)).toBe(l[0]);
    expect(J.tmValitseValmentajaJoukkue([], 'x', 'y', [])).toBe(null);
  });
  it('nimirivi (ei docia): tallennettu nimi osuu', () => {
    const ll = J.tmValmentajanJoukkueet({ joukkueetNimet: ['SJK P14', 'SJK P15'] }, [], '');
    expect(J.tmValitseValmentajaJoukkue(ll, 'SJK P15', '', []).nimi).toBe('SJK P15');
  });
});

describe('(d) pelaajalista valitulle joukkueelle sama kuin ennen', () => {
  it('_lataaPelaajat-polku ennallaan: kaksoiskysely + jäsenyys _mPJ:llä + lista_yhteenveto saa tunnisteen kanonisoinnista', () => {
    const i = M.indexOf('async function _lataaPelaajat('), f = M.slice(i, i + 9000);
    expect(f).toContain("col.where('joukkue', '==', _joukkue)");
    expect(f).toContain("col.where('joukkueet', 'array-contains', jId)");
    expect(f).toContain('docs = docs.filter(d => _mPJ(d.data()).indexOf(_kanonJ.id) >= 0)');
    expect(f).toContain('tmKanonisoiJoukkue(_joukkue, _mJoukkueDocs)');
    expect(f).toContain('_mListaYritaLadata(_kanonJ)');
  });
  it('valittu rivin nimi kanonisoituu takaisin SAMAAN tunnisteeseen → jäsenet täsmäävät kuten ennen (myös monijäsenyys ja nimi-legacy)', () => {
    const l = J.tmValmentajanJoukkueet(kuormaValm, kuormaDocs, '');
    const pelaajat = [
      { id: 'p1', joukkue: 'Testijoukkue U8 A', joukkueet: ['kuorma_s01_u8_a'] },
      { id: 'p2', joukkue: 'Testijoukkue U11 B', joukkueet: ['kuorma_s01_u11_b', 'kuorma_s01_u8_a'] },   // pelaa ylempänä
      { id: 'p3', joukkue: 'Testijoukkue U8 A' },                                                           // vain legacy-nimi
      { id: 'p4', joukkue: 'Testijoukkue U13 A', joukkueet: ['kuorma_s01_u13_a'] }
    ];
    l.forEach((rivi) => {
      expect(J.tmKanonisoiJoukkue(rivi.nimi, kuormaDocs).id).toBe(rivi.id);   // _joukkue (nimi) → sama tunniste kuin rivin id
      const uusi = pelaajat.filter((p) => J.tmPelaajanJoukkueet(p, kuormaDocs).indexOf(rivi.id) >= 0).map((p) => p.id);
      const vanha = pelaajat.filter((p) => J.tmPelaajanJoukkueet(p, kuormaDocs).indexOf(J.tmKanonisoiJoukkue(rivi.nimi, kuormaDocs).id) >= 0).map((p) => p.id);
      expect(uusi).toEqual(vanha);
    });
    expect(pelaajat.filter((p) => J.tmPelaajanJoukkueet(p, kuormaDocs).indexOf('kuorma_s01_u8_a') >= 0).map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });
});

/* RUNTIME: Masterin oikea valitsinkoodi (ei kopio) vm-sandboxissa — nappaa ReferenceErrorit, jotka new Function ohittaisi. */
function elementti(tag) {
  const e = { tag, children: [], style: {}, attrs: {}, value: '', textContent: '', selected: false, id: '', onchange: null,
    appendChild(c) { this.children.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, remove() { e.poistettu = true; },
    insertBefore(c) { this.children.unshift(c); return c; } };
  return e;
}
function ajaValitsin({ valmentaja, docs, tallennettu, joukkue0, docsEpaonnistuu }) {
  const i = M.indexOf('function _valmentajanJoukkueet()'), j = M.indexOf('async function _rakennaSAJoukkueValitsin');
  expect(i).toBeGreaterThan(0); expect(j).toBeGreaterThan(i);
  const nav = elementti('div'), sbSeura = { textContent: 'Seura · X' }, tallessa = {}, lataukset = [];
  const ymp = {
    window: { _valmentajaData: valmentaja }, document: { getElementById: (id) => (id === 'sbSeura' ? sbSeura : null), createElement: elementti, querySelector: () => nav },
    localStorage: { getItem: () => tallennettu == null ? null : tallennettu, setItem: (k, v) => { tallessa[k] = v; } },
    masterT: (x) => x, _joukkue: joukkue0 || null, _mJoukkueDocs: [], _pelaajatData: [1], _kirjaukset: [1], _kirjauksetLadattu: true,
    _mLataaJoukkueDocs: async () => { ymp.__docsHaettu = (ymp.__docsHaettu || 0) + 1; if (docsEpaonnistuu) { ymp._mJoukkueDocs = []; return []; } ymp._mJoukkueDocs = docs; return docs; },
    _lataaPelaajat: async () => { lataukset.push(ymp._joukkue); }, _paivitaKaikkiNakymat: () => { lataukset.push('paivita'); },
    tmValmentajanJoukkueet: J.tmValmentajanJoukkueet, tmValitseValmentajaJoukkue: J.tmValitseValmentajaJoukkue
  };
  vm.createContext(ymp);
  vm.runInContext(M.slice(i, j) + '\nthis.__rakenna = _rakennaValmentajaJoukkueValitsin; this.__nimet = _valmentajanJoukkueNimet; this.__lue = () => _joukkue;', ymp);
  return { ymp, nav, sbSeura, tallessa, lataukset };
}
describe('RUNTIME — Masterin valitsin (vm-sandbox)', () => {
  it('kuorma: 5 riviä, option.value = tunniste, teksti = docin nimi; _joukkue = docin NIMI (60+ lukijaa odottavat nimeä)', async () => {
    const r = ajaValitsin({ valmentaja: kuormaValm, docs: kuormaDocs, joukkue0: 'Testijoukkue U8 A' });
    await r.ymp.__rakenna();
    const sel = r.nav.children[0]; expect(sel.id).toBe('valm-joukkue-valitsin');
    expect(sel.children).toHaveLength(5);
    expect(sel.children.map((o) => o.value).sort()).toEqual(KUORMA.map((x) => x[0]).sort());
    expect(sel.children.map((o) => o.textContent).sort()).toEqual(KUORMA.map((x) => x[1]).sort());
    expect(sel.children.filter((o) => o.selected)).toHaveLength(1);
    expect(r.ymp.__lue()).toBe('Testijoukkue U8 A');
  });
  it('(c) vanha tallennettu nimi → oikea joukkue valittuna; ei kirjoita mitään ennen käyttäjän valintaa', async () => {
    const r = ajaValitsin({ valmentaja: kuormaValm, docs: kuormaDocs, tallennettu: 'Testijoukkue U16 B', joukkue0: 'Testijoukkue U8 A' });
    await r.ymp.__rakenna();
    expect(r.ymp.__lue()).toBe('Testijoukkue U16 B');
    expect(r.nav.children[0].children.find((o) => o.selected).value).toBe('kuorma_s01_u16_b');
  });
  it('valinnan vaihto: tallennus = TUNNISTE, _joukkue = nimi, rosteri ladataan uudelleen valitulla nimellä', async () => {
    const r = ajaValitsin({ valmentaja: kuormaValm, docs: kuormaDocs, joukkue0: 'Testijoukkue U8 A' });
    await r.ymp.__rakenna();
    const sel = r.nav.children[0]; await sel.onchange.call({ value: 'kuorma_s01_u13_a' });
    expect(r.tallessa['tm-valm-joukkue']).toBe('kuorma_s01_u13_a');
    expect(r.ymp.__lue()).toBe('Testijoukkue U13 A');
    expect(r.sbSeura.textContent).toBe('Seura · Testijoukkue U13 A');
    expect(r.lataukset).toEqual(['Testijoukkue U13 A', 'paivita']);
  });
  it('docit ladataan ENNEN rakennusta; docien lataus epäonnistuu → legacy-nimirivit (ei kaadu, ≥2 → valitsin)', async () => {
    const r = ajaValitsin({ valmentaja: { joukkueetNimet: ['SJK P14', 'SJK P15'], joukkueet: ['sjk_p14', 'sjk_p15'] }, docs: [], docsEpaonnistuu: true });
    await r.ymp.__rakenna();
    expect(r.nav.children[0].children.map((o) => o.textContent)).toEqual(['SJK P14', 'SJK P15']);
    expect(r.nav.children[0].children.map((o) => o.value)).toEqual(['SJK P14', 'SJK P15']);   // ei tunnistetta → value = nimi
  });
  it('yksi joukkue → ei valitsinta (ennallaan); vanha valitsin siivotaan', async () => {
    const r = ajaValitsin({ valmentaja: { joukkueet: ['kuorma_s01_u8_a'], joukkueetNimet: ['Testijoukkue U8 A'], joukkue: 'kuorma_s01_u8_a' }, docs: kuormaDocs, joukkue0: 'kuorma_s01_u8_a' });
    await r.ymp.__rakenna(); expect(r.nav.children).toHaveLength(0);
    expect(r.ymp.__docsHaettu || 0).toBe(0);   // yhden joukkueen valmentaja: ei joukkuedokien latausta ennen _alusta:a (käynnistysjärjestys ennallaan; K1b-selaintesti)
    r.ymp._mJoukkueDocs = kuormaDocs;
    expect(r.ymp.__nimet()).toEqual(['Testijoukkue U8 A']);
  });
  it('talenttivalmentajan rajaus (_valmentajanJoukkueNimet → tmKanonisoiJoukkue) saa edelleen nimet → tunnisteet', () => {
    const r = ajaValitsin({ valmentaja: kuormaValm, docs: kuormaDocs });
    r.ymp._mJoukkueDocs = kuormaDocs;
    const idt = r.ymp.__nimet().map((n) => J.tmKanonisoiJoukkue(n, kuormaDocs).id).sort();
    expect(idt).toEqual(KUORMA.map((x) => x[0]).sort());
  });
});

describe('lähdevartijat', () => {
  it('Master: rakennus odottaa joukkuedokit; vanhaa normalisoi-dedupea ei enää käytetä valitsimessa; HTML ei kasva (kasvukatto)', () => {
    const f = M.slice(M.indexOf('async function _rakennaValmentajaJoukkueValitsin'), M.indexOf('async function _rakennaSAJoukkueValitsin'));
    expect(f.indexOf('await _mLataaJoukkueDocs()')).toBeGreaterThan(0);
    expect(f.indexOf('await _mLataaJoukkueDocs()')).toBeLessThan(f.indexOf('_valmentajanJoukkueet()'));
    expect(f).not.toMatch(/normalisioiJoukkue/);
    expect(f).toContain("localStorage.setItem('tm-valm-joukkue', avain(vj))");
    expect(M.split('\n').length).toBeLessThanOrEqual(11700);
  });
  it('lib-kopio functions/ identtinen (kooste käyttää tm_joukkue.js:ää palvelimella)', () => {
    expect(readFileSync(join(ROOT, 'functions/tm_joukkue.js'), 'utf8')).toBe(readFileSync(join(ROOT, 'lib/tm_joukkue.js'), 'utf8'));
  });
});

describe('generaattori (kuorma/aineisto.js): joukkue = NIMI, joukkueet = tunnisteet (§7.18)', () => {
  it('kayttajaDokumentti: joukkue/joukkueNimi näyttönimi, joukkueet[] id:t, joukkueetNimet[] nimet samassa järjestyksessä', () => {
    const src = readFileSync(join(ROOT, 'scripts/kuorma/aineisto.js'), 'utf8');
    expect(src).toContain('joukkue: h.joukkueetNimet[0] || null, joukkueNimi: h.joukkueetNimet[0] || null');
    expect(src).not.toContain('joukkue: h.joukkueet[0]');
  });
});

describe('diag_valmentaja_joukkueet.js — vain lukumäärät, ei nimiä', () => {
  const kayttajat = [
    Object.assign({ rooli: 'valmentaja' }, kuormaValm),                                                                                  // id ≠ slug, 5 joukkuetta → vanha 10 riviä
    { rooli: 'valmentaja', joukkueet: ['sjk_p14', 'sjk_p15'], joukkueetNimet: ['SJK P14', 'SJK P15'], joukkue: 'SJK P14' },            // id = slug
    { rooli: 'valmentaja', joukkueet: ['kuorma_s01_u8_a'], joukkueetNimet: ['Testijoukkue U8 A'] },                                   // yksi joukkue
    { rooli: 'vp', joukkueet: ['kuorma_s01_u8_a', 'kuorma_s01_u11_b'] },                                                              // laajuusrooli → ei mukaan
    { rooli: 'valmentaja', joukkueet: ['kuorma_s01_u8_a', 'kadonnut_id'], joukkueetNimet: ['Testijoukkue U8 A'] }                      // orpo tunniste
  ];
  const docs = kuormaDocs.concat([{ id: 'sjk_p14', nimi: 'SJK P14' }, { id: 'sjk_p15', nimi: 'SJK P15' }]);
  it('laskee valmentajat, usean joukkueen, id≠slug, ylimääräiset rivit ja orvot', () => {
    const r = DIAG.analysoi(kayttajat, docs);
    expect(r.valmentajia).toBe(4);
    expect(r.usea).toBe(3);                // kuorma-valmentaja, sjk, orpo-tapaus (U8 + nimirivi kadonnut_id)
    expect(r.id_ei_slug).toBe(2);          // kuorma (id ≠ slug) + orpo-tapaus (kuorma_s01_u8_a ≠ 'testijoukkue u8 a'); sjk-slug ei
    expect(r.tuplarivit_nyt).toBe(5 + 1 + 1);  // kuorma: 10 → 5; orpo: 3 → 2; YKSI joukkue + id ≠ slug: vanha näytti 2 riviä (valitsin näkyi turhaan) → 1
    expect(r.orpo_tunniste).toBe(1);
  });
  it('tuloste on vain lukuja: skripti ei sisällä nimikenttien tulostusta eikä kirjoitusta', () => {
    const src = readFileSync(join(ROOT, 'scripts/diag_valmentaja_joukkueet.js'), 'utf8');
    expect(src).not.toMatch(/\.(set|update|delete|add|create)\(/);                 // VAIN LUKU
    expect(src).not.toMatch(/console\.log\([^)]*(email|\.nimi\b|etunimi|sukunimi)/);   // ei henkilö-/joukkuenimiä tulosteeseen
    expect(src).toContain('VAIN LUKU');
  });
});
