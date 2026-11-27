/* L1 (docs/KYLMA_AVAUS_DIAGNOOSI.md §4): Master lataa sv/en-sanakirjat laiskasti (sama malli kuin Kehitystyöpöytä #1272, lib/tm_kieli_paketit.js).
   Staattiset vartijat: paketit EIVÄT ole <script src> (fi-tilassa ei latausta); lataus odotetaan ENNEN renderiä kolmessa kohdassa; App Check -järjestys ja SW-allowlist koskemattomia. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
const HTML = readFileSync(new URL('../TalentMaster_Master_v16.html', import.meta.url), 'utf8');
const PAKETIT = ['tm_lib_i18n', 'tm_i18n_common', 'tm_master_i18n', 'tm_teknistaktiset_sv'];

describe('L1 · Master: sv/en-kielipaketit laiskasti', () => {
  it('neljä sanakirjaa on text/plain + data-tm-kielipaketti (ei eager <script src>), HTML-järjestys säilyy', () => {
    PAKETIT.forEach((p) => {
      expect(HTML, p + ' ei saa olla eager').not.toContain('<script src="lib/' + p + '.js"></script>');
      expect(HTML.split('<script type="text/plain" data-tm-kielipaketti src="lib/' + p + '.js"></script>').length - 1, p).toBe(1);
    });
    const pos = PAKETIT.map((p) => HTML.indexOf('data-tm-kielipaketti src="lib/' + p + '.js"'));
    expect(pos[0]).toBeLessThan(pos[1]); expect(pos[1]).toBeLessThan(pos[2]); expect(pos[2]).toBeLessThan(pos[3]);   // lib → common → master → teknistaktiset_sv (kuten ennen)
  });
  it('loader (stubit) ladataan tm_lang.js:n JÄLKEEN ja ENNEN ensimmäistä stubeja käyttävää kirjastoa; tm_lang.js pysyy eager (kielen init)', () => {
    const lang = HTML.indexOf('<script src="lib/tm_lang.js"></script>'), loader = HTML.indexOf('<script src="lib/tm_kieli_paketit.js"></script>');
    expect(lang).toBeGreaterThan(-1); expect(loader).toBeGreaterThan(lang);
    expect(loader).toBeLessThan(HTML.indexOf('<script src="lib/tm_phv_tila.js"></script>'));
    expect(loader).toBeLessThan(HTML.indexOf('<script src="lib/tm_tt_sv_valinta.js"></script>'));
  });
  it('lataus odotetaan ennen renderiä: auth-kuuntelijan alussa, seura.kieli:n jälkeen ennen sweepiä, demo-kirjautumisessa, kielenvaihdossa (logiikka libissä: kuoren rivikatto)', () => {
    const a = HTML.indexOf('_auth.onAuthStateChanged(async user => {');
    expect(HTML.slice(a, a + 140)).toContain('await window.tmKieliPaketit.valmiit();');
    const s0 = HTML.indexOf('tmKieliInitSeura(_sd.exists'), seura = HTML.slice(s0, s0 + 700);
    expect(seura.indexOf('await window.tmKieliPaketit.valmiit()')).toBeGreaterThan(-1); expect(seura.indexOf('await window.tmKieliPaketit.valmiit()')).toBeLessThan(seura.indexOf('masterLokalisoi()'));
    const d = HTML.indexOf('async function loginDemo()'), dd = HTML.slice(d, d + 250); expect(dd.indexOf('await window.tmKieliPaketit.valmiit()')).toBeGreaterThan(-1); expect(dd.indexOf('valmiit()')).toBeLessThan(dd.indexOf('_kaynnistaDemoTila()'));
    const v = HTML.indexOf('function masterVaihdaKieli('), fn = HTML.slice(v, v + 800);
    expect(fn).toContain('window.tmKieliPaketit.vaihda(lang, function () { if (typeof masterLokalisoi'); expect(fn).toContain('setWs(_ws); } });');   // render vain vaihda():n callbackissa
  });
  it('lib: valmiit() ei heitä (epäonnistunut lataus → false, teksti jää fi:ksi); vaihda(): fi synkroninen, sv/en lupauksen jälkeen; ei App Check -kytköstä', () => {
    const L = readFileSync(new URL('../lib/tm_kieli_paketit.js', import.meta.url), 'utf8');
    expect(L).toContain('.catch(function () { return false; })'); expect(L).toContain("if (kieli && kieli !== 'fi') lataa(kieli).then(render, render); else render();"); expect(L).not.toMatch(/appcheck|AppCheck|firebase/i);
  });
  it('App Check -järjestys: tm_appcheck.js ladataan ennen kielipaketteja ja site key vain libissä', () => {
    expect(HTML.indexOf('<script src="lib/tm_appcheck.js"></script>')).toBeGreaterThan(-1);
    expect(HTML.indexOf('<script src="lib/tm_appcheck.js"></script>')).toBeLessThan(HTML.indexOf('data-tm-kielipaketti'));
    expect(HTML).not.toMatch(/6L[a-zA-Z0-9_-]{38}/);
  });
});
