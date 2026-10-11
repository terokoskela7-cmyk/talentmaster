/* K35-7a · lib/tm_ical.js (RFC 5545) + vartijat: functions-kopio, Rules, index-rekisteröinti, ei uutta rajauslogiikkaa. Palvelinpolku testataan functions/test/kalenteri_ical.test.js:ssä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const I = require('../lib/tm_ical.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const NYT = Date.UTC(2026, 9, 20, 10, 0);
const unfold = (s) => s.replace(/\r\n /g, '');
const ev = (o) => Object.assign({ id: 'a1', tyyppi: 'harjoitus', joukkue_nimi: 'Demo U13', paikka: 'Kenttä 2', alkaa: '2026-10-21T14:30:00.000Z', paattyy: '2026-10-21T16:00:00.000Z' }, o || {});

describe('tmIcal · muoto', () => {
  const s = I.tmIcal([ev()], { nimi: 'FC Demo · Kalenteri', kieli: 'fi', nyt: NYT });
  it('VCALENDAR-kehys, CRLF joka rivillä, päättyy CRLF:ään, ei paljaita LF-rivinvaihtoja', () => {
    expect(s.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true); expect(s.endsWith('END:VCALENDAR\r\n')).toBe(true); expect(/[^\r]\n/.test(s)).toBe(false); expect(s).toContain('METHOD:PUBLISH'); expect(s).toContain('PRODID:-//TalentMaster//Kalenteri//FI');
    expect(s).toContain('X-WR-CALNAME;LANGUAGE=fi:FC Demo · Kalenteri'); expect(s).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT1H'); expect(s).toContain('X-PUBLISHED-TTL:PT1H');
  });
  it('tapahtuma: UID <id>@talentmaster, DTSTART/DTEND UTC (Z), SUMMARY = tyypin nimi · joukkue, LOCATION, STATUS CONFIRMED, SEQUENCE 0', () => {
    expect(s).toContain('UID:a1@talentmaster'); expect(s).toContain('DTSTART:20261021T143000Z'); expect(s).toContain('DTEND:20261021T160000Z'); expect(s).toContain('SUMMARY;LANGUAGE=fi:Harjoitus · Demo U13'); expect(s).toContain('LOCATION;LANGUAGE=fi:Kenttä 2'); expect(s).toContain('STATUS:CONFIRMED'); expect(s).toContain('SEQUENCE:0'); expect(s).toContain('DTSTAMP:20261020T100000Z'); expect(s).not.toContain('DESCRIPTION');
  });
  it('tyypin nimi rekisteristä (ottelu, testitapahtuma); ilman joukkuetta nimi lisätään vain jos eroaa tyypin nimestä; ei-tunnettu tyyppi ei kaada', () => {
    const t = (o) => unfold(I.tmIcal([ev(o)], { nyt: NYT })); expect(t({ tyyppi: 'ottelu' })).toContain('SUMMARY;LANGUAGE=fi:Ottelu · Demo U13'); expect(t({ joukkue_nimi: undefined, nimi: 'MV-harjoitus' })).toContain('SUMMARY;LANGUAGE=fi:Harjoitus · MV-harjoitus'); expect(t({ joukkue_nimi: undefined, nimi: 'Harjoitus' })).toContain('SUMMARY;LANGUAGE=fi:Harjoitus\r\n'); expect(t({ tyyppi: 'leiri' })).toContain('BEGIN:VEVENT');
  });
});

describe('tmIcal · ajat, koko päivä, kesäaika', () => {
  it('peruttu → STATUS:CANCELLED; SEQUENCE = versio, puuttuu → paivitetty-sekunnit; DTSTAMP = paivitetty', () => {
    const t = (o) => I.tmIcal([ev(o)], { nyt: NYT }); expect(t({ tila: 'peruttu' })).toContain('STATUS:CANCELLED'); expect(t({ versio: 7 })).toContain('SEQUENCE:7'); const p = '2026-10-20T08:15:30.000Z'; expect(t({ paivitetty: p })).toContain('SEQUENCE:' + Math.floor(Date.parse(p) / 1000)); expect(t({ paivitetty: p })).toContain('DTSTAMP:20261020T081530Z'); expect(t({ versio: 3, paivitetty: p })).toContain('SEQUENCE:3');
  });
  it('koko päivä: VALUE=DATE, DTEND = viimeinen päivä + 1 (23:59-loppu ja 00:00-loppu), monipäiväinen tauko', () => {
    const t = (o) => I.tmIcal([ev(Object.assign({ koko_paiva: true, tyyppi: 'seuran_tauko', joukkue_nimi: undefined }, o))], { nyt: NYT });
    const yksi = t({ alkaa: '2026-10-20T21:00:00.000Z', paattyy: '2026-10-21T20:59:00.000Z' }); expect(yksi).toContain('DTSTART;VALUE=DATE:20261021'); expect(yksi).toContain('DTEND;VALUE=DATE:20261022'); expect(yksi).not.toMatch(/DTSTART:\d/);
    const kk = t({ alkaa: '2026-10-11T21:00:00.000Z', paattyy: '2026-10-18T20:59:00.000Z' }); expect(kk).toContain('DTSTART;VALUE=DATE:20261012'); expect(kk).toContain('DTEND;VALUE=DATE:20261019');
    expect(t({ alkaa: '2026-10-20T21:00:00.000Z', paattyy: '2026-10-21T21:00:00.000Z' })).toContain('DTEND;VALUE=DATE:20261022'); expect(t({ alkaa: '2026-10-20T21:00:00.000Z', paattyy: undefined })).toContain('DTEND;VALUE=DATE:20261022');
  });
  it('kesäaika: Helsingin 17:30 EEST (heinäkuu) = 14:30Z, 17:30 EET (joulukuu) = 15:30Z; kellojen siirtopäivä 25.10. koko päivä; maaliskuun siirto 29.3.', () => {
    const z = (iso) => I.tmIcal([ev({ alkaa: iso, paattyy: undefined })], { nyt: NYT }).match(/DTSTART:(\S+)/)[1];
    expect(z(new Date('2026-07-15T17:30:00+03:00').toISOString())).toBe('20260715T143000Z'); expect(z(new Date('2026-12-15T17:30:00+02:00').toISOString())).toBe('20261215T153000Z');
    const pv = (a, b) => { const s = I.tmIcal([ev({ koko_paiva: true, alkaa: a, paattyy: b })], { nyt: NYT }); return [s.match(/DTSTART;VALUE=DATE:(\d+)/)[1], s.match(/DTEND;VALUE=DATE:(\d+)/)[1]]; };
    expect(pv(new Date('2026-10-25T00:00:00+03:00').toISOString(), new Date('2026-10-25T23:59:00+02:00').toISOString())).toEqual(['20261025', '20261026']); expect(pv(new Date('2026-03-29T00:00:00+02:00').toISOString(), new Date('2026-03-29T23:59:00+03:00').toISOString())).toEqual(['20260329', '20260330']);
  });
  it('loppu puuttuu → 1 h; epäkelpo/puuttuva alku tai id ohitetaan; tyhjä lista antaa kelvollisen kalenterin', () => {
    expect(I.tmIcal([ev({ paattyy: undefined })], { nyt: NYT })).toContain('DTEND:20261021T153000Z'); const t = I.tmIcal([ev({ alkaa: 'x' }), ev({ id: undefined }), null], { nyt: NYT }); expect(t).not.toContain('BEGIN:VEVENT'); expect(I.tmIcal([], { nyt: NYT })).toMatch(/^BEGIN:VCALENDAR\r\n[\s\S]*END:VCALENDAR\r\n$/);
  });
});

describe('tmIcal · tekstin escapet ja rivitaitto', () => {
  it('escapet: \\ ; , ja rivinvaihto (CRLF/LF/CR) → \\n', () => {
    expect(I.tmIcalTeksti('a\\b;c,d\ne\r\nf\rg')).toBe('a\\\\b\\;c\\,d\\ne\\nf\\ng');
    const s = unfold(I.tmIcal([ev({ pelaajaviesti: 'Tuo: pullo, suojat; kengät\nKlo 17' })], { nyt: NYT })); expect(s).toContain('DESCRIPTION;LANGUAGE=fi:Tuo: pullo\\, suojat\\; kengät\\nKlo 17');
  });
  it('rivitaitto: jokainen rivi ≤ 75 oktettia, jatkorivi alkaa välilyönnillä, purku palauttaa alkuperäisen; monitavuista merkkiä (ä, ö, emoji) ei katkaista', () => {
    const pitka = 'Äänekäs ' + 'ääkköset ja öljyä '.repeat(12) + 'loppu ' + String.fromCodePoint(0x26BD).repeat(40);
    const s = I.tmIcal([ev({ pelaajaviesti: pitka })], { nyt: NYT }), rivit = s.split('\r\n');
    rivit.forEach((r) => expect(Buffer.byteLength(r, 'utf8')).toBeLessThanOrEqual(75)); expect(rivit.some((r) => r.startsWith(' '))).toBe(true); expect(unfold(s)).toContain(pitka.replace(/,/g, '\\,')); expect(s).not.toContain('�');
    expect(I.tmIcalTaita('X:' + 'a'.repeat(200)).split('\r\n').every((r) => r.length <= 75)).toBe(true);
  });
  it('kieli: fi oletus ja fallback; sv/en LANGUAGE-parametri ja nimet-kartta; ei kirjoita ruotsia koodissa', () => {
    const k = (kieli, nimet) => I.tmIcal([ev()], { nyt: NYT, kieli, nimet }); expect(k('xx')).toContain('SUMMARY;LANGUAGE=fi:Harjoitus'); expect(k('sv')).toContain('SUMMARY;LANGUAGE=sv:Harjoitus'); expect(k('sv', { sv: { harjoitus: 'Sv-nimi' } })).toContain('SUMMARY;LANGUAGE=sv:Sv-nimi · Demo U13'); expect(k('en')).toContain('PRODID:-//TalentMaster//Kalenteri//EN');
    expect(lue('lib/tm_ical.js')).not.toMatch(/Träning|Match|Samling/);
  });
  it('sallittulista: lib kirjoittaa vain tunnetut kentät — muistiinpanot, pelaajat ja uid:t eivät päädy syötteeseen vaikka ne olisivat tapahtumaobjektissa', () => {
    const s = unfold(I.tmIcal([ev({ muistiinpanot: 'SALAINEN', pelaajat_id: ['p9'], luoja_uid: 'LUOJA', valmentaja_rpe: 8, kohde: { ryhma_nimi: 'RYHMA' } })], { nyt: NYT })); ['SALAINEN', 'p9', 'LUOJA', 'RYHMA', 'rpe'].forEach((x) => expect(s).not.toContain(x));
  });
});

describe('vartijat: palvelin, Rules, kopio, rajaus', () => {
  it('functions/-kopiot identtiset lähteen kanssa (manifesti) ja kaksi uutta lib-tiedostoa manifestissa', () => {
    const m = JSON.parse(lue('functions/jaettu_lib.json')); expect(m.tiedostot).toContain('tm_ical.js'); expect(m.tiedostot).toContain('tm_kalenteri_tyypit.js'); ['tm_ical.js', 'tm_kalenteri_tyypit.js'].forEach((f) => expect(lue('functions/' + f)).toBe(lue('lib/' + f)));
  });
  it('index.js: luoKalenteriTilaus (callable, App Check) ja kalenteriIcal (onRequest, europe-west1, EI App Checkia)', () => {
    const idx = lue('functions/index.js'), a = idx.indexOf('exports.luoKalenteriTilaus'), b = idx.indexOf('exports.kalenteriIcal'), c = idx.indexOf('\n\n', b); expect(a).toBeGreaterThan(0); expect(b).toBeGreaterThan(a);
    expect(idx.slice(a, b)).toContain("region('europe-west1')"); expect(idx.slice(a, b)).toContain('enforceAppCheck: true'); expect(idx.slice(a, b)).toContain('.https.onCall'); expect(idx.slice(b, c)).toContain("region('europe-west1')"); expect(idx.slice(b, c)).toContain('.https.onRequest'); const pa = idx.indexOf('exports.peruKalenteriTilaus'); expect(pa).toBeGreaterThan(a); expect(pa).toBeLessThan(b); expect(idx.slice(pa, b)).toContain('enforceAppCheck: true'); expect(idx.slice(pa, b)).toContain('luoPeruutusKasittelija'); expect(idx.slice(b, c)).not.toContain('enforceAppCheck');
  });
  it('Rules v3.57: kalenteri_tilaukset allow read, write: if false (vain palvelin); versio + changelog', () => {
    const r = lue('tm_admin/firestore.rules'); expect(r).toMatch(/firestore\.rules v3\.57/); expect(r).toMatch(/Muutokset v3\.56 → v3\.57/); expect(r).toMatch(/match \/kalenteri_tilaukset\/\{avain\}\s*\{ allow read, write: if false; \}/);
  });
  it('ei uutta rajauslogiikkaa: palvelin käyttää tmKuuluuPelaajalle/tmProjisoi/tmNakyyKalenterissa/huoltajaSyy; ei omia näkyvyys- tai joukkuevertailuja; token ei lokiin', () => {
    const s = lue('functions/kalenteri_ical.js'); ['tmKuuluuPelaajalle', 'tmProjisoi', 'tmNakyyKalenterissa', 'huoltajaSyy', 'tunnisteTyyppi'].forEach((x) => expect(s).toContain(x)); expect(s).not.toMatch(/nakyvyys\s*[=!]==/); expect(s).not.toMatch(/console\.(log|warn|error)/); expect(s).toContain('huoltajaEmailHash'); expect(s).toContain('pelaajaPoissa');
    expect(s).toContain("randomBytes(32).toString('base64url')"); expect(s).toContain("createHash('sha256')"); expect(s).toContain("'max-age=900'"); expect(s).toMatch(/IKKUNA_ALKU_PV = -30, IKKUNA_LOPPU_PV = 180/);
  });
});
