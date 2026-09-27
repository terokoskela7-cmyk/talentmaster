/**
 * TalentMaster™ — H1 · arviointikertojen KIRJOITUS. Vartija.
 *
 * Brief §8. Todiste on ajettu siellä missä mahdollista: `_vpTallennaHavaittu` suoritetaan
 * Firestore-tyngällä (repon konventio, ei emulaattoria) ja tyngän keräämistä kutsuista luetaan,
 * mitä oikeasti kirjoitettiin ja millä polulla. Näin "kaksi arvioijaa → kaksi kertaa" ja
 * atomisuus ovat mitattuja tosiasioita, eivät lähdekoodin sanamuotoja.
 *
 * Brief: docs/CODE_BRIEF_ARVIOINTI_HISTORIA_MONIARVIOIJA.md
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const vaadi = createRequire(import.meta.url);
const AH = vaadi('../lib/tm_arviointi_historia.js');

function pura(tunniste) {
  const i = VP.indexOf(tunniste);
  expect(i, tunniste + ' puuttuu VP:stä').toBeGreaterThan(-1);
  let syv = 0;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) {
    if (VP[k] === '{') syv++;
    else if (VP[k] === '}') { syv--; if (syv === 0) return VP.slice(i, k + 1); }
  }
  throw new Error('sulkuja ei saatu tasan: ' + tunniste);
}

/** Firestore-tynkä: kerää transaktion kirjoitukset polkuineen. `olemassa` = doc joka on jo
    tallessa (2. klikkaus samaan kertaan) → transaktion tx.get palauttaa sen. */
function tynka(olemassa) {
  const kirjoitukset = [];
  let committeja = 0;
  const DEL = { __del: true };
  const SRV = { __srv: true };
  const ref = (polku) => ({
    _polku: polku,
    collection: (c) => ref(polku + '/' + c),
    doc: (d) => ref(polku + '/' + d),
  });
  const db = {
    collection: (c) => ref(c),
    runTransaction: async (fn) => {
      const tx = {
        get: async (r) => (olemassa && r._polku.indexOf('/arviointikerrat/') >= 0)
          ? { exists: true, data: () => olemassa }
          : { exists: false, data: () => null },
        set(r, data, opts) { kirjoitukset.push({ polku: r._polku, data, opts }); },
      };
      const tulos = await fn(tx);
      committeja += 1;
      return tulos;
    },
  };
  const firebase = {
    auth: () => ({ currentUser: { uid: 'uid-a', displayName: 'Arvioija A', getIdToken: () => Promise.resolve('t') } }),
    firestore: { FieldValue: { delete: () => DEL, serverTimestamp: () => SRV } },
  };
  return { db, firebase, kirjoitukset, DEL, SRV, commitit: () => committeja };
}

const PELAAJA = {
  id: 'p1', tunniste: '12345678', joukkue: 'SJK P13', positio: 'KP',
  phv_tila: 'PRE', rae_kvartaali: 'Q2', kehitysvaihe_kaista: 'pre',
  arviointi_havaittu: {},
};

/** Ajaa oikean _vpTallennaHavaittu-funktion tyngällä. */
async function tallenna(opts) {
  const o = opts || {};
  const tk = tynka(o.olemassa || null);
  const store = {
    db: tk.db, firebase: tk.firebase,
    _seuraId: o.seuraId || 'sjk', _uid: o.uid || 'uid-a', _rooli: o.rooli || 'vp',
    _seura: o.seura || { maa: 'FI' },
    _isDemoMode: false,
    _pelaajat: [o.pelaaja || PELAAJA],
    window: { TM_ARVIOINTI_HISTORIA: AH, _vpArvKonteksti: o.konteksti || null, _vpArvNakyvyys: o.nakyvyys || null, _vpArvKehys: 'palloliitto' },
    document: { getElementById: () => null },
    toast: () => {},
    _jsvEsc: (s) => String(s == null ? '' : s),
    vpT: (s) => s,
    console: { warn: () => {} },
    ARVIOINTI_KEHYS_OLETUS: 'palloliitto',
  };
  store.window.window = store.window;
  const ymp = new Proxy(store, {
    has: (t, k) => (k in t) || !(k in globalThis),
    get: (t, k) => (k === Symbol.unscopables ? undefined : (k in t ? t[k] : () => '')),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const runko = [
    'function _vpArvKontekstiOletus(p) {',
    'function _vpArvHaePelaaja(pid) {',
    'function _vpArvTilannekuva(p) {',
    'window._vpTallennaHavaittu = async function(pid, avain, arvo) {',
  ].map(pura).join('\n');
  // eslint-disable-next-line no-new-func
  const fn = new Function('__ymp', 'with(__ymp){' + runko + '\nreturn window._vpTallennaHavaittu;}')(ymp);
  await fn(o.pid || 'p1', o.avain || 'pelin_lukeminen', o.arvo === undefined ? 4 : o.arvo);
  return tk;
}

const kerta = (tk) => tk.kirjoitukset.find((w) => w.polku.indexOf('/arviointikerrat/') >= 0);
const pelaajaKirjoitus = (tk) => tk.kirjoitukset.find((w) => w.polku.indexOf('/arviointikerrat/') < 0);

/* ══ (1) APPEND-ONLY: ARVIO KUULUU ARVIOIJALLE ═════════════════════════════ */
describe('(1) kaksi arvioijaa samana päivänä → KAKSI kertaa, ei yhtä korvaavaa', () => {
  it('EI VACUOUS: tallennus kirjoittaa kerran ja pelaajadocin', async () => {
    const tk = await tallenna({});
    expect(tk.kirjoitukset.length).toBe(2);
    expect(kerta(tk)).toBeTruthy();
    expect(pelaajaKirjoitus(tk)).toBeTruthy();
  });

  it('eri arvioija → eri kerta-doc (sama päivä, sama kohde)', async () => {
    const a = await tallenna({ uid: 'uid-a' });
    const b = await tallenna({ uid: 'uid-b' });
    expect(kerta(a).polku).not.toBe(kerta(b).polku);
  });

  it('sama arvioija + sama päivä + sama konteksti → SAMA doc (kohteet kertyvät set mergellä)', async () => {
    const a = await tallenna({ uid: 'uid-a', avain: 'pelin_lukeminen' });
    const b = await tallenna({ uid: 'uid-a', avain: 'syotto' });
    expect(kerta(a).polku).toBe(kerta(b).polku);
    expect(kerta(a).opts).toMatchObject({ merge: true });
  });

  it('eri konteksti samana päivänä → eri kerta', async () => {
    const a = await tallenna({ konteksti: { tyyppi: 'ottelu' } });
    const b = await tallenna({ konteksti: { tyyppi: 'harjoitus' } });
    expect(kerta(a).polku).not.toBe(kerta(b).polku);
  });

  it('kirjoitus menee arviointikerrat-alikokoelmaan, EI vanhaan arviointi/{kausi}-dociin', async () => {
    const tk = await tallenna({});
    expect(kerta(tk).polku).toMatch(/seurat\/sjk\/pelaajat\/p1\/arviointikerrat\//);
    expect(tk.kirjoitukset.every((w) => w.polku.indexOf('/arviointi/') < 0)).toBe(true);
    expect(VP).not.toContain("collection('arviointi').doc(kausiId)");
  });
});

/* ══ (2) ATOMISUUS ═════════════════════════════════════════════════════════ */
describe('(2) kerta ja pikakenttä samassa batchissa (pari-invariantti §26)', () => {
  it('molemmat kirjoitukset tulevat samasta batchista, yksi commit', async () => {
    const tk = await tallenna({});
    expect(tk.kirjoitukset.length).toBe(2);
    expect(tk.commitit()).toBe(1);
  });

  it('pikakenttä arviointi_havaittu päivittyy samalla kirjoituksella', async () => {
    const tk = await tallenna({ avain: 'pelin_lukeminen', arvo: 4 });
    expect(pelaajaKirjoitus(tk).data.arviointi_havaittu).toMatchObject({ pelin_lukeminen: 4 });
    expect(pelaajaKirjoitus(tk).data.arviointi_pvm).toBeTruthy();
  });
});

/* ══ (3) KAUSI ═════════════════════════════════════════════════════════════ */
describe('(3) kausi = kalenterivuosi Suomessa (EI _vpTkKausi:n heinä–kesä)', () => {
  it('kerta saa kalenterivuosikauden', async () => {
    const tk = await tallenna({ seura: { maa: 'FI' } });
    expect(kerta(tk).data.kausi).toBe(String(new Date().getUTCFullYear()));
  });

  it('kausimalli heina_kesa tuottaa kaksiosaisen tunnisteen', async () => {
    const tk = await tallenna({ seura: { kausimalli: 'heina_kesa', maa: 'SE' } });
    expect(kerta(tk).data.kausi).toMatch(/^\d{4}-\d{2}$/);
  });

  it('kirjoitus EI käytä _vpTkKausi:a (se on heinä–kesä myös Suomessa)', () => {
    const f = pura('window._vpTallennaHavaittu = async function(pid, avain, arvo) {');
    // KUTSU, ei maininta: kommentti saa kertoa miksi vanhaa kausifunktiota ei käytetä.
    expect(f).not.toMatch(/_vpTkKausi\s*\(/);
    expect(f).toContain('AH.tmKausi(');
  });
});

/* ══ (4) TILANNEKUVA ═══════════════════════════════════════════════════════ */
describe('(4) tilannekuva luetaan pelaajadocista, ei käyttäjän syötteestä', () => {
  it('kerta kantaa arviohetken PHV-tilan, kvartaalin ja joukkueen', async () => {
    const tk = await tallenna({});
    expect(kerta(tk).data.tilannekuva).toMatchObject({ phv_tila: 'PRE', rae_kvartaali: 'Q2', joukkue: 'SJK P13' });
  });

  it('konteksti (käyttäjän syöte) ja tilannekuva (data) ovat eri kentät', async () => {
    const tk = await tallenna({ konteksti: { tyyppi: 'ottelu', pelipaikka: 'LP', minuutit: 60, vastustajataso: 'vanhemmat' } });
    const d = kerta(tk).data;
    expect(d.konteksti).toMatchObject({ tyyppi: 'ottelu', pelipaikka: 'LP', minuutit: 60, vastustajataso: 'vanhemmat' });
    expect(d.tilannekuva.joukkue).toBe('SJK P13');
    expect(d.tilannekuva.pelipaikka).toBeUndefined();
  });

  it('tilannekuva-helperi ei lue window._vpArvKonteksti:a', () => {
    expect(pura('function _vpArvTilannekuva(p) {')).not.toContain('_vpArvKonteksti');
  });
});

/* ══ (5) HISTORIA KULKEE PELAAJAN MUKANA ═══════════════════════════════════ */
describe('(5) kerta kantaa PalloID:n ja arviohetken seuran (§11 seurasiirto)', () => {
  it('palloId ja seuraId_arviohetkella tallentuvat', async () => {
    const tk = await tallenna({});
    expect(kerta(tk).data.palloId).toBe('12345678');
    expect(kerta(tk).data.seuraId_arviohetkella).toBe('sjk');
  });
});

/* ══ (6) N/A ≠ PUUTTUVA ════════════════════════════════════════════════════ */
describe('(6) N/A on tallennettu tieto ("ei sovellu"), puuttuva on "ei nähty"', () => {
  it("N/A kirjautuu kertaan arvona 'NA', ei poistona", async () => {
    const tk = await tallenna({ arvo: null, avain: 'kontaktipeli' });
    expect(kerta(tk).data.kohteet.kontaktipeli.arvo).toBe('NA');
  });

  it('N/A poistaa numeroarvon pikakentästä (kooste ei saa numeroa jota ei ole)', async () => {
    const tk = await tallenna({ arvo: null, avain: 'kontaktipeli' });
    expect(pelaajaKirjoitus(tk).data.arviointi_havaittu.kontaktipeli).toEqual(tk.DEL);
  });
});

/* ══ (7) ULKOPUOLINEN ARVIOIJA EI KÄÄNNÄ SEURAN PIKAKENTTÄÄ ════════════════ */
describe('(7) Palloliiton kerta ei muuta arviointi_havaittu-pikakenttää (IDP-silta)', () => {
  it('rooli palloliitto → kerta syntyy, pikakenttä ei muutu', async () => {
    const tk = await tallenna({ rooli: 'palloliitto' });
    expect(kerta(tk).data.arvioija_org).toBe('palloliitto');
    expect(pelaajaKirjoitus(tk).data.arviointi_havaittu).toBeUndefined();
    expect(pelaajaKirjoitus(tk).data.arviointi_pvm).toBeTruthy();
  });

  it('seuran rooli → pikakenttä päivittyy', async () => {
    const tk = await tallenna({ rooli: 'valmentaja' });
    expect(kerta(tk).data.arvioija_org).toBe('seura');
    expect(pelaajaKirjoitus(tk).data.arviointi_havaittu).toBeTruthy();
  });

  it('seuran arvioijan kerta on aina jaettu seuralle', async () => {
    const tk = await tallenna({ rooli: 'vp', nakyvyys: 'sisainen' });
    expect(kerta(tk).data.nakyvyys).toBe('seuralle');
  });

  it('Palloliiton arvioija voi valita sisäisen näkyvyyden', async () => {
    const tk = await tallenna({ rooli: 'palloliitto', nakyvyys: 'sisainen' });
    expect(kerta(tk).data.nakyvyys).toBe('sisainen');
  });
});

/* ══ (8) §7.22 — HISTORIA ON AIKUISTEN NÄKYMÄ ══════════════════════════════ */
describe('(8) pelaaja- ja huoltaja-app eivät lue arviointikertoja eivätkä koostetta', () => {
  const PELAAJA_APP = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
  const VANHEMPI = readFileSync(join(juuri, 'TalentMaster_Vanhempi_v2.html'), 'utf8');

  it('EI VACUOUS: molemmat tiedostot luettiin', () => {
    expect(PELAAJA_APP.length).toBeGreaterThan(1000);
    expect(VANHEMPI.length).toBeGreaterThan(1000);
  });

  it.each([['Pelaaja_v7', () => PELAAJA_APP], ['Vanhempi_v2', () => VANHEMPI]])('%s ei viittaa arviointikertoihin', (_n, hae) => {
    const s = hae();
    expect(s).not.toContain('arviointikerrat');
    expect(s).not.toContain('arviointi_kooste');
    expect(s).not.toContain('potentiaali_kooste');
  });
});

/* ══ (9) RIIPPUMATTOMUUS ENNEN VERTAILUA ═══════════════════════════════════ */
describe('(9) kirjaustilassa ei näytetä muiden arvioijien arvoja (ankkuroitumisharha)', () => {
  it('Arviointi-näkymä ei renderöi koostetta eikä arvioijamatriisia kirjauksen yhteyteen', () => {
    const f = pura('function _vpArviointiHTML(p) {');
    expect(f).not.toContain('arviointi_kooste');
    expect(f).not.toContain('tmAhHajonta');
    expect(f).not.toContain('tmAhViimeisimmat');
  });

  it('kontekstirivi ei näytä muiden arvioita', () => {
    // huom: 'kooste' on myös kontekstityypin arvo (Yleiskuva) → väite kohdistuu pikakenttään
    const f = pura('function _vpArvKontekstiHTML(p) {');
    expect(f).not.toContain('arviointi_kooste');
    expect(f).not.toContain('arvioija_');
  });
});

/* ══ (10) LIB-KOPIO EI SAA AJAUTUA ═════════════════════════════════════════ */
describe('(10) functions/-kopio on identtinen lib/-kanssa (deploy pakkaa vain functions/)', () => {
  it('tiedostot ovat merkki merkiltä samat', () => {
    const a = readFileSync(join(juuri, 'lib/tm_arviointi_historia.js'), 'utf8');
    const b = readFileSync(join(juuri, 'functions/tm_arviointi_historia.js'), 'utf8');
    expect(b).toBe(a);
  });

  it('CF käyttää kopiota eikä ../lib-polkua (jota deploy ei pakkaa)', () => {
    const idx = readFileSync(join(juuri, 'functions/index.js'), 'utf8');
    expect(idx).toContain("require('./tm_arviointi_historia.js')");
    expect(idx).not.toContain("require('../lib/tm_arviointi_historia.js')");
  });

  it('CF korvaa koostekentät kokonaan (merge jättäisi vanhentuneet kohteet paikoilleen)', () => {
    const idx = readFileSync(join(juuri, 'functions/index.js'), 'utf8');
    const i = idx.indexOf('exports.arviointikertaOnWrite');
    const f = idx.slice(i, idx.indexOf('\n});', i));
    expect(f).toContain("mergeFields: ['arviointi_kooste', 'potentiaali_kooste', 'arviointi_kooste_pvm']");
    expect(f).not.toMatch(/arviointi_kooste_pvm: new Date\(\)\.toISOString\(\),\s*\}, \{ merge: true \}/);
  });

  it('CF suodattaa sisäiset kerrat ennen koostetta', () => {
    const idx = readFileSync(join(juuri, 'functions/index.js'), 'utf8');
    const i = idx.indexOf('exports.arviointikertaOnWrite');
    expect(i).toBeGreaterThan(-1);
    const f = idx.slice(i, idx.indexOf('\n});', i));
    expect(f).toContain('AH.tmAhSeuralle(');
    expect(f.indexOf('AH.tmAhSeuralle(')).toBeLessThan(f.indexOf('AH.tmAhKooste('));
  });
});

/* ══ (11) REVIEW 1 — `luotu` VAIN LUONNISSA ════════════════════════════════
   Rules vaatii updatessa `request.resource.data.luotu == resource.data.luotu`. Vanha koodi
   lähetti serverTimestampin joka klikkauksella → 2. kohde samaan kertaan hylättiin, ja koska
   kerta ja pikakenttä olivat samassa batchissa, myös pikakenttä jäi päivittymättä. Vanha
   vartija ei nähnyt tätä: tynkä ei tunne Rulesia. Nyt väite kohdistuu payloadiin. */
describe('(11) luotu lähetetään vain uudelle kerralle', () => {
  it('uusi kerta saa luotu-kentän', async () => {
    const tk = await tallenna({});
    expect(kerta(tk).data.luotu).toEqual(tk.SRV);
  });

  it('OLEMASSA OLEVAAN kertaan kirjoitettaessa luotu EI ole mukana (muuten Rules hylkää)', async () => {
    const tk = await tallenna({ olemassa: { kohteet: { muu: { arvo: 3 } } } });
    expect(Object.keys(kerta(tk).data)).not.toContain('luotu');
  });

  it('kirjoitus tehdään transaktiossa (lukee ensin, ei sokkona)', () => {
    const f = pura('window._vpTallennaHavaittu = async function(pid, avain, arvo) {');
    expect(f).toContain('db.runTransaction(');
    expect(f).toContain('tx.get(kertaRef)');
  });

  it('pari-invariantti säilyy: molemmat kirjoitukset samassa transaktiossa', async () => {
    const tk = await tallenna({});
    expect(tk.kirjoitukset.length).toBe(2);
    expect(tk.commitit()).toBe(1);
  });

  it('payload rakennetaan JAETULLA funktiolla (sovellus ja Rules-testi eivät voi erkaantua)', () => {
    const f = pura('window._vpTallennaHavaittu = async function(pid, avain, arvo) {');
    expect(f).toContain('AH.tmAhKertaPayload(');
  });
});

/* ══ (12) REVIEW 4 — "Ei nähty" ≠ "Ei sovellu" ════════════════════════════ */
describe('(12) ei nähty ei kosketa seuran pikakenttään eikä pyyhi kollegan arviota', () => {
  it("'ei_nahty' poistaa kohteen OMASTA kerrasta", async () => {
    const tk = await tallenna({ arvo: 'ei_nahty', avain: 'x', olemassa: { kohteet: { x: { arvo: 4 }, y: { arvo: 3 } } } });
    expect(kerta(tk).data.kohteet.x).toBeUndefined();
    expect(kerta(tk).data.kohteet.y).toMatchObject({ arvo: 3 });
  });

  it("'ei_nahty' EI kirjoita arviointi_havaittu-pikakenttää (arvo voi olla toisen arvioijan)", async () => {
    const tk = await tallenna({ arvo: 'ei_nahty', avain: 'x', olemassa: { kohteet: { x: { arvo: 4 } } } });
    expect(pelaajaKirjoitus(tk).data.arviointi_havaittu).toBeUndefined();
  });

  it("'ei_nahty' ilman aiempaa kertaa ei kirjoita mitään kertaa", async () => {
    const tk = await tallenna({ arvo: 'ei_nahty', avain: 'x' });
    expect(kerta(tk)).toBeUndefined();
  });

  it("'NA' (ei sovellu) tallentuu kertaan ja poistaa numeron pikakentästä", async () => {
    const tk = await tallenna({ arvo: null, avain: 'x' });
    expect(kerta(tk).data.kohteet.x.arvo).toBe('NA');
    expect(pelaajaKirjoitus(tk).data.arviointi_havaittu.x).toEqual(tk.DEL);
  });
});

/* ══ (13) REVIEW 5 — korjaushistoria ══════════════════════════════════════ */
describe('(13) arvon korjaus ei pyyhi alkuperäistä jäljettömiin', () => {
  it('saman kohteen muutos kirjaa korjauksen (vanha → uusi)', async () => {
    const tk = await tallenna({ avain: 'x', arvo: 5, olemassa: { kohteet: { x: { arvo: 3 } } } });
    expect(kerta(tk).data.korjaukset).toEqual([expect.objectContaining({ avain: 'x', vanha: 3, uusi: 5 })]);
  });

  it('sama arvo uudelleen ei kirjaa korjausta (ei roskaa historiaan)', async () => {
    const tk = await tallenna({ avain: 'x', arvo: 3, olemassa: { kohteet: { x: { arvo: 3 } } } });
    expect(kerta(tk).data.korjaukset).toBeUndefined();
  });

  it('korjaukset ovat ISO-stringejä (§7.6: ei serverTimestamppia taulukkoon)', async () => {
    const tk = await tallenna({ avain: 'x', arvo: 5, olemassa: { kohteet: { x: { arvo: 3 } } } });
    expect(typeof kerta(tk).data.korjaukset[0].pvm).toBe('string');
  });

  it('aiemmat korjaukset säilyvät', async () => {
    const tk = await tallenna({
      avain: 'x', arvo: 2,
      olemassa: { kohteet: { x: { arvo: 5 } }, korjaukset: [{ pvm: '2026-09-01', avain: 'x', vanha: 3, uusi: 5 }] },
    });
    expect(kerta(tk).data.korjaukset.length).toBe(2);
  });
});

/* ══ (14) REVIEW 3 — riippumattomuus ennen vertailua ══════════════════════ */
describe('(14) ruudukko korostaa vain omaa avointa kertaa', () => {
  it('seg() lukee oman kerran arvon, EI seuran pikakenttää', () => {
    const f = pura('function _vpArviointiHTML(p) {');
    const i = f.indexOf('const seg = function');
    const segF = f.slice(i, f.indexOf('};', i));
    expect(segF).toContain('_vpArvOmaArvo(p, avain)');
    expect(segF).not.toContain('havaittu[avain]');
  });

  it('oman kerran lukija ei katso seuran pikakenttää lainkaan', () => {
    const f = pura('function _vpArvOmaArvo(p, avain) {');
    expect(f).not.toContain('arviointi_havaittu');
  });

  it('seuran viimeisin näytetään vasta kun oma arvo on kirjattu', () => {
    const f = pura('function _vpArviointiHTML(p) {');
    const i = f.indexOf('const seuranViimeisin = function');
    const sv = f.slice(i, f.indexOf('};', i));
    expect(sv).toContain('_vpArvOmaKirjattu(p, avain)');
    expect(sv).toContain('jsp-arv-muut');   // neutraali teksti, ei korostus
  });
});
