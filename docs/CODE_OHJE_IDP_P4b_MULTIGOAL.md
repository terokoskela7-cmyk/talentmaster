# CODE — P4b (kevyt): Jaksofokus — per-tavoite "Opittu kun" + älykäs mittaus (Arviointi-linkki | numeerinen)

**Tyyppi:** data (additiivinen jaksofokus-kartan sisään) + editori + Arviointi-luku. **Yksi PR.**
**Kohde:** `TalentMaster_VP_v25.html` — jaksofokus-editori (`_vpJfLinkitHTML` + `_jfOhjaa`-modaali) · kirjoittaja (`_vpJfMergeLisakentat` / `_vpJfAsetaKehitysFokus`) · jaksofokus-read (`_vpTyopoytaJaksofokusHTML`).
**Design-totuus:** hyväksytty `idp_jaksofokus_p4b_kevyt.html`. Tiekartta **P4b** (kevennetty). Ohje on itsenäinen.

## Periaate (miksi kevennetty)

Jaksofokuksessa voi olla useita tavoitteita (pääfokus + tukikonseptit, max 4). P4b antaa **jokaiselle tavoitteelle:**
1. **"Opittu kun"** (havaittava kriteeri) — **kaikille** (nyt on vain yksi jaettu). Tämä on aito valmennusarvo, matala kitka.
2. **Mittaus sieltä missä arvo jo elää** — **EI tuplakirjausta** (kriittinen suunnittelupäätös):
   - **Laadullinen** tavoite (konsepti mäppäytyy arviointitaksonomiaan, esim. Johtajuus/Pelin lukeminen) → **🔗 Arviointi-linkki:** nykyarvo **luetaan livenä Arvioinnista** (havaittu 1–5 / ADAR 1–3), valmentaja asettaa vain **tavoitetason**. Arvoa ei kirjata tässä uudelleen.
   - **Laskettava** tavoite (ei arviointikohtaa, esim. "läpimenot/peli") → **📐 numeerinen** Lähtö→Tavoite.
3. **Mittaus on valinnainen** (pehmeä vihje) — pelkkä "Opittu kun" riittää tallennukseen.

**Additiivinen, taaksepäin-yhteensopiva, ei migraatiota, ei Rules-muutosta.** Vanhat jaksofokukset toimivat ennallaan.

## Data-malli (additiivinen jaksofokus-kartan sisään)

Lisää `jaksofokus.tavoite_tarkenteet` = **kartta** avaimella `"<domeeni>::<konsepti_avain>"` → tarkenne-objekti. Yksi entry per tavoite (pääfokus + kukin linkitetyt). Vain asetetut kentät:
```js
tavoite_tarkenteet: {
  "teknis_taktinen::1v1_kuljetus": { kriteeri: "Vie pallon painekohtaan…", mittaus_tyyppi: "numeerinen",
                                     mittari_nimi: "Onnistuneet läpimenot / peli", lahto: 2, tavoite: 4, yksikko: "kpl" },
  "psyykkinen::scoring_drive":     { kriteeri: "Hakee viimeistelypaikkaa 3/5…", mittaus_tyyppi: "arviointi",
                                     arviointi_avain: "scoring_drive", tavoite_taso: 4 }
  // laadullinen: nykyarvoa EI tallenneta — luetaan p.arviointi_havaittu[avain] / ADAR renderissä.
}
```
- **Pääfokus-avain** = `jf.domeeni + '::' + jf.konsepti_avain`. **Linkitetyt-avain** = `l.domeeni + '::' + l.konsepti_avain` (sama kuin `tmJfNormLinkit` dedup-avain).
- **Taaksepäin-yhteensopivuus:** vanha `jf.onnistumiskriteeri` (JF-2, jaettu) = **pääfokuksen `kriteeri` fallback** jos kartassa ei ole pääfokus-entryä. Älä poista `onnistumiskriteeri`-kenttää; lue se pääfokukselle kun tarkenne puuttuu. Vanha jaksofokus (ei `tavoite_tarkenteet`) → pääfokus näyttää jaetun kriteerin, ei per-tavoite mittaria (graceful).
- **`linkitetyt` pysyy ennallaan** (`{domeeni, konsepti_avain, konsepti_nimi}`) — `tmJfNormLinkit` **ei muutu** (→ ei lib-muutosta, ei cache-bumppia). Tarkenteet ovat erillinen kartta.

## Mittaus-moodin autotunnistus

Per tavoite, oletusmoodi:
- Jos `tmTaksonomiaByAvain(konsepti_avain)` löytää arviointitaksonomia-kohdan (P0:n sanastolinjaus teki psyykkinen/sosiaalinen-seedistä = D3/D5-taksonomia-avaimet; myös D4/ADAR-avaimet) → **`arviointi`**, `arviointi_avain = konsepti_avain`.
- Muuten → **`numeerinen`**.
- **Valmentaja voi vaihtaa moodia** (pieni toggle: 🔗 Arviointi ⇄ 📐 numeerinen). Autotunnistus vain oletus.
- **Nykyarvo arviointi-moodissa (render):** `p.arviointi_havaittu[avain]` (havaittu 1–5) — tai D4-avaimille `tmAdarHavaittu(p.adar_viimeisin, {ika, adarMap})[avain]?.arvo` (ADAR 1–3). Asteikko (1–5 vs 1–3) määrää tavoite-selektorin. Tyhjä havaittu → "nyt —/5".

## Editori (`_vpJfLinkitHTML` → per-tavoite-kortit)

Muuta nykyinen "chips + yksi jaettu Opittu kun" **per-tavoite-korteiksi** (design-totuus `.goal`):
- **Yksi kortti per tavoite** (pääfokus + kukin linkitetyt): domeeni-siru + rooli (Pääfokus/Tuki) + konsepti + (× poista, vain tuki).
- **"✓ Opittu kun"** -input per kortti (tarkenne.kriteeri; pääfokus fallback `onnistumiskriteeri`).
- **Mittaus-lohko** per kortti:
  - `arviointi`-moodi: "🔗 Arviointi · nyt N/5 (Arvioinnista) → tavoite [1–5-selektori]". Nykyarvo read-only Arvioinnista.
  - `numeerinen`-moodi: "📐 Numeerinen · Mittari [nimi] · Lähtö [n] → Tavoite [n]".
  - Moodi-toggle; tyhjä mittaus → pehmeä vihje ("◔ Mittaus asettamatta — kytke Arviointiin tai jätä pelkkä Opittu kun").
- Säilytä: ＋ Lisää tavoite (nyk. domeeni+konsepti-valitsin + `_vpJfLisaaLinkki`), jakson kesto, Tallenna.
- **Editointitila:** pidä tarkenteet `window._vpJfTarkenteet[pid]`-tilassa (kuten `_vpJfLinkit`/`_vpJfKriteeri`); sync-handlerit per kenttä. Alusta aktiivisesta `p.jaksofokus.tavoite_tarkenteet`:sta.

## Kirjoittaja (`_vpJfMergeLisakentat` / `_vpJfAsetaKehitysFokus`)

- `_vpJfMergeLisakentat(jaksofokus, pid)` liittää nyt `linkitetyt` + `onnistumiskriteeri`; **lisää `tavoite_tarkenteet`** editointitilasta (`window._vpJfTarkenteet[pid]`). Karsi tyhjät entryt (ei kriteeriä eikä mittausta → jätä pois).
- Kirjoitus menee **saman `{ jaksofokus }`-mapin sisällä** `_vpTtKirjoita`:lla — ei uutta top-level-kenttää, ei uutta kirjoituspolkua.
- **Nykyarvoa (arviointi-havaittu) EI kirjoiteta jaksofokukseen** — se on Arvioinnin dataa; tallenna vain `tavoite_taso` + `arviointi_avain`.

## Read-side (kevyt)

- **`_vpTyopoytaJaksofokusHTML`** (Kehitys-työpöytä TASO 2 read-näyttö): näytä tavoitteet kompaktisti — konsepti + per-tavoite mittaus ("🔗 nyt 2/5 → 4" tai "📐 2 → 4") jos asetettu. Ei editointia (editointi modaalissa).
- **Aloitus** (`_vpAloitusJaksofokusHTML`, P1.1) pysyy **yhden rivin** yhteenvetona — älä laajenna (korkeintaan "N tavoitetta"). Ei per-tavoite-detaljia Aloituksessa.

## Reunaehdot
- **Additiivinen, ei migraatiota:** vanha jaksofokus (ei `tavoite_tarkenteet`) → pääfokus näyttää `onnistumiskriteeri`:n, ei per-tavoite mittaria (graceful). Uusi tallennus lisää kartan.
- **Ei Rules-muutosta (varmista):** `tavoite_tarkenteet` on alikenttä `jaksofokus`-mapissa, jonka VP/valmentaja jo kirjoittaa (JF-2 lisäsi `linkitetyt`+`onnistumiskriteeri` ilman Rules-muutosta). **Varmista että jaksofokus-write läpäisee Rules** (ei kenttä-whitelistiä joka estäisi uuden alikentän); jos whitelist estää → Rules PR→N4-CI, muuten ei kosketa Rules.
- **Ei tuplakirjausta:** arviointi-moodissa nykyarvo **luetaan** Arvioinnista, ei tallenneta. Yksi lähde.
- **Ei Arvioinnin regressiota:** vain **luetaan** `p.arviointi_havaittu` / `tmAdarHavaittu` — ei kirjoiteta Arviointiin. Havaittu-autosave + ADAR-ikäportti (P3) ennallaan.
- **Cache:** vain `TalentMaster_VP_v25.html` (tarkenteet + editori inline; `tmJfNormLinkit` ei muutu) → **ei cache-bumppia.** (Jos lisäät jaetun helperin lib:iin → bump.)
- **Ei pakoteta:** mittari valinnainen (pehmeä vihje); tyhjä ei estä tallennusta.
- **Domeenin vaihto / arkistointi** (`tmJfVaihtaaDomeenin`, Emil-törmäys-suoja) ennallaan — arkistoitu jakso vie tarkenteensa mukanaan (osa jaksofokus-mapia).
- **Alaikäiset read-only** (Eino·Leo·Emil); jaksofokus-kirjoitukset testataan **vain Topiaksella**.
- **Brändi:** design-totuuden `idp_jaksofokus_p4b_kevyt.html` mukaan — molemmat teemat, hiusrajat, DS-tokenit, lähdevärit (🔗 blue · 📐 teal). Yksi fonttijärjestelmä. Mobiili: kortit + mittaus-rivit pinoutuvat.

## EI tässä
- **P4c** — kausitavoitteen joustavat horisontit (2–4 · tyyppi).
- **Aloitus/Arviointi/Mittaus-selkeytys** — valmis (P1.1/P3.1/P2).

## DoD
1. Jaksofokus-editori = per-tavoite-kortit (pääfokus + tuki, max 4); jokaisella **"Opittu kun"**.
2. Mittaus per tavoite: **🔗 Arviointi** (nykyarvo luetaan Arvioinnista, valmentaja asettaa tavoitetason — **ei tuplakirjausta**) tai **📐 numeerinen** (Lähtö→Tavoite); autotunnistus taksonomia-mäppäyksestä + toggle.
3. Mittaus **valinnainen** (pehmeä vihje); pelkkä Opittu kun riittää tallennukseen.
4. Data `jaksofokus.tavoite_tarkenteet` (kartta avaimella `domeeni::konsepti_avain`); **additiivinen**, vanha `onnistumiskriteeri` = pääfokuksen fallback; **ei migraatiota**.
5. Kirjoittaja liittää tarkenteet `{ jaksofokus }`-mappiin; nykyarvoa (havaittu) EI tallenneta; **ei Rules-muutosta** (varmistettu) / uutta kenttää / kirjoituspolkua.
6. Read-side: työpöydän jaksofokus-näyttö näyttää tavoitteet + mittauksen kompaktisti; Aloitus pysyy 1-rivisenä.
7. **Ei regressiota:** Arviointi (havaittu/ADAR-ikäportti/kalibraatio), vanhat jaksofokukset, domeeninvaihto/arkistointi toimivat. Ei cache-bumppia.
8. Vitest vihreä (+ pieni puhdas testi mittaus-moodin autotunnistukselle jos helppo); molemmat teemat + mobiili; 0 konsolivirhettä. **Verifioi live Topiaksella** (laadullinen tavoite lukee Arvioinnista + numeerinen tallentuu; vanha jaksofokus ennallaan). **Verifioi ennen mergeä.**
9. Keskikokoinen PR; kuvaus linkkaa `idp_jaksofokus_p4b_kevyt.html` + tiekartta P4b.
