# 22 · Kehitystyöpöytä (Tänään · Polku · Näyttö): käytettävyys · tiivistys PM:lle · 9.10.2026

**Vastaus Teron palautteeseen:** kokonaisuus ei toimi, koska kolme välilehteä ovat kolme sukupolvea (V4-kehys · vanha modaali · vanha kortti). Uudistus tekee yhden mallin: **yksi kysymys, yksi toiminto, yksi kortti-anatomia** (otsikko · tulkintalause · luku + datan ikä · yksi linkki). Mockup: `docs/design/idp-v2/22_kehitystyopoyta_kayttettavyys.html` (3 välilehteä · 1280 ja 390 · 4 tilaa · VP/oto · arki/su · Pelaajan silmin · 2 sheettiä · benchmark). Täysi inventaario: `22_KEHITYSTYOPOYTA_ANALYYSI.md`.

## Juurisyyt (koodista, rivit analyysissä)
1. **Kenttä tyhjä tarkoituksella**: tyhjä spec + testi lukitsee; pelaajadokissa ei aluetta/reittiä → suunnitelman aukko (K3), ei Coden virhe.
2. **Sitoumus kahdella säännöllä**: tilasiru/signaali = päivämäärä (`tm_aloita_jakso.js:66`), "Onko mukana?" = jaksoleima (VP 11082); `_vpVahvistaSitoumus` leimaa nykyisen jakson tarkistamatta → vanha sitoumus "vahvistuu". Masterissa ei vahvistuspolkua.
3. **Näyttö = 32 lohkoa, 150–200 lukua**, PHV ~10 paikassa, 30 m -sarja kahdesta eri lähteestä; 13 §6 määritteli 8 lohkoa tulkintoineen, 18 §7 "siirrä" tehtiin kirjaimellisesti.
Lisäksi: "Merkitse viikkohavainto" vain vaihtaa välilehteä; "Täytä viikko" ei tallenna, viikko ei lataudu V4:ssä; "2/5" on oletus; `_jspVaihda` piilottaa Polun/Mittaukset; mittauslista valmentajalle aina lukutila; D3 "Arvioi (VP)" ilman roolia; `p.phv_tila` suoraan 10+ paikassa; "Pelaajan silmin" piilottaa vain PHV-sirun.

## Päätökset (ehdotus; D98 lukittu Tero 9.10.)
D97 yksi sitoumussääntö, yksi lib, molemmat appit · **D98 Kenttä datasta: `ydinvahvuus.alue {x,y,w,h}` + `jaksofokus.reitti`, ilman aluetta jaksokortti + CTA (lukittu, "yhtenäistetään": VP, Master ja pelaaja-app sama komponentti ja data)** · D99 Polun tila -kortti pois · D100 toiminnot sheetteinä paikallaan · D101 viikon suunnittelu → joukkueen viikko (14), pelaajan Polku lukuna · D102 Näyttö = Profiili + 5 todistekorttia + "Näytä kaikki mittaukset", ≤ 30 lukua · D103 kolme kysymystä aina lähde + päivä · D104 kausitavoitteen luku vain mitatusta lähtötasosta · D105 Pelaajan ääni -placeholder pois · D106 yksi lib kolmelle välilehdelle (R1).

## Järjestys
**Ennen 1.11. (Code, kaista Tero):** (a)-lista 1–12 + D99, D103 (nykyisestä datasta), D104, D105. Ei uusia kenttiä.
**R1 joulukuu:** D98 (+Rules, "Siirrä kentällä"), D100, D101, D102, D106 (oma kevyt sivu).

## Benchmark (lyhyt)
StatsBomb: tutka ei koskaan yksin, rinnalla luvut + populaatio → meillä tulkintalause + oma lähtötaso. Hudl: video jakson kontekstissa, pelaaja toimijana. 360Player: yksi aikajana (= Polku). PMA/EPPP: PHV-korjattu vertailu, mutta "rich in data, largely untapped" = Näytön riski. Wyscout: tiheä taulukko ilman tulkintaa = nykyinen Näyttö. Yhteinen oppi: tulkinta ja raakadata kahdeksi kerrokseksi.

## Avoin
- D97: sitoumuksen "vahvistettu" vaatii myös Masteriin vahvistuspolun — sama lib, PR Teron kaistalle.
- D101: joukkueen viikko (14) ei ole vielä toteutettu → siihen asti pelaajan "Tämä viikko" näyttää kalenterin tapahtumat lukuna.
- Numero 22 ja D97–D106 vahvistetaan PM:n kanssa.
