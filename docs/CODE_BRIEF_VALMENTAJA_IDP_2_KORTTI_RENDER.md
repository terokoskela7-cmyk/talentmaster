# Valmentajan IDP · Briiffi 2/2 — Kehityskortin render (Oura-tyyli) · Code-brief

> **Design-kartta:** `VALMENTAJAN_IDP_design_kartta.html` (hyväksytty). Kortti yhdistää jo olemassa olevat palaset yhdeksi
> valmentajan kehityskaareksi — samalla ajattelulla kuin pelaajan IDP-kortti, mutta valmennusosaamiselle. **KISS + Oura:**
> yksi tila-rengas (ei numeroa/arvosanaa) → kontribuuttorit (tila + suunta) → yksi jaksofokus. **Kehittävä, ei rankaiseva.**
> **Edellytys:** Briiffi 1 (data-robustius) mergetty ensin — tämä lukee sen kalibraatiotiloja. **VP_v25 + reuse libit. Ei `?v`.**
> **Malli:** string-helperit + pikakentät (§26), reuse yli reimplementoinnin. **Sparkline: reuse `tmKaariSiru`** (K3-export lib/tm_kehityskaari.js).

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN.** Reuse: `laskeValmentajaHarjoitusKooste` (pikakentät) · `harjoitusKalibraatioHistoria` · `tmValmennusKaari` · `tmKaariSiru`. **Älä koske:** näiden logiikkaan, harjoitusarviointi-lomakkeeseen, mentorointiin.
- **Aikuisen ammatillista dataa:** ei §7.22-lapsisuojaa, mutta **kehittävä-ei-rankaiseva**: ei sijoitusta, ei arvosanaa, ei punaista. Poikkeama = keskustelunavaus. **Molemmat teemat, teal ainoa aksentti, 0 pinkkiä.**

## SIJOITUS
- **MVP:** valmentajakortti `avaaCoachPanel` (~11835) — uusi ensimmäinen välilehti/lohko **"Kehitys"** (tai hero coach-kortin yläosaan ennen Profiili/VAI+/Harjoituslaatu/Mentorointi/Kalibraatio-välilehtiä). VP näkee tämän per valmentaja.
- **Vaihe 2 (EI tässä):** sama kortti valmentajan omaan Master-näkymään (valmentaja näkee omansa). Nyt vain VP-puoli.

## MUUTOS 1 — Hero: valmennusote-tila-rengas (EI numeroa)
Yksi string-helper esim. `_coachIdpHeroHTML(v)` (`v` = valmentaja-objekti pikakentillä + ladatut kalibraatiotilat):
- **Rengas = kattavuus, ei arvosana:** montako viidestä kontribuuttorista on **aktiivinen** (dataa ≥ kynnys). Keskellä **tila-sana** (esim. "Vahvistuu / Vakaa / Rakentuu") + pieni "X / 5 signaalia" — **ei pistettä, ei sijoitusta.** Reuse suunta: aktiivisten kontribuuttoreiden suunnista (kaventuu/nousee ↑ vs vakaa).
- **Insight-lause** (Oura-tyyli, yksi supportiivinen virke): esim. "Neljä viidestä signaalista aktiivinen · itsetuntemus kaventuu." Honest-empty jos <2 signaalia: "Kehityskaari kertyy — kirjaa arviointeja ja kalibrointeja."

## MUUTOS 2 — Kontribuuttorit (5 riviä, tila + sparkline + honest-empty)
Rivihelper esim. `_coachIdpRiviHTML(ikoni, otsikko, meta, tila, suunta, sarja)`. Kukin: ikoni · otsikko · pieni meta (mono) · `tmKaariSiru(sarja,56,16)` jos ≥2 pistettä · tila-teksti (teal ↑ / ink2 → / amber "kertyy"). **Lähteet (pikakentistä/koosteista, EI uusia raakakyselyjä renderissä):**
1. **🎯 Harjoituksen laatu** — `harjoituslaatu_ka` (+ `harjoituslaatu_liike_pct`, `_n`). Malli A.
2. **🧭 Valmennustaito** — `valmennustaito_ka` (+ `_n`). Malli B.
3. **🪞 Itsetuntemus** — `harjoitusKalibraatioHistoria(arvioinnit)[uid]` (keskikuilu + kaventuu/kasvaa). **Kaventuu ↓ = hyvä** (yhteinen kieli tarkentuu). Honest-empty = Briiffi 1:n tilaviesti ("odottaa havainnointia" jne.).
4. **⚽ Pelin yhteinen kieli** — `tmValmennusKaari(hav,{omaUid,vpUid})` (K5b peliäly-kalibraatio). "lähenee" kun kaventuu.
5. **📚 Osaamispohja** — UEFA-lisenssitaso + `cpd_tunnit_kausi` (kayttajat-dok). Ei trendiä → nykyarvo + "kertyy · kirjaa koulutus".
- **Kynnys "aktiivinen":** on dataa (esim. `_ka!=null` / vahvistettu pari / ≥2 ADAR-ikkunaa / lisenssi tiedossa). Puuttuva → **honest-empty rivi joka kertoo mitä puuttuu**, ei piilotettu.

## MUUTOS 3 — Yksi jaksofokus (coach) + hierarkia-kytkös
- **Jaksofokus (yksi, KISS):** johda **datasta** — ensisijaisesti suurin `harjoitusKalibraatioHistoria`-kuilukriteeri (esim. b4 "palautteen laatu"), fallback heikoin `valmennustaito`-kriteeri (`koostaHarjoitusarvioinnit` per_kriteeri) tai matalin peliäly-dimensio. Näytä: konsepti + **yksi konkreettinen kokeilu** + "VP havainnoi uudelleen jakson lopussa". **Ei arvosana.**
- **Toiminnot:** "Avaa kehityskaari →" (avaa detaljin: b1–b7, kalibraatiokuilu) + "Mentorointi · VP →" (olemassa oleva mentorointi-loop).
- **Hierarkia-kytkös (kevyt tässä, täysi Vaihe 2):** kortti heijastaa kausitavoite → jaksofokus → toimenpide → katselmus -rakennetta visuaalisesti; kausitavoitteen **tallennus/hyväksyntä = Vaihe 2** (nyt jaksofokus-ehdotus + mentorointi riittävät). **Ilmoita ENNEN** jos aiot tallentaa jaksofokuksen (MVP = vain render, ei uutta kirjoitusta).

## INVARIANTIT + DoD
- **Yksi näkymä yhdistää viisi lähdettä** — reuse (`laskeValmentajaHarjoitusKooste`/`harjoitusKalibraatioHistoria`/`tmValmennusKaari`/`tmKaariSiru`), ei uutta laskentaa/sparklinea.
- **Hero-rengas = kattavuus + tila-sana, EI numeroa/pistettä/sijoitusta.** Kaventuva kalibraatio = positiivinen. Ei punaista, ei amber-"virhettä" (amber vain "kertyy/puuttuu").
- **Honest-empty kertoo mitä puuttuu** (Briiffi 1:n tilaviestit). §26 pikakentät, ei alikokoelmakyselyä renderissä (kalibraatio lukee jo-ladatut `arvioinnit`, kuten `_cmLataaArvioinnit`).
- **Kehittävä-ei-rankaiseva. Molemmat teemat, teal-aksentti, 0 pinkkiä.** Reuse-brändi (Cormorant/DM Sans/DM Mono, hiusviivat, terävät kulmat).
- **LIVE ennen valmista (Sibbo, VP-appi, molemmat teemat):**
  - Joakim (Briiffi 1 vahvistetulla parilla) → hero "Vahvistuu · 4/5", kontribuuttorit: valmennustaito + kalibraatio (kuilu 0.86 · kaventuu) näkyvät, osaamispohja "kertyy". Jaksofokus = suurin kuilukriteeri.
  - Valmentaja ilman dataa → honest-empty hero ("kertyy") + rivit kertovat mitä puuttuu. Ei kaadu.
  - Ei numeroa/arvosanaa/sijoitusta missään. Vitest + eslint vihreä.

## EI TÄSSÄ
- Kausitavoitteen tallennus/hyväksyntä + valmentajan oma Master-näkymä (Vaihe 2).
- Harjoitusarviointi-lomakkeen muutokset (kuuluvat Briiffi 1:een / omaan).
