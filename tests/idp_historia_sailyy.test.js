/**
 * HOTFIX-VARTIJA · kausitavoite tai sen historia ei saa koskaan kadota.
 *
 * VIKA 1 — TALLENNUS YLIKIRJOITTI KOKO TAULUKON. VP ja Master kirjoittivat kausitavoitteen
 * yhden alkion taulukkona `merge: true` -optiolla. Firestoren merge EI yhdistä taulukoita vaan
 * KORVAA kentän kokonaan, joten jokainen tallennus jätti taulukkoon yhden tavoitteen ja pyyhki
 * vanhan tavoitteen sekä sen `arviot`-kehityskeskustelut PYSYVÄSTI. Kaikki tallennuspolut
 * (tavoite · kehityskeskustelu · elinkaari) kulkivat tätä kautta. Lukijat olettivat jo historiaa
 * (`arr[arr.length-1]`) — vain tallennus rikkoi sen.
 *
 * VIKA 2 — VUODENVAIHDE. Doc-id on kalenterivuosi (idpKausivuosi), joten syksyn 2026 tavoite olisi
 * kadonnut näkyvistä 1.1.2027 ja seuraava tallennus olisi aloittanut tyhjästä 2027-dokista.
 *
 * KORJAUS: `idpTavoitteetYhdista` yhdistää (vanha saa status 'vaihdettu' + vaihdettu_pvm, arviot
 * säilyvät), tallennus ajetaan transaktiossa (luku → yhdistä → kirjoitus), ja lataus löytää
 * tavoitteen myös edellisen vuoden dokista. Lukijat eivät koskaan valitse 'vaihdettu'/'hylatty'.
 *
 * Ei rules-muutosta: transaktion luku ja kirjoitus ovat samoja operaatioita samoille rooleille.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const IDP = vaadi('../lib/tm_idp.js');
const { idpTavoitteetYhdista, idpVoimassaTavoite, idpValitseKausidokista, idpTallennusVuosi, idpJaaVoimassaJaEhdotus } = IDP;

const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const MASTER = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
const PELAAJA = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');

const NYT = '2026-09-23T10:00:00.000Z';
const A = () => ({ luotu: '2026-01-15T08:00:00.000Z', status: 'aktiivinen', kuvaus: 'A', arviot: [{ pvm: '1' }, { pvm: '2' }, { pvm: '3' }] });
const B = () => ({ luotu: '2026-09-23T09:00:00.000Z', status: 'aktiivinen', kuvaus: 'B', arviot: [] });

describe('(1) Muokkaus — sama luotu korvaa vain sen alkion', () => {
  it('pituus 1, kuvaus päivittyy, arviot säilyvät', () => {
    const a = A();
    const muokattu = Object.assign({}, a, { kuvaus: 'A muokattu' });
    const ulos = idpTavoitteetYhdista([a], muokattu, { nyt: NYT });
    expect(ulos).toHaveLength(1);
    expect(ulos[0].kuvaus).toBe('A muokattu');
    expect(ulos[0].arviot).toHaveLength(3);
    expect(ulos[0].status).toBe('aktiivinen');
  });
});

describe('(2) Vaihto — vanha säilyy statuksella vaihdettu', () => {
  const ulos = idpTavoitteetYhdista([A()], B(), { nyt: NYT });

  it('taulukossa on MOLEMMAT, vanha ensin', () => {
    expect(ulos).toHaveLength(2);
    expect(ulos[0].kuvaus).toBe('A');
    expect(ulos[1].kuvaus).toBe('B');
  });

  it('vanha: status vaihdettu + vaihdettu_pvm, ARVIOT SÄILYVÄT', () => {
    expect(ulos[0].status).toBe('vaihdettu');
    expect(ulos[0].vaihdettu_pvm).toBe(NYT);
    expect(ulos[0].arviot, 'kehityskeskustelut katosivat').toHaveLength(3);
    expect(ulos[0].luotu).toBe(A().luotu);
  });

  it('uusi on voimassa oleva', () => {
    expect(ulos[1].status).toBe('aktiivinen');
    expect(idpVoimassaTavoite(ulos).kuvaus).toBe('B');
  });

  it('korvaa:false → vanhaa ei merkitä vaihdetuksi', () => {
    const u = idpTavoitteetYhdista([A()], B(), { nyt: NYT, korvaa: false });
    expect(u[0].status).toBe('aktiivinen');
  });
});

describe('(3) Ehdotus ei vaihda ennen hyväksyntää', () => {
  it('ehdotettu lisätään, voimassa oleva pysyy aktiivisena', () => {
    const ehdotus = Object.assign(B(), { status: 'ehdotettu' });
    const ulos = idpTavoitteetYhdista([A()], ehdotus, { nyt: NYT });
    expect(ulos[0].status, 'ehdotus syrjäytti voimassa olevan').toBe('aktiivinen');
    expect(ulos[1].status).toBe('ehdotettu');
  });

  /* K1 · KAKSIVAIHEINEN HYVÄKSYNTÄ. Ehdotus tallennetaan omana alkionaan, ja hyväksyntä palaa SAMALLA
     luotu-tunnisteella statuksella 'aktiivinen'. Ilman korvaa-haaran lisäystä taulukkoon jäi KAKSI
     voimassa olevaa tavoitetta — ja jos uusi myöhemmin hylättiin, vanha heräsi henkiin. */
  it('hyväksyntä (sama luotu, aktiivinen) MERKITSEE edellisen vaihdetuksi', () => {
    const ehdotus = Object.assign(B(), { status: 'ehdotettu' });
    const vaihe1 = idpTavoitteetYhdista([A()], ehdotus, { nyt: NYT });
    const hyvaksytty = Object.assign({}, ehdotus, { status: 'aktiivinen' });
    const vaihe2 = idpTavoitteetYhdista(vaihe1, hyvaksytty, { nyt: NYT });
    expect(vaihe2).toHaveLength(2);
    expect(vaihe2[0].status, 'kaksi voimassa olevaa tavoitetta').toBe('vaihdettu');
    expect(vaihe2[0].vaihdettu_pvm).toBe(NYT);
    expect(vaihe2[0].arviot, 'vanhan kehityskeskustelut katosivat').toHaveLength(3);
    expect(vaihe2[1].status).toBe('aktiivinen');
    expect(idpVoimassaTavoite(vaihe2).kuvaus).toBe('B');
    // täsmälleen yksi voimassa oleva
    expect(vaihe2.filter((x) => ['aktiivinen', 'jatkuu', 'saavutettu'].includes(x.status))).toHaveLength(1);
  });

  it('K1 · aktiivinen → saavutettu EI merkitse mitään vaihdetuksi', () => {
    const ulos = idpTavoitteetYhdista([A()], Object.assign(A(), { status: 'saavutettu' }), { nyt: NYT });
    expect(ulos).toHaveLength(1);
    expect(ulos[0].status).toBe('saavutettu');
    expect(ulos.some((x) => x.status === 'vaihdettu')).toBe(false);
  });

  it('K1 · ehdotettu → hylatty jättää voimassa olevan rauhaan', () => {
    const ehdotus = Object.assign(B(), { status: 'ehdotettu' });
    const lista = idpTavoitteetYhdista([A()], ehdotus, { nyt: NYT });
    const ulos = idpTavoitteetYhdista(lista, Object.assign({}, ehdotus, { status: 'hylatty' }), { nyt: NYT });
    expect(ulos[0].status, 'hylkäys vaihtoi voimassa olevan').toBe('aktiivinen');
    expect(ulos[1].status).toBe('hylatty');
    expect(idpVoimassaTavoite(ulos).kuvaus).toBe('A');
  });
});

describe('(4) Kehityskeskustelu ja elinkaari — sama luotu', () => {
  it('arviot-lisäys päivittää alkion, muut säilyvät', () => {
    const lista = idpTavoitteetYhdista([A()], B(), { nyt: NYT });   // [A(vaihdettu), B]
    const bArvioilla = Object.assign(B(), { arviot: [{ pvm: 'uusi' }] });
    const ulos = idpTavoitteetYhdista(lista, bArvioilla, { nyt: NYT });
    expect(ulos).toHaveLength(2);
    expect(ulos[1].arviot).toHaveLength(1);
    expect(ulos[0].arviot, 'vanhan arviot katosivat').toHaveLength(3);
    expect(ulos[0].status).toBe('vaihdettu');
  });

  it('elinkaari (saavutettu) päivittää alkion eikä lisää uutta', () => {
    const saavutettu = Object.assign(A(), { status: 'saavutettu' });
    const ulos = idpTavoitteetYhdista([A()], saavutettu, { nyt: NYT });
    expect(ulos).toHaveLength(1);
    expect(ulos[0].status).toBe('saavutettu');
    expect(ulos[0].arviot).toHaveLength(3);
  });
});

describe('(5) Ei mutatoi syötettä', () => {
  it('syötetaulukko ja sen alkiot ovat muuttumattomia (Object.freeze)', () => {
    const a = Object.freeze(A());
    const lista = Object.freeze([a]);
    expect(() => idpTavoitteetYhdista(lista, B(), { nyt: NYT })).not.toThrow();
    expect(lista).toHaveLength(1);
    expect(a.status, 'alkuperäinen alkio mutatoitui').toBe('aktiivinen');
  });

  it('puuttuva luotu → käsitellään uutena (ei korvaa väärää alkiota)', () => {
    const ilman = { status: 'aktiivinen', kuvaus: 'X' };
    const ulos = idpTavoitteetYhdista([A()], ilman, { nyt: NYT });
    expect(ulos).toHaveLength(2);
    expect(ulos[0].status).toBe('vaihdettu');
  });
});

describe('(6) Lähteessä ei yhden alkion ylikirjoitusta', () => {
  it.each([['VP', VP], ['Master', MASTER]])('%s: grep `tavoitteet: [t]` = 0', (_nimi, src) => {
    expect(src).not.toContain('tavoitteet: [t]');
  });

  it.each([['VP', VP], ['Master', MASTER]])('%s: tallennus kutsuu idpTavoitteetYhdista transaktiossa', (_nimi, src) => {
    expect(src).toContain('idpTavoitteetYhdista(nykyiset, t)');
    expect(src).toMatch(/runTransaction\(async function \(tx\)/);
    expect(src).toContain('await tx.get(kausiRef)');
    expect(src).toContain('tx.set(kausiRef, { tavoitteet: yhd');
  });
});

describe('(7) Vuodenvaihde', () => {
  it('kuluva tyhjä, edellisessä aktiivinen → valitaan edellinen + vuosi', () => {
    const r = idpValitseKausidokista([], '2027', [A()], '2026');
    expect(r).toBeTruthy();
    expect(r.tavoite.kuvaus).toBe('A');
    expect(r.vuosi).toBe('2026');
  });

  it('kuluvassa voimassa oleva → edellistä ei käytetä', () => {
    const r = idpValitseKausidokista([B()], '2027', [A()], '2026');
    expect(r.vuosi).toBe('2027');
    expect(r.tavoite.kuvaus).toBe('B');
  });

  it('kummassakaan ei voimassa olevaa → null', () => {
    const vaihdettu = Object.assign(A(), { status: 'vaihdettu' });
    expect(idpValitseKausidokista([], '2027', [vaihdettu], '2026')).toBeNull();
  });

  it('ladatun tavoitteen tallennus kohdistuu SAMAAN dokkiin', () => {
    const p = { _idpVuosi: '2026', _idpVuosiLuotu: A().luotu };
    expect(idpTallennusVuosi(p, A(), new Date('2027-01-15'))).toBe('2026');
  });

  it('UUSI tavoite kohdistuu kuluvaan kauteen', () => {
    const p = { _idpVuosi: '2026', _idpVuosiLuotu: A().luotu };
    expect(idpTallennusVuosi(p, B(), new Date('2027-01-15'))).toBe('2027');
  });

  it('ilman _idpVuosi:a aina kuluva kausi', () => {
    expect(idpTallennusVuosi({}, A(), new Date('2027-01-15'))).toBe('2027');
  });

  it.each([['VP', VP], ['Master', MASTER], ['Pelaaja', PELAAJA]])('%s: lataus lukee edellisen vuoden jos voimassa olevaa ei ole', (_n, src) => {
    expect(src).toContain('idpVoimassaTavoite');
    expect(src).toMatch(/Number\(vuosi\) - 1/);
  });
});

describe('(8) Lukijat eivät koskaan valitse vaihdettua/hylättyä', () => {
  it('[A(vaihdettu), B(aktiivinen)] → B', () => {
    const lista = [Object.assign(A(), { status: 'vaihdettu' }), B()];
    expect(idpVoimassaTavoite(lista).kuvaus).toBe('B');
  });

  it('[A(aktiivinen), B(vaihdettu)] → A (ei sokeasti viimeinen)', () => {
    const lista = [A(), Object.assign(B(), { status: 'vaihdettu' })];
    expect(idpVoimassaTavoite(lista).kuvaus).toBe('A');
  });

  it('hylatty ohitetaan samoin', () => {
    const lista = [A(), Object.assign(B(), { status: 'hylatty' })];
    expect(idpVoimassaTavoite(lista).kuvaus).toBe('A');
  });

  it('ehdotettu kelpaa voimassa olevaksi (näkyy kortilla)', () => {
    const lista = [Object.assign(B(), { status: 'ehdotettu' })];
    expect(idpVoimassaTavoite(lista).kuvaus).toBe('B');
  });

  /* Pelaaja-appin suodatin ajetaan LÄHTEESTÄ: greppi ei takaisi että molemmat statukset ovat mukana. */
  it('Pelaaja-appin suodatin pudottaa sekä hylatyn että vaihdetun', () => {
    const rivi = PELAAJA.split('\n').find((l) => l.includes("t.status !== 'hylatty'"));
    expect(rivi, 'suodatinriviä ei löydy').toBeTruthy();
    const m = /arr\.filter\((function[\s\S]*?\})\)/.exec(rivi);
    expect(m, 'suodattimen muoto muuttui').toBeTruthy();
    // eslint-disable-next-line no-new-func
    const suodatin = new Function('return ' + m[1])();
    const lista = [A(), Object.assign(B(), { status: 'vaihdettu' }), { status: 'hylatty' }];
    const jaljella = lista.filter(suodatin);
    expect(jaljella).toHaveLength(1);
    expect(jaljella[0].kuvaus).toBe('A');
  });

  it('lib-vartijat: vaihdettu ei ole jumissa eikä näy pelaajan kaaressa', () => {
    const vanha = Object.assign(A(), { status: 'vaihdettu', luotu: '2020-01-01T00:00:00.000Z' });
    expect(IDP.idpJumissa(vanha, new Date('2026-09-23'))).toBe(false);
    expect(IDP.idpPelaajaKaari(Object.assign(vanha, { fokus: { nimi: 'x' } }))).toBeNull();
  });
});

describe('(9) K2 · fail-closed — vanha lib ei saa palauttaa ylikirjoitusta', () => {
  /* lib/*.js tulee Firebasen oletusvälimuistista (firebase.json antaa no-cache vain html/sw/manifestille)
     ja sw_pelaaja cachettaa /lib/tm_idp.js:n cache-first. Uusi HTML + vanha lib olisi `[t]`-fallbackin
     kautta tuottanut TÄSMÄLLEEN sen ylikirjoituksen jonka tämä hotfix korjaa. */
  const runko = (src, tunniste) => {
    const i = src.indexOf(tunniste);
    expect(i, tunniste + ' puuttuu').toBeGreaterThan(-1);
    let syv = 0;
    for (let k = src.indexOf('{', i); k < src.length; k++) {
      if (src[k] === '{') syv++;
      else if (src[k] === '}') { syv--; if (syv === 0) return src.slice(i, k + 1); }
    }
    throw new Error('sulut');
  };

  it.each([['VP', VP, 'async function _vpTallennaIdpDok'], ['Master', MASTER, 'async function _mIdpTallennaDok']])(
    '%s: ei [t]-fallbackia tallennusfunktiossa', (_n, src, tunn) => {
      expect(runko(src, tunn)).not.toMatch(/:\s*\[t\]/);
    });

  it.each([['VP', VP, 'async function _vpTallennaIdpDok'], ['Master', MASTER, 'async function _mIdpTallennaDok']])(
    '%s: heittää ENNEN transaktiota jos helper puuttuu', (_n, src, tunn) => {
      const r = runko(src, tunn);
      const iThrow = r.indexOf('throw new Error');
      const iTx = r.indexOf('runTransaction');
      expect(iThrow, 'fail-closed-heittoa ei ole').toBeGreaterThan(-1);
      expect(iThrow, 'heitto on vasta transaktion jälkeen').toBeLessThan(iTx);
      expect(r).toContain("typeof idpTavoitteetYhdista !== 'function'");
      expect(r).toContain("typeof idpTallennusVuosi !== 'function'");
    });

  it('kolmen appin tm_idp.js-versio on nostettu (VP/Master ≥7, Pelaaja ≥3)', () => {
    const v = (src) => Number((/lib\/tm_idp\.js\?v=(\d+)/.exec(src) || [])[1]);
    expect(v(VP)).toBeGreaterThanOrEqual(7);
    expect(v(MASTER)).toBeGreaterThanOrEqual(7);
    expect(v(PELAAJA)).toBeGreaterThanOrEqual(3);
  });
});

describe('(10) K3 · lataajat käyttävät jaettua helperiä — KÄYTTÄYTYMISTESTI', () => {
  /* Lataajat ajetaan LÄHTEESTÄ purettuna stub-db:llä: greppi ei näkisi että _idpVuosi asetetaan
     oikeasta dokista eikä että edellistä vuotta ei lueta turhaan. */
  function lataaja(src, tunniste) {
    const i = src.indexOf(tunniste);
    expect(i, tunniste + ' puuttuu').toBeGreaterThan(-1);
    let syv = 0;
    for (let k = src.indexOf('{', i); k < src.length; k++) {
      if (src[k] === '{') syv++;
      else if (src[k] === '}') { syv--; if (syv === 0) return src.slice(i, k + 1); }
    }
    throw new Error('sulut');
  }

  /* Ketjutettava stub: collection→doc→collection→doc→collection→doc→get (sama polku kuin apeissa).
     Laskuriin kirjataan VAIN vuosidokit, jotta "edellistä vuotta ei lueta" on mitattavissa. */
  function stubDb(dokit, laskuri) {
    const snap = (y) => ({ exists: !!dokit[y], data: () => dokit[y] || {} });
    const mkCol = () => ({ doc: (id) => mkDoc(id) });
    const mkDoc = (id) => ({
      collection: () => mkCol(),
      get: async () => { if (/^\d{4}$/.test(String(id))) laskuri.push(String(id)); return snap(id); },
    });
    return { collection: () => mkCol() };   // juuri = db: db.collection('seurat').doc(..)…
  }

  const AA = () => ({ luotu: 'a', status: 'aktiivinen', kuvaus: 'A', arviot: [] });
  const BB = () => ({ luotu: 'b', status: 'aktiivinen', kuvaus: 'B', arviot: [] });

  async function ajaVP(dokit, laskuri) {
    const p = { id: 'p1', idp_tila: 'aktiivinen' };
    const ymp = {
      db: stubDb(dokit, laskuri), _seuraId: 's1', _isDemoMode: false,
      idpKausivuosi: () => '2027',
      idpVoimassaTavoite, idpValitseKausidokista, idpJaaVoimassaJaEhdotus,
      window: { _vpArvPelaaja: null },
      _vpKausitavoiteReRender: () => {}, _vpAloitusReRender: () => {},
    };
    const nimet = Object.keys(ymp);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...nimet, lataaja(VP, 'async function _vpLataaTavoite') + '\nreturn _vpLataaTavoite;')(
      ...nimet.map((k) => ymp[k]));
    await fn(p);
    return p;
  }

  async function ajaMaster(dokit, laskuri) {
    const p = { id: 'p1', idp_tila: 'aktiivinen' };
    const ymp = {
      _db: stubDb(dokit, laskuri), _seuraId: 's1', _demo: false,
      idpKausivuosi: () => '2027',
      idpVoimassaTavoite, idpValitseKausidokista,
      window: { _mIdpPelaaja: null },
      _mIdpReRender: () => {},
    };
    const nimet = Object.keys(ymp);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...nimet, lataaja(MASTER, 'async function _mIdpLataa') + '\nreturn _mIdpLataa;')(
      ...nimet.map((k) => ymp[k]));
    await fn(p);
    return p;
  }

  it('VP: 2027 tyhjä, 2026 [A aktiivinen] → A ja _idpVuosi 2026', async () => {
    const laskuri = [];
    const p = await ajaVP({ 2026: { tavoitteet: [AA()] } }, laskuri);
    expect(p._idpTavoite.kuvaus).toBe('A');
    expect(p._idpVuosi, 'tallennus menisi väärään dokkiin').toBe('2026');
    expect(p._idpVuosiLuotu).toBe('a');
  });

  it('VP: 2027 [A vaihdettu, B aktiivinen] → B ja _idpVuosi 2027', async () => {
    const laskuri = [];
    const p = await ajaVP({ 2027: { tavoitteet: [Object.assign(AA(), { status: 'vaihdettu' }), BB()] } }, laskuri);
    expect(p._idpTavoite.kuvaus).toBe('B');
    expect(p._idpVuosi).toBe('2027');
  });

  it('VP: 2027 [B aktiivinen] → edellistä vuotta EI lueta', async () => {
    const laskuri = [];
    await ajaVP({ 2027: { tavoitteet: [BB()] } }, laskuri);
    expect(laskuri).toEqual(['2027']);
  });

  it('Master: 2027 tyhjä, 2026 [A] → A ja _idpVuosi 2026', async () => {
    const laskuri = [];
    const p = await ajaMaster({ 2026: { tavoitteet: [AA()] } }, laskuri);
    expect(p._mIdpTavoite.kuvaus).toBe('A');
    expect(p._idpVuosi).toBe('2026');
  });

  it('Master: 2027 [A vaihdettu, B] → B, edellistä ei lueta', async () => {
    const laskuri = [];
    const p = await ajaMaster({ 2027: { tavoitteet: [Object.assign(AA(), { status: 'vaihdettu' }), BB()] } }, laskuri);
    expect(p._mIdpTavoite.kuvaus).toBe('B');
    expect(laskuri).toEqual(['2027']);
  });

  async function ajaPelaaja(dokit, laskuri) {
    const win = { _db: stubDb(dokit, laskuri), _p7Tavoite: null, _p7Sitoumus: null };
    const ymp = {
      _ladattu: { idp: false },
      _pelaaja: { id: 'p1', seuraId: 's1' },
      window: win,
      idpKausivuosi: () => '2027',
      idpVoimassaTavoite, idpValitseKausidokista, idpOnVoimassa: IDP.idpOnVoimassa,
      _p7Tavoite: null, _tab: 'muu', _sc: 'main', draw: () => {},
    };
    const nimet = Object.keys(ymp);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...nimet, lataaja(PELAAJA, 'async function _p7LataaTavoite') + '\nreturn _p7LataaTavoite;')(
      ...nimet.map((k) => ymp[k]));
    await fn();
    return win._p7Tavoite;
  }

  it('Pelaaja: 2027 tyhjä, 2026 [A aktiivinen] → A (vuodenvaihde toimii)', async () => {
    const laskuri = [];
    const tav = await ajaPelaaja({ 2026: { tavoitteet: [AA()] } }, laskuri);
    expect(tav, 'vuodenvaihteen fallback ei toimi').toBeTruthy();
    expect(tav.kuvaus).toBe('A');
    expect(laskuri).toEqual(['2027', '2026']);
  });

  it('Pelaaja: 2027 [B aktiivinen] → edellistä vuotta EI lueta', async () => {
    const laskuri = [];
    const tav = await ajaPelaaja({ 2027: { tavoitteet: [BB()] } }, laskuri);
    expect(tav.kuvaus).toBe('B');
    expect(laskuri).toEqual(['2027']);
  });

  it('Pelaaja: 2027 [A aktiivinen, B ehdotettu] → A (K4 voimassa-preferenssi)', async () => {
    const laskuri = [];
    const tav = await ajaPelaaja({ 2027: { tavoitteet: [AA(), Object.assign(BB(), { status: 'ehdotettu' })] } }, laskuri);
    expect(tav.kuvaus, 'lapsi näkisi hyväksymättömän ehdotuksen').toBe('A');
  });

  it.each([['VP', VP], ['Master', MASTER], ['Pelaaja', PELAAJA]])('%s kutsuu idpValitseKausidokista:a', (_n, src) => {
    expect(src).toContain('idpValitseKausidokista(');
  });
});

describe('(11) K4 · Pelaaja suosii voimassa olevaa ehdotuksen sijaan', () => {
  /* Ennen hotfixiä taulukossa oli aina yksi alkio. Nyt [A aktiivinen, B ehdotettu] on mahdollinen,
     eikä lapselle näytetä valmentajan hyväksymätöntä ehdotusta "Sinun tavoitteenasi". */
  function pelaajanValinta(arr) {
    const rivit = PELAAJA.split('\n');
    const i = rivit.findIndex((l) => l.includes('var kelpo = arr.filter'));
    expect(i, 'valintalohkoa ei löydy').toBeGreaterThan(-1);
    const lohko = rivit.slice(i, i + 3).join('\n');
    // eslint-disable-next-line no-new-func
    return new Function('arr', 'idpOnVoimassa', lohko + '\nreturn valinta;')(arr, IDP.idpOnVoimassa);
  }

  it('[A aktiivinen, B ehdotettu] → A', () => {
    const valinta = pelaajanValinta([A(), Object.assign(B(), { status: 'ehdotettu' })]);
    expect(valinta.kuvaus, 'lapsi näkisi hyväksymättömän ehdotuksen').toBe('A');
  });

  it('[B ehdotettu] → B (ensimmäisen tavoitteen käytös säilyy)', () => {
    expect(pelaajanValinta([Object.assign(B(), { status: 'ehdotettu' })]).kuvaus).toBe('B');
  });

  it('vaihdettu ja hylatty eivät kelpaa kummassakaan tapauksessa', () => {
    const valinta = pelaajanValinta([Object.assign(A(), { status: 'vaihdettu' }), { status: 'hylatty' }]);
    expect(valinta).toBeNull();
  });
});
