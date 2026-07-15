# CODE — Jaksofokus-editorin uudistus (nelikulmamalli + linkitys + supervoima + pelaajan ääni)

**Tyyppi:** datamalli + UI. **Vaiheittain, kukin oma PR.** **Kohde:** `TalentMaster_VP_v25.html` (editori/kortti) + `lib/tm_jaksofokus.js` (domeeni/konseptit) + `TalentMaster_Pelaaja_v7.html` (pelaajan ääni -kytkentä).
**Ei osa 7→5-migraatiota** — tämä on oma feature.

**Design-totuus:** hyväksytty design-kartta *"Jaksofokus-editori — LOPULLINEN"* (toimitettu artifaktina `jaksofokus-editori-uudistus`). Tämä ohje tiivistää sen päätökset — ohje on itsenäinen.

**Periaate:** mitään ei pakoteta, asiantuntija päättää. Puuttuva kenttä = pehmeä vihje. **Pelaajan ääni on tärkeä** — jaksofokus tehdään pelaajan KANSSA, ei pelaajalle.

**Malli-fakta (tärkeä):** `p.jaksofokus` on YKSI aktiivinen objekti. `tmJfVaihtaaDomeenin(jf, uusiDomeeni)` arkistoi vanhan kun domeeni vaihtuu (`!==`) — toimii sellaisenaan useammalla domeeni-arvolla. "Muutama rinnakkain" toteutetaan **linkityksellä** (pääfokus + `linkitetyt[]`), EI useana aktiivisena slottina.

---

## VAIHE JF-1 — Nelikulmamalli + selkeys (oma PR)

**domeeni 2 → 4 arvoa.** Nykyiset `fyysinen` (D1) · `teknis_taktinen` (D2/D4). Lisää **`psyykkinen`** (D3 · Henkinen) · **`sosiaalinen`** (D5). Neljä = four-corner-malli, täsmää 5D-arviointiin.
- `_vpJfToggleHTML` / `window._vpJfDomeeni` → 4-tie-valinta (design: segmentti 🏃/⚽/🧠/🤝). Yleistä kommentin "fyysinen↔teknis_taktinen" → "mikä tahansa domeeni-vaihto".
- `tmJfVaihtaaDomeenin` toimii jo (`!==`) — ei muutosta logiikkaan, vain domeeni-arvojoukko + labelit.
- **Konseptikirjastot uusille alueille:** seed-setti yksilökonsepteja — Henkinen (esim. rohkeus, keskittyminen, tunteiden hallinta, pelin lukeminen) · Sosiaalinen (esim. johtajuus, kommunikaatio, joukkuepeli, ammattimaisuus). Data laajennettavissa ilman koodia (kuten muutkin konseptit).

**Yksilö- vs pelipaikkakonsepti selväksi.** Näkyvä toggle: *Yksilökonsepti* (Y-koodit, EI vaadi pelipaikkaa — ovat jo olemassa mutta piilossa) | *Pelipaikkakonsepti* (`TM_TT_PELIPAIKAT`, aktivoituu kun pelipaikka asetettu). Vihje kummastakin.

**Hyväksymiskriteeri:** editorissa 4 aluetta; henkisen/sosiaalisen konseptin voi asettaa; yksilökonsepti toimii ilman pelipaikkaa; domeeni-vaihto arkistoi vanhan (ei hukkaa). Molemmat teemat.

## VAIHE JF-2 — Linkitys + "Opittu kun" (oma PR)

**Linkitetyt konseptit yli alueiden.** `jaksofokus.linkitetyt = [{domeeni, konsepti_avain, konsepti_nimi}]` — **korkeintaan ~3**. Editorissa "＋ Linkitä konsepti" (mikä tahansa alue) + poisto. Esim. pääfokus *1v1 kuljettaminen (teknis-taktinen)* → linkitetty *rohkeus (henkinen)*. Kortti näyttää "pääfokus → tukena: linkitetyt". Additiivinen: tyhjä = kuten ennen.

**"Opittu kun" -onnistumiskriteeri.** `jaksofokus.onnistumiskriteeri` (vapaateksti/templaatti) — kv-akatemiakäytäntö: havaittava kriteeri, ei vain harjoite. Konseptin cue+harjoite-rivin jälkeen: "✓ Opittu kun: …". Kytke näkyvästi SMART-mittariin (sama tavoite, mitattava muoto).

**Hyväksymiskriteeri:** linkityksen voi lisätä/poistaa (max ~3), kortti näyttää pää + tuki; "Opittu kun" tallentuu ja renderöityy. Molemmat teemat.

## VAIHE JF-3 — Käsin-supervoima + pelaajan ääni → Pelaaja-app (oma PR)

**Supervoima käsin.** Uusi pelaajakenttä `vahvuus_manuaalinen` (vapaateksti). `_vpXFactorAse(p)` putoaa siihen kun automaattista (TKI/idpVahvinDim) ei ole. Editorissa "Supervoima"-osio: jos moottori ei tunnista → input "Aseta pelaajan vahvuus käsin". Asiantuntija tietää vahvuuden ennen dataa (periaate).

**Pelaajan ääni → Pelaaja-app.** Jaksofokus (pääfokus + linkitetyt + "Opittu kun") näkyy pelaajalle `TalentMaster_Pelaaja_v7.html`:ssä; pelaaja muotoilee tavoitteen **omin sanoin** ja **sitoutuu** (kaksivaiheinen sitoumus on jo olemassa). Uudet kentät (`linkitetyt`, `onnistumiskriteeri`, pelaajan omat sanat) read-näkyvinä pelaajalle. **Muistetaan: linkitys pelaaja-appiin** — sama jaksofokus, molemmat päät.

**Hyväksymiskriteeri:** ilman supervoimaa käsinsyöttö toimii ja näkyy kortilla "Erottava ase"; pelaaja näkee jaksofokuksen Pelaaja-appissa ja voi kirjata oman äänen + sitoutua. Molemmat teemat.

---

## REUNAEHDOT
- **Alaikäiset read-only** (Eino · Leo · Emil); **Topias = testi-OK**.
- **D3/D5 = kehityskonsepteja, EIVÄT kliinistä/terveystietoa** → ei GDPR Art. 9 -kysymystä. Älä tee niistä psyk-/kliinisiä muistiinpanoja; pidä konseptitasolla (rohkeus, johtajuus…).
- **Cache:** `lib/tm_jaksofokus.js` / konseptikirjasto muuttuu → bumppaa `?v=N` kaikissa lataavissa HTML:issä.
- **Firestore-säännöt:** uudet kentät (`jaksofokus.linkitetyt`, `jaksofokus.onnistumiskriteeri`, `vahvuus_manuaalinen`) — tarkista että jaksofokus/pelaaja-kirjoitusoikeus kattaa ne; jos tarvitaan sääntömuutos → PR → N4-CI.
- **Brändi:** DS-tokenit, molemmat teemat `data-theme`, Cormorant / DM Sans / DM Mono, terävät kulmat, hiusviivat.

## DoD (joka vaihe)
1. Renderöityy molemmissa teemoissa (screenshot molemmista).
2. Ei sisältö-/datahukkaa; olemassa olevat funktiot uudelleenkäytetään (`_jfOhjaa`, `_vpXFactorAse`, `tmJfVaihtaaDomeenin`, sitoumus).
3. Vitestit vihreinä; uusi logiikka testattu (erityisesti domeeni-vaihto-arkistointi 4 arvolla).
4. Pieni stackattu PR; kuvaus linkkaa design-karttaan + tähän ohjeeseen. **Verifioi live ennen mergeä.**
