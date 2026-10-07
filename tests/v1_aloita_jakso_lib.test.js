/**
 * V1 (docs/CODE_BRIEF_V1_JAKSON_ALOITUS.md) — jaettu modaali lib/tm_aloita_jakso.js: osio "Tukitavoite" (D19 portaittain), kotiharjoitteet, oletuspäivät joukkuejaksosta, YKSI kirjoitus.
 * Fixture: KPV U13 Topias (m93GBdOaGCUuenMiCL0I; PHV LAH, heikko 30 m + kiihdytys). Vanha lomake: snapshot (täsmälleen ennallaan ilman lippua).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const AJ = require('../lib/tm_aloita_jakso.js'), TT = require('../lib/tm_tukitavoitteet.js'), JM = require('../lib/tm_jakso_malli.js'), TAKS = require('../lib/tm_arviointi_taksonomia.js'), KOTI = require('../lib/tm_koti_oletus.js');
const SNAP = require('./fixtures/aloita_jakso/vanha_lomake.json');
const TANAAN = '2026-11-10', T = (s) => s;
const OPTS = { t: T, modalId: 'M', tallennaFn: '_tal', suljeFn: '_sulje', overlayAttrs: 'class="o"' };
const ITEMS = [{ avain: 'y_h2', nimi: 'Saattaen vaihtaminen' }, { avain: 'y_h3', nimi: 'Toinen taito' }];
const CTX = (lisa) => Object.assign({ items: ITEMS, ika: 13, nimi: 'Topias', vastuuhenkilot: [{ arvo: 'u1|valmentaja', nimi: 'Ville', rooli: 'valmentaja' }] }, lisa || {});
const PHV = (k) => (k ? { biologinenIka_viimeisin: { phv_tila_koodi: k } } : {});
const TOPIAS = (phv, lisa) => Object.assign({ id: 'm93GBdOaGCUuenMiCL0I', joukkue: 'KPV U13', syntymaVuosi: 2013, ydinvahvuus: { kuvaus: 'Tempokuljetus', havaittu_pvm: '2026-10-01', rooli: 'vp' }, hh_viimeisin: { lin30m: 5.8, lin10m: 1.9 }, hh_pvm: '2026-10-30' }, PHV(phv), lisa || {});
const ADAR = (pvm, pisteet) => ({ tyyppi: 'adar_pikakortti', pvm, pisteet, havaitut: [], nakyvyys: false });
const HAV = [ADAR('2026-10-20', { Act: 1 }), ADAR('2026-11-03', { Act: 1 })];
const JJ = (alku, kesto) => ({ jid: 'kpv_u13', data: { id: 'kpv_u13', jaksofokus: { alku: alku || '2026-11-10', kesto_vk: kesto || 6, osa_alueet: { tekninen_taktinen: { teema_avain: 't', nimi: 'Syöttö', lahde: 'seura' }, fyysinen: { avain: 'fy_ketteryys', nimi: 'Ketteryys ja nopeus', lahde: 'tm' } } } } });
const OHJ = (o) => Object.assign({ id: 'ohj1', nimi: 'Liikehallinnan perusteet', tila: 'hyvaksytty', teema_avain: 'fy_liikehallinta', liikkeet: [{ jarjestys: 1, liike: 'Kontrollipunnerrus', toistot: '3×10', kotiin_sopiva: true }] }, o || {});
const PANKKI = [{ id: 'koti1', nimi: 'Seinäsyöttö kotona', tila: 'hyvaksytty', kaytto: 'koti', kotiin_sopiva: true, kehityskohde: null, ohje: 'Syötä seinään 20 kertaa', kesto_min: 10 }];
const HAETUT = (lisa) => Object.assign({ joukkue: JJ(), havainnot: HAV, kehys: TAKS.tmKehys('palloliitto'), profiili: null, seuranPankki: PANKKI, seuranOhjelmat: [OHJ()] }, lisa || {});
const C = (lisa) => Object.assign({ tanaan: TANAAN, ika: 13, sp: 'P', haetut: HAETUT(), tmPankki: KOTI, seuraNimi: 'KPV' }, lisa || {});
const X = (p, c) => AJ.tmAloitaJaksoTiedot(p, CTX({ tuki: AJ.tmAloitaJaksoTuki(p, c) }));
// arvo-funktio: kentät kartasta ('1' = valintaruutu päällä)
const ARVO = (k) => (id) => (id in k ? k[id] : '');
const PERUS = { _ajTaito: 'y_h2', _ajYv: 'Tempokuljetus', _ajKesto: '6', _ajVh: '', _ajAlku: TANAAN };
const OP = (lisa) => Object.assign({ tanaan: TANAAN, rooli: 'valmentaja', ika: 13, nytISO: TANAAN + 'T10:00:00.000Z' }, lisa || {});

describe('ilman lippua: vanha lomake TÄSMÄLLEEN ennallaan (snapshot)', () => {
  it('Aloita / Muokkaa / Vahvista / ilman vastuuhenkilöitä: HTML identtinen mainin kanssa; ei tukiosiota, ei alkupäivää', () => {
    const p0 = { id: 'PID' };
    expect(AJ.tmAloitaJaksoModalHTML(AJ.tmAloitaJaksoTiedot(p0, CTX()), OPTS)).toBe(SNAP.aloita);
    expect(AJ.tmAloitaJaksoModalHTML(AJ.tmAloitaJaksoTiedot({ id: 'PID', jaksofokus: { konsepti_avain: 'y_h3', kesto_vk: 8, tukiosa: { alue: 'kestävyys', perustelu: 'Jaksaa pelata' } } }, CTX()), OPTS)).toBe(SNAP.muokkaa);
    expect(AJ.tmAloitaJaksoModalHTML(AJ.tmAloitaJaksoTiedot({ id: 'PID', jaksofokus: { konsepti_avain: 'y_h2', tila: 'valittavana' }, ydinvahvuus_valinta: { vaihtoehto: 'Näkee pelin' } }, CTX()), OPTS)).toBe(SNAP.vahvista);
    expect(AJ.tmAloitaJaksoModalHTML(AJ.tmAloitaJaksoTiedot(p0, CTX({ vastuuhenkilot: null, ika: 10 })), OPTS)).toBe(SNAP.ilman_vh);
    const x = AJ.tmAloitaJaksoTiedot(p0, CTX()); expect(x.tuki).toBeUndefined(); expect(SNAP.aloita).not.toContain('data-aj-tuki'); expect(SNAP.aloita).not.toContain('_ajAlku');
  });
  it('vanha polku (tmAloitaJakso ilman ilmanTukiosaa) vaatii yhä tukiosan; liputettu polku ei', () => {
    expect(() => JM.tmAloitaJakso({}, { konsepti_avain: 'y_h2', ydinvahvuus_kuvaus: 'x', kesto_vk: 6 }, { tanaan: TANAAN, rooli: 'vp', ika: 13 })).toThrow(/tukiosa\.alue puuttuu/);
    expect(JM.tmAloitaJakso({}, { konsepti_avain: 'y_h2', ydinvahvuus_kuvaus: 'x', kesto_vk: 6 }, { tanaan: TANAAN, rooli: 'vp', ika: 13, ilmanTukiosaa: true }).jaksofokus.tukiosa).toBeUndefined();
  });
});

describe('tukiosion määrä ikävaiheittain (D18): tmTukitavoiteMaksimi', () => {
  it('Leikkijä 0: osio piilossa (ei tukitavoitekenttiä eikä vanhoja tukiosa-kenttiä), jakso silti aloitettavissa ilman tukitavoitetta', () => {
    const p = TOPIAS('POST'), x = X(p, C({ ika: 10 }));
    expect(x.tuki).toMatchObject({ nayta: false, maksimi: 0, kortit: [] });
    const h = AJ.tmAloitaJaksoModalHTML(x, OPTS); expect(h).not.toContain('data-aj-tuki'); expect(h).not.toContain('_ajAlue'); expect(h).not.toContain('Tukitavoite'); expect(h).toContain('_ajAlku');
    const r = AJ.tmAloitaJaksoV2(p, AJ.tmAloitaJaksoSyoteV2(ARVO(Object.assign({}, PERUS, { _ajKesto: '12' })), x), x, OP({ ika: 10 }));
    expect(r.jaksofokus.tukitavoitteet).toEqual([]); expect(r.jaksofokus.tukiosa).toBeNull();
  });
  it('Rakentaja 1 (U13–15) · Showcase 2 (U16+) · seuran profiili ylikirjoittaa', () => {
    expect(X(TOPIAS('POST'), C({ ika: 13 })).tuki.maksimi).toBe(1); expect(X(TOPIAS('POST'), C({ ika: 15 })).tuki.maksimi).toBe(1); expect(X(TOPIAS('POST'), C({ ika: 16 })).tuki.maksimi).toBe(2);
    expect(X(TOPIAS('POST'), C({ ika: 13, haetut: HAETUT({ profiili: { rakentaja: { tukitavoitteet_max: 2 } } }) })).tuki.maksimi).toBe(2);
  });
});

describe('Topias (PHV LAH): D19 portaittain, ei nopeusehdotusta testistä', () => {
  const p = TOPIAS('LAH'), x = X(p, C());
  it('yksi ehdotus ylimpänä valittuna (hyväksyntä yhdellä napautuksella): kypsyyssuojattu liikehallinta; kortteja 4 (1 + muut ≤ 3); ei speed/acceleration/kiihdytys/nopeus missään kortissa', () => {
    const k = x.tuki.kortit; expect(k.length).toBeGreaterThan(1); expect(k.length).toBeLessThanOrEqual(4);
    expect(k[0]).toMatchObject({ tyyppi: 'ehdotus', alue: 'fyysinen', kuvaus: 'Liikehallinta ja kehonhallinta', valittu: true, kypsyyssuojattu: true }); expect(k.filter((c) => c.valittu)).toHaveLength(1);
    expect(k.some((c) => ['speed', 'acceleration', 'power', 'endurance'].indexOf(c.asia) >= 0)).toBe(false); expect(k.some((c) => /^(nopeus|kiihdytys|voima|kestävyys|räjähtävyys)/i.test(c.kuvaus))).toBe(false);   // (joukkuejakson "Ketteryys ja nopeus" on sallittu oletus, ei testistä johdettu nopeus)
    expect(x.tuki.muitaN).toBe(k.length - 1); expect(k.map((c) => c.lahde.tyyppi)).toContain('havainto');
  });
  it('lomake: ehdotus (alue, nimi, lyhyt lähde), muokattava perustelu, "miksi?" (details, ei oletuksena auki), "Muut vaihtoehdot (n)", "Kirjoita oma"; vanhat tukiosa-kentät pois; ei ketjunimiä, ei hex-värejä', () => {
    const h = AJ.tmAloitaJaksoModalHTML(x, OPTS);
    expect(h).toContain('data-aj-tuki'); expect(h).toContain('Tukitavoite'); expect(h).toContain('Liikehallinta ja kehonhallinta'); expect(h).toContain('testistä, kasvu huomioiden'); expect(h).toMatch(/<textarea id="_ajTtP_0"[^>]*>Tukee ydinvahvuutta \(Tempokuljetus\)/);
    expect(h).toMatch(/<details[^>]*><summary[^>]*>miksi\?<\/summary>/); expect(h).not.toMatch(/<details[^>]* open/); expect(h).toContain('Muut vaihtoehdot (' + x.tuki.muitaN + ')'); expect(h).toContain('Kirjoita oma');
    expect(h).toContain('Valitse enintään 1'); expect(h).toContain('Aloita jakso -napilla'); expect(h).not.toContain('id="_ajAlue"'); expect(h).not.toContain('id="_ajPer"'); expect(h).toContain('id="_ajAlku"');
    expect(h).not.toMatch(/\b(SBL|SFL|LL|DIAG|DFL)\b/); expect(h).not.toMatch(/#[0-9a-f]{3,6}\b/i); expect(h).toContain('width:100%'); expect(h).toContain('box-sizing');
  });
  it('perustelu kulkee KIELLETYT-vartijan läpi (aina myönteinen, D20): muokattu perustelu jossa kielletty sana hylätään; tyhjä hylätään', () => {
    const yrita = (per) => AJ.tmAloitaJaksoV2(p, Object.assign({}, AJ.tmAloitaJaksoSyoteV2(ARVO(Object.assign({}, PERUS, { _ajTtV_0: '1', _ajTtP_0: per })), x), { konsepti_nimi: 'X' }), x, OP());
    expect(() => yrita('Tämä on heikkous')).toThrow(/kielletyn sanan/); expect(() => yrita('')).toThrow(/perustelu puuttuu/); expect(() => yrita('a'.repeat(401))).toThrow(/liian pitkä/);
  });
});

describe('hyväksyntä, muokkaus, kirjoitus (YKSI update)', () => {
  const p = TOPIAS('LAH'), x = X(p, C());
  it('ehdotuksen hyväksyntä: tukitavoitteet[0] (lähde säilyy, perustelu muokattu) + YHTEENSOPIVA tukiosa (alue ← kuvaus) + joukkuejakso_viite; sama lähde kulkee tmAloitaJaksoKirjoitus-polulla', () => {
    const syote = AJ.tmAloitaJaksoSyoteV2(ARVO(Object.assign({}, PERUS, { _ajTtV_0: '1', _ajTtP_0: 'Jotta kuljetuksesi vie maalille asti, kehosi pysyy hallinnassa' })), x);
    const r = AJ.tmAloitaJaksoV2(p, Object.assign({}, syote, { konsepti_nimi: 'Saattaen vaihtaminen' }), x, OP()), jf = r.jaksofokus;
    expect(jf.tukitavoitteet).toHaveLength(1); expect(jf.tukitavoitteet[0]).toMatchObject({ alue: 'fyysinen', kuvaus: 'Liikehallinta ja kehonhallinta', perustelu: 'Jotta kuljetuksesi vie maalille asti, kehosi pysyy hallinnassa', lahde: { tyyppi: 'testi' } });
    expect(jf.tukiosa).toMatchObject({ alue: 'Liikehallinta ja kehonhallinta', perustelu: 'Jotta kuljetuksesi vie maalille asti, kehosi pysyy hallinnassa' }); expect(JM.tmTukiosa(jf.tukiosa)).toEqual(jf.tukiosa);
    expect(jf.joukkuejakso_viite).toMatchObject({ jid: 'kpv_u13', alku: '2026-11-10', nimi: expect.any(String), kesto_vk: expect.any(Number) }); expect(JM.tmTarkistaJaksoData(jf)).toEqual([]); expect(jf.asetti).toMatchObject({ rooli: 'valmentaja', pvm: TANAAN });
    const upd = AJ.tmAloitaJaksoKirjoitus({ jaksofokus: jf, historiaLisays: [] }, r, null, { arrayUnion: () => null }); expect(Object.keys(upd)).toEqual(['jaksofokus', 'ydinvahvuus']); expect(upd.jaksofokus.tukitavoitteet).toHaveLength(1);   // ei toista kirjoitusta
  });
  it('kotiharjoitteet valitun tukitavoitteen alta: snapshot (#823) → tukitavoitteet[0].harjoitteet JA tukiosa.harjoitteet; kenttä lahde seura|tm; valitsematon ei mukaan', () => {
    const kh = x.tuki.kortit[0].harjoitteet; expect(kh.length).toBeGreaterThan(0); expect(kh.every((o) => o.valittu === false)).toBe(true);
    const syote = AJ.tmAloitaJaksoSyoteV2(ARVO(Object.assign({}, PERUS, { _ajTtV_0: '1', _ajTtP_0: 'Kehonhallinta pitää liikkeen sujuvana', _ajTtH_0_0: '1' })), x);
    const jf = AJ.tmAloitaJaksoV2(p, Object.assign({}, syote, { konsepti_nimi: 'X' }), x, OP()).jaksofokus;
    expect(jf.tukitavoitteet[0].harjoitteet).toHaveLength(kh[0].harjoitteet.length); expect(['seura', 'tm']).toContain(jf.tukitavoitteet[0].harjoitteet[0].lahde); expect(jf.tukiosa.harjoitteet).toEqual(jf.tukitavoitteet[0].harjoitteet);
    const ilman = AJ.tmAloitaJaksoV2(p, Object.assign({}, AJ.tmAloitaJaksoSyoteV2(ARVO(Object.assign({}, PERUS, { _ajTtV_0: '1', _ajTtP_0: 'Kehonhallinta pitää liikkeen sujuvana' })), x), { konsepti_nimi: 'X' }), x, OP()).jaksofokus; expect(ilman.tukitavoitteet[0].harjoitteet).toEqual([]);
  });
  it('seuran hyväksytty liikehallinta-ohjelma tarjotaan ensin (lahde seura, snapshot liikkeet); TM-oletus vain kun seuran sisältöä ei ole', () => {
    expect(x.tuki.kortit[0].harjoitteet[0]).toMatchObject({ id: 'ohj:ohj1', lahde: 'seura', tyyppi: 'ohjelma' });
    const ilmanSeuraa = X(TOPIAS('POST', { hh_viimeisin: {}, arviointi_havaittu: { ball_control: 1 }, arviointi_pvm: '2026-10-25' }), C({ haetut: HAETUT({ seuranPankki: [], seuranOhjelmat: [], havainnot: [], joukkue: null }) }));
    const havainto = ilmanSeuraa.tuki.kortit.find((c) => c.lahde.tyyppi === 'arviointi'); expect(havainto).toBeTruthy(); expect(havainto.harjoitteet.length).toBeGreaterThan(0); expect(havainto.harjoitteet.every((o) => o.lahde === 'tm')).toBe(true);
  });
  it('"Kirjoita oma": alue valitaan 4:stä, kuvaus ≤ 80, perustelu pakollinen + KIELLETYT; lähde suunnitelma (viite null, pvm tänään)', () => {
    const oma = (lisa) => AJ.tmAloitaJaksoV2(p, Object.assign({}, AJ.tmAloitaJaksoSyoteV2(ARVO(Object.assign({}, PERUS, { _ajTtV_oma: '1', _ajTtOA: 'henkinen', _ajTtOK: 'Seuraava suoritus virheen jälkeen', _ajTtP_oma: 'Jotta pysyt mukana pelissä myös virheen jälkeen' }, lisa)), x), { konsepti_nimi: 'X' }), x, OP()).jaksofokus;
    const jf = oma(); expect(jf.tukitavoitteet).toHaveLength(1); expect(jf.tukitavoitteet[0]).toMatchObject({ alue: 'henkinen', kuvaus: 'Seuraava suoritus virheen jälkeen', lahde: { tyyppi: 'suunnitelma', viite: null, pvm: TANAAN } });
    expect(() => oma({ _ajTtP_oma: 'Hänellä on heikkous' })).toThrow(/kielletyn sanan/); expect(() => oma({ _ajTtP_oma: '' })).toThrow(/perustelu puuttuu/); expect(() => oma({ _ajTtOK: 'a'.repeat(81) })).toThrow(/liian pitkä/); expect(() => oma({ _ajTtOK: '' })).toThrow(/kuvaus puuttuu/);
    expect(() => oma({ _ajTtOA: 'muu' })).toThrow(/alue pitää olla/);
  });
  it('määräkatto: Rakentaja ei saa 2 tukitavoitetta; Showcase saa 2 mutta ei 3; nolla sallittu (valinta pois)', () => {
    const kaksi = (xx, pp) => AJ.tmAloitaJaksoV2(pp, Object.assign({}, AJ.tmAloitaJaksoSyoteV2(ARVO(Object.assign({}, PERUS, { _ajTtV_0: '1', _ajTtP_0: 'Perustelu yksi myönteisesti', _ajTtV_oma: '1', _ajTtOA: 'henkinen', _ajTtOK: 'Oma', _ajTtP_oma: 'Perustelu kaksi myönteisesti' })), xx), { konsepti_nimi: 'X' }), xx, OP({ ika: 16 }));
    expect(() => kaksi(x, p)).toThrow(/enintään 1/);
    const x2 = X(TOPIAS('POST'), C({ ika: 16 })); expect(kaksi(x2, TOPIAS('POST')).jaksofokus.tukitavoitteet).toHaveLength(2);
    expect(AJ.tmAloitaJaksoV2(p, Object.assign({}, AJ.tmAloitaJaksoSyoteV2(ARVO(PERUS), x), { konsepti_nimi: 'X' }), x, OP()).jaksofokus.tukitavoitteet).toEqual([]);
  });
  it('DOM-apuri tmAjTukiValitse: max 1 → uusi valinta poistaa muut; max 2 → kolmas hylätään; kotiharjoitepaneeli näkyy vain valitun alla', () => {
    const mk = (n) => { const bs = []; for (let i = 0; i < n; i++) bs.push({ checked: false, attr: String(i), getAttribute() { return this.attr; } }); const pan = bs.map((b) => ({ attr: b.attr, style: {}, getAttribute() { return this.attr; } }));
      const root = { querySelectorAll: (q) => (q.indexOf('data-aj-tv') >= 0 ? bs : (q === '[data-aj-koti]' ? pan : [])), querySelector: (q) => { const m = /data-aj-tv="([^"]+)"/.exec(q); return m ? (bs.find((b) => b.attr === m[1]) || null) : null; } };
      bs.forEach((b) => { b.closest = () => root; }); return { bs, pan }; };
    const a = mk(3); a.bs[0].checked = true; a.bs[1].checked = true; AJ.tmAjTukiValitse(a.bs[1], 1); expect(a.bs.map((b) => b.checked)).toEqual([false, true, false]); expect(a.pan.map((p) => p.style.display)).toEqual(['none', 'block', 'none']);
    const b = mk(3); b.bs.forEach((x2) => { x2.checked = true; }); AJ.tmAjTukiValitse(b.bs[2], 2); expect(b.bs.map((x2) => x2.checked)).toEqual([true, true, false]);
    expect(() => AJ.tmAjTukiValitse(null, 1)).not.toThrow(); expect(() => AJ.tmAjTukiValitse({}, 1)).not.toThrow();
  });
});

describe('oletuspäivät joukkuejaksosta (D21) ja kesto', () => {
  const p = TOPIAS('POST');
  it('aktiivinen joukkuejakso: alku = joukkuejakson alku, kesto sen mukaan (jos sallittu), viite {jid, alku}; valmentaja voi poiketa; kirjoitus: alkoi paikallinen keskiyö', () => {
    const x = X(p, C({ haetut: HAETUT({ joukkue: JJ('2026-11-17', 7) }) })); expect(x.tuki).toMatchObject({ alku: '2026-11-17', alkuLahde: 'joukkuejakso', kesto: 7, viite: { jid: 'kpv_u13', alku: '2026-11-17' } }); expect(x.alku).toBe('2026-11-17'); expect(x.kesto.valittu).toBe(7);
    const h = AJ.tmAloitaJaksoModalHTML(x, OPTS); expect(h).toContain('value="2026-11-17"'); expect(h).toContain('Joukkuejakson päivät — voit poiketa.');
    const jf = (alku) => AJ.tmAloitaJaksoV2(p, AJ.tmAloitaJaksoSyoteV2(ARVO(Object.assign({}, PERUS, { _ajAlku: alku, _ajKesto: '7' })), x), x, OP()).jaksofokus;
    expect(new Date(jf('2026-11-17').alkoi).getDate()).toBe(17); expect(new Date(jf('2026-11-24').alkoi).getDate()).toBe(24); expect(jf('2026-11-24').joukkuejakso_viite.alku).toBe('2026-11-17');   // poikkeus ei katkaise linkkiä jaksoon
    expect(jf(TANAAN).alkoi).toBe(TANAAN + 'T10:00:00.000Z');   // tänään = nytISO kuten ennen
    expect(() => jf('17.11.2026')).toThrow(/alkamispäivä/);
  });
  it('raja: joukkuejakso joka päättyy TÄNÄÄN ei ole enää aktiivinen; huomenna päättyvä on', () => {
    expect(X(p, C({ haetut: HAETUT({ joukkue: JJ('2026-09-29', 6) }) })).tuki.alkuLahde).toBe('tanaan');   // 29.9. + 42 pv = 10.11. = tänään
    expect(X(p, C({ haetut: HAETUT({ joukkue: JJ('2026-09-30', 6) }) })).tuki).toMatchObject({ alkuLahde: 'joukkuejakso', alku: '2026-09-30' });   // päättyy 11.11.
  });
  it('päättynyt joukkuejakso tai ei joukkuejaksoa: alku = tänään, ei viitettä; joukkuejakson kesto ei-sallittu (4 vk) → ikävaiheen oletus', () => {
    const vanha = X(p, C({ haetut: HAETUT({ joukkue: JJ('2026-09-01', 6) }) })); expect(vanha.tuki).toMatchObject({ alku: TANAAN, alkuLahde: 'tanaan', viite: null, kesto: null });
    expect(X(p, C({ haetut: HAETUT({ joukkue: null }) })).tuki).toMatchObject({ alku: TANAAN, viite: null });
    expect(X(p, C({ haetut: HAETUT({ joukkue: JJ('2026-11-17', 4) }) })).kesto.valittu).toBe(6);
  });
});

describe('nykyisen ja ehdotetun päällekkäisyys', () => {
  it('ehdotus jolla on sama alue + kuvaus kuin jo olemassa olevalla tukitavoitteella jätetään pois (ei kaksoiskappaletta)', () => {
    const p0 = TOPIAS('LAH'), eka = TT.tmTukitavoiteEhdotukset(p0, { tanaan: TANAAN, ika: 13, sp: 'P', havainnot: HAV })[0];
    const nyk = Object.assign({}, p0, { jaksofokus: { konsepti_avain: 'y_h2', konsepti_nimi: 'X', alkoi: '2026-10-01T10:00:00.000Z', kesto_vk: 6, tukitavoitteet: [{ alue: eka.alue, kuvaus: eka.kuvaus, perustelu: 'Jotta pallo pysyy sinulla', lahde: { tyyppi: 'testi', viite: 'x', pvm: '2026-10-30' }, harjoitteet: [] }] } });
    const kortit = X(nyk, C()).tuki.kortit; expect(kortit[0].tyyppi).toBe('nykyinen'); expect(kortit.filter((k) => k.alue === eka.alue && k.kuvaus.toLowerCase() === eka.kuvaus.toLowerCase())).toHaveLength(1);
  });
});

describe('konteksti ja virheensieto: yhden lähteen virhe ei kaada modaalia', () => {
  const p = TOPIAS('LAH');
  it('kaikki lähteet null → osio avautuu ilman ehdotuksia ("Kirjoita oma" toimii); osittaiset lähteet toimivat', () => {
    const tyhja = X(p, C({ haetut: { joukkue: null, havainnot: null, kehys: null, profiili: null, seuranPankki: null, seuranOhjelmat: null } }));
    expect(tyhja.tuki.nayta).toBe(true); expect(tyhja.tuki.kortit.length).toBeLessThanOrEqual(1); expect(() => AJ.tmAloitaJaksoModalHTML(tyhja, OPTS)).not.toThrow(); expect(AJ.tmAloitaJaksoModalHTML(tyhja, OPTS)).toContain('Kirjoita oma');
    expect(X(p, C({ haetut: {} })).tuki.nayta).toBe(true); expect(() => AJ.tmAloitaJaksoTuki(p, { tanaan: TANAAN, ika: 13 })).not.toThrow();
    expect(X(p, C({ haetut: HAETUT({ havainnot: null }) })).tuki.kortit.some((c) => c.lahde.tyyppi === 'havainto')).toBe(false); expect(X(p, C({ haetut: HAETUT({ kehys: null }) })).tuki.nayta).toBe(true);
  });
  it('ehdotusmoottorin tai harjoitehaun poikkeus → osio silti (tyhjänä); ei heitä', () => {
    const rikki = { tmTukitavoiteMaksimi: () => 1, tmTukitavoiteEhdotukset: () => { throw new Error('boom'); }, tmTukitavoiteHarjoitteet: () => { throw new Error('boom'); }, tmTukitavoitteet: () => [] };
    const t = AJ.tmAloitaJaksoTuki(p, { tt: rikki, tanaan: TANAAN, ika: 13, haetut: HAETUT() }); expect(t.nayta).toBe(true); expect(t.kortit).toEqual([]);
  });
  it('arviointikehys = tmKehys(oletus palloliitto) → EI "seuran kehys" -selitettä; seuran oma kehys (avain ≠ palloliitto) kumoaa (D16); sp P/T → Eerikkilän M/N (poika ≠ tyttö)', () => {
    const arv = { arviointi_havaittu: { ball_protection: 1 }, arviointi_pvm: '2026-10-25' };
    const pa = TOPIAS('POST', Object.assign({ hh_viimeisin: {} }, arv)), sel = (c) => X(pa, c).tuki.kortit.find((k) => k.lahde.tyyppi === 'arviointi');
    expect(sel(C({ haetut: HAETUT({ havainnot: [] }) })).miksi).not.toMatch(/seuran arviointikehys/);
    const oma = { avain: 'seura_x', nimi: 'X', taksonomia: [{ avain: 'ball_protection', nimi_fi: 'Oma suojaus', dim: 'D2' }] }; expect(sel(C({ haetut: HAETUT({ havainnot: [], kehys: oma }) })).miksi).toMatch(/seuran arviointikehys/);
    const taso = (sp) => TT.tmTukitavoiteEhdotukset(TOPIAS('POST', { hh_viimeisin: { lin10m: 1.9 } }), { tanaan: TANAAN, ika: 13, sp: sp }).filter((e) => e.lahde.tyyppi === 'testi').length;
    expect(taso('P')).toBe(1); expect(taso('M')).toBe(1); expect(taso('T')).toBe(0); expect(taso('N')).toBe(0);   // 1.9 s on pojan taso 2 (heikko), tytön taso 3 → vain pojalla ehdotus (P/T → M/N)
  });
});

describe('muokkaus: nykyiset tukitavoitteet (myös vanha tukiosa) säilyvät', () => {
  it('olemassa oleva tukitavoite = valittu "Nykyinen" kortti, harjoitteet säilyvät; vanha tukiosa (alue null) vaatii alueen valinnan; tallennus kirjoittaa molemmat', () => {
    const h = [{ id: 'koti1', nimi: 'Seinäsyöttö kotona', lahde: 'seura', liike: 'Seinäsyöttö kotona' }];
    const uusi = TOPIAS('POST', { jaksofokus: { konsepti_avain: 'y_h2', konsepti_nimi: 'X', alkoi: '2026-10-01T10:00:00.000Z', kesto_vk: 6, tukitavoitteet: [{ alue: 'tekninen_taktinen', kuvaus: 'Pallon suojaaminen', perustelu: 'Jotta pallo pysyy sinulla', lahde: { tyyppi: 'havainto', viite: 'x', pvm: '2026-10-20' }, harjoitteet: h }] } });
    const x = X(uusi, C()); expect(x.tila).toBe('muokkaa'); expect(x.tuki.kortit[0]).toMatchObject({ tyyppi: 'nykyinen', alue: 'tekninen_taktinen', kuvaus: 'Pallon suojaaminen', valittu: true });
    expect(x.tuki.kortit[0].harjoitteet.find((o) => o.id === 'koti1').valittu).toBe(true);
    const r = AJ.tmAloitaJaksoV2(uusi, Object.assign({}, AJ.tmAloitaJaksoSyoteV2(ARVO(Object.assign({}, PERUS, { _ajTtV_0: '1', _ajTtP_0: 'Jotta pallo pysyy sinulla', _ajTtH_0_0: '' })), x), { konsepti_nimi: 'X' }), x, OP());
    expect(r.jaksofokus.tukitavoitteet[0].harjoitteet.map((e) => e.id)).not.toContain('koti1');   // poistettu valinta poistuu
    const vanha = TOPIAS('POST', { jaksofokus: { konsepti_avain: 'y_h2', konsepti_nimi: 'X', alkoi: '2026-10-01T10:00:00.000Z', kesto_vk: 6, tukiosa: { alue: 'kestävyys', perustelu: 'Jaksaa pelata', harjoitteet: [] } } });
    const xv = X(vanha, C()); expect(xv.tuki.kortit[0]).toMatchObject({ tyyppi: 'nykyinen', alue: null, kuvaus: 'kestävyys' }); expect(AJ.tmAloitaJaksoModalHTML(xv, OPTS)).toContain('id="_ajTtNA_0"');
    expect(() => AJ.tmAloitaJaksoV2(vanha, Object.assign({}, AJ.tmAloitaJaksoSyoteV2(ARVO(Object.assign({}, PERUS, { _ajTtV_0: '1', _ajTtP_0: 'Jaksaa pelata' })), xv), { konsepti_nimi: 'X' }), xv, OP())).toThrow(/alue puuttuu/);
    const ok = AJ.tmAloitaJaksoV2(vanha, Object.assign({}, AJ.tmAloitaJaksoSyoteV2(ARVO(Object.assign({}, PERUS, { _ajTtV_0: '1', _ajTtP_0: 'Jaksaa pelata', _ajTtNA_0: 'fyysinen' })), xv), { konsepti_nimi: 'X' }), xv, OP()).jaksofokus;
    expect(ok.tukitavoitteet[0]).toMatchObject({ alue: 'fyysinen', kuvaus: 'kestävyys' }); expect(ok.tukiosa.alue).toBe('kestävyys');
  });
});
