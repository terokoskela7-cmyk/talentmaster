/* Konsepti vientipohjaan (doc 40 §13): lib/tm_harjoitepankki.js (konsepti, lähdetyyppi, kuittaus, ikäkaistat) + scripts/tuo_harjoitepankki_kuittaus.js (kuivaharjoitus, keksityt fixturet — KPV:n aineisto ei repossa). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url), JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const H = require('../lib/tm_harjoitepankki.js'), SN = require('../lib/tm_sanasto.js'), T = require('../scripts/tuo_harjoitepankki_kuittaus.js');

describe('lib: konsepti, lähde, kuittaus, ikä', () => {
  it('14 D248-nimeä = lib/tm_sanasto.js:n sn_y_* (sama nimi, sama järjestys); avain on y_h0–y_h9, y_p1–y_p4; "ei TalentMaster-konseptia" ei ole avain', () => {
    expect(H.KONSEPTIT).toHaveLength(14); for (const [avain, nimi] of H.KONSEPTIT) expect(SN.FI['sn_' + avain], avain).toBe(nimi);
    expect(H.tmHarjoiteKonsepti('1. kosketus')).toEqual({ avain: 'y_h1', tila: 'konsepti' }); expect(H.tmHarjoiteKonsepti('  PALLON suojaaminen ')).toEqual({ avain: 'y_h5', tila: 'konsepti' });
    expect(H.tmHarjoiteKonsepti('ei TalentMaster-konseptia')).toEqual({ avain: null, tila: 'ei_konseptia' }); expect(H.tmHarjoiteKonsepti('')).toEqual({ avain: null, tila: 'tyhja' }); expect(H.tmHarjoiteKonsepti('Kääntyminen')).toEqual({ avain: null, tila: 'tuntematon' });
  });
  it('lähde: oma / SoccerTutor / SPL / muu; tyhjä = muu / en tiedä (näytetään kuten oma); outo arvo → muu + tuntematon', () => {
    expect(['oma (KPV)', 'SoccerTutor', 'SPL-korttipohja', 'muu / en tiedä'].map((x) => H.tmHarjoiteLahdeTyyppi(x).tyyppi)).toEqual(['oma', 'soccertutor', 'spl', 'muu']);
    expect(H.tmHarjoiteLahdeTyyppi('')).toEqual({ tyyppi: 'muu', tila: 'tyhja' }); expect(H.tmHarjoiteLahdeTyyppi('Joku muu')).toEqual({ tyyppi: 'muu', tila: 'tuntematon' });
  });
  it('kuittaus: OK / Muutettu / Poista / tyhjä / tuntematon', () => { expect(['OK', 'ok ', 'Muutettu', 'Poista', '', 'kyllä'].map(H.tmHarjoiteKuittaus)).toEqual(['ok', 'ok', 'muutettu', 'poista', 'tyhja', 'tuntematon']); });
  it('ikäkaistat (KPV-Excel: lista pilkulla) → ika_min / ika_max: "alle 8, 8–9" → ≤9; "8–9, 10–11, 12–13" → 8–13; yksi kaista; Palloliiton koodit ennallaan', () => {
    expect(H.tmHarjoiteParsiIka('alle 8, 8–9')).toMatchObject({ ika_min: null, ika_max: 9 }); expect(H.tmHarjoiteParsiIka('8–9, 10–11, 12–13')).toMatchObject({ ika_min: 8, ika_max: 13 });
    expect(H.tmHarjoiteParsiIka('alle 8, 8–9, 10–11, 12–13, 14–15, 16–19')).toMatchObject({ ika_min: null, ika_max: 19 }); expect(H.tmHarjoiteParsiIka('10–11')).toMatchObject({ ika_min: 10, ika_max: 11 }); expect(H.tmHarjoiteParsiIka('G7-F8')).toMatchObject({ ika_min: 7, ika_max: 8 });
    expect(H.tmHarjoiteParsiIka('hmm, 8–9')._jasentymaton).toBe(true);
  });
});

describe('kuittaustuonti: kuivaharjoitus (suunnittele)', () => {
  const OTS = ['id', 'nimi', 'pankki', 'teema (KPV)', 'tyyppi', 'ikä', 'tavoite', 'Mitä harjoitellaan', 'Toissijainen', 'Lähde', 'video_url', 'kuittaus', 'kommentti'];
  const rivi = (o) => OTS.map((k) => { const m = { id: 'id', nimi: 'nimi', pankki: 'pankki', 'teema (KPV)': 'teema', tyyppi: 'tyyppi', 'ikä': 'ika', tavoite: 'tavoite', 'Mitä harjoitellaan': 'mita', Toissijainen: 'toiss', 'Lähde': 'lahde', video_url: 'video', kuittaus: 'kuittaus', kommentti: 'kommentti' }[k]; return o[m] == null ? '' : o[m]; });
  const perus = { nimi: 'Keksitty', pankki: 'P', teema: 'T', tyyppi: 'Tekniikka', ika: 'alle 8, 8–9', tavoite: 'SALAINEN-TAVOITE-TEKSTI', kommentti: 'SALAINEN-KOMMENTTI' };
  const taulu = (rivit) => T.lueTaulu([OTS].concat(rivit.map((r) => rivi(Object.assign({}, perus, r)))));
  it('sarakkeet haetaan otsikon nimellä (alias, järjestys ei väliä); vaaditut sarakkeet puuttuessa virhe', () => {
    const t = T.lueTaulu([['Kuittaus', 'kpv-id', 'Mitä harjoitellaan', 'id', 'nimi'].map((x) => x === 'kpv-id' ? 'x' : x), ['OK', 'a', 'Syöttäminen', 'kpvh_01', 'N']]); expect(t[0]).toMatchObject({ id: 'kpvh_01', mita: 'Syöttäminen', kuittaus: 'OK' });
    expect(() => T.lueTaulu([['id', 'nimi']])).toThrow(/puuttuvat sarakkeet/);
  });
  it('SÄÄNTÖ: vain OK / Muutettu tuodaan; Poista ja TYHJÄ kuittaus eivät; tuntematon kuittaus ei', () => {
    const r = T.suunnittele(taulu([{ id: 'kpvh_01', mita: 'Syöttäminen', kuittaus: 'OK' }, { id: 'kpvh_02', mita: 'Harhauttaminen', kuittaus: 'Muutettu' }, { id: 'kpvh_03', mita: 'Maalinteko', kuittaus: 'Poista' }, { id: 'kpvh_04', mita: 'Maalinteko', kuittaus: '' }, { id: 'kpvh_05', mita: 'Maalinteko', kuittaus: 'ehkä' }]), null);
    expect(r.raportti.tuodaan).toEqual(['kpvh_01', 'kpvh_02']); expect(r.raportti.kuittaus).toMatchObject({ ok: 1, muutettu: 1, poista: 1, tyhja: 1 }); expect(r.raportti.kuittaus.tuntematon).toHaveLength(1);
    expect(r.rivit.filter((x) => x.tuodaan).map((x) => x.id)).toEqual(['kpvh_01', 'kpvh_02']); expect(r.rivit.find((x) => x.id === 'kpvh_04').patch).toBeNull();
  });
  it('patch: konsepti-avain, lähdetyyppi (tyhjä Lähde = muu), SoccerTutor → kolmas_osapuoli, https-video, ikä; "ei TalentMaster-konseptia" → konsepti null; tunnistamaton Mitä harjoitellaan → konseptia ei kosketa; tila EI muutu', () => {
    const r = T.suunnittele(taulu([
      { id: 'a_1', mita: '1. kosketus', toiss: 'Kuljettaminen', lahde: 'oma (KPV)', video: 'https://youtu.be/x', kuittaus: 'OK' }, { id: 'a_2', mita: 'Syöttäminen', lahde: '', kuittaus: 'OK' }, { id: 'a_3', mita: 'Harhauttaminen', lahde: 'SoccerTutor', video: 'https://y.fi/v', kuittaus: 'Muutettu' },
      { id: 'a_4', mita: 'ei TalentMaster-konseptia', kuittaus: 'OK' }, { id: 'a_5', mita: 'Kääntyminen', kuittaus: 'OK' }, { id: 'a_6', mita: 'Maalinteko', video: 'http://eihttps.fi', kuittaus: 'OK' }]), null);
    const p = (id) => r.rivit.find((x) => x.id === id).patch;
    expect(p('a_1')).toEqual({ lahde_tyyppi: 'oma', kolmas_osapuoli: false, konsepti: 'y_h1', konsepti_toissijainen: 'y_h3', video_url: 'https://youtu.be/x', ika_min: null, ika_max: 9, ika_teksti: 'alle 8, 8–9' });
    expect(p('a_2')).toMatchObject({ lahde_tyyppi: 'muu', kolmas_osapuoli: false, konsepti: 'y_h2', konsepti_toissijainen: null }); expect(p('a_2')).not.toHaveProperty('video_url');
    expect(p('a_3')).toMatchObject({ lahde_tyyppi: 'soccertutor', kolmas_osapuoli: true, konsepti: 'y_h4' }); expect(p('a_4')).toMatchObject({ konsepti: null }); expect(p('a_5')).not.toHaveProperty('konsepti');
    expect(p('a_6')).not.toHaveProperty('video_url'); expect(r.raportti.video.eiHttps).toEqual(['a_6']); for (const id of ['a_1', 'a_2', 'a_3']) expect(p(id)).not.toHaveProperty('tila');
  });
  it('linkitys id:llä pankin dokumenttiin: puuttuva dokumentti → ei kirjoiteta; ei-hyväksytty ja arkistoitu raportoidaan', () => {
    const t = taulu([{ id: 'kpvh_01', mita: 'Syöttäminen', kuittaus: 'OK' }, { id: 'kpvh_02', mita: 'Syöttäminen', kuittaus: 'OK' }, { id: 'kpvh_03', mita: 'Syöttäminen', kuittaus: 'OK' }, { id: 'kpvh_04', mita: 'Syöttäminen', kuittaus: 'OK' }]);
    const r = T.suunnittele(t, { kpvh_01: { tila: 'hyvaksytty' }, kpvh_02: { tila: 'luonnos' }, kpvh_03: { tila: 'hyvaksytty', arkistoitu: true } }), p = r.raportti;
    expect(p.ilmanDokumenttia).toEqual(['kpvh_04']); expect(p.eiHyvaksytty).toEqual(['kpvh_02']); expect(p.arkistoitu).toEqual(['kpvh_03']); expect(r.rivit.find((x) => x.id === 'kpvh_04')).toMatchObject({ tuodaan: false, syy: 'ei dokumenttia pankissa' });
  });
  it('esitäytön kattavuus riippumatta kuittauksesta: konsepti-osumat, "ei konseptia" (+ pankin tyyppi syynä), tyhjät, tunnistamattomat, toissijainen; duplikaatti-id ja virheellinen id', () => {
    const r = T.suunnittele(taulu([{ id: 'b_1', mita: 'Syöttäminen', toiss: 'Syöttäminen' }, { id: 'b_2', mita: 'ei TalentMaster-konseptia', tyyppi: 'Lämmittely' }, { id: 'b_3', mita: '' }, { id: 'b_4', mita: 'Outo', toiss: 'Outo2' }, { id: 'b_1', mita: 'Maalinteko' }, { id: 'Väärä Id', mita: 'x' }]), null), e = r.raportti.esitaytto;
    expect(e.konseptiYht).toBe(1); expect(e.eiKonseptia).toEqual(['b_2']); expect(e.eiKonseptiaTyypit).toEqual({ Lämmittely: 1 }); expect(e.tyhja).toEqual(['b_3']); expect(e.tuntematon).toEqual(['b_4 ("Outo")']); expect(e.toissijainenTuntematon).toEqual(['b_4 ("Outo2")']); expect(e.toissijainenSamaKuinEnsisijainen).toEqual(['b_1']);
    expect(r.raportti.duplikaatit).toEqual(['b_1']); expect(r.raportti.virheelliset).toEqual(['Väärä Id']);
  });
  it('raportti tulostaa vain id:t, luvut ja luokitteluarvot — ei tavoite- eikä kommenttitekstejä', () => {
    const r = T.suunnittele(taulu([{ id: 'c_1', mita: 'Syöttäminen', kuittaus: 'OK' }, { id: 'c_2', mita: 'Outo', kuittaus: '' }]), null), t = T.tulosta(r, { seura: 'testi' });
    expect(t).toContain('TUODAAN NYT: 1'); expect(t).toContain('TYHJÄ (ei vielä kuitattu) 1'); expect(t).not.toMatch(/SALAINEN|Keksitty/);
  });
  it.skipIf(!existsSync(join(JUURI, '.kpv_pankki/KPV_harjoituspankki_tarkistus.xlsx')))('paikallinen KPV-tiedosto (ei repossa): 89 riviä, kaikki id:t ID-muotoisia, ei duplikaatteja, tyhjä kuittaus → 0 tuotavaa', () => {
    const { lueXlsx } = require('../scripts/xlsx_luku.js'), x = lueXlsx(readFileSync(join(JUURI, '.kpv_pankki/KPV_harjoituspankki_tarkistus.xlsx'))), r = T.suunnittele(T.lueTaulu(x.sheets.Harjoitteet), null).raportti;
    expect(r.yhteensa).toBe(89); expect(r.duplikaatit).toEqual([]); expect(r.virheelliset).toEqual([]); expect(r.esitaytto.tuntematon).toEqual([]);
    if (r.kuittaus.ok + r.kuittaus.muutettu + r.kuittaus.poista === 0) expect(r.tuodaan).toEqual([]);   // KPV ei ole vielä kuitannut
  });
});

describe('vientipohjan generaattori (scripts/luo_harjoitepankki_pohja.js + xlsx_kirjoita.js)', () => {
  const G = require('../scripts/luo_harjoitepankki_pohja.js'), { lueXlsx, lueZip } = require('../scripts/xlsx_luku.js');
  const buf = G.luoPohja({ seura: 'SJK', rivit: 120 }), x = lueXlsx(buf);
  it('välilehdet OHJE · Harjoitteet · listat; sarakkeet kuten KPV:n kuittauspohjassa (teema (seura)); pohjassa ei aineistoa (vain otsikkorivi)', () => {
    expect(Object.keys(x.sheets).sort()).toEqual(['Harjoitteet', 'OHJE', 'listat']); expect(x.sheets.Harjoitteet).toEqual([['id', 'nimi', 'pankki', 'teema (SJK)', 'tyyppi', 'ikä', 'tavoite', 'Mitä harjoitellaan', 'Toissijainen', 'Lähde', 'video_url', 'kuittaus', 'kommentti']]);
  });
  it('listat: D248:n 14 nimeä + "ei TalentMaster-konseptia" · lähteet · kuittaukset; OHJE kertoo säännön (vain OK/Muutettu, tyhjä ei näy, https) eikä sisällä konseptikoodeja', () => {
    const l = x.sheets.listat; expect(l.map((r) => r[0])).toEqual(H.KONSEPTIT.map((k) => k[1]).concat(['ei TalentMaster-konseptia'])); expect(l.map((r) => r[1]).filter(Boolean)).toEqual(['oma (SJK)', 'SoccerTutor', 'SPL-korttipohja', 'muu / en tiedä']); expect(l.map((r) => r[2]).filter(Boolean)).toEqual(['OK', 'Muutettu', 'Poista']);
    const o = x.sheets.OHJE.map((r) => r[0]).join('\n'); expect(o).toMatch(/Vain OK ja Muutettu -rivit tuodaan/); expect(o).toMatch(/https:\/\//); expect(o).not.toMatch(/\by_[hp]\d\b/i); expect(o).toContain('• Katse ja havainnointi');
  });
  it('pudotusvalikot (data validation): Mitä harjoitellaan + Toissijainen → listat!A, Lähde → listat!B, kuittaus → listat!C; jäädytetty otsikko', () => {
    const z = lueZip(buf), xml = z['xl/worksheets/sheet2.xml'].toString('utf8');
    for (const [alue, kaava] of [['H2:H121', 'listat!$A$1:$A$15'], ['I2:I121', 'listat!$A$1:$A$15'], ['J2:J121', 'listat!$B$1:$B$4'], ['L2:L121', 'listat!$C$1:$C$3']]) expect(xml).toContain('sqref="' + alue + '"><formula1>' + kaava + '</formula1>');
    expect(xml).toContain('state="frozen"');
  });
  it('kiertotesti: pohjan otsikot kelpaavat tuontiskriptille (alias teema_sjk → teema); xlsx on avattavissa (zip-rakenne: Content_Types, workbook, 3 taulukkoa)', () => {
    const t = T.lueTaulu(x.sheets.Harjoitteet.concat([['kpvh_01', 'N', '', '', '', 'alle 8', '', 'Syöttäminen', '', '', '', 'OK', '']])); expect(t).toHaveLength(1); expect(t[0]).toMatchObject({ id: 'kpvh_01', mita: 'Syöttäminen', kuittaus: 'OK', ika: 'alle 8' });
    expect(Object.keys(lueZip(buf)).sort()).toEqual(['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml']);
  });
});
