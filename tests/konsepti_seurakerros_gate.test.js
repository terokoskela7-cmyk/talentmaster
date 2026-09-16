/**
 * TalentMaster™ — Seurakerros TIER 1 · KYTKENTÄ- JA DATA-INTEGRITEETTIPORTTI.
 *
 * Yksikkösemantiikka on tests/konsepti_seurakerros.test.js:ssä. Tämä sviitti lukitsee sen,
 * että kerros on OIKEASTI KYTKETTY appeihin ja ettei seuran vapaateksti joudu käännöskoneeseen:
 *
 *   A) resolvoija ladataan molemmissa apeissa, kaanonin JÄLKEEN (lukee kaanonin globaaleista)
 *   B) konseptin lukukohdat kulkevat resolvoijan läpi — ei suoraa TM_TT_YOUTH-lukua renderissä
 *   C) sv-kerros OHITTAA seuran korvaamat kentät (`_seura_kentat`)
 *   D) RUNTIME: sv-tilassa seuran suomi renderöityy SUOMEKSI, kaanonin kenttä RUOTSIKSI
 *   E) kerros ladataan ennen renderiä ja tyhjennetään seuranvaihdossa (eristys)
 *
 * (D) on briefin reunaehto A: seuran teksti on DATAA (kuten TM_TESTI_OHJEET-sidecar tai pelaajan
 * muistiinpanot), ei chromea. Render-gate ei voi valvoa sitä — se ei ole lähdeliteraali — joten
 * tämä testi on ainoa vartija.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
const MASTER = readFileSync(join(ROOT, 'TalentMaster_Master_v16.html'), 'utf8');

describe('A — resolvoija on kytketty molempiin appeihin', () => {
  for (const [nimi, src] of [['VP_v25', VP], ['Master_v16', MASTER]]) {
    it(`${nimi} lataa lib/tm_konsepti_resolve.js kaanonin JÄLKEEN`, () => {
      const kaanon = src.indexOf('lib/tm_teknistaktiset.js?v=');
      const kerros = src.indexOf('lib/tm_konsepti_resolve.js?v=');
      expect(kaanon).toBeGreaterThan(0);
      expect(kerros).toBeGreaterThan(kaanon);   // järjestys: resolvoija lukee kaanonin globaaleista
    });
  }
  it('kaanon-lib on yhä read-only (ei kirjoituksia libiin — reunaehto B)', () => {
    const lib = readFileSync(join(ROOT, 'lib', 'tm_teknistaktiset.js'), 'utf8');
    expect(lib).toContain('ÄLÄ MUOKKAA KÄSIN');
    // resolvoija ei saa mutatoida kaanonia
    const res = readFileSync(join(ROOT, 'lib', 'tm_konsepti_resolve.js'), 'utf8');
    expect(res).not.toMatch(/TM_TT_YOUTH\s*(\[[^\]]*\])?\s*=[^=]/);
    expect(res).not.toMatch(/TM_TT_FUNDAMENTIT\s*(\[[^\]]*\])?\s*=[^=]/);
  });
});

describe('B — konseptin lukukohdat kulkevat resolvoijan läpi', () => {
  // Master: sallitut BARE-kohdat = apurit itse (_mTtItems/_mTtKys/_msSiltaKonsepti-fallback).
  it('Master: ei suoraa tmTtItems/tmTtKysymykset/TM_TT_YOUTH-lukua apureiden ulkopuolella', () => {
    const rivit = MASTER.split('\n');
    const bare = [];
    rivit.forEach((l, i) => {
      if (!/tmTtItems\(|tmTtKysymykset\(|TM_TT_YOUTH\[/.test(l)) return;
      if (/function _mTtItems|function _mTtKys|function _msSiltaKonsepti/.test(l)) return;
      // apureiden rungot: tunnistetaan siitä että rivi on _mTt*/_msSilta*-funktion sisällä
      const konteksti = rivit.slice(Math.max(0, i - 6), i + 1).join('\n');
      if (/function _mTtItems|function _mTtKys|function _msSiltaKonsepti/.test(konteksti)) return;
      bare.push(`${i + 1}: ${l.trim().slice(0, 90)}`);
    });
    expect(bare).toEqual([]);
  });
  it('Master: apurit ovat olemassa ja käyttävät resolvoijaa', () => {
    expect(MASTER).toContain('function _mTtItems(pp)');
    expect(MASTER).toContain('tmKonseptiListaa(kaanon, _mSeuraId())');
    expect(MASTER).toContain('function _mKonseptiByAvain(avain)');
    expect(MASTER).toContain('tmKonseptiResolvoi(avain, _mSeuraId())');
  });
  it('VP: _ttKonsepti resolvoi TIER 1:n ja listat käyttävät tmKonseptiListaa', () => {
    expect(VP).toContain('function _ttResolvoi(item)');
    expect(VP).toContain('tmKonseptiResolvoi(item.avain, _ttSeuraId())');
    expect(VP).toContain('function _ttSeuraLista(arr)');
    expect(VP).toContain('tmKonseptiListaa(arr || [], _ttSeuraId())');
    expect(VP).toContain('function _ttItems(p) { return _ttSeuraLista(');
  });
});

describe('C+D — sv-kerros ei käännä seuran vapaatekstiä (reunaehto A)', () => {
  let S;   // VP:n TT-i18n-lohko ajettuna sandboxissa
  const SID = 'testiseura';

  beforeAll(() => {
    const rivit = VP.split('\n');
    const lo = rivit.findIndex((l) => l.includes('[TT-I18N-ALKU]'));
    const hi = rivit.findIndex((l) => l.includes('[TT-I18N-LOPPU]'));
    expect(lo).toBeGreaterThan(0);
    expect(hi).toBeGreaterThan(lo);
    const lohko = rivit.slice(lo, hi).join('\n');

    const sb = { console: { log() {}, warn() {}, error() {} } };
    sb.window = sb;
    vm.createContext(sb);
    for (const f of ['lib/tm_teknistaktiset.js', 'lib/tm_teknistaktiset_sv.js', 'lib/tm_konsepti_resolve.js']) {
      vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), sb);
    }
    // VP-kontekstin minimivaste: kieli sv + seuraId + ei demoa
    vm.runInContext("var _vpTaksLang = function () { return 'sv'; }; var _seuraId = '" + SID + "'; var _isDemoMode = false;", sb);
    vm.runInContext(lohko, sb);
    S = sb;
  });

  it('ilman seuraoverridea kaanonin nimi kääntyy ruotsiksi (sv-kerros toimii)', () => {
    S.tmKonseptiAsetaKerros(SID, {});
    const k = S._ttKonsepti(S.tmKonseptiKaanon('y_h0'));
    expect(k.nimi).not.toBe('HAVAINNOINTI');          // sv-sidecar korvaa
    expect(typeof k.nimi).toBe('string');
    expect(k.nimi.length).toBeGreaterThan(0);
  });

  it('SEURAN korvaama kenttä renderöityy SUOMEKSI myös sv-tilassa', () => {
    S.tmKonseptiAsetaKerros(SID, { y_h0: { nimi: 'PELINLUKU', pelitilanne: 'Seuran oma kuvaus pelitilanteesta.' } });
    const k = S._ttKonsepti(S.tmKonseptiKaanon('y_h0'));
    expect(k.nimi).toBe('PELINLUKU');                            // ← EI käännetty
    expect(k.pelitilanne).toBe('Seuran oma kuvaus pelitilanteesta.');
    expect(k.lahde).toBe('seura');
    expect(k._seura_kentat.sort()).toEqual(['nimi', 'pelitilanne']);
  });

  it('SAMAAN AIKAAN kaanonin kentät kääntyvät yhä ruotsiksi', () => {
    S.tmKonseptiAsetaKerros(SID, { y_h0: { nimi: 'PELINLUKU' } });
    const kaanon = S.tmKonseptiKaanon('y_h0');
    const k = S._ttKonsepti(kaanon);
    expect(k.nimi).toBe('PELINLUKU');                            // seuran fi
    expect(k.pelitilanne).not.toBe(kaanon.pelitilanne);          // kaanonin kenttä → sv
    expect(k.kpi[0].teksti).not.toBe(kaanon.kpi[0].teksti);      // kpi ei korvattu → sv
  });

  it('seuran korvaama kpi EI kääntät (koko taulukko on seuran omaa)', () => {
    S.tmKonseptiAsetaKerros(SID, { y_h0: { kpi: [{ koodi: 'a', teksti: 'Seuran oma kriteeri' }] } });
    const k = S._ttKonsepti(S.tmKonseptiKaanon('y_h0'));
    expect(k.kpi).toEqual([{ koodi: 'a', teksti: 'Seuran oma kriteeri' }]);
  });

  it('seuran korvaamat kysymykset eivät kääntät', () => {
    S.tmKonseptiAsetaKerros(SID, { y_h0: { kysymykset: ['Mitä näit ennen kuin sait pallon?'] } });
    const k = S._ttKonsepti(S.tmKonseptiKaanon('y_h0'));
    expect(k.kysymykset).toEqual(['Mitä näit ennen kuin sait pallon?']);
  });

  it('EI-TYHJYYS: jos sv-kerros EI ohittaisi _seura_kentat-listaa, seuran nimi katoaisi', () => {
    // Todiste että ohitus tekee työn: sv-sidecarissa ON käännös y_h0.nimi:lle.
    const sv = S.TM_TT_SV || {};
    expect(typeof sv['y_h0.nimi']).toBe('string');
    expect(sv['y_h0.nimi']).not.toBe('PELINLUKU');
  });
});

describe('E — lataus ennen renderiä + eristys seuranvaihdossa', () => {
  it('VP lataa kerroksen ENNEN muita latauksia ja tyhjentää sen SA-seuranvaihdossa', () => {
    expect(VP).toContain('await lataaKonseptikerros();   // TIER 1 ENNEN renderiä');
    expect(VP).toContain("db.collection('seurat').doc(_seuraId).collection('konseptit').get()");
    const vaihto = VP.indexOf('async function superAdminVaihdaSeura');
    const tyhjennys = VP.indexOf('tmKonseptiTyhjennaKerros()', vaihto);
    expect(vaihto).toBeGreaterThan(0);
    expect(tyhjennys).toBeGreaterThan(vaihto);
  });
  it('Master lataa kerroksen ennen pelaajarenderiä', () => {
    expect(MASTER).toContain('await lataaKonseptikerros();   // TIER 1 ENNEN renderiä');
    expect(MASTER).toContain("_db.collection('seurat').doc(_seuraId).collection('konseptit').get()");
  });
  it('virhe/oikeuspuute → TYHJÄ kerros (ei toisen seuran jäänteitä)', () => {
    for (const src of [VP, MASTER]) {
      expect(src).toContain("tmKonseptiAsetaKerros(_seuraId, {});   // eristys: tyhjä kerros, EI toisen seuran jäänteitä");
    }
  });
  it('demo/kirjautumaton ei lataa seurakerrosta', () => {
    expect(VP).toContain('if (_isDemoMode || !_seuraId)');
    expect(MASTER).toContain('if (!_seuraId || _demo) return;');
  });
});

describe('Rules — kirjoitusportti on kapeampi kuin onJohtoRooli', () => {
  const RULES = readFileSync(join(ROOT, 'tm_admin', 'firestore.rules'), 'utf8');
  it('onKonseptiMuokkaaja = vp | urheilutoimenjohtaja (EI seurasihteeri, EI valmentaja)', () => {
    expect(RULES).toContain('function onKonseptiMuokkaaja(seuraId)');
    const m = RULES.match(/function onKonseptiMuokkaaja\(seuraId\) \{[\s\S]*?\n {4}\}/);
    expect(m).toBeTruthy();
    expect(m[0]).toContain("'vp', 'urheilutoimenjohtaja'");
    expect(m[0]).not.toContain('seurasihteeri');
    expect(m[0]).not.toContain('valmentaja');
  });
  it('konseptit-blokki: read koko seuralle, write vain muokkaajalle', () => {
    const m = RULES.match(/match \/konseptit\/\{konseptiAvain\} \{[\s\S]*?\n {6}\}/);
    expect(m).toBeTruthy();
    expect(m[0]).toMatch(/allow read:\s+if onSuperAdmin\(\) \|\| \(onKirjautunut\(\) && onOmaSeura\(seuraId\)\)/);
    for (const op of ['create', 'update', 'delete']) {
      expect(m[0]).toContain(`allow ${op}: if onSuperAdmin() || onKonseptiMuokkaaja(seuraId);`);
    }
  });
});
