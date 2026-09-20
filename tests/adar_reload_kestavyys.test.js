/**
 * ADAR — reload-kestävyys (kuvan liittäminen ei saa hukata havaintoa).
 *
 * LIVE-BUGI: "tein pelihavainnon, otin kuvan ja liitin sen → loggasi ulos."
 * Ei ollut uloskirjautuminen: `capture="environment"` avasi natiivin kameran ja
 * taustoitti WebView'n, muistipaine (täysi File + siitä luettu base64-dataURL
 * yhtä aikaa) laukaisi sivun uudelleenlatauksen, ja reload (a) välähti
 * login-bannerin `onAuthStateChanged(null)`-VÄLITILASSA ja (b) hukkasi
 * vain-muistissa olleen havainnon + kuvan.
 *
 * Portti mittaa KÄYTTÄYTYMISTÄ: aidot funktiot ADAR:n lähteestä ajetaan
 * vm-sandboxissa, jossa localStorage/IndexedDB/canvas ovat pieniä mutta
 * toimivia fakeja. "Reload" = uusi sandbox saman storagen päälle.
 */
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const ADAR = readFileSync(join(juuri, 'TalentMaster_ADAR_Pikakortti.html'), 'utf8');

function funktio(nimi) {
  const i = ADAR.indexOf(nimi);
  expect(i, nimi + ' puuttuu ADAR:sta').toBeGreaterThan(-1);
  let syv = 0, loppu = -1;
  for (let k = ADAR.indexOf('{', i); k < ADAR.length; k++) {
    if (ADAR[k] === '{') syv++;
    else if (ADAR[k] === '}') { syv--; if (syv === 0) { loppu = k + 1; break; } }
  }
  return ADAR.slice(i, loppu);
}

/** Vakio lähteestä (esim. `const ADAR_KUVA_MAX_PX = 1600;`). */
function vakio(nimi) {
  const m = ADAR.match(new RegExp('const\\s+' + nimi + '\\s*=\\s*([\\d.]+)'));
  expect(m, nimi + ' puuttuu').toBeTruthy();
  return Number(m[1]);
}

/* ── Pienet mutta toimivat selain-faket ─────────────────────────────────── */

function teeLocalStorage(alku) {
  const data = Object.assign({}, alku);
  return {
    data,
    api: {
      getItem: (k) => (k in data ? data[k] : null),
      setItem: (k, v) => { data[k] = String(v); },
      removeItem: (k) => { delete data[k]; },
    },
  };
}

/** Minimaalinen IndexedDB: open → transaction → objectStore → put/get/delete. */
function teeIndexedDB(varasto) {
  const tee = (tulos) => {
    const req = { result: tulos };
    return req;
  };
  return {
    open: () => {
      const r = { result: null, onupgradeneeded: null, onsuccess: null, onerror: null };
      setTimeout(() => {
        r.result = {
          objectStoreNames: { contains: () => true },
          createObjectStore: () => {},
          close: () => {},
          transaction: () => {
            const tx = { oncomplete: null, onerror: null };
            setTimeout(() => { if (tx.oncomplete) tx.oncomplete(); }, 0);
            tx.objectStore = () => ({
              put: (v, k) => { varasto[k] = v; return tee(true); },
              get: (k) => tee(varasto[k]),
              delete: (k) => { delete varasto[k]; return tee(true); },
            });
            return tx;
          },
        };
        if (r.onupgradeneeded) r.onupgradeneeded();
        if (r.onsuccess) r.onsuccess();
      }, 0);
      return r;
    },
  };
}

/** Kenttä-DOM: vain ne id:t jotka luonnos koskee. */
function teeDom(kentat) {
  const solmut = new Map();
  const hae = (id) => {
    if (!solmut.has(id)) {
      solmut.set(id, {
        id, value: (kentat && kentat[id]) || '', src: '', style: { display: '' },
        classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
        getAttribute: () => null, setAttribute() {}, closest: () => null,
        querySelectorAll: () => [], appendChild() {},
      });
    }
    return solmut.get(id);
  };
  return {
    solmut,
    document: {
      getElementById: hae,
      createElement: (tag) => (tag === 'canvas'
        ? { width: 0, height: 0, getContext: () => ({ drawImage() {} }), toBlob: (cb) => cb({ __blob: true, koko: 'skaalattu', size: 1234 }) }
        : hae('luotu_' + tag)),
      addEventListener() {},
      querySelectorAll: () => [],
      body: { appendChild() {} },
    },
  };
}

function teeSandbox(opt) {
  const o = opt || {};
  const ls = teeLocalStorage(o.localStorage);
  const idbVarasto = o.idb || {};
  const dom = teeDom(o.kentat);
  const toastit = [];
  const sandbox = {
    document: dom.document, console, Date, Math, JSON, String, Number, Object, Array,
    Promise, RegExp, Error, setTimeout, clearTimeout, isNaN,
    localStorage: ls.api,
    indexedDB: teeIndexedDB(idbVarasto),
    URL: { createObjectURL: () => 'blob:fake/' + Math.random(), revokeObjectURL() {} },
    Image: function () {
      const self = this;
      setTimeout(() => {
        self.width = o.kuvaLeveys || 4000;
        self.height = o.kuvaKorkeus || 3000;
        if (self.onload) self.onload();
      }, 0);
    },
    _showToast: (v) => toastit.push(v),
    _tmSeuraId: 'sjk',
    _tmAuth: { currentUser: o.user || null },
    scores: { t1: { A: null }, t2: { A: null, D: null, Act: null }, t3: { A: null, D: null, Act: null, R: null } },
    _phaseState: { t2: { phase: '', kpi: '' }, t3: { phase: '', kpi: '' } },
    _pikaState: { pelaajaId: null, pelaajaNimi: null, seuraId: null, adar: null, piste: null },
    updateTotal: () => {},
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);

  /* Vakiot + funktiot lähteestä — ei uudelleenkirjoitettuja kopioita. */
  vm.runInContext(
    'const ADAR_IDB_NIMI = "tm_adar_luonnos"; const ADAR_IDB_STORE = "kuvat";'
    + ' const ADAR_TIERIT = ["t1","t2","t3"];'
    + ' const ADAR_KENTAT = ["-pelaaja-id","-ikä","-tilanne","-pvm","-narr"];'
    + ' const ADAR_T3_LISA = ["t3-pelipaikka","t3-reflektio"];'
    + ' const ADAR_KUVA_MAX_PX = ' + vakio('ADAR_KUVA_MAX_PX') + ';'
    + ' const ADAR_KUVA_LAATU = ' + vakio('ADAR_KUVA_LAATU') + ';'
    + ' window._kuvaFiles = { t1:null, t2:null, t3:null };'
    + ' window._kuvaPreviewUrlit = { t1:null, t2:null, t3:null };'
    + ' let _luonnosAjastin = null;', sandbox);

  [
    'function _kuvaVapautaPreview(', 'function _skaalaaKuva(', 'function _kuvaNaytaPreview(',
    'function _luonnosAvain(', 'function _idbAvaa(', 'function _idbToimi(',
    'function _luonnosTallennaKuva(', 'function _luonnosHaeKuva(', 'function _luonnosPoistaKuva(',
    'function _luonnosKeraa(', 'function _luonnosTallenna(', 'function _luonnosTyhjenna(',
    'async function _luonnosPalauta(', 'function _adarNaytaBanneri(',
  ].forEach((n) => vm.runInContext(funktio(n), sandbox));

  return { sandbox, ls, idbVarasto, dom, toastit };
}

const odota = (ms) => new Promise((r) => setTimeout(r, ms || 40));

describe('ADAR · reload-kestävyys', () => {
  it('EI VACUOUS: luonnos kerää lomakkeen kentät ja pisteet', () => {
    const y = teeSandbox({ kentat: { 't2-narr': 'Hyvä skannaus ennen syöttöä.' } });
    y.sandbox.scores.t2.A = 3;
    const tila = y.sandbox._luonnosKeraa();
    expect(tila.tierit.t2['-narr']).toBe('Hyvä skannaus ennen syöttöä.');
    expect(tila.pisteet.t2.A).toBe(3);
  });

  it('RELOAD ei hukkaa havaintoa — kentät ja pisteet palautuvat', async () => {
    /* 1. kenttätyö */
    const a = teeSandbox({ kentat: { 't2-narr': 'Pelaaja skannasi ennen vastaanottoa.', 't2-tilanne': 'Ottelu' } });
    a.sandbox.scores.t2.A = 3;
    a.sandbox._pikaState.pelaajaId = 'p1';
    a.sandbox._luonnosTallenna();
    await odota(500);   // debounce 400 ms — ei saa jauhaa joka nappaimenpainalluksella
    expect(Object.keys(a.ls.data).length, 'luonnosta ei kirjoitettu lainkaan').toBeGreaterThan(0);

    /* 2. RELOAD: uusi sandbox, sama storage, tyhjä lomake */
    const b = teeSandbox({ localStorage: a.ls.data, idb: a.idbVarasto });
    await b.sandbox._luonnosPalauta();
    expect(b.dom.document.getElementById('t2-narr').value, 'narratiivi hukkui reloadissa')
      .toBe('Pelaaja skannasi ennen vastaanottoa.');
    expect(b.dom.document.getElementById('t2-tilanne').value).toBe('Ottelu');
    expect(b.sandbox.scores.t2.A, 'pisteet hukkuivat reloadissa').toBe(3);
    expect(b.sandbox._pikaState.pelaajaId, 'pikatilan pelaaja hukkui').toBe('p1');
    expect(b.toastit.join(' '), 'käyttäjälle ei kerrottu palautuksesta').toContain('Palautettiin');
  });

  it('KUVA säilyy reloadin yli — IDB-Blobina, EI base64 localStoragessa', async () => {
    const a = teeSandbox();
    const blob = { __blob: true, size: 999, koko: 'alkuperainen' };
    await a.sandbox._luonnosTallennaKuva('t2', blob);
    await odota();

    /* Kiintiövartija: localStorageen ei saa päätyä kuvadataa. */
    const ls = JSON.stringify(a.ls.data);
    expect(ls, 'kuva tallentui base64:na localStorageen (kiintiöriski)').not.toContain('data:image');
    expect(ls, 'kuvadataa localStoragessa').not.toContain('__blob');

    const b = teeSandbox({ localStorage: a.ls.data, idb: a.idbVarasto });
    await b.sandbox._luonnosPalauta();
    expect(b.sandbox.window._kuvaFiles.t2, 'kuva ei palautunut reloadin jälkeen').toBeTruthy();
    expect(b.sandbox.window._kuvaFiles.t2.size).toBe(999);
    expect(b.dom.document.getElementById('t2-kuva-img').src, 'esikatselua ei palautettu').toContain('blob:');
  });

  it('TALLENNUS tyhjentää luonnoksen (ei tarjota jo lähetettyä uudelleen)', async () => {
    const a = teeSandbox({ kentat: { 't2-narr': 'Tallennettu havainto.' } });
    a.sandbox._luonnosTallenna();
    await odota(500);
    await a.sandbox._luonnosTallennaKuva('t2', { __blob: true, size: 1 });
    await odota();
    a.sandbox._luonnosTyhjenna();
    await odota();
    expect(a.ls.data[a.sandbox._luonnosAvain()], 'luonnos jäi localStorageen').toBeUndefined();
    expect(a.idbVarasto.t2, 'kuva jäi IDB:hen').toBeUndefined();
  });

  it('KUVA SKAALATAAN ennen esikatselua ja lähetystä', async () => {
    const y = teeSandbox({ kuvaLeveys: 4000, kuvaKorkeus: 3000 });
    const iso = { size: 4 * 1024 * 1024, koko: 'alkuperainen' };
    const tulos = await y.sandbox._skaalaaKuva(iso, y.sandbox.ADAR_KUVA_MAX_PX || 1600, 0.85);
    expect(tulos.koko, 'isoa kuvaa ei skaalattu → muistipaine säilyy').toBe('skaalattu');
  });

  it('SKAALAUS ei kasvata pientä kuvaa (ei turhaa uudelleenpakkausta)', async () => {
    const y = teeSandbox({ kuvaLeveys: 800, kuvaKorkeus: 600 });
    const pieni = { size: 120000, koko: 'alkuperainen' };
    const tulos = await y.sandbox._skaalaaKuva(pieni, 1600, 0.85);
    expect(tulos.koko).toBe('alkuperainen');
  });

  it('AUTH-NULL ei slammaa login-banneria heti (reload-välitila)', async () => {
    const y = teeSandbox({ user: null });
    y.sandbox._adarNaytaBanneri(true);
    const b = y.dom.document.getElementById('tm-login-banner');
    expect(b.style.display, 'banneri lävähti heti = näyttää uloskirjautumiselta').not.toBe('flex');
    /* Istunto palautuu armonajan sisällä → banneria ei saa koskaan näyttää. */
    y.sandbox._tmAuth.currentUser = { uid: 'u1' };
    await odota(1700);
    expect(b.style.display, 'banneri näytettiin vaikka istunto palautui').not.toBe('flex');
  });

  it('AUTH-NULL näyttää bannerin kun tila on ASETTUNUT (aito signaali säilyy)', async () => {
    const y = teeSandbox({ user: null });
    y.sandbox._adarNaytaBanneri(true);
    await odota(1700);
    expect(y.dom.document.getElementById('tm-login-banner').style.display,
      'aidosti kirjautumaton ei saa jäädä ilman banneria').toBe('flex');
  });

  it('KUVAINPUTEISSA ei ole capture-attribuuttia (galleriavalinta mahdollinen)', () => {
    /* capture pakotti kameran: ei galleriaa, ja natiivi kamera taustoittaa
       WebView'n herkemmin → juuri se reload. */
    const inputit = ADAR.match(/<input[^>]*id="t[123]-kuva-input"[^>]*>/g) || [];
    expect(inputit.length, 'kuvainputteja ei löytynyt').toBe(3);
    inputit.forEach((rivi) => {
      expect(rivi, 'capture pakottaa yhä kameran').not.toContain('capture');
      expect(rivi, 'accept-attribuutti hävisi').toContain('accept="image/*"');
    });
  });

  it('PERSISTENSSI on eksplisiittinen LOCAL (istunto säilyy reloadin yli)', () => {
    expect(ADAR, 'setPersistence puuttuu → istunto oletuksen varassa')
      .toMatch(/setPersistence\(\s*window\.firebase\.auth\.Auth\.Persistence\.LOCAL\s*\)/);
  });
});
