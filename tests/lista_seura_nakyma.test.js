/* Seuran lista_seura -näkymä (PR 2/3, 27.11.2026): lukija, rivisovitin, lukumäärä, lippu ja HTML-vartijat.
   · tmListaSeuraLataa: KAIKKI TAI EI MITÄÄN (puuttuva _meta / vanha versio / eri kierros / puuttuva sivu / luku-virhe → ok:false → vanha polku)
   · lukumäärä: synteettinen 500 / 1 048 pelaajan seura → sivuja + 1 lukua (≤ 100 tavoite), EI pelaajadokumenttien lukua
   · sovitin: rivi → pelaaja-olio, jota Seuran nykyiset apurit lukevat samoin kuin dokumenttia (suostumus, vuosi, PalloID, joukkueet); EI pin-/sähköpostiarvoa
   · HTML: lista ei lue koko seuran sisainen/terveys-dataa (Q3), käytettävyys-sarake pois listalta, lippu rekisteröity, skriptit mukana. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lista_yhteenveto.js'), LL = require('../lib/tm_lista_lataus.js'), T = require('../lib/tm_seura_tuonti.js'), LIPUT = require('../lib/tm_liput.js');
const { lueKuori } = require('../scripts/kuoren_lahde.js');
const HTML = lueKuori('TalentMaster_Seura.html');   // kuori + seura/-osat (myös seura_lista.js)
const HALLINTA = readFileSync(new URL('../seura/seura_pelaajahallinta.js', import.meta.url), 'utf8');

const TILAT = ['annettu', 'peruttu', 'pilotti', 'odottaa', 'luotu', undefined];
function synt(n) {
  return Array.from({ length: n }, (_, i) => ({ id: 'p' + String(i).padStart(5, '0'), data: {
    etunimi: 'Etu' + i, sukunimi: 'Suku' + (i % 97), syntymaVuosi: i % 11 === 0 ? '' : 2008 + (i % 9), joukkueet: ['j' + (i % 12)], joukkue: 'J' + (i % 12),
    suostumusTila: TILAT[i % TILAT.length], palloID: i % 3 ? String(100000 + i) : undefined, pin: i % 2 ? '123456' : undefined, huoltajaEmail: i % 4 ? 'huoltaja' + i + '@example.org' : undefined, talenttiOhjelma: i % 25 === 0 } }));
}
const JOUKKUEET = Array.from({ length: 12 }, (_, i) => ({ id: 'j' + i, nimi: 'J' + i }));
/* Muistissa oleva Firestore: lukee lista_seura-kokoelman (lukee = dokumenttien määrä), laskee jokaisen luvun */
function mkDb(dokt, opts) {
  opts = opts || {}; const luvut = { dokumentit: 0, pelaajat: 0 };
  const col = { get: async () => { if (opts.virhe) throw Object.assign(new Error('x'), { code: 'permission-denied' }); luvut.dokumentit += dokt.length; return { size: dokt.length, docs: dokt.map((d) => ({ id: d.id, data: () => JSON.parse(JSON.stringify(d.data)) })) }; },
    doc: (id) => ({ get: async () => { const d = dokt.find((x) => x.id === id); luvut.dokumentit += d ? 1 : 0; return d ? { exists: true, data: () => JSON.parse(JSON.stringify(d.data)) } : { exists: false }; } }) };
  return { luvut, collection: () => ({ doc: () => ({ collection: (n) => { if (n === 'lista_seura') return col; luvut.pelaajat++; throw new Error('pelaajia ei saa lukea: ' + n); } }) }) };
}

describe('tmListaSeuraLataa — kaikki tai ei mitään', () => {
  const dokt = L.tmListaSeuraDokumentit(synt(300), JOUKKUEET, 111);
  it('ehjä kooste → ok, kaikki rivit, laskurit ja laskettuMs', async () => {
    const d = dokt.map((x) => x.id === '_meta' ? { id: '_meta', data: Object.assign({}, x.data, { laskettu: { seconds: 5 } }) } : x);
    const r = await LL.tmListaSeuraLataa(mkDb(d), 's1');
    expect(r.ok).toBe(true); expect(r.pelaajat).toHaveLength(300); expect(r.laskurit.kaikki).toBe(300); expect(r.laskettuMs).toBe(5000);
  });
  it('puuttuva _meta / puuttuva sivu / eri kierros / vanha versio / tyhjä / luku-virhe → ok:false', async () => {
    expect((await LL.tmListaSeuraLataa(mkDb(dokt.filter((x) => x.id !== '_meta')), 's')).ok).toBe(false);
    expect((await LL.tmListaSeuraLataa(mkDb(dokt.filter((x) => x.id !== 's0002')), 's')).ok).toBe(false);
    expect((await LL.tmListaSeuraLataa(mkDb(dokt.map((x) => x.id === 's0001' ? { id: x.id, data: Object.assign({}, x.data, { kierros: 999 }) } : x)), 's')).ok).toBe(false);
    expect((await LL.tmListaSeuraLataa(mkDb(dokt.map((x) => x.id === '_meta' ? { id: x.id, data: Object.assign({}, x.data, { versio: 0 }) } : x)), 's')).ok).toBe(false);
    expect((await LL.tmListaSeuraLataa(mkDb([]), 's')).ok).toBe(false);
    const v = await LL.tmListaSeuraLataa(mkDb(dokt, { virhe: true }), 's'); expect(v.ok).toBe(false); expect(v.syy).toMatch(/permission-denied/);
  });
  it('rivimäärä ei täsmää _metan n:ään → ok:false (ei osittaista listaa)', async () => {
    const rikki = dokt.map((x) => x.id === 's0001' ? { id: x.id, data: Object.assign({}, x.data, { rivit: x.data.rivit.slice(1) }) } : x);
    expect((await LL.tmListaSeuraLataa(mkDb(rikki), 's')).ok).toBe(false);
  });
});

describe('lukumäärä — Seuran avaus', () => {
  it('500 pelaajaa = 3 lukua, 1 048 = 6 lukua (≤ 100), pelaajadokumentteja 0', async () => {
    for (const [n, odotus] of [[500, 3], [1048, 6]]) {
      const db = mkDb(L.tmListaSeuraDokumentit(synt(n), JOUKKUEET, 1)), r = await LL.tmListaSeuraLataa(db, 's');
      expect(r.ok).toBe(true); expect(r.pelaajat).toHaveLength(n); expect(db.luvut.dokumentit).toBe(odotus); expect(r.lukuja).toBe(odotus); expect(db.luvut.pelaajat).toBe(0); expect(odotus).toBeLessThanOrEqual(100);
    }
  });
  it('KPI-laskurit = yksi luku (_meta)', async () => {
    const db = mkDb(L.tmListaSeuraDokumentit(synt(1048), JOUKKUEET, 1)), m = await LL.tmListaSeuraMeta(db, 's');
    expect(m.ok).toBe(true); expect(m.laskurit.kaikki).toBe(1048); expect(db.luvut.dokumentit).toBe(1);
    expect((await LL.tmListaSeuraMeta(mkDb([]), 's')).ok).toBe(false);
  });
});

describe('rivisovitin — Seuran apurit lukevat rivin kuten dokumentin', () => {
  const pelaajat = synt(200), rivit = L.tmListaSeuraDokumentit(pelaajat, JOUKKUEET, 1).filter((d) => d.id !== '_meta').flatMap((d) => d.data.rivit);
  const rivi = (id) => LL.tmListaSeuraRiviPelaajaksi(rivit.find((r) => r.id === id));
  const SU = require('../lib/tm_suostumus.js');   /* Seuran pelaajaRivi-badge: peruttu voittaa → annettu → pilotti → odottaa|luotu|tuotu → ei kutsua */
  const badge = (p) => SU.tmSuostumusPeruttu(p) ? 'peruttu' : SU.tmSuostumusAnnettu(p) ? 'annettu' : p.suostumusTila === 'pilotti' ? 'pilotti' : (p.suostumusTila === 'odottaa' || p.suostumusTila === 'luotu' || p.tuotu) ? 'odottaa' : 'ei_kutsua';
  it('suostumusluokka, puuttuva vuosi, PalloID ja joukkueet täsmäävät dokumentin kanssa', () => {
    pelaajat.forEach((x) => {
      const a = rivi(x.id);
      expect(badge(a)).toBe(badge(x.data));
      expect(T.tmSeuraPuuttuuVuosi(a)).toBe(T.tmSeuraPuuttuuVuosi(x.data));
      expect(a.palloID || '').toBe(x.data.palloID || ''); expect(a.joukkueet).toEqual(x.data.joukkueet); expect(a.talenttiOhjelma).toBe(x.data.talenttiOhjelma === true);
    });
  });
  it('EI pin-arvoa, EI huoltajan sähköpostia, EI terveyskenttiä — vain tosi/epätosi-merkit', () => {
    pelaajat.forEach((x) => { const a = rivi(x.id), s = JSON.stringify(a); expect(a.pin).toBeUndefined(); expect(a.huoltajaEmail).toBeUndefined(); expect(s).not.toMatch(/123456|@example\.org|kaytettavyys|loukkaantuminen/); expect(a._onPin).toBe(!!x.data.pin); expect(a._onHuoltaja).toBe(!!x.data.huoltajaEmail); });
  });
  it('nimetön pelaaja: etunimi/sukunimi tyhjät → henkiloNimi-sääntö antaa "Keskeneräinen kutsu", ei sähköpostia', () => {
    const a = LL.tmListaSeuraRiviPelaajaksi(L.tmListaSeuraRivi('x', { email: 'salainen@example.org', suostumusTila: 'odottaa' }));
    expect(a.etunimi).toBe(''); expect(a.sukunimi).toBe(''); expect(a.nimi).toBeUndefined(); expect(JSON.stringify(a)).not.toContain('salainen');
  });
});

describe('lippu ja HTML-vartijat', () => {
  it('lippu lista_seura rekisterissä (SA:n Liput-paneeli + asetaSeuranLippu hyväksyy), oletus pois', () => {
    expect(LIPUT.tmLippuTunnettu('lista_seura')).toBe(true); expect(LIPUT.tmLippuTila('lista_seura', null, null)).toEqual({ arvo: false, lahde: 'oletus' }); expect(LIPUT.tmLippuTila('lista_seura', { lista_seura: true }, null).arvo).toBe(true);
    expect(readFileSync(new URL('../functions/tm_liput.js', import.meta.url), 'utf8')).toBe(readFileSync(new URL('../lib/tm_liput.js', import.meta.url), 'utf8'));
  });
  it('Seura lataa lipun, yhteenvetokirjaston ja lukijan; seura_lista.js on mukana kuoren lähteessä', () => { expect(HTML).toContain('function paivitaSeuranLista'); const raaka = HTML; ['lib/tm_liput.js', 'lib/tm_lista_yhteenveto.js', 'lib/tm_lista_lataus.js'].forEach((s) => expect(raaka).toContain('<script src="' + s + '">')); });
  const lista = HTML.slice(HTML.indexOf('async function renderPelaajat'), HTML.indexOf('// NÄKYMÄ: JOUKKUEET'));
  it('Pelaajat-lista (renderPelaajat) ei lue koko seuran sisainen/terveys-dataa (Q3)', () => {
    expect(lista.length).toBeGreaterThan(3000);
    expect(lista).not.toMatch(/_seuraYhdista|tmSisainenLataaSeura|collectionGroup|tmTerveysLukuOpts|kaytettavyysNakyy|_renderKaytettavyys/);
    expect(lista).toContain('_lataaSeuranLista()');
  });
  it('rivi- ja otsikkosarake: ei Käytettävyys-saraketta listalla; käytettävyys vain pelaajakortilla (pkd-kaytettavyys) ja yhden pelaajan luvulla', () => {
    expect(HTML).not.toMatch(/<th>Käytettävyys<\/th>/); expect(HTML.slice(HTML.indexOf('function pelaajaRivi'), HTML.indexOf('function pelaajaRivi') + 2600)).not.toContain('_renderKaytettavyys');
    expect(HALLINTA).toContain('pkd-kaytettavyys-'); expect(HALLINTA).toContain('_paivitaKorttiKaytettavyys(pelaajaId, p)');
    const yhdista = HTML.slice(HTML.indexOf('async function _seuraYhdista'), HTML.indexOf('async function avaaKaytettavyysModal'));
    expect(yhdista).toContain('asetus && asetus.yksi'); expect(yhdista).toContain('tmSisainenLataaJaYhdistaYksi'); expect(yhdista).toContain('terveysLuku: [lista[0].id]');
  });
  it('kortit/tunnukset/PIN lukevat dokumentit tekohetkellä; listarivit eivät kanna PIN:iä tai sähköpostia', () => {
    ['tulostaKortit', 'lahetaTunnuksetHuoltajille', 'luoPuuttuvatPinit'].forEach((f) => { const i = HALLINTA.indexOf('async function ' + f + '('); expect(i, f).toBeGreaterThan(0); expect(HALLINTA.slice(i, i + 600), f).toContain('await _taydennaKohde(_tunnusKohde())'); });
    expect(lista).not.toMatch(/\.pin\b/); expect(lista).toContain('p._listaRivi && p._onHuoltaja');   // koosterivi → Linkki-nappi lukee osoitteen dokumentista (lahetaPelaajaLinkkiRivilta)
  });
  it('Arkistoidut: kolme rajattua yksikenttäkyselyä (poistettu / arkistoitu / aktiivinen=false), limit; palautus nollaa vain asetetut liput', () => {
    const a = HTML.slice(HTML.indexOf('const ARKISTO_RAJA'), HTML.indexOf('async function palautaArkistoitu'));
    expect(a).toContain("where('poistettu', '==', true)"); expect(a).toContain("where('arkistoitu', '==', true)"); expect(a).toContain("where('aktiivinen', '==', false)"); expect(a).toContain('.limit(ARKISTO_RAJA)');
    const p = HTML.slice(HTML.indexOf('async function palautaArkistoitu'), HTML.indexOf('async function palautaArkistoitu') + 900);
    expect(p).toContain('x.poistettu === true'); expect(p).toContain('x.arkistoitu === true'); expect(p).toContain('x.aktiivinen === false');
  });
  it('Päivitä nyt kutsuu paivitaListaSeura; Excel-tuonnin jälkeen vihje', () => {
    expect(HTML).toContain("httpsCallable('paivitaListaSeura'"); expect(readFileSync(new URL('../seura/seura_tuonti.js', import.meta.url), 'utf8')).toContain('ehdotaListanPaivitysta()');
  });
});
