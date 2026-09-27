/**
 * TalentMaster™ — H1b · arviointikertojen MIGRAATIO. Vartija.
 *
 * Kuiva-ajo paljasti UID:itä, jotka esiintyvät KAHDESSA seurassa — lähes varmasti super-admin-
 * tai testitunnuksia. Niitä ei saa kirjata seuran arvioiksi: väärä nimi arviossa on pahempi
 * kuin puuttuva. Tämä vartija lukitsee tunnistuksen ja ohituksen.
 *
 * Brief: docs/CODE_BRIEF_ARVIOINTI_HISTORIA_MONIARVIOIJA.md · H1b
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const vaadi = createRequire(import.meta.url);
const M = vaadi('../scripts/migrate_arviointi_kerrat.js');

/** Vanha kausidokumentti (arviointi/{kausi}) tyngättynä. */
const kausiDoc = (id, havaittu, kehys) => ({
  id,
  data: () => ({ kehys: kehys || 'palloliitto', havaittu: havaittu, paivitetty: '2026-09-01' }),
});

const PELAAJA = { tunniste: '12345678' };

const ARVIOIJAT = {
  'uid-seura': { nimi: 'Matti Virtanen', rooli: 'valmentaja', org: 'seura' },
  'uid-pl': { nimi: 'Pekka Palloliitto', rooli: 'palloliitto', org: 'palloliitto' },
};

describe('docistaKerrat — arvioijan tunnistus', () => {
  const hav = {
    pelin_lukeminen: { arvo: 4, pvm: '2026-09-12', arvioija_uid: 'uid-seura' },
    pressing: { arvo: 2, pvm: '2026-09-12', arvioija_uid: 'uid-seura' },
  };

  it('EI VACUOUS: seuran käyttäjästä syntyy kerta kohteineen', () => {
    const k = M.docistaKerrat(kausiDoc('2026-27', hav), 'sjk', PELAAJA, ARVIOIJAT);
    expect(k.length).toBe(1);
    expect(Object.keys(k[0].data.kohteet).sort()).toEqual(['pelin_lukeminen', 'pressing']);
  });

  it('seuran käyttäjä → nimi, rooli, org seura, jaettu näkyvyys', () => {
    const k = M.docistaKerrat(kausiDoc('2026-27', hav), 'sjk', PELAAJA, ARVIOIJAT)[0];
    expect(k.ohita).toBe(false);
    expect(k.data).toMatchObject({
      arvioija_nimi: 'Matti Virtanen', arvioija_rooli: 'valmentaja',
      arvioija_org: 'seura', nakyvyys: 'seuralle',
    });
  });

  it('Palloliiton käyttäjä → org palloliitto JA näkyvyys sisainen', () => {
    const plHav = { pelin_lukeminen: { arvo: 3, pvm: '2026-09-12', arvioija_uid: 'uid-pl' } };
    const k = M.docistaKerrat(kausiDoc('2026-27', plHav), 'sjk', PELAAJA, ARVIOIJAT)[0];
    expect(k.data.arvioija_org).toBe('palloliitto');
    expect(k.data.nakyvyys).toBe('sisainen');
    expect(k.ohita).toBe(false);
  });

  it('tuntematon UID → OHITETAAN (ei kirjata seuran arvioksi)', () => {
    const outo = { pelin_lukeminen: { arvo: 5, pvm: '2026-09-12', arvioija_uid: 'pvKJoTuntematon' } };
    const k = M.docistaKerrat(kausiDoc('2026-27', outo), 'sjk', PELAAJA, ARVIOIJAT)[0];
    expect(k.ohita).toBe(true);
    expect(k.uid).toBe('pvKJoTuntematon');
    expect(k.kohteita).toBe(1);
  });

  it('tuntematon UID ilman arvioijakarttaa → myös ohitettu', () => {
    const outo = { x: { arvo: 5, pvm: '2026-09-12', arvioija_uid: 'u' } };
    expect(M.docistaKerrat(kausiDoc('2026-27', outo), 'sjk', PELAAJA, null)[0].ohita).toBe(true);
  });

  it('eri arvioijat samassa kausidokumentissa → eri kerrat', () => {
    const kaksi = {
      a: { arvo: 4, pvm: '2026-09-12', arvioija_uid: 'uid-seura' },
      b: { arvo: 2, pvm: '2026-09-12', arvioija_uid: 'uid-pl' },
    };
    const k = M.docistaKerrat(kausiDoc('2026-27', kaksi), 'sjk', PELAAJA, ARVIOIJAT);
    expect(k.length).toBe(2);
    expect(k.map((x) => x.data.arvioija_org).sort()).toEqual(['palloliitto', 'seura']);
  });
});

describe('docistaKerrat — kausi ja tilannekuva', () => {
  const hav = { x: { arvo: 4, pvm: '2026-09-12', arvioija_uid: 'uid-seura' } };

  it('kausi johdetaan PVM:stä, EI doc-ID:stä (vanha "2026-27" oli heinä–kesä)', () => {
    const k = M.docistaKerrat(kausiDoc('2026-27', hav), 'sjk', PELAAJA, ARVIOIJAT)[0];
    expect(k.data.kausi).toBe('2026');
  });

  it('tilannekuva jää nulliksi — arviohetken ikää ei keksitä jälkikäteen', () => {
    const k = M.docistaKerrat(kausiDoc('2026-27', hav), 'sjk', PELAAJA, ARVIOIJAT)[0];
    expect(k.data.tilannekuva).toBeNull();
  });

  it('PalloID ja arviohetken seura tallentuvat (historia kulkee mukana)', () => {
    const k = M.docistaKerrat(kausiDoc('2026-27', hav), 'sjk', PELAAJA, ARVIOIJAT)[0];
    expect(k.data.palloId).toBe('12345678');
    expect(k.data.seuraId_arviohetkella).toBe('sjk');
  });

  it('kerta-id on deterministinen → uudelleenajo ei monista historiaa', () => {
    const a = M.docistaKerrat(kausiDoc('2026-27', hav), 'sjk', PELAAJA, ARVIOIJAT)[0];
    const b = M.docistaKerrat(kausiDoc('2026-27', hav), 'sjk', PELAAJA, ARVIOIJAT)[0];
    expect(a.id).toBe(b.id);
  });

  it('tyhjä havaittu → 0 kertaa (ajo tulostaa dokumentin kentät)', () => {
    expect(M.docistaKerrat(kausiDoc('2026-27', {}), 'sjk', PELAAJA, ARVIOIJAT).length).toBe(0);
  });
});

describe('kirjoituspolku — luotu vain luonnissa', () => {
  const LAHDE = vaadi('fs').readFileSync(
    vaadi('path').join(vaadi('url').fileURLToPath(new URL('.', import.meta.url)), '..', 'scripts/migrate_arviointi_kerrat.js'), 'utf8');

  it('olemassa oleva kerta luetaan ennen kirjoitusta', () => {
    expect(LAHDE).toContain('const nyky = await ref.get();');
    expect(LAHDE).toContain('if (!nyky.exists) data.luotu =');
  });

  it('luotu EI ole ehdoton kenttä (uudelleenajo ei nollaa luontiaikaa)', () => {
    expect(LAHDE).not.toMatch(/set\(\s*Object\.assign\(\{\s*luotu:/);
  });

  it('dry-run on oletus ja ohitukset raportoidaan', () => {
    expect(LAHDE).toContain("const KIRJOITA = lippu('kirjoita');");
    expect(LAHDE).toContain('ohitettu: ei seuran eikä Palloliiton käyttäjä');
    expect(LAHDE).toContain("lippu('sisallyta-tuntemattomat')");
  });
});

/* ── PALLOLIITTO-POLKU: migraatio ja Rules samasta lähteestä ───────────── */
describe('Palloliiton käyttäjäpolku — migraatio ja Rules eivät saa erkaantua', () => {
  const fs = vaadi('fs');
  const path = vaadi('path');
  const url = vaadi('url');
  const juuri2 = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
  const RULES = fs.readFileSync(path.join(juuri2, 'tm_admin/firestore.rules'), 'utf8');

  /** onPalloliitto()-tarkistuksen polku Rulesista, ilman $(…)-osaa. */
  function rulesPolku() {
    const m = RULES.match(/exists\(\/databases\/\$\(database\)\/documents\/([^)]*?)\/\$\(request\.auth\.uid\)\)/);
    expect(m, 'onPalloliitto()-polkua ei löytynyt Rulesista').toBeTruthy();
    return m[1];
  }

  it('EI VACUOUS: Rulesista löytyy onPalloliitto-polku', () => {
    expect(rulesPolku().length).toBeGreaterThan(3);
  });

  it('migraatio lukee SAMASTA polusta kuin Rules tarkistaa', () => {
    expect(M.PALLOLIITTO_KAYTTAJAT_POLKU).toBe(rulesPolku());
  });

  it('polku on vakiona yhdessä paikassa (ei arvattuja vaihtoehtoja .catch-ketjulla)', () => {
    const lahde = fs.readFileSync(path.join(juuri2, 'scripts/migrate_arviointi_kerrat.js'), 'utf8');
    expect(lahde).toContain('const PALLOLIITTO_KAYTTAJAT_POLKU =');
    expect(lahde).not.toContain(".catch(() => db.collection('palloliitto/kayttajat').get())");
  });

  /* MUISTUTUS-TESTI (sama mekanismi kuin sv-odotuslista): Rulesin polku on nyt 3-segmenttinen
     eli KOKOELMA, jolle exists() ei kelpaa → onPalloliitto() ei voi olla tosi. Kun polku
     korjataan parilliseksi, TÄMÄ TESTI PUNERTAA ja muistuttaa päivittämään migraation sekä
     CLAUDE.md §11:n samalla kertaa. Testi ei siis hyväksy vikaa vaan pitää sen näkyvissä. */
  it('TIEDOSSA: Rules-polku on pariton (kokoelma) → korjattaessa päivitä myös migraatio', () => {
    // KOKO dokumenttipolku = polkuvakio + {uid}. Firestore vaatii parillisen segmenttimäärän.
    const segmentteja = rulesPolku().split('/').length + 1;
    expect(segmentteja % 2,
      'Rules-polku muuttui parilliseksi (dokumentti) — päivitä migraation polkulogiikka ja poista tämä muistutus').toBe(1);
  });

  it('polkurakentaja tuottaa kokoelmaviitteen kummallakin segmenttimäärällä', () => {
    const lahde = fs.readFileSync(path.join(juuri2, 'scripts/migrate_arviointi_kerrat.js'), 'utf8');
    expect(lahde).toContain("return (osat.length % 2 === 0) ? ref : ref.collection('kayttajat');");
  });
});
