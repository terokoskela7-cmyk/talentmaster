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
              /* clear() = koko storen tyhjennys (tietosuoja, vaihe 1). Ilman tätä tyngässä
                 vartija ei voisi todistaa, että vanhat kuvat oikeasti häviävät laitteelta. */
              clear: () => { Object.keys(varasto).forEach((k) => delete varasto[k]); return tee(true); },
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
    /* PR 2B: luonnos persistoi HAVAINTOTILAN, ei DOM-kenttiä. Siksi se kestää myös näkymän
       uudelleenrakennuksen — ei vain sivunlatausta. */
    _phTila: o.phTila || {
      naytto: 'havainto', pelaajaId: null, haku: '',
      porras: 1, porrasTallennettu: null, porrasNostettu: false, ehdotusOhitettu: false,
      konteksti: 'harjoitus', pisteet: {}, havaitut: {}, auki: {}, teksti: '', nakyvyys: false,
      tehdyt: {}, sheet: false, peruttu: false, viimeisin: null, odottaa: false,
    },
    _phRender: () => {},
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);

  /* Vakiot + funktiot lähteestä — ei uudelleenkirjoitettuja kopioita. */
  vm.runInContext(
    'const ADAR_IDB_NIMI = "tm_adar_luonnos"; const ADAR_IDB_STORE = "kuvat";'
    + ' let _luonnosAjastin = null;', sandbox);

  /* KUVAFUNKTIOT POISTETTU (tietosuoja, vaihe 1): _skaalaaKuva, _kuvaNaytaPreview,
     _kuvaVapautaPreview ja _luonnosTallennaKuva/HaeKuva/PoistaKuva eivät ole enää olemassa.
     Luonnos-, reload-, persistenssi- ja banneritestit säilyvät ja kohdistuvat samoihin
     funktioihin kuin ennen. */
  [
    'function _luonnosAvain(', 'function _idbAvaa(', 'function _idbToimi(',
    'function _luonnosTyhjennaKuvaStore(',
    'function _luonnosKeraa(', 'function _luonnosTallenna(', 'function _luonnosTyhjenna(',
    'async function _luonnosPalauta(', 'function _adarNaytaBanneri(',
  ].forEach((n) => vm.runInContext(funktio(n), sandbox));

  return { sandbox, ls, idbVarasto, dom, toastit };
}

const odota = (ms) => new Promise((r) => setTimeout(r, ms || 40));

describe('ADAR · reload-kestävyys', () => {
  it('EI VACUOUS: luonnos kerää havaintotilan', () => {
    const y = teeSandbox({});
    Object.assign(y.sandbox._phTila, {
      pelaajaId: 'p1', porras: 2, konteksti: 'ottelu',
      pisteet: { A: 3, D: 2 }, havaitut: { A: ['Katsoo ylös'] },
      teksti: 'Hyvä skannaus ennen syöttöä.', nakyvyys: true,
    });
    const tila = y.sandbox._luonnosKeraa();
    expect(tila.pelaajaId).toBe('p1');
    expect(tila.pisteet.A).toBe(3);
    expect(tila.teksti).toBe('Hyvä skannaus ennen syöttöä.');
    expect(tila.havaitut.A).toEqual(['Katsoo ylös']);
  });

  it('RELOAD ei hukkaa havaintoa — tila palautuu kokonaan', async () => {
    /* 1. kenttätyö */
    const a = teeSandbox({});
    Object.assign(a.sandbox._phTila, {
      pelaajaId: 'p1', porras: 2, porrasTallennettu: 1, porrasNostettu: true, konteksti: 'ottelu',
      pisteet: { A: 3, D: 2 }, havaitut: { A: ['Katsoo ylös'] },
      teksti: 'Pelaaja skannasi ennen vastaanottoa.', nakyvyys: true,
    });
    a.sandbox._luonnosTallenna();
    await odota(500);   // debounce 400 ms — ei saa jauhaa joka nappaimenpainalluksella
    expect(Object.keys(a.ls.data).length, 'luonnosta ei kirjoitettu lainkaan').toBeGreaterThan(0);

    /* 2. RELOAD: uusi sandbox, sama storage, tyhjä tila */
    const b = teeSandbox({ localStorage: a.ls.data, idb: a.idbVarasto });
    await b.sandbox._luonnosPalauta();
    const S = b.sandbox._phTila;
    expect(S.pelaajaId, 'pelaaja hukkui reloadissa').toBe('p1');
    expect(S.teksti, 'narratiivi hukkui reloadissa').toBe('Pelaaja skannasi ennen vastaanottoa.');
    expect(S.pisteet, 'pisteet hukkuivat reloadissa').toEqual({ A: 3, D: 2 });
    expect(S.havaitut.A, '"Mitä näit" -valinnat hukkuivat').toEqual(['Katsoo ylös']);
    expect(S.konteksti).toBe('ottelu');
    expect(S.nakyvyys, 'näkyvyysvalinta hukkui — oletus olisi voinut mennä lapselle').toBe(true);
    expect(S.porras, 'porras hukkui').toBe(2);
    expect(S.porrasNostettu, 'portaan nosto hukkui — tallennus kirjoittaisi väärän portaan').toBe(true);
    expect(S.naytto, 'palautus ei avannut havaintoa').toBe('havainto');
    expect(b.toastit.join(' '), 'käyttäjälle ei kerrottu palautuksesta').toContain('Palautettiin');
  });


  it('TALLENNUS tyhjentää luonnoksen (ei tarjota jo lähetettyä uudelleen)', async () => {
    const a = teeSandbox({ kentat: { 't2-narr': 'Tallennettu havainto.' } });
    a.sandbox._luonnosTallenna();
    await odota(500);
    a.sandbox._luonnosTyhjenna();
    await odota();
    expect(a.ls.data[a.sandbox._luonnosAvain()], 'luonnos jäi localStorageen').toBeUndefined();
  });

  /* TIETOSUOJA (vaihe 1): laitteille on voinut jäädä kuvia lapsista vanhasta kuvatoiminnosta.
     Koodin poisto ei riitä — object store on TYHJENNETTÄVÄ. Seedataan varasto suoraan, koska
     kirjoitusfunktiota ei enää ole. */
  it('KUVAVARASTO tyhjennetään — vanhat kuvat eivät jää laitteelle', async () => {
    const a = teeSandbox({ kentat: {} });
    a.idbVarasto.t1 = { __blob: true, size: 1 };
    a.idbVarasto.t2 = { __blob: true, size: 1 };
    await a.sandbox._luonnosTyhjennaKuvaStore();
    await odota();
    expect(Object.keys(a.idbVarasto), 'kuvia jäi laitteelle').toEqual([]);
  });

  it('luonnoksen tyhjennys tyhjentää myös kuvavaraston', async () => {
    const a = teeSandbox({ kentat: {} });
    a.idbVarasto.t3 = { __blob: true, size: 1 };
    a.sandbox._luonnosTyhjenna();
    await odota();
    expect(a.idbVarasto.t3, 'kuva jäi IDB:hen').toBeUndefined();
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


  it('PERSISTENSSI on eksplisiittinen LOCAL (istunto säilyy reloadin yli)', () => {
    expect(ADAR, 'setPersistence puuttuu → istunto oletuksen varassa')
      .toMatch(/setPersistence\(\s*window\.firebase\.auth\.Auth\.Persistence\.LOCAL\s*\)/);
  });
});
