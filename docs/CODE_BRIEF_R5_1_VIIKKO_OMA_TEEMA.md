# R5.1 — Viikko: oma harjoitusteema + monidomeeni → KALENTERIIN (näkyy pelaajalle + joukkueelle) · Code-brief

> **Miksi (Teron pyyntö + varmistus):** Valmentaja haluaa lisätä Viikon päivälle **vapaan oman teeman** tai **muun domeenin
> session** (🏃 fysiikka · 🧠 psyykkinen · 🤝 sosiaalinen · ⚽ teknis-taktinen) — JA teeman pitää **linkittyä pelaajan omaan
> kalenteriin sekä joukkueharjoitteluun**, ei jäädä valmentajan yksityiseksi merkinnäksi.
> **Arkkitehtuurin varmistus (tarkistettu koodista):** yksi totuuslähde `seurat/{sid}/kalenteri` (§35 K1–K3) ruokkii **kaikkia**:
> VP-Viikko lukee sen (MD, "Täytä viikko"), **Pelaaja-app P7-c.1 "Seuran aikataulu" lukee saman `kalenteri`n** (tulevat omasta
> joukkueesta, read-only + ilmoitukset), ja K2-läsnäolo kiinnittyy tapahtumaan. **Siksi oma teema on vietävä `kalenteri`in
> (ei pelkkiin `kirjaukset`iin)** — silloin se näkyy automaattisesti pelaajalle + joukkueelle + Viikossa.
> **Reuse:** `avaaUusiTapahtuma(oletusPvm, {tyyppi:'harjoitus', treeniteema, pelaajat_id|joukkueNimi})` (olemassa oleva
> kalenteriluonti-modaali, Rules v3.5 · §35) + `_vpJfDomeeniKonseptit(p,dom)` (4-domeeni-konseptilistaaja). **Ei uutta kokoelmaa.** Ei `?v`.

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN.** Reuse yli reimplementoinnin. **Älä koske:** MD-ankkurointi · sRPE/ACWR/§28 · läsnäolo/ääni/katselmus ·
  jaksofokus A/B/C -logiikka · morfosykli-nauhan Oura-koodaus. Vain oma-teema-editori + kalenterivienti + Täytä-viikko-mappaus laajenee.
- **§37 roolit (Rules v3.5 kalenteri):** create vaatii `luoja_uid==auth.uid`; valmentaja/talenttivalmentaja/VP. **§7.22/GDPR:** ennallaan (kuorma ei pelaajalle · terveyssyy ei kirjauksiin).

---

## MUUTOS 1 — "＋ oma teema / harjoitus" päivä-editoriin → VIE KALENTERIIN

Viikon päivä-editorissa (`_vpViikkoRiviHTML`, avautuu edit-on-tap) lisää **"＋ oma teema"** -kontrolli, joka avaa kompaktin valitsimen:

**1. Teema:**
- **Domeeni-toggle** 🏃 Fyysinen · ⚽ Teknis-taktinen · 🧠 Psyykkinen · 🤝 Sosiaalinen → **konseptivalitsin** `_vpJfDomeeniKonseptit(p, dom)` (dropdown [{avain,nimi}]).
- **✎ Vapaa** → vapaatekstikenttä (esim. "Fysiikka: nopeus", "Palauttava").

**2. Kohde (valmentaja valitsee — Tero: yksilö / osajoukkue / koko joukkue):**
- **Yksilö** (tämä pelaaja) → `pelaajat_id:[pid]`.
- **Osajoukkue** → **monivalinta joukkueen rosterista** (reuse `_pelaajat` suodatettuna `p.joukkue`/`joukkueet[]` §18) → `pelaajat_id:[valitut]`.
- **Koko joukkue** → `joukkueNimi: p.joukkue`.

**3. Kesto** (oletus 75 min) → **"Vie kalenteriin"**:
```
avaaUusiTapahtuma(dayIso, {
  tyyppi: 'harjoitus',
  treeniteema: konsepti ? { avain, nimi, tyyppi: domeeni, koodi } : { nimi: vapaateksti, vapaa: true },
  pelaajat_id: [...] ,        // yksilö/osajoukkue
  joukkueNimi: '...'          // koko joukkue
})
```
→ avaa **olemassa olevan kalenterimodaalin esitäytettynä** (päivä + teema + kohderyhmä), valmentaja vahvistaa → luo `kalenteri`-tapahtuman.
**Reuse koko luonti + Rules + roster + tallennus** — ei uutta kirjoituslogiikkaa. (Vapaateksti-teema jolla ei ole `avain`:ta → tapahtuman
`nimi` = vapaateksti; `_jsvUusiTeema` vaatii `avain`:n, joten vapaa teema kulkee nimikenttänä — **ilmoita ENNEN jos modaali vaatii pienen laajennuksen** vapaan teeman näyttöön.)

> **Tulos (miksi tämä vastaa kysymykseen):** kalenteritapahtuma näkyy heti (a) **pelaajan app-kalenterissa** (P7-c.1 lukee `kalenteri`n),
> (b) **joukkueharjoitteluna** (osajoukkue/koko joukkue: kaikki roster-pelaajat), (c) **Viikossa** ("Täytä viikko" / refresh lukee `kalenteri`n),
> (d) tukee **K2-läsnäoloa**. Per-pelaaja-toteutus (RPE/kesto/läsnä) tallentuu edelleen `kirjaukset`iin `tapahtuma_id`-linkillä (`_vpViikkoTallennaRivi`, ennallaan).

## MUUTOS 2 — nauhan näyttö (Oura: teal vain jaksofokukselle)

Kalenterista tullut oma teema (`_vpViikkoTayta` → rivi) näkyy morfosykli-kortissa:
- **EI teal-fokusreunaa** (teal vain jaksofokus A-tagille). Oma teema = **neutraali kortti** + **pieni mono-domeeni-ikoni** (🏃/⚽/🧠/🤝) tai "✎".
- sRPE-palkki himmeä ink (ei teal). Legenda saa hienovaraisen "· 🏃/🧠/🤝 oma teema / muu domeeni" (ei uutta väriä).

## MUUTOS 3 — Täytä-viikko honest-labeling (`_vpViikkoTayta`)

Kalenterin `treeniteema` joka **ei matchaa** jaksofokuksen tavoitetta → näytä **omana teemana** (neutraali), EI väärin pääfokuksena (A):
```
if (ev.teemaAvain) { const m = st.tavoitteet.find(t => t.avain === ev.teemaAvain);
  if (m) { /* A/B/C kuten ennen */ }
  else { row.oma_teema=true; row.oma_avain=ev.teemaAvain; row.oma_domeeni=ev.teemaDomeeni||null; row.fokus_nimi=ev.teemaNimi||'Teemaharjoitus'; row.tavoite_tag=null; } }
```
(Lue `t.treeniteema.nimi`/`.tyyppi` `treeniPvm`-mappaukseen.) → kalenterin oma teema näkyy Viikossa oikein, ei jaksofokuksena.

---

## INVARIANTIT + DoD
- **Yksi totuuslähde:** oma teema = `seurat/{sid}/kalenteri`-tapahtuma → näkyy pelaajalle (P7-c.1) + joukkueelle + Viikossa + K2.
  **Ei uutta kokoelmaa.** Reuse `avaaUusiTapahtuma` + `_vpJfDomeeniKonseptit` + `_pelaajat`-roster.
- **Kohde valmentajan valinnalla:** yksilö (`pelaajat_id:[pid]`) · osajoukkue (`pelaajat_id:[valitut]`) · koko joukkue (`joukkueNimi`).
- **Oura/brändi §5:** teal vain jaksofokukselle · oma teema neutraali + mono-domeeni-ikoni · 0 pinkkiä · amber vain aito varoitus. Molemmat teemat.
- **§37/Rules:** kalenteri create `luoja_uid==auth.uid`, valmentaja/talenttivalmentaja/VP (ei Rules-muutosta). **§7.22/GDPR** ennallaan.
- **Ei regressiota:** jaksofokus A/B/C-jakauma (oma teema EI kerry A/B/C:hen, laskee vain kuormaan) · sRPE/ACWR/§28 · MD · läsnäolo/ääni/katselmus · edit-on-tap ennallaan.
- **LIVE ennen valmista (protokolla — monta profiilia):**
  - **Yksilö-oma teema (vapaateksti):** editori → ✎ Vapaa "Palauttava" → kohde Yksilö → Vie kalenteriin → **kalenteritapahtuma syntyy** (pelaajat_id:[pid]) →
    näkyy Viikossa neutraalina · (tarkista) näkyy pelaajan app "Seuran aikataulu" -listalla.
  - **Osajoukkue-fysiikka:** 🏃 Fyysinen konsepti → kohde Osajoukkue → valitse 3 pelaajaa → Vie → tapahtuma `pelaajat_id:[3]` · näkyy noiden Viikossa.
  - **Koko joukkue -teema:** ⚽/🧠 → kohde Koko joukkue → `joukkueNimi` → näkyy joukkueharjoituksena.
  - **Kalenteri-teema matchaamaton:** ✨ Täytä viikko → treeniteema joka ei ole jaksofokus → näkyy **omana teemana** (ei A).
  - **Regressio:** jaksofokus A/B/C teal + jakauma ennallaan · Lepo · MD · edit-on-tap · läsnäolo (K2 kiinnittyy uuteen tapahtumaan). Molemmat teemat. Vitest + eslint vihreä. Ei `?v`.

## EI TÄSSÄ (mahdollinen jatko)
- Oman teeman **suora inline-luonti ilman kalenterimodaalia** (nyt reuse `avaaUusiTapahtuma` = valmentaja vahvistaa modaalissa; tietoinen valinta, estää vahinkotapahtumat).
- Osajoukkue-**tallennus nimettynä ryhmänä** (toistuva osajoukkue) — nyt kertavalinta rosterista. Erillinen jos tarve.
