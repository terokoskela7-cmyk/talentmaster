# Analyysi — Master_kokonaisuus (teknis-taktinen curriculum) integraatio TalentMasteriin

> Lähde: Tero toimitti `Master_kokonaisuus.xlsx` (16 välilehteä) 2026-07-05. Tämä on **sisältö**, joka täyttää sen kehyksen jonka olemme rakentaneet (Vaihe 2 arviointi + Vaihe 3 IDP + Vaihe 4 teknis-taktinen + pelaajan tarina + seuraidentiteetti-KPI). Analyysi ensin, toteutus vaiheistetaan erikseen.

## 1. Mitä Excel sisältää (inventaario)

**Kolmivaiheinen pelaajapolku** (välilehti `Polku`) — tämä on sama selkäranka jonka juuri visualisoimme:
1. **Yksilövaihe (6–14 v)** — youth-teknistaktiset konseptit, sama kaikille, **ei pelipaikkalukitusta**.
2. **Silta (U14–U15)** — tarkistuslista: kaikki yksilökonseptit käyty ennen erikoistumista. *"Ei aikaista lukitsemista"* = §28/RAE-periaate suoraan.
3. **Master (U15→)** — pelipaikkakohtaiset fundamentit konsepteineen.

**Yksilövaihe — `Youth-konseptit`** (116 riviä): **14 ylätason konseptia** = **10 hyökkäys** (Y-H0…Y-H9: Havainnointi · Haltuunotto · Syöttäminen · Tempokuljetus · Harhauttaminen · Pallon suojaaminen · Tuen tarjoaminen · Vartioinnista irtaantuminen · Leveyteen/syvyyteen · Viimeistely) + **4 puolustus** (Y-P1…Y-P4: 1v1-puolustaminen+riisto · Vartiointi · Varmistaminen · Tilan puolustaminen+merkkauksen vaihto), kukin alakonsepteineen (a/b/c…), **ikäpaino**, **pelimuoto** (5v5→11v11), **taso 1–3** (1 = ei näy pelissä · 2 = näkyy ohjatusti · 3 = näkyy pelissä itsenäisesti).
- **`Kysymyspankki`** (44 riviä): valmentajan ohjaavat avainkysymykset per konsepti ("Mitä näit ennen kuin pallo tuli?") — pelin aikainen reflektointi.
- **`Pelaajakortti`**: yksilövaiheen seurantakortti.
- **`Silta U14-U15`** (avaininvariantti): *"pelipaikka = uusi **konteksti**, ei uusi sisältö"*. Sisältää (A) 14-konseptin tarkistuslistan (hallinta = taso 3, U14-kehityskeskustelu), (B) **siltataulukon** per pelipaikka (mitkä youth-konseptit syvennetään + ensimmäiset ≤4 Master-fundamenttia), (C) **kausimallin** (1–4 uutta fundamenttia/kausi; järjestys: H0 aina ensin → pelipaikan identiteettifundamentti → yleisin puolustustilanne → rakentelurooli). *"Ei aikaista lukitsemista: ensisijainen + vähintään yksi toissijainen pelipaikka"* = §28/RAE + 2d (`positio`+`positio_2`).

**Master — pelipaikkakohtainen** (7 pelipaikkaa: CB · FB · MID · AMID · ST · WI · GK):
- **`Matriisi`**: 16 fundamenttikoodia (P1–P8 puolustus/siirtymät + H0–H7 hyökkäys) × 7 pelipaikkaa = mikä fundamentti tarkoittaa mitäkin per pelipaikka.
- **7 pelipaikkasivua** (esim. `CB Toppari`, ~64–73 riviä): kukin **8 ylätason KPI-teemaa** alakonsepteineen. Sarakkeet: `Vyöhyke · Teema/konseptit (KPI) · Valm. arvio · Itsearvio · Ero · Kriteerit 1/3/5 · Harjoitesuositus (automaattinen) · Huomiot`. **Taso 1–5, kriteerit auki jokaiselle** (1/3/5 ankkurit).
- **`Ydinkonseptit`**: 8–9 ydinkonseptia per pelipaikka ("mitä pelaajan tulee ymmärtää").
- **`Harjoitepankki`** (94 riviä): 12–14 harjoite-esimerkkiä per pelipaikka, kehityskohteittain.
- **`Valitsin`**: fundamenttien valintatyökalu (missä vaiheessa pelaaja on).

## 2. Ydinhavainto — tämä EI ole uutta arkkitehtuuria, se on SISÄLTÖKERROS
Excel toteuttaa täsmälleen saman arviointi- ja kehityslogiikan jonka olemme jo rakentaneet/suunnitelleet — se antaa sille **teknis-taktisen sisällön**:

| Excelin elementti | Vastaa TM:ssä | Tila TM:ssä |
|---|---|---|
| 3-vaiheinen polku (Yksilö→Silta→Master) | Pelaajan tarina + §28 kypsyyspolku + erikoistuminen | ✅ juuri suunniteltu (polku-aikajana) |
| Youth-konseptit 1–3 | Teknis-taktinen arviointitaksonomia (yksilövaihe), D2/D4 | 🔧 laajentaa `ARVIOINTI_KEHYKSET` (Vaihe 2) |
| **Valm. arvio + Itsearvio + Ero** | Havaittu-arvio + pelaajan itsearvio + gap/DVI | ✅ Vaihe 2 (havaittu) + 3b (pelaaja arvioi ensin → ero) |
| **Kriteerit 1/3/5** | Arviointiankkurit (rubriikki) | 🆕 UUSI — tekee havaitusta objektiivisen (iso laatuloikka) |
| Pelipaikkakohtaiset fundamentit | Pelipaikka-KPI:t (identiteetti-konfig) | ✅ juuri lukittu konfiguraatiokerros (`konfiguraatio/mittarit`) |
| Auto-harjoitesuositus + `Harjoitepankki` | Vaihe 4 teknis-taktinen + harjoitegeneraattori | 🔧 kytkeytyy §A7 harjoitelogiikkaan + jakso (mesosykli) |
| `Kysymyspankki` (ohjaavat kysymykset) | Valmentaja-cue + pelaajan reflektointi | 🆕 uusi cue-kerros (Vaihe 4, §7.22-turvallinen) |
| `Ydinkonseptit` ("mitä tulee ymmärtää") | Konseptin selite pelaajalle/valmentajalle | 🆕 sisältö |

**Johtopäätös:** kehys on valmis; tämä on se **kanoninen sisältö** joka tekee IDP-fokuksesta, kausitavoitteesta ja jaksoista *teknis-taktisesti oikeita ja pelilähtöisiä* (§7b). Se myös antaa pelipaikkakohtaiset KPI:t jotka kysyit — ne ovat Master-sivujen fundamentit.

## 3. Mikä on UUTTA ja rakennettava
1. **Sisältö → data (SSOT).** Excel → generoitu kirjasto `lib/tm_teknistaktiset.js` (sama pattern kuin `TK_LAJIVIITTEET`/`tm_arviointi_taksonomia`): youth-konseptit (koodi, teema, alakonseptit, ikäpaino, pelimuoto, taso-asteikko) + pelipaikkafundamentit (koodi, vyöhyke, KPI-teema, **kriteerit 1/3/5**, ydinkonsepti-selite, harjoiteviitteet, kysymykset). Versioitu, parseri Excelistä (vuosipäivitys kuten TK-viitteet §34).
2. **Kriteerit-ankkurit (1/3/5).** Suurin laatuloikka: havaittu-arvio saa objektiiviset rubriikit → arvioija näkee "mitä taso 3 tarkoittaa tälle konseptille". Tämä nostaa koko havaittu-kerroksen luotettavuuden.
3. **Vaihe-gating (Yksilö→Silta→Master).** Ikä/PHV (§28) määrittää vaiheen; erikoistuminen asettaa `positio` → aktivoi pelipaikkafundamentit. Silta-tarkistuslista = kaikki youth-konseptit ennen lukitusta.
4. **Cue-kerros (Kysymyspankki).** Konsepti → ohjaava kysymys valmentajalle (kentällä) + pelaajalle (reflektointi, §7.22-turvallinen).
5. **Skaala-yhdenmukaistus.** Youth 1–3 · Master 1–5 · TM havaittu 1–5 (P/A/G/VG/E). Tarvitaan mäppäys (youth 1–3 → esitys, ei sekoiteta Master 1–5:een).

## 4. Integraatioperiaatteet (invariantit)
- **Data, ei kovakoodattu UI** (§30): kaikki konseptit/kriteerit/harjoitteet dataan, renderöinti lukee. Ison volyymin takia pakollista.
- **Kehys + plug-in (identiteetti-invariantti):** teknis-taktinen curriculum = **TM:n oma talon metodi** (oletuskehys `ARVIOINTI_KEHYKSET`-rekisterissä, yksityinen/Ekkono-pohjainen §6). Toinen seura/maa voi korvata omalla curriculumilla — ei kovakoodata "tähän" curriculumiin.
- **§7.22:** kriteeri taso 1 = "ei näy pelissä" on aikuisten työkalu; pelaajalle/perheelle pelilähtöinen + prosessikehu (Kysymyspankki sopii tähän).
- **§26 pikakentät:** arvioinnit tuottavat pikakentät (kuten `arviointi_havaittu`); ei alikokoelmakyselyjä renderissä.
- **§7b pelaaminen-linkitys:** koko curriculum on pelitilannelähtöinen (Sisältö-sarake = pelitilanne) → vahvistaa suoraan jo lukittua invarianttia.
- **Ei aikaista lukitusta (§28/RAE):** Silta-periaate on jo TM-filosofia — integraatio vahvistaa sen.

## 5. Ehdotettu vaiheistus (analyysi → toteutus myöhemmin)
- **I1 · Sisältö→data (perusta, kaikki riippuu tästä).** Parseri Excelistä → `lib/tm_teknistaktiset.js` (youth + pelipaikat + kriteerit + kysymykset + harjoiteviitteet). Vitest + vuosipäivitys-parseri. *Ei UI:ta vielä.*
- **I2 · Arviointi-integraatio.** Laajenna `ARVIOINTI_KEHYKSET`: youth-konseptit (yksilövaihe, 1–3) + pelipaikkafundamentit (Master, 1–5 **kriteeri-ankkurein**). Valm.arvio + Itsearvio + Ero kytkeytyy Vaihe 2 (havaittu) + 3b (review). Syöttää IDP-fokuskandidaatteja (3a).
- **I3 · Vaihe/erikoistuminen.** Yksilö→Silta→Master-gating (ikä/PHV) + `positio`/`positio_2` (2d jo tehty) aktivoi pelipaikkafundamentit + pelipaikka-KPI:t identiteetti-konfigiin.
- **I4 · Vaihe 4 -sisältömoottori.** Konsepti → cue (Kysymyspankki) → harjoite (Harjoitepankki) → auto-suositus (jo Excelissä sarakkeena). Jakson (mesosykli) sisältö.
- **I5 · Pelipaikka-KPI konfiguraatioon.** Master-fundamentit = pelipaikkakohtaiset KPI:t jotka kytkeytyvät kehityskaareen ja jaksoihin (identiteetti-kerros).

**Suositus:** aloita **I1:stä** (sisältö→data, SSOT) — se on halvin, riskitön ja kaikki muu rakentuu sen päälle. Sen jälkeen I2 kytkee sen jo livenä olevaan Vaihe 2/3-arviointiin. I3–I5 seuraavat curriculumin kypsyessä.

## 6. Omistus + IP (PÄÄTETTY 2026-07-05)
Tämä curriculum on **yksityinen, Teron oma** — mukailtu **Ekkono-metodista** ja koulutuksista. **EI Palloliiton kansallinen standardi eikä seurakohtainen** → se on **TalentMasterin oma "talon metodi"**:
- `ARVIOINTI_KEHYKSET`-rekisterissä oma kehysavain (esim. `tm_teknistaktinen` / nimetty talon metodi) — **TM:n oletuskehys teknis-taktiselle arvioinnille**, ei `palloliitto`.
- **Konfiguroitava/korvattavissa** per seura/maa (identiteetti-invariantti): seura voi käyttää tätä oletusta tai kytkeä oman. Palloliitto-kehys (jos joskus) on erillinen rinnakkainen kehys.
- **IP-huomio:** yksityistä + Ekkono-pohjaista → pidetään repossa proprietäärinä sisältönä; julkisessa käyttöliittymässä ei "Ekkono"-brändäystä (adaptaatio). Ei toisteta Ekkonon copyright-materiaalia — tämä on Teron oma sovellus.

## 7. Avoimet kysymykset (Terolle)
1. **Kriteerit 1/3/5** — täytetty pelipaikkasivuilla; ovatko kriteeri-ankkurit auki myös youth-konsepteille (1/2/3)? Havaittu-arvion laatu riippuu tästä.
2. **Auto-harjoitesuositus** — sarake on olemassa mutta tyhjä pelipaikkasivuilla; tuleeko logiikka Harjoitepankista (koodilinkki CB-P1 → CB-P1-harjoite) vai erikseen?
3. **Skaala** — youth 1–3 erillään Master 1–5:stä esityksessä, vai normalisoidaan molemmat 1–5:een (kuten H-H 3-port → 5-port §26)?
4. **Master-fundamenttien kokonaismäärä** — Matriisissa 16 koodia (P1–P8 + H0–H7), mutta osalla pelipaikoista H5–H7 tyhjiä. Montako fundamenttia per pelipaikka lopullisesti?
