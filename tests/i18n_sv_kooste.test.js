/* sv-käännöskooste (scripts/i18n_kooste.cjs): koonti, duplikaattien yhdistys ja tuonti takaisin erille.
 * Tuonti KAATUU, jos avain puuttuu tai ylimääräinen avain on mukana. Testit ajavat erien kopioilla (tmp), ei oikeilla tiedostoilla.
 * Testi ei kirjoita ruotsia: täytearvot ovat koneellisia (fi-teksti + merkki). */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, mkdtempSync, rmSync, cpSync, readdirSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tmpdir } from 'os';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = require('../scripts/i18n_kooste.cjs');
const ERA_DIR = join(juuri, 'docs/i18n');
const kooste = () => JSON.parse(readFileSync(join(ERA_DIR, 'sv_kaannoserae_kooste.json'), 'utf8'));

let tmp;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'svkooste-'));
  for (const f of readdirSync(ERA_DIR)) if (/^sv_kaannoserae_.*\.json$/.test(f)) cpSync(join(ERA_DIR, f), join(tmp, f));
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

/* Tekaisutäyte: koneellinen, säilyttää paikanvaraajat ja välilyönnit (ei kieltä) */
const tayta = (k) => { for (const r of Object.values(k.rivit)) r.sv = r.fi.replace(/\{gen\}/g, '') + '·'; return k; };
const luku = (hak, era) => JSON.parse(readFileSync(join(hak, 'sv_kaannoserae_' + era + '.json'), 'utf8'));

describe('sv-kooste — koonti', () => {
  it('kooste täsmää erien tyhjiin riveihin (ei puuttuvia, ei ylimääräisiä)', () => {
    expect(K.tarkista(kooste(), tmp)).toEqual([]);
  });
  it('rivimäärät: ennen duplikaatteja = avaimia, jälkeen = koosteen rivit; sama fi vain kerran', () => {
    const k = kooste();
    const avaimia = Object.values(k.rivit).reduce((s, r) => s + r.avaimet.length, 0);
    expect(k._rivit_ennen_duplikaatteja).toBe(avaimia);
    expect(k._rivit_duplikaattien_jalkeen).toBe(Object.keys(k.rivit).length);
    const fit = Object.values(k.rivit).map((r) => r.fi);
    expect(new Set(fit).size).toBe(fit.length);
    expect(K.tyhjatRivit(tmp).length).toBe(avaimia);
  });
  it('jokaisella rivillä on näkymä, lukija ja käyttöyhteys; sv on tyhjä', () => {
    for (const [id, r] of Object.entries(kooste().rivit)) {
      expect(r.sv, id).toBe('');
      expect(r.nakyma, id).toBeTruthy();
      expect(r.nakyma, id).not.toBe('(ei määritelty)');
      expect(r.lukija.length, id).toBeGreaterThan(0);
      expect(r.kayttoyhteys, id).toBeTruthy();
    }
  });
  it('kokoa() tuottaa saman sisällön kuin tiedostossa (ilman koodiviitteitä)', () => {
    const uusi = K.kokoa(tmp, { koodiviitteet: false }).rivit;
    const vanha = kooste().rivit;
    expect(Object.keys(uusi)).toEqual(Object.keys(vanha));
    for (const id of Object.keys(uusi)) { expect(uusi[id].fi).toBe(vanha[id].fi); expect(uusi[id].avaimet).toEqual(vanha[id].avaimet); }
  });
});

describe('sv-kooste — tuonti kaatuu virheestä', () => {
  it('puuttuva avain (rivi poistettu koosteesta) kaataa', () => {
    const k = tayta(kooste()); delete k.rivit.r010;
    const v = K.tarkista(k, tmp, { tayta: true });
    expect(v.some((x) => x.startsWith('PUUTTUVA'))).toBe(true);
    expect(K.vie(k, tmp, { kirjoita: true }).virheet.length).toBeGreaterThan(0);
  });
  it('puuttuva avain (avain poistettu yhdistetyltä riviltä) kaataa', () => {
    const k = tayta(kooste()); const id = Object.keys(k.rivit).find((i) => k.rivit[i].avaimet.length > 1);
    k.rivit[id].avaimet.pop();
    expect(K.tarkista(k, tmp).some((x) => x.startsWith('PUUTTUVA'))).toBe(true);
  });
  it('ylimääräinen rivi kaataa', () => {
    const k = tayta(kooste());
    k.rivit.r999 = { fi: 'Tätä ei ole', sv: 'x', avaimet: [{ era: '5', osio: 'vp_kartta', avain: 'Tätä ei ole' }] };
    expect(K.tarkista(k, tmp).some((x) => x.startsWith('YLIMÄÄRÄINEN'))).toBe(true);
    expect(K.vie(k, tmp, { kirjoita: true }).kirjoitettu).toBe(0);
  });
  it('ylimääräinen avain olemassa olevalla rivillä kaataa', () => {
    const k = tayta(kooste());
    k.rivit.r001.avaimet.push({ era: '5', osio: 'vp_kartta', avain: 'ei-ole-olemassa' });
    expect(K.tarkista(k, tmp).some((x) => x.startsWith('YLIMÄÄRÄINEN'))).toBe(true);
  });
  it('sama avain kahdessa rivissä kaataa', () => {
    const k = tayta(kooste()); k.rivit.r002.avaimet.push(k.rivit.r001.avaimet[0]);
    expect(K.tarkista(k, tmp).some((x) => x.includes('kahdesti'))).toBe(true);
  });
  it('muutettu fi kaataa', () => {
    const k = tayta(kooste()); k.rivit.r003.fi += ' !';
    expect(K.tarkista(k, tmp).some((x) => x.startsWith('fi muuttunut'))).toBe(true);
  });
  it('tyhjä sv, eroavat paikanvaraajat ja eroava reunavälilyönti kaatavat viennin', () => {
    const k = tayta(kooste());
    k.rivit.r004.sv = '';
    const pid = Object.keys(k.rivit).find((i) => /\{[a-zA-Z]+\}/.test(k.rivit[i].fi) && !k.rivit[i].fi.includes('{gen}'));
    k.rivit[pid].sv = k.rivit[pid].fi.replace(/\{[a-zA-Z]+\}/, '');
    const vid = Object.keys(k.rivit).find((i) => /^\s|\s$/.test(k.rivit[i].fi));
    if (vid) k.rivit[vid].sv = k.rivit[vid].sv.trim();
    const v = K.tarkista(k, tmp, { tayta: true }).join('\n');
    expect(v).toMatch(/r004: sv tyhjä/); expect(v).toContain(pid + ': paikkamerkit eroavat');
    if (vid) expect(v).toContain(vid + ': alku-/loppuvälilyönti');
  });
  it('Geminin "kysymys" ilman sv:tä näkyy virheessä', () => {
    const k = tayta(kooste()); k.rivit.r005.sv = ''; k.rivit.r005.kysymys = 'onko tämä koodia?';
    expect(K.tarkista(k, tmp, { tayta: true }).join('\n')).toContain('onko tämä koodia?');
  });
  it('virheellä ei kirjoiteta mitään erätiedostoihin', () => {
    const ennen = Object.fromEntries(K.ERAT.map((e) => [e, readFileSync(join(tmp, 'sv_kaannoserae_' + e + '.json'), 'utf8')]));
    const k = tayta(kooste()); delete k.rivit.r010;
    K.vie(k, tmp, { kirjoita: true });
    for (const e of K.ERAT) expect(readFileSync(join(tmp, 'sv_kaannoserae_' + e + '.json'), 'utf8')).toBe(ennen[e]);
  });
});

describe('sv-kooste — tuonti onnistuu', () => {
  it('täytetty kooste viedään kaikkiin erärivilleen; muu sisältö ja muotoilu ennallaan', () => {
    const ennen = Object.fromEntries(K.ERAT.map((e) => [e, luku(tmp, e)]));
    const k = tayta(kooste());
    const kuiva = K.vie(k, tmp, { kirjoita: false });
    expect(kuiva.virheet).toEqual([]);
    expect(K.tyhjatRivit(tmp).length).toBe(k._rivit_ennen_duplikaatteja);   // kuiva-ajo ei kirjoittanut
    const t = K.vie(k, tmp, { kirjoita: true });
    expect(t.virheet).toEqual([]); expect(t.kirjoitettu).toBe(k._rivit_ennen_duplikaatteja);
    expect(K.tyhjatRivit(tmp)).toEqual([]);
    for (const r of Object.values(k.rivit)) {
      for (const a of r.avaimet) {
        const E = K.lueEra(tmp, a.era); const rivit = a.era === 's11' ? E.J.rivit : E.J.osiot[a.osio].rivit;
        expect(rivit[a.avain].sv).toBe(r.sv);
        expect(rivit[a.avain].fi).toBe(r.fi);
      }
    }
    /* vain sv-kentät muuttuneet */
    for (const e of K.ERAT) {
      const nyt = luku(tmp, e); const poista = (o) => JSON.parse(JSON.stringify(o, (key, v) => (key === 'sv' && typeof v === 'string' ? undefined : v)));
      expect(poista(nyt)).toEqual(poista(ennen[e]));
    }
  });
  it('toinen ajo on idempotentti; erä, jossa on jo eri sv, ei ylikirjoitu', () => {
    const k = tayta(kooste());
    expect(K.vie(k, tmp, { kirjoita: true }).virheet).toEqual([]);
    expect(K.vie(k, tmp, { kirjoita: true }).virheet).toEqual([]);   // jo viety: tarkista ei vaadi tyhjää erää
    const k2 = tayta(kooste()); k2.rivit.r001.sv = 'toinen';
    const v = K.vie(k2, tmp, { kirjoita: true }).virheet;
    expect(v.join('\n')).toContain('ei ylikirjoiteta');
  });
});
