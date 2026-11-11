// Projekti 06 PR 2 — synteettisen aineiston generaattori: projektilukko, determinismi, kenttärakenteet, pikakenttäparit, CLI (valedb). Ei Firestorea.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..');
const L = require('../scripts/kuorma/lukko.js');
const A = require('../scripts/kuorma/aineisto.js');
const G = require('../scripts/kuorma/generoi_aineisto.js');
const PILOT = ['talentmaster', 'pilot'].join('-');   // ei kirjaimellista nimeä tässäkään

describe('projektilukko', () => {
  it('sallii staging + staging-<x> + demo-kuorma', () => {
    ['talentmaster-staging', 'talentmaster-staging-2', 'demo-kuorma'].forEach((p) => expect(L.tarkistaLukko({ projekti: p, env: {} }).ok).toBe(true));
  });
  it('kaatuu: tuotanto, tyhjä, puuttuva, isot kirjaimet, välilyönnit, väärä muoto, liitetty jälkiliite', () => {
    [PILOT, '', undefined, 'Talentmaster-Staging', 'TALENTMASTER-STAGING', ' talentmaster-staging', 'talentmaster-staging ', 'talentmaster-staging\n', 'talentmaster-staging-', 'talentmaster-staging-A', 'xtalentmaster-staging', 'talentmaster-staging/../x', 'talentmaster-stagingg-'.replace('gg-', 'g;rm')]
      .forEach((p) => expect(L.tarkistaLukko({ projekti: p, env: {} }).ok, JSON.stringify(p)).toBe(false));
  });
  it('kaatuu, kun mikä tahansa ASETETTU lähde osoittaa muualle tai on ristiriidassa (env, FIREBASE_CONFIG, ADC)', () => {
    const k = (env, adc) => L.tarkistaLukko({ projekti: 'talentmaster-staging', env, adc }).ok;
    expect(k({}, undefined)).toBe(true); expect(k({ GOOGLE_CLOUD_PROJECT: 'talentmaster-staging' }, 'talentmaster-staging')).toBe(true);
    expect(k({ GOOGLE_CLOUD_PROJECT: PILOT })).toBe(false); expect(k({ GCLOUD_PROJECT: PILOT })).toBe(false);
    expect(k({ GCLOUD_PROJECT: '' })).toBe(false); expect(k({ GCLOUD_PROJECT: ' talentmaster-staging' })).toBe(false);
    expect(k({ FIREBASE_CONFIG: JSON.stringify({ projectId: PILOT }) })).toBe(false); expect(k({ FIREBASE_CONFIG: 'ei json' })).toBe(false);
    expect(k({ FIREBASE_CONFIG: JSON.stringify({ projectId: 'talentmaster-staging' }) })).toBe(true);
    expect(k({}, PILOT)).toBe(false); expect(k({}, '')).toBe(false);
    expect(k({ GCLOUD_PROJECT: 'talentmaster-staging-2' }, undefined)).toBe(false);   // sallittu mutta eri → ristiriita
    expect(k({ GOOGLE_CLOUD_PROJECT: 'demo-kuorma' })).toBe(false);
  });
  it('staattinen: scripts/kuorma/** ei sisällä tuotantoprojektin nimeä muualla kuin lukon estolistassa', () => {
    const tiedostot = readdirSync(join(ROOT, 'scripts/kuorma')).filter((f) => statSync(join(ROOT, 'scripts/kuorma', f)).isFile());
    expect(tiedostot).toContain('lukko.js');
    tiedostot.filter((f) => f !== 'lukko.js').forEach((f) => expect(readFileSync(join(ROOT, 'scripts/kuorma', f), 'utf8'), f).not.toContain(PILOT));
    expect(readFileSync(join(ROOT, 'scripts/kuorma/lukko.js'), 'utf8').split(PILOT).length - 1).toBe(1);   // täsmälleen estolistassa
  });
  it('staattinen: Admin SDK alustetaan vasta lukon jälkeen (main kutsuu luoDb:tä vasta tarkistaLukon jälkeen)', () => {
    const src = readFileSync(join(ROOT, 'scripts/kuorma/generoi_aineisto.js'), 'utf8');
    expect(src.indexOf('tarkistaLukko(')).toBeGreaterThan(-1); expect(src.indexOf('tarkistaLukko(')).toBeLessThan(src.indexOf('await d.luoDb('));
    expect((src.match(/initializeApp\(/g) || []).length).toBe(1); expect(src).toContain('projectId: projekti');
  });
});

const SAVU = A.PROFIILIT.savu;
function koota(profiili, siemen) { const m = new Map(); for (const d of A.generoi(profiili, siemen)) m.set(d.polku, d.data); return m; }
const PIENI = { nimi: 'pieni', seurat: [{ koko: 40 }], kirjaukset: 10, viikkokatsaukset: 5, havainnot: 3, kierroksia: [2, 3], kaksiJoukkuettaTodennakoisyys: 0.3 };

describe('generaattori: determinismi', () => {
  it('sama siemen → täsmälleen sama aineisto; eri siemen → eri; laske() täsmää virtaan', () => {
    const a = JSON.stringify([...koota(PIENI, 7)]), b = JSON.stringify([...koota(PIENI, 7)]), c = JSON.stringify([...koota(PIENI, 8)]);
    expect(a).toBe(b); expect(a).not.toBe(c);
    expect(A.laske(PIENI, 7).yht).toBe(koota(PIENI, 7).size);
  });
  it('savuprofiili: 2 seuraa, 1 000 pelaajaa, 25 joukkuetta/seura, ~165 000 dokumenttia', () => {
    const m = A.laske(SAVU, 1);
    expect(m.seurat).toBe(2); expect(m.pelaajat).toBe(1000); expect(m.joukkueet).toBe(50); expect(m.kirjaukset).toBe(100000); expect(m.viikkokatsaukset).toBe(35000); expect(m.havainnot).toBe(25000);
    expect(m.testitulokset).toBeGreaterThan(3000); expect(m.yht).toBeGreaterThan(160000); expect(m.yht).toBeLessThan(170000);
  });
  it('ei kelloa eikä Math.randomia', () => {
    const src = readFileSync(join(ROOT, 'scripts/kuorma/aineisto.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/Math\.random|Date\.now|new Date\(\)/);
  });
});

describe('generaattori: kenttärakenteet', () => {
  const m = koota(PIENI, 1), pelaajat = [...m].filter(([p]) => /^seurat\/[^/]+\/pelaajat\/[^/]+$/.test(p)).map(([, d]) => d);
  const joukkueIdt = new Set([...m].filter(([p]) => /\/joukkueet\/[^/]+$/.test(p)).map(([p]) => p.split('/').pop()));
  it('pelaaja: joukkueet[] (id:t, joukkueet-kokoelmassa) + joukkue (näyttönimi, jonka id on joukkueet[]:ssä), nimet rinnakkain; osa kuuluu kahteen', () => {
    expect(pelaajat.length).toBe(40);
    pelaajat.forEach((p) => {
      expect(Array.isArray(p.joukkueet) && p.joukkueet.length >= 1 && p.joukkueet.length <= 2).toBe(true);
      p.joukkueet.forEach((id) => expect(joukkueIdt.has(id)).toBe(true));
      expect(p.joukkueetNimet.length).toBe(p.joukkueet.length); expect(p.joukkueetNimet[0]).toBe(p.joukkue); expect(p.joukkueNimi).toBe(p.joukkue);   // §7.18: ensisijainen = näyttönimi
      expect(['M', 'N']).toContain(p.sukupuoli); expect(p.synteettinen).toBe(true); expect(p.aktiivinen).toBe(true);
    });
    expect(pelaajat.filter((p) => p.joukkueet.length === 2).length).toBeGreaterThan(0);
  });
  it('nimet ja tunnisteet selvästi synteettisiä; ei sähköposteja eikä oikean näköisiä nimiä', () => {
    pelaajat.forEach((p) => { expect(p.etunimi).toBe('Testi'); expect(p.sukunimi).toMatch(/^Pelaaja S\d\d-\d{5}$/); expect(p.tunniste).toMatch(/^SYNT-\d\d-\d{5}$/); });
    const kaikki = JSON.stringify([...m]); expect(kaikki).not.toMatch(/@/); expect(kaikki).not.toMatch(/Koskela|Topias|Toppari/i);
    [...m].filter(([p]) => /^seurat\/[^/]+$/.test(p)).forEach(([p, d]) => { expect(p).toMatch(/^seurat\/kuorma_seura_\d\d$/); expect(d.synteettinen).toBe(true); expect(d.nimi).toMatch(/^Testiseura \d\d \(synteettinen\)$/); });
  });
  it('kaikki polut ovat seurat/kuorma_…-alla (ei muuta kokoelmaa)', () => { [...m.keys()].forEach((p) => expect(p).toMatch(/^seurat\/kuorma_seura_\d\d(\/|$)/)); });
  it('testitulokset RAAKADATANA: id {pvm}_{protokolla}, testit-kartta, kuljetus_laukaus {y1,y2:{raaka,osumat[4]}}, ei pikakenttiä tulosdokumentissa', () => {
    const tulokset = [...m].filter(([p]) => /\/testitulokset\//.test(p));
    expect(tulokset.length).toBeGreaterThan(40);
    tulokset.forEach(([p, d]) => {
      expect(p).toMatch(/\/testitulokset\/2026-\d\d-\d\d_(hh_laaja|tekniikkakilpailu)$/); expect(p.endsWith(d.testauspvm + '_' + d.protokolla)).toBe(true);
      expect(d.pvm_arvio).toBe(false); expect(typeof d.testit).toBe('object');
      Object.keys(d).forEach((k) => expect(k).not.toMatch(/^(hh_|d1_|d2_|tki_viimeisin|tk_lajit|tk_kokonaistulos)/));
      if (d.protokolla === 'hh_laaja') ['lin_5m', 'lin_10m', 'lin_30m', 'hyppy_cj', 'mas'].forEach((k) => expect(typeof d.testit[k]).toBe('number'));
      else { ['ponnauttelu', 'syotto', 'pujottelu'].forEach((k) => expect(typeof d.testit[k]).toBe('number')); ['y1', 'y2'].forEach((y) => { expect(typeof d.testit.kuljetus_laukaus[y].raaka).toBe('number'); expect(d.testit.kuljetus_laukaus[y].osumat.length).toBe(4); }); expect(d.ika).toBeLessThanOrEqual(13); }
    });
  });
  it('kirjaukset id=päivä, viikkokatsaukset id=sunnuntai (rules-muoto), kaikki kauden sisällä', () => {
    [...m].filter(([p]) => /\/kirjaukset\//.test(p)).forEach(([p, d]) => { expect(p.split('/').pop()).toBe(d.pvm); expect(d.pvm >= '2026-01-05' && d.pvm <= '2026-11-08').toBe(true); expect(d.luotu instanceof Date).toBe(true); });
    [...m].filter(([p]) => /\/viikkokatsaukset\//.test(p)).forEach(([p, d]) => {
      const pvm = p.split('/').pop(); expect(new Date(pvm + 'T00:00:00Z').getUTCDay()).toBe(0);
      expect(Object.keys(d).sort()).toEqual(['jakso_alkoi', 'luotu', 'vastaukset', 'vk']); expect(d.vk >= 1 && d.vk <= 52).toBe(true); expect(d.vastaukset.length).toBe(1);
      expect(['usein', 'joskus', 'ei_viela']).toContain(d.vastaukset[0].arvo); expect(Object.keys(d.vastaukset[0]).sort()).toEqual(['arvo', 'osa', 'teksti']);
    });
  });
});

describe('generaattori: pikakentät atomisesti (§26 pari-invariantti)', () => {
  const m = koota(SAVU, 1), pelaajat = [...m].filter(([p]) => /^seurat\/[^/]+\/pelaajat\/[^/]+$/.test(p)).map(([, d]) => d);
  const PARIT = [['hh_viimeisin', 'hh_pvm'], ['d1_taso', 'd1_pvm'], ['tki_viimeisin', 'tki_pvm'], ['tk_lajit_viimeisin', 'tk_lajit_pvm'], ['hh_taso_edellinen', 'hh_taso_edellinen_pvm'], ['tki_edellinen', 'tki_edellinen_pvm']];
  it('jokaisella pelaajalla jokainen pikakenttäpari on KOKONAAN tai EI LAINKAAN (arvo ja *_pvm yhdessä, pvm ISO)', () => {
    pelaajat.forEach((p) => PARIT.forEach(([a, b]) => { expect((p[a] != null), a).toBe(p[b] != null); if (p[b] != null) expect(p[b]).toMatch(/^2026-\d\d-\d\d$/); }));
  });
  it('pikakentät on laskettu kanonisella libillä: kaikilla H-H pari, TKI-pari vain iässä 8–13; *_edellinen vain kun kierroksia ≥ 2', () => {
    expect(pelaajat.every((p) => p.hh_viimeisin && p.hh_pvm)).toBe(true);
    const tki = pelaajat.filter((p) => p.tki_pvm), ilman = pelaajat.filter((p) => !p.tki_pvm);
    expect(tki.length).toBeGreaterThan(300); tki.forEach((p) => { expect(2026 - p.syntymaVuosi).toBeLessThanOrEqual(13); expect(p.tk_lajit_viimeisin).toBeTruthy(); });
    ilman.forEach((p) => expect(2026 - p.syntymaVuosi).toBeGreaterThanOrEqual(8));
    expect(pelaajat.filter((p) => p.hh_taso_edellinen != null).length).toBeGreaterThan(500);
  });
  it('pikakentän *_pvm = pelaajan uusimman vastaavan testitulosdokumentin päivä (pikakenttä ei ole tuloksista irrallaan)', () => {
    const uusin = new Map(); [...m].forEach(([p, d]) => { const o = p.split('/'); if (o[o.length - 2] === 'testitulokset') { const k = o[3] + '|' + d.protokolla; if (!uusin.has(k) || uusin.get(k) < d.testauspvm) uusin.set(k, d.testauspvm); } });
    [...m].filter(([p]) => /^seurat\/[^/]+\/pelaajat\/[^/]+$/.test(p)).forEach(([p, d]) => { const id = p.split('/')[3]; expect(d.hh_pvm).toBe(uusin.get(id + '|hh_laaja')); if (d.tki_pvm) expect(d.tki_pvm).toBe(uusin.get(id + '|tekniikkakilpailu')); });
  });
  it('pelaajadokumentti on virran VIIMEINEN dokumentti pelaajan alla (kaikki kierrokset laskettu ennen kirjoitusta)', () => {
    let edellinen = null; const vahtiPelaaja = [];
    for (const d of A.generoi(PIENI, 1)) { const o = d.polku.split('/'); if (o[2] === 'pelaajat') { if (o.length === 4) vahtiPelaaja.push(o[3]); else if (vahtiPelaaja.indexOf(o[3]) >= 0) throw new Error('alikokoelma pelaajadokumentin jälkeen'); } edellinen = d; }
    expect(vahtiPelaaja.length).toBe(40); expect(edellinen).toBeTruthy();
  });
});

// ── CLI valedb:llä ────────────────────────────────────────────────────────────────────────────────
function valeDb(alkuSeurat) {
  const kirjoitukset = [], poistot = [], seurat = alkuSeurat || [];
  const db = {
    collection: (k) => ({ get: async () => ({ docs: seurat.map((s) => ({ id: s.id, ref: { id: s.id }, data: () => s.data })) }) }),
    doc: (p) => ({ polku: p }), recursiveDelete: async (ref) => { poistot.push(ref.id); },
  };
  const bw = { set: (ref, data) => { kirjoitukset.push(ref.polku); return Promise.resolve(); }, onWriteError: () => {}, close: async () => {} };
  return { kirjoitukset, poistot, luoDb: async (projekti) => ({ db, projekti, bulkWriter: () => bw }) };
}
async function aja(argv, v, env, adc) { const ulos = []; const koodi = await G.main(argv, { luoDb: v.luoDb, kirjaa: (r) => ulos.push(r), virhe: (r) => ulos.push('VIRHE ' + r), env: env || {}, adc }); return { koodi, ulos: ulos.join('\n') }; }

describe('CLI (valedb)', () => {
  it('kuiva-ajo oletuksena: ei yhteyttä, ei kirjoituksia, tulostaa määrät', async () => {
    const v = valeDb(); let yhteys = 0; const luo = v.luoDb; v.luoDb = async (p) => { yhteys++; return luo(p); };
    const r = await aja(['--projekti=talentmaster-staging'], v); expect(r.koodi).toBe(0); expect(yhteys).toBe(0); expect(v.kirjoitukset.length).toBe(0);
    expect(r.ulos).toContain('KUIVA-AJO'); expect(r.ulos).toMatch(/pelaajat\s+1000/);
  });
  it('--aja kirjoittaa täsmälleen laske()-määrän dokumentteja, kaikki kuorma_-polkuja', async () => {
    const v = valeDb(); const r = await aja(['--projekti=talentmaster-staging', '--aja'], v);
    expect(r.koodi).toBe(0); expect(v.kirjoitukset.length).toBe(A.laske(SAVU, '1').yht); v.kirjoitukset.forEach((p) => expect(p).toMatch(/^seurat\/kuorma_seura_\d\d/)); expect(r.ulos).toMatch(/Kirjoitettu \d+ dokumenttia, epäonnistui 0/);
  });
  it('lukko ennen kaikkea: väärä projekti / ristiriitainen env / ADC → exit 1, ei yhteyttä eikä kirjoituksia (myös --aja ja --tyhjenna)', async () => {
    for (const [argv, env, adc] of [[['--projekti=' + PILOT, '--aja'], {}, undefined], [['--projekti=talentmaster-staging', '--aja'], { GCLOUD_PROJECT: PILOT }, undefined], [['--projekti=talentmaster-staging', '--tyhjenna', '--aja'], {}, PILOT], [['--aja'], {}, undefined], [['--projekti=', '--aja'], {}, undefined]]) {
      const v = valeDb([{ id: 'kuorma_seura_01', data: { synteettinen: true } }]); let yhteys = 0; const luo = v.luoDb; v.luoDb = async (p) => { yhteys++; return luo(p); };
      const r = await aja(argv, v, env, adc); expect(r.koodi, JSON.stringify(argv)).toBe(1); expect(yhteys).toBe(0); expect(v.kirjoitukset.length + v.poistot.length).toBe(0); expect(r.ulos).toContain('LUKKO');
    }
  });
  it('Admin SDK:n projekti ≠ lukon projekti → kaatuu ennen kirjoitusta', async () => {
    const v = valeDb(); const r = await aja(['--projekti=talentmaster-staging', '--aja'], { luoDb: async () => ({ db: {}, projekti: PILOT, bulkWriter: () => { throw new Error('ei saa kutsua'); } }) }); expect(r.koodi).toBe(1); expect(r.ulos).toContain('LUKKO'); expect(v.kirjoitukset.length).toBe(0);
  });
  it('--tyhjenna: kuiva-ajo ei poista; --aja poistaa VAIN kuorma_-etuliite + synteettinen===true -seurat', async () => {
    const seurat = [{ id: 'kuorma_seura_01', data: { synteettinen: true } }, { id: 'kuorma_seura_02', data: { synteettinen: true } }, { id: 'kuorma_oikea', data: { nimi: 'ilman lippua' } }, { id: 'oikea_seura', data: { synteettinen: true } }, { id: 'sjk', data: {} }];
    const v1 = valeDb(seurat); const k = await aja(['--projekti=talentmaster-staging', '--tyhjenna'], v1); expect(k.koodi).toBe(0); expect(v1.poistot.length).toBe(0); expect(k.ulos).toContain('poistettavia synteettisiä seuroja: 2');
    const v2 = valeDb(seurat); const r = await aja(['--projekti=talentmaster-staging', '--tyhjenna', '--aja'], v2); expect(r.koodi).toBe(0); expect(v2.poistot).toEqual(['kuorma_seura_01', 'kuorma_seura_02']); expect(v2.kirjoitukset.length).toBe(0);
  });
  it('tuntematon valinta / profiili → exit 2; tuloste ei sisällä nimiä, tunnisteita eikä id:itä', async () => {
    expect((await aja(['--projekti=talentmaster-staging', '--roska'], valeDb())).koodi).toBe(2);
    expect((await aja(['--projekti=talentmaster-staging', '--profiili=ei'], valeDb())).koodi).toBe(2);
    const r = await aja(['--projekti=talentmaster-staging', '--aja'], valeDb()); expect(r.ulos).not.toMatch(/SYNT-|Testi|kuorma_/);
  });
});
