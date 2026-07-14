# CODE — ALOITUSOHJE: P2 (2.2 pelipaikkafundamentit + 2.3 välitavoitteet)

**Tyyppi:** esityskerroksen täydennys (mekaaninen). **Kohde:** `TalentMaster_VP_v25.html`.
**Tausta:** `docs/CODE_OHJE_IDP_TILANNE_JA_SEURAAVAT.md` + `docs/CODE_BRIEF_IDP_KORTTI_AUKOT.md` §2. Design: `docs/design/idp-kortti/IDP-kortti.dc.html`.
**Periaate:** mitään ei pakoteta, asiantuntija päättää; puuttuva = pehmeä vihje, ei tallennusestoa.

**Valmis & merged (älä tee uudelleen):** 1a (#166/#167), 1b (#169), P0 z-index (#171), P1.2 radar-normi (#173). P1.1 (5D 5/5) oli jo VP_v25:ssä.

**HUOM — saatavuus-chip (2.1) EI kuulu tähän.** Se lykättiin (ks. alla §"Saatavuus-kerrokset"). Tämä paketti = **vain 2.2 + 2.3.**

---

## 2.2 · Pelipaikkafundamentit (sisältökerros, U14+)

Pelipaikkakohtainen **cue / harjoite / kpi per rooli**. Rakenne on jo olemassa — käytä `TM_TT_PELIPAIKAT` (pelipaikkakoodi → `.nimi`) ja olemassa oleva VPTT-`vaihe:'pelipaikka'` -fundamenttikäsittely (ryhmä "Pelipaikka: …"). Älä rakenna uutta datamallia — täytä ohut sisältö ja nosta se korttiin/relevanttiin näkymään.

- Näytä vain kun pelaajalla on pelipaikka asetettu JA ikävaihe U14+ (ehdotus, ei pakotus).
- Puuttuva pelipaikka / tyhjä sisältö = haalea vihje ("pelipaikka asettamatta"), ei virhe.
- DS-tokenit, molemmat teemat.

## 2.3 · Välitavoitteet-porras (narratiivijärjestys)

`_vpValitavoitteetHTML(t, pid)` **on jo olemassa** (I3a §C.2, additiivinen `t.valitavoitteet[]`). Tehtävä = **nosta se IDP-narratiiviin oikeaan kohtaan**: Kausitavoite → **välitavoitteet** → Jaksofokus.

- Additiivinen: tyhjä `valitavoitteet` → kortti toimii kuten ennen (ei porrasta).
- Lisää/poista jo toteutettu (`_vpVtLisaa`/`_vpVtPoista`) — älä duplikoi, kytke olemassa olevaan.
- Puuttuva = pehmeä vihje, ei estä.

---

## Saatavuus-kerrokset (KIRJATTU tulevaa varten — ÄLÄ rakenna nyt)

Saatavuus-status EI ole fysioterapeutti-lukittu. Kaksi erillistä kerrosta:
1. **Operatiivinen saatavuus-status** (saatavilla / rajoitettu / poissa) — "voiko pelaaja harjoitella/pelata nyt." Kirjoittaja **VP/valmentaja**, joka seurassa. Ei lääketieteellistä detaljia. → tämä on chipin (2.1) oikea koti kun se rakennetaan; **ei riipu fysioterapeutista.**
2. **Kliininen detalji + kuntoutusprotokollat** (diagnoosi, HPP, `phv_ok`) — Art. 9 -terveystieto → `terveys/`-alikokoelmaan. Kirjoittaja fysioterapeutti / kliininen rooli. **Valinnainen** (§4-visio) — olemassa vain jos seuralla on tekijä.

Kun chip aikanaan tulee: writer = VP/valmentaja oletuksena, fysioterapeutti lisäkirjoittajana. Seura ilman fysioterapeuttia saa silti saatavuus-statuksen; vain kuntoutus-integraatio jää §4:ään.

---

## Reunaehdot
- **Alaikäiset:** Eino · Leo · Emil = read-only. **Topias Koskela = testi-OK.**
- **GDPR:** terveys → `terveys/`-alikokoelmaan, ei vapaatekstiin/pisteisiin.
- **Cache:** lib muuttuu → bumppaa `?v=N`. (2.2/2.3 todennäköisesti vain VP_v25.html → ei bumppia.)
- **Firestore-säännöt:** ei odoteta muutosta (esityskerros). Jos tarvitaan → PR→N4-CI.
- DS-tokenit, molemmat teemat, kaikki pehmeää.

## DoD
1. 2.2 ja 2.3 renderöityvät molemmissa teemoissa (screenshot molemmista).
2. Ei uutta taulua/moottoria; kytke olemassa oleviin (`TM_TT_PELIPAIKAT`, `_vpValitavoitteetHTML`).
3. Tyhjä data = pehmeä vihje, tallennus onnistuu silti.
4. Vitestit vihreinä. Pieni stackattu PR, kuvaus linkkaa tähän ohjeeseen.
