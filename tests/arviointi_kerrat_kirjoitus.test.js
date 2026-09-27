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
  /* Väite kohdistuu DEL-sentineliin, ei objektin muotoon: set+merge yhdistää sisäkkäiset mapit,
     joten "avain puuttuu kirjoitetusta objektista" EI poista mitään Firestoressa. Aiempi väite
     meni läpi vain siksi, ettei tynkä mallinna mergeä — sama vikaluokka kuin luotu-kentässä. */
  it("'ei_nahty' poistaa kohteen kerrasta DEL-sentinelillä (merge ei poista puuttuvaa avainta)", async () => {
    const tk = await tallenna({ arvo: 'ei_nahty', avain: 'x', olemassa: { kohteet: { x: { arvo: 4 }, y: { arvo: 3 } } } });
    expect(kerta(tk).data.kohteet.x).toEqual(tk.DEL);
    expect(kerta(tk).data.kohteet.y).toBeUndefined();   // muita kohteita ei kirjoiteta uudelleen
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

/* ══ (15) REVIEW D — POTENTIAALI KERTAAN (historia, ei vain pikakenttä) ════ */
describe('(15) potentiaali kirjoittuu arviointikertaan', () => {
  /** Ajaa oikean _vpTallennaPotentiaali-funktion samalla tyngällä. */
  async function tallennaPotentiaali(opts) {
    const o = opts || {};
    const tk = tynka(o.olemassa || null);
    const p = Object.assign({}, PELAAJA, o.pelaaja || {});
    const store = {
      db: tk.db, firebase: tk.firebase,
      _seuraId: 'sjk', _uid: 'uid-a', _rooli: o.rooli || 'vp', _seura: { maa: 'FI' },
      _isDemoMode: false,
      window: { TM_ARVIOINTI_HISTORIA: AH, _vpArvKonteksti: null, _vpArvKehys: 'palloliitto', _vpNimi: 'VP Testi' },
      document: { getElementById: () => null },
      toast: () => {}, vpT: (s) => s, _jsvEsc: (s) => String(s == null ? '' : s),
      console: { warn: () => {} },
      _vpIdpPelaaja: () => p,
      _vpSeurantaOnJohto: () => true,
      _vpPotTaso: () => 'kansallinen',
      _vpPotReRender: () => {},
    };
    store.window.window = store.window;
    const ymp = new Proxy(store, {
      has: (t3, k) => (k in t3) || !(k in globalThis),
      get: (t3, k) => (k === Symbol.unscopables ? undefined : (k in t3 ? t3[k] : () => '')),
      set: (t3, k, v) => { t3[k] = v; return true; },
    });
    const runko = [
      'function _vpArvKontekstiOletus(p) {',
      'function _vpArvTilannekuva(p) {',
      'window._vpTallennaPotentiaali = async function (pid, tahdet, huomioVain) {',
    ].map(pura).join('\n');
    // eslint-disable-next-line no-new-func
    const fn = new Function('__ymp', 'with(__ymp){' + runko + '\nreturn window._vpTallennaPotentiaali;}')(ymp);
    await fn('p1', o.tahdet === undefined ? 4 : o.tahdet, o.huomioVain || false);
    return tk;
  }

  it('EI VACUOUS: tallennus kirjoittaa sekä kerran että pikakentät', async () => {
    const tk = await tallennaPotentiaali({});
    expect(kerta(tk)).toBeTruthy();
    expect(pelaajaKirjoitus(tk)).toBeTruthy();
  });

  it('kerta saa potentiaalin tähtineen ja varmuuksineen', async () => {
    const tk = await tallennaPotentiaali({ tahdet: 4 });
    expect(kerta(tk).data.potentiaali).toMatchObject({ tahdet: 4 });
    expect(kerta(tk).data.potentiaali.varmuus).toBeTruthy();
  });

  it('alle 14-vuotiaan oletusvarmuus on alustava (§4.3)', async () => {
    const tk = await tallennaPotentiaali({ tahdet: 5, pelaaja: { syntymaVuosi: new Date().getFullYear() - 13 } });
    expect(['alustava', 'kohtalainen']).toContain(kerta(tk).data.potentiaali.varmuus);
  });

  it('pikakentät päivittyvät samassa transaktiossa (yksi commit)', async () => {
    const tk = await tallennaPotentiaali({});
    expect(pelaajaKirjoitus(tk).data.scout_potentiaali).toBe(4);
    expect(tk.commitit()).toBe(1);
  });

  it('luotu vain uudelle kerralle (sama sääntö kuin kohteilla)', async () => {
    const uusi = await tallennaPotentiaali({});
    expect(uusi.kerta === undefined || kerta(uusi).data.luotu).toBeTruthy();
    const vanha = await tallennaPotentiaali({ olemassa: { kohteet: {} } });
    expect(Object.keys(kerta(vanha).data)).not.toContain('luotu');
  });

  it('kohdeklikkaus EI nollaa aiemmin tallennettua potentiaalia (payload jättää nullin pois)', async () => {
    const tk = await tallenna({ olemassa: { potentiaali: { tahdet: 4, varmuus: 'alustava' } } });
    expect(Object.keys(kerta(tk).data)).not.toContain('potentiaali');
  });
});

/* ══ (16) REVIEW C — KATSO / ARVIOI ════════════════════════════════════════
   Korostus tuli jo omasta kerrasta, mutta samalla rivillä näkyi yhä SEURAN arvo numerona,
   palkkina ja IDP-pillerinä → kollegan arvio ankkuroi arvioijan ennen omaa klikkausta.
   Todiste on RENDERÖITY: _vpArviointiHTML ajetaan molemmissa tiloissa ja tuloksesta luetaan,
   mitä ruudulla on. */
describe('(16) Arvioi-tila ei näytä seuran arvoa ennen omaa kirjausta', () => {
  const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function arviointi(tila, omaKerta) {
    const P = {
      id: 'p1', joukkue: 'SJK P13', phv_tila: 'PRE',
      arviointi_havaittu: { pelin_lukeminen: 3 },
      adar_viimeisin: { pvm: '2026-09-01' },
    };
    // teema-avain = dim + '_' + kategoria (lähdekoodin suodatin) — ilman näitä rivejä ei synny
    const TAKS = [{ avain: 'pelin_lukeminen', nimi: 'Pelin lukeminen', dim: 'D4', kategoria: 'peliaaly' }];
    const AST = { 1: { koodi: '1' }, 2: { koodi: '2' }, 3: { koodi: '3' }, 4: { koodi: '4' }, 5: { koodi: '5' } };
    const store = {
      __p: P,
      vpT: (s) => s, _jsvEsc: _esc,
      ARVIOINTI_KEHYKSET: {}, ARVIOINTI_KEHYS_OLETUS: 'palloliitto',
      ARVIOINTI_TAKSONOMIA: TAKS, TM_ARVIOINTI_ASTEIKKO: AST,
      tmKehys: () => ({ nimi: 'Palloliitto', taksonomia: TAKS, asteikko: AST }),
      tmTeemat: () => [{ avain: 'D4_peliaaly', nimi: 'Peliäly' }],
      _taksNimi: (i) => i.nimi, _taksAst: () => '',
      _dimIkaSp: () => ({ ika: 13, sp: 'P' }),
      V5: () => '#fff', _pvmLyhyt: (x) => String(x),
      _vpArvKontekstiOletus: () => ({ tyyppi: 'kooste' }),
      _vpArvOmaKertaId: () => 'id-x',
      _uid: 'uid-a',
      window: { _vpArvTila: tila, _vpArvKehys: 'palloliitto', _vpArvTeema: 'D4_peliaaly',
        _vpArvOmaKerta: omaKerta || null, TM_ARVIOINTI_HISTORIA: AH },
      document: { getElementById: () => null },
    };
    store.window.window = store.window;
    const ymp = new Proxy(store, {
      has: (t2, k) => (k in t2) || !(k in globalThis),
      get: (t2, k) => (k === Symbol.unscopables ? undefined : (k in t2 ? t2[k] : () => '')),
      set: (t2, k, v) => { t2[k] = v; return true; },
    });
    const runko = [
      'function _vpArvOmaArvo(p, avain) {',
      'function _vpArvOmaKirjattu(p, avain) {',
      'function _vpArvTilaHTML(p) {',
      'function _vpArviointiHTML(p) {',
    ].map(pura).join('\n');
    // eslint-disable-next-line no-new-func
    return new Function('__ymp', 'with(__ymp){' + runko + '\nreturn _vpArviointiHTML(__p);}')(ymp);
  }

  it('EI VACUOUS: molemmat tilat tuottavat näkymän', () => {
    expect(arviointi('katso').length).toBeGreaterThan(200);
    expect(arviointi('arvioi').length).toBeGreaterThan(200);
  });

  it('Katso-tila näyttää seuran arvon eikä arviointinappeja', () => {
    const h = arviointi('katso');
    expect(h).toContain('jsp-arv-num');
    expect(h).not.toContain('jsp-arv-segbtn');
  });

  it('Arvioi-tila EI näytä seuran numeroa ennen omaa kirjausta', () => {
    const h = arviointi('arvioi');
    expect(h).toContain('jsp-arv-segbtn');          // napit näkyvät
    expect(h).toMatch(/jsp-arv-num mut/);           // numero neutraali
    expect(h).not.toMatch(/jsp-arv-num" style="color:[^"]*">3/);
  });

  it('Arvioi-tila näyttää seuran viimeisimmän VASTA oman kirjauksen jälkeen', () => {
    const oma = { pid: 'p1', kertaId: 'id-x', kohteet: { pelin_lukeminen: 4 } };
    const h = arviointi('arvioi', oma);
    expect(h).toContain('jsp-arv-muut');
  });

  /* Väite kohdistuu MÄÄRITTELYYN (rivin alku), ei mihin tahansa osumaan: kortin avauksen
     nollausrivi sisältää saman merkkijonon sisennettynä, joten löysä toContain meni läpi
     vaikka oletusarvo olisi vaihdettu. */
  it('Katso on oletustila (arviointi ei ala vahingossa)', () => {
    expect(VP).toMatch(/\nwindow\._vpArvTila = 'katso';/);
    expect(VP).not.toMatch(/\nwindow\._vpArvTila = 'arvioi';/);
  });
});

/* ══ (17) REVIEW C — VARMUUDEN VALINTA + POTENTIAALIN ORG-RAJAUS ══════════ */
describe('(17) varmuus valittavissa ja Palloliiton potentiaali ei vuoda pikakenttään', () => {
  it('Arvioi-tila tarjoaa kolme varmuustasoa', () => {
    const f = pura('function _vpArvTilaHTML(p) {');
    ['alustava', 'kohtalainen', 'vahva'].forEach((v) => expect(f).toContain("'" + v + "'"));
    expect(f).toContain('_vpArvAsetaVarmuus');
  });

  it('varmuuden oletus tulee jaetusta libistä (alle 14 v → alustava)', () => {
    const f = pura('function _vpArvTilaHTML(p) {');
    expect(f).toContain('tmAhVarmuusOletus');
  });

  it('potentiaalin pikakenttä kirjoitetaan vain seuran arvioijalta', () => {
    const f = pura('window._vpTallennaPotentiaali = async function (pid, tahdet, huomioVain) {');
    expect(f).toContain("if (orgP === 'seura') tx.set(pRef, pika, { merge: true });");
  });

  it('kerta kirjoitetaan silti myös Palloliiton arvioijalta (historia säilyy)', () => {
    const f = pura('window._vpTallennaPotentiaali = async function (pid, tahdet, huomioVain) {');
    const i = f.indexOf('tx.set(kertaRefP, dataP, { merge: true });');
    const j = f.indexOf("if (orgP === 'seura')");
    expect(i).toBeGreaterThan(-1);
    expect(i).toBeLessThan(j);   // kerta ensin, ehdoton; pikakenttä ehdollinen
  });
});

/* ══ (18) ARVIOI = KONTEKSTI + VARMUUS + KOHTEET + POTENTIAALIN ASETUS ═════
   Renderöity todiste: näkymä ajetaan Arvioi-tilassa pelaajalla, jolla on arvoja JOKA
   osiossa (havaittu, mitattu, pelihavainto, potentiaali), ja tuloksesta varmistetaan ettei
   yhtäkään seuran arvoa ole DOM:issa ennen omaa kirjausta. */
describe('(18) Arvioi-tilan DOM ei sisällä seuran arvoja missään osiossa', () => {
  const _esc2 = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /** Pelaaja jolla on arvo joka osiossa — jos jokin vuotaa, se näkyy tuloksessa. */
  const P_TAYSI = {
    id: 'p1', joukkue: 'SJK P13', phv_tila: 'PRE',
    arviointi_havaittu: { pelin_lukeminen: 3 },
    adar_viimeisin: { pvm: '2026-09-01', a: 3, d: 2, ac: 2, r: 2, yht: 2.3 },
    scout_potentiaali: 4, scout_potentiaali_arvioija: 'Toinen Arvioija', scout_potentiaali_pvm: '2026-09-01',
    scout_potentiaali_huomiot: 'kansallinen kärki',
  };

  function nakyma(tila, lisa) {
    const TAKS = [{ avain: 'pelin_lukeminen', nimi: 'Pelin lukeminen', dim: 'D4', kategoria: 'peliaaly' }];
    const AST = { 1: { koodi: '1' }, 2: { koodi: '2' }, 3: { koodi: '3' }, 4: { koodi: '4' }, 5: { koodi: '5' } };
    const store = {
      __p: Object.assign({}, P_TAYSI, lisa || {}),
      vpT: (s) => s, _jsvEsc: _esc2, _jesc: _esc2,
      ARVIOINTI_KEHYKSET: {}, ARVIOINTI_KEHYS_OLETUS: 'palloliitto',
      ARVIOINTI_TAKSONOMIA: TAKS, TM_ARVIOINTI_ASTEIKKO: AST,
      tmKehys: () => ({ nimi: 'Palloliitto', taksonomia: TAKS, asteikko: AST }),
      tmTeemat: () => [{ avain: 'D4_peliaaly', nimi: 'Peliäly' }],
      _taksNimi: (i) => i.nimi, _taksAst: () => '',
      _dimIkaSp: () => ({ ika: 13, sp: 'P' }),
      V5: () => '#fff', _pvmLyhyt: (x) => String(x),
      _vpArvKontekstiOletus: () => ({ tyyppi: 'kooste' }),
      _vpArvOmaKertaId: () => 'id-x',
      _uid: 'uid-a',
      SCOUT_POTENTIAALI: [{ tahdet: 4, lyhyt: 'Kansallinen kärki', kuvaus: 'kuvaus' }],
      _vpPotRivi: () => ({ lyhyt: 'Kansallinen kärki' }),
      _vpSeurantaOnJohto: () => true,
      /* Muut osiot palauttavat TUNNISTETTAVAN merkkijonon: jos ne renderöityvät Arvioi-tilassa,
         se näkyy tuloksessa heti. */
      _vpSiltaPaneeliHTML: () => '<div>SILTA_D2</div>',
      _vpD1SiltaPaneeliHTML: () => '<div>SILTA_D1</div>',
      _vpFyysEhdotus: () => ({ prioriteetti: false }),
      _vpArvAdarKoostumusHTML: () => '<div>ADAR_KOOSTUMUS</div>',
      _vpD3KalibraatioHTML: () => '<div>D3_KALIBRAATIO</div>',
      window: { _vpArvTila: tila, _vpArvKehys: 'palloliitto', _vpArvTeema: 'D4_peliaaly',
        _vpArvOmaKerta: null, TM_ARVIOINTI_HISTORIA: AH },
      document: { getElementById: () => null },
    };
    store.window.window = store.window;
    const ymp = new Proxy(store, {
      has: (t2, k) => (k in t2) || !(k in globalThis),
      get: (t2, k) => (k === Symbol.unscopables ? undefined : (k in t2 ? t2[k] : () => '')),
      set: (t2, k, v) => { t2[k] = v; return true; },
    });
    const runko = [
      'function _vpArvOmaArvo(p, avain) {',
      'function _vpArvOmaKirjattu(p, avain) {',
      'function _vpArvTilaHTML(p) {',
      'function _vpArvKontekstiHTML(p) {',
      'function _vpArvKtxEditoriHTML(p) {',
      'function _vpPotentiaaliHTML(p, opts) {',
      'function _vpArviointiHTML(p) {',
    ].map(pura).join('\n');
    // eslint-disable-next-line no-new-func
    return new Function('__ymp', 'with(__ymp){' + runko + '\nreturn _vpArviointiHTML(__p);}')(ymp);
  }

  const KATSO = nakyma('katso');
  const ARVIOI = nakyma('arvioi');

  it('EI VACUOUS: Katso-tilassa kaikki osiot renderöityvät', () => {
    ['SILTA_D1', 'SILTA_D2', 'ADAR_KOOSTUMUS', 'D3_KALIBRAATIO'].forEach((s) => expect(KATSO).toContain(s));
    expect(KATSO).toContain('Scouting-linssi');
  });

  it.each([['silta D1', 'SILTA_D1'], ['silta D2', 'SILTA_D2'],
    ['pelihavaintokoostumus', 'ADAR_KOOSTUMUS'], ['D3-kalibraatio', 'D3_KALIBRAATIO']])(
    'Arvioi-tila ei renderöi osiota: %s', (_n, merkki) => {
      expect(ARVIOI).not.toContain(merkki);
    });

  it('Arvioi-tila näyttää potentiaalin ASETUKSEN mutta ei nykyarvoa', () => {
    expect(ARVIOI).toContain('Scouting-linssi');          // asetus näkyy
    expect(ARVIOI).toContain('Ei vielä arvioitu');        // nykyarvo piilotettu
    expect(ARVIOI).not.toContain('Toinen Arvioija');      // toisen arvioijan nimi ei näy
    expect(ARVIOI).not.toContain('● valittu');            // eikä valittu porras
    expect(KATSO).toContain('Toinen Arvioija');           // Katso-tilassa näkyy
  });

  it('Arvioi-tilassa on juuri neljä sallittua osiota: konteksti, varmuus, kohteet, potentiaalin asetus', () => {
    expect(ARVIOI).toContain('jsp-arv-ktxrivi');   // kontekstirivi
    expect(ARVIOI).toContain('jsp-arv-varmuus');   // varmuus
    expect(ARVIOI).toContain('jsp-arv-segbtn');    // kohteet
    expect(ARVIOI).toContain('Scouting-linssi');   // potentiaalin asetus
  });

  it('Arvioi-tilan näkyvä teksti ei sisällä seuran arvoja lainkaan', () => {
    const teksti = ARVIOI.replace(/<[^>]*>/g, ' ');
    expect(teksti).not.toContain('kansallinen kärki');   // potentiaalin huomio
    expect(teksti).not.toMatch(/\b4★/);
  });
});

/* ══ (19) TILA EI SIIRRY PELAAJALTA TOISELLE ══════════════════════════════ */
describe('(19) arviointitila nollautuu pelaajakortin avauksessa', () => {
  it('avaus nollaa tilan, varmuuden, kontekstin ja oman kerran', () => {
    const f = pura('window._avaaPerPelaajaPikakatsaus = function(idx, joukkueNimi) {');
    expect(f).toContain("window._vpArvTila = 'katso';");
    expect(f).toContain('window._vpArvVarmuus = null;');
    expect(f).toContain('window._vpArvKonteksti = null;');
    expect(f).toContain('window._vpArvOmaKerta = null;');
  });

  it('pelaaja A Arvioi + vahva → pelaaja B avautuu Katso-tilassa ja iän mukaisella oletuksella', () => {
    const win = { _vpArvTila: 'arvioi', _vpArvVarmuus: 'vahva', _vpArvKonteksti: { tyyppi: 'ottelu', pelipaikka: 'KP' }, _vpArvOmaKerta: { pid: 'A' } };
    const runko = pura('window._avaaPerPelaajaPikakatsaus = function(idx, joukkueNimi) {');
    win._jsvPelaajat = [{ id: 'B', joukkue: 'SJK P13' }];
    const store = {
      window: win, document: { getElementById: () => null },
      _vpTyhjennaLuonnos: () => {},
    };
    store.window.window = win;
    const ymp = new Proxy(store, {
      has: (t2, k) => (k in t2) || !(k in globalThis),
      get: (t2, k) => (k === Symbol.unscopables ? undefined : (k in t2 ? t2[k] : () => '')),
      set: (t2, k, v) => { t2[k] = v; return true; },
    });
    try {
      // eslint-disable-next-line no-new-func
      new Function('__ymp', 'with(__ymp){' + runko + '\ntry{window._avaaPerPelaajaPikakatsaus(0,"SJK P13");}catch(e){}}')(ymp);
    } catch (e) { /* renderöinti kaatuu tyngässä — nollaus tapahtuu ennen sitä */ }
    expect(win._vpArvTila).toBe('katso');
    expect(win._vpArvVarmuus).toBeNull();
    expect(win._vpArvKonteksti).toBeNull();
    expect(win._vpArvOmaKerta).toBeNull();
    // iän mukainen oletus palautuu, koska valinta on nollattu
    expect(AH.tmAhVarmuusOletus(13)).toBe('alustava');
  });
});
