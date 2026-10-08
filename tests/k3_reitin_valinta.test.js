/**
 * K3 — pelaaja valitsee seuraavan reitin (D8) ja sitoutuu (P6) (docs/CODE_BRIEF_K3_REITIN_VALINTA.md; Kaista: Tero).
 * lib/tm_reitin_valinta.js (puhtaat funktiot) + J4/V1-liitokset + Pelaaja_v7-adapteri (SIVUN oikea koodi vm:ssä) + Master/VP-kytkentä (lähdetarkistukset).
 * Rules-emulaattoritestit: tests/rules/firestore.rules.test.js ("K3 · tarjous ja valinta") — Rules v3.37 riittää, ei muutosta.
 * Fixturet keksittyjä; KPV U13 -testipelaajat vain käsin (CLAUDE.md §0).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const RV = require('../lib/tm_reitin_valinta.js'), JM = require('../lib/tm_jakso_malli.js'), SA = require('../lib/tm_seuraava_askel.js'), TK = require('../lib/tm_tanaan_kentta.js');
const KS = require('../lib/tm_kehityssilmukka.js'), AJ = require('../lib/tm_aloita_jakso.js'), JA = require('../lib/tm_joukkoaloitus.js'), K4 = require('../lib/tm_viikkokatsaus.js');
const SRC = lue('TalentMaster_Pelaaja_v7.html'), MASTER = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html');

const VAIHT = [{ konsepti_avain: 'y_h1', nimi: 'Haltuunotto', perustelu: 'Pidät pallon lähellä.', vahvistettu: true }, { konsepti_avain: 'seura_kierto', nimi: 'Kierto', perustelu: 'Käännyt nopeasti.', vahvistettu: true }];
const OFFER = (lisa) => Object.assign({ tila: 'valittavana', vaihtoehdot: VAIHT }, lisa || {});
const P = (lisa) => Object.assign({ id: 'topias', etunimi: 'Topias', seuraId: 'kpv', syntymaVuosi: 2013, ydinvahvuus: { kuvaus: 'Pitää pallon', havaittu_pvm: '2026-10-01' }, jaksofokus: OFFER() }, lisa || {});
const VALITTU = (v) => ({ ydinvahvuus_valinta: { vaihtoehto: v, valittu_pvm: '2026-11-17' } });
const KORTIT = (lisa) => [Object.assign({ avain: 'y_h1', nimi: 'Haltuunotto', syy: 'Heikoin havaittu: Hallinta (2/5)', valittu: true, lause: 'Pidät pallon lähellä.' }, lisa && lisa[0]), Object.assign({ avain: 'seura_kierto', nimi: 'Kierto', syy: null, valittu: false, lause: '' }, lisa && lisa[1])];

describe('tmVaihtoehdot — sama sääntö kuin tmPelaajanVaihtoehdot (Pelaaja_v7 ei lataa tm_jakso_malli.js:ää)', () => {
  it('vain valittavana + vahvistettu + konsepti_avain, enintään kaksi — kaikissa tapauksissa identtinen', () => {
    const tapaukset = [null, {}, OFFER(), OFFER({ tila: 'aktiivinen' }), { vaihtoehdot: VAIHT }, OFFER({ vaihtoehdot: VAIHT.map((v) => Object.assign({}, v, { vahvistettu: false })) }),
      OFFER({ vaihtoehdot: [VAIHT[0], { nimi: 'ilman avainta', vahvistettu: true }] }), OFFER({ vaihtoehdot: [VAIHT[0], VAIHT[1], Object.assign({}, VAIHT[0], { konsepti_avain: 'kolmas' })] }), OFFER({ vaihtoehdot: 'x' })];
    tapaukset.forEach((jf) => expect(RV.tmVaihtoehdot(jf)).toEqual(JM.tmPelaajanVaihtoehdot(jf)));
    expect(RV.tmVaihtoehdot(OFFER({ vaihtoehdot: [VAIHT[0], VAIHT[1], VAIHT[0]] }))).toHaveLength(2);
  });
});

describe('tmTarjousKortit + tmJaksoEhdotukset — ei uutta ehdotuslogiikkaa; syy vain henkilökunnalle', () => {
  const HAV = { ball_control: 2, dribbling: 1 };
  const deps = { siltaEhdota: require('../lib/tm_arviointi_silta.js').tmSiltaEhdota, siltaKonsepti: (a) => ({ nimi: 'Nimi ' + a }), sallitut: () => null };
  it('tmJaksoEhdotukset kantaa syy-tekstin (additiivinen) ja kortit ottavat sen; enintään 2, ei nykyistä konseptia', () => {
    const e = SA.tmJaksoEhdotukset({ arviointi_havaittu: HAV }, 'x', deps); expect(e.length).toBeGreaterThan(0); expect(e.every((r) => typeof r.syy === 'string' && r.syy.length > 0)).toBe(true);
    const k = RV.tmTarjousKortit(e); expect(k.length).toBeLessThanOrEqual(2); expect(k[0]).toMatchObject({ avain: e[0].konsepti_avain, nimi: e[0].konsepti_nimi, syy: e[0].syy, valittu: false, lause: '' });
    expect(RV.tmTarjousKortit([])).toEqual([]); expect(RV.tmTarjousKortit(null)).toEqual([]);
  });
  it('syy ei päädy tarjousolioon eikä pelaajan HTML:ään', () => {
    const k = KORTIT(); const o = RV.tmTarjousOlio(k); expect(o.ok).toBe(true); expect(JSON.stringify(o)).not.toContain('Heikoin havaittu');
    const h = RV.tmValintaRuutuHTML(RV.tmVaihtoehdot(o.jaksofokus), {}, { t: (x) => x }); expect(h).not.toContain('Heikoin'); expect(h).not.toContain('2/5');
  });
});

describe('tmTarjousOlio — tarjousolio (1–2 vaihtoehtoa, lauseen vartija)', () => {
  it('muoto: { tila:\'valittavana\', vaihtoehdot:[{ konsepti_avain, nimi, perustelu, vahvistettu:true }] }; ei kestoa/päiviä (asetetaan vahvistuksessa); vain valitut', () => {
    const o = RV.tmTarjousOlio(KORTIT()); expect(o.ok).toBe(true);
    expect(o.jaksofokus).toEqual({ tila: 'valittavana', vaihtoehdot: [{ konsepti_avain: 'y_h1', nimi: 'Haltuunotto', perustelu: 'Pidät pallon lähellä.', vahvistettu: true }] });
    const kaksi = RV.tmTarjousOlio(KORTIT([{}, { valittu: true, lause: 'Käännyt nopeasti.' }])); expect(kaksi.jaksofokus.vaihtoehdot.map((v) => v.konsepti_avain)).toEqual(['y_h1', 'seura_kierto']);
    expect(Object.keys(kaksi.jaksofokus).sort()).toEqual(['tila', 'vaihtoehdot']);
    expect(JM.tmPelaajanVaihtoehdot(kaksi.jaksofokus)).toHaveLength(2);   // pelaaja näkee juuri nämä
  });
  it('ei valittua → ei_valittu; yli kaksi → hylätään; lause pakollinen; ≤ 120 (120 ✓, 121 ✗)', () => {
    expect(RV.tmTarjousOlio(KORTIT([{ valittu: false }]))).toMatchObject({ ok: false, syy: 'ei_valittu' }); expect(RV.tmTarjousOlio([])).toMatchObject({ ok: false, syy: 'ei_valittu' }); expect(RV.tmTarjousOlio(null).ok).toBe(false);
    expect(RV.tmTarjousOlio([{ avain: 'a', nimi: 'A', valittu: true, lause: 'x' }, { avain: 'b', nimi: 'B', valittu: true, lause: 'x' }, { avain: 'c', nimi: 'C', valittu: true, lause: 'x' }]).syy).toBe('ei_valittu');
    expect(RV.tmTarjousOlio(KORTIT([{ lause: '' }]))).toMatchObject({ ok: false, syy: 'tyhja', indeksi: 0 }); expect(RV.tmTarjousOlio(KORTIT([{ lause: '   ' }])).syy).toBe('tyhja');
    expect(RV.tmTarjousOlio(KORTIT([{ lause: 'a'.repeat(120) }])).ok).toBe(true); expect(RV.tmTarjousOlio(KORTIT([{ lause: 'a'.repeat(121) }]))).toMatchObject({ ok: false, syy: 'pitka' });
  });
  it('KIELLETYT-vartija + K1:n lukutarkistus (X/Y, taso N, mittaus); virheteksti ei paljasta sanaa', () => {
    for (const l of ['Tämä on heikkous', 'Rajoitteesi on vasen jalka', 'Kriittinen kohta']) expect(RV.tmTarjousOlio(KORTIT([{ lause: l }]))).toMatchObject({ ok: false, syy: 'sana' });
    for (const l of ['Sait 2/5 viimeksi', 'Olet tasolla 3', 'Hyppäsit 42 cm']) expect(RV.tmTarjousOlio(KORTIT([{ lause: l }]))).toMatchObject({ ok: false, syy: 'luku' });
    expect(RV.tmTarjousOlio(KORTIT([{ nimi: 'Heikkous' }])).syy).toBe('nimi');   // nimikin vartijan läpi
    expect(RV.tmTarjousVirhe('sana', { t: (k) => k })).not.toMatch(/heikkou/i); expect(RV.tmTarjousVirhe('luku', {})).toContain('lukuja');
  });
  it('avain: vain a–z 0–9 _ (onclick-turva), ≤ 60; duplikaatti hylätään; vartija puuttuu → suljettu virhe (ei hyväksytä)', () => {
    expect(RV.tmTarjousOlio(KORTIT([{ avain: "x');alert(1);('" }])).syy).toBe('nimi'); expect(RV.tmTarjousOlio(KORTIT([{ avain: 'a'.repeat(61) }])).syy).toBe('nimi');
    expect(RV.tmTarjousOlio([{ avain: 'a', nimi: 'A', valittu: true, lause: 'ok' }, { avain: 'a', nimi: 'A', valittu: true, lause: 'ok' }]).syy).toBe('nimi');
  });
});

describe('Sulku + tarjous + vahvistus (lib-ketju): vanha jakso historiaan, tarjous korvaa jaksofokuksen, vahvistus aloittaa jakson ilman haamurivejä', () => {
  const VANHA = { konsepti_avain: 'y_h2', konsepti_nimi: 'Kuljettaminen', alkoi: '2026-10-05T10:00:00.000Z', kesto_vk: 4, domeeni: 'teknis_taktinen' };
  const NYT = '2026-11-02T10:00:00.000Z';
  it('tmSuljeJakso kirjoittaa sulkurivin ja K4-lauseen; K3 korvaa jaksofokuksen tarjouksella (ei alkoi/kestoa)', () => {
    const v = KS.tmSuljeJakso({ jaksofokus: VANHA }, { tulos: 'parani' }, { nytISO: NYT, lisakentat: { lause: 'Hyvä jakso' } });
    expect(v.historiaLisays).toHaveLength(1); expect(v.historiaLisays[0]).toMatchObject({ konsepti_avain: 'y_h2', sulkutapa: 'suljettu', lause: 'Hyvä jakso' });
    const tarjous = RV.tmTarjousOlio(KORTIT()); const jf = tarjous.jaksofokus;
    expect(jf.alkoi).toBeUndefined(); expect(jf.kesto_vk).toBeUndefined(); expect(jf.tila).toBe('valittavana');
  });
  it('tarjouksen aikana pelaajalla ei ole aktiivista jaksoa (Tänään: ei jaksoa → Hyvä jakso -kortti); tmJaksoNappi: aloita ilman valintaa, vahvista valinnan jälkeen', () => {
    expect(TK.tmTanaanTila(P(), { tanaan: '2026-11-04' }).tila).not.toMatch(/^(jakso|sunnuntai)$/);
    expect(AJ.tmJaksoNappi(P())).toBe('aloita'); expect(AJ.tmJaksoNappi(P(VALITTU('y_h1')))).toBe('vahvista');
  });
  it('vahvistus: tmAsetaJaksofokus tarjouksen päälle → jaksofokus korvautuu (tila + vaihtoehdot pois), EI haamuriviä historiaan', () => {
    const uusi = { konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: '2026-11-18T10:00:00.000Z', kesto_vk: 4 };
    const v = KS.tmAsetaJaksofokus(P(VALITTU('y_h1')), uusi, { nytISO: '2026-11-18T10:00:00.000Z' });
    expect(v.historiaLisays).toEqual([]); expect(v.jaksofokus).toEqual(uusi); expect(v.jaksofokus.tila).toBeUndefined(); expect(v.jaksofokus.vaihtoehdot).toBeUndefined();
  });
  it('V1-modaalin esitäyttö: pelaajan valitsema konsepti → taito; oma ehdotus → teksti, ei taitoa; ydinvahvuuden kuvaus säilyy; vanha D-1-valinta (ilman vaihtoehtoja) ennallaan', () => {
    const items = [{ avain: 'y_h1', nimi: 'Haltuunotto' }, { avain: 'y_h2', nimi: 'Kuljettaminen' }], ctx = { items, ika: 13, ehdotusAvain: 'y_h2', nimi: 'Topias' };
    const a = AJ.tmAloitaJaksoTiedot(P(VALITTU('y_h1')), ctx); expect(a.valittuAvain).toBe('y_h1'); expect(a.valinta).toBe('Haltuunotto'); expect(a.valintaOtsikko).toBe('Pelaaja valitsi seuraavan reitin'); expect(a.yv).toBe('Pitää pallon');
    const o = AJ.tmAloitaJaksoTiedot(P(VALITTU('Haluan vasenta jalkaa')), ctx); expect(o.valittuAvain).toBe('y_h2'); expect(o.valinta).toBe('Haluan vasenta jalkaa'); expect(o.valintaOtsikko).toBe('Pelaajan oma ehdotus');
    const ilman = AJ.tmAloitaJaksoTiedot(P({ ydinvahvuus: null }), ctx); expect(ilman.valinta).toBe(''); expect(ilman.yv).toBe('');
    const d1 = AJ.tmAloitaJaksoTiedot({ id: 'p', jaksofokus: { konsepti_avain: 'y_h2', tila: 'valittavana' }, ydinvahvuus_valinta: { vaihtoehto: 'Pallonhallinta' } }, ctx);
    expect(d1.valinta).toBe('Pallonhallinta'); expect(d1.yv).toBe('Pallonhallinta'); expect(d1.valintaOtsikko).toBe('Pelaaja valitsi ydinvahvuutensa'); expect(d1.valittuAvain).toBe('y_h2');
  });
});

describe('tmValintaOlio — pelaajan valintaolio (konsepti / oma ehdotus, vartija)', () => {
  const jf = OFFER(), tanaan = '2026-11-17';
  it('tarjottu konsepti → { vaihtoehto: avain, valittu_pvm } (vain nämä kaksi avainta = Rules); oma:false', () => {
    const o = RV.tmValintaOlio('y_h1', jf, { tanaan }); expect(o).toEqual({ ok: true, oma: false, data: { vaihtoehto: 'y_h1', valittu_pvm: tanaan } });
    expect(Object.keys(o.data).sort()).toEqual(['vaihtoehto', 'valittu_pvm']);
  });
  it('oma ehdotus ≤ 60 (60 ✓, 61 ✗), trimmataan; KIELLETYT-vartija; tyhjä ✗', () => {
    expect(RV.tmValintaOlio('  Haluan vasenta jalkaa  ', jf, { tanaan })).toEqual({ ok: true, oma: true, data: { vaihtoehto: 'Haluan vasenta jalkaa', valittu_pvm: tanaan } });
    expect(RV.tmValintaOlio('x'.repeat(60), jf, { tanaan }).ok).toBe(true); expect(RV.tmValintaOlio('x'.repeat(61), jf, { tanaan })).toMatchObject({ ok: false, syy: 'pitka' });
    expect(RV.tmValintaOlio('Heikkouteni', jf, { tanaan })).toMatchObject({ ok: false, syy: 'sana' }); expect(RV.tmValintaOlio('   ', jf, { tanaan })).toMatchObject({ ok: false, syy: 'tyhja' }); expect(RV.tmValintaOlio(null, jf, { tanaan }).ok).toBe(false);
  });
  it('ei tarjousta (ei valittavana / ei vahvistettuja) → ei valintaa; väärä päivämuoto ✗ (Rules vaatii 10 merkkiä)', () => {
    expect(RV.tmValintaOlio('y_h1', { konsepti_avain: 'y_h1' }, { tanaan })).toMatchObject({ ok: false, syy: 'ei_tarjousta' });
    expect(RV.tmValintaOlio('y_h1', OFFER({ vaihtoehdot: VAIHT.map((v) => Object.assign({}, v, { vahvistettu: false })) }), { tanaan }).ok).toBe(false);
    expect(RV.tmValintaOlio('y_h1', jf, { tanaan: '17.11.2026' })).toMatchObject({ ok: false, syy: 'pvm' }); expect(RV.tmValintaOlio('y_h1', jf, {}).ok).toBe(false);
  });
});

describe('Tänään-tilat (pelaaja): valittavana ilman valintaa / valinta tehty / uusi jakso alkanut', () => {
  it('valittavana → nappi "Valitse seuraava reitti"; valinta tehty → "Valintasi on valmentajalla"; uusi jakso alkanut / ei tarjousta → ei mitään', () => {
    const a = RV.tmValintaTila(P()); expect(a.tila).toBe('valittavana'); expect(a.vaihtoehdot).toHaveLength(2);
    const ha = RV.tmValintaLisaHTML(a, { t: (k) => k, valitseFn: '_p7K3Avaa()' }); expect(ha).toContain('Valitse seuraava reitti'); expect(ha).toContain('_p7K3Avaa()'); expect(ha).not.toContain('Valintasi');
    const b = RV.tmValintaTila(P(VALITTU('y_h1'))); expect(b.tila).toBe('valittu'); expect(b.valinta).toMatchObject({ nimi: 'Haltuunotto', oma: false, kirjain: 'A' });
    const hb = RV.tmValintaLisaHTML(b, { t: (k) => k }); expect(hb).toContain('Valintasi on valmentajalla'); expect(hb).not.toContain('<button');
    expect(RV.tmValintaTila(P(Object.assign({ jaksofokus: { konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: '2026-11-18T10:00:00.000Z', kesto_vk: 4 } }, VALITTU('y_h1')))).tila).toBe('ei');
    expect(RV.tmValintaTila(P({ jaksofokus: null })).tila).toBe('ei'); expect(RV.tmValintaTila(null).tila).toBe('ei'); expect(RV.tmValintaLisaHTML({ tila: 'ei' }, {})).toBe('');
  });
  it('oma ehdotus tunnistetaan (ei kirjainta); tyhjä valinta = ei valintaa', () => {
    const t = RV.tmValintaTila(P(VALITTU('Haluan vasenta jalkaa'))); expect(t.tila).toBe('valittu'); expect(t.valinta).toMatchObject({ oma: true, kirjain: null, teksti: 'Haluan vasenta jalkaa' });
    expect(RV.tmValintaTila(P({ ydinvahvuus_valinta: { vaihtoehto: '  ' } })).tila).toBe('valittavana');
  });
  it('§7.22: valintaruutu — ei lukuja, tasoja, vertailua eikä määräaikaa; vain T1/Kenttä-tokenit (ei hex-värejä)', () => {
    const h = RV.tmValintaRuutuHTML(RV.tmVaihtoehdot(OFFER()), { valittu: 'y_h1' }, { t: (k) => k, valitseFn: 'v', omaFn: 'o', omaTekstiFn: 'ot', tallennaFn: 't', takaisinFn: 'b' });
    expect(h).toContain('Mihin haluat mennä seuraavaksi?'); expect(h).toContain('Haltuunotto'); expect(h).toContain('Pidät pallon lähellä.'); expect(h).toContain('+ Oma ehdotus'); expect(h).toContain('Valitsen tämän');
    expect(h).not.toMatch(/#[0-9a-f]{3,8}\b/i); expect(h).not.toMatch(/ennen kuin|viimeistään|määräaika|pisteet|taso \d|\d\/\d/i);
    expect(RV.tmValintaRuutuHTML([], {}, { t: (k) => k })).toContain('ei ole vielä tarjonnut');   // tyhjä tila ei kaada
  });
  it('Tallenna-nappi vain kun valittu (konsepti tai oma teksti); oma-kenttä enintään 60 merkkiä', () => {
    const o = { t: (k) => k, valitseFn: 'v', omaFn: 'o', omaTekstiFn: 'ot', tallennaFn: 't', takaisinFn: 'b' }, vs = RV.tmVaihtoehdot(OFFER());
    expect(RV.tmValintaRuutuHTML(vs, {}, o)).toMatch(/id="p7K3Tallenna"[^>]* disabled/); expect(RV.tmValintaRuutuHTML(vs, { valittu: 'y_h1' }, o)).not.toMatch(/id="p7K3Tallenna"[^>]* disabled/);
    expect(RV.tmValintaRuutuHTML(vs, { valittu: '__oma', omaAuki: true, oma: '' }, o)).toMatch(/id="p7K3Tallenna"[^>]* disabled/);
    const h = RV.tmValintaRuutuHTML(vs, { valittu: '__oma', omaAuki: true, oma: 'jotain' }, o); expect(h).not.toMatch(/id="p7K3Tallenna"[^>]* disabled/); expect(h).toContain('maxlength="60"');
  });
});

describe('Henkilökunnan rivitila: "Valinta odottaa" → "[nimi] valitsi A" / oma ehdotus', () => {
  it('rivitila: ei tarjousta → null; tarjous → odottaa; valinta → valittu (kirjain, nimi) tai oma', () => {
    expect(RV.tmHenkRivitila(P({ jaksofokus: { konsepti_avain: 'x', alkoi: '2026-10-01T00:00:00.000Z' } }))).toBeNull(); expect(RV.tmHenkRivitila(P({ jaksofokus: null }))).toBeNull(); expect(RV.tmHenkRivitila(null)).toBeNull();
    expect(RV.tmHenkRivitila(P())).toMatchObject({ tila: 'odottaa' });
    expect(RV.tmHenkRivitila(P(VALITTU('seura_kierto')))).toMatchObject({ tila: 'valittu', kirjain: 'B', nimi: 'Kierto', oma: false });
    expect(RV.tmHenkRivitila(P(VALITTU('Oma juttu')))).toMatchObject({ tila: 'valittu', oma: true, kirjain: null, teksti: 'Oma juttu' });
  });
  it('tekstit: "Valinta odottaa", "Topias valitsi A · Haltuunotto", oma ehdotus näkyy tekstinä + merkintä; HTML escapataan', () => {
    const t = (r, n) => RV.tmHenkRiviTeksti(RV.tmHenkRivitila(P(r)), n, { t: (k) => k });
    expect(t(null, 'Topias')).toBe('Valinta odottaa'); expect(t(VALITTU('y_h1'), 'Topias')).toBe('Topias valitsi A · Haltuunotto'); expect(t(VALITTU('Oma juttu'), 'Topias')).toBe('Topias ehdotti omaa: Oma juttu (oma ehdotus)');
    expect(RV.tmHenkRiviHTML(RV.tmHenkRivitila(P(VALITTU('<b>x</b>'))), 'T', { t: (k) => k })).not.toContain('<b>');
    expect(RV.tmVahvistusEsivalinta(P(VALITTU('y_h1')))).toEqual({ avain: 'y_h1', nimi: 'Haltuunotto', oma: false, teksti: 'y_h1' }); expect(RV.tmVahvistusEsivalinta(P())).toBeNull();
  });
  it('J4-lista: tila valinta_odottaa / valittavana (K3) → rivi + "Vahvista jakso" -nappi; vanha D-1-polku ja käynnissä oleva jakso ennallaan', () => {
    const nyt = new Date('2026-11-17T10:00:00Z');
    expect(JA.tmJoukkoTila(P(), nyt)).toBe('valinta_odottaa'); expect(JA.tmJoukkoTila(P(VALITTU('y_h1')), nyt)).toBe('valittavana');
    expect(JA.tmJoukkoTila({ id: 'a', jaksofokus: { konsepti_avain: 'x', tila: 'valittavana', alkoi: '2026-11-16T10:00:00.000Z' } }, nyt)).toBe('valittavana');   // D-1 ennallaan
    expect(JA.tmJoukkoTila({ id: 'a', jaksofokus: { konsepti_avain: 'x', alkoi: '2026-11-16T10:00:00.000Z' } }, nyt)).toBe('kaynnissa');
    const r1 = JA.tmJoukkoRivi(P(), { nimi: 'Topias', nyt }), r2 = JA.tmJoukkoRivi(P(VALITTU('y_h1')), { nimi: 'Topias', nyt });
    expect(r1).toMatchObject({ tila: 'valinta_odottaa', hyvaksyttavissa: false }); expect(r2).toMatchObject({ tila: 'valittavana', hyvaksyttavissa: false });
    const h = JA.tmJoukkoHTML([r1, r2], {}, { esc: (s) => String(s), t: (k) => k, avaaFn: 'avaa', hyvaksyFn: 'hyv', kaikkiFn: 'kaikki' });
    expect(h).toContain('Valinta odottaa'); expect(h).toContain('valitsi A · Haltuunotto'); expect(h).toContain('Vahvista jakso'); expect(h).not.toContain('Pelaaja valitsi — vahvista');
  });
  it('VP "seuraava askel": K3-valinta → sama valinta_odottaa-tila, reitti-lippu sanamuotoon', () => {
    const a = SA.tmSeuraavaAskel(P(VALITTU('y_h1')), { nyt: Date.parse('2026-11-17T10:00:00Z') }); expect(a.avain).toBe('valinta_odottaa'); expect(a.peruste.reitti).toBe(true);
    const d1 = SA.tmSeuraavaAskel({ id: 'a', etunimi: 'A', jaksofokus: { konsepti_avain: 'x', tila: 'valittavana', alkoi: '2026-11-16T10:00:00.000Z' }, ydinvahvuus_valinta: { vaihtoehto: 'Pallo' } }, { nyt: Date.parse('2026-11-17T10:00:00Z') }); expect(d1.avain).toBe('valinta_odottaa'); expect(d1.peruste.reitti).toBe(false);
  });
});

describe('P6 — sitoumus Tänään-sivulla jakson ensimmäisellä viikolla, kunnes pelaaja on sitoutunut', () => {
  const ALKOI = new Date(2026, 10, 9).toISOString();   // ma 9.11.
  const jakso = (lisa) => P({ jaksofokus: Object.assign({ konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: ALKOI, kesto_vk: 4 }, lisa) });
  const ctx = (lisa) => Object.assign({ tanaan: '2026-11-11', ladattu: true, sitoumus: null }, lisa);
  it('1. viikko + ei sitoumusta → näkyy; viikko 2 → ei', () => {
    expect(RV.tmSitoumusTanaan(jakso(), ctx())).toBe(true); expect(RV.tmSitoumusTanaan(jakso(), ctx({ tanaan: '2026-11-16' }))).toBe(false); expect(RV.tmSitoumusTanaan(jakso(), ctx({ tanaan: '2026-11-15' }))).toBe(true);   // su 15.11. = vielä 1. viikko
  });
  it('sitouduttu TÄHÄN jaksoon (jakso_alkoi täsmää tai puuttuu = legacy) → ei; sitoumus vanhalta jaksolta → näkyy; sitoumus ilman pvm → näkyy', () => {
    expect(RV.tmSitoumusTanaan(jakso(), ctx({ sitoumus: { sitoumus_pvm: '2026-11-10T10:00:00.000Z', jakso_alkoi: ALKOI } }))).toBe(false);
    expect(RV.tmSitoumusTanaan(jakso(), ctx({ sitoumus: { sitoumus_pvm: '2026-11-10T10:00:00.000Z' } }))).toBe(false);   // legacy, sama sääntö kuin _p7Vanhentunut
    expect(RV.tmSitoumusTanaan(jakso(), ctx({ sitoumus: { sitoumus_pvm: '2026-10-05T10:00:00.000Z', jakso_alkoi: '2026-10-05T10:00:00.000Z' } }))).toBe(true);
    expect(RV.tmSitoumusTanaan(jakso(), ctx({ sitoumus: { itsearvio: {} } }))).toBe(true);
  });
  it('ei näy: tietoa ei vielä luettu (ei välähdystä sitoutuneelle), ei jaksoa, tarjous kesken, umpeutunut jakso', () => {
    expect(RV.tmSitoumusTanaan(jakso(), ctx({ ladattu: false }))).toBe(false); expect(RV.tmSitoumusTanaan(P({ jaksofokus: null }), ctx())).toBe(false); expect(RV.tmSitoumusTanaan(P(), ctx())).toBe(false);
    expect(RV.tmSitoumusTanaan(jakso(), ctx({ tanaan: '2026-12-20' }))).toBe(false); expect(RV.tmSitoumusTanaan(jakso(), {})).toBe(false);
  });
});

/* ── Pelaaja_v7-adapteri: SIVUN oikea koodi vm:ssä ── */
function pura(tunniste) { const i = SRC.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1); let d = 0; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}' && !--d) return SRC.slice(i, k + 1); } throw new Error('ei sulkeva: ' + tunniste); }
function ymp({ p = P(), tanaan = '2026-11-17', demo = false, stage = '2_rakentaja', kirjoitusVirhe = null, idpLuettu = false, sit = null } = {}) {
  const log = { updates: [], virheet: [], draw: 0, go: [], tab: [], idpLataus: 0 };
  const node = (path) => ({ collection: (c) => node(path + '/' + c), doc: (d) => node(path + '/' + d), update: async (data) => { log.updates.push({ path, data }); if (kirjoitusVirhe) throw Object.assign(new Error('x'), { code: kirjoitusVirhe }); } });
  const sb = { console: { warn() {} }, Date, Object, Array, String, Number, JSON, Math, Promise, _isDemoUser: demo, _pelaaja: p, _tab: 'tanaan', _stage: stage, _seuraId: 'kpv', _paivaIso: () => tanaan,
    _thEsc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'), T: (k) => 'pelaaja.' + k, draw: () => { log.draw++; }, go: (s) => log.go.push(s), tab: (t) => log.tab.push(t),
    _db: { collection: (c) => node(c) }, _auth: null, _p7Verkossa: () => true, _p7Aikaraja: (x) => x, _p7EiYhteyttaVirhe: () => new Error('ei yhteyttä'), _p7KirjausVirheTeksti: (e) => 'VIRHE:' + (e && e.code), _naytaKirjausVirhe: (t) => log.virheet.push(t),
    rMinaSitoumus: () => '<div id="sit">SITOUMUS</div>', _p7LataaTavoite: () => { log.idpLataus++; }, hdr: () => '', TM_REITIN_VALINTA: RV, TM_VIIKKOKATSAUS: K4, TM_TANAAN_KENTTA: TK, TM_KIELLETYT: require('../lib/tm_kielletyt.js'), TM_TAMAN_TUEKSI: require('../lib/tm_taman_tueksi.js') };
  sb.window = sb; sb._p7Sitoumus = sit; sb._p7IdpLuettu = idpLuettu; sb.document = { getElementById: () => null };
  vm.createContext(sb);
  const alustus = /^window\._p7K3 = \{[^\n]*\};/m.exec(SRC); expect(alustus, 'window._p7K3 alustus').toBeTruthy();
  const fnt = ['function _p7K3Lisa(', 'function _p7K3Avaa(', 'function _p7K3Takaisin(', 'function _p7K3Valitse(', 'function _p7K3Oma(', 'function _p7K3OmaTeksti(', 'function rValinta(', 'async function _p7K3Tallenna(', 'function _p7K3SitoumusHTML('];
  vm.runInContext([alustus[0], 'function _p7K1T(k) { const v = T(k); return (v === \'pelaaja.\' + k) ? k : v; }'].concat(fnt.map(pura)).join(';\n') + ';\n' + fnt.map((f) => /function (\w+)\(/.exec(f)[1]).map((n) => 'this.' + n + '=' + n + ';').join(''), sb);
  return { sb, log };
}
const o = { esc: (s) => String(s), t: (k) => k };

describe('Pelaaja_v7 — valintaruutu ja kirjoitus', () => {
  it('Hyvä jakso -kortin lisä: valittavana → nappi, valinta tehty → "Valintasi on valmentajalla"; Leikkijälle ei (K5); ei tarjousta → ei mitään', () => {
    expect(ymp().sb._p7K3Lisa(o)).toContain('_p7K3Avaa()'); expect(ymp({ p: P(VALITTU('y_h1')) }).sb._p7K3Lisa(o)).toContain('Valintasi on valmentajalla');
    expect(ymp({ stage: '1_leikkija' }).sb._p7K3Lisa(o)).toBe(''); expect(ymp({ p: P({ jaksofokus: null }) }).sb._p7K3Lisa(o)).toBe('');
  });
  it('avaus → go("valinta"), valinta nollautuu; takaisin → tab("tanaan"); konsepti valitaan → tila päivittyy', () => {
    const e = ymp(); e.sb._p7K3.valittu = 'y_h1'; e.sb._p7K3Avaa(); expect(e.log.go).toEqual(['valinta']); expect(e.sb._p7K3.valittu).toBeNull();
    e.sb._p7K3Valitse('seura_kierto'); expect(e.sb._p7K3.valittu).toBe('seura_kierto'); expect(e.sb._p7K3.omaAuki).toBe(false); e.sb._p7K3Takaisin(); expect(e.log.tab).toEqual(['tanaan']);
    e.sb._p7K3Oma(); expect(e.sb._p7K3.valittu).toBe('__oma'); expect(e.sb._p7K3.omaAuki).toBe(true);
  });
  it('rValinta: kaksi korttia nimineen ja valmentajan lauseineen, oma ehdotus, kenttä ilman reittejä; vain tarjottu (vahvistettu) näkyy', () => {
    const e = ymp({ p: P({ jaksofokus: OFFER({ vaihtoehdot: [VAIHT[0], Object.assign({}, VAIHT[1], { vahvistettu: false })] }) }) }); const h = e.sb.rValinta();
    expect(h).toContain('Haltuunotto'); expect(h).toContain('Pidät pallon lähellä.'); expect(h).not.toContain('Kierto'); expect(h).toContain('+ Oma ehdotus');
  });
  it('KIRJOITUS: update (ei set) VAIN omaan dokumenttiin, VAIN ydinvahvuus_valinta { vaihtoehto, valittu_pvm }; ei jaksofokus-kenttää; sen jälkeen takaisin Tänään', async () => {
    const e = ymp(); e.sb._p7K3.valittu = 'y_h1'; await e.sb._p7K3Tallenna();
    expect(e.log.updates).toEqual([{ path: 'seurat/kpv/pelaajat/topias', data: { ydinvahvuus_valinta: { vaihtoehto: 'y_h1', valittu_pvm: '2026-11-17' } } }]);
    expect(Object.keys(e.log.updates[0].data)).toEqual(['ydinvahvuus_valinta']); expect(e.sb._pelaaja.ydinvahvuus_valinta).toEqual({ vaihtoehto: 'y_h1', valittu_pvm: '2026-11-17' }); expect(e.log.tab).toEqual(['tanaan']); expect(e.log.virheet).toEqual([]);
    await e.sb._p7K3Tallenna(); expect(e.log.updates).toHaveLength(2);   // valinta voi vaihtaa (ei lukittu) — sama kirjoitusmuoto
  });
  it('OMA EHDOTUS: teksti sellaisenaan (trimmattu); kielletty sana / liian pitkä / tyhjä → ei kirjoitusta + toimintaohje-toast; ruutu jää auki', async () => {
    const e = ymp(); e.sb._p7K3.valittu = '__oma'; e.sb._p7K3.oma = ' Haluan vasenta jalkaa '; await e.sb._p7K3Tallenna(); expect(e.log.updates[0].data.ydinvahvuus_valinta).toEqual({ vaihtoehto: 'Haluan vasenta jalkaa', valittu_pvm: '2026-11-17' });
    for (const t of ['Heikkouteni', 'x'.repeat(61), '  ']) { const f = ymp(); f.sb._p7K3.valittu = '__oma'; f.sb._p7K3.oma = t; await f.sb._p7K3Tallenna(); expect(f.log.updates).toEqual([]); expect(f.log.virheet).toHaveLength(1); expect(f.log.tab).toEqual([]); }
  });
  it('KIRJOITUSVIRHE ei nielty: toast (permission-denied) + ruutu auki + nappi taas käytössä; paikallista valintaa ei merkitä tehdyksi', async () => {
    const e = ymp({ kirjoitusVirhe: 'permission-denied' }); e.sb._p7K3.valittu = 'y_h1'; await e.sb._p7K3Tallenna();
    expect(e.log.virheet).toEqual(['VIRHE:permission-denied']); expect(e.sb._p7K3.tallentaa).toBe(false); expect(e.sb._pelaaja.ydinvahvuus_valinta).toBeUndefined(); expect(e.log.tab).toEqual([]);
  });
  it('demo: ei Firestore-kirjoitusta, valinta vain lokaalisti; ei tarjousta → ei kirjoitusta; kaksoispainallus kesken tallennuksen ei kirjoita uudelleen', async () => {
    const d = ymp({ demo: true }); d.sb._p7K3.valittu = 'y_h1'; await d.sb._p7K3Tallenna(); expect(d.log.updates).toEqual([]); expect(d.sb._pelaaja.ydinvahvuus_valinta.vaihtoehto).toBe('y_h1');
    const n = ymp({ p: P({ jaksofokus: null }) }); n.sb._p7K3.valittu = 'y_h1'; await n.sb._p7K3Tallenna(); expect(n.log.updates).toEqual([]);
    const k = ymp(); k.sb._p7K3.valittu = 'y_h1'; k.sb._p7K3.tallentaa = true; await k.sb._p7K3Tallenna(); expect(k.log.updates).toEqual([]);
  });
  it('sitoumus Tänäänissä: ensin luku (ei korttia), luvun jälkeen kortti 1. viikolla; sitoutuneelle ei; Leikkijälle ei', () => {
    const ALKOI = new Date(2026, 10, 9).toISOString(), p = P({ jaksofokus: { konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: ALKOI, kesto_vk: 4 } });
    const a = ymp({ p, tanaan: '2026-11-11' }); expect(a.sb._p7K3SitoumusHTML('2026-11-11')).toBe(''); expect(a.log.idpLataus).toBe(1);
    const b = ymp({ p, tanaan: '2026-11-11', idpLuettu: true }); expect(b.sb._p7K3SitoumusHTML('2026-11-11')).toContain('SITOUMUS'); expect(b.log.idpLataus).toBe(0);
    const c = ymp({ p, tanaan: '2026-11-11', idpLuettu: true, sit: { sitoumus_pvm: '2026-11-10T10:00:00.000Z', jakso_alkoi: ALKOI } }); expect(c.sb._p7K3SitoumusHTML('2026-11-11')).toBe('');
    expect(ymp({ p, tanaan: '2026-11-11', idpLuettu: true, stage: '1_leikkija' }).sb._p7K3SitoumusHTML('2026-11-11')).toBe('');
  });
});

describe('Kytkennät (lähdetarkistukset): lippu pois → ennallaan; kirjoituspolut; järjestys', () => {
  it('Pelaaja_v7: K3 vain rA1Kentta-polussa — rA1() (lippu pois) ei sisällä K3:a; script-tagi + SW-allowlist + cache-bumppi', () => {
    const rA1 = SRC.slice(SRC.indexOf('function rA1() {'), SRC.indexOf('function rA1() {') + 20000); expect(rA1).not.toMatch(/_p7K3|TM_REITIN_VALINTA/);
    const kentta = SRC.slice(SRC.indexOf('function rA1Kentta() {'), SRC.indexOf('function rA1Kentta() {') + 6000); expect(kentta).toContain('_p7K3SitoumusHTML(tanaan)'); expect(kentta).toContain('_p7VkHTML(x, jf, tanaan, o)');
    expect(SRC).toMatch(/<script src="lib\/tm_reitin_valinta\.js\?v=\d+"><\/script>/); expect(lue('sw_pelaaja.js')).toContain("/lib/tm_reitin_valinta.js"); expect(lue('sw_pelaaja.js')).toMatch(/const CACHE = 'tm-pelaaja-v(80|81)/);
  });
  it('Pelaaja_v7: K3-lohko kirjoittaa VAIN ydinvahvuus_valinta (ei jaksofokus-/historia-kirjoitusta, ei set/merge)', () => {
    const blokki = SRC.slice(SRC.indexOf('═══ K3 — pelaaja valitsee seuraavan reitin'), SRC.indexOf('═══ K4 — sunnuntain viikkokatsaus')); expect(blokki.length).toBeGreaterThan(1500);
    expect(blokki).toMatch(/\.update\(\{ ydinvahvuus_valinta: olio\.data \}\)/); expect(blokki).not.toMatch(/\.set\(|jaksofokus_historia|\.update\(\{[^}]*jaksofokus[^_]/); expect(blokki).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
  for (const [nimi, src, tallenna] of [['Master', MASTER, 'window._msTallenna = async function'], ['VP', VP, 'window._vpSulkuTallenna = async function']]) {
    it(nimi + ': tarjous validoidaan ENNEN tmSuljeJakso:a ja kirjoitusta; tarjous korvaa jaksofokuksen; vanha ydinvahvuus_valinta pois samassa updatessa; osio vain lipulla (S.k4)', () => {
      const i = src.indexOf(tallenna); expect(i).toBeGreaterThan(-1); const fn = src.slice(i, i + 9000);
      expect(fn).toMatch(/TM_REITIN_VALINTA\.tmTarjousOlio\(S\.k3\.kortit\)/); expect(fn.indexOf('tmTarjousOlio')).toBeLessThan(fn.indexOf('tmSuljeJakso'));
      expect(fn).toMatch(/jaksofokus = _tarjous\.jaksofokus/); expect(fn).toMatch(/ydinvahvuus_valinta: firebase\.firestore\.FieldValue\.delete\(\)/); expect(fn).toMatch(/S\.k3 && S\.k3\.paalla/);
      expect(src).toMatch(/function _(ms|vp)K3OsioHTML\(S\) \{\s*const RV = window\.TM_REITIN_VALINTA; if \(!S\.k4 \|\| !S\.k3 \|\| !RV\) return ''/);   // lippu pois → ei osiota
      expect(src).toMatch(/tmJaksoEhdotukset\(p, p\.jaksofokus && p\.jaksofokus\.konsepti_avain/);   // ehdotukset = olemassa oleva logiikka, ei uutta
      expect(src).toMatch(/<script src="lib\/tm_reitin_valinta\.js\?v=\d+"><\/script>/);
    });
  }
  it('VP: tarjouksen nimi kanonisesta (fi) kirjoituspolusta (§32); Master: tarjouksen osio + pelaajalistan rivitila (_mAloitaJaksoRivi)', () => {
    expect(VP).toMatch(/k\.nimi = _vpJfKanonNimi\(k\.avain, 'teknis_taktinen'\)/); expect(MASTER).toMatch(/_msK3RiviHTML\(p\)/); expect(MASTER).toMatch(/async function _mKirjoitaJaksofokus\(p, v, pid, extra\)/); expect(VP).toMatch(/async function _vpKirjoitaJaksofokus\(p, v, viesti, extra, onnistui\)/);
  });
  it('tmVkPaatosHTML: lisaHTML päätöskortin sisään; ilman päätöskorttia oma kortti; ilman lisää ennallaan', () => {
    const x = { tila: 'lause', nimi: 'Kuljettaminen', lause: 'Hyvä jakso' };
    expect(K4.tmVkPaatosHTML(x, { t: (k) => k, lisaHTML: '<i>LISA</i>' })).toContain('<i>LISA</i></section>'); expect(K4.tmVkPaatosHTML(x, { t: (k) => k })).not.toContain('LISA');
    expect(K4.tmVkPaatosHTML(null, { lisaHTML: '<i>LISA</i>' })).toContain('<i>LISA</i>'); expect(K4.tmVkPaatosHTML(null, {})).toBe('');
  });
});
