# K1c — Teron tuotantotestin korjaukset 20.10. ilta (erä 78) · SUUNNITELMA

Kaista: **Tero** (HTML + lib). Pohja: origin/main 925742e9. Brief: `.briefit/CODE_BRIEF_K1C_KORJAUKSET.md`. Ei Rules-muutoksia eikä uusia kenttiä. PR draftina kunnes erä 78 on viety; Code ei mergeä.

## Löydökset (juurisyyt)
| Kohta | Löydös |
|---|---|
| 1 Fokus | Koodipaikat: `lib/tm_kehitystyopoyta.js` `tmKtOsatHTML` (rivi `.kt-osa-r.on`, oikealla pieni `kt-osa-st` "viikon osa") ja `lib/tm_tanaan_kentta.js` `tmTanaanKenttaHTML` (`k1-viikon-osa`, "tällä viikolla" pienellä). Sovelluksissa ei ole tokenia `--acc-dim`; olemassa oleva korostusmalli on `color-mix(in srgb, var(--teal) N%, transparent)` (`.kt-sig`, `.kt-nauha`). Käytetään sitä — **ei uusia tokeneita**. |
| 2 Klippikortti | `lib/tm_klippi_perhe.js` käyttää `var(--card)`, jota Pelaaja_v7:ssä ja Vanhempi_v2:ssa **ei ole määritelty** (niissä `--surface`/`--surface2`). Tausta jää läpinäkyväksi → kortti sulaa sivuun. Sama koskee `KENTTA`-syötekenttää. |
| 3 Ilmoitukset | `_p7NotifKuittaa` / `_vanhNotifKuittaa` kutsuvat `draw()` → koko sivu uusiksi → scroll ylös. Rivien HTML on kopioitu kahteen appiin. |
| 4 Taulu | Taulu = Masterin kaaviopankki (`_kvModal`) iframessa, joka on isännän modaalin sisällä (`lib/tm_kt_taulu.js`). Kaksi kehystä: isännän `box` (12px reunus, 1040px, 92vh) ja `_kvModal`:n oma 860px-laatikko. **Kohdistus ei vaadi uutta kenttää:** kaavion `review.nakyvyys='pelaaja'` + `review.pelaajaIds[]` on jo olemassa (Rules/policy tukevat), ja uuden kaavion lomake tarjoaa jo "pelaaja"-tason. Muutetaan vain lomakkeen **oletus** (pelaajakortista avattaessa: taso pelaaja, esivalittu tämä pelaaja). |

## Toteutus
1. **Fokus.** Fokusrivi: tausta `color-mix(teal 14%)`, 3 px vasen reunamerkki, ja tilateksti vaihdetaan badgeksi **"Tämän viikon fokus"** (teal täyte + `--on-accent`). Tänään/Ydinasiat-otsikon alle rivi **"Tällä viikolla: {ydinasia}"** (`tmKtOsatHTML`). Pelaajan Viikko-kortti: sama korostus + ylimpänä rivi **"Tällä viikolla harjoittelet: {ydinasia}"** (`tmTanaanKenttaHTML`; ei lukuja, §7.22). Uudet avaimet `kts_*`/`k1_*` fi-oletuksina, sv jää Geminille (LIB_SV_ODOTTAA).
2. **Klippikortti.** `KORTTI`: `var(--surface, var(--card))`, pyöristys/sisäväli kuten `.card`; "Uusi"-tilassa (ei vastausta, ei suljettu) hento teal-reunus; "Muut klipit" omana alaosionaan (hiusviiva + oma otsikko, vähän vaaleampi pohja). `KENTTA`-tausta → `var(--surface2, var(--card))`. Sama lib → perhe-app automaattisesti.
3. **Ilmoitukset.** Uusi puhdas lib `lib/tm_ilmoitus_lista.js`: ryhmittely (`tmIlmoitusRyhmat`: saman nimiset peruttu-rivit → yksi ryhmä, "Peruttu: {nimi} · N kertaa ▸"), rivi-/ryhmä-HTML, ✕ paikallaan (`tmIlmoitusPoistaPaikallaan`: häivytys ja DOM-poisto, `scrollY` talteen ja palautus; ei `draw()`), "Kuittaa kaikki" kun rivejä ≥ 3, ❌ → hillitty status-merkki (himmeä piste `--amber`/`--ink3`, ei emojia). Pelaaja_v7 ja Vanhempi_v2 pysyvät ohuina adaptereina. Kuittaus pysyy laitteen localStoragessa kuten nyt (ei kenttää, ei Rulesia).
4. **Taulu koko näytölle.** Isäntä: modaali `100vw × 100dvh`, ohut otsikkopalkki (Taktiikkataulu · pelaajan nimi · ×), ei sisempää kehystä. Master upotettuna: `html.tm-upotettu #_kvModal`-CSS poistaa toisen kehyksen (täysi leveys/korkeus, ei reunusta); työkalut oikealla ≥ 1100 px, alla kapeassa. Esc ja × → isäntä kysyy tallentamattomista (Masterin `_kaavioTallentamattomia`, olemassa oleva teksti jos on) ennen sulkemista. Kohdistus: edellä.

## Testit
`tests/k1c_*.test.js` (lib-yksikkö + sandbox-ajo, ei ulkoverkkoa, UTC): fokus-HTML (badge, rivi, ei lukuja pelaajalle), klippikortin tausta (ei `--card` ilman fallbackia), ilmoitusten ryhmittely/kuittaus/Kuittaa kaikki/scrollY ei muutu/kuitattu ei palaa, taulun koko näytön CSS + oletuskohdistus pelaaja. `?v` ja SW-versiot (pelaaja, vanhempi, adar), lib_versiot + kuoret_kasvukatto. Koko `npm test` + lint.

## Avoimet / raportoitavaa
- Tokenit: `--acc-dim` puuttuu → color-mix(teal). Kerrotaan PR:ssä.
- Mergejärjestys K4a:n kanssa: kumpi tahansa → merge mainista, lib_versiot/kuoret_kasvukatto uusiksi, versiot ylös.
