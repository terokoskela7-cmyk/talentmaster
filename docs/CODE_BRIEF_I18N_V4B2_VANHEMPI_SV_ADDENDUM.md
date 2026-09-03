# Code-brief — i18n V4-B2 · Vanhempi_v2 sv ADDENDUM (auditin täydennys → DoD)

> **Miksi tämä on olemassa (rehellinen syy):** V4-B:n alkuperäinen briefi väitti "Audit tehty (koko reachable-pinta)",
> mutta audit oli **epätäydellinen**. #412 käänsi uskollisesti sen mitä spec-taulukko antoi (sanktioitu pinta —
> lint 0, 18 testiä vihreä, PASS), mutta ~40+ reachable-stringiä jäi taulukon ulkopuolelle → yhä suomeksi sv-tilassa.
> Coden gap-raportti (~25) oli oikeassa mutta **alilaski** — täysi jäljelle jäävä pinta on tässä. **DoD ("100 % sv,
> 0 fi-jäännettä") EI vielä täyty ennen tätä.**
>
> **Auditin juurisyy (ettei toistu):** aiempi grep-audit (a) käytti sanarajaa `\bTekniikka\b` → missasi yhdyssanat
> ("Tekniikkaprofiili"), (b) rajasi rivivälit → missasi moduulitason vakiot (IKA-hero/vinkki), (c) ei skannannut
> `_toast()`-kutsuja, data-vetoisia render-haaroja (§16-lohko renderöityy vain tki-datalla), eikä näyttötekstiä
> rakentavia helper-funktioita (viikkokooste-`osat`, time-ago). Tämä addendum kattaa kaikki nämä luokat.

**Sama mekaniikka kuin #412:** reititä `${t('vanhempi.*')}`; `{nimi}`/`{n}`/`{pvm}` `.replace()`:llä; sv/en EI nimen
taivutusta ("ditt barn"/"your child"); kanoninen lajiglossaari; §7.22/§16 säilyy; fi = nykyiset stringit sanatarkasti.

---

## A) "Valmentajalta" -viestilähde ×6 + lähde-labelit + toast
Rivit 441, 707, 735, 762, 822, 1096 (kaikki sama teksti):
| fi | sv | en |
|---|---|---|
| Valmentajalta | Från tränaren | From the coach |

Rivi 446 (`e.source`-labelit): | Kirjasit | Du loggade | You logged | · | Joukkue | Laget | Team | · | Omatoimi | På egen hand | On their own |

## B) IKA-hero + ikätonaliteetti-vinkit (moduulivakiot, renderöityvät riveillä 716/743/770 `${d.vinkki}`, hero 180/188/196)
| Rivi | fi | sv | en |
|---|---|---|---|
| 180/188/196 | Tervetuloa (hero.t) | Välkommen | Welcome |
| 180/188/196 | Treenitiedot näkyvät kun valmentaja kirjaa harjoituksia. (hero.s) | *(sama avain kuin #412 rivi 782 — reititä const uudelleenkäyttäen)* | |
| 181 (u12) | Pikkuiselle on tänään hyvä päivä levätä. Katso lempeästi, että hän ei treenaa kolmatta päivää putkeen. | Idag är en bra dag för den lilla att vila. Håll ett vänligt öga på att hen inte tränar tredje dagen i rad. | Today is a good day for the little one to rest. Gently keep an eye that they don't train a third day in a row. |
| 189 (u15) | Nuori alkaa ottaa vastuuta itse. Ei tarvitse kysyä joka päivä — viesti kannattaa säästää viikon lopuksi. | Den unga börjar ta eget ansvar. Du behöver inte fråga varje dag — spara gärna ett meddelande till veckans slut. | The young person is starting to take responsibility. No need to ask every day — save your message for the end of the week. |
| 197 (u19) | Hän on lähes aikuinen pelaaja. Rooli muuttuu: olet läsnä, mutta et ohjaaja. Kuukausikooste riittää — älä häiritse arkea. | Hen är nästan en vuxen spelare. Rollen ändras: du är närvarande, men inte tränare. Månadssammanfattningen räcker — stör inte vardagen. | They're almost an adult player. Your role shifts: you're present, but not a coach. The monthly summary is enough — don't disturb daily life. |
> 178/186/194 `nimi:'Pelaaja'`, `ryhma:'Joukkue'` = demo-placeholder (ylikirjoittuu TMBus/Firestore-datalla) → **valinnainen**, ei kriittinen.

## C) rKirjaa loput
| Rivi | fi | sv | en |
|---|---|---|---|
| 905 | Vanhempi kirjaa | Föräldern loggar | Parent logs |
| 942 | Kuinka kauan? | Hur länge? | How long? |
| 970 | Sanasi | Dina ord | Your words |
| 970 | (valinnainen) | (valfritt) | (optional) |
| 1070 (toast) | Kirjausta ei voitu tallentaa — avaa linkki uudelleen seuran viestistä. | Loggen kunde inte sparas — öppna länken på nytt från föreningens meddelande. | The log could not be saved — open the link again from the club's message. |

## D) §16/§34 Tekniikkaprofiili-lohko (rVanhempiTekniikka, renderöityy tki-datalla) — §7.22-HERKKÄ
| Rivi | fi | sv | en |
|---|---|---|---|
| 1135 | Tekniikkaprofiili | Teknikprofil | Technique profile |
| 1152 | Mitattu {pvm} | Mätt {pvm} | Measured {pvm} |
| 1161 | Seuraava askel: | Nästa steg: | Next step: |
| 1164 | Nyt: {x} s → Tavoite: {y} s (labelit "Nyt:" / "Tavoite:"; arvot = numeroita) | Nu: {x} s → Mål: {y} s | Now: {x} s → Target: {y} s |
| 1174 | Matka {mitali}: {gap} s 💪 | Väg till {mitali}: {gap} s 💪 | Distance to {mitali}: {gap} s 💪 |
| 1172 MM-kartta | kulta→kultaan · hopea→hopeaan · pronssi→pronssiin | guld · silver · brons | gold · silver · bronze |
> §34/§16-invariantti: mitalimatka **vain ≤15 s, positiivisesti** (jo koodissa gate `gap_s>0 && <=15`) → sv/en säilyttää
> positiivisen "💪"-kehyksen. Ei tasolukuja, ei laskukehystä, ei vertailua muihin. "Nyt→Tavoite" = saavutettava askel.
> MM sv/en = **substantiivit** (guld/gold), koska "Väg till guld"/"Distance to gold" (suomen illatiivi kultaan → sv/en prepositio).

## E) rKortti
| Rivi | fi | sv | en |
|---|---|---|---|
| 1224 | Kausipassi | Säsongspass | Season pass |

## F) Ilmoitukset-otsikko (×2) + ilmoitus-lista
| Rivi | fi | sv | en |
|---|---|---|---|
| 523 / 1341 | Ilmoitukset (🔔-emoji ennallaan) | Aviseringar | Notifications |
| 1344 | Valmentajan viesti · Heti kun saapuu | Tränarens meddelande · Så snart det kommer | Coach's message · As soon as it arrives |
| 1345 | Päivittäinen kirjaus · Muistutus illalla 20:30 | Daglig loggning · Påminnelse kl. 20:30 på kvällen | Daily logging · Reminder at 20:30 in the evening |
| 1346 | Viikkokooste · Sunnuntaina klo 18 | Veckosammanfattning · På söndagar kl. 18 | Weekly summary · On Sundays at 18:00 |
| 1347 | Kuukausikooste sähköpostilla · Ensimmäinen pv | Månadssammanfattning via e-post · Första dagen | Monthly summary by email · First day |
| 1348 | Loukkaantuminen · Heti kun valmentaja kirjaa | Skada · Så snart tränaren registrerar | Injury · As soon as the coach logs it |

## G) Toastit (reachable)
| Rivi | fi | sv | en |
|---|---|---|---|
| 415 | Palautuslinkki lähetetty sähköpostiisi! | Återställningslänk skickad till din e-post! | Reset link sent to your email! |
| 1636 | Tunnukseesi ei ole liitetty lasta. Ota yhteyttä seuraan. | Inget barn är kopplat till ditt konto. Kontakta föreningen. | No child is linked to your account. Contact the club. |
| 1647 | Lapsen haku epäonnistui — tarkista verkkoyhteys ja yritä uudelleen. | Hämtning av barnet misslyckades — kontrollera nätverket och försök igen. | Loading the child failed — check your connection and try again. |
| 1732 | Kehu ei lähtenyt — tarkista yhteys | Berömmet skickades inte — kontrollera anslutningen | The praise didn't send — check your connection |
| 1798 | PIN kopioitu leikepöydälle | PIN kopierad till urklipp | PIN copied to the clipboard |
| 1842 | Valmentajalta uusi viesti | Nytt meddelande från tränaren | New message from the coach |

## H) Viikkokooste-rakentaja (`osat`) + mikrosykli-kuvaukset (rViikko-data, renderöityvät)
| Rivi | fi | sv | en |
|---|---|---|---|
| 1772 | {n} minuuttia — pisin tänä viikkona | {n} minuter — längst denna vecka | {n} minutes — longest this week |
| 1773 | {n} minuuttia | {n} minuter | {n} minutes |
| 1786 | Tämä on jo {n}. kirjaus tällä viikolla. | Det här är redan den {n}:e loggen denna vecka. | This is already log #{n} this week. |
| 1787 | Ensimmäinen kirjaus tänä viikkona. | Första loggen denna vecka. | First log this week. |
| 1789 | Hyvää työtä tänään. | Bra jobbat idag. | Good work today. |
| 1777 | Oma-aloitteinen ulkoilu — ei pyyntiä. | Utevistelse på eget initiativ — utan uppmaning. | Self-initiated outdoor play — unprompted. |
| 1778 | Sosiaalinen treeni kavereiden kanssa. Tärkeintä tässä iässä. | Social träning med kompisar. Det viktigaste i den här åldern. | Social training with friends. The most important thing at this age. |
| 1779 | Bola Sempre: aamuharjoite ennen koulua. Maailman huippujen tapa. | Bola Siempre: morgonövning före skolan. Världstoppens vana. | Bola Siempre: a morning session before school. The way the world's best do it. |
| 1780 | Välituntimikrosykli — yksi kosketushetki päivän keskellä. | Rastmikrocykel — ett bollmoment mitt på dagen. | Recess microcycle — one touch moment in the middle of the day. |
> **Typo-korjaus:** fi rivi 1779 "Bola Sempre" → oikea on **"Bola Siempre"** (sv/en käyttää oikeaa). Korjaa fi samalla — ilmoita.

## I) Time-ago (rivit 1740–1742, renderöityvät aikaleimoissa)
| fi | sv | en |
|---|---|---|
| juuri nyt | just nu | just now |
| {n} min sitten | {n} min sedan | {n} min ago |
| tunnin sitten | en timme sedan | an hour ago |
| tänään | idag | today |

## J) Hero-tyhjätila + syntymäpäivä (genetiivi → sv/en EI nimen taivutusta)
| Rivi | fi | sv | en |
|---|---|---|---|
| 1575 | Kun {gen} treenit alkavat näkyä, näet ne tässä. | När ditt barns träningar börjar synas ser du dem här. | When your child's sessions start showing, you'll see them here. |
| 1597 | 🎂 Tänään on {gen} {n}. syntymäpäivä! Muistitko onnitella? | 🎂 Idag fyller ditt barn {n} år! Kom du ihåg att gratulera? | 🎂 Today your child turns {n}! Did you remember to congratulate them? |
| 1598 | 🎂 {gen} {n}. syntymäpäivä on tällä viikolla — muistathan onnitella! | 🎂 Ditt barn fyller {n} år den här veckan — kom ihåg att gratulera! | 🎂 Your child turns {n} this week — remember to congratulate them! |

## K) RSVP-napit (login/hero, rivi 594)
| fi | sv | en |
|---|---|---|
| ✓ Tulossa | ✓ Kommer | ✓ Attending |
| ✕ Estynyt | ✕ Förhindrad | ✕ Can't make it |

## L) PWA-kehote (rivit 1455/1459/1482, kirjautumisen jälkeen)
| Rivi | fi | sv | en |
|---|---|---|---|
| 1455 (iOS) | Napauta Jaa-kuvaketta ja valitse "Lisää Kotivalikkoon". | Tryck på Dela-ikonen och välj "Lägg till på hemskärmen". | Tap the Share icon and choose "Add to Home Screen". |
| 1455 (muu) | Aina yhden napautuksen päässä. | Alltid ett tryck bort. | Always one tap away. |
| 1459 | 📲 Lisää {appNimi} kotinäytölle | 📲 Lägg till {appNimi} på hemskärmen | 📲 Add {appNimi} to your home screen |
| 1482 | vanhemman sivu (appNimi-arg) | förälderns sida | the parent view |

---

## EI skoopissa (vahvistettu ei-reachable / tietoinen rajaus)
- **devChrome (rivit 131–152, `display:none`, vain `?demo=1`):** 134 "Vanhemman näkymä…", 146–149 dev-nav-napit → **EI reachable tuotannossa.** Jätä.
- Demo-kalenteri (`_vanhDemoKalenteri` 484–491, `?demo=1`). Suomenkieliset koodikommentit + `console.*`.
- Master/VP/Seura-henkilöstöpinnat (VP-getter i18n = oma vaihe).

## Vartijat (samat kuin #412)
- §7.22/§16 EHDOTON: D-lohko (Tekniikkaprofiili/Nyt→Tavoite/Matka mitali) + vinkit — ei tasolukuja/vertailua/painetta, positiivinen kehys.
- §7.1: `${t(...)}` olemassa olevaan templateen; EI nested template literaleja. Placeholder `.replace()`.
- Glossaari kanoninen (Passning/Jonglering/Slalom…). Nimen taivutus pois sv/en.
- fi sanatarkasti (pl. tietoinen "Bola Sempre"→"Siempre" typo-fix, ilmoita). Fallback ehdoton.

## Prosessihuomio (korjattavaksi tässä tai erikseen)
- **#412 ajoi `npm run version:bump` feature-haarassa** → `APP_VERSION` leimattu Admin/Master/Pelaaja/Vanhempi + version.json
  (§33: EI bumppia feature-haaroissa — main auto-bumppaa; juurisyy #53 merge-konflikteille). **Peru version-bump tästä PR:stä**
  (palauta Admin/Master `APP_VERSION` + version.json main-tilaan; säilytä VAIN tm_lang `?v=7`-bumpit ja sv-työ).

## Cache-bust + SW
- tm_lang `?v=7` on jo #412:ssa (Pelaaja+Vanhempi). Tämä addendum lisää vain `vanhempi.*`-avaimia → **ei uutta ?v-bumppia
  tarvita** (additiivinen, sama tiedosto), MUTTA jos #412 ei ole vielä merged: pidä `?v=7`. Vanhempi-HTML muuttuu → `sw_vanhempi.js` cache-bump on jo #412:ssa; jos erillinen PR → nosta uudelleen.

## DoD (tämä sulkee V4-B:n)
- Vanhempi sv-tilassa **0 suomenkielistä jäännettä reachable-pinnalla** (pl. devChrome/demo): kaikki A–L käännetty.
- Vitest laajennettu (uudet avaimet fi/sv/en-kattavuus + §7.22-negatiiviset D-lohkolle) + `npm run lint` EXIT 0.
- version:bump peruttu (vain sv-työ + tm_lang ?v jää).

## Verifiointi (Claude L3)
Molemmat teemat, fi+sv+en, injektoitu lapsi u12/u15/u19 + **tki-datalla** (jotta D-lohko + Mitalimatka renderöityy) +
tyhjätila (hero/vinkki) + toastit (laukaise virhepolut) + syntymäpäivä-haara. **Uusi täydellinen audit-skannaus
(koko tiedosto, substring, toastit, consts, data-haarat) → 0 fi-jäännettä** ennen PASS-väitettä.
