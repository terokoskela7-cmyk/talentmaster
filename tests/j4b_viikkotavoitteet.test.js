/**
 * J4 B — viikkotavoitteet joukkuejaksoon (D36): J2-lomakkeen osio "Viikkotavoitteet" (valinnainen, 1 rivi / jakson viikko ≤ 120 merkkiä, KIELLETYT),
 * esitäyttö vuosikellosta jos teemarivillä on viikkojako (viikkotavoitteet[]), data jaksofokus.viikot [{vk, tavoite, lahde:'vuosikello'|'valmentaja'}], kortti näyttää kuluvan viikon.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const J = require('../lib/tm_joukkuejakso.js'), VL = require('../lib/tm_valmennuslinja.js'), JM = require('../lib/tm_jakso_malli.js');
const T = (s) => s, TANAAN = '2026-11-10';
const RIVI = (lisa) => Object.assign({ id: 'teema_45_1', joukkue: 'KPV U13', jakso: 'Jakso 1', alkaa: '2026-11-02', paattyy: '2027-01-17', teema: 'Syöttötaito ja -peli', tila: 'hyvaksytty' }, lisa || {});
const CTX = (rivi, lisa) => Object.assign({ joukkue: 'KPV U13', jid: 'kpv_u13', teemat: VL.tmTeemaKerros({ jaksot: [rivi || RIVI()] }, null), ohjelmat: [], tanaan: TANAAN }, lisa || {});
const DOC = (jf) => ({ id: 'kpv_u13', nimi: 'KPV U13', ikaryhma: 'U13', jaksofokus: jf });
const SYOTE = (lisa) => Object.assign({ tekn: 'teema:teema_45_1', teknOma: '', fyys: 'fy:fy_ketteryys', fyysOma: '', henkinen: '', sosiaalinen: '', alku: TANAAN, kesto: '6', viikot: [] }, lisa || {});
const OPTS = { t: T, modalId: 'M', tallennaFn: '_t', suljeFn: '_s', overlayAttrs: '' };
const X = (jDoc, ctx) => J.tmJoukkuejaksoTiedot(jDoc || DOC(null), ctx || CTX());
const VK = (...tekstit) => { const a = []; tekstit.forEach((t, i) => { a[i] = t; }); return a; };

describe('esitäyttö vuosikellosta (viikkotavoitteet[] teemarivillä)', () => {
  it('KPV:n NYKYINEN aineisto (teemat.viikot = viikkoväli-teksti, ei viikkotavoitteita): esitäyttö tyhjä — ei keksitä viikkoja', () => {
    const x = X(); expect(x.viikot).toEqual({}); expect(x.viikotVuosikello).toEqual({});
    const x2 = X(DOC(null), CTX(RIVI({ viikot: '45–2' }))); expect(x2.viikot).toEqual({});
  });
  it('teemarivillä viikkotavoitteet → esitäyttö esivalitulle teemalle (vain uusi jakso); rikkinäiset rivit (vk>12, tyhjä, ei-teksti) ohitetaan', () => {
    const r = RIVI({ viikkotavoitteet: [{ vk: 1, tavoite: 'Syöttö 2 kosketuksella' }, { vk: 2, tavoite: ' Pelaa kolmiot ' }, { vk: 13, tavoite: 'liian pitkälle' }, { vk: 3, tavoite: '' }, { vk: 4, tavoite: 5 }, null] });
    const x = X(DOC(null), CTX(r)); expect(x.viikot).toEqual({ 1: 'Syöttö 2 kosketuksella', 2: 'Pelaa kolmiot' }); expect(x.viikotVuosikello).toEqual(x.viikot);
    const h = J.tmJoukkuejaksoModalHTML(x, OPTS); expect(h).toContain('value="Syöttö 2 kosketuksella"'); expect(h).toContain('Viikko 1 · vuosikellosta'); expect(h).toMatch(/<details data-jj-viikot[^>]* open>/);
    const olemassa = DOC({ alku: '2026-11-10', kesto_vk: 6, osa_alueet: { tekninen_taktinen: { teema_avain: 'teema_45_1', nimi: 'S', lahde: 'seura' }, fyysinen: { avain: 'fy_ketteryys', nimi: 'K', lahde: 'tm' } }, viikot: [{ vk: 1, tavoite: 'Oma viikko', lahde: 'valmentaja' }] });
    expect(X(olemassa, CTX(r)).viikot).toEqual({ 1: 'Oma viikko' });   // muokkaus: tallennettu voittaa, vuosikellon esitäyttö ei ylikirjoita
  });
});

describe('lomake: rivit per jakson viikko', () => {
  it('rivit 1..12 (ikävaiheen max), näkyvät vain valitun keston viikoille; kesto-valinnan onchange kutsuu apurin; osio on valinnainen (ei open ilman arvoja)', () => {
    const h = J.tmJoukkuejaksoModalHTML(X(), OPTS);
    for (let n = 1; n <= 8; n++) expect(h, 'vk ' + n).toContain('id="_jjVk_' + n + '"');   // U13: kesto 6–8
    expect(h).toMatch(/data-jj-vk="6" style="display:block"/); expect(h).toMatch(/data-jj-vk="7" style="display:none"/); expect(h).toContain('onchange="TM_JOUKKUEJAKSO.tmJjViikotNayta(this)"'); expect(h).toContain('Viikkotavoitteet (valinnainen)'); expect(h).not.toMatch(/<details data-jj-viikot[^>]* open>/);
    expect(h).toContain('maxlength="120"'); expect(h).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
  it('DOM-apuri tmJjViikotNayta: näyttää vain viikot ≤ kesto', () => {
    const rivit = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ n, style: {}, getAttribute() { return String(n); } })); const juuri = { querySelectorAll: () => rivit };
    J.tmJjViikotNayta({ value: '7', closest: () => juuri }); expect(rivit.map((r) => r.style.display)).toEqual(['block', 'block', 'block', 'block', 'block', 'block', 'block', 'none']);
    expect(() => J.tmJjViikotNayta(null)).not.toThrow(); expect(() => J.tmJjViikotNayta({ value: '6' })).not.toThrow();
  });
});

describe('rakennus: jaksofokus.viikot', () => {
  const rak = (lisa, x) => J.tmJoukkuejaksoRakenna(SYOTE(lisa), x || X(), {});
  it('rivit [{vk, tavoite, lahde}]: tyhjät pois, vk = jakson viikko; kirjoitettu käsin → valmentaja; sama teksti kuin vuosikellon esitäyttö → vuosikello', () => {
    expect(rak({ viikot: VK('Syöttö 2 kosketuksella', '', 'Pelaa kolmiot') }).viikot).toEqual([{ vk: 1, tavoite: 'Syöttö 2 kosketuksella', lahde: 'valmentaja' }, { vk: 3, tavoite: 'Pelaa kolmiot', lahde: 'valmentaja' }]);
    const r = RIVI({ viikkotavoitteet: [{ vk: 1, tavoite: 'Vuosikellon viikko' }] }), x = X(DOC(null), CTX(r));
    const jf = J.tmJoukkuejaksoRakenna(SYOTE({ viikot: VK('Vuosikellon viikko', 'Oma muutos') }), x, {}); expect(jf.viikot).toEqual([{ vk: 1, tavoite: 'Vuosikellon viikko', lahde: 'vuosikello' }, { vk: 2, tavoite: 'Oma muutos', lahde: 'valmentaja' }]);
    expect(J.tmJoukkuejaksoRakenna(SYOTE({ viikot: VK('Vuosikellon viikko muokattuna') }), x, {}).viikot[0].lahde).toBe('valmentaja');   // muokattu teksti ei ole enää vuosikellon
  });
  it('valinnainen: ei viikkoja → viikot [] (tyhjentää vanhat samalla teemalla); yli keston viikot pudotetaan (kesto 6, rivi 8)', () => {
    expect(rak({}).viikot).toEqual([]); expect(rak({ viikot: VK('', '', '', '', '', '', '', 'Liian myöhäinen') }).viikot).toEqual([]);
    expect(rak({ kesto: '8', viikot: VK('', '', '', '', '', '', '', 'Viikko kahdeksan') }).viikot).toEqual([{ vk: 8, tavoite: 'Viikko kahdeksan', lahde: 'valmentaja' }]);
  });
  it('≤ 120 merkkiä (120 ok, 121 hylätään) ja KIELLETYT-vartija (aina myönteinen); virheilmoitus kertoo viikon', () => {
    expect(rak({ viikot: VK('a'.repeat(120)) }).viikot[0].tavoite.length).toBe(120);
    expect(() => rak({ viikot: VK('a'.repeat(121)) })).toThrow(/viikon 1 tavoite on liian pitkä/);
    ['heikkous', 'rajoite', 'kriittinen'].forEach((s) => expect(() => rak({ viikot: VK('ok', 'Korjataan ' + s) }), s).toThrow(/viikon 2 tavoite sisältää kielletyn sanan/));
  });
  it('data kelpaa GDPR-vartijalle ja kirjoitukselle: muokkaus samalla teemalla säilyttää alkoi, päivittää viikot; tyhjennys ylikirjoittaa (merge ei säilytä vanhaa)', () => {
    const dep = { arrayUnion: (...a) => ({ AU: a }), nytISO: '2026-11-10T08:00:00.000Z' };
    const jf1 = rak({ viikot: VK('Eka', 'Toka') }); expect(JM.tmTarkistaJaksoData(jf1)).toEqual([]);
    const eka = J.tmJoukkuejaksoKirjoitus(DOC(null), jf1, dep).paikallinen.jaksofokus; expect(eka.viikot).toHaveLength(2);
    const tyhja = J.tmJoukkuejaksoKirjoitus(DOC(eka), rak({}, X(DOC(eka))), Object.assign({}, dep, { nytISO: '2026-11-17T08:00:00.000Z' }));
    expect(Object.keys(tyhja.update)).toEqual(['jaksofokus']); expect(tyhja.update.jaksofokus.viikot).toEqual([]); expect(tyhja.update.jaksofokus.alkoi).toBe('2026-11-10T08:00:00.000Z');
  });
});

describe('kortti: kuluvan viikon tavoite', () => {
  const jfViikot = (alku, kesto, viikot) => J.tmJoukkuejaksoKirjoitus(DOC(null), J.tmJoukkuejaksoRakenna(SYOTE({ alku, kesto: String(kesto), viikot }), X(), {}), { nytISO: alku + 'T08:00:00.000Z' }).paikallinen.jaksofokus;
  const jf = jfViikot('2026-10-27', 6, VK('Eka viikko', 'Toka viikko', 'Kolmas viikko'));   // 27.10.: vk1 · 3.11.: vk2 · 10.11.: vk3
  it('viikko n → rivin tavoite; viikko ilman riviä / jakso ei alkanut / päättynyt → ei riviä; HTML näyttää "Viikon tavoite"', () => {
    const k = (tanaan) => J.tmJoukkuejaksoKortti(DOC(jf), { tanaan });
    expect(k('2026-10-27').viikkotavoite).toBe('Eka viikko'); expect(k('2026-11-03').viikkotavoite).toBe('Toka viikko'); expect(k('2026-11-10').viikkotavoite).toBe('Kolmas viikko');
    expect(k('2026-11-17').viikkotavoite).toBeNull(); expect(k('2026-10-20').viikkotavoite).toBeNull();
    const h = J.tmJoukkuejaksoKorttiHTML(k('2026-11-10'), { t: T }); expect(h).toContain('Viikon tavoite'); expect(h).toContain('Kolmas viikko'); expect(J.tmJoukkuejaksoKorttiHTML(k('2026-11-17'), { t: T })).not.toContain('Viikon tavoite');
  });
  it('vanha joukkuejakso ilman viikot-kenttää: kortti ennallaan (ei viikkotavoitetta, ei kaadu); XSS escapataan', () => {
    const vanha = JSON.parse(JSON.stringify(jf)); delete vanha.viikot; expect(J.tmJoukkuejaksoKortti(DOC(vanha), { tanaan: '2026-11-03' }).viikkotavoite).toBeNull();
    const xss = jfViikot('2026-10-27', 6, VK('<img onerror=x>')); expect(J.tmJoukkuejaksoKorttiHTML(J.tmJoukkuejaksoKortti(DOC(xss), { tanaan: '2026-10-27' }), { t: T })).not.toContain('<img');
  });
});
