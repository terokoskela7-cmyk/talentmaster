/**
 * TalentMaster - i18n Vaihe 5 (henkilöstö) · VP_v25 · Vaihe 1: Tilanne + Koti.
 * V1 = dynaaminen JS-output → reititetty vpT(fi):llä JS:ssä (EI data-i18n paitsi staattiset KPI-labelit).
 * Testit: plain-avainkattavuus + fi-fallback + interpolointi-template + glossaari (kehon valmius/Okänt) + wiring.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const M = require('../lib/tm_vp_i18n.js');
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

afterEach(() => { delete global.tmNykyinenKieli; });

describe('V1 plain-avainkattavuus (Tilanne + Koti sv)', () => {
  const V1_KEYS = [
    'Kausi', 'Viikko', '% kaudesta käyty', 'rekisteröity', 'vanhin', 'pv sitten',
    '↑ edellisestä mittauksesta', 'vaatii toimenpiteitä', 'Ei kriittisiä havaintoja', 'Tuntematon',
    'pelaajaa myöhässä reviewistä →', 'Hyvää yötä', 'Hyvää aamua', 'Hyvää päivää', 'Hyvää iltaa', 'valmentaja',
    'Aloita näistä kolmesta', 'Tarkista joukkuelistasi', 'pelaajaa tuotu', 'Suunnittele ensimmäinen testipäivä',
    'Luo testi →', 'Kutsu valmentajat järjestelmään', 'Kutsu →', 'Seuraava testi', 'Testipäivä', 'päivää', 'Vinkki',
    'Suunnittele toinen testipäivä vertailua varten', 'Mitattu', 'kk sitten', 'päivitä mittaus ennen johtopäätöksiä.',
    'Harjoitettavuuskartoitus tekemättä —', 'joukkuetta', 'Avaa kartoituslomake →', 'tekniikkataso tarvitsee tukea',
    'TKI-keskiarvo', 'Katso harjoitussuositukset →', 'IDP-ehdotusta odottaa hyväksyntää', 'Avaa jono →',
    'TKI-data puuttuu osalta', 'pelaajaa lähellä pronssia', 'pelaajaa ilman suostumusta', 'Lähetä kutsut →',
    'seuran korkein TKI', 'Katso profiili →', 'pelaajaa saavutti kulta- tai hopea-merkin', 'Ei avoimia signaaleja tänään.',
    'KRIITTISET', 'Seuranta', 'Onnistumiset', 'vaatii toimenpidettä', 'Ei kriittisiä', 'tulossa',
    'valmentajaa ilman mentorointikirjausta', 'pv', 'Mentoroi', 'Hidden Gem -nostoehdokasta (valmius ≥', 'Ehdota IDP',
    'heikoin kehityskohde', 'pelaajalla', 'mm.', 'Luo treeniteema', 'Katso', 'Rekisteröintikonversio', 'odottaa vastausta',
    'Muistuta odottavia', 'pelaajalla → kalibraatio', 'tuotu', 'kutsuttu', 'suostumus', 'konversio', 'Kriittiset signaalit',
    'Ei kriittisiä signaaleja juuri nyt.', 'Kaikki signaalit yksityiskohtaisesti →', 'ei sähköpostia', 'liian pian edellisestä',
    'Tarkistetaan…', 'Ei muistutettavia juuri nyt: kaikki', 'ohitetaan', 'Ohitetaan', 'Jatketaanko?', 'Lähetetään muistutuksia…',
    'Muistutus lähetetty', 'huoltajalle', 'ohitettu', 'Muistutus epäonnistui:', '(ei oikeutta)',
    'Joukkueessa mitattuja pelaajia', 'Lue joukkuepulssi + signaalit', 'Tee harjoitusarviointi (malli A)', 'Avaa Pelaajaraportti',
    'Lähetä mentorointiviesti valmentajalle', 'Aloitusopas', 'valmis', 'Näytä opas', 'Aloita tästä', 'Piilota opas',
    'askelta — klikkaa askelta siirtyäksesi.', 'Näin johdat TalentMasterilla', 'Piilota ohje',
    'Fyysinen taso vaatii pikahuomiota.', 'joukkuetta alle kansallisen tason.', 'tarvitsee erityishuomiota',
    'Pelaajia', 'Valmius ka.', 'IDP odottaa', 'Avoimet testit', 'hyväksyntää', 'pel.',
  ];
  it('kaikki V1-avaimet resolvoituvat sv:ksi (≠ fi, ei puutu)', () => {
    global.tmNykyinenKieli = () => 'sv';
    const puuttuu = V1_KEYS.filter((k) => typeof M.TM_VP_I18N.sv[k] !== 'string');
    expect(puuttuu).toEqual([]);
    const eiKaannetty = V1_KEYS.filter((k) => M.vpT(k) === k);
    expect(eiKaannetty).toEqual([]);
  });
  it('fi-fallback ehjä: ei kieltä → fi; puuttuva avain → fi', () => {
    expect(M.vpT('Mentoroi')).toBe('Mentoroi');            // ei globaalia → fi
    global.tmNykyinenKieli = () => 'sv';
    expect(M.vpT('EI OLE V1 KARTASSA ZZZ')).toBe('EI OLE V1 KARTASSA ZZZ');
  });
});

describe('V1 interpolointi-template + glossaari', () => {
  it('ryhmaNimi-templatet säilyttävät {n}/{j}-placeholderit sv:ssä', () => {
    global.tmNykyinenKieli = () => 'sv';
    expect(M.vpT('{n} pelaajaa lähellä pronssia · {j} joukkuetta')).toMatch(/\{n\}.*\{j\}/);
    expect(M.vpT('TKI-data puuttuu osalta · {j} joukkuetta')).toContain('{j}');
  });
  it('glossaari: kehon valmius → "kroppslig beredskap" (EI "kroppens"); Tuntematon → Okänt', () => {
    global.tmNykyinenKieli = () => 'sv';
    expect(M.vpT('pelaajaa kehon valmius alle 40 (klinikkalähetys)')).toContain('kroppslig beredskap');
    expect(M.vpT('pelaajaa kehon valmius alle 40 (klinikkalähetys)')).not.toContain('kroppens');
    expect(M.vpT('pelaajalta puuttuu kehon valmius -profiili. Valmentajat eivät pysty yksilöllistämään harjoittelua ilman kartoitusta.')).toContain('kroppslig beredskap');
    expect(M.vpT('Tuntematon')).toBe('Okänt');
  });
});

describe('V1 wiring — dynaaminen JS reititetty vpT():llä + staattiset KPI-labelit data-i18n', () => {
  it('renderTilanne/signaalit/Koti käyttävät vpT():tä (ei kovakoodattua fi:tä avainkohdissa)', () => {
    expect(VP).toContain("vpT('vaatii toimenpiteitä')");
    expect(VP).toContain("vpT('tekniikkataso tarvitsee tukea')");
    expect(VP).toContain("vpT('Ei avoimia signaaleja tänään.')");
    expect(VP).toContain("vpT('Mentoroi')");
    expect(VP).toContain("vpT('Kriittiset signaalit')");
    expect(VP).toContain("vpT('Näin johdat TalentMasterilla')");
    // ei enää kovakoodattua fi:tä hero-fallbackissa
    expect(VP).not.toContain("'<span class=\"hero-vaatii ok\">Ei kriittisiä havaintoja</span>'");
  });
  it('staattiset Tilanne-KPI-labelit tagattu data-i18n:llä (vpLokalisoi ei clobberaa laskettuja deltoja)', () => {
    ['Pelaajia', 'Valmius ka.', 'IDP odottaa', 'Avoimet testit', 'hyväksyntää'].forEach((t) =>
      expect(VP).toContain('data-i18n="' + t + '"'));
    // laskettu delta asetetaan sv-oletuksena JS:ssä (ei data-i18n → ei clobber)
    expect(VP).toContain("vpT('viimeisin testi')");
    expect(VP).toContain("vpT('testitapahtumaa')");
  });
  it('cache-bust tm_vp_i18n.js?v=5 (V1.1)', () => {
    expect(VP).toMatch(/tm_vp_i18n\.js\?v=([5-9]|\d\d)/);
  });
});

describe('V1.1 Toimenpiteet: vpTToimenpide (käännös näyttöhetkellä, Firestore-teksti pysyy fi)', () => {
  it('prefix + luvut säilyvät, häntä kääntyy, kiinteät luvut (2.5/35–54) verbatim', () => {
    global.tmNykyinenKieli = () => 'sv';
    expect(M.vpTToimenpide('SJK P12 — 3 pelaajaa alle Eerikkilä-tason (H-H < 2.5). Aloita yksilöllinen harjoitusohjelma.'))
      .toBe('SJK P12 — 3 spelare under Eerikkilä-nivå (H-H < 2,5). Starta ett individuellt träningsprogram.');
    // {n} keskellä hännässä
    expect(M.vpTToimenpide('GrIFK — H-H taso laskussa 4 pelaajalla. Tarkista kuormitus.'))
      .toBe('GrIFK — H-H-nivån sjunker hos 4 spelare. Kontrollera belastningen.');
    // aggregaatti: 'Kaikki joukkueet' → 'Alla lag'; {n}:lta joukkueelta → {n} lag
    expect(M.vpTToimenpide('Kaikki joukkueet — tekniikkamittaukset puuttuvat 3:lta joukkueelta. Suunnittele tekniikkakilpailu.'))
      .toBe('Alla lag — tekniska mätningar saknas för 3 lag. Planera en tekniktävling.');
    // glossaari: kroppslig beredskap (ei kroppens)
    expect(M.vpTToimenpide('SJK — harjoitettavuuskartoitus (kehon valmius) tekemättä. Varaa kartoituspäivä, jotta harjoittelua voi yksilöllistää.'))
      .toContain('kroppslig beredskap');
  });
  it('joukkuenimi-prefix säilyy verbatim (EI käänny)', () => {
    global.tmNykyinenKieli = () => 'sv';
    expect(M.vpTToimenpide('SJK, GrIFK — H-H taso laskussa. Tarkista kuormitus.')).toMatch(/^SJK, GrIFK — /);
  });
  it('fi-tila: teksti muuttumaton (invariantti); tuntematon häntä → häntä fi', () => {
    global.tmNykyinenKieli = () => 'fi';
    const t = 'SJK — 3 pelaajaa alle Eerikkilä-tason (H-H < 2.5). Aloita yksilöllinen harjoitusohjelma.';
    expect(M.vpTToimenpide(t)).toBe(t);
    global.tmNykyinenKieli = () => 'sv';
    expect(M.vpTToimenpide('Kaikki joukkueet — jotain aivan uutta.')).toBe('Alla lag — jotain aivan uutta.');
    expect(M.vpTToimenpide(null)).toBe(null);
  });
  it('plain-avaimet + templatet (Toimenpiteet/napit/tyhjä/modaali)', () => {
    global.tmNykyinenKieli = () => 'sv';
    [['Toimenpiteet', 'Åtgärder'], ['Kuittaa', 'Kvittera'], ['Muokkaa', 'Redigera'], ['Hylkää', 'Avvisa'],
      ['Ei avoimia toimenpiteitä — hyvä työ.', 'Inga öppna åtgärder — bra jobbat.'], ['Kiireinen', 'Brådskande'],
      ['Suunnittele', 'Planera'], ['Muokkaa toimenpidettä', 'Redigera åtgärd']].forEach(([fi, sv]) =>
      expect(M.vpT(fi)).toBe(sv));
    expect(M.vpT('Näytä kaikki {n} toimenpidettä →').replace('{n}', 7)).toBe('Visa alla 7 åtgärder →');
    expect(M.vpT('{n} toimenpidettä kuitattu').replace('{n}', 3)).toBe('3 åtgärder kvitterade');
  });
  it('INVARIANTTI: generointipolku (TP_SIGNAALIT/dedup/tallennaToimenpide) EI kutsu vpT → teksti fi Firestoressa', () => {
    const gen = VP.slice(VP.indexOf('const TP_SIGNAALIT'), VP.indexOf('function _tpKorttiHtml'));
    expect(gen).not.toContain('vpT');   // generointi + dedup rakentavat fi-tekstin (käännös vasta renderissä)
    // render KUTSUU vpTToimenpide
    expect(VP).toContain('vpTToimenpide(g.teksti');
  });
  it('data-i18n-html: h2 säilyttää fi:n <em>:n, kääntyy sv:ksi tasaisena', () => {
    expect(VP).toContain('data-i18n-html="Toimenpiteet"');
    expect(VP).toContain('Toimen<em>piteet</em>');   // fi rich HTML säilyy lähteessä
  });
});
