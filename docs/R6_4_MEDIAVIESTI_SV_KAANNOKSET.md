# R6.4 Mediaviesti M1 — käännöslista Geminille (sv)

**Sibbo-Vargarna on ruotsinkielinen seura (käyttö 1.11.2026, Sibbo ensin).** Code kirjoittaa vain fi; sv tuodaan Geminiltä samaan PR:ään ennen mergeä (D55). Sv-arvot jätetty määrittelemättä — koodi putoaa fi-tekstiin.
Sanasto: **klippi** = klipp · **kysymys** = fråga · **saate** = följebrev/kommentar · **kuittaus** = kvittens · **ydinvahvuus** (henkilökunta) / **vahvuus** (pelaaja) — ei "ase" (D54) · pelaajanimet: Onnistuminen = Lyckat · Katsotaan yhdessä = Vi tittar tillsammans · Tilanne = Situationen.
Ohjeet kysymyspohjille: lyhyt, avoin, ei vertailua muihin, ei lukuja; 3 rekisteriä (Leikkijä U8–12 = lekfull ton / Rakentaja U13–15 / Showcase U16+) × 3 klippityyppiä × 3 kysymystä = 27 kysymystä.
Henkilökunnan tekstit (`mv_*`) kulkevat `masterT`/`vpT`-avaimina (fi-teksti = avain → lisää sv-rivi `tm_master_i18n.js` / `tm_vp_i18n.js`); pelaajan/huoltajan tekstit (PR 2) `tm_lang.js`:ään (`klippi.*`).

## lib/tm_mediaviesti.js · FI-tekstit (avain · fi · sv)
| avain | fi | sv |
|---|---|---|
| `mv_otsikko` | Lisää klippi | _(sv — Gemini)_ |
| `mv_kenelle` | Kenelle | _(sv — Gemini)_ |
| `mv_yksi` | Vain tämä pelaaja | _(sv — Gemini)_ |
| `mv_valitut` | Valitut… | _(sv — Gemini)_ |
| `mv_joukkue` | Koko joukkue | _(sv — Gemini)_ |
| `mv_valitse_pelaajat` | Valitse pelaajat | _(sv — Gemini)_ |
| `mv_linkki` | Linkki | _(sv — Gemini)_ |
| `mv_linkki_ohje` | vain https · tunnistettu domainista | _(sv — Gemini)_ |
| `mv_tyyppi` | Tyyppi | _(sv — Gemini)_ |
| `mv_tyyppi_ohje` | pelaajalle: Onnistuminen · Katsotaan yhdessä · Tilanne | _(sv — Gemini)_ |
| `mv_osa` | Jakson osa | _(sv — Gemini)_ |
| `mv_osa_ohje` | valinnainen | _(sv — Gemini)_ |
| `mv_ei_osaa` | ei osaa | _(sv — Gemini)_ |
| `mv_kysymys` | Kysymys | _(sv — Gemini)_ |
| `mv_kysymys_pakollinen` | pakollinen | _(sv — Gemini)_ |
| `mv_oma_kysymys` | oma kysymys… | _(sv — Gemini)_ |
| `mv_saate` | Saate | _(sv — Gemini)_ |
| `mv_saate_ohje` | valinnainen · enintään 120 merkkiä | _(sv — Gemini)_ |
| `mv_vertailu_ohje` | Kysy tilanteesta, älä vertaa. | _(sv — Gemini)_ |
| `mv_tyyppi_onnistui` | Onnistui | _(sv — Gemini)_ |
| `mv_tyyppi_prosessi` | Prosessi | _(sv — Gemini)_ |
| `mv_tyyppi_tulos` | Tulos | _(sv — Gemini)_ |
| `mv_pelaajanimi_onnistui` | Onnistuminen | _(sv — Gemini)_ |
| `mv_pelaajanimi_prosessi` | Katsotaan yhdessä | _(sv — Gemini)_ |
| `mv_pelaajanimi_tulos` | Tilanne | _(sv — Gemini)_ |
| `mv_laheta` | Lähetä | _(sv — Gemini)_ |
| `mv_laheta_pelaajalle` | Lähetä {nimi} | _(sv — Gemini)_ |
| `mv_tallenna_lupa` | Tallenna – näkyy kun lupa on annettu | _(sv — Gemini)_ |
| `mv_tallentuu_heti` | tallentuu heti · näkyy klo 7–21 | _(sv — Gemini)_ |
| `mv_peruuta` | Peruuta | _(sv — Gemini)_ |
| `mv_joukkue_kysymys` | Mitä huomaat tästä tilanteesta? | _(sv — Gemini)_ |
| `mv_joukkue_ohje` | Koko joukkue: kysymys koskee tilannetta, vastaus on valinnainen. | _(sv — Gemini)_ |
| `mv_suostumus_puuttuu` | suostumus odottaa — viesti tallentuu ja näkyy kun lupa on annettu | _(sv — Gemini)_ |
| `mv_domain` | avautuu | _(sv — Gemini)_ |
| `mv_kohta` | kohta | _(sv — Gemini)_ |
| `mv_ulos` | Avaa linkki | _(sv — Gemini)_ |
| `mv_uuteen` | avautuu uudessa välilehdessä | _(sv — Gemini)_ |
| `mv_virhe_linkki_tyhja` | Liitä klipin linkki. | _(sv — Gemini)_ |
| `mv_virhe_linkki_ei_https` | Linkin pitää alkaa https:// | _(sv — Gemini)_ |
| `mv_virhe_linkki_pitka` | Linkki on liian pitkä (enintään 500 merkkiä). | _(sv — Gemini)_ |
| `mv_virhe_linkki_virheellinen` | Linkki ei ole kelvollinen osoite. | _(sv — Gemini)_ |
| `mv_virhe_kysymys` | Valitse tai kirjoita kysymys (enintään 160 merkkiä). | _(sv — Gemini)_ |
| `mv_virhe_saate` | Saate on liian pitkä (enintään 120 merkkiä). | _(sv — Gemini)_ |
| `mv_virhe_sana` | Tekstissä on sana, jota pelaajalle ei näytetä. Kirjoita se toisin. | _(sv — Gemini)_ |
| `mv_virhe_luku` | Ei lukuja eikä vertailua. | _(sv — Gemini)_ |
| `mv_virhe_vastaanottajat` | Valitse vähintään yksi pelaaja. | _(sv — Gemini)_ |
| `mv_virhe_tyyppi` | Valitse klipin tyyppi. | _(sv — Gemini)_ |
| `mv_virhe_kuittaus` | Kuittaus on liian pitkä (enintään 120 merkkiä). | _(sv — Gemini)_ |
| `mv_lahetetty` | Klippi lähetetty ✓ | _(sv — Gemini)_ |
| `mv_lahetetty_n` | Klippi lähetetty {n} pelaajalle ✓ | _(sv — Gemini)_ |
| `mv_kuitattu` | Ketju suljettu ✓ | _(sv — Gemini)_ |
| `mv_ketju_otsikko` | Ketju | _(sv — Gemini)_ |
| `mv_rivi_odottaa` | Odottaa vastausta | _(sv — Gemini)_ |
| `mv_rivi_vastattu` | vastasi klippiin | _(sv — Gemini)_ |
| `mv_rivi_perhe` | Perhe kuittasi: katsoimme yhdessä | _(sv — Gemini)_ |
| `mv_rivi_lupa` | Odottaa suostumusta | _(sv — Gemini)_ |
| `mv_rivi_suljettu` | Suljettu | _(sv — Gemini)_ |
| `mv_rivi_lupa_ohje` | näkyy kun huoltaja on antanut luvan | _(sv — Gemini)_ |
| `mv_rivi_joukkue` | Joukkueklippi | _(sv — Gemini)_ |
| `mv_rivi_pelaajia` | pelaajaa | _(sv — Gemini)_ |
| `mv_rivi_vastausta` | vastausta | _(sv — Gemini)_ |
| `mv_rivi_lupaa_odottaa` | odottaa lupaa | _(sv — Gemini)_ |
| `mv_klippi_nappi` | ＋ klippi | _(sv — Gemini)_ |
| `mv_valmentaja` | Valmentaja | _(sv — Gemini)_ |
| `mv_pelaaja` | Pelaaja | _(sv — Gemini)_ |
| `mv_kuittaus` | Kuittaus | _(sv — Gemini)_ |
| `mv_kuittaa_sulje` | Kuittaa ja sulje | _(sv — Gemini)_ |
| `mv_kuittaus_ohje` | valinnainen · enintään 120 merkkiä · sulkee ketjun | _(sv — Gemini)_ |
| `mv_ei_vastausta` | Ei vastausta vielä. | _(sv — Gemini)_ |
| `mv_perhe_nahnyt` | huoltaja kuittasi | _(sv — Gemini)_ |
| `mv_klipit` | Klipit | _(sv — Gemini)_ |
| `mv_ei_klippeja` | Ei klippejä vielä. | _(sv — Gemini)_ |
| `mv_lisaa` | Lisää klippi | _(sv — Gemini)_ |
| `mv_pohja_onnistui_leikkija_1` | Mitä teit tässä hyvin? | _(sv — Gemini)_ |
| `mv_pohja_onnistui_leikkija_2` | Mistä tämä tuntui kivalta? | _(sv — Gemini)_ |
| `mv_pohja_onnistui_leikkija_3` | Mitä katsoit ennen kuin teit sen? | _(sv — Gemini)_ |
| `mv_pohja_onnistui_rakentaja_1` | Mitä näit ennen kuin päätit? | _(sv — Gemini)_ |
| `mv_pohja_onnistui_rakentaja_2` | Missä muualla tämä toimisi? | _(sv — Gemini)_ |
| `mv_pohja_onnistui_rakentaja_3` | Mikä teki tästä helpon? | _(sv — Gemini)_ |
| `mv_pohja_onnistui_showcase_1` | Mikä tässä onnistui ja miksi? | _(sv — Gemini)_ |
| `mv_pohja_onnistui_showcase_2` | Mitä teit tässä tietoisesti? | _(sv — Gemini)_ |
| `mv_pohja_onnistui_showcase_3` | Missä tilanteessa tämä toimii seuraavalla kerralla? | _(sv — Gemini)_ |
| `mv_pohja_prosessi_leikkija_1` | Mitä huomaat tässä? | _(sv — Gemini)_ |
| `mv_pohja_prosessi_leikkija_2` | Mitä voisit kokeilla seuraavaksi? | _(sv — Gemini)_ |
| `mv_pohja_prosessi_leikkija_3` | Mitä tapahtuu ennen kuin pallo tulee? | _(sv — Gemini)_ |
| `mv_pohja_prosessi_rakentaja_1` | Mitä huomaat, kun katsot tämän uudelleen? | _(sv — Gemini)_ |
| `mv_pohja_prosessi_rakentaja_2` | Mitä kokeilisit seuraavalla kerralla? | _(sv — Gemini)_ |
| `mv_pohja_prosessi_rakentaja_3` | Missä kohdassa päätös tehtiin? | _(sv — Gemini)_ |
| `mv_pohja_prosessi_showcase_1` | Mitä tekisit toisin tässä ja miksi? | _(sv — Gemini)_ |
| `mv_pohja_prosessi_showcase_2` | Mikä ratkaisi tilanteen? | _(sv — Gemini)_ |
| `mv_pohja_prosessi_showcase_3` | Mitä valmistelit ennen tätä hetkeä? | _(sv — Gemini)_ |
| `mv_pohja_tulos_leikkija_1` | Mitä tapahtui tässä? | _(sv — Gemini)_ |
| `mv_pohja_tulos_leikkija_2` | Mitä tunsit tässä? | _(sv — Gemini)_ |
| `mv_pohja_tulos_leikkija_3` | Mitä haluaisit kokeilla seuraavaksi? | _(sv — Gemini)_ |
| `mv_pohja_tulos_rakentaja_1` | Mitä tapahtui juuri ennen tätä? | _(sv — Gemini)_ |
| `mv_pohja_tulos_rakentaja_2` | Mikä ratkaisi tilanteen? | _(sv — Gemini)_ |
| `mv_pohja_tulos_rakentaja_3` | Mitä haluaisit tehdä toisin? | _(sv — Gemini)_ |
| `mv_pohja_tulos_showcase_1` | Miten luet tämän tilanteen? | _(sv — Gemini)_ |
| `mv_pohja_tulos_showcase_2` | Mikä oli vaihtoehtosi tässä? | _(sv — Gemini)_ |
| `mv_pohja_tulos_showcase_3` | Mitä ottaisit tästä mukaan seuraavaan peliin? | _(sv — Gemini)_ |

## PR 2 · pelaaja ja perhe (`lib/tm_klippi_perhe.js`, Pelaaja_v7 + Vanhempi_v2)

Pelaajan ja huoltajan näkymän tekstit. Tyyppinimet (Onnistuminen · Katsotaan yhdessä · Tilanne) ja linkkitekstit käyttävät jo yllä olevia `mv_*`-avaimia (`mv_pelaajanimi_*`, `mv_ulos`, `mv_uuteen`).
**Huom. vastausvaihtoehdot** (`kp_valinta_leikkija_*` U8–12, `kp_valinta_rakentaja_*` U13–14): suomenkieliset lauseet on otettu designista 19 §3; sv-käännöksen on oltava samanmuotoinen lyhyt ensimmäisen persoonan lause (lapsen oma ääni). Valittu teksti tallentuu viestiin sillä kielellä, jolla sovellusta käytetään.
Pelaajalle ei lukuja eikä vertailua (§7.22).

| avain | fi | sv |
|---|---|---|
| `kp_otsikko` | Valmentajalta klippi | _(sv — Gemini)_ |
| `kp_perhe_otsikko` | Katsokaa yhdessä | _(sv — Gemini)_ |
| `kp_perhe_ohje` | Valmentaja lähetti {nimi} klipin | _(sv — Gemini)_ |
| `kp_luku_otsikko` | Valmentajalta klippi · keskustelu | _(sv — Gemini)_ |
| `kp_valmentaja` | Valmentaja | _(sv — Gemini)_ |
| `kp_lapsi_valitsee` | {nimi} valitsee itse: | _(sv — Gemini)_ |
| `kp_valitse` | Valitse vastaus | _(sv — Gemini)_ |
| `kp_omin_sanoin` | Sanoisitko omin sanoin? | _(sv — Gemini)_ |
| `kp_lause_ohje` | Kirjoita yksi lause | _(sv — Gemini)_ |
| `kp_lause_kentta` | Sinun vastauksesi | _(sv — Gemini)_ |
| `kp_laheta` | Lähetä | _(sv — Gemini)_ |
| `kp_laheta_valmentajalle` | Lähetä valmentajalle | _(sv — Gemini)_ |
| `kp_katsoimme` | Katsoimme yhdessä | _(sv — Gemini)_ |
| `kp_katsoimme_ohje` | huoltaja kuittaa | _(sv — Gemini)_ |
| `kp_lahetetaan` | Lähetetään… | _(sv — Gemini)_ |
| `kp_huoltaja_nakee` | Huoltaja näkee tämän keskustelun. | _(sv — Gemini)_ |
| `kp_vastasit` | Vastasit | _(sv — Gemini)_ |
| `kp_vastattu` | Vastaus lähetetty | _(sv — Gemini)_ |
| `kp_valmentaja_lukenut` | valmentaja lukenut | _(sv — Gemini)_ |
| `kp_perhe_kuittasi` | Kuittasit: katsoimme yhdessä | _(sv — Gemini)_ |
| `kp_kuittaus` | Kuittaus | _(sv — Gemini)_ |
| `kp_ei_vastausta_lukutila` | Ei vastausta vielä. | _(sv — Gemini)_ |
| `kp_lukutila_ohje` | Näet lapsesi ja valmentajan keskustelun. | _(sv — Gemini)_ |
| `kp_lapsi_vastasi` | Lapsi vastasi | _(sv — Gemini)_ |
| `kp_avaa` | Avaa | _(sv — Gemini)_ |
| `kp_suljettu` | Suljettu | _(sv — Gemini)_ |
| `kp_muut` | Muut klipit | _(sv — Gemini)_ |
| `kp_virhe_tyhja` | Valitse vastaus tai kirjoita lause. | _(sv — Gemini)_ |
| `kp_virhe_pitka` | Vastaus on liian pitkä (enintään 200 merkkiä). | _(sv — Gemini)_ |
| `kp_virhe_valinta` | Valitse jokin vaihtoehdoista. | _(sv — Gemini)_ |
| `kp_virhe_ketju` | Klippiä ei löytynyt. | _(sv — Gemini)_ |
| `kp_virhe_lahetys` | Vastaus ei lähtenyt | _(sv — Gemini)_ |
| `kp_valinta_leikkija_1` | Katsoin ylös | _(sv — Gemini)_ |
| `kp_valinta_leikkija_2` | Juoksin tilaan | _(sv — Gemini)_ |
| `kp_valinta_leikkija_3` | En tiedä | _(sv — Gemini)_ |
| `kp_valinta_rakentaja_1` | Näin puolustajan | _(sv — Gemini)_ |
| `kp_valinta_rakentaja_2` | Arvasin | _(sv — Gemini)_ |
| `kp_valinta_rakentaja_3` | En muista | _(sv — Gemini)_ |

