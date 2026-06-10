# Tehtävä: TK_LAJIVIITTEET-resync + per-pelaaja pikakatsauksen Tekninen-analyysi

> Kaksi osaa: (0) edellisestä ajosta puuttumaan jäänyt resynkronointi — PAKKO tehdä
> ensin, ja (A) VP_v25 per-pelaaja pikakatsauksen (_jspModal) Tekninen-välilehden
> syventäminen samalle tasolle kuin Master_v16 TKI-detail ja joukkueen Yhteenveto.
> Speksit: `docs/TKI_ANALYYSIMALLI.md` + KPI-doc §12.B.

## Osatehtävä 0 — TK_LAJIVIITTEET-resync (JÄI TEKEMÄTTÄ edellisessä ajossa)

Edellinen ajo (84c6504) käytti tehtävädokumentin vanhaa versiota. Tarkistettu
tuotannosta: `grep -c "_lahde" docs/testit_indeksit.js` → 0. Tee nyt:

1. **Korvaa `TK_LAJIVIITTEET`** docs/testit_indeksit.js:ssä uudella versiolla
   tiedostosta `docs/tk_lajiviitteet.js` (regeneroitu 2026-06-10: alueelliset
   viitteet P8 n=20 · P11 n=20 · P13 n=7 · T8 n=18 · T13 n=11 + `_lahde`-kenttä
   per ikäluokka). Päivitä KAIKKI inline-kopiot (VP_v25, Master_v16, muut joissa
   vakio on) synkronointikommentteineen.
2. **Korjaa `TK_KOKONAISRAJAT` T13 pronssi 130 → 135** (testit_indeksit.js +
   inline-kopiot). Peruste: kaksi riippumatonta alueellista PDF:ää (Pohjoinen 2024
   + Eteläinen 2025) näyttävät 135 (TKI_ANALYYSIMALLI.md §8.8). Päivitä testit.
3. **Viite-labelit dynaamisiksi `_lahde`-kentästä** kaikkialla missä viite näytetään
   (Master TKI-detail, VP Yhteenveto A2, VP Tuki B):
   - `'valtakunnallinen'` → "Loppukilpailutaso 2023–25"
   - `'alueellinen'` → "Alueellinen huipputaso 2024–25 (suuntaa-antava)"
   - `_n < 10` → lisää "(n=X)"
4. **Poista vanhentuneet "ei saatavilla ikäluokalle 11/13" -polut** — P11 ja 13-v
   saavat nyt viitteet. Null-case säilyy: ika < 8, ika > 13, T8:n osalta tarkista
   (T8 on nyt datassa). Päivitä Vitest-odotukset (P11/P13 eivät enää null; lisää
   null-case ika 14).

## Osatehtävä A — _jspModal Tekninen-välilehti (per-pelaaja pikakatsaus)

Nykytila (kuvakaappaus Nooa Forsell): TSI "—" · TKI 51 · Merkki Pronssi · FLEI
"Ei vielä mittauksia". Kertoo TASON muttei KOHDETTA eikä MÄÄRÄÄ. Lisää (kaikki
pikakentistä, §26):

1. **Per-laji-rivit** (kun `tk_lajit_viimeisin` on): laji · arvo · viite
   (`tkLajiViite`, label `_lahde`-kentästä) · gap · ★/← -merkinnät. Sama
   renderöintilogiikka kuin joukkueen Yhteenveto A2:ssa mutta yhden pelaajan
   arvoilla — käytä samoja helpereitä, älä duplikoi.
2. **Sekuntibudjetti-rivi:** `tkSekuntibudjetti` → "Hopeaan puuttuu 8.2 s →
   pujottelu 3.1 s · syöttö 2.4 s" (2 suurinta gapia). Kulta jo → "Huipputaso —
   ylläpito".
3. **Delta + vauhti** (kun `tki_edellinen`): "TKI 51 (↑+6) · abs-parannus X s ·
   vaatimus kovenee Y s/v". §3.2: TKI-laskua ei punaisena jos abs parani.
4. **Kultaikkuna-rivi** ikäperustaisesti (≤12 🔥 / 13–14 ⚡ / ≥15 📊) — sama
   3-tason logiikka kuin Master TKI-detailissa.
5. **Data-tietoisuus:** TSI-rivi piilotetaan kokonaan kun SM-dataa ei ole (nyt
   näyttää "—" — vastoin periaatetta "näytä mitä on, piilota mitä ei"). FLEI-osio
   + "Avaa lomake" -CTA säilyy ennallaan (hyvä aktivointivipu).
6. **Kehitys-välilehti** (siellä jo delta-aikajana?): jos ei vielä, lisää 2 viimeisen
   TK-mittauksen vertailu (`tk_kokonaistulos_viimeisin` vs `_edellinen` + pvm:t).
   Jos `_edellinen` puuttuu → "Delta syttyy 2. mittauksella".

## Rajoitukset — ÄLÄ RIKO

- §7.1 string concat · §5 tokenit · §26 vain pikakentät · §31 per-laji = viite ei
  mitali · §6 yksi @media · EI interpolointia ikäluokille < 8 / > 13
- Typografia: noudata 37b01de-tason kokoja (arvot ≥14px, ei alle 11px tekstiä)
- Käytä kanonisia funktioita / olemassa olevia inline-kopioita — älä luo uusia
  duplikaatteja

## Verifiointi

1. `npm test` vihreä (päivitetyt odotukset mukaan lukien)
2. Inline-syntaksi (vm.Script) muutetuista tiedostoista
3. Selaimessa:
   - Sibbo P10 -pelaaja (esim. Nooa Forsell): per-laji-rivit + budjetti + delta
   - Sibbo P13 -joukkueen Yhteenveto: viitepalkit NYT näkyvät ("Alueellinen
     huipputaso 2024–25 (suuntaa-antava, n=7)")
   - Pelaaja ilman TK-dataa: Tekninen-tab näyttää vain FLEI-CTA:n siististi
   - TSI-rivi poissa kun ei SM-dataa
4. Commit + push + `npm run version:bump`
