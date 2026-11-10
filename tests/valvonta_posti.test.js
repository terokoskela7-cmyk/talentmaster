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

/** Vale-https: tallentaa pyynnön ja vastaa annetulla tilakoodilla (rungossa osoite, jotta nähdään ettei sitä lokiteta). */
function valeHttps(tila, kirjaus) {
  return { request: (opts, cb) => {
    const kutsu = { opts, body: '' }; if (kirjaus) kirjaus.push(kutsu);
    return { on: () => {}, write: (b) => { kutsu.body += b; }, end: () => { const res = { statusCode: tila, on: (e, f) => { if (e === 'data') f('rungossa ' + OSOITE); if (e === 'end') f(); } }; cb(res); } };
  } };
}

describe('valvonta posti: vastaanottaja (P6, Secret Manager → env)', () => {
  it('kelpaa vain yksi kelvollinen osoite; tyhjä/useita/virheellinen → null', () => {
    expect(P.vastaanottaja({ VALVONTA_VASTAANOTTAJA: ' ' + OSOITE + ' ' })).toBe(OSOITE);
    ['', undefined, 'ei-osoite', 'a@b.fi, c@d.fi', 'a@b.fi;c@d.fi', 'a b@c.fi', '<a@b.fi>'].forEach((v) => expect(P.vastaanottaja({ VALVONTA_VASTAANOTTAJA: v }), String(v)).toBeNull());
    expect(P.vastaanottaja({})).toBeNull();
  });
});

describe('valvonta posti: lähetin', () => {
  const env = { GCLOUD_PROJECT: 'talentmaster-pilot', SENDGRID_API_KEY: 'SG.avain', VALVONTA_VASTAANOTTAJA: OSOITE };
  it('lähettää SendGridiin: seuranta pois, vastaanottaja payloadissa; EI lokita osoitetta, avainta eikä vastauksen runkoa', async () => {
    const kutsut = [], loki = hiljainen(), laheta = P.luoLahetin({ env, https: valeHttps(202, kutsut), loki });
    const r = await laheta({ subject: 'TalentMaster valvonta: 1 virhettä\nBcc: x', html: '<p>x</p>' });
    expect(r.ok).toBe(true); expect(kutsut.length).toBe(1); expect(kutsut[0].opts.hostname).toBe('api.sendgrid.com');
    const pl = JSON.parse(kutsut[0].body); expect(pl.personalizations[0].to[0].email).toBe(OSOITE); expect(pl.tracking_settings.click_tracking.enable).toBe(false); expect(pl.subject).not.toMatch(/\n/);
    expect(loki.l.join('\n')).not.toContain(OSOITE); expect(loki.l.join('\n')).not.toContain('SG.avain');
  });
  it('ei tuotantoprojekti (staging) → ESTETTY, ei https-kutsua', async () => {
    const kutsut = [], r = await P.luoLahetin({ env: Object.assign({}, env, { GCLOUD_PROJECT: 'talentmaster-staging' }), https: valeHttps(202, kutsut), loki: hiljainen() })({ subject: 's', html: 'h' });
    expect(r).toEqual({ ok: true, estetty: true }); expect(kutsut).toEqual([]);
  });
  it('puuttuva vastaanottaja / avain / SendGrid-virhe → heittää vain koodin (ei osoitetta)', async () => {
    await expect(P.luoLahetin({ env: Object.assign({}, env, { VALVONTA_VASTAANOTTAJA: '' }), https: valeHttps(202), loki: hiljainen() })({ subject: 's', html: 'h' })).rejects.toMatchObject({ koodi: 'vastaanottaja_puuttuu' });
    await expect(P.luoLahetin({ env: Object.assign({}, env, { SENDGRID_API_KEY: '' }), https: valeHttps(202), loki: hiljainen() })({ subject: 's', html: 'h' })).rejects.toMatchObject({ koodi: 'sendgrid_avain_puuttuu' });
    const e = await P.luoLahetin({ env, https: valeHttps(401), loki: hiljainen() })({ subject: 's', html: 'h' }).catch((x) => x);
    expect(e.koodi).toBe('sendgrid_401'); expect(JSON.stringify([e.message, e.koodi])).not.toContain(OSOITE);
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
