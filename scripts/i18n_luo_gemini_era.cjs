#!/usr/bin/env node
/* Gemini-erän 2 pohja (sv-läpiajo; docs/CODE_BRIEF_I18N_SV_LAPIAJO.md kohta 4). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Lähde: tests/tm_lang_sv_odotuslista.cjs (uudet fi+en-avaimet) → osio "tm_lang" (fi/en tm_lang.js:stä). Ohje + termistö kopioidaan 8.10. erästä sellaisenaan.
   Idempotentti: jo täytetty sv (aiempi ajo + Geminin paluu) säilyy; vain puuttuvat rivit lisätään; poistuneet (ei enää odotuslistalla) pudotetaan jos sv tyhjä.
   Ajo: node scripts/i18n_luo_gemini_era.cjs [--tiedosto=docs/i18n/sv_kaannoserae_2.json] */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = path.join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_2.json'));
const E1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/i18n/sv_kaannoserae_2026-10-08.json'), 'utf8'));
const L = require('../lib/tm_lang.js').TM_LANG;
const ODOTTAA = require('../tests/tm_lang_sv_odotuslista.cjs');
const hae = (kieli, polku) => polku.split('.').reduce((o, k) => (o == null ? undefined : o[k]), L[kieli]);

let nyk = null; try { nyk = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanhat = (nyk && nyk.osiot && nyk.osiot.tm_lang && nyk.osiot.tm_lang.rivit) || {};
const rivit = {}; let uusia = 0;
for (const p of ODOTTAA) {
  const fi = hae('fi', p), en = hae('en', p);
  if (typeof fi !== 'string') throw new Error('odotuslistan avain puuttuu fi:stä: ' + p);
  const sv = (vanhat[p] && typeof vanhat[p].sv === 'string') ? vanhat[p].sv : '';
  if (!vanhat[p]) uusia++;
  rivit[p] = { fi, en: typeof en === 'string' ? en : '', sv };
}
const osiot = Object.assign({}, nyk && nyk.osiot ? nyk.osiot : {});
osiot.tm_lang = {
  _konteksti: 'Pelaaja-app (lapsen kieli, U8–19), huoltajan app (Vanhempi), yleiset (ilmoitusrivit). Avain = pisteytetty polku tm_lang.js:ssä. en-arvo on apuna. Muuttujat {n}, {nimi}, {aika}, {pvm}, {jakso}, {alueet}, {sovellus}, {idoli}, {teema}, {a}, {b}, {pv} säilytetään täsmälleen. HTML (<b>…</b>) säilytetään sellaisenaan. Osa riveistä on lauseen paloja (esim. "kehittyy", "tänä jaksona — {alueet}. …") jotka liitetään muuhun tekstiin — säilytä alun/lopun välilyönnit ja välimerkit.',
  rivit,
};
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 2 Geminille',
  _pvm: (nyk && nyk._pvm) || new Date().toISOString().slice(0, 10),
  _tila: 'VALMIS LÄHETETTÄVÄKSI (PR 2–4 mukana): tm_lang (perheet+yleiset), lib-osiot (ADAR-nimet, rubriikit, Kenttä, ADAR-pikakortin tekstit, pelihavaintovalinta, havaintohistoria, Tänään-signaali), master_kartta, vp_kartta, henkilosto_kartta (Seura + ADAR + Pelihavainto) sekä #892:n jäännökset (osiot jaannos.*: Klubb→Förening, kausifokus, VP×Master-yhtenäistys; ts_otsikko osiossa lib.tm_tanaan_signaali). Sävy ja termistö: katso ohje_geminille + termisto (uudet ADAR-/ottelutermit kohdassa termisto.kaannettava). Tiedosto Terolle 15.10., vienti ja käsikokeilu ennen 1.11.',
  _pohja: (nyk && nyk._pohja) || 'origin/main + feat/i18n-sv-perheet-pr2',
  _rivit_yhteensa: Object.values(osiot).reduce((s, o) => s + Object.keys(o.rivit || {}).length, 0),
  ohje_geminille: E1.ohje_geminille,
  termisto: E1.termisto,
  osiot,
  lib_adar_nimet: {
    _konteksti: 'ADAR-nimikanoni (PELAAJA/valmentaja) — kirjaston FI-avaimet (lib/tm_pelialy_yksilo.js tmAdarNimet). SAMA teksti kuin tm_lang.pelaaja.adar_nimi_pelaaja_* (käännä identtisesti). Pelaajan nimet näkyvät lapselle ja huoltajalle; valmentajan nimet VP/Master/pikakortti (PR 3–4). Käytä termistön ADAR-käännöksiä.',
    rivit: {
      adar_nimi_pelaaja_a: { fi: 'Havainnointi', sv: '' }, adar_nimi_pelaaja_d: { fi: 'Päätöksenteko', sv: '' }, adar_nimi_pelaaja_ac: { fi: 'Toteutus', sv: '' }, adar_nimi_pelaaja_r: { fi: 'Palautuminen', sv: '' },
      adar_nimi_valmentaja_a: { fi: 'Havainnointi', sv: '' }, adar_nimi_valmentaja_d: { fi: 'Päätös', sv: '' }, adar_nimi_valmentaja_ac: { fi: 'Toteutus', sv: '' }, adar_nimi_valmentaja_r: { fi: 'Palautuminen', sv: '' },
    },
  },
};
if (nyk && nyk.osiot && nyk.osiot.lib_adar_nimet) ulos.lib_adar_nimet = nyk.osiot.lib_adar_nimet;
// lib.rubriikit: kortin tasokuvaukset (Pelaaja_v7 _p7RubT → tmLibT, avain = fi-teksti sellaisenaan). Lähde: lib/tm_adar_rubriikki.js + lib/tm_kortti_rubriikit.js.
{
  const A = require('../lib/tm_adar_rubriikki.js'), K = require('../lib/tm_kortti_rubriikit.js');
  const tekstit = [];
  for (let t = 1; t <= 5; t++) { const a = A.alyTaso(t), f = K.fysTaso(t), p = K.psyTaso(t, null); [a, f, p].forEach((r) => { tekstit.push(r.nyt, r.askel); }); }
  ['inner_drive', 'coachability', 'resilience', 'focus', 'emotional_control'].forEach((k) => { const o = {}; o[k] = 3; tekstit.push(K.psyTaso(1, o).vahvuus); });
  const vanhatR = (nyk && nyk.osiot && nyk.osiot['lib.rubriikit'] && nyk.osiot['lib.rubriikit'].rivit) || {}, r = {};
  tekstit.forEach((fi) => { r[fi] = { fi, sv: (vanhatR[fi] && typeof vanhatR[fi].sv === 'string') ? vanhatR[fi].sv : '' }; });
  ulos.osiot['lib.rubriikit'] = { _konteksti: 'PELAAJA (lapsen kieli, U8–19): kortin tason kuvaukset ("Nyt" + "Seuraava askel") ja mielen vahvuuksien nimet. Avain = suomenkielinen teksti sellaisenaan (kirjasto tm_adar_rubriikki / tm_kortti_rubriikit). Emojit säilytetään. Lämmin, kannustava; ei tasolukuja, vertailua tai menettämisen kieltä.', rivit: r };
}
// lib.tm_kentta: Kenttä-komponentin kääntämättömät avaimet (t('fi-teksti') ilman karttariviä) — Pelaaja_v7 välittää _p7K1T:n; sv libikartasta.
{
  const src = fs.readFileSync(path.join(ROOT, 'lib/tm_kentta.js'), 'utf8');
  const avaimet = new Set();
  for (const m of src.matchAll(/\bt\('([^']+)'\)/g)) avaimet.add(m[1]);
  for (const k of ['ydinvahvuus', 'sinun vahvuutesi']) { if (!src.includes("'" + k + "'")) throw new Error('tm_kentta: avain poistunut lähteestä: ' + k); avaimet.add(k); }   // t(opts.rooli === 'henkilokunta' ? 'ydinvahvuus' : 'sinun vahvuutesi')
  const ot = src.match(/var OSA_TILA = \{([^}]*)\}/); if (ot) for (const m of ot[1].matchAll(/:\s*'([^']+)'/g)) avaimet.add(m[1]);
  const vanhatK = (nyk && nyk.osiot && nyk.osiot['lib.tm_kentta'] && nyk.osiot['lib.tm_kentta'].rivit) || {}, r = {};
  [...avaimet].forEach((fi) => { r[fi] = { fi, sv: (vanhatK[fi] && typeof vanhatK[fi].sv === 'string') ? vanhatK[fi].sv : '' }; });
  ulos.osiot['lib.tm_kentta'] = { _konteksti: 'PELAAJA + henkilökunta — Kenttä-komponentin tagit ja aria-label (pelikenttä = jalkapallokenttä, sv "plan"). Avain = suomenkielinen teksti sellaisenaan; lyhyet pienellä kirjoitetut tilasanat ("nyt", "ei vielä") ovat tag-tekstejä.', rivit: r };
}
// master_kartta (sv-läpiajo PR 3): Masterin masterT-avaimet ilman sv-riviä (avain = fi-teksti sellaisenaan → TM_MASTER_I18N.sv; vienti: scripts/i18n_vie_sv_era.cjs master_kartta).
{
  const { masterAvaimet } = require('../tools/i18n/master_avaimet.cjs');
  const vanhatM = (nyk && nyk.osiot && nyk.osiot.master_kartta && nyk.osiot.master_kartta.rivit) || {}, r = {};
  masterAvaimet(ROOT).puuttuu.forEach((fi) => { r[fi] = { fi, sv: (vanhatM[fi] && typeof vanhatM[fi].sv === 'string') ? vanhatM[fi].sv : '' }; });
  ulos.osiot.master_kartta = { _konteksti: 'HENKILÖKUNTA (Master = valmentajan työpöytä): käyttöliittymän tekstit, toastit, demosisältö (Tänään/Kalenteri/Kausi/Testit), jakson tilakoneen napit ja tilat. Avain = suomenkielinen teksti sellaisenaan (myös alku-/loppuvälilyönnit: osa on lauseen paloja, esim. " pelaajaa vahvistettu", "Seuraava fokus (" — käännä pala niin, että koodin liittämä jatko ("0)" , nimi, luku) toimii). {nimi}/{n}/{kirjain}/{yht} säilyvät täsmälleen. Asiallinen valmennuskieli; termistö kuten muissa osioissa.', rivit: r };
}
// ── sv-läpiajo PR 4: VP, henkilöstösivut (Seura/ADAR/Pelihavainto), ADAR-tekstit, valinta/historia-libit, #892:n jäännökset ──
{
  const { poimi } = require('../tools/i18n/reititin_avaimet.cjs');
  const vanh = (nimi) => (nyk && nyk.osiot && nyk.osiot[nimi] && nyk.osiot[nimi].rivit) || {};
  const svVanha = (v, fi) => (v[fi] && typeof v[fi].sv === 'string') ? v[fi].sv : '';
  const mapSv = (f, n) => { try { return require(path.join(ROOT, f))[n].sv || {}; } catch (e) { return {}; } };
  const VP = mapSv('lib/tm_vp_i18n.js', 'TM_VP_I18N'), MA = mapSv('lib/tm_master_i18n.js', 'TM_MASTER_I18N'), CO = mapSv('lib/tm_i18n_common.js', 'TM_I18N_COMMON'), LI = mapSv('lib/tm_lib_i18n.js', 'TM_LIB_I18N');
  const eiKaannettava = (t) => /^(var\(|#)/.test(t) || /^[:%]/.test(t) || t.length < 2;   // värit / kielioppipäätteet (":ltä") eivät ole käännettäviä
  const KARTAT_VP = [['lib/tm_vp_i18n.js', 'TM_VP_I18N'], ['lib/tm_i18n_common.js', 'TM_I18N_COMMON'], ['lib/tm_lib_i18n.js', 'TM_LIB_I18N']];
  const KARTAT_HENK = [['lib/tm_henkilosto_i18n.js', 'TM_HENKILOSTO_I18N'], ['lib/tm_i18n_common.js', 'TM_I18N_COMMON'], ['lib/tm_lib_i18n.js', 'TM_LIB_I18N']];

  // vp_kartta — VP_v25:n vpT-avaimet ilman sv-riviä (avain = fi-teksti sellaisenaan → TM_VP_I18N.sv; vienti: scripts/i18n_vie_sv_era.cjs vp_kartta)
  {
    const vp = poimi({ juuri: ROOT, tiedostot: ['TalentMaster_VP_v25.html'], routerit: ['vpT', '_mT'], kartat: KARTAT_VP, taulukot: ['TM_TESTI_OHJEET', '_ONB_VP', '_PHV_LABEL', '_VP_POS_NIMI', '_TAL_LAJINIMI', '_VP_HH_FOKUS_NIMI', '_VP_OHJ_PHV_NIMI', '_JSV_HH_TEEMA', 'TK_LAJI_NIMET', '_VKO_LASNA', '_JA_POSRYHMA'] });
    const v = vanh('vp_kartta'), r = {};
    vp.puuttuu.filter((t) => !eiKaannettava(t)).forEach((fi) => { r[fi] = { fi, sv: svVanha(v, fi) }; });
    ulos.osiot.vp_kartta = { _konteksti: 'HENKILÖKUNTA (VP-dashboard, TalentMaster_VP_v25.html): käyttöliittymän tekstit, nappien ja tilojen nimet, aloitus-/syvyyskortit, kalibraatiolauseet. Avain = suomenkielinen teksti sellaisenaan. Paikanvaraajat {n}, {h}, {p}, {ankkuri}, {ero}, {osa}, {nimet} säilytetään sellaisenaan. Sävy: ammattimainen, tiivis; lapsi- ja perhesisältö ei kuulu tähän osioon. Vain VP-sivulla uusina reititetyt tai aiemmin käännöksettömät rivit — jo käännetyt rivit ovat TM_VP_I18N:ssä.', rivit: r };
  }
  // henkilosto_kartta — Seurahallinta + ADAR-pikakortti + Pelihavainto (tmHT/phT) ilman sv-riviä → lib/tm_henkilosto_i18n.js sv. viite_sv = SAMA fi-avain jo käännettynä VP/Master/yhteisessä kartassa (johdonmukaisuusapu, ei lopullinen)
  {
    const h = poimi({ juuri: ROOT, tiedostot: ['TalentMaster_Seura.html', 'TalentMaster_ADAR_Pikakortti.html', 'TalentMaster_Pelihavainto_Kentta.html'], routerit: ['tmHT', 'phT'], kartat: KARTAT_HENK });
    const v = vanh('henkilosto_kartta'), r = {};
    h.puuttuu.filter((t) => !eiKaannettava(t)).forEach((fi) => {
      const viite = VP[fi] || MA[fi] || CO[fi] || LI[fi];
      r[fi] = { fi, sv: svVanha(v, fi) }; if (viite) r[fi].viite_sv = viite;
    });
    ulos.osiot.henkilosto_kartta = { _konteksti: 'HENKILÖKUNTA: Seurahallinta (VP/sihteeri/UTJ: pelaajat, joukkueet, kutsut, tunnukset, Excel-tuonti, toastit ja vahvistusikkunat), ADAR-pikakortti (valmentajan kenttäpikakortti, havainnon tallennus) ja Pelihavainto (kenttätyökalu: ottelun aikainen kirjaus). Avain = suomenkielinen teksti sellaisenaan. Paikanvaraajat {n}, {nimi}, {pvm}, {nimet} jne. säilytetään. viite_sv (jos annettu) = sama suomenkielinen teksti on jo käännetty VP/Master-sivulla: käytä samaa muotoa ellei asiayhteys vaadi toista. Termit: pelihavainto, otteluhavainnointi, ottelutarkkailu ks. termisto.kaannettava.', rivit: r };
  }
  // lib.tm_adar_tekstit — ADAR-pikakortin sisältö (kysymykset, kuvaukset, vinkit, vaihtoehdot); avain = tekstin polku (adar_<ulottuvuus>_<osa>), sama kuin lib/tm_adar_tekstit.js FI
  {
    const T = require('../lib/tm_adar_tekstit.js');
    const FIk = T.FI || (T.TM_ADAR_TEKSTIT && T.TM_ADAR_TEKSTIT.FI) || {};
    const v = vanh('lib.tm_adar_tekstit'), r = {};
    Object.keys(FIk).forEach((a) => { r[a] = { fi: FIk[a], sv: svVanha(v, a) }; });
    ulos.osiot['lib.tm_adar_tekstit'] = { _konteksti: 'HENKILÖKUNTA (valmentaja kentällä): ADAR-pikakortin sisältö — A = Havainnointi, D = Päätös/Päätöksenteko, Act = Toteutus, R = Palautuminen. Kysymys (q), tasokuvaukset (d1–d3: 1 = kehitettävää, 3 = hallitsee), valmentajan vinkit (tip1–tip3), havaintovaihtoehdot (v1–v4); lisäksi pisteiden nimet, konteksti-, verbi- ja partitiivimuodot sekä ikävaihe-selitteet. Avain = polku (kuten lib.tm_adar_nimet / lib.tm_tanaan_signaali). Sävy: valmentajalle suunnattu, konkreettinen, ei arvottava; sama teksti näkyy valmentajalle, pelaajan ADAR-nimet (Havainnointi/Päätöksenteko/Toteutus/Palautuminen) noudattavat lib_adar_nimet-osion käännöksiä. Paikanvaraajat {nimi}, {verbi}, {partitiivi}, {hist} säilytetään.', rivit: r };
  }
  // lib.tm_pelihavainto_valinta + lib.tm_havaintohistoria — pienet jaetut libit (avain = fi-teksti; vain puuttuvat)
  {
    const PV = require('../lib/tm_pelihavainto_valinta.js');
    const tekstit = new Set(['Pelihavainto']); Object.values(PV.TM_PH_TEKSTIT || {}).forEach((x) => tekstit.add(x));
    const { reititinKutsut } = require('../tools/i18n/reititin_avaimet.cjs');
    const hh = fs.readFileSync(path.join(ROOT, 'lib/tm_havaintohistoria.js'), 'utf8');
    const hhT = new Set(); reititinKutsut(hh, ['t']).forEach((x) => hhT.add(x));
    for (const m of hh.matchAll(/NIMET = \{([^}]*)\}/g)) for (const mm of m[1].matchAll(/:\s*'([^']+)'/g)) hhT.add(mm[1]);
    const onSv = (t) => [VP, MA, CO, LI].some((K) => typeof K[t] === 'string' && K[t] !== '');
    for (const [osio, set, kuvaus] of [['lib.tm_pelihavainto_valinta', tekstit, 'Pelihavainnon valintanäkymä (valmentaja valitsee: yksi havainto nyt = harjoitukset ja kevyt pelaajahavainto / seuraan ottelua = ottelun aikainen kirjaus). "Pelihavainto" on kenttätyökalun nimi (ks. termisto.kaannettava).'], ['lib.tm_havaintohistoria', hhT, 'Havaintojen ja viestien historia (VP:n pelaajakortti + valmentajan Master): suodattimet ja merkinnän tilat (Pelaaja näkee / Vain valmentajille / Peruttu).']]) {
      const v = vanh(osio), r = {};
      [...set].filter((t) => /[a-zåäöA-ZÅÄÖ]{3}/.test(t) && !onSv(t)).forEach((fi) => { r[fi] = { fi, sv: svVanha(v, fi) }; });
      ulos.osiot[osio] = { _konteksti: 'HENKILÖKUNTA: ' + kuvaus + ' Avain = suomenkielinen teksti sellaisenaan.', rivit: r };
    }
  }
  // #892:n jäännökset
  {
    // (a) ts_otsikko (lib/tm_tanaan_signaali.js FI.ts_otsikko = 'Seuraava askel') — avain ilman sv-riviä
    const TS = require('../lib/tm_tanaan_signaali.js');
    const v = vanh('lib.tm_tanaan_signaali'), r = {};
    r.ts_otsikko = { fi: (TS.FI && TS.FI.ts_otsikko) || 'Seuraava askel', sv: svVanha(v, 'ts_otsikko') };
    ulos.osiot['lib.tm_tanaan_signaali'] = { _konteksti: 'HENKILÖKUNTA (Tänään-kortti): "Seuraava askel" -signaalikortin pieni otsikko. Avain = lib-avain ts_otsikko. Käytä samaa muotoa kuin vastaavassa kt_seuraava_askel-rivissä (lib.tm_kehitystyopoyta), ellei asiayhteys vaadi toista.', rivit: r };
  }
  {
    // (b) Klubb/Klubben → Förening: kaikki nykyiset sv-rivit joissa "klubb" (tm_lang polku / vp / master / yhteinen). nykyinen_sv = vain viite, sv jätetään Geminille.
    const L2 = require('../lib/tm_lang.js').TM_LANG;
    const v = vanh('jaannos.seura_forening'), r = {};
    const walk = (o, pre, f) => { for (const k of Object.keys(o)) { const x = o[k], p = pre ? pre + '.' + k : k; if (x && typeof x === 'object') walk(x, p, f); else f(p, x); } };
    walk(L2.sv, '', (p, x) => { if (/klubb/i.test(String(x))) { const k = 'tm_lang:' + p; r[k] = { fi: hae('fi', p), nykyinen_sv: x, kohde: 'tm_lang', polku: p, sv: svVanha(v, k) }; } });
    for (const [n, M] of [['vp', VP], ['master', MA], ['common', CO]]) for (const fi of Object.keys(M)) if (/klubb/i.test(M[fi])) { const k = n + ':' + fi; r[k] = { fi, nykyinen_sv: M[fi], kohde: n, sv: svVanha(v, k) }; }
    ulos.osiot['jaannos.seura_forening'] = { _konteksti: 'JÄÄNNÖS #892: Tero 8.10. päätti termin "Seura" = Förening (termisto.paatetty). Koodissa on vielä rivejä joissa seura on käännetty Klubb/Klubben/klubbens. Käännä rivi uudelleen niin että seura = förening (Föreningens, föreningsadministration jne.; "Seurahallinta" = Föreningsadministration). nykyinen_sv on vain viite (älä kopioi sitä sellaisenaan), kohde kertoo mihin karttaan rivi viedään. Sama fi-teksti → sama sv kaikissa kohteissa. Muut sanat ja sävy ennallaan — muuta vain seura-sanan käännös.', rivit: r };
  }
  {
    // (c) "Kehityskaari (kausifokus)" ja muut kausifokus-rivit (Kehityskaari = termisto.paatetty: Utvecklingskurva; Kausi = Säsong)
    const v = vanh('jaannos.kausifokus'), r = {};
    for (const [n, M] of [['vp', VP], ['master', MA]]) for (const fi of Object.keys(M)) if (/kausifokus/i.test(fi)) { const k = n + ':' + fi; r[k] = { fi, nykyinen_sv: M[fi], kohde: n, sv: svVanha(v, k) }; }
    ulos.osiot['jaannos.kausifokus'] = { _konteksti: 'JÄÄNNÖS #892: "Kehityskaari" on termistössä päätetty (Utvecklingskurva) mutta rivissä "Kehityskaari (kausifokus)" on vielä Utvecklingsbåge. Käännä rivit uudelleen termiston mukaan (Kehityskaari → päätetty muoto, Kausi → Säsong, Jaksofokus → Periodfokus). nykyinen_sv on vain viite.', rivit: r };
  }
  {
    // (d) VP×Master: samat fi-avaimet käännetty eri tavoin kahdessa kartassa → yksi muoto (Gemini valitsee), vienti kirjoittaa saman sv:n molempiin
    const v = vanh('jaannos.vp_master'), r = {};
    for (const fi of Object.keys(VP)) if (fi in MA && VP[fi] !== MA[fi] && VP[fi] && MA[fi]) r[fi] = { fi, sv_vp: VP[fi], sv_master: MA[fi], sv: svVanha(v, fi) };
    ulos.osiot['jaannos.vp_master'] = { _konteksti: 'JÄÄNNÖS #892: sama suomenkielinen teksti on käännetty VP:ssä (sv_vp) ja Masterissa (sv_master) eri tavoin. Valitse YKSI muoto (voit valita jommankumman tai parantaa) ja kirjoita se sv-kenttään; vienti kirjoittaa saman sv:n molempiin karttoihin. Noudata termistöä. Rivejä ei ole lisätty uusina — ne ovat nyt käytössä, joten yhtenäistys näkyy heti molemmissa sovelluksissa.', rivit: r };
  }
  // termistölisäykset (PR 4): ADAR-kentän ja ottelutyökalujen termit — Gemini ehdottaa muodon, käytä johdonmukaisesti kaikissa osioissa
  ulos.termisto = JSON.parse(JSON.stringify(ulos.termisto));
  ulos.termisto.kaannettava = Object.assign({}, ulos.termisto.kaannettava, {
    'Havainnointi': { sv: '', _huom: 'ADAR A (assess). Valmentajan ja pelaajan käytössä sama nimi; ks. lib_adar_nimet. Ei sama kuin "Havainto" (yksittäinen kirjaus = Observation).' },
    'Päätös / Päätöksenteko': { sv: '', _huom: 'ADAR D (decide): valmentajan näkymässä "Päätös", pelaajan näkymässä "Päätöksenteko" — jos ruotsissa riittää yksi muoto, sano se; muuten kaksi.' },
    'Toteutus': { sv: '', _huom: 'ADAR Act.' },
    'Palautuminen': { sv: '', _huom: 'ADAR R (reassess/palautuminen virheestä). Ei fyysinen palautuminen (lepo) — ADAR-yhteydessä kyse on pelillisestä palautumisesta virheen jälkeen.' },
    'Pelihavainto': { sv: '', _huom: 'Kenttätyökalun ja havaintokirjauksen nimi (ADAR-kenttäkirjaus + ottelun aikainen kirjaus). Huom. Teron 8.10. löydös: rivi "spelobservation" on väärässä paikassa — käytä tätä päätettyä termiä.' },
    'Otteluhavainnointi': { sv: '', _huom: 'Ottelun aikainen kirjaus (eleet, ketjut, puoliajan läpikäynti): työkalu "Seuraan ottelua".' },
    'Ottelutarkkailu': { sv: '', _huom: 'Masterin Ottelutarkkailut-näkymä (valmentajan tekemät otteluhavainnot jälkikäteen luettavina).' },
  });
}
// lib_adar_nimet osioksi (samaan muotoon kuin muut osiot): osiot-objektiin
ulos.osiot.lib_adar_nimet = ulos.lib_adar_nimet; delete ulos.lib_adar_nimet;
ulos._rivit_yhteensa = Object.values(ulos.osiot).reduce((s, o) => s + Object.keys(o.rivit || {}).length, 0);
fs.writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
console.log('kirjoitettu ' + path.relative(ROOT, OUT) + ': tm_lang ' + Object.keys(rivit).length + ' riviä (uusia ' + uusia + '), yhteensä ' + ulos._rivit_yhteensa);
