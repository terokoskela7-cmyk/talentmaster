# CODE — P4a: Kehitys-työpöytä — looginen selkäranka + moottorin 2 polkua + Aloituksen read-only-karsinta

**Tyyppi:** UI-uudelleenjärjestely + reititys (näyttö, ei uutta dataa). **Yksi PR.**
**Kohde:** `TalentMaster_VP_v25.html` — Kehitys-välilehti `_jspTab3` (`f4` + `_kehExtra`) · Aloitus-narratiivi `_vpIdpNarratiiviHTML` (edit-reititys).
**Design-totuus:** hyväksytty *"Kehitystyöpöytä"* -kartta (`idp_kehitys.html`). Tiekartta **P4a**. Ohje on itsenäinen.

## Periaate

Kehitys = **työpöytä: "täällä rakennat sen minkä Aloitus näyttää."** Kaikki palaset ovat jo olemassa (kausitavoite-editori, moottorin heikkous/vahvuus-valinta, jaksofokus-editori, kehityskaari, arkistoi-ennen-vaihtoa), mutta ne ovat **hajallaan ja epäloogisessa järjestyksessä**, ja jaksofokus-editointi asuu **modaalissa jota avataan Aloituksesta** — väärästä kodista. P4a **ei lisää ominaisuuksia** vaan tekee työpöydästä **loogisen ja helppokäyttöisen**:

1. **Selkäranka-järjestys** Kehitys-välilehteen (moottori → kausitavoite → välitavoitteet → jaksofokus → kaari).
2. **Moottorin 2 selkeää polkua** (valittavissa, ei pakota) + käsin-supervoima.
3. **Yksi muokkauskoti:** jaksofokus-editointi työpöydälle; **Aloitus → read-only** (muokkaus reititetään Kehitykseen).

**Uudelleenkäytä KAIKKI olemassaoleva** — `idpValitseHeikoin`/`idpValitseVahvin`/`idpEhdotaTavoite` (lib/tm_idp.js), `_vpKausitavoiteHTML`, välitavoite-render (`_vpVtInp`), `_vpJfKehitysHTML`/`_jfOhjaa`-editori, `_vpKehityskaariHTML`, kirjoittajat (`_vpJfAsetaKehitysFokus`, `tmJfVaihtaaDomeenin`). P4a on **järjestely + reititys**, ei uusi logiikka.

## Mitä tehdään

### 1. Kehitys-välilehden selkäranka-järjestys (design-totuuden virta)
Järjestä `_jspTab3` (nyt: `f4` diagnostiikka + `_kehExtra` kausitavoite) design-totuuden järjestykseen — **työpöytä johtaa toiminnalla, ei raakadatalla:**
1. **Moottorin ehdotus · 2 polkua** (kohta 2).
2. **🎯 Kausitavoite** (`_vpKausitavoiteHTML`) — IDP-ydin.
3. **🪜 Välitavoitteet** — silta jaksoon (olemassaoleva `_vpVtInp`-render; yksi koti, ei duplikaatti-ID:tä).
4. **📍 Jaksofokus-editori** (kohta 3) — työpöydällä, ei modaalissa piilossa.
5. **🗺 Kehityskaari** (`_vpKehityskaariHTML`) — suljetut jaksot (meso).
- **Diagnostiikka siirtyy taakse/reveal:** nykyiset `f4`-PHV/testipäivä-rivit (PHV-vaihe, kehitysvaihe, testipäivät, TK-kokonaisaika) eivät ole "työpöytä" — laita ne **▸ Diagnostiikka -reveal**iin tai välilehden loppuun. Työpöytä avautuu selkärangalla, ei raakadatalla.

### 2. Moottorin 2 selkeää polkua — valittavissa, ei pakota (Teron toive)
Nyt moottorin valinta on piilotettu heikkous/vahvuus-segmentti (`_modBtn` `_vpKausitavoiteHTML`:ssä). Korvaa design-totuuden **kahdella selkeällä kortilla rinnakkain:**
- **🎯 Korjaa heikkous** — `idpValitseHeikoin`-tulos: `dim · lähtö → tavoite · arviosta` + lyhyt pelilause. Nappi **"→ Tee tästä jaksofokus"**.
- **💎 Jalosta supervoima** — `idpValitseVahvin`-tulos: `dim · nykytaso → erottava ase` + pelilause. Nappi **"→ Tee tästä jaksofokus"**.
- **"Moottori ei pakota"** -mikrocopy: "hyväksy ehdotus TAI valitse itse alta". Molemmat kortit → olemassaoleva handler joka asettaa `modus` (`heikkous`/`vahvuus`) ja rakentaa tavoitteen (`idpEhdotaTavoite` / nykyiset `_modBtn`-polut) → kausitavoite-muokkaustilaan.
- **70/30-ankkuri** -note: "heikkoustyö integroidaan vahvuuden pohjalle, ei irrallisena."
- **§28-portti** -note: "heikko fyysinen ei tule ehdolle ennen PHV:tä; ilman PHV-dataa moottori suosii D2:ta." (Reuse olemassaoleva §28-logiikka; älä keksi uutta.)
- **💎 Erottava ase käsin** — pieni syöttö "jos moottori ei tunnista vahvuutta (asiantuntija tietää ennen dataa)" → asettaa vahvuus-fokuksen käsin (olemassaoleva vapaa-fokus-polku `_vpFokusValintaHTML`).
- **Ei uutta moottorilogiikkaa:** kortit vain esittävät `idpValitseHeikoin`/`idpValitseVahvin`-tulokset selkeämmin ja kutsuvat olemassaolevia handlereita.

### 3. Jaksofokus-editori työpöydälle — yksi muokkauskoti
Nyt jaksofokus-editori on **vain modaali** (`_jfOhjaa` → `_jfModal`), jota avataan Aloituksesta. Tuo se **työpöydän osaksi** (design-totuuden "📍 Jaksofokus · editori"):
- **Ensisijainen: renderöi editori inline** Kehitys-välilehteen (uudelleenkäytä `_vpJfKehitysHTML` / modaalin editori-runko: domeeni-nelikulma + konseptin tyyppi + pääfokus + linkitetyt tukikonseptit + "Opittu kun" + Kesto + Tallenna + 👁 näkyy pelaajalle). Sama kirjoittaja (`_vpJfAsetaKehitysFokus`) + arkistoi-ennen-vaihtoa (`tmJfVaihtaaDomeenin`, "↻ Sulje / vaihda jakso") ennallaan.
- **Jos inline-render on liian kietoutunut modaaliin:** hyväksyttävä vaihtoehto on **selkeä työpöytäosio + "✎ Muokkaa jaksofokus" -nappi** joka avaa saman modaalin — **kunhan lopputulos on: työpöytä (Kehitys-välilehti) on jaksofokuksen ainoa selkeä muokkauskoti.** (Modaali saa jäädä muille kutsujille kuten joukkuenäkymä; tämä koskee kortin sisäistä UX:ää.)

### 4. Aloituksen read-only-karsinta
Aloitus-narratiivissa (`_vpIdpNarratiiviHTML`) on vielä **"✎ Muokkaa jaksofokus" -nappi** (`_jfOhjaa`). Nyt kun työpöytä on kunnossa:
- **Poista muokkaus Aloituksesta:** "✎ Muokkaa jaksofokus" → **reititä Kehitys-välilehteen** (`_jspVaihda(3)`), EI avaa modaalia. (Tai vaihda teksti "→ Kehitä jaksofokusta" joka vie työpöydälle.)
- **Aloitus = pelkkä luettava yhteenveto:** säilytä jaksofokuksen/tavoitteen **read-only-näyttö** (P1:n pelaajan ääni, selkäranka, tavoite-yhteenveto, radar) — poista vain editointi-triggerit. Muut mahdolliset Aloituksen edit-napit samoin → Kehitykseen.
- **Ei riko P1:tä:** additiivinen näyttö säilyy; vain muokkaus-CTA:t reititetään.

## Reunaehdot
- **Ei uutta dataa/logiikkaa:** uudelleenkäytä engine- + editori- + kirjoittajafunktiot. Ei uutta Firestore-kenttää, **ei Rules-muutosta**, ei datamigraatiota.
- **Ei cache-bumppia:** vain `TalentMaster_VP_v25.html` (ei lib-muutosta). Jos jokin apufunktio siirtyy libiin → bump; oletus: pidä inline → ei bumppia.
- **Per-tavoite mittari + joustavat horisontit EIVÄT tässä** → P4b/P4c (älä laajenna jaksofokus-datamallia P4a:ssa).
- **Kirjoittajat ennallaan:** `_vpJfAsetaKehitysFokus`, `tmJfVaihtaaDomeenin` (arkistointi/Emil-törmäys-suoja), `_vpTtKirjoita` — ei kosketa kirjoituspolkua, vain renderöinnin sijaintia/järjestystä.
- **Alaikäiset read-only** (Eino·Leo·Emil): kirjoitukset (jaksofokus/tavoite) testataan **vain Topiaksella**; demossa ei kirjoituksia.
- **Brändi:** DS-tokenit, molemmat teemat, hiusviivat, teal/amber-aksentit, terävät kulmat. Moottorikortit = design-totuuden 2-korttimalli.
- **Mobiili §6:** työpöydän selkäranka + moottorikortit pinoutuvat kapealla.
- **Ei regressiota:** kausitavoite-muokkaus, jaksofokuksen tallennus/vaihto, kehityskaari, välitavoitteet toimivat kuten ennen — vain sijainti/järjestys/reititys muuttuu.

## EI tässä (seuraavat)
- **P4b** — multi-goal per-tavoite mittari (jokainen jaksofokus-tavoite: oma mittari Lähtö→Tavoite + cue + Opittu kun).
- **P4c** — kausitavoitteen joustavat horisontit (2–4 vapaata horisonttia + tyyppi Peli/Taito/Elämä).

## DoD
1. Kehitys-välilehti avautuu design-totuuden selkärangalla: **moottori → kausitavoite → välitavoitteet → jaksofokus → kehityskaari**; diagnostiikka (PHV/testipäivät) revealissa/lopussa.
2. Moottorin ehdotus = **2 selkeää korttia** (🎯 heikkous · 💎 supervoima), kumpikin "→ Tee tästä jaksofokus"; "moottori ei pakota" + 70/30 + §28-note + käsin-supervoima. Reuse `idpValitseHeikoin`/`idpValitseVahvin`.
3. Jaksofokus-editointi on **työpöydän ainoa selkeä koti** (inline tai selkeä työpöytäosio+nappi); kirjoittaja + arkistointi ennallaan.
4. **Aloitus = read-only:** "✎ Muokkaa jaksofokus" reitittää Kehitykseen (`_jspVaihda(3)`), ei modaalia; P1:n read-only-näyttö säilyy.
5. Ei uutta kenttää/Rules/migraatiota/cache-bumppia; kausitavoite/jaksofokus/kaari/välitavoitteet toimivat ilman regressiota.
6. Molemmat teemat + mobiili; 0 konsolivirhettä. **Verifioi live:** työpöytä loogisessa järjestyksessä, moottorin 2 polkua valittavissa, Aloituksesta ei enää muokata (reitittää), jaksofokus tallentuu työpöydältä (Topias). **Verifioi ennen mergeä.**
7. Pieni/keskikokoinen PR; kuvaus linkkaa Kehitys-lähdesivuun (`idp_kehitys.html`) + tiekartta P4a.
