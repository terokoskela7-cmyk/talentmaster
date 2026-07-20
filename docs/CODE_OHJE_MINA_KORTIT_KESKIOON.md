# CODE — MINÄ-välilehden kevennys: kortit keskiöön + kokoontaittuvat teemat

**Tyyppi:** UI-uudelleenjärjestely (kuluttaja, Pelaaja_v7) + korttikatalogin laajennus (data). **Ei Rules-/skeemamuutosta** MINÄ-osalta.
**Kohde:** `TalentMaster_Pelaaja_v7.html` (MINÄ = `rMina()` + osiot) · `docs/KORTTI_KATALOGI.md` (legenda-tier).
**Design-totuus:** `docs/mockups/idp_mina_kevennys.html` (tämä mockup) + olemassa oleva `docs/fifa_kortti_mockup_v3.html` + `docs/KORTTI_KATALOGI.md`.

## Miksi
MINÄ pinoaa **16 raskasta korttia** perakkain (~3 nayttoa desktop / 5+ puhelin, mitattu; 4 pelkkia "tulossa"-tynkia). Samalla **pelaajan kortit ovat TalentMasterin ydin** (kerily + kehittyva paakortti), mutta ne hukkuvat listaan. Tavoite: **nosta kortit keskioon ja kevenna muu niiden ymparilta** (progressive disclosure). **ALA rakenna korttijarjestelmaa uusiksi — se on jo olemassa** (`naytaFcOverlay`, `KORTTI_KATALOGI`, `rMinaKokoelma`, flip). Tama integroi ne.

## A. Kehityskortti heroksi
- MINAn karkeen (profiilin tilalle/yhteyteen) **pelaajan nykyinen kehityskortti kompaktina** — tier-adaptoitu (🔵 Kortti rakentuu → 🟡 Sharp → ⬛ Elite), OVR + 5D-statit (lukitut 🔒), traits, idolirinnastus. **Napautus avaa taydeen kortin: olemassa oleva `naytaFcOverlay()` + flip ("Miksi 79?")** — ala tee uutta korttia.
- Korvaa nykyinen stub `rMinaKortti` (`_rMinaStub('Pelaajasi kortti')`) talla hero-renderilla (kompakti kortti + avaus-overlay).
- **§7.22 / ikaadaptio sailyy:** U16–19 OVR + statit; U13–15 / nuoremmat = kehitysmerkit, "kortti rakentuu", ei kovia lukuja.

## B. Korttikokoelma-nauha heron alle
- **Vaakascrollattava nauha** heti heron alla (`rMinaKokoelma` + `KORTTI_KATALOGI`). Rarity-tasot visuaalisesti eroteltuina:
  - **★ Legenda** — FUT-premium tayskortit (esim. "Tekniikka-legenda", "Kuin Bellingham" idolikortti). Loistava kulta-ilme.
  - **◆ Harvinainen** — esim. 💎 Piilohelmi (§28-mitali) · ★ X-Factor.
  - **● Merkki** — 🔥 liekki, 🎂 synttarisankari, ensi-mittaus, oma ennatys.
  - **Lukittu** — nayttaa **avautumispolun** ("tekn. kulta → Nopeus-legenda") = tavoittelun koukku.
- Edistyma otsikkoon ("12 / 30 · uusi! 🔥"). Ansaitut loistavat, lukitut himmeita. Paljastus = positiivinen pack-open-hetki (ei gacha/maksu, KORTTI_VISIO §10).

## B2. Laajenna KORTTI_KATALOGI: legenda-tier
`docs/KORTTI_KATALOGI.md`:iin **uusi rarity-taso "Legenda"** samalla datavetoisella mallilla kuin nykyiset kortit (ansaintaehto + lahde-pikakentta + ikavaihe-saanto + rarity):
- Esim. `legend_tekniikka` — ansainta: `tki_merkki` = kulta → "Tekniikka-legenda" (FUT-premium). `legend_nopeus` — nopeus taso 5 → "Nopeus-legenda". Idolikortit (`idol_*`) idolirinnastuksesta.
- **EI kovakoodattua UI:hin** — rekisteri kuten muutkin. §7.22: ansainta omasta tekemisesta/kehityksesta, ei vertailusta.

## C. Loput osiot → 5 kokoontaittuvaa teemaa (accordion)
16 osiota ryhmitellaan; **hero + kokoelma nakyvissa, muu kokoontaitettuna:**
1. **🎯 Sinun matka** (auki oletuksena) — tavoite · jaksofokus · sitoumus.
2. **⚡ Taidot & keho** — tekniikka · fyysinen · MAS · kehitysvaihe · konseptifokus.
3. **💬 Fiilis & hyvinvointi** — itsearvio · FLEI · (varattu paikka kuorma-/palautumislinjalle; GDPR: ei sairaus-/vammasyyta nakyviin).
4. **🏅 Edistyminen** — streak · testit · ennatykset. *(Kortit & kokoelma ovat ylhaalla, eivat tassa.)*
5. **⚙️ Asetukset** — kieli · ilmoitusasetukset (opt-out/hiljaiset tunnit) · teema · ulos.

**Accordion-vaatimukset:**
- Kiinni-rivi = ikoni + teal-eyebrow + serif-otsikko + **1 rivin datavetoinen tiiviste** + chevron. Ei raskasta korttia kiinni-tilassa.
- **Toimintapiste** (amber •) otsikkoon kun ryhmassa on tehtavaa (esim. itsearvio tekematta) → pelaaja avaa sen kaikkea avaamatta. Auto-avaa halutessa.
- **Muista auki/kiinni-tila** (sessio).
- **Tyhjat osiot piiloon kokonaan** kunnes niissa on sisaltoa (ei "tulossa"-kortteja).
- **Saavutettavuus:** napautusalue ≥44px, `aria-expanded`, chevron-affordanssi.

## IA-reunat
- Kalenteri / Seuran aikataulu / RSVP / logistiikka / pelaajaviesti pysyvat **TANAAN**-valilehdella.
- 🔔 Ilmoitukset = **top-level kello** (c.4a), ei MINA-ryhma; notif-opt-out = Asetukset.
- Talent-signaalit / X-Factor / percentiilit / vertailut = **vain valmentaja/VP** (§7.22).

## Reunaehdot & DoD
- Ei Rules-/skeemamuutosta MINA-kevennykseen; katalogi-legenda = additiivinen data. Molemmat teemat. Demo-polku ennallaan.
- **DoD:** (1) hero-kehityskortti karjessa, napautus avaa `naytaFcOverlay`+flip; (2) kokoelma-nauha rarity-tasoin avautumispolkuineen; (3) 5 kokoontaittuvaa teemaa toimintapistein + tilamuistilla + tyhjat piilossa; (4) katalogiin legenda-tier datavetoisesti; (5) ika/§7.22-adaptio; 790 vitest vihrea; 0 konsolivirhetta; molemmat teemat. Keskikokoinen–iso PR (voi jakaa: A+C kevennys / B+B2 kokoelma-legendat).
- **Verifioi live (Topias):** MINA ~1 nayttö oletuksena; kortti karjessa avautuu; kokoelma nakyy; ryhmat avautuvat/muistuvat.
