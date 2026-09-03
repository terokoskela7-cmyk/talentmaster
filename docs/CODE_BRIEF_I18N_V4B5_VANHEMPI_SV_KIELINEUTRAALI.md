# Code-brief — i18n V4-B5 · Vanhempi_v2 sv: kielineutraalin portin löydöt (16 jäännettä)

> **Rehellinen juurisyy (arkkitehti/tarkastaja = minä):** V4-B/B2/B3/B4 antoivat "0 fi-jäännettä" -PASSin,
> mutta **portti mittasi väärää asiaa.** Sekä minun että Coden skannaus (ja live-fi-regex) etsi *suomea*
> diakriittien (äöå) + kovakoodatun sanalistan perusteella. **Diakriitittömät suomen sanat listan ulkopuolelta
> läpäisivät JOKAISEN portin** (Roolisi · Yksityisyys · Kirjaudu ulos · Tulevat tapahtumat · Vinkki vanhemmille ·
> Miten tukea kotona · Jaa kortti · Merkitse luetuiksi · kehu-presetit · treeni-fallback). Live-render + korjattu
> **kielineutraali** skannaus (etsi *reitittämätön näkyvä teksti*, ei "suomea") paljasti **16 jäännettä**.
>
> **Korjattu portti (pysyvä, ks. §Verifiointi):** skannaa `>teksti<`-solmut ja UI-literaalit jotka **eivät** ole
> `${t(...)}`-interpoloituja — **riippumatta kielestä.** Tämä on ainoa luotettava i18n-täydellisyyden mittari.

**Mekaniikka sama kuin V4-B:** reititä `${t('vanhempi.*')}`; `{nimi}` `.replace()`; genetiivi → sv/en ilman taivutusta;
§7.22 säilyy; fi = nykyiset stringit sanatarkasti.

---

## Käännöstaulukko (16 jäännettä — fi = nykyinen · sv · en)

| # | Rivi | Sijainti | fi | sv | en |
|---|---|---|---|---|---|
| 1 | 524 | Ilmoitus-panelin toiminto | Merkitse luetuiksi | Markera som lästa | Mark as read |
| 2 | 629 | Kalenteriosion otsikko (📅 säilyy) | Tulevat tapahtumat | Kommande händelser | Upcoming events |
| 3 | 662 | **Kehu-pikanappi** (`_lahetaKehu` — teksti = napin label JA lapselle lähetettävä viesti) | Hienoa! | Toppen! | Great! |
| 4 | 665 | **Kehu-pikanappi** | Upea treeni! | Grymt pass! | Awesome session! |
| 5 | 715 | Vinkki-osion otsikko (u12) | Vinkki vanhemmille | Tips till föräldrar | Tip for parents |
| 6 | 742 | Vinkki-osion otsikko (u15/u19) | Muistathan | Kom ihåg | Remember |
| 7 | 769 | Vinkki-osion otsikko (rooli) | Roolisi | Din roll | Your role |
| 8 | 1202 | Tekniikka §7.22 tukiotsikko (💛 säilyy) | Miten tukea kotona | Så här stöttar du hemma | How to support at home |
| 9 | 1276 | Kortti — jaa-otsikko (genetiivi → pois) | Jaa {gen} kortti | Dela kortet | Share the card |
| 10 | 1279 | Kortti — jaa-nappi | JAA | DELA | SHARE |
| 11 | 1363 | Asetukset-otsikko | Yksityisyys | Integritet | Privacy |
| 12 | 1365 | Asetukset — {nimi} keskellä | {nimi} hallitsee dataa | {nimi} styr sina data | {nimi} controls their data |
| 13 | 1369 | Asetukset — GDPR-linkkinappi | Lue GDPR-selvitys | Läs GDPR-redogörelsen | Read the GDPR statement |
| 14 | 1373 | Asetukset — uloskirjautuminen | Kirjaudu ulos | Logga ut | Log out |
| 15 | 449 | Event-feed tyyppi-**fallback** (`e.tyyppi \|\| 'treeni'`) | treeni | träning | training |
| 16 | 616 | Kalenteri nimi-**fallback** (`ev.nimi \|\| 'Tapahtuma'`) | Tapahtuma | Händelse | Event |

**Interpolointi/placeholder:**
- #9 rivi 1276 `Jaa ${_genetiivi(d.nimi)} kortti` → **pudota genetiivi** → `${t('vanhempi.kortti_jaa_otsikko')}` = "Dela kortet"/"Share the card" (ei nimeä, V1-B2-konventio).
- #12 rivi 1365 `${d.nimi} hallitsee dataa` → `{nimi}`-placeholder: `t('vanhempi.aset_hallitsee_dataa').replace('{nimi}', d.nimi)`.
- #3/#4 kehu: reititä `_lahetaKehu('❤️', t('vanhempi.kehu_hienoa'))` — sama arvo menee napin labeliin JA `_lahetaKehu`-viestiin (lapselle lähtevä kehu kääntyy myös).
- #15/#16 fallbackit: `${e.tyyppi || t('vanhempi.tyyppi_treeni')}`, `esc(ev.nimi || t('vanhempi.tapahtuma_nimeton'))`.

**Valinnainen (matala prioriteetti):** rivi 6 `<title>TalentMaster™ — Perhe v1</title>` (selaimen välilehden otsikko, "Perhe"=Family) — staattinen HTML; jos haluat sv:ksi, tarvitsee JS-päivityksen kielenvaihdossa. Voi jättää.

---

## Vartijat
- **§7.22:** #3/#4 kehut ovat positiivisia (Toppen!/Grymt pass! = ylistys, ei painetta) — säilytä positiivinen sävy.
  #8 "Så här stöttar du hemma" = tukiotsikko, ei tasolukuja/vertailua.
- **§7.1:** `${t(...)}` olemassa oleviin templaatteihin; ei nested template literaleja. Placeholder `.replace()`.
- **Glossaari:** "Grymt pass" (treeni=pass/träning ruotsiksi jalkapallokontekstissa). fi säilyy sanatarkasti.
- **fi ei rikkoudu; fallback ehdoton.** Kanoninen root `lib/tm_lang.js` `vanhempi.*`.

## Cache-bust
Additiivinen (uudet `vanhempi.*`-avaimet) → **tm_lang ?v=7 riittää** (jo mainissa). Vanhempi-HTML muuttuu → SW-bump
`sw_vanhempi.js` cache-versio +1.

## DoD (korjattu portti)
- **Kielineutraali skannaus → 0 reitittämätöntä näkyvää tekstiä** (pl. tietoiset englannin domain-termit X-Factor/Hidden Gem/TKI/FI-SV-EN-nappilabelit, `?demo=1`, devChrome, IKA-placeholder-data).
- Kaikki 16 käännetty fi/sv/en. Fallbackit (#15/#16) reititetty. Kehut (#3/#4) kääntyvät myös lähetettävänä viestinä.
- lint 0 + Vitest laajennettu (16 uutta avainta fi/sv/en-kattavuus) + SW-bump.

## Verifiointi (Claude L3 + KORJATTU PORTTI — pysyvä)
> **i18n-täydellisyyden mittari EI OLE "etsi suomea" vaan "etsi reitittämätön näkyvä teksti":**
> skannaa render-funktioiden `>teksti<`-solmut + UI-literaalit (nappien/otsikoiden), poista `${t(...)}`-interpoloinnit
> ja `${...}`-lausekkeet, ja **lipputa mikä tahansa jäljelle jäävä ≥3-kirjaiminen sana** — riippumatta kielestä.
> Diakriitti-/sanalistapohjainen "suomiskannaus" EI RIITÄ (se päästi nämä 16 läpi).
- Aja tämä + live-render (u12/u15/u19 + kehu-napit + ilmoituspaneeli + kalenteriosio + asetukset) → 0 jäännettä.
- Molemmat teemat, fi + sv + en. §7.22 kehut positiivisia.

## Rajaus (EI tässä)
- Tietoiset englannin domain-termit (X-Factor · Hidden Gem · TKI · FI/SV/EN-kielinapit). `?demo=1`-data. devChrome.
- Master/VP/Seura-henkilöstöpinnat (oma vaihe).
