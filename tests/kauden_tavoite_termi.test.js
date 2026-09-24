/**
 * VARTIJA · "Kausitavoite" → "Kauden tavoite" (KISS-termi) VP:ssa ja Masterissa.
 *
 * MIKSI: termi esiintyi nakyvassa tekstissa myos taivutettuna (kausitavoitetta / -tteen / -ttesta), joten
 * pelkkien otsikoiden nimeaminen olisi jattanyt saman nakyman ristiriitaiseksi: haitarin otsikko olisi
 * lukenut "Kauden tavoite" ja sen alla painike "＋ Tee kausitavoite".
 *
 * RAJAUS — SEURAN STRATEGISET KAUSITAVOITTEET EIVAT KUULU TAHAN. Ne ovat eri kasite (kirjoitetaan polkuun
 * seurat/{sid}/konfiguraatio/tavoitteet/{kausi}, sama kuin Adminin "Strategiset tavoitteet"). Vartija pitaa
 * ne allowlistilla JA vaatii etta ne ovat yha olemassa — sokea etsi-korvaa punertaa.
 *
 * RUOTSI (Teron hyvaksyma 24.9.): kasitteen nimeava otsikko/label = "Sasongens mal"; juokseva teksti pitaa
 * nykyisen muodon (sasongsmal / sasongsmalet). Osion 2 sv-arvot on siksi lukittu MAININ (202740e) arvoihin
 * — jos joku kirjoittaa niihin uutta ruotsia, vartija punertaa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const VP_SV = vaadi('../lib/tm_vp_i18n.js').TM_VP_I18N.sv;
const M_SV = vaadi('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv;
const KARTAT = { VP: VP_SV, MASTER: M_SV };

const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const MASTER = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
const LAHTEET = { VP: [VP, 'vpT'], MASTER: [MASTER, 'masterT'] };

/** Seuran kausitavoitteet — eri kasite, EI nimeta. */
const ALLOWLIST = ['⚙ Aseta kausitavoitteet', 'Kausitavoitteet', '✓ Kausitavoitteet tallennettu'];

/** Osio 1 — otsikot ja labelit: fi JA sv muuttuivat. [kartta, uusi fi-avain, uusi sv] */
const OSIO1 = [
  ['VP', 'Kauden tavoite', 'Säsongens mål'],
  ['VP', '🎯 Suunta · kauden tavoite', '🎯 Riktning · säsongens mål'],
  ['VP', 'Kauden tavoite ', 'Säsongens mål '],
  ['VP', 'Kauden tavoite:', 'Säsongens mål:'],
  ['VP', 'Kauden tavoite · pitkä horisontti', 'Säsongens mål · lång horisont'],
  ['MASTER', 'Kauden tavoite: ', 'Säsongens mål: '],
  ['MASTER', 'Kauden tavoite', 'Säsongens mål']
];

/** Osio 2 — juokseva teksti: vain fi muuttui, sv = MAININ arvo sellaisenaan. [kartta, uusi fi, sv mainista] */
const OSIO2 = [
  ['VP', '＋ Tee kauden tavoite', '＋ Skapa säsongsmål'],
  ['VP', 'Ei kauden tavoitetta vielä — johdetaan heikoimmasta ominaisuudesta (arviointi + §28-kypsyysvahti).', 'Inget säsongsmål ännu — härleds från svagaste egenskapen (bedömning + §28-mognadsvakt).'],
  ['VP', 'Ehdota kauden tavoite →', 'Föreslå säsongsmål →'],
  ['VP', 'Aseta kauden tavoite Kehityksessä — moottori ehdottaa datasta.', 'Sätt säsongsmål i Utveckling — motorn föreslår ur data.'],
  ['VP', 'Ei kauden tavoitetta. Johdetaan heikoimmasta ominaisuudesta (arviointi + §28-kypsyysvahti).', 'Inget säsongsmål. Härleds ur svagaste attributet (bedömning + §28-mognadsvakt).'],
  ['VP', 'Klikkaus luo ehdotuksen kauden tavoitteeksi suoraan tästä havainnosta ja avaa Kehitys-välilehden, jossa tarkistat ja hyväksyt. Tavoite säilyttää alkuperän — lähdesiru näyttää esim. "◎ Lähde: pelihavainto · pvm".', 'Ett klick skapar ett säsongsmålsförslag direkt från denna observation och öppnar Utveckling-fliken, där du granskar och godkänner. Målet behåller sitt ursprung — källchippet visar t.ex. "◎ Källa: spelobservation · pvm".'],
  ['VP', 'Strateginen kauden tavoite (IDP-makro) sovitaan yhdessä; operatiivinen jaksofokus on valmentajan päivittäistä työtä.', 'Strategiskt säsongsmål (IDP-makro) avtalas tillsammans; operativt periodfokus är tränarens dagliga arbete.'],
  ['VP', 'Ei ehdotusta datasta — mittaa lisää tai aseta fokus käsin kauden tavoitteesta.', 'Inget förslag ur datan — mät mer eller sätt fokus manuellt utifrån säsongsmålet.'],
  ['VP', 'Tyhjä — kauden tavoite toimii sellaisenaan. Lisää polku (esim. Haltuunotto → Tempokuljetus) jos haluat pilkkoa tavoitteen jaksoihin.', 'Tomt — säsongsmålet fungerar som det är. Lägg till en väg (t.ex. Haltuunotto → Tempokuljetus) om du vill dela upp målet i perioder.'],
  ['VP', 'kauden tavoite → jaksofokus → kaari · aseta · muokkaa · sulje · näkyy pelaajalle', 'säsongsmål → periodfokus → båge · sätt · redigera · stäng · syns för spelaren'],
  ['VP', 'valmentaja omistaa operatiivisen jaksofokuksen (omat pelaajat) · talenttivalmentaja talentit · VP asettaa kauden tavoitteen + oversight/override.', 'tränaren äger det operativa periodfokuset (egna spelare) · talangtränaren talangerna · FU sätter säsongsmålet + oversight/override.'],
  ['VP', 'Aseta yksi strateginen kauden tavoite. Moottori ehdottaa datasta (heikoin/vahvin) tai valitse käsin. §37: kauden tavoite (makro) sovitaan yhdessä — VP vahvistaa, valmentaja ehdottaa.', 'Sätt ett strategiskt säsongsmål. Motorn föreslår utifrån data (svagast/starkast) eller välj för hand. §37: säsongsmålet (makro) kommer man överens om tillsammans — FU bekräftar, tränaren föreslår.'],
  ['VP', 'Pidä kauden tavoite laajana ja pysyvänä — jaksofokus muuttuu 4–8 vk välein, kauden tavoite ei.', 'Håll säsongsmålet brett och bestående — periodfokuset byts var 4–8 vecka, säsongsmålet inte.'],
  ['MASTER', 'Ei kauden tavoitetta. Johdetaan heikoimmasta ominaisuudesta (arviointi + §28-kypsyysvahti).', 'Inget säsongsmål. Härleds från svagaste egenskapen (bedömning + §28-mognadsvakt).'],
  ['MASTER', 'Ei kauden tavoitetta vielä.', 'Inget säsongsmål ännu.'],
  ['MASTER', 'Tyhjä — kauden tavoite toimii sellaisenaan. Lisää polku (esim. Haltuunotto → Tempokuljetus) jos haluat pilkkoa tavoitteen jaksoihin.', 'Tom — säsongsmålet fungerar som det är. Lägg till en väg (t.ex. Mottagning → Tempoföring) om du vill dela upp målet i perioder.']
];

describe('(1) i18n-kartoissa ei ole enaa vanhaa termia', () => {
  it.each(['VP', 'MASTER'])('%s: yksikaan avain ei sisalla "ausitavoit" (paitsi seuran allowlist)', (kartta) => {
    const jaljella = Object.keys(KARTAT[kartta])
      .filter((k) => k.indexOf('ausitavoit') > -1)
      .filter((k) => ALLOWLIST.indexOf(k) < 0);
    expect(jaljella, 'vanha termi jai i18n-karttaan').toEqual([]);
  });

  it('seuran kolme avainta ovat YHA olemassa (sokea korvaus punertaa)', () => {
    for (const a of ALLOWLIST) {
      expect(VP_SV[a], 'seuran avain katosi: ' + a).toBeTruthy();
    }
  });

  it('EI VACUOUS: allowlist osuu oikeasti (avaimet sisaltavat termin)', () => {
    for (const a of ALLOWLIST) expect(a).toContain('ausitavoit');
  });
});

describe('(2) lahteissa ei ole vanhaa termia kaannoskutsuissa', () => {
  it.each(['VP', 'MASTER'])('%s: ei t(\'...ausitavoit...\') paitsi allowlist', (kartta) => {
    const [src, fn] = LAHTEET[kartta];
    const re = new RegExp(fn + "\\('([^']*ausitavoit[^']*)'\\)", 'g');
    const osumat = [];
    let m;
    while ((m = re.exec(src))) { if (ALLOWLIST.indexOf(m[1]) < 0) osumat.push(m[1]); }
    expect(osumat, 'vanha termi jai kutsupaikkaan').toEqual([]);
  });

  it('kausitavoite-fallback kulkee vpT():n kautta (nakyi sv-tilassa suomeksi)', () => {
    expect(VP).toContain("|| t.kuvaus || vpT('Kauden tavoite')");
    expect(VP, 'paljas literaali jai fallbackiin').not.toContain("|| t.kuvaus || 'Kauden tavoite'");
  });

  it('vihjerekisterin otsikko on uusi termi JA kaannettavissa', () => {
    expect(VP).toContain("idp_kausitavoite: { otsikko: 'Kauden tavoite · pitkä horisontti'");
    expect(VP_SV['Kauden tavoite · pitkä horisontti']).toBe('Säsongens mål · lång horisont');
    // renderoija kaantaa otsikko/mita/tulkinta/vinkki vpT():n kautta
    expect(VP).toContain('+ vpT(o.otsikko) +');
  });
});

describe('(3) osio 1 — otsikoiden ja labelien sv on uusi sanktioitu muoto', () => {
  it.each(OSIO1)('%s · %s', (kartta, avain, sv) => {
    expect(KARTAT[kartta][avain], 'sv puuttuu tai on vaara: ' + avain).toBe(sv);
    /* Uusi muoto on "sasongens mal" — pienella kun se on lauseen sisalla (murupolku "Riktning · ..."),
       isolla kun se on itsenainen otsikko. Molemmat ovat sanktioidusta taulukosta. */
    expect(sv).toMatch(/säsongens mål/i);
    expect(sv, 'vanha yhdyssanamuoto jai otsikkoon').not.toMatch(/säsongsmål/i);
  });
});

describe('(4) osio 2 — juoksevan tekstin sv on MUUTTUMATON (ei uutta ruotsia)', () => {
  it.each(OSIO2)('%s · %s', (kartta, avain, svMain) => {
    expect(KARTAT[kartta][avain], 'sv muuttui: ' + avain).toBe(svMain);
  });

  it('EI VACUOUS: osiossa 2 on avaimia ja niiden sv kayttaa vanhaa yhdyssanamuotoa', () => {
    expect(OSIO2.length).toBeGreaterThan(10);
    const yhdys = OSIO2.filter(([, , sv]) => /säsongsmål/i.test(sv));
    expect(yhdys.length, 'yksikaan juokseva sv ei kayta säsongsmål-muotoa').toBeGreaterThan(8);
  });
});

describe('(5) uudet fi-avaimet ovat kaytossa lahteissa', () => {
  it('jokaisella uudella avaimella on vahintaan yksi kutsupaikka', () => {
    const puuttuu = [];
    for (const [kartta, avain] of OSIO1.concat(OSIO2)) {
      const [src] = LAHTEET[kartta];
      if (src.indexOf("'" + avain + "'") < 0) puuttuu.push(kartta + ' · ' + avain);
    }
    expect(puuttuu, 'avain nimettiin mutta kutsupaikka jai vanhaksi').toEqual([]);
  });

  it('kirjastoversiot nostettu (selaimen valimuisti)', () => {
    expect(Number((VP.match(/tm_vp_i18n\.js\?v=(\d+)/) || [])[1])).toBeGreaterThanOrEqual(84);
    expect(Number((MASTER.match(/tm_master_i18n\.js\?v=(\d+)/) || [])[1])).toBeGreaterThanOrEqual(27);
  });
});
