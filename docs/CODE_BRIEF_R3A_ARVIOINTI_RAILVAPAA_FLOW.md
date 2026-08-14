# R3.A — Arviointi v4: rail-vapaa + flow-järjestys · Code-brief

> **Miksi:** DESIGN-LINJA: kaikki välilehdet karttoihinsa. Live-Arviointi on jo ~80 % v4-karttaa (kattavuus · silta ·
> legend · havaittu 1–5 · ADAR · D3-kalibraatio kaikki olemassa), mutta (1) pitää yhä profiilirailin (kartta rail-vapaa)
> ja (2) renderöi **silta ylimpänä**, kun kartta laittaa **kattavuuden ensin, sillan toiseksi**. Tämä vaihe = **pelkkä
> asettelu/järjestys + rail-vapaa** — arviointikoneistoa (autosave · `_jspTab5`-re-render · silta-handlerit) EI kosketa.
> **Kartta (SSOT):** `docs/idp_design/ARVIOINTI_KISS_design_kartta_v4.html`.
> **Luonne:** render-järjestys `_vpArviointiHTML`:ssä + yksi `_jspVaihda`-rivi. Ei uutta dataa, ei uutta laskentaa. Ei `?v`.
> **Verifiointi: LIVE** protokollan mukaan — **monta dataprofiilia** + poikkitaulukko.

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN, älä toteuta eri versiota yksin.** Reuse yli reimplementoinnin. **Älä keksi porttia/ehtoa.**
- **ÄLÄ koske arviointikoneistoon:** havaittu 1–5 -segmentit + autosave (klik-handlerit) · `_vpArvReRender` · silta-handlerit
  (`idpSilta`/`_jfOhjaa`) · kattavuus-klikki (`_vpArvHyppaaDim`) · kehys-vaihto. **Vain konkatenaation järjestys muuttuu.**

---

## MUUTOS 1 — rail-vapaa Arviointi (tab 2)

`_jspVaihda` togglaa nyt `.jsp-railvapaa` kun `n === 0 || n === 1`. **Laajenna tab 2:een:** `RAILIVAPAAT = Set([0,1,2])`
(tai lisää `|| n === 2`). CSS (`.jsp-grid.jsp-railvapaa`) on jo olemassa — ei muuteta. Tabit 3–4 (Kehitys/Viikko) rail säilyy.
**Perustelu:** tutkaa ei toisteta (se on Aloituksessa); v4-Arviointi on täysleveä, §28/Kypsyys ei kartassa. Kattavuus + silta
hyötyvät leveydestä.

## MUUTOS 2 — flow-järjestys `_vpArviointiHTML`:ssä (kartan mukaan)

**Nyt** (rivi ~4563): `let h = _d1Prio ? (_d1Silta + _d2Silta) : (_d2Silta + _d1Silta);` → **h alkaa sillalla**, sitten
otsikko → kehys-note → legend → kerros-body → **kattavuus** (~4629) → mitattu/havaittu/pelihavainto → D3-kalibraatio (~4707).

**Kartan järjestys:** otsikko → **kattavuus** → **silta** → arviointirivit → (ADAR) → D3-kalibraatio.

**Korjaus — järjestä uudelleen (älä seed:aa h:ta sillalla):**
1. `let h = '';` (ei enää silta ensin).
2. **otsikko** (kompakti eyebrow + serif "5D-arviointikehys" + mono-meta + brändi-tagi) — kuten nyt.
3. **kattavuuspalkki** (`jsp-arv-cov`, D1–D5, klikattava) — **nosta heti otsikon jälkeen** (kartan sektio 1).
4. **silta** (`_d1Silta`/`_d2Silta`, sama `_d1Prio`-järjestys) — **siirrä tähän, kattavuuden jälkeen** (kartan sektio 2).
   Silta-paneelit + niiden handlerit **täysin ennallaan** — vain sijainti konkatenaatiossa muuttuu.
5. **legend + kehys-note + kerros-body** — arviointirivien konteksti (legend selittää 🟢🔵👁 → pidä ryhmien EDELLÄ).
6. **arviointiryhmät** (🟢 Mitattu · 🔵 Havaittu 1–5 · 👁 Pelihavainnosta) — ennallaan (handlerit + autosave koskematta).
7. **D3-kalibraatio** (`_vpD3KalibraatioHTML`) — ennallaan, viimeisenä (kartan sektio 5).

> Käytännössä: siirrä `h`:n alkuseed (silta) alaspäin kattavuuden jälkeen, ja nosta kattavuus otsikon jälkeen. Kaikki
> lohkot ovat jo olemassa — vain `h +=` -kutsujen JÄRJESTYS muuttuu. Ei sisältö-/handler-muutoksia.

---

## EI TÄSSÄ (Vaihe B / myöhemmin)
D4 ADAR 4-osan (Havaitse·Päätä·Toimi·Arvioi) esiinnosto Arviointiin = **Vaihe B** (additiivinen, erillinen brief).
Arviointikoneiston logiikka · kehys-vaihto · silta-logiikka · uudet kentät.

## INVARIANTIT + DoD
- **§37:** arviointikehys 1–5 ≠ curriculum 1–3 · roolit (valmentaja/VP) ennallaan. **§7.22** aikuisnäkymä. **§26** pikakentät.
- **Ei datahukkaa / ei toiminnallista regressiota:** havaittu 1–5 autosave · silta-ehdotukset (✎ muokkaa) · kattavuus-klikki ·
  D3-kalibraatio · kehys-vaihto **toimivat täsmälleen kuten ennen**. Vain visuaalinen järjestys + rail muuttuu.
- **Brändi §5** · molemmat teemat · mobiili pinoutuu.
- **LIVE ennen valmista (protokolla — monta profiilia):**
  - **Täysi** pelaaja (arvioita monessa dim) → järjestys otsikko→kattavuus→silta→ryhmät→kalibraatio · rail pois.
  - **Vajaa** pelaaja (vähän arvioita / aukkoja) → kattavuus näyttää aukot, silta honest-empty jos ei ehdotusta, ei kaadu.
  - **Tyhjä** pelaaja (ei arvioita) → rehellinen tyhjä, ei kaadu.
  - **Toiminnallinen:** klikkaa havaittu 1–5 → autosave toimii · silta ✎ muokkaa → toimii · kattavuus-solu klik → hyppää dim.
  - **Poikkitaulukko:** vaihto Kehitykseen → rail palaa; takaisin Arviointiin → rail pois. Molemmat teemat. Vitest + eslint vihreä.
