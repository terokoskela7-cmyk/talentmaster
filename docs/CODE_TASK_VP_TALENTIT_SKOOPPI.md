# Code-tehtävä: VP Tilanne — skooppivalitsin + Talentit-lista (kypsyyskorjattu)

> Valmis brieffi Code-agentille. Rajaus: **VAIN VP_v25.html Tilanne-näkymä** — 4 KPI-kortin (`renderKehitysKortti`) skooppivalitsin + uusi Talentit-lista. EI pulssikortteja, EI syvänäkymä-modaalia, EI muita sivuja/näkymiä.
> Visuaalinen tavoite: chat-mockup 2026-07-01 `vp_tilanne_skooppi_ja_talentit`.
> Tarkoitus (VP:n bisneslogiikka): seura käyttää **extra-valmennusresurssia** talenttipelaajiin → VP:n pitää nähdä (1) seuran tila eri skoopeissa ja (2) ketkä ovat talentteja + heidän ominaisuutensa **kypsyyskorjattuna** (RAE/myöhäiskypsyys-suoja, §28).

## Konteksti (nykytila)
- `renderKehitysKortti(_pelaajat)` (VP_v25 ~8642) laskee 4 KPI-korttia (Fyysinen/Tekninen/Valmius/Peli) **koko seuran** `_pelaajat`-poolista (kaikki joukkueet). "56 pel." = TSI-datalliset.
- **Kohortti-logiikka on jo olemassa:** `valitseKohortti` / `_tasoLvl` (#76, syvänäkymä-modaali) — Paras/Top-5/Top-10/koko joukkue. **Uudelleenkäytä sitä** seuratasolla, älä kirjoita uutta.
- Talentti-data on pikakentissä (§11/§26): `talenttiOhjelma:true`, `talenttiTaso:'perus'|'laajennettu'`. Ei uutta datamallia.
- Kehitysvaihe-taso: **`docs/kehitysvaihe_tavoitetasot.js`** (`TM_KEHITYSVAIHE.kehitysvaiheTaso(arvo,testi,offset,sp)`) — lataa lib kuten `testit_indeksit.js`. PHV-offset = `biologinenIka_viimeisin.maturity_offset` (§25).

## 2 osaa

### OSA A — Skooppivalitsin 4 KPI-kortin päälle
- Lisää `renderKehitysKortti`-korttien yläpuolelle valitsinpillerit: **`Koko seura` · `Talentit · N` · `Top-10` · `Top-5`** (aktiivi tealilla, §5). Oletus `Koko seura` (nykykäytös).
- Valinta suodattaa `_pelaajat` → `renderKehitysKortti(valitutPelaajat)`:
  - **Koko seura** = `_pelaajat` (nykyinen).
  - **Talentit** = `_pelaajat.filter(p => p.talenttiOhjelma === true)`. Pilleriin lukumäärä (`Talentit · 12`).
  - **Top-10 / Top-5** = `valitseKohortti`-logiikalla (#76, taso+kehitys-ranking) leikattu seuran pooliin.
- **KPI-kortti näyttää vertailun** valitussa skoopissa: kun ei "Koko seura", lisää subiin "· koko seura X.X" (esim. "Fyysinen 3.0 /5 · H-H · koko seura 2.2"). Näin skoopin nosto näkyy heti.
- Tila `_tilanneSkooppi` (default 'seura'); klikkaus → aseta + `renderTilanne()` (tai vain KPI-osan re-render). Ei uutta datahakua — sama `_pelaajat`.

### OSA B — Talentit-lista (uusi lohko Tilanteeseen)
Uusi lohko KPI-korttien alle: **"Talentit — extra-valmennuksen kohteet"**. Lähde `_pelaajat.filter(talenttiOhjelma)`. Renderöi **vain pikakentistä** (§26, ei alikokoelmakyselyjä). Taulukko/kortit per pelaaja:

| Sarake | Lähde |
|---|---|
| Pelaaja (+ RAE-Q-badge jos `rae_kvartaali`) | `etunimi/sukunimi`, `rae_kvartaali` (§26) |
| Jkl | `joukkue` |
| Taso | `talenttiTaso` (perus/laajennettu) |
| D1 | `d1_taso` (fallback `hh_taso`) |
| D2 | `d2_taso` |
| TKI | `tki_viimeisin` |
| **Ikäluokka → Kehitysvaihe** | **ks. alla** |
| Vauhti | **ks. "Kehitysvauhti-sarake" alla** |
| Huomio | johdettu erotuksesta (ks. alla) |

**"Ikäluokka → Kehitysvaihe" -sarake (koko jutun ydin) — koskee FYYSISTÄ (D1):**
Kehitysvaihe-taso on määritelty **vain fyysisille testeille** (lin-nopeus/CMJ/MAS = D1, §"kehitysvaihe_tavoitetasot.js"). ÄLÄ sovella sitä D2/TKI:hin (ei kypsyysnormeja niille, §30).
- **Ikäluokka-taso** = D1-fyysinen ikäluokkanormilla (nykyinen `d1_taso` / `eerikkilaTaso`-pohja).
- **Kehitysvaihe-taso** = keskiarvo `kehitysvaiheTaso(arvo, testi, offset, sp)`-tuloksista niille `hh_viimeisin`-testeille jotka tuettu (`lin10m`/`lin30m`, `cmj`, `mas`; MAS km/h → **÷3.6**). Pyöristä 1 numeroon / lähimpään tasoon kuten ikäluokka.
- Näytä `2 → 4` -muodossa; väri §5 (matala red, keski amber, korkea teal). **⭐-merkki kun kehitysvaihe ≥ ikäluokka + 1** (myöhäiskypsyjä-suoja).
- **Graceful degradation:** jos pelaajalla ei PHV-offsetia → kehitysvaihe = "—" (näytä vain ikäluokka). SJK:lla PHV vain ~8 pelaajalla → useimmilla "—" aluksi; se on OK ja odotettu.

**"Huomio"-sarake** (johdettu ikäluokka vs kehitysvaihe -erotuksesta, §28):
- kehitysvaihe ≥ ikäluokka+1 → *"Myöhäiskypsyjä — älä leikkaa"* (teal).
- kehitysvaihe ≤ ikäluokka−1 → *"Varhaiskypsyjä — seuraa taitoa"* (amber).
- muuten → lyhyt neutraali (esim. "Tasapainoinen" / kehityskohteesta `tki_kehityskohde`).
- ei PHV → ei kypsyyshuomiota (näytä esim. kehityskohde).

**"Kehitysvauhti"-sarake (panostuksen ROI, §29):** onko extra-valmennus tuottanut kehitystä.
- Delta pikakentistä (§29, ei uutta laskentaa): ensisijainen `tki_viimeisin` − `tki_edellinen`; jos TKI-deltaa ei ole, `hh_taso`/`d1_taso` − `hh_taso_edellinen`. Näytä `↑ +N` (teal) / `↓ −N` (hillitty, ei hälytyspunainen) / `→` (harmaa, ei muutosta) / "—" kun 2. mittausta ei ole.
- **§3.2/§34-invariantti:** vauhti abs-parannuksesta, EI pelkästä TKI-laskusta — jos abs paranee mutta TKI laskee (vaatimus koveni enemmän), ÄLÄ näytä punaisena. Käytä samaa `_deltaBadge`/`laskeJoukkueSuunta`-logiikkaa joka Masterissa/VP:ssä jo on (§29), älä kirjoita uutta.

**Rivin klikkaus** → avaa pelaajan syvänäkymä (`_jspModal` tai olemassa oleva pelaaja-drill). Uudelleenkäytä olemassa olevaa avausta.

### OSA C — Hidden Gem -ehdokkaat (aliarvioidut, ei vielä talenttiohjelmassa)
Talentit-listan **alle** oma pieni lohko: **"Harkitse talenttiohjelmaan"** — pelaajat jotka täyttävät Hidden Gem -profiilin mutta joilla `talenttiOhjelma !== true`. Auttaa löytämään aliarvioidut **ennen** kuin resurssi on jo kohdennettu (RAE/kypsyys-suoja seuratasolla).
- **Kynnys (§28/§30, älä keksi uutta):** `d2_taso >= 3.5` JA `d1_taso <= 2.5` JA erotus `d2−d1 >= 1.0` (korkea tekniikka + matala fysiikka). Käytä olemassa olevaa Hidden Gem -kynnystä jos se on jo koodattu (`_hiddenGem`-tyylinen helper) — älä duplikoi.
- **PHV-porrastus (§28-invariantti #1):** merkitse **"vahvistettu"** kun `phv_tila` on PRE/LAH (pre-PHV → aito gem, fysiikka tulee); **"ehdokas"** kun PHV-dataa ei ole (toimii nyt, tarkentuu kun bio-ika mitataan). ÄLÄ näytä post-PHV-profiilia gem-ehdokkaana (silloin fyysinen nousuvara ei tule automaattisesti).
- Rivit kevyempinä kuin talentit (nimi + Jkl + D1/D2 + "ehdokas/vahvistettu" + rivi→syvänäkymä). Tyhjä tila: piilota lohko kokonaan jos 0 ehdokasta (ei tyhjää otsikkoa).
- **Ei muokkaa talenttistatusta** — vain nostaa esiin; statuksen asettaa VP/seura Seurahallinnassa (§17). Voi olla CTA "Merkitse talentiksi →" joka vie Seura.html:ään (ei suoraa kirjoitusta tästä näkymästä).

**Tyhjä tila:** jos 0 talenttia (`talenttiOhjelma`-lippuja ei asetettu) → CTA-tyhjätila (§75): "Ei talentteja merkitty — merkitse Seurahallinnassa" (linkki Seura.html Talentit-välilehteen §17). EI tyhjää taulukkoa.

## Guardrailit
- **Rajaus ehdoton:** vain VP_v25 Tilanne (`renderKehitysKortti` + uusi Talentit-lohko). Ei pulssikortteja, ei syvänäkymää, ei Masteria.
- **Ei uutta datahakua / ei alikokoelmakyselyjä** — kaikki `_pelaajat`-pikakentistä (§26). Skooppi = client-side suodatus samasta poolista.
- **Uudelleenkäytä `valitseKohortti`/`_tasoLvl`** (#76) — älä kirjoita uutta ranking-logiikkaa.
- **Kehitysvaihe vain fyysisiin testeihin** (lin-nopeus/CMJ/MAS). Ei D2/TKI:hin (§30). MAS ÷3.6.
- **`kehitysvaihe_tavoitetasot.js` ladattava** VP:hen (script-tag, kuten `testit_indeksit.js`). Jos lib puuttuu → kehitysvaihe-sarake "—" (ei kaadu).
- **§28:** matala D1 pre/circa-PHV = neutraali; ⭐/huomio-kehys ei-leimaava. **§7.22:** VP/valmentaja-työkalu.
- **Brändi §5** (teal/amber/red, DM Sans/Cormorant); **mobiili §6** yksi `@media`; tumma teema oletus + vaalea token-turva (kuten pulssikortit PR #54). Ei versionbumppia.

## Verifiointi
- Screenshot SJK-datalla: (1) skooppivalitsin vaihtaa KPI-lukuja (Koko seura ↔ Talentit ↔ Top-5) + "koko seura X" -vertailu näkyy; (2) Talentit-lista renderöityy, dual-sarake toimii (⭐ myöhäiskypsyjällä joilla PHV; "—" muilla); (3) kehitysvauhti-sarake (↑/↓/→/—, ei punainen kun abs paranee, §3.2); (4) Hidden Gem -ehdokkaat -lohko (piilossa jos 0); (5) tyhjä tila jos ei talentteja. Tumma + vaalea teema.
- Ei konsolivirheitä; inline-syntaksi puhdas (ESLint no-undef §60). `npm test` + CI vihreät.

## Ei tähän
- Talenttistatuksen muokkaus VP:stä (se on Seura.html §17). Tämä lista = luku + navigointi.
- Syvänäkymä-modaalin redesign (`CODE_TASK_SYVANAKYMA_UI.md`) — erillinen.
- Feature branch → PR → merge.
