# KISS-mandaatti — TalentMaster™ sivusuunnittelun laki

> **Laki:** *Jokainen sivu on yksinkertainen oletuksena. Syvyys on aina saatavilla, mutta ei koskaan tyrkytetty.*
> (Palloliiton Head of Talent, 2026: "jokainen sivu tulisi olla yksinkertainen ja halutessaan voi syventää tietoa.")

Tämä on kestävä periaate, ei kertakorjaus. Se koskee **kaikkia** TalentMasterin pintoja (VP, valmentaja, pelaaja, raportit). Referenssi joka jo täyttää lain: **pelaajan IDP-kortti** — etupuoli luetaan ~10 sekunnissa, detalji avautuu syvemmältä.

Design-tokenien ja brändin ainoa lähde säilyy `talentmaster-design-system`-skillissä. Tämä mandaatti ohjaa **rakennetta ja tietotiheyttä**, ei värejä/fontteja.

---

## Seitsemän sääntöä

1. **Yksi työ per sivu.** Sivu vastaa yhteen kysymykseen. Reviewit = "kenet arvioin nyt?". Raportointi = "missä joukkue on menossa + lähetä?". Jos sivu vastaa kahteen, jaa se tai kerrosta.
2. **Yhteenveto ennen tiheyttä.** Ensinäkymä = eyebrow → serif-otsikko → yksi ohjaava lause → ydin. Ei mittaristoseinää ensimmäisenä.
3. **Progressiivinen paljastus.** Näytä top-3 / olennaisin; loput "+N" tai "▸ syvennä" -kerroksen taakse. Yksi asia auki kerrallaan.
4. **Yksi ensisijainen toiminto näkyvissä.** Per rivi/kortti korkeintaan yksi primääripainike; muut ovat toissijaisia tai auki-tilassa.
5. **Raskas analytiikka on syvennys, ei etusivu.** Balanced scorecard / kojelaudat elävät oman sivunsa tai avaajan takana — eivät työnkulun edessä.
6. **Väri on signaali, ei koriste.** Tyyni oletus; väri (amber/red/teal) vain kun se kertoo päätöksestä. Poikkeus erottuu koska tausta on hiljainen.
7. **Ensinäkymä mahtuu ruutuun.** Oletusnäkymän pitää lukeutua kerralla ilman vieritystä raskaan lohkon ohi.

## Vakiosivupatterni

```
[eyebrow]           ← pieni versaali teal, kertoo kontekstin
Serif-otsikko       ← yksi lause, Cormorant, kevyt
Ohjaava lause       ← "aloita näistä…" — kertoo mitä tehdä
─────────────────
YDIN (yksi työ)     ← työlista / fokuskortti — se mitä sivu on varten
─────────────────
▸ Syvennä           ← romahdettu: scorecard, analytiikka, historia
```

## KISS-tarkistuslista (jokainen sivu / PR)

- Avautuuko sivu **yhteen kysymykseen**?
- Onko ensinäkymässä **raskain lohko romahdettuna / omalla sivullaan**?
- Onko **yksi selkeä ensitoiminto**?
- Kestääkö ensivaikutelma ~10 s ilman selittämistä?
- Onko väri vain **poikkeuksissa**?
- Voiko syventää **halutessaan** (ei pakotettuna)?

## Anti-patternit (havaitut)

- **Reviewit avautuu "Tuloskortti 2026/27" -mittaristoon** (4 lohkoa, ~15 mittaria) ennen työlistaa → työ hautautuu. **Korjaus = R1.1 alla.**
- Rivi jossa 5+ visuaalista koodausta yhtä aikaa (korjattu jo cockpitin kaksitasoisella rivillä).

---

## Sovellus: R1.1 · Reviewit avautuu cockpitiin

**Tavoite:** Reviewit noudattaa lakia. Työlista (arviointi-cockpit) ensin; oversight-tuloskortti syvennykseksi.

- **Avausjärjestys:** ensinäkymä = päätös-KPI:t → ohjausbanneri → suodattimet → **työlista**. `renderVPTuloskortti` **ei** enää ylimpänä.
- **Tuloskortti romahdettuna:** oma "▸ Näytä tuloskortti" -avaaja työlistan **alla** (tai siirto Raportointiin R2:ssa — ks. alla). Tila muistetaan istunnon ajan; oletus = kiinni.
- **Ei uutta laskentaa, ei datamuutosta.** Vain lohkojen järjestys + romahdus. `renderVPTuloskortti` ja `renderReviewit`-työlista säilyvät sellaisinaan.
- **Molemmat teemat, molemmat roolit** (valmentaja/VP) — cockpit on jo roolitietoinen (R1).
- **Konsolidointi R2:ssa:** Tuloskortin oversight-mittarit ovat luonteva osa Raportoinnin joukkueälyä. R2:ssa harkitaan siirto sinne kokonaan, jolloin Reviewit jää puhtaaksi työpöydäksi. R1.1 vain romahduttaa; siirtopäätös tehdään R2:ssa.

---

## Out-of-the-box visuaalinen ilme (eksploraatio — brändilukon sisällä)

TalentMaster ei näytä "urheilusovellukselta" vaan editoriaaliselta talent-tuotteelta. Out-of-the-box = **viedään tuo identiteetti pidemmälle**, ei vaihdeta sitä. Kolme suuntaa, kaikki carbon/bone/teal + Cormorant/DM:

**A · "Tänään" — triage-fokuskortti (yksi kerrallaan).** Reviewit avautuu *yhteen* korttiin: se pelaaja jonka review on kiireisin. Iso Cormorant-nimi, yksi päätös, "Kirjaa" / "Ohita → seuraava", pieni "3 jäljellä". Koko lista on syvennys. Radikaalin yksinkertainen, editoriaalinen, erottuva. (KISS viety loppuun asti.)

**B · "Lehti" — editoriaalinen aukeama.** Valtava serif-hero (viikon yksi fokus tai avainluku), runsas tyhjä tila, yksi herokortti + hiljainen indeksi. Nojaa Cormorantin ääneen; erottuu kojelauta-samankaltaisuudesta.

**C · "Hiljainen kojelauta" — poikkeusvetoinen väri.** Lista säilyy mutta riisutaan lähes yksiväriseksi; väri syttyy vain poikkeukseen (matala valmius, myöhässä, itsearvioero). Useimmat urheilu-SaaSit huutavat — hiljaisuus on tässä out-of-the-box.

**Suositus:** yhdistä **C (poikkeusvetoinen väri) aina päällä olevaksi periaatteeksi** + **A ("Tänään"-fokuskortti) Reviewitin avaustilaksi**, "Kaikki"-lista syvennyksenä. Molemmat ovat KISS-natiiveja ja brändinmukaisia. Tämä on eksploraatio — ennen toteutusta rakennetaan mockup ja valitaan suunta; ei mene R1.1:een (joka pysyy turvallisena järjestyskorjauksena).

---

## Yhteenveto

KISS ei ole vähemmän kunnianhimoa — se on kunnianhimoa kohdistettuna: yksi työ, kirkas ensinäkymä, syvyys valittavissa. R1.1 tuo Reviewitin lakiin. Visuaalinen eksploraatio (A+C) on seuraava design-askel kun se hyväksytään.
