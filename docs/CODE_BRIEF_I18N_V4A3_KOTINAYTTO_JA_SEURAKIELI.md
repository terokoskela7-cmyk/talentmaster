# Code-brief — i18n VAIHE 4-A3 · Pelaaja-kotinäytön loput chrome-tekstit sv + seura.kieli-oletuksen kytkentä

> **Konteksti (V4-A2 live-verifioinnin löydökset):** V4-A2 käänsi kotinäytön S-kortin + D-fallbackin sisällön
> sv:ksi (PASS, mergattu #406). Live-tarkastuksessa löytyi **samalta kotinäytöltä kaksi erillistä aukkoa** joita
> V4-A2 ei kattanut (eivät sen skoopissa):
>
> **A) 4 kovakoodattua/reitittämätöntä suomenkielistä chrome-tekstiä** kotinäytöllä → jäävät suomeksi sv-tilassa.
> **B) Seura-oletuskieli (`seurat/{id}.kieli`) ei kytketty:** Pelaaja/Vanhempi eivät koskaan lue/sovella seuran
> kieltä → `eif.kieli='sv'`-migraatio ei tee mitään, EIF-perhe laskeutuu suomeksi (kunnes napauttaa SV käsin).
>
> **Kielivalitsin TOIMII jo** (FI/SV/EN, `setLoc()`/tmAsetaKieli, localStorage voittaa seura-oletuksen) — tätä EI muuteta.
> Tämä briiffi tekee (A) kotinäytön 100% sv-tilassa kun kieli on sv, ja (B) niin että ruotsiseura saa sv-oletuksen ilman käsin-napautusta.

---

## OSA A — Kotinäytön loput suomenkieliset chrome-tekstit → i18n

Kaikki `TalentMaster_Pelaaja_v7.html`:n `rA1()`-render-lohkossa (kotinäyttö). Reititä `t()`-avaimella (UI-labelit → `tm_lang.js`)
tai `_hT`:llä (harjoitesisältö → V4-A2:n `HARJOITE_I18N.sv.pelaaja`-kartta). **Kaikki 3 kieltä (fi/sv/en) — en tulee samalla.**

| # | Teksti | Sijainti | Tyyppi | Ratkaisu |
|---|--------|----------|--------|----------|
| A1 | **"Näin teet"** | rivi ~871, `_dKortti`-helperin sisällä (kovakoodattu `<span>…Näin teet</span>`) | UI-label (näkyy KUMMALLAKIN D-kortti-haaralla kun `ohje` on) | uusi `tm_lang`-avain esim. `pelaaja.nain_teet` (fi "Näin teet" · sv "Så här gör du" · en "How to do it") → `t('pelaaja.nain_teet')` |
| A2 | **"Pallo joka päivä"** | rivi ~945, Bola Siempre -T-kortin otsikko (kovakoodattu) | UI-label | uusi avain esim. `pelaaja.pallo_joka_paiva` (sv "Bollen varje dag" · en "Ball every day") → `t(...)` |
| A3 | **`getTHarjoiteWhy(stage)` -kannustus** | rivi ~940, `tWhy` renderöity ilman käännöstä (rivi ~947 `${tWhy}`) | harjoitesisältö (21 lausetta, kiertää päivittäin) | reititä `_hT`:llä: `const tWhy = _hT(getTHarjoiteWhy(stage))` **+ lisää 21 fi→sv-paria** `HARJOITE_I18N.sv.pelaaja`-karttaan (ne ovat jo valmiina `docs/CODE_BRIEF_I18N_V4A2_SV_REFERENSSI.js`:ssä — getTHarjoiteWhy-osio) |
| A4 | **"Miltä sinusta tuntuu?"** + fiilis-labelit **Väsynyt · Vähän väsynyt · OK · Hyvä · Mahtavaa** (+ leikkijä: Väsynyt/OK/Hyvä) | rivit ~977–980, `fiiEmojit`-taulukko + otsikko (kovakoodattu) | UI-labelit | `t()`-avaimet. Osa on jo `tm_lang`:ssa (`va_fiilis_ok`='OK', `fiilis_vasynyt`='Väsynyt') — käytä olemassaolevia, lisää puuttuvat ("Miltä sinusta tuntuu?", "Vähän väsynyt", "Mahtavaa"). Code valitsee siistin avainnimeämisen. |

**HUOM reachable-rajaus:** käännä VAIN se mitä pelaaja oikeasti näkee kotinäytöllä. Jos löydät muita kovakoodattuja
fi-chrome-tekstejä samasta `rA1`-lohkosta (esim. joukkuetreeni-gate ~990+, ilmoitukset), **listaa ne** — voidaan
ottaa samaan passiin tai jättää; ilmoita ENNEN jos laajenee paljon.

**A3-täsmennys — getTHarjoiteWhy myös "sisalto" vai "pelaaja"?** Se on Pelaaja_v7:n kotinäytön sisältöä (tm_why_lauseet.js) →
kuuluu **`pelaaja`-alikarttaan** (kuten V4-A2:n muut why-lauseet), EI `sisalto`-karttaan (V4-A T-pankki). Orpo-avain-invariantti säilyy.

---

## OSA B — Seura-oletuskielen (`seurat/{id}.kieli`) kytkentä (PÄÄTÖS TARVITAAN)

**Nykytila (verifioitu):** `Pelaaja_v7` + `Vanhempi_v2` kutsuvat vain `tmKieliInitSeura(null)` bootissa → localStorage tai 'fi'.
Seuran `kieli`-kenttää **ei lueta koskaan**. `tm_lang.js`:n `tmKieliInitSeura(seuraKieli)` on valmis ottamaan sen vastaan
(prioriteetti: käyttäjän manuaalivalinta localStorage → seuraKieli → 'fi'), mutta sitä **ei kutsuta seuran kielellä**.

**Este:** Firestore Rules (`tm_admin/firestore.rules` ~299) `seurat/{id}` doc: `allow read: onKirjautunut() && (onSuperAdmin() || onOmaSeura())`.
**Anonyymi PIN-pelaaja EI voi lukea seuradokumenttia** (ei seuraId-claimia) → suora `seurat/{eif}.get().kieli` = permission-denied.

**Tavoite:** kun EIF-pelaaja/-vanhempi kirjautuu (eikä ole tehnyt manuaalivalintaa), appi laskeutuu **sv**:hen automaattisesti.
Manuaalivalinta (FI/SV/EN-napit) voittaa yhä aina — tätä EI muuteta.

### Ratkaisuvaihtoehdot (Code valitsee + toteuttaa, ilmoita valinta ennen)

- **Vaihtoehto A (suositus) — denormalisoi `kieli` pelaajadokumentteihin.** Pelaaja/Vanhempi lukevat jo oman pelaajadokin
  (anon-luku sallittu, `seurat/{id}/pelaajat/{pid}`). Lisää kirjautumisflow'hun: kun `_pelaaja` on ladattu, jos siinä on
  `kieli`-kenttä → `tmKieliInitSeura(_pelaaja.kieli)` + `draw()`. **Ei uutta lukua, ei Rules-muutosta.** Vaatii että
  pelaajadokeille kirjoitetaan `kieli` seuran kielestä: laajenna `scripts/i18n_set_kieli_sv.js` (tai Seura-tallennus)
  kirjoittamaan `kieli:'sv'` myös seuran pelaajadokeille (idempotentti, batch). Vanhempi lukee lapsen pelaajadokin → sama.
- **Vaihtoehto B — julkinen ali-dokki `seurat/{id}/public/config` (kieli), anon-luettava.** Rules-lisäys (`allow read: onAnonymous()||onKirjautunut()`)
  + Console-deploy. Appi lukee sen kirjautumisen jälkeen. Vaatii Rules-muutoksen + deployn.
- **Vaihtoehto C — löysää `seurat/{id}` doc-lukua anonille.** EI suositella (paljastaa koko seuradokin anonille).

**Suositus = A** (ei Rules-muutosta, ei ylimääräistä lukua; kieli on jo osa pelaajakontekstia). Denormalisointi hyväksyttävää:
kieli on harmiton, ei-arkaluontoinen kenttä. Jos seuran kieli muuttuu myöhemmin, sama migraatio ajetaan uudelleen (idempotentti).

**Molemmat apit:** Pelaaja_v7 + Vanhempi_v2 (sama kytkentä). Master/VP/Seura eivät kuulu tähän (henkilöstö-i18n on oma vaihe).

---

## Vartijat (molemmat osat)
- **§7.1 string-concat `+`** — kotinäytön kortit käyttävät sekä template-literaaleja että `+`-konkatenointia; älä lisää
  nested template literaleja render-puolelle. `t()`/`_hT`-kutsut `${...}`-interpoloituna olemassaolevaan templateen OK.
- **§7.22 EHDOTON:** getTHarjoiteWhy + fiilis-labelit ovat jo §7.22-turvallisia fi:ssä; sv ei saa tuoda tasolukuja/vertailua/uhkaa.
  Fiilis = neutraali olotila-kysely, ei suoritusarvio.
- **fi ei rikkoudu:** fi-tila identtinen (fallback). Characterization 21 + V4-A/V4-A2-testit vihreinä.
- **Kielivalitsin ennallaan:** `setLoc()`/`tmAsetaKieli` + localStorage-prioriteetti EI muutu. Käyttäjävalinta voittaa yhä seura-oletuksen.
- **Fallback ehdoton:** puuttuva sv-avain / puuttuva `kieli`-kenttä pelaajadokissa → fi näkyy, ei tyhjää, ei kaadu.
- **Kanoninen root (§A7):** `HARJOITE_I18N.sv.pelaaja` asuu `harjoitelogiikka_v4.js`:ssä (root). tm_lang-avaimet `lib/tm_lang.js`:ään.
- **Cache-bust:** jos `harjoitelogiikka_v4.js` muuttuu (A3-kartan kasvu) → `?v=11 → ?v=12` Pelaajassa. Jos `tm_lang.js` muuttuu
  (uudet avaimet) → `?v=3 → ?v=4` **Pelaajassa JA Vanhemmassa** (molemmat lataavat sen). Pelaaja/Vanhempi HTML muuttuu → SW-bump
  (`sw_pelaaja.js` v17→v18, `sw_vanhempi.js` vastaava).
- **§5:** ei väri-/fonttimuutoksia.

## DoD
- **A:** sv-tilassa Pelaaja-kotinäyttö **täysin ruotsiksi** — D-kortin "Näin teet", Bola Siempre -otsikko + kannustus,
  fiilis-osio. Ei suomenkielisiä jäänteitä reachable-kotinäytöllä. en samalla rakenteella.
- **B:** EIF-pelaaja/-vanhempi (jolla ei manuaalivalintaa) laskeutuu **sv**:hen automaattisesti seuran kielen perusteella;
  manuaalivalinta voittaa yhä; fi-seuran pelaaja laskeutuu fi:hin. Vaihtoehto A: pelaajadokeille kirjoitettu `kieli` +
  migraatio ajettavissa EIF:lle.
- fi-regressio ehjä. §7.22 säilyy. Vitest + eslint vihreä. Cache-bustit + SW-bumpit tehty.

## Verifiointi (Claude L3)
Molemmat teemat, fi + sv + en:
- **A:** kotinäyttö sv → kaikki 4 kohtaa ruotsiksi, fi ennallaan, kielivaihto vaihtaa; fallback ei kaada.
- **B:** simuloi pelaaja jolla `kieli:'sv'` (ei manuaalivalintaa localStoragessa) → appi sv; sama pelaaja localStorage='fi' → fi (manuaali voittaa).
- 0 tasolukua/vertailua sv-sisällössä. **Poikkeama = ilmoita ENNEN.**

## Rajaus (EI tässä)
- Kielivalitsimen logiikka (toimii jo). aiProxy/ADAR-narratiivi (V4-B). Henkilöstöpinnat Master/VP/Seura (oma vaihe).
- EX-timer / dHarjoite-lämmittely (eri näkymä kuin kotinäytön kortit) — ellei löydy reachable-kotinäytöltä.
