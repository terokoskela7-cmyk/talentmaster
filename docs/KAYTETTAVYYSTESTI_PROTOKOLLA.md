# Käytettävyystesti — valmentajan kehityssilmukka (1–2 valmentajaa, oikea data)

> 2026-06-22 (Tero). Tavoite: **validoida koko rakennettu silmukka oikeilla käyttäjillä ennen lisäkehitystä** (3A/3B/N2).
> Testattava: harjoitusarviointi (A/B) · reflektiopäiväkirja + ääni · saatu palaute + notifikaatiot · oma kehitys + kalibraatio · CPD · mobiili.
> Menetelmä: **moderoitu tehtäväpohjainen testi**, think-aloud. 1–2 pilottivalmentajaa (mielellään eri lisenssitaso/ikäluokka). Kesto ~45 min.

---

## 1. ENNEN TESTIÄ (valmistelu)

- **Osallistuja:** oikea pilottivalmentaja (esim. SJK), oma tili + oma joukkue + oikea(ish) data. Jos data ohut → osa tehtävistä paljastaa tyhjätilan (tärkeää nähdä!).
- **Laite:** **tee vähintään tehtävät 1–2 puhelimella** (äänireflektio on kentän laidalla -käyttö) + loput läppärillä/puhelimella.
- **Suostumus:** kerro että nauhoitat *ruudun/äänen havainnointia varten* (ei pelaajadataa), ja että tämä on työkalun testi — ei valmentajan arviointi.
- **Moderaattorin rooli:** anna tehtävä, **älä neuvo**; pyydä ajattelemaan ääneen ("mitä etsit nyt? mitä odotit tapahtuvan?"). Kirjaa havainnot, älä puolusta tuotetta.

## 2. TEHTÄVÄT (skenaariopohjaiset — ei klikkausohjeita)

> Anna skenaario, ei "paina X". Mittaa löytääkö käyttäjä itse.

| # | Skenaario (sano ääneen osallistujalle) | Mitä validoidaan |
|---|---|---|
| T1 | "Pidit juuri harjoituksen. Arvioi se järjestelmässä." | "Arvioi harjoitus" -löydettävyys · malli A/B -valinnan selkeys · **kriteerien ymmärrettävyys** (0–10 / % / "pallokosketukset 1=100") · tallennus |
| T2 | "Tee nopea ääni­reflektio tästä harjoituksesta — mikä meni hyvin, mitä tekisit toisin." | Reflektiopäiväkirjan löytäminen · **nauhoitus puhelimella** (nappi, ajastin, esikuuntelu) · litteroinnin ymmärrys |
| T3 | "Saitko valmennuspäälliköltä palautetta? Etsi se." | **Notifikaatiokello/badge huomataan** · "Saatu palaute" · jaetun palautteen löytäminen |
| T4 | "Miten olet kehittynyt valmentajana tällä kaudella?" | Omat trendit · **kalibraation ymmärrys** (itsearvio vs havainnointi — kokeeko sen myönteisenä vai tuomiona?) |
| T5 | "Paljonko sinulla on CPD-tunteja kasassa?" | CPD-todisteen löytäminen + ymmärrys · vaatimus-vertailu (jos asetettu) |
| T6 (jos VP mukana) | "Menet katsomaan valmentajan harjoitusta. Tee havainnointi ja anna palaute — osa valmentajalle, osa vain itsellesi." | Coach-kortilta aloitus · jaettu/yksityinen-palautteen ero on selkeä · paritus-ehdotus |

**Per tehtävä kirjaa:** onnistuiko (✅ itse / 🟡 vihjeellä / ❌ ei) · aika · mihin jumiutui · sanatarkat hämmennyskohdat ("missä tää on?").

## 3. TESTIN JÄLKEEN (debrief + mittarit)

**Pikamittarit (1–5):** helppokäyttöisyys · "tekisinkö tätä oikeasti viikoittain?" · luottamus dataan · äänireflektion hyödyllisyys.
**Avoimet:** Mikä oli hämmentävintä? · Mitä jäit kaipaamaan? · Käyttäisitkö tätä puhelimella kentällä? · Tuntuiko kalibraatio/oma-kehitys kannustavalta vai arvostelevalta? (§7.22-validointi!) · Yksi asia jonka muuttaisit.

## 4. ASIANTUNTIJA-ENNAKKOTARKISTUS (moderaattorin watch-lista — todennäköiset kitkakohdat)

1. **Tyhjätilat / ensikäyttö.** Uudella valmentajalla ei dataa → näkyykö "Valmentajana kehittyminen" / dashboard ohjaavasti ("tee ensimmäinen itsearvio") vai tyhjänä/sekavana? (Aiemmin merkitty tarkistettavaksi.)
2. **Löydettävyys.** Onko "Arvioi harjoitus" + notifikaatiokello ilmeisiä? Mobiilissa hampurgerin takana?
3. **Kriteerien kieli (malli A).** "Pallokosketukset 1=100", "liikkeessä %" — ymmärtääkö ilman selitystä? (Palloliitto-tutuille ok, varmista.)
4. **Kalibraation sävy (§7.22-kriittinen).** Kokeeko valmentaja "itsearvio vs havainnointi -kuilun" kasvuna vai arvosteluna? Tämä on tuotteen ydinlupaus — validoi.
5. **Mobiilinauhoitus.** Slide-in-nav + ≥44 px napit tuntuvatko kentällä (märät kädet, kiire)? Animaation pehmeys.
6. **Litteroinnin odotus.** Ymmärtääkö että ääni lähetetään litteroitavaksi (GDPR-info), ja onko viive siedettävä?

## 5. TULOSTEN KÄSITTELY

- Priorisoi löydökset: 🔴 estää tehtävän · 🟡 hidastaa/hämmentää · 🟢 kosmeettinen.
- 🔴/🟡 → korjauskomennot Codelle ennen 3A/3B/N2. 🟢 → backlog.
- Päivitä `docs/MUUTOSLISTA` + tämä silmukka on "käyttäjävalidoitu" ennen kuin rakennetaan lisää.

> **Periaate:** 2 valmentajaa riittää paljastamaan suurimmat kitkakohdat (Nielsen: ~5 käyttäjää löytää ~85 %, mutta 1–2 löytää jo karkeimmat). Tavoite ei ole tilasto vaan "toimiiko silmukka oikeassa kädessä".
