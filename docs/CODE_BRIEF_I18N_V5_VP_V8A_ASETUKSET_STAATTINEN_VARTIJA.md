# Code-brief — i18n V5 · VP_v25 **alaerä V8a: Asetukset-workspace + STAATTINEN-DOM-vartija**

> **Konteksti:** V3–V7e mainissa, live-verifioitu sv (rap-shell ?v=29 vahvistettu — `rawFiLeft: {}`). Perit vahvan **AST-render-gaten**: per-occurrence · MEMBER_DISPLAY · `.textContent`/0B · resolves · `SETTER_FNS={toast,_setTxt,_dSet,idrow,kpi,fp,set,sel,tier,act}` · ConditionalExpression-kävely · DISPLAY_PROPS={teksti} · §0A PRODUCT-koko-literaali · L.push-tekstiraportti · codeish rgba/BEM/handler.
> **Kova opetus — nyt gate-tasolla:** *"gate-vihreä EI riitä"* koska **AST-gate skannaa vain `<script>`-render-koodia — se ei koskaan näe staattista HTML-kuorta.** Juuri tämä sokea piste vuoti V7e:ssä 3 staattista labelia (2505/2523/2535 ilman `data-i18n`). **V8a rakentaa uuden STAATTINEN-DOM-skannerin** joka nappaa tämän luokan CI:ssä — ja reitittää Asetukset-workspacen. **Vartija landaa ENSIN** koska jokainen myöhempi V8-erä (Bio-banding-modaali, D3-kalibraatio, notif/benchmark) kantaa staattista kuorta jolle nykyinen gate on sokea.

---

## Scope (kaksi osaa)

### Osa A — STAATTINEN-DOM-vartija (gaten kovennus, ENSIN)
Uusi skanneri (samaan tiedostoon `tests/idp_i18n_v5_vp_render_dom.test.js` **tai** rinnakkainen `tests/idp_i18n_v5_vp_static_dom.test.js` — valitse; suosittelen **rinnakkainen tiedosto** selkeyden vuoksi, jakaa allowlistin `require`-importilla jos mahdollista, muuten duplikoi PRODUCT/ABBR/LIB).
Skanneri lukee **raa'an HTML:n `<script>`-lohkojen ULKOPUOLELTA** (staattinen kuori) rajatuilla `STATIC_RANGES`-alueilla ja failaa jos löytää **reitittämättömän fi-näyttötekstin joka EI kanna `data-i18n*`-attribuuttia**.

### Osa B — Asetukset-workspace sv (`ws-asetukset` [2631–2656])
Reititä/merkitse Asetukset-näkymän staattinen kuori + placeholder-toastit sv:ksi, ja **lisää `STATIC_RANGES`:iin** (osa A todistaa sen puhtaaksi).

---

## §0 (KRIITTINEN, ENSIN) — STAATTINEN-DOM-vartijan spesifikaatio

**Miksi:** nykyinen runtime-lokalisointi `vpLokalisoi(root)` (lib/tm_vp_i18n.js@2705 → jaettu sweep tm_i18n_common.js, kattaa `data-i18n` / `-ph` / `-title` / `-html`) lokalisoi VAIN elementit joilla ON `data-i18n*`. Elementti ilman attribuuttia jää fi:ksi — eikä AST-gate näe sitä (se on `<script>`-ulkopuolista markkupia). **Uusi skanneri sulkee raon.**

**Skannerin logiikka (STATIC_RANGES-alueilla):**
1. Lue tiedosto tekstinä. **Poissulje `<script>…</script>`-lohkojen sisältö** (ne kuuluvat AST-gatelle) — maskaa ne ennen skannausta.
2. Kohteet per alue:
   - **Tekstisolmut** `>TEKSTI<` (tag-ulkoinen näyttöteksti).
   - **`title="…"`** ja **`placeholder="…"`** -attribuuttien arvot.
   - **`on*`-attribuuttien (esim. `onclick`) sisällä olevat display-helper-fi-argumentit** — nimenomaan `toast('…fi…', …)` -luokka (V8a-Asetukset: 4 placeholder-toastia inline-onclickissä joita AST-gate EI näe, koska ne ovat HTML-attribuutteja eivät `<script>`-koodia). Nappaa string-literaali `toast(`-kutsun 1. argumentista.
3. **Fi-näyttö = flag JOS:**
   - solmulla/attribuutilla EI ole vastaavaa `data-i18n` / `data-i18n-title` / `data-i18n-ph` -attribuuttia samassa elementissä (tekstisolmu → `data-i18n`; `title=` → `data-i18n-title`; `placeholder=` → `data-i18n-ph`), **JA**
   - teksti läpäisee `hasWord(stripAllow(t))` (peritty: ≥3 kirjainta, ei pelkkä ABBR/PRODUCT/numero/välimerkki), **JA**
   - ei `isLib(t)` (§7 lib-curriculum-nimet).
   - `on*`-toast-arg → flag jos `hasWord(stripAllow(arg))` (ei attribuuttivaadetta — toast-arg on aina näyttöä).
4. **Allowlist (jaettu AST-gaten kanssa):** `PRODUCT` (X-Factor · Hidden Gem · Underdog · Scouting · TALENTMASTER · Head of Talent · RAE · **Benchmark** · **KORI** · Q1–Q4 · D1–D5 · Cue · …), `ABBR`, `LIB`. **Lisää `Benchmark` ja `KORI` PRODUCT/ABBR-allowlistiin** (verbatim-termejä — ident sv).

**STATIC_RANGES (alku — kasvaa erä erältä, kuten AST-RANGES):**
```js
const STATIC_RANGES = [
  [2631, 2656],   // V8a: ws-asetukset-kuori
  [2500, 2540],   // V7e retro: rap-section staattinen kuori (2505 subtitle · 2521-2524 KPI · 2535 send-btn — jo korjattu 911a192; vartija lukitsee ne)
];
```
> **Rajaus tärkeä:** älä skannaa koko tiedostoa — vain `STATIC_RANGES`. Kääntämättömät alueet (coach-näkymät, ei-vielä-sv chrome) EIVÄT saa failata. Alue lisätään vasta kun se on sv-täydellinen (sama disipliini kuin AST-RANGES).

**Ei-vacuous -testi (pakollinen, kuten AST-gatessa):** synteettinen HTML-pätkä
```
'<div class="c"><h3>Raakaotsikko</h3><p data-i18n="X">ok</p>'
+ '<span onclick="toast(\'Raaka toast\',\'ok\')">z</span>'
+ '<input placeholder="Raaka ph">'
```
→ skanneri failaa: `Raakaotsikko` (ei data-i18n), `Raaka toast` (toast-arg), `Raaka ph` (ei data-i18n-ph); EI flagaa `ok` (on data-i18n) eikä `X`/`z`. Aja detektori tällä varmistaaksesi että se todella nappaa.

**Negatiivi:** `<h3 data-i18n="Kriteeristö">Kriteeristö</h3>` → ei flagia. `<h3>Benchmark</h3>` → ei flagia (allowlist).

---

## Osa B — Asetukset-workspace: vuodot ja korjaukset

`ws-asetukset` [2631–2656]. Nykytila: page-title/page-sub + useimmat settings-cardit kantavat `data-i18n`, MUTTA (a) sv-avaimet todennäköisesti **puuttuvat kartasta** (Asetukset ei koskaan reititetty → runtime näyttää fi vaikka attribuutti on), ja (b) **6 varsinaista vuotoa** joilta attribuutti/reititys puuttuu:

| # | Rivi | Vuoto | Luokka | Korjaus |
|---|---|---|---|---|
| 1 | 2635 | `onclick="toast('Metodologia-näkymä — tulossa','ok')"` | inline-toast (AST-sokea) | `toast(vpT('Metodologia-näkymä — tulossa'),'ok')` |
| 2 | 2639 | `onclick="toast('Kalibraatio — tulossa','ok')"` | inline-toast | `toast(vpT('Kalibraatio — tulossa'),'ok')` |
| 3 | 2643 | `onclick="toast('Kriteeristö — tulossa','ok')"` | inline-toast | `toast(vpT('Kriteeristö — tulossa'),'ok')` |
| 4 | 2647 | `onclick="toast('Benchmark — tulossa','ok')"` | inline-toast | `toast(vpT('Benchmark — tulossa'),'ok')` |
| 5 | 2645 | `<p>IDP-hyväksyntäkriteerit, X-Factor- ja Hidden Gem -kynnysarvot.</p>` | staattinen ilman data-i18n | lisää `data-i18n="IDP-hyväksyntäkriteerit, X-Factor- ja Hidden Gem -kynnysarvot."` |
| 6 | 2648 | `<h3>Benchmark</h3>` | staattinen ilman data-i18n | **allowlist** (verbatim) — ei muutosta elementtiin; varmista vartija ei flagaa |

**Lisäksi:** varmista että KAIKKI `ws-asetukset`-lohkon jo-olemassa-olevat `data-i18n*`-avaimet **resolvoituvat** sv-karttaan (muuten fi jää näkyviin). Ne on lueteltu kanonisessa sv:ssä alla — lisää puuttuvat.

---

## §1 enum-raja (PYSYY — ÄLÄ reititä)
- **Tuotetermit verbatim:** `Benchmark` · `KORI` · `X-Factor` · `Hidden Gem` · `Palloliitto`(⚠ ks. alla) · `Eerikkilä` (erisnimi).
- `data-ws`-arvot (`asetukset`), `data-filter`, `data-i18n`-**avaimen** fi-teksti (avain pysyy fi, kartta antaa sv:n) — normaali i18n-mekanismi, ei kosketa.
- `setWs('asetukset')` -argumentti = enum, fi-token pysyy.

---

## 🔒 Kanoninen sv (⚠ = vahvista Terolta; [K]-kartta voittaa — **dup-check ENSIN**, C1 VP∩common=∅)
```
# Kuori (data-i18n — lisää puuttuvat avaimet karttaan)
Asetukset→Inställningar
Metodologia · kalibraatio · kriteeristö · benchmark→Metodologi · kalibrering · kriterier · benchmark
Metodologia→Metodologi
5D-viitekehys, Kehon valmius -laskenta, Pelihavainto-protokolla ja ikävaihekuvaukset.→5D-referensram, kroppsberedskapsberäkning, spelobservationsprotokoll och åldersfasbeskrivningar.
Kalibraatio→Kalibrering
Eerikkilä-normit, PHV-korjaukset, RAE-kalibrointi ikäluokittain.→Eerikkilä-normer, PHV-korrigeringar, RAE-kalibrering per åldersklass.
Kriteeristö→Kriterier
IDP-hyväksyntäkriteerit, X-Factor- ja Hidden Gem -kynnysarvot.→IDP-godkännandekriterier, X-Factor- och Hidden Gem-tröskelvärden.
Palloliiton KORI-vertailu, kansainväliset vertailutasot.→Palloliittos KORI-jämförelse, internationella jämförelsenivåer.   ⚠ Palloliitto verbatim (erisnimi) — vahvista genitiivi "Palloliittos" vai "Palloliiton"
📘 Aloitusopas→📘 Startguide
Näytä "Aloita tästä" -opas uudelleen Koti-näkymässä.→Visa "Börja här"-guiden igen i Hem-vyn.
# Placeholder-toastit (reititetyt)
Metodologia-näkymä — tulossa→Metodologivy — kommer snart
Kalibraatio — tulossa→Kalibrering — kommer snart
Kriteeristö — tulossa→Kriterier — kommer snart
Benchmark — tulossa→Benchmark — kommer snart
```
**Konsistenssi-lukot:** `Aloita tästä`→`Börja här` (= sidebar-nappi, käytä samaa avainta) · `Koti`→`Hem` (VP-Koti = V7f, pidä yhdenmukaisena) · `Benchmark`/`KORI` verbatim.

---

## render-gate + STATIC-vartija: DoD
1. **Osa A ensin:** STATIC-DOM-skanneri toteutettu + **ei-vacuous-testi vihreä** (nappaa synteettisen vuodon) + `STATIC_RANGES=[[2631,2656],[2500,2540]]`.
2. **Osa B:** 6 vuotoa korjattu · puuttuvat data-i18n-avaimet kartassa · `Benchmark`/`KORI` allowlistissa.
3. **Portit (kaikki vihreä):** lint 0 · resolvi uusille avaimille (`R(k)!==k`) · **C1 VP∩common=∅** · **sv-dup 0** (dup-check ENNEN lisäystä) · koko suite vihreä · inline-parse 0 · **AST-gate 5 vartijaa 0** · **STATIC-vartija 0** · `lib/tm_vp_i18n.js?v=` **+1** (nykyinen v=28 mainissa; fix2-haaralla v=29 — käytä **ensimmäistä vapaata**, älä törmää).

---

## Verifiointi (Claude, per commit)
1. STATIC-vartija: ei-vacuous todistettu · `STATIC_RANGES` skannaa Asetukset+rap-kuoren → 0 · **riippumaton skanni** raa'asta HTML:stä [2631,2657] (tekstisolmut + title/placeholder + inline-toast) → 0 aitoa (pl. allowlist).
2. AST-gate 5 vartijaa 0 · lint 0 · C1 ∅ · resolvi · sv-dup 0.
3. **Live (demo sv) — PAKOLLINEN:** avaa **Asetukset** (sivupalkin ⚙) → page-title "Inställningar", page-sub sv, 5 korttia sv (Metodologi/Kalibrering/Kriterier/Benchmark/📘 Startguide) + kortti-`<p>`:t sv (Kriteeristö-`<p>` ei enää fi). **Klikkaa jokaista neljää "— tulossa" -korttia** → toast sv ("… — kommer snart"). Bio-banding-nappi (sidebar) EI vielä sv → **V8b** (älä koske).
4. Enum ehjä: `setWs('asetukset')` toimii · teema/kirjautuminen ennallaan.

---

## V8-klusterin kartta (tie koko VP → sv, viimeistely)
| Erä | Scope | Live-pinta |
|---|---|---|
| **V8a** (tämä) | Asetukset-workspace + **STATIC-DOM-vartija** | Asetukset-näkymä + 4 toastia |
| **V8b** | Bio-banding-työkalu (`avaaBioBanding`@4175–4249) — KAISTAT nimi/selite, `phvNimi`, "Bio-banding — kehitysvaihe", "Ryhmittely biologisen kypsyyden…", "pelaajaa", "ilman PHV-dataa — tee kasvumittaus…", Poikkeuslupa, cm/v (nopea/hidas), metodologia-footer | sidebar → Bio-banding-modaali |
| **V8c** | D3-kalibraatio (`_vpD3KalibraatioHTML`@4992) + brändijako-palaute (`_vpBrandiPalaute`) — modaalikuori, Kyllä/Osittain/Ei, kysymykset | pelaajakortti → Arviointi-tab / palaute-modaali |
| **V8d** | notif-asetukset (`_notifAsetukset`@15154) + benchmark-palkki (`tkiBenchmarkPalkki`@16930) + kalibraatiokutsu (`kutsutaKalibraatioon`@17833) | 🔔-asetukset + benchmark |
| **V8e** | Loput Työkalut-tools: Arvioi harjoitus (`vpAvaaHarjoitusarviointi`) · Pelihavainto (`avaaAdarKenttatyokalu`) · Jaksofokus (ws) · Ohjelmakirjasto (`_vpOhjKirjastoModal`) — *tarkista onko jokin jo tehty aiemmissa eristä* | kukin sidebar-työkalu |
| **V7f** (rinnalla) | VP-Koti (`renderKotiVP`@15983, `vpMuistutaOdottavia`, `renderVpAloitaKortti`@16077) | Koti-näkymä |
> Kun V8a–V8e + V7f valmis → **gate koko VP = sv (final)**: laajenna sekä AST-RANGES että STATIC_RANGES kattamaan koko VP-render + koko staattinen kuori, aja live läpi kaikki näkymät.

> **Muistutus:** näyttöteksti vuotaa monta epäsuoraa reittiä. V8a:n uusi luokka = **staattinen kuori + inline-onclick-toast** — AST-gate on niille rakenteellisesti sokea. STATIC-vartija sulkee sen; **live nappaa loput.** Aja live ennen "valmis".
