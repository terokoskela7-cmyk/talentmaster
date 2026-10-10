#!/usr/bin/env node
'use strict';
/* D168 · fixture-tilat Koti/Tilanne-kuville ja design-testeille: kirjoittaa tests/fixtures/vp/{tyhja,pilotti,kypsa,kuormitus}.json (SPEC — joukkueet, luvut, huomiot; ei oikeita nimiä).
   Laajennus täyteen dataan (koosteet, pelaajat, joukkueDocs, kalenteri, toimenpiteet, Tilanne-syöte) tapahtuu tests/helpers/vp_fixture.cjs:ssä annetulle ajanhetkelle. Aja: node scripts/vp_fixturet_kirjoita.cjs */
const fs = require('fs'), path = require('path');
const UT = path.join(__dirname, '..', 'tests', 'fixtures', 'vp');
const J = (id, nimi, ika, sp, n, o) => Object.assign({ id, nimi, ika, sp, n, tyyppi: 'kilpa', profiili: 'oto', suost: n, jakso: null, tki: null, katsAuki: false, katsPv: null, aktPros: 60, harjPros: 40, vastPros: 70 }, o || {});
const JAKSO = (nimi, alkuVkSitten, N) => ({ nimi, alkuVkSitten, N });

/* ── pilotti: KPV:n kaltainen (anonymisoitu): 15 joukkuetta + 2 tyhjää, 1 jakso, 4/160 suostumusta ── */
const IKAT = [[8, 'P'], [9, 'P'], [10, 'P'], [11, 'P'], [12, 'P'], [12, 'T'], [13, 'P'], [13, 'T'], [14, 'P'], [14, 'T'], [15, 'P'], [15, 'T'], [16, 'P'], [16, 'T'], [17, 'P']];
const NP = [8, 9, 10, 12, 14, 8, 15, 9, 13, 8, 11, 7, 12, 9, 15];   // = 160
const pilJoukkueet = IKAT.map((x, i) => J('pil' + i, x[1] + x[0] + ' Pilotti' + (i === 5 ? ' Harraste' : ''), x[0], x[1], NP[i], { tyyppi: i === 5 ? 'harraste' : 'kilpa', profiili: i % 3 === 0 ? 'ammatti' : 'oto', suost: 0 }));
pilJoukkueet[2].suost = 3; pilJoukkueet[8].suost = 1; pilJoukkueet[2].jakso = JAKSO('Pelaaminen', 2, 6);
pilJoukkueet[4].tki = { ka: 38, pvmSitten: 340 }; pilJoukkueet[6].tki = { ka: 44, pvmSitten: 20 }; pilJoukkueet[8].tki = { ka: 36, pvmSitten: 30 };
pilJoukkueet.push(J('pilx1', 'P18 Pilotti', 18, 'P', 0, { suost: 0 }), J('pilx2', 'T18 Pilotti', 18, 'T', 0, { suost: 0 }));
const huomio = (joukkue, osaAlue, tyyppi, vakavuus, arvo, teema) => ({ joukkue, osaAlue, tyyppi, vakavuus, arvo, teema });
const pilotti = { nimi: 'pilotti', kuvaus: 'KPV:n kaltainen pilotti: 15 joukkuetta + 2 tyhjää, 1 jakso, 4/160 suostumusta, 6 huomiota, 4 ehdotusta (yksi 14 joukkueelle)', joukkueet: pilJoukkueet, ensinVkSitten: 6,
  huomiot: [huomio(4, 'tekniikka', 'matala', 'amber', 2, 'Tekniikka alle normin (2) → tekniikkateema'), huomio(6, 'tekniikka', 'matala', 'amber', 2, 'Tekniikka alle normin (2) → tekniikkateema'), huomio(8, 'kiihdytys', 'matala', 'amber', 1, 'H-H alle normin'), huomio(8, 'voima', 'matala', 'amber', 1, 'H-H alle normin'), huomio(4, 'talenttiydin', 'talenttiydin', 'amber', 2, 'Talenttiydin (top-5) ka 2 alle normin (3.0) → talent-ID-huoli'), huomio(6, 'maksinopeus', 'matala', 'amber', 1, 'H-H alle normin'), huomio(10, 'tekniikka', 'matala', 'amber', 2, 'Tekniikka alle normin (2) → tekniikkateema'), huomio(2, 'aerobinen', 'matala', 'amber', 1, 'H-H alle normin')],
  ehdotukset: [{ signaali: 'tki_alhainen', joukkueet: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], ikaPv: 3 }, { signaali: 'hh_taso_alhainen', joukkueet: [4, 6, 8], ikaPv: 4 }, { signaali: 'flei_kartoitus_puuttuu', joukkueet: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], ikaPv: 5 }, { signaali: 'suunta_lasku', joukkueet: [6], ikaPv: 2 }],
  testiJoukkueet: [2, 6], viestit: [{ joukkue: 4, teksti: 'Valmentaja: "Testipäivä vk 45 sopii meille."', hSitten: 3 }], idpN: 0, talentit: { n: 2, ehdokkaita: 0, odottaa: 6 }, d1Joukkueita: 3, katsKausi: { ajallaan: 0, perusta: 0, jaksoja: 0 }, kalenteri: [{ nimi: 'P12 Pilotti harjoitus', h: 7 }, { nimi: 'P13 Pilotti ottelu', h: 72 }, { nimi: 'Valmentajapalaveri', h: 120 }], palaveriPv: 20 };

/* ── kypsä: FC Demon kaltainen (9 joukkuetta, jaksot käynnissä, mittauksia, suostumukset) ── */
const kyp = [['P10', 10, 'P', 8, 'Pelaaminen', 3, 8], ['P11', 11, 'P', 8, 'Ensikosketus', 2, 6], ['P12', 12, 'P', 10, 'Haltuunotto', 2, 6], ['T12', 12, 'T', 4, 'Peliasento', 1, 4], ['P13', 13, 'P', 12, 'Ensimmäinen kosketus', 5, 6], ['P14', 14, 'P', 18, 'Kuljettaminen', 2, 4], ['T14', 14, 'T', 16, 'Murtautuminen', 3, 8], ['P15', 15, 'P', 10, null, 0, 0], ['P16', 16, 'P', 11, 'Syöttö', 3, 8]];
const kypJoukkueet = kyp.map((x, i) => J('kyp' + i, x[0] + ' Demo', x[1], x[2], x[3], { suost: Math.round(x[3] * .8), jakso: x[4] ? JAKSO(x[4], x[5], x[6]) : null, tyyppi: i === 1 || i === 8 ? 'harraste' : 'kilpa', profiili: i > 3 ? 'ammatti' : 'oto', tki: { ka: [48, 52, 41, 45, 55, 58, 50, 39, 60][i], pvmSitten: [20, 30, 340, 25, 15, 60, 40, 5, 200][i] }, katsAuki: i === 4, katsPv: i === 4 ? 5 : null, aktPros: 75 }));
const kypsa = { nimi: 'kypsa', kuvaus: 'FC Demon kaltainen kypsä seura: 9 joukkuetta, 8 jaksolla, mittauksia, suostumukset', joukkueet: kypJoukkueet, ensinVkSitten: 14,
  huomiot: [huomio(7, 'tekniikka', 'matala', 'amber', 2, 'Tekniikka alle normin (2) → tekniikkateema'), huomio(2, 'kiihdytys', 'matala', 'amber', 1, 'H-H alle normin'), huomio(5, 'tekniikka', 'matala', 'amber', 2, 'Tekniikka alle normin (2) → tekniikkateema'), huomio(5, 'talenttiydin', 'talenttiydin', 'amber', 2, 'Talenttiydin (top-5) ka 2 alle normin (3.0) → talent-ID-huoli'), huomio(3, 'aerobinen', 'matala', 'amber', 1, 'H-H alle normin'), huomio(7, 'voima', 'matala', 'amber', 1, 'H-H alle normin'), huomio(1, 'tekniikka', 'matala', 'amber', 2, 'Tekniikka alle normin (2) → tekniikkateema'), huomio(4, 'kiihdytys', 'laskeva', 'amber', 1, 'Kehitys laskussa')],
  ehdotukset: [{ signaali: 'tki_alhainen', joukkueet: [2, 5, 7], ikaPv: 3 }, { signaali: 'hh_taso_alhainen', joukkueet: [3, 5], ikaPv: 4 }, { signaali: 'flei_kartoitus_puuttuu', joukkueet: [0, 1, 2, 3, 4, 5, 6, 7, 8], ikaPv: 5 }, { signaali: 'suunta_lasku', joukkueet: [4], ikaPv: 2 }],
  testiJoukkueet: [0, 1, 2, 3, 4, 5], viestit: [], idpN: 6, talentit: { n: 6, ehdokkaita: 0, odottaa: 2 }, d1Joukkueita: 9, katsKausi: { ajallaan: 9, perusta: 11, jaksoja: 15 }, kalenteri: [{ nimi: 'P14 Demo harjoitus', h: 6 }, { nimi: 'T14 Demo harjoitus', h: 8 }, { nimi: 'P13 Demo ottelu', h: 72 }, { nimi: 'Valmentajapalaveri', h: 120 }, { nimi: 'Testipäivä P15', h: 240 }], palaveriPv: 20 };

/* ── kuormitus: 40 joukkuetta, pitkät (ruotsinkieliset) nimet ── */
const kuorm = Array.from({ length: 40 }, (_, i) => { const ika = 8 + (i % 10), sp = i % 2 ? 'T' : 'P', n = 6 + (i * 7) % 14; return J('kuo' + i, (sp === 'T' ? 'Flickor ' : 'Pojkar ') + ika + ' Östra Nylands Idrottsförening ' + ['Blå', 'Vit', 'Röd', 'Grön'][i % 4], ika, sp, n, { suost: i % 3 ? Math.round(n * .5) : 0, jakso: i % 4 === 0 ? JAKSO('Spelande', 2, 6) : null, tki: i % 5 === 0 ? { ka: 41, pvmSitten: 30 + i * 9 } : null, katsAuki: i % 11 === 0, katsPv: i % 11 === 0 ? 6 : null, tyyppi: i % 7 ? 'kilpa' : 'harraste' }); });
const kuormitus = { nimi: 'kuormitus', kuvaus: '40 joukkuetta, pitkät nimet (ruotsinkieliset)', joukkueet: kuorm, ensinVkSitten: 3,
  huomiot: Array.from({ length: 14 }, (_, i) => huomio(i * 2, i % 2 ? 'tekniikka' : 'kiihdytys', 'matala', 'amber', 2, i % 2 ? 'Tekniikka alle normin (2) → tekniikkateema' : 'H-H alle normin')),
  ehdotukset: [{ signaali: 'tki_alhainen', joukkueet: Array.from({ length: 22 }, (_, i) => i), ikaPv: 3 }, { signaali: 'hh_taso_alhainen', joukkueet: [1, 4, 9, 11, 17, 25, 30], ikaPv: 4 }, { signaali: 'flei_kartoitus_puuttuu', joukkueet: Array.from({ length: 40 }, (_, i) => i), ikaPv: 5 }, { signaali: 'suunta_lasku', joukkueet: [6, 7], ikaPv: 2 }, { signaali: 'tki_lahella_merkkia', joukkueet: [3, 12], ikaPv: 1 }],
  testiJoukkueet: [1, 5, 9], viestit: [], idpN: 11, talentit: { n: 9, ehdokkaita: 3, odottaa: 4 }, d1Joukkueita: 12, katsKausi: { ajallaan: 5, perusta: 12, jaksoja: 10 }, kalenteri: Array.from({ length: 9 }, (_, i) => ({ nimi: 'Träning ' + (i + 1) + ' Östra Nylands IF Pojkar ' + (8 + i), h: 5 + i * 20 })), palaveriPv: 20 };

const tyhja = { nimi: 'tyhja', kuvaus: '0 joukkuetta (uusi seura)', joukkueet: [], ensinVkSitten: 0, huomiot: [], ehdotukset: [], testiJoukkueet: [], viestit: [], idpN: 0, talentit: { n: 0, ehdokkaita: 0, odottaa: 0 }, d1Joukkueita: 0, katsKausi: { ajallaan: 0, perusta: 0, jaksoja: 0 }, kalenteri: [], palaveriPv: null };

fs.mkdirSync(UT, { recursive: true });
[tyhja, pilotti, kypsa, kuormitus].forEach((f) => fs.writeFileSync(path.join(UT, f.nimi + '.json'), JSON.stringify(f, null, 1) + '\n'));
console.log('Kirjoitettu 4 fixturea →', UT);
