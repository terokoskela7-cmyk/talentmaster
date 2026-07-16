# CODE — P4a.1: Kehitys-työpöytä — selkeys (progressiivinen avaus + hierarkia + yksi fonttijärjestelmä)

**Tyyppi:** UI-selkeytys (näyttö/IA, ei uutta dataa). **Yksi PR. Rakentuu #193 (P4a) päälle** — mergeä P4a ensin.
**Kohde:** `TalentMaster_VP_v25.html` — Kehitys-välilehti `_jspTab3` (P4a:n `_kehExtra`-koonti: `_vpMoottoriKortitHTML` · `_vpKausitavoiteHTML` · `_vpTyopoytaJaksofokusHTML` · kehityskaari · diagnostiikka-reveal).
**Design-totuus:** hyväksytty `idp_kehitys_selkea.html` (progressiivinen työpöytä). Tiekartta **P4a.1**. Ohje on itsenäinen.

## Miksi

P4a sai **järjestyksen** kuntoon mutta ei **selkeyttä**: kaikki kentät auki yhtä aikaa (seinä tekstiä), moottorin painopiste **toistui** (kärjen 2 korttia + kausitavoitteen sisäinen "IDP-MOOTTORIN PAINOPISTE"-segmentti), IDP-hierarkia (kausi › jakso › kaari) ei erottunut, ja fontit olivat kirjavia. Tero: *"paljon tekstiä… sekava… mikä on kausitavoite ja missä jaksotavoitteet… otsikot selkeät, napilla avautuu."* P4a.1 korjaa neljä asiaa. **Ei uutta dataa/logiikkaa — sama sisältö, selkeämpi esitys.**

## Mitä tehdään

### 1. Progressiivinen avaus — "Kehityssuunnitelma" -haitari (3 tasoa)
Kokoa kausitavoite + jaksofokus + kehityskaari **yhteen haitariin** (design-totuuden `.acc`/`.row`). Jokainen rivi = **suljettu yhden rivin tila** + klikattava otsikko joka avaa sisällön:
- **Suljettu rivi näyttää:** ikoni · taso-eyebrow · serif-otsikko · yhden rivin tila · tila-chip · chevron. Esim. "🎯 · TASO 1 · KOKO KAUSI · **Kausitavoite** · Kestävyys · syksy 2026 · [○ Ehdotettu] · ›".
- **Avautuu klikkaamalla** → näyttää editorin/sisällön (nykyinen `_vpKausitavoiteHTML` / `_vpTyopoytaJaksofokusHTML` / kehityskaari-render **sellaisenaan** rivin bodyssä).
- **Useampi voi olla auki samaan aikaan** (Tero-toive): klikkaus togglaa vain oman rivin (`classList.toggle('open')`), ei sulje muita.
- **Tyhjä tila = selkeä CTA:** ei kausitavoitetta → rivi näyttää "＋ Tee kausitavoite"; ei jaksofokusta → "＋ Aseta jaksofokus". (Reuse olemassaolevat tyhjätila-CTA:t; nosta ne rivin bodyyn.)
- **Oletusavaus:** jos kausitavoite puuttuu → Kausitavoite-rivi auki (ohjaa tekemään). Muuten kaikki voi olla kiinni (yhden rivin yhteenveto riittää 10 s katsaukseen).

### 2. IDP-hierarkia näkyväksi (kausi › jakso › kaari)
Kolme riviä otsikoidaan tasoina niin että suhde on ilmeinen — **tämä poistaa "mikä on kausitavoite / missä jaksotavoitteet" -sekaannuksen:**
- **🎯 Kausitavoite** — eyebrow "TASO 1 · KOKO KAUSI" (IDP-ydin).
- **📍 Jaksofokus** — eyebrow "TASO 2 · TÄMÄ JAKSO · MESO 4–8 VK".
- **🗺 Kehityskaari** — eyebrow "TASO 3 · HISTORIA".
- "Kehityssuunnitelma"-osion yläpuolelle pieni murupolku: `kausi › jakso › kaari`.

### 3. Yksi fonttijärjestelmä (korjaa kirjavuus)
Noudata design-systeemiä johdonmukaisesti (ei uusia arvoja): **otsikot Cormorant Garamond** (serif, ei bold) · **leipä/labelit DM Sans** · **meta/numerot/aikaleimat DM Mono**. Eyebrow'it UPPERCASE, 9–10px, väljä kirjainväli, `--ink3`/teal. Poista sekalaiset inline-fonttikoot: rivin otsikko yhtä serif-kokoa, tila-teksti yhtä sans-kokoa, meta mono. **Käytä olemassaolevia DS-tokeneita** (`--font-serif/-sans/-mono`, `--ink/-ink2/-ink3`, `--teal-d`, hiusrajat) — ei kovakoodattuja värejä/fontteja.

### 4. Moottorin duplikaatti pois — yksi koti
Moottorin painopiste esitetään **vain kärjen 2 kortilla** (`_vpMoottoriKortitHTML`, P4a). **Poista kausitavoitteen sisäinen toisto:** `_vpKausitavoiteHTML`:n "IDP-MOOTTORIN PAINOPISTE · Korjaa heikkous / Jalosta vahvuus / Pelipaikka" -segmentti (`_modBtn`-rivi) — se on sama valinta toiseen kertaan. Painopisteen valinta tapahtuu kärjen korteista; kausitavoite näyttää **valitun** fokuksen (ei valitsinta uudelleen). (Jos jokin muokkaustila tarvitsee fokuksen vaihdon, se hoituu olemassaolevalla `_vpFokusValintaHTML`-fokusvalinnalla — ei koko painopiste-segmenttiä.)

## Reunaehdot
- **Ei uutta dataa/logiikkaa:** sama sisältö + kirjoittajat (`_vpKausitavoiteHTML`, `_vpTyopoytaJaksofokusHTML`, `_jfOhjaa`, `_vpJfAsetaKehitysFokus`, `tmJfVaihtaaDomeenin`, `_vpKehityskaariHTML`) — **vain kääritään haitariin + siivotaan typografia + poistetaan duplikaatti.** Ei uutta Firestore-kenttää, **ei Rules-muutosta**, ei migraatiota.
- **Ei cache-bumppia:** vain `TalentMaster_VP_v25.html` (ei lib-muutosta).
- **Ei regressiota:** kausitavoitteen muokkaus/hyväksyntä, jaksofokuksen tallennus/vaihto, välitavoitteet, kehityskaari, 8 vk -banneri, pelaajan ääni, sitoumus toimivat kuten ennen — vain sijoitettuna haitarin rivin bodyyn. **Kaikki nykyiset kentät mahtuvat** (perustelu, sitoumus, banneri) — älä pudota mitään, vain ryhmitä selkeästi (fglab-otsikot).
- **Aloitus ennallaan** (P4a:n read-only-reititys säilyy).
- **Brändi:** design-totuuden `idp_kehitys_selkea.html` mukaan — molemmat teemat, hiusrajat, terävät kulmat, teal-aksentti, emoji semanttisina ikoneina (🎯 kausi · 📍 jakso · 🗺 kaari · 💎 supervoima).
- **Mobiili §6:** haitari + moottorikortit pinoutuvat kapealla (korttiruudukko 1-sarakkeiseksi).
- **Alaikäiset read-only** (Eino·Leo·Emil); kirjoitukset testataan **vain Topiaksella**.

## EI tässä (seuraavat)
- **P4b** — multi-goal per-tavoite mittari (jaksofokus-tavoitteet, kukin oma mittari Lähtö→Tavoite).
- **P4c** — kausitavoitteen joustavat horisontit (2–4 · tyyppi Peli/Taito/Elämä).

## DoD
1. Kehityssuunnitelma on **haitari** (Kausitavoite · Jaksofokus · Kehityskaari); suljettu rivi = yhden rivin yhteenveto + tila-chip; klikkaus avaa sisällön; **useampi voi olla auki yhtä aikaa**.
2. **IDP-hierarkia näkyy:** eyebrow'it TASO 1 · koko kausi / TASO 2 · tämä jakso · meso / TASO 3 · historia + murupolku `kausi › jakso › kaari`.
3. Tyhjä tila → selkeä CTA rivillä ("＋ Tee kausitavoite" / "＋ Aseta jaksofokus"); puuttuva kausitavoite → rivi auki.
4. **Yksi fonttijärjestelmä** (Cormorant otsikot · DM Sans leipä · DM Mono meta), DS-tokeneilla; ei kirjavia inline-kokoja/fontteja.
5. **Moottorin duplikaatti poistettu:** painopiste vain kärjen 2 kortilla; kausitavoitteen sisäinen `_modBtn`-segmentti pois.
6. Ei uutta kenttää/Rules/migraatiota/cache-bumppia; **ei regressiota** (kaikki nykyiset kentät + kirjoitukset toimivat haitarin sisällä).
7. Molemmat teemat + mobiili; 0 konsolivirhettä. **Verifioi live:** työpöytä on selkeä (ei seinää), hierarkia luettavissa, osiot avautuvat/sulkeutuvat vapaasti (useampi kerralla), moottori esiintyy kerran, tallennukset toimivat (Topias). **Verifioi ennen mergeä.**
8. Pieni/keskikokoinen PR; kuvaus linkkaa `idp_kehitys_selkea.html` + tiekartta P4a.1.
