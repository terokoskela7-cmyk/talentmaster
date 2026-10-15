#!/usr/bin/env node
/* Gemini-erä 55 (Sibbo 1.11. suostumuslomake vaihe 1: staattinen markup). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = TalentMaster_Rekisterointi_Suostumus.html:n staattisen markupin UUDET avaimet (suostumus.rek_*). EI toista erien 53 ja 54 rivejä.
   Idempotentti: jo täytetty sv säilyy. Ajo: node scripts/i18n_luo_gemini_era55.mjs [--tiedosto=docs/i18n/sv_kaannoserae_55_gemini.json] */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_55_gemini.json'));
const _log = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('[TM Lang]') && !String(a[0]).startsWith('[tm-')) _log(...a); };
const L = require('../lib/tm_lang.js').TM_LANG;
const lue = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (avain) => { const r = nyk && nyk.osiot && nyk.osiot.tm_lang && nyk.osiot.tm_lang.rivit[avain]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const aiemmat = new Set(); for (const f of ['sv_kaannoserae_53_gemini.json', 'sv_kaannoserae_54_gemini.json']) for (const o of Object.values(lue('docs/i18n/' + f).osiot)) for (const k of Object.keys(o.rivit)) aiemmat.add(k);

const HUOM = {
  rek_sivun_otsikko: 'Selaimen välilehden otsikko (<title>). Brändinimi TalentMaster säilyy sellaisenaan.',
  rek_alaotsikko: 'Sivun alaotsikko logon alla. "Tietosuojasuostumus" = GDPR-suostumus huoltajan antamana.',
  rek_vaihe_perustiedot: 'Vaihe 1/3 etenemispalkissa (lyhyt substantiivi). Samassa palkissa: rek_vaihe_suostumus (2/3) ja rek_vaihe_valmis (3/3).',
  rek_vaihe_suostumus: 'Vaihe 2/3 etenemispalkissa (lyhyt substantiivi, yksikkö). Eri kuin otsikko "Suostumukset" (rek_suostumukset_otsikko, monikko).',
  rek_vaihe_valmis: 'Vaihe 3/3 etenemispalkissa: "Valmis" = lomake on tehty.',
  rek_pelaajan_tiedot: 'Kortin otsikko; kortissa pelaajan nimi, syntymäaika, sukupuoli ja sähköposti.',
  rek_etunimi: 'Kentän nimi (tähti lisätään koodissa perään). Pelaajan etunimi.',
  rek_sukunimi: 'Kentän nimi (tähti lisätään koodissa perään). Pelaajan sukunimi.',
  rek_esim_mikael: 'Kentän placeholder-esimerkki: "esim." = "t.ex." tms.; Mikael on esimerkkinimi, säilytä nimi.',
  rek_esim_korhonen: 'Kentän placeholder-esimerkki: "esim." + esimerkkisukunimi (Korhonen on yleinen suomalainen sukunimi; säilytä).',
  rek_syntymaaika: 'Kentän nimi (tähti lisätään koodissa perään). Päivä/kuukausi/vuosi -valikoiden yläpuolella.',
  rek_sukupuoli: 'Kentän nimi (valinnainen kenttä).',
  rek_valitse: 'Alasvetovalikon tyhjä oletusvalinta ("-- valitse --"). Säilytä ajatusviivat tyylissä.',
  rek_poika_mies: 'Valikon vaihtoehto sukupuolikentässä (tallennettava arvo P ei muutu). Alaikäisestä "Poika", aikuisesta "Mies".',
  rek_tytto_nainen: 'Valikon vaihtoehto sukupuolikentässä (tallennettava arvo T ei muutu). Alaikäisestä "Tyttö", aikuisesta "Nainen".',
  rek_muu_en_halua: 'Valikon vaihtoehto sukupuolikentässä (tallennettava arvo M ei muutu): "Muu" tai "En halua kertoa".',
  rek_sahkoposti_yli18: 'Kentän nimi: pelaajan oma sähköposti, vain kun pelaaja on täysi-ikäinen (yli 18 v). "18v" = 18 vuotta.',
  rek_email_esim: 'Sähköpostikentän placeholder-esimerkki (suomalaistyylinen esimerkkiosoite "oma.osoite@email.fi"). Mukauta sv-esimerkkiosoite sv:ksi (esim. "egen.adress@email.se"-tyyliin), älä käytä oikeaa osoitetta.',
  rek_raportit_tahan: 'Ohjeteksti sähköpostikentän alla. Säilytä kaksoisviiva "--" (ajatusviiva). Alle 18-vuotiaan raportit menevät huoltajalle.',
  rek_huoltajan_tiedot: 'Kortin otsikko (näkyy vain jos pelaaja on alaikäinen).',
  rek_alaikainen_otsikko: 'Infolaatikon otsikko (näkyy kun pelaaja on alle 18 v). Säilytä "--".',
  rek_alaikainen_teksti: 'Infolaatikon teksti. GDPR-lainaus: säilytä tarkka merkitys (huoltajan suostumus vaaditaan alle 18-vuotiaan tietojen käsittelyyn); älä pehmennä äläkä lisää lupauksia.',
  rek_huoltajan_etunimi: 'Kentän nimi (tähti lisätään koodissa perään). Huoltajan etunimi.',
  rek_esim_pekka: 'Kentän placeholder-esimerkki: "esim." + esimerkkietunimi (Pekka; säilytä nimi).',
  rek_huoltajan_sukunimi: 'Kentän nimi (tähti lisätään koodissa perään). Huoltajan sukunimi.',
  rek_huoltajan_sahkoposti: 'Kentän nimi (tähti lisätään koodissa perään). Huoltajan sähköposti.',
  rek_huoltaja_email_esim: 'Sähköpostikentän placeholder-esimerkki ("huoltaja@email.fi"). Käännä "huoltaja"-osa (vårdnadshavare tms.), älä käytä oikeaa osoitetta.',
  rek_raportit_osoitteeseen: 'Ohjeteksti huoltajan sähköpostikentän alla.',
  rek_huoltajan_puhelin: 'Kentän nimi (valinnainen kenttä). Huoltajan puhelinnumero.',
  rek_esim_u15: 'Kentän placeholder: "esim." + joukkueen nimi U15 (säilytä U15). Kenttä on lukittu ja esitäytetty.',
  rek_esim_kpv: 'Kentän placeholder: "esim." + seuran lyhenne KPV (säilytä KPV). Kenttä on lukittu ja esitäytetty.',
  rek_palloid_selite: 'Kentän nimen perässä sulkeissa pienellä: PalloID = Palloliiton (Suomen Palloliitto, Finnish FA) pelaajatunnus. Säilytä "PalloID" ja sulkeet.',
  rek_esim_palloid: 'Kentän placeholder: "esim." + esimerkkinumero 34650191 (säilytä numero).',
  rek_palloid_hint: 'Ohjeteksti kentän alla. "PalloID" on tuotenimi (Palloliiton järjestelmä), säilytä sellaisenaan. Palloliitto = Suomen Palloliitto (Finnish FA); käytä sen virallista sv-nimeä termistön mukaan.',
  rek_bi_otsikko: 'Kortin otsikko. Biologinen ikä = kasvun vaiheen arvio (PHV); termistö: docs/i18n/termisto.fi-sv.json. "(vapaaehtoinen)" säilytä sulkeissa.',
  rek_bi_miksi: 'Infolaatikon otsikko (kysymys) kortin sisällä.',
  rek_bi_info: 'Infolaatikon teksti. Lomake on GDPR-polussa: pidä selkeänä, älä pehmennä äläkä lisää lupauksia (luottamuksellisuus, ei kolmansille osapuolille).',
  rek_isan_pituus: 'Kentän nimi: pelaajan isän pituus senttimetreinä. "(cm)" säilytä.',
  rek_esim_179: 'Kentän placeholder: "esim." + esimerkkipituus 179 (säilytä luku).',
  rek_ei_tiedossa: 'Valintaruudun teksti isän/äidin pituuskentän alla (käytössä kahdesti: isä ja äiti): pituutta ei tiedetä.',
  rek_aidin_pituus: 'Kentän nimi: pelaajan äidin pituus senttimetreinä. "(cm)" säilytä.',
  rek_esim_166: 'Kentän placeholder: "esim." + esimerkkipituus 166 (säilytä luku).',
  rek_adoptoitu: 'Valintaruudun teksti: pelaaja on adoptoitu tai biologisten vanhempien tietoja ei ole saatavilla. Neutraali, hienotunteinen sävy.',
  rek_nappi_seuraava: 'Vaiheen 1 alareunan nappi: siirtyy vaiheeseen 2 (suostumukset). Lyhyt toimintosana.',
  rek_suostumukset_otsikko: 'Vaiheen 2 kortin otsikko: monikko "Suostumukset" (kortissa useita erillisiä suostumuksia).',
  rek_seuraavat_askeleet: 'Kuittisivun infolaatikon otsikko rekisteröinnin jälkeen.',
  rek_valmentaja_yhteys: 'Kuittisivun infolaatikon teksti: valmentaja ottaa yhteyttä ja sopii ensimmäisen testauksen ajankohdan (testaus = fyysinen testaus).',
  rek_ts_otsikko: 'Tietosuojaselosteen ikkunan otsikko (versaalit, GDPR privacy notice; säilytä versaalit). Termi: tietosuojaseloste.',
  rek_ts_sulje: 'Ikkunan sulkunappi.',
  rek_ts_rekisterinpitaja_otsikko: 'Tietosuojaselosteen rivin otsikko (lihavoitu, kaksoispiste mukana): rekisterinpitäjä = GDPR:n "data controller" (juridinen termi; käytä virallista).',
  rek_ts_tarkoitus_otsikko: 'Tietosuojaselosteen rivin otsikko (lihavoitu, kaksoispiste mukana): käsittelyn tarkoitus.',
  rek_ts_tarkoitus_teksti: 'Rivin arvo; seuraa rek_ts_tarkoitus_otsikko-riviä. Juridinen teksti (tietosuojaseloste): pidä tarkkana.',
  rek_ts_sailytysaika_otsikko: 'Tietosuojaselosteen rivin otsikko (lihavoitu, kaksoispiste mukana): säilytysaika.',
  rek_ts_sailytysaika_teksti: 'Rivin arvo; seuraa rek_ts_sailytysaika_otsikko-riviä: asiakassuhteen päättymiseen + 2 vuotta. Säilytä luvut ja "+".',
  rek_ts_sijainti_otsikko: 'Tietosuojaselosteen rivin otsikko (lihavoitu, kaksoispiste mukana): tietojen sijainti (tallennuspaikka).',
  rek_ts_sijainti_teksti: 'Rivin arvo; seuraa rek_ts_sijainti_otsikko-riviä. Säilytä "Google Firebase" ja "EU". Juridinen teksti: pidä tarkkana.',
  rek_ts_oikeutesi_otsikko: 'Tietosuojaselosteen rivin otsikko (lihavoitu, kaksoispiste mukana): rekisteröidyn oikeudet, puhutellaan huoltajaa (sinä).',
  rek_ts_oikeutesi_teksti: 'Rivin arvo; seuraa rek_ts_oikeutesi_otsikko-riviä: oikeus nähdä, oikaista ja poistaa lapsen tiedot milloin tahansa. GDPR: älä pehmennä äläkä lisää lupauksia.',
  rek_ts_yhteydenotot_otsikko: 'Tietosuojaselosteen rivin otsikko (lihavoitu, kaksoispiste mukana): yhteydenotot; sähköpostiosoite lisätään koodissa perään.',
};
const avaimet = Object.keys(L.fi.suostumus).filter((k) => k.startsWith('rek_'));
const puuttuuHuom = avaimet.filter((k) => !HUOM[k]), ylimaaraiset = Object.keys(HUOM).filter((k) => !avaimet.includes(k));
if (puuttuuHuom.length || ylimaaraiset.length) { console.error('huom-kentät eivät vastaa avaimia', { puuttuuHuom, ylimaaraiset }); process.exit(1); }
const toistot = avaimet.filter((k) => aiemmat.has('suostumus.' + k)); if (toistot.length) { console.error('Rivi jo erässä 53/54:', toistot); process.exit(1); }
const rivit = {};
for (const k of avaimet) rivit['suostumus.' + k] = { fi: L.fi.suostumus[k], en: L.en.suostumus[k], huom: HUOM[k], sv: vanha('suostumus.' + k) };
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 55 (Sibbo 1.11. suostumuslomake vaihe 1: staattinen markup; EI erien 53/54 rivejä; sv tyhjä → Gemini)',
  _pvm: '2026-10-15',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (en, huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.',
  _rivit_yhteensa: avaimet.length,
  _rivit_osioittain: { tm_lang: avaimet.length },
  osiot: { tm_lang: {
    _konteksti: 'HUOLTAJA (vanhempi) ja lapsi: rekisteröinti- ja suostumuslomakkeen vaihe 1 (perustiedot) + tietosuojaselosteen ikkuna + kuittisivun ohjeteksti (TalentMaster_Rekisterointi_Suostumus.html). Tämä on huoltajan ensimmäinen näkymä sv-tilassa. Avain = pisteytetty polku lib/tm_lang.js:ssä (suostumus.rek_*). Käytä samoja termejä kuin erissä 53 ja 54 (erä 53 palautus: docs/i18n/sv_kaannoserae_53_palautus.json, osio kovakoodatut.suostumus; erä 54: docs/i18n/sv_kaannoserae_54_palautus.json). Lomake on GDPR-polussa: pidä selkeänä, älä pehmennä äläkä lisää lupauksia. Termistö: docs/i18n/termisto.fi-sv.json (lukittu). "esim." placeholder-rivit ovat esimerkkejä kentän sisällöstä: säilytä esimerkkinimet/-luvut, käännä vain "esim.". Säilytä välimerkit täsmälleen.',
    _lahde: 'lib/tm_lang.js', rivit } },
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
_log('Kirjoitettu ' + avaimet.length + ' riviä → ' + OUT.replace(ROOT + '/', ''));
