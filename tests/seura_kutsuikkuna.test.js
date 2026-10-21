/* Seura · pelaajakortin "Lähetä rekisteröintikutsu" (CODE_BRIEF_SEURA_TUONTI_OLEMASSA kohta 5, 21.10.2026). Ajetaan oikea Seura-sivun koodi vm:ssä (kuten sisarusbugi.test.js).
   · olemassa olevan P10-pelaajan ikkunassa P10 valittuna (id, ei nimi)  · tyhjä valinta ei muuta joukkueita  · uusi pelaaja ilman joukkuetta estetty
   · ikkunan uudelleenavaus nollaa napin ja linkin  · yksi nappi kortissa, piilossa kun suostumus annettu  · kehityssuunnitelma-sana  · kutsun tila lahetetty / epaonnistui */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';
import { fakeDb } from './_fakeFirestore.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(import.meta.url);
const PM = req(join(ROOT, 'lib', 'tm_paikkamerkki.js')), TJ = req(join(ROOT, 'lib', 'tm_joukkue.js')), TS = req(join(ROOT, 'lib', 'tm_seura_tuonti.js'));
const S = readFileSync(join(ROOT, 'TalentMaster_Seura.html'), 'utf8');

function pura(tunniste) {
  const alku = S.indexOf(tunniste); if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let d = 0;
  for (let j = S.indexOf(') {', alku) + 2; j < S.length; j++) { if (S[j] === '{') d++; else if (S[j] === '}') { d--; if (!d) return S.slice(alku, j + 1); } }
  throw new Error('sulkeet');
}
const JOUKKUEET = [{ id: 'sibbo_p9', nimi: 'P9' }, { id: 'sibbo_p10', nimi: 'P10' }];
const P10 = { id: 'pp1', etunimi: 'Pekko', sukunimi: 'Testi', huoltajaEmail: 'h@tm-testi.fi', syntymaVuosi: 2016, joukkue: 'P10', joukkueNimi: 'P10', joukkueet: ['sibbo_p10'], joukkueetNimet: ['P10'], suostumusTila: 'pilotti' };
const P9 = { id: 'pp2', etunimi: 'Pelle', sukunimi: 'Testi', huoltajaEmail: 'h2@tm-testi.fi', joukkue: 'P9', joukkueNimi: 'P9', joukkueet: ['sibbo_p9'], joukkueetNimet: ['P9'], suostumusTila: 'pilotti' };

function seura(pelaajat, opts) {
  opts = opts || {};
  const alku = {}; pelaajat.forEach((p) => { alku['seurat/sibbo/pelaajat/' + p.id] = Object.assign({}, p); });
  const f = fakeDb(alku), el = {};
  const E = (id) => el[id] || (el[id] = { id, value: '', textContent: '', disabled: false, style: {}, dataset: {}, innerHTML: '', classList: { add() {}, remove() {} },
    options: [{ text: 'P10' }], selectedIndex: 0 });
  const loki = { kutsuFn: [], virheet: [] };
  const ctx = {
    document: { getElementById: E, querySelector: () => null },
    window: { _pelaajatKaikki: pelaajat.map((p) => Object.assign({}, p)) },
    location: { href: 'https://tm.example/talentmaster/TalentMaster_Seura.html' },
    URL, URLSearchParams, Promise, Object, String, Array, console: { log() {}, warn() {}, error() {} }, setTimeout: (fn) => fn(),
    tila: { seuraId: 'sibbo', seuraNimi: 'Sibbo', joukkueet: JOUKKUEET, kayttaja: { uid: 'vp', email: 'vp@tm-testi.fi' } },
    db: f.db, firebase: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } },
    functions: { httpsCallable: (n) => async (d) => { loki.kutsuFn.push([n, d]); if (opts.epaonnistuu) throw new Error('lähetys kaatui'); return { data: { ok: true } }; } },
    _pinFn: () => async () => ({ data: {} }), _pinVirheTeksti: () => 'x', _tmPelaajanKieli: () => ({}),
    tmOnPaikkamerkkiOsoite: PM.tmOnPaikkamerkkiOsoite, PAIKKAMERKKI_SYY: PM.PAIKKAMERKKI_SYY, TM_SEURA_TUONTI: TS,
    tmJoukkueJasenyysIdlla: TJ.tmJoukkueJasenyysIdlla, tmKanonisoiJoukkue: TJ.tmKanonisoiJoukkue,
    paivitaJoukkueValitsin() {}, naytaModalVirhe: (id, t) => loki.virheet.push(t), naytaToast() {}, naytaPelaajaTiedot() {}, confirm: () => true,
  };
  ctx.tmHT = (s) => s; vm.createContext(ctx);
  const osat = ['function _rekBaseUrl() {', 'function avaaRekisteriModal() {', 'function avaaRekisteriModalPelaajalle(', 'function luoRekisteriLinkki() {', 'async function lahetaRekisteriSahkoposti() {',
    'function _rekDuplikaatti(', 'function _suostumusAnnettu(', 'function _suostumusPvm(', 'function _tkKieli(', 'function _tk('].filter((o) => S.indexOf(o) >= 0);
  vm.runInContext(osat.map(pura).join('\n') + '\nthis.uusi=avaaRekisteriModal; this.vanha=avaaRekisteriModalPelaajalle; this.laheta=lahetaRekisteriSahkoposti;', ctx);
  const kentat = (m) => Object.keys(m).forEach((k) => { E(k).value = m[k]; });
  const D = (polku) => f.D.get(polku);
  const kutsut = () => [...f.D.entries()].filter(([k]) => k.startsWith('seurat/sibbo/kutsut/')).map(([, v]) => v);
  const luodut = () => [...f.D.entries()].filter(([k]) => /^seurat\/sibbo\/pelaajat\/[^/]+$/.test(k)).map(([k, v]) => Object.assign({ id: k.split('/').pop() }, v));
  return { ctx, E, loki, kentat, D, kutsut, luodut };
}

describe('Seura · kutsuikkuna: joukkue', () => {
  it('olemassa oleva P10-pelaaja → ikkunassa P10 valittuna (id, ei nimi), nimi ja sähköposti täytetty', () => {
    const t = seura([P10, P9]); t.ctx.window._pelaajatKaikki = [P10, P9];
    t.ctx.vanha('pp1', 'Pekko', 'Testi', 'P10', 'h@tm-testi.fi', '', '', '');
    expect(t.E('rek_joukkue').value).toBe('sibbo_p10'); expect(t.E('rek_etunimi').value).toBe('Pekko'); expect(t.ctx.tila._rekPelaajaId).toBe('pp1');
  });
  it('varalla: pelaajalta puuttuu joukkueet[] → joukkueen nimi kanonisoidaan id:ksi', () => {
    const t = seura([]); t.ctx.vanha('x1', 'A', 'B', 'p9', '', '', '', ''); expect(t.E('rek_joukkue').value).toBe('sibbo_p9');
  });
  it('TYHJÄ VALINTA EI MUUTA: olemassa olevan pelaajan joukkue/joukkueet ennallaan kun valikko on tyhjä', async () => {
    const t = seura([P10]); t.ctx.vanha('pp1', 'Pekko', 'Testi', '', 'h@tm-testi.fi', '', '', ''); t.E('rek_joukkue').value = '';   // käyttäjä tyhjensi valinnan
    await t.ctx.laheta();
    const p = t.D('seurat/sibbo/pelaajat/pp1'); expect(p.joukkueet).toEqual(['sibbo_p10']); expect(p.joukkue).toBe('P10'); expect(p.joukkueNimi).toBe('P10'); expect(p.joukkueetNimet).toEqual(['P10']);
    expect(new URL(t.kutsut()[0].linkki).searchParams.get('joukkue')).toBe('P10');   // linkki ja kutsu käyttävät pelaajan nykyistä joukkuetta
  });
  it('valittu joukkue KORVAA jäsenyyden (P9 → P10, kaikki neljä kenttää)', async () => {
    const t = seura([P9]); t.ctx.vanha('pp2', 'Pelle', 'Testi', 'P9', 'h2@tm-testi.fi', '', '', ''); t.E('rek_joukkue').value = 'sibbo_p10'; await t.ctx.laheta();
    const p = t.D('seurat/sibbo/pelaajat/pp2'); expect(p.joukkueet).toEqual(['sibbo_p10']); expect(p.joukkue).toBe('P10'); expect(p.joukkueNimi).toBe('P10'); expect(p.joukkueetNimet).toEqual(['P10']);
  });
  it('UUSI pelaaja ilman joukkuetta: lähetys estetty, mitään ei luoda', async () => {
    const t = seura([]); t.ctx.uusi(); t.kentat({ rek_etunimi: 'Uusi', rek_sukunimi: 'Pelaaja', rek_hEmail: 'u@tm-testi.fi', rek_joukkue: '' }); await t.ctx.laheta();
    expect(t.loki.virheet).toEqual(['Valitse joukkue.']); expect(t.luodut()).toHaveLength(0); expect(t.kutsut()).toHaveLength(0); expect(t.loki.kutsuFn).toHaveLength(0);
  });
  it('UUSI pelaaja joukkueella: luodaan id:llä (joukkueet[] = [id])', async () => {
    const t = seura([]); t.ctx.uusi(); t.kentat({ rek_etunimi: ' Uusi ', rek_sukunimi: 'Pelaaja ', rek_hEmail: 'u@tm-testi.fi', rek_joukkue: 'sibbo_p10' }); await t.ctx.laheta();
    expect(t.kutsut()).toHaveLength(1); const u = t.luodut()[0]; expect(u.joukkueet).toEqual(['sibbo_p10']); expect(u.joukkue).toBe('P10'); expect(u.etunimi).toBe('Uusi'); expect(u.sukunimi).toBe('Pelaaja');
    expect(t.kutsut()[0].pelaajaNimi).toBe('Uusi Pelaaja');   // nimet trimmattu
  });
});

describe('Seura · kutsuikkuna: nollaus ja tila', () => {
  it('"✓ Lähetetty" ei jää jumiin: uudelleenavaus (uusi JA olemassa oleva pelaaja) nollaa napin tekstin, värin, disabled-tilan, linkin ja tilamuuttujat', async () => {
    const t = seura([P10, P9]); t.ctx.window._pelaajatKaikki = [P10, P9];
    t.ctx.vanha('pp1', 'Pekko', 'Testi', 'P10', 'h@tm-testi.fi', '', '', ''); t.E('lahetaSpostNappi').disabled = false; await t.ctx.laheta();
    expect(t.E('lahetaSpostNappi').textContent).toBe('✓ Lähetetty'); expect(t.ctx.tila._rekLinkki).toBeTruthy();
    for (const avaa of [() => t.ctx.uusi(), () => t.ctx.vanha('pp2', 'Pelle', 'Testi', 'P9', 'h2@tm-testi.fi', '', '', '')]) {
      avaa(); const n = t.E('lahetaSpostNappi'); expect(n.textContent).toBe('📧 Lähetä sähköpostilla'); expect(n.disabled).toBe(true); expect(n.style.opacity).toBe(''); expect(n.style.color).toBe('');
      expect(t.E('linkkiTekstiEl').textContent).toBe(''); expect(t.ctx.tila._rekLinkki).toBe(null); expect(t.ctx.tila._rekHEmail).toBe(null);
    }
  });
  it('kutsun tila: onnistunut lähetys → lahetetty (+ lahetetty-aikaleima); epäonnistunut → epaonnistui + virhe', async () => {
    const ok = seura([P10]); ok.ctx.vanha('pp1', 'Pekko', 'Testi', 'P10', 'h@tm-testi.fi', '', '', ''); await ok.ctx.laheta();
    expect(ok.kutsut()[0].tila).toBe('lahetetty'); expect(ok.kutsut()[0].lahetetty).toBe('TS');
    const vika = seura([P10], { epaonnistuu: true }); vika.ctx.vanha('pp1', 'Pekko', 'Testi', 'P10', 'h@tm-testi.fi', '', '', ''); await vika.ctx.laheta();
    expect(vika.kutsut()[0].tila).toBe('epaonnistui'); expect(vika.kutsut()[0].virhe).toContain('lähetys kaatui');
  });
});

describe('Seura · pelaajakortti ja kutsuhistoria (lähdekoodi)', () => {
  const kortti = S.slice(S.indexOf('<!-- Toiminnot -->'), S.indexOf('<!-- Muokkaa tietoja'));
  it('pelaajakortissa YKSI "Lähetä rekisteröintikutsu" -nappi, piilossa kun suostumus on annettu', () => {
    expect((kortti.match(/Lähetä rekisteröintikutsu/g) || []).length).toBe(1); expect(kortti).toMatch(/\$\{!onAnnettu \? `\s*<button[^`]*Lähetä rekisteröintikutsu/);
  });
  it('"Avaa kehityskortti (IDP)" → "Avaa kehityssuunnitelma" (ei IDP:tä käyttäjälle)', () => { expect(kortti).toContain("tmHT('📋 Avaa kehityssuunnitelma')"); expect(kortti).not.toContain('IDP'); });
  it('kutsuhistoria näyttää tilan selkokielellä (lahetetty / epaonnistui)', () => {
    expect(TS.tmSeuraKutsuTilaTeksti('lahetetty')).toBe('✉️ Lähetetty'); expect(TS.tmSeuraKutsuTilaTeksti('epaonnistui')).toBe('⚠️ Lähetys epäonnistui'); expect(TS.tmSeuraKutsuTilaTeksti('odottaa')).toBe('⏳ Odottaa');
  });
});
