/* PSEUDOKIELITESTI (PR C): Koti ja Tilanne piirretään käännösfunktiolla, joka merkitsee jokaisen tekstin ⟦…⟧. Näkyvässä tekstissä ei saa olla merkitsemätöntä tekstiä
   (= kovakoodattu suomi, jota sv/en-käännös ei tavoita). Data (joukkuenimet, tunnisteet, kalenteri/viestitekstit, luvut, päivät, symbolit) on poissuljettu.
   Luvun sisältävät tekstit ovat muotoa t('… {n} …') + _fill (ei paloittelua): kukin kokonaislause on yhtenä ⟦…⟧-merkinnän sisällä. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const F = require('./helpers/vp_fixture.cjs'), TT = require('../lib/tm_vp_tilanne.js'), KK = require('../lib/tm_vp_koti.js');
const NYT = Date.UTC(2026, 9, 12, 7, 0), ps = (x) => '⟦' + x + '⟧';
const sanat = (s) => String(s).split(/[^A-Za-zÅÄÖåäöÖÅÄ'’-]+/).filter((x) => x.length > 1);
/* poistaa ⟦…⟧-lohkot (myös sisäkkäiset/täytetyt) ja palauttaa jäljelle jääneet sanat sekä tekstin */
const jaljella = (html) => {
  const teksti = html.replace(/<[^>]*>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); let x = teksti, ed; do { ed = x; x = x.replace(/⟦[^⟦⟧]*⟧/g, ' '); } while (x !== ed);
  return x;
};
const data = (d) => { const s = new Set(); const lisaa = (v) => sanat(v).forEach((w) => s.add(w.toLowerCase()));
  Object.values(d.nimet).forEach(lisaa); d.kalenteri.forEach((e) => lisaa(e.nimi)); (d.viestit || []).forEach((v) => { lisaa(v.teksti); lisaa(v.nimi); }); d.spec.joukkueet.forEach((j) => { lisaa(j.nimi); if (j.jakso) lisaa(j.jakso.nimi); });
  ['Demo', 'FC', 'Pilotti', 'W'].forEach(lisaa); ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su'].forEach((p) => s.add(p)); return s; };   // viikonpäiväkoodit ovat päiväystä (data; kielen mukaan Intl-lokaali, ks. kieli-valitsin)
const loydot = (html, d) => { const sallitut = data(d); return sanat(jaljella(html)).filter((w) => !sallitut.has(w.toLowerCase())); };

describe('pseudokieli: Tilanne ja Koti (Käynnistys) — ei merkitsemätöntä tekstiä', () => {
  F.TILAT.forEach((tila) => {
    const d = F.lataa(tila, NYT);
    it(tila + ' · Tilanne: kaikki näkyvä teksti kulkee käännösfunktion kautta', () => {
      const h = TT.tmTilanneHTML(TT.tmTilanneMalli(d.syote), { t: ps, fn: { joukkue: 'j', esityslista: 'e', hyvaksy: 'h', muokkaa: 'm', hylkaa: 'y', aloitaJaksot: 'a', valmentaja: 'v', auki: 'au', testijakso: 't', ryhmat: 'r', rae: 'ra' } });
      expect(h).toContain('⟦'); expect(loydot(h, d), 'merkitsemätöntä tekstiä').toEqual([]);
    });
  });
  ['tyhja', 'pilotti', 'kuormitus'].forEach((tila) => {
    const d = F.lataa(tila, NYT);
    it(tila + ' · Koti (Käynnistys): kaikki näkyvä teksti kulkee käännösfunktion kautta (askeleet, lista, palsta)', () => {
      const h = F.kotiHTML(d, { t: ps });
      expect(h).toContain('⟦'); expect(loydot(h, d), 'merkitsemätöntä tekstiä').toEqual([]);
    });
  });
  it('Tilanne, kaikki haarat: huomiotyypit (tasoero, alaraja, kehitys, vanha mittaus), jokainen ehdotustyyppi, signaali (auki / valmis), laajat listat', () => {
    const d = F.lataa('kypsa', NYT), P = (o) => Object.assign({ joukkue: 'P12 Demo', tyyppi: 'alle_normin', osaAlue: 'tekniikka', vakavuus: 'amber', arvo: 2, teema: 'x', alaraja: false, kypsyysEstetty: null }, o || {});
    d.syote.poikkeamat = [P(), P({ tyyppi: 'talenttiydin', osaAlue: null }), P({ joukkue: 'P13 Demo', osaAlue: 'kiihdytys', alaraja: true }), P({ joukkue: 'P14 Demo', tyyppi: 'laskeva', osaAlue: null }), P({ joukkue: 'T12 Demo', osaAlue: 'voima' }), P({ joukkue: 'P10 Demo' }), P({ joukkue: 'P11 Demo' })];
    d.syote.mitattu = d.syote.mitattu.map((x, i) => (i === 5 ? Object.assign({}, x, { pvm: '2025-01-01', ms: Date.UTC(2025, 0, 1) }) : x));
    const sigs = ['tki_alhainen', 'tki_lahella_merkkia', 'hh_taso_alhainen', 'suunta_lasku', 'flei_kartoitus_puuttuu', 'tkk_puuttuu', 'tuntematon'], nimet = d.spec.joukkueet.map((j) => j.nimi);
    d.syote.ehdotukset = sigs.map((sg, i) => ({ ids: ['i' + i], signaali: sg, luotu: { seconds: NYT / 1000 - 3600 }, teksti: 'raaka', joukkueet: i === 0 ? [nimet[0]] : nimet }));
    const fn = { joukkue: 'j', esityslista: 'e', hyvaksy: 'h', muokkaa: 'm', hylkaa: 'y', aloitaJaksot: 'a', valmentaja: 'v', auki: 'au', testijakso: 't', ryhmat: 'r', rae: 'ra' };
    [{}, { auki: { huomiot: true, jaksot: true, kaista: true } }].forEach((o) => { const h = TT.tmTilanneHTML(TT.tmTilanneMalli(d.syote), Object.assign({ t: ps, fn }, o)); expect(loydot(h, d), 'merkitsemätöntä tekstiä').toEqual([]); });
    const valmis = F.lataa('kypsa', NYT); valmis.syote.joukkueet.forEach((j) => { j.katselmusAuki = false; }); expect(loydot(TT.tmTilanneHTML(TT.tmTilanneMalli(valmis.syote), { t: ps, fn }), valmis)).toEqual([]);
    const kaksi = F.lataa('kypsa', NYT); kaksi.syote.joukkueet.slice(0, 2).forEach((j) => { j.katselmusAuki = true; }); expect(loydot(TT.tmTilanneHTML(TT.tmTilanneMalli(kaksi.syote), { t: ps, fn }), kaksi)).toEqual([]);
  });
  it('Koti, kaikki haarat: signaalit (katselmus, katsaus, käyttö), viestit eri ajoilta, kolme askelta valmiina, esimerkkiseura-nauha', () => {
    const d = F.lataa('pilotti', NYT), PU = require('../lib/tm_seuran_pulssi.js'), v = d.koosteet[d.koosteet.length - 1]; Object.keys(v.joukkueet).forEach((k) => { v.joukkueet[k].n_suostumus = v.joukkueet[k].n_pelaajat; });
    const m = PU.tmPulssiRivit(d.koosteet, { nytMs: NYT, ensimmainenVk: d.ensin, jaksoVk: d.jaksoVk, katselmusPv: {} }), j0 = m.rivit.find((r) => r.jakso.voimassa);
    m.signaalitKaikki = [{ tyyppi: 'katselmusikkuna', jid: j0.jid, nimi: j0.nimi, pv: 3, auki: 2 }, { tyyppi: 'katselmusikkuna', jid: j0.jid, nimi: j0.nimi, pv: null, auki: 1 }, { tyyppi: 'katsaus_laskee', jid: j0.jid, nimi: j0.nimi, alku: 70, loppu: 40 }, { tyyppi: 'kaytto_matala', jid: j0.jid, nimi: j0.nimi, pros: 12, tavoite: 25 }];
    const viestit = [{ id: 'a', osapuoli: 'u', nimi: 'P12', teksti: 'Moi', ms: NYT - 3600000 }, { id: 'b', osapuoli: 'u', nimi: 'P12', teksti: 'Hei', ms: NYT - 3 * 86400000 }];
    const km = KK.tmKotiKaynnistysMalli(m, { yhteensa: v.yhteensa, koosteJ: v.joukkueet, testit: d.tapahtumat, nimet: d.nimet, kalenteri: d.kalenteri, viestit, nytMs: NYT, seuraNimi: 'Demo FC' });
    km.askeleet.forEach((a) => { a.valmis = true; a.taytetty = false; });
    const fn = { opas: 'o', aloitaJaksot: 'a', kutsu: 'k', testit: 't', joukkue: 'j', viesti: 'vi', tilanne: 'ti', kalenteri: 'ka', paivita: 'pa', demo: 'de', auki: 'au', tuo: 'tu' }, r = KK.tmKotiKaynnistysHTML(km, { t: ps, pika: [{ teksti: 'Uusi tapahtuma', fn: 'x' }], fn, auki: { odottaa: true } });
    d.viestit = viestit; expect(r.main + r.rail).toContain('⟦Katselmusikkuna sulkeutuu 3 päivän päästä⟧'); expect(loydot(r.main + r.rail, d), 'merkitsemätöntä tekstiä').toEqual([]);
    expect(loydot(KK.tmKotiDemoNauhaHTML({ t: ps, fn: { demo: 'de' } }), d)).toEqual([]);
  });
  it('kypsä · Koti (Rytmi, lib/tm_seuran_pulssi.js): PR D uudistaa — ei vielä pseudokielitestissä (löydökset korjataan Rytmi-uudistuksessa)', () => { expect(KK.tmKotiVaihe(require('../lib/tm_seuran_pulssi.js').tmPulssiRivit(F.lataa('kypsa', NYT).koosteet, { nytMs: NYT, ensimmainenVk: F.lataa('kypsa', NYT).ensin, jaksoVk: {}, katselmusPv: {} }))).toBe('rytmi'); });
  it('negatiivitesti: kovakoodattu suomi löytyy; sama teksti ⟦⟧:n sisällä ei', () => { expect(sanat(jaljella('<b>Kovakoodattu teksti</b> ⟦merkitty⟧'))).toEqual(['Kovakoodattu', 'teksti']); expect(jaljella('⟦Jakso {n}⟧')).not.toMatch(/Jakso/); });
});
