/**
 * Kehitystyöpöytä 22 · A8 — "Pelaajan silmin": Näyttö pois käytöstä (näkyy vain henkilökunnalle),
 * luvut .kt-hk-luokalla vain Tänään- ja Polku-välilehdillä (kysymyskortit, signaali, Polku).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const KT = require('../lib/tm_kehitystyopoyta.js');
const TS = require('../lib/tm_tanaan_signaali.js');
const __dir = dirname(fileURLToPath(import.meta.url));
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');
const MASTER = readFileSync(join(__dir, '..', 'TalentMaster_Master_v16.html'), 'utf8');

const o = { t: (k) => k };
const TILA = { tila: 'kaynnissa', ensisijainen: null, valikko: [], rivitila: { teksti: 'Jakso käynnissä', savy: 'neutraali' } };
const kehys = (silmin, valilehti) => KT.tmKtKehysHTML({ pid: 'p1', nimi: 'Testi Pelaaja', tila: TILA, valilehti, silmin, tanaanHTML: '<i>t</i>', polkuHTML: '<i>p</i>', nayttoHTML: '<b data-testi-naytto>NAYTTO 12 / 40</b>', ladattu: { polku: true, naytto: true } }, o);
// "ihmisen näkemä" teksti: .kt-hk-spanit pois (silmin-tilassa CSS piilottaa ne), tagit pois
const nakyva = (html) => html.replace(/<span class="kt-hk">[^<]*<\/span>/g, '').replace(/<[^>]+>/g, ' ');

describe('A8 · Näyttö pois silmin-tilassa', () => {
  it('silmin: Näyttö-välilehti disabled, sisältöä ei renderöidä, selite henkilökunnalle', () => {
    const h = kehys(true, 'naytto');
    expect(h).not.toContain('data-testi-naytto');
    expect(h).toMatch(/data-kt-valilehti="naytto"[^>]*disabled/);
    expect(h).not.toMatch(/data-kt-valilehti="naytto"[^>]*onclick/);
    expect(h).toContain('data-kt-nayto-pois');
    expect(h).toContain('Näyttö näkyy vain henkilökunnalle');
    expect(h).toContain('data-kt-valilehti-nyt="tanaan"');   // ei jää Näyttö-välilehdelle
  });
  it('ei silmin: Näyttö toimii kuten ennen', () => {
    const h = kehys(false, 'naytto');
    expect(h).toContain('data-testi-naytto');
    expect(h).not.toMatch(/data-kt-valilehti="naytto"[^>]*disabled/);
    expect(h).toContain('data-kt-valilehti-nyt="naytto"');
  });
});

describe('A8 · luvut .kt-hk-luokalla Tänään-välilehdellä', () => {
  const osat = [{ k: 'a', koodi: 'a', nimi: 'Katse ylös', tila: 'itsenaisesti' }, { k: 'b', koodi: 'b', nimi: 'Vastaanotto', tila: 'ohjatusti' }, { k: 'c', koodi: 'c', nimi: 'Syöttö', tila: null }];
  const o2 = { esc: (s) => String(s), t: (k) => k, pvmFn: () => '4.11.' };
  const h = KT.tmKtKysymyksetHTML({ nakyy: true, osat, viikonOsa: osat[1], vk: { n: 2, vk: 5, viimeisin: '2026-11-04', sunnuntai: false, vastattuTanaan: false }, sit: { sitoutunut: true, vahvistettu: false, annettu_pvm: '2026-11-04' } }, o2);   // Treenattiinko: 2/5 viikkoa · Onko mukana: kortti + pvm
  it('silmin-tilassa kysymyskorteissa ei yhtään numeroa (kt-hk piilotettu)', () => {
    expect(nakyva(h)).not.toMatch(/\d/);
    expect(h).toContain('<span class="kt-hk">2/5</span>');
    expect(h).toContain('<span class="kt-hk">4.11.</span>');
  });
  it('tila sanoina säilyy', () => {
    expect(nakyva(h)).toContain('Ohjatusti'); expect(nakyva(h)).toContain('Sitoutui');
  });
  it('tmKtHk ei koske tagien sisään (attribuutit)', () => {
    expect(KT.tmKtHk('<a href="x12" data-n="3">odottaa 5 pv</a>')).toBe('<a href="x12" data-n="3">odottaa <span class="kt-hk">5 pv</span></a>');
  });
  it('signaali: luvut kt-hk:ksi kun hk annettu, muuten ennallaan', () => {
    const x = { ensisijainen: { avain: 'a', savy: 'teal', teksti: 'odottaa · 3 pv' }, toinen: { avain: 'b', teksti: 'vk 2' } };
    const ilman = TS.tmTanaanSignaaliHTML(x, { t: (k) => k });
    expect(ilman).not.toContain('kt-hk');
    const kanssa = TS.tmTanaanSignaaliHTML(x, { t: (k) => k, hk: KT.tmKtHk });
    expect(kanssa).toContain('<span class="kt-hk">3 pv</span>');
    expect(nakyva(kanssa)).not.toMatch(/\d/);
  });
});

describe('A8 · adapterit (VP + Master)', () => {
  for (const [nimi, src] of [['VP', VP], ['Master', MASTER]]) {
    it(nimi + ': signaali saa hk:n, _ktSilmin vie pois Näytöltä, Polun luvut DOM-merkinnällä, Näyttö-hydratointi ei silmin-tilassa', () => {
      expect(src).toContain('hk: K.tmKtHk');   // signaali + kysymykset saavat luvut .kt-hk:ksi libissä (tmKtTanaanKoko)
      expect(src).toMatch(/_ktS\.silmin && _ktS\.valilehti === 'naytto'/);
      expect(src).toContain('tmKtHkLuvut(polku)');
      expect(src).toContain('_ktAsetaHTML(_ktKehys(p)); _ktHkAsenna();');
      expect(src).toMatch(/S\.ladattu\.naytto && !S\.silmin/);
    });
  }
});
