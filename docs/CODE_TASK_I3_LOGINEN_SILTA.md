# I3 — Looginen silta: havainto → tavoite → konsepti/fundamentti → harjoite

> **Suunnitteludokumentti (design), ei vielä Code-brief.** Ratkaisee `logiikka_kartta`-diagnoosin: kausifokus (IDP-tavoite,
> arviointi-taksonomia) ja jaksofokus (harjoiteltava teknis-taktinen konsepti) eivät kohtaa. I3 rakentaa **yhden loogisen
> sillan** joka kääntää tavoitteen oikeaksi konseptiksi/fundamentiksi ja siitä valmiiseen harjoitesisältöön — **säilyttäen
> asiantuntijan vallan** (ehdotus, ei pakko). Auditoitu koodista (main). Kohde: uusi `lib/tm_kehityspolku.js` +
> kytkennät VP_v25 / Master_v16 + olemassa olevien `tm_arviointi_silta.js` / `tm_pelialy_yksilo.js` yhdistäminen.

## 0. Ydinoivallus — palikat ovat jo olemassa, ne on vain kytkemättä
Kaksi Teron/lukittua karttaa kattaa suurimman osan; tarvitaan **yhdistäminen + aktivointi + tavoitteesta ajaminen**, ei uutta keksintöä:
- **KARTTA_A** (`tm_pelialy_yksilo.js`, **LUKITTU §13**): D4-peliäly (17 kohdetta, hyökkäys + puolustus) → youth-konsepti. **Valmis** — vain kutsutaan.
- **SILTA_MAP** (`tm_arviointi_silta.js`, "Tero validoinut"): D2-hyökkäys → youth-konsepti. **Osittain** (ks. §1 — mäppäysvirhe korjattava).
- **Sisältöpää valmis:** `tmTtKysymykset` / `tmTtHarjoitteet` (cue + harjoite per konsepti), `tmTtItems`/`tmTtVaihe` (ikä/vaihe-gating).

## 1. Kattavuusanalyysi — mitä silta kääntää (auditoitu taksonomia)
Havaittavat kohteet dimensioittain (idp_fokus.alue voi olla mikä tahansa näistä):

| Dim | Kohteita | Silta-lähde | Tila |
|---|---|---|---|
| **D2 Tekninen** | 14 | SILTA_MAP → youth y_h* | ⚠️ **vain 4/14 oikein** — 10 puuttuu + 3 vanhentunutta avainta |
| **D4 Peliäly** | 17 | KARTTA_A → youth y_h*/y_p* | ✅ **17/17** (lukittu), ei kutsuta |
| **D1 Fyysinen** | 3 (balance, physical_presence, courage) | → fyysteema (V7) / laadullinen | route, ei teknis-taktista konseptia |
| **D3 Psyykkinen** | 12 | — | ei harjoitekonseptia (laadullinen / psyk-interventio) |
| **D5 Sosiaalinen** | 2 (team_role, social_interaction) | — | ei harjoitekonseptia (joukkuerooli / laadullinen) |

**D2 mäppäysvirhe (kriittinen):** SILTA_MAP:n avaimet `dribbling / short_passing / finishing` **eivät ole nykytaksonomiassa**.
Nykyinen D2 = `ball_control, running_with_ball, ball_protection, link_up, long_passing, passing_variety, hide_pass,
shooting_accuracy, shooting_power, shooting_quickness, shooting_efficiency, shooting_variety, heading, weaker_foot`.
Vain 4 (ball_control, running_with_ball, ball_protection, link_up) täsmää. **10 kohdetta on ilman mäppäystä** → nämä on
täydennettävä (§6, TERO validoi, koska pedagoginen).

## 2. Arkkitehtuuri — yksi resolver, dispatch dimensiolla
**`tmRatkaiseKehityspolku(idpFokus, pelaaja, ctx)`** (uusi `lib/tm_kehityspolku.js`, PURE, dual-export). Input: `idp_fokus`
(`{alue, dim, nimi}`) + pelaaja (ikä/vaihe/pelipaikka). Output **ehdotus** (ei pakko):
```
{
  tyyppi: 'teknis_taktinen' | 'fyysinen' | 'laadullinen',
  konsepti_avain, konsepti_nimi,          // youth-konsepti (kaikki iät) — null jos laadullinen
  fundamentti_avain, fundamentti_nimi,    // pelipaikkatarkennus (U15+, jos relevantti) — muuten null
  cue, harjoite,                          // sisältöpää (tmTtKysymykset/Harjoitteet), valmis
  varmuus: 'lukittu' | 'ehdotettu' | 'ei_konseptia',
  syy                                     // "Tavoitteesta Kuljetus tilaan (D2) → porttikuljetus (y_h3)"
}
```
**Dispatch:**
- **D2** → D2-konseptikartta (täydennetty 14) → youth-konsepti. U15+ & pelipaikka → hae **fundamentti** samalla faasilla/teemalla.
- **D4** → KARTTA_A (aktivoi) → youth-konsepti (+ fundamentti U15+).
- **D1** → `tyyppi:'fyysinen'`, route V7-fyysteemaan (ei teknis-taktista harjoitetta). (silta_d1-polku on jo osin olemassa.)
- **D3 / D5** → `tyyppi:'laadullinen'`, `varmuus:'ei_konseptia'` — ei pakotettua harjoitetta; ehdota laadullinen kirjaus /
  psyk- tai rooli-interventio. (Sama linja kuin P1.5 §9: henkinen/sosiaalinen ei ole harjoiteakselilla.)

**Kaksikerroksinen output (tärkeä):** youth-konsepti = *mitä taitoa* (kaikki iät); fundamentti = *miten se ilmenee pelaajan
pelipaikalla* (U15+). Näin ikävaiheistus (tmTtVaihe) säilyy: U13 saa youth-konseptin, U16 saa lisäksi pelipaikkafundamentin.

## 3. Asiantuntijan valta — ehdotus + poikkeamavaroitus (ei pakko)
- Toimintakortti **esivalitsee** resolverin ehdottaman konseptin kun pelaajalla on aktiivinen IDP-tavoite (nyt esivalinta =
  `items[0]` tai edellinen jaksofokus, **ei koskaan tavoite**).
- Valmentaja voi **poiketa** — mutta jos valittu konsepti ≠ tavoitteen ratkaisema, näytä hillitty huomio:
  *"Tämä poikkeaa tavoitteesta (Kuljetus tilaan → porttikuljetus). Haluatko silti? Asiantuntijan valinta kirjataan."*
- **Takaisinlinkki:** tallenna `jaksofokus.tavoite_alue = idp_fokus.alue` (+ poikkeama-lippu). Näin jakso↔tavoite ovat oikeasti
  yhdistetyt (nyt "ladder"-teksti on koriste) ja VP näkee kohdistuuko kehitys.

## 4. Kytkentäkohdat (missä resolver ajetaan)
1. **Toimintakortti** (`_ttKorttiHTML` Master:5346 / `_vpTtKorttiHTML` VP:4868): esivalinta tavoitteesta + poikkeamavaroitus.
2. **"Ladder" todeksi** (VP:5430 / Master:5377): korvaa koristeteksti oikealla ketjulla tavoite → konsepti → seuraava harjoite
   (lue oikeat kentät).
3. **I2:n IDP-silta jatkoksi:** "＋ IDP-tavoite" -tavoitteen luonnin jälkeen tarjoa heti "→ Harjoittele näin" (resolverin konsepti +
   harjoite). Ketju havainnosta harjoitteeksi yhdellä istumalla.
4. **Selattava referenssi** (§5).

## 5. "Mitä pelaajan tulee osata" — selattava näkymä (Teron kysymys)
Uusi kevyt näkymä pelaajakortille (tai VP/Master-työkaluun): **pelaajan ikävaiheen konseptit + pelipaikan fundamentit** koottuna
(`tmTtItems(p)`), ryhmiteltynä (hyökkäys/puolustus/pelinluku), kukin cue + harjoite + tila (aktiivinen jaksofokus / katettu /
avoin). Vastaa suoraan "mistä VP/valmentaja löytää konseptit joita pelaaja tulee osata" — nyt ne näkyvät vain valitsimessa.

## 5b. Joustavuus + valinnaiset välitavoitteet (LUKITTU periaate — Tero)
**Ydinperiaate: joustavuus ennen jäykkyyttä. Ei pakotettuja kiskoja.**

**(a) Jakson kesto käsin asetettava.** Nyt `kesto_vk` on kovakoodattu 4 (idpRakennaTavoite / jaksofokus). Muutos: valmentaja
**asettaa keston itse** (tyypillinen 4–8 vk, mutta ei rajoitettu). Jakso **ei sulkeudu automaattisesti** 4 viikossa — se
päättyy kun valmentaja päättää (manuaalinen sulku, olemassa) tai kun asetettu aika umpeutuu (`tmJfUmpeutunut` käyttää keston,
ei kiinteää 4:ää). Oletusehdotus voi olla esim. 6 vk, mutta kenttä on vapaa.

**(b) Välitavoitteet VALINNAISIA.** Oletus = yksinkertainen: **yksi tavoite → yksi konsepti → yksi jakso** (kuten nyt). Jos
valmentaja/VP haluaa, ison tavoitteen voi pilkkoa **linkitettyihin välitavoitteisiin** (konseptipolku):
```
tavoite.valitavoitteet: [                       // TYHJÄ oletuksena — täytetään vain tarvittaessa
  { nimi, konsepti_avain, kesto_vk, tila:'avoin'|'aktiivinen'|'saavutettu', jarjestys }
]
```
- Tyhjä `valitavoitteet[]` → tavoite toimii kuten tänään (ei mitään uutta pakotettua).
- Täytetty → resolver voi **ehdottaa konseptipolkua** (esim. Haltuunotto → Tempokuljetus → Harhautus), mutta valmentaja
  lisää/muokkaa/poistaa vapaasti. Kukin välitavoite = oma meso-jakso (oma kesto). Aktiivinen välitavoite → jaksofokus.
- Kausitavoite valmistuu kun polku on kuljettu — tai valmentaja merkitsee saavutetuksi milloin tahansa (ei pakoteta polkua loppuun).

**Ei rikota nykyistä:** additiivinen kenttä. Pelaaja joilla ei ole välitavoitteita → näkymä ennallaan. §26 pikakentät ennallaan.

**(c) Pelipaikkaportti joustavaksi (U14 alkaen, viimeistään U15).** Nyt `tmTtVaihe` avaa fundamentit kovalla rajalla ikä ≥15.
Muutos: fundamentit tulevat saataville **pelipaikan asettamisen kautta U14:stä alkaen** (aikainen erikoistuja voi aloittaa jo
U14), ja U15 on viimeistään-piste jolloin pelipaikkavaihe on standardi. Ei kovaa ikäkatkaisua — portti = "pelipaikka asetettu
JA ikä ≥ ~14" (tai valmentaja aktivoi). Huom (arvoijan P1.5): fundamenttien **sisältö on ohut** → näytä fundamentti vasta kun
sen sisältö (cue/harjoite/kpi) on valmis; muuten pidä youth-konsepteissa. Sisällön täydennys = erillinen (valmentajakoulutus).

## 5c. Palautteen jalostukset (lukittu — analyysi 2026-07)
Ulkopuolisen palautteen + Teron havainnointi-oivalluksen pohjalta, resolveriin:

**(a) Havainnointi (Y-H0) = läpileikkaava kerros, ei vertainen konsepti.** Y-H0 on useimpien teknisten/taktisten tekojen
*ylävirrassa* (skannaa ennen haltuunottoa, näe ennen syöttöä). Resolver **ei tuota Y-H0:aa erillisenä pakkokonseptina**
teknisille kohteille, vaan **toissijaisena vihjeenä**: kun tekninen arvio on matala, IDP-kortti näyttää "jos tekniikka ok
mutta ei käytä → tarkista havainnointi (Y-H0)". Koskee erit. syöttö/kuljetus/haltuunotto (palautteen kohta C yleistettynä).
**Kytkös ADAR:iin:** Y-H0 = ADAR:n "A" (Assess) — matala Assess-pelihavainto → Y-H0 suoraan (KARTTA_A: anticipation/vision
jo osoittavat y_h0:aan). Sama havainnointikyky, kaksi työkalua. (Ref `havainnointi_perusta.html`.)

**(b) Tulosmittari vs taito -erottelu.** Osa taksonomian kohteista on **seurauksia, ei harjoiteltavia taitoja**:
`shooting_efficiency` (maalit/laukaukset), `defensive_reliability`, `consistency`. Resolver **ei mäppää näitä konseptiksi** —
merkitsee `tyyppi:'tulosmittari'` ja ohjaa: "kehitä alla olevia taitoja (esim. laukauksen tarkkuus/voima) + päätöksenteko
(D4)". EI poisteta Palloliiton kortista (se on kortin kohde) — vain resolver kohtelee eri tavoin. IDP-moottori voi jättää
tulosmittarit heikoin-ehdokas-poiminnan ulkopuolelle tai selittää ne.

**(c) Harjoite-tägit (Y-H9 + muut) — uusi riippuvuus.** Laukaukset → yksi konsepti Y-H9, mutta erottelu **harjoitekirjaston
tägeillä** (`placement / power / first-time / variety`). Tämä edellyttää **harjoitteille tägi-rakennetta** (`tmTtHarjoitteet`
ei nyt tägitä laukaustyyppiä) → pieni lisätyö I3a:han (tai I3b jos halutaan erikseen). Ilman tägejä: Y-H9 toimii, mutta ilman
kohdennusta.

**(d) Heikompi jalka = drill-attribuutti.** `weaker_foot` ei ole konsepti — harjoitteelle `jalka:[dominoiva|heikompi|molemmat]`.
Kehittyy samojen konseptien sisällä. (Sama tägi-rakenne kuin c.)

**(e) Y-H4 / Y-H7 poissaolo D2:sta dokumentoidaan.** Y-H4 Harhauttaminen jäi orvoksi kun `dribbling` poistui taksonomiasta
(mäppäysvirhe §1) → Y-H4 syntyy nyt D4-pelihavainnosta (1v1), ei D2-mittauksesta. Y-H7 on taktinen/palloton (D4), oikein D2:n
ulkopuolella. Kirjataan koodikommenttiin, ettei kehittäjä lisää niitä D2-karttaan.

**(f) Konsepti → D2-target -käänteiskartta (polkua varten).** Yksittäinen tavoite muistaa oman kohteensa (`fokus.alue`) →
review mittaa sen; ei tarvita käänteiskarttaa. **Mutta** yksi konsepti (Y-H9) ruokkii montaa kohdetta (5 laukausta) → välitavoite-
polulla (§5b b) käänteiskartta näyttää "tämä konsepti kehittää näitä kohteita". Additiivinen, vain polku-näkymään.

## 6. Domain-validointi — TERO (pedagoginen, ei koodi)
Resolverin **rakenne** on koodia; **D2-kartan täydennys** on pedagogiikkaa → Tero validoi. Ehdotus (täsmennettävä):

| Taksonomia (D2) | Ehdotettu konsepti | Tila |
|---|---|---|
| ball_control | y_h1 ensimmäinen kosketus | ✅ validoitu |
| running_with_ball | y_h3 porttikuljetus | ✅ validoitu |
| ball_protection | y_h5 suojaus paineessa | ✅ validoitu |
| link_up | y_h6 tukipeli/tarjoutuminen | ✅ validoitu |
| long_passing | y_h2 syöttö (pitkä) | 🟡 ehdotus |
| passing_variety | y_h2 syöttö (monipuolisuus) | 🟡 ehdotus |
| hide_pass | y_h8 pelin lukeminen + syöttö | 🟡 ehdotus |
| shooting_* (5) | y_h9 viimeistely | 🟡 ehdotus (yksi konsepti kaikille laukauksille?) |
| heading | y_h9 / oma pääpelikonsepti? | 🟡 ehdotus |
| weaker_foot | modifieri (heikko jalka kaikessa) — ei oma konsepti? | 🟡 päätös |

(KARTTA_A / D4 ei vaadi validointia — lukittu.)

## 7. Vaiheistus (I3a = kokonaisuus, päätetty)
- **I3a — Resolver + kytkennät + joustavuus + referenssi:** `tm_kehityspolku.js` (D2 täydennetty + D4 aktivoitu + D1 route +
  D3/D5 laadullinen), toimintakortin esivalinta + **hillitty** poikkeamavaroitus + takaisinlinkki, "ladder" todeksi,
  **käsin asetettava kesto** (§5b a), **valinnaiset välitavoitteet** (§5b b), ja **selattava "mitä pelaajan tulee osata"
  -näkymä** (§5). = kokonainen looginen silta.
- **I3b (valinn.):** VP-oversight: kohdistuuko jakso tavoitteeseen (poikkeama-raportti).

## 8. Rajaus / periaatteet
- **Joustavuus ennen jäykkyyttä** — käsin asetettava kesto, valinnaiset välitavoitteet, ei pakotettuja kiskoja (§5b).
- **Ei muuteta asteikkoja eikä arviointidatamallia.** Silta on käännöskerros; välitavoitteet + kesto ovat additiivisia kenttiä.
- **Asiantuntijan valta säilyy** — resolver ehdottaa, valmentaja päättää, poikkeama kirjataan **hillitysti** (ei estetä, ei pakoteta perustelua).
- **Ei Firestore-sääntömuutosta** (jaksofokus-kirjoitus jo sallittu).
- KARTTA_A pysyy lukittuna; vain kutsutaan. SILTA_MAP korjataan/täydennetään taksonomian mukaiseksi.

## 9. Päätökset — tila
- ✅ **D3/D5** = laadullinen kirjaus (ei pakotettua harjoitetta). — päätetty
- ✅ **Selattava referenssi** = mukaan I3a:han. — päätetty
- ✅ **Poikkeamavaroitus** = hillitty huomio (ei vaadi perustelua). — päätetty
- ✅ **Kesto käsin asetettava (4–8 vk vapaa)** + **valinnaiset välitavoitteet**. — päätetty (§5b)
- ⏳ **D2-kartan täydennys** (§6 taulukko / `d2_validointi.html`) — **odottaa Teron validointia** (viimeinen portti ennen briefiä).
  Erityisesti: shooting_* → yksi Y-H9 vai eritelty? weaker_foot = modifieri vai oma konsepti?
