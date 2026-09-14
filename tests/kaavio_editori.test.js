/**
 * Kaavioeditorin tila- ja koordinaattikerros (erä B).
 *
 * KOVIN VÄITE: editorin koordinaattimappi on IDENTTINEN tm_kaavio_render.js:n kanssa. Jos ne
 * eriytyvät, editori ei osu renderöidyn kaavion päälle — ja se rikkoutuisi hiljaa, koska
 * molemmat toimivat erikseen "oikein". Siksi mappi väitetään suoraan render-libiä vasten.
 *
 * Lisäksi: write-path-portti (§6-validaattori) ajetaan editorin TUOTTAMALLE specille — ei riitä
 * että validaattori toimii käsin tehdyllä syötteellä.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const E = require('../lib/tm_kaavio_editori.js');
const R = require('../lib/tm_kaavio_render.js');
const V = require('../lib/tm_kaavio_validate.js');

const SPEC = () => ({
  avain: 't_h0', suunta: 'ylos', pelimuoto: '5v5',
  pelaajat: [
    { id: 'P', joukkue: 'oma', rooli: 'syöttäjä', x: 52, y: 90, pallo: true },
    { id: 'T', joukkue: 'oma', rooli: 'vastaanottaja', x: 43, y: 74, avoin: -58 },
    { id: 'V', joukkue: 'vastustaja', rooli: 'paine', x: 40, y: 63 }
  ],
  liikkeet: [{ id: 'L1', tyyppi: 'syotto', from: { ref: 'P' }, to: { ref: 'T' } }]
});

describe('koordinaatisto · LUKITTU render-libiin', () => {
  it('PX/PY ovat identtiset render-libin kanssa koko asteikolla', () => {
    for (let v = 0; v <= 100; v += 5) {
      expect(E.kaavioEdPX(v)).toBeCloseTo(R.kaavioPX(v), 10);
      expect(E.kaavioEdPY(v)).toBeCloseTo(R.kaavioPY(v), 10);
    }
  });
  it('inverssi on aito inverssi (pikseli→spec→pikseli)', () => {
    for (let v = 0; v <= 100; v += 7) {
      expect(E.kaavioEdOY(E.kaavioEdPY(v))).toBeCloseTo(v, 6);
      expect(E.kaavioEdOX(E.kaavioEdPX(v))).toBeCloseTo(v, 6);
    }
  });
  it('EI viewport-mappia: y=34 ei ole enää kentän ylälaita', () => {
    // Prototyypin 66%-mapilla PY(34) === PAD (ylälaita). Täyskentällä se on selvästi alempana.
    expect(E.kaavioEdPY(34)).toBeGreaterThan(E.kaavioEdPY(0) + 50);
    expect(E.kaavioEdPY(0)).toBeCloseTo(12, 6);          // PAD
  });
  it('inverssi sallii y<34 (viewport ei enää rajaa dataa)', () => {
    expect(E.kaavioEdOY(E.kaavioEdPY(10))).toBeCloseTo(10, 6);
  });
});

describe('tilaoperaatiot · puhtaus', () => {
  it('lisäys ei mutatoi alkuperäistä', () => {
    const a = SPEC();
    const b = E.kaavioLisaaPelaaja(a, { joukkue: 'oma', x: 10, y: 20 });
    expect(a.pelaajat.length).toBe(3);
    expect(b.spec.pelaajat.length).toBe(4);
  });
  it('pelimuoto-katto estää ylityksen (5v5 → max 5 omaa)', () => {
    let s = SPEC();
    for (let i = 0; i < 3; i++) s = E.kaavioLisaaPelaaja(s, { joukkue: 'oma' }).spec;
    expect(s.pelaajat.filter((p) => p.joukkue === 'oma').length).toBe(5);
    const yli = E.kaavioLisaaPelaaja(s, { joukkue: 'oma' });
    expect(yli.virhe).toBe('pelimuoto_taynna');
    expect(yli.spec.pelaajat.length).toBe(5 + 1);        // spec palautuu muuttumattomana
  });
  it('≤1 pallollinen: uusi pallollinen nollaa edellisen', () => {
    const s = E.kaavioLisaaPelaaja(SPEC(), { joukkue: 'oma', pallo: true }).spec;
    expect(s.pelaajat.filter((p) => p.pallo).length).toBe(1);
    expect(V.validoiKaavio(s).E).toEqual([]);
  });
});

describe('siirto · pikseli↔spec', () => {
  it('siirto pikseleillä päätyy oikeaan spec-koordinaattiin', () => {
    const s = E.kaavioSiirraPelaaja(SPEC(), 'T', E.kaavioEdPX(25), E.kaavioEdPY(60)).spec;
    const t = s.pelaajat.find((p) => p.id === 'T');
    expect(t.x).toBeCloseTo(25, 1);
    expect(t.y).toBeCloseTo(60, 1);
  });
  it('siirto clampataan kentälle', () => {
    const s = E.kaavioSiirraPelaaja(SPEC(), 'T', -9999, 9999).spec;
    const t = s.pelaajat.find((p) => p.id === 'T');
    expect(t.x).toBe(0); expect(t.y).toBe(100);
  });
  it('tuntematon id ei riko tilaa', () => {
    const r = E.kaavioSiirraPelaaja(SPEC(), 'EIOLE', 100, 100);
    expect(r.virhe).toBe('tuntematon_id');
  });
});

describe('snap · päätepiste napsahtaa pelaajaan', () => {
  it('lähellä olevaan pelaajaan → ref', () => {
    expect(E.kaavioSnapPaate(SPEC(), 43.5, 74.5)).toEqual({ ref: 'T' });
  });
  it('kaukana → vapaa piste', () => {
    expect(E.kaavioSnapPaate(SPEC(), 5, 5)).toEqual({ x: 5, y: 5 });
  });
  it('kynnys on SPEC-yksiköissä → riippumaton katselukoosta', () => {
    expect(E.kaavioSnapPaate(SPEC(), 43, 80, 2)).toEqual({ x: 43, y: 80 });
    expect(E.kaavioSnapPaate(SPEC(), 43, 80, 10)).toEqual({ ref: 'T' });
  });
});

describe('poisto · VIITE-EHEYS (write-path-portin edellytys)', () => {
  it('pelaajan poisto poistaa häneen osoittavat liikkeet', () => {
    const s = E.kaavioPoista(SPEC(), 'T').spec;
    expect(s.pelaajat.find((p) => p.id === 'T')).toBeUndefined();
    expect(s.liikkeet.length).toBe(0);
    expect(V.validoiKaavio(s).E).toEqual([]);            // ei jää orpoa viitettä
  });
  it('ILMAN siivousta validaattori hylkäisi — todiste että siivous on tarpeen', () => {
    const rikki = SPEC();
    rikki.pelaajat = rikki.pelaajat.filter((p) => p.id !== 'T');   // naiivi poisto
    expect(V.validoiKaavio(rikki).E.join(' ')).toContain('tuntemattomaan');
  });
  it('peittovarjot siivotaan samoin', () => {
    const s0 = SPEC(); s0.peittovarjot = [{ from: 'V', to: 'T' }];
    const s = E.kaavioPoista(s0, 'T').spec;
    expect(s.peittovarjot).toBeUndefined();
  });
});

describe('undo', () => {
  it('kumoaa viimeisimmän tilan', () => {
    const a = SPEC();
    let h = E.kaavioHistoriaLisaa([], a);
    const b = E.kaavioLisaaPelaaja(a, { joukkue: 'oma', x: 1, y: 1 }).spec;
    const k = E.kaavioKumoa(h);
    expect(k.spec.pelaajat.length).toBe(3);
    expect(b.pelaajat.length).toBe(4);
  });
  it('tyhjä historia → null (ei kaadu)', () => expect(E.kaavioKumoa([]).spec).toBeNull());
  it('historia on rajattu', () => {
    let h = [];
    for (let i = 0; i < 60; i++) h = E.kaavioHistoriaLisaa(h, SPEC(), 40);
    expect(h.length).toBeLessThanOrEqual(40);
  });
});

describe('WRITE-PATH-PORTTI · editorin tuottama spec validoidaan', () => {
  it('editorilla rakennettu spec läpäisee §6:n', () => {
    let s = SPEC();
    s = E.kaavioLisaaPelaaja(s, { joukkue: 'vastustaja', rooli: 'paine', x: 30, y: 55 }).spec;
    s = E.kaavioSiirraPelaaja(s, 'T', E.kaavioEdPX(48), E.kaavioEdPY(70)).spec;
    s = E.kaavioLisaaLiike(s, 'juoksu', 'T', 'P').spec;
    expect(V.validoiKaavio(s).E).toEqual([]);
  });
  it('editorin tuottama EPÄVALIDI spec hylätään (kirjoitus estyy)', () => {
    let s = SPEC();
    s.pelaajat = s.pelaajat.filter((p) => p.id !== 'T');            // ohitetaan siivous tahallaan
    expect(V.kaavioKelpaa(s)).toBe(false);
  });
});
