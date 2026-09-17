/**
 * Kaavio-moduulit (erä A): validaattori + policy. Puhtaat funktiot → tavallinen vitest, ei emulaattoria.
 * Renderöijä testataan erikseen headless-selaimella (vaatii DOMin).
 *
 * HUOM policy: tämä tiedosto testaa vain LOGIIKAN. Väite "sama logiikka kuin palvelimella" on
 * tests/rules/kaavio.rules.test.js:n pariteettilohkossa — se on ainoa paikka jossa lib ja rules
 * ajetaan samaa matriisia vasten.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const V = require('../lib/tm_kaavio_validate.js');
const P = require('../lib/tm_kaavio_policy.js');

const SPEC = () => ({
  avain: 't_h0', suunta: 'ylos', pelimuoto: '8v8',
  pelaajat: [
    { id: 'a', joukkue: 'oma', rooli: 'syöttäjä', x: 50, y: 60, pallo: true },
    { id: 'b', joukkue: 'oma', rooli: 'vastaanottaja', x: 62, y: 40, avoin: 45 },
    { id: 'x', joukkue: 'vastustaja', rooli: 'paine', x: 55, y: 50 }
  ],
  liikkeet: [{ id: 'l1', tyyppi: 'syotto', from: { ref: 'a' }, to: { ref: 'b' } }]
});

describe('validaattori · §6-portit', () => {
  it('kelpo spec läpäisee', () => expect(V.validoiKaavio(SPEC()).E).toEqual([]));

  it('viite-eheys: liike poistettuun pelaajaan HYLÄTÄÄN', () => {
    const s = SPEC(); s.liikkeet[0].to = { ref: 'poistettu' };
    expect(V.validoiKaavio(s).E.join(' ')).toContain('tuntemattomaan');
    expect(V.kaavioKelpaa(s)).toBe(false);
  });
  it('avain on ENUM: käännetty avain hylätään (C1)', () => {
    const s = SPEC(); s.avain = 'Havainnointi';
    expect(V.validoiKaavio(s).E.join(' ')).toContain('kanoninen');
  });
  it('pelimuoto-katto: 8v8 sallii max 8 per joukkue', () => {
    const s = SPEC();
    for (let i = 0; i < 8; i++) s.pelaajat.push({ id: 'o' + i, joukkue: 'oma', rooli: 'tuki', x: 10 + i, y: 10 });
    expect(V.validoiKaavio(s).E.join(' ')).toMatch(/omia \d+ > pelimuoto 8/);
  });
  it('koordinaatti rajan ulkona hylätään', () => {
    const s = SPEC(); s.pelaajat[0].x = 140;
    expect(V.validoiKaavio(s).E.join(' ')).toContain('rajan ulkona');
  });
  it('≤1 pallollinen', () => {
    const s = SPEC(); s.pelaajat[1].pallo = true;
    expect(V.validoiKaavio(s).E.join(' ')).toContain('useampi pallollinen');
  });
  // MUUTTUNUT SEMANTIIKKA (näkökenttä pelaajakohtaiseksi): vanha kytkös "cone vaatii tasan 1
  // vastaanottajan + avoin-kulman" on PURETTU tarkoituksella — kartio ei ole rooli vaan havainto,
  // ja jokaisella pelaajalla voi olla omansa. Legacy `spec.cone` sallitaan ilman virhettä;
  // migraatio (kaavioNormalisoiNakokentta) siirtää sen omistajalle kirjoitushetkellä.
  // Uudet per-pelaaja-portit: tests/kaavio_nakokentta.test.js.
  it('legacy spec.cone EI enää vaadi tasan yhtä vastaanottajaa', () => {
    const s = SPEC(); s.cone = { r: 12, half: 58 };
    expect(V.validoiKaavio(s).E).toEqual([]);
    s.pelaajat.push({ id: 'c', joukkue: 'oma', rooli: 'vastaanottaja', x: 30, y: 30 });
    expect(V.validoiKaavio(s).E).toEqual([]);
  });
  it('per-pelaaja nakokentta validoidaan (korvaa vanhan cone-portin)', () => {
    const s = SPEC(); s.pelaajat[0].nakokentta = { half: 58, r: 42 };
    expect(V.validoiKaavio(s).E).toEqual([]);
    s.pelaajat[0].nakokentta = { half: 0, r: 42 };
    expect(V.validoiKaavio(s).E.join(' ')).toContain('half rajan ulkona');
  });
  it('liiketyyppi on enumista', () => {
    const s = SPEC(); s.liikkeet[0].tyyppi = 'lentopallo';
    expect(V.validoiKaavio(s).E.join(' ')).toContain('tyyppi ei sallittu');
  });
});

describe('policy · statussiirrot', () => {
  const vp = { rooli: 'vp', seuraId: 'fcl' };
  const valm = { rooli: 'valmentaja', seuraId: 'fcl', joukkueet: ['fcl_u12'] };
  it('suora luonnos→hyvaksytty on kielletty kaikilta', () => {
    expect(P.kaavioSiirtoSallittu('luonnos', 'hyvaksytty', vp)).toBe(false);
    expect(P.kaavioSiirtoSallittu('luonnos', 'hyvaksytty', { superAdmin: true })).toBe(false);
  });
  it('luonnos→odottaa sallittu valmentajalle', () => expect(P.kaavioSiirtoSallittu('luonnos', 'odottaa', valm)).toBe(true));
  it('odottaa→hyvaksytty vain hyväksyjältä', () => {
    expect(P.kaavioSiirtoSallittu('odottaa', 'hyvaksytty', valm)).toBe(false);
    expect(P.kaavioSiirtoSallittu('odottaa', 'hyvaksytty', vp)).toBe(true);
  });
  it('hylatty→odottaa sallittu (uusi kierros)', () => expect(P.kaavioSiirtoSallittu('hylatty', 'odottaa', valm)).toBe(true));
  it('seurasihteeri EI ole hyväksyjä', () => expect(P.kaavioOnHyvaksyja({ rooli: 'seurasihteeri', seuraId: 'fcl' })).toBe(false));
  it('urheilutoimenjohtaja ON hyväksyjä', () => expect(P.kaavioOnHyvaksyja({ rooli: 'urheilutoimenjohtaja' })).toBe(true));
});

describe('policy · uudelleenhyväksyntä', () => {
  const doc = { seuraId: 'fcl', review: { status: 'hyvaksytty', joukkueId: 'fcl_u12' } };
  it('valmentajan muokkaus pudottaa odottamaan', () => {
    expect(P.kaavioTilaMuokkauksenJalkeen(doc, { rooli: 'valmentaja', seuraId: 'fcl', joukkueet: ['fcl_u12'] })).toBe('odottaa');
  });
  it('VP:n muokkaus säilyttää hyväksynnän', () => {
    expect(P.kaavioTilaMuokkauksenJalkeen(doc, { rooli: 'vp', seuraId: 'fcl' })).toBe('hyvaksytty');
  });
  it('ei-hyväksytty pysyy omassa tilassaan', () => {
    expect(P.kaavioTilaMuokkauksenJalkeen({ review: { status: 'luonnos' } }, { rooli: 'valmentaja' })).toBe('luonnos');
  });
});

describe('policy · skooppi', () => {
  const doc = { seuraId: 'fcl', review: { status: 'luonnos', joukkueId: 'fcl_u12' } };
  it('toisen seuran valmentaja ei kirjoita', () => {
    expect(P.kaavioVoiKirjoittaa(doc, { rooli: 'valmentaja', seuraId: 'kpv', joukkueet: ['fcl_u12'] })).toBe(false);
  });
  it('toisen joukkueen valmentaja ei kirjoita', () => {
    expect(P.kaavioVoiKirjoittaa(doc, { rooli: 'valmentaja', seuraId: 'fcl', joukkueet: ['fcl_u14'] })).toBe(false);
  });
  it('oman joukkueen valmentaja kirjoittaa', () => {
    expect(P.kaavioVoiKirjoittaa(doc, { rooli: 'valmentaja', seuraId: 'fcl', joukkueet: ['fcl_u12'] })).toBe(true);
  });
  it('kanoniseen kirjoittaa vain SA', () => {
    const kan = { kanoninen: true };
    expect(P.kaavioVoiKirjoittaa(kan, { rooli: 'vp', seuraId: 'fcl' })).toBe(false);
    expect(P.kaavioVoiKirjoittaa(kan, { superAdmin: true })).toBe(true);
  });
});

describe('policy · kohdistus on UI-suodatin (EI pakotettu)', () => {
  it('joukkuekohdistus osuu vain oman joukkueen pelaajaan', () => {
    const d = { seuraId: 'fcl', review: { status: 'hyvaksytty', nakyvyys: 'joukkue', joukkueId: 'fcl_u12' } };
    expect(P.kaavioKohdistuu(d, { seuraId: 'fcl', joukkueet: ['fcl_u12'] })).toBe(true);
    expect(P.kaavioKohdistuu(d, { seuraId: 'fcl', joukkueet: ['fcl_u14'] })).toBe(false);
  });
  it('mutta LUKU sallii hyväksytyn silti — kohdistus ei ole turvaraja', () => {
    const d = { seuraId: 'fcl', review: { status: 'hyvaksytty', nakyvyys: 'joukkue', joukkueId: 'fcl_u12' } };
    expect(P.kaavioVoiLukea(d, { anon: true })).toBe(true);
    expect(P.kaavioKohdistuu(d, { seuraId: 'fcl', joukkueet: ['fcl_u14'] })).toBe(false);
  });
});

/* ── UI-PORTIT (erä B2) ───────────────────────────────────────────────────────────────────
   DoD: napit tulevat policysta, ei UI-logiikasta. Kaksi väitettä: (1) policy palauttaa oikean
   valikoiman per rooli/tila, (2) VP_v25 ei sisällä omaa rinnakkaista oikeuslogiikkaa vaan kutsuu
   kaavioToiminnot/kaavioVoiLukea/kaavioVoiKirjoittaa. Ilman (2):ta UI voisi ajautua policysta
   erilleen ja näyttää nappeja joita palvelin ei hyväksy. */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __d = dirname(fileURLToPath(import.meta.url));
const VP = readFileSync(join(__d, '..', 'TalentMaster_VP_v25.html'), 'utf8');
// TAKTIIKKATAULUN UI ON NYT JAETUSSA LIBISSÄ (lib/tm_kaavio_ui.js) — sama koodi ajaa VP:ssä ja
// valmentajan apissa. Siksi UI:ta koskevat väitteet luetaan LIBISTÄ; `VP` jää niihin väitteisiin
// jotka koskevat nimenomaan VP:n omaa kytkentää (script-tagit, host-adapteri, sivupalkki).
const UI = readFileSync(join(__d, '..', 'lib', 'tm_kaavio_ui.js'), 'utf8');

describe('UI-portit · napit tulevat policysta', () => {
  const doc = (status) => ({ seuraId: 'fcl', review: { status, joukkueId: 'fcl_u12', versio: 0 } });
  const pelaaja = { anon: true };
  const valm = { rooli: 'valmentaja', seuraId: 'fcl', joukkueet: ['fcl_u12'] };
  const vp = { rooli: 'vp', seuraId: 'fcl' };

  it('pelaaja EI näe Muokkaa-nappia missään tilassa', () => {
    ['luonnos', 'odottaa', 'hyvaksytty', 'hylatty'].forEach((st) => {
      expect(P.kaavioToiminnot(doc(st), pelaaja)).not.toContain('muokkaa');
    });
  });
  it('pelaaja näkee kuittauksen VAIN hyväksytylle', () => {
    expect(P.kaavioToiminnot(doc('hyvaksytty'), pelaaja)).toContain('ymmarretty');
    expect(P.kaavioToiminnot(doc('odottaa'), pelaaja)).not.toContain('ymmarretty');
  });
  it('VP näkee hyväksy+hylkää VAIN odottavalle', () => {
    expect(P.kaavioToiminnot(doc('odottaa'), vp)).toEqual(expect.arrayContaining(['hyvaksy', 'hylkaa']));
    expect(P.kaavioToiminnot(doc('luonnos'), vp)).not.toContain('hyvaksy');
  });
  it('valmentaja ei näe hyväksy-nappia, mutta näkee ehdota', () => {
    const t = P.kaavioToiminnot(doc('luonnos'), valm);
    expect(t).toContain('ehdota');
    expect(t).not.toContain('hyvaksy');
  });
  it('toisen joukkueen valmentaja ei näe muokkaa/ehdota', () => {
    const t = P.kaavioToiminnot(doc('luonnos'), { rooli: 'valmentaja', seuraId: 'fcl', joukkueet: ['fcl_u14'] });
    expect(t).not.toContain('muokkaa');
    expect(t).not.toContain('ehdota');
  });
});

describe('UI-portit · VP_v25 ei duplikoi oikeuslogiikkaa', () => {
  it('kaaviolohko kutsuu policya (ei omaa rooli/tila-haarautumista)', () => {
    const i = UI.indexOf('KAAVIOPANKKI (erä B2)');
    expect(i).toBeGreaterThan(0);
    const lohko = UI.slice(i);
    ['kaavioVoiLukea(', 'kaavioToiminnot(', 'kaavioSiirtoSallittu(', 'kaavioTilaMuokkauksenJalkeen(', 'kaavioSeuraavaVersio(']
      .forEach((f) => expect(lohko, f).toContain(f));
    // ei omaa roolivertailua näkyvyyteen/hyväksyntään (rooli luetaan vain ctx:ään)
    expect(lohko).not.toMatch(/rooli\s*===?\s*'(vp|valmentaja|urheilutoimenjohtaja)'/);
    expect(lohko).not.toMatch(/status\s*===?\s*'hyvaksytty'\s*&&/);
  });
  it('write-path ajaa §6-validaattorin ENNEN kirjoitusta', () => {
    const i = UI.indexOf('async function _kaavioTallenna');
    const f = UI.slice(i, UI.indexOf('window.avaaKaaviopankki'));
    expect(f.indexOf('validoiKaavio(')).toBeGreaterThan(-1);
    expect(f.indexOf('validoiKaavio(')).toBeLessThan(f.indexOf('.update('));   // validointi ensin
  });
  it('write-path nostaa version jokaisessa kirjoituksessa', () => {
    const lohko = UI;   // koko jaettu UI-lib
    const updatet = lohko.split('.update(').length - 1;
    // Väite on INVARIANTTI (jokainen update nostaa version), ei kutsun kirjoitusasu: versionumero
    // lasketaan nyt muuttujaan ennen updatea, jotta paikallinen review voidaan synkata samalla
    // arvolla (editori jää tallennuksen jälkeen auki).
    const versiot = lohko.split("'review.versio':").length - 1;
    expect(lohko).toContain('kaavioSeuraavaVersio(');
    expect(updatet).toBeGreaterThan(0);
    expect(versiot).toBe(updatet);
  });
});

/* ENUM→NÄYTTÖ -VARTIJA (erä B2). Tila-, näkyvyys- ja nappilabelit renderöityvät MUUTTUJANA
   (vpT(kartta[avain])) → resolvi-portti ei näe niitä literaaleina. Tämä luokka jäi huomaamatta
   omassa koodissani kunnes LIVE-ajo näytti 'odottaa hyväksyntää' suomeksi sv-tilassa. Vartija
   vaatii jokaiselle enum-arvolle sv-rivin, jottei sama toistu. */
describe('enum→näyttö · jokaisella kaavio-enumilla on sv-rivi', () => {
  const kartta = readFileSync(join(__d, '..', 'lib', 'tm_vp_i18n.js'), 'utf8');
  const common = readFileSync(join(__d, '..', 'lib', 'tm_i18n_common.js'), 'utf8');
  const on = (k) => kartta.includes("'" + k + "':") || common.includes("'" + k + "':");

  it('statuslabelit', () => {
    ['luonnos', 'odottaa hyväksyntää', 'hyväksytty', 'hylätty'].forEach((k) => expect(on(k), k).toBe(true));
  });
  it('näkyvyyslabelit', () => {
    ['seura', 'joukkue', 'pelaaja'].forEach((k) => expect(on(k), k).toBe(true));
  });
  it('nappilabelit kattavat kaikki policyn palauttamat toiminnot', () => {
    const LBL = { muokkaa: 'Muokkaa', ehdota: 'Ehdota hyväksyttäväksi', hyvaksy: 'Hyväksy',
                  hylkaa: 'Hylkää', poista: 'Poista', ymmarretty: 'Ymmärsin', kysy: 'Kysy' };
    // kaikki mahdolliset toiminnot eri rooleilta/tiloilta
    const kaikki = new Set();
    [{ anon: true }, { rooli: 'valmentaja', seuraId: 'f', joukkueet: ['j'] }, { rooli: 'vp', seuraId: 'f' }, { superAdmin: true }]
      .forEach((ctx) => ['luonnos', 'odottaa', 'hyvaksytty', 'hylatty'].forEach((st) => {
        P.kaavioToiminnot({ seuraId: 'f', review: { status: st, joukkueId: 'j' } }, ctx).forEach((t) => kaikki.add(t));
      }));
    expect(kaikki.size).toBeGreaterThan(4);
    [...kaikki].forEach((t) => {
      expect(LBL[t], 'label puuttuu toiminnolta ' + t).toBeTruthy();
      expect(on(LBL[t]), 'sv puuttuu: ' + LBL[t]).toBe(true);
    });
  });
});
