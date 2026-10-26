/* Pelaajan omatoimisen kirjauksen tyyppikoodit selkokielelle (Master Viestit/Pulssi). lib/tm_kirjaus_tyypit.js */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = require('../lib/tm_kirjaus_tyypit.js');
const teksti = (f) => readFileSync(join(juuri, f), 'utf8');

describe('tmKirjausOtsikko', () => {
  it.each([['D', 'Päivän harjoitus'], ['S', 'Kohdennettu kehitys'], ['T', 'Pallo joka päivä'], ['joukkue', 'Joukkueharjoitus'], ['vapaa', 'Omatoiminen treeni']])('%s → %s', (k, o) => {
    expect(K.tmKirjausOtsikko({ tyyppi: k })).toBe(o);
  });
  it('tuntematon koodi / puuttuva → "Kirjasi treenin", ei kirjainta', () => {
    for (const k of ['X', 'Q', '', undefined, null, 'toString', 'constructor']) expect(K.tmKirjausOtsikko({ tyyppi: k })).toBe('Kirjasi treenin');
    expect(K.tmKirjausOtsikko(null)).toBe('Kirjasi treenin');
  });
  it('regressio: vanhat lajityypit ennallaan', () => {
    expect(K.tmKirjausOtsikko({ tyyppi: 'pihapeli' })).toBe('Pihapeli');
    expect(K.tmKirjausOtsikko({ tyyppi: 'uinti' })).toBe('Uintia');
    expect(K.tmKirjausOtsikko({ tyyppi: 'pyora' })).toBe('Pyöräily');
    expect(K.tmKirjausOtsikko({ tyyppi: 'individual' })).toBe('Omatoimi');
    expect(K.tmKirjausOtsikko({ tyyppi: 'team' })).toBe('Joukkueharjoitus');
  });
  it('teksti kulkee o.t():n läpi', () => {
    expect(K.tmKirjausOtsikko({ tyyppi: 'D' }, { t: (s) => '[' + s + ']' })).toBe('[Päivän harjoitus]');
  });
});

describe('tmKirjausAlarivi', () => {
  it('harjoitteen nimi näkyy kortilla', () => {
    expect(K.tmKirjausAlarivi({ tyyppi: 'T', harjoite_nimi: 'Naruhypyt' })).toBe('Naruhypyt');
    expect(K.tmKirjausRivi({ tyyppi: 'T', harjoite_nimi: 'Naruhypyt' })).toBe('Pallo joka päivä · Naruhypyt');
  });
  it('nimi haetaan tyyppiä vastaavasta sessiosta (päivädokin ylätaso on viimeisin)', () => {
    const e = { tyyppi: 'D', harjoite_nimi: 'Naruhypyt', sessiot: [{ tyyppi: 'D', harjoite_nimi: 'Vauhti' }, { tyyppi: 'T', harjoite_nimi: 'Naruhypyt' }] };
    expect(K.tmKirjausAlarivi(e)).toBe('Vauhti');
  });
  it('vapaa: laji konteksti-kentästä', () => {
    expect(K.tmKirjausAlarivi({ tyyppi: 'vapaa', konteksti: 'muu' })).toBe('Muu liike');
    expect(K.tmKirjausAlarivi({ tyyppi: 'T', konteksti: 'pihapeli' })).toBe('Pihapeli');
    expect(K.tmKirjausRivi({ tyyppi: 'vapaa', konteksti: 'keho' })).toBe('Omatoiminen treeni · Oma keho');
  });
  it('vanha kirjaus ilman nimeä → pelkkä tyyppi (null)', () => {
    expect(K.tmKirjausAlarivi({ tyyppi: 'D' })).toBeNull();
    expect(K.tmKirjausAlarivi({ tyyppi: 'D', harjoite_nimi: '  ' })).toBeNull();
    expect(K.tmKirjausAlarivi({ tyyppi: 'D', harjoite_nimi: 42 })).toBeNull();
    expect(K.tmKirjausRivi({ tyyppi: 'D' })).toBe('Päivän harjoitus');
  });
  it('nimi rajataan 80 merkkiin', () => {
    expect(K.tmKirjausAlarivi({ tyyppi: 'S', harjoite_nimi: 'a'.repeat(200) }).length).toBe(80);
  });
});

describe('kytkentä', () => {
  const M = teksti('TalentMaster_Master_v16.html');
  it('Master lataa libin ja käyttää sitä Inboxissa ja Pulssissa; vanhat paikalliset tyypit-kartat poissa', () => {
    expect(M).toMatch(/lib\/tm_kirjaus_tyypit\.js\?v=\d+/);
    expect(M).toContain('tmKirjausOtsikko(e,_ktO)');
    expect(M).toContain('tmKirjausAlarivi(e,_ktO)');
    expect(M).toContain('tmKirjausRivi(e,{t:masterT})');
    expect(M).not.toMatch(/const tyypit=\{pihapeli/);
  });
  it('Pelaaja_v7 tallentaa harjoite_nimi (≤ 80) kirjaukseen ja sessioon', () => {
    const P = teksti('TalentMaster_Pelaaja_v7.html');
    expect(P).toContain('kirjausData.harjoite_nimi = _hNimi');
    expect(P).toContain('_sessioP.harjoite_nimi = _hNimi');
    expect(P).toContain('.slice(0, 80)');
  });
  it('Rules: kirjaukset-luonti ei käytä hasOnly-listaa → ei Rules-muutosta', () => {
    const r = teksti('tm_admin/firestore.rules');
    const i = r.indexOf('match /kirjaukset/{pvm} {');
    const lohko = r.slice(i, r.indexOf('match /viikkokatsaukset', i));
    const create = lohko.slice(lohko.indexOf('allow create'), lohko.indexOf('allow update'));
    expect(create).not.toMatch(/hasOnly|keys\(\)/);
  });
});

describe('sv (PM 26.10.2026)', () => {
  const Msv = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv;
  it.each([['Päivän harjoitus', 'Dagens träning'], ['Kohdennettu kehitys', 'Riktad utveckling'], ['Pallo joka päivä', 'Bollen varje dag'], ['Omatoiminen treeni', 'Egen träning'], ['Kaverin kanssa', 'Med en kompis'], ['Oma keho', 'Egen kropp']])('%s → %s', (fi, sv) => {
    expect(Msv[fi]).toBe(sv);
    expect(K.tmKirjausOtsikko({ tyyppi: 'x' }, { t: (s) => s })).toBe('Kirjasi treenin');
  });
});
