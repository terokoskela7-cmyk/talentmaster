# CODE — Kortti: ÄLY-taso 4 korjaus + TEK-rivin kehitysteksti (kääntöpuoli)

**Tyyppi:** Copy-korjaus (rubriikki) + UI (kortin kääntöpuoli, olemassa olevan tekniikkalogiikan uudelleenkäyttö). **Ei Rules-/skeemamuutosta.**
**Kohde:** `lib/tm_adar_rubriikki.js` (A) · `TalentMaster_Pelaaja_v7.html` → `naytaFcOverlay` kääntöpuolen `bar()` TEK-haara (B).
**Jatkoa #246:lle.**

## OSA A — ÄLY-taso 4 vastaamaan oikeaa ADAR Re-assessia

**Ongelma:** `tm_adar_rubriikki.js` taso 4 kirjoitettiin *ennakoinniksi* ("Ennakoit ja korjaat jatkuvasti 🔄 / Lue peliä koko ajan — säädä paikkaasi ennen kuin palloa tarvitaan"). Mutta pelihavainto-työkalun (ADAR_Pikakortti) neljäs ulottuvuus **Re-assess = virheestä palautuminen / resilienssi** (<15 s toipuminen, ei jähmety virheen jälkeen; Duckworth-pohja). Taso 4 kuvaa siis väärää asiaa.

**Korjaus:** vaihda TASO 4:
```
4: { nimi: 'Virheestä palautuminen',
     nyt: 'Palaudut virheistä nopeasti 🔄',
     askel: 'Virhe ei jää päähän — palaa peliin heti ja tee seuraava ratkaisu.' }
```
- **Tasot 1–3 ja 5 ennallaan** (1 Assess/havainto ✓, 2 Decide/päätös ✓, 3 Act/toteutus paineessa ✓, 5 huippu ✓ — täsmäävät jo malliin).
- Sävy lapsen kielellä, §7.22 (oma taso + oma askel).

## OSA B — Kortin TEK-rivi näyttää kehitystekstin (ei pelkkää "taso X/5")

**Puute:** kortin kääntöpuolella TEK näyttää geneerisen "Nyt taso 4/5 · seuraavaan: taso 5/5". ÄLY sai jo rikkaan kuvauksen (#246) → TEK erottuu köyhänä. Tekniikalle on **jo valmis pelaajateksti** (Tekniikkaprofiili MINÄssä).

**Korjaus:** kortin kääntöpuolen `bar()` **TEK-haara** (rakentaja/leikkija) käyttää olemassa olevaa **jaettua apufunktiota** — SAMA kuvio kuin ÄLY käyttää `TM_ADAR_RUBRIIKKI`:a:
- Käytä **`_tekTavoiteSaate(p)`** (itsenäinen, pikakenttä-vetoinen, jo käytössä päivän tehtäväkortissa `_dKortti`) → "Seuraava askel: <laji> (nyt X s → tavoite Y s)". TAI ekstraktoi `_minaTavoiteRivit`:n ⭐/🎯-logiikka (Vahvuutesi `p.tki_vahvuus` + Seuraava askel `p.tki_kehityskohde` + tavoite `_minaValitavoite`) pieneen dataa-palauttavaan helperiin jota sekä MINÄ että kortti käyttävät. **Älä kahdenna copya — yksi lähde.**
- Näytä esim.: "**Vahvuutesi:** Kuljetus-laukaus · **Seuraava askel:** Syöttö (44.1 s → 41 s)". Tasonumero toissijainen.
- **Fallback:** jos tekniikkadataa ei ole (`tki_vahvuus`/`tki_kehityskohde`/laji-ajat puuttuvat) → pehmeä paluu nykyiseen geneeriseen "taso X/5".
- **§7.22:** oma vahvuus + oma seuraava askel + kriteeritavoite (ei vertailua muihin). "Matka pronssiin" -tyyli on jo pelaajalle näkyvissä Tekniikkaprofiilissa → yhdenmukainen.
- **Tyyli kortin puolella:** `_minaTavoiteRivit` emittoi MINÄ-tyylejä; joko käytä `_tekTavoiteSaate`:n pelkkää tekstiä ja tyylitä FUT-kortin puolella, tai palauta data ja renderöi kortilla. **Pidä TEK-teksti tiiviinä (~1–2 riviä).**

## KRIITTINEN reunaehto (clippaus)
Kääntöpuoli (`fc-back`) on sama kiinteä 470px kuin etupuoli (`overflow:hidden`). Nyt ÄLY on jo monirivinen; TEK:n muuttuessa moniriviseksi **kääntöpuoli voi ylivuotaa**. **Varmista ettei kääntöpuoli leikkaudu** (kaikki 5 riviä + otsikko + footer mahtuvat 470px:ään). Jos ei mahdu, tiivistä TEK/ÄLY-tekstit yksiriviisiksi tai pienennä välejä — **ei venyttämällä korttia**.

## Reunaehdot & DoD
- Ei Rules-/skeemamuutosta. Kuluttaja-render, read-only. #246 (ÄLY) + tasomalli/clippaus ennallaan. Skope TEK + ÄLY; muut osa-alueet (FYS/PSY/SOS) geneerisiä toistaiseksi.
- **DoD A:** ÄLY taso 4 → "Palaudut virheistä nopeasti 🔄 · Virhe ei jää päähän — palaa peliin heti…". Tasot 1–3,5 ennallaan.
- **DoD B:** kortin TEK-rivi (rakentaja/leikkija) näyttää Vahvuutesi + Seuraava askel + tavoite jaetusta tekniikkalähteestä (ei pelkkää "taso X/5"); fallback geneeriseen jos ei dataa; yksi lähde (ei kahdennettua copya).
- **DoD clippaus:** kääntöpuoli mahtuu 470px:ään (TEK + ÄLY monirivisinä), ei overflow-leikkausta — verifioi Topias (U13).
- 790 vitest vihreä, 0 konsolivirhettä.
- **Verifioi live (Topias):** kääntöpuoli → TEK "Vahvuutesi: … Seuraava askel: … (X s → Y s)", ÄLY taso 4 (jos osuu) uusi teksti; mikään ei leikkaudu.
