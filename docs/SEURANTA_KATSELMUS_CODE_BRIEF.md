# CODE BRIEF — Seuranta · Katselmus (EPPP-työnkulku olemassa olevan päälle)

**Tyyppi:** olemassa olevan **rikastus + reititys** — EI uutta sivua, ei uutta kirjoituslogiikkaa. **Ethos:** out-of-the-box + KISS, "yksi kohde, monta sisääntuloa". **Tausta:** "Reviewit" on jo vahva oversight-cockpit, ja `_vpSuljeJakso`-modaali on jo rikas jakson sulkeminen (itse×VP · kalibraatio · tulos · mitattu delta · seuraava fokus). Kansainvälinen malli (EPPP: monialainen katselmus 4×/kausi · pelaajan ääni · Player Journey) tuodaan **näiden päälle** kehyksenä.

**Design-totuus:** `docs/SEURANTA_KATSELMUS_design_kartta.html` (cockpit + 5-vaiheinen katselmus; molemmat teemat; sanktioitu Topias).

---

## PERIAATE (lue ensin — tämä rajaa skoopin)

1. **RIKASTA, ÄLÄ RAKENNA UUTTA SIVUA.** Katselmus = (a) olemassa oleva **cockpit** (`renderReviewit`/`_vpSeuranta*`) + (b) **rikastettu `_vpSuljeJakso`-sulkumodaali** + (c) **historia** (`jaksofokus_historia` / `_vpMesoKaariHTML`). Cockpitin "avaa katselmus" **johdottaa** sulkumodaaliin kadenssin mukaan. **Ei rinnakkaista editoria eikä uutta ws:ää.**
2. **EI UUTTA KIRJOITUSLOGIIKKAA.** Kirjoitus kulkee olemassa olevien kautta: `_vpSulkuTallenna` (tulos Parani/Ennallaan/Vaihda + itse×VP + kalibraatio + delta + seuraava fokus → `jaksofokus_historia`), `_vpVahvistaSitoumus` (sitoumus), `_jfOhjaa` (fokuksen muokkaus). Katselmus vain **kokoaa ja kehystää** ne.
3. **PELI EDELLÄ TESTI.** Edistymä johtaa pelaamisella: **teknis-taktinen konsepti** (jaksofokuksen `konsepti_nimi`, U13 = `TM_TT_YOUTH`, lähtötaso pelihavainnosta/ADAR) + **D4 peliäly (ADAR)** + **pelipaikkaosaaminen** (`tmTtItems` pelipaikan fundamentit). **D1 fyysinen + D2 tekninen (TKI, suljetut testit) = tukevaa, §28 PHV-portitettua kontekstia** — EI kehityksen kärki. (Huom: teknis-taktinen konsepti ≠ D2 tekninen.)
4. **REHELLISYYS.** Edistymä vain siltä osin kuin historia tallentaa (**konsepti / ADAR / D3 / mitattu delta**) — ei keksittyä 5D-tutkan deltaa. Tyhjät tilat aikuisesti.

---

## TYÖ (vaiheittain, pieninä PR:inä)

**S1 · Reititys + nimi (pieni):**
- Cockpitin katselmusvuoro-rivin "avaa katselmus" → `_vpSuljeJakso(pid)` (kadenssin mukaan; jos jaksoa ei ole umpeutunut, avaa katselmus silti read-tilassa). **Yksi kohde.**
- Nav-nimi "Reviewit" → **"Seuranta"** (koodi käyttää jo `_vpSeuranta*`). Puhdas label-muutos.

**S2 · Rikasta `_vpSuljeJakso`-modaali (`_vpSulkuRender`) EPPP-kehykseen:**
- **① Edistymä — peli edellä:** nosta kärkeen teknis-taktinen konsepti (`jf.konsepti_nimi` + lähtötaso `arviointi_havaittu`/ADAR-pelihavainnosta) · D4 ADAR (`adar_viimeisin`) · pelipaikkaosaaminen (`tmTtItems({ika,positio})`). D1/D2-testit pienempänä kontekstirivinä (§28-portti `onNeutraaliPrePHV`).
- **② Monialainen syöte:** valmentaja-arvio + **pelaajan itsearvio** (jo modaalissa: `_vpSulkuDots`/`arvioItse`) + VP-synteesi. **Fysioterapeutti §4 = paikanpitäjä "tulossa"** — ÄLÄ rakenna (käytettävyysdataa ei ole; §4-visio).
- **③ Pelaajan ääni:** nosta olemassa oleva `s.itsearvio` (q1–q3) + `miksi_pelaan` (`_vpSitoumusHTML`-sisältö) katselmukseen. Read-only (pelaaja kirjoittaa Pelaaja-apissa).
- **④ Tulos + päätös:** **olemassa oleva** sulkulogiikka: Parani/Ennallaan/Vaihda + kalibraatio + seuraava fokus (silta) → `_vpSulkuTallenna`. Lisää sitoumuksen vahvistus (`_vpVahvistaSitoumus`) ja päätös-huomio (kirjautuu historiaan/HoT). "Muuta fokus" → `_jfOhjaa` (ei rinnakkaista editoria).

**S3 · Katselmushistoria:**
- Renderöi `jaksofokus_historia` (via `_vpMesoKaariHTML`) katselmukseen "Player Journey" -lokina: pvm · konsepti · tulos (**Parani/Ennallaan/Vaihda**) · itse×VP. Ei uutta dataa.

---

## INVARIANTIT
1. **Rikastus + reititys, ei uutta sivua/ws:ää** — yksi kohde; cockpit → sulkumodaali.
2. **Ei uutta kirjoituslogiikkaa** — `_vpSulkuTallenna` · `_vpVahvistaSitoumus` · `_jfOhjaa`. Muokkaus kanonisessa editorissa.
3. **Peli edellä testi** — teknis-taktinen konsepti + D4 + pelipaikka johtavat; D1/D2-testit §28-portitettu konteksti. Konsepti ≠ D2.
4. **Rehellinen edistymä** — vain historian tallentama (konsepti/ADAR/D3/delta); ei keksittyä 5D-deltaa; tyhjä = tyhjä tila.
5. **Fysio §4 = "tulossa"** — ei rakenneta ennen §4-käytettävyysdataa. Ei keksittyä saatavuutta.
6. **Pelaajan ääni read-only** katselmuksessa (pelaaja kirjoittaa Pelaaja-apissa). GDPR: terveys erillään (`terveys/`), ei kliinistä dataa katselmukseen.
7. Molemmat teemat · KISS · sanktioitu Topias kirjoitustesteihin.

## HYVÄKSYMISKRITEERI (kolmitasoinen)
- **L1 git-diff:** reititys cockpit→`_vpSuljeJakso`; modaalin rikastus lukee olemassa olevaa (jf-konsepti · ADAR · tmTtItems · itsearvio); ei uutta kirjoituspolkua; fysio §4 vain paikanpitäjä; ei keksittyä 5D-deltaa; nimi-label.
- **L2 testit:** edistymä-koostefunktiot puhtaina (konsepti-nimi + ADAR-luku + pelipaikkakonseptit tmTtItemsistä; tyhjä→tyhjä); historia-mäppäys tulos-sanastolla; suite vihreä, eslint puhdas.
- **L3 live (sanktioitu Topias):** cockpit "avaa katselmus" → sulkumodaali kadenssilla; edistymä johtaa konseptilla (HALTUUNOTTO) + ADAR + pelipaikka, D1/D2 kontekstina; pelaajan ääni näkyy; tulos (Parani/…) + sitoumus + seuraava fokus tallentuvat `jaksofokus_historia`an (olemassa oleva polku); historia renderöityy; molemmat teemat. **Palauta Topias** (poista testijakso-merkintä).

## DoD
1. Reititys + rikastettu modaali + historia toimivat (screenshotit molemmat teemat).
2. Fysio §4 näkyy "tulossa"-tilassa; ei keksittyä dataa.
3. Puhtaat yksikkötestit; suite vihreä; eslint puhdas.
4. Pieni PR (mieluiten S1 reititys/nimi erikseen, S2 modaali, S3 historia); kuvaus linkkaa tähän + `docs/SEURANTA_KATSELMUS_design_kartta.html`.
5. **Älä mergeä** ennen L1-diffiä + L3-liveä.

## SKOOPIN ULKOPUOLELLA
- **Uusi "Katselmus"-sivu/ws** (rikastetaan olemassa olevaa).
- **Fysio §4 -käytettävyyssyöte** (odottaa §4-datapolkua).
- **Täysi 5D-tutkan historia** (ei tallessa; käytä konsepti/ADAR/D3/delta).
- **Uudet mittarit tai kirjoituspolut** (kaikki olemassa olevien kautta).
- **IDP-kortin "pelaaminen helpommin saatavilla"** — erillinen seuraava vaihe (R2-A V3).
