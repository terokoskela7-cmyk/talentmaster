/* Sibbo-reititys (#1077:n jatko): suomenkielisen tulosteen PARITEETTI. Kolme reititettyä kokonaisuutta; fi-teksti ei muutu sanaakaan.
 *  1) Harjoitusarviointilomake (lib/tm_harjoitusarviointi.js): renderöity HTML on tavutarkasti sama kuin ennen reititystä (hajautukset otettu alkuperäisestä libistä origin/main@d399475a) kuudella kokoonpanolla;
 *     sv-tilassa (t-adapteri) jokainen näkyvä teksti kulkee t():n läpi.
 *  2) Suostumuslomake: jokainen _st('suostumus.avain', 'fi-varateksti') -kutsu: varateksti = tm_lang.fi (ilman avainta/ennen latausta teksti on sama kuin ennen) ja sama kuin alkuperäinen teksti (ALKUPERAISET).
 *  3) Kehitystyöpöydän ikävaihe kulkee opts.t:n läpi, fi ennallaan.
 * Code EI kirjoita ruotsia (CLAUDE.md §0): testit käyttävät merkkiadapteria ⟦…⟧, eivät ruotsia. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import crypto from 'crypto';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const { ajaa } = require('./helpers/harjoitusarviointi_ajo.cjs');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

describe('harjoitusarviointilomake: fi-tuloste tavutarkasti ennallaan', () => {
  const HASHIT = {
    a_lapsuus: '9e96db996318b399597e96cbee428708585ed1bc3796d4447de3dc30e7010cdc', a_nuoruus: 'b4f3516eecb7096ea8dfec572eeac474638c8c228b85b9caa06519a2a17277d9',
    b_itsearvio: 'a55a723ef9b5b7897c806caa68d48b20549c7b2f6cf568cfd2ca08a35be1d4cd', b_havainnointi: '142ee54f9ef430404c8d7fa4b241685bf3eb2169f679640b091aad4111fe4ff0',
    ilman_listoja: '74702661d1686cb993ddd7d4b43d916810c355b48c94bba8c91217a4d4a91dcc', a_toggle_kylla: 'f531c62278fa994bdc6dce7834dd89183cb500e5a3d93608bbda2055225c4ee6',
  };
  const fi = ajaa(lue('lib/tm_harjoitusarviointi.js'));
  for (const [nimi, h] of Object.entries(HASHIT)) it(nimi + ': sama HTML kuin ennen reititystä (sha256)', () => { expect(sha(fi[nimi])).toBe(h); });
  it('fi-tuloste ei riipu ajopäivästä: sama hajautus eri kellonajalla (lomake esitäyttää tämän päivän; apuohjelma kiinnittää ajan)', () => {
    const Oikea = Date, T = new Oikea(2031, 0, 2, 3, 4, 5).getTime();
    class Eri extends Oikea { constructor(...a) { if (a.length) super(...a); else super(T); } static now() { return T; } }
    globalThis.Date = Eri;
    try { const eri = ajaa(lue('lib/tm_harjoitusarviointi.js')); for (const [nimi, h] of Object.entries(HASHIT)) expect(sha(eri[nimi]), nimi).toBe(h); } finally { globalThis.Date = Oikea; }
  });
  it('t palauttaa avaimen sellaisenaan (masterT/vpT-käytös puuttuvalle käännökselle) → sama HTML kuin ilman t:tä', () => {
    const r = ajaa(lue('lib/tm_harjoitusarviointi.js'), { t: (s) => s }); for (const k of Object.keys(HASHIT)) expect(r[k], k).toBe(fi[k]);
  });
  it('sv-tila (merkkiadapteri): jokainen näkyvä teksti kulkee t():n läpi — suomea ei jää reitittämättä', () => {
    const kutsut = new Set(), r = ajaa(lue('lib/tm_harjoitusarviointi.js'), { t: (s) => { kutsut.add(s); return '⟦' + s + '⟧'; } });
    const DATA = new Set(['U12', 'U13', 'U14', 'Ville', '×', '—']);   // joukkue- ja valmentajanimet ovat dataa (D16), ei käännetä
    for (const [nimi, html] of Object.entries(r)) {
      const tekstit = html.replace(/<(style|script)[\s\S]*?<\/\1>/g, '').split(/<[^>]+>/).map((x) => x.replace(/&[a-z#0-9]+;/g, ' ').trim()).filter((x) => /[A-Za-zÅÄÖåäö]{2}/.test(x));
      const reitittamatta = tekstit.filter((x) => !/^⟦/.test(x) && !DATA.has(x) && !/^\d+( · )?/.test(x) && x !== '1 ·' && x !== '5 ·');
      expect(reitittamatta, nimi).toEqual([]);
    }
    expect([...kutsut]).toEqual(expect.arrayContaining(['Arvioi harjoitus', 'Tallenna arviointi', 'Joukkue', 'Valmentaja', 'Päivämäärä', 'Kyllä', 'Ei', 'Täsmennys (vapaaehtoinen)', 'Itsereflektio', 'Valmennuksen toiminta on innostavaa', 'hajanainen', 'Seuran oma tavoite']));
  });
  it('placeholder-attribuutit reititetty (Täsmennys, Joukkue)', () => { const r = ajaa(lue('lib/tm_harjoitusarviointi.js'), { t: (s) => '⟦' + s + '⟧' }); expect(r.a_lapsuus).toContain('placeholder="⟦Täsmennys (vapaaehtoinen)⟧"'); expect(r.ilman_listoja).toContain('placeholder="⟦Joukkue⟧"'); });
  it('Master ja VP välittävät t-adapterin lomakkeelle', () => {
    expect(lue('TalentMaster_Master_v16.html')).toMatch(/tapaLukko: true, otsikko: masterT\('Itsearvio'\), t: masterT,/); expect(lue('TalentMaster_VP_v25.html')).toMatch(/tapaLukko: true,\n\s+t: vpT,/);
  });
});

describe('suostumuslomake: fi-varatekstit = tm_lang.fi = alkuperäiset tekstit', () => {
  const S = lue('TalentMaster_Rekisterointi_Suostumus.html'), L = require('../lib/tm_lang.js').TM_LANG;
  const ALKUPERAISET = [
  ['kutsu_alku', "Kutsu"],
  ['kutsu_seuralta', "seuralta"],
  ['esitaytetty_info', "Seura on esitäyttänyt osan tiedoista puolestasi. Tarkista tiedot ja täydennä puuttuvat kentät."],
  ['virhe_huoltaja_kaikki', "Täytä huoltajan etunimi, sukunimi ja sähköposti"],
  ['pituus_varoitus', "Tarkistathan vanhemman pituusmittauksen (epätavallinen arvo) — tallennetaan silti"],
  ['virhe_huoltaja_nimi', "Täytä huoltajan etunimi ja sukunimi"],
  ['virhe_antaja_puuttuu', "Suostumuksen antajan nimi puuttuu"],
  ['virhe_nimi_pituus', "Tarkista nimi: enintään 100 merkkiä, ei merkkejä < tai >"],
  ['virhe_huoltaja_nimi_pituus', "Tarkista huoltajan nimi: enintään 100 merkkiä, ei merkkejä < tai >"],
  ['kuitti_tunnus', "Rekisteröintitunnus"],
  ['kuitti_nimi', "Nimi"],
  ['kuitti_seura', "Seura"],
  ['kuitti_joukkue', "Joukkue"],
  ['kuitti_ika', "Ikä"],
  ['kuitti_vuotta', "vuotta"],
  ['kuitti_raportit', "Raportit lähetetään"],
  ['kuitti_suostumukset', "Suostumukset"],
  ['kuitti_hyvaksytty', "kpl hyväksytty"],
  ['kuitti_aikaleima', "Aikaleima"],
  ['kuitti_tallennettu', "Tallennettu"],
  ['kuitti_rekisteriin', "TalentMaster-rekisteriin"],
  ['kuitti_tila', "Tila"],
  ['kuitti_odottaa', "Odottaa synkronointia"],
  ['tunnukset_lahetetty', "Tunnukset lähetetty sähköpostiisi"],
  ['lahetys_alku', "Lähetimme salasanalinkin ja pelaajan PIN-koodin"],
  ['osoitteeseen', "osoitteeseen"],
  ['sahkopostiisi', "sähköpostiisi"],
  ['lahetys_loppu', ". Avaa viesti ja aseta salasanasi."],
  ['linkki_7pv', "Linkki on voimassa 7 päivää"],
  ['linkki_7pv_loppu', "— voit avata sen vaikka vasta illalla."],
  ['linkki_1h', "Linkki on voimassa 1 tunnin."],
  ['linkki_vanhene', "Jos se ehtii vanheta, avaa"],
  ['linkki_vanhemman_sivu', "vanhemman sivu"],
  ['linkki_unohdin', "ja valitse ”Unohdin salasanan” — saat uuden linkin."],
  ['salasana_asetettu', "Salasanan asetettuasi pääset vanhemman näkymään — kirjaudu samalla sähköpostiosoitteella ja uudella salasanalla."],
  ['sahkoposti_ei_lahtenyt', "Sähköposti ei lähtenyt"],
  ['tallennettu_lahetys_alku', "Suostumus on tallennettu, mutta tunnusten lähetys"],
  ['lahetys_virhe_loppu', "epäonnistui."],
  ['pyyda_seuraa', "Pyydä seuraa lähettämään tunnukset uudelleen"],
  ['seuran_hallinta_ohje', "(seuran hallinta → pelaaja → lähetä pelaajasivulinkki)."],
  ['kutsu_toinen_lapsi', "Tämä kutsulinkki koskee toista pelaajaa. Jos rekisteröit eri lasta, pyydä seuralta hänelle oma kutsu."],
  ['kutsu_kaytetty', "Tämä kutsulinkki on jo käytetty tai korvattu uudemmalla. Käytä seuran uusinta kutsua tai pyydä seuralta uusi."],
  ['suostumus_jo_annettu', "Suostumus on jo annettu tälle pelaajalle. Jos haluat muuttaa suostumusta, pyydä seuralta uusi kutsu."],
  ['kutsu_ristiriita', "Tämä kutsulinkki koskee toista pelaajaa. Pyydä seuralta oikea kutsu."],
  ['virhe_pakolliset', 'Täytä pakolliset kentät (merkitty *)'],
  ['tallennetaan', 'Tallennetaan...'],
  ['tallennus_virhe', "Tallennus epäonnistui:"],
  ];
  const kutsut = [...S.matchAll(/_st\('suostumus\.([a-z0-9_]+)',\s*'((?:[^'\\]|\\.)*)'\)/g)].map((m) => [m[1], m[2].replace(/\\'/g, "'")]);
  it('kaikki 47 reititettyä tekstiä löytyvät _st-kutsuista; kutsun varateksti = alkuperäinen suomi', () => {
    for (const [k, fi] of ALKUPERAISET) { const x = kutsut.find((c) => c[0] === k); expect(x, k).toBeTruthy(); expect(x[1], k).toBe(fi); }
  });
  it('tm_lang.fi.suostumus[avain] = alkuperäinen suomi; en ja (jos on) sv täytetty; sv puuttuu vain odotuslistan avaimilta', () => {
    const odotus = require('./tm_lang_sv_odotuslista.cjs');
    for (const [k, fi] of ALKUPERAISET) { expect(L.fi.suostumus[k], k).toBe(fi); expect(typeof L.en.suostumus[k], 'en ' + k).toBe('string'); if (!odotus.includes('suostumus.' + k)) expect(typeof L.sv.suostumus[k], 'sv ' + k).toBe('string'); }
  });
  it('kaikki sivun _st-kutsujen avaimet ovat olemassa tm_lang.fi:ssä ja varateksti täsmää (myös aiemmin olemassa olleet avaimet)', () => {
    for (const [k, fi] of kutsut) expect(L.fi.suostumus[k], k).toBe(fi);
  });
  it('sivulla ei jää reitittämätöntä käyttäjätekstiä (staattinen skanneri, allowlist)', async () => {
    const { skannaaHtml, lataaSallitut, onSallittu } = await import('../tools/i18n/sv_staattinen.mjs'); const A = lataaSallitut();
    expect(skannaaHtml(S, 'x').loydot.filter((f) => !onSallittu(f, A)).map((f) => f.teksti)).toEqual([]);
  });
});

describe('kehitystyöpöytä: ikävaihe kulkee opts.t:n läpi', () => {
  const K = require('../lib/tm_kehitystyopoyta.js');
  const x = { pid: 'p1', nimi: 'Testi', joukkue: 'U12', ikavaihe: K.tmKtIkavaihe(11) };
  it('fi: ilman t:tä ja t=identiteetti sama otsikkorivi', () => { const a = K.tmKtKehysHTML(x, {}), b = K.tmKtKehysHTML(x, { t: (s) => s }); expect(a).toBe(b); expect(a).toContain('U12 · Leikkijä'); });
  it('t-adapteri saa ikävaiheen nimen', () => { expect(K.tmKtKehysHTML(x, { t: (s) => '⟦' + s + '⟧' })).toContain('U12 · ⟦Leikkijä⟧'); });
});
