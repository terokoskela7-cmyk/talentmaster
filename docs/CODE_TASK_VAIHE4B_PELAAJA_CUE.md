# Vaihe 4b — Pelaajan cue-kerros (jaettu ymmärrys)

> Toiminnan kerros, pelaajan pää. Valmentaja valitsi jaksofokuksen (4a toimintakortti) → **pelaaja näkee SAMAN konseptin omalla kielellään** + yhden cue-kysymyksen. "Jaettu ymmärrys": valmentaja katsoo KPI:tä, pelaaja oivaltaa kysymyksen kautta. Kohde: **Pelaaja_v7** (`rMina*`). Rakentuu I1-libin (`lib/tm_teknistaktiset.js`) + 4a-jaksofokuksen päälle. DATAMALLI_TEKNISTAKTINEN **§0b (EHDOTON)** · §7.22 · §26 · §28 · §16. Visuaali: `docs/mockups/vaihe4b_pelaaja_cue_mockup.html`.

## 0. §0b jaettu ymmärrys -invariantti (EHDOTON — lue ensin)
Pelaajalle: konsepti omalla kielellä = **mikä tämä on** + **miksi se auttaa pelissä** + **yksi cue-kysymys** Kysymyspankista. **EI kriteeritasoa 1 ("ei näy"), EI arvosanaa, EI vertailua muihin, EI KPI-listaa, EI 1–3-lukua.** Pelaaja oivaltaa kysymyksen kautta ("kysymys tekee älykkään, käsky tottelevaisen"). SDT-autonomia + Dweck-prosessi.

## 1. Sijainti + lohko
Pelaaja_v7 **MINÄ-näkymä**, uusi lohko **"Minä ja pallo — tämän hetken fokus"** (tekniikkaprofiilin lähelle, `rMinaKonseptiFokus()` → liitä `_kaynnistaAppUI`/MINÄ-renderiin ~2028 `rMinaTekniikkaprofiili()`:n viereen). Yksi kortti, ei ylikuormita.

## 2. Data (§26 — pikakentät, EI alikokoelmakyselyä)
- **Ensisijainen:** `jaksofokus.konsepti_avain` (valmentaja/VP asetti 4a:ssa) → `tmTtPelaaja(avain)` (uusi lib-helper).
- **Fallback (ei jaksofokusta):** `tki_kehityskohde`-laji → vastaava konsepti, TAI `tmTtVaihe(p)`-vaiheen youth-oletuskonsepti → **aina jotain rakentavaa** (ei tyhjää "ei fokusta"). Positiivinen kehys: "Tämän hetken juttu jota kannattaa fiilistellä."
- Ei uusia Firestore-lukuja renderissä; kaikki pelaajadokin pikakentistä.

## 3. Uusi lib-helper `tmTtPelaaja(avain)` (`lib/tm_teknistaktiset.js`)
Palauttaa **pelaajaturvallisen** objektin (ei KPI-lukuja):
```
{ otsikko,            // konsepti nimi (esim. "Kuljetus ahtaassa")
  mika,               // milloin pelissä näkyy — pelitilanne lapsen kielellä
  miksi,              // pelihyöty yhtenä lauseena (uusi kenttä 'pelaaja_miksi' OMA_VERSIO-lähteessä; puuttuessa johda pelitilanteesta)
  cue,                // YKSI Kysymyspankki-kysymys (tmTtKysymykset(avain)[0])
  koe }               // valinnainen: yksi konseptipeli/harjoite ("Kokeile tätä", tmTtHarjoitteet(avain) → nimi, EI ohjeteksti-tulvaa)
```
- **Sisältöpass:** lisää `pelaaja_miksi` (1 lause, lapsen kieli) OMA_VERSIO-lähteeseen **14 youth-konseptille** (yleisin jaksofokus). Pelipaikkateemat → fallback pelitilanteesta (graceful). Parser (`parse_oma_versio.py`) lukee kentän → regeneroi lib → committoi.
- **§7.22-vahti helperissä:** ei palauta `kriteerit`/tasoja/`kpi`-listaa pelaajapinnalle.

## 4. Kortin sisältö (mockupin mukainen)
- Otsikko + pieni vaihe-vihje (🌱/⚽ ikävaihe, ei lukua).
- **"Milloin tämä näkyy"** (mika) — pelitilanne.
- **"Miksi se auttaa"** (miksi) — pelihyöty.
- **"Mieti tätä pelissä 💭"** (cue) — yksi kysymys, korostettu.
- Valinnainen **"Kokeile tätä →"** (koe) — konseptipeli, positiivinen, ei pakko.
- **Jaettu ymmärrys -vihje:** pieni teksti "Valmentajasi katsoo samaa juttua." (yhteys, ei valvonta).

## 5. §7.22 + §28 (EHDOTON)
Ei tasolukuja, ei arvosanaa, ei vertailua, ei TKI-laskua, ei "et osaa"-kehystä. Konsepti = mahdollisuus, ei puute. §28: pre-PHV/vaihe-gating — youth-konsepti nuoremmalle, pelipaikka vasta kun `tmTtVaihe`=pelipaikka + positio (kuten 4a). PHV-neutraali.

## 6. Rajaus (EI 4b:ssä)
Perheen peilinäkymä (Vanhempi_v2 sama konsepti + "miten tukea") = **3c-b / 4b-family, erikseen.** Arviointi→resepti-silta (Palloliitto-pääteema → konsepti) = **silta-työ** (`ARVIOINTIKEHYS_VS_CURRICULUM.md §3`). VP-oversight = 4c. Kalenteri = 4d.

## 7. Invariantit + verifiointi
§0b (mikä+miksi+yksi cue, ei tasoa) · §7.22 · §26 (jaksofokus pikakenttä, ei alikokoelmakyselyä) · §28 (vaihe/PHV-neutraali) · §16 (Pelaaja lataa `lib`-scriptillä, ei inline-kopiota) · §5 · lib `?v` nostetaan + Pelaaja SW cache-versio (§27.4) jos lib precachessa. Vitest: `tmTtPelaaja` palauttaa {otsikko,mika,miksi,cue} eikä koskaan `kriteerit`/tasolukua; fallback-ketju (jaksofokus→kehityskohde→vaihe-oletus). Live Pelaaja_v7: pelaaja jolla jaksofokus (aseta 4a:lla) → näkee konsepti+cue lapsen kielellä, 0 lukua/vertailua; ilman jaksofokusta → graceful fallback-konsepti. `npm test` + lint.
