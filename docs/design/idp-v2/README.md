# IDP V2 · design-kartat (4.10.2026)

Visuaalinen ja looginen totuus IDP:lle, kehitystyöpöydälle, VP:n pelaajaraportille (PDC), videokeskustelulle ja Pelaaja-appin V2:lle. Kartat on tehty Claude-suunnittelusessiossa ja hyväksytetty Terolla. Avaa HTML suoraan selaimessa (itsenäisiä, vain Google Fonts ulkoisena).

**Aloita tiedostosta `00_projektikartta.html`**: toteutusjärjestys, tila ja päätökset.

| Tiedosto | Sisältö | Rooli |
|---|---|---|
| `00_projektikartta.html` | Toteutusjärjestys T1 → P0 → R6.0–R6.7, dokumentit, päätökset, aukot | hakemisto |
| `01_idp_kehitystyopoyta_kokonaiskartta.html` | Kehitystyöpöytä (VP + valmentaja): Tänään · Polku · Näyttö, Polun tila, IDP-kortti kauden valikkona, jakso kortilta, katselmus, pelipaikkaprofiili U14+, ikävaiheprofiilit, tarkistuslista | **pää-SSOT** |
| `02_vp_raportointi_pdc.html` | VP Raportointi → Pelaajaraportti (PDC), Design V2, linkki Polkuun | VP |
| `03_kehityssuunnitelma_2_0.html` | Kortti · jakso · keskustelu, videon ikätasot, Perhe-app, tietosuoja (rekisterinpitäjä/käsittelijä), VEO | logiikka + tietosuoja |
| `04_videokeskustelu_kartta.html` | 9 näkymää: Inbox, liitä VEO-klippi, lupavartija, Perhe U8–12, pelaaja U13/U15, VP-tilanne, videolupa | R6.4 Sibbo-pilotti |
| `05_pelaaja_app_v2_kartta.html` | Pelaaja-app Tänään · Minä · Joukkue, P0–P19, sparrattu | Pelaaja_v7 |
| `06_design_v2_luettavuus.html` | 7 luettavuussääntöä, tokenit, ennen/jälkeen | T1/T2 |
| `07_avoimet_paatokset.html` | D1–D9 + P selitettynä | päätökset |
| `08_looginen_jatkumo_perustelut.html` | Silmukan, roolien ja teknisen selkärangan (`lib/tm_kehityssilmukka.js`) perustelut | tausta |

Brief: `docs/CODE_BRIEF_DESIGN_V2_T1_KONTRASTI.md`.

## Säännöt toteutukseen
- Esimerkkidata on osin keksittyä. Topias K. (KPV U13) on testipelaaja; muut nimet keksittyjä.
- Älä kopioi mockupin CSS:ää sellaisenaan: käytä sovelluksen omia tokeneita (Design V2 / design system).
- §7.22 (pelaajalle ei tasolukuja eikä vertailua), §11 (Firestore vain additiivisesti), §31 (mitali vain kokonaisajasta), terveystieto vain `terveys/`.
- Kaikki uudet tekstit `tm_lang`-avaimiksi, sv-käännökset odotuslistalle (Gemini).
- Avoimet päätökset (07) ratkaisevat osan näkymistä: tarkista tila projektikartasta ennen toteutusta.
