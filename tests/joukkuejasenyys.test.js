/**
 * TalentMaster™ — §18 JOUKKUEJÄSENYYS: nimi ja joukkueet[] synkassa. Vartija.
 *
 * Oire (Sibbo, P12 jaettiin kahtia): VP ja Admin näyttivät jaon, seurahallinta ei. Syy oli
 * KIRJOITUSHETKESSÄ, ei näkymissä:
 *   · Admin Excel-tuonti kirjoitti NIMEN eikä asettanut joukkueet[]-id:tä lainkaan
 *     → uusi pelaaja ei näkynyt minkään joukkueen alla, ja uudelleentuonnissa vanha id jäi.
 *   · Seurahallinnan rekisteröinti kirjoitti joukkueet[]:hin NIMEN id:n paikalle.
 *
 * Molemmat rakentavat jäsenyyden nyt SAMASTA funktiosta (tmJoukkueJasenyys*), jotta polut
 * eivät voi erkaantua — sama periaate kuin H1:n tmAhKertaPayload.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const J = vaadi('../lib/tm_joukkue.js');
const ADMIN = readFileSync(join(juuri, 'TalentMaster_Admin.html'), 'utf8');
const SEURA = readFileSync(join(juuri, 'TalentMaster_Seura.html'), 'utf8');

const LISTA = [
  { id: 'sibbo_2014_bla', nimi: 'Sibbo-Vargarna 2014 Blå' },
  { id: 'sibbo_p12', nimi: 'Sibbo-Vargarna P12' },
];

/* ── JAETTU RAKENTAJA ─────────────────────────────────────────────────── */
describe('tmJoukkueJasenyys — §18-rakenne yhdestä paikasta', () => {
  it('EI VACUOUS: funktio on olemassa ja palauttaa kaikki neljä kenttää', () => {
    const j = J.tmJoukkueJasenyys('Sibbo-Vargarna P12', LISTA);
    expect(Object.keys(j).sort()).toEqual(
      ['id', 'joukkue', 'joukkueNimi', 'joukkueet', 'joukkueetNimet', 'orpo'].sort());
  });

  it('osuma → kanoninen nimi JA team-id', () => {
    const j = J.tmJoukkueJasenyys('Sibbo-Vargarna 2014 Blå', LISTA);
    expect(j.joukkue).toBe('Sibbo-Vargarna 2014 Blå');
    expect(j.joukkueet).toEqual(['sibbo_2014_bla']);
    expect(j.joukkueetNimet).toEqual(['Sibbo-Vargarna 2014 Blå']);
    expect(j.orpo).toBe(false);
  });

  it('nimen kirjoitusasu kanonisoituu (Excelin kirjoitusvirhe korjaantuu)', () => {
    const j = J.tmJoukkueJasenyys('  sibbo-vargarna p12 ', LISTA);
    expect(j.joukkue).toBe('Sibbo-Vargarna P12');
    expect(j.joukkueet).toEqual(['sibbo_p12']);
  });

  it('ORPO: id:tä EI arvata — joukkueet jää tyhjäksi ja rivi merkitään', () => {
    const j = J.tmJoukkueJasenyys('Sibbo-Vargarna 2015 Röd', LISTA);
    expect(j.joukkueet).toEqual([]);
    expect(j.orpo).toBe(true);
    expect(j.joukkue).toBe('Sibbo-Vargarna 2015 Röd');   // raaka nimi säilyy näkyviin
  });

  it('tyhjä joukkue → tyhjät kentät, ei orpomerkintää', () => {
    const j = J.tmJoukkueJasenyys('', LISTA);
    expect(j).toMatchObject({ joukkue: '', joukkueet: [], joukkueetNimet: [], orpo: false });
  });

  it('joukkueet[] ei KOSKAAN sisällä nimeä', () => {
    ['Sibbo-Vargarna P12', 'Sibbo-Vargarna 2014 Blå', 'Tuntematon'].forEach((n) => {
      const j = J.tmJoukkueJasenyys(n, LISTA);
      j.joukkueet.forEach((x) => expect(LISTA.some((d) => d.id === x)).toBe(true));
    });
  });

  it('id:llä rakennettu jäsenyys (rekisteröinti) antaa saman rakenteen', () => {
    const a = J.tmJoukkueJasenyysIdlla('sibbo_p12', 'Sibbo-Vargarna P12');
    const b = J.tmJoukkueJasenyys('Sibbo-Vargarna P12', LISTA);
    expect(a.joukkue).toBe(b.joukkue);
    expect(a.joukkueet).toEqual(b.joukkueet);
    expect(a.joukkueetNimet).toEqual(b.joukkueetNimet);
  });
});

/* ── ADMIN EXCEL-TUONTI ───────────────────────────────────────────────── */
/* P2 (1.10.2026): Adminin Massakutsu-tuonti poistettu. Pelaajatuonti = Seura-sivun Excel-tuonti, joka
   ohittaa olemassa olevat pelaajat (ei nollaa kenttiä). Admin ei siis enää rakenna jäsenyyttä lainkaan. */
describe('Admin ei enää tuo pelaajia', () => {
  it('Massakutsu-tuonti on poistettu (ei toista jäsenyyden rakentajaa Adminissa)', () => {
    expect(ADMIN).not.toContain('_adminMassaData');
    expect(ADMIN).not.toContain('lahetaAdminMassakutsu');
    expect(ADMIN).not.toContain('tmJoukkueJasenyys(');
  });

  /* Brief sijoitti korjaustyökalut Adminiin; ne ovat tosiasiassa Excel_Tuonti.html:ssä.
     Väite kohdistuu sinne, jotta turvaverkko ei katoa huomaamatta. */
  it('olemassa olevat korjaustyökalut jäävät turvaverkoksi (Excel_Tuonti)', () => {
    const XT = readFileSync(join(juuri, 'TalentMaster_Excel_Tuonti.html'), 'utf8');
    expect(XT).toContain('window.normalisoiJoukkueet');
    expect(XT).toContain('tmPuhdistaJoukkueetIdt');
  });
});

/* ── SEURAHALLINNAN REKISTERÖINTI ─────────────────────────────────────── */
describe('Seurahallinnan rekisteröinti kirjoittaa ID:n, ei nimeä', () => {
  it('EI enää kirjoita nimeä joukkueet[]:hin', () => {
    expect(SEURA).not.toContain('joukkueet:     joukkue ? [joukkue] : [],');
  });

  it('jäsenyys rakennetaan jaetulla funktiolla valitusta id:stä', () => {
    expect(SEURA).toContain('tmJoukkueJasenyysIdlla(joukkueId, joukkue)');
    expect(SEURA).toContain('joukkueet:      _jasenyys.joukkueet');
    expect(SEURA).toContain('joukkueetNimet: _jasenyys.joukkueetNimet');
  });

  it('päivityshaara kirjoittaa KOKO jäsenyyden (nimi yksin jätti vanhan id:n)', () => {
    const i = SEURA.indexOf('const _upd = {');
    expect(i).toBeGreaterThan(-1);
    const upd = SEURA.slice(i, SEURA.indexOf('};', i));
    expect(upd).toContain('_jasenyys.joukkueet');
    expect(upd).toContain('_jasenyys.joukkueNimi');
  });

  it('joukkueId luetaan ennen jäsenyyden rakentamista', () => {
    expect(SEURA.indexOf("const joukkueId  = document.getElementById('rek_joukkue')"))
      .toBeLessThan(SEURA.indexOf('tmJoukkueJasenyysIdlla(joukkueId, joukkue)'));
  });
});

/* ── MOLEMMAT POLUT SAMASTA LÄHTEESTÄ ─────────────────────────────────── */
describe('polut eivät voi erkaantua', () => {
  it('Seuran rekisteröinti rakentaa jäsenyyden jaetulla rakentajalla (Adminin tuonti poistettu P2:ssa)', () => {
    expect(SEURA).toContain('tmJoukkueJasenyysIdlla(');
  });

  it('sama joukkue → sama rakenne molemmissa poluissa', () => {
    const tuonti = J.tmJoukkueJasenyys('Sibbo-Vargarna 2014 Blå', LISTA);
    const rekisterointi = J.tmJoukkueJasenyysIdlla('sibbo_2014_bla', 'Sibbo-Vargarna 2014 Blå');
    expect(tuonti.joukkueet).toEqual(rekisterointi.joukkueet);
    expect(tuonti.joukkue).toBe(rekisterointi.joukkue);
    expect(tuonti.joukkueetNimet).toEqual(rekisterointi.joukkueetNimet);
  });
});

/* ── DATA-SIIVOUS: kolme rikkinäistä muotoa ───────────────────────────── */
describe('korjaa_joukkuejasenyys — diagnoosi tunnistaa vian, ei arvaa orpoa', () => {
  const S = vaadi('../scripts/korjaa_joukkuejasenyys.js');
  const EHJA = J.tmJoukkueJasenyys('Sibbo-Vargarna 2014 Blå', LISTA);

  it('(a) nimi uusi, joukkueet[] vanha id → vanha_id', () => {
    expect(S.diagnoosi({ joukkue: 'Sibbo-Vargarna 2014 Blå', joukkueet: ['sibbo_p12'] }, EHJA)).toBe('vanha_id');
  });

  it('(b) joukkueet[] sisältää NIMEN → nimi_idn_paikalla', () => {
    expect(S.diagnoosi({ joukkue: 'Sibbo-Vargarna 2014 Blå', joukkueet: ['Sibbo-Vargarna 2014 Blå'] }, EHJA))
      .toBe('nimi_idn_paikalla');
  });

  it('(c) joukkueet[] puuttuu → puuttuu', () => {
    expect(S.diagnoosi({ joukkue: 'Sibbo-Vargarna 2014 Blå' }, EHJA)).toBe('puuttuu');
    expect(S.diagnoosi({ joukkue: 'Sibbo-Vargarna 2014 Blå', joukkueet: [] }, EHJA)).toBe('puuttuu');
  });

  it('jo ehjä → null (idempotentti, ei turhia kirjoituksia)', () => {
    expect(S.diagnoosi({ joukkue: 'Sibbo-Vargarna 2014 Blå', joukkueet: ['sibbo_2014_bla'] }, EHJA)).toBeNull();
  });

  it('ORPO ei korjaannu arvaamalla', () => {
    const orpo = J.tmJoukkueJasenyys('Sibbo-Vargarna 2015 Röd', LISTA);
    expect(S.diagnoosi({ joukkue: 'Sibbo-Vargarna 2015 Röd', joukkueet: [] }, orpo)).toBeNull();
  });

  it('dry-run on oletus ja rakentaja on jaettu', () => {
    const lahde = readFileSync(join(juuri, 'scripts/korjaa_joukkuejasenyys.js'), 'utf8');
    expect(lahde).toContain("const KIRJOITA = lippu('kirjoita');");
    expect(lahde).toContain('tmJoukkueJasenyys');
  });
});
