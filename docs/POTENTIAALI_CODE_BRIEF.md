# CODE BRIEF — FA-potentiaali (uran kattoarvio) · Scouting-linssi

**Tyyppi:** uusi kenttä + kirjoituspolku + UI (Scouting). **Tausta:** FA Player Scouting Template 2026 §6 sisältää **potentiaaliasteikon** (tähdet 1–5: uran kattoarvio). Se on ainoa FA-mallin osa jota TalentMasterissa ei vielä ole. **Se on scoutin projektio — kuuluu Scouting-linssiin, EI kehitysarviointiin (5D/IDP).**

**Design-totuus:** `docs/PLAYER_CARD_TOPIAS.html` (Scouting-linssi → "💎 Potentiaali · uran kattoarvio" -asteikko + tyhjä tila). Molemmat teemat, gold-aksentti.

---

## ASTEIKKO (FA §6)

| Tähdet | enum | Kuvaus |
|---|---|---|
| 5 ★★★★★ | `TOP_5_LEAGUES` | TOP 5 -liigat (EPL · La Liga · Bundesliga · Serie A · Ligue 1) |
| 4 ★★★★ | `OTHER_TOP_LEAGUES` | Muut huippuliigat |
| 3 ★★★ | `TOP_LEAGUES_NORDIC` | Pohjoismaiden huippuliigat |
| 2 ★★ | `FINNISH_PREMIER_LEAGUE` | Veikkausliiga |
| 1 ★ | `OTHER` | Muut |

Potentiaali = uran parhaat vuodet **jos pysyy terveenä**. + vapaa huomiokenttä perusteluille.

## DATAMALLI

- **Uusi kenttä pelaajadokkiin** (verify ensin ettei ole jo olemassa), **namespaced `scout_*`** erilleen arvioinnista: `scout_potentiaali` (1–5) · `scout_potentiaali_taso` (enum) · `scout_potentiaali_huomiot` · `scout_potentiaali_pvm` · `scout_potentiaali_arvioija` (audit).
- `tahdet` ja `taso` kulkevat parina (1↔OTHER … 5↔TOP_5_LEAGUES); yksi lähde, älä hajota kahdeksi ristiriitaiseksi.
- **Ei Firestore-migraatiota** olemassa oleviin dokkeihin — kenttä syntyy kun potentiaali asetetaan. Tyhjä → kortti näyttää "ei vielä arvioitu" + asteikon (kuten mockupissa).

## TOTEUTUSPINTA (nyt) + UI

**Huom:** kaksilinssinen standalone-kortti on vielä mockup (docs) — appissa **ei ole Scouting-linssiä**. Toteuta potentiaali **omana gold-alaosionaan VP_v25:n pelaajakortissa**, selvästi **5D-ruudukon ulkopuolella** (ei osa arviointia). Mockup näyttää saman visuaalin scouting-linssissä — sama ulkoasu, eri sijainti.
- Näytä 5-portainen asteikko (mockupin gold-tyyli) + **valittu porras korostettuna**, tai tyhjä tila jos ei arvioitu.
- **Asetuskontrolli** valtuutetuille rooleille: tähdet + huomiot → tallenna `scout_potentiaali*`.
- **Ei näy pelaaja-apissa.** Gold-aksentti, molemmat teemat.
- **Päivitä myös `docs/PLAYER_CARD_TOPIAS.html`** jos muutat visuaalia — design ja koodi samaan (mockupissa osio on jo).

## KIRJOITUSPORTTI + FIRESTORE-SÄÄNNÖT

- **Nyt: VP / johto / SA** olemassa olevan `_vpVoiMuokata`-portin kautta. **Älä luo uutta scout-roolia** — sitä ei ole, ja se on isompi identiteetti-/sääntömuutos (myöhemmin, jos halutaan talenttivalmentaja-scout-polku).
- **Firestore-säännöt:** `scout_potentiaali*` vaatii oman field-level-lausekkeen (ei ole olemassa → muuten kirjoitus permission-failaa hiljaa). **Kirjoita sääntöteksti PR-kuvaukseen** — Tero Console-deployaa sen (kuten §12 aiemmin).

## INVARIANTIT
1. **Scouting-only.** Ei vaikuta 5D:hen, D-tasoihin, IDP:hen eikä arviointiin. Ei muuta talent-signaaleja (X-Factor · Hidden Gem · siirtopäätös pysyvät erillisinä — potentiaali täydentää niitä).
2. **Ei uutta laskentaa** — potentiaali on ihmisen asettama projektio, ei johdettu luku.
3. **GDPR:** `huomiot` on scouttausprojektio (ei terveystieto) — ei `terveys/`-kokoelmaan; pidä ammatillisena.
4. Molemmat teemat; §7.22 ei koske (VP/scout-facing, ei pelaajalle näkyvä oletuksena — varmista ettei vuoda pelaaja-appiin).
5. Additiivinen kenttä; ei cache-bumppia ellei jaettua libiä muuteta.

## HYVÄKSYMISKRITEERI
- **L1 git-diff:** uusi kenttä rajattu; UI vain Scouting-linssissä; portti oikein; ei vaikutusta 5D/IDP:hen; ei vuotoa pelaaja-appiin.
- **L2 testit:** tähdet↔enum-parimappaus (1↔OTHER … 5↔TOP_5_LEAGUES); tyhjä → "ei arvioitu"; label-tekstit.
- **L3 live (sanktioitu Topias — kirjoitus sallittu):** aseta potentiaali (esim. 2★ Veikkausliiga) + huomio → näkyy Scouting-linssissä molemmilla teemoilla; **ei näy Kehitys-linssissä**; ei näy pelaaja-apissa. **Palauta Topias ennalleen** (poista testiarvo).

## DoD
1. Renderöityy Scouting-linssissä molemmissa teemoissa (screenshotit); Kehitys-linssissä ei näy.
2. Kirjoitusportti + asetuskontrolli; tyhjä tila oikein.
3. Puhtaat yksikkötestit (parimappaus); suite vihreä; eslint puhdas.
4. Pieni PR; kuvaus linkkaa tähän briiffiin + PLAYER_CARD_TOPIAS-mockupiin; kirjaa käytetty rooliportti.
5. **Älä mergeä** ennen L1-diffiä + L3-liveä (Topias palautettu).

## SKOOPIN ULKOPUOLELLA
Potentiaalitrendi/historia · potentiaali muissa linsseissä · pelaaja-appiin näyttäminen · automaattinen potentiaaliehdotus (se on ihmisen arvio).
