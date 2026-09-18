# Code-brief — i18n V5 · VP_v25 **LOPPU-ROADMAP: koko VP → sv (final)**

> **Tila (main ?v=32):** V3–V8c + Bio-banding + VP-rooli-yhtenäistys (Fotbollsutvecklare/FU) + Post-PHV mainissa, kaikki live-verifioitu sv. Peritty **AST-render-gate** (`tests/idp_i18n_v5_vp_render_dom.test.js`) + **STAATTINEN-DOM-vartija** (`…_static_dom.test.js`).
> **Tämä on sulkeva suunnitelma:** loput VP-näyttöpinnat (~490+ literaalia) jäljellä. **Toteuta alaeräerä kerrallaan** — jokainen: implementoi → Claude verifioi (portit + resolvi + riippumaton skanni + **pakollinen live**) → merge → live. ÄLÄ niputa kaikkea yhteen (live-check pysyttävä hallittavana). Lopuksi **gate-lukitus koko VP:lle**.

---

## Peritty gate + verifiointiprotokolla (pätee JOKAISEEN erään)
- `RANGES += [alku, loppu]` (render-gate rivi 39) per erä · `SETTER_FNS`/`PRODUCT`/`DISPLAY_PROPS` lisäykset tarpeen mukaan.
- **Portit:** lint 0 · resolvi (uudet R(k)!==k) · **C1 VP∩common=∅** · **sv-dup 0** (dup-check ENNEN) · suite vihreä (huom: `firestore.rules` failaa aina emulaattorin puutteesta — ympäristö, EI regressio) · AST-gate 5 vartijaa 0 · STATIC-vartija 0 · `?v`+1.
- **Gate-sokeat luokat (kaikki jo koettu — varo):** ① object-property/map-value-näyttö (reititä render-sitellä, ÄLÄ lisää yleisiä prop-nimiä DISPLAY_PROPSiin) · ② `title=`/`placeholder=` **JS-stringin sisällä** (render-gate näkee vain `>text<`) → **riippumaton `title="`-skanni pakollinen** · ③ ternaari→var→markkup (reititä fragmentti ternaarissa) · ④ konkatenaatio-suffiksi (`+ ' fi'`) · ⑤ **koko-literaali-vpT-täsmäys** (fi vpT-argissa läpäisee gaten VAIKKA avain puuttuisi → **resolvi-täsmäysskanni**) · ⑥ inline-`onclick`-`toast('fi')` (STATIC-vartija nappaa body-alueella) · ⑦ staattinen kuori ilman data-i18n.
- **"Gate-vihreä EI riitä."** Live (demo sv, oikea näkymä) on lopullinen todiste joka erässä.
- **VP-rooli-lukko:** VP-lyhenne → **FU** · Valmennuspäällikkö (koko) → **Fotbollsutvecklare** (nom/def *fotbollsutvecklaren*/gen *Fotbollsutvecklarens*/versaali *FOTBOLLSUTVECKLARE*). **Tuotetermit verbatim:** X-Factor · Hidden Gem · Underdog · Scouting · TALENTMASTER · Head of Talent · RAE · Cue · D1–D5 · PHV · Pre-/Circa-/Post-PHV · Benchmark · KORI · Fotbollförbundet(Palloliitto). **Q1–Q4 · enum-avaimet (Firestore/vertailut) pysyvät fi.**

---

## Alaeräerät (suositeltu järjestys: pieni→iso)

### V8d — Notif-asetukset + Benchmark + Kalibraatiokutsu  *(pieni, ~100 lit.)*
- **`_notifAsetukset`** @15154–~15230 (`window._notifAsetukset = async function`) — ilmoitusasetukset-modaali. HUOM summaryn mukaan yksi nappi jo vpT'd@15169 → tarkista, reititä loput. **Luokat:** modaalikuori (>text<), mahd. toggle-labelit (object-property?), toast.
- **`tkiBenchmarkPalkki(tkiKa, ikaluokka)`** @16930–~17010 — TKI-benchmark-palkki. **Luokat:** vertailulabelit, ikäluokka-token (enum? tarkista), mahd. `title=`.
- **`kutsutaKalibraatioon()`** @17833 — `toast("Kalibraatiokutsu lähetetty","ok")` → `toast(vpT('Kalibraatiokutsu lähetetty'),'ok')`. Myös nappi @17817 `>Mentoroi →<` (jos VP-render-alueella).
- `RANGES += [15154,15230],[16930,17010],[17817,17833]`. **Live:** 🔔-asetukset auki · benchmark-näkymä · kutsu-toast.

### V8e-JF — Jaksofokus-workspace  *(ISOIN, ~230 lit. → jaa 2–3 osaan)*
> Jaksofokus = ydinominaisuus (meso 4–8 vk fokus + domeeni). Katso `talentmaster-domain`-skill (jaksofokus/domeeni/§37).
- **V8e-JF1** `renderJaksofokus()` @6887–~7550 (workspace-render: KPI-nauha, klusterit, ohjaus-napit). ~168 lit.
- **V8e-JF2** `_vpTyopoytaJaksofokusHTML(p)` @5601–~5843 + `_vpAloitusJaksofokusHTML(p)` @5844–~6880 (pelaajakortin JF-työpöytä + aloitus/ohjausmodaali). ~62+ lit.
- **Luokat (kaikki läsnä):** object-property (konsepti/teema-labelit), ternaari→var, konkatenaatio (' pelaajaa'/' vk'), `title=` JS-stringissä, mahd. koko-literaali-avaimet brief-prepistä (resolvi-täsmäys!). **Enum:** `domeeni`, `konsepti_avain`, `p.jaksofokus.*`-kentät pysyvät fi.
- `RANGES += [6887,7550]` (JF1), `[5601,6880]` (JF2 — tarkista tarkat ylärajat funktioiden `window.=`/sulku-kohdista). **Live:** sivupalkki → Jaksofokus-workspace + pelaajakortti-JF-välilehti + ohjausmodaali.

### V8e-tools — Ohjelmakirjasto + Harjoitusarviointi  *'�base64: invalid input
