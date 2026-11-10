/** Projekti 07 / PR 2: käsiajuri scripts/valvonta_aja.js + lukukerros functions/valvonta_luku.js. Ajetaan vale-Firestorella (fake_admin.cjs, -r hook), ei tuotantoa.
 *  Vartioidaan: vain luku, tuloste ennallaan (golden, --nyt kiinnittää ajan), kenttävahti näkyy tulosteessa, lukuvirheestä ei vuoda mitään, sallittujen lista kelvollinen. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIX = join(ROOT, 'tests/fixtures/valvonta');
const V = require('../lib/tm_valvonta.js');
const NYT = '--nyt=2026-11-10T12:00:00Z';
function aja(args, env) {
  const r = spawnSync('node', ['-r', join(FIX, 'fake_admin.cjs'), join(ROOT, 'scripts/valvonta_aja.js'), NYT, ...(args || [])], { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, env || {}) });
  return { ulos: r.stdout, virhe: r.stderr, status: r.status };
}
const rivi = (t, koodi, seura, kok) => t.split('\n').find((l) => l.indexOf(' ' + koodi + ' ') >= 0 && l.indexOf(' ' + seura + ' ') >= 0 && (!kok || l.indexOf(' ' + kok + ' ') >= 0));

describe('käsiajuri: tuloste', () => {
  it('golden: tuloste ennallaan samalla vale-datalla (ajan kiinnittää --nyt)', () => {
    const r = aja(); expect(r.status, r.virhe).toBe(0);
    expect(r.ulos).toBe(readFileSync(join(FIX, 'aja.golden.txt'), 'utf8'));
  });
  it('tunnetut saastumiset näkyvät: E1a, E2, E3 (kayttajat ja sisainen), E5, E6, E7 (vain alle 7 pv vanhat estot)', () => {
    const { ulos } = aja();
    expect(rivi(ulos, 'E1a', 'alfa', 'toimenpiteet')).toMatch(/ERROR/); expect(rivi(ulos, 'E2', 'beta', 'pelaajat')).toMatch(/ERROR/);
    expect(rivi(ulos, 'E3', 'gamma', 'kayttajat')).toMatch(/1 \/ 4/); expect(rivi(ulos, 'E3', 'delta', 'sisainen')).toMatch(/1 \/ 2/);
    expect(rivi(ulos, 'E5', 'beta', 'seuranta_kuittaukset')).toMatch(/ERROR/);
    expect(rivi(ulos, 'E7', 'alfa', 'audit')).toMatch(/ 2$/); expect(rivi(ulos, 'E7', 'beta', 'audit')).toBeUndefined();
  });
  it('KENTTÄVAHTI näkyy suoraan: viestit ja harjoitusarvioinnit (0 %) saavat VAROITUS: kenttä puuttuu (kokoelma, osuus); toimenpiteet ok; kalenterilla ei ole joukkuetapahtumia → ei vartioitavaa', () => {
    const { ulos } = aja();
    ['viestit', 'harjoitusarvioinnit'].forEach((k) => {
      expect(ulos).toContain('‼ VAROITUS: kenttä puuttuu (' + k + ', osuus 0 %)');
      expect(rivi(ulos, 'F1', 'alfa', k)).toMatch(/WARN .*kenttä puuttuu; osuus 0 %/);
    });
    expect(ulos).toMatch(/toimenpiteet\s+360\s+100 % .*OK/); expect(ulos).not.toContain('kenttä puuttuu (toimenpiteet'); expect(ulos).not.toContain('kenttä puuttuu (kalenteri');
    expect(ulos).toMatch(/kalenteri\s+2400\s+–\s+\(ei dokumentteja, joilta joukkueviite odotetaan/);
    expect(ulos).toContain('kokoelmassa ei dokumentteja — ei vartioitavaa');
    expect(ulos).toMatch(/pelaajat\s+160\s+100 % +joukkue 92\.5, joukkueNimi 7\.5, joukkueId 0, joukkueet 92\.5, joukkueetNimet 0/);   // per kenttä: joukkueId 0 % = arvattu väärin
    expect(ulos).not.toMatch(/ K2 /); expect(ulos).not.toMatch(/seuranta_kuittaukset +\d+ +\d+ %/);
  });
  it('--raaka ja --kaikki toimivat; P10: demo ohitetaan oletuksena ja näkyy vain --kaikki-ajossa', () => {
    const oletus = aja([], { FAKE_DEMO: '1' }), kaikki = aja(['--kaikki'], { FAKE_DEMO: '1' });
    expect(oletus.status).toBe(0); expect(oletus.ulos).not.toMatch(/ demo +\S/); expect(oletus.ulos).toContain('luettu 5 · tarkistettu 4');
    expect(rivi(kaikki.ulos, 'E1a', 'demo', 'toimenpiteet')).toMatch(/5 \/ 5/); expect(kaikki.ulos).toContain('ohitettu (P10) ei yhtään');
    expect(aja(['--raaka']).ulos).toBe(aja().ulos);   // sallittujen lista on tyhjä → sama tuloste
  });
  it('--sallitut-luonnos: JSON-taulukko nykyisistä poikkeamista, perustelu tyhjä (ei läpäise validointia ennen kuin PM täyttää)', () => {
    const r = aja(['--sallitut-luonnos']), lista = JSON.parse(r.ulos);
    expect(lista.length).toBeGreaterThan(10); expect(lista[0]).toEqual({ seura: expect.any(String), koodi: expect.any(String), kokoelma: expect.any(String), enimmaismaara: expect.any(Number), perustelu: '', paiva: '2026-11-10' });
    expect(V.tmVSallitutVirheet(lista).length).toBe(lista.length);
    expect(V.tmVSallitutVirheet(lista.map((x) => Object.assign(x, { perustelu: 'perusteltu PM:n hyväksymänä' })))).toEqual([]);
    expect(lista.every((x) => x.koodi !== 'E1a' || x.enimmaismaara > 0)).toBe(true);
  });
  it('lukuvirhe yhdessä seurassa: muut jatkavat, virheestä näkyy vain seura-id ja koodi (ei message, jossa on polku ja nimi)', () => {
    const r = aja([], { FAKE_VIRHE: '1' });
    expect(r.status, r.virhe).toBe(0);
    expect(r.ulos).toContain('LUKUVIRHE seura=beta koodi=permission-denied'); expect(r.ulos).toContain('seuroja luettu 3 · tarkistettu 3');
    expect(r.ulos + r.virhe).not.toMatch(/SALAINEN|Meikäläinen|Missing permission/); expect(r.ulos).not.toMatch(/ beta +pelaajat/);
  });
});

describe('PR 2b: todelliset kenttämuodot ja luonnediagnostiikka', () => {
  const DIAG = join(ROOT, 'scripts/diag_valvonta_luonne.js');
  function diag(env) { const r = spawnSync('node', ['-r', join(FIX, 'fake_admin.cjs'), DIAG, NYT, '--kaikki'], { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, env || {}) }); return { ulos: r.stdout, virhe: r.stderr, status: r.status }; }
  it('FAKE_PR2B: alfan kalenteri/viestit/kooste/toimenpiteet antavat täsmälleen odotetut E1-luvut (0 väärää orpoa vanhentuneesta nimestä, "A · B"-nimestä tai seuratason tapahtumasta)', () => {
    const { ulos } = aja([], { FAKE_PR2B: '1' });
    expect(rivi(ulos, 'E1a', 'alfa', 'kalenteri')).toMatch(/ 1 \/ 609$/); expect(rivi(ulos, 'E1b', 'alfa', 'kalenteri')).toMatch(/ 1 \/ 609$/);   // p7 toisen seuran, p4 haamu-id; p1/p2/p3/p5/p6 puhtaita
    expect(rivi(ulos, 'E1c', 'alfa', 'kalenteri')).toMatch(/^WARN  E1c .* 1 \/ 609$/);   // kirjoitusasu 'Alfa-U13!' = WARN, ei ERROR
    expect(rivi(ulos, 'E1b', 'alfa', 'kalenteri')).toMatch(/^WARN  E1b/);
    expect(rivi(ulos, 'E1a', 'alfa', 'viestit')).toMatch(/ 1 \/ 703$/); expect(rivi(ulos, 'E1b', 'alfa', 'viestit')).toMatch(/ 1 \/ 703$/);
    expect(rivi(ulos, 'E1a', 'alfa', 'kooste_joukkue')).toMatch(/ 1 \/ 3$/); expect(rivi(ulos, 'E1b', 'alfa', 'kooste_joukkue')).toMatch(/ 1 \/ 3$/);
    expect(rivi(ulos, 'E1a', 'alfa', 'mentoroinnit')).toBeUndefined(); expect(rivi(ulos, 'E1b', 'alfa', 'mentoroinnit')).toBeUndefined();
    expect(rivi(ulos, 'E1a', 'alfa', 'toimenpiteet')).toBeDefined(); expect(ulos).toMatch(/kalenteri +7 +85\.7 %/);   // F1-populaatio: 6 joukkuetapahtumaa, 5:llä kenttä
    expect(ulos).not.toMatch(/ K2 /);
  });
  it('diag_valvonta_luonne: E6-ryhmät ja orpojen luonne lukumäärinä; ei nimiä, tunnisteita eikä id:itä; vain luku', () => {
    const r = diag({ FAKE_PR2B: '1' }); expect(r.status, r.virhe).toBe(0);
    expect(r.ulos).toContain('## E6: samaa tunnistetta käyttävät pelaajadokumentit — ryhmiä 35'); expect(r.ulos).toMatch(/alfa:1 beta:1 delta:1 gamma:1 +ei +0 \/ 4 +0 \/ 4 +ei +numeerinen_muu +kyllä/);
    expect(r.ulos).toMatch(/yhteenveto: ryhmää, joissa KAIKKI dokumentit ovat §10-testipelaajia: 0 \/ 35/);
    expect(r.ulos).toMatch(/alfa +kalenteri +2 +1 +0 +0 +1 +0/); expect(r.ulos).toMatch(/alfa +kooste_joukkue +1 +0 +0 +0 +1 +0/);
    ['alfa_p', 'Topias', 'm93GB', '1005'].forEach((k) => expect(r.ulos + r.virhe, k).not.toContain(k));
    expect(readFileSync(DIAG, 'utf8')).toContain('admin.initializeApp({ projectId: projekti })'); expect(readFileSync(DIAG, 'utf8')).toContain('if (require.main !== module) throw');
  });
  it('PR 2c: paikallinen diagnostiikka näyttää orpo → lähin oma joukkue -parit (nimet vain tässä tulosteessa), K1-erittelyn ja kalenterin F1-erittelyn', () => {
    const r = diag({ FAKE_PR2B: '1' }); expect(r.status, r.virhe).toBe(0);
    expect(r.ulos).toContain('## E1b/E1c: orpo viite → lähin oma joukkue (PAIKALLINEN'); expect(r.ulos).toMatch(/alfa +kalenteri +1 +"Alfa-U13!" +"Alfa U13" +kirjoitusasu +0/);
    expect(r.ulos).toMatch(/alfa +kalenteri +2 +"roikkuva_j9" +"alfa_j0" +etäisyys/);
    expect(r.ulos).toContain('## K1-erittely'); expect(r.ulos).toMatch(/alfa +avoimia 60 · ryhmiä 5 · suurin 26/); expect(r.ulos).toContain('raaka-arvot "Alfa U12" ×26');
    expect(r.ulos).toContain('## Kalenterin F1: harjoitukset/ottelut, joilta joukkueviite puuttuu (1 / 7)'); expect(r.ulos).toContain('  tyyppi: harjoitus 1'); expect(r.ulos).toContain('  kohde.tyyppi: joukkue 1');
  });
  it('PR 2c: --alias-luonnos tulostaa vain kirjoitusasu-parit JSON:ina (perustelu tyhjä → ei läpäise validointia ennen PM:n täyttöä)', () => {
    const r = spawnSync('node', ['-r', join(FIX, 'fake_admin.cjs'), DIAG, NYT, '--kaikki', '--alias-luonnos'], { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { FAKE_PR2B: '1' }) });
    const l = JSON.parse(r.stdout); expect(l).toEqual([{ seura: 'alfa', alias: 'Alfa-U13!', joukkue: 'alfa_j0', perustelu: '', paiva: '2026-11-10' }]);
    expect(V.tmVAliasVirheet(l)).toEqual(['rivi 1: perustelu puuttuu']); expect(V.tmVAliasVirheet(l.map((x) => Object.assign(x, { perustelu: 'vanha kirjoitusasu, PM hyväksynyt' })))).toEqual([]);
  });
  it('aliaslista-tiedosto on kelvollinen eikä sisällä sähköpostia', () => {
    const j = JSON.parse(readFileSync(join(ROOT, 'functions/valvonta_aliakset.json'), 'utf8')); expect(j.versio).toBe(1); expect(V.tmVAliasVirheet(j.rivit)).toEqual([]);
    expect(require('../lib/tm_valvonta_raportti.js').tmVOnkoPii(j, []).ok).toBe(true);
  });
  it('sallittujen lista: KPV:n 12 kuitattua/hylättyä vierasta ehdotusta (9.11. seuranvaihtovika), perustelu ja päivä mukana; yli 12 hälyttää uudelleen', () => {
    const j = JSON.parse(readFileSync(join(ROOT, 'functions/valvonta_sallitut.json'), 'utf8'));
    expect(j.rivit).toEqual([{ seura: 'kpv', koodi: 'E1a', kokoelma: 'toimenpiteet', enimmaismaara: 12, perustelu: '9.11. seuranvaihtovika #1234, siivottu, säilytetään historiana', paiva: '2026-11-10' }]);
    const t = (lkm) => V.tmVSovellaSallitut([{ seura: 'kpv', koodi: 'E1a', kokoelma: 'toimenpiteet', lkm, taso: 'virhe' }], j.rivit)[0];
    expect(t(12)).toMatchObject({ taso: 'ok', sallittu: true }); expect(t(13)).toMatchObject({ taso: 'virhe', ylittaaSallitun: true });
  });
});

describe('käsiajuri: PII ja rajat', () => {
  it('tuloste ei sisällä pelaajan nimeä, pelaaja-id:tä, PalloID:tä, uid:ta eikä joukkueiden nimiä', () => {
    const { ulos, virhe } = aja(['--kaikki'], { FAKE_DEMO: '1' });
    ['Kadonnut', 'Vieras', 'alfa_p', 'Alfa U13', 'Alfa U12', 'Beta U13', 'Beta P11', 'Gamma U10', 'Delta U13', 'Demo U13', ' S12', '1005', 'v0', 'w1', 'l1'].forEach((k) => expect(ulos + virhe, k).not.toContain(k));
    expect(V.tmVJoukkuekentat([{ joukkue: 'x', 'Maija joukkue': 'y' }])).toEqual({ joukkue: 100 });
  });
  it('tuloste ei sisällä sähköpostia: PII-vartija pysäyttää ajon, jos sellainen päätyisi tulosteeseen', () => {
    const R = require('../lib/tm_valvonta_raportti.js');
    expect(R.tmVOnkoPii('WARN F1 a b 1', []).ok).toBe(true); expect(R.tmVOnkoPii('LUKUVIRHE x@y.fi', []).ok).toBe(false);
    expect(readFileSync(join(ROOT, 'scripts/valvonta_aja.js'), 'utf8')).toContain('tuloste hylätty: PII-vartija');
  });
  it('rakenne: ADC ilman SA-avainta, require.main-vartija, virheestä vain koodi', () => {
    const src = readFileSync(join(ROOT, 'scripts/valvonta_aja.js'), 'utf8');
    expect(src).not.toMatch(/credential\.cert|serviceAccount|applicationDefault\(\)\s*,\s*\{/); expect(src).toContain('admin.initializeApp({ projectId: projekti })');
    expect(src).toContain('if (require.main !== module) throw'); expect(src).toMatch(/console\.error\('Virhe: ' \+ R\.tmVTurvallinenVirhe\(e\)\.koodi\)/);
  });
});

describe('sallitut-tiedosto ja lukukerros', () => {
  it('functions/valvonta_sallitut.json on kelvollinen (jokaisella rivillä perustelu + päivä) eikä sisällä sähköpostia', () => {
    const j = JSON.parse(readFileSync(join(ROOT, 'functions/valvonta_sallitut.json'), 'utf8'));
    expect(j.versio).toBe(1); expect(Array.isArray(j.rivit)).toBe(true); expect(V.tmVSallitutVirheet(j.rivit)).toEqual([]);
    expect(require('../lib/tm_valvonta_raportti.js').tmVOnkoPii(j, []).ok).toBe(true);
  });
  it('lukukerros: luetaan vain, db:ssä ei kirjoitusmetodeja; sisainen ryhmitellään polun seuran mukaan; audit rajataan 7 pv', async () => {
    const L = require('../functions/valvonta_luku.js');
    const kutsut = [];
    const tyhja = { docs: [], size: 0 };
    const doc = (id, data, path) => ({ id, data: () => data, ref: { path } });
    const db = {
      collection: (n) => ({
        select: () => ({ get: async () => ({ docs: [doc('s1', {}, 'seurat/s1')] }) }),
        doc: () => ({ collection: (k) => ({ get: async () => { kutsut.push(k); return k === 'joukkueet' ? { docs: [doc('j1', { nimi: 'J Yksi' }, 'x')] } : (k === 'kayttajat' ? { docs: [doc('u1', { seuraId: 's1' }, 'x')] } : tyhja); } }) }),
        where: (...a) => ({ where: (...b) => ({ orderBy: (kentta, suunta) => ({ get: async () => { kutsut.push(n + ':' + a[2] + ':' + b[1] + ':' + (b[2] instanceof Date) + ':' + kentta + ':' + suunta); return { docs: [doc('a1', { seuraId: 's1', aikaleima: { toMillis: () => 5 }, uid: 'EI-TALTEEN' }, 'audit/a1')] }; } }) }) })
      }),
      collectionGroup: (n) => ({ get: async () => { kutsut.push('cg:' + n); return { docs: [doc('d', { seuraId: 's2', teksti: 'EI-TALTEEN' }, 'seurat/s1/pelaajat/p/sisainen/d')] }; } })
    };
    const a = await L.kerayAineisto(db, { nytMs: 1000000 });
    expect(a.virheet).toEqual([]); expect(a.seurat.length).toBe(1);
    expect(a.seurat[0].joukkueet).toEqual([{ id: 'j1', nimi: 'J Yksi' }]); expect(a.seurat[0].kayttajat).toEqual(['u1']);
    expect(a.seurat[0].kokoelmat.sisainen).toEqual([{ _id: 'd', seuraId: 's2' }]);   // vain seuraId talteen
    expect(a.auditRivit.length).toBe(2); expect(a.auditRivit[0]).toEqual({ toiminto: 'kayttaja_toisen_seuran_estetty', seuraId: 's1', aikaleimaMs: 5 });
    expect(JSON.stringify(a.auditRivit)).not.toContain('EI-TALTEEN'); expect(kutsut).toContain('cg:sisainen'); expect(kutsut.filter((k) => k.indexOf('audit:') === 0).length === 2 && kutsut.filter((k) => k.indexOf('audit:') === 0).every((k) => k.endsWith(':true:aikaleima:desc'))).toBe(true);
    L.SEURAN_KOKOELMAT.forEach((k) => expect(kutsut).toContain(k));
  });
  it('lukukerros: yhden seuran virhe ei kaada muita; virheestä vain koodi', async () => {
    const L = require('../functions/valvonta_luku.js');
    const tyhja = { docs: [] };
    const db = { collection: () => ({ select: () => ({ get: async () => ({ docs: [{ id: 'hyva' }, { id: 'rikki' }] }) }), doc: (sid) => ({ collection: () => ({ get: async () => { if (sid === 'rikki') throw Object.assign(new Error('polku seurat/rikki/pelaajat/UID123 Matti'), { code: 'unavailable' }); return tyhja; } }) }) }),
      collectionGroup: () => ({ get: async () => { throw Object.assign(new Error('x Matti'), { code: 'failed-precondition' }); } }) };
    const a = await L.kerayAineisto(db, { nytMs: 1 });
    expect(a.seurat.map((s) => s.sid)).toEqual(['hyva']); expect(a.virheet).toContainEqual({ seura: 'rikki', koodi: 'unavailable' }); expect(a.virheet).toContainEqual({ seura: '-', koodi: 'sisainen_failed-precondition' });
    expect(JSON.stringify(a.virheet)).not.toMatch(/Matti|UID123/);
  });
});
