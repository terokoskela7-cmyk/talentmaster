/**
 * PALAUTEKERROS — lähettäjän kuittaus (VP_v25 harjoitusarvioinnin palaute).
 *
 * ONGELMA JOKA TÄMÄ LUKITSEE: palaute tallentui ja tavoitti valmentajan, mutta
 * LÄHETTÄJÄ ei nähnyt sitä. Ainoa kuittaus oli ~3 s toast, ja lomakkeen
 * tyhjeneminen riippui `_hlLataaPalaute`:n uudelleenrenderöinnistä — joka tulee
 * vasta KAHDEN Firestore-haun jälkeen. Hitaalla yhteydellä (tai jos haku kaatuu)
 * teksti jää ruudulle, lähetys näyttää epäonnistuneen ja käyttäjä painaa
 * uudelleen → duplikaatti.
 *
 * Testi ajaa AIDOT `_hlLataaPalaute` / `_hlLisaaPalaute` -funktiot VP:n
 * lähteestä vm-sandboxissa. DOM on minimaalinen mutta USKOLLINEN: `innerHTML`-
 * sijoitus korvaa lapsisolmut, joten uudet id:t saavat tuoreet solmut kuten
 * oikeassa DOM:issa. Näin portti mittaa käyttäytymistä, ei merkkijonoja.
 */
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');

/** Poimii funktion lähteestä sulkeita laskemalla. */
function funktio(nimi) {
  const i = VP.indexOf(nimi);
  expect(i, nimi + ' puuttuu VP:stä').toBeGreaterThan(-1);
  let syv = 0, loppu = -1;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) {
    if (VP[k] === '{') syv++;
    else if (VP[k] === '}') { syv--; if (syv === 0) { loppu = k + 1; break; } }
  }
  return VP.slice(i, loppu);
}

function teeSolmu(id) {
  return {
    id, value: '', textContent: '', disabled: false,
    style: { cssText: '' },
    classList: { add() {}, remove() {}, toggle() {} },
    remove() {}, appendChild() {}, setAttribute() {}, addEventListener() {},
  };
}

/** innerHTML-sijoitus KORVAA lapsisolmut — kuten oikeassa DOM:issa. */
function teeDom() {
  let lapset = new Map();
  const alue = {
    id: 'hlPalauteAlue', style: { cssText: '' }, _html: '',
    set innerHTML(v) {
      this._html = String(v);
      lapset = new Map();
      [...String(v).matchAll(/id="([\w-]+)"/g)].forEach((m) => lapset.set(m[1], teeSolmu(m[1])));
    },
    get innerHTML() { return this._html; },
    appendChild() {}, remove() {},
  };
  return {
    alue,
    document: {
      getElementById: (id) => (id === 'hlPalauteAlue' ? alue : lapset.get(id) || null),
      createElement: () => teeSolmu('luotu'),
      body: { appendChild() {} },
      querySelector: (sel) => (sel.indexOf('hlPalauteTyyppi') >= 0 ? { value: 'jaettu' } : null),
      querySelectorAll: () => [],
    },
  };
}

/**
 * @param {object} tila `tila.jumita` kytketään PÄÄLLE vasta alkurenderin
 *   jälkeen: lukuhaut eivät silloin koskaan resolvoidu (hidas/katkeava yhteys),
 *   joten tallennuksen jälkeistä uudelleenrenderöintiä EI tule — juuri se
 *   tilanne jossa vanha toteutus jätti lomakkeen täytetyksi.
 */
function teeDb(tila) {
  const jaettu = [], yksit = [];
  let laskuri = 0;
  const kirjoitetut = [];
  const snap = (arr) => ({ docs: arr.map((d) => ({ id: d.__id, data: () => d })) });
  const col = (nimi) => ({
    orderBy: () => ({
      get: () => ((tila && tila.jumita)
        ? new Promise(() => {})
        : Promise.resolve(snap(nimi === 'palaute_jaettu' ? jaettu : yksit))),
    }),
    doc: () => {
      const id = 'uusi' + (++laskuri);
      return {
        id,
        set: (d) => {
          const rivi = Object.assign({ __id: id }, d);
          kirjoitetut.push({ col: nimi, rivi });
          (nimi === 'palaute_jaettu' ? jaettu : yksit).push(rivi);
          return Promise.resolve();
        },
      };
    },
  });
  const base = { collection: col };
  return { kirjoitetut, db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => base }) }) }) } };
}

function teeSandbox(tila) {
  const dom = teeDom();
  const { db, kirjoitetut } = teeDb(tila);
  const toastit = [];
  const sandbox = {
    document: dom.document, console, Date, Math, JSON, String, Number, Object, Array,
    Promise, RegExp, setTimeout,
    db, _seuraId: 's1', _uid: 'u1', _hlAvoinId: 'arv1',
    auth: {
      currentUser: {
        uid: 'u1',
        getIdToken: () => Promise.resolve('t'),
        getIdTokenResult: () => Promise.resolve({ claims: { rooli: 'vp' } }),
      },
    },
    vpT: (s) => s,
    toast: (v) => toastit.push(v),
    tmAani: { luo: () => ({ nollaa() {}, onNauhoite: () => false }), tuettu: () => true, alueHTML: () => '<div id="hlRecBtn"></div>', toistoHTML: () => '' },
    tmPvmFi: (s) => String(s).slice(0, 10),
    _hlEsc: (s) => String(s == null ? '' : s),
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext('var _hlAani = null; var _HL_AANI_IDT = {btn:"hlRecBtn",aika:"hlRecAika",preview:"hlPreview",litterointi:"hlLitteroiBtn"};', sandbox);
  vm.runInContext(funktio('function _hlOmaUid()'), sandbox);
  vm.runInContext(funktio('async function _hlLataaPalaute('), sandbox);
  vm.runInContext(funktio('function _hlKuittaus('), sandbox);
  vm.runInContext(funktio('window._hlLisaaPalaute = async function'), sandbox);
  return { sandbox, dom, kirjoitetut, toastit };
}

/**
 * Renderöi lomake → kirjoita teksti → lähetä.
 * `jumitaLatausSendJalkeen`: alkurender onnistuu normaalisti, mutta tallennuksen
 * jälkeinen uudelleenlataus jumittuu → mittaa mitä käyttäjä näkee sillä välin.
 */
async function lahetaPalaute(teksti, jumitaLatausSendJalkeen) {
  const tila = { jumita: false };
  const ymp = teeSandbox(tila);
  await ymp.sandbox._hlLataaPalaute('arv1');
  const ta = ymp.sandbox.document.getElementById('hlPalauteTeksti');
  expect(ta, 'lomakkeen textarea puuttuu').toBeTruthy();
  ta.value = teksti;
  ymp.ta = ta;
  if (jumitaLatausSendJalkeen) tila.jumita = true;
  ymp.valmis = ymp.sandbox._hlLisaaPalaute();
  return ymp;
}

const tyhjennaMikrotaskit = () => new Promise((r) => setTimeout(r, 20));

describe('Palautekerros · lähettäjän kuittaus', () => {
  it('EI VACUOUS: lomake renderöityy ja palaute tallentuu oikeaan kokoelmaan', async () => {
    const ymp = await lahetaPalaute('Hyvä harjoitus.');
    await ymp.valmis;
    expect(ymp.kirjoitetut.length, 'palautetta ei tallennettu').toBe(1);
    expect(ymp.kirjoitetut[0].col).toBe('palaute_jaettu');
    expect(ymp.kirjoitetut[0].rivi.teksti).toBe('Hyvä harjoitus.');
  });

  it('LOMAKE TYHJENEE VÄLITTÖMÄSTI — ei jää odottamaan uudelleenlatausta', async () => {
    /* TÄMÄ on korjauksen ydin. Lukuhaut jumitettu → uudelleenrenderöintiä EI
       tule. Vanha toteutus nojasi pelkkään renderöintiin, joten teksti jäi
       ruudulle ja lähetys näytti epäonnistuneen. */
    const ymp = await lahetaPalaute('Pitkä palaute hitaalla yhteydellä.', true);
    await tyhjennaMikrotaskit();
    expect(ymp.ta.value, 'lomake ei tyhjentynyt ennen uudelleenlatausta').toBe('');
    expect(ymp.kirjoitetut.length, 'tallennus ei ehtinyt').toBe(1);
  });

  it('NAPPI LUKITTUU tallennuksen ajaksi (estää duplikaatin tuplaklikillä)', async () => {
    const ymp = await lahetaPalaute('Ääni latautuu hitaasti.', true);
    await tyhjennaMikrotaskit();
    const btn = ymp.sandbox.document.getElementById('hlPalauteBtn');
    expect(btn, 'lähetysnapilla ei ole id:tä → tilaa ei voi hallita').toBeTruthy();
    expect(btn.disabled, 'nappi jäi klikattavaksi tallennuksen ajaksi').toBe(true);
  });

  it('JUURI LISÄTTY näkyy listassa KOROSTETTUNA ja placeholder poistuu', async () => {
    const ymp = await lahetaPalaute('Tämän pitää näkyä listassa.');
    await ymp.valmis;
    const html = ymp.dom.alue.innerHTML;
    expect(html, 'palaute ei ilmestynyt listaan').toContain('Tämän pitää näkyä listassa.');
    expect(html, 'tyhjän tilan placeholder jäi näkyviin').not.toContain('Ei jaettua palautetta vielä.');
    expect(html, 'uutta merkintää ei korosteta').toContain('hlUusiRivi');
    expect(html, '"✓ Lisätty" -siru puuttuu').toContain('Lisätty');
  });

  it('INLINE-KUITTAUS jää näkyviin toastin lisäksi', async () => {
    const ymp = await lahetaPalaute('Kuittaus näkyviin.');
    await ymp.valmis;
    const k = ymp.sandbox.document.getElementById('hlPalauteKuittaus');
    expect(k, 'inline-kuittauselementti puuttuu').toBeTruthy();
    expect(k.textContent, 'inline-kuittaus tyhjä — jäljellä vain katoava toast').toContain('✓');
    expect(ymp.toastit.join(' | '), 'toast poistui').toContain('Palaute tallennettu');
  });

  it('OMA MERKINTÄ merkitään "Sinä" ja sessiotieto näkyy otsikossa', async () => {
    const ymp = await lahetaPalaute('Oma palautteeni.');
    await ymp.valmis;
    const html = ymp.dom.alue.innerHTML;
    expect(html, 'omaa merkintää ei erotu muista').toContain('Sinä');
    expect(html, 'sessiotieto puuttuu — ei tietoa että annoit jo palautteen').toContain('Annoit palautteen');
  });

  it('SESSIOTIETO ei näy ennen kuin omia merkintöjä on', async () => {
    /* Vartija vacuous-testiä vastaan: teksti ei saa olla aina näkyvissä. */
    const ymp = teeSandbox();
    await ymp.sandbox._hlLataaPalaute('arv1');
    expect(ymp.dom.alue.innerHTML, 'sessiotieto näkyy vaikka palautetta ei ole').not.toContain('Annoit palautteen');
  });
});
