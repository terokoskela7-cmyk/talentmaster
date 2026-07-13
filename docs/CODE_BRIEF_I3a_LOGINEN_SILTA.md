# Code-brief — I3a: Looginen silta (havainto → tavoite → konsepti/fundamentti → harjoite)

> **Lähde:** `docs/CODE_TASK_I3_LOGINEN_SILTA.md` (suunnitelma, §5b joustavuus + §5c palautteen jalostukset) + Teron hyväksyntä
> 2026-07. Rakentaa **yhden resolverin** joka kääntää IDP-tavoitteen oikeaksi konseptiksi/fundamentiksi ja siitä valmiiseen
> harjoitteeseen — **säilyttäen asiantuntijan vallan ja joustavuuden**. Yhdistää olemassa olevat kartat (SILTA_MAP korjattuna +
> KARTTA_A aktivoituna), ei keksi uutta. Kohde: uusi `lib/tm_kehityspolku.js` + kytkennät VP_v25 / Master_v16.
> **Ei arviointidatamallin muutosta. Ei Firestore-sääntömuutosta** (jaksofokus/idp_kausi jo sallittu). **Ei I3b:tä** (VP-oversight).
> Rivi­viitteet = lähtötila (main), eivät lukittuja.

## 0. Periaatteet (LUKITTU — Tero)
- **Joustavuus ennen jäykkyyttä.** Käsin asetettava kesto, valinnaiset välitavoitteet, ei pakotettuja kiskoja.
- **Asiantuntijan valta.** Resolver **ehdottaa**, valmentaja päättää; poikkeama sallitaan **hillitysti** (ei estetä, ei pakoteta perustelua).
- **Ei uutta arviointidataa.** Silta on käännöskerros; välitavoitteet + kesto ovat additiivisia kenttiä tavoite-objektiin.

## A · RESOLVER — `lib/tm_kehityspolku.js` (PURE, dual-export)
`tmRatkaiseKehityspolku(idpFokus, pelaaja, ctx)` → **ehdotus** (ei pakko). Input: `idp_fokus {alue, dim}` + pelaaja (ikä/vaihe/
pelipaikka) + ctx (tmTtItems-gating, konseptiNimi, tmTaksonomiaByAvain). Output:
```
{ tyyppi:'teknis_taktinen'|'fyysinen'|'laadullinen'|'tulosmittari',
  konsepti_avain, konsepti_nimi,             // youth-konsepti — null jos ei teknis-taktinen
  fundamentti_avain, fundamentti_nimi,       // pelipaikkatarkennus (U14+ jos pelipaikka & sisältö valmis) — muuten null
  harjoite_tagit,                            // esim. ['power'] laukauksille (§E) — valinnainen
  havainnointi_vihje,                        // true jos tekninen kohde → "tarkista Y-H0" (§A.4)
  cue, harjoite,                             // sisältö (tmTtKysymykset/tmTtHarjoitteet) — valmis
  varmuus:'lukittu'|'ehdotettu'|'ei_konseptia', syy }
```

### A.1 Dispatch dimensiolla
- **D2** → `D2_KONSEPTI` -kartta (§A.5) → youth-konsepti. U14+ & pelipaikka & sisältö valmis → hae myös **fundamentti** (§A.6).
- **D4** → **aktivoi KARTTA_A**: `tmPelialyYksiloEhdota([alue], ctx)` (`lib/tm_pelialy_yksilo.js:50`, nyt kuollut koodi) → youth-konsepti.
- **D1** → `tyyppi:'fyysinen'`, route V7-fyysteemaan (ei teknis-taktista harjoitetta). (`silta_d1`-polku osin olemassa VP:4051/4128.)
- **D3 / D5** → `tyyppi:'laadullinen'`, `varmuus:'ei_konseptia'` — ei pakotettua harjoitetta (kehityskeskustelu/rooli).

### A.2 Tulosmittari-erottelu (§5c b)
`shooting_efficiency`, `defensive_reliability`, `consistency` → `tyyppi:'tulosmittari'`, EI konseptia. `syy`: "Seuraus, ei
harjoiteltava taito — kehitä alla olevia taitoja + päätöksenteko (D4)." (Palloliiton kortista EI poisteta; vain resolver
kohtelee eri tavoin. IDP-moottori voi jättää tulosmittarit heikoin-poiminnan ulkopuolelle.)

### A.3 Kaksikerroksinen output — ikävaiheistus säilyy
Youth-konsepti = *mitä taitoa* (kaikki iät). Fundamentti = *miten pelipaikalla* (§A.6). `tmTtItems`/`tmTtVaihe` säilyy gatena.

### A.4 Havainnointi (Y-H0) = läpileikkaava vihje (§5c a — Teron oivallus)
Y-H0 EI ole erillinen pakkokonsepti teknisille kohteille. Kun kohde on **tekninen** (syöttö/kuljetus/haltuunotto) → aseta
`havainnointi_vihje:true` → IDP-kortti näyttää: *"Jos tekniikka on ok mutta pelaaja ei käytä sitä — tarkista havainnointi (Y-H0)."*
Kytkös: D4-haarassa KARTTA_A mäppää jo `anticipation/vision → y_h0` (matala Assess-pelihavainto → Y-H0 suoraan).

### A.5 D2_KONSEPTI-kartta (Teron ehdotus, korvaa/korjaa SILTA_MAP:n mäppäysvirheen)
```
ball_control      → y_h1   (Haltuunotto)          long_passing    → y_h2  (Syöttäminen; alt-vihje y_h8)
running_with_ball → y_h3   (Tempokuljetus)        passing_variety → y_h2
ball_protection   → y_h5   (Pallon suojaaminen)   hide_pass       → y_h2  (+ havainnointi_vihje: y_h0)
link_up           → y_h6   (Tuen tarjoaminen)     heading         → y_h9  (Viimeistely — hyökkäyspääpeli)
shooting_accuracy → y_h9   (tag: placement)       shooting_power  → y_h9  (tag: power)
shooting_quickness→ y_h9   (tag: first-time)      shooting_variety→ y_h9  (tag: variety)
shooting_efficiency → TULOSMITTARI (ei konseptia, §A.2)
weaker_foot        → MODIFIERI (ei konseptia; harjoitteen jalka-attribuutti, §E)
```
(Vanhat SILTA_MAP-avaimet `dribbling/short_passing/finishing` eivät ole taksonomiassa → poistetaan. Kartta on **data** —
Tero voi hienosäätää yksittäisiä pareja myöhemmin muuttamatta koodia.)

### A.6 Fundamentti-kerros (U14+, pelipaikka, sisältö valmis)
Jos `tmTtVaihe==='pelipaikka'` (ks. §C.3 joustava portti) & pelaajalla pelipaikka & fundamentin **sisältö valmis** → hae
`TM_TT_FUNDAMENTIT[pos]`:sta konseptia vastaava fundamentti (faasi/teema-match). Muuten → pelkkä youth-konsepti.

### A.7 Y-H4 / Y-H7 (§5c e) — koodikommentti
Y-H4 (Harhauttaminen) EI mäppäydy D2:sta (orpo `dribbling`-poiston jälkeen) — syntyy D4-pelihavainnosta (1v1). Y-H7 taktinen/
palloton (D4). Kommentoi ettei kehittäjä lisää niitä D2-karttaan.

## B · KYTKENNÄT (VP_v25 + Master_v16)
1. **Toimintakortti esivalinta tavoitteesta.** `_ttKorttiHTML` (Master:5346) / `_vpTtKorttiHTML` (VP:4868): kun pelaajalla on
   aktiivinen IDP-tavoite (`idp_fokus`), esivalitse konsepti = `tmRatkaiseKehityspolku(p.idp_fokus, p)` (nyt esivalinta = items[0]/
   edellinen jaksofokus, **ei koskaan tavoite**). Näytä yläpuolella "Tavoitteesta ehdotettu: X".
2. **Hillitty poikkeamavaroitus.** Jos valmentaja valitsee konseptin ≠ ehdotettu → näytä huomio "Tämä poikkeaa tavoitteesta
   (…). Asiantuntijan valinta kirjataan." **Sallitaan aina, ei vaadi perustelua.**
3. **Takaisinlinkki.** Tallenna `jaksofokus.tavoite_alue = idp_fokus.alue` (+ `poikkeama:true` jos eri). Tekee "ladderista" todeksi.
4. **"Ladder" todeksi.** VP:5430 / Master:5377 koristeteksti → oikea ketju tavoite → konsepti → seuraava harjoite (lue kentät).
5. **I2:n IDP-silta jatkoksi.** "＋ IDP-tavoite" -luonnin jälkeen tarjoa "→ Harjoittele näin" (resolverin konsepti + harjoite).

## C · JOUSTAVUUS (§5b)
### C.1 Kesto käsin asetettava
`kesto_vk` on nyt kovakoodattu 4 (idpRakennaTavoite / jaksofokus / `_ttVieTreeniin`). Muutos: **kenttä valmentajan
asetettavaksi** (oletusehdotus esim. 6, vapaa 4–8+). Jakso **ei sulkeudu automaattisesti** 4 viikossa — `tmJfUmpeutunut`
(`lib/tm_jaksofokus.js`) käyttää **asetettua kestoa**, ei kiinteää 4:ää. Sulku = valmentaja päättää tai aika umpeutuu.

### C.2 Valinnaiset välitavoitteet (additiivinen)
`tavoite.valitavoitteet: [{ nimi, konsepti_avain, kesto_vk, tila:'avoin'|'aktiivinen'|'saavutettu', jarjestys }]` — **tyhjä
oletuksena**. Tyhjä → tavoite toimii kuten tänään. Täytetty → resolver voi ehdottaa konseptipolun (esim. Haltuunotto →
Tempokuljetus → Harhautus), valmentaja lisää/muokkaa/poistaa vapaasti; aktiivinen välitavoite → jaksofokus. Kausitavoite
valmistuu kun polku kuljettu tai valmentaja merkitsee saavutetuksi. Käänteiskartta (§5c f) näyttää "konsepti kehittää näitä kohteita".

### C.3 Pelipaikkaportti joustavaksi (U14→U15)
`tmTtVaihe` (`lib/tm_teknistaktiset.js:4784`) avaa nyt kovalla ika≥15. Muutos: **pelipaikkavaihe = pelipaikka asetettu JA
ika ≥ ~14** (aikainen erikoistuja), U15 = viimeistään standardi. Ei kovaa katkaisua. **Näytä fundamentti vasta kun sisältö
valmis** (cue/harjoite/kpi) — muuten pysy youth-konsepteissa (arvoijan P1.5).

## D · SELATTAVA REFERENSSI — "mitä pelaajan tulee osata"
Uusi kevyt näkymä pelaajakortille: `tmTtItems(p)` koottuna, ryhmiteltynä (hyökkäys / puolustus / **havainnointi läpileikkaavana**),
kukin konsepti: nimi + cue + harjoite + **tila** (aktiivinen jaksofokus / katettu historiassa / avoin). Vastaa "mistä VP/valmentaja
löytää konseptit joita pelaaja tulee osata". Youth kaikille; fundamentit näkyviin §C.3-portin mukaan.

## E · HARJOITE-TÄGIT (uusi rakenne — §5c c/d)
`tmTtHarjoitteet` ei nyt tägitä laukaustyyppiä/jalkaa. Lisää harjoitteille valinnaiset:
`tagit:['placement'|'power'|'first-time'|'variety'…]` + `jalka:['dominoiva'|'heikompi'|'molemmat']`. Kun resolver antaa Y-H9 +
`harjoite_tagit`, harjoitevalinta suodattaa tägeillä. Ilman tägejä: Y-H9 toimii ilman kohdennusta (ei rikkoudu). **Tägi-sisällön
täydennys** (mitkä harjoitteet saavat mitkä tägit) = pieni erillinen sisältötyö; koodi tukee rakenteen.

## F · Rajaus (EI I3a:ssa)
- **I3b** — VP-oversight (kohdistuuko jakso tavoitteeseen, poikkeama-raportti).
- **Brändijako** (Palloliitto × TM) = erillinen brief.
- Fundamenttien sisällön täydennys + harjoite-tägien täyttö = sisältötyö (valmentajakoulutus), ei tämä.
- Palloliiton taksonomian muutos → ei.

## G · Verifiointi + DoD
- **Resolver (Vitest):** D2 14 kohdetta → oikea konsepti/tulosmittari; D4 → KARTTA_A-tulos; D1 → 'fyysinen'; D3/D5 → 'laadullinen';
  tulosmittari (efficiency) → ei konseptia; havainnointi_vihje teknisille; fundamentti vain U14+/pelipaikka/sisältö.
- **Live (toimintakortti):** aktiivinen tavoite → konsepti esivalittu tavoitteesta; poikkeama → hillitty huomio (ei estä);
  `jaksofokus.tavoite_alue` tallentuu; "ladder" näyttää oikean ketjun.
- **Joustavuus:** kesto asetettavissa (ei pakkosulku 4 vk); välitavoitteet valinnaisia (tyhjä → ennallaan); pelipaikka U14+.
- **Referenssi:** "mitä pelaajan tulee osata" listaa konseptit + tila; havainnointi läpileikkaavana.
- **Ei regressioita:** olemassa olevat jaksofokukset/tavoitteet toimivat; `npm test` + lint + selain. **Rules: ei muutosta.**
- **Testipelaaja:** Topias (KPV) — kirjoitukset OK. Eino/Leo (oikeat alaikäiset) = vain luku.
- **Merge vasta kun Tero sanoo "live".** Branch `feat/i3a-loginen-silta`.

## H · Työjärjestys Codelle
1. `lib/tm_kehityspolku.js` — resolver (dispatch + D2-kartta + KARTTA_A-aktivointi + tulosmittari + havainnointi_vihje + fundamentti). Vitest.
2. SILTA_MAP korjaus/yhdistäminen (poista orvot avaimet; taksonomian mukaiseksi) — tai korvaa resolverilla.
3. Toimintakortti: esivalinta tavoitteesta + hillitty poikkeamavaroitus + `tavoite_alue`-takaisinlinkki (VP + Master).
4. Kesto käsin asetettavaksi (idpRakennaTavoite/jaksofokus/tmJfUmpeutunut — asetettu kesto, ei kiinteä 4).
5. Valinnaiset välitavoitteet (`tavoite.valitavoitteet[]` additiivinen + UI lisää/muokkaa; aktiivinen → jaksofokus).
6. Pelipaikkaportti joustavaksi (tmTtVaihe U14+ pelipaikkavetoinen + sisältövalmius-gate).
7. "Ladder" todeksi + I2-sillan jatko ("→ Harjoittele näin").
8. Selattava "mitä pelaajan tulee osata" -näkymä.
9. Harjoite-tägi-rakenne (tagit + jalka; sisältö erikseen).
10. Verifiointi §G → raportoi git + emulaattori + selain (ei "valmis" ilman koodia).
