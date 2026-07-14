# CODE — IDP-kortin migraatio: 7 välilehteä → 5 (IDP on kortti)

**Tyyppi:** pelaajakortin tietoarkkitehtuurin uudelleenjärjestely. **Vaiheittain, ei riko livea** — kukin vaihe oma PR, verifioidaan ennen seuraavaa. **Kohde:** `TalentMaster_VP_v25.html` (+ Pelaaja v7 kun runko vakaa).

**Design-totuus:**
- `docs/design/idp-kortti/IDP-kortti.dc.html` — brändintarkka visuaali repossa (IDP v2, Kimin palautteesta).
- **Kaksi hyväksyttyä design-karttaa** (toimitettu artifakteina, tämä ohje tiivistää ne): **kokonaiskartta** (rakenne 7→5, mikä sulautuu mihin) + **"Näin korttia käytetään"** (rooli-käyttö, moottorin kaksi polkua, x-factor, napit, selkeys). Kaikki niiden päätökset on kirjattu tähän ohjeeseen alle — ohje on itsenäinen.

**Periaate:** mitään ei pakoteta, asiantuntija päättää. Puuttuva kenttä = pehmeä vihje, ei este.

---

## KOHDE — 5 välilehteä = kortti

`Aloitus · Mittaus · Arviointi · Kehitys · Viikko`. **"IDP" ei ole välilehti — IDP on kortti.** Nykyinen 7-välilehtinen modaali (Aloitus·Fyysinen·Tekninen·Peli·Kehitys·Arviointi·IDP) konvergoituu näihin viiteen.

**Kokonaisuus:** IDP-kortti on **yksi määränpää, monta sisääntuloa.** Työ jakautuu kahteen: (1) **reititys + työtilat** = mistä korttiin tullaan (Vaihe 0 + Talentit-työtila), (2) **kortin sisältö** = 5 välilehteä (Vaihe A–D).

## LÄPILEIKKAAVAT PERIAATTEET (joka vaihe noudattaa)

1. **X-Factor ensiluokkainen.** Kortti vastaa näkyvästi "mikä tekee tästä pelaajasta erityisen?". Infrastruktuuri on jo: X-Factor-signaali (`signaali:'xfactor'`), vahvuus-moottori (`idpValitseVahvin`/`idpKeraaVahvuudet`, `tm_idp.js`), 70/30-ankkuri. Nosta ne piilosta esiin.
2. **Moottori tarjoaa KAKSI polkua rinnakkain** — "Korjaa heikkous" (`idpValitseHeikoin`) JA "Jalosta supervoima" (`idpValitseVahvin`). Ei toggle-napin takana; molemmat näkyvissä, asiantuntija valitsee.
3. **Rooli-linssi.** VP: vahvista/yliaja/kalibroi (sininen). Valmentaja: aseta/arvioi (teal). Sama kortti tietää kuka katsoo.
4. **Selkeys ennen tiheyttä.** Tiiviste ensin → detalji porautumalla. Progressiivinen paljastus (top-3 + "+ N lisää", kuten pelipaikkafundamenteissa). Ei tekstiseinää/täyttä taulukkoa etusivulla.
5. **Napit, ei seiniä.** Jokaisella välilehdellä 1–3 ensisijaista, roolin mukaista nappia (ks. käyttö-kartta §6). Kortti = työkalu.

---

## VAIHE 0 — Reititys: kaikki sisääntulot → kortti (TEHDÄÄN ENSIN, oma PR)

Kortti on saavutettava jokaisesta pelaajaa näyttävästä pinnasta. Nyt osa reiteistä on kytketty, osa on kuolleita tynkiä.

**Nykytila:** oikea avaaja `_avaaPerPelaajaPikakatsaus(idx, joukkueNimi)` — kytketty Pelaajat-listaan (rivi ~12905) + joukkuepopupiin (~7338). **MUTTA** `avaaPelaaja(pid)` (rivi ~3175) on tynkä: `function(id){ _sigStub('Pelaaja: '+id+' — tulossa'); }`. Siihen on kytketty **Tilanne-Talentit-taulukko** (~12051), **Hidden Gem -lista** (~12088) ja **Koti-signaalien "Katso profiili"** (~3065) → kaikki kuolleita päitä.

**Tee:** korjaa `avaaPelaaja(pid)` avaamaan oikea kortti — ratkaise pid → pelaaja (esim. `window._jsvPelaajat`) ja avaa kortti (kutsu `_avaaPerPelaajaPikakatsaus` oikealla idx+joukkueella, tai refaktoroi avaaja ottamaan pid). Älä jätä yhtään "tulossa"-tynkää pelaajan avaukseen.

**Hyväksymiskriteeri:** Tilanne-Talentit, Hidden Gem -lista ja Koti-signaalien "Katso profiili" avaavat saman pelaajakortin. Ei regressiota Pelaajat-listaan.

## VAIHE A — Aloitus-etusivu (oma PR)

Kasvata nykyinen `_vpIdpNarratiiviHTML` (1b) kortin **etusivuksi**. Lisää:

- **X-Factor-identiteetti** heti otsikon alle: pelaajan supervoima **nimettynä** (X-Factor-signaali + korkein havaittu/`tki_vahvuus`), ei piilossa tagina. "Erottava ase: [nimi]".
- **Stat-kortti-tiiviste** (IDP v2 mockup): 3 viimeisintä mittausta trendillä (esim. 30m/CMJ/MAS, ↑/↓ vs ikäluokan KA).
- **Moottorin ehdotus KAHTENA polkuna:** "Korjaa heikkous" + "Jalosta supervoima" vierekkäin, kummallakin nappi **"→ Tee tästä tavoite"**. (Nykyinen yksipolkuinen ehdotus laajenee.)
- **Säilytä** narratiivi: Kausitavoite + aktiivinen Jaksofokus + pelaajan ääni & sitoumus.
- **Rooli:** VP näkee "✓ Vahvista sitoumus", valmentaja "✎ Aseta jaksofokus".

**Hyväksymiskriteeri:** Aloitus silmäiltävissä ~10 s; x-factor näkyy; molemmat ehdotuspolut nappeineen; sitoumus/vahvistus roolin mukaan. Molemmat teemat.

## VAIHE B — 7 → 5 sulautus (oma PR)

Ryhmittele olemassa oleva sisältö uudelleen — **älä poista dataa, järjestä välilehdet:**

- **Mittaus** = `Fyysinen` + `Tekninen` (mitattu testidata). Kova, lukittu numero.
- **Arviointi** = `Tekninen` (havaittu) + `Peli` + `Arviointi`. 5D-radar (PHV-normi, P1.2) + kohteet&lähteet per dimensio (mitattu/havaittu/pelihavainto). Tämä on Kimin "Arviointi".
- **Kehitys** = pysyy (tavoitemoottori + SMART + välitavoitteet + pelipaikkafundamentit + kaari). Nosta **"Jalosta vahvuus"** -nappi tasavertaiseksi.
- **IDP-välilehti POISTUU** — sen sisältö on nyt Aloituksessa.
- Päivitä `_jspTabit` = `[Aloitus, Mittaus, Arviointi, Kehitys, Viikko]`; `_jspVaihda` + `window._jspTabN` seuraavat (dynaaminen, kuten 1b).

**Hyväksymiskriteeri:** 5 välilehteä, ei sisältöhukkaa, vanhat näkymät löytyvät uudesta kodista. Molemmat teemat, vitestit vihreinä.

## VAIHE C — Sivupalkki linkittämään (oma PR)

`renderJaksofokus` (joukkuetaulukko): rivistä **avaa pelaajan kortti** (`_avaaPerPelaajaPikakatsaus`). Poista per-pelaaja-editointipinnan duplikaatti sivupalkista; **säilytä joukkuenäkymä** (kattavuus, teemakeskittymä → ryhmäharjoite). `_jfOhjaa` pysyy yhtenä jaettuna editorina.

**Hyväksymiskriteeri:** joukkuetaulukosta pääsee korttiin; "kaksi samannimistä Jaksofokusta" -sekavuus poistuu; ryhmäharjoite säilyy.

## VAIHE D — Viikko (viimeisenä kortin sisällössä, oma PR)

Kuormitus/RPE-kooste + viikon sessiot + läsnäolo. Additiivinen, kun runko vakaa.

## VAIHE E — Talentit-työtila (uusi vasemman navin työtila; oma PR, aikataulu joustava)

Talenttien hallinta = tuotteen ydinarvo (KV-rekrytointi), nyt hajallaan. Nosta omaksi työtilaksi ja kokoa yhteen. Jokainen rivi → yksi klikkaus → IDP-kortti (Vaihe 0 reititys).

**Kokoa yhteen:**
- **IDP-jono** — ehdotettu / aktiivinen / hyväksyntää odottava (nyt Pelaajissa).
- **Signaalit** — X-Factor · Hidden Gem · Underdog -ehdokkaat.
- **Extra-valmennuksen kohteet** — ikäluokka→kehitysvaihe (kypsyyskorjattu §28) -taulukko → **SIIRRÄ Tilanteesta tänne** (`_talentit*`-render).
- **Siirtopäätökset** — rekrytointi/siirto-päätösjono.

**Rajat:**
- **Tilanne PYSYY** — joukkueen 5D-terveys. Siistitään VAIN talent-taulukosta (extra-valmennus siirtyy Talentit-työtilaan).
- **Ero Pelaajat-välilehteen:** Pelaajat = koko kortisto (hakemisto, kaikki). Talentit = päätös/pipeline-ohjaamo (kuratoitu, toiminnallinen). Ei kahta samaa listaa — eri kysymys, sama kortti määränpäänä.
- X-Factor etualalle (rekrytoinnin tärkein signaali).

**Hyväksymiskriteeri:** uusi Talentit-työtila kokoaa IDP-jonon + signaalit + extra-valmennuksen + siirtopäätökset; Tilanne siistiytyy 5D-terveydeksi; kaikki rivit avaavat kortin. Molemmat teemat.

---

## NAPIT per välilehti (käyttö-kartta §6 — roolin mukaan)
- **Aloitus:** → Tee tästä tavoite · ✎ Muokkaa jaksofokus · ✓ Vahvista sitoumus (VP)
- **Mittaus:** + Lisää mittaus · Vertaa ikäluokkaan
- **Arviointi:** Arvioi (havaittu) · Kalibroi (VP) · Jalosta supervoima
- **Kehitys:** Ehdota tavoite · Jalosta vahvuus · + Välitavoite · Sulje jakso
- **Viikko:** Kirjaa kuormitus

## REUNAEHDOT
- **Alaikäiset:** Eino · Leo · Emil = read-only. **Topias Koskela = testi-OK.**
- **GDPR:** terveys → `terveys/`-alikokoelmaan, ei vapaatekstiin/pisteisiin.
- **Cache:** lib muuttuu → bumppaa `?v=N`. **Firestore-säännöt:** deploy PR→N4-CI.
- **Brändi:** DS-tokenit, molemmat teemat `data-theme`, Cormorant/DM Sans/DM Mono, terävät kulmat, hiusviivat, ei gradientteja.

## DoD (joka vaihe)
1. Renderöityy molemmissa teemoissa (screenshot molemmista).
2. Ei sisältö-/datahukkaa; olemassa olevat funktiot uudelleenkäytetään.
3. Vitestit vihreinä. Pieni PR, kuvaus linkkaa design-karttoihin + tähän ohjeeseen.
4. **Verifioi live ennen seuraavaa vaihetta** — tämä on re-IA, ei saa rikkoa livea.
