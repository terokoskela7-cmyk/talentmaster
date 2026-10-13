# TASO API (Palloliiton tulospalvelu, Torneopal) — integraation käyttämät osat

> **Lähde:** virallinen dokumentaatio `TASO_API_dokumentaatio.txt` (tässä kansiossa). Tämä tiedosto on yhteenveto integraation käyttämistä osista; testifixturet (`functions/test/fixtures/taso_getMatches|getClub|getNextMatches|getTeam.json`) ovat dokumentaation esimerkkivastauksia sellaisenaan.

Koodi: `functions/taso_api.js` (osoite, haku, kausi, hakuikkuna, kenttämuoto — YKSI paikka), `functions/kalenteri_taso.js` (K35-5 kalenterisynkka), `functions/index.js` (`paivitaSeuranOttelut`, vanha `tapahtumat`-haku), `scripts/yhdista_taso_joukkueet.js`.

## Osoite
`https://spl.torneopal.net/taso/rest` (**ei** `.fi`). Vakio `TASO_BASE` (`functions/taso_api.js`); kaikki haut kulkevat `tasoHae(endpoint, params, apiKey)`:n kautta (`api_key` query-parametrina).

## Kausi
Jalkapallon `season_id` = **kalenterivuosi** merkkijonona, esim. `"2026"` (ei `"2025-2026"`). `kausiTunniste(nyt)` = Helsingin kalenterivuosi.

## getClub(club_id, season_id)
Palauttaa seuran joukkueet polussa **`club.teams[]`** (ei ylätasolla): `team_id`, `team_name`, `category_id`, `category_name`, `competition_id`, `competition_name`. `klubinJoukkueet()` (`taso_api.js`). `scripts/yhdista_taso_joukkueet.js --listaa` tulostaa nämä (`getClub(club_id, season_id="2026")`).

## getMatches
- **Ei ota `season_id`:tä.** Haetaan `team_id` + `start_date` + `end_date` (YYYY-MM-DD): **tänään − 30 pv … tänään + 180 pv** (`hakuIkkuna()`).
- Ottelun (`matches[]`) kentät: `match_id`, `date` (YYYY-MM-DD), `time` (HH:MM tai HH:MM:SS), `team_A_id` / `team_A_name` (**koti**), `team_B_id` / `team_B_name` (**vieras**), `venue_name`, `status`. **Ei** `match_time`, `home_team_*`, `away_team_*`.
- `time` puuttuu tai on tyhjä → ottelu merkitään **koko päiväksi** (`koko_paiva: true`, alkaa 00:00, päättyy 23:59 Helsingin aikaa). Muuten kesto oletuksena 90 min (TASO ei anna päättymisaikaa).
- Tulos: `fs_A` (koti) – `fs_B` (vieras); `otteluTulos()`. (Ei `home_goals`/`away_goals`.)
- `getNextMatches(team_id)` palauttaa samat ottelukentät (status esim. `Scheduled`); `getTeam` palauttaa joukkueen (`team.team_id`, `club_id`, `categories[]`, `players[]`) — integraatio ei käytä näitä.
- Ajat ovat Helsingin paikallisaikaa.

## Tilat (`status`)
| status | Käsittely |
|---|---|
| `Canceled`, `Suspended`, `Abandoned` | → kalenterin `tila:'peruttu'` |
| `Reschedule` | **ei** peruttu (siirto näkyy uutena `date`/`time`-arvona) |
| muut (`Fixture`, `Played`, …) | → `suunniteltu` |

Regex `PERUTTU_RE` = `/cancel|postpon|abandon|suspend|peruttu|siirretty|walkover/i` (nykyinen pidetty; testattu yllä oleville arvoille).

## Perutus puuttuvasta
Ottelu, joka on kalenterissa (`lahde:'taso'`) mutta puuttuu vastauksesta, merkitään perutuksi **vain jos** se on tulevaisuudessa JA hakuikkunan sisällä (`alkaa ≤ end_date`). Ikkunan ulkopuolista ottelua ei voi päätellä puuttuvaksi.
