/** Projekti 07 / PR 4: valvonnan virhesähköposti (functions/valvonta_posti.js) + kytkentä valvonta.js:ään. Vale-https/vale-db; ei tuotantoyhteyttä. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = require('../functions/valvonta_posti.js');
const VA = require('../functions/valvonta.js');
const R = require('../lib/tm_valvonta_raportti.js');
const OSOITE = 'tero.valvonta@example.com';
const hiljainen = () => { const l = []; return { l, log: (m) => l.push(String(m)), error: (m) => l.push('E:' + m) }; };
const rap = (rivit, extra) => R.tmVRaportti(Object.assign({ tulokset: rivit, ajettu: '2026-11-17T03:30:00.000Z', tyyppi: 'paivittain', edellinen: [] }, extra || {}));
const virhe = { seura: 's1', koodi: 'E6', kokoelma: 'pelaajat', lkm: 2, taso: 'virhe' };
const varoitus = { seura: 's1', koodi: 'E5b', kokoelma: 'seuranta_kuittaukset', lkm: 3, taso: 'varoitus' };

describe('valvonta posti: vastaanottaja (P6, Secret Manager → env)', () => {
  it('kelpaa vain yksi kelvollinen osoite; tyhjä/useita/virheellinen → null', () => {
    expect(P.vastaanottaja({ VALVONTA_VASTAANOTTAJA: ' ' + OSOITE + ' ' })).toBe(OSOITE);
    ['', undefined, 'ei-osoite', 'a@b.fi, c@d.fi', 'a@b.fi;c@d.fi', 'a b@c.fi', '<a@b.fi>'].forEach((v) => expect(P.vastaanottaja({ VALVONTA_VASTAANOTTAJA: v }), String(v)).toBeNull());
    expect(P.vastaanottaja({})).toBeNull();
  });
});

describe('valvonta posti: lähetin', () => {
  const env = { VALVONTA_VASTAANOTTAJA: OSOITE };
  it('kutsuu lahetaSahkoposti-funktiota hiljaisessa tilassa: vastaanottaja env:stä, otsikon rivinvaihdot pois', async () => {
    const kutsut = []; const laheta = P.luoLahetin({ env, laheta: async (x) => { kutsut.push(x); return { ok: true }; } });
    const r = await laheta({ subject: 'TalentMaster valvonta: 1 virhettä\nBcc: x', html: '<p>x</p>' });
    expect(r.ok).toBe(true); expect(kutsut[0]).toMatchObject({ to: OSOITE, hiljainen: true, html: '<p>x</p>' }); expect(kutsut[0].subject).not.toMatch(/\n/);
  });
  it('puuttuva vastaanottaja → ei kutsua, koodi vastaanottaja_puuttuu; lähetysvirhe → vain koodi (ei osoitetta)', async () => {
    const kutsut = [];
    await expect(P.luoLahetin({ env: { VALVONTA_VASTAANOTTAJA: '' }, laheta: async (x) => { kutsut.push(x); } })({ subject: 's', html: 'h' })).rejects.toMatchObject({ koodi: 'vastaanottaja_puuttuu' }); expect(kutsut).toEqual([]);
    const e = await P.luoLahetin({ env, laheta: async () => { throw Object.assign(new Error('x ' + OSOITE), { koodi: 'sendgrid_401' }); } })({ subject: 's', html: 'h' }).catch((x) => x);
    expect(e.koodi).toBe('sendgrid_401'); expect(JSON.stringify([e.message, e.koodi])).not.toContain(OSOITE);
  });
  it('index.js: lahetaSahkoposti hiljaisessa tilassa ei lokita osoitetta eikä vastauksen runkoa; valvonta käyttää sitä', () => {
    const idx = readFileSync(join(ROOT, 'functions/index.js'), 'utf8'), f = idx.slice(idx.indexOf('async function lahetaSahkoposti('), idx.indexOf('async function lahetaSahkoposti(') + 3500);
    expect(f).toContain("hiljainen ? '(vastaanottaja ei lokiin)' : to"); expect(f).toContain("hiljainen ? '(runko ei lokiin)' : body");
    expect(idx).toMatch(/luoLahetin\(\{ laheta: lahetaSahkoposti \}\)/);
  });
});

describe('valvonta posti: milloin lähetetään (P4: vain virheistä)', () => {
  const kokeile = async (raportti, tyyppi, lahetin) => { const lahetetyt = [], loki = hiljainen(); const r = await P.kasittele({ laheta: lahetin || (async (v) => { lahetetyt.push(v); return { ok: true }; }), loki }, raportti, tyyppi); return { r, lahetetyt, loki }; };
  it('päivittäin: uusi virhe → posti; sama virhe edelleen auki → ei postia; pelkkä varoitus → ei postia', async () => {
    const a = await kokeile(rap([virhe]), 'paivittain'); expect(a.r).toEqual({ lahetetty: true, syy: 'ok' }); expect(a.lahetetyt[0].subject).toMatch(/1 virhettä \(1 uutta\)/);
    expect((await kokeile(rap([virhe], { edellinen: [virhe] }), 'paivittain')).r.syy).toBe('ei_aihetta');
    expect((await kokeile(rap([varoitus]), 'paivittain')).r.syy).toBe('ei_aihetta');
  });
  it('päivittäin: käsittelemättä jäänyt seura laukaisee; kasvanut virhe laukaisee', async () => {
    expect((await kokeile(rap([], { eiEhtinyt: ['s2'] }), 'paivittain')).r.lahetetty).toBe(true);
    expect((await kokeile(rap([virhe], { edellinen: [Object.assign({}, virhe, { lkm: 1 })] }), 'paivittain')).r.lahetetty).toBe(true);
  });
  it('viikko: yhteenveto sisältää varoitukset; ei mitään kerrottavaa → ei postia', async () => {
    const v = await kokeile(rap([varoitus], { tyyppi: 'viikko' }), 'viikko'); expect(v.r.lahetetty).toBe(true); expect(v.lahetetyt[0].html).toContain('Varoitukset');
    expect((await kokeile(rap([], { tyyppi: 'viikko' }), 'viikko')).r.syy).toBe('ei_aihetta');
  });
  it('viesti sisältää vain seura-id/koodi/kokoelma/lkm; ei sähköpostia', async () => {
    const a = await kokeile(rap([virhe]), 'paivittain'), t = a.lahetetyt[0].subject + a.lahetetyt[0].html;
    expect(t).toContain('E6 · s1 · pelaajat · 2'); expect(R.tmVOnkoPii(t, []).ok).toBe(true);
  });
  it('lähetysvirhe ei heitä: lokiin vain koodi', async () => {
    const a = await kokeile(rap([virhe]), 'paivittain', async () => { throw Object.assign(new Error('x ' + OSOITE), { koodi: 'sendgrid_401' }); });
    expect(a.r).toEqual({ lahetetty: false, syy: 'virhe' }); expect(a.loki.l.join('\n')).toContain('koodi=sendgrid_401'); expect(a.loki.l.join('\n')).not.toContain(OSOITE);
  });
});

/** Vale-db kuten valvonta_ajastettu.test.js:ssä (yksi seura, E6-tupla). */
function fakeDb() {
  const lisaykset = [], snap = (d) => ({ docs: d, size: d.length }), doc = (id, data) => ({ id, data: () => data });
  const tupla = [{ nimi: 'Matti Meikalainen', tunniste: '555', joukkue: 'u12' }, { nimi: 'Matti Meikalainen', tunniste: '555', joukkue: 'u12' }];
  return { lisaykset, collectionGroup: () => ({ get: async () => snap([]) }),
    collection: (n) => ({ select: () => ({ get: async () => snap([doc('s1', {})]) }), doc: () => ({ collection: (k) => ({ get: async () => snap(k === 'pelaajat' ? tupla.map((d, i) => doc('p' + i, d)) : []) }) }),
      where: () => ({ where: () => ({ orderBy: () => ({ get: async () => snap([]) }) }), orderBy: () => ({ limit: () => ({ get: async () => snap([]) }) }) }), add: async (r) => { lisaykset.push(r); return {}; } }) };
}
const FV = { serverTimestamp: () => 'TS' };
describe('valvonta posti: kytkentä ajoon', () => {
  const KIRJOITUS = Date.parse('2026-11-17T03:30:00Z'), KUIVA = Date.parse('2026-11-16T09:00:00Z');
  it('kuiva jakso: ei auditia eikä postia; kirjoitusjakso: audit ENSIN, sitten posti', async () => {
    const jarjestys = [], posti = async () => { jarjestys.push('posti'); return { ok: true }; };
    const k = fakeDb(); const r1 = await VA.aja({ db: k, FieldValue: FV, loki: hiljainen(), nytMs: KUIVA, posti }, 'paivittain');
    expect(r1.kuiva).toBe(true); expect(k.lisaykset).toEqual([]); expect(jarjestys).toEqual([]);
    const v = fakeDb(), orig = v.collection; v.collection = (n) => { const c = orig(n); if (n === 'audit') { const a = c.add; c.add = async (r) => { jarjestys.push('audit'); return a(r); }; } return c; };
    const r2 = await VA.aja({ db: v, FieldValue: FV, loki: hiljainen(), nytMs: KIRJOITUS, posti }, 'paivittain');
    expect(r2.kirjattu).toBe(true); expect(r2.posti).toEqual({ lahetetty: true, syy: 'ok' }); expect(jarjestys).toEqual(['audit', 'posti']);
  });
  it('postin virhe ei kaada ajoa eikä peru audit-riviä', async () => {
    const v = fakeDb(); const r = await VA.aja({ db: v, FieldValue: FV, loki: hiljainen(), nytMs: KIRJOITUS, posti: async () => { throw new Error('rikki'); } }, 'paivittain');
    expect(r.kirjattu).toBe(true); expect(v.lisaykset.length).toBe(1); expect(r.posti.syy).toBe('virhe');
  });
});

describe('valvonta posti: rakenne ja hälytyksen lokimerkki (P8)', () => {
  const idx = readFileSync(join(ROOT, 'functions/index.js'), 'utf8'), va = readFileSync(join(ROOT, 'functions/valvonta.js'), 'utf8'), po = readFileSync(join(ROOT, 'functions/valvonta_posti.js'), 'utf8');
  it('molemmat ajastukset hakevat SENDGRID_API_KEY + VALVONTA_VASTAANOTTAJA Secret Managerista', () => {
    expect((idx.match(/secrets: \['SENDGRID_API_KEY', 'VALVONTA_VASTAANOTTAJA'\]/g) || []).length).toBe(2);
  });
  it('postimoduulissa ei Firestore-kirjoitusta eikä vastaanottajan lokitusta', () => {
    expect(po).not.toMatch(/\.(set|update|delete|add|batch|runTransaction)\(|collection\(/); expect(po).not.toMatch(/(log|error)\([^)]*\bto\b/);
  });
  it('jokaisesta ajosta (myös kuivasta) tulee vakiomuotoinen lokirivi, johon Monitoring-mittari (docs/VALVONTA_HALYTYS.md) perustuu', async () => {
    const loki = hiljainen(); await VA.aja({ db: fakeDb(), FieldValue: FV, loki, nytMs: Date.parse('2026-11-16T09:00:00Z') }, 'viikko');
    expect(loki.l.find((x) => /^valvonta (paivittain|viikko)( KUIVA)? valmis · ERROR \d+ · WARN \d+/.test(x))).toBeTruthy();
    expect(va).toContain("'valvonta ' + tyyppi + (kuiva ? ' KUIVA' : '') + ' valmis · ERROR '");
  });
});
