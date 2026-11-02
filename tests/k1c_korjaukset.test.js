/* K1c (erä 78) · Teron tuotantotestin korjaukset 20.10.2026 ilta. Kohdat: 1 viikon fokus näkyväksi · 2 klippikortti yhdeksi kokonaisuudeksi · 3 ilmoitukset (✕ paikallaan, ryhmittely, Kuittaa kaikki, ei ❌) · 4 taktiikkataulu koko näytölle + oletuskohdistus pelaajaan.
   Yksikkötestit (node) + selaintestit (Playwright + Chrome; ei ulkoverkkoa, UTC-riippumaton: aikaleimat kaukana tulevaisuudessa / ISO). Vain keksityt nimet. TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/k1c/. */
import { describe, it, expect } from 'vitest';
import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
import { perheSivu } from './helpers/perhe_sivu.mjs';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(join(JUURI, f), 'utf8');
const KT = require('../lib/tm_kehitystyopoyta.js'), TK = require('../lib/tm_tanaan_kentta.js'), KP = require('../lib/tm_klippi_perhe.js'), IL = require('../lib/tm_ilmoitus_lista.js'), KAL = require('../lib/tm_kalenteri_ilmoitus.js');
const TAULU_LIB = require('../lib/tm_kt_taulu.js');
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'k1c');
const CHROME_PAALLA = !!(process.env.TM_CHROME_TESTS !== '0' && CHROME);
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));

/* kontrasti (WCAG): hex → suhde */
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const kontrasti = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const hex = (src, nimi, ala) => { const i = ala ? src.indexOf(ala) : 0; const m = new RegExp(nimi + ':\\s*(#[0-9A-Fa-f]{6})').exec(src.slice(i)); return m && m[1]; };

/* ── KOHTA 1 ── */
describe('K1c/1 · viikon fokus näkyväksi', () => {
  const osat = [{ k: 'a', koodi: 'k1', nimi: 'Ensimmäinen kosketus', tila: null }, { k: 'b', koodi: 'k2', nimi: 'Katse ennen palloa', tila: null }];
  it('valmentaja/VP: fokusrivi = .on + badge "Tämän viikon fokus" (ei pientä "viikon osa" -tekstiä); Ydinasiat-otsikon alla yksi rivi "Tällä viikolla: {ydinasia}"; ilman fokusta ei riviä eikä badgea', () => {
    const h = KT.tmKtOsatHTML({ osat, viikonOsa: { k: 'b' }, jaksoNimi: 'Haltuunotto' }, { v2: true });
    expect(h).toContain('kt-osa-r on'); expect(h).toMatch(/kt-osa-st kt-fokus-merkki">Tämän viikon fokus</); expect(h).not.toContain('viikon osa<');
    expect(h).toContain('data-kt-viikon-rivi>Tällä viikolla: Katse ennen palloa<'); expect(h.indexOf('data-kt-viikon-rivi')).toBeGreaterThan(h.indexOf('Ydinasiat')); expect(h.indexOf('data-kt-viikon-rivi')).toBeLessThan(h.indexOf('class="kt-osat"'));
    expect((h.match(/data-kt-viikon-rivi/g) || []).length).toBe(1); expect((h.match(/kt-fokus-merkki/g) || []).length).toBe(1);
    const ei = KT.tmKtOsatHTML({ osat, viikonOsa: null }, { v2: true }); expect(ei).not.toContain('kt-fokus-merkki'); expect(ei).not.toContain('data-kt-viikon-rivi');
  });
  it('CSS: fokusrivillä taustasävy (teal-korostus kuten .kt-sig), paksu vasen reunamerkki ja badge (täyte --teal)', () => {
    const css = require('../lib/tm_kt_komponentit.js').CSS || lue('lib/tm_kt_komponentit.js');
    expect(css).toMatch(/\.kt-osa-r\.on\{[^}]*border-left-width:4px[^}]*background:color-mix\(in srgb,var\(--teal\) 14%/); expect(css).toMatch(/\.kt-fokus-merkki\{background:var\(--teal\);color:var\(--on-accent,var\(--bg\)\)/);
  });
  it('kontrasti ≥ 4,5: badge-teksti täytteellä molemmissa teemoissa (Kehitystyöpöytä) ja pelaaja-appissa', () => {
    const kt = lue('TalentMaster_Kehitystyopoyta.html'), tumma = kt.indexOf('[data-theme="dark"]'), vaalea = kt.indexOf('[data-theme="light"]');
    const dTeal = hex(kt, '--teal', ':root[data-theme="dark"]'), dBg = hex(kt, '--bg', ':root[data-theme="dark"]');   // tumma: --on-accent puuttuu → fallback --bg
    const lTeal = hex(kt, '--teal', ':root[data-theme="light"]'), lOn = hex(kt, '--on-accent', ':root[data-theme="light"]');
    expect(tumma).toBeGreaterThan(-1); expect(vaalea).toBeGreaterThan(-1);
    expect(kontrasti(dTeal, dBg), 'tumma').toBeGreaterThanOrEqual(4.5); expect(kontrasti(lTeal, lOn), 'vaalea').toBeGreaterThanOrEqual(4.5);
    const pe = lue('TalentMaster_Pelaaja_v7.html'), pTeal = hex(pe, '--teal', ':root'), pTxt = hex(pe, '--text', ':root');   // pelaaja: --on-accent puuttuu → fallback --text
    expect(kontrasti(pTeal, pTxt), 'pelaaja').toBeGreaterThanOrEqual(4.5);
  });
  it('pelaaja: Viikko-kortin ylin rivi "Tällä viikolla harjoittelet: {ydinasia}", fokusrivi korostettu + badge; EI lukuja (§7.22); ilman fokusta ei riviä', () => {
    const x = { tila: 'jakso', viikko: { n: 3 }, nimi: 'Haltuunotto', kesto_vk: 6, osat: [{ k: 'a', teksti: 'Ensimmäinen kosketus' }, { k: 'b', teksti: 'Katse ennen palloa' }], viikonOsa: 'b' };
    const h = TK.tmTanaanKenttaHTML(x, { kentta: () => '' });
    expect(h).toContain('data-k1-fokus-rivi'); expect(h).toContain('Tällä viikolla harjoittelet: Katse ennen palloa'); expect(h.indexOf('data-k1-fokus-rivi')).toBeLessThan(h.indexOf('Viikko 3'));
    expect(h).toMatch(/data-k1-fokus style="[^"]*background:color-mix\(in srgb,var\(--teal\) 14%/); expect(h).toMatch(/data-k1-fokus style="[^"]*border-left:3px solid var\(--teal\)/); expect(h).toMatch(/data-k1-viikon-osa[^>]*>Tämän viikon fokus</);
    const fokusRivi = /<div class="k1-fokus-rivi"[^>]*>([^<]*)</.exec(h)[1]; expect(fokusRivi).not.toMatch(/\d/);
    const ei = TK.tmTanaanKenttaHTML(Object.assign({}, x, { viikonOsa: null }), { kentta: () => '' }); expect(ei).not.toContain('data-k1-fokus'); expect(ei).not.toContain('Tämän viikon fokus');
  });
});

/* ── KOHTA 2 ── */
describe('K1c/2 · klippikortti yhdeksi kokonaisuudeksi', () => {
  const T0 = Date.parse('2026-10-19T09:00:00Z');
  const klippi = (id, o) => Object.assign({ id, tyyppi: 'klippi', pelaajaId: 'p1', vastaanottajaUid: 'pu1', lahettajaUid: 'v1', fromRole: 'valmentaja', klippityyppi: 'onnistui', kysymys: 'Näitkö hyökkääjän?', url: 'https://example.org/v', domain: 'example.org', nakyvyys: 'pelaaja', aika: T0, nakyva_alkaen: T0, luettu: false }, o || {});
  const ket = (dokit) => KP.kpKetjut(dokit, { nyt: new Date(T0 + 3600000), pelaajaId: 'p1' });
  const O = { tila: 'valinta', nimi: 'Alva', valitseFn: 'v', tekstiFn: 't', kuittaaFn: 'q', lahetaFn: 'l', avaaFn: 'a' };
  it('kortin tausta ei ole --card-token ilman fallbackia (Pelaaja_v7/Vanhempi_v2 eivät määrittele sitä) vaan --surface; "Uusi"-tilassa hento teal-reunus, vastatussa ei', () => {
    const uusi = KP.kpKorttiHTML(ket([klippi('k1')]), null, {}, O);
    expect(uusi).toMatch(/data-kp-kortti data-kp-uusi style="background:var\(--surface,var\(--card\)\)[^"]*border-color:color-mix\(in srgb,var\(--teal\) 45%/);
    for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html']) { const s = lue(f); expect(s, f).toMatch(/--surface:#1E1E1C/); expect(s, f).not.toMatch(/--card:\s*#/); }
    const vast = { id: 'v1', tyyppi: 'klippi_vastaus', pelaajaId: 'p1', vastaus_viestille: 'k1', fromRole: 'pelaaja', valinta: 'Arvasin', aika: T0 + 1000, luettu: false, nakyvyys: 'pelaaja' };
    expect(KP.kpKorttiHTML(ket([klippi('k1'), vast]), null, {}, O)).not.toContain('data-kp-uusi');
  });
  it('"Muut klipit" omana alaosionaan: hiusviiva + oma pohja + otsikko; pääklipin ja listan välissä selvä raja; ei alaosiota kun klippejä on yksi', () => {
    const kaksi = ket([klippi('k1'), klippi('k2', { aika: T0 - 7200000, nakyva_alkaen: T0 - 7200000, kysymys: 'Toinen kysymys' })]);
    const h = KP.kpKorttiHTML(kaksi, null, {}, O);
    expect(h).toMatch(/data-kp-muut style="[^"]*border-top:\.5px solid[^"]*background:var\(--surface2/); expect(h).toContain('Muut klipit'); expect(h.indexOf('data-kp-muut')).toBeGreaterThan(h.indexOf('data-kp-laheta'));
    expect(KP.kpKorttiHTML(ket([klippi('k1')]), null, {}, O)).not.toContain('data-kp-muut');
  });
});

/* ── KOHTA 3 · yksikkö ── */
describe('K1c/3 · ilmoituslista (lib)', () => {
  const rivi = (id, tyyppi, nimi, extra) => ({ n: Object.assign({ id, tyyppi, teksti: (tyyppi === 'peruttu' ? 'Peruttu: ' : '') + nimi, ilmoitus: { tyyppi, nimi }, luettu: false, luotu: '2026-10-18T10:00:00Z' }, extra || {}), r: { nakyvissa: true, runko: nimi } });
  const lo = { t: (k) => k, teksti: (x) => x.r.runko, ikoni: () => '<i>ikoni</i>', tapFn: 'tap', kuittaaFn: 'kuittaa', kuittaaRyhmaFn: 'ryhma', kaikkiFn: 'kaikki', peruttuTeksti: (n) => 'Peruttu: ' + n };
  it('ryhmittely: saman nimiset perutut (≥ 2) yhdeksi ryhmäksi ensimmäisen paikalle; yksittäinen peruttu ja muut tyypit eivät; nimi-vertailu ei välitä kirjainkoosta', () => {
    const g = IL.tmIlmoitusRyhmat([rivi('a', 'peruttu', 'Harjoitukset'), rivi('b', 'muistutus', 'Joukkueharjoitus'), rivi('c', 'peruttu', 'harjoitukset'), rivi('d', 'peruttu', 'Nopeustestit'), rivi('e', 'peruttu', 'Harjoitukset')]);
    expect(g.map((x) => (x.ryhma ? 'R:' + x.jasenet.map((j) => j.n.id).join('') : x.x.n.id))).toEqual(['R:ace', 'b', 'd']);
    expect(IL.tmIlmoitusRyhmat([rivi('a', 'muistutus', 'X'), rivi('b', 'muistutus', 'X')]).every((x) => !x.ryhma)).toBe(true);
    expect(IL.tmIlmoitusNimi({ teksti: 'Peruttu: Harjoitus — Nopeus' })).toBe('Harjoitus — Nopeus'); expect(IL.tmIlmoitusNimi(null)).toBe('');
  });
  it('ryhmärivi: "Peruttu: Harjoitukset · 3 kertaa ▸", jäsenet piilossa kunnes avataan, ✕ kuittaa koko ryhmän (kaikki id:t); ei ❌-emojia missään', () => {
    const g = IL.tmIlmoitusRyhmat([rivi('a', 'peruttu', 'Harjoitukset'), rivi('b', 'peruttu', 'Harjoitukset'), rivi('c', 'peruttu', 'Harjoitukset')])[0];
    const h = IL.tmIlmoitusRyhmaHTML(g, lo);
    expect(h).toContain('Peruttu: Harjoitukset · 3 kertaa'); expect(h).toContain('▸'); expect(h).toMatch(/data-ilm-ryhma-lista hidden/); expect(h).toContain("ryhma('a,b,c')"); expect(h).toContain('data-ilm-ryhma="a,b,c"');
    expect(IL.tmIlmoitusRiviHTML(rivi('z', 'peruttu', 'Nopeustestit'), lo)).not.toMatch(/❌/); expect(h).not.toMatch(/❌/); expect(IL.tmIlmoitusMerkkiHTML('peruttu')).toContain('data-ilm-merkki="peruttu"');
    expect(IL.tmIlmoitusRiviHTML(rivi('z', 'peruttu', 'N'), lo)).toContain("kuittaa('z')"); expect(IL.tmIlmoitusRiviHTML(rivi('m', 'muistutus', 'N'), lo)).not.toContain('data-ilm-kuittaa');
  });
  it('"Kuittaa kaikki" -raja on 3 riviä; kuittaus kaikille tyypeille laitteen muistiin (id + luotu), uusi CF-päivitys (uusi luotu) näkyy uudelleen', () => {
    expect(IL.KAIKKI_RAJA).toBe(3); expect(IL.tmIlmoitusKuittaaKaikkiHTML(lo)).toContain('Kuittaa kaikki');
    const m = {}, st = { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } };
    const a = { id: 'a', tyyppi: 'peruttu', luotu: '2026-10-18T10:00:00Z' }, b = { id: 'b', tyyppi: 'muistutus', luotu: '2026-10-18T10:00:00Z' };
    expect(KAL.tmIlmoitusKuittaaUseita(st, 'sib/p1', [a, b])).toBe(true); const k = KAL.tmIlmoitusKuitatut(st, 'sib/p1');
    expect(KAL.tmIlmoitusNakyvissa(b, [], new Date('2026-10-19T09:00:00Z'), k)).toBe(false); expect(KAL.tmIlmoitusNakyvissa(Object.assign({}, b, { luotu: '2026-10-19T08:00:00Z' }), [], new Date('2026-10-19T09:00:00Z'), k)).toBe(true);
  });
  it('KUITATTAVAT TYYPIT: vain muistutus · muutos · peruttu · viikko (CF:n kirjoittamat tiedotteet); toimintaa vaativat (suostumus-/huoltajapyyntö, klippi, tuntematon) eivät: ei ✕:ää, eivät mukaan "Kuittaa kaikki" -laskuriin eikä kuittaukseen, laitteen kuittaus ei piilota niitä', () => {
    expect(KAL.KUITATTAVAT_TYYPIT).toEqual(['muistutus', 'muutos', 'peruttu', 'viikko']);
    for (const ty of ['muistutus', 'muutos', 'peruttu', 'viikko']) expect(KAL.tmIlmoitusKuitattava({ tyyppi: ty }), ty).toBe(true);
    for (const ty of ['suostumus', 'suostumus_pyynto', 'huoltajapyynto', 'klippi', 'vahvista', undefined]) expect(KAL.tmIlmoitusKuitattava({ tyyppi: ty }), String(ty)).toBe(false);
    expect(IL.tmIlmoitusKuitattava).toBeUndefined();   // lib-lista on yksityinen kopio → alla vartija
    expect(lue('lib/tm_ilmoitus_lista.js')).toContain("['muistutus', 'muutos', 'peruttu', 'viikko']");
    const m = {}, st = { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } };
    const a = { id: 'a', tyyppi: 'suostumus', luotu: '2026-10-18T10:00:00Z' }, b = { id: 'b', tyyppi: 'muistutus', luotu: '2026-10-18T10:00:00Z' };
    KAL.tmIlmoitusKuittaaUseita(st, 't', [a, b]); const k = KAL.tmIlmoitusKuitatut(st, 't'); expect(k).toHaveLength(1);
    KAL.tmIlmoitusKuittaa(st, 't', a); expect(KAL.tmIlmoitusNakyvissa(a, [], new Date('2026-10-19T09:00:00Z'), KAL.tmIlmoitusKuitatut(st, 't'))).toBe(true);
    const rivi = (id, tyyppi) => ({ n: { id, tyyppi, teksti: 'x', luettu: false }, r: { runko: 'x' } }), lo = { t: (k) => k, teksti: () => 'x', ikoni: () => '', tapFn: 't', kuittaaFn: 'k', kuittaaRyhmaFn: 'r', kaikkiFn: 'a' };
    expect(IL.tmIlmoitusRiviHTML(rivi('s', 'suostumus'), lo)).toContain('data-ilm-ei-kuitattava'); expect(IL.tmIlmoitusRiviHTML(rivi('s', 'suostumus'), lo)).not.toContain('data-ilm-kuittaa'); expect(IL.tmIlmoitusRiviHTML(rivi('p', 'peruttu'), lo)).not.toContain('data-ilm-ei-kuitattava');
    const g = (l) => IL.tmIlmoitusRyhmat(l.map((x) => rivi(x[0], x[1])));
    expect(IL.tmIlmoitusKaikkiNakyy(g([['a', 'muistutus'], ['b', 'muutos'], ['c', 'suostumus'], ['d', 'huoltajapyynto']])), '2 kuitattavaa + 2 toimintaa vaativaa').toBe(false);
    expect(IL.tmIlmoitusKaikkiNakyy(g([['a', 'muistutus'], ['b', 'muutos'], ['c', 'viikko'], ['d', 'suostumus']]))).toBe(true);
  });
});

/* ── KOHTA 3 · selain: ✕ ei hyppää sivun alkuun ── */
const KAIKKI_ILM = (pid) => {
  const tuleva = (d) => '2099-01-' + String(d).padStart(2, '0') + 'T17:00:00Z', luotu = '2099-01-09T10:00:00Z';   // kaukana tulevaisuudessa → "huomenna" -muistutus näkyvissä ajoajasta riippumatta
  const per = (id, nimi, d) => ({ id, tyyppi: 'peruttu', teksti: 'Peruttu: ' + nimi, ilmoitus: { tyyppi: 'peruttu', nimi }, tapahtuma_alkaa: tuleva(d), linkki: 'kalenteri:' + id, luotu, luettu: false });
  return [per('g1', 'Harjoitukset', 10), per('g2', 'Harjoitukset', 11), per('g3', 'Harjoitukset', 12), per('t4', 'Nopeustestit', 13), { id: 'm5', tyyppi: 'muistutus', teksti: 'Huomenna: Joukkueharjoitus klo 18:00', ilmoitus: { tyyppi: 'huomenna', nimi: 'Joukkueharjoitus', aika: '18:00' }, linkki: 'kalenteri:m5', luotu, luettu: true }];
};
const ILM_SIVUT = {
  pelaaja: { tiedosto: 'TalentMaster_Pelaaja_v7.html', alku: '_isDemoUser=false;_pelaaja={id:"p1",etunimi:"Alva",sukunimi:"Berg",seuraId:"demo"};window._p7Kalenteri=[];window._p7Notif=%DATA%;_ladattu.notif=true;window.__draw=0;var __d0=draw;draw=function(){window.__draw++;return __d0.apply(this,arguments)};', html: '_p7NotifHTML()', avain: 'tm_ilm_kuitattu:demo/p1' },
  vanhempi: { tiedosto: 'TalentMaster_Vanhempi_v2.html', alku: 'window._lapsi={id:"p1",etunimi:"Alva",seuraId:"demo"};window._vanhKalenteri=[];window._vanhNotif=%DATA%;window._vanhNotifLadattu=true;window.__draw=0;var __d0=draw;draw=function(){window.__draw++;return __d0.apply(this,arguments)};', html: '_vanhNotifHTML()', avain: 'tm_ilm_kuitattu:demo/p1' }
};
const HOST = 'var __h=document.createElement("div");__h.id="__host";__h.style.cssText="position:fixed;inset:0;z-index:99999;overflow:auto;background:var(--bg,#111)";document.body.appendChild(__h);window.__piirra=function(){__h.innerHTML="<div style=\\"height:120px\\"></div>"+%HTML%+"<div style=\\"height:2400px\\"></div>"};window.__piirra();';
async function ilmSivu(selain, sivu, data) {
  const S = ILM_SIVUT[sivu], sk = await selain.newContext({ viewport: { width: 390, height: 844 } }), p = await sk.newPage(); const virheet = []; p.on('pageerror', (e) => virheet.push(e.message));
  const kutsu = S.alku.replace('%DATA%', JSON.stringify(data)) + HOST.replace('%HTML%', S.html);
  await p.goto('file://' + perheSivu(lue(S.tiedosto), JUURI, kutsu)); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 });
  expect(await p.locator('#probe-out').textContent()).toBe('ok');
  return { sk, p, virheet, S };
}
describe.skipIf(!CHROME_PAALLA)('K1c/3 · ilmoitukset selaimessa (Pelaaja_v7 + Vanhempi_v2)', () => {
  for (const sivu of ['pelaaja', 'vanhempi']) {
    it(sivu + ': ryhmä "Peruttu: Harjoitukset · 3 kertaa", ✕ poistaa rivin paikallaan eikä muuta vieritystä eikä piirrä näkymää uudelleen; ryhmän ✕ kuittaa kaikki 3 kerralla; kuitattu ei palaa uudelleenpiirrossa; ei ❌', async () => {
      const selain = await selainKaynnista(); try {
        const { sk, p, virheet, S } = await ilmSivu(selain, sivu, KAIKKI_ILM());
        expect(await p.locator('[data-ilm-rivi]').count()).toBe(3); expect(await p.locator('[data-ilm-ryhma-otsikko]').innerText()).toMatch(/Peruttu: Harjoitukset · 3 kertaa/); expect(await p.locator('#__host').innerText()).not.toContain('❌');
        expect(await p.locator('[data-ilm-kaikki]').count(), 'Kuittaa kaikki näkyy kun rivejä ≥ 3').toBe(1);
        if (process.env.TM_KUVAT) { mkdirSync(KUVAT, { recursive: true }); await p.screenshot({ path: join(KUVAT, 'ilmoitukset-' + sivu + '-390.png') }); }
        await p.evaluate(() => { document.getElementById('__host').scrollTop = 160; }); const y0 = await p.evaluate(() => document.getElementById('__host').scrollTop); expect(y0).toBe(160);
        await p.evaluate(() => document.querySelector('[data-ilm-rivi="t4"] [data-ilm-kuittaa]').click()); await p.waitForTimeout(450);   // evaluate-klikkaus: Playwrightin oma scrollIntoView ei saa sotkea vierityksen mittausta
        expect(await p.locator('[data-ilm-rivi="t4"]').count(), 'rivi poistui').toBe(0); expect(await p.evaluate(() => document.getElementById('__host').scrollTop), 'scrollY ei muutu').toBe(y0); expect(await p.evaluate(() => window.__draw), 'ei koko näkymän uudelleenpiirtoa').toBe(0);
        expect(await p.locator('[data-ilm-kaikki]').count(), '2 riviä jäljellä → Kuittaa kaikki pois').toBe(0);
        await p.evaluate(() => document.querySelector('[data-ilm-ryhma-otsikko]').click()); expect(await p.locator('[data-ilm-ryhma-jasen]:visible').count(), 'ryhmä avautuu listaksi').toBe(3);
        await p.evaluate(() => document.querySelector('[data-ilm-ryhma-otsikko] [data-ilm-kuittaa]').click()); await p.waitForTimeout(450);
        expect(await p.locator('[data-ilm-ryhma]').count(), 'koko ryhmä kerralla').toBe(0); expect(await p.evaluate(() => document.getElementById('__host').scrollTop), 'scrollY ryhmän kuittauksen jälkeen').toBe(y0); expect(await p.evaluate(() => window.__draw)).toBe(0);
        const k = await p.evaluate((a) => JSON.parse(localStorage.getItem(a)), S.avain); expect(k.map((x) => x.split('|')[0]).sort()).toEqual(['g1', 'g2', 'g3', 't4']);
        await p.evaluate(() => window.__piirra()); const teksti = await p.locator('#__host').innerText(); expect(teksti, 'kuitattu ei palaa').not.toMatch(/Harjoitukset|Nopeustestit/); expect(teksti).toContain('Joukkueharjoitus');
        expect(SUODATA(virheet)).toEqual([]); await sk.close();
      } finally { await selain.close(); }
    }, 120000);
    it(sivu + ': toimintaa vaativa ilmoitus (suostumuspyyntö) ei saa ✕:ää, ei kuittaudu "Kuittaa kaikki" -toiminnolla eikä piilotu laitteen kuittauksella; tiedotteet kuittaantuvat', async () => {
      const selain = await selainKaynnista(); try {
        const data = KAIKKI_ILM().concat([{ id: 's6', tyyppi: 'suostumus_pyynto', teksti: 'Vahvista suostumus', linkki: '', luotu: '2099-01-09T10:00:00Z', luettu: false }]);
        const { sk, p, virheet } = await ilmSivu(selain, sivu, data);
        expect(await p.locator('[data-ilm-rivi]').count()).toBe(4); expect(await p.locator('[data-ilm-rivi="s6"][data-ilm-ei-kuitattava]').count()).toBe(1); expect(await p.locator('[data-ilm-rivi="s6"] [data-ilm-kuittaa]').count(), 'ei ✕:ää').toBe(0);
        await p.evaluate(() => document.querySelector('[data-ilm-kaikki]').click()); await p.waitForTimeout(450);
        expect(await p.locator('[data-ilm-rivi]').count(), 'vain toimintaa vaativa jää').toBe(1); expect(await p.locator('[data-ilm-rivi="s6"]').count()).toBe(1); expect(await p.locator('[data-ilm-osio]').count()).toBe(1);
        await p.evaluate(() => window.__piirra()); expect(await p.locator('#__host').innerText(), 'uudelleenpiirrossa').toContain('Vahvista suostumus'); expect(await p.locator('[data-ilm-rivi]').count()).toBe(1); expect(await p.evaluate(() => window.__draw)).toBe(0);
        expect(SUODATA(virheet)).toEqual([]); await sk.close();
      } finally { await selain.close(); }
    }, 120000);
    it(sivu + ': "Kuittaa kaikki" kuittaa kaikki rivit (ryhmä mukaan lukien) kerralla ilman uudelleenpiirtoa; osio poistuu; ei palaa uudelleenpiirrossa', async () => {
      const selain = await selainKaynnista(); try {
        const { sk, p, virheet } = await ilmSivu(selain, sivu, KAIKKI_ILM());
        await p.evaluate(() => { document.getElementById('__host').scrollTop = 90; });
        await p.evaluate(() => document.querySelector('[data-ilm-kaikki]').click()); await p.waitForTimeout(450);
        expect(await p.locator('[data-ilm-rivi]').count()).toBe(0); expect(await p.locator('[data-ilm-osio]').count(), 'tyhjä osio poistuu').toBe(0); expect(await p.evaluate(() => window.__draw)).toBe(0); expect(await p.evaluate(() => document.getElementById('__host').scrollTop)).toBe(90);
        await p.evaluate(() => window.__piirra()); expect(await p.locator('[data-ilm-rivi]').count(), 'kuitattu ei palaa').toBe(0);
        expect(SUODATA(virheet)).toEqual([]); await sk.close();
      } finally { await selain.close(); }
    }, 120000);
  }
});

/* ── KOHTA 2 · selain: kortilla näkyvä pinta oikeissa apeissa ── */
describe.skipIf(!CHROME_PAALLA)('K1c/2 · klippikortin pinta Pelaaja_v7:ssä ja Vanhempi_v2:ssa (todellinen tokenisto)', () => {
  const T0 = Date.parse('2026-10-19T09:00:00Z');
  const ketjut = () => KP.kpKetjut([{ id: 'k1', tyyppi: 'klippi', pelaajaId: 'p1', vastaanottajaUid: 'pu1', lahettajaUid: 'v1', fromRole: 'valmentaja', klippityyppi: 'onnistui', kysymys: 'Näitkö hyökkääjän?', url: 'https://example.org/v', domain: 'example.org', nakyvyys: 'pelaaja', aika: T0, nakyva_alkaen: T0, luettu: false },
    { id: 'k2', tyyppi: 'klippi', pelaajaId: 'p1', vastaanottajaUid: 'pu1', lahettajaUid: 'v1', fromRole: 'valmentaja', klippityyppi: 'onnistui', kysymys: 'Toinen kysymys', url: 'https://example.org/w', domain: 'example.org', nakyvyys: 'pelaaja', aika: T0 - 7200000, nakyva_alkaen: T0 - 7200000, luettu: false }], { nyt: new Date(T0 + 3600000), pelaajaId: 'p1' });
  for (const [sivu, tiedosto, alku] of [['pelaaja', 'TalentMaster_Pelaaja_v7.html', '_isDemoUser=false;_pelaaja={id:"p1",seuraId:"demo"};'], ['vanhempi', 'TalentMaster_Vanhempi_v2.html', 'window._lapsi={id:"p1",etunimi:"Alva",seuraId:"demo"};']]) {
    it(sivu + ': kortin tausta ≠ sivun tausta ja ≠ läpinäkyvä (--surface), Uusi-tilassa reunus teal-sävyinen, Muut klipit erotettu hiusviivalla ja omalla pohjalla', async () => {
      const selain = await selainKaynnista(); try {
        const sk = await selain.newContext({ viewport: { width: 390, height: 844 } }), p = await sk.newPage(); const virheet = []; p.on('pageerror', (e) => virheet.push(e.message));
        const kutsu = alku + 'var __h=document.createElement("div");__h.id="__host";__h.style.cssText="position:fixed;inset:0;z-index:99999;overflow:auto;background:var(--bg)";document.body.appendChild(__h);__h.innerHTML=TM_KLIPPI_PERHE.kpKorttiHTML(' + JSON.stringify(ketjut()) + ',null,{},{tila:"valinta",nimi:"Alva",valitseFn:"v",tekstiFn:"t",kuittaaFn:"q",lahetaFn:"l",avaaFn:"a"});';
        await p.goto('file://' + perheSivu(lue(tiedosto), JUURI, kutsu)); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 }); expect(await p.locator('#probe-out').textContent()).toBe('ok');
        const v = await p.evaluate(() => { const c = (el) => getComputedStyle(el), k = document.querySelector('[data-kp-kortti]'), m = document.querySelector('[data-kp-muut]'), s = document.getElementById('__host'); return { kortti: c(k).backgroundColor, sivu: c(s).backgroundColor, reunus: c(k).borderTopColor, muutPohja: c(m).backgroundColor, muutRaja: c(m).borderTopWidth, ymp: c(k).borderTopLeftRadius, tila: k.hasAttribute('data-kp-uusi') }; });
        expect(v.kortti).not.toBe('rgba(0, 0, 0, 0)'); expect(v.kortti).not.toBe(v.sivu); expect(v.tila).toBe(true); expect(v.reunus).toMatch(/^(rgba?|color)\(/); expect(v.reunus).not.toBe('rgba(242, 239, 230, 0.06)'); expect(v.muutPohja).not.toBe('rgba(0, 0, 0, 0)'); expect(parseFloat(v.muutRaja)).toBeGreaterThan(0); expect(parseFloat(v.ymp)).toBeGreaterThanOrEqual(12);
        if (process.env.TM_KUVAT) { mkdirSync(KUVAT, { recursive: true }); await p.screenshot({ path: join(KUVAT, 'klippikortti-' + sivu + '-390.png') }); }
        expect(SUODATA(virheet)).toEqual([]); await sk.close();
      } finally { await selain.close(); }
    }, 90000);
  }
});

/* ── KOHTA 4 · taulu koko näytölle + oletuskohdistus ── */
describe.skipIf(!CHROME_PAALLA)('K1c/4 · taktiikkataulu koko näytölle', () => {
  const YV = { kuvaus: '1. kosketus', alue: { x: 25, y: 35, w: 50, h: 61 }, alue_avain: 'keskusta', asetti_uid: 'u1', asetettu_pvm: '2026-10-01' };
  const pel = () => PELAAJAT.map((x) => x.id === 'p2' ? Object.assign({}, x, { ydinvahvuus: YV, suostumusTila: 'annettu' }) : x);
  const IFR = 'iframe[data-kt-taulu-iframe]';
  it('1280 + 390 × tumma/vaalea (valmentaja + VP): modaali = koko näyttö (100vw × 100dvh), ei sisempää kehystä (iframe täyttää loput palkin alta), otsikkopalkki "Taktiikkataulu · Bertta Bergh · ×"; iframessa Masterin lista ilman toista kehystä/otsikkoa; Esc sulkee', async () => {
    const selain = await selainKaynnista(); try {
      for (const [leveys, korkeus, rooli, teema] of [[1280, 800, 'valmentaja', 'dark'], [1280, 800, 'vp', 'light'], [390, 844, 'valmentaja', 'dark']]) {
        const nm = rooli + leveys + teema, { sk, p, virheet } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/tanaan', leveys, korkeus, teema, pelaajat: pel() }); await p.waitForSelector('.kts-kentta-valikko');
        await p.locator('.kts-kentta-valikko > summary').click(); await p.locator('#ktSivu_tanaan [data-kt-piirra-taululle]').click(); await p.waitForSelector(IFR);
        const f = p.frameLocator(IFR); await f.locator('#_kvModal').waitFor({ timeout: 25000 });
        const b = await p.evaluate(() => { const m = document.getElementById('_ktTauluModal'), r = m.getBoundingClientRect(), h = m.querySelector('[data-kt-taulu-palkki]').getBoundingClientRect(), f = document.querySelector('iframe[data-kt-taulu-iframe]').getBoundingClientRect(); return { w: r.width, h: r.height, iw: innerWidth, ih: innerHeight, palkki: h.height, fy: f.top, fh: f.height, fw: f.width, reuna: getComputedStyle(m).borderTopWidth, nimi: m.querySelector('[data-kt-taulu-nimi]').textContent, otsikko: m.querySelector('[data-kt-taulu-palkki]').innerText }; });
        expect(b.w, nm).toBe(b.iw); expect(b.h, nm).toBe(b.ih); expect(b.fw, nm).toBe(b.iw); expect(b.fy + b.fh, nm).toBe(b.ih); expect(b.palkki, nm).toBeLessThanOrEqual(60); expect(b.reuna, nm).toBe('0px'); expect(b.otsikko, nm).toMatch(/Taktiikkataulu · Bertta Bergh/); expect(b.otsikko, nm).toContain('×');
        const ik = await f.locator('#_kvModal > div').evaluate((e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return { w: r.width, h: r.height, iw: innerWidth, ih: innerHeight, reuna: c.borderTopWidth, os: c.borderRadius }; });
        expect(ik.w, nm).toBe(ik.iw); expect(ik.h, nm).toBe(ik.ih); expect(ik.reuna, nm).toBe('0px'); expect(ik.os, nm).toBe('0px');
        expect(await f.locator('#_kvModal [data-kv-otsikko]').isVisible(), nm + ': toinen otsikko piilossa').toBe(false);
        if (process.env.TM_KUVAT) { mkdirSync(KUVAT, { recursive: true }); await p.screenshot({ path: join(KUVAT, 'taulu-lista-' + leveys + '-' + teema + '.png') }); }
        await p.keyboard.press('Escape'); await p.waitForSelector(IFR, { state: 'detached', timeout: 6000 });
        expect(SUODATA(virheet), nm).toEqual([]); await sk.close();
      }
    } finally { await selain.close(); }
  }, 300000);
  it('uusi kaavio pelaajakortista: oletuskohdistus = pelaaja (nakyvyys "pelaaja", tämä pelaaja esivalittu), muutettavissa joukkueeseen; ilman pelaajakontekstia oletus ennallaan (joukkue); editori täyttää korkeuden: kenttä ≥ 400 px (1280) ja työkalut oikealla', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p, virheet } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: 1280, korkeus: 800, pelaajat: pel() }); await p.waitForSelector('.kts-kentta-valikko');
      await p.locator('.kts-kentta-valikko > summary').click(); await p.locator('#ktSivu_tanaan [data-kt-piirra-taululle]').click(); await p.waitForSelector(IFR);
      const f = p.frameLocator(IFR); await f.locator('#_kvModal').waitFor({ timeout: 25000 });
      await f.locator('#_kvModal button', { hasText: /Uusi kaavio/ }).first().click(); await f.locator('#_kvUusi').waitFor();
      expect(await f.locator('#_kvUNak').inputValue(), 'taso').toBe('pelaaja');
      expect(await f.locator('#_kvUKp').evaluate((s) => [].slice.call(s.options).filter((o) => o.selected).map((o) => o.value)), 'esivalittu pelaaja').toEqual(['p2']);
      await f.locator('#_kvUNak').selectOption('joukkue'); expect(await f.locator('#_kvUKj').count(), 'muutettavissa joukkueeseen').toBe(1);
      await f.locator('#_kvUNak').selectOption('pelaaja'); await f.locator('#_kvUKp').evaluate((s) => { [].slice.call(s.options).forEach((o) => { o.selected = o.value === 'p2'; }); });
      await f.locator('#_kvUusi button', { hasText: /Luo ja muokkaa/ }).click(); await f.locator('#_kvEditori').waitFor();
      const ed = await f.locator('#_kvEditori').evaluate((e) => { const c = e.querySelector('#_kvCanvas').getBoundingClientRect(), t = e.querySelector('#_kvTyokalupaneeli').getBoundingClientRect(), box = e.firstElementChild.getBoundingClientRect(); return { ch: c.height, cw: c.width, tl: t.left, cr: c.right, bw: box.width, iw: innerWidth, nak: document.getElementById('_kvENak').value, valitut: [].slice.call(document.getElementById('_kvEKp').options).filter((o) => o.selected).map((o) => o.value) }; });
      expect(ed.nak).toBe('pelaaja'); expect(ed.valitut).toEqual(['p2']); expect(ed.bw).toBe(ed.iw); expect(ed.ch, 'kenttä täyttää vapaan korkeuden').toBeGreaterThanOrEqual(400); expect(ed.tl, 'työkalut oikealla kentän vieressä').toBeGreaterThanOrEqual(ed.cr - 1);
      if (process.env.TM_KUVAT) { mkdirSync(KUVAT, { recursive: true }); await p.screenshot({ path: join(KUVAT, 'taulu-editori-1280-dark.png') }); }
      /* tallentamattomat: Esc editorissa → isäntä pyytää sulkua, Master kysyy; peruutus jättää taulun auki, hyväksyntä sulkee */
      let dialogit = 0; p.on('dialog', async (d) => { dialogit++; if (dialogit === 1) await d.dismiss(); else await d.accept(); });
      await p.keyboard.press('Escape'); await p.waitForTimeout(1500); expect(dialogit, 'kysyy tallentamattomista').toBe(1); expect(await p.locator(IFR).count(), 'peruutus → auki').toBe(1);
      await p.locator('[data-kt-taulu-sulje]').click(); await p.waitForSelector(IFR, { state: 'detached', timeout: 8000 }); expect(dialogit).toBe(2);
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 240000);
  it('kapea näkymä (390): kenttä ensin, työkalut alla (ei vierittämättä piiloon jäävää sivupalkkia)', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: 390, korkeus: 844, pelaajat: pel() }); await p.waitForSelector('.kts-kentta-valikko');
      await p.locator('.kts-kentta-valikko > summary').click(); await p.locator('#ktSivu_tanaan [data-kt-piirra-taululle]').click(); await p.waitForSelector(IFR);
      const f = p.frameLocator(IFR); await f.locator('#_kvModal').waitFor({ timeout: 25000 });
      await f.locator('#_kvModal button', { hasText: /Uusi kaavio/ }).first().click(); await f.locator('#_kvUusi button', { hasText: /Luo ja muokkaa/ }).click(); await f.locator('#_kvEditori').waitFor();
      const ed = await f.locator('#_kvEditori').evaluate((e) => { const c = e.querySelector('#_kvCanvas').getBoundingClientRect(), t = e.querySelector('#_kvTyokalupaneeli').getBoundingClientRect(); return { cb: c.bottom, tt: t.top, cw: c.width, iw: innerWidth }; });
      expect(ed.tt, 'työkalut kentän alla').toBeGreaterThanOrEqual(ed.cb - 1); expect(ed.cw).toBeLessThanOrEqual(ed.iw);
      if (process.env.TM_KUVAT) { mkdirSync(KUVAT, { recursive: true }); await p.screenshot({ path: join(KUVAT, 'taulu-editori-390-dark.png') }); }
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});

describe('K1c · rakenne', () => {
  it('Master: upotetun tilan koko näytön CSS + tallentamattomien kysely kytketty; taulu-lib käsittelee sulje_pyynto/Esc; ei hex-värejä uudessa libissä', () => {
    const m = lue('TalentMaster_Master_v16.html'); expect(m).toMatch(/html\.tm-upotettu #_kvModal,html\.tm-upotettu #_kvEditori\{background:var\(--bg\)!important/); expect(m).toContain('tallentamattomia: function ()'); expect(m).toContain("tmKtTauluT(masterT, 'kt_taulu_tallentamatta')"); expect(TAULU_LIB.FI.kt_taulu_tallentamatta).toBe('Tallentamattomat muutokset menetetään. Suljetaanko taulu?');
    const t = lue('lib/tm_kt_taulu.js'); expect(t).toContain("'sulje_pyynto'"); expect(t).toContain("ev.key === 'Escape'"); expect(t).toContain('100vw;height:100vh;height:100dvh');
    expect(lue('lib/tm_ilmoitus_lista.js')).not.toMatch(/#[0-9A-Fa-f]{3,6}\b|rgba?\(/);
  });
  it('SW: ilmoituslista allowlistissa ja cache-versiot nostettu molemmissa apeissa; ?v nostettu', () => {
    for (const [sw, html] of [['sw_pelaaja.js', 'TalentMaster_Pelaaja_v7.html'], ['sw_vanhempi.js', 'TalentMaster_Vanhempi_v2.html']]) { expect(lue(sw), sw).toContain("/lib/tm_ilmoitus_lista.js"); expect(lue(html), html).toMatch(/tm_ilmoitus_lista\.js/); expect(lue(html), html).toMatch(/tm_kalenteri_ilmoitus\.js/); }
  });
});
