# CODE BRIEF · sv-käännöserä 8.10.2026 (Gemini) → koodiin

**Kaista: Tero.** Muutoksia tulee `lib/`-karttoihin, `lib/tm_*.js`-adaptereihin ja sovellus-HTML:iin.
**Lähde:** `docs/i18n/sv_kaannoserae_2026-10-08.json` (Gemini, 8.10.2026; pohja `origin/main 42d9a67`).
**Tavoite:** ennen 1.11.2026 Sibbo-Vargarnan käyttäjät näkevät ruotsiksi ryhmät, klipit, Tänään-kortit, reitin valinnan, viikkokatsauksen ja kehitystyöpöydän.

## Säännöt

- **Älä muuta yhtään sv-arvoa.** Code ei kirjoita ruotsia (CLAUDE.md §0). Jos rivi ei sovi koodiin (esim. lause jaettu eri kohdasta), älä korjaa sitä. Lisää se PR:ään listana "palautetaan Geminille" ja jätä fi-fallback.
- Arvot kopioidaan skriptillä JSON-tiedostosta, ei käsin.
- Tarkistettu ennen tätä briiffiä (PM 8.10.):
  - 696/696 riviä täytetty.
  - Avaimet ja fi-arvot ennallaan.
  - Muuttujat ennallaan, `{gen}` ei esiinny sv-teksteissä.
  - Entiteetit, symbolit ja alun/lopun välilyönnit ennallaan.
  - "ase" ei esiinny.
  - Termit johdonmukaisesti: Ydinvahvuus = Kärnstyrka, Vahvuus = Styrka, Seura = Förening, VP = FU.

## Päätös A (KARTOITUS.md §5): jaettu kirjastokartta

Tero hyväksyy PR:ssä. Ehdotuksena vaihtoehto 2: uusi `lib/tm_lib_i18n.js`.

- `var TM_LIB_I18N = { sv: { 'kt_ei_oikeutta': '…', … } }`, avain = kirjaston FI-avain sellaisenaan.
- Avaimet ovat jo prefiksoituja (`kt_`, `kk_`, `mv_`, `kp_`, `ry_`, `kn_`…). Jos törmäyksiä on, raportoi ne, älä nimeä uudelleen.
- Adapterit (`vpT`, `masterT`, Pelaaja `_p7K1T`, Vanhempi) välittävät kirjastolle `t`-funktion, joka katsoo ensin kartasta `TM_LIB_I18N[kieli][avain]`, sitten nykyisestä reitistä ja lopuksi fi-oletuksesta (kirjasto hoitaa).
- Ladataan jokaisessa sovelluksessa, joka lataa jonkin kirjastoista (VP, Master, Pelaaja, Vanhempi). Lisää tiedosto SW:n allowlistiin Pelaajalla ja Vanhemmalla ja nosta cache-versio (§27.4).
- **Kysymyspohjat** (`lib.tm_mediaviesti.kysymyspohjat`) ovat taulukoita: `TM_LIB_I18N.sv.mv_pohjat = { onnistui:{leikkija:[…3], …}, … }`. `tmMvPohjat` palauttaa sv-taulukon, kun kieli on sv.
- Kielivahti: `kielivahti.config.json`, tyyppi `lib_fi` → sv-reitti = `tm_lib_i18n.js`. Portti vertaa kirjastojen FI-avaimia karttaan (uusi FI-avain ilman sv-riviä → odotuslista tai fail, kuten tm_lang).

## Vienti osioittain

| Osio | Kohde | Rivejä |
|---|---|---:|
| `tm_lang` | `lib/tm_lang.js` → `sv` (polku = avain); poista avaimet `tests/tm_lang_sv_odotuslista.cjs`:stä | 58 |
| `lib.*` (10 kirjastoa) | `lib/tm_lib_i18n.js` | 344 |
| `lib.tm_mediaviesti.kysymyspohjat` | `lib/tm_lib_i18n.js` (`mv_pohjat`) | 27 |
| `vp_kartta` + `vp_otsikot_data_i18n` | `lib/tm_vp_i18n.js` `sv` (avain = fi-teksti) | 193 + 4 |
| `master_kartta` + `master_otsikot_data_i18n` | `lib/tm_master_i18n.js` `sv` | 67 + 3 |

- Dedupe-invariantti: jos fi-avain on jo `tm_i18n_common.js`:ssä, älä lisää sivukarttaan. Raportoi tällaiset (niitä ei pitäisi olla, koska erä on laskettu commonia vasten).
- `termisto.kaannettava` (36 termiä) → `docs/i18n/termisto.fi-sv.json` tila `sovittu`.
- `termisto.paatetty` (6 ristiriitaa) → tila `sovittu` ja poista ristiriita. **Lisäksi** korjaa koodissa olevat poikkeavat vanhat rivit päätettyyn muotoon vain silloin, kun oikea muoto on jo jossain kartassa sanatarkasti. Esim. tm_lang `henkilosto.roolit.vp`: Träningschef → Fotbollsutvecklare, `Fysträner` → `Fystränare`. Listaa jokainen muutos PR:ssä.

## Testit

- Kirjastokartta: jokaiselle kirjaston FI-avaimelle on sv-rivi, ja sv-muuttujat vastaavat fi-muuttujia (pl. `{gen}`).
- Adapteri: sv-tilassa `vpT`/`masterT`/Pelaaja palauttavat kirjastoavaimelle sv-tekstin. Ennen tätä ne palauttivat avaimen ja putosivat fi:hin, eikä mikään testi huomannut sitä.
- `tm_lang_sv_odotuslista` päivittyy: 58 pois, lista tyhjä.
- VP/Master-resolviportit vihreinä.
- Käsin: KPV P13 -testipelaajalla (Topias, Toppari Testi…) kieli sv → Pelaajan Tänään-kortit, klippi ja reitin valinta ruotsiksi. VP:n Ryhmät-osio ja Kenelle ruotsiksi.
- Koko sarja (myös `functions/`) ja tulos PR:ään.

## Tero tarkistaa (ei estä vientiä)

Geminin termivalinnat, jotka Sibbon valmennuspäällikkö voi haluta toisin. Vaihdetaan myöhemmin yhdellä termistöerällä:

- Pelaajan välilehdet **Idag · Stig · Prestation** (Tänään · Polku · Näyttö)
- **Kärnstyrka** / **Styrka** (Ydinvahvuus / Vahvuus)
- **Väg** (Reitti) · **Lätt granskning** (Kevyt katselmus) · **Ansvarsperson** (Vastuuhenkilö)
- `kk_*` "VP:n lause" → **FU:s hälsning**: Gemini tulkitsi lauseen tervehdykseksi. Tarkista, että sävy vastaa tarkoitusta.

## Ei tässä

- VP- ja Master-karttojen 110 eri tavoin käännettyä riviä (oma erä).
- Harjoitepankin tekstit.
- Curriculumin render-kytkentä (Vaihe B).
- Reitittämätön kovakoodattu suomi Pelaaja_v7:ssä ja Vanhempi_v2:ssa (mitataan erikseen).
