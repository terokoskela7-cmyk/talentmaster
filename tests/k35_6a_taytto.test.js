/* K35-6a · lib/tm_kalenteri_taytto.js (Täytä viikko -ohjain, mock-Firestore) + tm_viikkopohja.js: tmMonistaViikko, tmEhdotusDoc. Fixture: FC Demon kaltainen (keksityt nimet). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const V = require('../lib/tm_viikkopohja.js'), TT = require('../lib/tm_kalenteri_taytto.js');
const JSONI = JSON.parse(readFileSync(new URL('../docs/data/spl_viikkopohjat_2023.json', import.meta.url), 'utf8')), POHJAT = V.tmPalloliitonPohjat(JSONI);
const MA = '2026-10-19', ms = (pvm, hhmm) => Date.parse(pvm + 'T' + hhmm + ':00+03:00');
const tap = (id, tyyppi, pvm, a, p, o) => Object.assign({ id, tyyppi, nimi: '', pvm, alkaa: a, paattyy: p, _alkaaMs: ms(pvm, a), _paattyyMs: ms(pvm, p), joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', paikka: '', tila: 'suunniteltu', poistettu: false }, o || {});
const OTTELU = tap('o1', 'ottelu', '2026-10-24', '12:00', '13:30', { vastustaja: 'Demo Juniorit' });
const HIST = [tap('h1', 'harjoitus', '2026-10-13', '17:30', '19:00', { paikka: 'Kenttä 2' }), tap('h2', 'harjoitus', '2026-10-15', '17:30', '19:00', { paikka: 'Halli' })];

function mock({ viikkopohjat, joukkueDocit, tapahtumat, johto = true, demo = false, paivitysVirhe = false, kirjoitus = true, commitVirhe = 0 }) {
  const kirj = [], paiv = [], haut = [], DOCS = { 'seurat/demo/valmennuslinja/viikkopohjat': viikkopohjat };
  const mkDoc = (p) => ({ get: async () => { haut.push(p); return DOCS[p] ? { exists: true, data: () => DOCS[p] } : { exists: false }; }, update: async (d) => { if (paivitysVirhe) throw new Error('permission-denied'); paiv.push([p, d]); }, collection: (c) => mkCol(p + '/' + c) });
  let n = 0; const mkCol = (p) => ({ doc: (id) => mkDoc(p + '/' + (id || 'auto' + (++n))) });
  const db = { collection: (c) => mkCol(c), batch: () => { const ops = []; return { set: (r, d) => ops.push({ r, d }), commit: async () => { if (commitVirhe > 0) { commitVirhe--; throw new Error('commit epäonnistui'); } await Promise.resolve(); ops.forEach((o) => kirj.push(o)); } }; } };
  const viestit = [], tilaRef = { tap: tapahtumat, docit: joukkueDocit, renders: 0, ladattu: 0 };
  const env = { db, seuraId: () => 'demo', uid: () => 'u1', demo: () => demo, joukkue: () => 'Demo U13', joukkueDocit: () => tilaRef.docit, lataaJoukkueDocit: async () => tilaRef.docit, tapahtumat: () => tilaRef.tap, pelaajat: () => ['p1', 'p2', 'p3', 'p4'],
    johto: () => johto, saaKirjoittaa: () => kirjoitus, ts: (pvm, hhmm) => ({ ms: ms(pvm, hhmm) }), palvelinAika: () => 'TS', toast: (m, t) => viestit.push([m, t]), t: (x) => x, rerender: () => { tilaRef.renders++; }, lataaTapahtumat: async () => { tilaRef.ladattu++; }, maanantai: () => MA, avaaUusi: (p) => viestit.push(['uusi', p]) };
  return { ctrl: TT.tmKalTayttoLuo(env), kirj, paiv, haut, viestit, tilaRef };
}
const POHJA_DOC = { pohjat: POHJAT };
const DOCIT = [{ id: 'demo_u13', nimi: 'Demo U13', ika: 'U13', pelimuoto: '8v8' }];

describe('tmMonistaViikko / tmEhdotusDoc', () => {
  it('Monista: edellisen viikon harjoitukset +7 pv samalla ajalla ja paikalla; tauko ja olemassa ohitetaan; ei muiden joukkueiden harjoituksia', () => {
    const edell = [tap('a', 'harjoitus', '2026-10-13', '17:30', '19:00', { paikka: 'Kenttä 2' }), tap('b', 'harjoitus', '2026-10-15', '18:00', '19:15', { paikka: 'Halli' }), tap('c', 'harjoitus', '2026-10-14', '17:30', '19:00', { joukkue: 'Demo U15', joukkue_nimi: 'Demo U15' }), tap('d', 'ottelu', '2026-10-17', '12:00', '13:00')];
    const r = V.tmMonistaViikko({ tapahtumat: edell, maanantai: MA, joukkue: 'Demo U13' }); expect(r.ehdotukset).toEqual([{ pvm: '2026-10-20', alkaa: '17:30', paattyy: '19:00', paikka: 'Kenttä 2', tyyppi: 'harjoitus', md: null, painotus: null, nimi: undefined }, { pvm: '2026-10-22', alkaa: '18:00', paattyy: '19:15', paikka: 'Halli', tyyppi: 'harjoitus', md: null, painotus: null, nimi: undefined }]);
    const tauko = { id: 't', tyyppi: 'seuran_tauko', koko_paiva: true, pvm: '2026-10-22', alkaa: '00:00', paattyy: '23:59', _alkaaMs: ms('2026-10-22', '00:00'), _paattyyMs: ms('2026-10-22', '23:59') }; expect(V.tmMonistaViikko({ tapahtumat: edell.concat([tauko]), maanantai: MA, joukkue: 'Demo U13' }).ohitetut).toEqual([{ pvm: '2026-10-22', syy: 'tauko' }]);
    expect(V.tmMonistaViikko({ tapahtumat: edell.concat([tap('n', 'harjoitus', '2026-10-20', '17:00', '18:00')]), maanantai: MA, joukkue: 'Demo U13' }).ohitetut).toEqual([{ pvm: '2026-10-20', syy: 'olemassa' }]); expect(V.tmMonistaViikko({ tapahtumat: [], maanantai: MA, joukkue: 'Demo U13' }).ehdotukset).toEqual([]);
  });
  it('tmEhdotusDoc: kentät kuten nykyinen luonti (luoja_uid, lahde manuaalinen, kohde joukkue, pohja_avain, md, painotus), toistuvuus ei, ei muistiinpanot-kenttää', () => {
    const x = V.tmEhdotusDoc({ pvm: '2026-10-20', alkaa: '17:30', paattyy: '18:45', paikka: ' Kenttä 2 ', tyyppi: 'harjoitus', md: -4, painotus: 'toistoja', teema: 'Syöttö' }, { joukkue: 'Demo U13', uid: 'u1', pohjaAvain: 'spl_8v8_lapsuus', pelaajat: ['p1', 'p2'] }), d = x.doc;
    expect(x).toMatchObject({ pvm: '2026-10-20', alkaa: '17:30', paattyy: '18:45' }); expect(d).toMatchObject({ tyyppi: 'harjoitus', nimi: 'Harjoitus', luoja_uid: 'u1', lahde: 'manuaalinen', joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', joukkueet: ['Demo U13'], pelaajat_id: ['p1', 'p2'], kohde: { tyyppi: 'joukkue' }, pohja_avain: 'spl_8v8_lapsuus', md: -4, painotus: 'toistoja', teema: 'Syöttö', paikka: 'Kenttä 2', toistuvuus: null, toistuvuus_sarja_id: null, poistettu: false, tila: 'suunniteltu', koko_paiva: false });
    expect('muistiinpanot' in d).toBe(false);
  });
});

describe('ohjain: tila (D184)', () => {
  it('tyhjä viikko + pohja → "tayta" (vasta kun data ladattu); viikolla harjoitus → ei korttia; ei pelimuotoa → pelimuoto (johto saa asettaa / muu pyytää)', async () => {
    const a = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: DOCIT, tapahtumat: [OTTELU] }); expect(a.ctrl.tila(MA)).toBeNull(); await a.ctrl.lataa(); expect(a.ctrl.tila(MA)).toMatchObject({ tyyppi: 'tayta' }); expect(a.ctrl.tila(MA).pohjaNimi).toMatch(/8v8.*nuoruus/);   // U13 → nuoruusvaiheen pohja (ikä ohjeen [12,13] sisällä) expect(a.tilaRef.renders).toBeGreaterThan(0);
    const b = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: DOCIT, tapahtumat: [OTTELU, tap('x', 'harjoitus', '2026-10-21', '17:30', '19:00')] }); await b.ctrl.lataa(); expect(b.ctrl.tila(MA)).toBeNull();
    const c = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: [{ id: 'demo_u13', nimi: 'Demo U13' }], tapahtumat: [] }); await c.ctrl.lataa(); expect(c.ctrl.tila(MA)).toEqual({ tyyppi: 'pelimuoto', saaAsettaa: true });
    const d = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: [{ id: 'demo_u13', nimi: 'Demo U13' }], tapahtumat: [], johto: false }); await d.ctrl.lataa(); expect(d.ctrl.tila(MA)).toEqual({ tyyppi: 'pelimuoto', saaAsettaa: false });
    const e = mock({ viikkopohjat: null, joukkueDocit: DOCIT, tapahtumat: [] }); await e.ctrl.lataa(); expect(e.ctrl.tila(MA)).toEqual({ tyyppi: 'ei_pohjaa' });
  });
  it('demo-tila: ei korttia eikä latausta', async () => { const a = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: DOCIT, tapahtumat: [], demo: true }); await a.ctrl.lataa(); expect(a.ctrl.tila(MA)).toBeNull(); expect(a.haut).toEqual([]); });
  it('lataus lukee vain valmennuslinja/viikkopohjat (+ kausisuunnitelma) omasta seurasta', async () => { const a = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: DOCIT, tapahtumat: [] }); await a.ctrl.lataa(); expect(a.haut.every((p) => p.startsWith('seurat/demo/valmennuslinja/'))).toBe(true); expect(a.haut).toContain('seurat/demo/valmennuslinja/viikkopohjat'); });
});

describe('ohjain: Täytä viikko → esikatselu → Vahvista', () => {
  it('8v8, ottelu la: 4 ehdotusta (ma, ti, to, pe) historian ajoilla ja paikoilla; ei kirjoituksia ennen vahvistusta', async () => {
    const a = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: DOCIT, tapahtumat: HIST.concat([OTTELU]) }); await a.ctrl.lataa(); a.ctrl.tayta();
    const t = a.ctrl.esikatselu(MA); expect(t.ehdotukset.map((e) => e.pvm)).toEqual(['2026-10-19', '2026-10-20', '2026-10-22', '2026-10-23']); expect(t.ehdotukset.map((e) => e.md)).toEqual([-5, -4, -2, -1]); expect(t.ehdotukset[1]).toMatchObject({ alkaa: '17:30', paikka: 'Kenttä 2' }); expect(t.ehdotukset[2]).toMatchObject({ paikka: 'Halli' });
    expect(a.ctrl.tila(MA)).toEqual({ tyyppi: 'vahvista', n: 4, lahde: 'pohja', kesken: false }); expect(a.kirj).toEqual([]);
  });
  it('Vahvista: yksi batch, 4 dokumenttia seurat/demo/kalenteri; luoja_uid, pohja_avain, md, kohde joukkue, aikaleimat; ei notifikaatio- tai viestikirjoituksia (D192)', async () => {
    const a = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: DOCIT, tapahtumat: HIST.concat([OTTELU]) }); await a.ctrl.lataa(); a.ctrl.tayta(); await a.ctrl.vahvista();
    expect(a.kirj.length).toBe(4); a.kirj.forEach((o) => { expect(o.r).toBeTruthy(); expect(o.d).toMatchObject({ tyyppi: 'harjoitus', luoja_uid: 'u1', lahde: 'manuaalinen', joukkue: 'Demo U13', kohde: { tyyppi: 'joukkue' }, pohja_avain: 'spl_8v8_nuoruus', toistuvuus: null, luotu: 'TS', paivitetty: 'TS' }); expect(typeof o.d.alkaa.ms).toBe('number'); expect(o.d.paattyy.ms).toBeGreaterThan(o.d.alkaa.ms); });
    expect(a.kirj.map((o) => o.d.md)).toEqual([-5, -4, -2, -1]); expect(a.kirj[1].d.alkaa.ms).toBe(ms('2026-10-20', '17:30')); expect(a.kirj[1].d.paattyy.ms).toBe(ms('2026-10-20', '19:30'));   // 8v8 nuoruus: 120 min
    expect(String(JSON.stringify(a.kirj.map((o) => o.d)))).not.toMatch(/notifikaatio|viestit/); expect(a.tilaRef.ladattu).toBe(1); expect(a.ctrl.esikatselu(MA)).toBeNull();   // vahvistuksen jälkeen esikatselu on poissa; viikon tilan päivittää lataaTapahtumat (kutsutaan, mock ei muuta dataa)
  });
  it('Peru poistaa esikatselun; esikatselun muokkaus (aika, paikka, poista) vain muistissa ennen vahvistusta', async () => {
    const a = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: DOCIT, tapahtumat: HIST.concat([OTTELU]) }); await a.ctrl.lataa(); a.ctrl.tayta(); a.ctrl.paivita(0, { alkaa: '18:00', paattyy: '19:15', paikka: 'Demohalli' }); a.ctrl.poista(3);
    expect(a.ctrl.esikatselu(MA).ehdotukset.length).toBe(3); expect(a.ctrl.esikatselu(MA).ehdotukset[0]).toMatchObject({ alkaa: '18:00', paattyy: '19:15', paikka: 'Demohalli' }); await a.ctrl.vahvista(); expect(a.kirj.length).toBe(3); expect(a.kirj[0].d.paikka).toBe('Demohalli');
    const b = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: DOCIT, tapahtumat: HIST.concat([OTTELU]) }); await b.ctrl.lataa(); b.ctrl.tayta(); b.ctrl.peru(); expect(b.ctrl.esikatselu(MA)).toBeNull(); expect(b.kirj).toEqual([]);
  });
  it('Monista edellinen viikko: sama esikatselu → vahvistus (lähde monista, pohja_avain null)', async () => {
    const a = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: DOCIT, tapahtumat: HIST }); await a.ctrl.lataa(); a.ctrl.monista(); expect(a.ctrl.tila(MA)).toEqual({ tyyppi: 'vahvista', n: 2, lahde: 'monista', kesken: false }); await a.ctrl.vahvista(); expect(a.kirj.map((o) => [o.d.pohja_avain, o.d.paikka])).toEqual([[null, 'Kenttä 2'], [null, 'Halli']]);
  });
  it('kaikki päivät ohitettu (syysloma) → ei esikatselua, toast ei-ehdotuksia; ei kirjoituksia', async () => {
    const tauko = { id: 't', tyyppi: 'seuran_tauko', nimi: 'Syysloma', koko_paiva: true, pvm: '2026-10-19', alkaa: '00:00', paattyy: '23:59', _alkaaMs: ms('2026-10-19', '00:00'), _paattyyMs: ms('2026-10-25', '23:59') };
    const a = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: DOCIT, tapahtumat: HIST.concat([tauko]) }); await a.ctrl.lataa(); a.ctrl.tayta(); expect(a.ctrl.esikatselu(MA)).toBeNull(); expect(a.viestit[0][0]).toMatch(/^Ei uusia ehdotuksia/); expect(a.viestit[0][1]).toBe('err'); expect(a.kirj).toEqual([]);
  });
  it('ei kirjoitusoikeutta (esim. katselija/demo): Vahvista ei kirjoita eikä kortti näy', async () => { const a = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: DOCIT, tapahtumat: HIST.concat([OTTELU]), kirjoitus: false }); await a.ctrl.lataa(); expect(a.ctrl.tila(MA)).toBeNull(); a.ctrl.tayta(); await a.ctrl.vahvista(); expect(a.kirj).toEqual([]); });
});

describe('ohjain: pelimuoto (Rules sallii vain johdon; ei Rules-muutosta)', () => {
  it('johto: joukkueet/{id}.pelimuoto päivitetään (vain pelimuoto), kortti päivittyy; virheellinen arvo ei kirjoita', async () => {
    const a = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: [{ id: 'demo_u13', nimi: 'Demo U13' }], tapahtumat: [] }); await a.ctrl.lataa(); await a.ctrl.asetaPelimuoto('9v9'); expect(a.paiv).toEqual([]); await a.ctrl.asetaPelimuoto('8v8'); expect(a.paiv).toEqual([['seurat/demo/joukkueet/demo_u13', { pelimuoto: '8v8' }]]); expect(a.ctrl.tila(MA)).toMatchObject({ tyyppi: 'tayta' });
  });
  it('valmentaja (ei johto): ei kirjoitusta, ohje "Pyydä valmennuspäällikköä…"; Rules-virhe → sama ohje', async () => {
    const a = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: [{ id: 'demo_u13', nimi: 'Demo U13' }], tapahtumat: [], johto: false }); await a.ctrl.lataa(); await a.ctrl.asetaPelimuoto('8v8'); expect(a.paiv).toEqual([]); expect(a.viestit.pop()[0]).toBe('Pyydä valmennuspäällikköä asettamaan pelimuoto');
    const b = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: [{ id: 'demo_u13', nimi: 'Demo U13' }], tapahtumat: [], paivitysVirhe: true }); await b.ctrl.lataa(); await b.ctrl.asetaPelimuoto('8v8'); expect(b.viestit.pop()).toEqual(['Pyydä valmennuspäällikköä asettamaan pelimuoto', 'err']); expect(b.ctrl.tila(MA)).toMatchObject({ tyyppi: 'pelimuoto' });
  });
});

describe('ohjain: Vahvista kesken (tuplaklikkaus)', () => {
  it('kaksi Vahvistaa peräkkäin ennen ensimmäisen valmistumista → vain yksi batch (4 dokumenttia); tila.kesken ja nappi disabled kesken; virheessä esikatselu säilyy ja voi yrittää uudelleen', async () => {
    const a = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: DOCIT, tapahtumat: HIST.concat([OTTELU]) }); await a.ctrl.lataa(); a.ctrl.tayta();
    const p1 = a.ctrl.vahvista(), p2 = a.ctrl.vahvista(); expect(a.ctrl.tila(MA)).toMatchObject({ tyyppi: 'vahvista', kesken: true }); await Promise.all([p1, p2]); expect(a.kirj.length).toBe(4); expect(a.tilaRef.ladattu).toBe(1);
    const N = require('../lib/tm_kalenteri_nakyma.js'), h = N.tmKalTaytaKorttiHTML({ tyyppi: 'vahvista', n: 4, kesken: true }, { t: (x) => x, on: { vahvista: 'v()', peru: 'p()' } }); expect(h).toContain('disabled'); expect(h).toContain('Tallennetaan…'); expect(h).not.toContain('onclick="v()"'); expect(h).not.toContain('>Peru<');
  });
  it('commit epäonnistuu → kesken vapautuu, esikatselu säilyy, uusi yritys onnistuu', async () => {
    const a = mock({ viikkopohjat: POHJA_DOC, joukkueDocit: DOCIT, tapahtumat: HIST.concat([OTTELU]), commitVirhe: 1 }); await a.ctrl.lataa(); a.ctrl.tayta(); await a.ctrl.vahvista();
    expect(a.kirj.length).toBe(0); expect(a.viestit.pop()[1]).toBe('err'); expect(a.ctrl.tila(MA)).toMatchObject({ tyyppi: 'vahvista', n: 4, kesken: false }); await a.ctrl.vahvista(); expect(a.kirj.length).toBe(4);
  });
});
