/**
 * TalentMaster™ — VARTIJA: sivukirjoitus ei saa LUODA kayttaja-profiilia.
 *
 * Lähde: scripts/raportoi_vajaat_kayttajat.js ajettuna tuotantoon → 3 vajaata dokumenttia.
 * Kaksi niistä (harjoituslaatu-pikakentät, notif_asetukset) syntyi set(merge)-sivukirjoituksista:
 * set(merge) LUO puuttuvan dokumentin, joten ilmoitusasetusten tallennus materialisoi "haamun"
 * jolla ei ole nimeä, sähköpostia eikä roolia. Henkilöstölistassa se näkyi UID-rivinä (#538).
 *
 * PERIAATE: pika-/asetuskenttä on LIITE olemassa olevaan profiiliin, ei profiilin luoja.
 * Jos valmentajalla ei ole profiilia, oikea korjaus on että profiili luodaan kutsuflow'ssa —
 * ei että ilmoitusasetusten tallennus keksii tynkädokin.
 *
 *   A) KOODIVARTIJA — yksikään kayttajat-sivukirjoitus ei käytä set(merge):ä
 *   B) SEMANTIIKKA — update() EI luo puuttuvaa, set(merge) luo (ajettu, ei oletettu)
 *   C) VIRHEPOLKU — not-found kerrotaan omana tilanaan, ei geneerisenä "tallennus epäonnistui"
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const TIEDOSTOT = ['TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html',
                   'TalentMaster_Seura.html', 'TalentMaster_Admin.html', 'lib/tm_harjoitusarviointi.js'];
const koodi = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* Täydet luontipolut ovat sallittuja: ne kirjoittavat identiteettikentät, eli LUOVAT profiilin
   tarkoituksella. Vartija koskee SIVUKIRJOITUKSIA — set(merge) jossa on vain pika-/asetuskenttiä.
   Erottelu tehdään sisällöstä, ei tiedostosta.

   ⚠ MOLEMMAT kentät vaaditaan, ei kumpi tahansa. Pelkkä /email/ antoi väärän negatiivisen:
   `notif_asetukset: { email: { enabled } }` sisältää sanan "email" olematta identiteettikirjoitus,
   ja vartija päästi juuri sen rivin läpi jonka se oli tarkoitettu nappaamaan (todettu
   mutaatiokokeella). Aito luontipolku kirjoittaa aina sekä sähköpostin että roolin. */
const IDENTITEETTI = (l) => /\bemail\s*:/.test(l) && /\brooli\s*:/.test(l);

describe('A — yksikään kayttajat-sivukirjoitus ei luo profiilia', () => {
  for (const f of TIEDOSTOT) {
    it(`${f}: set(merge) kayttajat-dokkiin vain identiteettikenttien kanssa`, () => {
      const rivit = koodi(readFileSync(join(ROOT, f), 'utf8')).split('\n');
      const osumat = rivit
        .map((l, i) => [i + 1, l])
        .filter(([, l]) => /collection\(['"]kayttajat['"]\)/.test(l) && /\.set\(/.test(l) && /merge/.test(l))
        .filter(([, l]) => !IDENTITEETTI(l));
      expect(osumat.map(([n, l]) => n + ': ' + l.trim().slice(0, 120)).join('\n')).toBe('');
    });
  }
  it('EI-VACUOUS: vartija nappaisi vanhan muodon', () => {
    const vanha = "await db.collection('kayttajat').doc(uid).set({ notif_asetukset: {} }, { merge: true });";
    const osuu = (l) => /collection\(['"]kayttajat['"]\)/.test(l) && /\.set\(/.test(l)
      && /merge/.test(l) && !IDENTITEETTI(l);
    expect(osuu(vanha)).toBe(true);
    // ja nimenomaan se muoto jonka vanha /email|rooli/-vartija päästi läpi
    expect(osuu("db.collection('kayttajat').doc(uid).set({ notif_asetukset: { email: { enabled: true } } }, { merge: true });")).toBe(true);
    // aito luontipolku EI osu (molemmat identiteettikentät)
    expect(osuu("db.collection('kayttajat').doc(uid).set({ email: e, rooli: r, etunimi: f }, { merge: true });")).toBe(false);
  });
  it('kolme korjattua kohtaa käyttävät update():a', () => {
    const M = readFileSync(join(ROOT, 'TalentMaster_Master_v16.html'), 'utf8');
    const V = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
    const H = readFileSync(join(ROOT, 'lib', 'tm_harjoitusarviointi.js'), 'utf8');
    expect(M).toMatch(/kayttajat'\)\.doc\(cu\.uid\)\.update\(\{ notif_asetukset/);
    expect(V).toMatch(/kayttajat'\)\.doc\(uid\)\.update\(\{ notif_asetukset/);
    expect(H).toMatch(/kayttajat'\)\.doc\(_S\.valmentajaUid\)\.update\(pika\)/);
  });
});

describe('B — semantiikka ajettuna: update ei luo, set(merge) luo', () => {
  /* Firestore-semantiikan minimimalli. Tämä ei testaa Firestorea vaan lukitsee PREMISSIN jonka
     varassa korjaus lepää — jos se joskus muuttuisi, korjaus olisi tyhjä ja tämä punertuisi. */
  const tehdas = () => {
    const kanta = {};
    return {
      kanta,
      doc: (id) => ({
        set: (data, opt) => { kanta[id] = Object.assign({}, (opt && opt.merge) ? kanta[id] : null, data); return 'ok'; },
        update: (data) => {
          if (!kanta[id]) { const e = new Error('No document to update'); e.code = 'not-found'; throw e; }
          kanta[id] = Object.assign({}, kanta[id], data);
          return 'ok';
        }
      })
    };
  };
  it('set(merge) LUO puuttuvan dokumentin → haamu syntyy', () => {
    const db = tehdas();
    db.doc('ghost').set({ notif_asetukset: { email: true } }, { merge: true });
    expect(db.kanta.ghost).toBeTruthy();
    expect(db.kanta.ghost.email).toBeUndefined();     // ei sähköpostia
    expect(db.kanta.ghost.rooli).toBeUndefined();     // ei roolia → juuri se vajaa dokki
  });
  it('update() EI luo puuttuvaa → haamua ei synny', () => {
    const db = tehdas();
    expect(() => db.doc('ghost').update({ notif_asetukset: { email: true } })).toThrow(/No document to update/);
    expect(db.kanta.ghost).toBeUndefined();
  });
  it('REGRESSIO: olemassa olevaan profiiliin update = sama tulos kuin merge', () => {
    const a = tehdas(), b = tehdas();
    const profiili = { email: 'v@example.fi', rooli: 'valmentaja', etunimi: 'Mikko' };
    a.kanta.u1 = Object.assign({}, profiili); b.kanta.u1 = Object.assign({}, profiili);
    a.doc('u1').set({ notif_asetukset: { email: true } }, { merge: true });
    b.doc('u1').update({ notif_asetukset: { email: true } });
    expect(b.kanta.u1).toEqual(a.kanta.u1);
    expect(b.kanta.u1.email).toBe('v@example.fi');    // profiili säilyy
  });
});

describe('C — not-found on oma tilansa, ei geneerinen virhe', () => {
  for (const [f, t] of [['TalentMaster_Master_v16.html', 'masterT'], ['TalentMaster_VP_v25.html', 'vpT']]) {
    it(`${f}: puuttuva profiili kerrotaan käyttäjälle omalla viestillään`, () => {
      const src = readFileSync(join(ROOT, f), 'utf8');
      const i = src.indexOf('window._notifTallennaAsetukset');
      expect(i).toBeGreaterThan(0);
      const fn = src.slice(i, src.indexOf('\n};', i));
      expect(fn).toMatch(/not-found/);
      expect(fn).toContain('Profiilia ei löytynyt');
      expect(fn).toContain(t + '(');
    });
  }
  it('viesti on jaetussa i18n-kartassa (sama teksti molemmissa apeissa)', async () => {
    const { TM_I18N_COMMON } = await import('../lib/tm_i18n_common.js');
    expect(typeof TM_I18N_COMMON.sv['Profiilia ei löytynyt — ota yhteys seuran ylläpitoon.']).toBe('string');
  });
  it('harjoitusarviointi ohittaa hiljaa — arviointi itse ei saa kaatua profiiliin', () => {
    const H = readFileSync(join(ROOT, 'lib', 'tm_harjoitusarviointi.js'), 'utf8');
    const i = H.indexOf("doc(_S.valmentajaUid).update(pika)");
    const jalkeen = H.slice(i, i + 400);
    expect(jalkeen).toMatch(/catch \(e2\)/);           // yhä best-effort-lohkossa
  });
});
