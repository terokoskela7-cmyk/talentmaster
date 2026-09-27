# CODE BRIEF · Arviointihistoria + useampi arvioija (Palloliiton pelaajakortti)

> **Kenelle:** Code. **Laatija:** Claude (riippumaton suunnittelija), Teron linjaus 27.9.2026:
> *"Havainnot jäävät historiaan. Trendit ovat tärkeitä. Eri tarkkailijoiden havainnot ovat kiinnostavia — miksi joku näkee pelaajan näin ja toinen toisin."*
> **Mockup (tavoitenäkymä):** `ARVIOINTI_HISTORIA_MOCKUP.html` (Claude outputs). Neljä välilehteä: Trendit · Arvioijat · Potentiaali · Kaikki arviointikerrat.
> **Liittyy:** CLAUDE.md §7.22 · §11 · §12/§15 (Rules) · §26 (pikakentät) · §28 (PHV) · §37 (arviointikehys ≠ curriculum) · `docs/PALLOLIITTO_PELAAJAKORTTI_TAKSONOMIA.md` · `lib/tm_arviointi_taksonomia.js` · D3-kalibraatio (`_vpD3KalibraatioHTML`, Aukko ≥ 1.5).
> **Status:** VALMIS CODELLE (H1). Teron päätökset 27.9.2026 kirjattu §9:ään. Avoinna vain maalivahdit (Tero selvittää) ja säilytysaika.

---

## 0. Lähtötila (todennettu `origin/main` f5d8c17)

| Asia | Nyt | Ongelma Teron linjauksen kannalta |
|---|---|---|
| Havaittu 1–5 -tallennus | `VP_v25 _vpTallennaHavaittu` → `pelaajat/{pid}/arviointi/{kausiId}` `set({havaittu:{[avain]:{arvo,pvm,arvioija_uid,lahde:'silma'}}},{merge:true})` + pikakenttä `arviointi_havaittu[avain]` | **Kauden sisällä viimeisin arvio korvaa edellisen**, myös toisen arvioijan arvion. Historia katoaa. |
| Kausien välinen historia | yksi `arviointi/{kausi}`-doc per kausi | Säilyy vain kauden viimeinen tila per kohde. **Kukaan ei lue näitä doceja** (grep: ainoa `collection('arviointi')`-viittaus on kirjoitus) → trendinäkymää ei ole. |
| Kirjoittajat | vain VP_v25 (Master ja Pelihavainto_Palloliitto eivät kirjoita) | — |
| Potentiaali 1–5★ | pikakentät `scout_potentiaali*` (yksi arvo + arvioija + pvm), johto-only | **Ei historiaa, yksi arvioija kerrallaan.** Ei varmuutta. |
| Arvion konteksti | ei tallennu | Mistä ottelusta, millä pelipaikalla, kuinka monta kertaa nähty, kypsyysvaihe → **"miksi"-kysymykseen ei voi vastata**. |
| ADAR-havainnot | omat docit `havainnot/{id}` | ✅ historia säilyy jo (ei muutosta). |
| Rules | `match /arviointi/{kausiId}`: read johto+valmentajat, create/update johto + oman joukkueen valmentaja | Uusi alikokoelma tarvitsee **oman match-blokin** (§7.15). Rulesissa **ei ole Palloliitto-käyttäjää** (ei `palloliitto`-kokoelmaa eikä -funktiota). |
| Kausi | `_vpTkKausi()` (VP_v25:17332) = **heinä–kesä** ("2026/27"). Käytössä arviointitallennuksessa + VP-tuloskortissa (kausitavoitteet) | ⚠ **Väärin Suomessa:** Suomen jalkapallokausi = **kalenterivuosi** (Tero 27.9.). Heinä–kesä on eurooppalainen sykli. Syyskuun 2026 arvio on tallentunut kaudelle "2026-27". |

## 1. Periaatteet (EHDOTTOMAT)

1. **Append-only.** Arviointikertaa ei korvata eikä poisteta. Arvioija voi korjata omaa kertaansa 24 h sisällä; alkuperäinen arvo säilyy `korjaukset[]`-kentässä. Poisto vain SA:lla (GDPR-poistopyyntö, B4) CF:n kautta.
2. **Arvio kuuluu arvioijalle.** Jokainen kerta = yksi arvioija + yksi konteksti. Ei yhteistä "seuran arvosanaa", joka ylikirjoittuu.
3. **Konteksti tallennetaan arviohetkellä (tilannekuva).** Ikä, PHV-tila, joukkue ja pelipaikka arviohetkellä → trendin ja erojen tulkinta ei riipu nykytilasta (sama periaate kuin METODOLOGIA-INVARIANTTI: taso = tilannekuva testihetken iästä).
4. **Ikäsuhteutettu asteikko näkyy tulkinnassa.** Tasainen 3 = kehittyy ikätovereiden tahtia. Nousu = nopeammin. UI sanoo tämän aina trendin yhteydessä.
5. **Ero ei ole virhe.** Arvioijavertailu näyttää hajonnan ja kontekstierot, ei "oikeaa" arvoa. Ero ≥ 1,5 = keskustelunaihe (sama raja kuin D3-kalibraatio).
6. **§7.22:** historia, trendit ja arvioijavertailu ovat aikuisten näkymä (VP, johto, valmentajat, Palloliiton arvioijat). EI pelaaja-/huoltaja-appiin, EI Pelaaja_v7:n eikä Vanhempi_v2:n lukupolkuihin.
7. **Riippumattomuus ennen vertailua.** Arvioija EI näe muiden arvioita kirjaamisen aikana (ankkuroitumisharha: muuten arviot lähenevät toisiaan ja "miksi"-tieto katoaa). Muiden arviot ja ero näytetään vasta, kun oma kerta on tallennettu.
8. **Pelaaja omistaa datan, ja historia kulkee pelaajan mukana** (Tero 27.9.). Arviointikerta on pelaajan historiaa, ei seuran. Perhe antaa luvat rekisteröityessä. Seurasiirto on oma kokonaisuutensa (§11), mutta H1:n datamallin on tuettava sitä.
9. **§26 säilyy:** dashboardit ja listat lukevat pikakentistä. Alikokoelmaa luetaan vain, kun käyttäjä avaa pelaajakortin Historia-näkymän (drill-down).

## 2. Datamalli

### 2.1 Uusi alikokoelma `seurat/{sid}/pelaajat/{pid}/arviointikerrat/{kertaId}`

```
{
  kehys: 'palloliitto',
  kausi: '2026',                        // UUSI tmKausi(pvm, kausimalli) lib:ssä (§2.4). Suomi = kalenterivuosi. EI _vpTkKausi().
  palloId: string|null,                 // PalloID tilannekuvana → historia kulkee mukana seurasiirrossa (§11)
  seuraId_arviohetkella: string,        // missä seurassa pelaaja oli, kun arvio tehtiin (säilyy siirrossa)
  nakyvyys: 'seuralle'|'sisainen',      // seuran arvioijat: aina 'seuralle'. Palloliiton arvioija valitsee:
                                        // 'sisainen' = vain Palloliitto · 'seuralle' = jaettu seuralle. Sama malli kuin
                                        // järjestelmän nykyinen SISÄINEN/JAETTU (VP-mentorointi `nakyvyys`, VP_v25:14858)
  pvm: ISO-string,                      // arviointipäivä (voi olla menneisyydessä: ottelun pvm)
  luotu: serverTimestamp(), paivitetty: serverTimestamp(),

  arvioija_uid, arvioija_nimi,          // nimi tilannekuvana (henkilö voi vaihtaa seuraa)
  arvioija_rooli: 'vp'|'valmentaja'|'talenttivalmentaja'|'palloliitto'|'scout',
  arvioija_org: 'seura'|'palloliitto',

  konteksti: {
    tyyppi: 'ottelu'|'turnaus'|'harjoitus'|'leiri'|'video'|'kooste',
    kuvaus: string|null,                // "P13 sarjaottelu", "Alueturnaus"
    taso_ottelu_id: string|null,        // TASO-integraatio (kun valmis)
    pelipaikka: string|null,            // pelipaikka JOLLA pelasi tässä (≠ paras pelipaikka). ENUM samasta listasta kuin
                                        // pelaajan `positio` (ei vapaata tekstiä) → "eri pelipaikka" -tekijä toimii
    minuutit: number|null,
    vastustajataso: 'oma'|'vanhemmat'|'nuoremmat'|null
  },
  tilannekuva: {                        // kirjoitushetkellä pelaajadocista, EI käyttäjän syöte
    ika: number, phv_tila: 'PRE'|'LAH'|'PH'|'POST'|'AN'|null, rae_kvartaali: 'Q1'..'Q4'|null,
    kehitysvaihe_kaista: 'pre'|'circa'|'post'|null, joukkue: string
  },

  kohteet: { [taksonomia-avain]: { arvo: 1..5 | 'NA', perustelu?: string } },
                                        // puuttuva avain = EI NÄHTY tällä kerralla (ei laske trendiin eikä kattavuuteen)
                                        // 'NA' = EI SOVELLU tälle pelaajalle (esim. maalivahti, §9) — eri asia kuin ei nähty
  potentiaali: { tahdet: 1..5, varmuus: 'alustava'|'kohtalainen'|'vahva' } | null,

  naytto: { kentta_sessiot: [id], merkintoja: number } | null,   // H4, kenttätyökalu Vaihe 3:n jälkeen
  korjaukset: [{ pvm: ISO, avain, vanha, uusi }]                  // ISO-string, EI serverTimestamp arrayssa (§7.6)
}
```

**Kirjoitus-UX säilyy klikkaa-ja-tallentuu-mallina:** ensimmäinen klikkaus Arviointi-välilehdellä avaa "arviointikerran" (oletuskonteksti `kooste`, kontekstirivi esitäytetty ja muokattavissa: Ottelu / Turnaus / Harjoitus / Leiri + pelipaikka + minuutit + vastustajataso). Saman kerran kohteet tallentuvat samaan dociin (`set merge`) niin kauan kuin kerta on auki (sama arvioija, sama päivä, < 24 h). Uusi päivä tai uusi konteksti → uusi kerta. Perustelu on valinnainen. **Tallennuksen jälkeen** (ei ennen, periaate 7) UI näyttää, jos arvo poikkeaa ≥ 1,5 toisen arvioijan viimeisimmästä, ja tarjoaa perustelun lisäämistä 24 h ikkunan sisällä. Kentän vihje: *"Kirjoita niin, että voisit näyttää tekstin huoltajalle"* (pelaaja omistaa datan, §9).

### 2.2 Pikakentät (§26), päivitetään atomisesti samassa batchissa kuin kerta (pari-invariantti)

- **Pikakentät ja kooste lasketaan VAIN `nakyvyys:'seuralle'`-kerroista.** Pelaajadoc on seuran luettavissa, joten Palloliiton sisäinen arvio ei saa vuotaa pikakentän kautta. Palloliiton oma näkymä laskee sisäisten kertojen koosteen alikokoelmasta (drill-down).
- `arviointi_havaittu[avain]` = **seuran omien arvioijien (`arvioija_org:'seura'`) viimeisin arvo**. IDP-silta (`tmSiltaEhdota`) ja Masterin jaksofokus-ehdotus lukevat tätä → ulkopuolisen arvioijan (Palloliitto) yksittäinen arvio EI käännä valmentajan jaksofokus-ehdotusta. Palloliiton arviot näkyvät koosteessa ja Arvioijat-näkymässä. Seuran sisällä semantiikka ennallaan, joten Master, PDC ja silta eivät muutu.
- UUSI `arviointi_kooste[avain] = { viimeisin, mediaani, n, arvioijia, min, max, pvm }`. Mediaani ja hajonta lasketaan **kunkin arvioijan viimeisimmästä arvosta viimeisen 12 kk ajalta** (liukuva ikkuna, EI kausiraja: kausi vaihtuu 1.7., ja kausirajainen vertailu tyhjenisi elokuussa). Dashboard-signaali "ero ≥ 1,5" luetaan tästä ilman alikokoelmakyselyä.
- `scout_potentiaali*` säilyy (= viimeisin), uusi `potentiaali_kooste = { tahdet_mediaani, arvioijia, n, varmuus_viimeisin }`.
- **Suositus:** koosteen laskee **CF-trigger `arviointikertaOnWrite`** (europe-west1, `firebase-functions/v1`), joka lukee pelaajan viimeisen 12 kk kerrat. Yksi totuus, ei client-driftiä (ADAR-replikaatio §26 on juuri se ongelma, jota ei haluta toistaa). CF on myös ainoa paikka, joka näkee sisäiset kerrat ja voi silti suodattaa ne pois seuran koosteesta. Siksi clientin laskema kooste ei riitä, kun Palloliiton arviot ovat mukana.

### 2.3 Vanha `arviointi/{kausiId}`
Lopeta kirjoitus H1:ssä. Migraatio `scripts/migrate_arviointi_kerrat.js` (idempotentti, dry-run oletus): jokaisesta kausi-docista yksi kerta per `arvioija_uid` ja `konteksti.tyyppi:'kooste'`, `nakyvyys:'seuralle'`, `tilannekuva` null (ei tiedossa jälkikäteen → UI "konteksti puuttuu"). **Kausi johdetaan kohteen `pvm`:stä `tmKausi`:lla, EI doc-ID:stä** (vanha ID "2026-27" on heinä–kesä-mallin mukainen). Vanhat docit jäävät read-only-arkistoksi.

### 2.4 Kausi — `tmKausi(pvm, kausimalli)` (uusi, `lib/tm_arviointi_historia.js` tai yhteinen kausilib)
`kausimalli: 'kalenteri'` (oletus, Suomi) → `'2026'` · `'heina_kesa'` (kv, Eurooppa) → `'2026-27'`. Malli luetaan seuran konfiguraatiosta (`seurat/{sid}.kausimalli`, puuttuu → johdetaan `maa`-kentästä: FI → kalenteri). Trendien puolivuotisjako Suomessa = kevät (tammi–kesä) · syksy (heinä–joulu). Arvioijavertailun 12 kk ikkuna ei riipu kausimallista.
**Löydös, EI tämän briefin korjattava:** `_vpTkKausi()` on väärin Suomessa myös VP-tuloskortissa (kausitavoitteet tallentuvat avaimella "2026/27"). Sen korjaus vaatii tavoitteiden avainmigraation → oma pieni tehtävä, kun `tmKausi` on olemassa.

## 3. Rules (Console-deploy §12, testit A4)

```
// UUSI funktio. Palauttaa false, kunnes Palloliitto-käyttäjiä on luotu → turvallinen deployata jo H1:ssä.
function onPalloliitto() {
  return request.auth != null
      && exists(/databases/$(database)/documents/palloliitto/kayttajat/$(request.auth.uid));
}

match /arviointikerrat/{kertaId} {
  // Seura lukee vain jaetut. Seuran kyselyn PAKKO sisältää where('nakyvyys','==','seuralle') (Rules ei suodata).
  allow read:   if onSuperAdmin() || onPalloliitto()
                || (onOmaSeura(seuraId) && (onJohtoRooli() || onValmentajaRooli())
                    && resource.data.nakyvyys == 'seuralle');
  allow create: if request.resource.data.arvioija_uid == request.auth.uid
                && ( (onPalloliitto() && request.resource.data.arvioija_org == 'palloliitto')
                  || ((onSuperAdmin() || onOmanJoukkueenValmentaja(seuraId, pelaajaId) || (onOmaSeura(seuraId) && onJohtoRooli()))
                      && request.resource.data.arvioija_org == 'seura'
                      && request.resource.data.nakyvyys == 'seuralle') );
  allow update: if resource.data.arvioija_uid == request.auth.uid
                && request.resource.data.arvioija_uid == resource.data.arvioija_uid
                && request.resource.data.arvioija_org == resource.data.arvioija_org
                && request.resource.data.luotu == resource.data.luotu
                && ( request.time < resource.data.luotu + duration.value(24, 'h')
                     // Palloliitto voi jakaa sisäisen seuralle myöhemmin (vain tähän suuntaan, vain nakyvyys-kenttä):
                  || (resource.data.nakyvyys == 'sisainen' && request.resource.data.nakyvyys == 'seuralle'
                      && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['nakyvyys', 'paivitetty'])) );
  allow delete: if false;   // SA-poisto CF:n Admin SDK:lla (GDPR)
}
```
Rules-testit: tenant-isolaatio · toinen arvioija ei voi muokata · 24 h raja · delete estetty · anon/pelaaja/huoltaja ei lue (§7.22) · **seuran käyttäjä ei lue `sisainen`-kertaa** · seuran käyttäjä ei voi luoda `arvioija_org:'palloliitto'` · jaettu → sisäinen -paluu estetty · `onPalloliitto()` = false ilman `palloliitto/kayttajat`-dokia.

**Palloliitto-käyttäjät (H1b, erillinen pieni tehtävä):** `palloliitto/kayttajat/{uid}` (SA luo, Admin-näkymä) + oma Rules-blokki (luku vain itselle/SA) + VP_v25:n seuravalitsin Palloliitto-käyttäjälle kuten SA:lla (§3). Palloliiton arvioija tarvitsee lukuoikeuden myös pelaajadociin, jotta pelaajakortti aukeaa: laajenna `seurat/{id}/pelaajat/{pid}`-lukusääntöä `|| onPalloliitto()`. Tämä on alaikäisten datan cross-club-luku → tarkista suostumuksen kattavuus ennen tuotantoa (§9, suostumuksen kattavuus).

## 4. Näkymät (VP_v25 pelaajakortti → Arviointi → uusi "Historia"-osio; mockup)

**4.1 Trendit.** Kohdelista (sparkline + muutos) + kaavio valitulle kohteelle: pisteet = kerrat arvioijan värillä, viiva = puolivuotiskauden mediaani, 3-viiva "ikätasoa", PHV-vaihe taustavyöhykkeenä (`biologinen_ika`-historiasta). **Ohut otos -portti:** trendi vasta ≥ 3 kerralla kahdelta kaudelta (sama henki kuin kenttätyökalun < 3 = ohut). Muutos = ensimmäisen ja viimeisen puolivuotismediaanin erotus. EI regressiota tai ennustetta.

**4.2 Arvioijat.** Matriisi kohteet × arvioijat (kunkin viimeisin, 12 kk ikkuna), ero-sarake, ≥ 1,5 amber. Rivin klikkaus → **"Miksi arviot eroavat?"**: arvioijakohtaiset kontekstikortit (pvm, tilanne, pelipaikka + min, vastustajataso, nähty kertaa, kypsyys, perustelu, kenttänäyttö) + **automaattiset kontekstierot**, jotka on johdettu vain tallennetuista kentistä:
- eri pelipaikka · eri vastustajataso · eri tilanne (harjoitus vs ottelu) · aikaero > 60 pv · näytön määrä / nähty-kerrat · §28: PHV `LAH`/`PH`, jolloin havaittu fyysinen ja kontaktipeli tulkitaan kehitysvaihetta vasten.

Tekijälista on sääntöpohjainen (ei AI:ta) ja testattava puhtaana funktiona. Ei päätelmää siitä, kuka on oikeassa.

**4.3 Potentiaali.** 1–5★ ajan yli arvioijittain, pisteen koko = varmuus. Alle 14-vuotiaalla oletusvarmuus `alustava` ja UI-kehys "alustava arvio" (tutkimus: potentiaalin arviointi epäluotettavaa ennen 14–15 v).

**4.4 Kaikki arviointikerrat.** Aikajana uusin ensin, suodatin arvioijittain, muutos-chipit saman arvioijan edelliseen kertaan, perustelut, näyttö. Tämä on "havainnot jäävät historiaan" näkyvänä.

Konventiot: vanilla JS, string concatenation (§7.1), `window.fn` onclickeille (§7.17), tokenit molemmille teemoille, yksi `@media(max-width:768px)`, `vpT()` + sv-rivit `SV_ODOTTAA_SANKTIOINTIA`-listaan (Claude sanktioi, EI keksitä ruotsia).

## 5. Puhtaat lib-funktiot (uusi `lib/tm_arviointi_historia.js` + Vitest)

`tmAhSarja(kerrat, avain)` → pisteet + puolivuotismediaanit · `tmAhTrendi(kerrat, avain)` → `{ohut, d, eka, vika, n}` · `tmAhViimeisimmat(kerrat, nytMs, ikkunaPv=365)` → `{arvioija_uid: kerta}` · `tmAhHajonta(viimeisimmat, avain)` → `{min, max, ero, keskustelunaihe: ero >= 1.5}` · `tmAhKontekstierot(kerrat, avain)` → `[{tekija, teksti}]` · `tmAhKooste(kerrat, nytMs)` → pikakentän rakenne (CF ja client käyttävät samaa). Testit: ohut otos -raja, mediaani parillisella n:llä, sama arvioija kahdesti → vain viimeisin hajontaan, `NA` ei laske, tekijät vain kun kenttä on molemmissa.

## 6. Vaiheistus

| Vaihe | Sisältö | Valmis kun |
|---|---|---|
| **H1** | datamalli + kirjoitus kerroiksi (kontekstirivi) + `tmKausi` + pikakentät + CF-kooste + Rules (sis. `onPalloliitto`, `nakyvyys`) + migraatio + lib + testit | Kaksi arvioijaa arvioi saman pelaajan eri päivinä → molemmat kerrat säilyvät, `arviointi_havaittu` = seuran viimeisin, kausi = '2026', vanhoja docceja ei enää kirjoiteta |
| **H1b** | Palloliitto-käyttäjät + pääsy pelaajakorttiin + SISÄINEN/JAETTU-valinta kirjauksessa | Palloliiton testitunnus arvioi pelaajan sisäisesti → seura ei näe; jakaa → seura näkee arvioijan nimellä |
| **H2** | Trendit + Kaikki arviointikerrat -näkymät (+ CF-kooste, jos ei H1:ssä) | Tero näkee Topiaksen historian mockupin mukaisena (live-verify SA + VP, molemmat teemat, mobiili) |
| **H3** | Arvioijat-näkymä + "miksi" + Potentiaali-historia + joukkuetason signaali "ero ≥ 1,5" pikakentästä | Ero-signaali näkyy VP:n pelaajalistassa ilman alikokoelmakyselyä |
| **H4** | Kenttätyökalun näyttö kertaan (`naytto`), kun kenttätyökalu Vaihe 3 (Firestore) on valmis | Kerrassa "5 ottelua · 61 merkintää" ja linkki merkintöihin |

## 7. Ei tässä
Arvioijakohtainen "tiukkuus"-analyysi (arvioija X keskimäärin +0,6). Arvokas kalibraatiolle, mutta henkilöön kohdistuva, joten se tehdään oma päätös + johto/Palloliitto-only myöhemmin. Myös seuraavat jäävät pois: AI-selitykset erojen syistä, kommentointiketju arvioijien välillä ja ennusteet.

## 8. Guard / mutaatiotestit (review tarkistaa)
- Kaksi eri arvioijaa samaan kohteeseen samana päivänä → **2 kertaa**, ei 1 (mutaatio: `set merge` samaan dociin → punainen).
- 25 h vanhan kerran muokkaus → Rules estää.
- `arviointi_havaittu` päivittyy samassa batchissa kuin kerta (mutaatio: erillinen write → testi huomaa puuttuvan atomisuuden).
- Pelaaja_v7 / Vanhempi_v2 eivät lue `arviointikerrat`- eivätkä `arviointi_kooste`-kenttää (grep-portti, §7.22).
- `tilannekuva` luetaan pelaajadocista eikä käyttäjän syötteestä.
- Kirjaustilassa DOM ei sisällä muiden arvioijien arvoja (periaate 7; mutaatio: renderöi matriisi kirjauksen viereen → testi punainen).
- Palloliiton (`arvioija_org:'palloliitto'`) kerta EI muuta `arviointi_havaittu`-pikakenttää (mutaatio: kirjoita kaikista → silta-testi punainen).
- `sisainen`-kerta ei vaikuta `arviointi_kooste`- eikä `potentiaali_kooste`-pikakenttään (mutaatio: CF ei suodata → testi punainen).
- Seuran kysely ilman `where('nakyvyys','==','seuralle')` → Rules hylkää (testi varmistaa, ettei UI hiljaa näytä tyhjää).
- `tmKausi('2026-09-20','kalenteri') === '2026'` ja `tmKausi('2026-09-20','heina_kesa') === '2026-27'`.
- Puuttuva avain ≠ `'NA'`: kumpikaan ei laske trendiin, mutta vain `'NA'` näkyy "ei sovellu" -merkintänä.

## 9. Päätökset (Tero 27.9.2026) ja avoimet

**Päätetty:**
1. **Historia kulkee pelaajan mukana** seurasta toiseen → §11. H1 tallentaa `palloId` ja `seuraId_arviohetkella`.
2. **Pelaaja omistaa datan.** Perhe antaa luvat rekisteröityessä suostumuslomakkeella.
3. **Palloliiton arvioiden näkyvyys noudattaa järjestelmän mallia:** sisäinen tai jaettu seuralle (`nakyvyys`). Seuran arviot näkyvät Palloliitolle.
4. **Suomen kausi = kalenterivuosi**, Euroopassa eri sykli → `tmKausi` + `kausimalli` (§2.4).
5. **Kooste CF:ssä** (välttämätön sisäisten suodatuksen takia, §2.2).

**Avoinna (eivät estä H1:tä):**
- **Maalivahdit:** Tero selvittää Palloliitolta, onko erillinen MV-kortti. Siihen asti MV:n kenttäpelaajakohteet ovat `'NA'` eikä MV-arviota esitetä kattavana. MV-kohteet lisätään taksonomiaan, kun kortti on tiedossa.
- **Säilytysaika** (B4 GDPR, `docs/GDPR_POLICY_PLAN.md`): tarvitaan ennen tuotantoa.
- **Suostumuksen kattavuus (tarkistettava):** mainin `TalentMaster_Rekisterointi_Suostumus.html` sisältää kuusi kohtaa (rekisteri, tietosuojaseloste, fyysinen testaus ja kehitysseuranta, biologinen ikä, jako seuran valmentajille, anonymisoitu data). Siitä **ei löydy** mainintaa (a) valmentajien ja tarkkailijoiden havaintoarvioista, (b) Palloliiton pääsystä tietoihin eikä (c) historian siirtymisestä uuteen seuraan. Jos nämä ovat tietosuojaselosteessa tai uudemmassa lomakeversiossa, hyvä. Muuten lomakkeeseen tarvitaan kohta ennen H1b:n tuotantokäyttöä. Olemassa olevien pelaajien suostumus ei päivity itsestään.
- **Perustelut:** koska data on pelaajan, arvioijan vapaa perustelu voi päätyä perheelle (tiedonsaantioikeus). Kirjausohje pysyy: *"Kirjoita niin, että voisit näyttää tekstin huoltajalle."*
- **24 h korjausikkuna:** oletus, ellei Tero muuta.

## 10. Myöhemmin (ei H1–H4, mutta datamalli tukee)
- **Harhakontrollit seuratasolla:** arviot syntymäkvartaaleittain (RAE) ja kypsyysvaiheittain. Onko Q1-syntyneillä tai varhaiskypsillä systemaattisesti korkeammat havaitut arviot? `tilannekuva.rae_kvartaali` + `phv_tila` riittävät. Ks. `docs/VP_ARVIOINTI_JA_KADENSSI.md` (bias-kontrollit).
- **Kattavuus ja kadenssi:** signaali "pelaajaa ei arvioitu > X kk" ja "kohde nähty vain yhdeltä arvioijalta" (S-signaalisarja, §26).
- **Kalibrointi:** arvioijat arvioivat saman pelaajan tai videon, ja Arvioijat-näkymästä tulee kalibrointityökalu. Vaatii lisäksi tasoankkurit per kohde ("mitä 4 tarkoittaa U13:ssa"), mikä on Palloliiton kanssa tehtävää sisältötyötä.
- **Mitattu vs havaittu -tekijä "miksi"-listaan:** esim. havaittu Fyysinen läsnäolo 2, mutta CMJ taso 4 → ristiriita näkyviin.
- **Offline-kirjaus kentällä:** tarkkailija arvioi turnauksessa ilman verkkoa → kenttätyökalun ottelun jälkeinen hetki luo kerran luonnoksen, joka synkronoidaan myöhemmin.
- **Pelaajan ääni:** itsearvio valituista kohteista (U13+, kuten D3) ja kehityskeskustelun positiivinen tiivistelmä pelaajalle (§7.22-kehyksessä).

## 11. Seurasiirto — historia kulkee mukana (OMA BRIEF, ei H1–H4)
Tero 27.9.: historia kulkee pelaajan mukana. Tämä koskee **koko pelaajan historiaa**, ei vain arviointeja: `testitulokset`, `biologinen_ika`, `havainnot` (ADAR), `arviointikerrat`, `kirjaukset`. Siksi se ratkaistaan yhtenä kokonaisuutena eikä arviointikohtaisesti. Suunnan kiinnekohdat, jotka H1 jo huomioi:
- Tunniste = **PalloID** (`palloId` jokaisessa kerrassa). Pelaajat ilman PalloID:tä tarvitsevat manuaalisen yhdistämisen.
- Siirto CF:llä (Admin SDK), kun uusi seura rekisteröi pelaajan ja perhe on antanut luvan. Kerrat kopioidaan uuden seuran polkuun muuttumattomina (`seuraId_arviohetkella`, `arvioija_*` ja `nakyvyys` säilyvät). **Sisäiset Palloliiton kerrat siirtyvät sisäisinä.**
- Avoin kysymys omaan briefiin: säilyykö vanhalla seuralla lukuoikeus siirron jälkeen? Periaate "pelaaja omistaa datan" viittaa siihen, että ei säily (vanhan seuran käsittelyperuste päättyy) → säilytysaika-päätös (B4).
- Vaihtoehtoinen arkkitehtuuri pitkällä aikavälillä: seuraneutraali pelaajahistoria (`pelaajat/{palloID}`, CLAUDE.md §11), jolloin kopioita ei tarvita. Tämä on isompi muutos, ja se arvioidaan seurasiirto-briefissä.
