/**
 * Vaihe 1 PR 2a (PM 2.11.2026) + B8 (PM 4.11.2026): GDPR-vienti kattaa KAIKKI pelaajadokumentin alikokoelmat.
 *  - Jokainen Rulesin `match /pelaajat/{pelaajaId}` -lohkon alikokoelma on locatorin ALIKOKOELMAT-listassa. Uusi alikokoelma
 *    ilman sitä → testi kaatuu. B8 tyhjensi PR 2a:n odotuslistan (14 alikokoelmaa vientiin), joten odotuslistaa ei enää ole.
 *  - Poisto (RTBF) kattaa alikokoelmat recursiveDeletellä; sama lista ohjaa manifestin lukumääriä (dryRun-esikatselu + audit).
 *  - `sisainen` (tiedot + terveys) viedään (tarkastusoikeus koskee myös henkilökunnan arvioita ja terveystietoa).
 *  - viePelaajanDataGDPR rakentaa alikokoelmaosion suoraan ALIKOKOELMAT-listasta (ei käsin ylläpidettyä luetteloa).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const { ALIKOKOELMAT, keraaPelaajanManifesti, nollaLukumaarat } = require('../functions/gdpr_locator.js');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RULES = readFileSync(join(ROOT, 'tm_admin/firestore.rules'), 'utf8');
const INDEX = readFileSync(join(ROOT, 'functions/index.js'), 'utf8');

/* B8: PR 2a:n odotuslistalla olleet 14 alikokoelmaa — nyt viennissä (regressiovartija: ei saa pudota listalta). */
const B8_LISATYT = [
  'kenttatarkkailut', 'tavoitteet', 'reviewit', 'kooste', 'viikkokatsaukset', 'notifikaatiot', 'tapahtumat', 'idp',
  'vp_muistiinpanot', 'arviointikerrat', 'arviointi', 'idp_kausi', 'idp_pelaaja', 'palautteet',
];
/* Viennin muut ylätason avaimet (index.js viePelaajanDataGDPR) — alikokoelman nimi ei saa törmätä näihin (ylikirjoittaisi osion). */
const VIENNIN_MUUT_AVAIMET = ['_meta', 'pelaaja', 'lasnaolo', 'testitapahtuma_tulokset', 'palloID_viitteet', 'omat_kirjaukset', 'kausikuvat', 'solo', 'media'];

/* Rulesin pelaajadokumentin lohkon suorat alikokoelmat (sisäkkäisyys aaltosulkeista, ei rivien sisennyksestä). */
function pelaajanAlikokoelmat() {
  const a = RULES.indexOf('match /pelaajat/{pelaajaId} {');
  expect(a, 'Rulesin pelaajadokumentin lohko').toBeGreaterThan(0);
  let syvyys = 0, i = RULES.indexOf('{', a + 'match /pelaajat/'.length + 12);
  const nimet = new Set();
  for (; i < RULES.length; i++) {
    const c = RULES[i];
    if (c === '{') {
      if (syvyys === 1) { const ennen = RULES.slice(RULES.lastIndexOf('\n', i) + 1, i); const m = ennen.match(/match \/([A-Za-z_]+)\/\{[A-Za-z_]+\}\s*$/); if (m) nimet.add(m[1]); }
      syvyys++;
    } else if (c === '}') { syvyys--; if (syvyys === 0) break; }
    else if (c === '/' && RULES[i + 1] === '/') { i = RULES.indexOf('\n', i); }   // kommenttirivi: ei aaltosulkeita
  }
  return [...nimet].sort();
}

describe('GDPR-vienti: pelaajadokumentin alikokoelmat', () => {
  it('jokainen Rulesin alikokoelma on viennissä (uusi alikokoelma kaatuu tähän)', () => {
    const rules = pelaajanAlikokoelmat();
    expect(rules.length).toBeGreaterThan(10);   // parseri löytää lohkon (ei hiljaista tyhjää)
    const puuttuu = rules.filter((n) => !ALIKOKOELMAT.includes(n));
    expect(puuttuu, 'lisää gdpr_locator ALIKOKOELMAT-listaan').toEqual([]);
  });
  it('B8: PR 2a:n odotuslistan 14 alikokoelmaa ovat viennissä ja yhä Rulesissa', () => {
    const rules = pelaajanAlikokoelmat();
    B8_LISATYT.forEach((n) => { expect(ALIKOKOELMAT, n).toContain(n); expect(rules, n + ' poistui Rulesista → päivitä B8_LISATYT').toContain(n); });
    expect(new Set(ALIKOKOELMAT).size).toBe(ALIKOKOELMAT.length);   // ei tuplia
  });
  it('alikokoelman nimi ei törmää viennin muihin avaimiin', () => {
    VIENNIN_MUUT_AVAIMET.forEach((k) => expect(ALIKOKOELMAT, k).not.toContain(k));
    const f = INDEX.slice(INDEX.indexOf('exports.viePelaajanDataGDPR'), INDEX.indexOf('// Toimitus: JSON Storageen'));
    const vienti = f.slice(f.indexOf('const vienti = {'));
    const avaimet = [...vienti.matchAll(/^\s{6}([A-Za-z_]+):/gm)].map((m) => m[1]);
    expect(avaimet.sort()).toEqual([...VIENNIN_MUUT_AVAIMET].sort());   // lista pysyy index.js:n kanssa ajan tasalla
  });
  it('lukumäärät kattavat jokaisen alikokoelman (dryRun-esikatselu + audit)', () => {
    const nolla = nollaLukumaarat();
    ALIKOKOELMAT.forEach((n) => expect(nolla[n], n).toBe(0));
  });
  it('sisainen on viennissä (PM 2.11.)', () => { expect(ALIKOKOELMAT).toContain('sisainen'); });
  it('viePelaajanDataGDPR rakentaa alikokoelmaosion ALIKOKOELMAT-listasta', () => {
    const f = INDEX.slice(INDEX.indexOf('exports.viePelaajanDataGDPR'), INDEX.indexOf('// Toimitus: JSON Storageen'));
    expect(f).toMatch(/GDPR_ALIKOKOELMAT\.map\(\(n\) => \[n, dataMap\(manifesti\.alikokoelmat\[n\]\)\]\)/);
    expect(f).not.toMatch(/havainnot: dataMap\(/);   // ei rinnakkaista käsin ylläpidettyä luetteloa
  });
  it('locator kerää sisainen/tiedot ja sisainen/terveys pelaajan manifestiin', async () => {
    const base = 'seurat/s/pelaajat/p1', cols = { [base + '/sisainen']: [{ id: 'tiedot', data: { seuraId: 's', vastuuhenkilo: { uid: 'v' } } }, { id: 'terveys', data: { terveysSeuraId: 's', kaytettavyys: 'loukkaantunut' } }] };
    const docs = { [base]: { etunimi: 'T' } };
    const colRef = (path) => ({ doc: (id) => docRef(path + '/' + id), get: async () => ({ docs: (cols[path] || []).map((d) => ({ id: d.id, data: () => d.data, ref: docRef(path + '/' + d.id), exists: true })) }) });
    const docRef = (path) => ({ path, collection: (n) => colRef(path + '/' + n), get: async () => ({ id: path.split('/').pop(), exists: docs[path] != null, data: () => docs[path] }) });
    const m = await keraaPelaajanManifesti({ collection: colRef }, 's', 'p1');
    expect(m.alikokoelmat.sisainen.map((x) => x.id).sort()).toEqual(['terveys', 'tiedot']);
    expect(m.lukumaarat.sisainen).toBe(2);
  });
  it('B8: locator kerää uudet alikokoelmat manifestiin ja laskee ne', async () => {
    const base = 'seurat/s/pelaajat/p1';
    const cols = {
      [base + '/kenttatarkkailut']: [{ id: 'k1_uid', data: { tekija: 'uid' } }, { id: 'k2_uid', data: { tekija: 'uid' } }],
      [base + '/vp_muistiinpanot']: [{ id: 'm1', data: { teksti: 'x' } }],
      [base + '/idp_kausi']: [{ id: '2026', data: { tavoite: 'y' } }],
      [base + '/palautteet']: [{ id: 'p1', data: { teksti: 'z' } }],
    };
    const docs = { [base]: { etunimi: 'T' } };
    const colRef = (path) => ({ doc: (id) => docRef(path + '/' + id), get: async () => ({ docs: (cols[path] || []).map((d) => ({ id: d.id, data: () => d.data, ref: docRef(path + '/' + d.id), exists: true })) }) });
    const docRef = (path) => ({ path, collection: (n) => colRef(path + '/' + n), get: async () => ({ id: path.split('/').pop(), exists: docs[path] != null, data: () => docs[path] }) });
    const m = await keraaPelaajanManifesti({ collection: colRef }, 's', 'p1');
    B8_LISATYT.forEach((n) => expect(Array.isArray(m.alikokoelmat[n]), n).toBe(true));
    expect(m.lukumaarat.kenttatarkkailut).toBe(2);
    expect(m.lukumaarat.vp_muistiinpanot).toBe(1);
    expect(m.lukumaarat.idp_kausi).toBe(1);
    expect(m.lukumaarat.palautteet).toBe(1);
    expect(m.lukumaarat.reviewit).toBe(0);
    expect(m.alikokoelmat.idp_kausi[0].data).toEqual({ tavoite: 'y' });
    expect(m.varoitukset).toEqual([]);
  });
});
