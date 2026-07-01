# Code-tehtävä: MAS-käännöskorjaus → MyE.Way-pariteetti (−20 → −20,3)

> Laadittu 2026-07-01. Valmis brieffi Code-agentille. Kevyt, matala riski. Sama tekninen velka kuin PHV-vakiossa (kaava kopioitu useaan paikkaan eri arvoilla).
> Tausta: SJK-akatemiapilotin MAS-data ristiintarkistettu MyE.Way'tä vastaan.

## Tausta / miksi
MAS-nopeus (1200 m -juoksu) lasketaan käännöskorjauksella. MyE.Way käyttää **−20,3 s**, meidän tuontiputki (Excel-tuonti) **−20 s**. Matka (1200 m) ja muu logiikka identtiset.

**MyE.Way-kaava (verifioitu kahdella pisteellä):** `MAS m/s = 1200 / (A*60 + B − 20,3)` · `km/h = ... × 3,6`.
- Topi Keskinen (P2010), 4 min 40 s = 280 s → **4,62 m/s / 16,63 km/h**
- Nella Okkonen, 5 min 48 s = 348 s → **3,66 m/s / 13,18 km/h**

Meidän koodi −20,3:lla tuottaa molemmat täsmälleen ✓; −20:llä eroaa vain pyöristysrajalla (≤0,03 km/h).

**Vaikutus:** ≤ 0,03 km/h, vain pyöristysrajalla (esim. Ylevä Milka 5:52 → −20: 13,0 · −20,3: 13,03). Pieni mutta systemaattinen; MyE.Way-pariteetti + koodin sisäinen johdonmukaisuus ovat syy korjaukseen.

## KOLME kopiota — eri arvot (yhtenäistettävä)
| Tiedosto | Nyk. korjaus | Toimenpide |
|---|---|---|
| **`TalentMaster_Excel_Tuonti.html`** rivi 1560 `MAS_KAANNOSKORJAUS_S = 20` | −20 | **→ 20.3** (+ kommentti rivi 1556: "sek − 20" → "sek − 20.3") |
| `src/lib/tm_testipankki.js` rivit 1660–1661 `1200 / (kokonaisAika - 20.3)` | −20,3 | **jo oikein — ei muutosta** (kynnys rivi 1660 `<= 20.3` myös ok) |
| **`TalentMaster_Testituonti_Master.html`** rivi 1341 `1200 / sek * 3.6` | **ei korjausta** | **Tarkista:** onko tiedosto elävä vai vanha/arkistoitava? Jos elävä → lisää −20,3-korjaus (`1200 / (sek - 20.3) * 3.6`). Jos kuollut → kirjaa poistettavaksi. |

> Tekninen velka (kirjaa, älä korjaa nyt): MAS-muunnos kolmena kopiona kolmella eri arvolla → tulisi single-source (esim. `tm_testipankki.js` tai jaettu lib) + re-export. Erillinen refaktorointi (sama kuin PHV-vakion single-source).

## Verifiointi
- **Regressiotesti** (lukitsee MyE.Way-pariteetin): Testi joka syöttää 280 s → odottaa 4,62 m/s ja 16,63 km/h korjauksella −20,3. Jos `parseMasAika` on testattavissa (Excel_Tuonti on HTML, ei CommonJS → lähdetason guard kuten PHV:ssä: grep varmistaa `MAS_KAANNOSKORJAUS_S = 20.3` läsnä eikä `= 20`).
  ```js
  // odotettu (korjaus -20.3):
  // 280s → ms 4.62, km/h 16.63
  // 352s (Ylevä) → km/h 13.03
  ```
- Node-sanity: `1200/(280-20.3)` = 4.62 m/s; `*3.6` = 16.63 km/h.
- `npm test` vihreä.

## Dokumentaatio
- `TalentMaster_Excel_Tuonti.html` rivi 1556 kommentti päivitä −20,3.
- `CLAUDE.md` §22 (MAS-testi) tai §26: lisää maininta "MAS-käännöskorjaus −20,3 s (MyE.Way-pariteetti, 2026-07-01); kolme kopiota (Excel_Tuonti/tm_testipankki/Testituonti_Master) — tm_testipankki jo oikein, single-source tekninen velka."

## Guardrailit
- Vain käännöskorjaus 20 → 20,3 (Excel_Tuonti); matka 1200 ja muu logiikka ennallaan.
- tm_testipankki ei kosketa (jo oikein).
- Testituonti_Master: tarkista elävyys ennen muutosta.
- Feature branch → PR → merge, ei versionbumppia.

## Vaikutus tuotantoon
- Ei kosketa jo kirjoitettua dataa (PHV ei käytä MAS:ia; 8 pelaajan PHV koskematon).
- SJK:n 4 tytön MAS-tuonti kannattaa ajaa **vasta tämän korjauksen jälkeen** → menee kerralla MyE.Way-täsmällisenä.
- **PÄÄTÖS 2026-07-01: vanhaa MAS-dataa EI lasketa uudelleen.** SJK:n poikien huhtikuun MAS (`hh_pvm 2026-04-01`) on vanhalla −20-perustalla; ero uuteen −20,3-perustaan ≤0,05 km/h → tietoisesti jätetään ennalleen. **Code: ÄLÄ tee migraatiota/recalcia olemassa olevaan dataan** — vain vakion muutos + eteenpäin laskettavat.
