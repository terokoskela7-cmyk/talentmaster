# CODE_OHJE — Korjaukset: D2-taso, PELIÄLY-skaala, pelihavainnon tallennus

**Tyyppi:** bugikorjaus (3 kohtaa) · **Kohteet:** `TalentMaster_VP_v25.html`, `TalentMaster_Pelaaja_v7.html`,
pelihavainto-/ADAR-tallennus · **Base:** `main`.
**Löydetty:** Topias Koskela (KPV U13) -profiilin verifioinnissa.

## Bug A — D2 Tekninen näyttää 1.7/5 vaikka per-laji-tasot ovat 2/5/4/5 (d2_taso=4)

**Juurisyy** (`TalentMaster_VP_v25.html`, `laskeD2Taso(p)` ~rivi 13134):
```js
function laskeD2Taso(p) {
  if (p.tki_viimeisin != null) return Math.round((p.tki_viimeisin / 20) * 10) / 10;  // 34/20 = 1.7
  if (p.d2_taso != null) return p.d2_taso;                                            // 4 — jää käyttämättä
  return null;
}
```
TKI (kokonaisaikaindeksi 0–99) priorisoidaan yli tallennetun `d2_taso`:n. Topiaksella TKI=34
(kokonaisaika 107.3 s > U13 pronssi-raja 100 s → indeksi matala), mutta per-laji-tasot 2/5/4/5
(ka `d2_taso`=4) — nämä ovat valmentajan näkemä totuus. Lineaarinen TKI/20 ei vastaa per-laji-asteikkoa
→ ristiriitainen luku (1.7) heti per-laji-erittelyn yläpuolella.

**Korjaus (suositus, VAHVISTA Terolta):** D2-taso johdetaan per-laji-tasoista (`d2_taso`), EI lineaarisesta
TKI/20:sta. Vaihda prioriteetti:
```js
function laskeD2Taso(p) {
  if (p.d2_taso != null) return p.d2_taso;               // per-laji Eerikkilä-ka (kanoninen D2)
  if (p.tki_viimeisin != null) return Math.round((p.tki_viimeisin / 20) * 10) / 10;  // fallback jos d2_taso puuttuu
  return null;
}
```
TKI (34) näkyy edelleen omana indeksinään ("Kehitä: Syöttö") — sitä ei poisteta, se vain ei enää määrää D2:ta.

**⚠️ Reunavaikutus:** `laskeD2Taso` on käytössä myös `laskeHiddenGem`:issä (D2≥3.5-kynnys) ja muualla —
Topiaksen D2 nousee 1.7→4, mikä voi muuttaa Hidden Gem -luokitusta. **Verifioi että talent-signaalit
(Hidden Gem / X-Factor) käyttäytyvät järkevästi muutoksen jälkeen** (L3). Tämä on syy vahvistaa Terolta
ennen mergeä.

## Bug B — PELIÄLY 2.8/12 (skaala 4× pielessä)

**Juurisyy:** `adar_viimeisin.yht` on kanonisesti **keskiarvo (max 3)**, ei summa (max 12).
Kirjoittaja (`TalentMaster_Master_v16.html`, `paivitaAdarPikakentat` ~rivi 9282):
```js
const yht = dims.length ? Math.round((dims.reduce((s,x)=>s+x,0) / dims.length) * 10) / 10 : null;  // KESKIARVO 1–3
```
Topias {a:3,d:2,ac:3,r:3} → ka 2.75 → **yht=2.8** (oikein, kanoni "ADAR 1–3-kaanon, keskiarvo").
`_dimNorm5Adar(yht)` VP:ssä käyttää **oikein** `yht/3*5`. Mutta kaksi paikkaa tulkitsee yht:n summaksi /12:

1. **VP PELIÄLY-otsikko** näyttää `{yht}/12` → "2.8/12" (väärä nimittäjä).
2. **Pelaaja FUT-kortti** (`TalentMaster_Pelaaja_v7.html`, `_fcKorttiData` ÄLY-dim): `Math.round((ad.yht/12)*99)`
   → 2.8/12*99 = 23 (pitäisi olla 2.8/3*99 = 92). Aliarvioi ÄLY:n rajusti joka kortilla.

**Korjaus:** yht on aina **/3-asteikko** (keskiarvo). Korjaa kaikki `yht/12`- ja `/12`-viittaukset:
- VP PELIÄLY-otsikko: näytä joko **summa** laskettuna dimeistä (`a+d+ac+r` → "11/12", vastaa alarivien X/3-esitystä)
  TAI keskiarvo "2.8/3". Suositus: **summa /12** (koska 4 alariviä näkyy /3 → luonteva /12-yhteissumma).
- Pelaaja `_fcKorttiData` ÄLY: `Math.round((ad.yht / 3) * 99)` (ei /12). Sama suhde kuin `_dimNorm5Adar`.
- **Auditoi kaikki `yht`-käytöt** — mikä tahansa `/12` tai `*99/12` adar-yhteydessä on väärä; kanoni = `/3`.
  (`_dimNorm5Adar` = oikea referenssikuvio.)

Huom: summa/12 ja keskiarvo/3 ovat SAMA suhde (11/12 = 2.75/3) → FUT-normalisointi `yht/3*99` on oikea
riippumatta siitä näytetäänkö otsikossa summa vai keskiarvo.

## Bug C — "Narratiivi tarvitaan" vaikka teksti oli kentässä → EI koodivirhe, vaan 20 merkin minimiportti

**PAIKANNETTU LÄHDEKOODISTA** (`TalentMaster_ADAR_Pikakortti.html`, `async function saveCard(level)`):
```js
narratiivi: document.getElementById(tier + '-narr')?.value || '',   // ← lukee ELÄVÄN textarean, oikein
...
// Validoi narratiivi Taso 2 ja 3
if (level >= 2 && (!data.narratiivi || data.narratiivi.trim().length < 20)) {
  btn.textContent = '⚠ Narratiivi vaaditaan (min. 20 merkkiä)';
  btn.style.background = 'rgba(138,43,43,.4)';
  setTimeout(() => { btn.textContent = 'Tallenna havainto → Firestoreen'; btn.style.background = ''; }, 3000);
  return;
}
```

**Todellinen juurisyy:** Tasolla 2–3 narratiivilla on **tarkoituksellinen 20 merkin minimi**. Tero kirjoitti
"Testi" (5 merkkiä) → `trim().length` = 5 < 20 → tallennus estyi **oikein**. Narratiivin luku on kunnossa
(elävä textarea `tN-narr`), Firestore-write ja Rules ovat kunnossa (Topiaksella 5 aiempaa havaintoa) — **mitään
rikki ei ole.** Aiemmat hypoteesit (vanhentunut state / väärä selektori / postMessage-payload) **kumottu**.

**Miksi tuntui bugilta:** ainoa palaute on Tallenna-napin teksti joka vaihtuu 3 s ajaksi muotoon
"⚠ Narratiivi vaaditaan (min. 20 merkkiä)" ja palautuu. Ei inline-viestiä narratiivikentän vieressä, ei
merkkilaskuria → helppo ohittaa, näyttää "tallennus ei toimi".

**TERON VALINTA: C1 — selkeämpi palaute. 20 merkin portti säilyy, palautetta parannetaan.**

**Toteutus (C1):**
1. **Elävä merkkilaskuri** narratiivikentän (`tN-narr`) alle: näytä esim. "12 / 20 merkkiä". Kun < 20 →
   `--amber`/`--ink3` (kesken); kun ≥ 20 → `--teal-d` (ok). Päivittyy `input`-tapahtumasta.
2. **Inline-virheteksti kentän viereen/alle** kun tallennus estyy min-pituuden takia — ei enää *vain* napissa
   3 s. Teksti esim. "Narratiivi vaaditaan (vähintään 20 merkkiä)". Käytä `--red` himmennettynä (design-lukko).
   Napin varoitus voi jäädä lisänä, mutta kentän vieressä oleva viesti on ensisijainen.
3. **Koskee Taso 2 JA Taso 3** (`level >= 2`). Laskuri molempien tasojen validoituun kenttään.

**⚠️ Huom Taso 3 — tarkistettava epäjohdonmukaisuus:** validointi tarkistaa `data.narratiivi` =
`document.getElementById(tier+'-narr').value` eli **`t3-narr`** ("Valmentajan narratiivi"). Mutta Taso 3:n
UI merkitsee **`t3-reflektio`**:n pakolliseksi ("Pelaajan reflektio — pakollinen Taso 3:ssa ★"). Eli koodi
validoi eri kentän kuin label lupaa pakolliseksi. **Sovita laskuri/inline-virhe siihen kenttään jota koodi
oikeasti validoi (`t3-narr`), TAI korjaa validointi osumaan pakolliseksi merkittyyn kenttään** — vahvista
kumpi on tarkoitus (Taso 2 on johdonmukainen, vain Taso 3:ssa ristiriita). Ei laajenneta skooppia muuten.

**EI muuta:** 20 merkin logiikka säilyy (`trim().length < 20`), narratiivin luku on jo oikein. Design-lukko +
molemmat teemat pakollinen laskurille + inline-virheelle.

## Reunaehdot

- **Oikeiden alaikäisten data:** L3 vain Topias Koskelalla (KPV, sanktioitu). Ei muuta pelaajadataa.
- **Ei skeemamuutosta** (A/B ovat näyttö-/laskentakorjauksia; C on palautteen parannus — laskuri + inline-virhe,
  EI tallennuslogiikan muutos, 20 merkin portti säilyy).
- **§7.22:** PELIÄLY-luvut ovat valmentajan näkymää; pelaajan FUT-kortin ÄLY on jo §-suodatettu — säilytä.
- **Design-lukko + molemmat teemat.** `?v=`-bump jos jaettua libiä muutetaan (ei pitäisi tässä).

## Definition of Done

- **A:** L1 diff = `laskeD2Taso` prioriteetti; L3 Topias → D2 Tekninen näyttää **4/5** (ei 1.7), per-laji-erittely
  ennallaan, TKI 34 näkyy omana indeksinään. **Hidden Gem / X-Factor järkevät** muutoksen jälkeen.
- **B:** L1 diff = kaikki `yht/12` → `/3`(-suhde) korjattu (VP-otsikko + Pelaaja FUT + auditoidut). L3 Topias →
  PELIÄLY näyttää **11/12** (tai 2.8/3), FUT ÄLY ~92/99 (ei 23). Molemmat teemat.
- **C (C1 — palaute, EI logiikkamuutos):** L1 diff = merkkilaskuri + inline-virhe `tN-narr`-kentälle (Taso 2 & 3),
  20 merkin portti ennallaan. Taso 3:n label/validointi-ristiriita ratkaistu (laskuri osuu validoituun kenttään).
  L3 Topias → narratiivi < 20 merkkiä: laskuri näyttää punaisen "X / 20" + inline-virhe kentän vieressä (ei vain
  napissa); ≥ 20 merkkiä → laskuri teal, tallennus onnistuu, `adar_havaintoja` kasvaa, `adar_viimeisin` päivittyy.
  Molemmat teemat. Konsolissa 0 virhettä.
- ~805 vitest vihreä, lint clean. Pienet erilliset commitit (A / B / C) jos mahdollista; verifioi elävänä.

---

## PÄIVITYS 2 — KORVAA aiemman PÄIVITYS-osion (arkkitehti paikansi lähdekoodista)

- **Bug A — VAHVISTETTU (Tero):** D2 = per-laji (`d2_taso`), TKI omaksi indeksikseen. `laskeD2Taso`-prioriteetin
  vaihto (yllä). Verifioi Hidden Gem / X-Factor -reunavaikutus.
- **Bug B — VAHVISTETTU, koskee MYÖS Pelaaja-appia:** korjaa PELIÄLY-skaala sekä VP:ssä että
  `TalentMaster_Pelaaja_v7.html`:ssä (`_fcKorttiData` ÄLY `yht/12` → `yht/3`). Molemmat.
- **Bug C — JUURISYY VARMISTETTU LÄHDEKOODISTA, aiempi hypoteesi kumottu:** kyse EI ole siitä että tarkistus
  "ei tunnista tekstiä". `saveCard(level)` lukee narratiivin oikein elävästä textareasta (`tN-narr`) ja
  validoi `trim().length < 20` → **tarkoituksellinen 20 merkin minimi**. "Testi" (5 merkkiä) hylättiin oikein;
  mikään ei ollut rikki. **Tero valitsi C1:** säilytä 20 merkin portti, lisää elävä merkkilaskuri + inline-virhe
  narratiivikentän viereen (ei vain napissa). Ks. Bug C -osio yllä. **HUOM Taso 3:n label/validointi-ristiriita**
  (`t3-reflektio` merkitty pakolliseksi mutta koodi validoi `t3-narr`) — ratkaise osiossa kuvatusti.
