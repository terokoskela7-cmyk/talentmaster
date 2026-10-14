/* B2c-4: osarivien ulkoasu tilan mukaan (osaa jo = turkoosi reuna + ✓ + himmeä tausta; myöhemmin himmeämpi), lause näkyviin avatussa osarivissä merkinnän alla,
   Jakson arviointi kokoaa lauseet viikoittain (osa_havainnot_vk). Uusi sivu (v2); vanhat näkymät ennallaan. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { kaynnista, selainKaynnista, CHROME, PELAAJAT } from './helpers/kt_sivu.mjs';
const require = createRequire(import.meta.url);
const KT = require('../lib/tm_kehitystyopoyta.js'), AR = require('../lib/tm_kt_arviointi.js');
const pvm = (x) => x.slice(8) + '.' + x.slice(5, 7) + '.';
describe('osarivit v2: tilaluokat, ✓, lause', () => {
  const osat = [{ k: 'a', koodi: 'a', nimi: 'Osa A', tila: 'itsenaisesti', havainnot: [{ uid: 'u1', arvo: 3, pvm: '2026-10-14', rooli: 'valmentaja' }] }, { k: 'b', koodi: 'b', nimi: 'Osa B', tila: 'ei_viela', havainnot: [{ uid: 'u1', arvo: 1, pvm: '2026-10-14', rooli: 'valmentaja', lause: 'Ei vielä ylös' }] }, { k: 'c', koodi: 'c', nimi: 'Osa C', tila: 'ohjatusti', havainnot: [] }];
  it('osaa jo = .ok + "✓ "; myöhemmin = .ei (himmeämpi); ohjatusti ei kumpaakaan; vanhat näkymät (ilman v2) ilman .ei ja ✓:ta', () => {
    const h = KT.tmKtOsatHTML({ osat }, { v2: true, pvmFn: pvm }); expect(h).toMatch(/class="kt-osa-r ok"[^>]*>[^]*?✓ itsenäisesti/); expect(h).toMatch(/class="kt-osa-r ei"/); expect(h).toMatch(/class="kt-osa-r" data-kt-osa="c"/);
    const v = KT.tmKtOsatHTML({ osat }, { pvmFn: pvm }); expect(v).not.toMatch(/kt-osa-r ei|✓/); expect(v).not.toContain('data-kt-lause');
  });
  it('lause näkyy avattavassa osarivissä merkinnän alla ("näytä lause"); ei lausetta → ei avausta; lause escapetaan; piilotetaan Pelaajan silmin (.kt-hk)', () => {
    const h = KT.tmKtOsatHTML({ osat: [osat[1], Object.assign({}, osat[0], { havainnot: [{ uid: 'u1', arvo: 3, pvm: '2026-10-14', rooli: 'vp', lause: '<b>x</b>' }] })] }, { v2: true, pvmFn: pvm });
    expect(h).toContain('näytä lause'); expect(h).toMatch(/kt-osa-kaikki kt-hk[^>]*data-kt-kaikki-arviot[^>]*>[^]*data-kt-lause>“Ei vielä ylös”/); expect(h).toContain('“&lt;b&gt;x&lt;/b&gt;”'); expect(h).not.toContain('<b>x</b>');
    expect(KT.tmKtOsatHTML({ osat: [osat[0]] }, { v2: true, pvmFn: pvm })).not.toContain('kt-eroavat');
  });
});
describe('Jakson arviointi kokoaa lauseet viikoittain', () => {
  const jf = { konsepti_avain: 'kons', osa_havainnot_vk: { kons: { a: { '2026-W43': { u1: { arvo: 2, pvm: '2026-10-21', rooli: 'valmentaja', lause: 'Toinen viikko' } }, '2026-W42': { u1: { arvo: 1, pvm: '2026-10-14', rooli: 'valmentaja', lause: 'Ensimmäinen viikko' }, u2: { arvo: 2, pvm: '2026-10-15', rooli: 'vp' } } }, b: { '2026-W42': { u1: { arvo: 3, pvm: '2026-10-16', rooli: 'valmentaja', lause: 'Osa b' } } } } },
    osa_havainnot: { kons: { c: { u1: { arvo: 3, pvm: '2026-10-28', rooli: 'valmentaja', lause: 'Vain nykytilassa' } }, a: { u1: { arvo: 2, pvm: '2026-10-21', rooli: 'valmentaja', lause: 'Toinen viikko' } } } } };
  const osat = [{ k: 'a', koodi: 'a', teksti: 'Osa A' }, { k: 'b', koodi: 'b', teksti: 'Osa B' }, { k: 'c', koodi: 'c', teksti: 'Osa C' }];
  it('viikoittain vanhin ensin; vain rivit joilla lause; viikkoriviä vailla oleva nykytilan lause omalle viikolleen (pvm → ISO-viikko); ei duplikaattia kun viikkorivi on', () => {
    const v = AR.tmKtViikkoLauseet(jf, osat); expect(v.map((w) => w.vk)).toEqual(['2026-W42', '2026-W43', '2026-W44']);
    expect(v[0].rivit.map((r) => r.k + ':' + r.lause)).toEqual(['a:Ensimmäinen viikko', 'b:Osa b']); expect(v[1].rivit.map((r) => r.lause)).toEqual(['Toinen viikko']); expect(v[2].rivit.map((r) => r.k + ':' + r.lause)).toEqual(['c:Vain nykytilassa']); expect(v[1].nro).toBe(43);
    expect(AR.tmKtViikkoLauseet({ konsepti_avain: 'kons' }, osat)).toEqual([]); expect(AR.tmKtViikkoLauseet(null, osat)).toEqual([]);
  });
  it('HTML: viikko-otsikko "vk N", osan kirjain, lause lainausmerkeissä, rooli + pvm; escapetaan; ei lauseita → tyhjä', () => {
    const h = AR.tmKtViikkoLauseetHTML(AR.tmKtViikkoLauseet(jf, osat), { pvmFn: pvm, t: (k) => k });
    expect(h).toContain('Viikkojen lauseet'); expect(h).toContain('vk 42'); expect(h).toContain('“Ensimmäinen viikko”'); expect(h).toMatch(/data-kvk-vk="2026-W43"/); expect(AR.tmKtViikkoLauseetHTML([], {})).toBe('');
    expect(AR.tmKtViikkoLauseetHTML([{ vk: '2026-W42', nro: 42, rivit: [{ k: 'a', rooli: 'vp', pvm: '', lause: '<i>' }] }], {})).toContain('&lt;i&gt;');
  });
});
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('selain: uusi sivu', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  const VK = { y_h1: { a: { '2026-W42': { v1: { arvo: 1, pvm: '2026-10-14', rooli: 'valmentaja', lause: 'Katsoi vasta lopussa' } }, '2026-W43': { v1: { arvo: 3, pvm: '2026-10-19', rooli: 'valmentaja', lause: 'Katsoi ylös ennen vastaanottoa' } } } } };
  const pel = () => PELAAJAT.map((x) => x.id === 'p2' ? Object.assign({}, x, { jaksofokus: Object.assign({}, x.jaksofokus, { osa_arviot: { y_h1: { a: 3, b: 2, c: 1 } }, osa_havainnot: { y_h1: { a: { v1: { arvo: 3, pvm: '2026-10-19', rooli: 'valmentaja', lause: 'Katsoi ylös ennen vastaanottoa' } }, b: { v1: { arvo: 1, pvm: '2026-10-14', rooli: 'valmentaja' } } } }, osa_havainnot_vk: VK }) }) : x);
  it('ULKOASU: osaa jo = turkoosi reuna + ✓ + himmeä tausta; myöhemmin himmeämpi (väri); lause näkyy avattaessa merkinnän alla', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: pel() }); await p.waitForSelector('.kt-nimi');
      const st = await p.evaluate(() => { const cs = (s) => getComputedStyle(document.querySelector(s)); const probe = document.createElement('i'); probe.style.color = 'var(--teal)'; document.body.appendChild(probe); const teal = getComputedStyle(probe).color; probe.remove();
        return { teal, okBorder: cs('.kt-osa-r.ok').borderTopColor, okBg: cs('.kt-osa-r.ok').backgroundColor, okTxt: document.querySelector('.kt-osa-r.ok .kt-osa-st').textContent, neutraaliBg: cs('.kt-osa-r:not(.ok):not(.on):not(.ei)').backgroundColor, eiColor: cs('.kt-osa-r.ei .kt-osa-st').color, normaaliColor: cs('.kt-osa-r:not(.ei) .kt-osa-k').color }; });
      expect(st.okBorder).toBe(st.teal); expect(st.okTxt).toMatch(/^✓ /); expect(st.okBg).not.toBe(st.neutraaliBg); expect(st.eiColor).not.toBe(st.normaaliColor);
      const rivi = p.locator('[data-kt-osa="a"]'); expect(await rivi.locator('[data-kt-lause]').isVisible()).toBe(false); await rivi.locator('[data-kt-eroavat]').click();
      expect(await rivi.locator('[data-kt-lause]').first().isVisible()).toBe(true); expect(await rivi.locator('[data-kt-lause]').first().innerText()).toBe('“Katsoi ylös ennen vastaanottoa”');
      const m = await rivi.locator('[data-kt-merkinnat]').boundingBox(), l = await rivi.locator('[data-kt-lause]').first().boundingBox(); expect(l.y).toBeGreaterThan(m.y);   // merkinnän alla
      await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('Jakson arviointi -sheet näyttää viikkojen lauseet viikoittain ennen "Lause pelaajalle" -kenttää', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: pel() }); await p.waitForSelector('.kt-nimi');
      await p.locator('.kt-valikko > summary').click(); await p.locator('[data-kt-valikko="sulje"]').click(); await p.waitForSelector('[data-kvk-viikkolauseet]');
      expect(await p.locator('[data-kvk-vk]').evaluateAll((e) => e.map((x) => x.getAttribute('data-kvk-vk')))).toEqual(['2026-W42', '2026-W43']);
      expect(await p.locator('[data-kvk-viikkolauseet]').innerText()).toMatch(/Katsoi vasta lopussa[^]*Katsoi ylös ennen vastaanottoa/);
      const a = await p.locator('[data-kvk-viikkolauseet]').boundingBox(), b = await p.locator('#kvkLause').boundingBox(); expect(a.y).toBeLessThan(b.y); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
});
