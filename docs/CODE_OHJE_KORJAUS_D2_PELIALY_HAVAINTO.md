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

## Bug C — Pelihavainnon tallennus ei onnistu (Topias)

**Oire:** "Havainnoi → review" avaa pelihavainto-/ADAR-työkalun (tämä on tarkoitus — havainnointi luo
review-havainnon). Uuden havainnon tallennus Topiakselle **epäonnistui**. (Topiaksella on jo 5 aiempaa
havaintoa + `adar_viimeisin`, joten polku on joskus toiminut.)

**Selvitä + korjaa:** toista tallennus (ADAR-pikakortti / `TalentMaster_ADAR_Pikakortti.html` iframe →
postMessage `tm:adar:saved` → `paivitaAdarPikakentat`), **kaappaa konsolivirhe** ja korjaa. Tarkista erit.:
- havainnon kirjoitus (mihin kokoelmaan; onnistuuko Firestore-write; Rules).
- `paivitaAdarPikakentat` on `try/catch → console.warn` (ei näy käyttäjälle) — jos se kaatuu, pikakentät eivät
  päivity vaikka havainto tallentuisi. Tarkista molemmat.
- (Jos toistuu vain tietyllä syötteellä/tilanteella, kirjaa se.)

Arkkitehti voi auttaa toistamaan elävänä (Topias/KPV, sanktioitu testipelaaja) jos konsolivirhe ei löydy.

## Reunaehdot

- **Oikeiden alaikäisten data:** L3 vain Topias Koskelalla (KPV, sanktioitu). Ei muuta pelaajadataa.
- **Ei skeemamuutosta** (A/B ovat näyttö-/laskentakorjauksia; C korjaa olemassa olevaa tallennusta).
- **§7.22:** PELIÄLY-luvut ovat valmentajan näkymää; pelaajan FUT-kortin ÄLY on jo §-suodatettu — säilytä.
- **Design-lukko + molemmat teemat.** `?v=`-bump jos jaettua libiä muutetaan (ei pitäisi tässä).

## Definition of Done

- **A:** L1 diff = `laskeD2Taso` prioriteetti; L3 Topias → D2 Tekninen näyttää **4/5** (ei 1.7), per-laji-erittely
  ennallaan, TKI 34 näkyy omana indeksinään. **Hidden Gem / X-Factor järkevät** muutoksen jälkeen.
- **B:** L1 diff = kaikki `yht/12` → `/3`(-suhde) korjattu (VP-otsikko + Pelaaja FUT + auditoidut). L3 Topias →
  PELIÄLY näyttää **11/12** (tai 2.8/3), FUT ÄLY ~92/99 (ei 23). Molemmat teemat.
- **C:** L1 diff = korjattu tallennus/virhe; L3 Topias → uusi pelihavainto tallentuu, `adar_havaintoja` kasvaa,
  `adar_viimeisin` päivittyy. Konsolissa 0 virhettä.
- ~805 vitest vihreä, lint clean. Pienet erilliset commitit (A / B / C) jos mahdollista; verifioi elävänä.

---

## PÄIVITYS (Tero vahvisti)

- **Bug A — VAHVISTETTU:** D2 = per-laji (`d2_taso`), TKI jää omaksi indeksikseen. Toteuta yllä kuvattu
  `laskeD2Taso`-prioriteetin vaihto. Verifioi Hidden Gem / X-Factor -reunavaikutus.
- **Bug B — koskee MYÖS Pelaaja-appia (vahvistettu):** korjaa PELIÄLY-skaala sekä VP:ssä että
  `TalentMaster_Pelaaja_v7.html`:ssä (`_fcKorttiData` ÄLY `yht/12` → `yht/3`). Molemmat.
- **Bug C — TARKENNUS (juurisyy todennäköisesti tässä):** virhe on **"narratiivi tarvitaan"** -tyyppinen
  validointi, joka laukeaa **vaikka valmentaja on kirjoittanut/tallentanut narratiivitekstin**. Eli
  tallennus vaatii narratiivin, mutta pakollisuustarkistus **ei tunnista syötettyä/tallennettua tekstiä**
  → tallennus estyy. Etsi review-/pelihavainto-tallennuksen narratiivi-pakollisuustarkistus (valmentajan
  työkalu) ja korjaa se lukemaan oikea narratiivikenttä (todennäköisesti: kenttä luetaan eri nimellä/eri
  paikasta kuin mihin teksti tallennetaan, tai tarkistus ajetaan ennen kuin tila päivittyy). Kaappaa
  konsolivirhe toistossa. Arkkitehti voi toistaa elävänä (Topias/KPV) jos kohta ei löydy.
