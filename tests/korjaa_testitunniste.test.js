/** Projekti 07 / PR 2c: korjaa_testitunniste.js (kirjoittava, kuiva-ajo oletus) ja diag_e6_vertailu.js (vain luku). Vale-db: tests/fixtures/valvonta/muisti_db.cjs. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = require('../scripts/korjaa_testitunniste.js');
const E = require('../scripts/diag_e6_vertailu.js');
const { luo } = require('./fixtures/valvonta/muisti_db.cjs');

const kpv = (id, etu, suku, t, extra) => [id, Object.assign({ etunimi: etu, sukunimi: suku, tunniste: t, palloId: t }, extra || {})];
function maailma(opts) {
  const o = opts || {}, p = {};
  [kpv('m93GBdOaGCUuenMiCL0I', 'Topias', 'O´Koskela', '12345678'), kpv('kp2', 'Maija', 'Meikäläinen', '22222222'), kpv('kp3', 'Maija', 'Meikäläinen', '22222222')].forEach(([i, d]) => { p[i] = d; });
  const sjk = { s1: { etunimi: 'Oikea', sukunimi: 'Pelaaja', tunniste: '12345678' }, s2: { etunimi: 'Toinen', sukunimi: 'Pelaaja', tunniste: '99000001' } };   // 99000001 on jo käytössä → uusi arvo valitaan seuraava
  if (o.toinenTesti) p.kp4 = kpv('kp4', 'Topias', 'O´Koskela', '12345678')[1];
  return luo({ seurat: { kpv: {}, sjk: {} }, 'seurat/kpv/pelaajat': p, 'seurat/sjk/pelaajat': sjk,
    'seurat/kpv/pelaajat/kp2/havainnot': { h1: { x: 1 }, h2: { x: 1 } }, 'seurat/kpv/pelaajat/kp3/havainnot': { h1: { x: 1 } }, 'seurat/kpv/pelaajat/kp2/testitulokset': { t1: { x: 1 } } });
}

describe('korjaa_testitunniste', () => {
  it('suunnitelma: vain KPV:n §10-testipelaaja; uusi arvo on uniikki (ohittaa jo käytössä olevan 99000001); SJK ja muut KPV-pelaajat eivät ole mukana', async () => {
    const db = maailma(), s = K.suunnittele(await K.lue(db));
    expect(s.ehdokkaat.length).toBe(1); expect(s.epaselvat.length).toBe(0);
    const e = s.ehdokkaat[0]; expect(e).toMatchObject({ sid: 'kpv', pid: 'm93GBdOaGCUuenMiCL0I', uusi: '99000002', kentat: ['tunniste', 'palloId'], toisetSeurat: { sjk: 1 }, toisetTestiarvoisia: 1, toisetLkm: 1 });
    expect(db.kirjoitukset).toEqual([]);   // suunnittelu ei kirjoita
  });
  it('kuiva-ajo-raportti: ei nimiä, vanhaa tunnistetta eikä id:itä; kertoo SJK-puolen testiarvoisuuden lukuna', async () => {
    const db = maailma(), s = K.suunnittele(await K.lue(db)), t = K.raportti(s, false, null);
    expect(t).toContain('KUIVA-AJO (ei kirjoita)'); expect(t).toContain('uusi testiarvo 99000002'); expect(t).toMatch(/sjk:1 \(EIVÄT muutu\) · niistä tunniste testiarvoinen: KYLLÄ 1 \/ 1 → pyydä oikea PalloID seuralta/);
    ['12345678', 'Topias', 'Koskela', 'm93GB', 'Maija', 'kp2', 's1'].forEach((x) => expect(t, x).not.toContain(x));
    expect(require('../lib/tm_valvonta_raportti.js').tmVOnkoPii(t, ['12345678', 'Topias']).ok).toBe(true);
  });
  it('--aja: kirjoittaa täsmälleen yhden dokumentin (KPV:n testipelaaja), vain kentät joissa vanha arvo oli; SJK ja muut KPV-pelaajat koskemattomat; toinen ajo ei löydä mitään', async () => {
    const db = maailma(), a = await K.lue(db), s = K.suunnittele(a);
    for (const e of s.ehdokkaat) await K.kirjoita(db, a, e);
    expect(db.kirjoitukset).toEqual([{ polku: 'seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I', kentat: ['tunniste', 'palloId'] }]);
    expect(db.store['seurat/kpv/pelaajat'].m93GBdOaGCUuenMiCL0I).toMatchObject({ tunniste: '99000002', palloId: '99000002', etunimi: 'Topias' });
    expect(db.store['seurat/sjk/pelaajat'].s1.tunniste).toBe('12345678'); expect(db.store['seurat/kpv/pelaajat'].kp2.tunniste).toBe('22222222');
    const uusi = K.suunnittele(await K.lue(db)); expect(uusi.ehdokkaat).toEqual([]);   // idempotentti
  });
  it('turva: ei-§10-nimi ei koskaan kirjoiteta (vaikka tunniste törmäisi); ei muu seura; epäselvä ryhmä (kaksi §10-pelaajaa) ohitetaan', async () => {
    const db = maailma(), a = await K.lue(db);
    await expect(K.kirjoita(db, a, { sid: 'sjk', pid: 's1', vanha: '12345678', uusi: '99000009', kentat: ['tunniste'] })).rejects.toThrow('vain KPV');
    await expect(K.kirjoita(db, a, { sid: 'kpv', pid: 'kp2', vanha: '22222222', uusi: '99000009', kentat: ['tunniste'] })).rejects.toThrow('§10');
    expect(db.kirjoitukset).toEqual([]);
    const db2 = maailma({ toinenTesti: true }), s2 = K.suunnittele(await K.lue(db2)); expect(s2.ehdokkaat).toEqual([]); expect(s2.epaselvat.length).toBeGreaterThan(0);
  });
  it('turva: uusi arvo joka on jo käytössä (myös numerona tai palloID-kentässä) tai vanha arvo muuttunut → ei kirjoiteta', async () => {
    const db = maailma(), a = await K.lue(db), e = K.suunnittele(a).ehdokkaat[0];
    db.store['seurat/sjk/pelaajat'].s2 = { etunimi: 'X', sukunimi: 'Y', palloID: e.uusi };
    await expect(K.kirjoita(db, a, e)).rejects.toThrow('uniikki');
    delete db.store['seurat/sjk/pelaajat'].s2.palloID;
    db.store['seurat/kpv/pelaajat'].m93GBdOaGCUuenMiCL0I.tunniste = '55555555'; db.store['seurat/kpv/pelaajat'].m93GBdOaGCUuenMiCL0I.palloId = '55555555';
    await expect(K.kirjoita(db, a, e)).rejects.toThrow('vanha arvo muuttunut'); expect(db.kirjoitukset).toEqual([]);
  });
  it('rakenne: kuiva-ajo on oletus (--aja vaaditaan kirjoitukseen), ADC ilman SA-avainta, kirjoitus vain seurat/kpv/pelaajat', () => {
    const src = readFileSync(join(ROOT, 'scripts/korjaa_testitunniste.js'), 'utf8');
    expect(src).toContain("argv.indexOf('--aja') >= 0"); expect(src).toContain('if (aja) {'); expect(src).not.toMatch(/credential\.cert|serviceAccount/); expect(src).toContain('admin.initializeApp({ projectId');
    expect((src.match(/tx\.update\(/g) || []).length).toBe(1); expect(src).not.toMatch(/\.(set|delete|add|create)\(/);
    expect(src).toContain("db.collection('seurat').doc(SALLITTU_SEURA).collection('pelaajat').doc(e.pid)");
  });
});

describe('diag_e6_vertailu (vain luku)', () => {
  it('vertaa samannimiset dokumentit samassa seurassa: A = enemmän dataa; vain lukuja ja kyllä/ei', async () => {
    const db = maailma(), a = await K.lue(db);
    const p = db.store['seurat/kpv/pelaajat']; p.kp2.huoltajaEmail = 'vanhempi@example.com'; p.kp2.pin = '1234'; p.kp2.suostumusTila = 'annettu'; p.kp3.suostumusTila = 'odottaa';
    const aineisto = { seurat: [{ sid: 'kpv', kokoelmat: { pelaajat: Object.keys(p).map((id) => Object.assign({ _id: id }, p[id])) } }, { sid: 'sjk', kokoelmat: { pelaajat: Object.keys(db.store['seurat/sjk/pelaajat']).map((id) => Object.assign({ _id: id }, db.store['seurat/sjk/pelaajat'][id])) } }] };
    const t = await E.vertaa(db, aineisto);
    expect(t).toContain('ryhmiä 1'); expect(t).toContain('ryhmä 1 · seura kpv · dokumentteja 2'); expect(t).toMatch(/alikokoelma havainnot +2 +1/); expect(t).toMatch(/alikokoelma testitulokset +1 +0/);
    expect(t).toMatch(/huoltajaEmail olemassa +kyllä +ei/); expect(t).toMatch(/PIN olemassa +kyllä +ei/); expect(t).toMatch(/suostumusTila +annettu +odottaa/); expect(t).toContain('→ A:ssa on 2 alikokoelmadokumenttia enemmän kuin B:ssä'); expect(t).toContain('EI KORJAUSTA');
    ['vanhempi@example.com', '1234', 'Maija', 'Meikäläinen', 'kp2', 'kp3', '22222222', 'Topias'].forEach((x) => expect(t, x).not.toContain(x));
    expect(db.kirjoitukset).toEqual([]);
    expect(readFileSync(join(ROOT, 'scripts/diag_e6_vertailu.js'), 'utf8')).not.toMatch(/\.(set|update|delete|add|create)\(|runTransaction|'terveys'\)/);
  });
});
