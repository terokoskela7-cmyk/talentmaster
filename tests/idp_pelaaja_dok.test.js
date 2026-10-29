/* Vaihe 1 / PR 1f-1 — idp_pelaaja/{vuosi}: puhdistettu §7.22-tavoite + sitoumuksen kaksoiskirjoitus + dual-read (lippu POIS oletuksena; kirjoittajia ei vielä kytketty: 1f-2 henkilökunta, 1f-3 pelaaja).
   Rules-toiminta: tests/rules/firestore.rules.test.js (v3.71). */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const D = require('../lib/tm_idp_pelaaja_dok.js'), P = require('../lib/tm_idp_pelaaja.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
afterEach(() => { D.LIPPU.kirjoitus = false; });

const kopio = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
function yhdista(k, l) { Object.keys(l).forEach((a) => { const v = l[a]; if (v && typeof v === 'object' && !Array.isArray(v)) { if (!k[a] || typeof k[a] !== 'object') k[a] = {}; yhdista(k[a], v); } else k[a] = kopio(v); }); }
function mkFs(opts) {
  opts = opts || {}; const docs = {}, loki = [];
  const kirjoita = (p, d, o) => {
    if (o && o.mergeFields) { docs[p] = docs[p] || {}; o.mergeFields.forEach((f) => { docs[p][f] = kopio(d[f]); }); }
    else if (o && o.merge) { docs[p] = docs[p] || {}; yhdista(docs[p], d); } else docs[p] = kopio(d);
  };
  const hylkaa = (ops) => { if (opts.hylkaaIdpPelaaja && ops.some((x) => /\/idp_pelaaja\//.test(x[0]))) { const e = new Error('Missing or insufficient permissions'); e.code = 'permission-denied'; throw e; } };
  const ref = (path) => ({ _path: path, collection: (c) => ({ doc: (i) => ref(path + '/' + c + '/' + i) }), set: async (d, o) => { hylkaa([[path]]); loki.push(path); kirjoita(path, d, o); } });
  const db = { collection: (c) => ({ doc: (i) => ref(c + '/' + i) }), batch: () => { const b = []; return { set: (r, d, o) => b.push([r._path, d, o]), commit: async () => { hylkaa(b); b.forEach((x) => { loki.push(x[0]); kirjoita(x[0], x[1], x[2]); }); } }; } };
  return { db, docs, loki };
}
const SID = 's', PID = 'p1', BASE = `seurat/${SID}/pelaajat/${PID}`, KAUSI = BASE + '/idp_kausi/2026', PEL = BASE + '/idp_pelaaja/2026';

/* Raaka tavoite täynnä A-sisältöä (kuten lib/tm_idp.js idpRakennaTavoite + arviot) */
const raaka = (yli) => Object.assign({
  fokus: { alue: 'short_passing', dim: 'D2', nimi: 'Lyhyt syöttö' }, status: 'aktiivinen', kuvaus: 'Syötät tarkasti lähelle.',
  perustelu: { teksti: 'Kehityskohde (D2 taso 2/5). Lähtö 20 → tavoite 18', pelilause: 'Peli aukeaa kun syöttö on tarkka.' },
  kypsyysvaroitus: 'PHV-ikkuna', ankkuri_7030: { a: 70, b: 30 }, mittari: { yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: 20, pvm: '2026-04-05' }, tavoitearvo: 18,
  pelaajan_tavoite: 'Haluan syöttää tarkemmin', luotu: '2026-04-05T00:00:00.000Z',
  arviot: [{ pvm: '2026-05-01', arvo: 19, pelaajan_arvio: 4, pelaajan_note: 'parani' }, { pvm: '2026-06-01', arvo: 21, pelaajan_arvio: 2 }, { pvm: '2026-07-01', arvo: 17 }]
}, yli || {});
const luvut = (x, polku, ulos) => { ulos = ulos || []; if (typeof x === 'number') ulos.push(polku); else if (Array.isArray(x)) x.forEach((v, i) => luvut(v, polku + '[' + i + ']', ulos)); else if (x && typeof x === 'object') Object.keys(x).forEach((k) => luvut(x[k], polku + '.' + k, ulos)); return ulos; };
const avaimet = (x, ulos) => { ulos = ulos || []; if (Array.isArray(x)) x.forEach((v) => avaimet(v, ulos)); else if (x && typeof x === 'object') Object.keys(x).forEach((k) => { ulos.push(k); avaimet(x[k], ulos); }); return ulos; };

describe('tmIdpTavoiteJaa: ei A-sisältöä, ei lukuja', () => {
  it('poistaa mittarin, lähdön, tavoitearvon, ankkurin, kypsyysvaroituksen, perustelu.tekstin ja arvio-arvot; ulostulossa ei yhtään lukua', () => {
    const j = D.tmIdpTavoiteJaa(raaka());
    expect(luvut(j, 't')).toEqual([]);
    const k = avaimet(j); ['mittari', 'lahto', 'tavoitearvo', 'ankkuri_7030', 'kypsyysvaroitus', 'teksti', 'arvo', 'pvm', 'luotu', 'pelaajan_arvio', 'alue', 'dim'].forEach((x) => expect(k, x).not.toContain(x));
    expect(JSON.stringify(j)).not.toMatch(/taso 2\/5|Lähtö|PHV/);
    expect(j).toEqual({ status: 'aktiivinen', fokus: { nimi: 'Lyhyt syöttö' }, kuvaus: 'Syötät tarkasti lähelle.', pelaajan_tavoite: 'Haluan syöttää tarkemmin', perustelu: { pelilause: 'Peli aukeaa kun syöttö on tarkka.' }, mitattava: true,
      arviot: [{ win: true, pelaajan_note: 'parani' }, { win: false, pelaajan_note: '' }, { win: true, pelaajan_note: '' }] });
  });
  it('hylätty / vaihdettu / fokuksen puuttuminen → null; taulukko suodattaa ne, järjestys säilyy', () => {
    expect(D.tmIdpTavoiteJaa(raaka({ status: 'hylatty' }))).toBeNull(); expect(D.tmIdpTavoiteJaa(raaka({ status: 'vaihdettu' }))).toBeNull(); expect(D.tmIdpTavoiteJaa({ status: 'aktiivinen' })).toBeNull(); expect(D.tmIdpTavoiteJaa(null)).toBeNull();
    expect(D.tmIdpPelaajaTavoitteet([raaka({ status: 'vaihdettu' }), raaka({ status: 'ehdotettu' }), raaka({ status: 'aktiivinen' })]).map((t) => t.status)).toEqual(['ehdotettu', 'aktiivinen']);
  });
});

describe('§7.22-näkymä identtinen raa\'alla ja puhdistetulla tavoitteella', () => {
  const t = (avain) => (avain === 'ip_nyt' ? 'Nyt-sv' : avain);
  const variantit = [
    raaka(), raaka({ arviot: [] }), raaka({ mittari: { yksikko: 's', suunta: 'suurempi' } }), raaka({ mittari: { yksikko: 'taso' } }), raaka({ mittari: { yksikko: 'vapaa' }, arviot: [{ pelaajan_arvio: 1 }, { pelaajan_arvio: 5, pelaajan_note: 'hyvä' }, {}] }),
    raaka({ pelaajan_tavoite: '' }), raaka({ kuvaus: '', perustelu: { teksti: 'x' } }), raaka({ lahto: undefined, arviot: [{ arvo: 3 }] }), raaka({ status: 'ehdotettu' }), raaka({ status: 'saavutettu' })
  ];
  variantit.forEach((v, i) => it('variantti ' + i + ': kaari + konsepti samat (fi ja käännösavain-kääntäjä)', () => {
    const j = D.tmIdpTavoiteJaa(v);
    [undefined, { t }].forEach((o) => { expect(P.tmPelaajaKaari(j, o)).toEqual(P.tmPelaajaKaari(v, o)); expect(P.tmPelaajaKonsepti(j, o)).toEqual(P.tmPelaajaKonsepti(v, o)); });
  }));
  it('kaari on edelleen kielletty-sisällön vapaa (ei numeroita/vertailua)', () => {
    expect(JSON.stringify(P.tmPelaajaKaari(D.tmIdpTavoiteJaa(raaka())))).not.toMatch(/\d/);
  });
});

describe('kirjoitusapurit: lippu POIS = ei mitään uutta', () => {
  it('Osa/Lisaa lippu pois (peruutus) → null/false, ei kirjoitusta', () => {
    D.LIPPU.kirjoitus = false; const f = mkFs(), b = f.db.batch();
    expect(D.tmIdpPelaajaOsa([raaka()], {})).toBeNull(); expect(D.tmIdpPelaajaLisaa(b, f.db, SID, PID, '2026', [raaka()], {})).toBe(false);
    expect(D.tmIdpPelaajaOsa([raaka()], { idpPelaajaKirjoitus: false })).toBeNull();
  });
  it('Lisaa lippu päällä: puhdistettu taulukko mergeFields-asetuksella → pelaaja_sitoumus säilyy', async () => {
    const f = mkFs(); f.docs[PEL] = { pelaaja_sitoumus: { rekisteri: 'a', vahvistettu_pvm: null } };
    const b = f.db.batch(); expect(D.tmIdpPelaajaLisaa(b, f.db, SID, PID, '2026', [raaka(), raaka({ status: 'vaihdettu' })], { idpPelaajaKirjoitus: true, nytISO: '2026-10-26' })).toBe(true); await b.commit();
    expect(f.docs[PEL].tavoitteet).toHaveLength(1); expect(luvut(f.docs[PEL], 'd')).toEqual([]); expect(f.docs[PEL].pelaaja_sitoumus).toEqual({ rekisteri: 'a', vahvistettu_pvm: null }); expect(f.docs[PEL].paivitetty).toBe('2026-10-26');
  });
  it('Varapolulla: permission-denied → uusi yritys ilman idp_pelaaja:a; lippu pois ei uudelleenyritystä; muu virhe heitetään', async () => {
    const f = mkFs({ hylkaaIdpPelaaja: true }); const kutsut = [];
    const fn = async (mukaan) => { kutsut.push(mukaan); const b = f.db.batch(); b.set(f.db.collection('seurat').doc(SID).collection('pelaajat').doc(PID).collection('idp_kausi').doc('2026'), { tavoitteet: [raaka()] }); if (mukaan) D.tmIdpPelaajaLisaa(b, f.db, SID, PID, '2026', [raaka()], { idpPelaajaKirjoitus: true }); await b.commit(); };
    await D.tmIdpPelaajaVarapolulla({ idpPelaajaKirjoitus: true }, fn); expect(kutsut).toEqual([true, false]); expect(f.docs[KAUSI].tavoitteet).toHaveLength(1); expect(f.docs[PEL]).toBeUndefined();
    kutsut.length = 0; await D.tmIdpPelaajaVarapolulla({}, fn); expect(kutsut).toEqual([false]);
    await expect(D.tmIdpPelaajaVarapolulla({ idpPelaajaKirjoitus: true }, async () => { throw Object.assign(new Error('x'), { code: 'unavailable' }); })).rejects.toThrow('x');
  });
});

describe('tmIdpSitoumusKirjoita', () => {
  const SIT = { rekisteri: 'showcase', sitoumus_pvm: '2026-10-01', vahvistettu_pvm: null };
  it('lippu pois: täsmälleen yksi idp_kausi-set (merge), ei idp_pelaaja:a', async () => {
    const f = mkFs(); await D.tmIdpSitoumusKirjoita(f.db, SID, PID, '2026', SIT, {}); expect(f.loki).toEqual([KAUSI]); expect(f.docs[KAUSI]).toEqual({ pelaaja_sitoumus: SIT });
  });
  it('lippu päällä: molemmat (dual-write); kausiLisa vain idp_kausi:hin; nested merge säilyttää vanhat vahvistus-kentät', async () => {
    const f = mkFs(); f.docs[KAUSI] = { tavoitteet: [raaka()], pelaaja_sitoumus: { vahvistettu_pvm: '2026-09-01', rekisteri: 'x' } }; f.docs[PEL] = { tavoitteet: [{ status: 'aktiivinen' }], pelaaja_sitoumus: { vahvistettu_pvm: '2026-09-01', rekisteri: 'x' } };
    await D.tmIdpSitoumusKirjoita(f.db, SID, PID, '2026', { sitoumus_pvm: '2026-10-02' }, { idpPelaajaKirjoitus: true, kausiLisa: { paivitetty: 'p' } });
    expect(f.docs[KAUSI].pelaaja_sitoumus).toEqual({ vahvistettu_pvm: '2026-09-01', rekisteri: 'x', sitoumus_pvm: '2026-10-02' }); expect(f.docs[KAUSI].paivitetty).toBe('p'); expect(f.docs[KAUSI].tavoitteet).toHaveLength(1);
    expect(f.docs[PEL].pelaaja_sitoumus.sitoumus_pvm).toBe('2026-10-02'); expect(f.docs[PEL].tavoitteet).toEqual([{ status: 'aktiivinen' }]); expect(typeof f.docs[PEL].paivitetty).toBe('string');
  });
  it('permission-denied (Rules v3.71 ei käytössä) → sitoumus tallentuu idp_kausi:hin', async () => {
    const f = mkFs({ hylkaaIdpPelaaja: true }); await D.tmIdpSitoumusKirjoita(f.db, SID, PID, '2026', SIT, { idpPelaajaKirjoitus: true }); expect(f.docs[KAUSI].pelaaja_sitoumus).toEqual(SIT); expect(f.docs[PEL]).toBeUndefined();
  });
});

describe('tmIdpPelaajaValitse (dual-read seuraa lippua)', () => {
  const pd = { tavoitteet: [{ status: 'aktiivinen', fokus: { nimi: 'A' } }], pelaaja_sitoumus: { s: 1 } }, kd = { tavoitteet: [raaka()], pelaaja_sitoumus: { s: 2 } };
  it('lippu pois: idp_kausi kuten ennen (myös kun idp_pelaaja on olemassa)', () => { expect(D.tmIdpPelaajaValitse(pd, kd, {})).toEqual({ tavoitteet: kd.tavoitteet, pelaaja_sitoumus: { s: 2 }, lahde: 'kausi' }); });
  it('lippu päällä: idp_pelaaja voittaa; puuttuessa varalle idp_kausi; kumpikaan → tyhjä', () => {
    const o = { idpPelaajaKirjoitus: true };
    expect(D.tmIdpPelaajaValitse(pd, kd, o)).toEqual({ tavoitteet: pd.tavoitteet, pelaaja_sitoumus: { s: 1 }, lahde: 'pelaaja' });
    expect(D.tmIdpPelaajaValitse(null, kd, o).lahde).toBe('kausi'); expect(D.tmIdpPelaajaValitse(null, null, o)).toEqual({ tavoitteet: null, pelaaja_sitoumus: null, lahde: null });
    expect(D.tmIdpPelaajaValitse({ pelaaja_sitoumus: { s: 3 } }, kd, o)).toMatchObject({ tavoitteet: kd.tavoitteet, pelaaja_sitoumus: { s: 3 } });   // vain sitoumus idp_pelaaja:ssa (pelaaja ehti ennen henkilökunnan dual-writea)
  });
});

describe('Rules v3.71 (tekstitarkistus; toiminta: tests/rules/firestore.rules.test.js)', () => {
  const R = lue('tm_admin/firestore.rules'), blokki = (nimi) => { const i = R.indexOf('match /' + nimi + '/{vuosi}'); return R.slice(i, R.indexOf('\n        }\n', i)); };
  it('versio + idp_pelaaja-blokki: huoltaja ja pelaaja lukevat, pelaaja kirjoittaa vain sitoumuksen', () => {
    expect(R).toMatch(/firestore\.rules v3\.71/);
    const b = blokki('idp_pelaaja'); expect(b).toMatch(/onPelaajaItse\(seuraId, pelaajaId\)\s*\|\|\s*onLapsenHuoltaja\(seuraId, pelaajaId\)/); expect(b).toMatch(/hasOnly\(\['pelaaja_sitoumus', 'paivitetty'\]\)/); expect(b).toMatch(/allow delete: if onSuperAdmin\(\)/);
  });
  it('idp_kausi EI kavennettu tässä PR:ssä (pelaaja lukee ja kirjoittaa sitoumuksensa edelleen; siivous lipun jälkeen)', () => {
    const b = blokki('idp_kausi'); expect(b).toMatch(/onPelaajaItse\(seuraId, pelaajaId\);\s*\/\/ pelaaja lukee oman kausitavoitteensa/); expect(b).toMatch(/hasOnly\(\['pelaaja_sitoumus'\]\)/); expect(b).not.toMatch(/onLapsenHuoltaja/);
  });
  it('lib on kytketty henkilökunnan (1f-2) ja pelaajan (1f-3) sivuihin, ei Vanhempaan; lippu PÄÄLLÄ oletuksena (lähde)', () => {
    expect(lue('TalentMaster_Vanhempi_v2.html')).not.toContain('tm_idp_pelaaja_dok');
    ['Pelaaja_v7', 'Master_v16', 'VP_v25', 'Kehitystyopoyta', 'Seura'].forEach((s) => expect(lue('TalentMaster_' + s + '.html')).toMatch(/lib\/tm_idp_pelaaja_dok\.js/));
    expect(lue('lib/tm_idp_pelaaja_dok.js')).toMatch(/var LIPPU = \{ kirjoitus: true \}/);
  });
});
