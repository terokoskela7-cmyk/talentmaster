/**
 * VP_v25 Koti + Tilanne · P0-luvut (audit 24 §6 / CODE_BRIEF_S2 "Tarkistus 9.10." kohta 1).
 * Yksi laskenta kullekin luvulle: lib/tm_koti_luvut.js on SSOT, VP kutsuu sitä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const L = require('../lib/tm_koti_luvut.js');
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');
const NYT = Date.UTC(2026, 9, 9, 12);
const PV = 86400000;

const pel = (id, extra) => Object.assign({ id: String(id) }, extra || {});
function joukkueet(spec) {   // { nimi: [pelaajat] }
  const m = {}; Object.keys(spec).forEach((n) => { m[n] = spec[n]; }); return m;
}

describe('1 · yksi toimenpidelaskuri', () => {
  it('laskuri = signaalikorttien määrä (ei kolmea eri määritelmää)', () => {
    expect(L.toimenpideMaara([{}, {}, {}])).toBe(3);
    expect(L.toimenpideMaara([])).toBe(0);
    expect(L.toimenpideMaara(undefined)).toBe(0);
  });
  it('VP: kaikki neljä näyttöpaikkaa lukevat samaa funktiota, ei omia laskureita', () => {
    expect(VP).toContain('function _vpPaivitaToimenpideLaskuri(');
    const kutsut = VP.match(/_vpPaivitaToimenpideLaskuri\(/g) || [];
    expect(kutsut.length, 'Koti + Tilanteen otsikko + 02-meta + hero').toBeGreaterThanOrEqual(5);
    expect(VP, 'vanha hero-laskuri (H-H ka < 2.5) palannut').not.toMatch(/if \(k != null && k < 2\.5\) vaatii\+\+/);
    expect(VP, 'vanha 02-meta (kriittiset) palannut').not.toContain("metaEl.textContent = kriittiset > 0");
  });
});

describe('2 · harjoitettavuuskartoitus yhdellä laskennalla', () => {
  it('joukkueet ja pelaajat samasta datasta; monijäsenyys ei tuplaa pelaajia', () => {
    const a = pel(1), b = pel(2, { flei_viimeisin: 60 }), c = pel(3), d = pel(4);
    const k = L.kartoitus(joukkueet({ P15: [a, c], P14: [d, a], P13: [b, pel(5)], P12: [] }));
    expect(k).toEqual({ joukkueYht: 3, joukkueIlman: 2, pelaajaYht: 5, pelaajaIlman: 4 });
  });
  it('audit-tapaus: 15 joukkuetta, vain yhdellä kartoitettu → 14 ilman', () => {
    const m = {}; for (let i = 0; i < 15; i++) m['J' + i] = [pel('a' + i), pel('b' + i), pel('c' + i)];
    m.J0[0].flei_viimeisin = 62;
    const k = L.kartoitus(m);
    expect(k.joukkueIlman).toBe(14); expect(k.joukkueYht).toBe(15); expect(k.pelaajaIlman).toBe(44);
  });
  it('VP: 02-signaali ja 05-toimenpide käyttävät samaa kartoitus()-kutsua', () => {
    expect((VP.match(/TM_KOTI_LUVUT\.kartoitus\(/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(VP).not.toContain('joukkueetIlmanFlei');
    expect(VP, 'ehdotusdokumenttien määrä ei saa olla lukulähde').not.toMatch(/tekemättä ' \+ x\.joukkueet\.length/);
  });
});

describe('3 · suostumus eriteltynä', () => {
  const P = [].concat(
    Array.from({ length: 6 }, (_, i) => pel('t' + i, { suostumusTila: 'pilotti' })),
    [pel('x1'), pel('x2', { suostumusTila: null })],
    Array.from({ length: 3 }, (_, i) => pel('o' + i, { suostumusTila: 'odottaa' })),
    [pel('a1', { suostumusTila: 'annettu' }), pel('a2', { suostumus: { annettu: true } })]);
  it('tuotu · kutsuttu · odottaa · annettu · ilman · ei kutsuttu', () => {
    expect(L.suostumus(P)).toEqual({ tuotu: 13, kutsuttu: 5, odottaa: 3, annettu: 2, ilman: 11, eiKutsuttu: 8, konversio: 40 });
  });
  it('puuttuva tila = tuotu (EI "odottaa"): vanha laskuri tuplasi kutsutut', () => {
    expect(L.suostumus([pel(1), pel(2)])).toMatchObject({ odottaa: 0, kutsuttu: 0, ilman: 2, konversio: null });
  });
  it('kanoninen ehto sama kuin functions/suostumus.js', () => {
    const palvelin = require('../functions/suostumus.js');
    [{ suostumusTila: 'annettu' }, { suostumus: { annettu: true } }, { suostumusTila: 'odottaa' }, { suostumusTila: 'pilotti' }, {}, null]
      .forEach((p) => expect(L.suostumusAnnettu(p)).toBe(palvelin.suostumusAnnettu(p)));
  });
  it('VP: Kodin suppilo ja Tilanteen signaali lukevat samaa erittelyä', () => {
    expect(VP).toContain('window.TM_KOTI_LUVUT.suostumus(P)');
    expect(VP).toContain('window.TM_KOTI_LUVUT.suostumus(pelaajatData)');
    expect(VP, 'vanha laskenta (puuttuva tila = odottaa) palannut').not.toMatch(/suostumusTila === 'odottaa' \|\| !p\.suostumusTila/);
    expect(VP).toContain("vpT('ilman suostumusta')");
  });
});

describe('4 · kattavuusportti D125 (2/3 joukkueista TAI 70 % pelaajista)', () => {
  const mitattu = (p) => p.m === 1;
  function seura(jakauma) {   // [[pelaajia, mitattuja], ...] → joukkueet
    const m = {}, kaikki = [];
    jakauma.forEach(([n, k], j) => { m['J' + j] = Array.from({ length: n }, (_, i) => pel('j' + j + 'p' + i, { m: i < k ? 1 : 0 })); kaikki.push.apply(kaikki, m['J' + j]); });
    return { m, kaikki };
  }
  it('audit-tapaus: 2/15 joukkuetta, 4/160 pelaajaa → EI riittävä, teksti "mitattu 4/160"', () => {
    const j = []; for (let i = 0; i < 15; i++) j.push([i === 0 ? 100 : 4, i === 0 ? 2 : 0]); j.push([0, 0]);
    const s = seura(j);
    const k = L.kattavuus(s.kaikki, s.m, mitattu);
    expect(k.riittava).toBe(false); expect(k.pelaajaTeksti).toBe('mitattu 2/' + s.kaikki.length);
  });
  it('raja-arvot: tasan 70 % pelaajista riittää, 69 % ei', () => {
    const a = seura([[100, 70], [100, 70]]), b = seura([[100, 69], [100, 69]]);
    expect(L.kattavuus(a.kaikki, a.m, mitattu).riittava).toBe(true);
    expect(L.kattavuus(b.kaikki, b.m, mitattu).riittava).toBe(false);
  });
  it('2/3 joukkueista riittää vaikka pelaajia alle 70 %; joukkue katettu = vähintään 70 % jäsenistä mitattu', () => {
    const s = seura([[10, 8], [10, 8], [10, 0]]);   // 2/3 katettu, pelaajista 16/30 = 53 %
    const k = L.kattavuus(s.kaikki, s.m, mitattu);
    expect(k.joukkueN).toBe(2); expect(k.riittava).toBe(true);
    const t = seura([[10, 6], [10, 6], [10, 0]]);   // 0/3 katettu (alle 70 %), pelaajista 40 %
    expect(L.kattavuus(t.kaikki, t.m, mitattu).riittava).toBe(false);
  });
  it('tyhjä seura ei ole riittävä (ei 0/0 = 100 %)', () => {
    expect(L.kattavuus([], {}, mitattu).riittava).toBe(false);
  });
  it('VP: portti RAE:lle, Koko seura -korteille ja tulkintalauseelle', () => {
    expect((VP.match(/TM_KOTI_LUVUT\.kattavuus\(/g) || []).length).toBe(3);
    expect(VP).toContain('_vpRaeRakenneHTML(P, true)');
    expect(VP).toContain("vpT('D1 mitattu')");
  });
});

describe('5 · yksi aloitusopas, tila päivittyy testin luonnista', () => {
  it('"valmis" vasta kun kaikki askeleet tehty (4/5 ≠ valmis)', () => {
    const base = { pelaajat: [pel(1, { tki_viimeisin: 40 })], valmentajat: [], tapahtumat: [], kayty: { koti: true, raportointi: true }, harjarvio: true, mentoriLahetetty: false };
    const o = L.aloitusopas(base);
    expect(o).toMatchObject({ tehty: 4, yht: 5, valmis: false, seuraava: 'mentorointi' });
    expect(L.aloitusopas(Object.assign({}, base, { mentoriLahetetty: true })).valmis).toBe(true);
  });
  it('ensimmäinen testitapahtuma kuittaa askeleen 1 (ei mittauksia vielä)', () => {
    const ennen = L.aloitusopas({ pelaajat: [pel(1)], tapahtumat: [] });
    const jalkeen = L.aloitusopas({ pelaajat: [pel(1)], tapahtumat: [{ id: 't1', tila: 'suunniteltu' }] });
    expect(ennen.askeleet[0].ok).toBe(false); expect(ennen.seuraava).toBe('testi');
    expect(jalkeen.askeleet[0].ok).toBe(true); expect(jalkeen.tehty).toBe(ennen.tehty + 1);
  });
  it('VP: Tilanteella ei ole omaa kolmen askeleen listaa; molemmat lukevat _vpaTila()', () => {
    expect(VP).not.toContain("vpT('Aloita näistä kolmesta')");
    expect((VP.match(/_vpaTila\(\)/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(VP, 'tapahtumat päivittyvät Kotiin/Tilanteeseen tullessa').toMatch(/ws === 'koti' \|\| ws === 'tilanne'\) _vpaPaivitaTapahtumat\(\)/);
  });
  it('VP: epäonnistunut tapahtumahaku ei täytä kirjautuneen seuran dataa esimerkkitapahtumilla', () => {
    const i = VP.indexOf('async function lataaTapahtumat()'), f = VP.slice(i, VP.indexOf('async function lataaIdpJono()', i));
    expect(i).toBeGreaterThan(-1); expect(f).not.toContain('Kevään harjoitettavuus'); expect(f).toContain('_tapahtumat = [];');
  });
});

describe('6 · D1 = 1,0 ja §28-portti', () => {
  const N = require('../lib/tm_eerikkila_normit.js');
  it('SELVITYS: eerikkilaTaso palauttaa 1 heikointa rajaa huonommalle MITATULLE arvolle ja 0 puuttuvalle — 1,0 on alaraja, ei "ei dataa"', () => {
    expect(N.eerikkilaTaso(9.9, 'nopeus_30m', 15, 'M')).toBe(1);     // hidas mitattu aika → alaraja
    expect(N.eerikkilaTaso(null, 'nopeus_30m', 15, 'M')).toBe(0);    // ei arvoa → 0 (laskeD1Osaindeksit tasoT: `|| null`)
    const oi = N.laskeD1Osaindeksit({ lin30m: 9.9 }, 15, 'M');
    expect(oi.maksinopeus).toBe(1); expect(oi.aerobinen).toBeNull(); expect(oi.ketteryys).toBeNull();
  });
  const eiPhv = (id, extra) => pel(id, Object.assign({ syntymaVuosi: 2011, sukupuoli: 'M' }, extra || {}));   // P15, PHV mittaamatta, ikkunassa
  const mitattu = (id, koodi) => eiPhv(id, { biologinenIka_viimeisin: { phv_tila_koodi: koodi, maturity_offset: 0 } });
  const phvPre = (id) => mitattu(id, 'PRE');
  const x = (osa, arvo, extra) => Object.assign({ tyyppi: 'alle_normin', osaAlue: osa, vakavuus: 'punainen', arvo, teema: osa + ' alle normin', ikavaiheOdotettu: false }, extra || {});

  it('kypsyysvahti = tm_idp.js idpKypsyysEstetty: mitattu PRE/LAH + heikko 30 m → estetty; POST → ei; tuntematon → estetty', () => {
    expect(L.kypsyysEstetty('maksinopeus', mitattu(1, 'PRE'))).toBe(true);
    expect(L.kypsyysEstetty('maksinopeus', mitattu(2, 'LAH'))).toBe(true);
    expect(L.kypsyysEstetty('maksinopeus', mitattu(3, 'POST'))).toBe(false);
    expect(L.kypsyysEstetty('maksinopeus', mitattu(4, 'PH'))).toBe(false);
    expect(L.kypsyysEstetty('maksinopeus', eiPhv(5))).toBe(true);          // tuntematon
    expect(L.kypsyysEstetty('ketteryys', eiPhv(6))).toBe(false);           // ei kypsyysrajattu (IDP_KYPSYYS_GATED)
  });
  it('osa-alue→avain-kartta ja gated-lista tulevat tm_idp.js:stä (ei omia kopioita)', () => {
    const I = require('../lib/tm_idp.js');
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'lib/tm_koti_luvut.js'), 'utf8');
    expect(I.IDP_OSA_AVAIN.maksinopeus).toBe('speed');
    expect(src).not.toMatch(/PHV_HERKAT|tmPhvEiMitattu/);
    expect(src).toContain('idpKypsyysEstetty');
  });
  it('estettyjä enemmistö → info + kypsyysEstetty {n,yht}', () => {
    const r = L.poikkeamaPortti([x('maksinopeus', 2.0), x('aerobinen', 1.8)], [eiPhv(1), eiPhv(2), mitattu(3, 'POST')]);
    r.forEach((p) => { expect(p.vakavuus).toBe('info'); expect(p.kypsyysEstetty).toEqual({ n: 2, yht: 3 }); });
  });
  it('estettyjä vähemmistö (POST enemmistö) → ei porttia', () => {
    const r = L.poikkeamaPortti([x('maksinopeus', 2.0)], [mitattu(1, 'POST'), mitattu(2, 'POST'), eiPhv(3)]);
    expect(r[0].vakavuus).toBe('punainen'); expect(r[0].kypsyysEstetty).toBeNull();
  });
  it('ketteryys (ei kypsyysrajattu) pysyy punaisena vaikka PHV mittaamatta', () => {
    const r = L.poikkeamaPortti([x('ketteryys', 2.1)], [eiPhv(1), eiPhv(2)]);
    expect(r[0].vakavuus).toBe('punainen'); expect(r[0].kypsyysEstetty).toBeNull();
  });
  it('arvo 1,0 → alaraja-lippu, punainen alennetaan amberiksi (tarkista mittaus)', () => {
    const r = L.poikkeamaPortti([x('ketteryys', 1.0), x('ketteryys', 1.4)], [mitattu(1, 'POST'), mitattu(2, 'POST')]);
    expect(r[0]).toMatchObject({ alaraja: true, vakavuus: 'amber' });
    expect(r[1]).toMatchObject({ alaraja: false, vakavuus: 'punainen' });
  });
  it('ei muuta syötettä (puhdas)', () => {
    const syote = [x('maksinopeus', 1.0)], kopio = JSON.stringify(syote);
    L.poikkeamaPortti(syote, [eiPhv(1)]); expect(JSON.stringify(syote)).toBe(kopio);
  });
  it('Hidden Gem: PHV mittaamatta ikkunassa → ei ehdokkaaksi; PHV mitattu → ok', () => {
    expect(L.hiddenGemPortti(eiPhv(1), 2.0)).toEqual({ sallittu: false, syy: 'phv_puuttuu' });
    expect(L.hiddenGemPortti(phvPre(1), 2.0)).toEqual({ sallittu: true, syy: null });
  });
  it('Hidden Gem: D1 = 1,0 vaatii vähintään kaksi plausiibelia avaintestiä (lin30m, cmj, mas > 0)', () => {
    const hh = (o) => Object.assign(phvPre(1), { hh_viimeisin: o });
    expect(L.hiddenGemPortti(hh({ lin30m: 6.2 }), 1.0)).toEqual({ sallittu: false, syy: 'alaraja' });
    expect(L.hiddenGemPortti(hh({ lin30m: 6.2, cmj: 0 }), 1.0).syy).toBe('alaraja');            // 0 ei ole mittaus
    expect(L.hiddenGemPortti(hh({ lin30m: 6.2, cmj: 18 }), 1.0).sallittu).toBe(true);
    expect(L.hiddenGemPortti(hh({ lin30m: 6.2 }), 1.5).sallittu).toBe(true);                     // ei alarajalla → ei lisävaatimusta
  });
  it('VP: poikkeamat ja Hidden Gem kulkevat portin läpi', () => {
    expect(VP).toContain('TM_KOTI_LUVUT.poikkeamaPortti(laskeJoukkuePoikkeamat(');
    expect(VP).toContain('TM_KOTI_LUVUT.hiddenGemPortti(p, hg.d1)');
    expect(VP).toContain("'poikkeamatPhv'");
    expect(VP).toContain("vpT('kypsyysvaihe ei salli tulkintaa')");
  });
});

describe('8 · D134 ehdotusten rajaus', () => {
  it('Koti ≤ 3, Tilanne ≤ 5, loput lasketaan', () => {
    expect(L.KOTI_MAX_SIGNAALIT).toBe(3); expect(L.TILANNE_MAX_EHDOTUKSET).toBe(5);
    expect(L.rajaaEhdotukset([1, 2, 3, 4, 5], 3)).toEqual({ nakyvat: [1, 2, 3], lisaa: 2 });
    expect(L.rajaaEhdotukset([1, 2], 5)).toEqual({ nakyvat: [1, 2], lisaa: 0 });
  });
  it('kuittaamaton vanhenee 14 pv:ssä (raja: yli 14 vrk); tuntematon luontiaika ei vanhene', () => {
    const iso = (pv) => new Date(NYT - pv * PV).toISOString();
    expect(L.ehdotusVanhentunut(iso(13), NYT)).toBe(false);
    expect(L.ehdotusVanhentunut(iso(14), NYT)).toBe(false);
    expect(L.ehdotusVanhentunut(iso(15), NYT)).toBe(true);
    expect(L.ehdotusVanhentunut({ seconds: (NYT - 20 * PV) / 1000 }, NYT)).toBe(true);        // Firestore Timestamp
    expect(L.ehdotusVanhentunut({ toDate: () => new Date(NYT - 20 * PV) }, NYT)).toBe(true);
    expect(L.ehdotusVanhentunut(null, NYT)).toBe(false);
  });
  it('samaa ehdotusta ei tuoteta uudelleen ennen kuin data (teksti) muuttuu', () => {
    const vanha = { signaali: 'tki_alhainen', joukkue: 'P15', teksti: 'P15 — 3 pelaajaa', luotu: new Date(NYT - 20 * PV).toISOString() };
    const tuore = { signaali: 'suunta_lasku', joukkue: 'P14', teksti: 'P14 — 2', luotu: new Date(NYT - 2 * PV).toISOString() };
    const este = L.ehdotusEste([vanha, tuore], NYT);
    expect(L.ehdotusEstetty(este, { signaali: 'tki_alhainen', joukkue: 'P15', teksti: 'P15 — 3 pelaajaa' })).toBe(true);    // sama data → ei uudelleen
    expect(L.ehdotusEstetty(este, { signaali: 'tki_alhainen', joukkue: 'P15', teksti: 'P15 — 4 pelaajaa' })).toBe(false);   // data muuttui → uusi sallittu
    expect(L.ehdotusEstetty(este, { signaali: 'suunta_lasku', joukkue: 'P14', teksti: 'P14 — 3' })).toBe(true);             // tuore estää kuten ennen
  });
  it('VP: Kotiin 3 signaalia + "+N muuta", Tilanteeseen 5, vanhentuneet piiloon', () => {
    expect(VP).toContain('LU.rajaaEhdotukset(_sig.kortit, LU.KOTI_MAX_SIGNAALIT)');
    expect(VP).toContain('LU.rajaaEhdotukset(dedupKaikki, LU.TILANNE_MAX_EHDOTUKSET)');
    expect(VP).toContain('LU.ehdotusVanhentunut(t.luotu, nytMs)');
    expect(VP).toContain('LU.ehdotusEste(avoimet, nytMs)');
  });
});

describe('9 · murupolku seuraa työtilaa', () => {
  it('Koti ei näytä "Tilanne": alkuarvo Koti ja setWs päivittää nimen sivupalkista', () => {
    expect(VP).toContain('<span class="bc-active" id="tbSivu" data-i18n="Koti">Koti</span>');
    expect(VP).toContain("document.getElementById('tbSivu')");
    expect(VP).toMatch(/querySelector\('\.sb-item\[data-ws="' \+ ws \+ '"\]'\)/);
    expect(VP).toContain('sp.dataset.i18n');
  });
});
