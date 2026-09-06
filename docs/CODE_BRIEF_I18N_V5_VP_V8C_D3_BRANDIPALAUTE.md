# Code-brief — i18n V5 · VP_v25 **alaerä V8c: D3-kalibraatio + brändijako-palaute [4992–5059]**

> **Konteksti:** V3–V8b mainissa, live-verifioitu sv (Bio-banding ?v=30/31). Perit vahvan **AST-render-gaten** (per-occurrence · SETTER_FNS · ConditionalExpression · DISPLAY_PROPS · §0A · L.push · codeish · RANGES) **JA** **STAATTINEN-DOM-vartijan** (koko-body + onclick-toast).
> **Tämä erä on pääosin JOHDOTUSTA:** lähes kaikki sv-avaimet ovat **jo kartassa** (rivit 811–827, brief-prep) → Code **kääräisee render-literaalit `vpT()`:hen** niin että ne täsmäävät olemassa oleviin avaimiin. **Uusia avaimia täsmälleen 2** (brändi-header title + subtitle, ks. rivi 5030 alla — avain 820 ei täsmää kovakoodatun id:n takia).

## Scope
- **`_vpD3KalibraatioHTML(p)`** [4992–5011] — pelaajakortin Arviointi-välilehden D3-kalibraatiolohko (itse × valmentaja × VP): otsikko, varmuus-chip, Arvioi/Päivitä-nappi, Aukko-selite, E2-varoitus (Pel-sarake vanha), vertailu-slotti + tyhjätila.
- **`_vpBrandiPalaute(pid)`** [5021–5039] — §4 brändijako-palautemodaali: 3 pikakysymystä (Kyllä/Osittain/Ei), vapaa teksti, lähetä/peruuta.
- **`_vpBrandiPalauteTallenna(pid)`** [5045–5059] — tallennus + kiitos-toast.
**Yläraja-lukko:** loppuu **5059** (`window._vpBrandiPalauteTallenna` sulku). ÄLÄ mene `_vpArvReRender`@5061:een.

## ⚠ SCOPE-OUT (ÄLÄ koske tässä erässä)
- **`d3VarmuusChip(varmuus)`** ja **`renderD3VertailuHTML(pisteet)`** = **lib-funktioita** (`lib/tm_eerikkila_normit.js`@1305/1324), EIVÄT VP-html:ssä → render-gaten ULKOPUOLELLA. Ne renderöivät D3-vertailutaulukon (dimensiolabelit, Pel/Val/VP-sarakeotsikot) + varmuus-chipin. **Oma erä (V8c-lib / myöh.)** — jätä `_vpD3KalibraatioHTML`:ssä kutsut ennalleen (`d3VarmuusChip(p.d3_varmuus)`, `renderD3VertailuHTML(_d3pt)`), älä reititä niiden sisältöä. Merkitse jäljelle jääväksi.

## §0 (ENSIN) — gate-scope
1. **`RANGES += [4992, 5059]`** (render-gate rivi 39).
2. Ei uusia allowlist-termejä odotettavissa (D3/VP/TA ovat ABBR:ssä; TalentMaster/Scouting PRODUCT).

## §1 enum-raja (PYSYY — ÄLÄ reititä)
- `p.d3_taso`, `p.d3_varmuus`, `p.d3_viimeisin.*`, `pid` (data) · `dim`-argumentit (`_vpArvHyppaaDim`) · segmentin `data-val`-arvot (jos enum) · localStorage-avaimet (`tm_brandijako_palaute`) · Firestore-kentät (`aihe:'brandijako'`, `selkea/luottamus/sekoittaa`).
- **Tuotetermit verbatim:** `TalentMaster` · `Player Development Card` · `D3` · `PDC`.

## Näyttösitteet — KÄÄRI olemassa olevaan avaimeen (kopioi literaali kartasta TÄSMÄLLEEN)
| Rivi (~) | Literaali | Avain kartassa | Toimenpide |
|---|---|---|---|
| 4998 | `+ '<span style="…uppercase">🧠 D3-kalibraatio · itse × valmentaja × VP'` | **811** ✓ (koko `+ '…'`-literaali = avain) | `+ vpT('<span …uppercase">🧠 D3-kalibraatio · itse × valmentaja × VP')` |
| 5000 | `(_onVp ? 'Päivitä VP-arvio' : 'Arvioi (VP)')` | **812 / 813** ✓ | `(_onVp ? vpT('Päivitä VP-arvio') : vpT('Arvioi (VP)'))` |
| 5001 | `'<div style="…margin-bottom:8px">Aukko ≥1.5 = keskustelunaihe · varmuus-lippu…</div>'` | **814** ✓ | kääri koko div `vpT(…)` |
| 5006 | E2-varoitus `'<span …line-height:1.4"><b …>Pel-sarake: edellinen jakso.</b> …ajan tasalla.</span></div>'` | **815** ✓ | kääri koko span-literaali `vpT(…)` (sisältää `<b>`) |
| 5008 | tyhjätila (ternaarin else) `'<div style="…">Ei vielä D3-arvioita. VP-arvio aloittaa kalibraation.</div>'` | **816** ✓ | kääri `vpT(…)` |
| 5026 (q-helper) | segmentit `['Kyllä','Osittain','Ei'].map(v => … + v + …)` | **817/818** + `Ei`→Nej (common) ✓ | `.map(v => … + vpT(v) + …)` |
| 5024 (q-helper) | `q(id, teksti)` → `'<div …>' + teksti + '</div>'` | kysymykset **821/822/823** ✓ | **q():n sisällä** `… + vpT(teksti) + …` |
| **5030** ⚠ | brändi-header **koko-literaali (id kovakoodattu `_vpBrandiModal`)**: `'<div class="jsp-rv-hd">…<div class="jsp-rv-title">Palaute — brändijako</div><div class="jsp-kt-muted">📋 Palloliitto-kortti × ◆ TalentMaster-analytiikka</div>…×</button></div>'` | **avain 820 EI TÄSMÄÄ** (820 katkeaa interpoloidun modal-id:n kohdalla — se on toisen modaalin avain; 5030:ssä id on kovakoodattu → koko-literaali eri) | **ÄLÄ kääri koko 5030:tä.** Reititä **kaksi tekstipalaa erikseen** uusilla bare-avaimilla: `<div class="jsp-rv-title">' + vpT('Palaute — brändijako') + '</div>'` ja `<div class="jsp-kt-muted">' + vpT('📋 Palloliitto-kortti × ◆ TalentMaster-analytiikka') + '</div>'` (sv-arvot kopioi avaimesta 820 → **johdonmukaisuus**) |
| 5031–5033 | `q('_bpSelkea','Onko jako Palloliiton…selkeä?')` · `q('_bpLuottamus','Vahvistaako…')` · `q('_bpSekoita','Sekoittaako…')` | **821/822/823** ✓ | reitittyy q():n sisäisellä `vpT(teksti)`:llä (rivi 5024) |
| 5034 | textarea `'<textarea id="_bpVapaa" … placeholder="Vapaa palaute (valinnainen)…" …></textarea>'` | **824** ✓ | kääri koko textarea-literaali `vpT(…)` |
| 5035 | `…Tallenna(\'' + _jsvEsc(pid) + '\')">Lähetä palaute</button>'` — tail pid:n jälkeen `')">Lähetä palaute</button>` | **825** ✓ | kääri tail-literaali `vpT('\')">Lähetä palaute</button>')` (**HUOM:** bare `'Lähetä palaute'` EI resolvoidu — avain on tail-fragmentti; huomioi escapetus) |
| 5036 | Peruuta-nappi `'…remove()">Peruuta</button></div>'` | `Peruuta`→Avbryt (common) ✓ | reititä `vpT('Peruuta')` napin tekstille (irrota teksti literaalista) |
| 5058 | `toast('Kiitos palautteesta! 🙏', 'ok')` | **827** ✓ | `toast(vpT('Kiitos palautteesta! 🙏'), 'ok')` |

> **Kääri-täsmäys kriittinen:** whole-literal-avaimet (811/814/815/816/820/824/825) täsmäävät VAIN jos render-literaali on **merkki merkiltä** sama. Kopioi avain kartasta, älä kirjoita uudelleen. Jos joku ei täsmää → resolvi palauttaa fi:n (ei gate-flägiä, koska vpT-arg). **Verifioin resolvin erikseen.**

## 🔒 Kanoninen sv — **2 uutta bare-avainta, loput jo kartassa**
```
# UUDET (brändi-header, rivi 5030 — sv kopioitu avaimesta 820 → johdonmukaisuus)
Palaute — brändijako→Feedback — varumärkesuppdelning
📋 Palloliitto-kortti × ◆ TalentMaster-analytiikka→📋 Fotbollförbundets kort × ◆ TalentMaster-analys
```
Loput (811–827) kattavat kaiken muun. Segmentit: `Kyllä→Ja` · `Osittain→Delvis` · `Ei→Nej` · `Peruuta→Avbryt` (common). Jos jokin **koko-literaali ei täsmää** olemassa olevaan avaimeen (välilyönti/entiteetti/rakenne eroaa), **korjaa render-literaali täsmäämään avainta** — älä lisää rinnakkaista dup-avainta.

## ⚠⚠ PROJEKTITASON HAVAINTO (ei V8c-blokkeri — Teron päätös erikseen)
Kartta kääntää **VP-roolin epäjohdonmukaisesti: `TA` 30× vs `UA` 9×** (esim. 813 `Arvioi (VP)`→`Bedöm (TA)`, mutta 128 `Sinä (VP):`→`Du (UA):`). D3-avaimet käyttävät **TA**:ta (enemmistö). **V8c ei korjaa tätä** (avaimet resolvoituvat) — mutta koko VP:n sv-lopputila vaatii **yhtenäistämispäätöksen: TA vai UA?** Suositus: erillinen siivous-erä joka normalisoi kaikki 39 esiintymää valitulle termille. (Kysyn tämän erikseen.)

## Domain-invariantit
- **D3 = psyykkinen ulottuvuus** · kalibraatio itse × valmentaja × VP(→TA) · "Aukko ≥1.5 = keskustelunaihe" (ei kliininen mittari) — säilytä sävy.
- **Brändijako-palaute (§4):** 📋 Palloliitto-kortti (→Fotbollförbundets kort) × ◆ TalentMaster-analytiikka — havaintopsykologinen jako, pilotti-validointi. Säilytä kehys.
- Tallennus best-effort (localStorage + Firestore, ei rules-muutosta) — ennallaan.

## render-gate: DoD
1. `RANGES += [4992,5059]`.
2. Kaikki näyttö-fi kääritty olemassa oleviin avaimiin (täsmäys!) · q()-teksti + segmentit reititetty · toast reititetty.
3. **Portit (kaikki vihreä):** lint 0 · resolvi (kaikki käärityt R(k)!==k) · **C1 VP∩common=∅** · **sv-dup 0** (dup-check ENSIN — 811–827 jo olemassa, ÄLÄ dupcaa) · koko suite vihreä · inline-parse 0 · **AST-gate 5 vartijaa 0** · **STATIC-vartija 0** · `?v` **+1** (→32).

## Verifiointi (Claude, per commit)
1. AST-gate 5 vartijaa 0 · **riippumaton acorn-skanni [4992,5059]** → 0 aitoa · **resolvi-skanni: jokainen kääritty literaali R(k)!==k** (täsmäysvirheet nappaan tässä — vpT-arg piilottaa ne gatelta) · lint 0 · C1 ∅ · sv-dup 0.
2. **Live (demo sv) — PAKOLLINEN:** (a) pelaajakortti → Arviointi-välilehti → D3-lohko: otsikko "🧠 D3-kalibrering · själv × tränare × TA" · Arvioi/Päivitä-nappi sv · Aukko-selite sv · tyhjätila "Inga D3-bedömningar ännu…" (jos ei dataa). (b) Brändijako-palaute-modaali (jos avattavissa): title "Feedback — varumärkesuppdelning" · 3 kysymystä sv · Ja/Delvis/Nej-napit · placeholder "Fri feedback…" · Skicka feedback / Avbryt · lähetys → toast "Tack för feedbacken! 🙏". 0 näkyvää fi. **Scope-out näkyy:** D3-vertailutaulukko (renderD3VertailuHTML) + varmuus-chip voivat vielä olla fi → OK, merkitään V8c-lib.
3. Domain: D3-kehys · brändijako · TA/UA-havainto raportoitu.

## Seuraava
V8c 5 vartijaa 0 + resolvi-täsmäys → merge + live → **V8c-lib (renderD3VertailuHTML + d3VarmuusChip, lib/tm_eerikkila_normit.js)** TAI **V8d notif/benchmark** (`_notifAsetukset`@15154, `tkiBenchmarkPalkki`@16930, `kutsutaKalibraatioon`@17833) → V8e loput Työkalut → V7f VP-Koti → **koko VP sv (final)** + TA/UA-normalisointi.

> **Muistutus:** tämä erä = koko-literaali-vpT-JOHDOTUS. Gate-vihreä EI todista täsmäystä (fi vpT-argissa läpäisee gaten vaikka avain puuttuisi) → **resolvi-täsmäysskanni + live ovat oikea todiste.** Aja live ennen "valmis".
