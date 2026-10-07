# R1 Ryhmät — käännöslista Geminille (sv)

**Sibbo on ruotsinkielinen seura (käyttö 1.11.2026).** Alla R1:n uudet fi-tekstit (PR 1: ryhmähallinta `ry_*`; PR 2: kalenterin "Kenelle" `kn_*`). Sv-arvot jätetty määrittelemättä (koodi putoaa fi-tekstiin); lisää käännökset `tm_vp_i18n.js`:ään (VP_v25: avain = fi-teksti) ja tarvittaessa `masterT`-karttaan (Master_v16).
Sanasto: **ryhmä** = grupp · **maalivahti** = målvakt · **talenttiohjelma** = talangprogram · **ydinvahvuus** (henkilökunta) / **vahvuus** (pelaaja) — ei "ase" (D54).

## VP_v25 · ruudun otsikot (data-i18n)
| fi | sv |
|---|---|
| Ryhmät | _(sv — Gemini)_ |
| Maalivahdit, talenttiryhmä ja muut ryhmät joukkueiden yli | _(sv — Gemini)_ |

## lib/tm_ryhmat.js · FI-tekstit (avain · fi · sv)
| avain | fi | sv |
|---|---|---|
| `ry_otsikko` | Ryhmät | _(sv — Gemini)_ |
| `ry_ohje` | Ryhmä kokoaa pelaajia eri joukkueista ja ikäluokista (esim. maalivahdit, talenttiryhmä). Ryhmälle voi luoda tapahtumia ja kirjata niihin läsnäolon. | _(sv — Gemini)_ |
| `ry_uusi` | + Uusi ryhmä | _(sv — Gemini)_ |
| `ry_ei_ryhmia` | Ei ryhmiä vielä | _(sv — Gemini)_ |
| `ry_jasenia` | jäsentä | _(sv — Gemini)_ |
| `ry_valmentajat` | Valmentajat | _(sv — Gemini)_ |
| `ry_muokkaa` | Muokkaa | _(sv — Gemini)_ |
| `ry_arkistoi` | Arkistoi | _(sv — Gemini)_ |
| `ry_palauta` | Palauta | _(sv — Gemini)_ |
| `ry_arkistoitu` | Arkistoitu | _(sv — Gemini)_ |
| `ry_talenttiryhma` | Talenttiohjelma (sääntö) | _(sv — Gemini)_ |
| `ry_tyyppi_lista` | Lista | _(sv — Gemini)_ |
| `ry_tyyppi_saanto` | Sääntö: talenttiohjelma | _(sv — Gemini)_ |
| `ry_nimi` | Nimi | _(sv — Gemini)_ |
| `ry_kuvaus` | Kuvaus (valinnainen) | _(sv — Gemini)_ |
| `ry_tyyppi` | Tyyppi | _(sv — Gemini)_ |
| `ry_saanto_ohje` | Jäsenet ovat kaikki talenttiohjelman pelaajat — lista päivittyy automaattisesti. | _(sv — Gemini)_ |
| `ry_pelaajat` | Pelaajat | _(sv — Gemini)_ |
| `ry_haku` | Hae pelaajaa… | _(sv — Gemini)_ |
| `ry_kaikki_joukkueet` | Kaikki joukkueet | _(sv — Gemini)_ |
| `ry_valittu` | valittu | _(sv — Gemini)_ |
| `ry_lisaa_nakyvat` | Lisää näkyvät | _(sv — Gemini)_ |
| `ry_tyhjenna` | Tyhjennä valinnat | _(sv — Gemini)_ |
| `ry_tallenna` | Tallenna ryhmä | _(sv — Gemini)_ |
| `ry_peruuta` | Peruuta | _(sv — Gemini)_ |
| `ry_ei_pelaajia` | Ei pelaajia hakuehdoilla. | _(sv — Gemini)_ |
| `ry_valmentajat_ohje` | Ryhmän valmentaja voi luoda ryhmälle tapahtumia ja kirjata läsnäolon kaikille jäsenille joukkueesta riippumatta. | _(sv — Gemini)_ |
| `ry_ei_valmentajia` | Ei valmentajia rekisterissä. | _(sv — Gemini)_ |
| `ry_virhe_nimi` | Anna ryhmälle nimi (enintään 60 merkkiä). | _(sv — Gemini)_ |
| `ry_virhe_pelaajat` | Valitse vähintään yksi pelaaja (enintään 200). | _(sv — Gemini)_ |
| `ry_virhe_valmentajat` | Valmentajia enintään 10. Valmentajana tallentava lisää itsensä ryhmän valmentajaksi. | _(sv — Gemini)_ |
| `ry_virhe_kuvaus` | Kuvaus on enintään 200 merkkiä. | _(sv — Gemini)_ |
| `ry_virhe_tyyppi` | Tuntematon ryhmätyyppi. | _(sv — Gemini)_ |
| `ry_tallennettu` | Ryhmä tallennettu ✓ | _(sv — Gemini)_ |
| `ry_ei_oikeutta` | Voit muokata vain ryhmiä, joissa olet valmentajana. | _(sv — Gemini)_ |
| `kn_kenelle` | Kenelle | _(sv — Gemini)_ |
| `kn_joukkue` | Joukkue | _(sv — Gemini)_ |
| `kn_joukkueet` | Useampi joukkue | _(sv — Gemini)_ |
| `kn_ryhma` | Ryhmä | _(sv — Gemini)_ |
| `kn_pelaajat` | Poimitut pelaajat | _(sv — Gemini)_ |
| `kn_henkilokunta` | Vain valmennus / henkilökunta | _(sv — Gemini)_ |
| `kn_henkilokunta_ohje` | Ei näy pelaajalle eikä huoltajalle. | _(sv — Gemini)_ |
| `kn_valitse_ryhma` | — valitse ryhmä — | _(sv — Gemini)_ |
| `kn_ei_ryhmia` | Ei ryhmiä — luo ryhmä VP:n Ryhmät-osiossa. | _(sv — Gemini)_ |
| `kn_jasenia` | jäsentä | _(sv — Gemini)_ |
| `kn_valitse_joukkueet` | Valitse joukkueet | _(sv — Gemini)_ |
| `kn_valitse_pelaajat` | Valitse pelaajat (Ctrl/⌘ = useampi) | _(sv — Gemini)_ |
| `kn_virhe_ryhma` | Valitse ryhmä. | _(sv — Gemini)_ |
| `kn_virhe_joukkueet` | Valitse vähintään yksi joukkue. | _(sv — Gemini)_ |
| `kn_virhe_pelaajat` | Valitse vähintään yksi pelaaja. | _(sv — Gemini)_ |
| `kn_omat_ryhmat` | Omat ryhmät | _(sv — Gemini)_ |
| `kn_jasen_joukkue` | joukkue | _(sv — Gemini)_ |
| `ry_vahvista_arkisto` | Arkistoidaanko ryhmä? Ryhmän tapahtumat säilyvät. | _(sv — Gemini)_ |
| `ry_arkistoitu_toast` | Ryhmä arkistoitu ✓ | _(sv — Gemini)_ |
| `ry_palautettu_toast` | Ryhmä palautettu ✓ | _(sv — Gemini)_ |
| `ry_lataa` | Ladataan ryhmiä… | _(sv — Gemini)_ |

_Huom: kalenterin "Kenelle"-lohkon tekstit tulevat libistä (`opts.t`, fi-oletus); VP:n/Masterin käännöskartoissa avain = fi-teksti._
