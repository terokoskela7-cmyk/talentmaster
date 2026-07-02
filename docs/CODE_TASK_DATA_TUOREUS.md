# Code-tehtävä: Datan tuoreus näkyviin + "Päivitä mittaus" -kehys (VP_v25)

> Lähde: live-verify 2026-07-02 (Claude + Tero), Sibbo T2014 -historiatuonnin jälkeen. VP-näkymä esittää **ikäsuhteutetut tasot** (oikein laskettu, §26 `normiIka` = ikä testihetkellä) mutta **ilman mittauspäivää joukkuetasolla** → valmentaja voi luulla vuoden vanhaa 2025-tilannekuvaa tämänhetkiseksi. Sibbon viimeisin H-H-mittaus 3.10.2025 (~9 kk vanha), silti Tilanne-otsikko: *"Fyysinen taso vaatii pikahuomiota. 3 joukkuetta alle kansallisen tason."*
> Rajaus: **VP_v25** (Tilanne-headline + kriittiset signaalit + pulssikortit + per-pelaaja `_jspModal`). §26 (pikakentät, ei alikokoelmakyselyjä).

## Periaate (LUKITTU — älä muuta arviointilogiikkaa)
- **Taso = tilannekuva testihetken iästä.** `normiIka(syntymaVuosi, hh_pvm)` = `year(testipvm) − syntymävuosi`. Tätä EI muuteta — 2025-tulos arvioidaan 2025-iän normeja vasten, pysyvästi. (Vahvistettu: recalcHH käyttää tätä, idempotentti.)
- Ongelma EI ole laskennassa vaan **esitystavassa**: joukkuetason näkymä kehystää vuoden vanhan datan kiireellisenä *nykytilana* eikä näytä milloin on mitattu.
- Korjaus = **datan ikä näkyviin + toimintakehys "Päivitä mittaus"** (ei "data on vanhaa" -kieltä).

## Osa 1 — Tuoreus-helper (yksi totuuslähde)
Lisää pieni kanoninen apufunktio (VP_v25, mielellään jaettu myöhemmin libiin):
- `TUOREUS_KK = 6` — vakio. Mittaus on **vanha** kun uusin relevantti pvm on > 6 kk vanha **TAI** eri kaudelta kuin nykyinen (nuorten testisykli 2–3×/v → >6 kk = väliin jäänyt kierros).
- `onVanhaMittaus(pvmIso)` → bool (null/puuttuva → ei merkkiä, ei "vanha").
- `kuukausiaMittauksesta(pvmIso)` → int (näyttöä varten).
- Lähde-pvm per patteristo pikakentistä (§26): fyysinen/H-H → `hh_pvm`, TKI → `tki_pvm`, FLEI → `flei_pvm`. Käytä sen patteriston pvm:ää jonka tasoa kortti näyttää.

## Osa 2 — Pulssikortit (`renderTeamPulse`)
Jokaiseen pulssikorttiin (D1/D2/TKI/H-H per joukkue):
- **Näytä viimeisin mittauspäivä** patteristokohtaisesti, muodossa **pp.kk.vvvv** (käytä olemassa olevaa `_pvmFiVP()`), esim. "mitattu 3.10.2025".
- Kun `onVanhaMittaus` → **"📍 Päivitä mittaus"** -merkki (teal/amber toiminta-chip, EI punainen hälytys) + "viimeksi 3.10.2025".
- **Älä poista** "alle normin" -signaalia — näytä se **rinnalla** tuoreusmerkin kanssa (suhteellinen sijoitus on validi; recency on erillinen ulottuvuus). Valmentaja saa molemmat: missä joukkue on ikäisekseen + että data kaipaa päivitystä.

## Osa 3 — Tilanne-headline + kriittiset signaalit
- Headline-kehys ("Fyysinen taso vaatii pikahuomiota"): kun signaali nojaa **vanhaan** mittaukseen, lisää annotaatio "(mitattu 3.10.2025 — päivitä mittaus)" ja **pehmennä kiireellisyys toiminnaksi**: painopiste = *päivitä mittaus*, ei *taso on huono nyt*.
- Kriittinen signaali (esim. "Tekniikka/Fyysinen alle normin"): kun `onVanhaMittaus`, lisää sama pp.kk.vvvv + "Päivitä mittaus" -CTA hälytyksen rinnalle. Tuore alle-normi-signaali säilyy kiireellisenä; vanha muuntuu "päivitä ensin".
- Ristivertailu (Tilanne-histogrammi / joukkuevertailu): jos vertailtavilla joukkueilla eri-ikäistä dataa, merkintä "eri mittausajankohdat" (ei sekoiteta 2025- ja 2026-dataa samalle viivalle ilman huomautusta).

## Osa 4 — Per-pelaaja `_jspModal`
- "Testipäivät"-erittely (§ CODE_TASK_TESTIPAIVAT `testipaivat`-pikakenttä) — varmista **pp.kk.vvvv** kaikkialla.
- Kun patteristo vanha → sama "📍 Päivitä mittaus" -merkki rivin perään.

## Osa 5 — Päivämääräformaatti (EHDOTON, koko VP_v25)
- **Kaikki UI-päivämäärät suomalaisittain pp.kk.vvvv** (`_pvmFiVP()` tai `toLocaleDateString('fi-FI')`). EI ISO-merkkijonoa (2025-10-03), EI kk/pp-muotoa näytöllä.
- **Kuukausivälit kirjoitetaan auki:** "huhti–loka 2025" tai kausi "syksy 2025" — EI "04–10/2025" (luetaan väärin p/kk-lukijalla).
- Auditoi tämän briefin kohdenäkymien olemassa olevat pvm-renderöinnit ja korjaa mahdolliset ISO/numeromuodot.

## Guardrailit
- Arviointi/normilogiikka ennallaan (`normiIka` = ikä testihetkellä; recalcHH idempotentti). Tämä on puhtaasti esitys-/kehyskerros.
- §26: lue pikakentistä (`hh_pvm`/`tki_pvm`/`flei_pvm`/`testipaivat`), ei alikokoelmakyselyjä renderöinnissä.
- Brändi (§5) — teal toiminta, amber huomio; ei uutta punaista. VP-facing → §7.22 ei koske.
- Ei versionbumppia (Pages-cache + `?cb`). Feature branch → PR.

## Testit / verifiointi
- Vitest: `onVanhaMittaus` (raja 6 kk, eri kausi, null-guard) · `kuukausiaMittauksesta`.
- Claude live-verify (Sibbo, SA): pulssikortit näyttävät "mitattu 3.10.2025" + "📍 Päivitä mittaus" (viimeisin >6 kk); Tilanne-headline annotoi vanhan datan; kaikki pvm pp.kk.vvvv; ristivertailussa eri-ajankohta-merkintä.

## Ei tähän
- Arviointilogiikan muutos (tason "vanhentaminen" nykyikään) — nimenomaisesti hylätty (§ tämä sessio: taso = tilannekuva testihetkestä).
- Automaattinen muistutus huoltajalle/valmentajalle mittauksen päivityksestä — oma tehtävä (voi nojata `lahetaMuistutukset`-infraan myöhemmin).
