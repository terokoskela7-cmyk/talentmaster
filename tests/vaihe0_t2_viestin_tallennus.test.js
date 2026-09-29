/**
 * Vaihe 0 / T2 (CODE_BRIEF_VAIHE0_TEKOALY_JA_LUOTETTAVUUS): viesti EI saa näyttää "lähetetty"
 * ennen tallennusta. Aiemmin Masterin `sendReply` näytti toastin ja sulki ikkunan heti, ja
 * tallennusvirhe meni vain console.warniin. AJETUT testit: funktio ajetaan tyngillä, jotka
 * hylkäävät tai hyväksyvät kirjoituksen.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const V = createRequire(import.meta.url)('../lib/tm_valmentajaviesti.js');
const MASTER = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const ilmanKommentteja = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

function pura(lahde, tunniste) {
  const alku = lahde.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let syvyys = 0;
  for (let j = lahde.indexOf('{', alku); j < lahde.length; j++) {
    if (lahde[j] === '{') syvyys++;
    else if (lahde[j] === '}') { syvyys--; if (!syvyys) return lahde.slice(alku, j + 1); }
  }
  throw new Error('sulkeet eivät täsmää');
}

afterEach(() => { vi.useRealTimers(); });

describe('(T2-1) lib: aikaraja ja virheen luokittelu', () => {
  it('aikaraja: roikkuva kirjoitus → deadline-exceeded 15 s jälkeen', async () => {
    vi.useFakeTimers();
    const p = V.tmViestiAikarajalla(new Promise(() => {}));
    const tulos = p.then(() => 'ok', (e) => e.code);
    await vi.advanceTimersByTimeAsync(V.TM_VIESTI_AIKARAJA_MS - 1);
    let valmis = false; tulos.then(() => { valmis = true; });
    await Promise.resolve();
    expect(valmis, 'ei saa laueta ennen rajaa').toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(await tulos).toBe('deadline-exceeded');
    expect(V.TM_VIESTI_AIKARAJA_MS).toBe(15000);
  });

  it('onnistunut kirjoitus läpäisee arvon; hylkäys läpäisee alkuperäisen virheen', async () => {
    await expect(V.tmViestiAikarajalla(Promise.resolve('ref'), 50)).resolves.toBe('ref');
    const e = Object.assign(new Error('x'), { code: 'permission-denied' });
    await expect(V.tmViestiAikarajalla(Promise.reject(e), 50)).rejects.toBe(e);
  });

  it('virheavain: oikeus · verkko/aikaraja · muu', () => {
    expect(V.tmViestiVirheAvain({ code: 'permission-denied' })).toBe('Ei oikeutta lähettää tälle pelaajalle');
    expect(V.tmViestiVirheAvain({ code: 'firestore/permission-denied' })).toBe('Ei oikeutta lähettää tälle pelaajalle');
    expect(V.tmViestiVirheAvain({ code: 'unavailable' })).toBe('Ei yhteyttä, yritä uudelleen');
    expect(V.tmViestiVirheAvain({ code: 'deadline-exceeded' })).toBe('Ei yhteyttä, yritä uudelleen');
    expect(V.tmViestiVirheAvain(new Error('outo'))).toBe('Viestin lähetys ei onnistunut');
  });
});

/* sendReply + inboxReact ajetaan sivun lähteestä tyngillä (with-proxy kuten muissa testeissä). */
function ajaMasterFunktio(funktiot, palauta, store) {
  const runko = funktiot.map((t) => pura(MASTER, t)).join('\n');
  const ymp = new Proxy(store, {
    has: (t, k) => (k in t) || !(k in globalThis),
    get: (t, k) => (k === Symbol.unscopables ? undefined : (k in t ? t[k] : undefined)),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  // eslint-disable-next-line no-new-func
  return new Function('__ymp', 'with(__ymp){' + runko + '\n' + palauta + '}')(ymp);
}

function masterTynka(kirjoitus) {
  const el = (id) => store.els[id] || (store.els[id] = {
    id, value: '', textContent: '', disabled: false, style: {},
    classList: { _on: true, add() { this._on = true; }, remove() { this._on = false; } },
  });
  const store = {
    els: {}, toasts: [], merkitty: [], suljettu: 0,
    console: { warn() {}, log() {} }, JSON, Object, Promise, String,
    masterT: (s) => s,
    toast: (t) => store.toasts.push(t),
    markSeen: (id) => store.merkitty.push(id),
    renderInbox() {},
    localStorage: { setItem() {} },
    window: {},
    firebase: { firestore: { FieldValue: { serverTimestamp: () => 'ts' } } },
    _db: {}, _seuraId: 'kpv', _uid: 'valm-1',
    _replyCtx: { pid: 'p1', pname: 'Topias', eid: 'e1' },
    _doneReacts: {},
    _viestiLahettajanNimi: () => 'Valmentaja',
    tmLahetaValmentajaViesti: () => kirjoitus(),
    tmViestiAikarajalla: V.tmViestiAikarajalla,
    tmViestiVirheAvain: V.tmViestiVirheAvain,
    document: { getElementById: (id) => el(id) },
  };
  el('replyText').value = 'Hyvä treeni tänään!';
  el('replyOverlay').classList._on = true;
  return store;
}

describe('(T2-2) Master sendReply: toast ja sulkeminen VASTA tallennuksen jälkeen', () => {
  const FUNKTIOT = ['function _replyTila(lahettaa, virhe) {', 'function closeReply(){', 'async function sendReply(){'];

  it('kirjoitus hylätään (permission-denied) → teksti säilyy, ei toastia, ikkuna auki, syy näkyy', async () => {
    const st = masterTynka(() => Promise.reject(Object.assign(new Error('x'), { code: 'permission-denied' })));
    await ajaMasterFunktio(FUNKTIOT, 'return sendReply();', st);
    expect(st.toasts).toEqual([]);
    expect(st.els.replyOverlay.classList._on, 'ikkuna pysyy auki').toBe(true);
    expect(st.els.replyText.value).toBe('Hyvä treeni tänään!');
    expect(st.els.replyVirhe.textContent).toBe('Ei oikeutta lähettää tälle pelaajalle');
    expect(st.els.replyLaheta.textContent).toBe('Yritä uudelleen');
    expect(st.els.replyLaheta.disabled).toBe(false);
    expect(st.merkitty, 'tapahtumaa ei kuitata nähdyksi').toEqual([]);
  });

  it('roikkuva kirjoitus (offline) → 15 s jälkeen verkkovirhe, teksti säilyy', async () => {
    vi.useFakeTimers();
    const st = masterTynka(() => new Promise(() => {}));
    const p = ajaMasterFunktio(FUNKTIOT, 'return sendReply();', st);
    await Promise.resolve();
    expect(st.els.replyLaheta.disabled, 'nappi disabloitu lähetyksen ajan').toBe(true);
    expect(st.els.replyLaheta.textContent).toBe('Lähetetään…');
    await vi.advanceTimersByTimeAsync(15001);
    await p;
    expect(st.toasts).toEqual([]);
    expect(st.els.replyVirhe.textContent).toBe('Ei yhteyttä, yritä uudelleen');
    expect(st.els.replyText.value).toBe('Hyvä treeni tänään!');
  });

  it('kirjoitus onnistuu → toast ja ikkuna sulkeutuu', async () => {
    const st = masterTynka(() => Promise.resolve({ id: 'uusi' }));
    await ajaMasterFunktio(FUNKTIOT, 'return sendReply();', st);
    expect(st.toasts).toEqual(['Viesti lähetetty Topias:n perheelle']);
    expect(st.els.replyOverlay.classList._on).toBe(false);
    expect(st.merkitty).toEqual(['e1']);
  });
});

describe('(T2-3) Master inboxReact: reaktio merkitään vasta tallennuksen jälkeen', () => {
  it('hylätty → ei merkintää eikä onnistumistoastia, virhetoast näkyy', async () => {
    const st = masterTynka(() => Promise.reject(Object.assign(new Error('x'), { code: 'unavailable' })));
    await ajaMasterFunktio(['async function inboxReact(eid,emoji,nimi,pid){'], "return inboxReact('e1','❤️','Topias','p1');", st);
    expect(st._doneReacts).toEqual({});
    expect(st.merkitty).toEqual([]);
    expect(st.toasts).toEqual(['Ei yhteyttä, yritä uudelleen']);
  });
  it('onnistunut → merkitty ja toast', async () => {
    const st = masterTynka(() => Promise.resolve({}));
    await ajaMasterFunktio(['async function inboxReact(eid,emoji,nimi,pid){'], "return inboxReact('e1','❤️','Topias','p1');", st);
    expect(st._doneReacts).toEqual({ e1: { '❤️': true } });
    expect(st.toasts).toEqual(['❤️ Topias:lle']);
  });
});

describe('(T2-4) vartijat: ei "lähetetty"-toastia ennen awaitia', () => {
  const tapaukset = [
    ['Master sendReply', MASTER, 'async function sendReply(){', "toast('Viesti lähetetty"],
    ['Master _avaaViestiPelaajalle', MASTER, 'window._avaaViestiPelaajalle = function (pelaajaId) {', "toast(masterT('Viesti lähetetty')"],
    ['VP _tallennaPMP', VP, 'async function _tallennaPMP(pelaajaId, pelaajaNimi) {', "toast(vpT('Viesti lähetetty"],
  ];
  tapaukset.forEach(([nimi, lahde, tunniste, toastAlku]) => {
    it(nimi + ': tallennus odotetaan aikarajalla ennen toastia', () => {
      const f = ilmanKommentteja(pura(lahde, tunniste));
      const iAwait = f.indexOf('await tmViestiAikarajalla(tmLahetaValmentajaViesti(');
      const iToast = f.indexOf(toastAlku);
      expect(iAwait, 'await-kutsu puuttuu').toBeGreaterThan(0);
      expect(iToast, 'toast puuttuu').toBeGreaterThan(0);
      expect(iToast, 'toast ennen awaitia').toBeGreaterThan(iAwait);
      expect(f).toContain('tmViestiVirheAvain(e)');
    });
  });

  it('EI VACUOUS: vanha muoto (toast ilman awaitia) jäisi kiinni', () => {
    const vanha = "function sendReply(){ tmLahetaValmentajaViesti(_db, {}).catch(function(){}); toast('Viesti lähetetty ' + x); }";
    expect(vanha.indexOf('await tmViestiAikarajalla(tmLahetaValmentajaViesti(')).toBe(-1);
  });

  it('lib-versio nostettu molemmissa sivuissa (uudet funktiot, vanha lib = ReferenceError)', () => {
    expect(MASTER).toContain('lib/tm_valmentajaviesti.js?v=2');
    expect(VP).toContain('lib/tm_valmentajaviesti.js?v=2');
  });
});
