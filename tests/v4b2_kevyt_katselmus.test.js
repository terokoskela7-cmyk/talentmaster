/**
 * V4b-2 · kevyt katselmus + Hylkää valinta + valmentajaprofiili (lib/tm_kevyt_katselmus.js) ja pelaajan "Valmentajalta"-rivi (lib/tm_reitin_valinta.js).
 * Brief #8–#10, #14, §3; Teron päätökset 7.10.: kevyt EI päivitä review_viimeisin_* -kenttiä eikä reviewit-dokumentin tyyppiä; hylkäyksessä vaihtoehdot muutettavissa; ei sanaa "hylätty" pelaajalle.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const K = require('../lib/tm_kevyt_katselmus.js'), RV = require('../lib/tm_reitin_valinta.js'), K4 = require('../lib/tm_viikkokatsaus.js'), AJ = require('../lib/tm_aloita_jakso.js');
const NYT = '2026-11-10T10:00:00.000Z', PVM = '2026-11-10';
const JF = (o = {}) => Object.assign({ konsepti_avain: 'y_h1', konsepti_nimi: 'Kuljetus', domeeni: 'teknis_taktinen', alkoi: '2026-09-21T08:00:00.000Z', kesto_vk: 6, ohjelma: null }, o);
const P = (o = {}) => Object.assign({ id: 'p1', etunimi: 'Topias', jaksofokus: JF(), review_viimeisin_pvm: '2026-08-01', review_viimeisin_tyyppi: 'mdr' }, o);
const KORTIT = () => [{ avain: 'y_h3', nimi: 'Pelinluku', syy: 'heikoin', valittu: false, lause: '' }, { avain: 'y_h5', nimi: 'Syöttö', syy: null, valittu: false, lause: '' }];
const TAYSI = (profiili = 'oto', lause = 'Laukaus vauhdista näkyi jo peleissä.', extra = {}) => { const S = K.tmKkAlku(P(), Object.assign({ profiili, kortit: KORTIT() }, extra)); K.tmKkAsetaVastaus(S, 'nakyi', 'ohjatusti'); K.tmKkAsetaVastaus(S, 'treeni', 'usein'); K.tmKkAsetaVastaus(S, 'mukana', 'hyvin'); S.lause = lause; return S; };
const CTX = (o = {}) => Object.assign({ nytISO: NYT, pvm: PVM, rooli: 'valmentaja', harjoituksia: 5, lasnaolo: { paikalla: 4, yhteensa: 5, tiedossa: 5 }, alkoi: '2026-09-21', loppu: '2026-11-02' }, o);

describe('kevyt katselmus: kirjoitussuunnitelma (yksi tallennus)', () => {
  it('3 vastausta + lause → historiarivi (lause + lause_lahde) + reviewit/{pvm}.kevyt (sanoina) + kevyt_tallennettu; jakso suljetaan (jaksofokus null)', () => {
    const x = K.tmKkTallennus(P(), TAYSI(), CTX()); expect(x.ok).toBe(true);
    expect(x.jaksofokus).toBeNull(); expect(x.historiaLisays).toHaveLength(1);
    expect(x.historiaLisays[0]).toMatchObject({ konsepti_avain: 'y_h1', sulkutapa: 'suljettu', lause: 'Laukaus vauhdista näkyi jo peleissä.', lause_lahde: 'valmentaja', arvioija_rooli: 'valmentaja', harjoituksia: 5, suljettu: NYT });
    expect(x.reviewitPvm).toBe(PVM); expect(x.reviewitData).toEqual({ kevyt: { nakyi: 'ohjatusti', treeni: 'usein', mukana: 'hyvin' }, kevyt_tallennettu: NYT }); expect(x.poistaValinta).toBe(false); expect(x.tarjottu).toBe(false);
  });
  it('EI koske review_viimeisin_*-pikakenttiin eikä reviewit.tyyppi:ä (MDT-rytmi päivittyy vain täydestä katselmuksesta); suunnitelmassa ei pikakenttiä', () => {
    const x = K.tmKkTallennus(P(), TAYSI(), CTX()); const avaimet = JSON.stringify(Object.keys(x)) + JSON.stringify(Object.keys(x.reviewitData));
    expect(avaimet).not.toMatch(/review_viimeisin|pikakentat|tyyppi/); expect(Object.keys(x.reviewitData).sort()).toEqual(['kevyt', 'kevyt_tallennettu']);
    expect(Object.keys(x.historiaLisays[0])).not.toContain('kevyt');   // pelaaja lukee oman dokumenttinsa → kolmen kysymyksen vastaukset EIVÄT historiariville (§39)
    expect(JSON.stringify(x.historiaLisays)).not.toMatch(/ohjatusti|itsenaisesti|"usein"/);
  });
  it('lause_lahde: VP sulkee valmentajan puolesta → "vp"; ei lausetta (oto) → ei lause-kenttiä', () => {
    const S = TAYSI('oto'); S.lahde = 'vp'; expect(K.tmKkTallennus(P(), S, CTX({ rooli: 'vp' })).historiaLisays[0]).toMatchObject({ lause: 'Laukaus vauhdista näkyi jo peleissä.', lause_lahde: 'vp', arvioija_rooli: 'vp' });
    const ilman = K.tmKkTallennus(P(), TAYSI('oto', ''), CTX()); expect(ilman.ok).toBe(true); expect('lause' in ilman.historiaLisays[0]).toBe(false); expect('lause_lahde' in ilman.historiaLisays[0]).toBe(false);
  });
  it('K3-tarjous samassa tallennuksessa: jaksofokus = {tila:valittavana, vaihtoehdot}, ydinvahvuus_valinta poistetaan, historiarivi silti kirjoitetaan', () => {
    const S = TAYSI(); S.k3.paalla = true; S.k3.kortit[0].valittu = true; S.k3.kortit[0].lause = 'Kun osaat molemmilla, puolustaja ei tiedä.';
    const x = K.tmKkTallennus(P({ ydinvahvuus_valinta: { vaihtoehto: 'vanha' } }), S, CTX()); expect(x.ok).toBe(true); expect(x.tarjottu).toBe(true); expect(x.poistaValinta).toBe(true);
    expect(x.jaksofokus).toEqual({ tila: 'valittavana', vaihtoehdot: [{ konsepti_avain: 'y_h3', nimi: 'Pelinluku', perustelu: 'Kun osaat molemmilla, puolustaja ei tiedä.', vahvistettu: true }] }); expect(x.historiaLisays).toHaveLength(1); expect(x.reviewitData.kevyt.nakyi).toBe('ohjatusti');
    const huono = TAYSI(); huono.k3.paalla = true; huono.k3.kortit[0].valittu = true; huono.k3.kortit[0].lause = 'Heikkous: laukaus';   // KIELLETYT
    expect(K.tmKkTallennus(P(), huono, CTX())).toMatchObject({ ok: false, syy: 'k3_sana', indeksi: 0 });
  });
  it('VALIDOINTI ENNEN KIRJOITUSTA: puuttuva vastaus, väärä arvo, lause liian pitkä / sisältää luvun / kielletyn sanan, ei jaksoa, väärä pvm → { ok:false }', () => {
    const vajaa = TAYSI(); vajaa.kevyt.mukana = null; expect(K.tmKkTallennus(P(), vajaa, CTX())).toMatchObject({ ok: false, syy: 'kysymykset' });
    const vaara = TAYSI(); vaara.kevyt.nakyi = 'hyvin'; expect(K.tmKkTallennus(P(), vaara, CTX())).toMatchObject({ ok: false, syy: 'kysymykset' });
    expect(K.tmKkTallennus(P(), TAYSI('oto', 'x'.repeat(141)), CTX())).toMatchObject({ ok: false, syy: 'pitka' });
    expect(K.tmKkTallennus(P(), TAYSI('oto', 'Laukaus 4/5 onnistui'), CTX())).toMatchObject({ ok: false, syy: 'luku' });
    expect(K.tmKkTallennus(P(), TAYSI('oto', 'Heikkous on laukaus'), CTX())).toMatchObject({ ok: false, syy: 'sana' });
    expect(K.tmKkTallennus(P({ jaksofokus: null }), TAYSI(), CTX())).toMatchObject({ ok: false, syy: 'ei_jaksoa' }); expect(K.tmKkTallennus(P({ jaksofokus: { tila: 'valittavana', vaihtoehdot: [] } }), TAYSI(), CTX())).toMatchObject({ ok: false, syy: 'ei_jaksoa' });
    expect(K.tmKkTallennus(P(), TAYSI(), CTX({ pvm: '10.11.2026' }))).toMatchObject({ ok: false, syy: 'pvm' });
    expect(K.tmKkVirhe('kysymykset', {})).toContain('kolmeen'); expect(K.tmKkVirhe('luku', {})).toContain('lukuja');
  });
  it('PROFIILI: ammatti → lause pakollinen (tyhjä hylätään); oto → toivottu (tyhjä ok); tmKkVoiTallentaa seuraa samaa', () => {
    expect(K.tmKkTallennus(P(), TAYSI('ammatti', ''), CTX())).toMatchObject({ ok: false, syy: 'pakollinen' }); expect(K.tmKkTallennus(P(), TAYSI('ammatti', '   '), CTX()).ok).toBe(false); expect(K.tmKkTallennus(P(), TAYSI('ammatti'), CTX()).ok).toBe(true);
    expect(K.tmKkTallennus(P(), TAYSI('oto', ''), CTX()).ok).toBe(true);
    expect(K.tmKkVoiTallentaa(TAYSI('ammatti', ''))).toMatchObject({ ok: false, syy: 'pakollinen' }); expect(K.tmKkVoiTallentaa(TAYSI('oto', '')).ok).toBe(true); const tyhja = K.tmKkAlku(P(), {}); expect(K.tmKkVoiTallentaa(tyhja)).toMatchObject({ ok: false, syy: 'kysymykset' });
    expect(K.tmKkVirhe('pakollinen', {})).toContain('Kirjoita lause');
  });
  it('vastaukset sanoina (ei numeroita): enum sama kuin Rules v3.46; sama vastaus uudelleen poistaa valinnan', () => {
    expect(K.KYSYMYKSET.map((q) => [q.avain, q.arvot])).toEqual([['nakyi', ['ei_viela', 'ohjatusti', 'itsenaisesti']], ['treeni', ['harvoin', 'joskus', 'usein']], ['mukana', ['vahan', 'jonkin_verran', 'hyvin']]]);
    expect(K.tmKevytKelpaa({ nakyi: 'ohjatusti', treeni: 'usein', mukana: 'hyvin' })).toBe(true); for (const k of [{ nakyi: 1, treeni: 'usein', mukana: 'hyvin' }, { nakyi: 'ohjatusti', treeni: 'usein' }, { nakyi: 'ohjatusti', treeni: 'usein', mukana: 'hyvin', x: 1 }, null, 'a', []]) expect(K.tmKevytKelpaa(k)).toBe(false);
    const S = K.tmKkAlku(P(), {}); expect(K.tmKkAsetaVastaus(S, 'nakyi', 'ohjatusti')).toBe(true); expect(S.kevyt.nakyi).toBe('ohjatusti'); K.tmKkAsetaVastaus(S, 'nakyi', 'ohjatusti'); expect(S.kevyt.nakyi).toBeNull(); expect(K.tmKkAsetaVastaus(S, 'nakyi', '3')).toBe(false); expect(K.tmKkAsetaVastaus(S, 'x', 'usein')).toBe(false);
  });
  it('oto: aloitusehdotukset osista (3, muokattavia, vartijan läpi); ammatti: ei ehdotuksia; ei osia → ei ehdotuksia', () => {
    const osat = [{ k: 'a', teksti: 'Laukaus vauhdista' }, { k: 'b', teksti: 'Heikompi jalka' }, { k: 'c', teksti: 'Katse maaliin ennen laukausta' }];
    const S = K.tmKkAlku(P(), { profiili: 'oto', osat }); const e = K.tmKkEhdotukset(S); expect(e).toHaveLength(3); e.forEach((t) => { expect(K4.tmVkLauseValmentaja(t).ok).toBe(true); expect(t.length).toBeLessThanOrEqual(140); }); expect(new Set(e).size).toBe(3);
    K.tmKkAsetaVastaus(S, 'nakyi', 'itsenaisesti'); expect(K.tmKkEhdotukset(S)[0]).toContain('näkyi jo pelissä'); K.tmKkAsetaVastaus(S, 'nakyi', 'itsenaisesti'); K.tmKkAsetaVastaus(S, 'nakyi', 'ei_viela'); expect(K.tmKkEhdotukset(S)[0]).toContain('seuraava askel');
    expect(K.tmKkEhdotukset(K.tmKkAlku(P(), { profiili: 'ammatti', osat }))).toEqual([]); expect(K.tmKkEhdotukset(K.tmKkAlku(P(), { profiili: 'oto', osat: [] }))).toEqual([]);
    expect(K.tmLauseEhdotukset([{ teksti: 'Heikkous 5/5' }], 'ohjatusti')).toEqual([]);   // vartija pudottaa luvut/kielletyt
  });
});

describe('kevyt katselmus: ruutu (HTML)', () => {
  const OPTS = { pinta: 'var(--surface)', vastausFn: '_v', lauseFn: '_l', ehdotusFn: '_e', tallennaFn: '_t', syvennaFn: '_s', suljeFn: '_c', k3: { paalleFn: '_p', valitseFn: '_x', lauseFn: '_z' } };
  it('3 kysymystä × 3 sanavaihtoehtoa, lause-kenttä (140), K3-osio, "Sulje jakso ja lähetä" + "Syvennä"; profiili-teksti: pakollinen / toivottu; ei hex-värejä', () => {
    const osat = [{ k: 'a', teksti: 'Laukaus vauhdista' }];
    const oto = K.tmKkSheetHTML(K.tmKkAlku(P(), { profiili: 'oto', kortit: KORTIT(), osat, nimi: 'Topias K.' }), OPTS), am = K.tmKkSheetHTML(K.tmKkAlku(P(), { profiili: 'ammatti', kortit: KORTIT(), osat }), OPTS);
    expect((oto.match(/data-kvk-arvo=/g) || []).length).toBe(9); for (const t of ['Näkyikö ase pelissä?', 'Treenattiinko sitä?', 'Oliko pelaaja mukana?', 'Ei vielä', 'Ohjatusti', 'Itsenäisesti', 'Harvoin', 'Joskus', 'Usein', 'Vähän', 'Jonkin verran', 'Hyvin', 'Sulje jakso ja lähetä', 'Syvennä (täysi katselmus)', 'Anna pelaajan valita seuraava reitti']) expect(oto, t).toContain(t);
    expect(oto).toContain('maxlength="140"'); expect(oto).toContain('toivottu'); expect(oto).toContain('data-kvk-ehdotukset'); expect(am).toContain('pakollinen'); expect(am).not.toContain('data-kvk-ehdotukset'); expect(oto).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    expect(oto).toContain('onclick="_v(\'nakyi\',\'ohjatusti\')"'); expect(oto).not.toMatch(/[<>]script/);
    const vp = K.tmKkSheetHTML(Object.assign(K.tmKkAlku(P(), { profiili: 'oto', lahde: 'vp' }), {}), OPTS); expect(vp).toContain('VP:n lause');
  });
  it('valittu vastaus näkyy (aria-pressed); K3-osio vain kun opts.k3; XSS: nimi ja lause escapataan', () => {
    const S = K.tmKkAlku(P(), { profiili: 'oto', nimi: '<b>x</b>' }); K.tmKkAsetaVastaus(S, 'treeni', 'joskus'); S.lause = '</textarea><script>1</script>';
    const h = K.tmKkSheetHTML(S, OPTS); expect(h).toMatch(/aria-pressed="true"[^>]*>|data-kvk-arvo="joskus"/); expect((h.match(/aria-pressed="true"/g) || []).length).toBe(1); expect(h).not.toContain('<b>x</b>'); expect(h).not.toContain('<script>1');
    expect(K.tmKkSheetHTML(S, { ...OPTS, k3: undefined })).not.toContain('data-k3-osio');
  });
});

describe('Hylkää valinta (§3 b)', () => {
  const VALITTAVANA = () => P({ jaksofokus: { tila: 'valittavana', vaihtoehdot: [{ konsepti_avain: 'y_h1', nimi: 'Kuljetus', perustelu: 'Hyvä.', vahvistettu: true }, { konsepti_avain: 'y_h2', nimi: 'Syöttö', perustelu: 'Toinen.', vahvistettu: true }] }, ydinvahvuus_valinta: { vaihtoehto: 'y_h2', valittu_pvm: '2026-11-09' } });
  it('kortit esitäytetään nykyisillä vaihtoehdoilla (valittu + lause), ehdotukset lisätään muutettaviksi (ei duplikaatteja, max 4)', () => {
    const S = K.tmHylkaaAlku(VALITTAVANA(), { ehdotukset: [{ konsepti_avain: 'y_h1', konsepti_nimi: 'Kuljetus' }, { konsepti_avain: 'y_h7', konsepti_nimi: 'Laukaus', syy: 's' }] });
    expect(S.k3.paalla).toBe(true); expect(S.k3.kortit.map((k) => [k.avain, k.valittu, k.lause])).toEqual([['y_h1', true, 'Hyvä.'], ['y_h2', true, 'Toinen.'], ['y_h7', false, '']]);
    expect(K.tmHylkaaKortit(VALITTAVANA(), KORTIT()).map((k) => k.avain)).toEqual(['y_h1', 'y_h2', 'y_h3', 'y_h5']);   // valmiit kortit (adapterin _msK3Ehdotukset)
  });
  it('tallennus: jaksofokus = {tila:valittavana, vaihtoehdot, hylatty:{pvm, perustelu, valinta}} + ydinvahvuus_valinta poistetaan; vaihtoehtoja voi muuttaa', () => {
    const S = K.tmHylkaaAlku(VALITTAVANA(), { ehdotukset: [{ konsepti_avain: 'y_h7', konsepti_nimi: 'Laukaus' }] }); S.perustelu = 'Valitse reitti, jonka haluat harjoitella itse.';
    S.k3.kortit[1].valittu = false; S.k3.kortit[2].valittu = true; S.k3.kortit[2].lause = 'Uusi lause vaihtoehdolle.';   // y_h2 pois, y_h7 mukaan
    const x = K.tmHylkaaTallennus(VALITTAVANA(), S, { pvm: PVM }); expect(x.ok).toBe(true); expect(x.poistaValinta).toBe(true);
    expect(x.jaksofokus).toEqual({ tila: 'valittavana', vaihtoehdot: [{ konsepti_avain: 'y_h1', nimi: 'Kuljetus', perustelu: 'Hyvä.', vahvistettu: true }, { konsepti_avain: 'y_h7', nimi: 'Laukaus', perustelu: 'Uusi lause vaihtoehdolle.', vahvistettu: true }], hylatty: { pvm: PVM, perustelu: 'Valitse reitti, jonka haluat harjoitella itse.', valinta: 'y_h2' } });
  });
  it('oma ehdotus hylätään: hylatty.valinta = pelaajan oma teksti (≤ 60)', () => {
    const p = VALITTAVANA(); p.ydinvahvuus_valinta = { vaihtoehto: 'Haluan oppia temppuja', valittu_pvm: PVM }; const S = K.tmHylkaaAlku(p, {}); S.perustelu = 'Tehdään ensin tämä.'; expect(K.tmHylkaaTallennus(p, S, { pvm: PVM }).jaksofokus.hylatty.valinta).toBe('Haluan oppia temppuja');
  });
  it('VALIDOINTI: ei valintaa → ei hylättävää; perustelu pakollinen; ≤140; KIELLETYT; ei lukuja; ei sanaa "hylätty"; vaihtoehto vaaditaan; väärä pvm', () => {
    const ok = () => { const S = K.tmHylkaaAlku(VALITTAVANA(), {}); S.perustelu = 'Valitse reitti, jonka haluat harjoitella itse.'; return S; };
    const vain = (t) => { const S = ok(); S.perustelu = t; return K.tmHylkaaTallennus(VALITTAVANA(), S, { pvm: PVM }); };
    expect(K.tmHylkaaTallennus(P({ jaksofokus: { tila: 'valittavana', vaihtoehdot: VALITTAVANA().jaksofokus.vaihtoehdot } }), ok(), { pvm: PVM })).toMatchObject({ ok: false, syy: 'ei_valintaa' });   // pelaaja ei ole valinnut
    expect(K.tmHylkaaTallennus(P(), ok(), { pvm: PVM })).toMatchObject({ ok: false, syy: 'ei_valintaa' });   // jakso käynnissä
    expect(vain('')).toMatchObject({ ok: false, syy: 'pakollinen' }); expect(vain('x'.repeat(141))).toMatchObject({ ok: false, syy: 'pitka' }); expect(vain('Heikkous: laukaus')).toMatchObject({ ok: false, syy: 'sana' }); expect(vain('Laukaus onnistui 4/5')).toMatchObject({ ok: false, syy: 'luku' });
    expect(vain('Tämä valinta on hylätty')).toMatchObject({ ok: false, syy: 'sana' }); expect(vain('Hylkään tämän, valitse toinen')).toMatchObject({ ok: false, syy: 'sana' });
    const eiVaiht = ok(); eiVaiht.k3.kortit.forEach((k) => { k.valittu = false; }); expect(K.tmHylkaaTallennus(VALITTAVANA(), eiVaiht, { pvm: PVM })).toMatchObject({ ok: false, syy: 'k3_ei_valittu' });
    expect(K.tmHylkaaTallennus(VALITTAVANA(), ok(), { pvm: 'x' })).toMatchObject({ ok: false, syy: 'pvm' });
    expect(K.tmHylkaaVirhe('pakollinen', {})).toContain('perustelu'); expect(K.tmHylkaaVirhe('ei_valintaa', {})).toContain('ei hylättävää'); expect(K.tmHylkaaVirhe('luku', {})).toContain('lukuja');
  });
  it('tmJaksoTila: "Hylkää valinta" ja "Syvennä" ovat nyt käytettävissä valikossa', () => {
    const t = AJ.tmJaksoTila(VALITTAVANA(), { nyt: Date.parse(NYT) }); expect(t.tila).toBe('valinta_tehty'); expect(t.valikko.find((m) => m.avain === 'hylkaa')).toMatchObject({ kaytettavissa: true });
    const paatt = AJ.tmJaksoTila(P({ jaksofokus: JF({ alkoi: '2026-09-01T08:00:00.000Z', kesto_vk: 4 }) }), { nyt: Date.parse(NYT) }); expect(paatt.valikko.find((m) => m.avain === 'syvenna').kaytettavissa).toBe(true);
  });
  it('ruutu: perustelu-kenttä (140) + K3-lomake esitäytettynä + Lähetä uudelleen; escapointi', () => {
    const S = K.tmHylkaaAlku(VALITTAVANA(), { nimi: '<i>N</i>' }); S.perustelu = '"><script>x</script>';
    const h = K.tmHylkaaSheetHTML(S, { lauseFn: '_l', tallennaFn: '_t', suljeFn: '_c', k3: { paalleFn: '_p', valitseFn: '_x', lauseFn: '_z' } });
    expect(h).toContain('Hylkää valinta'); expect(h).toContain('data-hk-perustelu'); expect(h).toContain('maxlength="140"'); expect(h).toContain('Lähetä pelaajalle uudelleen'); expect(h).toContain('data-k3-osio'); expect((h.match(/checked/g) || []).length).toBe(2); expect(h).not.toContain('<script>x'); expect(h).not.toContain('<i>N</i>');
  });
});

describe('Pelaaja: "Valmentajalta: {perustelu}" — vain kunnes pelaaja valitsee uudelleen; ei sanaa "hylätty"', () => {
  const HYLATTY = (extra = {}) => ({ id: 'p1', jaksofokus: { tila: 'valittavana', vaihtoehdot: [{ konsepti_avain: 'y_h1', nimi: 'Kuljetus', perustelu: 'Hyvä.', vahvistettu: true }], hylatty: { pvm: PVM, perustelu: 'Valitse reitti, jonka haluat harjoitella itse.', valinta: 'y_h2' } }, ...extra });
  const teksti = (h) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  it('valintaruudussa ja "Valitse seuraava reitti" -kortissa näkyy "Valmentajalta" + perustelu', () => {
    const tila = RV.tmValintaTila(HYLATTY()); expect(tila.tila).toBe('valittavana'); expect(tila.valmentajalta).toBe('Valitse reitti, jonka haluat harjoitella itse.');
    const ruutu = RV.tmValintaRuutuHTML(tila.vaihtoehdot, {}, { valmentajalta: tila.valmentajalta, valitseFn: 'v', omaFn: 'o', omaTekstiFn: 't', tallennaFn: 's', takaisinFn: 'b' }); expect(ruutu).toContain('data-k3-valmentajalta'); expect(teksti(ruutu)).toContain('Valmentajalta Valitse reitti, jonka haluat harjoitella itse.');
    const kortti = RV.tmValintaLisaHTML(tila, { valitseFn: 'v()' }); expect(kortti).toContain('data-k3-valmentajalta'); expect(kortti).toContain('Valitse seuraava reitti'); expect(teksti(kortti)).toContain('Valmentajalta Valitse reitti');
  });
  it('EI sanaa "hylätty" (eikä hylk-/hylä-) pelaajalle: ei tekstissä, ei hylatty.valinta/pvm-arvoa; ei päivämäärää eikä lukuja', () => {
    const tila = RV.tmValintaTila(HYLATTY()); const h = RV.tmValintaRuutuHTML(tila.vaihtoehdot, {}, { valmentajalta: tila.valmentajalta }) + RV.tmValintaLisaHTML(tila, {});
    expect(teksti(h)).not.toMatch(/hyl[aäk]/i); expect(h).not.toContain('y_h2'); expect(h).not.toContain(PVM); expect(teksti(RV.tmValintaLisaHTML(tila, {}))).not.toMatch(/\d/);
    for (const k of Object.keys(RV.FI)) expect(RV.FI[k], k).not.toMatch(/hyl[aäk]/i);   // ei tekstiavainta, jossa sana
  });
  it('rivi katoaa kun pelaaja on valinnut uudelleen (ydinvahvuus_valinta) — silloin tila "valittu", ei valmentajalta-riviä', () => {
    const p = HYLATTY({ ydinvahvuus_valinta: { vaihtoehto: 'y_h1', valittu_pvm: '2026-11-11' } }); const tila = RV.tmValintaTila(p); expect(tila.tila).toBe('valittu'); expect(tila.valmentajalta).toBeUndefined(); expect(RV.tmValintaLisaHTML(tila, {})).not.toContain('data-k3-valmentajalta');
  });
  it('rivi ei näy ilman perustelua, uudella tarjouksella (hylatty-kenttä poissa) tai kun jakso ei ole valittavana; vartija ajetaan uudelleen näytettäessä (KIELLETYT, luvut, "hylä")', () => {
    const base = HYLATTY(); delete base.jaksofokus.hylatty; expect(RV.tmValintaTila(base).valmentajalta).toBeNull(); expect(RV.tmValintaLisaHTML(RV.tmValintaTila(base), {})).not.toContain('data-k3-valmentajalta');
    for (const huono of ['Heikkous: laukaus', 'Taso 4 on hyvä', 'Tämä on hylätty', 'x'.repeat(141), '   ', 12]) { const p = HYLATTY(); p.jaksofokus.hylatty.perustelu = huono; expect(RV.tmValintaTila(p).valmentajalta, String(huono)).toBeNull(); }
    expect(RV.tmValintaTila({ id: 'p', jaksofokus: JF() }).tila).toBe('ei');
  });
  it('tmValintaVoimassa on poistettu kaikkialta (RV, jakso_malli, tilakone ei viittaa)', () => {
    expect(RV.tmValintaVoimassa).toBeUndefined(); expect(require('../lib/tm_jakso_malli.js').tmValintaVoimassa).toBeUndefined();
    const { readFileSync } = require('fs'); for (const f of ['lib/tm_aloita_jakso.js', 'lib/tm_reitin_valinta.js', 'lib/tm_jakso_malli.js', 'TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html', 'TalentMaster_Pelaaja_v7.html']) expect(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ''), f).not.toMatch(/tmValintaVoimassa|_valintaVoimassa/);
  });
});
