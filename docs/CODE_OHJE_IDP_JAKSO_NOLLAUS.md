# CODE — IDP: Jakso-sidonnainen sitoumuksen nollaus + itsearvio-snapshot (Option A)

**Tyyppi:** Toiminnallisuus, molemmat apit + jaksofokus-arkistointi. **Yksi PR.**
**Kohteet:** `TalentMaster_Pelaaja_v7.html` (sitoumus + itsearvio) · `TalentMaster_VP_v25.html` (vahvistus + D3-merkki + arkistointi).
**Design-totuus:** hyväksytty `idp_jakso_nollaus.html`. Ohje on itsenäinen.
**Ydin:** jakson identiteetti = `jaksofokus.alkoi` (ISO-aikaleima). Sitoumus **nollautuu ja arkistoituu** joka uudella jaksolla; itsearvio **ei pyyhkiydy** vaan snapshotataan + pyytää päivitystä.

## Miksi

Sitoumus (`pelaaja_sitoumus`) on tekstillä jaksoon sidottu ("Sitouduit jaksoon [fokus]") mutta **ei nollaudu** kun jakso vaihtuu: vanha q1–q3 + vahvistus jäävät roikkumaan uuteen jaksoon vääränä. Itsearvio (`d3_viimeisin`) taas ei saa nollautua (triangulaatio + kehityskaari nojaavat jatkuvuuteen), mutta valmentaja ei tällä hetkellä näe onko pelaajan sarake tältä vai edelliseltä jaksolta. Lisäksi nykyinen arkistointi (`_vpJfArkistoiVaihdossa`) laukeaa **vain domeenin vaihtuessa** (Emil-törmäys-suoja) — sama-domeeninen uusi jakso ylikirjoittaa vanhan **hiljaa** ilman arkistointia. Option A korjaa kaikki kolme: per-jakso reset (sitoumus), snapshot + pehmeä päivityskehote (itsearvio), ja arkistointi joka uudella jaksolla (ei vain domeenin vaihdossa).

## Omistajuusmalli (roolit)

- **Omistava valmentaja vahvistaa** sitoumuksen: tavallisella pelaajalla joukkueen valmentaja, **talenttipelaajalla talenttivalmentaja** (`_valmentajat[].rooli` = `talenttivalmentaja`). VP näkee & valvoo.
- D3-triangulaatio = **pelaaja × valmentaja × VP** (kolme saraketta). Vain **pelaajan** sarake ikämerkitään jaksovanhentumisella; valmentajan ja VP:n sarakkeet pysyvät ja päivittyvät normaalisti.
- **Ei uutta omistajuus-datamallia tässä PR:ssä.** Jos omistava valmentaja on jo resolvoitavissa olemassa olevasta datasta (esim. pelaajan valmentaja / `rooli:'talenttivalmentaja'` talenteille), rajaa vahvistusnappi omistajalle + VP:lle; jos ei resolvoidu, mikä tahansa valmennuspuolen käyttäjä voi vahvistaa ja **rooli kirjataan** (`vahvistaja_rooli`). Älä blokkaa tätä PR:ää omistajuus-datan varaan.

## Mitä tehdään

### A. Jakson identiteetti + vanhentumislogiikka (jaettu käsite)

Jakson tunniste on **`jaksofokus.alkoi`** (raaka kenttä pelaaja-dokissa; VP:n set-polut leimaavat sen, ks. rivit 4111/4229/4735/5791). Molemmissa apeissa:

- **"Nykyinen jakso alkoi"** = `_pelaaja.jaksofokus.alkoi` (Pelaaja) / `p.jaksofokus.alkoi` (VP).
- **Vanhentumis-predikaatti** (sitoumus/itsearvio): tietue on vanhentunut **vain jos** sen tallennettu `jakso_alkoi` on **olemassa JA eri** kuin nykyinen `jaksofokus.alkoi`.
  - **Legacy-suoja (kriittinen, additiivinen/ei-migraatio):** jos tietueen `jakso_alkoi` **puuttuu** (vanha data), sitä **EI** kohdella vanhentuneena — se adoptoidaan nykyjaksoon ja `jakso_alkoi` leimataan seuraavalla tallennuksella. Muuten kaikki nykyiset pelaajat saisivat deployssä väärän "uusi jakso, sitoudu uudelleen" -kehotteen.
  - Jos nykyinen `jaksofokus.alkoi` puuttuu (ei jaksofokusta / legacy-fokus ilman alkoi-kenttää), **ei pakoteta** vanhentumista (ei false-resettejä).

### B. Sitoumus — täysi nollaus per jakso (`TalentMaster_Pelaaja_v7.html`)

**B1. `jakso_alkoi`-kenttä sitoumukseen.** `_tallennaSitoumus` (~1968): kirjoita `sit.jakso_alkoi = (_pelaaja.jaksofokus && _pelaaja.jaksofokus.alkoi) || null`. Kenttä on `pelaaja_sitoumus`-olion sisällä (sama top-level-avain → **ei Rules-muutosta**).

**B2. Tuore vs. muokkaus (nollaus-logiikka).** Nykyinen `sitoumus_pvm`/`vahvistettu_pvm`-säilytys (`prev.sitoumus_pvm || new`) pätee **vain kun sama jakso** (`prev.jakso_alkoi === nykyinen alkoi`, legacy-puuttuva = sama). **Uudella jaksolla** (vanhentunut per A): aloita puhtaalta — uusi `sitoumus_pvm = new Date().toISOString()`, `vahvistettu_pvm = null`, `jakso_alkoi =` nykyinen alkoi. Näin vahvistus resetoituu automaattisesti jaksoittain.

**B3. Renderöinti `rMinaSitoumus` (~1923).** Kun sitoumus on **vanhentunut** (per A):
- Älä esitäytä `ia.q1/q2/q3` vanhoilla vastauksilla (tyhjät `textarea`t).
- Älä näytä "Sitouduit jaksoon [pvm] · odottaa/vahvisti" -tilalaatikkoa eikä "Päivitä vastaukseni" -nappia; näytä **"Sitoudun tähän jaksoon 💚"** (tuore) + design-totuuden **✨-banneri**: "Edellinen sitoumuksesi ([edellinen fokus] -jaksolle) on arkistoitu talteen. Tämä on uusi jakso — vastaa uudestaan omin sanoin."
- Otsikko/vihje kuten design: eyebrow "🤝 Sinun äänesi & sitoumus" + "Uusi jakso alkoi — sitoudu tähän" + "📍 Jaksofokus: [nimi] · alkoi [pvm]".
- **Sama jakso** (ei vanhentunut) → nykyinen käytös ennallaan (esitäyttö + "Päivitä vastaukseni").

### C. Itsearvio — ei pyyhitä, pehmeä päivityskehote (`TalentMaster_Pelaaja_v7.html`)

**C1. `jakso_alkoi` snapshotiin.** `_tallennaItsearvio` (~1870): leimaa `d3v.jakso_alkoi = (_pelaaja.jaksofokus && _pelaaja.jaksofokus.alkoi) || null` **`d3_viimeisin`-olion sisään**. Rules sallii jo `d3_viimeisin`-top-level-avaimen (`hasOnly(['d3_viimeisin','d3_taso','d3_pvm','d3_varmuus'])`) → nested `jakso_alkoi` läpäisee, **ei Rules-muutosta**.

**C2. Pehmeä kehote (ei nollausta).** Itsearvio-renderöinnissä (~1837–1859): kun `d3_viimeisin` on vanhentunut (per A: `d3_viimeisin.jakso_alkoi` olemassa JA eri kuin nykyinen alkoi) → näytä design-totuuden **🔶-banneri**: "Tämä arvio on edelliseltä jaksolta. Se näkyy yhä — käy katsomassa tuntuuko jokin kohta nyt erilaiselta ja päivitä halutessasi." Arvot **pysyvät näkyvissä ja muokattavissa**, nappi "Päivitä arvioni". **Ei tyhjennystä, ei arvojen resetointia.** Legacy-puuttuva jakso_alkoi = ei kehotetta.

### D. Arkistointi joka uudella jaksolla — sitoumus + D3 snapshot (`TalentMaster_VP_v25.html`)

**D1. Laajenna arkistoinnin laukaisin.** `_vpJfArkistoiVaihdossa(p, uusiDomeeni)` (~5819) arkistoi nyt vain domeenin vaihtuessa. Laajenna: arkistoi vanha jaksofokus kun se **korvataan eri jaksolla** = domeeni vaihtuu (nykyinen Emil-suoja) **TAI** uusi jakso on eri identiteetti (`vanha.alkoi` && `uusi.alkoi` && `uusi.alkoi !== vanha.alkoi`). **Sama-jakso-muokkaus** (sama `alkoi`, esim. P4b `tavoite_tarkenteet`-merge tai kesto-editointi) **ei saa** arkistoida (ei duplikaatteja historiaan). — Käytännössä lisää jakso-identiteetti-predikaatti domeeni-predikaatin rinnalle; välitä uusi `alkoi` arkistointifunktiolle (set-poluilla se on juuri leimattu).

**D2. Rikasta historia-merkintä.** Kun arkistoidaan (D1), liitä historia-entryyn parhaan saatavuuden mukaan:
- `sitoumus_snapshot`: `{ q1,q2,q3, sitoumus_pvm, vahvistettu_pvm, jakso_alkoi }` lähteestä `p._idpSitoumus` (ladattu kun IDP-kortti auki, rivi 4679). Jos ei ladattu → jätä pois (best-effort, ei estä arkistointia).
- `d3_snapshot`: `p.d3_viimeisin.pisteet` (pelaajan itsearvio jakson sulkeutuessa) → syöttää kehityskaaren (itsetuntemuksen kehitys jaksojen yli). Jos ei saatavilla → jätä pois.
- Kirjoitetaan `jaksofokus_historia`-taulukon osana samalla `_vpTtKirjoita`-mergellä (Rules §12 sallii `jaksofokus` + `jaksofokus_historia`; nested sub-kentät läpäisevät affectedKeys top-level -tarkistuksen). **Ei Rules-muutosta.**

### E. VP-kortti — per-jakso vahvistus (roolitietoinen) + D3-merkki (`TalentMaster_VP_v25.html`)

**E1. Vahvistus omistavalle valmentajalle.** `_vpSitoumusHTML` (~4747) / `_vpVahvistaSitoumus` (~4771):
- Vaihda tekstit "VP vahvisti" / "odottaa VP:n vahvistusta" → **"valmentaja vahvisti" / "odottaa valmentajan vahvistusta"** (linjaan Pelaaja-apin kanssa; omistava valmentaja = vahvistaja). Näytä että vahvistus koskee **nykyistä jaksoa** (fokus-nimi + alkoi-pvm rivillä).
- `_vpVahvistaSitoumus`: tallenna `vahvistettu_pvm` + **`vahvistaja_rooli`** (nykyisen käyttäjän rooli) `pelaaja_sitoumus`-olioon (sama top-level-avain, ei Rules-muutosta). Omistajuus-rajaus per "Omistajuusmalli" (best-effort; älä blokkaa datan varaan).
- **Per-jakso automaattinen reset:** koska sitoumus nollautuu (B2) `vahvistettu_pvm = null` uudella jaksolla, vahvistus näkyy automaattisesti "odottaa" -tilassa uudelle jaksolle. Ei erillistä nollauskoodia vahvistukseen.

**E2. D3 "edellinen jakso" -merkki.** D3-kalibraation renderöinnissä (`_vpD3KalibraatioHTML` / `renderD3VertailuHTML`-käyttö): kun pelaajan `d3_viimeisin` on vanhentunut (per A) → merkitse **vain pelaajan (PEL) sarake** design-totuuden mukaan ("pelaajan sarake: edellinen jakso" -chip + ◷-merkki arvon vieressä + pehmeä "tulkitse varoen kunnes pelaaja päivittää"). **Valmentajan (VAL) & VP:n sarakkeet pysyvät** ennallaan. Legacy-puuttuva jakso_alkoi = ei merkkiä.

## Reunaehdot

- **Additiivinen / ei migraatiota:** vain uudet nested-kentät (`pelaaja_sitoumus.jakso_alkoi`, `pelaaja_sitoumus.vahvistaja_rooli`, `d3_viimeisin.jakso_alkoi`, `jaksofokus_historia[].sitoumus_snapshot`/`.d3_snapshot`) + arkistoinnin laukaisimen laajennus. Vanha data toimii sellaisenaan (legacy-suoja A). Ei taustaskriptiä.
- **Ei Rules-muutosta (verifioi):** kaikki uudet kentät ovat jo sallittujen **top-level-avainten** sisällä — pelaaja: `pelaaja_sitoumus` (idp_kausi) + `d3_viimeisin`/`d3_*`; VP/valmentaja: `pelaaja_sitoumus` (vahvistus) + `jaksofokus`/`jaksofokus_historia`. `affectedKeys().hasOnly([...])` näkee vain top-level → nested-lisäykset läpäisevät. **Jos jokin write kaatuu Rulesiin, pysähdy ja raportoi — älä laajenna Rulesia ilman erillistä hyväksyntää.**
- **Ei cache-bumppia libeihin** ellei arkistoinnin laajennus vaadi muutosta `lib/tm_jaksofokus.js`- tai `lib/tm_jaksokooste.js`-tiedostoon; jos vaatii, bumppaa vain kyseinen `?v=`.
- **Ei regressiota:** sama-jakso-muokkaus ei arkistoi (D1); nykyinen domeenin-vaihto-arkistointi (Emil-suoja) säilyy; P4b `tavoite_tarkenteet` + kesto-editointi eivät laukaise resettiä/arkistointia (sama alkoi).
- **Degradaatio:** demo/ei-Firestore-polut (localStorage Pelaaja, `_isDemoMode` VP) toimivat kuten ennen; snapshotit best-effort (puuttuva data → jätä pois, ei kaadu).
- **Alaikäiset read-only** (Eino·Leo·Emil): VP-puolen vahvistus/arkistointi eivät kirjoita heidän pelaajakirjoituksiaan (vain valmennuspuolen kentät); **Topias = testi-OK** kirjoitukseen.
- **Brändi:** design-totuus `idp_jakso_nollaus.html` — molemmat teemat, hiusrajat, terävät kulmat; ✨ tuore-sitoumus-banneri (teal-sävy), 🔶 itsearvio-vanhentuma (amber), ◷ ikämerkki, roolimerkinnät. Pelaajan lause = kursiivi-serif.
- **Mobiili §6:** Pelaaja-appi on jo mobiili; VP-kortti pinoutuu.

## EI tässä
- **Uusi omistajuus-datamalli** (pelaaja↔valmentaja-sidonta) — käytä olemassa olevaa; best-effort rajaus.
- **Erillinen valmentaja-näkymä/appi** — sama VP-kortti roolimerkinnöin (käyttäjän valinta: option 1).
- **Kehityskaaren visualisointi** `d3_snapshot`-datasta — tämä PR vain **kerää** snapshotin; visualisointi erikseen.
- **P4b/P4c/P5** — erikseen.

## DoD
1. **Jakso-identiteetti:** molemmat apit lukevat nykyjakson `jaksofokus.alkoi`; vanhentumis-predikaatti = tallennettu `jakso_alkoi` olemassa **JA** eri. **Legacy-puuttuva jakso_alkoi ei laukaise resettiä/kehotetta/merkkiä** (verifioitu: nykyinen data ei saa väärää "uusi jakso" -tilaa deployssä).
2. **Sitoumus-nollaus:** uudella jaksolla Pelaaja-appi näyttää tuoreen tyhjän sitoumuslomakkeen + ✨-arkistobannerin (ei vanhaa tekstiä, ei "Päivitä vastaukseni"); tallennus kirjaa uuden `sitoumus_pvm` + `jakso_alkoi` + `vahvistettu_pvm=null`. Sama jakso → nykyinen muokkauskäytös ennallaan.
3. **Itsearvio-jatkuvuus:** vanhentunut itsearvio näkyy **muokattavana** + 🔶-päivityskehote; **ei tyhjennystä**; tallennus leimaa `d3_viimeisin.jakso_alkoi`.
4. **Arkistointi:** uusi jakso (myös **sama domeeni**, eri alkoi) arkistoi vanhan jaksofokuksen `jaksofokus_historia`an `sitoumus_snapshot` + `d3_snapshot` -rikastuksella (best-effort); **sama-jakso-muokkaus ei arkistoi** (ei duplikaatteja).
5. **Vahvistus roolitietoinen + per jakso:** VP-kortti sanoo "valmentaja vahvisti / odottaa valmentajan vahvistusta", tallentaa `vahvistaja_rooli`; vahvistus resetoituu uudelle jaksolle automaattisesti (odottaa-tila).
6. **D3-merkki:** VP-kalibraatiossa vain **pelaajan (PEL) sarake** saa "edellinen jakso" ◷-merkin kun itsearvio vanhentunut; VAL & VP pysyvät.
7. **Ei uutta Rules-tarvetta** (kaikki nested sallittujen top-level-avainten alla — verifioitu); ei migraatiota; ei regressiota (domeeni-vaihto-arkistointi + P4b-editointi + demo-polut toimivat).
8. **Verifioi live (Topias):** aseta uusi jaksofokus (uusi alkoi) → Pelaaja-appi pyytää tuoretta sitoumusta + itsearvio pysyy + 🔶-kehote; VP-kortti "odottaa valmentajan vahvistusta" + D3 PEL-sarake ◷; vanha jakso `jaksofokus_historia`ssa sitoumus+d3-snapshotilla. Molemmat teemat, 0 konsolivirhettä. **Verifioi ennen mergeä.**
9. Keskikokoinen PR; kuvaus linkkaa `idp_jakso_nollaus.html` + tämä ohje.
