# CODE BRIEF · S2b — Valmentajan Tänään (mockup 26 §2) · Master_v16

**Kaista: Tero** (Master_v16, `lib/`, Rules). PR-kuvauksen ensimmäinen rivi: "Kaista: Tero".
**Miksi:** VP:n Koti on uusittu (S2, #955). Valmentaja on silmukan pääkäyttäjä (D128 "valmentaja ensin"), mutta Masterin aloitusnäkymä on vanha. Sama visuaalinen kieli ja sama data valmentajan omille joukkueille.
**Design (SSOT):** `docs/design/idp-v2/26_asiat_viestit_kalenteri.html` §2 "Valmentajan Tänään" (puhelin ensisijainen, 390 px) + komponentit 22:sta (`lib/tm_kt_komponentit.js`, jo jaettu). Joukkuerivi kuten 23. Briiffin `CODE_BRIEF_S2_KOTI.md` osio **"Design — tarkka toteutus"** pätee sellaisenaan (samat komponentit, tokenit, fontit, kuvavertailu, poikkeamataulukko).
**Aloitus:** S2 PR 2:n mergen jälkeen (käyttää samaa kuittausmallia). Valmis viimeistään 1.12.

## Mitä tehdään (vaihe 1, ennen Asia-kokoelmaa)
Masterin "Tänään"-työtila (nykyinen aloitusnäkymä) korvataan Kenttä-lipun seuroilla 26 §2:n rakenteella. Ilman lippua ennallaan (snapshot-testi).

1. **Otsikkorivi:** joukkueen nimi (Cormorant) + valmentajan nimi ja rooli. Usealla joukkueella valitsin; valinta muistetaan (localStorage try/catch). Ryhmät eivät ole tässä (D136, R1).
2. **Lead:** `eb` "Pe 9.10. · vk 41" + iso lause "N asiaa avoinna." + pieni "M palaa myöhemmin." Tauot puuttuvat vielä (R1), joten ei taukotekstiä.
3. **Asiat-lista** (`.ev.asia`, enintään 3 avointa + "+N muuta"): lähteet vaiheessa 1
   - **Signaali:** joukkueen D73-signaalit `kooste_joukkue/{jid}_{vk}`:sta (Rules sallii jo valmentajan lukea oman joukkueensa).
   - **Viesti:** VP:n lukematon viesti valmentajalle (olemassa oleva `viestit`, Rules v3.39), kortti avaa nykyisen viestiketjun.
   - **Jakso:** katselmusikkuna tai jakso päättymässä (`tm_tanaan_signaali.js`, sama logiikka kuin kehitystyöpöydällä).
   - Kortti: `eb` (lähde + päivä) · `src`-chip · otsikko Cormorant · perustelu · yksi täytetty nappi + "Kuittaa…".
   - **Sävy roolin mukaan** (A-kierroksen linjaus): valmentajalle "kun ehdit", ei myöhästymispäiviä eikä punaista.
   - Valmentaja näkee oman joukkueensa pelaajien nimet perustelussa (henkilökunta, oma joukkue), VP:n Kodissa ei.
4. **Kuittausdialogi (D129):** "Miten jatketaan?" · Hoidettu · Palaan päivänä (Huomenna / ma / valitse) · Palaan, kun (seuraava katsaus / testipäivä / katselmukset) · Ei koske + yksi lause. Oletus "seuraavan katsauksen jälkeen". Alarivi: "VP näkee: …".
5. **Palaa myöhemmin** -lista (`.vr`-rivit, "Nyt"-nappi palauttaa avoimeksi) ja **Hoidettu tällä viikolla** -haitari.
6. **Mobiili 390 px ensisijainen**, ei vaakavieritystä.

## Tallennus — sama dokumentti kuin VP:n kuittauksessa
- S2 PR 2:n `seurat/{s}/toimenpiteet/pulssi_{signaali}_{joukkue}` laajennetaan: `tila: 'avoin'|'sovittu'|'hoidettu'|'ei_koske'`, `palaa: { tyyppi: 'pvm'|'ehto', pvm, ehto }`, `ei_koske_syy`, `omistaja: { rooli, uid }`, `historia: [{ tila, kuka, aika ISO }]`. Sama dokumentti = VP ja valmentaja näkevät saman tilan.
- **VP:n Koti noudattaa D128:aa:** valmentajan "sovittu"-asia ei näy VP:n Tarvitsee huomiota -listassa ennen paluupäivää; "ei koske" näkyy VP:lle syyn kanssa Tilanteessa, ei Kodissa.
- **Rules (seuraava versio):** valmentaja saa luoda ja päivittää `toimenpiteet`-dokumentin vain, kun `tyyppi == 'pulssi'` ja `joukkue in valmentajanJoukkueet(seuraId)`; kentät rajattu yllä oleviin. Rules-testit: oma joukkue ✓, toinen joukkue ✗, ei-pulssi-tyyppi ✗, VP ennallaan ✓.
- Viesti- ja jaksokorttien kuittaus samaan malliin (`pulssi_viesti_{viestiId}`, `pulssi_jakso_{jid}_{jaksoId}`).

## Ei tässä (vaihe 2, R1 tammikuu)
Asia-kokoelma ja ketju (D127, D130) · eskalaatio 7 pv VP:lle (D128 automaattinen nosto) · "+ Muistiinpano" (oma asia) · tauot (D131) · Viikko/Viestit/Kalenteri-välilehtien uudistus. Vaiheen 1 dokumentit siirretään Asioiksi skriptillä R1:ssä (kentät valittu niin, että siirto on suora).

## Testit
- Lista: signaali/viesti/jakso oikeista lähteistä, enintään 3 + "+N", vain omat joukkueet.
- Kuittaus: neljä vaihtoehtoa kirjoittavat oikeat kentät; "sovittu" palaa oikeana päivänä / ehdon täyttyessä; "Nyt" palauttaa.
- D128: valmentajan "sovittu" piilottaa signaalin VP:n Kodista paluupäivään asti (VP-sandbox-testi).
- Sävy: valmentajan näkymässä ei "myöhässä"-, "punainen"- eikä päivämäärälaskuria.
- Lippu pois → Master ennallaan (snapshot). Mobiili 390 px selaintesti.
- Rules-testit (yllä). Koko sarja oletus-TZ:llä ja `TZ=UTC`:llä, raportoi `Test Files` ja `Tests`.
- Kuvavertailu mockup 26 §2 | toteutus Demo FC:n datalla, tumma ja vaalea, 390 ja 1280 (`docs/design/idp-v2/kuvat/26_s2b_*`).

## Demodata
`setup_demo_kehitys.js --vain=pulssi` lisää demovalmentajalle (P14 Demo) kirjautumiskelpoisen roolin vain, jos Tero erikseen pyytää; muuten kuvat sandbox-datalla kuten S2:ssa.
