/* K1d · notifReviewEraantyy (functions/rytmi_notif.js) = SAMA sääntö kuin sovelluksessa (lib/tm_rytmi.js → laskeReviewKadenssi): Topias-tapaus (jakso päättyy ennen eräpäivää) → ei pushia eikä ilmoitusta;
   jakso päättyy eräpäivän jälkeen / ei jaksoa / myöhässä → molemmat ilmoittavat samalla eräpäivällä. Push-teksti = selaimen lib-teksti (ts_rytmi_otsikko[_myohassa]). Toimii UTC:ssä (kalenteripäivät). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const N = require('../lib/tm_eerikkila_normit.js'), RN = require('../functions/rytmi_notif.js'), S = require('../lib/tm_tanaan_signaali.js');
globalThis.normiIka = N.normiIka;
const NYT = new Date(2026, 9, 21, 12, 0).getTime();   // 21.10.2026 (paikallinen)
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const paivaa = (n) => iso(new Date(2026, 9, 21 + n));
const pel = (extra) => Object.assign({ etunimi: 'Topi', sukunimi: 'Esimerkki', syntymaVuosi: 2013, joukkue: 'Demo U13' }, extra);
/* viimeisin yhteenveto N pv sitten → eräpäivä = +42 pv (13 v) */
const viim = (n) => ({ review_viimeisin_pvm: paivaa(-n), review_viimeisin_tyyppi: 'jakso' });
const jakso = (alkoiN, kestoVk) => ({ jaksofokus: { konsepti_avain: 'y_h4', konsepti_nimi: 'Harhauttaminen', alkoi: paivaa(alkoiN), kesto_vk: kestoVk, lahde: 'valmentaja' } });
const sovellus = (p) => N.laskeReviewKadenssi(p, NYT);
const push = (p) => RN.rytmiNotifit([{ id: 'p1', data: p }], NYT);
/* sovelluksen ilmoitus nousee kun status ≠ ajantasalla/ei_reviewia; push samalla säännöllä + kynnys eräpäivään ≤ 7 pv */
const sovellusIlmoittaa = (r) => r.status === 'eraantymassa' || r.status === 'myohassa';
const pushKynnys = (r) => r.ylimaaraPv >= -RN.PUSH_PV;

describe('K1d · sovellus ja push antavat saman tuloksen', () => {
  it('TOPIAS-tapaus: jakso käynnissä ja päättyy viimeistään eräpäivänä → sovellus "ajantasalla" eikä ilmoitusta, push ei lähde', () => {
    const t = pel(Object.assign(viim(35), jakso(-35, 6)));   // edellinen yhteenveto 35 pv sitten → eräpäivä +7 pv; jakso alkoi 35 pv sitten, kesto 6 vk → päättyy +7 pv = eräpäivänä
    const r = sovellus(t); expect(r.raakaStatus).toBe('eraantymassa'); expect(r.jaksoHoitaa).toBe(true); expect(r.status).toBe('ajantasalla');
    expect(push(t)).toEqual([]);
  });
  it('vastakohta: jakso päättyy eräpäivän JÄLKEEN → sovellus ilmoittaa molemmilla päivillä ja push lähtee samalla eräpäivällä', () => {
    const t = pel(Object.assign(viim(40), jakso(-30, 6)));   // eräpäivä +2 pv; jakso päättyy +12 pv
    const r = sovellus(t); expect(r.status).toBe('eraantymassa'); expect(r.jakso.loppuPvm > r.eraantyyPvm).toBe(true);
    const ps = push(t); expect(ps).toHaveLength(1); expect(ps[0].eraantyy_pvm).toBe(r.eraantyyPvm);
  });
  const TAPAUKSET = [
    ['jakso päättyy eräpäivän JÄLKEEN → ilmoitus molemmissa', pel(Object.assign(viim(40), jakso(-30, 6)))],
    ['ei jaksoa, erääntymässä (eräpäivään 5 pv)', pel(viim(37))],
    ['ei jaksoa, myöhässä 9 pv', pel(viim(51))],
    ['eräpäivään 10 pv → sovellus ilmoittaa (≤ 14), push ei vielä (> 7)', pel(viim(32))],
    ['eräpäivään 30 pv → ei kumpikaan', pel(viim(12))],
    ['ei yhteenvetoa lainkaan → ei kumpikaan', pel({})],
    ['9–11-vuotias: 84 pv kaista; edellinen 80 pv sitten → erääntymässä', pel(Object.assign({ syntymaVuosi: 2016 }, viim(80)))],
    ['jakson yhteenveto (jaksofokus_historia suljettu 3 pv sitten) nollaa → ei kumpikaan', pel({ review_viimeisin_pvm: paivaa(-60), jaksofokus_historia: [{ sulkutapa: 'suljettu', suljettu: paivaa(-3) }] })],
    ['jakso käynnissä, päättyy täsmälleen eräpäivänä → jakso hoitaa', pel(Object.assign(viim(40), jakso(-40, 6)))]
  ];
  it.each(TAPAUKSET)('%s', (nimi, p) => {
    const r = sovellus(p), ps = push(p), sov = sovellusIlmoittaa(r), pu = ps.length === 1;
    expect(pu, nimi).toBe(sov && pushKynnys(r));   // push = sovelluksen sääntö + 7 pv kynnys
    if (pu) { expect(ps[0].eraantyy_pvm).toBe(r.eraantyyPvm); expect(ps[0].myohassa_pv).toBe(r.ylimaaraPv > 0 ? r.ylimaaraPv : 0); }
  });
  it('sovelluksen ja pushin päivämäärä ja tila vastaavat jokaisessa tapauksessa (sama laskentafunktio: tmRytmiPelaajalle)', () => {
    const R = require('../lib/tm_rytmi.js'), F = require('../functions/tm_rytmi.js');
    expect(F.tmRytmiPelaajalle.toString()).toBe(R.tmRytmiPelaajalle.toString());
    TAPAUKSET.forEach(([n, p]) => { const a = sovellus(p), b = F.tmRytmiPelaajalle(p, NYT); ['status', 'raakaStatus', 'eraantyyPvm', 'ylimaaraPv', 'jaksoHoitaa', 'ikakaista'].forEach((k) => expect(b[k], n + ':' + k).toEqual(a[k])); });
  });
  it('push-teksti = selaimen teksti: "Jakson yhteenveto tai kehityskeskustelu viimeistään {pvm}" / "… myöhässä {n} pv" + nimi (joukkue); selain kääntää rakenteisesta kentästä', () => {
    const yht = push(pel(viim(37)))[0], myoh = push(pel(viim(51)))[0];
    expect(yht.teksti).toBe('Jakson yhteenveto tai kehityskeskustelu viimeistään 26.10.: Topi Esimerkki (Demo U13).');
    expect(myoh.teksti).toBe('Jakson yhteenveto tai kehityskeskustelu myöhässä 9 pv: Topi Esimerkki (Demo U13).');
    for (const x of [yht, myoh]) { const sama = S.tmRytmiNotifTeksti({ teksti: 'vanha', rytmi: { eraantyy_pvm: x.eraantyy_pvm, myohassa_pv: x.myohassa_pv, nimi: x.nimi, joukkue: x.joukkue } }, {}); expect(sama).toBe(x.teksti); }
    expect(S.tmRytmiNotifTeksti({ teksti: 'Review erääntyy 3 pv: X.' }, {})).toBe('Review erääntyy 3 pv: X.');   // vanhat notifit ennallaan
    const sv = S.tmRytmiNotifTeksti({ rytmi: { eraantyy_pvm: yht.eraantyy_pvm, myohassa_pv: 0, nimi: 'X', joukkue: '' } }, { t: (k) => (k === 'ts_rytmi_otsikko' ? 'SV {pvm}' : k) });
    expect(sv).toBe('SV 26.10.: X.');   // käännös tulee lib-avaimesta (erä 80)
  });
  it('notifReviewEraantyy käyttää rytmiNotifit-ydintä, ei omaa laskentaa (ei review_viimeisin_pvm + 42/84 -kaavaa index.js:ssä)', () => {
    const idx = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8'), a = idx.indexOf('exports.notifReviewEraantyy'), b = idx.indexOf('exports.notifTeeItsearvio'), lohko = idx.slice(a, b);
    expect(lohko).toContain('rytmiNotifit('); expect(lohko).not.toMatch(/kaista|42|84|review_viimeisin_pvm/); expect(lohko).not.toContain('Review myöhässä'); expect(lohko).not.toContain('Review erääntyy');
  });
});
