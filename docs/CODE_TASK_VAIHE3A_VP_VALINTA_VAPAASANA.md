# Vaihe 3a — VP:n oma valinta + vapaa sana (moottori = ehdotus, VP omistaa)

> Lähde: live-verify + Teron linjaus 2026-07-03. Havainto: "Ehdota uudelleen" toimii (status vaihtuu), mutta deterministinen moottori palauttaa **saman** ehdotuksen — ja harvadatalla (SJK: ei havaittu-arviointia, ei TKI:tä, vain D1) vain **1 kandidaatti** → tuntuu rikkinäiseltä. VP:llä ei ole tapaa valita toista kohdetta tai kirjoittaa tavoitetta itse. Kohde: `TalentMaster_VP_v25.html` (kausitavoite-kortti). §7b · §26 · §7.22 · §5.

## 1. Periaate
Moottori = **lähtöehdotus**, ei lopullinen. **VP omistaa tavoitteen** ja voi (a) valita fokuksen itse mistä tahansa arvioidusta/mitatusta alueesta, (b) kirjoittaa fokuksen ja tavoitteen **vapaana tekstinä**, (c) säätää tavoitearvon. Pelaajan ääni säilyy erikseen (omistajuus, §7b).

## 2. Lisättävät kontrollit (kausitavoite-korttiin, muokkaustilassa)
1. **Fokus-valinta (dropdown):** pääteema → kohde (sama taksonomia-lähde kuin arviointi, `tmTeemat`/`tmTeemaKohteet`). VP voi vaihtaa moottorin ehdottaman fokuksen mihin tahansa taksonomian kohteeseen. Valinta → `tavoite.fokus = {alue, dim, nimi}` + `mittari` päivittyy (mitattava jos kohteella testi, muuten `yksikko:'taso'` havaittu 1–5). `lahde:'valmentaja'`.
2. **Vapaa sana — fokus:** valinnaisesti VP kirjoittaa fokus-nimen vapaana tekstinä (`fokus.nimi` + `fokus.vapaa:true`) kun taksonomia ei riitä (esim. pelipaikkakohtainen tai joukkuekohtainen tavoite). Tällöin `mittari.yksikko='vapaa'` (ei mitattavaa palkkia, seuranta review-tekstillä).
3. **Vapaa sana — tavoitekuvaus:** vapaa tekstikenttä `tavoite.kuvaus` (mitä konkreettisesti tavoitellaan pelissä). Näkyy kortilla. Täydentää strukturoituja kenttiä, ei korvaa.
4. **Tavoitearvo** säädettävissä (on jo `_jspTavArvo` mitattaville) — säilyy.

## 3. "Ehdota uudelleen" → selkeämpi
- Nimeä/toimi **"↻ Ehdota (moottori)"** — kertoo että se on moottorin ehdotus. Jos **>1 kandidaatti**, klikkaus **kiertää seuraavaan heikoimpaan** (idpKeraaKandidaatit järjestettynä; pidä indeksiä `p._idpEhdotusIdx`). Jos **1 kandidaatti**, näytä vihje "Vain yksi datapohjainen kohde — valitse itse alta" + korosta fokus-dropdownia.
- Näin VP näkee että moottori teki työnsä, mutta kontrolli on hänellä.

## 4. §28-huomio (samalla korjattava)
Harvadatalla (ei PHV:tä) moottori valitsi **Kestävyyden** (D1 fyysinen, taso 1) fokukseksi — mutta §28: pre-PHV heikko MAS/kestävyys on **neutraali, ei kehityskohde**. Ilman PHV-dataa kypsyysvahti ei laukea → fyysinen nousee fokukseksi vaikka ei pitäisi. **Korjaus:** kun PHV-dataa EI ole, moottori **varoittaa** fyysisestä fokuksesta ("kypsyysdataa ei ole — fyysinen tavoite epävarma, harkitse taito/tekninen kohde") ja **priorisoi ei-fyysisiä kandidaatteja** (D2/D4 havaittu) jos niitä on. Fyysinen sallitaan vain jos ei muita JA VP vahvistaa.

## 5. Firestore + pikakentät (§26)
Tavoite-objektiin lisäkentät: `fokus.vapaa` (bool), `fokus.lahde` ('moottori'|'valmentaja'), `kuvaus` (string), `mittari.yksikko` voi olla 'vapaa'. Pikakenttä `idp_fokus` = `{alue,dim,nimi}` ennallaan (vapaa fokus → nimi vapaatekstistä). Ei uutta alikokoelmaa, ei Rules-muutosta (idp_kausi jo v3.10).

## 6. §7.22
VP-näkymä = luvut + vapaa teksti (aikuisten työkalu). Pelaajapeili (3c) näyttää fokuksen ja pelaajan äänen turvallisesti — ei tasolukuja. VP:n vapaa teksti kehystettävä pelaajalle positiivisesti 3c:ssä.

## 7. Invariantit + verifiointi
§7b (pelaaminen-linkitys: myös vapaa fokus/kuvaus kehystetään pelilliseksi) · §26 · §7.22 · §5 (natiivi select + textarea) · ei version.json-bumppia · ei Rules-muutosta. Testit: kandidaattien kierto (>1), 1-kandidaatin vihje, vapaa fokus → `yksikko:'vapaa'` ei kaada palkkia, §28 fyysinen-varoitus ilman PHV:tä. Live: SJK-pelaaja jolla 1 kandidaatti → VP valitsee fokuksen dropdownista + kirjoittaa kuvauksen + hyväksyy → tallentuu.
