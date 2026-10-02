/**
 * VP Raportointi → Harjoittelun laatu: palautteen antaminen löydettäväksi ja kontekstiin.
 * 1) lib/tm_palaute_konteksti.js (puhdas): nostojen valinta, edellisen arvioinnin haku, palautemäärät
 * 2) VP:n renderöinti vm-hiekkalaatikossa: edellinen + nuolet, nostot → tekstikenttään, listan palautetila (laiska lataus)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const K = require('../lib/tm_palaute_konteksti.js');
const N = require('../lib/tm_eerikkila_normit.js');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');

function poimi(alku) {
  const i = VP.indexOf(alku);
  if (i < 0) throw new Error('ei löydy: ' + alku);
  let sy = 0;
  for (let j = VP.indexOf('{', i); j < VP.length; j++) {
    if (VP[j] === '{') sy++;
    else if (VP[j] === '}') { sy--; if (!sy) return VP.slice(i, j + 1) + (VP[j + 1] === ';' ? ';' : ''); }
  }
  throw new Error('sulkeet: ' + alku);
}

const A = (v, extra) => ({ _id: 'x', malli: 'palloliitto', vastaukset: v, ...extra });
const B = (v, extra) => ({ _id: 'x', malli: 'valmennustaidot', vastaukset: v, ...extra });
const REF_A = { a1: 7, a2: 60, a3: 8, a4: 5, a5: 8, a6: 50 };

describe('valitseNostot — malli A (vs kansallinen)', () => {
  const n = K.valitseNostot(A({ a1: 9, a2: 40, a3: 3, a4: 5, a5: 8, a6: 70, a7: 6 }), { ref: REF_A });
  it('heikoimmat ensin, normalisoituna asteikolla (a3 −5/10 ennen a2 −20/100)', () => {
    expect(n.heikot.map((x) => x.avain)).toEqual(['a3', 'a2']);
    expect(n.heikot[0]).toMatchObject({ arvo: 3, ref: 8, delta: -5 });
  });
  it('yksi vahvuus: selvimmin yli; a7 ilman vertailuarvoa ei nouse', () => {
    expect(n.vahvuus.avain).toBe('a1');
    expect([...n.heikot, n.vahvuus].some((x) => x.avain === 'a7')).toBe(false);
  });
  it('enintään 3 nostoa; ei samaa kriteeriä kahdesti', () => {
    const kaikki = [...n.heikot, n.vahvuus];
    expect(kaikki.length).toBeLessThanOrEqual(3);
    expect(new Set(kaikki.map((x) => x.avain)).size).toBe(kaikki.length);
  });
  it('puuttuvat arvot ohitetaan; ei vertailtavia → tyhjä, ei kaadu', () => {
    expect(K.valitseNostot(A({ a1: null, a3: '' }), { ref: REF_A })).toMatchObject({ heikot: [], vahvuus: null, kehityskohde: null });
    expect(K.valitseNostot(A(undefined), { ref: REF_A }).heikot).toEqual([]);
    expect(K.valitseNostot(A({ a3: 3 }), { ref: {} }).onRef).toBe(false);
  });
  it('ei yhtään alle vertailun → ei heikkoja; ei yli → ei vahvuutta', () => {
    expect(K.valitseNostot(A({ a1: 9, a3: 9 }), { ref: REF_A }).heikot).toEqual([]);
    expect(K.valitseNostot(A({ a1: 1, a3: 1 }), { ref: REF_A }).vahvuus).toBeNull();
  });
});

describe('valitseNostot — malli B (itsereflektion kehityskohde)', () => {
  it('kehityskohde nousee ensimmäiseksi; heikkoja silloin enintään 1 (yhteensä ≤ 3)', () => {
    const n = K.valitseNostot(B({ b1: 2, b2: 4, b3: 5, b4: 3 }, { reflektio: { kehityskohde: 'Palaute pelaajille' } }), { ref: { b1: 4, b2: 4, b3: 3, b4: 4 } });
    expect(n.kehityskohde).toBe('Palaute pelaajille');
    expect(n.heikot.length).toBe(1);
    expect(n.heikot[0].avain).toBe('b1');
    expect(1 + n.heikot.length + (n.vahvuus ? 1 : 0)).toBeLessThanOrEqual(3);
  });
  it('ilman reflektiota: ei kehityskohdetta, heikkoja 2', () => {
    const n = K.valitseNostot(B({ b1: 1, b2: 2, b3: 5 }), { ref: { b1: 4, b2: 4, b3: 4 } });
    expect(n.kehityskohde).toBeNull();
    expect(n.heikot.map((x) => x.avain)).toEqual(['b1', 'b2']);
  });
  it('ilman vertailuarvoa (ei seuran tavoitetasoa): suhteellinen — selvästi heikoin ja vahvin (ero ≥ 20 % asteikosta)', () => {
    const n = K.valitseNostot(B({ b1: 2, b2: 4, b3: 5, b4: 3 }), {});
    expect(n.onRef).toBe(false);
    expect(n.heikot.map((x) => x.avain)).toEqual(['b1', 'b4']);   // molemmat ≥ 20 % asteikosta vahvimman alapuolella
    expect(n.vahvuus.avain).toBe('b3');
    expect(K.valitseNostot(B({ b1: 4, b2: 4, b3: 4 }), {})).toMatchObject({ heikot: [], vahvuus: null });   // tasainen → ei keksitä nostoja
  });
  it('tyhjä reflektio-kehityskohde ei tuota nostoa', () => {
    expect(K.valitseNostot(B({ b1: 3 }, { reflektio: { kehityskohde: '  ' } }), {}).kehityskohde).toBeNull();
  });
});

describe('edellinenArviointi — sama valmentajaUid + sama malli + sama arviointitapa', () => {
  const L = [
    { _id: 'a', valmentajaUid: 'v1', malli: 'palloliitto', pvm: '2026-09-01', vastaukset: { a1: 5 } },
    { _id: 'b', valmentajaUid: 'v1', malli: 'palloliitto', pvm: '2026-09-15', vastaukset: { a1: 6 } },
    { _id: 'c', valmentajaUid: 'v2', malli: 'palloliitto', pvm: '2026-09-20', vastaukset: { a1: 9 } },   // toinen valmentaja
    { _id: 'd', valmentajaUid: 'v1', malli: 'valmennustaidot', pvm: '2026-09-25', vastaukset: { b1: 4 } },   // toinen malli
    { _id: 'e', valmentajaUid: 'v1', malli: 'palloliitto', pvm: '2026-10-01', vastaukset: { a1: 8 } },
    { _id: 'f', valmentajaUid: 'v1', malli: 'palloliitto', pvm: '2026-09-30', vastaukset: { a1: 7 }, poistettu: true },
  ];
  it('uusimmasta aiempi, vain sama valmentaja ja malli; poistetut ohitetaan', () => {
    expect(K.edellinenArviointi(L, L[4])._id).toBe('b');
    expect(K.edellinenArviointi(L, L[1])._id).toBe('a');
  });
  it('ei aiempaa → null (ensimmäinen)', () => {
    expect(K.edellinenArviointi(L, L[0])).toBeNull();
    expect(K.edellinenArviointi(L, L[3])).toBeNull();   // B-malli: ei aiempaa B:tä samalla valmentajalla
  });
  it('puuttuva valmentajaUid / pvm → null, ei kaadu', () => {
    expect(K.edellinenArviointi(L, { _id: 'z', malli: 'palloliitto', pvm: '2026-10-05' })).toBeNull();
    expect(K.edellinenArviointi(L, { _id: 'z', valmentajaUid: 'v1', malli: 'palloliitto' })).toBeNull();
    expect(K.edellinenArviointi(null, L[4])).toBeNull();
  });
  it('sama päivä: aiemmin luotu on edellinen; itse ei koskaan', () => {
    const M = [
      { _id: 'p', valmentajaUid: 'v', malli: 'palloliitto', pvm: '2026-10-01', luotu: { seconds: 100 } },
      { _id: 'q', valmentajaUid: 'v', malli: 'palloliitto', pvm: '2026-10-01', luotu: { seconds: 200 } },
    ];
    expect(K.edellinenArviointi(M, M[1])._id).toBe('p');
    expect(K.edellinenArviointi(M, M[0])).toBeNull();
  });
  it('edellinenKonteksti: ka, aiempi ka ja muutos (1 des.)', () => {
    const ka = (a) => N.laskeHarjoituslaatuPalloliitto(a.vastaukset).ka_0_10;
    const x = { _id: 'n', valmentajaUid: 'v', malli: 'palloliitto', pvm: '2026-10-02', vastaukset: { a1: 8, a3: 6 } };
    const y = { _id: 'o', valmentajaUid: 'v', malli: 'palloliitto', pvm: '2026-09-02', vastaukset: { a1: 6, a3: 6 } };
    const k = K.edellinenKonteksti([x, y], x, ka);
    expect(k).toMatchObject({ ka: 7, kaEd: 6, muutos: 1 });
    expect(K.edellinenKonteksti([x], x, ka).edellinen).toBeNull();
  });
  it('muutosSuunta ↑↓= ja puuttuva arvo → null', () => {
    expect([K.muutosSuunta(6, 5), K.muutosSuunta(4, 5), K.muutosSuunta(5, 5)]).toEqual(['ylos', 'alas', 'sama']);
    expect([K.muutosSuunta(null, 5), K.muutosSuunta(5, undefined), K.muutosSuunta('', 5)]).toEqual([null, null, null]);
  });
});

describe('palauteMaarat — listariville', () => {
  it('jaetut yht + äänet', () => {
    expect(K.palauteMaarat([{ teksti: 'a' }, { audio_url: 'u' }, { teksti: 'b', audio_url: 'v' }])).toEqual({ yht: 3, aani: 2 });
    expect(K.palauteMaarat([])).toEqual({ yht: 0, aani: 0 });
    expect(K.palauteMaarat(undefined)).toEqual({ yht: 0, aani: 0 });
  });
});

/* ── VP-renderöinti vm:ssä ───────────────────────────────────────────────────────────────────────────── */
function sandboxi(lista, extra) {
  const elementit = {};
  const el = (id) => (elementit[id] = elementit[id] || { id, innerHTML: '', value: '', focus() {}, setSelectionRange() {} });
  const ctx = {
    document: { getElementById: (id) => el(id) }, console, Math, JSON, String, Number, Object, Array, Promise,
    vpT: (s) => s, _hlEsc: (s) => String(s == null ? '' : s), tmPvmFi: (p) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(p)); return m ? Number(m[3]) + '.' + Number(m[2]) + '.' + m[1] : ''; },
    TM_PALAUTE_KONTEKSTI: K, laskeValmennustaitoIndeksi: N.laskeValmennustaitoIndeksi, laskeHarjoituslaatuPalloliitto: N.laskeHarjoituslaatuPalloliitto,
    _HL_KRIT_A: { a1: 'Innostavuus', a2: 'Liikkeessä %', a3: 'Pallokosketukset', a4: 'Teknis-takt. toistot', a5: 'Heittäytyminen', a6: 'Maalinteko %', a7: 'Seuran oma (Q7)' },
    _HL_KRIT_B: { b1: 'Organisointi', b2: 'Tavoitteen selkeys', b3: 'Palaute (määrä)', b4: 'Palaute (laatu)', b5: 'Pedagogiikka', b6: 'Eriyttäminen', b7: 'Vuorovaikutus' },
    _HL_PCT: { a2: 1, a6: 1 }, _hlArvioinnit: lista, _hlConfig: { kansallinen_ka: { lapsuus: REF_A }, seura_tavoite_b: { b1: 4, b2: 4 } }, _seuraId: 's1', ...(extra || {}),
    _hlPariBlokki: () => '',
  };
  vm.createContext(ctx);
  ctx.window = ctx;
  return { ctx, el, elementit };
}
const lataa = (ctx, ...alut) => alut.forEach((a) => vm.runInContext(poimi(a), ctx));

describe('VP: edellinen arviointi + muutosnuolet (_hlRenderTapahtuma)', () => {
  const lista = [
    { _id: 'n1', valmentajaUid: 'v', valmentaja: 'Rasmus', malli: 'palloliitto', ikavaihe: 'lapsuus', joukkue: 'U12', pvm: '2026-10-02', vastaukset: { a1: 8, a3: 3, a4: 5 } },
    { _id: 'o1', valmentajaUid: 'v', valmentaja: 'Rasmus', malli: 'palloliitto', ikavaihe: 'lapsuus', joukkue: 'U12', pvm: '2026-09-18', vastaukset: { a1: 4, a3: 3, a4: 7 } },
  ];
  function renderoi(a) {
    const { ctx, el } = sandboxi(lista);
    lataa(ctx, 'function _hlKa(', 'function _hlPvmFi(', 'function _hlRenderTapahtuma(');
    vm.runInContext('_hlRenderTapahtuma(' + JSON.stringify(a) + ')', ctx);
    return el('hlTapInner').innerHTML;
  }
  it('"Edellinen: {pvm} · {ka} ({muutos})" ja klikkaus avaa sen', () => {
    const h = renderoi(lista[0]);
    expect(h).toContain('Edellinen:');
    expect(h).toContain('18.9.2026');
    expect(h).toContain('Edellinen: 18.9.2026 · 4.7 (+0.6)');   // edellisen ka 4.7, nyt 5.3 → muutos +0.6
    expect(h).toContain("_hlAvaaTapahtuma('o1')");
  });
  it('kriteereille ↑ ↓ = edelliseen verrattuna', () => {
    const h = renderoi(lista[0]);
    const rivi = (nimi) => h.split('<div style="padding:5px 0').find((s) => s.includes(nimi)) || '';
    expect(rivi('Innostavuus')).toContain('↑');   // 8 vs 4
    expect(rivi('Teknis-takt.')).toContain('↓');   // 5 vs 7
    expect(rivi('Pallokosketukset')).toContain('=');
    expect(rivi('Heittäytyminen')).not.toContain('edelliseen verrattuna');   // ei arvoa → ei nuolta
    expect(h).not.toContain('>null<');   // puuttuva arvo ei näytä 'null'-delttaa
  });
  it('ei edellistä → "Ensimmäinen arviointi tälle valmentajalle." eikä nuolia', () => {
    const h = renderoi(lista[1]);
    expect(h).toContain('Ensimmäinen havainnointi tälle valmentajalle.');
    expect(h).not.toContain('Edellinen:');
    expect(h).not.toContain('edelliseen verrattuna');
  });
});

describe('itsearvio ja havainnointi eivät vertaudu keskenään', () => {
  const mk = (id, malli, tapa, pvm, v) => ({ _id: id, valmentajaUid: 'v', valmentaja: 'R', malli, arviointitapa: tapa, ikavaihe: 'lapsuus', joukkue: 'U12', pvm, vastaukset: v });
  for (const [malli, k1, k2] of [['valmennustaidot', 'b1', 'b2'], ['palloliitto', 'a1', 'a3']]) {
    it(malli + ': edellinen haetaan samalta tavalta; toisen tavan arviointi ohitetaan', () => {
      const L = [mk('i1', malli, 'itsearvio', '2026-09-01', { [k1]: 3 }), mk('h1', malli, 'havainnointi', '2026-09-20', { [k1]: 5 }),
        mk('i2', malli, 'itsearvio', '2026-10-01', { [k1]: 4 }), mk('h2', malli, 'havainnointi', '2026-10-02', { [k1]: 5 })];
      expect(K.edellinenArviointi(L, L[2])._id).toBe('i1');   // itsearvio → itsearvio (ohittaa uudemman havainnoinnin h1)
      expect(K.edellinenArviointi(L, L[3])._id).toBe('h1');   // havainnointi → havainnointi
    });
    it(malli + ': ei samaa tapaa aiemmin → null (vaikka toisen tavan arviointeja on)', () => {
      const L = [mk('h1', malli, 'havainnointi', '2026-09-20', { [k1]: 5 }), mk('i1', malli, 'itsearvio', '2026-10-01', { [k1]: 4 })];
      expect(K.edellinenArviointi(L, L[1])).toBeNull();
      expect(K.edellinenKonteksti(L, L[1], () => 4).edellinen).toBeNull();
    });
    it(malli + ': renderöinti — "Ensimmäinen {tapa} tälle valmentajalle." eikä nuolia toisen tavan perusteella', () => {
      const L = [mk('h1', malli, 'havainnointi', '2026-09-20', { [k1]: 5, [k2]: 2 }), mk('i1', malli, 'itsearvio', '2026-10-01', { [k1]: 4, [k2]: 3 })];
      const { ctx, el } = sandboxi(L);
      lataa(ctx, 'function _hlKa(', 'function _hlPvmFi(', 'function _hlRenderTapahtuma(');
      vm.runInContext('_hlRenderTapahtuma(' + JSON.stringify(L[1]) + ')', ctx);
      const h = el('hlTapInner').innerHTML;
      expect(h).toContain('Ensimmäinen itsearvio tälle valmentajalle.');
      expect(h).not.toContain('Edellinen:');
      expect(h).not.toContain('edelliseen verrattuna');
      vm.runInContext('_hlRenderTapahtuma(' + JSON.stringify(L[0]) + ')', ctx);
      expect(el('hlTapInner').innerHTML).toContain('Ensimmäinen havainnointi tälle valmentajalle.');
    });
    it(malli + ': ↑↓= samasta parista (itsearvio↔itsearvio)', () => {
      const L = [mk('i1', malli, 'itsearvio', '2026-09-01', { [k1]: 3, [k2]: 4 }), mk('h1', malli, 'havainnointi', '2026-09-20', { [k1]: 1, [k2]: 1 }),
        mk('i2', malli, 'itsearvio', '2026-10-01', { [k1]: 4, [k2]: 4 })];
      const { ctx, el } = sandboxi(L);
      lataa(ctx, 'function _hlKa(', 'function _hlPvmFi(', 'function _hlRenderTapahtuma(');
      vm.runInContext('_hlRenderTapahtuma(' + JSON.stringify(L[2]) + ')', ctx);
      const h = el('hlTapInner').innerHTML;
      expect(h).toContain("_hlAvaaTapahtuma('i1')");
      expect(h).not.toContain("_hlAvaaTapahtuma('h1')");
      expect((h.match(/ ↑</g) || []).length).toBe(1);   // k1: 4 vs 3 (itsearvio) — havainnoinnin 1 ei vaikuta
      expect((h.match(/ =</g) || []).length).toBe(1);   // k2: 4 vs 4
    });
  }
  it('arviointitapa puuttuu → oletus havainnointi (kuten listassa)', () => {
    expect(K.arviointitapa({})).toBe('havainnointi');
    expect(K.arviointitapa({ arviointitapa: 'itsearvio' })).toBe('itsearvio');
  });
});

describe('VP: nostot palautteen pohjaksi', () => {
  it('napit syntyvät (A: 2 heikkoa + vahvuus); napautus lisää tekstin tekstikenttään', () => {
    const a = { _id: 'n1', malli: 'palloliitto', ikavaihe: 'lapsuus', vastaukset: { a1: 9, a2: 40, a3: 3, a5: 8 } };
    const { ctx, el } = sandboxi([a]);
    lataa(ctx, 'function _hlNostotHtml(', 'window._hlLisaaNosto = function');
    const h = vm.runInContext('_hlNostotHtml(' + JSON.stringify(a) + ')', ctx);
    expect(h).toContain('Pallokosketukset 3 (kans. 8)');
    expect((h.match(/<button/g) || []).length).toBe(3);
    expect(h).toContain('Nostoja arvioinnista');
    const t = el('hlPalauteTeksti');
    vm.runInContext('_hlLisaaNosto(0)', ctx);
    expect(t.value).toBe('Kehityskohde: Pallokosketukset 3 (kans. 8) — ');
    t.value = 'Hyvä harjoitus.';
    vm.runInContext('_hlLisaaNosto(2)', ctx);
    expect(t.value).toBe('Hyvä harjoitus.\nVahvuus: Innostavuus 9 (kans. 7) — ');
  });
  it('malli B: itsereflektion kehityskohde nostona; tavoite-vertailu', () => {
    const a = { _id: 'b1', malli: 'valmennustaidot', vastaukset: { b1: 2, b2: 5 }, reflektio: { kehityskohde: 'Palaute pelaajille' } };
    const { ctx } = sandboxi([a]);
    lataa(ctx, 'function _hlNostotHtml(');
    const h = vm.runInContext('_hlNostotHtml(' + JSON.stringify(a) + ')', ctx);
    expect(h).toContain('Kehityskohde (itsereflektio): Palaute pelaajille');
    expect(h).toContain('Organisointi 2 (tavoite 4)');
  });
  it('ei nostoja (ei arvoja) → ei tyhjää laatikkoa', () => {
    const a = { _id: 'e', malli: 'palloliitto', ikavaihe: 'lapsuus', vastaukset: {} };
    const { ctx } = sandboxi([a]);
    lataa(ctx, 'function _hlNostotHtml(');
    expect(vm.runInContext('_hlNostotHtml(' + JSON.stringify(a) + ')', ctx)).toBe('');
  });
});

describe('VP: listan palautetila (laiska lataus, ei N+1 renderöintiin)', () => {
  it('chip: 💬 n · 🎙 m / Ei palautetta vielä himmeänä / tyhjä ennen latausta', () => {
    const { ctx } = sandboxi([]);
    lataa(ctx, 'function _hlPalauteChipHtml(');
    const c = (m) => vm.runInContext('_hlPalauteChipHtml(' + JSON.stringify(m) + ')', ctx);
    expect(c({ yht: 2, aani: 1 })).toContain('💬 2 · 🎙 1');
    expect(c({ yht: 3, aani: 0 })).toContain('💬 3');
    expect(c({ yht: 3, aani: 0 })).not.toContain('🎙');
    expect(c({ yht: 0, aani: 0 })).toContain('Ei palautetta vielä');
    expect(c({ yht: 0, aani: 0 })).toContain('opacity');
    expect(c(undefined)).toBe('');
  });
  it('lataus: yksi lukeminen per näkyvä rivi, määrät riville; toinen kutsu käyttää välimuistia', async () => {
    let luvut = 0;
    const data = { r1: [{ teksti: 'a' }, { audio_url: 'u' }], r2: [] };
    const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: (id) => ({ collection: () => ({ get: () => { luvut++; return Promise.resolve({ docs: (data[id] || []).map((d) => ({ data: () => d })) }); } }) }) }) }) }) };
    const { ctx, el } = sandboxi([], { db });
    lataa(ctx, 'function _hlPalauteChipHtml(', 'function _hlPaivitaPalauteChip(', 'async function _hlLataaPalauteMaarat(');
    vm.runInContext('var _hlPalauteMaarat = {};', ctx);
    await vm.runInContext("_hlLataaPalauteMaarat(['r1','r2'])", ctx);
    expect(luvut).toBe(2);
    expect(el('hlPal_r1').innerHTML).toContain('💬 2 · 🎙 1');
    expect(el('hlPal_r2').innerHTML).toContain('Ei palautetta vielä');
    await vm.runInContext("_hlLataaPalauteMaarat(['r1','r2'])", ctx);
    expect(luvut).toBe(2);   // välimuisti
  });
  it('virhe lukiessa ei kaada listaa (rivi jää ilman palautetilaa)', async () => {
    const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ collection: () => ({ get: () => Promise.reject(new Error('ei oikeutta')) }) }) }) }) }) };
    const { ctx, el } = sandboxi([], { db });
    lataa(ctx, 'function _hlPalauteChipHtml(', 'function _hlPaivitaPalauteChip(', 'async function _hlLataaPalauteMaarat(');
    vm.runInContext('var _hlPalauteMaarat = {};', ctx);
    await expect(vm.runInContext("_hlLataaPalauteMaarat(['r1'])", ctx)).resolves.not.toThrow();
    expect(el('hlPal_r1').innerHTML).toBe('');
  });
});

describe('VP: tekstit ja rakenne lähteessä', () => {
  it('listassa selkokielinen rivi, "Avaa ›" ja palautetila-paikka; rivin klikkaus ennallaan', () => {
    expect(VP).toContain("vpT('Avaa arviointi antaaksesi valmentajalle palautetta tekstinä tai äänenä.')");
    expect(VP).toMatch(/vpT\('Avaa'\) \+ ' ›/);
    expect(VP).toContain("id=\"hlPal_'");
    expect(VP).toContain("onclick=\"_hlAvaaTapahtuma(\\'' + _hlEsc(a._id) + '\\')\"");
    expect(VP).toContain('_hlLataaPalauteMaarat(_hlNakyvat)');
  });
  it('palauteosio: otsikko, selitys, ääninapin uusi selite', () => {
    expect(VP).toContain("vpT('Palaute valmentajalle') + ' ' + _hlEsc(_arv.valmentaja");
    expect(VP).toContain("vpT('Jaettu näkyy valmentajalle ja hän saa ilmoituksen. Yksityinen jää vain sinulle.')");
    expect(VP).toContain("vpT('🎙 Äänitä palaute (max 3 min)')");
    expect(VP).not.toContain("vpT('🎙 Ääripalaute ')");
  });
  it('tallennukseen, notifPalauteJaettuun ja ohitussääntöön ei koskettu (vain luku-lisäykset)', () => {
    const CF = readFileSync(join(juuri, 'functions/index.js'), 'utf8');
    expect(CF).toContain("palaute.tekija_uid === valmentajaUid) return null;   // oma palaute → ei notifia");
  });
});
