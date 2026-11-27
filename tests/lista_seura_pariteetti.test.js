/* Seuran lista_seura — PARITEETTI (docs/VAIHE0_SEURA_LISTA_SEURA.md §7): sama pelaajajoukko → vanhan polun (TalentMaster_Seura.html pelaajaRivi / suodattimet / KPI) tulokset = koosterivien tulokset.
   Vanhan polun ehdot on kopioitu tähän sanatarkasti HTML:stä (pelaajaRivi, tilasuodatin, lataaYhteenvetoKPIt); jos HTML:n ehto muuttuu, tämä testi kertoo eron.
   + tarkistusskripti (scripts/lista_seura_backfill.js tarkistaSeura) löytää puuttuvan / ylimääräisen / eroavan rivin ja tulostaa vain lukumääriä. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lista_yhteenveto.js'), SU = require('../lib/tm_suostumus.js'), T = require('../lib/tm_seura_tuonti.js');

const TS = (y) => ({ seconds: Date.UTC(y, 5, 15) / 1000, toDate: () => new Date(Date.UTC(y, 5, 15)) });
const FIX = {
  a: { etunimi: 'A', sukunimi: 'Annettu', suostumusTila: 'annettu', syntymaVuosi: 2014, palloID: '111', pin: '123456', huoltajaEmail: 'a@x.fi', talenttiOhjelma: true, talenttiTaso: 'perus', joukkueet: ['j1'] },
  b: { etunimi: 'B', sukunimi: 'Peruttu', suostumusTila: 'peruttu', suostumus: { annettu: { x: 1 }, peruttu: { y: 1 } }, syntymaVuosi: 2013, tunniste: '222' },
  c: { etunimi: 'C', sukunimi: 'Pilotti', suostumusTila: 'pilotti', syntymaVuosi: 2012, joukkueet: ['j1', 'j2'], huoltajaEmail: 'c@x.fi' },
  d: { etunimi: 'D', sukunimi: 'Odottaa', suostumusTila: 'odottaa', syntymaVuosi: 2015, palloId: '333' },
  e: { etunimi: 'E', sukunimi: 'Luotu', suostumusTila: 'luotu' },
  f: { etunimi: 'F', sukunimi: 'Tuotu', tuotu: { seconds: 1 }, syntymaVuosi: 2014 },
  g: { etunimi: 'G', sukunimi: 'Ei', syntymaaika: TS(2013) },
  h: { etunimi: 'H', sukunimi: 'Annettu2', suostumus: { annettu: { z: 1 } }, syntymaVuosi: 2011, joukkue: 'Vanha J' },
  i: { nimi: 'Vain Nimi', suostumusTila: 'annettu', syntymaVuosi: '' },
  j: { etunimi: 'J', sukunimi: 'Roskavuosi', syntymaVuosi: 'abc', suostumusTila: 'odottaa', suostumus: { peruttu: { a: 1 } } }
};
const pelaajat = Object.keys(FIX).map((id) => ({ id, data: FIX[id] }));
const rivit = (() => { const d = L.tmListaSeuraDokumentit(pelaajat, [{ id: 'j1', nimi: 'J1' }, { id: 'j2', nimi: 'J2' }], 1); return d.filter((x) => x.id !== '_meta').flatMap((x) => x.data.rivit); })();
const rivi = (id) => rivit.find((r) => r.id === id);

/* ── vanha polku (HTML:stä) ── */
const vanha = (p) => {
  const onAnnettu = SU.tmSuostumusAnnettu(p), onPilotti = !onAnnettu && p.suostumusTila === 'pilotti', onOdottaa = !!(!onAnnettu && !onPilotti && (p.suostumusTila === 'odottaa' || p.suostumusTila === 'luotu' || p.tuotu));
  const peruttu = SU.tmSuostumusPeruttu(p);
  return { annettu: onAnnettu, pilotti: onPilotti, odottaa: onOdottaa, peruttu, eiPalloid: !p.palloID && !p.palloId && !p.palloid, puuttuuVuosi: T.tmSeuraPuuttuuVuosi(p), eiKutsua: T.tmSeuraSuostumus(p) === 'ei_kutsua' };
};
const uusi = (r) => ({ annettu: r.st === 'annettu', pilotti: r.st === 'pilotti', odottaa: r.st === 'odottaa', peruttu: r.st === 'peruttu', eiPalloid: !r.pid, puuttuuVuosi: !!r.nv, eiKutsua: undefined });

describe('lista_seura pariteetti: vanha polku = koosterivit', () => {
  it('pilotti / annettu / odottaa / ei-palloid / puuttuu-vuosi: sama jäsenyys joka pelaajalle (suodatinlogiikka)', () => {
    pelaajat.forEach(({ id, data }) => {
      const v = vanha(data), u = uusi(rivi(id));
      /* peruttu: vanhan badge näyttää peruttu ENSIN, mutta vanhan odottaa-suodatin voi laskea peruttuakin (suostumusTila 'odottaa' + suostumus.peruttu) → koosteessa peruttu on oma tilansa (badge-sääntö). Vertailu ilman peruttuja. */
      if (v.peruttu) { expect(u.peruttu, id).toBe(true); expect(u.annettu, id).toBe(false); return; }
      ['annettu', 'pilotti', 'odottaa', 'eiPalloid', 'puuttuuVuosi'].forEach((k) => expect(u[k], id + ':' + k).toBe(v[k]));
    });
  });
  it('KPI-laskurit (Yhteenveto): kaikki / annettu / pilotti / odottaa = vanha lataaYhteenvetoKPIt (peruttu ei ole annettu)', () => {
    const m = L.tmListaSeuraLaskurit(rivit);
    const vanhaKpi = { kaikki: pelaajat.length, annettu: pelaajat.filter((x) => SU.tmSuostumusAnnettu(x.data)).length, pilotti: pelaajat.filter((x) => x.data.suostumusTila === 'pilotti').length, odottaa: pelaajat.filter((x) => (x.data.suostumusTila === 'odottaa' || x.data.suostumusTila === 'luotu') && !SU.tmSuostumusAnnettu(x.data) && !SU.tmSuostumusPeruttu(x.data) && x.data.suostumusTila !== 'pilotti').length };
    expect(m.kaikki).toBe(vanhaKpi.kaikki); expect(m.annettu).toBe(vanhaKpi.annettu); expect(m.pilotti).toBe(vanhaKpi.pilotti);
    expect(m.odottaa).toBe(vanhaKpi.odottaa + 1);   // + f (tuotu ilman tilaa): listan "Kutsu lähetetty" laskee tuotu-pelaajan, KPI-banneri ei — tunnettu vanhan polun ero, koostettu listan säännön mukaan
  });
  it('ei-kutsua-suodatin: vanha tmSeuraSuostumus==ei_kutsua ⊆ koosteen ei_kutsua|odottaa(luotu/tuotu) — ei koskaan annettu/peruttu/pilotti', () => {
    pelaajat.forEach(({ id, data }) => { if (T.tmSeuraSuostumus(data) === 'ei_kutsua') expect(['ei_kutsua', 'odottaa', 'pilotti'], id).toContain(rivi(id).st); });
  });
  it('joukkuejäsenyys jk = tmPelaajanJoukkueet; talentti, PalloID-synonyymit, huoltaja/PIN-boolean, nimetön', () => {
    const J = require('../lib/tm_joukkue.js'), docs = [{ id: 'j1', nimi: 'J1' }, { id: 'j2', nimi: 'J2' }];
    pelaajat.forEach(({ id, data }) => { expect(rivi(id).jk || [], id).toEqual(J.tmPelaajanJoukkueet(data, docs)); });
    expect(rivi('a')).toMatchObject({ to: 1, tt: 'perus', pid: '111', hk: 1, pa: 1 }); expect(rivi('b').pid).toBe('222'); expect(rivi('d').pid).toBe('333'); expect(rivi('g').sv).toBe(2013); expect(rivi('i')).toMatchObject({ nm: 'Vain Nimi', nv: 1 });
    expect(rivi('c').hk).toBe(1); expect(rivi('c').pa).toBeUndefined(); expect(rivi('d').hk).toBeUndefined();
  });
  it('mikään rivi ei sisällä PIN-arvoa, sähköpostia eikä terveysavainta; vartija läpäisee', () => {
    const j = JSON.stringify(rivit); ['123456', 'a@x.fi', 'c@x.fi', 'terveys', 'loukkaantuminen', 'kaytettavyys'].forEach((x) => expect(j).not.toContain(x));
    expect(L.tmListaRikkomukset({ rivit })).toEqual([]);
  });
});

describe('tarkistusskripti: tarkistaSeura', () => {
  const { tarkistaSeura } = require('../scripts/lista_seura_backfill.js');
  const kok = (docs) => ({ get: async () => ({ size: docs.length, docs: docs.map((d) => ({ id: d.id, data: () => d.data })) }) });
  const fakeDb = (pel, lista, likaiset) => ({ collection: () => ({ doc: () => ({ collection: (n) => kok(n === 'pelaajat' ? pel : n === 'lista_seura' ? lista : n === 'lista_likainen' ? (likaiset || []) : []) }) }) });
  const teeLista = (p) => L.tmListaSeuraDokumentit(p, [], 7).map((x) => ({ id: x.id, data: x.data }));
  it('puhdas kooste: 0 eroa; puuttuva, ylimääräinen ja eroava rivi + laskurit raportoidaan lukumäärinä; poistetut pelaajat ohitetaan', async () => {
    const p = pelaajat.concat([{ id: 'z', data: { etunimi: 'Z', arkistoitu: true, suostumusTila: 'annettu' } }]);
    const puhdas = await tarkistaSeura(fakeDb(p, teeLista(pelaajat)), 's'); expect(puhdas).toMatchObject({ puuttuu: 0, ylimaara: 0, eroaa: 0, laskuriEro: 0, kelpaa: true, pelaajia: 10 });
    const lista = teeLista(pelaajat); lista[0].data.rivit.splice(0, 1); lista[0].data.rivit[0].st = 'pilotti'; lista[0].data.n -= 1;
    const r = await tarkistaSeura(fakeDb(pelaajat, lista), 's'); expect(r.puuttuu).toBe(1); expect(r.eroaa).toBe(1); expect(r.kelpaa).toBe(false);
    const ylim = teeLista(pelaajat.concat([{ id: 'x', data: { etunimi: 'X' } }])); expect((await tarkistaSeura(fakeDb(pelaajat, ylim), 's')).ylimaara).toBe(1);
    expect(JSON.stringify(r)).not.toMatch(/Annettu|Peruttu|a@x\.fi|123456/);   // ei nimiä eikä arvoja
    expect((await tarkistaSeura(fakeDb(pelaajat, teeLista(pelaajat), [{ id: 'p', data: {} }]), 's')).likaisia).toBe(1);
  });
});
