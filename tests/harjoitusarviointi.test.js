// Harjoitusarviointi-lomake (lib/tm_harjoitusarviointi.js) — tallennuspolun karsinta (Fix 2).
// Lataa selain-IIFE vm-sandboxiin (kevyt DOM-stub) + stubattu Firestore, ja varmistaa että
// tallennettu doc sisältää VAIN aktiivisen mallin avaimet vaikka mallia on vaihdettu kesken.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import vm from 'vm';

function elem() {
  const e = {
    style: { cssText: '' }, _html: '', children: [], value: '', textContent: '', disabled: false,
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
    appendChild(c) { this.children.push(c); return c; }, remove() { }, setAttribute() { }, querySelectorAll() { return []; }
  };
  return e;
}

function makeSandbox(captured) {
  const byId = {};
  function makeColl(path) {
    return {
      doc(id) {
        return {
          collection(sub) { return makeColl(path + '/' + id + '/' + sub); },
          set() { return Promise.resolve(); },
          get() { return Promise.resolve({ exists: false, data: () => ({}) }); }
        };
      },
      add(doc) { captured.doc = doc; return Promise.resolve({ id: 'newid' }); },
      where() { return { get() { return Promise.resolve({ docs: [] }); } }; }
    };
  }
  const sandbox = {
    console, alert() { },
    document: {
      createElement() { return elem(); },
      getElementById(id) { if (!byId[id]) byId[id] = elem(); return byId[id]; },
      body: elem(), querySelectorAll() { return []; }
    },
    firebase: {
      auth() { return { currentUser: { uid: 'coach1', getIdToken() { return Promise.resolve('t'); } } }; },
      firestore: { FieldValue: { serverTimestamp() { return '__ts__'; } } }
    },
    setTimeout
  };
  sandbox.window = sandbox;
  sandbox.toast = () => { };
  sandbox._db = { collection(n) { return makeColl(n); } };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('lib/tm_eerikkila_normit.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('lib/tm_harjoitusarviointi.js', 'utf8'), sandbox);
  return sandbox;
}

describe('Harjoituslomake — doc sisältää vain aktiivisen mallin avaimet (Fix 2)', () => {
  it('malli B tallennus EI sisällä a*-avaimia (vaikka A oli täytetty ennen vaihtoa)', async () => {
    const captured = {};
    const sb = makeSandbox(captured);
    sb.TM_HARJOITUS.avaa({
      db: sb._db, firebase: sb.firebase, seuraId: 'sjk',
      config: { mallit_kaytossa: ['palloliitto', 'valmennustaidot'], oletusmalli: 'palloliitto' },
      konteksti: { joukkue: 'SJK P14', valmentaja: 'Coach', valmentajaUid: 'coach1', arvioija: 'VP', arvioijaUid: 'vp1', arviointitapa: 'havainnointi' }
    });
    // Täytä malli A:n liukurit (kerryttää _S.vastaukset.a*), sitten vaihda malliin B
    sb._haSetA8(true);
    sb.document.getElementById('ha_a1').value = '8';
    sb.document.getElementById('ha_a3').value = '7';
    sb._haSetMalli('valmennustaidot');   // _keraa() kerryttää a* → _S.vastaukset
    ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'].forEach(id => sb._haSetB(id, 4));
    sb.document.getElementById('ha_joukkue').value = 'SJK P14';
    sb.document.getElementById('ha_pvm').value = '2026-06-22';
    await sb._haTallenna();

    const doc = captured.doc;
    expect(doc).toBeTruthy();
    expect(doc.malli).toBe('valmennustaidot');
    const avaimet = Object.keys(doc.vastaukset);
    expect(avaimet.length).toBeGreaterThan(0);
    expect(avaimet.every(k => k[0] === 'b')).toBe(true);     // vain b*
    expect(avaimet.some(k => k[0] === 'a')).toBe(false);     // ei a*
    expect(Object.keys(doc.tasmennykset).every(k => k[0] === 'b')).toBe(true);
    expect(doc.reflektio).toBeTruthy();                      // B → reflektio mukana
    expect(doc.henk_palaute).toBeUndefined();                // B → ei a8/henk_palaute
  });

  it('malli A tallennus EI sisällä b*-avaimia eikä reflektiota', async () => {
    const captured = {};
    const sb = makeSandbox(captured);
    sb.TM_HARJOITUS.avaa({
      db: sb._db, firebase: sb.firebase, seuraId: 'sjk',
      config: { mallit_kaytossa: ['palloliitto', 'valmennustaidot'], oletusmalli: 'valmennustaidot' },
      konteksti: { joukkue: 'SJK P14', valmentaja: 'Coach', valmentajaUid: 'coach1', arvioija: 'VP', arvioijaUid: 'vp1' }
    });
    ['b1', 'b2', 'b3'].forEach(id => sb._haSetB(id, 5));      // täytä B
    sb._haSetMalli('palloliitto');                            // vaihda A:han (kerryttää b*)
    sb._haSetA8(true);
    sb.document.getElementById('ha_a1').value = '9';
    sb.document.getElementById('ha_joukkue').value = 'SJK P14';
    sb.document.getElementById('ha_pvm').value = '2026-06-22';
    await sb._haTallenna();

    const doc = captured.doc;
    expect(doc.malli).toBe('palloliitto');
    const avaimet = Object.keys(doc.vastaukset);
    expect(avaimet.some(k => k[0] === 'b')).toBe(false);     // ei b*
    expect(doc.reflektio).toBeUndefined();                   // A → ei reflektiota
    expect(doc.henk_palaute).toBe(true);                     // A → a8 → henk_palaute
  });
});
