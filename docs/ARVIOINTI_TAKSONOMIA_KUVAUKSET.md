# Arviointitaksonomian selitteet — "mitä tämä ominaisuus tarkoittaa?"

**Tausta:** SJK:n VP (ja Head of Talent) toivoivat että arviointiin tuodaan lyhyt **selite per ominaisuus**, jotta valmentajan/VP:n on helpompi arvioida pelaajaa (esim. "mitä tasapaino tarkoittaa?"). Nykyinen `ARVIOINTI_TAKSONOMIA` (57 attribuuttia, kehys "palloliitto") sisältää `avain · nimi_fi · nimi_en · dim · kategoria · mitattavissa` — **mutta ei `kuvaus`-kenttää** (`on_kuvaus:false`). Tämä doc on se puuttuva sisältö.

**Toteutus (Code):** lisää jokaiseen `ARVIOINTI_TAKSONOMIA`-riviin `kuvaus_fi` (alta) ja näytä se arviointi-UI:ssa **ⓘ-vihjeenä** ominaisuuden vieressä (hover/tap), sekä pelaajakortin "Arviointi · FA 1–5" -kerroksessa. FA-mallin (Palloliitto Player Scouting Template 2026) kuvaukset on nostettu suoraan niiltä osin kuin ne mappautuvat; TalentMaster-lisäattribuuteille kirjoitettu tiivis valmentajakieli.

Asteikko kaikilla: **1 Heikko · 2 Keskiverto · 3 Hyvä · 4 Erittäin hyvä · 5 Erinomainen** — aina *ikäluokkaan* verrattuna (FA-määritelmä).

---

## D1 Fyysinen

**Liike**
- **Kiihdytys** — Ensimmäiset askeleet: kyky karata irti tai saada kiinni.
- **Nopeus** — Huippunopeus täydellä juoksulla.
- **Tasapaino** — Kehonhallinta ja tasapaino liikkeessä, käännöksissä ja kontaktissa.
- **Ketteryys** — Nopeat suunnanmuutokset ja jalkatyö ahtaassa tilassa.

**Kunto & fyysinen peli**
- **Kestävyys** — Kyky toistaa korkean intensiteetin suorituksia koko ottelun ajan.
- **Voima** — Vahvuus taklauksessa ja taklattuna; kaksinkamppailujen kesto.
- **Fyysinen läsnäolo** — Kehon käyttö tilan ottamiseen ja pitämiseen.
- **Rohkeus** — Uskallus mennä kaksinkamppailuun ja ottaa kontakti pelkäämättä.

## D2 Tekninen

**Pallonhallinta**
- **Pallonhallinta** — Ensikosketus, vastaanotto ja kääntyminen.
- **Kuljetus ahtaassa** — Pallonhallinta ja harhautukset ahtaassa tilassa.
- **Kuljetus tilaan** — Pallon kuljettaminen vauhdilla avoimeen tilaan.
- **Pallon suojaus** — Pallon suojaaminen keholla paineen alla.
- **Yhteispeli** — Seinät, kolmiot ja yhdistelmäpeli kanssapelaajan kanssa.

**Syöttö**
- **Lyhyt syöttö** — Tarkkuus ja ajoitus lyhyissä syötöissä.
- **Pitkä syöttö** — Pitkän ja suunnanvaihtosyötön tarkkuus.
- **Syöttövalikoima** — Erityyppisten syöttöjen kirjo tilanteen mukaan.
- **Syötön piilotus** — Syötön naamiointi ja ajoitus.
- **Pallonkäsittely** — Yleinen pallon käsittelyvarmuus.

**Viimeistely**
- **Viimeistely** — Maalintekotehokkuus paikoista.
- **Laukauksen tarkkuus / voima / nopeus** — Laukaustaidon osatekijät.
- **Laukaustehokkuus** — Maalit suhteessa laukauksiin.
- **Laukausvalikoima** — Erilaiset laukaustyypit tilanteen mukaan.
- **Pääpeli** — Pallo-ohjaus ja maalinteko päällä.
- **Heikompi jalka** — Heikomman jalan käyttövarmuus.

## D3 Psyykkinen

**Kilpailullisuus**
- **Maalinteon halu** — Valmius taistella, mennä maalille ja maksaa hinta maaleista.
- **Asenne** — Kypsyystaso ja suhtautuminen: hyvin kehittynyt vai ei.
- **Työmoraali** — Kova, pitkäjänteinen työ; tekee enemmän kuin pyydetään.
- **Tasaisuus** — Suoritustason tasaisuus ottelusta toiseen.

**Psykologia**
- **Johtajuus** — Kenttäjohtajuus; levittää voittamisen mentaliteettia.
- **Kommunikaatio** — Kypsä kommunikaatio pelaajien ja valmentajien kanssa.
- **Itseluottamus** — Usko omaan tekemiseen paineen alla.
- **Kehonkieli** — Ryhti ja reagointi vastoinkäymisiin.

**Harjoitusasenne**
- **Kuorman sieto** — Kyky kestää harjoituskuorma.
- **Kehittymisen halu** — Halu kehittyä harjoittelemalla.
- **Sisäinen motivaatio** — Oma-aloitteinen tekemisen palo.
- **Oppimiskyky** — Kyky ottaa ohjeet vastaan ja soveltaa niitä.

## D4 Peliäly

**Peliäly (football sense)**
- **Näkemys** — Näkee syöttömahdollisuudet, lyhyet ja pitkät.
- **Päätöksenteko** — Oikeat valinnat oikeaan aikaan.
- **Ennakointi** — Proaktiivisuus: lukee tilanteen etukäteen.
- **Sijoittuminen** — Oikea paikka sekä hyökätessä että puolustaessa.
- **Ajoitus** — Liikkeiden ja juoksujen ajoitus.

**Puolustustaidot** *(dim D2/D4 — tekninen + taktinen)*
- **1v1-puolustaminen** — Yksi vastaan yksi -tilanteiden hallinta.
- **Tilojen puolustaminen** — Takana olevien tilojen kattaminen.
- **Taklaustaito** — Ajoitus ja tekniikka pallon riistossa.
- **Keskitysten purkaminen** — Ilmatilan ja keskitysten hallinta.
- **Laukausten blokkaus** — Kehon asettaminen laukausten eteen.
- **Puolustusluotettavuus** — Yleinen luotettavuus puolustustehtävissä.

## D5 Sosiaalinen

- **Sosiaalinen vuorovaikutus** — Suhteet joukkueessa; yhteistyö kentän ulkopuolella.
- **Joukkueen rooli** — Oman roolin ymmärtäminen ja täyttäminen.
- **Monipuolisuus** — Kyky pelata useassa roolissa tai pelipaikassa.

---

## Huomiot Codelle

1. **Selitteet ovat ainoa puuttuva pala** — nimet, dimit ja kategoriat ovat jo `ARVIOINTI_TAKSONOMIA`ssa. Lisää vain `kuvaus_fi` (+ valinnainen `kuvaus_en`) ja ⓘ-vihje UI:hin. Ei uutta laskentaa.
2. **Tämä lista on aloitus** — kattaa vahvistetut kategoriat; täydennä kaikkiin 57 attribuuttiin (osa nimistä katkesi live-haussa). Lähde: FA Player Scouting Template 2026 + valmentajakieli.
3. **Potentiaaliasteikko (FA-tähdet 1–5: TOP 5 -liigat … muut)** on FA-mallissa mutta ei vielä TalentMasterissa — luonteva lisä **Scouting-linssiin** (ei arviointiin). Erillinen päätös.
4. **Roll-up vs. granulaari:** `arviointi_havaittu` (attribuuttitason 1–5) on lähde; D-tasot ovat sen roll-up. Varmista että D5-roll-up lasketaan sosiaalisista attribuuteista, jos niitä on arvioitu (Topiaksella on: social_interaction, team_role, versatility) — muuten kortti näyttää "D5 —" vaikka data on olemassa.
