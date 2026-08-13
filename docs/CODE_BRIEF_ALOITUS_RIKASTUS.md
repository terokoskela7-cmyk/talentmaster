# Aloitus-rikastus (R1.2) — teknis-taktinen konsepti-ydin kortin ytimeen · Code-brief

> **Miksi:** v7-kartta (Aloitus) määrittelee **7 rikkauselementtiä**, mutta R1 rakensi vain rauhallisen kehyksen
> (jaksofokus-hero · peili · kaari · syvyyskortit) ja **jätti teknis-taktisen konseptin ytimen tekemättä** — 5 elementtiä
> puuttuu livenä + silta-alkuperä on vajaa (ks. gap-analyysi). Tämä on se "konsepti sisältöineen kortin ytimeen" jonka
> Tero tunnisti kuvasta. **Kartta = IDP_KORTTI_KISS_design_kartta_v7.**
> **Luonne:** ADDITIIVINEN olemassa olevaan Aloitus-renderöijään — EI uudelleenrakennus, EI uutta dataa. Kaikki lähteet
> ovat jo koodissa; kyse on esityksestä. **Verifiointi: LIVE** (Topias + tyhjä, molemmat teemat). Arkkitehti verifioi livenä.
> **Sekvenssi = A (päätetty):** tehdään NYT. Per-osa-näkyvyys **rehellinen tyhjä ("arvioi Kehityksessä")** kunnes R4 kaappaa sen.
> Sitten R3 Arviointi → R4 Kehitys → R5 Viikko kantavat saman ytimen läpi.

---

## KOHDE + INTEGROINTI

**Renderöijä:** `_vpIdpNarratiiviHTML(p)` (rivi 5489) — **sama** jonka R1 rakensi. Lisää elementit **heti jaksofokus-heron
jälkeen** (`h += _vpAloitusJaksofokusHTML(p);` rivi 5530). Reuse hero + peili (`_vpAloitusPeiliHTML`, jo livenä) — **älä
duplikoi peiliä**. Kaikki `typeof … === 'function'`-vartioituna kuten R1/R2-lisäykset.

**Datalähteet (KAIKKI aitoja, olemassa):**
- Konseptin osat (kpi a–e) + pelitilanne = `tm_teknistaktiset`. **⚠ KATA MOLEMMAT konseptityypit** — hae `p.jaksofokus.konsepti_avain`
  **sekä yksilön youth-konsepteista (`TM_TT_YOUTH`) ETTÄ pelipaikkakohtaisista (`TM_TT_FUNDAMENTIT`)**. Ne ovat
  **rakenteeltaan identtiset** (sama `kpi:[{koodi,teksti}]` + `kysymykset` + `pelitilanne`), joten render on yhtenäinen
  kummallekin. Esim. youth y_h1 = Haltuunotto (a–e) · pelipaikka mv_p1 = "Syvyyssijainti ja selustan hallinta" (a–d).
  **Käytä olemassa olevaa resoluutiota joka kattaa molemmat:** `tmTtItems(p)` palauttaa youth + aktiivisen pelipaikan
  fundamentit → etsi konsepti_avaimella; TAI iteroi `TM_TT_YOUTH` + `TM_TT_FUNDAMENTIT` (kuten `tmTtPelaaja` tekee, rivi 4865).
  **ÄLÄ rajoita youthiin** — jos jaksofokus on pelipaikkakonsepti, osat a–e tulevat FUNDAMENTIT-taulusta. Lib ladattu (`?v=5`).
- **Pelipaikka-konteksti hero-metaan** (kuten kartta: "…· laitahyökkääjä"): `p.tt_positio_aktiivinen || p.positio || p.pelipaikka`.
  Näytä pelipaikka konseptin rinnalla — se erottaa yksilö- vs pelipaikkakonseptin (§37 "yksilö- vs pelipaikkakonsepti erotettuna").
- Näkyvyysasteikko 1–3 = `TM_TT_ASTEIKKO` (1 "Ei näy pelissä" · 2 "Näkyy ohjatusti" · 3 "Näkyy itsenäisesti").
- Reflektio = konseptin `kysymykset[0]` (youth y_h1: "Minne ensimmäinen kosketuksesi vei pallon – ja miksi?" ·
  pelipaikka mv_p1: "Missä seisoit suhteessa linjaan – miksi?"). Toimii kummallekin konseptityypille.
- Cue (TEE TÄSTÄ / peili) = `tmTtPelaaja(avain)` (jo käytössä R1 pala 3b; hakee jo youth+pelipaikka).
- DVI = **`dvi_suunta`-pikakenttä** (§26; tm_idp.js). Silta-alkuperä = `tm_arviointi_silta` (arviointi→jaksofokus-ehdotus).

---

## RAKENNETTAVAT ELEMENTIT (v7 sanatarkasti)

**pala 1 — silta-alkuperä + konseptin osat + näkyvyys + reflektio:**

1. **↳ Miksi tämä · silta arvioinnista** (täydennä vajaa) — laatikko jaksofokus-heron alle:
   "Havaittu Arviointi-välilehdellä: haltuunotto 2/5 (🔵 havaittu, alle kynnyksen) → silta ehdotti konseptin." +
   ketju-chipit **[D2 haltuunotto 2/5] → [silta] → [HALTUUNOTTO]**. Lue silta-data `tm_arviointi_silta`:sta.
   **Honest-empty:** jos ei silta-alkuperää (konsepti asetettu käsin, ei arvioinnista) → "asetettu käsin" (älä keksi 2/5:tä).

2. **Konseptin osat · mitä katsotaan pelissä** — otsikko + selite "1 ei näy · 2 ohjatusti · 3 itsenäisesti", sitten
   rivit **a–e** konseptin `kpi`-taulusta (teksti). Jokaisella rivi näkyvyys-pisteet (●○○ / ●●○ / ●●●).
   **⚠ HONEST-EMPTY (tämän palan data-vartija):** per-osa-näkyvyyttä **ei ole tallennettu pelaajakohtaisesti** (ei kenttää;
   se kaapataan Kehityksessä R4). → näytä osat **ilman keksittyä arviota**: pisteet harmaana + "ei vielä arvioitu"
   (tai "arvioi Kehityksessä"). **ÄLÄ fabrikoi näkyvyystilaa.** Kun R4 tuo per-osa-arvion (pikakenttä), pisteet syttyvät.

3. **🗣 Reflektio** (amber-italic) — konseptin `kysymykset[0]`. Honest-empty jos konseptilla ei kysymyksiä.

**pala 2 — TEE TÄSTÄ + DVI + Konsepti %:**

4. **TEE TÄSTÄ -laatikko** — "seuraava askel" -osalla (matalin/ensimmäinen ei-itsenäinen osa; kun näkyvyys tyhjä →
   osa b oletuksena kuten v7): eyebrow "tee tästä" + Cue (`tmTtPelaaja(avain).cue`) + "N harjoitetta" +
   nappi **→ Viikko** (`_jspVaihda(4)`).

5. **DVI + Konsepti %** — pilli "DVI ↑ +0.4/kk" `dvi_suunta`-pikakentästä (+ suuruus jos tallennettu). **Honest-empty:**
   jos `dvi_suunta` puuttuu → jätä DVI-pilli pois (älä näytä nollaa). **"Konsepti %"**: näytä VAIN jos aito
   konsepti-edistymäkenttä on olemassa — **jos ei, jätä prosentti pois** (ÄLÄ käytä FLEI/Valmius-lukua tähän, se on eri asia).

---

## INVARIANTIT (EHDOTTOMAT)

**§4/§37 — MITÄÄN EI PAKOTETA, ASIANTUNTIJA PÄÄTTÄÄ (ydinperiaate tälle pinnalle):** TalentMaster **ehdottaa**,
VP + valmentaja **päättää / vahvistaa / muokkaa**. Kaikki mitä Aloitus näyttää (silta-alkuperä, moottorin ehdotus,
jaksofokus, konseptin osat) on **ehdotus, ei lukittu päätös** — ja kortti antaa **muokkaus-/vahvistus-/ohituspolut**:
- Framing: "silta **ehdotti** konseptin", "moottori **ehdottaa**" — ei "asetettu"/"lukittu". Ehdotus näkyy, ihminen päättää.
- Entry-pointit editoriin (varsinainen muokkaus on Kehitys R4, Aloitus surfaces sisääntulot): **"Kehitä jaksofokusta →"**
  (→ Kehitys-editori) · **"Aseta käsin"** (manuaalinen ohitus) · tyhjänä **"Ehdota fokus arvioinnista →"** / "Aseta käsin".
- **Vapaa muokkaus tavoitteissa + jaksofokuksessa:** kausitavoite ja jaksofokus ovat aina VP:n/valmentajan
  muokattavissa/vahvistettavissa/ohitettavissa (§37-roolit: valmentaja omilleen · VP talentit + oversight/override ·
  strateginen kausitavoite VP hyväksyy). Kortti EI saa esittää ehdotusta lopullisena eikä lukita sitä. Puuttuva kenttä =
  pehmeä vihje, EI esto (soft hint, never a save-block).
- Konseptin osat / näkyvyys ovat **luku + arviointi-sisääntulo** ("arvioi osat + editori Kehityksessä") — eivät automaattilukittuja.

§7.22 — näkyvyys 1–3 = **kehitystila** (ei näy/ohjatusti/itsenäisesti), **VP/valmentaja-näkymä**; pelaajan peili pysyy
cue-only (ei tasolukuja/vertailua) — peili on jo livenä, ei muuteta · §37 — curriculum-asteikko **1–3 ≠ arviointikehys 1–5**,
EI ristiin · §26 — pikakentät + lib-data ainoa lähde renderöinnissä, **ei alikokoelmakyselyjä** · §4b — cue `tmTtPelaaja`:sta ·
brändilukko §5 (Cormorant ei-bold · teal ainoa aksentti · amber vain reflektio/varoitus · `var(--border)`-hiusviivat,
EI `--border2` · semanttinen emoji 🎯🔭🗣⚽) · molemmat teemat.

**Data-eheys / honesty (tämän briefin ydin):** ÄLÄ fabrikoi mitään puuttuvaa. Per-osa-näkyvyys (ei kenttää → tyhjä
"arvioi Kehityksessä") · DVI (dvi_suunta puuttuu → pilli pois) · silta-alkuperä (ei arvioinnista → "asetettu käsin") ·
Konsepti % (ei aitoa kenttää → pois). Konseptilla jolla ei ole kpi-taulua (ei-tt-konsepti) → osat-osio pois (graceful).

## EI TÄSSÄ

Peilin muutos (jo livenä) · per-osa-näkyvyyden KAAPPAUS (= Kehitys R4, editori "arvioi osat") · Kehitys/Arviointi/Viikko-tabit.

## JAKO + DoD

**pala 1** (silta-origin + konseptin osat + näkyvyys-honest-empty + reflektio) · **pala 2** (TEE TÄSTÄ → Viikko + DVI + %).
Voi yhdistää yhteen PR:ään jos haluat. Per pala: additiivinen `_vpIdpNarratiiviHTML`:ään · reuse hero/peili · §7.22/§37/§26
pitävät · honest-empty todistettu (Topias + konsepti ilman kpi:tä + ei-dvi-pelaaja) · Vitest + eslint vihreä · molemmat teemat ·
**LIVE ennen valmista** (Topias — jaksofokus-konsepti + osat + rehellinen tyhjä näkyvyys). Ei lib-muutosta → ei `?v`-bumppia.
