/* Käännöserän osio "vp_kentta_b" (erä 102, PM 10.11.2026): VP:n Kenttä-näkymän VIEREISET TEKSTIT, joita sv-läpiajon heuristiikka ei löytänyt (erän 101 jälkeen).
   Löytö: lähdekoodin AST-skannaus (tools/i18n/sv_staattinen.mjs, libit) + käsin luokittelu komponenteittain (kypsyyskortti, kehityskaari, jakson osat). Jokainen avain on
   koodin reititinkutsun (_T / vpT / T) literaali; tests/i18n_era102_vp_kentta_b.test.js varmistaa sen (neula löytyy koodista reititinkutsun sisältä) ja sen, ettei rivillä ole sv:tä
   VP:n resolvointiketjussa (lib → yhteinen → VP-kartta) — rivit, joille käännös jo on, eivät kuulu erään.
   RAJAUS: (1) Kehitystyöpöydän curriculum-proosa ja konseptien nimet EIVÄT ole tässä: sv tulee docs/i18n/curriculum_kaannettava.sv.MASTER.json:sta (1261/1261, sidecar
   lib/tm_teknistaktiset_sv.js) — render on kytketty (_ttKaanonSv, _vpKonseptiNimiNimella). (2) Konseptien nimet: MASTER.json (.nimi, ISOILLA: MOTTAGNING …) ja lib sanasto (sn_y_h*) ovat lukitut.
   (3) Liikkuvuusliikkeiden nimet: ei lukittua sanastoa (tm_i18n_common / MASTER) → rivit alla; viitteenä harjoitelogiikka_v4.js:n HARJOITE_I18N-sanasto.
   Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi; viite_sv = olemassa oleva käännös samasta tekstistä toisessa kartassa. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { viiteKartat } = require('./i18n_era_seura.cjs');

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const KYP = 'Kehitystyöpöytä › Näyttö › Kypsyyskortti (PHV)', KAA = 'Kehitystyöpöytä › Näyttö › Kehityskaari', PIENI = 'Kypsyyskortti: tekstin pala — koodi liittää palat ja luvut (lihavointi tulee koodista).';
const ALUSTA = 'Testin alusta (kenttä): lyhyt sana testipisteen vieressä.';
/* [avain (= koodin literaali), näkymä, elementti, huom?] */
const LISTA = [
  // ── Kypsyyskortti (lib/tm_kypsyys.js) ──
  ['Kuormarajoitin (§28):', KYP, 'varoitusrivin lihavoitu alku', 'Lihavoitu otsikko; perässä on seuraava rivi samassa lauseessa.'],
  ['kasvupyrähdyksen huippu käynnissä — voimaharjoittelu max 80 % 1RM, hyppyvolyymi −20 %, juoksuvolyymi seurattava.', KYP, 'varoitusrivin jatko', 'Jatkaa edellistä riviä ("Kuormarajoitin (§28):"). Luvut ja lyhenteet (1RM, §28) säilyvät.'],
  ['Pre-PHV — fyysinen neutraali:', KYP, 'tulkintarivin lihavoitu alku', 'Jatkuu rivillä "matala 30 m / MAS / CMJ on biologisesti odotettua…" (jo käännetty, erä 101). Pre-PHV = ennen kasvupyrähdystä.'],
  ['Fyysiset ikkunat auki:', KYP, 'tulkintarivin lihavoitu alku', 'Post-PHV-vaihe: fyysiset ominaisuudet ovat nyt herkkiä kehitykselle. Jatkuu seuraavalla rivillä.'],
  ['nopeus, voima ja aerobinen kannattaa treenata (post-PHV herkkyys). Matala fyysinen testi = aito kehityskohde.', KYP, 'tulkintarivin jatko', 'Jatkaa edellistä riviä ("Fyysiset ikkunat auki:").'],
  ['Varhaiskypsä → älä sekoita kokoa taitoon', KYP, 'tulkintarivin lihavoitu alku', 'Varhaiskypsä = biologisesti ikäistään pidemmällä. Jatkuu seuraavalla rivillä.'],
  ['(RAE). Etu fyysisyydessä voi olla kypsyyttä, ei lahjakkuutta — arvioi peli edellä.', KYP, 'tulkintarivin jatko', 'Jatkaa edellistä riviä. RAE = syntymäkvartaalin suhteellinen ikävaikutus (relative age effect).'],
  ['Kypsyysvaihe huomioidaan', KYP, 'tulkintarivin lihavoitu alku', 'Jatkuu: "fyysisten testien tulkinnassa (§28)."'],
  ['fyysisten testien tulkinnassa (§28).', KYP, 'tulkintarivin jatko', 'Jatkaa edellistä riviä ("Kypsyysvaihe huomioidaan").'],
  ['Kypsyyttä ei mitattu', KYP, 'tyhjän tilan otsikko'],
  ['PHV-aikajana ja kasvutahti rakentuvat kasvumittauksesta (pituus · paino · istumapituus). Ilman mittausta kypsyysvaihetta ei näytetä — fyysiset testit luetaan silloin ilman kypsyyskorjausta (varauksin).', KYP, 'tyhjän tilan selite'],
  ['📍 Tee kasvumittaus →', KYP, 'tyhjän tilan painike'],
  ['Ennen kasvupyrähdystä', KYP, 'vaiheen nimi (PRE)', 'Vaihe PRE. Muut vaiheet: Lähestyy kasvupyrähdystä (jo käännetty), Kasvupyrähdyksessä, Kasvupyrähdyksen jälkeen, Jälki-PHV.'],
  ['Kasvupyrähdyksessä', KYP, 'vaiheen nimi (PH)'],
  ['Kasvupyrähdyksen jälkeen', KYP, 'vaiheen nimi (POST)'],
  ['PHV-huippu', KYP, 'aikajanan nimi (vaihe PH)', 'Lyhyt nimi aikajanan alla; PHV säilytetään.'],
  ['Post', KYP, 'aikajanan nimi (vaihe POST)', 'Lyhyt nimi aikajanan alla ("Ennen · Lähestyy · PHV-huippu · Post · Jälki-PHV").'],
  ['kasvuviiva', KYP, 'kasvukäyrän aria-label (ruudunlukija)'],
  ['kasvu', KYP, 'sirun teksti ("kasvu 6.5 cm/v")', 'Jatkuu luvulla ja yksiköllä "cm/v" (jo käännetty).'],
  ['kasvutahti: kerätään', KYP, 'sirun teksti kun kasvutahtia ei vielä näytetä'],
  ['varhaiskypsä', KYP, 'merkintä otsikkorivillä', 'Esim. "varhaiskypsä (+1.2 v edellä)".'],
  ['v edellä', KYP, 'merkinnän jatke', 'Esim. "+1.2 v edellä" = 1,2 vuotta ikäluokkansa edellä. "v" on vuosi.'],
  ['Mirwald 2002 · biologinen kypsyys', KYP, 'kortin alaotsikko', 'Mirwald 2002 on lähdeviite (säilytä).'],
  ['mitattu', KYP, 'mittauspäivän etuliite', 'Esim. "mitattu 14.3.2026".'],
  ['offset', KYP, 'otsikkorivin pala', 'Esim. "· offset +1.2 v" = kypsyysero ikäluokkaan verrattuna.'],
  ['bio-ikä', KYP, 'otsikkorivin pala', 'Esim. "· bio-ikä 13.4 v vs kronologinen 12.8 v".'],
  ['vs kronologinen', KYP, 'otsikkorivin pala', 'vs = verrattuna; kronologinen ikä = kalenteri-ikä.'],
  ['riski ⚠', KYP, 'kasvutahtipalkin selite', 'Esim. "nopea ≥7.2 · riski ⚠" (hidas / kohtalainen / nopea ovat jo käännetty).'],
  ['Vyöhyke:', KYP, 'kasvutahdin vyöhykkeen etuliite', 'Esim. "Vyöhyke: kohtalainen".'],
  ['nopea kasvu, loukkaantumisriski kohonnut (§28)', KYP, 'varoituksen jatke', 'Esim. "Vyöhyke: nopea — nopea kasvu, loukkaantumisriski kohonnut (§28)."'],
  ['Kasvuviiva', KYP, 'kasvukäyrän lihavoitu otsikko', 'Jatkuu seuraavalla rivillä.'],
  ['(pituus/aika) — tarkentuu jokaisella kasvumittauksella (U13–15: 3×/v).', KYP, 'kasvukäyrän selite', 'Jatkaa edellistä riviä ("Kasvuviiva").'],
  ['Mitä kypsyys tarkoittaa · §28', KYP, 'osion otsikko (eyebrow)'],
  ['Yli-ikäisyys-poikkeuslupa: kyllä.', KYP, 'kortin alarivin lisä'],
  // ── Kehityskaari (lib/tm_kehityskaari.js) ──
  ['Tekniikka yht.', KAA, 'mittarin nimi', 'Tekniikkakilpailun kokonaistulos.'],
  ['H-H taso', KAA, 'mittarin nimi', 'H-H = Huippu-Haastaja (testitasot 1–5).'],
  ['D1 fyysinen', KAA, 'mittarin nimi', 'D1 = viisiulotteisen mallin 1. ulottuvuus (fyysinen).'],
  ['D2 tekninen', KAA, 'mittarin nimi', 'D2 = tekninen ulottuvuus.'],
  ['Pujottelu (H-H)', KAA, 'mittarin nimi (lähde H-H)', 'Sama testi kuin "Pujottelu (TK-kisa)" (jo käännetty); tämä tulee Huippu-Haastaja-testistä.', "' (H-H)'"],
  ['Syöttö (H-H)', KAA, 'mittarin nimi (lähde H-H)', 'Sama testi kuin "Syöttö (TK-kisa)" (jo käännetty); tämä tulee Huippu-Haastaja-testistä.', "' (H-H)'"],
  ['Eri alustan pisteet piilotettu — §22: vertailu vain saman alustan sisällä', KAA, 'varoitusmerkin title-vihje'],
  ['mondo', KAA, 'testialustan lyhyt nimi', ALUSTA + ' Mondo = juoksurata-alusta (voi pysyä samana).'],
  ['tekonurmi', KAA, 'testialustan lyhyt nimi', ALUSTA],
  ['nurmi', KAA, 'testialustan lyhyt nimi', ALUSTA + ' Luonnonnurmi.'],
  ['halli', KAA, 'testialustan lyhyt nimi', ALUSTA + ' Sisähalli.'],
  ['alusta', KAA, 'testialustan lyhyt nimi (kun alusta tuntematon)', ALUSTA],
  ['Kehitysnopeutta ei arvioida: mittausten väli alle 2 kk', KAA, 'rivin selite'],
  ['2 pist. · dimensioittain', KAA, 'peliälyosion tasomerkki', 'Pieni merkki (isot kirjaimet CSS:llä). Pist. = pistettä (mittauspistettä).'],
  ['nykytila · dimensioittain', KAA, 'peliälyosion tasomerkki'],
  ['Ajassa täyttyy 2. havainnosta — nyt nykytila per dimensio (', KAA, 'peliälyosion huomautus (alku)', 'Lause on kahdessa palassa: tämä pala + koodista "U11 ≠ U16, §28)." Käännä alku, joka päättyy avaavaan sulkuun; samaan tapaan kuin jo käännetty "Dimensiokohtainen — ei suoraa vuosivertailua (".'],
  ['Kehityskaari täyttyy kun mittauksia on ≥2.', KAA, 'tyhjän tilan teksti'],
  ['Kooste', KAA, 'osion pieni otsikko (isot kirjaimet CSS:llä)'],
  ['taso', KAA, 'lukujen etuliite', 'Esim. "taso 2.4→3.1".'],
  ['kehityskaari', KAA, 'sparkline-kuvan aria-label (ruudunlukija)'],
  ['Tekniikka-ajat paranivat, mutta TKI laski —', KAA, 'selitteen alku', 'Selite on kolmessa palassa: tämä + lihavoitu "ikävaatimus kovenee" + "Kehitys on oikeansuuntaista; …". ⓘ tulee koodista.'],
  ['ikävaatimus kovenee', KAA, 'selitteen lihavoitu keskiosa', 'Ikävaatimus = TKI-indeksin ikäluokkakohtainen taso nousee iän myötä.'],
  ['Kehitys on oikeansuuntaista; pysyäkseen indeksin tahdissa sen pitää olla vielä nopeampaa.', KAA, 'selitteen loppu'],
  ['s/v', KAA, 'yksikkö sulkeissa ("~0.4 s/v")', 'Sekuntia vuodessa.'],
  // ── Liikkuvuusliikkeiden nimet (Seura › Kehitystilanne › Liikkuvuuskartoitus; liikkeet kirjataan Testaus-työkalulla) ──
  ['Valakyykky', 'Seura › Kehitystilanne › Liikkuvuuskartoitus (lapsuus, 1–3 p)', 'liikkeen nimi', 'Liikkuvuuskartoituksen liike (kepillä tehtävä syväkyykky, overhead squat). Ei lukittua sanastoa; viitteenä kyykky-sanasto harjoitelogiikassa: Leveä kyykky = Bred knäböj, Bulgarialainen kyykky = Bulgarisk split-knäböj.'],
  ['Askelkyykky', 'Seura › Kehitystilanne › Liikkuvuuskartoitus (lapsuus, 1–3 p)', 'liikkeen nimi', 'Liikkuvuuskartoituksen liike (askelkyykky, lunge). Lähin lukittu: harjoitteen nimi "Askelkyykky-kävely" = Utfallsgång ja "Räjähtävä askelkyykky" = Explosivt utfall (harjoitelogiikka_v4.js).'],
  ['Hyvää huomenta', 'Seura › Kehitystilanne › Liikkuvuuskartoitus (lapsuus, 1–3 p)', 'liikkeen nimi', 'Liikkuvuuskartoituksen liike (good morning: lonkkanivel taivutus selkä suorana). Tämä on liikkeen nimi, ei tervehdys.'],
  ['Etunojapunnerrus', 'Seura › Kehitystilanne › Liikkuvuuskartoitus (lapsuus, 1–3 p)', 'liikkeen nimi', 'Liikkuvuuskartoituksen liike (punnerrus etunojassa, push-up). Viitteenä harjoitelogiikassa "punnerrusasento" = armhävningsläge.'],
];

const KONTEKSTI = 'HENKILÖKUNTA — Vastuuvalmentaja/VP (TalentMaster_VP_v25.html, Kenttä-lippu päällä) ja Seurahallinta. Erä 102 kokoaa tekstit, joita sv-läpiajo ei nähnyt: '
  + 'Kehitystyöpöydän Näyttö-välilehden kypsyyskortti (PHV-aikajana, kasvutahti, tulkintarivit) ja kehityskaari (mittarien nimet, alustat, selitteet) sekä Kehitystilanteen liikkuvuusliikkeiden nimet. '
  + 'Avain = suomenkielinen teksti sellaisena kuin koodi sen kutsuu; moni teksti on PALA, jonka koodi liittää toiseen (lihavointi, luku, ·-erotin tulevat koodista) — vihje kerrotaan huom-kentässä ja pala käännetään sellaisenaan. '
  + 'Termit: Kehitystyöpöytä = Utvecklingsbord, Jakso = Period, Pelihavainto = Matchobservation; PHV, RAE, TKI, H-H, D1–D5, §28 säilytetään. '
  + 'Kypsyysvaiheet: PRE/LAH/PH/POST/Jälki-PHV (PHV = kasvupyrähdys, peak height velocity). Mittaus- ja testinimet noudattavat lukittua glossaaria (lib/tm_i18n_common.js): Pujottelu, Syöttö, Ponnauttelu, Kuljetus-laukaus, Kevennyshyppy, Ketteryys, Suunnanmuutos. '
  + 'Konseptien nimet (HALTUUNOTTO = MOTTAGNING …) ja curriculum-proosa ovat lukitut MASTER.json:ssa eivätkä kuulu erään. Sävy: asiallinen, valmentajan työkieli. Emojit, nuolet ja välimerkit säilytetään.';

/** VP:n resolvointiketju: tmLibT (lib-kartta) → TM_I18N_COMMON → TM_VP_I18N. Palauttaa sv tai null. */
function ketju(juuri) {
  const lataa = (f, k) => { try { return (require(path.join(juuri, f))[k] || {}).sv || {}; } catch (e) { return {}; } };
  const lib = lataa('lib/tm_lib_i18n.js', 'TM_LIB_I18N'), cmn = lataa('lib/tm_i18n_common.js', 'TM_I18N_COMMON'), vp = lataa('lib/tm_vp_i18n.js', 'TM_VP_I18N');
  return (fi) => { for (const m of [lib, cmn, vp]) if (typeof m[fi] === 'string' && m[fi]) return m[fi]; return null; };
}
const quoted = (s) => ["'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'", '"' + s.replace(/"/g, '\\"') + '"'];
/** Lähde: ensimmäinen kohta, jossa avain on reititinkutsun literaali (_T / vpT / T). */
function lahde(juuri, fi, neula) {
  if (neula) { const f = 'lib/tm_kehityskaari.js'; const rivit = fs.readFileSync(path.join(juuri, f), 'utf8').split('\n'); const i = rivit.findIndex((r) => r.includes(neula)); return i < 0 ? null : { lahde: f + ':' + (i + 1), lahde_rivi: norm(rivit[i]).slice(0, 240) }; }
  const tiedostot = ['lib/tm_kypsyys.js', 'lib/tm_kehityskaari.js', 'lib/tm_kehitystilanne.js', 'TalentMaster_VP_v25.html'];
  for (const f of tiedostot) {
    let rivit; try { rivit = fs.readFileSync(path.join(juuri, f), 'utf8').split('\n'); } catch (e) { continue; }
    for (let i = 0; i < rivit.length; i++) for (const q of quoted(fi)) if (new RegExp('(?:_T|vpT|\\bT)\\(\\s*' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(rivit[i])) return { lahde: f + ':' + (i + 1), lahde_rivi: norm(rivit[i]).slice(0, 240) };
    // dynaaminen kutsu: avain on taulukossa/oliossa ja kutsu _T(muuttuja) — etsi literaali
    for (let i = 0; i < rivit.length; i++) if (!/^\s*(\/\/|\/\*|\*)/.test(rivit[i])) for (const q of quoted(fi)) if (rivit[i].includes(q)) return { lahde: f + ':' + (i + 1), lahde_rivi: norm(rivit[i]).slice(0, 240) };
  }
  return null;
}

/** Palauttaa { rivit, kartassa (jo käännetyt, pois), virheet } */
function rivit(opts) {
  const juuri = (opts && opts.juuri) || path.join(__dirname, '..'), vanhat = (opts && opts.vanhat) || {};
  const res = ketju(juuri), viitteet = viiteKartat(juuri), ulos = {}, kartassa = [], virheet = [];
  for (const [fi, nakyma, elementti, huom, neula] of LISTA) {
    if (ulos[fi]) { virheet.push('kaksoisavain: ' + fi); continue; }
    if (res(fi)) { kartassa.push(fi); continue; }
    const src = lahde(juuri, fi, neula); if (!src) { virheet.push('neulaa ei löydy koodista: ' + fi); continue; }
    const r = { fi, nakyma: [nakyma], tyyppi: /aria-label/.test(elementti) ? 'aria' : /title/.test(elementti) ? 'title' : 'teksti', elementti, lahde: src.lahde, lahde_rivi: src.lahde_rivi };
    const h = []; if (huom) h.push(huom);
    const v = viitteet.find((x) => x.fi === fi) || viitteet.find((x) => norm(x.fi).toLowerCase() === norm(fi).toLowerCase());
    if (v) { r.viite_sv = { sv: v.sv, lahde: v.lahde + (v.fi !== fi ? ' (avain "' + v.fi + '")' : '') }; h.push('Sama teksti on jo käännetty toisessa kartassa (viite_sv); käytä samaa käännöstä, ellei yhteys vaadi toista.'); }
    if (h.length) r.huom = h;
    r.sv = (vanhat[fi] && typeof vanhat[fi].sv === 'string') ? vanhat[fi].sv : '';
    ulos[fi] = r;
  }
  return { rivit: ulos, kartassa, virheet };
}
const muotoRivit = (opts) => { const t = rivit(opts); return { rivit: t.rivit, virheet: t.virheet, reititettavat: t.kartassa }; };   // sama rajapinta kuin seura_*-osiot (reititettavat = jo kartassa)
module.exports = { rivit, muotoRivit, LISTA, KONTEKSTI, ketju };
