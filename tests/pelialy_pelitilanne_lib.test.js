/* Peliäly · pelitilanne havaintoon (Vaihe 1) — lib/tm_adar_pelitilanne.js + tmAdarPikakentat-lisäykset.
 * Brief: .briefit/CODE_BRIEF_PELIALY_PELITILANNE.md. Vaihe 1 = vain kirjaus + näkyvyys: konsensus, tmAdarBand ja Kartta A EIVÄT muutu (§7).
 * Regressiolukko: vanha havaintosetti → vanhat pikakentät BITTI BITILTÄ samat (golden = lib ennen muutosta, tests/fixtures/pelitilanne_regressio/). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const P = require('../lib/tm_adar_pelitilanne.js');
const Y = require('../lib/tm_pelialy_yksilo.js');
const TX = require('../lib/tm_adar_tekstit.js');
const lue = (f) => JSON.parse(readFileSync(new URL('./fixtures/pelitilanne_regressio/' + f, import.meta.url), 'utf8'));
const NYT = Date.parse('2026-10-16T12:00:00.000Z'), PV = 86400000;
const pv = (n) => new Date(NYT - n * PV).toISOString();
const hav = (o) => Object.assign({ pisteet: { A: 2, D: 2, Act: 2, R: 2 }, luotu: pv(1), konteksti: 'harjoitus', tekija_uid: 'u1', tila: 'valmis' }, o || {});
const kons = (o) => Object.assign({ arvioijia: 2, yhtenevyysTaso: 'korkea' }, o || {});

describe('tmPelitilanneTalletus — porras ratkaisee, valinnainen, null kun tyhjä', () => {
  const kaikki = { vaihe: ['hyokkays', 'puolustus'], paine: 'kova', otos: '3_5' };
  it('porras 1: vain otos · porras 2: otos + vaihe · porras 3–4: kaikki', () => {
    expect(P.tmPelitilanneTalletus(kaikki, 1)).toEqual({ vaihe: [], paine: null, otos: '3_5' });
    expect(P.tmPelitilanneTalletus(kaikki, 2)).toEqual({ vaihe: ['hyokkays', 'puolustus'], paine: null, otos: '3_5' });
    expect(P.tmPelitilanneTalletus(kaikki, 3)).toEqual(kaikki);
    expect(P.tmPelitilanneTalletus(kaikki, 4)).toEqual(kaikki);
    expect(P.tmPelitilanneKentat(1)).toEqual({ otos: true, vaihe: false, paine: false });
    expect(P.tmPelitilanneKentat(2)).toEqual({ otos: true, vaihe: true, paine: false });
    expect(P.tmPelitilanneKentat(3)).toEqual({ otos: true, vaihe: true, paine: true });
  });
  it('ei valintoja → null (EI tyhjää mappia); näkymättömät kentät eivät vuoda talteen', () => {
    expect(P.tmPelitilanneTalletus({ vaihe: [], paine: null, otos: null }, 4)).toBeNull();
    expect(P.tmPelitilanneTalletus(null, 4)).toBeNull();
    expect(P.tmPelitilanneTalletus(undefined, 1)).toBeNull();
    expect(P.tmPelitilanneTalletus({ vaihe: ['hyokkays'], paine: 'kova', otos: null }, 1), 'porras 1 ei tallenna vaihetta/painetta').toBeNull();
  });
  it('vain sallitut ASCII-avaimet; tuntematon ja kaksoiskappale pois; enintään 2 vaihetta', () => {
    expect(P.tmPelitilanneTalletus({ vaihe: ['hyokkays', 'x', 'hyokkays', 'puolustus', 'erikois'], paine: 'ei_ole', otos: '7' }, 4)).toEqual({ vaihe: ['puolustus', 'erikois'], paine: null, otos: null });
    P.VAIHEET.concat(P.PAINEET, P.OTOKSET).forEach((a) => expect(a).toMatch(/^[a-z0-9_]+$/));
  });
});

describe('tmPelitilanneVaihe — enintään 2, kolmas vaihtaa vanhimman pois', () => {
  it('lisää, poistaa napautuksella ja pyöräyttää vanhimman', () => {
    let l = [];
    l = P.tmPelitilanneVaihe(l, 'hyokkays'); l = P.tmPelitilanneVaihe(l, 'puolustus');
    expect(l).toEqual(['hyokkays', 'puolustus']);
    l = P.tmPelitilanneVaihe(l, 'erikois');
    expect(l).toEqual(['puolustus', 'erikois']);
    l = P.tmPelitilanneVaihe(l, 'puolustus');
    expect(l).toEqual(['erikois']);
    expect(P.tmPelitilanneVaihe(['erikois'], 'tuntematon')).toEqual(['erikois']);
  });
});

describe('tmPelitilanneYhteenveto — ok-näkymän rivi', () => {
  it('esimerkkirivi briefistä', () => {
    expect(P.tmPelitilanneYhteenveto('ottelu', { vaihe: ['siirtyma_puol'], paine: 'kova', otos: '3_5' })).toBe('Ottelu · Siirtymä puolustukseen · Kova paine · 3–5 tilannetta');
  });
  it('osittainen valinta; ei pelitilannetta → tyhjä rivi; kääntäjä ohjaa tekstit', () => {
    expect(P.tmPelitilanneYhteenveto('harjoitus', { vaihe: [], paine: null, otos: '1_2' })).toBe('Harjoitus · 1–2 tilannetta');
    expect(P.tmPelitilanneYhteenveto('ottelu', null)).toBe('');
    expect(P.tmPelitilanneYhteenveto('ottelu', { vaihe: [], paine: 'kova', otos: null }, (k) => '«' + k + '»')).toBe('«adar_konteksti_ottelu» · «adar_pt_paine_kova»');
  });
});

describe('tmAdarPelitilanneKentat — jakaumat', () => {
  it('vaihe-, otos- ja ottelupohja-jakauma; vanha havainto (ei kenttää) = otos tuntematon', () => {
    const H = [
      hav({ konteksti: 'ottelu', pelitilanne: { vaihe: ['hyokkays', 'siirtyma_puol'], paine: 'kova', otos: '3_5' } }),
      hav({ konteksti: 'pienpeli', pelitilanne: { vaihe: ['hyokkays'], paine: null, otos: '6plus' } }),
      hav({ konteksti: 'harjoitus', pelitilanne: { vaihe: [], paine: null, otos: '1_2' } }),
      hav({ konteksti: 'harjoitus' }),
    ];
    const k = P.tmAdarPelitilanneKentat(H);
    expect(k.adar_vaihe_jakauma).toEqual({ hyokkays: 2, puolustus: 0, siirtyma_hyok: 0, siirtyma_puol: 1, erikois: 0 });
    expect(k.adar_otos_jakauma).toEqual({ '1_2': 1, '3_5': 1, '6plus': 1, tuntematon: 1 });
    expect(k.adar_ottelupohja).toBe(0.5);
  });
  it('tyhjä lista → nollat; roskadata ei kaada', () => {
    expect(P.tmAdarPelitilanneKentat([]).adar_ottelupohja).toBe(0);
    expect(P.tmAdarPelitilanneKentat([hav({ pelitilanne: 'roska' }), null]).adar_otos_jakauma.tuntematon).toBe(2);
  });
});

describe('tmAdarLuotettavuus — jokainen syy erikseen + raja-arvot', () => {
  const hyva = () => [hav({ konteksti: 'ottelu', pelitilanne: { vaihe: [], paine: null, otos: '6plus' } }), hav({ tekija_uid: 'u2', konteksti: 'pienpeli', pelitilanne: { vaihe: [], paine: null, otos: '3_5' } })];
  it('EI VACUOUS: kaikki kunnossa → vahva, ei syitä', () => {
    expect(P.tmAdarLuotettavuus(hyva(), kons(), NYT)).toEqual({ taso: 'vahva', syyt: [] });
  });
  it('yksi_arvioija: arvioijia < 2 (raja: 1 → syy, 2 → ei)', () => {
    expect(P.tmAdarLuotettavuus(hyva(), kons({ arvioijia: 1 }), NYT).syyt).toEqual(['yksi_arvioija']);
    expect(P.tmAdarLuotettavuus(hyva(), kons({ arvioijia: 2 }), NYT).syyt).toEqual([]);
  });
  it('vain_harjoitus: ei yhtään ottelu-/pienpelihavaintoa (yksikin riittää poistamaan)', () => {
    const H = hyva().map((h) => Object.assign({}, h, { konteksti: 'harjoitus' }));
    expect(P.tmAdarLuotettavuus(H, kons(), NYT).syyt).toEqual(['vain_harjoitus']);
    H[0].konteksti = 'pienpeli';
    expect(P.tmAdarLuotettavuus(H, kons(), NYT).syyt).toEqual([]);
  });
  it('pieni_otos: vähintään 3 TUNNETTUA otosta ja YLI puolet niistä 1_2; tuntematon (vanha data) ei vaikuta tasoon', () => {
    const o = (otos) => hav({ konteksti: 'ottelu', pelitilanne: otos ? { vaihe: [], paine: null, otos } : null });
    const syyt = (l) => P.tmAdarLuotettavuus(l, kons(), NYT).syyt;
    expect(syyt([o(null), o(null), o(null), o(null)]), 'vanha havaintosetti (kaikki tuntemattomia)').toEqual([]);
    expect(syyt([o('1_2'), o('1_2'), o('1_2'), o('6plus')]), '4 tunnettua, 3 on 1_2').toEqual(['pieni_otos']);
    expect(syyt([o('1_2'), o('1_2'), o(null), o(null), o(null), o(null), o(null)]), '2 tunnettua 1_2 + 5 tuntematonta').toEqual([]);
    expect(syyt([o('1_2'), o('1_2'), o('1_2'), o(null), o(null)]), '3 tunnettua 1_2 + tuntemattomat: tuntematon ei auta eikä haittaa').toEqual(['pieni_otos']);
    expect(syyt([o('1_2'), o('6plus'), o('1_2'), o('6plus')]), 'tasan puolet ei riitä').toEqual([]);
    expect(syyt([o('3_5'), o('1_2'), o('3_5')]), '1/3').toEqual([]);
    expect(syyt([o('1_2'), o('1_2')]), '2 tunnettua: alle minimin').toEqual([]);
  });
  it('tmPelitilanneTiivis: suljetun rivin teksti (otos lyhyenä, vaihe ja paine adar_pt_*-teksteistä; vain portaalla näkyvät kentät)', () => {
    const pt = { vaihe: ['puolustus'], paine: 'kova', otos: '3_5' };
    expect(P.tmPelitilanneTiivis(pt, 4)).toBe('Pelitilanne: 3–5 · Puolustus · Kova paine');
    expect(P.tmPelitilanneTiivis(pt, 2)).toBe('Pelitilanne: 3–5 · Puolustus');
    expect(P.tmPelitilanneTiivis(pt, 1)).toBe('Pelitilanne: 3–5');
    expect(P.tmPelitilanneTiivis({ vaihe: [], paine: null, otos: null }, 4)).toBe('Pelitilanne');
    expect(P.tmPelitilanneTiivis(null, 4)).toBe('Pelitilanne');
    expect(P.tmPelitilanneTiivis({ vaihe: [], paine: null, otos: '6plus' }, 3)).toBe('Pelitilanne: 6+');
  });
  it('vanha: uusin havainto YLI 90 pv (raja: 90 → ei, 91 → syy); nowMs puuttuu → ei arvioida', () => {
    const lista = (n) => hyva().map((h) => Object.assign({}, h, { luotu: pv(n) }));
    expect(P.tmAdarLuotettavuus(lista(90), kons(), NYT).syyt).toEqual([]);
    expect(P.tmAdarLuotettavuus(lista(91), kons(), NYT).syyt).toEqual(['vanha']);
    expect(P.tmAdarLuotettavuus(lista(400), kons()).syyt, 'ilman kelloa ei arvauksia').toEqual([]);
    const sekaisin = hyva(); sekaisin[0].luotu = pv(200);   // uusin on yhä tuore
    expect(P.tmAdarLuotettavuus(sekaisin, kons(), NYT).syyt).toEqual([]);
  });
  it('hajonta: yhtenevyysTaso matala', () => {
    expect(P.tmAdarLuotettavuus(hyva(), kons({ yhtenevyysTaso: 'matala' }), NYT).syyt).toEqual(['hajonta']);
    expect(P.tmAdarLuotettavuus(hyva(), kons({ yhtenevyysTaso: 'keskiverto' }), NYT).syyt).toEqual([]);
  });
  it('taso: 0 syytä vahva · 1–2 kohtalainen · 3+ ohut', () => {
    const H = hyva();
    expect(P.tmAdarLuotettavuus(H, kons({ arvioijia: 1 }), NYT).taso).toBe('kohtalainen');
    expect(P.tmAdarLuotettavuus(H, kons({ arvioijia: 1, yhtenevyysTaso: 'matala' }), NYT).taso).toBe('kohtalainen');
    const vain = H.map((h) => Object.assign({}, h, { konteksti: 'harjoitus' }));
    const r = P.tmAdarLuotettavuus(vain, kons({ arvioijia: 1, yhtenevyysTaso: 'matala' }), NYT);
    expect(r.syyt).toEqual(['yksi_arvioija', 'vain_harjoitus', 'hajonta']);
    expect(r.taso).toBe('ohut');
  });
});

describe('tmAdarLuotettavuusTuore / Rivit / HTML — lukunäkymä', () => {
  const pk = (o) => Object.assign({
    adar_luotettavuus: { taso: 'kohtalainen', syyt: ['vain_harjoitus'] }, adar_pvm: pv(5),
    adar_tilanne_jakauma: { ottelu: 4, pienpeli: 2, harjoitus: 6 },
    adar_vaihe_jakauma: { hyokkays: 3, puolustus: 2, siirtyma_hyok: 2, siirtyma_puol: 3, erikois: 0 },
  }, o || {});
  it('vanha arvioidaan lukuhetken kellolla adar_pvm:stä (tallennettu arvo ei vanhene levyllä)', () => {
    expect(P.tmAdarLuotettavuusTuore(pk(), NYT)).toEqual({ taso: 'kohtalainen', syyt: ['vain_harjoitus'] });
    expect(P.tmAdarLuotettavuusTuore(pk({ adar_pvm: pv(120) }), NYT).syyt).toEqual(['vain_harjoitus', 'vanha']);
    expect(P.tmAdarLuotettavuusTuore(pk({ adar_pvm: pv(5), adar_luotettavuus: { taso: 'kohtalainen', syyt: ['yksi_arvioija', 'vanha'] } }), NYT).syyt, 'tallennettu vanha-syy poistuu kun uusi havainto on tuore').toEqual(['yksi_arvioija']);
    expect(P.tmAdarLuotettavuusTuore({}, NYT), 'vanha pelaaja ilman kenttää').toBeNull();
  });
  it('jakaumarivi: briefin muoto, nollat pois, siirtymät yhdistetty, vaiheet suurimmasta pienimpään', () => {
    const r = P.tmAdarLuotettavuusRivit(pk(), NYT);
    expect(r.jakauma).toBe('Ottelu 4 · Pienpeli 2 · Harjoitus 6 | Siirtymät 5 · Hyökkäys 3 · Puolustus 2');
    expect(r.tasoTeksti).toBe('Arvion luotettavuus: kohtalainen');
    expect(r.syyTekstit).toEqual(['Perustuu vain harjoituksiin']);
    expect(r.huomio).toBe('');
    expect(P.tmAdarLuotettavuusRivit(pk({ adar_vaihe_jakauma: undefined }), NYT).jakauma).toBe('Ottelu 4 · Pienpeli 2 · Harjoitus 6');
    expect(P.tmAdarLuotettavuusRivit(pk({ adar_luotettavuus: { taso: 'ohut', syyt: ['yksi_arvioija', 'vain_harjoitus', 'hajonta'] } }), NYT).huomio).toMatch(/ei ole arvosana/);
  });
  it('kääntäjä ohjaa kaikki tekstit ({n} säilyy); sähköposti tai HTML ei vuoda; kehittävä sävy (ei syyttäviä sanoja)', () => {
    const r = P.tmAdarLuotettavuusRivit(pk(), NYT, (k) => '«' + k + '»');
    expect(r.jakauma).toBe('«adar_jak_ottelu» · «adar_jak_pienpeli» · «adar_jak_harjoitus» | «adar_jak_siirtymat» · «adar_jak_hyokkays» · «adar_jak_puolustus»'.replace(/«(\w+)»/g, '«$1»'));
    const h = P.tmAdarLuotettavuusHTML(pk(), NYT, null, (s) => String(s).replace(/</g, '&lt;'));
    expect(h).toContain('Arvion luotettavuus: kohtalainen');
    expect(P.tmAdarLuotettavuusHTML({}, NYT, null, String), 'ei dataa → ei lohkoa').toBe('');
    Object.keys(TX.FI).filter((k) => /^adar_(luot|jak|pt)_/.test(k)).forEach((k) => expect(TX.FI[k].toLowerCase(), k).not.toMatch(/huono|heikko|epäonnistu|virhe|syy(t)?:/));
  });
});

describe('REGRESSIOLUKKO — vanha havaintosetti, vanhat pikakentät bitti bitiltä (konsensus ennallaan)', () => {
  const H = lue('havainnot.json'), golden = lue('pikakentat_ennen.json');
  const UUDET = ['adar_vaihe_jakauma', 'adar_otos_jakauma', 'adar_ottelupohja', 'adar_luotettavuus'];
  it('jokaisella ika/porras/edellinen-yhdistelmällä: golden-avaimet identtiset, uudet kentät vain lisäyksiä', () => {
    const tapaukset = [[13, null, null], [11, 1, null], [15, 3, { a: 2, d: 2, ac: 2, r: 2, yht: 2, pvm: '2026-09-01T00:00:00.000Z' }], [null, 4, null]];
    expect(Object.keys(golden).length).toBe(5);
    tapaukset.forEach(([ika, porras, edellinen]) => {
      const ennen = golden[JSON.stringify([ika, porras, !!edellinen])];
      const nyt = Y.tmAdarPikakentat(H, ika, porras, { edellinen, nowMs: NYT });
      expect(Object.keys(ennen).length, 'EI VACUOUS').toBeGreaterThan(8);
      Object.keys(ennen).forEach((k) => expect(JSON.parse(JSON.stringify(nyt[k])), k).toEqual(ennen[k]));
      expect(Object.keys(nyt).filter((k) => !(k in ennen)).sort()).toEqual(UUDET.slice().sort());
    });
  });
  it('tyhjä setti → null kuten ennen', () => { expect(Y.tmAdarPikakentat([], 13, 1, {})).toBeNull(); expect(golden.tyhja).toBeNull(); });
  it('pelitilanne-kenttä havainnoissa EI muuta konsensusta: yht, dimKonsensus, vahvin/heikoin, ehdotus, jakauma samat kuin ilman', () => {
    const lisatty = H.map((h, i) => Object.assign({}, h, { pelitilanne: { vaihe: ['hyokkays'], paine: 'kova', otos: i % 2 ? '6plus' : '1_2' } }));
    [[13, 3], [15, 4], [11, 1]].forEach(([ika, porras]) => {
      const a = Y.tmAdarPikakentat(H, ika, porras, { nowMs: NYT }), b = Y.tmAdarPikakentat(lisatty, ika, porras, { nowMs: NYT });
      Object.keys(a).filter((k) => !['adar_otos_jakauma', 'adar_vaihe_jakauma', 'adar_luotettavuus'].includes(k)).forEach((k) => expect(b[k], k).toEqual(a[k]));
      expect(b.adar_vaihe_jakauma.hyokkays).toBeGreaterThan(0);
    });
  });
  it('konsensus ja Kartta A: tmAdarKonsensus ei lue pelitilannetta (lähdevartija)', () => {
    const lahde = readFileSync(new URL('../lib/tm_pelialy_yksilo.js', import.meta.url), 'utf8');
    const kons = lahde.slice(lahde.indexOf('function tmAdarKonsensus('), lahde.indexOf('function tmAdarPorrasEhdotus('));
    expect(kons).not.toMatch(/pelitilanne|vaihe|paine|otos/);
    expect(lahde.slice(lahde.indexOf('function tmAdarBand('), lahde.indexOf('function tmAdarNimet('))).not.toMatch(/pelitilanne/);
  });
});

describe('EN — pelitilanne- ja luotettavuustekstit (tm_adar_tekstit.EN)', () => {
  const UUDET = Object.keys(TX.FI).filter((k) => /^adar_(pt|luot|jak)_/.test(k));
  it('jokaisella uudella FI-avaimella on EN; {n}-paikkamerkit säilyvät; ei suomea (ä/ö) englannissa', () => {
    expect(UUDET.length).toBe(32);
    UUDET.forEach((k) => {
      expect(typeof TX.EN[k], k).toBe('string');
      expect(TX.EN[k].includes('{n}'), k).toBe(TX.FI[k].includes('{n}'));
      expect(TX.EN[k], k).not.toMatch(/[äöÄÖ]/);
    });
    ['harjoitus', 'pienpeli', 'ottelu'].forEach((k) => expect(TX.EN['adar_konteksti_' + k]).toBeTruthy());
  });
  it('en-kieli: tmAdarT palauttaa EN; sv-kääntäjä voittaa EN:n; fi/puuttuva kieli → FI; avain ilman EN:ää → FI', () => {
    expect(TX.tmAdarT('adar_pt_paine_kova', null, 'en')).toBe('High pressure');
    expect(TX.tmAdarT('adar_pt_paine_kova', null, 'fi')).toBe('Kova paine');
    expect(TX.tmAdarT('adar_pt_paine_kova', null)).toBe('Kova paine');
    expect(TX.tmAdarT('adar_pt_paine_kova', () => 'sv-arvo', 'en')).toBe('sv-arvo');
    expect(TX.tmAdarT('adar_A_q', null, 'en'), 'muut adar-tekstit en-tilassa suomeksi kuten ennen').toBe(TX.FI.adar_A_q);
  });
  it('en-yhteenveto ja jakaumarivi (lukunäkymä) lähtevät samasta kartasta', () => {
    const en = (k) => TX.tmAdarT(k, null, 'en');
    expect(P.tmPelitilanneYhteenveto('ottelu', { vaihe: ['siirtyma_puol'], paine: 'kova', otos: '3_5' }, en)).toBe('Match · Transition to defence · High pressure · 3–5 situations');
    const pk = { adar_luotettavuus: { taso: 'ohut', syyt: ['yksi_arvioija', 'vain_harjoitus', 'hajonta'] }, adar_pvm: pv(2), adar_tilanne_jakauma: { ottelu: 4, harjoitus: 6 }, adar_vaihe_jakauma: { hyokkays: 3, siirtyma_puol: 5 } };
    const r = P.tmAdarLuotettavuusRivit(pk, NYT, en);
    expect(r.jakauma).toBe('Match 4 · Training 6 | Transitions 5 · Attack 3');
    expect(r.tasoTeksti).toBe('Estimate reliability: thin');
    expect(r.syyTekstit).toEqual(['One rater', 'Based on training only', 'Raters’ views differ']);
    expect(r.huomio).toMatch(/not a grade/);
  });
});
