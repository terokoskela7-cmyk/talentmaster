/* PR D — Kodin Rytmi-vaihe (docs/CODE_BRIEF_KOTI_TILANNE_V2.md; mockup 33 "Rytmi · FC Demo", mockup 32; D161–D163, D166). lib/tm_vp_koti.js. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const KK = require('../lib/tm_vp_koti.js'), PU = require('../lib/tm_seuran_pulssi.js'), F = require('./helpers/vp_fixture.cjs'), TT = require('../lib/tm_vp_tilanne.js');
const NYT = Date.UTC(2026, 9, 12, 7, 0), DAY = 86400000, teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const FN = { opas: 'op', aloitaJaksot: 'aj', kutsu: 'ku', testit: 'te', joukkue: 'jk', viesti: 'vi', tilanne: 'ti', kalenteri: 'ka', paivita: 'pa', demo: 'de', auki: 'au', tuo: 'tu', kuittaa: 'kt', valmentaja: 'va' };
const rakenna = (tila, muokkaa, env2, opts2) => { const d = F.lataa(tila || 'kypsa', NYT); if (muokkaa) muokkaa(d); const v = d.koosteet[d.koosteet.length - 1], m = PU.tmPulssiRivit(d.koosteet, { nytMs: NYT, ensimmainenVk: d.ensin, jaksoVk: d.jaksoVk, katselmusPv: {} });
  const env = Object.assign({ yhteensa: v.yhteensa, koosteJ: v.joukkueet, testit: d.tapahtumat, nimet: d.nimet, kalenteri: d.kalenteri, viestit: [], nytMs: NYT, seuraNimi: 'Demo FC' }, env2 || {}), rm = KK.tmKotiRytmiMalli(m, env), r = KK.tmKotiRytmiHTML(rm, Object.assign({ t: (x) => x, fn: FN }, opts2 || {}));
  return { d, m, rm, h: r.main, rail: r.rail }; };
const sig = (tyyppi, jid, nimi, o) => Object.assign({ tyyppi, jid, nimi, avain: tyyppi + '|' + jid, jaksoVk: null, n: 10, vk: 4, pv: 5, auki: 3, alku: 70, loppu: 40, pros: 12, tavoite: 25, leikkija: false }, o || {});
const idt = (d) => d.spec.joukkueet.map((j) => j.id);

describe('D161 · Tällä viikolla: signaalit ja VP:tä odottavat viestit yhdessä listassa; tärkein = signaalikortti', () => {
  it('kypsä (8/9 jaksolla): vaihe Rytmi; otsikko D163 "{n} asiaa tällä viikolla." (viikko, ei kausi) + tulkintalause "Tärkein: …"', () => {
    const { rm, m, h } = rakenna('kypsa'), x = teksti(h); expect(KK.tmKotiVaihe(m)).toBe('rytmi'); expect(x).toContain(rm.asioita + ' asiaa tällä viikolla.'); expect(x).toContain('Jakso on käynnissä 8/9 joukkueella. Tärkein: P15 on ollut ilman jaksoa 4 viikkoa.'); expect(x).not.toMatch(/Kausi 20|jaksolla \d+ %/);
  });
  it('signaalikortti on sivun AINOA täytetty nappi (D147); alarivi Kuittaa · Ensi viikolla harmaana; muut toiminnot linkkejä', () => {
    const { h } = rakenna('kypsa'); expect((h.match(/class="kt-btn"/g) || []).length).toBe(1); expect(h).toMatch(/<button class="kt-btn" type="button" onclick="jk\('P15 Demo'\)">Aloita jakso<\/button>/); expect(h).toContain('data-kuittaus="kuitattu"'); expect(h).toContain("onclick=\"kt('ei_jaksoa|"); expect(h).not.toContain('class="kt-btn q');
  });
  it('lista: signaalit + viestit samassa; viesti "Viesti · P12 … odottaa sinua" + "Vastaa"; enintään 5 asiaa + "+N muuta" → Tilanne', () => {
    const viestit = [1, 2, 3, 4, 5, 6].map((i) => ({ id: 'v' + i, osapuoli: 'u' + i, nimi: 'P1' + i, teksti: 'Viesti ' + i, ms: NYT - i * 3600000 })), { rm, h } = rakenna('kypsa', null, { viestit }), x = teksti(h);
    expect(x).toContain('Viesti · P11 Viesti 1'); expect(x).toContain('tänään · odottaa sinua'); expect(x).toContain('Vastaa'); expect(h).toContain("onclick=\"vi('u1','v1')\""); expect((h.match(/class="kk-it"/g) || []).length + (h.match(/<summary class="kk-it"/g) || []).length).toBeLessThanOrEqual(4);
    expect(rm.lisaa).toBe(rm.asioita - 1 - rm.rivit2.length); expect(rm.lisaa).toBeGreaterThan(0); expect(x).toContain('+' + rm.lisaa + ' muuta'); expect(h).toContain('onclick="ti()"');
  });
  it('rivin D162-rakenne: yläotsikko = aihe · joukkue, otsikko = havainto, perustelu = luku + tavoite (+ ikä), toiminto = teonsana; kebab: Kuittaa/Ensi viikolla', () => {
    const { h } = rakenna('kypsa'), x = teksti(h); expect(x).toContain('Katselmus · P13 Katselmusikkuna on auki'); expect(x).toContain('6 pelaajan katselmus tekemättä. Jakso vk 6/6. Kevyt katselmus riittää.'); expect(x).toContain('Sulje jakso lauseella'); expect(h).toContain('class="kk-kebab"');
  });
  it('tyhjä viikko (D114): "Rauhallinen viikko." + osio "Ei uusia asioita · tarkistettu {n} joukkuetta", ei signaalikorttia', () => {
    const { h, rm } = rakenna('kypsa', (d) => { d.koosteet.forEach((k) => Object.values(k.joukkueet).forEach((j) => { j.n_katselmus = 0; j.jakso = true; j.n_jaksolla = j.n_pelaajat; })); }); expect(rm.asioita).toBe(0); expect(teksti(h)).toContain('Rauhallinen viikko.'); expect(teksti(h)).toContain('Ei uusia asioita · tarkistettu 9 joukkuetta'); expect(teksti(h)).not.toContain('Mikään ei vaadi'); expect(h).not.toContain('kk-sigk'); expect((h.match(/class="kt-btn"/g) || []).length).toBe(0);
  });
});

describe('Ryhmittely: sama asia ≥ 3 joukkueella = YKSI rivi/kortti (kuten Tilanteessa); kahden joukkueen asiat jäävät yksittäisiksi', () => {
  const ilman = (n) => (d) => { const k = d.koosteet[d.koosteet.length - 1]; idt(d).slice(0, n).forEach((id) => { Object.values(d.koosteet).forEach((kk) => { kk.joukkueet[id].jakso = false; kk.joukkueet[id].n_jaksolla = 0; kk.joukkueet[id].jakso_nimi = null; }); }); void k; };
  it('3 jaksotonta (jaksoja ≥ 1/3) → yksi ryhmäkortti "{n} joukkuetta on ilman jaksoa." + tunnisteet + "Aloita jaksot"; 2 jaksotonta → kaksi yksittäistä', () => {
    const kolme = rakenna('kypsa', ilman(3)), x = teksti(kolme.h); expect(kolme.rm.entries.filter((e) => e.tyyppi === 'ei_jaksoa')).toHaveLength(1); expect(kolme.rm.kortti).toMatchObject({ ryhma: true, tyyppi: 'ei_jaksoa', n: 4 }); expect(x).toContain('Jakso · 4 joukkuetta'); expect(x).toContain('4 joukkuetta on ilman jaksoa.');   // 3 uutta + P15 expect(kolme.h).toMatch(/<button class="kt-btn" type="button" onclick="aj\(''\)">Aloita jaksot<\/button>/); expect(kolme.h).not.toContain('data-kuittaus');
    const kaksi = rakenna('kypsa', ilman(1)); expect(kaksi.rm.entries.filter((e) => e.tyyppi === 'ei_jaksoa' && !e.ryhma)).toHaveLength(2);
  });
  it('ryhmärivi (ei kortti): <details>, tunnisteet D144:llä (6 + "+N"), avaa listan joukkueista; "Aloita jaksot →" sisällä', () => {
    const { h, rm } = rakenna('kuormitus', null, null, null); expect(rm.entries.some((e) => e.ryhma)).toBe(true);
    const d = rakenna('kypsa', (dd) => { const v = dd.koosteet[dd.koosteet.length - 1]; v.joukkueet[idt(dd)[0]].n_katselmus = 4; v.joukkueet[idt(dd)[1]].n_katselmus = 4; v.joukkueet[idt(dd)[2]].n_katselmus = 4; v.joukkueet[idt(dd)[3]].n_katselmus = 4; Object.values(dd.koosteet).forEach((k) => Object.values(k.joukkueet).forEach((j) => { j.profiili = 'ammatti'; })); });
    expect(typeof h).toBe('string'); expect(d.rm.entries.some((e) => e.tyyppi === 'katselmusikkuna')).toBe(true);
  });
  it('ryhmitys synteettisellä signaalilistalla: 7 käyttösignaalia → yksi rivi, kuusi tunnistetta + "+1", rivi <details> ja kaikki 7 joukkuetta listana', () => {
    const d = F.lataa('kypsa', NYT), v = d.koosteet[d.koosteet.length - 1], m = PU.tmPulssiRivit(d.koosteet, { nytMs: NYT, ensimmainenVk: d.ensin, jaksoVk: d.jaksoVk, katselmusPv: {} }), rv = m.rivit.filter((r) => r.jakso.voimassa).slice(0, 8);
    Object.keys(v.joukkueet).forEach((k) => { v.joukkueet[k].n_suostumus = v.joukkueet[k].n_pelaajat; }); m.signaalitLista = rv.map((r) => sig('kaytto_matala', r.jid, r.nimi));
    const rm = KK.tmKotiRytmiMalli(m, { yhteensa: v.yhteensa, koosteJ: v.joukkueet, kalenteri: [], nytMs: NYT }), h = KK.tmKotiRytmiHTML(rm, { t: (x) => x, fn: FN }).main;
    expect(rm.entries).toHaveLength(1); expect(rm.kortti).toMatchObject({ ryhma: true, tyyppi: 'kaytto_matala', n: 7 }); expect(teksti(h)).toContain('Käyttö · 7 joukkuetta'); expect(teksti(h)).toContain('Pelaajat ja perheet eivät vielä käytä sovellusta 7 joukkueella.'); expect(h).toContain('>+1<');
    const rm2 = KK.tmKotiRytmiMalli(Object.assign({}, m, { signaalitLista: m.signaalitLista.concat([sig('ei_jaksoa', 'x1', 'T9 Demo')]) }), { yhteensa: v.yhteensa, koosteJ: v.joukkueet, kalenteri: [], nytMs: NYT }), h2 = KK.tmKotiRytmiHTML(rm2, { t: (x) => x, fn: FN }).main;
    void h2;
  });
});

describe('D166 · joukkueet kolmella tasolla', () => {
  const synt = (tyypit, env2) => { const d = F.lataa('kypsa', NYT), v = d.koosteet[d.koosteet.length - 1], m = PU.tmPulssiRivit(d.koosteet, { nytMs: NYT, ensimmainenVk: d.ensin, jaksoVk: d.jaksoVk, katselmusPv: {} }), rv = m.rivit.filter((r) => r.jakso.voimassa && r.n >= 5);
    Object.keys(v.joukkueet).forEach((k) => { v.joukkueet[k].n_suostumus = v.joukkueet[k].n_pelaajat; }); m.signaalitLista = tyypit.map((ty, i) => sig(ty, rv[i].jid, rv[i].nimi, { jaksoVk: { vk: 3, N: 6 } }));
    const rm = KK.tmKotiRytmiMalli(m, Object.assign({ yhteensa: v.yhteensa, koosteJ: v.joukkueet, kalenteri: [], nytMs: NYT }, env2 || {})); return { rm, h: KK.tmKotiRytmiHTML(rm, { t: (x) => x, fn: FN }).main, rv }; };
  it('yksi huomio → EI korttia: rivi listan alussa amber-merkillä; syy vain kerran (sama asia Tällä viikolla -listassa → rivillä vain merkki)', () => {
    const { rm, h } = rakenna('kypsa'), x = teksti(h); expect(rm.huomio).toHaveLength(0); expect(h).not.toContain('kk-jk'); expect(rm.muut[0]).toMatchObject({ tunniste: 'P13', huomio: true, syyToistuu: true });
    const rivi = h.match(/<div class="kk-jr"[^>]*><span class="kk-tn"[^>]*>P13[\s\S]*?<span class="kk-ar"/)[0]; expect(rivi).toContain('class="kk-mk w"'); expect(rivi).not.toContain('kk-why'); expect(x.match(/Katselmusikkuna on auki/g)).toHaveLength(1);
    expect(rm.muut.map((r) => r.tunniste).slice(0, 2)).toEqual(['P13', 'P10']);   // huomio ensin, loput ikäjärjestyksessä
  });
  it('yksi huomio jonka asiaa EI ole listassa: rivillä amber-merkki + syy kerran (renderöinti)', () => {
    const { rm } = rakenna('kypsa'), rm2 = Object.assign({}, rm, { muut: rm.muut.map((r, i) => (i === 0 ? Object.assign({}, r, { syyToistuu: false }) : r)) }), h = KK.tmKotiRytmiHTML(rm2, { t: (x) => x, fn: FN }).main, rivi = h.match(/<div class="kk-jr"[^>]*><span class="kk-tn"[^>]*>P13[\s\S]*?<span class="kk-ar"/)[0];
    expect(rivi).toContain('class="kk-mk w"'); expect(teksti(rivi)).toContain('Katselmusikkuna on auki'); expect(rivi.match(/kk-why/g)).toHaveLength(1);
  });
  it('kaksi+ huomiota → huomiokortit (≤ 3), amber-merkki; syy vain jos asiaa ei ole listassa', () => {
    const a = synt(['katselmusikkuna', 'katsaus_laskee']), x = teksti(a.h); expect(a.rm.huomio).toHaveLength(2); expect(a.h.match(/class="kk-jk w"/g)).toHaveLength(2); expect(a.h).toContain('▲ huomio');
    a.rm.huomio.forEach((r) => expect(r.syyToistuu, r.tunniste).toBe(true)); expect(a.h).not.toContain('kk-why'); expect(x).not.toContain('Katsaus laskenut kolme viikkoa');   // syy näkyy jo listassa → kortilla vain merkki
    const c = synt(['kaytto_matala', 'kaytto_matala', 'katsaus_laskee', 'katselmusikkuna', 'katselmusikkuna', 'ei_jaksoa', 'ei_jaksoa']); expect(c.rm.huomio.length).toBeLessThanOrEqual(3); expect(c.rm.huomio.length).toBeGreaterThanOrEqual(2); expect(c.rm.huomio.length + c.rm.muut.length).toBe(c.rm.jaksolla);
  });
  it('ikäjärjestys: rivit ja tunnisteet; jaksottomat tunnisteina; huomioiden määrä + muut = jaksolliset', () => {
    const { rm, h } = rakenna('kypsa'), x = teksti(h); expect(rm.huomio.length + rm.muut.length).toBe(rm.jaksolla); expect(rm.ilman.map((i) => i.tunniste)).toEqual(['P15']); expect(h).toContain('class="kk-jr"');
    expect(x).toContain('Joukkueet · ikäjärjestys'); expect(x).toContain('9 joukkuetta · 8 jaksolla'); expect(x).toContain('Ilman jaksoa · 1'); expect(x).toContain('Aloita jakso →');
    const nimet = rm.muut.filter((r) => !r.huomio).map((r) => r.tunniste); expect(nimet).toEqual([...nimet].sort((a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10)));
  });
  it('rivi: tunniste · teema · "Leikkijä · 8 pel. · perhe kuittaa · vk 4/8" metarivillä; lukusarakkeessa vain luku (Käyttö 7 pv)', () => {
    const { h } = rakenna('kypsa'), x = teksti(h); expect(x).toContain('P10 Pelaaminen Leikkijä · 8 pel. · perhe kuittaa · vk 4/8 Käyttö 7 pv 38 %'); expect(h).toContain("onclick=\"jk('P10 Demo')\"");
  });
  it('EI tyhjiä lukusoluja: lukusarakkeissa ei "—" eikä "perhe kuittaa"; puuttuva luku = saraketta ei näytetä (kaikki fixturet, Rytmi ja Käynnistys, kortit ja rivit)', () => {
    ['kypsa', 'pilotti', 'kuormitus'].forEach((tila) => { const h = F.kotiHTML(F.lataa(tila, NYT), {}); const sarakkeet = (h.match(/<span class="kk-(?:rn|nums)">[\s\S]*?<\/span><\/span><\/span>(?=<span class="kk-ar"|<\/button>|<\/div>)/g) || []).concat(h.match(/<span class="kk-nu[^"]*">[\s\S]*?<\/span><\/span>/g) || []);
      expect(sarakkeet.length, tila).toBeGreaterThan(0); sarakkeet.forEach((s) => { expect(teksti(s), tila).not.toContain('—'); expect(teksti(s), tila).not.toContain('perhe kuittaa'); }); expect(h, tila).not.toContain('kk-na'); });
    const k = rakenna('kypsa').h; expect(k).not.toMatch(/Katsaus\s*<\/span><span class="kk-v[^"]*">\s*<\/span>/);
  });
  it('kattavuusportti: luvut vain kun joukkueen suostumus ≥ 70 % ja ≥ 5 pelaajaa, muuten "perheitä mukana x/y" (ei "0 %")', () => {
    const { h, rm } = rakenna('kypsa', (d) => { Object.values(d.koosteet).forEach((k) => { k.joukkueet[idt(d)[5]].n_suostumus = 2; }); }), x = teksti(h); expect(x).toMatch(/P14 Kuljettaminen Rakentaja · 18 pel\. · vk 3\/4 perheitä mukana 2\/18/); expect(rm.muut.concat(rm.huomio).find((r) => r.tunniste === 'P14').luvut).toBeNull(); expect(x).not.toMatch(/(^|[^\d])0 %/);
  });
  it('0 pelaajan joukkueet eivät näy Kodissa (§7.18)', () => { const { h } = rakenna('pilotti', (d) => { Object.values(d.koosteet).forEach((k) => { const j = Object.values(k.joukkueet)[0]; Object.keys(k.joukkueet).slice(0, 5).forEach((id) => { k.joukkueet[id].jakso = true; k.joukkueet[id].n_jaksolla = k.joukkueet[id].n_pelaajat; k.joukkueet[id].jakso_nimi = 'X'; }); void j; }); }); expect(h).not.toMatch(/>\s*(P18|T18)\s*</); });
});

describe('Käynnistyksen askeleet ohuena rivinä kunnes kaikki ovat valmiita', () => {
  it('rivi näkyy kun jokin askel ei ole valmis: "Käynnistys {v}/3 askelta valmiina · {askel} a/b" + palkki + linkki; kaikki valmiit → rivi poistuu', () => {
    const a = rakenna('kypsa', (d) => { d.tapahtumat = d.tapahtumat.filter((e) => !e.joukkue); }), x = teksti(a.h); expect(a.rm.kn).toMatchObject({ valmiit: 2, yht: 3 }); expect(x).toContain('Käynnistys 2/3 askelta valmiina · testipäivät 0/9'); expect(a.h).toContain('class="kt-ev kk-kn"'); expect(a.h).toMatch(/<button type="button" class="kk-lnk" onclick="te\(\)">Sovi päivät →<\/button>/);
    const b = rakenna('kypsa'); expect(b.rm.kn).toBeNull(); expect(b.h).not.toContain('kk-kn');
  });
});

describe('Kieli: viikonpäivälyhenteet valitusta kielestä (fi/sv/en)', () => {
  it('Tänään/Tulossa-päivät ja kooste-aika: fi "ma", sv "mån", en "Mon"; oletus fi', () => {
    const a = rakenna('kypsa', null, null, { kieli: 'fi' }), b = rakenna('kypsa', null, null, { kieli: 'sv' }), c = rakenna('kypsa', null, null, { kieli: 'en' });
    expect(teksti(a.rail)).toMatch(/Tänään · ma 12\.10\./); expect(teksti(b.rail)).toMatch(/Tänään · mån 12\.10/); expect(teksti(c.rail)).toMatch(/Tänään · Mon 12\/10/); expect(teksti(a.h)).toMatch(/kooste klo \d/);
    expect(rakenna('kypsa').rail).toBe(a.rail);
    const ti = (kieli) => teksti(TT.tmTilanneHTML(TT.tmTilanneMalli(F.lataa('kypsa', NYT).syote), { t: (x) => x, kieli, fn: {} })); expect(ti('sv')).toMatch(/jaksopalaveri \d+[./]\d+/); expect(ti('sv')).toMatch(/Jaksopalaveri · (sö|sön)\.? \d+/); expect(ti('fi')).toMatch(/Jaksopalaveri · su \d+\.\d+\./);
  });
});

describe('Otsikkorivi ja hiljaiset linkit; sisältö vasemmalle; oikea palsta', () => {
  it('otsikkorivillä vain "kooste klo · Päivitä nyt"; "Näytä opas" ja "Katso esimerkkiseura" hiljaisina linkkeinä sivun lopussa (Rytmi ja Käynnistys)', () => {
    ['kypsa', 'pilotti'].forEach((tila) => { const h = F.kotiHTML(F.lataa(tila, NYT), {}), hd = h.slice(h.indexOf('class="kk-hd"'), h.indexOf('</h3>')), loppu = h.slice(h.indexOf('class="kk-loppu"'), h.indexOf('class="kk-rail"'));
      expect(teksti(hd), tila).toMatch(/kooste klo \d\d\.\d\d · Päivitä nyt/); expect(hd).not.toMatch(/Näytä opas|Katso esimerkkiseura/); expect(h.indexOf('class="kk-loppu"')).toBeGreaterThan(h.indexOf('class="kk-jk') > 0 ? h.indexOf('class="kk-jk') : h.indexOf('kk-st')); expect(teksti(loppu), tila).toContain('Näytä opas'); expect(teksti(loppu), tila).toContain('Katso esimerkkiseura'); });
  });
  it('Käynnistys: tyhjää "Tällä viikolla" -osiota ei näytetä; askeleen 1 teksti vastaa nykyistä toimintaa (D155, ei vahvistuslupausta)', () => {
    const x = teksti(F.kotiHTML(F.lataa('pilotti', NYT), {})); expect(x).not.toMatch(/Ei toimenpiteitä tällä viikolla|Ei uusia asioita/); expect(x).toContain('Aloita jakso joukkueen näkymässä. Jakso antaa joukkueelle teeman ja viikkotavoitteet.'); expect(x).not.toMatch(/vahvistaa/);
  });
  it('oikea palsta: jokaisella joukkuetapahtumalla tunniste; saman päivän harjoitukset yhdeksi riviksi ("ti 13.10. · 3 harjoitusta" + tunnisteet); seuratason tapahtumat omina riveinään', () => {
    const r = rakenna('kypsa').rail, x = teksti(r); expect(x).toContain('ti 13.10. 3 harjoitusta P10 P12 P13'); expect(x).toContain('Tänään'); expect(x).toContain('2 harjoitusta P14 P11'); expect(x).toContain('Ottelu T12'); expect(x).toContain('pe 16.10. Harjoitus T14'); ['Valmentajapalaveri', 'Syysturnaus', 'Testijakso'].forEach((s) => { const m = r.match(new RegExp('<div class="kk-rr">(?:(?!</div>).)*' + s + '(?:(?!</div>).)*</div>')); expect(m, s).not.toBeNull(); expect(m[0], s).not.toContain('kk-rtags'); });
    expect(r).not.toMatch(/Demo harjoitus/);
  });
  it('sisältö vasemmalle: Koti ja Tilanne eivät keskity leveällä näytöllä (margin-left:0)', () => {
    const VP = readFileSync(new URL('../TalentMaster_VP_v25.html', import.meta.url), 'utf8'); expect(KK.CSS).toContain('#ws-koti.kk-uusi{margin-left:0;margin-right:auto}'); expect(TT.CSS).toContain('#ws-tilanne.tt-uusi{margin-left:0;margin-right:auto}'); expect(VP).toContain("w.classList.add('kk-uusi')");
  });
  it('Rytmi (Demo FC): vanhaa ei jää — ei kolmea signaalikorttia, Koko seura -riviä, selitesiruja eikä prosenttitaulukkoa', () => {
    const h = F.kotiHTML(F.lataa('kypsa', NYT), {}); ['Koko seura', 'sig-grid', 'pulssi-taulu', 'puls-legend', 'kt-sig-3'].forEach((s) => expect(h, s).not.toContain(s)); expect((h.match(/class="kt-sig /g) || []).length).toBe(1); expect(h).not.toMatch(/<table/);
  });
});

describe('Esimerkkiseura (D167) Rytmi-näkymänä; Tilanne: ryhmärivin vasen sarake tyhjä', () => {
  it('demo: FC Demo Rytmi-vaiheessa, signaalit (ei jaksoa, katselmus, katsaus laskee) ja toiminnot pois (fn {})', () => {
    const D = KK.tmKotiDemo(NYT), v = D.koosteet[D.koosteet.length - 1], m = PU.tmPulssiRivit(D.koosteet, { nytMs: NYT, ensimmainenVk: D.ensin, jaksoVk: {}, katselmusPv: {} }), rm = KK.tmKotiRytmiMalli(m, { yhteensa: v.yhteensa, koosteJ: v.joukkueet, kalenteri: D.kalenteri, nytMs: NYT, seuraNimi: D.seuranNimi }), h = KK.tmKotiRytmiHTML(rm, { t: (x) => x, fn: {} }).main;
    expect(KK.tmKotiVaihe(m)).toBe('rytmi'); expect(rm.entries.map((e) => e.tyyppi)).toEqual(expect.arrayContaining(['ei_jaksoa', 'katselmusikkuna', 'katsaus_laskee'])); expect(h).not.toContain('onclick'); expect(teksti(h)).toContain('FC Demo · viikko');
  });
  it('Tilanne: ryhmärivin vasen sarake on tyhjä (luku toisti tekstin "· N joukkuetta")', () => {
    const Pp = (j) => ({ joukkue: j, tyyppi: 'alle_normin', osaAlue: 'tekniikka', vakavuus: 'amber', arvo: 2, teema: 'x', alaraja: false, kypsyysEstetty: null }), d = F.lataa('kypsa', NYT); d.syote.poikkeamat = ['P10 Demo', 'P11 Demo', 'P12 Demo'].map(Pp);
    const h = TT.tmTilanneHTML(TT.tmTilanneMalli(d.syote), { t: (x) => x, fn: {} }), sum = h.slice(h.indexOf('<summary class="tt-it">'), h.indexOf('</summary>')); expect(sum).toContain('<span class="tt-j" aria-hidden="true"></span>'); expect(teksti(sum)).toContain('Tekniikka alle ikätason · 3 joukkuetta'); expect(teksti(sum)).not.toMatch(/^\s*3 Tekniikka/);
  });
});

describe('D169 · signaalikortin otsikko: Cormorant --fs-h2 sekä Kodissa että Tilanteessa', () => {
  const KT = require('../lib/tm_kt_komponentit.js');
  it('jaettu .kt-sig-h = Cormorant (--kt-serif) + --fs-h2; kumpikaan sivu ei ylikirjoita sitä; molemmat määrittävät --kt-serif:n juurelleen (muuten fontti putoaa sans-serifiksi)', () => {
    expect(KT.CSS).toContain('.kt-sig-h{font-family:var(--kt-serif);font-size:var(--fs-h2,26px);font-weight:500;line-height:1.05}');
    [['Koti', KK.CSS, '.kk,.kk-rail{--kt-serif:var(--font-serif)}'], ['Tilanne', TT.CSS, '.tt{--kt-serif:var(--font-serif)']].forEach(([nimi, css, maar]) => { expect(css, nimi).toContain(maar); expect(css, nimi).not.toMatch(/\.kt-sig-h\s*\{/); });
    expect(teksti(rakenna('kypsa').h)).toBeTruthy(); expect(rakenna('kypsa').h).toContain('class="kt-sig-h"');
    const d = F.lataa('kypsa', NYT); expect(F.tilanneHTML(d)).toContain('class="kt-sig-h"');
  });
});

describe('Korjaus-PR: mobiilirivit, nuoli, viikkotunniste, D144-tagit', () => {
  const nakyvat = (h) => teksti(h) + ' ' + (h.match(/(?:title|aria-label)="[^"]*"/g) || []).join(' ');
  it('viikkotunniste (\\d{4}-W\\d{2}) ei näy käyttäjälle missään: Koti (Käynnistys, Rytmi, esimerkkiseura) ja Tilanne, kaikki fixturet, sv/en/fi', () => {
    F.TILAT.forEach((tila) => ['fi', 'sv', 'en'].forEach((kieli) => { const d = F.lataa(tila, NYT);
      [F.kotiHTML(d, { kieli }), F.tilanneHTML(d, { kieli })].forEach((h) => expect(nakyvat(h), tila + ' ' + kieli).not.toMatch(/\d{4}-W\d{2}/)); }));
    const dm = KK.tmKotiDemo(NYT), v = dm.koosteet[dm.koosteet.length - 1], m = PU.tmPulssiRivit(dm.koosteet, { nytMs: NYT, ensimmainenVk: dm.ensin, jaksoVk: {}, katselmusPv: {} });
    expect(nakyvat(KK.tmKotiRytmiHTML(KK.tmKotiRytmiMalli(m, { yhteensa: v.yhteensa, koosteJ: v.joukkueet, kalenteri: dm.kalenteri, nytMs: NYT }), { t: (x) => x, fn: {} }).main)).not.toMatch(/\d{4}-W\d{2}/);
    expect(teksti(F.kotiHTML(F.lataa('pilotti', NYT), {}))).toContain('Tilanne viikolta 42.');
  });
  it('Perheet mukana -askeleen avain on "Tilanne viikolta {vk}" (viikkonumero, ei tunnistetta)', () => {
    const km = KK.tmKotiKaynnistysMalli(PU.tmPulssiRivit(F.lataa('pilotti', NYT).koosteet, { nytMs: NYT, ensimmainenVk: '2026-W20', jaksoVk: {}, katselmusPv: {} }), { yhteensa: { n_pelaajat: 1, n_suostumus: 0 }, koosteJ: {}, nytMs: NYT }); const x = JSON.stringify(km.askeleet);
    expect(x).toContain('Tilanne viikolta {vk}'); expect(x).not.toContain('Luku koosteesta');
  });
  it('D144: "Odottaa jaksoa" ja "Ilman jaksoa" -laatikot näyttävät enintään 6 tagia + "+N"', () => {
    const k = F.kotiHTML(F.lataa('pilotti', NYT), {}), o = k.slice(k.indexOf('kk-odottaa')); expect((o.slice(0, o.indexOf('Ehdota jaksot')).match(/class="kk-tag"/g) || []).length).toBe(7); expect(teksti(o)).toContain('+8');
    const { rm } = rakenna('kypsa'); expect(rm.ilman.length).toBeLessThanOrEqual(6);
    const d = F.lataa('kypsa', NYT); Object.values(d.koosteet).forEach((kk) => Object.values(kk.joukkueet).forEach((j, i) => { if (i < 8) { j.jakso = false; j.n_jaksolla = 0; } }));
    const r = rakenna('kypsa', (dd) => { dd.koosteet.forEach((kk) => Object.values(kk.joukkueet).forEach((j, i) => { if (i < 8) { j.jakso = false; j.n_jaksolla = 0; } })); }), il = r.h.slice(r.h.indexOf('kk-odottaa'));
    expect(r.rm.ilman.length).toBeGreaterThan(6); expect((il.match(/class="kk-tag"/g) || []).length).toBe(7); expect(teksti(il)).toMatch(/\+\d+/);
  });
  it('mobiili < 600 px: listarivin toimintolinkki ja ⋯ omalle rivilleen tekstin alle; yläotsikko ei rivity (nowrap + ellipsis)', () => {
    const m = KK.CSS.match(/@media \(max-width:600px\)\{[^@]*?\}\}/)[0]; expect(m).toContain('.kk-it>.kk-ac{grid-column:2'); expect(m).toContain('.kk-it .kk-k{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis');
  });
  it('nuoli samalle riville luvun oikealle puolelle: Jaksolla nyt (Käynnistys) ja Rytmin joukkuerivi; ei .kk-perh span 2', () => {
    expect(KK.CSS).not.toMatch(/\.kk-perh\{grid-column:span 2\}/); expect(KK.CSS).toContain('.kk-jr{display:grid;grid-template-columns:90px minmax(0,1fr) auto 16px');
    const rivi = F.kotiHTML(F.lataa('pilotti', NYT), {}).match(/<div class="kk-jr"[\s\S]*?<\/div>/)[0]; expect(rivi.indexOf('kk-perh')).toBeLessThan(rivi.indexOf('kk-ar')); expect(rivi.match(/<span class="kk-(?:tn|te|nu|ar)/g)).toHaveLength(4);
  });
});

describe('VP-kytkentä: vanha Kodin pulssi-HTML poistettu', () => {
  it('tm_seuran_pulssi.js on pelkkä malli (ei HTML:ää, ei CSS:ää); VP ei kutsu tmPulssiHTML:ää; vanha CSS ei injektoida', () => {
    const VP = readFileSync(new URL('../TalentMaster_VP_v25.html', import.meta.url), 'utf8'); expect(PU.tmPulssiHTML).toBeUndefined(); expect(PU.CSS).toBeUndefined(); expect(VP).not.toContain('tmPulssiHTML'); expect(VP).not.toContain('tmPulssiTulossaHTML'); expect(VP).not.toContain('TM_SEURAN_PULSSI.CSS');
    expect(VP).toContain("window._vpKotiOpas = function"); expect(VP).toContain('kuittaa: \'_vpPulssiKuittaa\''); expect(VP).toContain('KK.tmKotiRytmiHTML(KK.tmKotiRytmiMalli(m, env), op)');
  });
});
