# Kalenteriauditointi — VP + valmentaja (P7-pohja)

**Laajuus:** VP-appi (`TalentMaster_VP_v25.html`) + valmentaja-appi (`TalentMaster_Master_v16.html`) + jaettu `lib/tm_kalenteri.js` + Firestore Rules + `KALENTERI_ARKKITEHTUURI.md`. Read-only-analyysi mainista. Tarkoitus: pohja kalenteriuudistukselle (P7) ja "kalenteri on työläs" -ongelman ratkaisulle.

---

## 1. Tiivistelmä

Kalenterin **ydin on rakennettu ja toimii** molemmissa apeissa: tyypitetyt tapahtumat, toistuvuus, läsnäolo, soft-delete, roolit, yksi lähde (`seurat/{sid}/kalenteri`). Se ei ole rikki — se on **työläs ja kahdennettu**.

Kolme keskeistä havaintoa:
1. **"Työläs" on todellinen ja paikannettavissa:** jokainen tapahtuma syötetään **käsin ~7–9 kenttää** (VP) yksitellen; ei pohjia, ei "monista", ei bulkkia paitsi toistuvuus. Ison viikon rakentaminen = kymmeniä napautuksia.
2. **Kaksi lähes-identtistä toteutusta** (VP `vp*`/`avaa*` + valmentaja `_cal*`/`_avaa*`) jotka jakavat vain 79-rivisen toistuvuus-libin. Kaikki UI, CRUD ja modaalit on kahdennettu → ylläpitovelka + eriytymisriski.
3. **Kaikki integraatiot ovat tynkiä:** MyClub/TASO/iCal/Google/Outlook/JOPOX — pelkät `null`-placeholder-kentät, ei synkkaa. Seurat syöttävät harjoitukset **kahteen kertaan** (MyClub/JOPOX **ja** TM) → suurin yksittäinen työläyden lähde tuotannossa.

**P7:n suurin arvo/riski-suhde** ei ole strateginen visio (vuosikello, kuorma×ikkuna) vaan **työläyden poisto**: pohjat + monista + esitäyttö + kahden toteutuksen yhdistäminen + iCal-tuonti (kaksoissyötön loppu). Nämä ovat matalariskisiä ja osuvat suoraan käyttäjän kipuun.

---

## 2. Arkkitehtuurikartta

| Kerros | Toteutus |
|---|---|
| **Jaettu ydin** | `lib/tm_kalenteri.js` (79 riviä, PURE) — vain toistuvuus: `tmKalenteriOccurrences`, `tmToistuvuusPaiva`, `tmSarjaId`, `tmCadenceNimi`. Cadenssit kerran/viikoittain/2_viikottain/kuukausittain, katto 60. Ei renderöintiä/CRUD:ia. |
| **VP-appi** | `TalentMaster_VP_v25.html` — `renderKalenteri` (L10395), `renderVpViikko` (L10322), `vpSetView` (kuukausi/viikko/paiva). Rikkain pinta. |
| **Valmentaja-appi** | `TalentMaster_Master_v16.html` — `renderCal` (L8192, **vain viikko**), `setCalMode` (kuukausi/kausi = `toast('tulossa')`-tynkiä). Rooliportein rajattu CRUD + Session-RPE. |
| **Firestore** | Yksi lähde `seurat/{sid}/kalenteri/{id}` (K1-konsolidointi poisti `vp_kalenteri` + `joukkueet/{jid}/kalenteri`) + `.../lasnaolijat/{pid}` + denormalisoitu `lasnaolo_kooste`. ~30-kenttäinen tapahtumadoc. |

---

## 3. VP-kalenteri (`VP_v25`)

- **Näkymät:** kuukausi + viikko (grid). "Päivä" = modaali (`avaaKalenteriPaivaModal`), ei omaa gridiä. Näyttää **kahta lähdettä**: legacy `_tapahtumat` (vain testitapahtumat) + uusi `_kalenteriTapahtumat`.
- **Tapahtumatyypit (11):** `testitapahtuma, ottelu, harjoitus, valmentajapalaveri, jaksopalaveri, tiimipalaveri, mentorointitapaaminen, kalibraatiopaja, idp_seuranta, talenttileiri, muu` (`KALENTERI_TYYPIT` L10586).
- **Luonti** (`avaaUusiTapahtuma` L10594): yksi modaali, yksi Tallenna. Kentät tavalliselle harjoitukselle: **Tyyppi · Nimi(pakko) · Päivä · Alkaa(17:00) · Päättyy(18:30) · Joukkue · Paikka · Muistiinpanot · Toistuvuus** → **~7–9 käsinsyöttöä / tapahtuma**.
- **Muokkaus** (`_vpMuokkaaTapahtuma`): vain nimi/alkaa/päättyy/paikka/tila/muistiinpanot. Tyyppi/joukkue/teema **ei** muokattavissa luonnin jälkeen.
- **Poisto:** soft-delete (`poistettu:true` + uid/pvm). Ei hard-deletea.
- **Toistuvuus:** luonti-modaalissa chip-rivi + loppupvm + esikatselu ("Luodaan N tapahtumaa") → materialisoi konkreettiset dokit yhtenä batchina, jaettu `toistuvuus_sarja_id`. Sarjan muokkaus/poisto: **skooppi-dialogi** (Vain tämä / Tämä ja seuraavat / Koko sarja). **Cadenssia ei voi vaihtaa jälkikäteen** — vain kenttiä per skooppi.
- **Läsnäolo:** `_vpRenderLasnaolo`/`_vpTallennaLasnaolo` — 3-tila (Paikalla/Myöhässä/Poissa) + syy + "merkitse kaikki paikalla"; kirjoittaa `lasnaolijat/{pid}` + `lasnaolo_kooste`. Roster: `pelaajat_id[]` → joukkue → fallback `talenttiOhjelma`.
- **Esitäyttö:** vain **treeniteema-silta** (`_jsvLuoTapahtuma`) esitäyttää tyyppi=harjoitus + nimi + pelaajat. Muuten kaikki käsin. Ei pohjia, ei monista.

## 4. Valmentaja-kalenteri (`Master_v16`)

- **Näkymät: vain viikko** (`renderCal` L8192, Ma–Su + koko päivä -rivi + tuntiruudukko 15–20). **Kuukausi & kausi = tynkiä** (`setCalMode` → toast "tulossa"). Ei kuukausi- eikä päivänäkymää.
- **Tapahtumatyypit (6):** `harjoitus, ottelu, testitapahtuma, valmentajapalaveri, mentorointitapaaminen, muu` — VP:n 11:n osajoukko.
- **Luonti** (`_avaaUusiTapahtuma` L8784): **kevyempi kuin VP** — Tyyppi · Nimi(oletus=tyyppi) · Alkaa · Päättyy · Toistuvuus. **Ei paikkaa, ei muistiinpanoja, ei joukkuevalitsinta** (joukkue = valmentajan konteksti `_joukkue`). ~4 syöttöä. Rooliportti: vain valmentaja/johto.
- **Muokkaus** (`_calMuokkaaTapahtuma`): **kenttätaso roolin mukaan** — täysi jos oma tapahtuma (`luoja_uid==_uid`) tai johto; muuten vain muistiinpanot.
- **Läsnäolo:** peilaa VP:tä (3-tila + syy + kooste). **Lisänä Session-RPE** (`_calSessioRpeHTML`/`_calTallennaSessioRPE`) — valmentajan kuorma-arvio harjoitukselle/ottelulle, `valmentaja_rpe`-kenttään. (Huom: pelaajan RPE tulee Pelaaja-apista → P6a lukee; tässä valmentajan oma arvio.)
- **Esitäyttö/pohjat:** ei mitään (nimi defaultaa tyyppiin). Toistuvuus ainoa bulk.

---

## 5. Miksi "työläs" — paikannetut kipupisteet

1. **Jokainen tapahtuma käsin, ~7–9 kenttää (VP):** ei pohjia, ei "monista tapahtuma", ei oletusrosteria (paitsi talentti-fallback). Toistuvuus auttaa vain identtiseen sarjaan — ei vaihtelevaan viikkoon.
2. **Valmentaja jumissa viikkonäkymään:** ei kuukausi-/päivägridiä → kokonaiskuvan ja päällekkäisyyksien hallinta hankalaa; navigointi (`calNav`) ei edes re-renderöi inline.
3. **Kaksoissyöttö ulkoisiin järjestelmiin:** harjoitukset elävät jo MyClub/JOPOXissa; ilman synkkaa ne syötetään TM:ään uudelleen. Tämä on tuotannon suurin todellinen työmäärä.
4. **Kaksi kahdennettua toteutusta:** sama modaali/CRUD/läsnäolo rakennettu kahdesti (VP + valmentaja) → jokainen parannus pitää tehdä kahtena, ja ne ovat jo eriytyneet (11 vs 6 tyyppiä, kuukausi vs ei).
5. **Muokkausrajat:** tyyppi/joukkue/teema ei muokattavissa luonnin jälkeen → väärä valinta = poista + luo uudelleen (ja poisto on soft-delete).
6. **Kaksi datalähdettä VP-gridissä** (legacy `_tapahtumat` + `_kalenteriTapahtumat`) → renderöinti- ja käsitteellinen sekaannus.

---

## 6. Datamalli + Rules (todellisuus vs. dokumentti)

- **Tapahtumadoc** (~30 kenttää): perus (nimi/tyyppi/alkaa/paattyy/koko_paiva) · kohdistus (joukkue/joukkueet[]/osallistujat_uid[]/pelaajat_id[]) · paikka · linkit (`testitapahtuma_id`, `myclub_event_id`, `taso_ottelu_id`) · toistuvuus + `toistuvuus_sarja_id` · audit (`luoja_uid`/`muokkaaja_uid`/`luotu`/`paivitetty`) · `tila` · soft-delete (`poistettu`/uid/pvm) · integraatio (`lahde`/`lahde_id`/`viimeisin_synkka`, kaikki null). **P6a linkittää tähän jo `tapahtuma_id`:llä** (#215) → hyvä pohja koherenssille.
- **Rules-todellisuus poikkeaa dokumentista:** doc §7.1 sanoo valmentaja saa muokata vain `muistiinpanot`-kenttää, mutta **oikeat Rules** (`match /kalenteri`): `allow create/update: … onOmanSeuranValmentaja(seuraId)` — eli **valmentaja saa oikeasti luoda + muokata koko tapahtuman**; kenttätaso-rajaus on **vain UI:ssa** (`_calSaaMuokataTapahtuma`), ei Rulesissa. Delete = vain johto/SA (soft-delete). Läsnäolo: johto tai oma uid. **→ Uudistuksessa: älä oleta Rulesin rajaavan valmentajaa; joko kiristä Rules tai luota UI-porttiin tietoisesti.**

---

## 7. Kuilu vs. arkkitehtuurivisio (`KALENTERI_ARKKITEHTUURI.md`)

**Toteutettu** (doc kirjoitettu ennen näitä): yksi-lähde `kalenteri` + soft-delete + audit (K1) · läsnäolo-UI (K2) · toistuvat tapahtumat 3-skooppi-muokkauksella (K3) · roolimalli.

**Visiossa, EI toteutettu (isoimmat aukot):**
- **MyClub-synkka** (§4.1, CF + 15 min cron) — vain null-kentät.
- **iCal-vienti/-tuonti** (§4.3, RFC 5545 CF) — ei koodia. *Doc-linjaus: geneerinen iCal-tilaus kattaa Google/Outlook/Teams/Apple yhdellä CF:llä.*
- **TASO-ottelut kalenteriin** (§4.2) — `tasoHaeSeuranOttelut` on olemassa mutta ei injektoi `kalenteri`in.
- **JOPOX** (§4.5) — strateginen oivallus dokissa: **TASO kattaa ottelut riippumatta MyClub/JOPOX:sta; aito aukko = harjoitukset.**
- **Vuosikello** (§5, biologis-rytminen testauskalenteri) — ei rakennettu.
- **Kuorma/PHV × pudokassignaali** (§2, dokin nimeämä *pääerottautuja*) — vain Session-RPE-siemen.
- **Valmentajan kuukausi-/päivänäkymät** (§6.1) — tynkiä.
- **Automaattimuistutukset / RSVP** — ei rakennettu.

---

## 8. P7-suositus — vaiheistus (arvo/riski-järjestyksessä)

**Periaate:** ratkaise ensin **työläys** (matala riski, suora osuma kipuun), sitten integraatiot (poistaa kaksoissyötön), viimeisenä strateginen visio. Kalenteri on jo P6a:n lähde-totuus (`tapahtuma_id`), joten uudistus vahvistaa myös Viikko-välilehteä.

**P7a — Työläyden poisto (ensin, matala riski, ei uutta dataa):**
- **Tapahtumapohjat + "Monista tapahtuma"** — yleisimmät (harjoitus 90', ottelu, testi) yhdellä napautuksella; monista edellinen viikko.
- **Viikkopohja / joukkueen oletusaikataulu** — täytä koko viikko `toistuvuus`-rungosta (sama mekanismi kuin P6a:n esitäyttö, nyt kalenterin luontiin).
- **Salli tyyppi/joukkue/teeman muokkaus** luonnin jälkeen (poistaa "poista + luo uudelleen").
- **Yksi datalähde VP-gridiin** (poista legacy `_tapahtumat`-haara renderöinnistä).

**P7b — Kahden toteutuksen yhdistäminen (keskitason, iso ylläpitovoitto):**
- Nosta jaettu kalenterikomponentti (renderöinti + modaali + CRUD + läsnäolo) `lib/`-tasolle, jota VP + valmentaja käyttävät → parannukset tehdään kerran. Valmentajalle kuukausi/päivänäkymä samalla.

**P7c — iCal-tuonti (poistaa kaksoissyötön — suurin tuotantovoitto):**
- Geneerinen ulkoinen iCal-feed sisään (`lahde:'ical_tuonti'`) → harjoitukset MyClub/JOPOXista ilman seuraohjaus-spesifiä API-liimaa. + TASO-ottelut `kalenteri`in (`tasoHaeSeuranOttelut` jo olemassa). iCal-**vienti** (§4.3) samalla CF:llä → näkyy Google/Outlook/Teamsissa.

**P7d — Strateginen erottautuminen (viimeisenä, kun ydin sujuu):**
- Vuosikello (lista-MVP) + kuorma/PHV × ikkuna -signaali (yhdistää P6a-kuorman + §28:n kalenteriin) — dokin nimeämä pääerottautuja.

**Roolit/Rules P7:ssä:** yhtenäistä valmentajan oikeudet tietoisesti (Rules vs UI-portti ristiriita §6); säilytä soft-delete + audit + alaikäissuoja; P6a `tapahtuma_id`-linkki pysyy yhtenä totuutena.

---

## 9. Yhteenveto

Ydin on kunnossa; ongelma on **työläys + kahdennus + integraatioaukko**, ei rikkinäisyys. Suurin voitto tulee **P7a:sta** (pohjat/monista/esitäyttö) ja **P7c:stä** (iCal-tuonti → kaksoissyötön loppu) — molemmat matalariskisiä ja suoraan käyttäjän kipuun. **P7b** (yhdistäminen) maksaa itsensä takaisin ylläpidossa. Strateginen visio (vuosikello, kuorma×ikkuna) on aito erottautuja mutta kuuluu viimeiseksi, kun kalenteri on nopea ja yksi.
