/* sv-erä 99 (B12, PM 8.11.2026) — Seurahallinnan muut muodot, 121 riviä. Code ei kirjoita ruotsia (§0): koodin sv = PM:n palautus (sha a325d04d…2b2f) merkki merkiltä.
   Kohde lib/tm_henkilosto_i18n.js (tmHT). Reititys: lib/tm_kehitystilanne.js (kutsujan T / _T, rivimäärä ennallaan), Seuran kirjautumissivu (data-i18n),
   LAAJENNETTU = tmHT(taso.toUpperCase()). Raportit (raporttiHTML) pysyvät suomeksi (PM: Palloliitto-raportti suomeksi, seuran raportti omana eränään). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_99_palautus.json')).osiot, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_99_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era99.cjs'), H = require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv;
const C = (() => { const m = require('../lib/tm_i18n_common.js'); return (m.TM_I18N_COMMON || global.TM_I18N_COMMON).sv; })();
const KT = require('../lib/tm_kehitystilanne.js'), K = require('../lib/tm_kehikot.js');
const { lueKuori } = require('../scripts/kuoren_lahde.js');
const rivit = P.seura_muodot.rivit;
const DATA = require('./helpers/kehitystilanne_demodata.cjs')(require('path').join(__dirname, '..')), NYT = '2026-10-02';
const svT = (k) => (typeof C[k] === 'string' ? C[k] : typeof H[k] === 'string' ? H[k] : k);
const pakota = (tila) => { const m = KT.rakennaMalli(DATA, { nyt: NYT }); m.lohko1.rivit.forEach((r) => { r.tila = tila(r.tekija || (K.MITTARIT[r.avain] || {}).tekija); }); return m; };

describe('sv-erä 99 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha); 121 riviä = lähetetty erä; lähetetty sv tyhjä, palautettu täytetty, samat paikkamerkit', () => {
    expect(createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_99_palautus.json')).digest('hex')).toBe('a325d04d3915678251497ab9cba764043ba317ca19358cb111efc6fdd4df2b2f');
    expect(Object.keys(P)).toEqual(['seura_muodot']); expect(Object.keys(rivit)).toHaveLength(121);
    expect(Object.keys(rivit).sort()).toEqual(Object.keys(G.seura_muodot.rivit).sort());
    const pm = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
    for (const [k, r] of Object.entries(rivit)) { expect(G.seura_muodot.rivit[k].sv, k).toBe(''); expect(r.fi, k).toBe(k); expect(r.sv.trim(), k).not.toBe(''); expect(pm(r.sv), k).toBe(pm(k)); }
  });
  it('koodin sv = palautus merkki merkiltä (henkilöstökartta), eikä yhteinen kartta peitä riviä', () => {
    for (const [k, r] of Object.entries(rivit)) { expect(H[k], k).toBe(r.sv); expect(C[k], k).toBeUndefined(); }
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => {
    const t = V.vie({ kirjoita: false });
    expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(121);
  });
  it('kootut avaimet ja LAAJENNETTU: koodikatkelma on koodissa', () => {
    const koodi = teksti('lib/tm_kehitystilanne.js') + lueKuori('TalentMaster_Seura.html');
    for (const [k, kd] of Object.entries(V.KOODISSA)) expect(koodi.includes(kd), k).toBe(true);
  });
});

describe('reititys ajettuna: sv-reititin → PM:n rivit, ilman reititintä suomi', () => {
  it('otsikon muodot (pakotetut tilat) ja Seuraavaksi-rivi', () => {
    const e = (m) => KT.ensinakymaMalli(m, svT);
    const sv = (k) => rivit[k].sv;
    expect(e(pakota(() => 'raiteilla')).otsikko).toBe(sv('Seura on menossa oikeaan suuntaan.'));
    expect(e(pakota(() => 'riskissa')).otsikko).toBe(sv('Kaikilla kolmella alueella on tavoitteita, jotka jäävät vajaaksi.'));
    const yksi = e(pakota((t) => (t === 'valmennus' ? 'riskissa' : 'raiteilla'))).otsikko;
    expect(yksi).toContain(sv('{hyvat} ovat raiteilla, {heikot} jää tavoitteesta.').split('{hyvat}')[1].split('{heikot}')[0]);
    expect(e(pakota(() => 'raiteilla')).seuraavaksi).not.toMatch(/Kirjaa|Pidä suunta/);   // demodata: vanha testikierros → testikierros-rivi
    expect(KT.ensinakymaMalli(pakota(() => 'raiteilla')).otsikko).toBe('Seura on menossa oikeaan suuntaan.');
  });
  it('ensinäkymän paneelit ruotsiksi: erän staattiset tekstit näkyvät PM:n muodossa', () => {
    const m = KT.rakennaMalli(DATA, { nyt: NYT, jakso: 'kevat' });
    const h = [{ info: true }, { avoin: 'pelaajat' }, { avoin: 'pelaajat', k1bRef: 'bio' }, { avoin: 'valmennus', saaKirjoittaa: true }, { avoin: 'seura' }, { kaikki: true }]
      .map((o) => KT.renderEnsinakyma(m, Object.assign({ t: svT }, o))).join('').replace(/&quot;/g, '"');
    for (const k of ['ⓘ Miten luvut lasketaan', 'Laskentaperiaatteet', 'Datan kattavuus', 'Oliko muutos todellinen?', 'Kehittyykö vaadittua vauhtia?', 'Kalenteri-ikä', 'Pojat', 'Tytöt',
      'Lapsuus (U8–U12)', 'Omat tavoitteet ja Palloliiton taso', 'Rakenteet ja Kori 3 -vaatimukset', 'Harjoitushavainnot', 'Piilota kaikki luvut ‹', 'Pelaajat kehittyvät · fyysinen']) expect(h, k).toContain(rivit[k].sv);
    expect(h).toContain(rivit['kevät {v}'].sv.replace('{v}', '2026'));
    for (const fi of ['Laskentaperiaatteet', 'Oliko muutos todellinen?', 'Pojat', 'Piilota kaikki luvut']) expect(h, fi).not.toContain(fi);
  });
  it('raportit pysyvät suomeksi myös ruotsinkielisen näkymän jälkeen (_T nollataan)', () => {
    const m = KT.rakennaMalli(DATA, { nyt: NYT }), ennen = [KT.raporttiHTML(m, 'seura'), KT.raporttiHTML(m, 'palloliitto')];
    KT.renderEnsinakyma(m, { t: svT, avoin: 'seura' });
    expect([KT.raporttiHTML(m, 'seura'), KT.raporttiHTML(m, 'palloliitto')]).toEqual(ennen);
  });
  it('kirjaston rivimäärä ennallaan (katto 684): reititys olemassa oleville riveille', () => {
    expect(teksti('lib/tm_kehitystilanne.js').split('\n').length - 1).toBe(684);
  });
});

describe('Seura: kirjautumissivu ja LAAJENNETTU', () => {
  const S = lueKuori('TalentMaster_Seura.html');
  it('kirjautumissivun 5 tekstiä reititetty data-i18n:llä (arvo = fi-teksti); Sähköposti ja Salasana yhteisestä kartasta', () => {
    for (const k of ['Sähköposti', 'Salasana', 'Unohditko salasanan?', 'Jos työsähköposti estää linkin, pyydä valmennuspäällikköä jakamaan se WhatsAppilla.']) expect(S, k).toMatch(new RegExp('data-i18n="' + k.replace(/[.?*+()]/g, '\\$&') + '">' + k.replace(/[.?*+()]/g, '\\$&') + '<'));
    expect(S).toContain('placeholder="vp@seura.fi" data-i18n-ph="vp@seura.fi"');
    expect(typeof C['Sähköposti']).toBe('string'); expect(typeof C['Salasana']).toBe('string');
  });
  it('LAAJENNETTU ja PERUS samasta kohdasta tmHT:llä', () => {
    expect(S).toContain('${tmHT(taso.toUpperCase())}');
    expect(H.LAAJENNETTU).toBe(rivit.LAAJENNETTU.sv); expect(typeof H.PERUS).toBe('string');
  });
});
