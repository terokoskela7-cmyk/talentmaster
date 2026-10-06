/**
 * scripts/tuo_valmennuslinja.js — SJK:n valmennuslinjan tuonti (dry-run oletus). Fixturet: tests/fixtures/valmennuslinja/*.xlsx (pieni synteettinen, ei SJK:n oikeaa sisältöä).
 * Kaksi ajoa: 1. ajo (esitäytetty) → kaikki 'luonnos'; 2. ajo (kuitattu) → OK/Muutettu/Uusi 'hyvaksytty', Poista → poisto, tyhjä → luonnos + lista.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawnSync } from 'child_process';
const require = createRequire(import.meta.url);
const T = require('../scripts/tuo_valmennuslinja.js');
const { lueXlsx } = require('../scripts/xlsx_luku.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..'), FX = (n) => join(juuri, 'tests/fixtures/valmennuslinja', n);
const lue = (n) => lueXlsx(readFileSync(FX(n)));
const POHJA = lue('ajo1_pohja.xlsx'), KUITATTU = lue('ajo2_kuitattu.xlsx'), MASTER = lue('master_v2.xlsx');
const ajo = (pohja, nykyinen, extra) => T.muunna(Object.assign({ pohja, master: MASTER, nykyinen: nykyinen || {}, pvm: '2026-10-17', tarkistaja: 'Sini SJK' }, extra || {}));
const tilaan = (r) => r.docs.reduce((m, d) => { if (d.data) m[d.polku] = d.data; return m; }, {});
const poluilla = (r) => r.docs.map((d) => d.polku).sort();
// Simuloi apply: kirjoitukset sisään, poistot pois (kuten oikea Firestore ajon jälkeen)
const sovella = (nyk, r) => { const u = Object.assign({}, nyk); r.docs.forEach((d) => { if (d.op === 'poista') delete u[d.polku]; else if (d.op !== 'ei_muutosta') u[d.polku] = d.data; }); return u; };

describe('xlsx_luku (riippuvuudeton)', () => {
  it('lukee välilehdet ja solut (merkkijonot, tyhjät = tyhjä merkkijono), UTF-8 (ä/ö/–), rivinvaihdot soluissa', () => {
    expect(Object.keys(POHJA.sheets)).toEqual(['OHJE', 'Puutteet', 'Kattavuus', 'Ikaluokat', 'Teemat', 'Ohjelmat', 'Keskivartalo', 'Rutiinit_ja_harjoitteet', 'Ketteryys_ja_nopeus']);
    expect(POHJA.sheets.Ikaluokat[1][3]).toBe('1. Taitavuus: tasapaino\n2. Rytmikyky'); expect(POHJA.sheets.Teemat[1][2]).toBe('45–2'); expect(POHJA.sheets.Ohjelmat[1][1]).toBe('alle 12v');
    expect(() => lueXlsx(Buffer.from('ei zip'))).toThrow(/zip/);
  });
});

describe('1. ajo — TM:n esitäytetty Excel → kaikki luonnos', () => {
  const r = ajo(POHJA);
  it('kaikki dokumentit luodaan, jokaisella tila "luonnos", ei tarkistettu_pvm/tarkistaja, versio 1; tiedollisia välilehtiä (OHJE/Puutteet/Kattavuus) ei tuoda; tyhjät UUSI-paikat ohitetaan', () => {
    expect(r.raportti.ajo).toBe(1); expect(r.docs.every((d) => d.op === 'luo' && d.versio === 1)).toBe(true);
    expect(poluilla(r)).toEqual(['harjoitepankki/ketteryys_132_ketteryys_1', 'harjoitepankki/ketteryys_133_ketteryys_2', 'harjoitepankki/rutiinit_113_venyttelyt', 'harjoitepankki/rutiinit_116_alkurutiini_1',
      'ohjelmat/keskivartalo_92_keskivartalon_perusliikkeet', 'ohjelmat/ohjelmat_97_lihaskestavyys_1_alle_12v', 'ohjelmat/ohjelmat_98_keppijumppa', 'ohjelmat/ohjelmat_99_poistettava_ohjelma',
      'valmennuslinja/ikavaiheet', 'valmennuslinja/teemat', 'valmennuslinja/teemat_luonnos']);
    const d = tilaan(r); for (const [p, x] of Object.entries(d)) { if (p.startsWith('valmennuslinja/')) continue; expect(x.tila, p).toBe('luonnos'); expect(x.tarkistettu_pvm).toBeNull(); expect(x.tarkistaja).toBeNull(); expect(x.lahde).toBe('seura'); }
    expect(d['valmennuslinja/teemat'].jaksot).toEqual([]); expect(d['valmennuslinja/teemat_luonnos'].jaksot.length).toBe(2); expect(d['valmennuslinja/teemat_luonnos'].jaksot.every((j) => j.tila === 'luonnos')).toBe(true);
    expect(d['valmennuslinja/ikavaiheet'].rivit.every((x) => x.tila === 'luonnos')).toBe(true); expect(r.raportti.ohitetut).toMatchObject({ Ikaluokat: 1, Teemat: 1 });
  });
  it('pelaajalle näkyvä polku ei saa luonnoksia: yhtään harjoitepankki-dokkia ei ole hyväksytty, teemat-dokki (pelaajan luettava) on tyhjä', () => {
    const d = tilaan(r); Object.entries(d).filter(([p]) => p.startsWith('harjoitepankki/')).forEach(([, x]) => expect(x.tila).toBe('luonnos'));
    expect(d['valmennuslinja/teemat'].jaksot.length).toBe(0);
  });
  it('ID:t johdettu välilehti + lahde_dia + nimi (deterministinen): sama syöte kahdesti → samat polut; ID:ssä ei satunnaisosaa', () => { expect(poluilla(ajo(POHJA))).toEqual(poluilla(r)); expect(poluilla(r).every((p) => /^[a-z0-9_/]+$/.test(p))).toBe(true); });
  it('harjoitepankki-dokumentti: tyyppi T, lahde seura, kehityskohde null (ei vahingossa korvaa TM:n oletusta), ketju v2-masterista, kotiin_sopiva-säännöt, ketteryys: kuva puuttuu → video_url null', () => {
    const d = tilaan(r), a = d['harjoitepankki/rutiinit_116_alkurutiini_1'], v = d['harjoitepankki/rutiinit_113_venyttelyt'], k = d['harjoitepankki/ketteryys_132_ketteryys_1'];
    expect(a).toMatchObject({ nimi: 'Alkurutiini 1', tyyppi: 'T', kehityskohde: null, ketju: 'SFL', kotiin_sopiva: false, kotiin_huomio: 'ei (joukkueharjoitus)', lahde_viite: 'Nevanlinna 2014, dia 116', lahde: 'seura' });
    expect(v).toMatchObject({ kotiin_sopiva: false, kotiin_huomio: 'kyllä (tarvitsee kuvat)', ketju: null });   // ehdollinen kyllä ei ole kotiin sopiva; ei ketjua masterissa
    expect(k).toMatchObject({ ohje: 'Pujotteluradat tötsien välissä', tarvikkeet: 'tötsät', pelaajia: 1, video_url: null, kuva_tai_video: null, kotiin_sopiva: false });
    expect(r.raportti.ehdollinenKotiin.some((x) => x.includes('Venyttelyt'))).toBe(true);
  });
  it('ohjelmat: liikkeet[] + yksi vaihe (kirjaston rakenne), ikarajat (alle 12v → max 11; yli 12v → min 12), kotiin_sopiva vain täsmälleen "kyllä", ketju liikekohtaisesti, URL vain oikeasta URL:sta', () => {
    const d = tilaan(r), o = d['ohjelmat/ohjelmat_97_lihaskestavyys_1_alle_12v'], k = d['ohjelmat/ohjelmat_98_keppijumppa'];
    expect(o).toMatchObject({ nimi: 'Lihaskestävyys 1 (alle 12v)', tyyppi: 'muu', ika_min: null, ika_max: 11, teema_avain: null, lahde_viite: 'Nevanlinna 2014, dia 97', arkistoitu: false, laatija_rooli: 'tuonti' }); expect(k).toMatchObject({ ika_min: 12, ika_max: null });
    expect(o.liikkeet.map((l) => [l.jarjestys, l.liike, l.ketju, l.kotiin_sopiva, l.kotiin_huomio, l.kesto_min])).toEqual([[1, 'Narulla hyppely', 'SFL', true, null, 5], [2, 'Pareittain GHR', 'SBL', false, 'kyllä (tarvitsee parin)', 1.5]]);
    expect(k.liikkeet[0]).toMatchObject({ video_url: 'https://example.org/v1', kotiin_sopiva: false, ketju: 'DFL' }); expect(o.liikkeet[0].video_url).toBeNull();
    expect(o.vaiheet).toHaveLength(1); expect(o.vaiheet[0].harjoitteet).toEqual(['Narulla hyppely', 'Pareittain GHR']);
    const { tmOhjelmaValidoi } = require('../lib/tm_ohjelma.js'); Object.entries(d).filter(([p]) => p.startsWith('ohjelmat/')).forEach(([p, x]) => expect(tmOhjelmaValidoi(x).ok, p).toBe(true));   // kirjaston validaattori hyväksyy
    expect(d['ohjelmat/keskivartalo_92_keskivartalon_perusliikkeet'].liikkeet[0]).toMatchObject({ taso: 'Taso 1', toistot: 'x10-20', ketju: 'DFL', kotiin_sopiva: true });
  });
  it('ikavaiheet: ikärajat sarakkeista (tai ikaluokasta), sisalto[] painopisteistä ilman numerointia, lahde_viite "Nevanlinna 2014, dia N"', () => {
    const rv = tilaan(r)['valmennuslinja/ikavaiheet'].rivit; expect(rv.map((x) => [x.ikaluokka, x.ika_min, x.ika_max])).toEqual([['B16-17', 16, 17], ['F7', 7, 7]]);
    expect(rv.find((x) => x.ikaluokka === 'F7')).toMatchObject({ sisalto: ['Taitavuus: tasapaino', 'Rytmikyky'], totuteltava: ['Liikkuvuus'], suositellut_ohjelmat: ['Keppijumppa'], lahde_viite: 'Nevanlinna 2014, dia 23', dimensio: 'D1' });
  });
});

describe('Coworkin päätökset 6.10. (4a, 4c)', () => {
  const r = ajo(POHJA), d = tilaan(r);
  it('4a: KAIKKI harjoitepankkirivit kaytto "joukkue" ja kehityskohde null (tarkoituksella) — ajoista 1 ja 2, molemmat tiedostot', () => {
    for (const rr of [r, ajo(KUITATTU, d)]) Object.entries(tilaan(rr)).filter(([p]) => p.startsWith('harjoitepankki/')).forEach(([p, x]) => { expect(x.kaytto, p).toBe('joukkue'); expect(x.kehityskohde, p).toBeNull(); expect(x.tyyppi).toBe('T'); });
    expect(Object.keys(d).filter((p) => p.startsWith('harjoitepankki/')).length).toBe(4);
  });
  it('4c: dimensio "D1" ikavaiheet-riveille joiden lahde_viite sisältää Nevanlinna (dia-numerot = Nevanlinnan 2014 -aineisto); muille tyhjä; --lahde ylikirjoittaa lähteen → ei D1:tä', () => {
    expect(d['valmennuslinja/ikavaiheet'].rivit.map((x) => [x.ikaluokka, x.dimensio, x.lahde_viite])).toEqual([['B16-17', 'D1', 'Nevanlinna 2014, dia 31'], ['F7', 'D1', 'Nevanlinna 2014, dia 23']]);
    const muu = ajo(POHJA, {}, { lahde: 'SJK oma' }); expect(tilaan(muu)['valmennuslinja/ikavaiheet'].rivit.map((x) => [x.dimensio, x.lahde_viite])).toEqual([[null, 'SJK oma, dia 31'], [null, 'SJK oma, dia 23']]);
    const omaTeksti = lue('ajo1_pohja.xlsx'); omaTeksti.sheets.Ikaluokat[1][5] = 'SJK:n oma dia 4'; expect(tilaan(ajo(omaTeksti))['valmennuslinja/ikavaiheet'].rivit.find((x) => x.ikaluokka === 'F7')).toMatchObject({ dimensio: null, lahde_viite: 'SJK:n oma dia 4' });
    const eksplisiittinen = lue('ajo1_pohja.xlsx'); eksplisiittinen.sheets.Ikaluokat[0].push('dimensio'); eksplisiittinen.sheets.Ikaluokat[1][9] = 'D3'; expect(tilaan(ajo(eksplisiittinen))['valmennuslinja/ikavaiheet'].rivit.find((x) => x.ikaluokka === 'F7').dimensio).toBe('D3');
  });
  it('4a: --lahde CLI-lippu läpi; dry-run raportti mainitsee kaytto joukkue', () => {
    expect(readFileSync(join(juuri, 'scripts/tuo_valmennuslinja.js'), 'utf8')).toContain("lahde: o.lahde || null"); expect(T.tulosta(r, false)).toContain("kaytto:'joukkue'");
  });
});

describe('2. ajo — SJK:n kuitattu Excel', () => {
  const ensin = ajo(POHJA), nyk = tilaan(ensin), r = ajo(KUITATTU, nyk);
  const d = tilaan(r), op = (p) => (r.docs.find((x) => x.polku === p) || {}).op;
  it('ajo 2 tunnistetaan kuittauksista; OK/Muutettu/Uusi → hyväksytty (+ tarkistettu_pvm, tarkistaja), tyhjä → luonnos + LISTATTU, Poista → poisto', () => {
    expect(r.raportti.ajo).toBe(2);
    expect(op('ohjelmat/ohjelmat_99_poistettava_ohjelma')).toBe('poista');
    expect(d['harjoitepankki/rutiinit_116_alkurutiini_1']).toMatchObject({ tila: 'hyvaksytty', tarkistettu_pvm: '2026-10-17', tarkistaja: 'Sini SJK' });
    expect(d['harjoitepankki/rutiinit_113_venyttelyt']).toMatchObject({ tila: 'hyvaksytty' });   // Muutettu
    expect(d['ohjelmat/keskivartalo_92_keskivartalon_perusliikkeet'].tila).toBe('hyvaksytty');
    const jaksot = d['valmennuslinja/teemat'].jaksot, luonn = d['valmennuslinja/teemat_luonnos'].jaksot;
    expect(jaksot.map((j) => j.jakso)).toEqual(['Jakso 1']); expect(luonn.map((j) => j.jakso)).toEqual(['Jakso 2']);   // jakso 2 kuittaamaton → luonnos-lohkoon
    expect(r.raportti.kuittaamattomat.join('|')).toMatch(/Teemat.*Jakso 2/);
    expect(d['valmennuslinja/ikavaiheet'].rivit.map((x) => x.tila).sort()).toEqual(['hyvaksytty', 'hyvaksytty']);
  });
  it('ohjelma: Uusi-rivi lisää rivin ja koko ohjelma hyväksytään vasta kun KAIKKI rivit kuitattu; yksi kuittaamaton rivi pitää koko ohjelman luonnoksena', () => {
    const o = d['ohjelmat/ohjelmat_97_lihaskestavyys_1_alle_12v']; expect(o.tila).toBe('hyvaksytty'); expect(o.liikkeet[0].pelaajan_ohje).toContain('MUUTETTU');   // Muutettu → solun uusi sisältö
    expect(d['ohjelmat/ohjelmat_x_uusi_ohjelma']).toMatchObject({ nimi: 'Uusi ohjelma', tila: 'hyvaksytty' });
    const osa = lue('ajo2_kuitattu.xlsx'); osa.sheets.Ohjelmat[1][11] = 'OK'; osa.sheets.Ohjelmat[2][11] = '';   // toinen rivi kuittaamatta
    expect(tilaan(ajo(osa, nyk))['ohjelmat/ohjelmat_97_lihaskestavyys_1_alle_12v'].tila).toBe('luonnos');
  });
  it('KETTERYYS: hyväksytty vasta kun kuva_tai_video on täytetty (URL/tiedosto) — kuittaus OK ei riitä; odottavat listataan', () => {
    expect(d['harjoitepankki/ketteryys_132_ketteryys_1'].tila).toBe('luonnos'); expect(d['harjoitepankki/ketteryys_133_ketteryys_2']).toMatchObject({ tila: 'hyvaksytty', video_url: 'https://example.org/ketteryys2.mp4' });
    expect(r.raportti.odottaaKuvaa).toEqual(['Ketteryys 1']);
  });
  it('IDEMPOTENTTI: samat syötteet uudelleen (apply:n jälkeen) → kaikki "ei_muutosta" (ei tuplia, ei versio-nousua, ei uusia poistoja)', () => {
    const jalkeen = sovella(nyk, r), toinen = ajo(KUITATTU, jalkeen);
    expect(toinen.docs.filter((x) => x.op !== 'ei_muutosta').map((x) => x.polku + ':' + x.op)).toEqual([]);
    expect(poluilla(toinen)).not.toContain('ohjelmat/ohjelmat_99_poistettava_ohjelma'); expect(Object.keys(sovella(jalkeen, toinen)).sort()).toEqual(Object.keys(jalkeen).sort());   // ei tuplia
    expect(toinen.docs.every((x) => x.versio === (jalkeen[x.polku] || {}).versio)).toBe(true);
  });
  it('versio +1 jokaisella MUUTTUNEELLA dokumentilla (ajo 1 → 2: tila vaihtuu → versio 2), muuttumaton jää; 3. ajo muutetulla solulla → versio 3 vain siinä', () => {
    expect(r.docs.find((x) => x.polku === 'harjoitepankki/rutiinit_116_alkurutiini_1')).toMatchObject({ op: 'paivita', versio: 2 });
    const k3 = lue('ajo2_kuitattu.xlsx'); k3.sheets.Rutiinit_ja_harjoitteet[1][2] = 'Uusi ohje vetäjälle'; const kolmas = ajo(k3, sovella(nyk, r));
    expect(kolmas.docs.filter((x) => x.op === 'paivita').map((x) => x.polku + ':v' + x.versio)).toEqual(['harjoitepankki/rutiinit_116_alkurutiini_1:v3']);
  });
  it('poista-rivi ilman olemassa olevaa dokumenttia → huomio, ei virhettä; tuntematon kuittaus → virhe (apply estetty)', () => {
    const tyhja = ajo(KUITATTU, {}); expect(tyhja.raportti.huomiot.join('|')).toContain('ohjelmat/ohjelmat_99_poistettava_ohjelma');
    const huono = lue('ajo2_kuitattu.xlsx'); huono.sheets.Rutiinit_ja_harjoitteet[1][5] = 'ehkä'; expect(ajo(huono, nyk).raportti.virheet.join('|')).toMatch(/tuntematon kuittaus "ehkä"/);
  });
});

describe('aliaskartta: molemmat sarakenimistöt', () => {
  it('SJK:lle lähteneen luonnoksen nimet (ohjelma, ikaraja, lahde_dia, alkaa_pvm, toistot_aika) JA lukitun mallin nimet (ohjelma_nimi, ika_min/max, lahde_viite, alkaa, toistot) tuottavat saman', () => {
    const malli = lue('ajo1_pohja.xlsx');
    const uusiNimet = { ohjelma: 'ohjelma_nimi', ikaraja: 'ika_max', lahde_dia: 'lahde_viite', alkaa_pvm: 'alkaa', paattyy_pvm: 'paattyy' };
    for (const sn of ['Ohjelmat', 'Teemat', 'Ikaluokat']) malli.sheets[sn][0] = malli.sheets[sn][0].map((h) => (h === 'ikaraja' ? h : (uusiNimet[h] || h)));
    const a = ajo(POHJA), b = ajo(malli); expect(poluilla(b)).toEqual(poluilla(a)); expect(vakaa(tilaan(b))).toBe(vakaa(tilaan(a)));
    expect(T.ALIAS.ohjelma).toBe('ohjelma_nimi'); expect(T.ALIAS.ohjelma_nimi).toBe('ohjelma_nimi'); expect(T.ALIAS.toistot_aika).toBe('toistot'); expect(T.ALIAS.lahde_dia).toBe(T.ALIAS.lahde_viite);
  });
  it('sarakkeet haetaan NIMELLÄ, ei sijainnilla: sarakkeiden järjestyksen vaihto ei muuta tulosta', () => {
    const k = lue('ajo1_pohja.xlsx'); const rs = k.sheets.Rutiinit_ja_harjoitteet; k.sheets.Rutiinit_ja_harjoitteet = rs.map((rivi) => rivi.slice().reverse());
    expect(vakaa(tilaan(ajo(k)))).toBe(vakaa(tilaan(ajo(POHJA))));
  });
});
const vakaa = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort().reduce((q, x) => { q[x] = v[x]; return q; }, {}) : v));

describe('CLI: dry-run oletus, apply-portit, kirjoitus vain seurat/{seura}/ -polun alle', () => {
  const ajaCli = (args) => spawnSync('node', [join(juuri, 'scripts/tuo_valmennuslinja.js'), ...args], { encoding: 'utf8' });
  it('dry-run (oletus, --ei-lue): tulostaa raportin, EI kirjoita, koodi 0; puuttuva --seura/--tiedosto → käyttöohje, koodi 2', () => {
    const r = ajaCli(['--seura', 'sjk', '--tiedosto', FX('ajo1_pohja.xlsx'), '--master', FX('master_v2.xlsx'), '--pvm', '2026-10-17', '--ei-lue']);
    expect(r.status).toBe(0); expect(r.stdout).toContain('DRY-RUN — ajo 1'); expect(r.stdout).toContain('mitään ei kirjoitettu'); expect(r.stdout).toContain('"luonnos":'); expect(ajaCli([]).status).toBe(2);
  });
  it('--apply ilman lukua (--ei-lue) estetään; --apply 2. ajolla ilman --tarkistaja estetään; virheet estävät applyn — kaikki ENNEN yhteyttä Firestoreen', () => {
    expect(ajaCli(['--seura', 'sjk', '--tiedosto', FX('ajo1_pohja.xlsx'), '--ei-lue', '--apply']).status).toBe(1);
    const k2 = ajaCli(['--seura', 'sjk', '--tiedosto', FX('ajo2_kuitattu.xlsx'), '--ei-lue', '--apply']); expect(k2.status).toBe(1); expect(k2.stderr).toContain('--tarkistaja');
  });
  it('lähdevartijat: kirjoitus vain polun seurat/{seura}/ alle (tarkistus + poikkeus), batch ≤400, ei SA-avainta (applicationDefault), ei force/merge-yhdistelyä (merge:false)', () => {
    const src = readFileSync(join(juuri, 'scripts/tuo_valmennuslinja.js'), 'utf8');
    expect(src).toContain("ref.path.indexOf(juuri) !== 0"); expect(src).toContain('applicationDefault()'); expect(src).toContain('{ merge: false }'); expect(src).not.toMatch(/serviceAccount|\.json'\)/);
    expect(src).toContain('>= 400'); expect(src).toContain("'seurat/' + o.seura + '/'");
  });
  it('tuonti ei kosketa TM:n oletuspankkiin / harjoitelogiikkaan (§9): skripti ei require:aa harjoitelogiikka_v4.js:ää eikä kirjoita lib/-tiedostoihin', () => {
    const src = readFileSync(join(juuri, 'scripts/tuo_valmennuslinja.js'), 'utf8'); expect(src).not.toMatch(/harjoitelogiikka|writeFileSync|appendFileSync/);
  });
});
