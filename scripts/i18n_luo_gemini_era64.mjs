#!/usr/bin/env node
/* Gemini-erä 64 (Kehitystyöpöytä 22 · B4a: Polku-välilehti uudella sivulla — Kausi → Jakso nyt, klipit jakson sisällä; 17.10.). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = lib.tm_kt_polku (avain = lib-avain ktp_*). fi luetaan suoraan libistä (erä = koodi). Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era64.mjs [--tiedosto=docs/i18n/sv_kaannoserae_64_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_64_gemini.json'));
const FI = require('../lib/tm_kt_polku.js').FI;
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const OSIO = 'lib.tm_kt_polku';
const vanha = (k) => { const r = nyk && nyk.osiot && nyk.osiot[OSIO] && nyk.osiot[OSIO].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const VIITE = ' Termistö: jakso = period, ydinvahvuus = kärnstyrka, havainto = observation, klippi = klipp, pelaaja = spelare, huoltaja = vårdnadshavare, kausi = säsong, osat = delar.';
const H = {
  ktp_kausi: 'Jana-otsikko (yläotsikko, isot kirjaimet): kausi. Perässä voi olla kauden nimi ("Kausi · syksy 2026"). Yksi sana.',
  ktp_kausi_ei: 'Kauden tavoitetta ei ole asetettu pelaajalle. Yksi lause.',
  ktp_aseta_kausitavoite: 'Linkki (valmentaja/VP): aseta pelaajan kauden tavoite.', ktp_muokkaa_kausitavoitetta: 'Linkki: muokkaa pelaajan kauden tavoitetta (fi korjattu palautuksessa: "Muokkaa kauden tavoitetta").',
  ktp_asetettu: 'Kauden tavoitekortin ikä: "asetettu 20.8." (pienellä alkukirjaimella, {pvm} säilytetään).',
  ktp_omin_sanoin: 'Pelaajan oma tavoite sanatarkasti lainattuna: "Pelaajan omin sanoin: ”{teksti}”". Säilytä {teksti} ja lainausmerkit ”…”.',
  ktp_tavoite_arvo: 'Mitattu tavoitearvo, esim. "Tavoite: 5,10 s." {arvo} on luku ja {yks} mittayksikkö. Säilytä molemmat paikkamerkit ja loppupiste.',
  ktp_lahto_mitattu: 'Mitattu lähtötaso, esim. "Lähtötaso: 5,40 s (mitattu 5.6.)." Säilytä {arvo}, {yks}, {pvm} ja loppupiste.',
  ktp_lahto_ei: 'Lähtötasoa ei ole mitattu. Yksi lause, loppupiste.',
  ktp_jakso_nyt: 'Jana-otsikko (yläotsikko, isot kirjaimet): käynnissä oleva jakso, esim. "Jakso nyt · 3.10.–14.11.". Lyhyt.' + VIITE,
  ktp_viikko: 'Jakson viikko, esim. "viikko 3/6" (pienellä). Säilytä {n} ja {k}.', ktp_paattynyt: 'Jakso on päättynyt ja se pitää sulkea (katselmus). Pieni teksti kortin oikeassa yläkulmassa, esim. "päättynyt · suljettava".',
  ktp_tuki: 'Jakson tukiosa, esim. "tukiosa: Kehon hallinta (fyysinen)". Säilytä {alue}.' + VIITE, ktp_arviointi: 'Jakson arviointipäivä, esim. "arviointi 14.11." (pienellä, {pvm} säilytetään).',
  ktp_klipit: 'Klippien osion nimi (jakson sisällä). Klippi = valmentajan pelaajalle lähettämä videolinkki, johon pelaaja vastaa.' + VIITE,
  ktp_ei_klippeja: 'Jaksolla ei ole vielä klippejä. Yksi lause, loppupiste.', ktp_nayta_kaikki: 'Linkki joka avaa kaikki klipit, esim. "Näytä kaikki (7)". Säilytä {n}.', ktp_avaa_klippi: 'Linkki, joka avaa klipin (video) uuteen välilehteen.',
  ktp_vastaus: 'Klipin ketjussa pelaajan vastauksen etuliite, esim. "Pelaaja: Näin vapaan tilan". Yksi sana.', ktp_kuittaus: 'Klipin ketjussa valmentajan kuittauksen etuliite, esim. "Kuittaus: Hyvä!". Yksi sana.',
  ktp_k_odottaa: 'Klipin tila: lähetetty, vastausta ei vielä (pienellä).', ktp_k_vastattu: 'Klipin tila: pelaaja on vastannut (pienellä).', ktp_k_perhe: 'Klipin tila: huoltaja on kuitannut katsoneensa yhdessä (pienellä).',
  ktp_k_lupa: 'Klipin tila: odottaa huoltajan suostumusta ennen kuin pelaaja näkee sen (pienellä).', ktp_k_suljettu: 'Klipin tila: valmentaja on kuitannut ja sulkenut ketjun (pienellä).',
  ktp_lisaa_klippi: 'Valikkovalinta: lähetä pelaajalle uusi klippi.', ktp_merkitse_havainto: 'Linkki: merkitse tämän viikon havainto pelaajan jaksolle (osan taso: ei vielä / ohjatusti / itsenäisesti).',
  ktp_muokkaa_jaksoa: 'Valikkovalinta: muokkaa käynnissä olevaa jaksoa.', ktp_sulje_jakso: 'Valinta/nappi: sulje jakso ja tee arviointi (kolme kysymystä).',
  ktp_valikko: 'Ruudunlukijan nimi "⋯"-valikkopainikkeelle: lisää toimintoja.',
  ktp_ei_jaksoa: 'Otsikko kortissa: pelaajalla ei ole jaksoa käynnissä.', ktp_ei_jaksoa_ohje: 'Ohje ei-jaksoa-kortissa: kun jakso aloitetaan, osat, viikkohavainnot ja klipit tulevat tähän. Yksi lause.',
  ktp_aloita_jakso: 'Nappi: aloita pelaajalle uusi jakso.', ktp_aseta_ydinvahvuus: 'Nappi: aseta ensin pelaajan ydinvahvuus pelikentälle (ennen jakson aloitusta).', ktp_vahvista_jakso: 'Nappi: vahvista pelaajan valitsema jakso.',
  ktp_valinta_odottaa: 'Tila: pelaaja valitsee parhaillaan seuraavaa reittiä (jaksoa). Yksi lause.', ktp_vahan_ohje: 'Ohje kun dataa on vähän: merkitse ensimmäinen viikkohavainto, niin jakson osille tulee tila. Yksi lause.',
  ktp_lataa: 'Lataustila: "Ladataan…" (kolme pistettä säilyy).', ktp_virhe_kausi: 'Virheilmoitus: kauden tavoitetta ei voitu ladata. Yksi lause.', ktp_virhe_klipit: 'Virheilmoitus: klippejä ei voitu ladata. Yksi lause.', ktp_yrita_uudelleen: 'Linkki virheilmoituksen perässä: yritä uudelleen.'
};
const puuttuu = Object.keys(FI).filter((k) => !(k in H)), ylim = Object.keys(H).filter((k) => !(k in FI));
if (puuttuu.length || ylim.length) { console.error('huom-avaimet eivät täsmää libiin: puuttuu ' + puuttuu + ' · ylimääräiset ' + ylim); process.exit(1); }
const rivit = {}; for (const k of Object.keys(FI)) rivit[k] = { fi: FI[k], huom: H[k], sv: vanha(k) };
const n = Object.keys(rivit).length;
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 64 (Kehitystyöpöytä 22 · B4a: Polku-välilehti uudella sivulla — Kausi, Jakso nyt, klipit jakson sisällä; sv tyhjä → Gemini)',
  _pvm: '2026-10-17',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.',
  _rivit_yhteensa: n,
  _rivit_osioittain: { [OSIO]: n },
  osiot: { [OSIO]: { _konteksti: 'HENKILÖKUNTA (valmentaja ja VP, työpöytä + puhelin): pelaajan Polku-välilehti Kehitystyöpöydällä: jana Kausi → Jakso nyt. Kausi = pelaajan kauden tavoite; Jakso nyt = käynnissä oleva harjoitusjakso (ydinasiat/osat, viikkohavainnot, klipit). Avain = lib-avain (ktp_*). Sävy: valmentajalle suunnattu, konkreettinen, lyhyt ja neutraali; ei pelaajalle näytettävää tekstiä. Paikkamerkit {…} säilytetään. Termistö lukittu (docs/i18n/termisto.fi-sv.json).', _lahde: 'lib/tm_kt_polku.js (FI)', rivit } }
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
console.log('Kirjoitettu ' + n + ' riviä → ' + OUT.replace(ROOT + '/', ''));
