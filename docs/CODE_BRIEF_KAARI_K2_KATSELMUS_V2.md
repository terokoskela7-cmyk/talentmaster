# Kehityskaari K2 (v2) — Katselmus: jaksosidos-evidenssi sulkuhetkeen · Code-brief

> **KORVAA aiemman K2-luonnoksen.** Recon (main, K1/K5a jälkeen) tarkensi sijainnin ja sen mitä on jo:
> Sulku-modaali `_vpSulkuRender` (VP_v25 ~7536+) on **string-render** ja näyttää jo **nykytilan** ("① Edistymä — peli edellä":
> ADAR-dimit · pelipaikka · D1/D2-konteksti · fyysinen `tmFyysDelta` §29). MUTTA se **ei näytä kehityskaarta jaksosidoksella** —
> eli "taipuiko kohdennettu ominaisuus *juuri tämän jakson aikana*". `tmKaariJaksoSidos(jakso, avain, sarja)` laskee tämän
> (ennen→jälkeen fokusikkunan) ja **on jo olemassa** (käytössä `tmKaariRenderFull`:n jaksoHtml:ssä). **K2 = tuo se sulkuhetkeen.**
> **Malli (K1/K5a-kuri):** string-helper, EI DOM-`tmKehityskaari(el)`. **VP_v25 only. Ei `?v`.** Reuse yli reimplementoinnin.
> **Miksi:** katselmus = "toimiko fokus?" -keskustelu (ei arvosana, §37) → kohdennetun ominaisuuden kaari tekee siitä dataperusteisen ja **sulkee silmukan**.

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN.** Reuse `tmKaariJaksoSidos` + `tmKaariSarja` (molemmat olemassa). **Älä koske:** ① Edistymä-lohkoon · `_vpEdistymaKooste`:en · `tmFyysDelta`:an · `_vpSulkuTallenna`:an · prosessilaskentaan · konsensukseen.
- **§37:** katselmus = keskustelu, kaari on **peruste, ei tuomio**. **§28:** pre-PHV "ennallaan" EI epäonnistuminen (neutraali). **§7.22:** ei koske (VP-näkymä).

## MUUTOS 1 — "② Kehityskaari tämän jakson aikana" -lohko sulku-modaaliin
Lisää ① Edistymä -lohkon JÄLKEEN (ennen Prosessi-lohkoa) uusi lohko. Sulku-tilassa on jo `S.alkoi`/`S.loppu` (jaksoikkuna) + `jf.domeeni`.
- **Jakso** = `{ alkoi: S.alkoi, paattyi: S.loppu }` (tmKaariJaksoSidos lukee alkoi/paattyi).
- **Domeeni → sarja-avain + historia:**
  - `teknis_taktinen` → `avain='tki'`, `tmKaariSarja(p.tki_historia, 'tki')`.
  - `fyysinen` → relevantti nopeus/ketteryys-avain (esim. `lin30m`/`kasirata` konseptin mukaan), `tmKaariSarja(p.hh_historia, avain)`. **Huom:** modaalissa on jo `tmFyysDelta` — **älä tuplaa**; joko (a) näytä jaksosidos-kaari sen VIERESSÄ (kaari-ilme) tai (b) reuse `tmFyysDelta` deltana + lisää vain mini-sparkline. **Ilmoita ENNEN kumpi** (suositus: a, yhtenäinen kaari-ilme kuten Mittaus).
  - `psyykkinen`/`sosiaalinen` → **ei mitattavaa sarjaa** → honest-empty: "Tälle jaksolle ei numeraalista kaarta — arvio keskustelussa + havainnot." **Ei keksitä viivaa.**
- **Render:**
  ```
  var sarja = tmKaariSarja(historia, avain);
  if (sarja.length >= 2) {
    var sidos = tmKaariJaksoSidos({ alkoi:S.alkoi, paattyi:S.loppu }, avain, sarja);   // {ennen, jalkeen, delta, parani}
    // "Tämän jakson aikana: <Nimi> <ennen>→<jalkeen>" + pieni sparkline (reuse _sparkline jos vientikelpoinen, tai tmKaariRenderFull-tyylinen rivi)
  } else { /* "Kaari tarvitsee ≥2 mittausta jaksolta — arvio keskustelussa." */ }
  ```
- **§28-neutraali:** kun `parani=false` mutta pelaaja pre-PHV (fyysinen) → näytä **neutraali** (ei punainen/amber varoitus). `parani=true` → teal. **Ei arvosanaa** kaaresta.
- **Alusta (§22):** jos fyysinen sarja sisältää eri alustoja (K1b) → jaksosidos vain saman alustan sisällä TAI näytä "▲ eri alusta — vertailu vain saman sisällä". Reuse K1b-logiikkaa jos suoraviivaista; muuten **ilmoita ENNEN**.

## MUUTOS 2 — kytkös tulokseen (ei pakota)
Kaari on **evidenssi tulos-valinnan (`_VP_KATSELMUS_TULOS`) vieressä** — EI automaattista arvosanaa. Valmentaja/VP päättää jatka/vaihda/saavutettu katsoen kaarta. `_vpSulkuTallenna` **ennallaan** (ei uutta kirjoitusta kaaresta).

## INVARIANTIT + DoD
- **Silmukka näkyy sulkuhetkessä:** kohdennetun ominaisuuden kaari + jaksosidos-delta. Reuse `tmKaariJaksoSidos` + `tmKaariSarja`.
- **Rehellinen:** psyykkinen/sosiaalinen → ei kaarta (teksti) · <2 pistettä → "arvio keskustelussa" · pre-PHV ennallaan neutraali (§28) · eri alusta → §22-merkki.
- **§37:** ei arvosanaa kaaresta; keskustelu säilyy. `_vpSulkuTallenna` koskematon. **Brändi:** 0 pinkkiä, teal/neutraali, molemmat teemat.
- **Ei tuplaa `tmFyysDelta`:aa** (fyysinen) — integroi, ei rinnakkaista toista deltaa.
- **LIVE ennen valmista (molemmat teemat):**
  - Sulje **teknis_taktinen**-jakso pelaajalla jolla ≥2 TKI-pistettä → "② Kehityskaari tämän jakson aikana: TKI <ennen>→<jälkeen>" + sparkline.
  - Sulje **psyykkinen**-jakso → honest-empty "arvio keskustelussa" (ei kaarta).
  - **Pre-PHV fyysinen** jossa ei paranemista → neutraali, ei punaista (§28).
  - Sulku tallentuu ennallaan. Vitest + eslint vihreä. Ei `?v`.

## EI TÄSSÄ (omat briffit)
- **K3** Aloitus-siru + Kehitys-evidenssi + nimikorjaus (TASO 3 "Kehityskaari" → "Jaksohistoria").
- **K4** Pelaaja §7.22 -variantti.
- Alustan normalisointikaava (K1b `_alustaNormi`-stub, kun Tero toimittaa).
