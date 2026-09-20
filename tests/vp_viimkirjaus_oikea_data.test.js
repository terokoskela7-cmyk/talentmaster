/**
 * "Viim. kirjaus" -sarake — laskettu oikeasta datasta, ei demo-kentästä.
 *
 * LIVE-BUGI: valmentajaroster ja kortin pikatile lukivat kenttää `viimKirjaus`,
 * jota asetettiin VAIN demo-datassa (`viimKirjaus:'2pv sitten'`). Oikean datan
 * latauspolku ei laskenut sitä koskaan → undefined → "—", vaikka valmentaja oli
 * aktiivinen (arviointeja, mentorointia, VAI 37).
 *
 * SAMA LUOKKA kuin #577:n `viimeisinKirjautuminen`: NÄYTTÖKENTTÄ ILMAN OIKEAN
 * DATAN KIRJOITTAJAA. Ero: #577 on vain login (n4 Kontakti), tämä on laajempi
 * "viimeisin aktiivisuus", jonka yksi lähde login on.
 *
 * Portti ajaa AIDON `laskeVAI`:n vm-sandboxissa (sama harness-kuvio kuin
 * vp_aktiivisuus_kaikki_virrat) — mittaa laskentaa, ei merkkijonoja.
 */
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const VP = lue('TalentMaster_VP_v25.html');

function funktio(nimi) {
  const i = VP.indexOf(nimi);
  expect(i, nimi + ' puuttuu VP:stä').toBeGreaterThan(-1);
  let syv = 0, loppu = -1;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) {
    if (VP[k] === '{') syv++;
    else if (VP[k] === '}') { syv--; if (syv === 0) { loppu = k + 1; break; } }
  }
  return VP.slice(i, loppu);
}

const paivaaSitten = (n) => new Date(Date.now() - n * 86400000);
const iso = (n) => paivaaSitten(n).toISOString();
const pvm = (n) => iso(n).slice(0, 10);

function teeDb(data) {
  const snap = (arr) => ({ docs: (arr || []).map((d) => ({ data: () => d })) });
  const ketju = (nimi) => {
    const api = {
      where: () => api, orderBy: () => api, limit: () => api,
      get: () => Promise.resolve(snap(data[nimi])),
      doc: () => ({
        get: () => Promise.resolve({ exists: !!data.kayttaja, data: () => data.kayttaja || {} }),
        collection: ketju,
      }),
    };
    return api;
  };
  return { collection: () => ({ doc: () => ({ collection: ketju }) }) };
}

async function aja(data) {
  const sandbox = {
    console, Date, Math, JSON, String, Number, Object, Array, Promise, isNaN, parseInt, parseFloat,
    db: teeDb(data),
    _seuraId: 'testiseura',
    _valmentajat: [{ id: 'c1', joukkue: 'FCL P13' }],
    _pelaajat: [],
    vpT: (s) => s,
    laskeHarjoituslaatuPalloliitto: () => ({ ka_0_10: 8 }),
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(funktio('function _vpKaudenAlku()'), sandbox);
  vm.runInContext(funktio('function _vpAikaMs('), sandbox);
  vm.runInContext(funktio('async function laskeVAI('), sandbox);
  vm.runInContext(funktio('function _vpAikaSitten('), sandbox);
  return { tulos: await sandbox.laskeVAI('c1'), sandbox };
}

describe('VP · "Viim. kirjaus" oikeasta datasta', () => {
  it('EI VACUOUS: laskeVAI palauttaa viimAktiivisuusMs-kentän', async () => {
    const { tulos } = await aja({});
    expect(tulos, 'laskeVAI palautti null').toBeTruthy();
    expect('viimAktiivisuusMs' in tulos, 'kenttää ei ole olemassa').toBe(true);
  });

  it('YKSI MENTOROINTI (eilen) → viimAktiivisuusMs ≈ eilen, EI null', async () => {
    /* Juuri tämä näytti "—":llä vaikka valmentaja oli aktiivinen. */
    const { tulos } = await aja({
      mentoroinnit: [{ valmentajaId: 'c1', aika: iso(1) }],
    });
    expect(tulos.viimAktiivisuusMs, 'aktiivinen valmentaja sai null').toBeTruthy();
    const eroPv = Math.round((Date.now() - tulos.viimAktiivisuusMs) / 86400000);
    expect(eroPv).toBe(1);
  });

  it('MAX, ei min: tuorein aikaleima voittaa vanhemman', async () => {
    /* Arviointi 7 pv sitten + läsnäolo-laskuri 1 pv sitten → tuorein (1 pv). */
    const { tulos } = await aja({
      harjoitusarvioinnit: [{ valmentajaUid: 'c1', arviointitapa: 'havainnointi', malli: 'palloliitto', pvm: pvm(7), vastaukset: { a1: 4 } }],
      kayttaja: { lasnaolo_viim: iso(1) },
    });
    const eroPv = Math.round((Date.now() - tulos.viimAktiivisuusMs) / 86400000);
    expect(eroPv, 'otettiin vanhin tuoreimman sijaan').toBe(1);
  });

  it('KAIKKI VIRRAT kelpaavat lähteeksi (ei vain yksi kokoelma)', async () => {
    const lahteet = [
      ['havainto', { havainnot: [{ valmentajaUid: 'c1', tyyppi: 'adar', luotu: iso(2) }] }],
      ['arviointi', { harjoitusarvioinnit: [{ valmentajaUid: 'c1', arviointitapa: 'havainnointi', malli: 'palloliitto', pvm: pvm(2), vastaukset: { a1: 4 } }] }],
      ['mentorointi', { mentoroinnit: [{ valmentajaId: 'c1', aika: iso(2) }] }],
      ['ohjelma', { ohjelmat: [{ laatija_uid: 'c1', paivitetty: iso(2) }] }],
      ['reflektiot_viim', { kayttaja: { reflektiot_viim: iso(2) } }],
      ['palautteet_viim', { kayttaja: { palautteet_viim: iso(2) } }],
      ['tavoitteet_viim', { kayttaja: { tavoitteet_viim: iso(2) } }],
      ['kirjautuminen', { kayttaja: { viimeisinKirjautuminen: iso(2) } }],
    ];
    for (const [nimi, data] of lahteet) {
      const { tulos } = await aja(data);
      expect(tulos.viimAktiivisuusMs, nimi + ' ei kelvannut aktiivisuuden lähteeksi').toBeTruthy();
    }
  });

  it('TYHJÄ ≠ VIRHEELLINEN: ei yhtään aikaleimaa → null (näytetään "—")', async () => {
    const { tulos } = await aja({});
    expect(tulos.viimAktiivisuusMs, 'tyhjästä syntyi epoch-aikaleima').toBeNull();
  });

  it('MUOTOILU: tänään / eilen / N pv sitten, null → null', async () => {
    const { sandbox } = await aja({});
    expect(sandbox._vpAikaSitten(Date.now())).toBe('tänään');
    expect(sandbox._vpAikaSitten(paivaaSitten(1).getTime())).toBe('eilen');
    expect(sandbox._vpAikaSitten(paivaaSitten(5).getTime())).toBe('5 pv sitten');
    expect(sandbox._vpAikaSitten(null), 'null muotoiltiin merkkijonoksi').toBeNull();
  });

  it('KYTKENTÄ: roster-polku asettaa viimKirjaus lasketusta arvosta', () => {
    /* Ilman tätä laskenta olisi olemassa muttei päätyisi sarakkeeseen —
       täsmälleen se vika joka korjataan. */
    const lataa = funktio('async function lataaVAIArvot(');
    expect(lataa, 'viimKirjaus ei täyty oikean datan polussa').toContain('viimKirjaus');
    expect(lataa, 'arvoa ei johdeta laskennasta').toContain('viimAktiivisuusMs');
  });

  it('DRIFT: sarake ei nojaa enää pelkkään demo-kenttään', () => {
    /* Demo-data saa yhä asettaa oman merkkijononsa, mutta oikean datan polussa
       on nyt laskettu lähde. Jos joku poistaa laskennan, tämä punertaa. */
    const demoOsumat = (VP.match(/viimKirjaus:\s*'/g) || []).length;
    expect(demoOsumat, 'demo-fixturet kadonneet — testi mittaa väärää asiaa').toBeGreaterThan(0);
    expect(VP, 'laskettua lähdettä ei ole').toContain('viimAktiivisuusMs');
  });
});
