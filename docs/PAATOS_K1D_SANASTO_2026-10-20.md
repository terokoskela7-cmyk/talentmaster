# PÄÄTÖS · D250 · Sanasto ja yhteenvetorytmi · Tero 20.10.2026 (klo 22.31–22.32, K1d)

**Korvaa D248:n rivin "katselmus → Jakson arviointi"**: käyttäjälle näkyvä sana on nyt **Jakson yhteenveto** (toiminto "Tee jakson yhteenveto"); "Jakson arviointi" ei ole enää jakson päättämisen nimi (arviointi = pelaajan havainnot). D249 on Osaamispankki.
**Push-ilmoitus (Teron päätös 21.10.):** `notifReviewEraantyy` käyttää samaa sääntöä kuin sovellus (`tmRytmiPelaajalle`, `functions/rytmi_notif.js`): ei pushia jos jakso päättyy viimeistään eräpäivänä; teksti "Jakson yhteenveto tai kehityskeskustelu viimeistään {pvm}" (sv erä 80).

**Lähde:** Teron tuotantotesti 20.10.2026 klo 22.08 — Topiaksen jakso käynnissä vk 1/6 (19.10.–30.11.), silti "Jakson arviointi erääntymässä" (uusi sivu) ja "Katselmus erääntymässä" (Master). Tero itse ei ymmärtänyt, mitä tapahtuu.

## Sanasto (käyttäjälle näkyvä teksti, fi; sv erä 80)
| Asia | Sana | Korvaa |
|---|---|---|
| Kauden tavoite + jaksot | **Kehityssuunnitelma** | IDP (käyttäjälle), henkilökohtainen suunnitelma |
| Mitä jakson lopussa tehdään (3 kysymystä + lause + seuraava jakso) | **Jakson yhteenveto** · toiminto **Tee jakson yhteenveto** | katselmus, kevyt katselmus, jakson arviointi, napin "Sulje jakso" |
| Laajempi keskustelu pelaajan (ja huoltajan) kanssa | **Kehityskeskustelu** | review, MDT, täysi katselmus, Syvennä |
| Dokumentti pelaajalle ja perheelle | **Pelaajaraportti** | — |
| VP:n seuratason koosteet | **Seuran tilannekuva** | raportointi, "Reviewit ajan tasalla" |
| Joukkuejakson jälkeinen aika (2 vk) | **Yhteenvetoikkuna** | katselmusikkuna |
| Rytmi-ilmoitus | "Jakson yhteenveto tai kehityskeskustelu viimeistään {pvm}" | "Katselmus erääntymässä" |

"Arviointi" jää vain pelaajan havainnoille (ADAR, osa-arviot, harjoitusarviointi), ei jakson päättämiselle.
**ADAR (henkilökunta ja pelaaja):** Havainnointi · **Päätöksenteko** (ei "Päätös") · Toteutus · **Reagointi** (Reaction; ei "Palautuminen"). Fyysinen palautuminen (lepo, hpp_rehab) on eri asia eikä muutu.

## Käyttäytyminen
- **Jakson yhteenveto nollaa yhteenvetorytmin:** sulku kirjoittaa `review_viimeisin_pvm` (sulkupäivä) + `review_viimeisin_tyyppi: 'jakso'` samaan kirjoitukseen jaksofokuksen ja historian kanssa, funktiolla `tmKirjaaKatselmus` (sama kuin kehityskeskustelu). Kumoaa 7.10.2026 päätöksen "kevyt katselmus ei koske review_viimeisin_*".
- **Lukupolku (vain luku):** edellinen yhteenveto = myöhäisin `review_viimeisin_pvm` ja viimeisin suljettu jakso (`jaksofokus_historia[].sulkutapa === 'suljettu'`) — ennen K1d:tä suljetut jaksot nollaavat rytmin ilman datamuutosta.
- **Ilmoitus vain kun siitä on hyötyä:** jakso käynnissä ja päättyy viimeistään eräpäivänä → ei ilmoitusta (VP:n status ja KPI samaa sääntöä). Jakso päättyy eräpäivän jälkeen tai ei jaksoa → ilmoitus, jossa päivät, syy ja toiminnot; "Miksi näen tämän?" jokaisessa Seuraava askel -kortissa.
- **Sanasto näkyviin:** ⓘ-selitteet viiden termin vieressä + "Miten kehitys etenee" -ruutu (`lib/tm_sanasto_info.js`); ei pelaaja-/perhe-appeihin.
- **Pelaajan Minä:** "Kauden tavoite: {kausitavoite}" ja "Nyt harjoittelet: {jakson aihe}" + viikon fokus erikseen; "Muista tavoitteesi joka harjoituksessa: {fokus}."; "Valmentaja asetti tavoitteen." kun pelaajan ääntä ei ole.

## Sisäiset nimet eivät muutu
`review_viimeisin_pvm/-tyyppi`, `reviewit/{pvm}`, `tmKirjaaKatselmus`, `laskeReviewKadenssi`, `review_*`-avaimet, DOM-id:t, `data-*`, CSS-luokat, sisäiset tilanimet (`katselmus` polun tilana).

## Poikkeukset (nimetty)
Kaaviopankin kaavioiden **hyväksyntäprosessin "katselmus"** (eri käsite; avoin kysymys Terolle), Plan-Do-Review (reflektiomalli), Seura/Admin/hinnoittelun "IDP-kortit" (ei laajuudessa), ADAR_Koulutus-sivun oma Havaitse·Päätä·Toimi·Palaudu -malli (oma opetusnimistö; avoin kysymys).

Toteutus: PR "K1d" (suunnitelma `docs/K1D_SUUNNITELMA.md`, tekstilista `docs/K1D_TEKSTIMUUTOKSET.md`, portti `tests/k1d_sanasto.test.js`).
