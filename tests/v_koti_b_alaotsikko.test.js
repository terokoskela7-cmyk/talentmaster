/* V-KOTI sv-läpiajo kierros B: pre-harkan blokin alaotsikko renderöityy (Kausi ja jaksot) ja kulkee käännösreitin kautta. Selainportti: tests/v_koti_sv_selain.test.js (PH-pelaajat). */
const fs = require('fs'), path = require('path');
global.window = global; ['tm-methodology', 'tm-profile', 'tm-microcycles', 'tm-prescription', 'tm-prescription-teksti'].forEach((f) => require('../lib/' + f + '.js'));
const T = global.TM.prescription, MASTER = fs.readFileSync(path.join(__dirname, '..', 'TalentMaster_Master_v16.html'), 'utf8');
const pel = (i) => ({ id: 'p' + i, joukkue: 'U13', joukkueet: ['u13'], syntymaVuosi: 2012, flei_viimeisin: 60, flei_ketjut: { sbl: 2.8, sfl: 2.4, ll: 1.3, diag: 2, dfl: 2.2 }, phv_tila: 'PH', biologinenIka_viimeisin: { phv_tila_koodi: 'PH' } });
describe('alaotsikko_avain + alaotsikkoTeksti', () => {
  const r = T.generoimPreHarkka({ pelaajat: [1, 2, 3].map(pel) }, { paiva: new Date(2026, 9, 19) });
  it('jokaisella blokilla on käännettävä avain (+ muuttujat erikseen); fi-teksti ennallaan', () => {
    expect(r.blokit.map((b) => b.alaotsikko_avain && b.alaotsikko_avain.avain)).toEqual(['Valmistaa koko joukkueen — etenkin {nimi}', 'Joukkueen vahvin: {emoji} {nimi} · ka {ka}p · pidetään terävänä', 'Joukkueen heikoin: {emoji} {nimi} · ka {ka}p · nostetaan', 'ADAR — peliäly liittyy liikkeeseen']);
    r.blokit.forEach((b) => expect(T.alaotsikkoTeksti(b, (x) => x)).toBe(b.alaotsikko));
  });
  it('kutsujan t() käännetään: avain + ketjun nimi erikseen ({nimi} t():llä), emoji ja ka sellaisenaan; "pieni" alkukirjain vain aktivointirivillä', () => {
    const t = (x) => ({ 'Joukkueen vahvin: {emoji} {nimi} · ka {ka}p · pidetään terävänä': 'V: {emoji} {nimi} {ka}', Vauhtiketju: 'Fartkedjan', 'Valmistaa koko joukkueen — etenkin {nimi}': 'Alla — {nimi}', Sivuketju: 'Sidokedjan' }[x] || x);
    expect(T.alaotsikkoTeksti(r.blokit[1], t)).toBe('V: ⚡ Fartkedjan 3'); expect(T.alaotsikkoTeksti(r.blokit[0], t)).toBe('Alla — sidokedjan');
  });
  it('ei dataa → avaimet "Ei testidataa" / oletus; tyhjä blokki → tyhjä merkkijono', () => {
    const e = T.generoimPreHarkka({ pelaajat: [{ id: 'x', syntymaVuosi: 2012 }] }, { paiva: new Date(2026, 9, 19) });
    expect(e.blokit.map((b) => b.alaotsikko_avain.avain)).toEqual(['Valmistaa koko joukkueen — etenkin heikointa ketjua', 'Ei testidataa — oletus DFL', 'Ei testidataa', 'ADAR — peliäly liittyy liikkeeseen']); expect(T.alaotsikkoTeksti({}, (x) => x)).toBe(''); expect(T.alaotsikkoTeksti(null, (x) => x)).toBe('');
  });
  it('Master renderöi alaotsikon blokin nimen alla libin apurilla masterT:llä', () => { expect(MASTER).toContain("b.alaotsikko_avain ? '<div style=\"font-size:11px;color:var(--ink3);margin-top:2px\">' + TM.prescription.alaotsikkoTeksti(b, masterT) + '</div>' : ''"); });
});
