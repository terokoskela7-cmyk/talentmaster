/**
 * R6.4 Mediaviesti M1 · PR 2 (pelaaja + perhe) — lib/tm_klippi_perhe.js + Pelaaja_v7 / Vanhempi_v2 -adapterit (sivun OIKEA koodi vm:ssä) + valmentajan lukukuittaus (Master/VP).
 * Rules-puoli: tests/rules (v3.51; PR 2 -describe-lisäykset). Ei lukuja, ei muiden vastauksia, ei "11/18" (§7.22).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const L = require('../lib/tm_klippi_perhe.js'), MV = require('../lib/tm_mediaviesti.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const PE = lue('TalentMaster_Pelaaja_v7.html'), VA = lue('TalentMaster_Vanhempi_v2.html'), MA = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html');
const viipale = (src, alku, loppu) => { const i = src.indexOf(alku), j = src.indexOf(loppu, i); if (i < 0 || j < 0) throw new Error('rajat: ' + alku); return src.slice(i, j); };
function funktio(src, alku) { const i = src.indexOf(alku); if (i < 0) throw new Error('ei löydy ' + alku); let d = 0; for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(i, j + 1); } } throw new Error('ei päättynyt'); }

const NYT = new Date(), H = (h) => new Date(NYT.getTime() + h * 3600000), PID = 'p1', VUID = 'valm-1';
const klippi = (o = {}) => Object.assign({ id: 'k1', tyyppi: 'klippi', pelaajaId: PID, url: 'https://app.veo.co/m/x?t=12', domain: 'app.veo.co', mediatyyppi: 'video', kohta_s: 12, klippityyppi: 'onnistui', kysymys: 'Mitä näit ennen kuin päätit?', saate: 'Pidit pallon lähellä.', fromNimi: 'Valtteri', nakyvyys: 'pelaaja', vastaanottajaUid: VUID, lahettajaUid: VUID, tila: 'lahetetty', nakyva_alkaen: H(-5), aika: H(-16), luettu: false }, o);
const vastaus = (o = {}) => Object.assign({ id: 'v1', tyyppi: 'klippi_vastaus', pelaajaId: PID, vastaus_viestille: 'k1', vastaanottajaUid: VUID, valinta: 'Arvasin', teksti: 'Se tuli vasemmalta.', nakyvyys: 'pelaaja', luettu: false, aika: H(-3) }, o);

describe('lib: taso, valinnat, ketjut', () => {
  it('kpTaso: U≤12 perhe · U13–14 valinta · U15+ lause · tuntematon → valinta (peilaa tmMvNakyvyys-rajaa)', () => {
    for (const [ika, t] of [[8, 'perhe'], [12, 'perhe'], [13, 'valinta'], [14, 'valinta'], [15, 'lause'], [17, 'lause'], [null, 'valinta'], ['', 'valinta'], [undefined, 'valinta']]) expect(L.kpTaso(ika), String(ika)).toBe(t);
    for (const ika of [8, 12, 13, 14, 15, 18]) expect(MV.tmMvNakyvyys(ika) === 'huoltaja').toBe(L.kpTaso(ika) === 'perhe');
  });
  it('kpValinnat: 3 kpl (perhe = leikkijä-, valinta = rakentajarekisteri), U15+ ei valintoja', () => {
    expect(L.kpValinnat('perhe').map((o) => o.teksti)).toEqual(['Katsoin ylös', 'Juoksin tilaan', 'En tiedä']); expect(L.kpValinnat('valinta').map((o) => o.teksti)).toEqual(['Näin puolustajan', 'Arvasin', 'En muista']); expect(L.kpValinnat('lause')).toEqual([]);
    expect(L.kpValinnat('valinta', { t: (k) => (k === 'kp_valinta_rakentaja_2' ? 'Jag gissade' : k) })[1].teksti).toBe('Jag gissade');   // sv tulee opts.t:stä; avain säilyy
  });
  it('kpKetjut: vain OMAT klipit, nakyva_alkaen ≤ nyt (D62), poistetut pois; vastaus + kuittaus liittyvät klippiin; uusin ensin; toisen pelaajan vastaus ei vuoda', () => {
    const k = L.kpKetjut([klippi(), klippi({ id: 'k2', nakyva_alkaen: H(19) }), klippi({ id: 'k3', pelaajaId: 'toinen' }), klippi({ id: 'k4', poistettu: true }), klippi({ id: 'k5', aika: H(-4) }),
      vastaus(), vastaus({ id: 'v2', pelaajaId: 'toinen', vastaus_viestille: 'k1', valinta: 'Muiden vastaus' }), { id: 'k1k', tyyppi: 'klippi_kuittaus', pelaajaId: PID, vastaus_viestille: 'k1', kuittaus: true }, { id: 'x', tyyppi: 'teksti', pelaajaId: PID }], { nyt: NYT, pelaajaId: PID });
    expect(k.map((x) => x.id)).toEqual(['k5', 'k1']);   // k2 (huomenna) / k3 (toinen) / k4 (poistettu) pois; uusin ensin
    const k1 = k.find((x) => x.id === 'k1'); expect(k1.vastaus).toMatchObject({ valinta: 'Arvasin', teksti: 'Se tuli vasemmalta.', luettu: false }); expect(k1.perheKuittasi).toBe(true); expect(k1.linkkiOk).toBe(true); expect(JSON.stringify(k)).not.toContain('Muiden vastaus');
  });
  it('kpKetjut: http-linkki ei ole klikattava (linkkiOk false); joukkueklippi ja suljettu + kuittauslause kulkevat mukana', () => {
    const k = L.kpKetjut([klippi({ url: 'http://x.fi/a', id: 'a' }), klippi({ id: 'b', joukkueklippi: true, tila: 'suljettu', kuittaus_lause: 'Hyvä!' })], { nyt: NYT, pelaajaId: PID });
    expect(k.find((x) => x.id === 'a').linkkiOk).toBe(false); expect(k.find((x) => x.id === 'b')).toMatchObject({ joukkueklippi: true, suljettu: true, kuittaus_lause: 'Hyvä!' });
  });
  it('kpNakyvat: avoimet + suljetut ≤14 pv, max 3, uusin ensin', () => {
    const mk = (id, pvSitten, suljettu) => ({ id, suljettu, t: NYT.getTime() - pvSitten * 86400000 });
    const n = L.kpNakyvat([mk('uusi', 0), mk('vanha_avoin', 40), mk('suljettu_tuore', 3, true), mk('suljettu_vanha', 30, true), mk('d', 1), mk('e', 2)], { nyt: NYT });
    expect(n.map((x) => x.id)).toEqual(['uusi', 'vanha_avoin', 'suljettu_tuore']);   // järjestys säilyy; suljettu_vanha pois; max 3
    expect(L.kpNakyvat([mk('a', 1), mk('b', 2), mk('c', 3), mk('d', 4)], { nyt: NYT })).toHaveLength(3);
  });
});

describe('lib: vastausdokumentit (peilaa Rules v3.51 viestiPelaajanLuonti)', () => {
  const RULES_SALLITUT = ['tyyppi', 'pelaajaId', 'vastaanottajaUid', 'lahettajaUid', 'fromRole', 'fromNimi', 'teksti', 'valinta', 'kuittaus', 'vastaus_viestille', 'nakyvyys', 'luettu', 'aika'], RULES_PAKOLLISET = ['tyyppi', 'pelaajaId', 'vastaus_viestille', 'nakyvyys', 'lahettajaUid', 'luettu', 'aika'];
  const k = () => L.kpKetjut([klippi()], { nyt: NYT, pelaajaId: PID })[0], ctx = (o = {}) => Object.assign({ pelaajaId: PID, uid: 'pel_s_p1', rooli: 'pelaaja', nimi: 'Topias', taso: 'valinta' }, o);
  it('U13–14: valinta + omin sanoin → yksi klippi_vastaus; avainjoukko ⊆ Rules, pakolliset mukana, nakyvyys pelaaja, luettu false, vastaanottajaUid = klipin, EI url:ia', () => {
    const x = L.kpVastausDokumentit(k(), { valinta: 'kp_valinta_rakentaja_1', teksti: ' Se tuli vasemmalta. ' }, ctx()); expect(x.ok).toBe(true); expect(x.dokit).toHaveLength(1); const d = x.dokit[0];
    expect(d).toMatchObject({ tyyppi: 'klippi_vastaus', valinta: 'Näin puolustajan', teksti: 'Se tuli vasemmalta.', vastaus_viestille: 'k1', pelaajaId: PID, vastaanottajaUid: VUID, lahettajaUid: 'pel_s_p1', fromRole: 'pelaaja', nakyvyys: 'pelaaja', luettu: false, aika: null });
    for (const a of Object.keys(d)) expect(RULES_SALLITUT).toContain(a); for (const a of RULES_PAKOLLISET) expect(Object.keys(d)).toContain(a); expect(d.url).toBeUndefined();
  });
  it('U13–14: pelkkä valinta ✓, pelkkä teksti ✓, ei kumpaakaan ✗ tyhja; vieras valinta ✗; teksti 201 ✗ pitka, 200 ✓; valinta voidaan antaa avaimena tai tekstinä', () => {
    expect(L.kpVastausDokumentit(k(), { valinta: 'Arvasin' }, ctx()).ok).toBe(true); expect(L.kpVastausDokumentit(k(), { teksti: 'x' }, ctx()).ok).toBe(true);
    expect(L.kpVastausDokumentit(k(), {}, ctx())).toEqual({ ok: false, syy: 'tyhja' }); expect(L.kpVastausDokumentit(k(), { valinta: 'Jotain muuta' }, ctx())).toEqual({ ok: false, syy: 'valinta' });
    expect(L.kpVastausDokumentit(k(), { teksti: 'a'.repeat(201) }, ctx())).toEqual({ ok: false, syy: 'pitka' }); expect(L.kpVastausDokumentit(k(), { teksti: 'a'.repeat(200) }, ctx()).ok).toBe(true);
  });
  it('U15+: pakollinen yksi lause, valinta ohitetaan (ei vaihtoehtoja), ≤200', () => {
    const c = ctx({ taso: 'lause' }); expect(L.kpVastausDokumentit(k(), { teksti: 'Katse olisi pitänyt kääntää aiemmin.', valinta: 'Arvasin' }, c).dokit[0]).toMatchObject({ teksti: 'Katse olisi pitänyt kääntää aiemmin.' });
    expect(L.kpVastausDokumentit(k(), { teksti: 'Katse olisi pitänyt kääntää aiemmin.', valinta: 'Arvasin' }, c).dokit[0].valinta).toBeUndefined(); expect(L.kpVastausDokumentit(k(), { valinta: 'Arvasin' }, c)).toEqual({ ok: false, syy: 'tyhja' }); expect(L.kpVastausDokumentit(k(), { teksti: '  ' }, c).ok).toBe(false);
  });
  it('U8–12 (huoltaja): valinta PAKOLLINEN, ei vapaata tekstiä; rasti → toinen dokumentti klippi_kuittaus (kuittaus:true) VAIN huoltajalta', () => {
    const c = ctx({ taso: 'perhe', rooli: 'huoltaja', uid: 'huolt-uid' }), kp = L.kpKetjut([klippi({ nakyvyys: 'huoltaja' })], { nyt: NYT, pelaajaId: PID })[0];
    expect(L.kpVastausDokumentit(kp, { teksti: 'vapaa' }, c)).toEqual({ ok: false, syy: 'tyhja' });
    const a = L.kpVastausDokumentit(kp, { valinta: 'Katsoin ylös', teksti: 'ei saa' }, c); expect(a.dokit).toHaveLength(1); expect(a.dokit[0]).toMatchObject({ valinta: 'Katsoin ylös', fromRole: 'huoltaja', lahettajaUid: 'huolt-uid', nakyvyys: 'pelaaja' }); expect(a.dokit[0].teksti).toBeUndefined();
    const b = L.kpVastausDokumentit(kp, { valinta: 'En tiedä', kuittaa: true }, c); expect(b.dokit.map((d) => d.tyyppi)).toEqual(['klippi_vastaus', 'klippi_kuittaus']); expect(b.dokit[1]).toMatchObject({ kuittaus: true, vastaus_viestille: 'k1', nakyvyys: 'pelaaja', luettu: false });
    for (const d of b.dokit) for (const a2 of Object.keys(d)) expect(RULES_SALLITUT).toContain(a2);
    expect(L.kpVastausDokumentit(kp, { valinta: 'En tiedä', kuittaa: true }, ctx({ taso: 'perhe', rooli: 'pelaaja' })).dokit).toHaveLength(1);   // pelaaja ei kuittaa (Rules: vain huoltaja)
  });
  it('puuttuva ketju / pelaajaId / uid / vastaanottaja → { ok:false } (ei kirjoitusta)', () => {
    expect(L.kpVastausDokumentit(null, { valinta: 'Arvasin' }, ctx()).ok).toBe(false); expect(L.kpVastausDokumentit(k(), { valinta: 'Arvasin' }, ctx({ pelaajaId: '' })).ok).toBe(false); expect(L.kpVastausDokumentit(k(), { valinta: 'Arvasin' }, ctx({ uid: '' })).ok).toBe(false);
    expect(L.kpVastausDokumentit(Object.assign({}, k(), { vastaanottajaUid: '' }), { valinta: 'Arvasin' }, ctx()).ok).toBe(false);
  });
});

describe('lib: HTML (§7.22: ei lukuja, ei vertailua, ei muiden vastauksia)', () => {
  const O = (o = {}) => Object.assign({ tila: 'valinta', nimi: 'Topias', huoltajaNakee: true, valitseFn: 'v', tekstiFn: 't', kuittaaFn: 'q', lahetaFn: 'l', avaaFn: 'a' }, o);
  const ket = (o = {}, k = {}) => L.kpKetjut([klippi(k)].concat(o.vastaus ? [vastaus()] : []), { nyt: NYT, pelaajaId: PID });
  it('U13–14 avoin: linkki ulos (noopener) + domain + kohta, valmentaja + pvm + pelaajan tyyppinimi (Onnistuminen), saate, kysymys, 3 vaihtoehtoa, "omin sanoin", Lähetä (pois kunnes valittu), "Huoltaja näkee tämän keskustelun."', () => {
    const h = L.kpKorttiHTML(ket(), null, {}, O());
    for (const t of ['Valmentajalta klippi', 'app.veo.co', '0:12', 'rel="noopener noreferrer"', 'target="_blank"', 'Valtteri', 'Onnistuminen', 'Pidit pallon lähellä.', 'Mitä näit ennen kuin päätit?', 'Näin puolustajan', 'Arvasin', 'En muista', 'Sanoisitko omin sanoin?', 'Huoltaja näkee tämän keskustelun.']) expect(h, t).toContain(t);
    expect(h).toMatch(/data-kp-laheta[^>]*disabled|disabled[^>]*data-kp-laheta/); expect(h).toContain('maxlength="200"');
    expect(L.kpKorttiHTML(ket(), null, { valinta: 'kp_valinta_rakentaja_2' }, O())).not.toMatch(/disabled[^>]*data-kp-laheta|data-kp-laheta[^>]*disabled/);
    expect(L.kpKorttiHTML(ket(), null, { valinta: 'kp_valinta_rakentaja_2' }, O())).toContain('aria-pressed="true"');
  });
  it('tyyppien pelaajanimet: Onnistuminen · Katsotaan yhdessä · Tilanne (ei "Prosessi"/"Tulos"/"Onnistui")', () => {
    for (const [ty, nimi] of [['onnistui', 'Onnistuminen'], ['prosessi', 'Katsotaan yhdessä'], ['tulos', 'Tilanne']]) { const h = L.kpKorttiHTML(ket({}, { klippityyppi: ty }), null, {}, O()); expect(h).toContain(nimi); expect(h).not.toMatch(/>Prosessi<|>Tulos<|Onnistui[^m]/); }
  });
  it('U15+: yksi lause -kenttä, ei vaihtoehtonappeja', () => { const h = L.kpKorttiHTML(ket(), null, {}, O({ tila: 'lause' })); expect(h).toContain('data-kp-teksti'); expect(h).not.toContain('data-kp-valinta'); expect(h).toContain('Kirjoita yksi lause'); });
  it('vastattu: "Vastasit" + vastaus; "valmentaja lukenut" VAIN kun luettu:true; kuittauslause näkyy; ei syöttökenttiä', () => {
    const ei = L.kpKorttiHTML(ket({ vastaus: true }), null, {}, O()); expect(ei).toContain('Vastasit'); expect(ei).toContain('Arvasin — Se tuli vasemmalta.'); expect(ei).not.toContain('valmentaja lukenut'); expect(ei).not.toContain('data-kp-laheta'); expect(ei).not.toContain('data-kp-teksti');
    const lu = L.kpKorttiHTML(L.kpKetjut([klippi({ kuittaus_lause: 'Juuri niin – katse ennen palloa.' }), vastaus({ luettu: true })], { nyt: NYT, pelaajaId: PID }), null, {}, O()); expect(lu).toContain('Vastasit'); expect(lu).toContain('valmentaja lukenut'); expect(lu).toContain('Juuri niin – katse ennen palloa.');
  });
  it('EI LUKUJA/VERTAILUA: ei "n/m", ei prosentteja, ei "muut", ei "klippiä"-laskuria, ei XP/streak-kieltä', () => {
    for (const h of [L.kpKorttiHTML(ket(), null, {}, O()), L.kpKorttiHTML(ket({ vastaus: true }), null, {}, O()), L.kpKorttiHTML(ket({}, { joukkueklippi: true }), null, {}, O({ tila: 'lause' }))]) { const teksti = h.replace(/<[^>]+>/g, ' '); expect(teksti).not.toMatch(/\d+\s*\/\s*\d+|\d+\s*%|katsonut|muut tekivät|\d+ klippiä|XP|streak|taso \d/i); }
  });
  it('Vanhempi (tila huoltaja): U8–12-klippi = "Katsokaa yhdessä" + lapsen nimi + 3 valintaa + rasti "Katsoimme yhdessä" + "Lähetä valmentajalle"; U13+-klippi = lukutila (ei syöttöä, "Näet lapsesi ja valmentajan keskustelun.")', () => {
    const perhe = L.kpKorttiHTML(L.kpKetjut([klippi({ nakyvyys: 'huoltaja' })], { nyt: NYT, pelaajaId: PID }), null, {}, O({ tila: 'huoltaja', nimi: 'Eetu' }));
    for (const t of ['Katsokaa yhdessä', 'Valmentaja lähetti Eetu', 'Eetu valitsee itse:', 'Katsoin ylös', 'Juoksin tilaan', 'En tiedä', 'Katsoimme yhdessä', 'Lähetä valmentajalle', 'type="checkbox"']) expect(perhe, t).toContain(t);
    const luku = L.kpKorttiHTML(L.kpKetjut([klippi({ nakyvyys: 'pelaaja' })], { nyt: NYT, pelaajaId: PID }), null, {}, O({ tila: 'huoltaja' }));
    expect(luku).toContain('Näet lapsesi ja valmentajan keskustelun.'); expect(luku).toContain('Ei vastausta vielä.'); for (const t of ['data-kp-laheta', 'data-kp-teksti', 'data-kp-valinta', 'Huoltaja näkee']) expect(luku, t).not.toContain(t);
    const luettu = L.kpKorttiHTML(L.kpKetjut([klippi({ nakyvyys: 'pelaaja' }), vastaus()], { nyt: NYT, pelaajaId: PID }), null, {}, O({ tila: 'huoltaja' })); expect(luettu).toContain('Lapsi vastasi'); expect(luettu).toContain('Arvasin');
  });
  it('perhe kuittasi -merkintä näkyy vastauksen alla; useampi ketju: valittu auki + muut kompakteina riveinä (Avaa)', () => {
    const k = L.kpKetjut([klippi({ nakyvyys: 'huoltaja' }), vastaus(), { id: 'kk', tyyppi: 'klippi_kuittaus', pelaajaId: PID, vastaus_viestille: 'k1', kuittaus: true }, klippi({ id: 'k9', kysymys: 'Toinen kysymys?', aika: H(-2) })], { nyt: NYT, pelaajaId: PID });
    const h = L.kpKorttiHTML(k, 'k1', {}, O({ tila: 'huoltaja' })); expect(h).toContain('Kuittasit: katsoimme yhdessä'); expect(h).toContain('data-kp-avaa="k9"'); expect(h).toContain('Toinen kysymys?'); expect(h).toContain('Muut klipit');
  });
  it('XSS: nimi/kysymys/saate/domain/url/valinta escapataan; ei hex-värejä; tyhjä lista → ""', () => {
    const paha = '<img src=x onerror=alert(1)>', k = L.kpKetjut([klippi({ kysymys: paha, saate: paha, fromNimi: paha, domain: paha, url: 'https://x.fi/"><script>' }), vastaus({ valinta: paha, teksti: paha })], { nyt: NYT, pelaajaId: PID });
    const h = L.kpKorttiHTML(k, null, {}, O()); expect(h).not.toContain('<img'); expect(h).not.toContain('<script>'); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(L.kpKorttiHTML([], null, {}, O())).toBe('');
  });
  it('lib on kielineutraali: kaikki kp_*-avaimet käyttöliittymässä ovat FI-kartassa ja Geminin listassa', () => {
    const lista = lue('docs/R6_4_MEDIAVIESTI_SV_KAANNOKSET.md'); const avaimet = Object.keys(L.FI); expect(avaimet.length).toBeGreaterThan(30); for (const a of avaimet.filter((x) => !x.endsWith('_'))) expect(lista, a).toContain('`' + a + '`');
    const koodi = lue('lib/tm_klippi_perhe.js'); const kaytetyt = new Set([...koodi.matchAll(/['"](kp_\w+)['"]/g)].map((m) => m[1])); for (const a of kaytetyt) if (!a.endsWith('_')) expect(L.FI[a], a).toBeTruthy();
  });
});

/* ── Pelaaja_v7 (vm) ── */
function pelaajaYmp(o = {}) {
  const log = { kyselyt: [], batch: [], virheet: [], tallennettu: [] };
  const docs = (o.docs || []).map((d) => ({ id: d.id, data: () => { const { id, ...x } = d; return x; } }));
  const mkQ = (polku, ehdot) => ({ where: (a, op, v) => mkQ(polku, ehdot.concat([[a, op, v]])), get: async () => { log.kyselyt.push({ polku, ehdot }); if (o.lukuVirhe) throw Object.assign(new Error('x'), { code: o.lukuVirhe }); return { docs }; } });
  const mkRef = (polku) => ({ polku, collection: (c) => { const r = mkRef(polku + '/' + c); r.where = (a, op, v) => mkQ(r.polku, [[a, op, v]]); return r; }, doc: (d) => mkRef(polku + '/' + (d || 'uusi' + Math.random().toString(36).slice(2, 5))) });
  const db = { collection: (c) => mkRef(c), batch: () => { const ops = []; return { set: (r, d) => ops.push([r.polku, d]), commit: async () => { if (o.kirjoitusVirhe) throw Object.assign(new Error('x'), { code: o.kirjoitusVirhe }); log.batch.push(ops); } }; } };
  const els = { p7KpKortti: { innerHTML: '' } };
  const sb = { window: { _db: db, _seuraId: 's', _auth: { currentUser: { uid: 'pel_s_p1', getIdToken: async () => 't' } }, TM_KLIPPI_PERHE: o.ilmanLibia ? null : L }, console: { warn() {} }, Object, Array, Date, JSON, Math, Promise, String, Number, Map,
    _pelaaja: Object.assign({ id: PID, seuraId: 's', etunimi: 'Topias', syntymaVuosi: new Date().getFullYear() - (o.ika == null ? 13 : o.ika) }, o.pelaaja || {}), _isDemoUser: !!o.demo, _thEsc: (s) => String(s == null ? '' : s).replace(/</g, '&lt;'), _p7K1T: (k) => k,
    document: { getElementById: (id) => els[id], querySelector: () => null }, firebase: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } }, _p7Verkossa: () => !o.offline, _p7EiYhteyttaVirhe: () => Object.assign(new Error('offline'), { code: 'offline' }), _p7Aikaraja: (p) => p,
    _naytaKirjausVirhe: (t) => log.virheet.push(t), _p7KirjausVirheTeksti: (e) => 'KIRJAUSVIRHE:' + (e && e.code) };
  vm.createContext(sb);
  vm.runInContext(viipale(PE, 'window._p7Kp = window._p7Kp ||', 'function rA1Kentta() {') + '\nthis.__f={ladataan:_p7KpLataa,html:_p7KpHTML,sisalto:_p7KpSisalto,valitse:_p7KpValitse,teksti:_p7KpTeksti,laheta:_p7KpLaheta,avaa:_p7KpAvaa,taso:_p7KpTaso};', sb);
  return { sb, log, els, f: sb.__f };
}
describe('Pelaaja_v7 · Valmentajalta klippi (vm: sivun oikea koodi)', () => {
  const docs = () => [klippi(), vastaus({ id: 'v0', vastaus_viestille: 'ei-ole', luettu: true }), { id: 'muu', tyyppi: 'teksti', pelaajaId: PID, nakyvyys: 'pelaaja' }];
  it('LUKU: yksi kysely pelaajaId == oma AND nakyvyys == pelaaja (Rules todistaa), kortti piirtyy elementtiin; U13 näkee kortin', async () => {
    const e = pelaajaYmp({ docs: docs() }); await e.f.ladataan(true);
    expect(e.log.kyselyt).toHaveLength(1); expect(e.log.kyselyt[0].polku).toBe('seurat/s/viestit'); expect(e.log.kyselyt[0].ehdot).toEqual([['pelaajaId', '==', PID], ['nakyvyys', '==', 'pelaaja']]);
    expect(e.els.p7KpKortti.innerHTML).toContain('Valmentajalta klippi'); expect(e.els.p7KpKortti.innerHTML).toContain('Mitä näit ennen kuin päätit?');
  });
  it('U≤12 → ei korttia eikä kyselyä (huoltaja vastaa Vanhempi_v2:ssa); demo → ei lukua; ilman kirjastoa → tyhjä (ei kaadu)', async () => {
    const a = pelaajaYmp({ docs: docs(), ika: 11 }); expect(a.f.html()).toBe(''); await a.f.ladataan(true); expect(a.log.kyselyt).toEqual([]);
    const b = pelaajaYmp({ docs: docs(), demo: true }); await b.f.ladataan(true); expect(b.log.kyselyt).toEqual([]);
    const c = pelaajaYmp({ docs: docs(), ilmanLibia: true }); expect(c.f.html()).toBe('');
  });
  it('KORTTI: U13–14 vaihtoehdot + "Huoltaja näkee"; U15+ lause; U18 ei "Huoltaja näkee" -tekstiä', async () => {
    const a = pelaajaYmp({ docs: docs() }); await a.f.ladataan(true); expect(a.els.p7KpKortti.innerHTML).toContain('data-kp-valinta'); expect(a.els.p7KpKortti.innerHTML).toContain('Huoltaja näkee tämän keskustelun.');
    const b = pelaajaYmp({ docs: docs(), ika: 16 }); await b.f.ladataan(true); expect(b.els.p7KpKortti.innerHTML).not.toContain('data-kp-valinta'); expect(b.els.p7KpKortti.innerHTML).toContain('Kirjoita yksi lause'); expect(b.els.p7KpKortti.innerHTML).toContain('Huoltaja näkee');
    const c = pelaajaYmp({ docs: docs(), ika: 18 }); await c.f.ladataan(true); expect(c.els.p7KpKortti.innerHTML).not.toContain('Huoltaja näkee');
  });
  it('LÄHETYS (U13–14): valinta + teksti → yksi batch, yksi klippi_vastaus-dokumentti Rules-muodossa (aika = serverTimestamp), kortti → "Vastasit"; toinen painallus ei kirjoita uudelleen', async () => {
    const e = pelaajaYmp({ docs: docs() }); await e.f.ladataan(true); e.f.valitse('kp_valinta_rakentaja_2'); e.f.teksti('Se tuli vasemmalta.'); await e.f.laheta();
    expect(e.log.batch).toHaveLength(1); expect(e.log.batch[0]).toHaveLength(1); const [polku, d] = e.log.batch[0][0]; expect(polku).toMatch(/^seurat\/s\/viestit\//);
    expect(d).toMatchObject({ tyyppi: 'klippi_vastaus', pelaajaId: PID, vastaus_viestille: 'k1', vastaanottajaUid: VUID, lahettajaUid: 'pel_s_p1', valinta: 'Arvasin', teksti: 'Se tuli vasemmalta.', nakyvyys: 'pelaaja', luettu: false, aika: 'TS' }); expect(d.url).toBeUndefined();
    expect(e.els.p7KpKortti.innerHTML).toContain('Vastasit'); expect(e.els.p7KpKortti.innerHTML).not.toContain('valmentaja lukenut'); await e.f.laheta(); expect(e.log.batch).toHaveLength(1);
  });
  it('VALIDOINTI ENNEN KIRJOITUSTA: tyhjä lähetys → toast, EI kirjoitusta, kortti auki', async () => {
    const e = pelaajaYmp({ docs: docs() }); await e.f.ladataan(true); await e.f.laheta(); expect(e.log.batch).toEqual([]); expect(e.log.virheet).toEqual(['kp_virhe_tyhja']); expect(e.els.p7KpKortti.innerHTML).toContain('data-kp-valinta');
  });
  it('D53: permission-denied / offline → näkyvä virhe-toast, vastaus EI näy lähetettynä, valinta säilyy, uudelleenyritys mahdollinen', async () => {
    const e = pelaajaYmp({ docs: docs(), kirjoitusVirhe: 'permission-denied' }); await e.f.ladataan(true); e.f.valitse('kp_valinta_rakentaja_1'); await e.f.laheta();
    expect(e.log.virheet).toEqual(['KIRJAUSVIRHE:permission-denied']); expect(e.els.p7KpKortti.innerHTML).not.toContain('Vastasit'); expect(e.els.p7KpKortti.innerHTML).toContain('aria-pressed="true"');
    const o2 = pelaajaYmp({ docs: docs(), offline: true }); await o2.f.ladataan(true); o2.f.valitse('kp_valinta_rakentaja_1'); await o2.f.laheta(); expect(o2.log.batch).toEqual([]); expect(o2.log.virheet).toEqual(['KIRJAUSVIRHE:offline']);
  });
  it('LUKUVIRHE → kortti puuttuu (ei rikkinäistä ruutua), ei heitä', async () => { const e = pelaajaYmp({ docs: docs(), lukuVirhe: 'permission-denied' }); await e.f.ladataan(true); expect(e.els.p7KpKortti.innerHTML).toBe(''); });
  it('"valmentaja lukenut" näkyy kun vastaus on luettu (seuraava luku)', async () => { const e = pelaajaYmp({ docs: [klippi(), vastaus({ luettu: true })] }); await e.f.ladataan(true); expect(e.els.p7KpKortti.innerHTML).toContain('Vastasit'); expect(e.els.p7KpKortti.innerHTML).toContain('valmentaja lukenut'); });
  it('Tänään-sijoitus: kortti renderöidään rA1Kentta():ssa; libit ladataan ennen sivun koodia; SW allowlist + cache-versio', () => {
    expect(PE).toContain('${_p7KpHTML()}'); expect(PE.indexOf('lib/tm_mediaviesti.js?v=3')).toBeGreaterThan(0); expect(PE.indexOf('lib/tm_klippi_perhe.js?v=1')).toBeGreaterThan(0);
    const sw = lue('sw_pelaaja.js'); expect(sw).toContain("/lib/tm_klippi_perhe.js"); expect(sw).toContain("/lib/tm_mediaviesti.js"); expect(sw).toMatch(/CACHE = 'tm-pelaaja-v8[1-9]/);
  });
});

/* ── Vanhempi_v2 (vm) ── */
function vanhempiYmp(o = {}) {
  const log = { kyselyt: [], batch: [], toastit: [] };
  const mkDocs = (n) => (o.docs || []).filter((d) => d.nakyvyys === n).map((d) => ({ id: d.id, data: () => { const { id, ...x } = d; return x; } }));
  const mkQ = (polku, ehdot) => ({ where: (a, op, v) => mkQ(polku, ehdot.concat([[a, op, v]])), get: async () => { log.kyselyt.push({ polku, ehdot }); if (o.lukuVirhe) throw Object.assign(new Error('x'), { code: o.lukuVirhe }); const n = (ehdot.find((x) => x[0] === 'nakyvyys') || [])[2]; return { docs: mkDocs(n) }; } });
  const mkRef = (polku) => ({ polku, collection: (c) => { const r = mkRef(polku + '/' + c); r.where = (a, op, v) => mkQ(r.polku, [[a, op, v]]); return r; }, doc: (d) => mkRef(polku + '/' + (d || 'uusi' + Math.random().toString(36).slice(2, 5))) });
  const db = { collection: (c) => mkRef(c), batch: () => { const ops = []; return { set: (r, d) => ops.push([r.polku, d]), commit: async () => { if (o.kirjoitusVirhe) throw Object.assign(new Error('x'), { code: o.kirjoitusVirhe }); log.batch.push(ops); } }; } };
  const els = { vKpKortti: { innerHTML: '' } };
  const sb = { window: { _lapsi: Object.assign({ id: PID, seuraId: 's', etunimi: 'Eetu' }, o.lapsi || {}), TM_KLIPPI_PERHE: L }, console: { warn() {} }, Object, Array, Date, JSON, Math, Promise, String, Number, Map,
    _db: db, _auth: { currentUser: { uid: 'huolt-uid', getIdToken: async () => 't' } }, t: (k) => k, _toast: (x) => log.toastit.push(x), document: { getElementById: (id) => els[id] }, firebase: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } } };
  vm.createContext(sb);
  vm.runInContext(viipale(VA, 'window._vKp = window._vKp ||', '/* ── Tarina-generaattori') + '\nthis.__f={ladataan:_vKpLataa,html:_vKpHTML,valitse:_vKpValitse,kuittaa:_vKpKuittaa,laheta:_vKpLaheta,avaa:_vKpAvaa};', sb);
  return { sb, log, els, f: sb.__f };
}
describe('Vanhempi_v2 · Katsokaa yhdessä (vm: sivun oikea koodi)', () => {
  const PERHE = () => [klippi({ nakyvyys: 'huoltaja' }), vastaus({ id: 'v9', nakyvyys: 'pelaaja', vastaus_viestille: 'ei-ole' })], LUKU = () => [klippi({ id: 'k7', nakyvyys: 'pelaaja', aika: H(-30) }), vastaus({ id: 'v7', vastaus_viestille: 'k7' })];
  it('LUKU: kaksi yhtäsuuruuskyselyä (nakyvyys pelaaja + huoltaja, pelaajaId == lapsi), tulokset yhdistetään id:llä', async () => {
    const e = vanhempiYmp({ docs: PERHE().concat(LUKU()) }); await e.f.ladataan(true); expect(e.log.kyselyt).toHaveLength(2); expect(e.log.kyselyt.map((k) => k.ehdot)).toEqual([[['pelaajaId', '==', PID], ['nakyvyys', '==', 'pelaaja']], [['pelaajaId', '==', PID], ['nakyvyys', '==', 'huoltaja']]]);
    expect(e.els.vKpKortti.innerHTML).toContain('Katsokaa yhdessä');
  });
  it('U8–12-klippi: interaktiivinen; U13+-klippi: vain lukutila ("Lapsi vastasi", ei syöttöä)', async () => {
    const a = vanhempiYmp({ docs: PERHE() }); await a.f.ladataan(true); expect(a.els.vKpKortti.innerHTML).toContain('data-kp-valinta'); expect(a.els.vKpKortti.innerHTML).toContain('Lähetä valmentajalle');
    const b = vanhempiYmp({ docs: LUKU() }); await b.f.ladataan(true); expect(b.els.vKpKortti.innerHTML).toContain('Lapsi vastasi'); expect(b.els.vKpKortti.innerHTML).not.toContain('data-kp-valinta'); expect(b.els.vKpKortti.innerHTML).not.toContain('data-kp-laheta');
  });
  it('LÄHETYS: valinta + rasti → YKSI batch: klippi_vastaus + klippi_kuittaus (huoltajan uid, fromRole huoltaja, nakyvyys pelaaja); kortti → "Kuittasit: katsoimme yhdessä"', async () => {
    const e = vanhempiYmp({ docs: PERHE() }); await e.f.ladataan(true); e.f.valitse('kp_valinta_leikkija_2'); e.f.kuittaa(true); await e.f.laheta();
    expect(e.log.batch).toHaveLength(1); const ops = e.log.batch[0]; expect(ops.map((o) => o[1].tyyppi)).toEqual(['klippi_vastaus', 'klippi_kuittaus']);
    expect(ops[0][1]).toMatchObject({ valinta: 'Juoksin tilaan', pelaajaId: PID, vastaus_viestille: 'k1', vastaanottajaUid: VUID, lahettajaUid: 'huolt-uid', fromRole: 'huoltaja', nakyvyys: 'pelaaja', luettu: false, aika: 'TS' }); expect(ops[1][1]).toMatchObject({ kuittaus: true, aika: 'TS' });
    expect(e.els.vKpKortti.innerHTML).toContain('Kuittasit: katsoimme yhdessä'); await e.f.laheta(); expect(e.log.batch).toHaveLength(1);
  });
  it('ILMAN rastia → vain vastaus; ILMAN valintaa → toast, EI kirjoitusta; lukutilan klippiin ei voi vastata (ei kirjoitusta)', async () => {
    const e = vanhempiYmp({ docs: PERHE() }); await e.f.ladataan(true); await e.f.laheta(); expect(e.log.batch).toEqual([]); expect(e.log.toastit).toEqual(['Valitse vastaus tai kirjoita lause.']);
    e.f.valitse('kp_valinta_leikkija_1'); await e.f.laheta(); expect(e.log.batch[0]).toHaveLength(1);
    const l = vanhempiYmp({ docs: LUKU() }); await l.f.ladataan(true); l.f.valitse('kp_valinta_leikkija_1'); await l.f.laheta(); expect(l.log.batch).toEqual([]);
  });
  it('D53: permission-denied → näkyvä toast koodilla, valinta säilyy; lukuvirhe (esim. suostumus puuttuu) → ei korttia, ei kaadu', async () => {
    const e = vanhempiYmp({ docs: PERHE(), kirjoitusVirhe: 'permission-denied' }); await e.f.ladataan(true); e.f.valitse('kp_valinta_leikkija_1'); await e.f.laheta();
    expect(e.log.toastit).toHaveLength(1); expect(e.log.toastit[0]).toContain('Vastaus ei lähtenyt'); expect(e.log.toastit[0]).toContain('permission-denied'); expect(e.els.vKpKortti.innerHTML).not.toContain('Kuittasit'); expect(e.els.vKpKortti.innerHTML).toContain('aria-pressed="true"');
    const l = vanhempiYmp({ docs: PERHE(), lukuVirhe: 'permission-denied' }); await l.f.ladataan(true); expect(l.els.vKpKortti.innerHTML).toBe('');
  });
  it('lapsi vaihtuu → tila nollataan; sijoitus rKoti():ssa; libit + SW allowlist + cache', async () => {
    const e = vanhempiYmp({ docs: PERHE() }); await e.f.ladataan(true); e.f.valitse('kp_valinta_leikkija_1'); e.sb.window._lapsi = { id: 'toinen', seuraId: 's', etunimi: 'Ella' }; await e.f.ladataan(false); expect(e.sb.window._vKp.valinta).toBe(''); expect(e.log.kyselyt.length).toBe(4);
    expect(VA).toContain('${_vKpHTML()}'); expect(VA).toContain('lib/tm_klippi_perhe.js?v=1'); const sw = lue('sw_vanhempi.js'); expect(sw).toContain('/lib/tm_klippi_perhe.js'); expect(sw).toContain('/lib/tm_mediaviesti.js'); expect(sw).toMatch(/CACHE = 'tm-vanhempi-v5[2-9]/);
  });
});

/* ── Valmentajan lukukuittaus (Master + VP) ── */
describe('Lukukuittaus: valmentaja avaa ketjun → pelaajan vastaus merkitään luetuksi (vain vastaanottaja)', () => {
  it('tmMvLukemattomat: vain tämän klipin, lukemattomat, OMALLE uid:lle osoitetut vastaukset', () => {
    const d = [vastaus({ id: 'a' }), vastaus({ id: 'b', luettu: true }), vastaus({ id: 'c', vastaanottajaUid: 'toinen' }), vastaus({ id: 'd', vastaus_viestille: 'k2' }), { id: 'e', tyyppi: 'klippi_kuittaus', vastaus_viestille: 'k1', vastaanottajaUid: VUID, luettu: false }];
    expect(MV.tmMvLukemattomat(d, 'k1', VUID)).toEqual(['a']); expect(MV.tmMvLukemattomat(d, 'k1', '')).toEqual([]); expect(MV.tmMvLukemattomat(null, 'k1', VUID)).toEqual([]);
  });
  for (const [nimi, src] of [['Master', MA], ['VP', VP]]) {
    it(nimi + ': _mvMerkitseLuetuksi kirjoittaa {luettu:true} yhdellä batchilla vain omille lukemattomille; demo/ei lukemattomia → ei kirjoitusta; virhe ei kaada ketjun avausta; _mvAvaaKetju kutsuu sitä', async () => {
      const log = { batch: [], warn: [] }, ref = (id) => ({ id }), db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: ref }) }) }), batch: () => { const ops = []; return { update: (r, d) => ops.push([r.id, d]), commit: async () => { log.batch.push(ops); } }; } };
      const C = (demo) => ({ demo: () => demo, uid: () => VUID, db: () => db, seuraId: () => 's', token: async () => {} });
      let demo = false; const sb = { window: { TM_MEDIAVIESTI: MV }, console: { warn: (...a) => log.warn.push(a) }, Array, Promise, _mvC: () => C(demo) }; vm.createContext(sb);
      vm.runInContext(funktio(src, 'function _mvMerkitseLuetuksi(e)') + '\nthis.__f=_mvMerkitseLuetuksi;', sb);
      const e = { rivi: { klippiDocId: 'k1' }, dokit: [vastaus({ id: 'a' }), vastaus({ id: 'b', luettu: true }), vastaus({ id: 'c', vastaanottajaUid: 'toinen' })] };
      sb.__f(e); await new Promise((r) => setTimeout(r, 5)); expect(log.batch).toEqual([[['a', { luettu: true }]]]); expect(e.dokit[0].luettu).toBe(true);
      sb.__f(e); await new Promise((r) => setTimeout(r, 5)); expect(log.batch).toHaveLength(1);   // ei enää lukemattomia
      demo = true; sb.__f({ rivi: { klippiDocId: 'k1' }, dokit: [vastaus({ id: 'z' })] }); await new Promise((r) => setTimeout(r, 5)); expect(log.batch).toHaveLength(1);
      expect(src).toMatch(/_mvMerkitseLuetuksi\(e\); window\._mvKetju = \{/);
    });
  }
});
describe('Rules v3.51 + versiot', () => {
  it('Rules v3.51: huoltajan viestiluku vaatii suostumuksen KAIKILTA viesteiltä; changelog kertoo kyselyvuodon', () => {
    const r = lue('tm_admin/firestore.rules'); expect(r).toMatch(/firestore\.rules v3\.5[123456]/); expect(r).toContain('Muutokset v3.50 → v3.51'); expect(r).not.toMatch(/resource\.data\.get\('tyyppi', ''\) != 'klippi'\s*\/\/ v3\.50 \(D58\)/);
    expect(r).toContain("pelaajaData(seuraId, resource.data.get('pelaajaId', '')).get('suostumusTila', '') == 'annettu');   // v3.51");
  });
  it('lib-versiot: tm_mediaviesti v2 kaikissa neljässä sovelluksessa (Master, VP, Pelaaja, Vanhempi); tm_klippi_perhe v1 Pelaajassa + Vanhemmassa', () => {
    for (const s of [MA, VP, PE, VA]) expect(s).toContain('lib/tm_mediaviesti.js?v=3'); for (const s of [PE, VA]) expect(s).toContain('lib/tm_klippi_perhe.js?v=1');
    for (const s of [MA, VP]) expect(s).not.toContain('tm_klippi_perhe');   // henkilökunta ei lataa pelaajan/perheen libiä
  });
});
