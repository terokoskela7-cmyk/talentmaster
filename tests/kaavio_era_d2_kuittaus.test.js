/**
 * TalentMaster™ — Kaavio erä D2: "ymmärretty"-kuittaus + Cloud Function.
 *
 *   A) KIRJOITUSEHEYS — CF kirjoittaa TASAN yhden map-avaimen; clientin data ei laajenna sitä
 *   B) ESIEHDOT — olemassaolo · hyväksyntä · pelaajan olemassaolo · kohdistus, kukin omalla koodillaan
 *   C) PARITEETTI — vendoroitu functions/kaavio_policy.js vastaa lib/tm_kaavio_policy.js:ää
 *   D) CLIENT — optimistinen ✓ + localStorage-peili + palautus virheessä; §7.22: 0 lukua
 *   E) REHELLISYYS — identiteetti on ASSERTED, ei verifioitu; koodi sanoo sen ääneen
 *
 * (A) ja (E) ovat erän ydin. CF:n arvo EI ole identiteetti (anon-token ei kanna sitä) vaan se,
 * että kaavio-dokumenttia ei tarvitse avata pelaajan kirjoituksille. Jos kirjoitus voisi
 * laajentua clientin datasta, koko perustelu kaatuisi.
 *
 * functions/index.js alustaa admin SDK:n moduulitasolla → ei importattavissa Vitestiin (sama
 * rajoite kuin authz_paatos-testeissä). Puhdas logiikka testataan ajamalla, CF:n runko
 * lähdeväittein — ja emulaattori-sääntötesti (tests/rules/kaavio.rules.test.js) todistaa että
 * suora client-kirjoitus estyy, mikä on CF:n olemassaolon peruste.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const CF = readFileSync(join(ROOT, 'functions', 'index.js'), 'utf8');
const PEL = readFileSync(join(ROOT, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
const RULES = readFileSync(join(ROOT, 'tm_admin', 'firestore.rules'), 'utf8');

const { kaavioKohdistuuServer } = require_(join(ROOT, 'functions', 'kaavio_policy.js'));
const LIB = require_(join(ROOT, 'lib', 'tm_kaavio_policy.js'));

// CF:n runko lähteestä (ankkuroitu nimeen, ei rivinumeroon)
const cfRunko = (() => {
  const i = CF.indexOf('exports.kuittaaKaavioYmmarretty');
  expect(i).toBeGreaterThan(0);
  const j = CF.indexOf('\n  });', i);
  return CF.slice(i, j > i ? j + 6 : CF.length);
})();

describe('A — kirjoituseheys: tasan yksi map-avain', () => {
  it('update käyttää KIINTEÄÄ dot-polkua review.ymmarretty.<pid> + serverTimestamp', () => {
    expect(cfRunko).toMatch(/ref\.update\(\{\s*\['review\.ymmarretty\.' \+ pelaajaId\]:\s*admin\.firestore\.FieldValue\.serverTimestamp\(\)\s*\}\)/);
  });
  it('CF ei kirjoita mitään muuta — yksi ainoa write-kutsu', () => {
    expect((cfRunko.match(/\.(update|set|add|delete)\(/g) || [])).toEqual(['.update(']);
  });
  it('clientin data ei voi laajentaa kirjoitusta: vain kolme kenttää luetaan', () => {
    const luetut = [...cfRunko.matchAll(/data && data\.([a-zA-Z]+)/g)].map((m) => m[1]);
    expect([...new Set(luetut)].sort()).toEqual(['kaavioId', 'pelaajaId', 'seuraId']);
    expect(cfRunko).not.toMatch(/Object\.assign\(\s*\{\s*\}\s*,\s*data|\.\.\.data/);   // ei spreadia dataan
  });
  it('kaikki kolme argumenttia normalisoidaan merkkijonoksi ja vaaditaan', () => {
    ['seuraId', 'kaavioId', 'pelaajaId'].forEach((k) => {
      expect(cfRunko).toMatch(new RegExp('const ' + k + '\\s*=\\s*String\\('));
    });
    expect(cfRunko).toMatch(/invalid-argument/);
  });
  it('ei versiobumppia — Admin SDK ohittaa rulesin, joten versiolukko ei koske (eikä sitä saa kiertää datalla)', () => {
    expect(cfRunko).not.toMatch(/versio/i);
  });
});

describe('B — esiehdot omilla virhekoodeillaan', () => {
  const parit = [
    ['unauthenticated', /!context\.auth/],
    ['not-found', /!snap\.exists/],
    ['failed-precondition', /review\.status !== 'hyvaksytty'/],
    ['not-found', /!pelSnap\.exists/],
    ['permission-denied', /kaavioKohdistuuServer\(/]
  ];
  for (const [koodi, ehto] of parit) {
    it(`${koodi} — ${ehto.source.slice(0, 34)}`, () => {
      expect(cfRunko).toMatch(ehto);
      expect(cfRunko).toContain("'" + koodi + "'");
    });
  }
  it('joukkuerajaus lukee MOLEMMAT rakenteet (§18: joukkue + joukkueet[])', () => {
    expect(cfRunko).toMatch(/pel\.joukkue && joukkueet\.indexOf\(pel\.joukkue\) < 0/);
  });
});

describe('C — vendoroitu kohdistus vastaa libiä (pariteetti)', () => {
  const doc = (nakyvyys, extra) => ({ seuraId: 'A', review: Object.assign({ status: 'hyvaksytty', nakyvyys }, extra || {}) });
  const tapaukset = [
    ['seura-osuma', doc('seura'), { seuraId: 'A', joukkueet: [], pelaajaId: 'p1' }],
    ['seura-ohi', doc('seura'), { seuraId: 'B', joukkueet: [], pelaajaId: 'p1' }],
    ['joukkue-osuma', doc('joukkue', { joukkueId: 'u13' }), { seuraId: 'A', joukkueet: ['u13'], pelaajaId: 'p1' }],
    ['joukkue-ohi', doc('joukkue', { joukkueId: 'u15' }), { seuraId: 'A', joukkueet: ['u13'], pelaajaId: 'p1' }],
    ['joukkue-ilman-id', doc('joukkue'), { seuraId: 'A', joukkueet: ['u13'], pelaajaId: 'p1' }],
    ['pelaaja-osuma', doc('pelaaja', { pelaajaIds: ['p1'] }), { seuraId: 'A', joukkueet: [], pelaajaId: 'p1' }],
    ['pelaaja-ohi', doc('pelaaja', { pelaajaIds: ['p2'] }), { seuraId: 'A', joukkueet: [], pelaajaId: 'p1' }],
    ['tuntematon nakyvyys', doc('jokin_muu'), { seuraId: 'A', joukkueet: [], pelaajaId: 'p1' }],
    ['ei review-lohkoa', { seuraId: 'A' }, { seuraId: 'A', joukkueet: [], pelaajaId: 'p1' }]
  ];
  for (const [nimi, d, p] of tapaukset) {
    it(`${nimi}: server === lib`, () => {
      expect(kaavioKohdistuuServer(d, p)).toBe(LIB.kaavioKohdistuu(d, p));
    });
  }
  it('totuustaulu ei ole pelkkiä false-arvoja (ei-vacuous)', () => {
    const tulokset = tapaukset.map(([, d, p]) => kaavioKohdistuuServer(d, p));
    expect(tulokset.filter(Boolean).length).toBeGreaterThan(0);
    expect(tulokset.filter((x) => !x).length).toBeGreaterThan(0);
  });
  it('kopio on merkitty peiliksi (synkassapito näkyy koodissa)', () => {
    const src = readFileSync(join(ROOT, 'functions', 'kaavio_policy.js'), 'utf8');
    expect(src).toMatch(/PEILI|peili/);
    expect(src).toContain('lib/tm_kaavio_policy.js');
    expect(src).not.toMatch(/require\(['"]firebase/);   // puhdas → unit-testattava
  });
});

describe('D — client: optimistinen kuittaus ja palautus', () => {
  const fn = (nimi) => {
    const rivit = PEL.split('\n');
    const a = rivit.findIndex((l) => new RegExp('^(?:async\\s+)?function ' + nimi + '\\s*\\(').test(l));
    if (a < 0) return '';
    for (let i = a + 1; i < rivit.length; i++) if (rivit[i] === '}') return rivit.slice(a, i + 1).join('\n');
    return '';
  };
  it('kutsuu CF:ää oikeassa regionissa oikealla nimellä', () => {
    expect(fn('_p7KuittaaKaavio')).toMatch(/functions\('europe-west1'\)\.httpsCallable\('kuittaaKaavioYmmarretty'\)/);
  });
  it('lähettää vain sessiosta johdetut tunnisteet', () => {
    expect(fn('_p7KuittaaKaavio')).toMatch(/\{ seuraId: sid, kaavioId: k\.id, pelaajaId: pid \}/);
  });
  it('✓ näkyy HETI ja peilataan localStorageen', () => {
    const f = fn('_p7KuittaaKaavio');
    expect(f).toContain('optimistinen');
    expect(f).toContain('localStorage.setItem(_P7_KUITTAUS_LS');
  });
  it('epäonnistuminen PALAUTTAA tilan — lapselle ei jää valheellista ✓', () => {
    const f = fn('_p7KuittaaKaavio');
    const c = f.slice(f.indexOf('catch'));
    expect(c).toMatch(/delete km\[k\.id\]/);
    expect(c).toMatch(/tila\.innerHTML = palautaNappi/);
  });
  it('kanoninen kaavio ei yritä seurakohtaista kirjoitusta (ei kuittauskohdetta)', () => {
    expect(fn('_p7KuittaaKaavio')).toMatch(/vainPaikallinen[\s\S]*k\.kanoninen/);
  });
  it('kuitattu-tila lukee palvelimen totuuden TAI laitteen peilin', () => {
    const f = fn('_p7OnKuitattu');
    expect(f).toMatch(/review\.ymmarretty\[pid\]/);
    expect(f).toMatch(/_p7KuittausKartta\(\)\[k\.id\]/);
  });
  it('§7.22: kuittauspainikkeessa ja tilassa ei ole lukuja', () => {
    const teksti = fn('_p7KuittausNappiHTML').replace(/<[^>]*>/g, ' ');
    expect(teksti).not.toMatch(/\d+\s*\/\s*\d+|taso|piste/i);
  });
  it('kuittaustekstit kulkevat t():n läpi ja ovat fi/sv/en', () => {
    expect(fn('_p7KuittausNappiHTML')).toMatch(/_tKaavio\('kuitattu'\)/);
    expect(fn('_p7KuittausNappiHTML')).toMatch(/_tKaavio\('kuittaa'\)/);
    const lang = readFileSync(join(ROOT, 'lib', 'tm_lang.js'), 'utf8');
    ['Ymmärsin tämän', 'Jag förstod det här', 'I understood this'].forEach((x) => expect(lang).toContain(x));
  });
});

describe('E — rehellisyys: identiteetti on asserted, ei verifioitu', () => {
  it('CF ei väitä verifioivansa kutsujaa — rajoite on kirjoitettu auki', () => {
    const otsikko = CF.slice(CF.indexOf('KAAVIO ERÄ D2'), CF.indexOf('exports.kuittaaKaavioYmmarretty'));
    expect(otsikko).toMatch(/ASSERTED|asserted/);
    expect(otsikko).toMatch(/Anonymous Auth/);
    expect(otsikko).not.toMatch(/verifioi(tu|daan) (pelaaja|kutsuja)/i);
  });
  it('CF EI käytä context.auth.uid:tä pelaajaidentiteettinä (se on anon-uid)', () => {
    expect(cfRunko).not.toMatch(/context\.auth\.uid/);
  });
  it('client sanoo saman — ei "verifioitu"-lupausta pelaajalle', () => {
    const lohko = PEL.slice(PEL.indexOf('ERÄ D2 ·'), PEL.indexOf('window._p7KuittaaKaavio'));
    expect(lohko).toMatch(/ASSERTED|asserted/);
  });
});

describe('F — rules ja coverage', () => {
  it('kaaviot-update EI salli pelaajaa (CF:n olemassaolon peruste)', () => {
    const i = RULES.indexOf('match /kaaviot/{kaavioId}');
    const lohko = RULES.slice(i, RULES.indexOf('allow delete', i));
    expect(lohko).toMatch(/allow update:[\s\S]*onValmentajaRooli\(\)/);
    expect(lohko).not.toMatch(/allow update:[\s\S]*onAnonymous\(\)/);
  });
  it('VP näyttää kuittauskattavuuden hyväksytyille kaavioille', () => {
    const i = VP.indexOf('function _kaavioKorttiHTML('), j = VP.indexOf('function _kaavioNappiHTML(');
    const kortti = VP.slice(i, j);
    expect(kortti).toMatch(/review\.ymmarretty[\s\S]*Object\.keys/);
    expect(kortti).toMatch(/st === 'hyvaksytty' && _kuitt > 0/);   // ei "0 ymmärtänyt" -moitetta
  });
  it('coverage-teksti on käännetty (VP sv-kartta)', () => {
    expect(readFileSync(join(ROOT, 'lib', 'tm_vp_i18n.js'), 'utf8')).toContain("'pelaajaa kuitannut ymmärtäneensä':");
  });
});
