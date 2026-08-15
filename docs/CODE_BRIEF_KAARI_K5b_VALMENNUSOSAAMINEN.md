# Kehityskaari K5b — Valmennusosaamisen kaari: havainnointi kalibroituu VP:hen (CPD) · Code-brief

> **Miksi (Teron laajennus):** Sama Kehityskaari-komponentti, mutta **kehittyvä henkilö = valmentaja.** Näytä miten valmentajan
> **pelihavainto-osaaminen kehittyy ajassa** ja **kalibroituu VP:n näkemykseen** — valmennusosaamisen kehittäminen (CPD) + VP mentoroi.
> **KV-pohja:** ICCE International Sport Coaching Framework -funktiot "read & react to the field" + "learn & reflect" + inter-rater-reliability.
> **Perusta on jo olemassa:** havainnot kantavat `tekija_uid` + `tekija_rooli` + `pisteet{a,d,ac,r}` (per arvioija); `tmAdarKonsensus` tuottaa
> `yhtenevyys`/`yhtenevyysTaso`; `renderKalib` (VP kalibraatio) olemassa. **Puuttuu vain AIKA-ulottuvuus per valmentaja.**
> **Koskee VP_v25** (valmentajan CPD-näkymä + VP:n kalibraatio-cockpit). Reuse `tmAdarKonsensus` + `tmKehityskaari`. Ei `?v`.

## ⚑ YDININVARIANTTI — KEHITTÄVÄ, EI RANKAISEVA (Teron eksplisiittinen vaatimus)
Tämä on **aikuisen ammatillista kehittymisdataa**, ei suoritusarvostelua. Toteutus EI saa muuttua valvontatyökaluksi:
1. **Poikkeama VP:hen ≠ "valmentaja väärässä".** VP voi olla väärässä. Ero on **kalibraatiokeskustelun avaus**, ei virhe. Sanamuodot kehittäviä.
2. **Korkea yhtenevyys ≠ automaattisesti paras.** Paras valmentaja voi nähdä jotain mitä VP ei → poikkeama voi olla oikeassa. **EI implisiittistä rankingia**, ei tulostaulua, ei "paremmuusjärjestystä".
3. **§37 roolit:** valmentaja näkee **oman** kaarensa (itse-CPD); VP näkee sen **mentoroinnin pohjaksi** (ei kurinpito). §7.22 ei koske (aikuinen), mutta sama **arvostava kehys**.
4. **Ei "pelaa mittaria" -kannustinta:** kehys ei saa palkita VP:n arvaamisesta rehellisen pelin lukemisen sijaan → mittari = keskustelu, ei portti/palkkio.

## CODE-SÄÄNNÖT
- **Poikkeama = ilmoita ENNEN.** Reuse `tmAdarKonsensus` (`yhtenevyys`) + `tmKehityskaari` + `renderKalib`-sijainti. **Älä koske:** konsensuslaskentaan · pelaajan ADARiin · muihin kaariin.

## MUUTOS 1 — pure-fn `tmValmennusKaari(havainnot, { vpUid })` (per valmentaja, ajassa)
Kolme dimensiota, kaikki **johdettuna samasta havaintodatasta** (arvioija + rooli + pvm):
- **Havainnointi (kattavuus):** # havaintoa · # pelaajaa · # dimensiota per aikaikkuna → aktiivisuustrendi (systemaattisen havainnoinnin tapa).
- **Kalibraatio (ydin):** kullekin valmentajan havainnolle vertaa **VP:n arvio** samasta pelaajasta+dimensiosta+ajankohdasta → `|valmentaja − VP|`. Keskipoikkeama ajassa.
  **Ankkuri:** VP ensisijainen; **monen valmentajan konsensus fallback** kun VP:tä ei ole (reuse `tmAdarKonsensus`). `pienempi_parempi = true` (kaventuva = paraneva).
- **Reflektio:** kuinka usein valmentaja palaa/päivittää arvionsa (learn & reflect) → trendi.
- **Datataso-vartija:** <2 kautta/ikkunaa → lähtöpiste.

> **⚠ Datan saatavuus (sama kuin K5a — tarkista ENNEN):** vaatii **kaikki havainnot pvm:llä + arvioija_uid + tekija_rooli**. Jos vain "uusin per uid" säilyy → tarvitaan raakahavaintojen historia/snapshot. **Ilmoita ENNEN.**

## MUUTOS 2 — Valmentajan oma CPD-näkymä (`tmKehityskaari`, "henkilö"=valmentaja)
Valmentajan Itsearvio/reflektio/CPD-alueelle: kolme dimensiotrendiä (design-kartta Track B).
- **Kehittävä sanamuoto:** "Kalibraatiosi VP:hen kaventuu — yhteinen kieli tarkentuu", EI "virheesi vähenevät".
- Kalibraatio-kortti näyttää **valmentaja × VP -lähentymisen** (kaksi lähestyvää viivaa) — ei absoluuttista "oikein/väärin".

## MUUTOS 3 — VP:n kalibraatio-cockpit (`renderKalib` / valmentajien johtaminen)
VP näkee joukkueensa valmentajien **kalibraatiotrendit** (per valmentaja: yhtenevyystaso + suunta) → tietää kenet mentoroida.
- **EI rankinglistaa paremmuusjärjestyksessä.** Näytä yhtenevyystaso (korkea/keskiverto/matala) + suunta + "mentoroi →" -kutsu, EI numeroituna paremmuutena.
- Uusi valmentaja (vähän dataa) → "kalibraatio kertyy", ei "huonoin".

## INVARIANTIT + DoD
- **⚑ Kehittävä, ei rankaiseva** (yllä): ei rankinglistaa · poikkeama ≠ virhe · korkea yhtenevyys ≠ automaattisesti paras · kalibraatio = keskustelu. **Verifioi sanamuodot + ettei synny paremmuusjärjestystä.**
- **KV-pohja:** dimensiot ISCF-funktioista + inter-rater-reliability. Reuse `tmAdarKonsensus` `yhtenevyys`.
- **§37:** valmentaja näkee omansa; VP mentoroi. Aikuisdata (ei §7.22-lapsisuojaa, mutta arvostava kehys). **Johdetaan raakadatasta** (ei uutta kirjausta).
- **Datataso:** <2 ikkunaa → lähtöpiste, ei keksittyä trendiä. **Brändi §5:** teal/neutraali, 0 pinkkiä, molemmat teemat.
- **LIVE:** valmentaja jolla ≥3 kautta havaintoja + VP-arvioita → 3 dimensiotrendiä · kalibraatio kaventuu -kortti · VP-cockpitissa per-valmentaja yhtenevyys + "mentoroi" (EI rankinglista) · kehittävät sanamuodot · uusi valmentaja → "kertyy". Molemmat teemat. Vitest + eslint vihreä. Ei `?v`.

## EI TÄSSÄ
- Automaattiset mentorointi-suositukset / CPD-sisältö. Valmentajan muut kompetenssit (vain havainnointi/kalibraatio/reflektio tässä).
