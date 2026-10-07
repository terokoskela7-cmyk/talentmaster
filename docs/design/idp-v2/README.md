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
| `09_pelaaja_kentta.html` | **Pelaaja-appin ilme "Kenttä"** (hyväksytty 5.10.): ase on alue kentällä, jakso on reitti, viikot merkkejä. Tänään (kaikki tilat ja kaikki v7-lohkot), Valitse reitti (D8), Oma kenttä, U8–12, valmentajan joukkuekenttä ja jakson aloitus, katselmus, huoltaja, tokenit. Puhelinkuvat: `kuvat/09_*.png` | **pelaaja-SSOT** |
| `10_pelaaja_v7_kentta_suunnitelma.html` | Pelaaja_v7:n analyysi koodista ja siirtymä Kenttään: K0–K7 (pelaaja) + V1–V3 (valmentaja), lipun takana, additiivinen data, päätökset P1–P6 (= 07: D10–D15) | Pelaaja_v7 |
| `11_keskuspuolustajan_idp_malli.html` | Keskuspuolustajan IDP-malli: profiilit, 5 käyttäytymistä, 💎 Ase, pelipaikka U14+ sanoin (05 P19) | pelipaikka |
| `12_jaksologiikka.html` | **Jaksologiikka:** joukkuejakso neljällä alueella (tekn.-takt., fyysinen, henkinen, sosiaalinen) jalkautuu pelaajan jaksoksi: ydinvahvuus + 0–2 tukitavoitetta, joiden lähde (joukkuejakso, testi, havainto, arviointi, pelaajan arvio, suunnitelma) tallennetaan ja moottori ehdottaa portaittain. **D17–D22 lukittu 6.10.** | jakso · täydentää 01/08 |
| `13_kehitystyopoyta_kentta.html` | **Kehitystyöpöytä kentällä (VP + valmentaja):** nykyisten viiden välilehden kartta → Tänään · Polku · Näyttö Kenttä-ilmeessä, Polun tila `tmSeuraavaAskel`-portaasta, "Pelaajan silmin" -kytkin, jakson aloitus (V1), katselmus ja historia, joukkuekenttä taktiikkatauluna (V2). **D23–D25 lukittu 6.10.** | valmentaja/VP · Kenttä |
| `14_joukkueen_viikko_kentta.html` | **Joukkueen viikko kentällä:** viikko ankkuroituna otteluun (peli ±n), päivän painotus, alue, pelimuoto ja tavoitekuorma viikkopohjasta (Palloliitto tai seuran oma), harjoituksen rakenne seuran linjasta, **alue kentälle → harjoite seuran pankista** (D29), kuorma suunniteltu vs. toteutunut nykyisestä kuormituskyselystä, pelaajan ja huoltajan viikko. Päätökset D26–D29 auki | valmentaja/VP · viikko |
| `15_kausisuunnitelma.html` | **Kausisuunnitelma ja periodisaatio:** seuran linja → kausivaiheet (siirtymä, valmistava, kilpailu) → vuosikellon teemat → joukkuejakso ja viikkotavoitteet → viikko → pelaaja. VP:n kausinäkymä, vaihe valitsee viikkopohjan ja kuormatason, **seuran ryhmät** (maalivahdit, talentit, IDP, osajoukkue) kalenterin kohdistukseen ja IDP-blokkeihin. D33–D36 auki | VP · kausi · kalenteri |
| `16_kentta_koko_jarjestelmassa.html` | **Kenttä koko järjestelmässä (yleiskuva):** yksi kuva, kolme lukutapaa (pelaaja ja huoltaja sanoin · valmentaja luvuin · VP ja UTJ kokonaiskuvana), mitä kukin sovellus näyttää ja mikä poistuu, typografian raja, rakennusjärjestys. Ei uutta tietomallia. Seuran kooste on 17. D37–D39 auki | kaikki roolit · ilme · siirtymä |
| `17_seuran_kooste.html` | **Seuran pulssi (UTJ ja VP):** ylöspäin nouseva näyttö. Joukkueet riveinä ikäjärjestyksessä, seitsemän prosessimittaria (jakso, pelaajat jaksolla, viikkokatsaukset, katselmukset, teemakattavuus, kuorma linjassa, kypsyysvahti) liikennevaloina seuran omaa standardia vasten, 4 viikon trendi, aikajana. Viikkokooste CF:llä. Korvaa VP_v25:n etusivun. D40–D45 lukittu | VP · UTJ · seura |
| `18_kehitystyopoyta_v4.html` | **Kehitystyöpöytä V4:** 13:n toteutusmalli. Koko ruudun pelaajanäkymä (URL, ‹ ›, kiinteä otsikkorivi), jakson tilakone yhdestä funktiosta (tilat johdetaan), Tänään-signaalin järjestys, kevyt katselmus (3 kysymystä + lause + K3 yhdellä tallennuksella), valmentajaprofiili ammatti/oto, 390 px ensiruutu, vanhan kortin poistolista (poisto 1.12.2026). Briiffi `docs/CODE_BRIEF_V4_KEHITYSTYOPOYTA.md`. D46–D50 lukittu, D51–D53 ehdotus | valmentaja · VP |

Briefit: `docs/CODE_BRIEF_DESIGN_V2_T1_KONTRASTI.md`, `docs/CODE_BRIEF_KENTTA_K0.md` (Kenttä-kirjasto, odottaa D10–D11).

## Etusijajärjestys (5.10.2026)
- **Pelaajan ja huoltajan näkymissä 09 voittaa 05:n.** 05 pysyy voimassa rakenteen (Tänään · Minä · Joukkue, P1–P19) ja ehdollisten lohkojen osalta; hero, jakson valinta ja Minä-sivun kärki tulevat 09:stä.
- Valmentajan ja VP:n näkymissä 01 ja 02 pysyvät pää-SSOT:na; 09:n valmentajanäkymät (joukkuekenttä, jakson aloitus kentällä, katselmus kentällä) täydentävät 01:n askelmallia, eivät korvaa sitä.
- **D12–D15 päätetty A (5.10.2026):** Minä alkaa kentästä (kortti #fcOv:iin) · seurakohtainen kytkin `seurat/{id}.liput.kentta` (KPV U13 ensin) · valmentaja aktivoi jakson, pelaajan valinnasta ilmoitus valmentajalle (`valinta_odottaa`) · osat konseptiosista, muokattavissa. Järjestys: R6.3-C/E → R6.3-D → pelaajan UI (K1→) kytkimen takana.
- Kenttä-toteutus alkaa vasta kun 07:n D10–D11 on päätetty (tokenit, fontti; päätetty, K0 mergetty #792). Järjestys ja laajuus: 10.
- **Seuran valmennuslinja (07 D16, päätetty A):** TalentMaster on menetelmä ja oletuslinja; seuran oma linja korvaa sisällön (harjoitteet, osat ja konseptien nimet, joukkueen teema, ikävaiheen painotukset, kieli). Harjoitteisiin aina `lahde:'seura'|'tm'`; `tmJoukkueenTeema` lukee seuran linjaa, ilman sitä `null`.

## Säännöt toteutukseen
- Esimerkkidata on osin keksittyä. Topias K. (KPV U13) on testipelaaja; muut nimet keksittyjä.
- Älä kopioi mockupin CSS:ää sellaisenaan: käytä sovelluksen omia tokeneita (Design V2 / design system).
- §7.22 (pelaajalle ei tasolukuja eikä vertailua), §11 (Firestore vain additiivisesti), §31 (mitali vain kokonaisajasta), terveystieto vain `terveys/`.
- Kaikki uudet tekstit `tm_lang`-avaimiksi, sv-käännökset odotuslistalle (Gemini).
- Avoimet päätökset (07) ratkaisevat osan näkymistä: tarkista tila projektikartasta ennen toteutusta.
