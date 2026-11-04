/* sv-erä 92 (QG-1:n baseline-tekstit: 10 osiota, 55 riviä + 3 kopiota Masterin kartasta VP:hen) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama palautus merkki merkiltä. Malli: i18n_era90_vienti.test.js. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_92_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_92_gemini.json';
const P = JSON.parse(teksti(PALAUTUS)).osiot, G = JSON.parse(teksti(LAHETYS)).osiot;
const V = require('../scripts/i18n_vie_sv_era92.cjs');
const VP = require('../lib/tm_vp_i18n.js').TM_VP_I18N.sv, MA = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv, LIB = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, LANG = require('../lib/tm_lang.js').TM_LANG;
const svKoodissa = (o, k) => o.startsWith('vp.') ? VP[k] : o.startsWith('master.') ? MA[k] : o.startsWith('lib.') ? LIB[k] : LANG.sv[k.split('.')[0]][k.split('.')[1]];
describe('sv-erä 92 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 55 riviä / 10 osiota = lähetetty erä; lähetetty sv tyhjä; paikkamerkit säilyvät', () => {
    expect(createHash('sha256').update(teksti(PALAUTUS)).digest('hex').startsWith('fb14f77c')).toBe(true);
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); expect(Object.keys(P)).toHaveLength(10);
    let n = 0;
    for (const o of Object.keys(G)) {
      expect(Object.keys(P[o].rivit).sort(), o).toEqual(Object.keys(G[o].rivit).sort());
      for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(G[o].rivit[k].sv, k).toBe(''); expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(G[o].rivit[k].fi); expect(JSON.stringify((r.fi.match(/\{\w+\}/g) || []).sort()), k).toBe(JSON.stringify((r.sv.match(/\{\w+\}/g) || []).sort())); }
    }
    expect(n).toBe(55);
  });
  it('kaikki 55 riviä koodissa: sv = palautus merkki merkiltä oikeassa kartassa', () => {
    let n = 0; for (const o of Object.keys(P)) for (const [k, r] of Object.entries(P[o].rivit)) { expect(svKoodissa(o, k), o + ' / ' + k).toBe(r.sv); n++; }
    expect(n).toBe(55);
  });
  it('kopiot Master → VP ovat merkki merkiltä samat (ei uutta ruotsia)', () => {
    expect(V.KOPIOT_MASTER_VP).toEqual(['Ei luokkaa', '{n}/{yht} mitattu tuoreesti', '{n} ilman tulosta']);
    for (const k of V.KOPIOT_MASTER_VP) { expect(typeof MA[k], k).toBe('string'); expect(VP[k], k).toBe(MA[k]); }
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => {
    const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toEqual({ vp: 0, master: 0, lib: 0, lang: 0 }); expect(t.ohitettu).toHaveLength(58);
  });
  it('rikkinäinen palautus kaatuu eikä kirjoita mitään (negatiivitesti, tilapäinen kopio ennen vientiä)', async () => {
    const fs = await import('fs'), os = await import('os'), path = await import('path'), { execFileSync } = await import('child_process'), kopio = fs.mkdtempSync(path.join(os.tmpdir(), 'era92-'));
    const juuri = new URL('..', import.meta.url).pathname, kohteet = ['lib/tm_vp_i18n.js', 'lib/tm_master_i18n.js', 'lib/tm_lib_i18n.js', 'lib/tm_lang.js'];
    fs.cpSync(path.join(juuri, 'lib'), path.join(kopio, 'lib'), { recursive: true }); fs.mkdirSync(path.join(kopio, 'docs/i18n'), { recursive: true });
    for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Pelaaja_v7.html', LAHETYS, PALAUTUS]) fs.copyFileSync(path.join(juuri, f), path.join(kopio, f));
    // kartat vientiä edeltävään tilaan (HEAD = ennen vientiä; tm_lang: nykyinen ilman erän sv-riviä) → vienti yrittäisi kirjoittaa
    for (const f of kohteet.slice(0, 3)) fs.writeFileSync(path.join(kopio, f), execFileSync('git', ['show', 'HEAD:' + f], { cwd: juuri, encoding: 'utf8' }));
    fs.writeFileSync(path.join(kopio, kohteet[3]), fs.readFileSync(path.join(juuri, kohteet[3]), 'utf8').split('\n').filter((l) => !l.includes('// erä 92 (PM)')).join('\n'));
    expect(V.vie({ juuri: kopio, kirjoita: false }).virheet).toEqual([]);   // ehjä palautus kelpaisi
    const pf = path.join(kopio, PALAUTUS), j = JSON.parse(fs.readFileSync(pf, 'utf8'));
    j.osiot['vp.tm_vp_tilanne'].rivit['{n} joukkuetta'].sv = j.osiot['vp.tm_vp_tilanne'].rivit['{n} joukkuetta'].sv.replace('{n}', '');   // paikkamerkki katoaa
    delete j.osiot['master.html'].rivit['{n} vs. syksy'];   // avainjoukko ≠ lähetetty erä
    fs.writeFileSync(pf, JSON.stringify(j));
    const ennen = kohteet.map((f) => fs.readFileSync(path.join(kopio, f), 'utf8'));
    const t = V.vie({ juuri: kopio, kirjoita: true });
    expect(t.virheet.join('|')).toContain('{n} joukkuetta: paikkamerkit eroavat'); expect(t.virheet.join('|')).toContain('master.html: avaimet ≠ lähetetty erä'); expect(t.kirjoitettu).toBe(false);
    expect(kohteet.map((f) => fs.readFileSync(path.join(kopio, f), 'utf8'))).toEqual(ennen);
  });
  it('erä 92 ei ole enää odottavien listalla (LIB_SV_ODOTTAA tyhjä; ODOTTAVAT_ERAT ei sisällä 92)', () => {
    expect(teksti('tests/i18n_sv_era_lib.test.js')).toMatch(/const LIB_SV_ODOTTAA = \[\]/); const rivi = teksti('tools/i18n/sv_kattavuus.mjs').match(/const ODOTTAVAT_ERAT = \[([^\]]*)\];/); expect(rivi).toBeTruthy(); expect(rivi[1].split(',').map((x) => x.trim())).not.toContain('92');
  });
});
