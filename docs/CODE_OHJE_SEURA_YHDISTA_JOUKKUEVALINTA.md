# CODE — Seurahallinta: yhdistä joukkuevalinta "Muokkaa henkilön tietoja" -dialogiin

**Tyyppi:** UI-konsolidaatio (Seurahallinta). **Ei Rules-/skeema-/CF-muutosta.**
**Kohde:** `TalentMaster_Seura.html`.

## Tausta / palaute (Sibbon käyttäjä)
"Valmentajia siirtyy toisiin joukkueisiin seuran sisällä — pitäisi voida muokata valmentajan **roolia ja joukkueita** samasta paikasta." Nyt "Muokkaa henkilön tietoja" -dialogissa on yhteystiedot + **Rooli**, mutta **joukkuevalinta on erillisen "Joukkueet"-napin takana** → käyttäjä ei löydä sitä. Toiminto siis on olemassa, mutta löydettävyys on huono.

## Nykytila (älä keksi uutta backendia — tämä on jo olemassa)
- **Muokkaa-dialogi:** `avaaHenkiloMuokkaus(...)` (~`:3835`) + tallennus `tallennaHenkiloMuutos()` (~`:3890`). Tallentaa `etunimi/sukunimi/suuntakoodi/puhelin` suoraan (`set(...,{merge:true})`), ja **rooli** vain jos muuttui → `vaihdaKayttajanRooli`-CF (europe-west1). Rooli EI muutu suoralla kirjoituksella (Rules estää `rooli`/`seuraId`).
- **Joukkue-dialogi (erillinen):** `#joukkueMuutosModal` (~`:743`), `avaaJoukkueMuutos(...)` (~`:4771`), tallennus `tallennaJoukkueMuutos()` (~`:4806`). Kirjoittaa `kayttajat/{uid}`:
  `joukkueet: valitutIds`, `joukkueetNimet: valitutNimet`, `joukkue: valitutNimet[0]||valitutIds[0]||null` (legacy), `joukkueNimi: valitutNimet[0]||null` (legacy).
- **Joukkuelista:** `tila.joukkueet` — jo live `seurat/{seuraId}/joukkueet` onSnapshotista (~`:1341`). `{id, nimi}`.
- **Rules:** johtorooli (`onJohtoRooli`) + super admin saa kirjoittaa `kayttajat`-dokin ei-`rooli`/`seuraId`-kentät suoraan → **`joukkueet[]` yms. sallittu ilman CF:ää.** Ei Rules-muutosta.

## Korjaus
**Tuo joukkuevalinta "Muokkaa henkilön tietoja" -dialogiin**, niin yhteystiedot + rooli + joukkueet ovat yhdessä näkymässä. Uudelleenkäytä olemassa olevaa — älä kahdenna:
1. **Dialogiin joukkue-checkbox-lista** `tila.joukkueet`:sta (`{id, nimi}`), **esivalinta** henkilön nykyisistä `joukkueet[]`:stä (fallback `[joukkue].filter(Boolean)`). Sama render kuin nykyisessä `#joukkueMuutosModal`-listassa.
2. **`tallennaHenkiloMuutos()` tallentaa myös joukkueet** samat kentät kuin `tallennaJoukkueMuutos` (`joukkueet`, `joukkueetNimet`, `joukkue`, `joukkueNimi`) — samaan `set(...,{merge:true})`-kirjoitukseen yhteystietojen kanssa (Rules sallii johdolle). Rooli edelleen CF:n kautta (ennallaan).
3. **Yksi tallennuslogiikka** — refaktoroi joukkueiden tallennus jaettuun funktioon jota sekä dialogi (uusi) että mahdollinen erillinen nappi käyttävät. **Älä jätä kahta eri tallenninta jotka voivat eriytyä.** Suositus: poista erillinen "Joukkueet"-nappi + `#joukkueMuutosModal` kun toiminto on dialogissa (tai jos pidät napin pikakuvakkeena, sen on kutsuttava samaa jaettua tallenninta).
4. **Poista harhaanjohtava kommentti** (`tallennaJoukkueMuutos`, ~`:4841`): väittää että CF päivittää tokenin joukkueet-listan — **ei pidä paikkaansa.** Joukkuejäsenyys ei ole claimeissa eikä vaadi uudelleenkirjautumista (vain rooli vaatii).

## Reunaehdot
- **Ei Rules-/CF-/skeemamuutosta.** Joukkuemuutos = suora Firestore-kirjoitus (johtorooli), ei uudelleenkirjautumista. Rooli = CF, vaatii uudelleenkirjautumisen (ennallaan).
- **Näyttölogiikka:** joukkuevalinta on relevantein valmentaja-tyyppisille rooleille (`valmentaja`, `talenttivalmentaja`). Näytä lista aina, mutta selkeästi otsikoituna ("Joukkueet joita valmentaa") — tai piilota ei-valmentaja-rooleilta jos siistimpää. Pieni harkinta, ei estävä.
- Legacy-kentät (`joukkue`/`joukkueNimi`) pidettävä, koska valmentajan näkymä lukee niitä yhä.

## DoD
- "Muokkaa henkilön tietoja" -dialogissa on joukkue-checkbox-lista; esivalinta = nykyiset joukkueet; **Tallenna** kirjoittaa `joukkueet[]`/`joukkueetNimet` + legacy-kentät samalla kertaa yhteystietojen kanssa; rooli tallentuu kuten ennen (CF).
- **Yksi jaettu tallennuslogiikka** joukkueille (ei kahdennettua). Harhaanjohtava kommentti poistettu.
- **Verifioi live:** siirrä testivalmentaja joukkueesta A → B **yhdestä dialogista** → `kayttajat/{uid}.joukkueet[]` päivittyy, valmentajan näkymä seuraa (näkee B:n pelaajat, ei enää A:n). Rooli + yhteystiedot toimivat ennallaan. 790 vitest vihreä, 0 konsolivirhettä.
