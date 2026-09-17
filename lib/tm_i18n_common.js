/* TalentMaster — jaettu henkilöstö-i18n (Vaihe 0). Vain JAETUT stringit + lukittu glossaari.
   Arvot konformoivat tm_lang.js:ään (glossaari-SSOT). Sivukohtaiset kartat (tm_vp_i18n.js, tuleva
   tm_master_i18n.js, tm_seura_i18n.js) EIVÄT saa määritellä näitä avaimia uudelleen (konsistenssitesti).
   Lataus: tm_lang.js → tm_i18n_common.js → <sivukartta>. Avain = KANONINEN suomi. Puuttuva → fi-fallback. */
var TM_I18N_COMMON = {
  sv: {
    /* — Yleisnapit / -toiminnot (≥2 henkilöstösivulla) — */
    'Tallenna': 'Spara', 'Peruuta': 'Avbryt', 'Sulje': 'Stäng', 'Takaisin': 'Tillbaka',
    'Poista': 'Ta bort', 'Muokkaa': 'Redigera', 'Lähetä': 'Skicka', 'Kopioi': 'Kopiera',
    'Lataa': 'Ladda ner', 'Hae nimellä...': 'Sök på namn...',
    /* — Kirjautuminen / chrome — */
    'Kirjaudu ulos': 'Logga ut', 'Kirjaudu sisään': 'Logga in', 'Sähköposti': 'E-post',
    'Salasana': 'Lösenord', 'Asetukset': 'Inställningar', 'Avaa valikko': 'Öppna meny',
    /* — Roolien näyttönimet (enum-roolistringit 'vp'/'valmentaja' EIVÄT tänne) — */
    'Valmennuspäällikkö': 'Fotbollsutvecklare',   // kanoni (V8, Teron päätös): Fotbollsutvecklare — EI kapeampi variantti
    'Valmentaja': 'Tränare', 'Talenttivalmentaja': 'Talangtränare', 'Fysiikkavalmentaja': 'Fystränare',
    'Testivastaava': 'Testansvarig', 'Fysioterapeutti': 'Fysioterapeut', 'Seurasihteeri': 'Klubbsekreterare',
    'Urheilutoimenjohtaja': 'Sportchef', 'Super Admin': 'Super Admin',
    /* — Perusnavigointi / -entiteetit — */
    'Pelaajat': 'Spelare', 'Pelaaja': 'Spelare', 'Joukkueet': 'Lag', 'Joukkue': 'Lag',
    'Henkilöstö': 'Personal', 'Kalenteri': 'Kalender', 'Raportointi': 'Rapportering',
    /* — TAKTIIKKATAULU (lib/tm_kaavio_ui.js) — JAETTU: sama UI ajaa VP_v25:ssä ja Master_v16:ssa.
       Nämä asuivat aiemmin TM_VP_I18N.sv:ssä. Kun UI muuttui jaetuksi libiksi, kartan olisi pitänyt
       monistua kahteen sivukarttaan — ja monistettu käännös ajautuu. Siksi kaavio-UI:n chrome on
       täällä: yksi lähde, molemmat apit lukevat sen tmI18nResolve()-portin läpi.
       HUOM: spec-SISÄLTÖ (nimi/tilanne/selitteet) EI ole täällä — se on spec-datassa {fi,sv,en}
       -objekteina ja renderöijä valitsee kielen (C1: DB:hen ei litistetä kieltä).
       Tila-/näkyvyys-/työkalulabelit ovat enum→näyttö, avain pysyy suomena. */
    'tila': 'status',
    'Lisää pelaaja': 'Lägg till spelare',   // EI avainta 'Lisää': se on VP:ssä mobiilipalkin "⋯ Lisää"
                                           // (= Mer) ja Masterissa "Lägg till". Sama suomen sana, kaksi
                                           // merkitystä → jaettu kartta ei voi valita. Kaavioeditorin
                                           // otsikko täsmennettiin siksi omaksi yksiselitteiseksi avaimeksi.
    'Hylkää': 'Avvisa',
    'Hyväksy': 'Godkänn',
    'pelaaja': 'spelare',
    'Maalivahti': 'Målvakt',
    'Valmis': 'Klar',
    'luonnos': 'utkast',
    'odottaa hyväksyntää': 'väntar på godkännande',
    'hyväksytty': 'godkänd',
    'hylätty': 'underkänd',
    'seura': 'förening',
    'joukkue': 'lag',
    'Ehdota hyväksyttäväksi': 'Föreslå för godkännande',
    'Ymmärsin': 'Jag förstod',
    'Kysy': 'Fråga',
    'Taktiikkataulu': 'Taktiktavla',
    // Luokka C — puolustuspedagogiikan geometria (peittovarjo · korkeuslinja · vyöhyke).
    'Peittovarjo': 'Täckskugga', 'Korkeuslinja': 'Höjdlinje', 'Vyöhyke': 'Zon',
    'Peittäjä': 'Täckande', 'Peitettävä': 'Täckt',
    'Korkeus': 'Höjd', 'Sijainti': 'Placering', 'Koko': 'Storlek',
    'Peittovarjo: päät eivät voi olla sama pelaaja': 'Täckskugga: ändarna kan inte vara samma spelare',
    'Klikkaa peittäjää ja sitten peitettävää. Päät voi vaihtaa alta.': 'Klicka på den täckande och sedan på den täckta. Ändarna kan bytas nedan.',
    'Klikkaa korkeutta johon linja tulee. Raahaa linjaa pystysuunnassa.': 'Klicka på höjden där linjen ska ligga. Dra linjen vertikalt.',
    'Klikkaa: vyöhyke päälle tai pois. Raahaa runkoa = siirrä, kulmaa = koko.': 'Klicka: zonen på eller av. Dra i ytan = flytta, i hörnet = storlek.',
    // Katselmuksen kommenttilanka (erä E). Kommenttien SISÄLTÖ on vapaatekstiä omalla
    // kielellä (§32) — vain langan chrome käännetään.
    'Katselmus': 'Granskning',
    'Hylätty': 'Avvisad',
    'juuri nyt': 'just nu',
    'Ei kommentteja. Perustele hylkäys tai kysy tarkennusta tässä.': 'Inga kommentarer. Motivera avslag eller be om förtydligande här.',
    'Kirjoita kommentti…': 'Skriv en kommentar…',
    'Kommentin tallennus epäonnistui': 'Kommentaren kunde inte sparas',
    'Hylkää kaavio': 'Avvisa diagrammet',
    'Perustelu näkyy valmentajalle katselmuslangassa. Kerro mitä pitää korjata.': 'Motiveringen syns för tränaren i granskningstråden. Berätta vad som behöver rättas.',
    'Hylkäys vaatii perustelun.': 'Avslag kräver en motivering.',
    'Kysymys kytketään myöhemmässä vaiheessa': 'Frågor kopplas i ett senare skede',
    // Keskeneräinen luonnos (erä D2): tekijän oma kunnes julkaistu.
    'yksityinen luonnos · vain sinä': 'privat utkast · endast du',
    'Julkaise joukkueelle': 'Publicera för laget',
    'Julkaistu — näkyy nyt muille': 'Publicerat — syns nu för andra',
    'Julkaisu epäonnistui — lataa kaavio uudelleen': 'Publiceringen misslyckades — ladda om diagrammet',
    // Kaaviopankin FASETTISUODATTIMET (erä D1). Teema = pelivaihe (curriculumin ryhma/faasi/dim).
    'Teema': 'Tema', 'Rajaa': 'Avgränsa', 'Kaikki': 'Alla', 'Tyhjennä': 'Rensa',
    'Hyökkäys': 'Anfall', 'Puolustus': 'Försvar', 'Siirtymä': 'Omställning',
    'Erikoistilanne': 'Fasta situationer', 'Muut': 'Övriga',
    'Minulle osoitetut': 'Riktade till mig',
    '— kaikki pelaajat —': '— alla spelare —',
    'Hae nimellä, avaimella tai pelimuodolla…': 'Sök på namn, nyckel eller spelform…',
    'Ei osumia näillä rajauksilla.': 'Inga träffar med dessa avgränsningar.',
    // Kohdistus (A+B): kohteen valinta + kohteen näyttö kortissa/tallennusrivillä.
    'valmentaja': 'tränare',                       // näkyvyystaso (enum→näyttö), ei roolinimike
    'Kohdistus': 'Målgrupp',
    'kohdetta ei valittu': 'inget mål valt',
    'Rajaa joukkueella': 'Avgränsa med lag',
    'Valitse yksi tai useampi (ctrl/cmd tai pyyhkäisy).': 'Välj en eller flera (ctrl/cmd eller svep).',
    'Valmentajalle annettu kaavio ei näy pelaajalle — hän ottaa sen käyttöön omassa työssään.': 'Ett diagram som ges till en tränare syns inte för spelaren — hen tar det i bruk i sitt eget arbete.',
    '— valitse —': '— välj —',
    '— kaikki —': '— alla —',
    '— ei joukkueita —': '— inga lag —',
    '— ei pelaajia —': '— inga spelare —',
    'Taktiikkataulu — teknis-taktiset kuvat, katselmus ja hyväksyntä': 'Taktiktavla — tekniskt-taktiska bilder, granskning och godkännande',   // sivupalkin nimike + tooltip: sama työkalu molemmissa apeissa
    'Seuratason kaavion asettaa valmennuspäällikkö katselmuksessa.': 'Diagram på föreningsnivå sätts av fotbollsutvecklaren vid granskningen.',
    'Nosta seuratasolle': 'Höj till föreningsnivå',
    'Kaavio nostettu seuratasolle': 'Diagrammet höjt till föreningsnivå',
    'Nosto epäonnistui — lataa kaavio uudelleen': 'Höjningen misslyckades — ladda om diagrammet',
    'Ei oikeutta nostaa seuratasolle': 'Ingen behörighet att höja till föreningsnivå',
    'Oma pelaaja': 'Egen spelare',
    'Vastustaja': 'Motståndare',
    'Piirrä': 'Rita',
    'Pallo': 'Boll',
    'Valitun ominaisuudet': 'Egenskaper för valt',
    'Valittu': 'Valt',
    '— ei valintaa': '— inget valt',
    'selite': 'förklaring',
    'Klikkaa kentältä pelaajaa, liikettä tai selitettä.': 'Klicka på en spelare, rörelse eller förklaring på planen.',
    'Oma': 'Egen',
    'Korostus': 'Markering',
    'Teksti': 'Text',
    'Tallennettu luonnoksena': 'Sparat som utkast',
    'tallentamattomia muutoksia': 'osparade ändringar',
    '+ Lisää käännös': '+ Lägg till översättning',
    'valinnainen': 'valfritt',
    'Poista valittu': 'Ta bort valt',
    'Muutos ei onnistunut': 'Ändringen gick inte igenom',
    'Tallentuu: seuran kaaviopankki': 'Sparas i: föreningens diagrambank',
    'näkyvyys': 'synlighet',
    'uusi — tallentuu luonnoksena': 'nytt — sparas som utkast',
    'muokkaus vie takaisin katselmukseen': 'ändringen skickar tillbaka till granskning',
    'Peliasento': 'Kroppsställning',
    'Klikkaa pelaajaa jolla on pallo. Sama pelaaja uudelleen ottaa pallon pois.': 'Klicka på spelaren som har bollen. Samma spelare igen tar bort bollen.',
    'Vedä pelaajasta suuntaan johon hän katsoo.': 'Dra från spelaren i den riktning hen tittar.',
    'Klikkaa pelaajaa: näkökenttä päälle tai pois. Vedä pelaajasta = suunta ja syvyys. Säädä leveyttä ja katvetta alla.': 'Klicka på en spelare: synfältet på eller av. Dra från spelaren = riktning och djup. Justera bredd och skuggzon nedan.',
    'Klikkaa pelaajaa': 'Klicka på en spelare',
    'leveys': 'bredd',
    'syvyys': 'djup',
    'Katve': 'Skuggzon',
    'Juoksu': 'Löpning',
    'Kuljetus': 'Föring',
    'Laukaus': 'Skott',
    'Selite': 'Förklaring',
    'Näkökenttä': 'Synfält',
    'Vedä pelaajasta toiseen tai vapaaseen kohtaan. Sama nappi uudelleen palauttaa raahaukseen.': 'Dra från en spelare till en annan eller till en fri punkt. Samma knapp igen återgår till dragläge.',
    'Klikkaa kohtaa johon selite tulee.': 'Klicka där förklaringen ska placeras.',
    'Klikkaa poistettavaa elementtiä.': 'Klicka på elementet som ska tas bort.',
    'Selitteen teksti': 'Förklaringens text',
    'Ei elementtiä tässä kohdassa': 'Inget element här',
    'Liikettä ei voitu lisätä': 'Rörelsen kunde inte läggas till',
    'kaaviota': 'diagram',
    'Teknis-taktiset kaaviot. Kanoniset ovat kaikille yhteisiä; seuran omat kulkevat katselmuksen kautta.': 'Tekniskt-taktiska diagram. De kanoniska är gemensamma för alla; föreningens egna går via granskning.',
    'Ei kaavioita vielä.': 'Inga diagram ännu.',
    'kanoninen': 'kanonisk',
    'Esikatselu ei onnistunut': 'Förhandsvisningen misslyckades',
    'Kaavioiden lataus epäonnistui': 'Diagrammen kunde inte laddas',
    'Muokkaa kaaviota': 'Redigera diagram',
    'Raahaa pelaajia kentällä. Muutokset tallentuvat vasta Tallenna-napista.': 'Dra spelarna på planen. Ändringarna sparas först med Spara-knappen.',
    'Kumoa': 'Ångra',
    'Ei kumottavaa': 'Inget att ångra',
    'Pelimuoto on täynnä': 'Spelformen är full',
    'Ei oikeutta tähän toimintoon': 'Ingen behörighet för den här åtgärden',
    'Tilasiirto ei ole sallittu': 'Statusövergången är inte tillåten',
    'Tila päivitetty': 'Status uppdaterad',
    'Kaavio ei kelpaa:': 'Diagrammet godkänns inte:',
    'Tallennus estetty — kaavio ei läpäise tarkistusta': 'Sparandet stoppat — diagrammet klarar inte kontrollen',
    'Tallennettu': 'Sparat',
    'Tallennettu — odottaa hyväksyntää': 'Sparat — väntar på godkännande',
    'Tallennus epäonnistui — lataa kaavio uudelleen': 'Sparandet misslyckades — ladda om diagrammet',
    'Joku muu ehti muokata — lataa kaavio uudelleen.': 'Någon annan hann redigera — ladda om diagrammet.',
    'Toiminto kytketään myöhemmässä vaiheessa': 'Åtgärden kopplas in i ett senare skede',
    'pelaajaa kuitannut ymmärtäneensä': 'spelare har kvitterat att de förstått',
    'Uusi kaavio': 'Nytt diagram',
    'Valitse mitä kaavio opettaa. Piirto avautuu seuraavaksi; kaavio tallentuu luonnoksena ja menee katselmukseen.': 'Välj vad diagrammet ska lära ut. Ritytan öppnas härnäst; diagrammet sparas som utkast och går till granskning.',
    'Konsepti': 'Koncept',
    'Havaintokriteeri (valinnainen)': 'Observationskriterium (valfritt)',
    '— koko konsepti —': '— hela konceptet —',
    'Pelimuoto': 'Spelform',
    'Näkyvyys': 'Synlighet',
    'Joukkue- ja pelaajakohdistuksen voi tarkentaa katselmuksessa.': 'Lag- och spelarinriktningen kan preciseras i granskningen.',
    'Luo ja muokkaa': 'Skapa och redigera',
    'Valitse konsepti.': 'Välj ett koncept.',
    'Luonti epäonnistui': 'Skapandet misslyckades',
    'Luonti epäonnistui — tarkista oikeudet.': 'Skapandet misslyckades — kontrollera behörigheterna.',
    'Ei oikeutta luoda kaaviota': 'Ingen behörighet att skapa diagram',
    'oma pelaaja': 'egen spelare',
    'vastustaja': 'motståndare',
    'liike': 'rörelse',
    /* — LUKITTU GLOSSAARI (konformi tm_lang.js / §14 / §34) — */
    'Kehon valmius': 'Kroppslig beredskap',            // kanoni (ei muita drift-variantteja)
    'Pujottelu': 'Slalom',                             // EI Dribbling (Kim-virhe)
    'Syöttö': 'Passning', 'Ponnauttelu': 'Jonglering',
    'Kuljetus-laukaus': 'Föring och skott', 'Pituuspotku': 'Längdspark'
  },
  en: {
    'Tallenna': 'Save', 'Peruuta': 'Cancel', 'Sulje': 'Close', 'Takaisin': 'Back',
    'Poista': 'Delete', 'Muokkaa': 'Edit', 'Lähetä': 'Send', 'Kopioi': 'Copy', 'Lataa': 'Download',
    'Kirjaudu ulos': 'Log out', 'Kirjaudu sisään': 'Log in', 'Sähköposti': 'Email',
    'Salasana': 'Password', 'Asetukset': 'Settings',
    'Valmennuspäällikkö': 'Development Lead',
    'Kehon valmius': 'Physical readiness'
    // additiivinen; puuttuva → fi-fallback
  }
};

// Geneerinen resolvi: COMMON VOITTAA (lukittu glossaari), sitten sivukartta, muuten fi-fallback.
function tmI18nResolve(fi, pageMap) {
  if (fi == null) return fi;
  var k; try { k = (typeof tmNykyinenKieli === 'function' && tmNykyinenKieli()) || 'fi'; } catch (e) { k = 'fi'; }
  if (k === 'fi') return fi;
  var c = TM_I18N_COMMON[k]; if (c && typeof c[fi] === 'string') return c[fi];
  var p = pageMap && pageMap[k]; if (p && typeof p[fi] === 'string') return p[fi];
  return fi;
}

// Geneerinen sweep: data-i18n → textContent · -ph → placeholder · -title → title ·
// -html → innerHTML (säilyttää fi:n rikkaan HTML:n data-i18n-orig:iin, kääntää sv:ksi tasaisena).
function tmLokalisoiCommon(root, pageMap) {
  var scope = root || document;
  scope.querySelectorAll('[data-i18n]').forEach(function (el) {
    var fi = el.getAttribute('data-i18n'); if (fi) el.textContent = tmI18nResolve(fi, pageMap);
  });
  scope.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
    var fi = el.getAttribute('data-i18n-ph'); if (fi) el.setAttribute('placeholder', tmI18nResolve(fi, pageMap));
  });
  scope.querySelectorAll('[data-i18n-title]').forEach(function (el) {
    var fi = el.getAttribute('data-i18n-title'); if (fi) el.setAttribute('title', tmI18nResolve(fi, pageMap));
  });
  scope.querySelectorAll('[data-i18n-html]').forEach(function (el) {
    var fi = el.getAttribute('data-i18n-html'); if (!fi) return;
    if (!el.hasAttribute('data-i18n-orig')) el.setAttribute('data-i18n-orig', el.innerHTML);
    var sv = tmI18nResolve(fi, pageMap);
    el.innerHTML = (sv !== fi) ? sv : el.getAttribute('data-i18n-orig');
  });
}

if (typeof window !== 'undefined') { window.TM_I18N_COMMON = TM_I18N_COMMON; window.tmI18nResolve = tmI18nResolve; window.tmLokalisoiCommon = tmLokalisoiCommon; }
if (typeof module !== 'undefined' && module.exports) { module.exports = { TM_I18N_COMMON: TM_I18N_COMMON, tmI18nResolve: tmI18nResolve, tmLokalisoiCommon: tmLokalisoiCommon }; }
