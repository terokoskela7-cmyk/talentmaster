/* Kasvupyrähdys-fysiikka (Teron hyväksyntä 14.10.2026): lib/tm_kasvupyrahdys.js + toimintakortin suodatus. Taulu = JSON (generoitu), lähdeaineisto täsmää, päätössäännöt, korvaavuus, duplikaatit, ja VARTIJA: tunnisteet/ketjukoodit eivät näy renderöidyssä tekstissä. */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url), JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const KP = require('../lib/tm_kasvupyrahdys.js'), TK = require('../lib/tm_kt_toimintakortti.js'), GEN = require('../scripts/phv_kasvupyrahdys_vie.cjs');
const D = JSON.parse(readFileSync(GEN.JSONF, 'utf8'));
const TILAT = ['PRE', 'LAH', 'PH', 'POST', 'AN', 'tuntematon', null];

describe('data: Teron hyväksymä taulu', () => {
  it('lib vastaa JSONia (generoitu, ei käsin) ja JSONissa 116 + 25 riviä; Geminin perustelut eivät ole datassa', () => {
    expect(GEN.uusiSisalto(readFileSync(GEN.LIB, 'utf8'), D)).toBe(readFileSync(GEN.LIB, 'utf8'));
    expect(KP.TAULU).toHaveLength(116); expect(KP.UUDET).toHaveLength(25);
    for (const r of D.taulu.concat(D.uudet)) expect(Object.keys(r).filter((k) => /perustelu|gemini|kone/i.test(k)), r.id).toEqual([]);   // vain päätös + lähteen oma teksti
    for (const r of KP.TAULU.concat(KP.UUDET)) for (const k of ['e', 'n', 'j']) expect(['k', 'v', 'e'], r.id).toContain(r[k]);
  });
  it('lähdeaineisto täsmää: harjoitelogiikka D/S -rivien nimi + PHV-teksti sanatarkasti; HPP-rivit olemassa', () => {
    const H = require('../harjoitelogiikka_v4.js').PANKKI, sb = {}; const vm = require('vm'); vm.createContext(sb);
    vm.runInContext(readFileSync(join(JUURI, 'lib/hpp_rehab_protokollat.js'), 'utf8') + ';this.__e=(typeof HPP_EXERCISES!=="undefined")?HPP_EXERCISES:{};', sb);
    let n = 0;
    for (const r of KP.TAULU) {
      const m = /^([DS])\.(\w+)\.(.+)$/.exec(r.id);
      if (m && m[1] === 'D') { const h = H.D[m[2]][Number(m[3])]; expect(h.nimi, r.id).toBe(r.nimi); expect(h.phv, r.id).toBe(r.phv); n++; }
      else if (m) { const [, , ketju, rest] = m; const [vk, j] = rest.split('.'); const ryhma = H.S[ketju].find((x) => String(x.vk) === vk) || H.S[ketju][Number(vk)]; const h = ryhma.stage_tasot[Number(j)]; expect(h.nimi, r.id).toBe(r.nimi); expect(h.phv, r.id).toBe(r.phv); n++; }
      else if (r.hpp) { expect(sb.__e[r.id], r.id).toBeTruthy(); }
    }
    expect(n).toBe(41);   // 12 D + 29 S
  });
  it('korvaa-viitteet osuvat olemassa oleviin harjoitteisiin; uusien nimet ja ohjeet ovat FI-avaimissa', () => {
    const ids = new Set(KP.TAULU.map((r) => r.id.toLowerCase()));
    for (const u of KP.UUDET) { for (const id of u.korvaa) expect(ids.has(id.toLowerCase()), u.id + ' → ' + id).toBe(true); for (const s of ['nimi', 'vo', 'po', 'kp']) expect((KP.FI['kp_' + u.k + '_' + s] || '').length, u.id + s).toBeGreaterThan(5); }
  });
});

describe('päätössäännöt', () => {
  const liike = (nimi) => ({ liike: nimi, toistot: '3×' });
  it('vaihe: PRE → ennen · PH → nyt · POST/AN → jälkeen · LAH ankarampi · tuntematon (mittaamaton ikkunassa, päätös B) → ankarin · null (normaali kuorma) → ei suodatusta', () => {
    expect(['PRE', 'PH', 'POST', 'AN', 'LAH', 'tuntematon', null].map(KP.tmKpVaihe)).toEqual(['e', 'n', 'j', 'j', 'EN', 'KAIKKI', null]);
    const [nord] = KP.tmKpEtsi('Nordic Hamstring'); expect(['PRE', 'PH', 'POST', 'LAH', 'tuntematon', null].map((t) => KP.tmKpPaatos(nord, t))).toEqual(['v', 'e', 'k', 'e', 'e', 'k']);
  });
  it('NYT = ei → liike ei näy; ENNEN/JÄLKEEN → näkyy (CMJ: ennen kyllä, nyt ei, jälkeen kyllä)', () => {
    expect(KP.tmKpSuodata([liike('Kevennyshyppy (CMJ)')], 'PH').liikkeet).toEqual([]);
    expect(KP.tmKpSuodata([liike('Kevennyshyppy (CMJ)')], 'PRE').liikkeet).toHaveLength(1); expect(KP.tmKpSuodata([liike('Kevennyshyppy (CMJ)')], 'POST').liikkeet).toHaveLength(1);
    expect(KP.tmKpSuodata([liike('Kevennyshyppy (CMJ)')], null).liikkeet).toHaveLength(1);   // normaali kuorma → ei suodatusta
  });
  it('vain kevennettynä → lähteen oma ohje (kevennetty); lähteellä ei omaa ohjetta (kuntoutuspankki) → ei näytetä', () => {
    const r = KP.tmKpSuodata([liike('Naruhypyt + pohjeeksentrinen')], 'PH').liikkeet[0]; expect(r.kevennetty).toBe('Naruhypyt 2×10s kevyesti. Pohjeeksentrinen pois kasvuaikana.');
    expect(KP.tmKpSuodata([liike('Nordic Hamstring')], 'PRE').liikkeet).toEqual([]);   // HPP: ennen = vain kevennettynä, mutta lähteellä ei kevennettyä ohjetta
    expect(KP.tmKpSuodata([liike('Seuran oma kyykky')], 'PH').liikkeet).toHaveLength(1);   // tuntematon liike ei kosketa
  });
  it('sama harjoite (sama nimi, myös eri pankeissa) vain kerran; apufunktio huomioi jo käytetyt', () => {
    expect(KP.tmKpSuodata([liike('Naruhypyt + pohjeeksentrinen'), liike('naruhypyt + pohjeeksentrinen'), liike('Seuran oma kyykky'), liike('Seuran oma kyykky')], 'PRE').liikkeet).toHaveLength(2);
    expect(KP.tmKpPoistaDuplikaatit(['A', 'a ', 'B'], ['b'])).toEqual(['A']);
    expect(KP.TAULU.map((r) => KP.tmKpEtsi(r.nimi).length).filter((n) => n > 1).length).toBeGreaterThan(0);   // eri pankeissa on samannimisiä → sääntö on tarpeen
  });
  it('korvaavuus: poistunut tai osittain poistuva liike → ehdotetaan korvaavaa (kasvupyrähdysohje vain kun PH ja kyllä-päätös)', () => {
    const a = KP.tmKpSuodata([liike('Nordic Hamstring')], 'PH'); expect(a.liikkeet).toEqual([]); expect(a.korvaavat.map((v) => v.nimi)).toContain('Takareisisilta, pitkä vipu (pito)');
    expect(a.korvaavat[0].kp).toBeTruthy();
    const b = KP.tmKpSuodata([liike('Nordic Hamstring')], 'POST'); expect(b.korvaavat).toEqual([]);   // jälkeen: ei poistoa → ei korvaavaa
    const c = KP.tmKpSuodata([liike('Naruhypyt + pohjeeksentrinen')], 'PH'); expect(c.korvaavat.map((v) => v.nimi)).toContain('Pohjepito tasamaalla');   // osa pois
    const d = KP.tmKpSuodata([liike('Naruhypyt + pohjeeksentrinen')], 'PRE'); expect(d.korvaavat).toEqual([]);
    expect(KP.tmKpSuodata([liike('Nordic Hamstring')], 'PH', { ikavaihe: 'Leikkijä' }).korvaavat.map((v) => v.nimi)).not.toContain('Takareisisilta, pitkä vipu (pito)');   // ikävaihe: rakentaja/showcase
  });
});

describe('tavallinen ohjelma ja kasvuajan ohjelma (kuvapalaute 14.10.)', () => {
  const OH = [{ liike: 'Nordic Hamstring', toistot: '3×5' }, { liike: 'Naruhypyt + pohjeeksentrinen' }, { liike: 'Kyykky — hallittu', toistot: '3×8' }];
  const kortti = (tila) => TK.tmKtToimintakorttiHTML(TK.tmKtToimintakortti({ id: 'p1', jaksofokus: { konsepti_avain: 'y_h1', domeeni: 'fyysinen', ohjelma: { nimi: 'Voima', liikkeet: OH } } }, { tt: {}, phvTila: tila, phv: tila }), {});
  it('normaali kuorma (null) ja JÄLKEEN (POST/AN): tavallinen ohjelma — kaikki kolme mukana, ei "Kevennettynä"-riviä, ei "Vaihtoehto kasvuaikana" -osiota, ei "ei mitattu" -merkintää', () => {
    for (const tila of [null, undefined, 'POST', 'AN']) {
      const h = kortti(tila); for (const n of ['Nordic Hamstring', 'Naruhypyt + pohjeeksentrinen', 'Kyykky — hallittu']) expect(h, String(tila)).toContain(n);
      expect(h, String(tila)).not.toContain('data-kt-kevennetty'); expect(h, String(tila)).not.toContain('data-kt-vaihtoehdot'); expect(h, String(tila)).not.toMatch(/Kevennettynä|Vaihtoehto kasvuaikana|kasvuaikana/);
    }
  });
  it('ENNEN (PRE): tavallinen niille joiden ENNEN-arvo on kyllä (pohjeeksentrinen, kyykky)', () => {
    const h = TK.tmKtToimintakorttiHTML(TK.tmKtToimintakortti({ id: 'p1', jaksofokus: { konsepti_avain: 'y_h1', domeeni: 'fyysinen', ohjelma: { liikkeet: [{ liike: 'Naruhypyt + pohjeeksentrinen' }, { liike: 'Kyykky — hallittu' }] } } }, { tt: {}, phvTila: 'PRE', phv: 'PRE' }), {});
    expect(h).toContain('Naruhypyt + pohjeeksentrinen'); expect(h).toContain('Kyykky — hallittu'); expect(h).not.toMatch(/Kevennettynä|Vaihtoehto kasvuaikana|kasvuaikana/);
  });
  it('NYT, LAH ja mittaamaton ikkunassa (tuntematon): sama varovainen versio; vain mittaamattomalle merkintä "Kasvuvaihe ei mitattu" (linkki mittausnäkymään)', () => {
    const ulos = {};
    for (const tila of ['PH', 'LAH', 'tuntematon']) { ulos[tila] = TK.tmKtToimintakorttiHTML(TK.tmKtToimintakortti({ id: 'p1', jaksofokus: { konsepti_avain: 'y_h1', domeeni: 'fyysinen', ohjelma: { nimi: 'Voima', liikkeet: OH } } }, { tt: {}, phvTila: tila, phv: tila, mittausHref: '#pelaaja/p1/naytto' }), {}); const t = ulos[tila].replace(/<[^>]+>/g, ' '); expect(t, tila).not.toContain('Nordic Hamstring'); expect(t, tila).toContain('Vaihtoehto kasvuaikana'); expect(t, tila).toContain('Kasvuaikana tämä korvaa kyykyn ja askelkyykyn.'); }
    expect(ulos.tuntematon).toContain('data-kt-kasvuvaihe-ei-mitattu href="#pelaaja/p1/naytto"'); expect(ulos.tuntematon).toContain('Kasvuvaihe ei mitattu'); expect(ulos.PH).not.toContain('Kasvuvaihe ei mitattu'); expect(ulos.LAH).not.toContain('Kasvuvaihe ei mitattu');
    const ilman = TK.tmKtToimintakorttiHTML(TK.tmKtToimintakortti({ id: 'p1', jaksofokus: { konsepti_avain: 'y_h1', domeeni: 'fyysinen', ohjelma: { liikkeet: OH } } }, { tt: {}, phvTila: 'tuntematon' }), {}); expect(ilman).not.toContain('data-kt-kasvuvaihe-ei-mitattu');   // ei mittausreittiä → ei linkkiä
  });
  it('kuminauhakyykky: harjoitteen ohje + korvausrivi samassa muodossa kuin takareisisillalla ja pohjepidolla', () => {
    const v = KP.tmKpSuodata([{ liike: 'Kyykky — hallittu' }], 'PH').korvaavat.find((x) => x.nimi === 'Kuminauhakyykky (pito)');
    expect(v.ohje).toBe(KP.FI['kp_14_vo']); expect(v.kp.startsWith('Kasvuaikana tämä korvaa kyykyn ja askelkyykyn.')).toBe(true);
    for (const x of KP.tmKpSuodata([{ liike: 'Nordic Hamstring' }, { liike: 'Naruhypyt + pohjeeksentrinen' }, { liike: 'Kyykky — hallittu' }], 'PH').korvaavat) { expect(x.ohje.length).toBeGreaterThan(20); expect(x.kp).toMatch(/^Kasvuaikana tämä korvaa /); }
  });
  it('kasvupyrähdys (PH): Nordic ja kyykky pois, pohjeeksentrinen kevennettynä ("Pohjeeksentrinen pois kasvuaikana", ei perustelua), kolme vaihtoehtoa: takareisisilta, pohjepito, kuminauhakyykky; ei etuliite-tuplausta', () => {
    const h = kortti('PH'), t = h.replace(/<[^>]+>/g, ' ');
    expect(t).not.toContain('Nordic Hamstring'); expect(t).not.toContain('Kyykky — hallittu');
    expect(t).toContain('Naruhypyt + pohjeeksentrinen'); expect(t).toContain('Kevennettynä: Naruhypyt 2×10s kevyesti. Pohjeeksentrinen pois kasvuaikana.'); expect(t).not.toMatch(/jänne-luuliitos/);
    expect(t).toContain('Vaihtoehto kasvuaikana'); for (const n of ['Takareisisilta, pitkä vipu (pito)', 'Pohjepito tasamaalla', 'Kuminauhakyykky (pito)']) expect(t).toContain(n);
    expect(t).toContain('Kasvuaikana tämä korvaa Nordic-takareisiliikkeen.'); expect(t).not.toContain('Kasvupyrähdyksen aikana'); expect(t).not.toMatch(/kasvuaikana\.[^<]*kasvuaikana\./);
  });
  it('kevennysteksti: vain perustelulause lähtee (" — jänne-luuliitos herkkänä" / " — polven etuosa herkkä"), ohje säilyy', () => {
    const k = (nimi) => KP.tmKpSuodata([{ liike: nimi }], 'PH').liikkeet[0].kevennetty;
    expect(k('Hip flexor + askelkyykky-kävely')).toBe('Pelkkä 90/90-venytys 3×30s per puoli. Ei kyykkyä.'); expect(k('Lonkka auki + askelkävelyt')).toBe('Pelkkä 90/90-venytys 3×30s. Ei kyykkyä kasvuaikana.');
    expect(k('Pistoolikyykky + Nordic curl yhdistelmä')).toBe('Pistoolikyykky 2×6 tuettuna. Nordic curl pois kasvuaikana.');
  });
});

describe('VARTIJA: tunnisteet, ketjukoodit ja perustelut eivät näy renderöidyssä tekstissä', () => {
  const KOODI = /\b(SBL|SFL|DFL|DIAG|PIG|SL|LL|FL)\b|\bEX_[A-Z0-9_]+\b|\b[DS]\.[a-z]+(\.[a-z0-9]+)*\.\d+\b|\b[A-Z]{2,4}\.(S\d|aktivointi|decel|mech|hinge|antirot|neck|push|landing)\b/;   // versaalikoodit: kirjainkoko merkitsee (ä/ö ei ole \w → "mmällä" ei saa osua LL:ään)
  const SANAT = /perustelu|gemini|konekatsaus/i;
  const KAIKKI_NIMET = KP.TAULU.map((r) => r.nimi).concat(KP.UUDET.map((u) => KP.FI['kp_' + u.k + '_nimi']));
  const teksti = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ');
  it('kaikki 141 harjoitetta × kaikki vaiheet: renderöity kortti ei sisällä id:tä, ketjukoodia, EX_-tunnusta eikä perustelua', () => {
    const ids = KP.TAULU.map((r) => r.id).concat(KP.UUDET.map((u) => u.id));
    for (const tila of TILAT) {
      const p = { id: 'p1', jaksofokus: { konsepti_avain: 'y_h1', domeeni: 'fyysinen', ohjelma: { nimi: 'Voima', liikkeet: KAIKKI_NIMET.map((n) => ({ liike: n, toistot: '3×8' })) } } };
      const k = TK.tmKtToimintakortti(p, { tt: {}, phvTila: tila, phv: tila }), t = teksti(TK.tmKtToimintakorttiHTML(k, {}));
      for (const id of ids) expect(t.includes(id), tila + ' ' + id).toBe(false);
      expect(t, 'vaihe ' + tila).not.toMatch(KOODI); expect(t, 'vaihe ' + tila).not.toMatch(SANAT);
    }
  });
  it('korvaavat (uudet harjoitteet) ja kevennetyt ohjeet: kaikki 25 uutta renderöitynä ei sisällä koodeja; "Katso video" vain kun linkki on', () => {
    for (const u of KP.UUDET) for (const s of ['nimi', 'vo', 'po', 'kp']) { expect(KP.FI['kp_' + u.k + '_' + s], u.id + s).not.toMatch(KOODI); expect(KP.FI['kp_' + u.k + '_' + s], u.id + s).not.toMatch(SANAT); }
    const html = TK.tmKtToimintakorttiHTML(TK.tmKtToimintakortti({ id: 'p1', jaksofokus: { konsepti_avain: 'y_h1', domeeni: 'fyysinen', ohjelma: { liikkeet: [{ liike: 'Nordic Hamstring' }, { liike: 'Kyykky' }] } } }, { tt: {}, phvTila: 'PH', phv: 'PH' }), {});
    expect(html).toContain('data-kt-vaihtoehdot'); expect(html).not.toContain('Katso video');
    const v = TK.tmKtToimintakorttiHTML(TK.tmKtToimintakortti({ id: 'p1', jaksofokus: { konsepti_avain: 'y_h1', domeeni: 'fyysinen', ohjelma: { liikkeet: [{ liike: 'Kyykky', video_url: 'https://youtu.be/x' }] } } }, { tt: {}, phvTila: 'PH', phv: 'PH' }), {});
    expect(v).toContain('Katso video');
  });
  it('jokainen sivu joka lataa toimintakortin lataa myös kasvupyrähdystaulun ENNEN sitä (muuten suodatus puuttuisi hiljaa)', () => {
    for (const f of readdirSync(JUURI).filter((x) => /\.html$/.test(x))) {
      const h = readFileSync(join(JUURI, f), 'utf8'), a = h.indexOf('lib/tm_kt_toimintakortti.js'); if (a < 0) continue;
      const b = h.indexOf('lib/tm_kasvupyrahdys.js'); expect(b, f).toBeGreaterThan(-1); expect(b, f).toBeLessThan(a);
    }
  });
});
