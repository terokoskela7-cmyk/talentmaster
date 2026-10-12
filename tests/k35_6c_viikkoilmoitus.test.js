/* K35-6c (D192): viikkoilmoitus — client: Täytä viikko leimaa erän (viikko_era), ilmoitusrivi 'viikko' (ei nimiä), näkyy viikon loppuun, tm_lang-avaimet. Functions: functions/test/kalenteri_viikko_notif.test.js. */
const fs = require('fs'), path = require('path');
const IL = require('../lib/tm_kalenteri_ilmoitus.js'), VP = require('../lib/tm_viikkopohja.js');
const LANG = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tm_lang.js'), 'utf8'), FN = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8'), KV = fs.readFileSync(path.join(__dirname, '..', 'functions', 'kalenteri_viikko.js'), 'utf8');
const t = (k) => k;   // tm_lang ei vielä tunne avainta → t palauttaa avaimen → fi-varateksti

describe('tmEhdotusDoc: viikko_era', () => {
  it('era annettu → viikko_era; ei annettu → kenttää ei ole (Uusi tapahtuma / sarja ei laukaise viikkoilmoitusta)', () => {
    const e = { pvm: '2026-10-20', alkaa: '17:30', paattyy: '19:00', nimi: 'Treeni' };
    expect(VP.tmEhdotusDoc(e, { joukkue: 'KPV U13', joukkueId: 'kpv_u13', uid: 'u1', era: 'vabc' }).doc.viikko_era).toBe('vabc'); expect('viikko_era' in VP.tmEhdotusDoc(e, { joukkue: 'KPV U13', joukkueId: 'kpv_u13', uid: 'u1' }).doc).toBe(false);
  });
});
describe('Täytä viikko -vahvistus: yksi erä-tunniste koko batchille', () => {
  it('kaikki erän dokumentit saman viikko_era:n (era luodaan kerran per vahvistus, ei per tapahtuma)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tm_kalenteri_taytto.js'), 'utf8');
    expect(src).toContain("era = 'v' + Date.now().toString(36)"); expect(src).toContain('pelaajat: env.pelaajat() || [], era: era }');
  });
});
describe('ilmoitusrivi: viikko', () => {
  const n = (v, o) => Object.assign({ tyyppi: 'viikko', teksti: 'Uusi viikko-ohjelma: viikko 43', ilmoitus: { tyyppi: 'viikko', viikko: v, maara: 4 }, linkki: 'kalenteri:viikko:' + v, luettu: false }, o || {});
  it('runko kootaan kutsujan kielellä: ei nimiä/aikoja, vain viikkonumero', () => {
    const r = IL.tmIlmoitusRivi(n('2026-W43'), [], new Date(2026, 9, 20, 12), t); expect(r.runko).toBe('Uusi viikko-ohjelma: viikko 43'); expect(r.paiva).toBeNull(); expect(r.nakyvissa).toBe(true);
    expect(IL.tmIlmoitusRivi(n('2026-W43'), [], new Date(2026, 9, 20), null).runko).toBe('Uusi viikko-ohjelma: viikko 43');   // ilman t():tä varateksti
  });
  it('näkyy viikon loppuun (su 23:59), sen jälkeen piiloon; viallinen tunniste → näkyy (ennallaan)', () => {
    expect(IL.tmViikonLoppu('2026-W43').getTime()).toBe(new Date(2026, 9, 25, 23, 59, 59, 999).getTime());   // vk 43/2026 = 19.–25.10.
    expect(IL.tmIlmoitusNakyvissa(n('2026-W43'), [], new Date(2026, 9, 25, 23, 0))).toBe(true); expect(IL.tmIlmoitusNakyvissa(n('2026-W43'), [], new Date(2026, 9, 26, 0, 1))).toBe(false);
    expect(IL.tmIlmoitusNakyvissa(n('roskaa'), [], new Date(2030, 0, 1))).toBe(true); expect(IL.tmViikonLoppu('2026-W53')).not.toBeNull(); expect(IL.tmViikonLoppu('x')).toBeNull();
  });
  it('vuodenvaihde: 2026-W01 on 29.12.2025–4.1.2026', () => { expect(IL.tmViikonLoppu('2026-W01').getTime()).toBe(new Date(2026, 0, 4, 23, 59, 59, 999).getTime()); });
});
describe('functions kytkentä + sv', () => {
  it('trigger exportattu ohuella rivillä (kasvukatto), logiikka kalenteri_viikko.js:ssä viikko_era-portilla; tm_lang EI muutu (sv-pariteetti): avain yleiset.ilm_viikko odottaa Geminiä, varateksti fi', () => {
    expect(FN).toContain("exports.notifKalenteriViikko = require('./kalenteri_viikko').viikkoTrigger({ functions, admin, db, roster: _c4Roster, optOut: _c4OptOut });"); expect(KV).toContain("typeof ev.viikko_era !== 'string'"); expect(KV).toContain('varaaViikkoErä(');
    expect(LANG).not.toContain('ilm_viikko'); expect(IL.tmIlmoitusKoosta({ tyyppi: 'viikko', viikko: '2026-W43', maara: 4 }, (k) => k)).toBe('Uusi viikko-ohjelma: viikko 43');
    expect(IL.tmIlmoitusKoosta({ tyyppi: 'viikko', viikko: '2026-W43' }, (k) => 'Ny veckoplan: vecka ' + 43)).toBe('Ny veckoplan: vecka 43');   // kun avain tulee, se voittaa
  });
});
