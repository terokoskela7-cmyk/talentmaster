/**
 * Vaihe 1 PR 2a (PM 2.11.2026): GDPR-vienti kattaa pelaajadokumentin alikokoelmat.
 *  - Jokainen Rulesin `match /pelaajat/{pelaajaId}` -lohkon alikokoelma on joko locatorin ALIKOKOELMAT-listassa (viedään)
 *    tai VIENTI_ODOTTAA-listassa (PM:n päätös kesken, inventaario 2.11.). Uusi alikokoelma ilman kumpaakaan → testi kaatuu.
 *  - VIENTI_ODOTTAA saa vain pienentyä: kun alikokoelma lisätään vientiin, se poistetaan täältä.
 *  - `sisainen` (tiedot + terveys) viedään (tarkastusoikeus koskee myös henkilökunnan arvioita ja terveystietoa).
 *  - viePelaajanDataGDPR rakentaa alikokoelmaosion suoraan ALIKOKOELMAT-listasta (ei käsin ylläpidettyä luetteloa).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const { ALIKOKOELMAT, keraaPelaajanManifesti } = require('../functions/gdpr_locator.js');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RULES = readFileSync(join(ROOT, 'tm_admin/firestore.rules'), 'utf8');
const INDEX = readFileSync(join(ROOT, 'functions/index.js'), 'utf8');

/* PM päättää (INVENTAARIO_VAIHE1_PR2.md, 2.11.): nämä pelaajadokumentin alikokoelmat EIVÄT ole vielä viennissä. Lista saa vain pienentyä. */
const VIENTI_ODOTTAA = [
  'kenttatarkkailut', 'tavoitteet', 'reviewit', 'kooste', 'viikkokatsaukset', 'notifikaatiot', 'tapahtumat', 'idp',
  'vp_muistiinpanot', 'arviointikerrat', 'arviointi', 'idp_kausi', 'idp_pelaaja', 'palautteet',
];

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
  it('jokainen Rulesin alikokoelma on viennissä tai PM:n odotuslistalla (uusi alikokoelma kaatuu tähän)', () => {
    const rules = pelaajanAlikokoelmat();
    expect(rules.length).toBeGreaterThan(10);   // parseri löytää lohkon (ei hiljaista tyhjää)
    const puuttuu = rules.filter((n) => !ALIKOKOELMAT.includes(n) && !VIENTI_ODOTTAA.includes(n));
    expect(puuttuu, 'lisää gdpr_locator ALIKOKOELMAT-listaan (tai PM:n päätöksellä VIENTI_ODOTTAA:an)').toEqual([]);
  });
  it('odotuslista ei sisällä viennissä olevaa eikä Rulesista poistunutta (pitää listan ajan tasalla)', () => {
    const rules = pelaajanAlikokoelmat();
    VIENTI_ODOTTAA.forEach((n) => { expect(ALIKOKOELMAT, n).not.toContain(n); expect(rules, n + ' poistui Rulesista → poista odotuslistalta').toContain(n); });
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
});
