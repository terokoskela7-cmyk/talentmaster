# Code-brief — i18n VAIHE 4-B · Vanhempi_v2 reachable-näkymät sv (loppuun)

> **Konteksti:** V4-A2/A3/A4 teki Pelaaja_v7-kotinäytön 100 % ruotsiksi (verifioitu livenä). Perhe = lapsi
> (Pelaaja) + huoltaja (Vanhempi). **Vanhemman kieli-autodefault on jo kytketty** (V4-A3 Osa B, `_kasitteleLapsi`
> rivi ~1266: `tmKieliInitSeura(lapsi.kieli)`) → sillä hetkellä kun ruotsiseura (EIF) laitetaan sv-oletukseen,
> **huoltaja laskeutuu ruotsiin** — mutta Vanhempi_v2:n 8 sisältörender-funktiota ovat vielä kovakoodattua suomea
> (~75 reachable-stringiä). Tämä briiffi kääntää ne (fi säilyy · sv · en), samalla metodilla kuin Pelaaja.
>
> **Audit tehty (Claude, koko reachable-pinta):** aukko on `rLogin · rKoti · rViikko · rKirjaa · rValmentaja ·
> rVanhempiTekniikka · rKortti · rAsetukset` + kirjaus-/login-virheviestit + tyyppi-/aktiviteetti-/fiilis-datakartat.
>
> **JO KUNNOSSA — EI koske tätä (älä muuta):** tab-labelit `rTabs` (`nav.*`) · tervetulo-overlay
> `_naytaVanhTervetulo` (`vanhempi.tervetulo_*`/`vanhempi.kultainen_*`) · kielivalitsin · Osa B kieli-kytkentä ·
> `_genetiivi`-nimen­taivutuslogiikka (V1-B2-periaate: **käännöksissä EI nimen taivutusta** — ks. §Interpolointi).

---

## Metodi (sama kuin Pelaaja V4-A2/A3)

Kaikki näkymät ovat **render-funktioiden template-literaaleja** (backtick, kuten Pelaajan `rA1`) → reititä
suoraan `${t('vanhempi.AVAIN')}`. **EI** data-i18n-lähestymistä (paitsi jos kohtaat staattista body-HTML:ää —
näissä näkymissä ei ole). Uudet avaimet **`vanhempi.*`-alle** `lib/tm_lang.js`:ään, fi/sv/en. `t()` on jo
käytössä Vanhemmassa (~34 kutsua) + `{n}`-substituutio tuettu (esim. `streak_1_6`).

**Kaikki 3 kieltä.** fi = **sanatarkasti nykyinen stringi** (regressio ehjä, fallback). Avainnimet ehdotuksia —
Code valitsee siistin nimeämisen; **fi/sv/en-teksti + rivi = auktoriteetti.**

### Interpolointi & placeholderit (KRIITTINEN)
Monet stringit sisältävät `${...}`-paloja — käsittele näin:
- **`${d.nimi}` / `${IKA[_age].nimi}` keskellä lausetta** → käytä **`{nimi}`-placeholderia** avaimessa +
  `t('vanhempi.x').replace('{nimi}', nimi)` (tai olemassa oleva `{n}`-substituutiomekanismi laajennettuna `{nimi}`:iin).
  Esim. `Mitä ${d.nimi} teki` → avain `'Mitä {nimi} teki'` → sv `'Vad {nimi} gjorde'`.
- **`${_genetiivi(nimi)}` (suomen genetiivi)** → sv/en **EI nimen­taivutusta** (V1-B2-konventio). Käännä
  **"ditt barn" / "your child"** -muotoon ILMAN nimeä, TAI robusti `{nimi}` ilman genetiiviä. Esim.
  `näet ${_genetiivi(nimi)} vahvuudet` → sv `ser du ditt barns styrkor` / en `you see your child's strengths`.
  (Ei suomen taivutushelperiä sv/en-puolelle — kestää mielivaltaiset nimet.)
- **Ternäärit `${_age==='u19'?A:B}`** → molemmat haarat omiksi avaimiksi, ternääri säilyy koodissa:
  `${_age==='u19'?t('vanhempi.x_u19'):t('vanhempi.x_muu')}`.
- **Datakartat** (`tyyppiLabel`, aktiviteetti­napit `l`/`s`, `fiiEmojit` `l`, `_VANH_LAJINIMI`) → reititä **arvot**
  `t()`:n läpi (avaimet map-rakenteessa) — emojit/`e`-kentät/ikonit ennallaan.

---

## Käännöstaulukko näkymittäin (fi = nykyinen · sv · en)

### 1) rLogin (rivit ~349–627)
| Rivi | fi (nykyinen) | sv | en |
|---|---|---|---|
| 354 | KIRJAUDU SISÄÄN | LOGGA IN | LOG IN |
| 354 | Kirjaudutaan... | Loggar in... | Logging in... |
| 360 | Ensimmäisellä kerralla tarkista sähköpostisi kutsulinkkiä varten. | Kontrollera din e-post för inbjudningslänken första gången. | The first time, check your email for the invitation link. |
| 381 | Syötä sähköposti ja salasana. | Ange e-post och lösenord. | Enter your email and password. |
| 396 | Väärä salasana. | Fel lösenord. | Wrong password. |
| 397 | Sähköpostia ei löydy. | E-postadressen hittades inte. | Email not found. |
| 398 | Tarkista sähköpostiosoite. | Kontrollera e-postadressen. | Check the email address. |
| 399 | Liian monta yritystä — odota hetki. | För många försök — vänta en stund. | Too many attempts — wait a moment. |
| 400 | Väärä sähköposti tai salasana. | Fel e-post eller lösenord. | Wrong email or password. |
| 401 | Kirjautuminen epäonnistui. Tarkista yhteys. | Inloggningen misslyckades. Kontrollera anslutningen. | Login failed. Check your connection. |
| 409 | Kirjoita ensin sähköpostiosoite ylös. | Skriv först in din e-postadress. | Enter your email address first. |
| 417 | Sähköpostia ei löydy järjestelmästä. | E-postadressen finns inte i systemet. | Email not found in the system. |
| 436 | Viimeisimmät tapahtumat | Senaste händelser | Latest activity |
| 457 | Valmentaja {emoji} reagoi kirjaukseen | Tränaren {emoji} reagerade på loggen | Coach {emoji} reacted to the log |
| 593 | Pääseekö {nimi} paikalle? | Kan {nimi} komma? | Can {nimi} attend? |
| 627 | Ei merkittyjä tapahtumia — valmentaja lisää ne kalenteriin. | Inga markerade händelser — tränaren lägger till dem i kalendern. | No events marked — the coach adds them to the calendar. |

> **HUOM demo-data (rivit 484–491, `_vanhDemoKalenteri`):** vain `?demo=1`-tilassa, EI EIF-reachable → **jätä
> ennalleen** (ei skoopissa). Jos reitität helposti samalla, ok, mutta ei pakollinen.

### 2) rKoti (rivit ~632–832)
| Rivi | fi | sv | en |
|---|---|---|---|
| 652 | Kehitys | Utveckling | Development |
| 652 | Tänään | Idag | Today |
| 725 | Mitä viikossa tapahtui | Vad hände under veckan | What happened this week |
| 754 | Kehityskaari ja kuukausikooste näkyvät kun seuran data on kirjattu. | Utvecklingskurvan och månadssammanfattningen visas när föreningens data har registrerats. | The development curve and monthly summary appear once the club's data is recorded. |
| 782 | Treenitiedot näkyvät kun valmentaja kirjaa harjoituksia. | Träningsuppgifterna visas när tränaren registrerar träningar. | Training data appears when the coach logs sessions. |
| 815 / 832 | Valmentajan viesti näkyy tässä kun valmentaja on kirjannut. | Tränarens meddelande visas här när tränaren har skrivit. | The coach's message appears here once the coach has written. |

### 3) rViikko (rivit ~844–863) + tyyppiLabel-kartta (rivi 785)
| Rivi | fi | sv | en |
|---|---|---|---|
| 849 | Tämä viikko | Denna vecka | This week |
| 851 | Mitä {nimi} teki | Vad {nimi} gjorde | What {nimi} did |
| **785 tyyppiLabel** | T: Pallotreeni | Bollträning | Ball training |
| | D: Kehonhuolto | Kroppsvård | Body care |
| | S: Lihaskunto | Styrka | Strength |
| | P: Peli | Match | Match |
| | vapaa: Omaehtoinen | På egen hand | Self-directed |
| | pihapeli: Pihapeli | Gårdsspel | Backyard game |
| | pallo: Leikkiä pallolla | Leka med boll | Playing with the ball |
| | jalkapallo: Jalkapallotreeni | Fotbollsträning | Football training |
> Reititä **kaikki** `tyyppiLabel`-arvot (myös mahdolliset muut avaimet rivin 785 lopussa — tarkista koko objekti).

### 4) rKirjaa (rivit ~865–1065) — suurin klusteri
**Aktiviteettinapit** (rivit 866–873, kentät `l` = otsikko, `s` = alaselite; `k`/`i`/`onT` ennallaan):
| k | fi l · s | sv l · s | en l · s |
|---|---|---|---|
| pihapeli | Pihapeli · Naapureiden kanssa | Gårdsspel · Med grannarna | Backyard game · With the neighbours |
| pallo | Leikkiä pallolla · Jalalla, kädellä, seinää vasten | Leka med boll · Med foten, handen, mot väggen | Playing with the ball · With feet, hands, against a wall |
| pyora | Pyöräili · Koulumatka tai pidempi | Cyklade · Skolväg eller längre | Cycled · School commute or longer |
| uinti | Uintia · Uimahallissa tai rannalla | Simning · I simhallen eller vid stranden | Swimming · At the pool or beach |
| metsa | Metsässä tai mäessä · Luova liike, kiipeily | I skogen eller backen · Kreativ rörelse, klättring | In the woods or hills · Creative movement, climbing |
| tanssi | Tanssia tai jumppaa · Musiikki, rytmi, liike | Dans eller gympa · Musik, rytm, rörelse | Dancing or gymnastics · Music, rhythm, movement |

**Fiilis-labelit** (rivit 888–891, kenttä `l`; `e`-emoji ennallaan):
| fi | sv | en |
|---|---|---|
| Iloinen | Glad | Happy |
| Innoissaan | Ivrig | Excited |
| Väsynyt | Trött | Tired |
| Loukkasi | Skadad | Hurt |

**Muut rKirjaa-tekstit:**
| Rivi | fi | sv | en |
|---|---|---|---|
| 907 | Mitä {nimi} teki? | Vad gjorde {nimi}? | What did {nimi} do? |
| 915 | Voit valita useamman. Valmentaja näkee että sinä kirjasit — alle 13-vuotiaan puolesta kirjaaminen on ok. | Du kan välja flera. Tränaren ser att du loggade — att logga å ett barn under 13:s vägnar är ok. | You can pick several. The coach sees that you logged — logging on behalf of a child under 13 is fine. |
| 919 | Mitä teki? | Vad gjorde hen? | What did they do? |
| 919 | (valitse kaikki sopivat) | (välj alla som passar) | (select all that apply) |
| 956 | Miltä vaikutti? | Hur verkade det? | How did it seem? |
| 972 (placeholder) | Esim. 'Lähti ulos itsestään, tuli kotiin hikisenä ja tyytyväisenä.' | T.ex. 'Gick ut av sig själv, kom hem svettig och nöjd.' | E.g. 'Went out on their own, came home sweaty and happy.' |
| 982 | Huom: Pallokosketus puuttuu tänään. Bola Sempre — pallo joka päivä, edes 5 min! | Obs: Bollkontakt saknas idag. Bola Siempre — bollen varje dag, minst 5 min! | Note: no ball contact today. Bola Siempre — the ball every day, even 5 min! |
| 993 | KIRJAA JA LÄHETÄ | LOGGA OCH SKICKA | LOG AND SEND |
| 993 | Valitse tyyppi · aika · fiilis | Välj typ · tid · känsla | Choose type · time · feeling |
| 997 | Kirjaus näkyy valmentajan viikkokoosteessa. Streakit lasketaan myös vanhemman kirjauksista. | Loggen visas i tränarens veckosammanfattning. Sviter räknas även från förälderns loggar. | The log appears in the coach's weekly summary. Streaks count parent logs too. |
| 1064 | Kirjaus ei tallentunut — vanhemman kirjausoikeus puuttuu. Ota yhteyttä seuraan. | Loggen sparades inte — förälderns loggningsrätt saknas. Kontakta föreningen. | The log was not saved — parent logging permission is missing. Contact the club. |
| 1065 | Kirjaus ei tallentunut — tarkista verkkoyhteys ja yritä uudelleen. | Loggen sparades inte — kontrollera nätverket och försök igen. | The log was not saved — check your connection and try again. |

> **Bola Siempre**: nykyinen fi-teksti kirjoittaa "Bola Sempre" (typo). sv/en käytä oikeaa **"Bola Siempre"**;
> fi jätä ennalleen ("Sempre") ellei erikseen korjata — regressio-invariantti (fi sanatarkasti). *(Voit halutessasi
> korjata fi:n "Siempre" samalla — pieni typo-fix, mutta ilmoita.)*

### 5) rValmentaja (rivit ~1090–1104)
| Rivi | fi | sv | en |
|---|---|---|---|
| 1095 | Viestit | Meddelanden | Messages |
| 1104 (u19) | Kuukausikooste lähetetään lisäksi sähköpostilla. Pelaaja-valmentaja-kommunikaatio kulkee suoraan ilman välikäsiä. | Månadssammanfattningen skickas dessutom via e-post. Spelar–tränarkommunikationen går direkt utan mellanhänder. | The monthly summary is also sent by email. Player–coach communication goes directly without intermediaries. |
| 1104 (muu) | Jos haluat keskustella jostain konkreettisesta, ota yhteyttä suoraan — älä kommentoi lapselle. | Om du vill diskutera något konkret, ta kontakt direkt — kommentera inte till barnet. | If you want to discuss something specific, get in touch directly — don't comment to the child. |

### 6) rVanhempiTekniikka (rivit ~1128–1202) — §7.22-HERKKÄ (perhesävy)
**_VANH_LAJINIMI-kartta (rivi 1114)** — käytä **kanonista sv-glossaaria** (harjoitelogiikka_v4 HARJOITE_I18N):
| fi | sv (KANONINEN) | en |
|---|---|---|
| Ponnauttelu | Jonglering | Juggling |
| Syöttö | Passning | Passing |
| Pujottelu | Slalom | Slalom |
| Kuljetus-laukaus | Föring och skott | Dribbling and shooting |
| Pituuspotku | Längdspark | Long kick |
> ⚠ **ÄLÄ** käytä Kimin VP-käännösmuistin termejä (Ponnauttelu≠"Utkast", Pujottelu≠"Dribbling") — glossaariristiriita.

**Tuki-vinkit (rivit 1116–1120, §7.22: kehu yritystä, ei tulosta/painetta):**
| fi | sv | en |
|---|---|---|
| Syöttötarkkuus kehittyy leikinomaisella toistolla — 10 min pihapeliä seinää tai sinua vasten riittää. Kehu yrittämistä, älä aikaa. | Passningssäkerheten utvecklas genom lekfull upprepning — 10 min gårdsspel mot väggen eller mot dig räcker. Beröm ansträngningen, inte tiden. | Passing accuracy develops through playful repetition — 10 min of backyard play against a wall or with you is enough. Praise the effort, not the time. |
| Pujottelu vaatii pallotuntumaa — kartioiksi käyvät kengät tai pullot. Tee siitä leikki, älä suoritus. | Slalom kräver bollkänsla — skor eller flaskor duger som koner. Gör det till en lek, inte en prestation. | Slalom needs ball feel — shoes or bottles work as cones. Make it play, not performance. |
| Ponnauttelu on kärsivällisyyslaji — ennätykset tulevat aaltoina. Juhlikaa pieniä onnistumisia yhdessä. | Jonglering är en tålamodsgren — rekorden kommer i vågor. Fira små framgångar tillsammans. | Juggling is a patience skill — records come in waves. Celebrate small wins together. |
| Kuljetus ja laukaus kehittyvät vapaassa pelissä parhaiten — pihapelit ja vapaa pallottelu ovat arvokkainta harjoitusta. | Föring och skott utvecklas bäst i fritt spel — gårdsspel och fritt bollspel är den värdefullaste träningen. | Dribbling and shooting develop best in free play — backyard games and free ball play are the most valuable training. |
| Potkuvoima kasvaa kehon mukana — tekniikka ratkaisee. Pitkät syötöt pihalla ovat hyvä yhteisharjoitus. | Sparkstyrkan växer med kroppen — tekniken avgör. Långa passningar på gården är en bra gemensam övning. | Kicking power grows with the body — technique is what matters. Long passes in the yard are a good shared exercise. |

**Muut tekniikka-tekstit:**
| Rivi | fi | sv | en |
|---|---|---|---|
| 1136 | ⚽ Mittaukset tulossa — täältä näet sitten {gen} vahvuudet ja miten voit tukea harjoittelua. | ⚽ Mätningar på väg — här ser du sedan ditt barns styrkor och hur du kan stödja träningen. | ⚽ Measurements coming — here you'll see your child's strengths and how to support their training. |
| 1153 | Vahvuus: | Styrka: | Strength: |
| 1154 | Tämä on {gen} vahvin laji! | Det här är den starkaste grenen! | This is the strongest skill! |
| 1163 | Pieni parannus joka treenissä riittää. | En liten förbättring varje träning räcker. | A small improvement each session is enough. |
| 1202 | Tärkeintä: kehu yrittämistä ja harjoittelua, ei tulosta. Kiinnostus kantaa pidemmälle kuin paine. | Det viktigaste: beröm ansträngningen och träningen, inte resultatet. Intresse bär längre än press. | Most important: praise effort and practice, not results. Interest carries further than pressure. |

### 7) rKortti (rivit ~1206–1275)
| Rivi | fi | sv | en |
|---|---|---|---|
| 1212 | Kausi 2025/26 → sana "Kausi" | Säsong | Season |
| 1228 | Kortti | Kort | Card |
| 1237 | Treenejä | Träningar | Sessions |
| 1237 | kausi (yksikkö) | säsong | season |
| 1263 | Mitä tarkoittaa? | Vad betyder det? | What does it mean? |
| 1265 | Kortti 0–99 kuvaa pelaajan kokonaiskehitystä. Ei ole "arvosana" vaan matka — numero nousee luonnollisesti iän ja harjoittelun myötä. | Kort 0–99 beskriver spelarens helhetsutveckling. Det är inget "betyg" utan en resa — siffran stiger naturligt med ålder och träning. | The 0–99 card shows the player's overall development. It's not a "grade" but a journey — the number rises naturally with age and training. |
| 1266 | Stage on pelaajan kasvuvaihe: leikkijä (U8–U12) → rakentaja (U13–U15) → showcase (U16–U17) → ammattilainen (U18+). | Stage är spelarens utvecklingsfas: lekare (U8–U12) → byggare (U13–U15) → showcase (U16–U17) → proffs (U18+). | Stage is the player's growth phase: player (U8–U12) → builder (U13–U15) → showcase (U16–U17) → professional (U18+). |
| 1275 | Isovanhemmille, kummitädille... | För mor- och farföräldrar, gudmor... | For grandparents, godparents... |
> "Kausi 2025/26": reititä sana → `${t('vanhempi.kortti_kausi')} 2025/26` (vuosi pysyy koodissa). Stage-nimet
> (leikkijä/rakentaja/showcase): jos Pelaajassa on jo kanoniset sv-vastineet, **käytä niitä**; muuten yllä olevat.

### 8) rAsetukset (rivit ~1283–1365)
| Rivi | fi | sv | en |
|---|---|---|---|
| 1315 | Pelaajan PIN-koodi — {nimi} kirjautuu tällä omaan näkymäänsä | Spelarens PIN-kod — {nimi} loggar in i sin egen vy med den | The player's PIN — {nimi} logs into their own view with it |
| 1320 | PIN-koodia ei ole vielä asetettu. Ota yhteyttä seuraan saadaksesi pelaajan PIN-koodin. | PIN-koden är inte inställd ännu. Kontakta föreningen för att få spelarens PIN-kod. | The PIN has not been set yet. Contact the club to get the player's PIN. |
| 1329 (u12) | Agentti — voit kirjata puolesta | Agent — du kan logga å barnets vägnar | Agent — you can log on their behalf |
| 1329 (u15) | Tuki — näet kaiken, et kirjaa | Stöd — du ser allt, du loggar inte | Support — you see everything, you don't log |
| 1329 (u19) | Vieras — kuukausikooste | Gäst — månadssammanfattning | Guest — monthly summary |
| 1334 (u12) | Alle 13-vuotiaalla GDPR edellyttää huoltajan roolia. Saat näkyvyyden kaikkeen ja voit kirjata puolesta. | För barn under 13 kräver GDPR en vårdnadshavarroll. Du får insyn i allt och kan logga å barnets vägnar. | For a child under 13, GDPR requires a guardian role. You get visibility into everything and can log on their behalf. |
| 1334 (u15) | Nuori ottaa vastuuta. Sinä tuet — et hallitse. {nimi} voi halutessaan piilottaa yksityiskohtia. | Den unga tar ansvar. Du stödjer — styr inte. {nimi} kan om hen vill dölja detaljer. | The young person takes responsibility. You support — you don't control. {nimi} can hide details if they wish. |
| 1334 (u19) | {nimi} hallitsee omaa dataansa. Sinulle lähtee viikoittainen/kuukausittainen kooste — ei reaaliaikaa. | {nimi} styr sina egna data. Du får en vecko-/månadssammanfattning — inte realtid. | {nimi} controls their own data. You get a weekly/monthly summary — not real time. |
| 1343 | Päivittäinen kirjaus · Muistutus illalla 20:30 | Daglig loggning · Påminnelse kl. 20:30 på kvällen | Daily logging · Reminder at 20:30 in the evening |
| 1345 | Kuukausikooste sähköpostilla · Ensimmäinen pv | Månadssammanfattning via e-post · Första dagen | Monthly summary by email · First day |
| 1365 (u12) | Alaikäisen tietoja käsittelet sinä. Oikeus korjata tai poistaa kuuluu teille molemmille. | Du hanterar den minderårigas uppgifter. Rätten att rätta eller radera tillhör er båda. | You process the minor's data. The right to correct or delete belongs to you both. |
| 1365 (u15) | Yli 13-vuotiaalla on lain mukaan oma tietosuojaoikeus. {nimi} voi piilottaa sinulta asioita, jotka ovat hänestä henkilökohtaisia. | Ett barn över 13 har enligt lag egen dataskyddsrätt. {nimi} kan dölja saker för dig som hen upplever som personliga. | A child over 13 has their own data protection rights by law. {nimi} can hide things from you they consider personal. |
| 1365 (u19) | {nimi} päättää mitä jaetaan vanhemmille, seuralle ja ulkopuolisille. Tietoja ei jaeta ilman hänen lupaansa. | {nimi} bestämmer vad som delas med föräldrar, föreningen och utomstående. Inga uppgifter delas utan hens tillstånd. | {nimi} decides what is shared with parents, the club and outsiders. No data is shared without their permission. |

---

## Vartijat
- **§7.22 EHDOTON:** rVanhempiTekniikka + rKortti + rAsetukset ovat perhesävyisiä. sv/en säilyttää: kehu yritystä
  ei tulosta, ei tasolukuja/percentiilejä, ei painostusta, ei uhka-/menetyskehystä, ei vertailua muihin. "matka, ei arvosana."
- **§7.1 string-concat:** näkymät käyttävät `+`-konkatenointia ja template-literaaleja sekaisin — `${t(...)}`-interpolointi
  olemassa olevaan templateen OK, **ÄLÄ lisää nested template literaleja** (P0-luokka). Placeholder-korvaus `.replace('{nimi}', ...)`.
- **Glossaari:** lajinimet KANONISET (Passning/Jonglering/Slalom/Föring och skott/Längdspark) — EI Kimin VP-termejä.
- **Nimen taivutus:** sv/en EI genetiiviä — "ditt barn"/"your child" tai `{nimi}` sellaisenaan (V1-B2-konventio).
- **fi ei rikkoudu:** fi = nykyiset stringit sanatarkasti. Fallback ehdoton: puuttuva sv/en → fi näkyy.
- **Kanoninen root (§A7):** avaimet `lib/tm_lang.js` `vanhempi.*`. Ei inline-kopioita.
- **§5:** ei väri-/fonttimuutoksia. Ikonit/emojit/`e`-kentät ennallaan.

## Cache-bust + SW
- `lib/tm_lang.js` muuttuu (uudet `vanhempi.*`) → nosta **`?v=6 → ?v=7` sekä Pelaajassa ETTÄ Vanhemmassa** (molemmat lataavat sen).
- `TalentMaster_Vanhempi_v2.html` muuttuu → SW-bump **`sw_vanhempi.js`** (nykyinen cache-versio → +1; tarkista tiedostosta, esim. `tm-vanhempi-vN → vN+1`).
- Pelaaja_v7 HTML EI muutu tässä (vain sen tm_lang `?v` nousee) → `sw_pelaaja.js` cache-versio ennallaan.

## DoD
- Vanhempi-appi **sv-tilassa 100 % ruotsiksi** kaikilla reachable-näkymillä: login (+virheet), Koti, Viikko,
  Kirjaa (kaikki napit/labelit/placeholderit/toastit), Viestit, Tekniikka (tukivinkit + lajinimet), Kortti, Asetukset (roolit + GDPR).
- Ei suomenkielisiä jäänteitä reachable-pinnalla sv-tilassa (pl. tietoinen demo-data ?demo=1).
- en samalla rakenteella. fi-regressio ehjä. §7.22 säilyy. Placeholderit (`{nimi}`) toimivat, ei nimen taivutusta.
- Vitest (uusi vanhempi-i18n-testi: avainkattavuus fi/sv/en + §7.22-negatiiviset assertiot + fi-regressio) + eslint (`npm run lint`) vihreä.
- Cache-bustit + SW-bump tehty.

## Verifiointi (Claude L3)
Molemmat teemat, fi + sv + en, injektoitu lapsi-profiili (u12/u15/u19 roolit erikseen — ternäärit):
- Jokainen näkymä sv → kaikki tekstit ruotsiksi; ternäärit oikein per ikävaihe; placeholderit renderöivät nimen ilman taivutusta.
- rVanhempiTekniikka: lajinimet kanoniset (Passning/Jonglering/Slalom), tukivinkit §7.22-neutraalit.
- fi-reopen palauttaa suomen. Kielivaihto vaihtaa kaiken (näkymä re-renderöityy `draw()`:lla — ei staattista jäännettä).
- 0 tasolukua/vertailua/painostusta sv-sisällössä. **Poikkeama = ilmoita ENNEN.**

## Rajaus (EI tässä)
- rTabs (nav.*) · tervetulo-overlay (vanhempi.tervetulo_*) · kielivalitsin · Osa B — jo kunnossa.
- Demo-kalenteri (?demo=1) · Master/VP/Seura-henkilöstöpinnat (VP-getter i18n = oma vaihe, Kimin muisti).
- EIF go-live (`i18n_set_kieli_sv.js --apply`) — vasta kun roster + suostumus olemassa (nyt tyhjä).
