/* Seura · Excel-tuonti: olemassa olevat pelaajat, monta sähköpostia, trimmaus ja PalloID merkkijonona (CODE_BRIEF_SEURA_TUONTI_OLEMASSA kohdat 1–4, 21.10.2026).
   Ajetaan OIKEA Seura-sivun koodi (kasitteleExcelTuonti + ajaExcelTuonti) vm:ssä, muistinvarainen Firestore, keksityt demo-pelaajat (ei Sibbon dataa). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { lataaSivu } from './helpers/sivu_ajuri.mjs';
import { fakeDb } from './_fakeFirestore.mjs';
const require = createRequire(import.meta.url);
const TS = require('../lib/tm_seura_tuonti.js');

const JOUKKUEET = [{ id: 'demo_p9', nimi: 'P9' }, { id: 'demo_p10', nimi: 'P10' }];
const P9 = { etunimi: 'Pekko', sukunimi: 'Testi', palloID: '35236846', joukkue: 'P9', joukkueNimi: 'P9', joukkueet: ['demo_p9'], joukkueetNimet: ['P9'], huoltajaEmail: 'vanha@tm-testi.fi', suostumusTila: 'pilotti' };   // kevään tuonti: ei syntymävuotta
const OTSIKOT = ['Etunimi *', 'Sukunimi *', 'Syntymävuosi *', 'Joukkue *', 'Huoltajan sähköposti *', 'PalloID (vapaaehtoinen)'];

function ymp(pelaajat, opts) {
  opts = opts || {};
  const alku = {}; Object.entries(pelaajat || {}).forEach(([id, p]) => { alku['seurat/demo/pelaajat/' + id] = Object.assign({}, p); });
  const f = fakeDb(alku), loki = { fn: [], emailAsetus: [] }, el = {};
  const E = (id) => el[id] || (el[id] = { id, value: '', textContent: '', innerHTML: '', checked: true, disabled: false, style: {}, classList: { add() {}, remove() {} }, appendChild() {} });
  const rivit = [];
  const c = lataaSivu('TalentMaster_Seura.html', {
    auth: { currentUser: { uid: 'vp' } }, db: f.db, firebase: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } }, app: () => ({ functions: () => ({ httpsCallable: (n) => async (d) => { loki.emailAsetus.push([n, d]); if (opts.emailVika) throw new Error('ei oikeutta'); return { data: { ok: true } }; } }) }) },
    functions: { httpsCallable: (n) => async (d) => { loki.fn.push([n, d]); if (opts.kutsuVika) throw new Error('lähetys kaatui'); return { data: { ok: true } }; } },
    tila: { seuraId: 'demo', seuraNimi: 'Demo FC', seuraKieli: 'fi', rooli: 'vp', joukkueet: JOUKKUEET, kayttaja: { uid: 'vp', email: 'vp@tm-testi.fi' } },
    URL, URLSearchParams, setTimeout: (fn) => { fn(); return 0; }, naytaToast: (t) => { loki.toast = t; }, renderPelaajat() {}, _rekBaseUrl: () => 'https://tm.example/Rek.html',
    XLSX: { read: () => ({ Sheets: { S: {} }, SheetNames: ['S'] }), utils: { sheet_to_json: () => [OTSIKOT].concat(rivit) } },
    FileReader: class { readAsArrayBuffer() { Promise.resolve().then(() => this.onload({ target: { result: new ArrayBuffer(1) } })); } },
  });
  c.document = Object.assign({}, c.document, { getElementById: E, querySelector: (s) => { const m = /data-i="(\d+)"/.exec(s); return m ? (opts.rivi && opts.rivi[m[1]] ? opts.rivi[m[1]] : null) : null; }, querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, set textContent(v) {} }) });
  return { c, f, loki, E, rivit };
}
const esikatsele = async (t, rivit) => { t.rivit.length = 0; rivit.forEach((r) => t.rivit.push(r)); t.c.kasitteleExcelTuonti({ target: { files: [{ name: 'p2016.xlsx' }] } }); await new Promise((r) => setTimeout(r, 30)); return t.c._excelData; };
const pel = (t, id) => t.f.D.get('seurat/demo/pelaajat/' + id);
const kutsut = (t) => [...t.f.D.entries()].filter(([k]) => k.startsWith('seurat/demo/kutsut/')).map(([, v]) => v);
const onniTeksti = (t) => t.E('excelOnnistui').textContent;

describe('1 · olemassa oleva pelaaja esikatselussa ja päivitys', () => {
  it('ESIKATSELU: P9-pelaaja ilman vuotta, Excelissä P10 + vuosi → "Jo järjestelmässä" + erot (joukkue, vuosi, sähköposti, suostumus), uusi rivi "Uusi"', async () => {
    const t = ymp({ p1: P9 });
    const d = await esikatsele(t, [['Pekko', 'Testi', 2016, 'P10', 'uusi@tm-testi.fi', 35236846], ['Liisa', 'Uusi', 2016, 'P10', 'l@tm-testi.fi', '']]);
    expect(d[0]._olemassa).toBe('p1'); expect(d[1]._olemassa).toBe(null);
    expect(d[0]._ero).toMatchObject({ joukkue: { vanha: 'P9', uusi: 'P10', muuttuu: true }, syntymavuosi: { tila: 'puuttuu', uusi: 2016 }, email: { tila: 'eri', vanha: 'vanha@tm-testi.fi', uusi: 'uusi@tm-testi.fi' }, suostumus: 'ei_kutsua' });
    const html = t.E('excelEsikatseluTbody').innerHTML;
    expect(html).toContain('Jo järjestelmässä'); expect(html).toContain('Joukkue: P9 → P10'); expect(html).toContain('Syntymävuosi puuttuu → 2016'); expect(html).toContain('Sähköposti eri → päivitetään'); expect(html).toContain('Suostumus: ei kutsua'); expect(html).toContain('✓ Uusi');
    expect(html).toContain('class="excelRivi" data-i="0" checked');   // rivikohtainen valinta, oletus päällä
    expect(t.E('excelLkm').textContent).toContain('1 jo järjestelmässä');
  });
  it('PalloID NUMEROSOLUNA (35236846) löytää merkkijonona tallennetun "35236846"; PalloID tallentuu/luetaan aina merkkijonona', async () => {
    const t = ymp({ p1: P9 }); const d = await esikatsele(t, [['Pekko', 'Testi', 2016, 'P10', 'uusi@tm-testi.fi', 35236846]]);
    expect(d[0].palloId).toBe('35236846'); expect(typeof d[0].palloId).toBe('string'); expect(d[0]._olemassa).toBe('p1');
    expect(TS.tmSeuraEtsiOlemassa({ palloId: 35236846 }, [{ id: 'x', palloID: '35236846' }]).id).toBe('x'); expect(TS.tmSeuraPalloId(35236846)).toBe('35236846');
  });
  it('TUONTI (Tuo + lähetä kutsut): joukkue siirtyy P10:een (kaikki neljä kenttää), vuosi asetetaan, sähköposti päivittyy palvelimella, kutsu lähtee (suostumus puuttui) ja yhteenveto kertoo päivityksen', async () => {
    const t = ymp({ p1: P9 }); await esikatsele(t, [['Pekko', 'Testi', 2016, 'P10', 'uusi@tm-testi.fi', 35236846]]);
    await t.c.ajaExcelTuonti(true);
    const p = pel(t, 'p1'); expect(p).toMatchObject({ joukkue: 'P10', joukkueNimi: 'P10', joukkueet: ['demo_p10'], joukkueetNimet: ['P10'], syntymaVuosi: 2016 });
    expect(t.loki.emailAsetus).toEqual([['asetaHuoltajaEmail', { seuraId: 'demo', pelaajaId: 'p1', huoltajaEmail: 'uusi@tm-testi.fi' }]]);   // huoltajaEmail vain palvelimella
    expect(t.loki.fn).toHaveLength(1); expect(t.loki.fn[0][0]).toBe('lahetaRekisteriKutsu'); expect(t.loki.fn[0][1]).toMatchObject({ pelaajaId: 'p1', hEmail: 'uusi@tm-testi.fi', joukkue: 'P10' });
    expect(kutsut(t)).toHaveLength(1); expect(kutsut(t)[0]).toMatchObject({ tyyppi: 'excel_tuonti_kutsu', pelaajaId: 'p1', tila: 'lahetetty' });
    expect(onniTeksti(t)).toContain('0 uutta · 1 päivitetty (joukkue vaihtui: 1) · 0 ennallaan · kutsuja 1'); expect(onniTeksti(t)).not.toMatch(/ohitettu/);
  });
  it('TUONTI ilman kutsuja ("Tuo vain"): päivittää mutta ei lähetä kutsua', async () => {
    const t = ymp({ p1: P9 }); await esikatsele(t, [['Pekko', 'Testi', 2016, 'P10', 'vanha@tm-testi.fi', '35236846']]); await t.c.ajaExcelTuonti(false);
    expect(pel(t, 'p1').joukkueet).toEqual(['demo_p10']); expect(t.loki.fn).toHaveLength(0); expect(t.loki.emailAsetus).toHaveLength(0); expect(onniTeksti(t)).toContain('kutsuja 0');
  });
  it('ANNETTU SUOSTUMUS: sähköpostia ei vaihdeta hiljaa, kutsua ei lähetetä, joukkue/vuosi päivittyvät; yhteenveto "ennallaan" ei kasva', async () => {
    const t = ymp({ p1: Object.assign({}, P9, { suostumusTila: 'annettu', suostumus: { annettu: true } }) }); const d = await esikatsele(t, [['Pekko', 'Testi', 2016, 'P10', 'toinen@tm-testi.fi', '35236846']]);
    expect(d[0]._ero.suostumus).toBe('annettu'); expect(t.E('excelEsikatseluTbody').innerHTML).toContain('Sähköposti eri – ei vaihdeta (suostumus annettu)');
    await t.c.ajaExcelTuonti(true);
    expect(t.loki.emailAsetus).toHaveLength(0); expect(t.loki.fn).toHaveLength(0); expect(kutsut(t)).toHaveLength(0);
    expect(pel(t, 'p1')).toMatchObject({ joukkueet: ['demo_p10'], syntymaVuosi: 2016, huoltajaEmail: 'vanha@tm-testi.fi', suostumusTila: 'annettu' }); expect(onniTeksti(t)).toContain('1 päivitetty (joukkue vaihtui: 1)'); expect(onniTeksti(t)).toContain('kutsuja 0');
  });
  it('puuttuva sähköposti täydennetään; "odottaa" (kutsu jo lähtenyt) + sama osoite → ei uutta kutsua; "odottaa" + uusi osoite → kutsu uuteen osoitteeseen', async () => {
    const t1 = ymp({ p1: Object.assign({}, P9, { huoltajaEmail: null }) }); await esikatsele(t1, [['Pekko', 'Testi', 2016, 'P10', 'a@tm-testi.fi', '35236846']]); await t1.c.ajaExcelTuonti(true);
    expect(t1.loki.emailAsetus[0][1].huoltajaEmail).toBe('a@tm-testi.fi'); expect(t1.loki.fn).toHaveLength(1);
    const t2 = ymp({ p1: Object.assign({}, P9, { suostumusTila: 'odottaa' }) }); await esikatsele(t2, [['Pekko', 'Testi', 2016, 'P10', 'vanha@tm-testi.fi', '35236846']]); await t2.c.ajaExcelTuonti(true); expect(t2.loki.fn).toHaveLength(0);
    const t3 = ymp({ p1: Object.assign({}, P9, { suostumusTila: 'odottaa' }) }); await esikatsele(t3, [['Pekko', 'Testi', 2016, 'P10', 'oikea@tm-testi.fi', '35236846']]); await t3.c.ajaExcelTuonti(true); expect(t3.loki.fn[0][1].hEmail).toBe('oikea@tm-testi.fi');
  });
  it('rivikohtainen valinta pois → ei päivitystä eikä kutsua; kaikki ennallaan', async () => {
    const t = ymp({ p1: P9 }, { rivi: { 0: { checked: false } } }); await esikatsele(t, [['Pekko', 'Testi', 2016, 'P10', 'uusi@tm-testi.fi', '35236846']]); await t.c.ajaExcelTuonti(true);
    expect(pel(t, 'p1')).toMatchObject({ joukkueet: ['demo_p9'], joukkue: 'P9' }); expect(pel(t, 'p1').syntymaVuosi).toBeUndefined(); expect(t.loki.fn).toHaveLength(0); expect(onniTeksti(t)).toContain('0 päivitetty'); expect(onniTeksti(t)).toContain('1 ennallaan');
  });
  it('kutsun lähetys epäonnistuu → kutsun tila "epaonnistui" + virhe (ei jää "odottaa")', async () => {
    const t = ymp({ p1: P9 }, { kutsuVika: true }); await esikatsele(t, [['Pekko', 'Testi', 2016, 'P10', 'vanha@tm-testi.fi', '35236846']]); await t.c.ajaExcelTuonti(true);
    expect(kutsut(t)[0]).toMatchObject({ tila: 'epaonnistui' }); expect(kutsut(t)[0].virhe).toContain('lähetys kaatui');
  });
  it('uusi pelaaja tuodaan edelleen (kutsu lähtee, suostumusTila odottaa); nimi + joukkue -haku osuu kun PalloID puuttuu', async () => {
    const t = ymp({ p1: Object.assign({}, P9, { palloID: undefined }) }); const d = await esikatsele(t, [['Pekko ', ' Testi', 2016, 'P9', 'x@tm-testi.fi', ''], ['Uusi', 'Pelaaja', 2016, 'P10', 'u@tm-testi.fi', '']]);
    expect(d[0].etunimi).toBe('Pekko'); expect(d[0].sukunimi).toBe('Testi'); expect(d[0]._olemassa).toBe('p1');   // "Pekko " trimmautuu; nimi+joukkue osuu
    await t.c.ajaExcelTuonti(true);
    const uusi = [...t.f.D.entries()].find(([k, v]) => k.startsWith('seurat/demo/pelaajat/') && v.etunimi === 'Uusi')[1]; expect(uusi).toMatchObject({ joukkueet: ['demo_p10'], suostumusTila: 'odottaa', huoltajaEmail: 'u@tm-testi.fi' }); expect(onniTeksti(t)).toContain('1 uutta');
  });
});

describe('2 · monta sähköpostia yhdessä solussa', () => {
  const OSOITTEET = { 'a@tm-testi.fi; b@tm-testi.fi': 'a@tm-testi.fi', 'a@tm-testi.fi, b@tm-testi.fi': 'a@tm-testi.fi', 'a@tm-testi.fi b@tm-testi.fi': 'a@tm-testi.fi', 'a@tm-testi.fi\nb@tm-testi.fi': 'a@tm-testi.fi', ' A@TM-testi.fi ;b@tm-testi.fi': 'a@tm-testi.fi' };
  it.each(Object.entries(OSOITTEET))('%j → ensimmäinen osoite, huomio "Yksi sähköposti per solu" ORANSSINA alarivillä (ei punaista) + "Kutsu lähtee: …"', async (raaka, eka) => {
    const t = ymp({}); const d = await esikatsele(t, [['Uusi', 'Pelaaja', 2016, 'P10', raaka, '']]);
    expect(d[0].huoltajaEmail).toBe(eka); expect(d[0]._emailUseita).toBe(true);
    const html = t.E('excelEsikatseluTbody').innerHTML; expect(html).toContain('Yksi sähköposti per solu'); expect(html).toContain('var(--amber)'); expect(html).not.toContain('var(--red)'); expect(html).toContain('Kutsu lähtee: ' + eka + '. Muut huoltajat lisätään myöhemmin.');
  });
  it('tuonti tallentaa ja kutsuu VAIN ensimmäisen osoitteen', async () => {
    const t = ymp({}); await esikatsele(t, [['Uusi', 'Pelaaja', 2016, 'P10', 'a@tm-testi.fi; b@tm-testi.fi', '']]); await t.c.ajaExcelTuonti(true);
    const uusi = [...t.f.D.entries()].find(([k, v]) => k.startsWith('seurat/demo/pelaajat/') && v.etunimi === 'Uusi')[1]; expect(uusi.huoltajaEmail).toBe('a@tm-testi.fi'); expect(t.loki.fn[0][1].hEmail).toBe('a@tm-testi.fi'); expect(t.loki.fn).toHaveLength(1);
  });
  it('virheellinen osoite (kaksi @:ia / ei pistettä) → punainen, ei kutsua; pelaaja tuodaan ilman osoitetta', async () => {
    for (const v of ['a@@x.fi', 'a@x', 'ei-sähköposti', 'a@tm-testi.fi@y.fi']) {
      const t = ymp({}); const d = await esikatsele(t, [['Uusi', 'Pelaaja', 2016, 'P10', v, '']]); expect(d[0]._emailVirhe || d[0]._emailUseita, v).toBe(true); expect(d[0].huoltajaEmail === '' || d[0]._emailUseita, v).toBe(true);
      await t.c.ajaExcelTuonti(true); expect(t.loki.fn.filter(([, x]) => x.hEmail === v), v).toHaveLength(0);
    }
  });
  it('lib: tmSeuraEmail — erottimet ; , välilyönti rivinvaihto, validointi', () => {
    expect(TS.tmSeuraEmail('a@tm-testi.fi').useita).toBe(false); expect(TS.tmSeuraEmail('a@tm-testi.fi;b@tm-testi.fi')).toMatchObject({ ensimmainen: 'a@tm-testi.fi', useita: true, kelpaa: true });
    expect(TS.tmSeuraEmail('a@b@x.fi')).toMatchObject({ kelpaa: false, syy: 'virheellinen' }); expect(TS.tmSeuraEmail('')).toMatchObject({ kelpaa: false, syy: 'tyhja' }); expect(TS.tmSeuraEmail('a@x')).toMatchObject({ kelpaa: false });
  });
});

describe('3 · nimien trimmaus ja PalloID', () => {
  it('lib: "Pekko " → "Pekko", sisäiset kaksoisvälit yhdeksi; PalloID aina merkkijono, trimmattu', () => {
    expect(TS.tmSeuraNimi('Pekko ')).toBe('Pekko'); expect(TS.tmSeuraNimi('  Anna  Maria ')).toBe('Anna Maria'); expect(TS.tmSeuraNimi(null)).toBe('');
    expect(TS.tmSeuraPalloId(35236846)).toBe('35236846'); expect(TS.tmSeuraPalloId(' 35236846 ')).toBe('35236846'); expect(TS.tmSeuraPalloId(undefined)).toBe('');
  });
});

describe('4 · tarkistusnäkymän suodattimet', () => {
  it('Puuttuu: syntymävuosi ja Ei kutsua: oikeat pelaajat ja lukumäärät; suodatinpainikkeet sivulla', () => {
    const P = [{ id: 'a', syntymaVuosi: 2016, suostumusTila: 'odottaa' }, { id: 'b', suostumusTila: 'pilotti' }, { id: 'c', syntymaVuosi: 2015 }, { id: 'd', syntymaVuosi: '', suostumusTila: 'annettu' }, { id: 'e', syntymaVuosi: 2016, suostumus: { annettu: true } }];
    expect(P.filter(TS.tmSeuraPuuttuuVuosi).map((x) => x.id)).toEqual(['b', 'd']); expect(P.filter((x) => TS.tmSeuraSuostumus(x) === 'ei_kutsua').map((x) => x.id)).toEqual(['b', 'c']);
    const S = require('fs').readFileSync(new URL('../TalentMaster_Seura.html', import.meta.url), 'utf8'); expect(S).toContain("suodataPelaajat('puuttuu-vuosi')"); expect(S).toContain("suodataPelaajat('ei-kutsua')"); expect(S).toContain("case 'puuttuu-vuosi': return TM_SEURA_TUONTI.tmSeuraPuuttuuVuosi(p);");
  });
  it('Excel-pohjan Ohje: kohta "Yksi sähköposti per solu. Toinen huoltaja lisätään myöhemmin sovelluksessa."', () => {
    const S = require('fs').readFileSync(new URL('../TalentMaster_Seura.html', import.meta.url), 'utf8'); expect(S).toContain("tmHT('8.  Yksi sähköposti per solu. Toinen huoltaja lisätään myöhemmin sovelluksessa.')");
  });
});
