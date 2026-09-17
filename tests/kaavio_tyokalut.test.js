/**
 * TalentMaster™ — Taktiikkataulun piirrostyökalut + domeenitietoinen starter.
 *
 * Editori osasi vain raahata pelaajia: liikkeet, selite ja näkökenttä eivät olleet napissa,
 * vaikka §3-skeema ja renderöijä tukevat niitä. Lisäksi luonnin starter oli kovakoodattu
 * hyökkäysasetelmaan — puolustuskonseptissa pallo oli väärällä joukkueella.
 *
 *   A) LIB — liike vapaalla päätepisteellä, selite, cone, osumatesti, viite-eheys
 *   B) VALIDAATTORI — kaikki työkalujen tuottama läpäisee §6:n (ei uutta validointia)
 *   C) VP-KYTKENTÄ — työkalutila vaihtaa vedon merkityksen; raahaus säilyy oletuksena
 *   D) STARTER — hyökkäys vs puolustus; TUOTANNON lauseke ajetaan molemmilla dim-arvoilla
 *   E) i18n + RAJAUS — ei kovaa suomea; vyöhyke jätetty pois koska §3 ei tunne sitä
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
// TAKTIIKKATAULUN UI ON NYT JAETUSSA LIBISSÄ (lib/tm_kaavio_ui.js) — sama koodi ajaa VP:ssä ja
// valmentajan apissa. Siksi UI:ta koskevat väitteet luetaan LIBISTÄ; `VP` jää niihin väitteisiin
// jotka koskevat nimenomaan VP:n omaa kytkentää (script-tagit, host-adapteri, sivupalkki).
const UI = readFileSync(join(ROOT, 'lib', 'tm_kaavio_ui.js'), 'utf8');
const RIVIT = UI.split('\n');
const E = require_(join(ROOT, 'lib', 'tm_kaavio_editori.js'));
const V = require_(join(ROOT, 'lib', 'tm_kaavio_validate.js'));

const runko = (nimi) => {
  const a = RIVIT.findIndex((l) => new RegExp('^(?:async\\s+)?function ' + nimi + '\\s*\\(').test(l));
  if (a < 0) throw new Error('ei löytynyt: ' + nimi);
  for (let i = a + 1; i < RIVIT.length; i++) if (RIVIT[i] === '}') return RIVIT.slice(a, i + 1).join('\n');
  throw new Error('sulku puuttuu: ' + nimi);
};
const POHJA = () => ({
  avain: 'y_h0', suunta: 'ylos', pelimuoto: '8v8',
  pelaajat: [
    { id: 'O1', joukkue: 'oma', rooli: 'vastaanottaja', x: 50, y: 50 },
    { id: 'O2', joukkue: 'oma', rooli: 'tuki', x: 30, y: 70 }
  ]
});

describe('A — lib: liike, selite, cone, osuma', () => {
  it('liike ref→ref ja ref→VAPAA piste (§3 sallii molemmat)', () => {
    const a = E.kaavioLisaaLiike(POHJA(), 'syotto', 'O2', 'O1').spec.liikkeet[0];
    expect(a.from).toEqual({ ref: 'O2' });
    expect(a.to).toEqual({ ref: 'O1' });
    const b = E.kaavioLisaaLiike(POHJA(), 'juoksu', 'O2', { x: 66.44, y: 40.12 }).spec.liikkeet[0];
    expect(b.to).toEqual({ x: 66.4, y: 40.1 });        // pyöristys 1 desimaaliin
  });
  it('vanha kutsumuoto (bare ref -merkkijono) toimii yhä', () => {
    expect(E.kaavioLisaaLiike(POHJA(), 'syotto', 'O1', 'O2').virhe).toBeUndefined();
  });
  it('viite-eheys tarkistetaan HETI, ei vasta tallennuksessa', () => {
    expect(E.kaavioLisaaLiike(POHJA(), 'syotto', 'EI_OLE', 'O1').virhe).toBe('tuntematon_ref');
    expect(E.kaavioLisaaLiike(POHJA(), 'syotto', 'O1', null).virhe).toBe('paate_puuttuu');
  });
  it('koordinaatit klampataan kentälle', () => {
    const l = E.kaavioLisaaLiike(POHJA(), 'juoksu', 'O1', { x: 140, y: -20 }).spec.liikkeet[0];
    expect(l.to).toEqual({ x: 100, y: 0 });
  });
  // MUUTTUNUT (§32-korjaus): luonti EI enää kopioi suomea sv/en-kenttiin. Suomi ruotsin paikalla
  // on väärää dataa, ei puuttuvaa — se olisi näyttänyt käännetyltä. Käännökset kirjoitetaan
  // ominaisuuspaneelissa, ja validaattori estää tallennuksen kunnes ne on täytetty.
  it('selite luodaan VAIN suomeksi; tyhjä hylätään', () => {
    const se = E.kaavioLisaaSelite(POHJA(), 70, 30, '  Katso ennen  ').spec.selitteet[0];
    expect(se.t).toEqual({ fi: 'Katso ennen', sv: '', en: '' });
    expect(E.kaavioLisaaSelite(POHJA(), 70, 30, '   ').virhe).toBe('tyhja_teksti');
  });
  it('cone on OBJEKTI {r,half}, ei true — renderöijä lukee molemmat kentät', () => {
    const s = E.kaavioAsetaCone(POHJA(), true).spec;
    expect(typeof s.cone).toBe('object');
    expect(typeof s.cone.r).toBe('number');
    expect(typeof s.cone.half).toBe('number');
    expect(s.pelaajat.find((p) => p.rooli === 'vastaanottaja').avoin).toBe(-90);
  });
  it('cone vaatii tasan yhden vastaanottajan', () => {
    const kaksi = POHJA(); kaksi.pelaajat[1].rooli = 'vastaanottaja';
    expect(E.kaavioAsetaCone(kaksi, true).virhe).toBe('vaatii_yhden_vastaanottajan');
    expect(E.kaavioAsetaCone(POHJA(), false).spec.cone).toBeUndefined();
  });
  it('osumatesti: selite voittaa pelaajan, liike löytyy janan varrelta', () => {
    let s = E.kaavioLisaaLiike(POHJA(), 'syotto', 'O2', 'O1').spec;
    s = E.kaavioLisaaSelite(s, 50, 50, 'päällä').spec;                 // sama piste kuin O1
    expect(E.kaavioOsuma(s, 50, 50).tyyppi).toBe('selite');
    expect(E.kaavioOsuma(s, 40, 60).tyyppi).toBe('liike');             // janan keskikohta
    expect(E.kaavioOsuma(s, 5, 5)).toBe(null);
  });
  it('poisto siivoaa orvot: viimeisen vastaanottajan mukana lähtee cone', () => {
    let s = E.kaavioAsetaCone(POHJA(), true).spec;
    s = E.kaavioLisaaLiike(s, 'syotto', 'O2', 'O1').spec;
    const j = E.kaavioPoista(s, 'O1').spec;
    expect(j.cone).toBeUndefined();
    expect(j.liikkeet.length).toBe(0);                                  // liike osoitti O1:een
  });
});

describe('B — kaikki työkalujen tuotos läpäisee §6-validaattorin', () => {
  it('täysi piirros: liikkeet + selite + cone', () => {
    let s = POHJA();
    s = E.kaavioLisaaLiike(s, 'syotto', 'O2', 'O1').spec;
    s = E.kaavioLisaaLiike(s, 'juoksu', 'O1', { x: 62, y: 34 }).spec;
    s = E.kaavioLisaaSelite(s, 72, 28, 'Näet molemmat').spec;
    // §32: käännökset täytetään erikseen — ilman niitä validaattori estää tallennuksen (tarkoitus).
    s = E.kaavioAsetaSeliteTeksti(s, 'S1', 'sv', 'Du ser båda').spec;
    s = E.kaavioAsetaSeliteTeksti(s, 'S1', 'en', 'You see both').spec;
    s = E.kaavioAsetaCone(s, true).spec;
    expect(V.validoiKaavio(s).E).toEqual([]);
  });
  it('EI-VACUOUS: käsin rikottu spec hylätään (portti mittaa jotain)', () => {
    const s = E.kaavioLisaaLiike(POHJA(), 'syotto', 'O2', 'O1').spec;
    s.liikkeet[0].to = { ref: 'EI_OLE' };
    expect(V.validoiKaavio(s).E.length).toBeGreaterThan(0);
  });
  it('kaikki neljä liiketyyppiä ovat validaattorin enumissa', () => {
    ['syotto', 'juoksu', 'kuljetus', 'laukaus'].forEach((t) => {
      expect(V.validoiKaavio(E.kaavioLisaaLiike(POHJA(), t, 'O2', 'O1').spec).E, t).toEqual([]);
    });
    expect(V.validoiKaavio(E.kaavioLisaaLiike(POHJA(), 'lentopallo', 'O2', 'O1').spec).E.length).toBeGreaterThan(0);
  });
  it('UI:n LIIKETYÖKALUT vastaavat validaattorin liiketyyppejä (ei ajautumista)', () => {
    // Työkalupalkissa on myös ei-liiketyökaluja (pallo, peliasento, näkökenttä, selite, poista).
    // Liikkeiksi luetaan ne jotka _kaavioOnLiiketyokalu tunnistaa — johdetaan lähteestä, ei
    // poissulkulistalla, joka vanhenisi joka kerta kun työkalu lisätään.
    const li = UI.match(/function _kaavioOnLiiketyokalu\(t\) \{ return \[([^\]]*)\]/);
    expect(li).toBeTruthy();
    const liikkeet = li[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
    expect([...liikkeet].sort()).toEqual([...V.KAAVIO_LIIKETYYPIT].sort());
    const i = UI.indexOf('var _KAAVIO_TYOKALUT = ['), j = UI.indexOf('];', i);
    const kt = [...UI.slice(i, j).matchAll(/k: '([a-z]+)'/g)].map((m) => m[1]);
    liikkeet.forEach((l) => expect(kt, l).toContain(l));   // jokainen liiketyyppi on napissa
  });
});

describe('C — VP: työkalutila vaihtaa vedon merkityksen', () => {
  it('raahaus on oletus ja säilyy kun tyokalu === null', () => {
    expect(UI).toContain('tyokalu: null, veto: null');
    const pd = runko('_kaavioPointerDown');
    // Kommentti siirtyi rivin yläpuolelle kun oletustila sai myös valinnan — väite koskee
    // käytöstä (snap + drag), ei kommentin sijaintia.
    expect(pd).toMatch(/OLETUSTILA = raahaa TAI valitse/);
    // drag on nyt OBJEKTI (kind+id), koska luokka C toi raahattavaksi myös korkeuslinjan ja
    // vyöhykkeen — pelkkä pelaaja-id ei enää riittänyt tunnisteeksi.
    expect(pd).toContain("_kaavioTila.drag = { kind: 'player', id: osuma.ref }");
  });
  it('liiketyökalu aloittaa vedon, ei raahausta', () => {
    const pd = runko('_kaavioPointerDown');
    expect(pd).toMatch(/if \(_kaavioOnLiiketyokalu\(t\)\)[\s\S]*_kaavioTila\.veto = \{ alku: kaavioSnapPaate/);
  });
  it('pointerup luo liikkeen ja kirjaa historian (Kumoa toimii)', () => {
    const pu = runko('_kaavioPointerUp');
    expect(pu).toContain('kaavioLisaaLiike(m.spec, _kaavioTila.tyokalu, alku, loppu)');
    expect(pu).toContain('kaavioHistoriaLisaa');
  });
  it('nollapituinen veto EI luo näkymätöntä liikettä', () => {
    const pu = runko('_kaavioPointerUp');
    expect(pu).toMatch(/var sama =[\s\S]*if \(!sama\)/);
  });
  it('selite ja poisto toimivat klikkauksella, molemmat historiaan', () => {
    const pd = runko('_kaavioPointerDown');
    expect(pd).toContain('kaavioLisaaSelite(s, sx, sy, teksti)');
    expect(pd).toContain('kaavioOsuma(s, sx, sy, 5)');
    expect(pd).toContain('kaavioAsetaPallo(s, op.ref)');
    // Klikkaustyökalut (selite, poista) kirjaavat historian pointerDOWNissa; liike vasta
    // pointerUPissa, koska sitä ennen ei ole vielä mitään lisättävää.
    // selite · poista · pallo + luokka C: peittovarjo · korkeuslinja · vyöhyke
    expect((pd.match(/kaavioHistoriaLisaa/g) || []).length).toBe(6);
    expect(runko('_kaavioPointerUp')).toContain('kaavioHistoriaLisaa');
  });
  it('sama nappi uudelleen palauttaa raahaukseen (moodista pääsee ulos)', () => {
    expect(runko('_kaavioValitseTyokalu')).toMatch(/_kaavioTila\.tyokalu === k\) \? null : k/);
  });
  it('työkalutila nollautuu editorin avauksessa ja sulussa', () => {
    expect(runko('_kaavioAvaaEditori')).toContain('_kaavioTila.tyokalu = null');
    expect(runko('_kaavioSuljeEditori')).toContain('_kaavioTila.tyokalu = null');
  });
  it('esikatseluviiva ei mene speciin — vasta pointerup luo liikkeen', () => {
    const pr = runko('_kaavioPiirraEditori');
    expect(pr).toContain('svg.appendChild(ln)');
    expect(pr).not.toContain('kaavioLisaaLiike');
  });
});

describe('D — starter seuraa konseptin domeenia', () => {
  // Ajetaan TUOTANNON lauseke; vain ympäröivät muuttujat sidotaan.
  const starterilla = (dim) => {
    const fn = runko('_kaavioLuoJaMuokkaa');
    const i = fn.indexOf('  var _k = ');
    const j = fn.indexOf('\n  };', i);
    expect(i, 'starter-lauseketta ei löytynyt').toBeGreaterThan(0);
    const sb = {
      avain: 'x_1', pm: { value: '8v8' }, kp: { value: '' },
      tmKonseptiResolvoi: () => (dim ? { avain: 'x_1', dim } : null),
      _kuiCtx: () => ({ seuraId: 's1' })
    };
    vm.createContext(sb);
    vm.runInContext(fn.slice(i, j + 4) + '\nthis.ulos = starter;', sb);
    return sb.ulos;
  };
  const pallollinen = (s) => s.pelaajat.find((p) => p.pallo);

  it('hyökkäys: pallo omalla pelaajalla (entinen käytös ennallaan)', () => {
    const s = starterilla('hyokkays');
    expect(pallollinen(s).joukkue).toBe('oma');
    expect(V.validoiKaavio(s).E).toEqual([]);
  });
  it('puolustus: pallo VASTUSTAJALLA ja oma pelaaja painostaa ilman palloa', () => {
    const s = starterilla('puolustus');
    expect(pallollinen(s).joukkue).toBe('vastustaja');
    expect(s.pelaajat.some((p) => p.joukkue === 'oma' && p.rooli === 'paine' && !p.pallo)).toBe(true);
    expect(V.validoiKaavio(s).E).toEqual([]);
  });
  it('vastustaja EI ole roolissa vastaanottaja — renderöijä tyylittäisi sen omaksi pelaajaksi', () => {
    // render: if (p.rooli === 'vastaanottaja') { aksenttiväri } else if (joukkue === 'vastustaja') …
    // → rooli voittaa joukkueen. Löytyi live-renderistä, ei lähdeluvusta.
    const r = readFileSync(join(ROOT, 'lib', 'tm_kaavio_render.js'), 'utf8');
    expect(r).toMatch(/p\.rooli==="vastaanottaja"[\s\S]{0,400}else if\(p\.joukkue==="vastustaja"\)/);
    const vast = starterilla('puolustus').pelaajat.filter((p) => p.joukkue === 'vastustaja');
    expect(vast.length).toBeGreaterThan(0);
    vast.forEach((p) => expect(p.rooli).not.toBe('vastaanottaja'));
  });
  it('dim puuttuu / konsepti ei resolvoidu → hyökkäys-fallback', () => {
    expect(pallollinen(starterilla(null)).joukkue).toBe('oma');
    expect(pallollinen(starterilla('hallinta')).joukkue).toBe('oma');
  });
  it('molemmat starterit validit myös pienimmässä pelimuodossa', () => {
    ['hyokkays', 'puolustus'].forEach((d) => {
      const s = starterilla(d); s.pelimuoto = '5v5';
      expect(V.validoiKaavio(s).E, d).toEqual([]);
    });
  });
  it('EI-VACUOUS: asetelmat ovat AIDOSTI eri (ei sama objekti eri nimellä)', () => {
    expect(JSON.stringify(starterilla('hyokkays').pelaajat)).not.toBe(JSON.stringify(starterilla('puolustus').pelaajat));
  });
});

describe('E — i18n ja tietoinen rajaus', () => {
  // vpT resolvoi KAHDESTA kartasta: jaettu common ensin, sitten VP:n sivukartta. C1-invariantti
  // KIELTÄÄ saman avaimen molemmissa, joten väite on "löytyy jommastakummasta" — ei "löytyy VP:stä".
  // (Tämä tuli esiin kun 'Syöttö' ja 'Poista' olivat jo commonissa ja duplikaatti punersi C1-portin.)
  const kaannos = (() => {
    global.window = global.window || {};
    const common = require_(join(ROOT, 'lib', 'tm_i18n_common.js')).TM_I18N_COMMON.sv || {};
    const vp = require_(join(ROOT, 'lib', 'tm_vp_i18n.js')).TM_VP_I18N.sv || {};
    return (k) => Object.prototype.hasOwnProperty.call(vp, k) || Object.prototype.hasOwnProperty.call(common, k);
  })();
  it('kovakoodattu suomi poistui: työkalulabelit kulkevat i18n-adapterin läpi', () => {
    expect(runko('_kvTyokalu')).toContain('_kuiT(lbl)');
    ['Oma pelaaja', 'Vastustaja', 'Syöttö', 'Juoksu', 'Kuljetus', 'Laukaus', 'Selite', 'Näkökenttä', 'Poista']
      .forEach((k) => expect(kaannos(k), k).toBe(true));
  });
  it('jokainen työkalulabel on käännettävissä (johdettu lähteestä)', () => {
    const i = UI.indexOf('var _KAAVIO_TYOKALUT = ['), j = UI.indexOf('];', i);
    const lbl = [...UI.slice(i, j).matchAll(/lbl: '([^']+)'/g)].map((m) => m[1]);
    expect(lbl.length).toBeGreaterThanOrEqual(7);
    expect(lbl.filter((l) => !kaannos(l))).toEqual([]);
  });
  // KÄÄNTYI (erä C): vyöhyke oli jätetty työkaluista pois koska validaattori ei tuntenut sitä.
  // Nyt portit ovat olemassa → rajauksen ehto ei enää päde, ja tämä väite on sen käänteinen:
  // renderöijä, validaattori JA työkalupalkki tuntevat kaikki kolme luokan C elementtiä.
  it('LUOKKA C on nyt renderöijässä, validaattorissa JA työkaluissa', () => {
    const R = readFileSync(join(ROOT, 'lib', 'tm_kaavio_render.js'), 'utf8');
    const V = readFileSync(join(ROOT, 'lib', 'tm_kaavio_validate.js'), 'utf8');
    ['vyohyke', 'korkeuslinjat', 'peittovarjot'].forEach((k) => {
      expect(R, 'render/' + k).toContain(k);
      expect(V, 'validate/' + k).toContain(k);
    });
    const i = UI.indexOf('var _KAAVIO_TYOKALUT = ['), j = UI.indexOf('];', i);
    const palkki = UI.slice(i, j);
    ['peittovarjo', 'korkeuslinja', 'vyohyke'].forEach((k) => expect(palkki, 'tyokalu/' + k).toContain(k));
    expect(UI).not.toMatch(/VYÖHYKE EI OLE TYÖKALUISSA/);   // vanhentunut rajaus poistettu
  });
  it('selitteen käännösvaraus on dokumentoitu (ei keksittyjä käännöksiä)', () => {
    const lib = readFileSync(join(ROOT, 'lib', 'tm_kaavio_editori.js'), 'utf8');
    expect(lib).toMatch(/§32-KORJAUS/);
    expect(lib).toMatch(/mieluummin näkyvä este kuin hiljainen väärä data/);
  });
});
