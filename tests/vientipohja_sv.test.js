/* Vientipohja ruotsiksi (Sibbo-valmius 1.11.): scripts/luo_harjoitepankki_pohja.js --kieli sv + kuittaustuonti lukee sv-pohjan samoin kuin fi-pohjan.
 * Code EI kirjoita ruotsia (CLAUDE.md §0): testit käyttävät KEINOTEKOISTA sanastoa (SV<id>), joka todistaa mekanismin; oikeat sv-tekstit tulevat Gemini-erästä 53 (scripts/vientipohja_sv.json). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import crypto from 'crypto';
const require = createRequire(import.meta.url), JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const G = require('../scripts/luo_harjoitepankki_pohja.js'), T = require('../scripts/tuo_harjoitepankki_kuittaus.js'), VK = require('../scripts/vientipohja_kieli.js'), H = require('../lib/tm_harjoitepankki.js');
const { lueXlsx, lueZip } = require('../scripts/xlsx_luku.js'), { kirjoitaXlsx } = require('../scripts/xlsx_kirjoita.js'), VIE = require('../scripts/i18n_vie_sv_vientipohja.cjs');

// keinotekoinen sanasto: jokainen teksti SV<id> (paikanvaraajat säilyvät), konseptit SVK<n>
const fi = VK.kaannettavat();
const tekstit = {}; for (const [id, f] of Object.entries(fi)) tekstit[id] = 'SV<' + id + '>' + (f.match(/\{\w+\}/g) || []).map((m) => ' (' + m + ')').join('');
const konseptit = {}; H.KONSEPTIT.forEach(([, n], i) => { konseptit[n] = 'SVK' + (i + 1); });
const SANASTO = { tekstit, konseptit };
// hajautus PURETUSTA sisällöstä (deflate-tavut vaihtelevat zlib-version mukaan → CI ≠ paikallinen)
const sha = (b) => { const z = lueZip(b), h = crypto.createHash('sha256'); for (const k of Object.keys(z).sort()) h.update(k + '\0').update(z[k]); return h.digest('hex'); };

describe('fi-pohja ennallaan (refaktorointi kielitauluun)', () => {
  it('sisältötarkka: sama xlsx kuin ennen kielitaulua (SJK/120, KPV/oletus, Sibbo-Vargarna/150)', () => {
    expect(sha(G.luoPohja({ seura: 'SJK', rivit: 120 }))).toBe('3abf1c1333c8a50140c9f4c85ab0345ea4a529cf01f8aa68731e95f450b4c7f4');
    expect(sha(G.luoPohja({ seura: 'KPV' }))).toBe('feaeae64cf0faaa7ea93afc46b83872e90ac547d5d663f160197274f813830e4');
    expect(sha(G.luoPohja({ seura: 'Sibbo-Vargarna', rivit: 150 }))).toBe('9d702a6a0dc7da88cbbf80d566b34762ded22d92524785c8a551ebbcd3242ea7');
  });
  it('kieli: fi = oletus', () => { expect(sha(G.luoPohja({ seura: 'X', kieli: 'fi' }))).toBe(sha(G.luoPohja({ seura: 'X' }))); });
});

describe('sv-pohja: rakenne', () => {
  const buf = G.luoPohja({ seura: 'SJK', rivit: 120, kieli: 'sv', sanasto: SANASTO }), x = lueXlsx(buf);
  it('välilehtien nimet, otsikot, OHJE ja listat kielitaulusta; sisäiset avaimet (id, video_url, kuittaus-arvot) ennallaan', () => {
    expect(Object.keys(x.sheets).sort()).toEqual(['SV<val_harjoitteet>', 'SV<val_listat>', 'SV<val_ohje>']);
    const ots = x.sheets['SV<val_harjoitteet>'][0];
    expect(ots[0]).toBe('id'); expect(ots[10]).toBe('video_url'); expect(ots[3]).toBe('SV<ots_teema> (SJK)');
    expect(ots[1]).toBe('SV<ots_nimi>'); expect(ots[11]).toBe('SV<ots_kuittaus>');
    const l = x.sheets['SV<val_listat>'];
    expect(l.map((r) => r[0]).slice(0, 14)).toEqual(Array.from({ length: 14 }, (_, i) => 'SVK' + (i + 1))); expect(l[14][0]).toBe('SV<ei_konseptia>');
    expect(l.map((r) => r[2]).filter(Boolean)).toEqual(['SV<kuit_ok>', 'SV<kuit_muutettu>', 'SV<kuit_poista>']);   // näyttöarvot sv; tallennettava arvo pysyy OK · Muutettu · Poista (tuonti muuntaa, ks. alla)
    const o = x.sheets['SV<val_ohje>'].map((r) => r[0]); expect(o[0]).toBe('SV<ohje_otsikko> (SJK)'); expect(o.filter((t) => /^• /.test(t))).toHaveLength(15); expect(o.join('\n')).toContain('SV<ohje_3> (SJK) (SV<lah_muu>)'); expect(o.join('\n')).toContain('SV<ohje_5v> (SV<kuit_ok>) (SV<kuit_muutettu>) (SV<kuit_poista>)');   // rivi 5: arvot omalla kielellä   // {muu} → listan sv-arvo
  });
  it('pudotusvalikot viittaavat sv-välilehteen (lainausmerkit kun nimessä muuta kuin ASCII-kirjaimia/numeroita); fi-kaava ennallaan', () => {
    const xml = lueZip(buf)['xl/worksheets/sheet2.xml'].toString('utf8');
    expect(xml).toContain('<formula1>\'SV&lt;val_listat&gt;\'!$A$1:$A$15</formula1>'.replace(/&lt;/g, '&lt;'));
    const xf = lueZip(G.luoPohja({ seura: 'SJK', rivit: 120 }))['xl/worksheets/sheet2.xml'].toString('utf8'); expect(xf).toContain('<formula1>listat!$A$1:$A$15</formula1>');
  });
  it('puuttuva sv-teksti: heittää ellei --salli-puutteet (silloin puuttuva jää suomeksi); oikea sv-tiedosto on tyhjä kunnes erä 53 viedään', () => {
    const osa = { tekstit: { ots_nimi: 'X' }, konseptit }; expect(() => G.luoPohja({ seura: 'SJK', kieli: 'sv', sanasto: osa })).toThrow(/puuttuu/);
    const sallittu = lueXlsx(G.luoPohja({ seura: 'SJK', kieli: 'sv', sanasto: osa, salliPuutteet: true })); expect(sallittu.sheets.Harjoitteet[0][2]).toBe('pankki'); expect(sallittu.sheets.Harjoitteet[0][1]).toBe('X');   // sv-teksti jos olemassa, muuten fi
  });
  it('CLI: --kieli sv ilman sv-tekstejä → exit 2 ja selitys; tuntematon kieli → exit 2', () => {
    const d = mkd(), r = spawnSync('node', ['scripts/luo_harjoitepankki_pohja.js', '--seura-nimi', 'SJK', '--kieli', 'sv', '--ulos', join(d, 'a.xlsx')], { cwd: JUURI, encoding: 'utf8' });
    if (Object.keys(VK.lataaSv()).length === 0) { expect(r.status).toBe(2); expect(r.stderr).toMatch(/erä 53/); } else expect(r.status).toBe(0);
    expect(spawnSync('node', ['scripts/luo_harjoitepankki_pohja.js', '--kieli', 'de', '--ulos', join(d, 'b.xlsx')], { cwd: JUURI, encoding: 'utf8' }).status).toBe(2);
  });
});
function mkd() { return mkdtempSync(join(tmpdir(), 'vps-')); }

describe('kuittaustuonti: sv-pohja → dry-run → sama tulos kuin fi-pohja', () => {
  // sama sisältö kahdella kielellä: otsikot + data-rivit (sv: sv-arvot listoista); kierto oikean xlsx:n läpi
  const rivit = [
    { id: 'kpvh_01', nimi: 'A', mita: 0, toiss: 2, lahde: 'oma', video: 'https://youtu.be/x', ika: 'alle 8, 8–9', kuittaus: 0 },
    { id: 'kpvh_02', nimi: 'B', mita: 1, toiss: -1, lahde: 'soccertutor', video: '', ika: '10–11', kuittaus: 1 },
    { id: 'kpvh_03', nimi: 'C', mita: 14, toiss: -1, lahde: 'muu', video: 'http://eihttps.fi', ika: '', kuittaus: 2 },
    { id: 'kpvh_04', nimi: 'D', mita: 3, toiss: -1, lahde: '', video: '', ika: '12–13', kuittaus: -1 },
  ];
  function tyokirja(kieli) {
    const pohja = lueXlsx(G.luoPohja(kieli === 'sv' ? { seura: 'SJK', kieli: 'sv', sanasto: SANASTO } : { seura: 'SJK' })), nimet = Object.keys(pohja.sheets);
    const harj = nimet.find((n) => n === (kieli === 'sv' ? 'SV<val_harjoitteet>' : 'Harjoitteet')), ots = pohja.sheets[harj][0];
    const listat = pohja.sheets[nimet.find((n) => n === (kieli === 'sv' ? 'SV<val_listat>' : 'listat'))], kons = (i) => (i < 0 ? '' : listat[i][0]), lah = { oma: listat[0][1].replace(/\(.*\)/, '(SJK)') , soccertutor: listat[1][1], spl: listat[2][1], muu: listat[3][1], '': '' };
    const data = rivit.map((r) => ots.map((h, c) => ({ 0: r.id, 1: r.nimi, 2: 'P', 3: 'T', 4: 'Tekniikka', 5: r.ika, 6: 'tavoite', 7: kons(r.mita), 8: kons(r.toiss), 9: lah[r.lahde], 10: r.video, 11: r.kuittaus < 0 ? '' : listat[r.kuittaus][2], 12: '' }[c])));
    // OHJE ensin (kuten oikeassa pohjassa) → tuonnin on löydettävä Harjoitteet-välilehti nimellä, ei ensimmäisenä
    return lueXlsx(kirjoitaXlsx({ sheets: [{ nimi: nimet.find((n) => /ohje/i.test(n)), rivit: pohja.sheets[nimet.find((n) => /ohje/i.test(n))] }, { nimi: harj, rivit: [ots].concat(data) }, { nimi: nimet.find((n) => /listat/i.test(n)), rivit: listat }] })).sheets;
  }
  it('rivit ja raportti identtiset (suunnittele, dry-run), kun sv-pohjan otsikot ja listan arvot ovat sv', () => {
    const fiR = T.suunnittele(T.valitseTaulu(tyokirja('fi')), null), svR = T.suunnittele(T.valitseTaulu(tyokirja('sv'), { sanasto: SANASTO }), null);
    expect(svR.rivit).toEqual(fiR.rivit); expect(svR.raportti).toEqual(fiR.raportti);
    expect(T.tulosta(svR, { seura: 'sjk' })).toBe(T.tulosta(fiR, { seura: 'sjk' }));
    expect(fiR.raportti.tuodaan).toEqual(['kpvh_01', 'kpvh_02']); expect(svR.rivit.find((x) => x.id === 'kpvh_01').patch).toMatchObject({ konsepti: 'y_h0', konsepti_toissijainen: 'y_h2', lahde_tyyppi: 'oma', video_url: 'https://youtu.be/x' });
    expect(svR.rivit.find((x) => x.id === 'kpvh_03').patch).toBeNull(); expect(svR.raportti.esitaytto.eiKonseptia).toEqual(['kpvh_03']);
  });
  it('KUITTAUS-ALIAKSET: sv-näyttöarvot (SV<kuit_*>) → sama dry-run kuin fi-arvoilla; tallennettava arvo ennallaan; fi-arvot toimivat myös sv-pohjassa; sekaisin käytettynä', () => {
    const fiR = T.suunnittele(T.valitseTaulu(tyokirja('fi')), null), sv = tyokirja('sv'), svNimi = 'SV<val_harjoitteet>';
    expect(sv[svNimi].map((r) => r[11] || '').slice(1)).toEqual(['SV<kuit_ok>', 'SV<kuit_muutettu>', 'SV<kuit_poista>', '']);   // pohjaan kirjoitetut arvot ovat sv
    const svR = T.suunnittele(T.valitseTaulu(sv, { sanasto: SANASTO }), null); expect(svR.raportti.kuittaus).toEqual(fiR.raportti.kuittaus); expect(svR.rivit.map((x) => x.kuittaus)).toEqual(fiR.rivit.map((x) => x.kuittaus));   // sisäinen: ok · muutettu · poista · tyhja
    // fi-arvot sv-pohjassa
    const sekoitettu = { [svNimi]: sv[svNimi].map((r, i) => (i === 0 ? r : r.map((c, j) => (j === 11 ? ({ 'SV<kuit_ok>': 'OK', 'SV<kuit_muutettu>': 'SV<kuit_muutettu>', 'SV<kuit_poista>': 'Poista' }[c] ?? c) : c)))) };
    expect(T.suunnittele(T.valitseTaulu(sekoitettu, { sanasto: SANASTO }), null).raportti.kuittaus).toEqual(fiR.raportti.kuittaus);
  });
  it('ilman erää 54 (kuittaus-näyttöarvot puuttuvat sv-taulusta): sv-pohja rakentuu, kuittaus-arvot suomeksi, rivi 5 = ohje_5 — ei "puuttuu"-virhettä', () => {
    const ilman = { tekstit: Object.fromEntries(Object.entries(tekstit).filter(([id]) => !VK.VALINNAISET.includes(id))), konseptit };
    const x2 = lueXlsx(G.luoPohja({ seura: 'SJK', kieli: 'sv', sanasto: ilman })); expect(x2.sheets['SV<val_listat>'].map((r) => r[2]).filter(Boolean)).toEqual(['OK', 'Muutettu', 'Poista']);
    expect(x2.sheets['SV<val_ohje>'].map((r) => r[0]).join('\n')).toContain('SV<ohje_5>'); expect(x2.sheets['SV<val_ohje>'].map((r) => r[0]).join('\n')).not.toContain('ohje_5v');
  });
  it('sv-otsikot tunnistetaan (ei vain fi): sv-taulukko ilman sanastoa ei kelpaa, sanaston kanssa kelpaa; fi-taulu kelpaa molemmilla', () => {
    const sv = tyokirja('sv'); expect(() => T.valitseTaulu({ 'SV<val_harjoitteet>': sv['SV<val_harjoitteet>'] })).toThrow(/puuttuvat sarakkeet|ei löydy/);
    expect(T.valitseTaulu(sv, { sanasto: SANASTO })).toHaveLength(4); expect(T.valitseTaulu(tyokirja('fi'), { sanasto: SANASTO })).toHaveLength(4);
  });
  it('välilehti valitaan nimellä (OHJE ensimmäisenä ei haittaa), tai otsikoiden perusteella jos nimi on tuntematon', () => {
    const fiS = tyokirja('fi'); expect(Object.keys(fiS)[0]).toBe('OHJE'); expect(T.valitseTaulu(fiS)).toHaveLength(4);
    expect(T.valitseTaulu({ OHJE: fiS.OHJE, Outo: fiS.Harjoitteet })).toHaveLength(4);
  });
});

describe('sv-tekstien vienti (Gemini-erä 53 → scripts/vientipohja_sv.json)', () => {
  const palautus = (muokkaa) => { const rivit = {}; for (const [id, f] of Object.entries(fi)) rivit[id] = { fi: f, sv: tekstit[id] }; if (muokkaa) muokkaa(rivit); return { osiot: { vientipohja: { rivit } } }; };
  it('täydellinen palautus → kirjoitetaan; tulos toimii kielitaulussa', () => {
    const kohde = join(mkd(), 'sv.json'), t = VIE.vie({ palautus: palautus(), kohde, kirjoita: true }); expect(t).toMatchObject({ virheet: [], kirjoitettu: true, yhteensa: Object.keys(fi).length });
    expect(JSON.parse(readFileSync(kohde, 'utf8')).tekstit).toEqual(tekstit); expect(VIE.vie({ palautus: palautus(), kohde, kirjoita: true }).kirjoitettu).toBe(false);   // idempotentti
  });
  it('kaatuu: puuttuva rivi, tyhjä sv, paikanvaraajat eroavat, ylimääräinen rivi — mitään ei kirjoiteta', () => {
    const kohde = join(mkd(), 'sv.json');
    for (const m of [(r) => { delete r.ots_nimi; }, (r) => { r.ots_nimi.sv = ' '; }, (r) => { r.ots_teema.sv = 'ilman paikanvaraajaa'; }, (r) => { r.ylimaarainen = { fi: 'x', sv: 'y' }; }]) {
      const t = VIE.vie({ palautus: palautus(m), kohde, kirjoita: true }); expect(t.virheet.length).toBeGreaterThan(0); expect(t.kirjoitettu).toBe(false);
    }
  });
  it('erä 53: osio vientipohja sisältää täsmälleen käännettävät tekstit, sv tyhjä (Code ei kirjoita ruotsia)', () => {
    const E = JSON.parse(readFileSync(join(JUURI, 'docs/i18n/sv_kaannoserae_53_gemini.json'), 'utf8')).osiot.vientipohja.rivit;
    expect(Object.keys(E).sort()).toEqual(Object.keys(fi).filter((id) => !VK.VALINNAISET.includes(id)).sort());   // valinnaiset (kuittaus-aliakset, ohje_5v) tulevat erästä 54 for (const [id, r] of Object.entries(E)) { expect(r.fi, id).toBe(fi[id]); expect(r.sv, id).toBe('');   // lähetetty erätiedosto jää tyhjäksi; sv on palautuksessa ja scripts/vientipohja_sv.json:ssa }
    for (const k of ['id', 'video_url', 'OK', 'Muutettu', 'Poista']) expect(Object.values(E).map((r) => r.fi)).not.toContain(k);   // sisäiset avaimet eivät mene käännettäviksi
  });
});
