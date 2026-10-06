# TalentMaster — kokonaiskartoitus kohti skaalautuvuutta
Päivitetty 2026-10-06 · Projektipäällikkö: Claude (sparraus), päätökset: Tero, toteutus: Code
Korvaa suunnittelun osalta `docs/ROADMAP.md`:n (kesäkuu 2026, vanhentunut). Tekniset invariantit: CLAUDE.md.

## 1. Ydinmalli — kaksi lähdettä, yksi moottori

Jokainen sisältöpäätös pelaajan päivässä tulee joko TalentMasterin metodologiasta tai seuran omasta linjasta. Sääntö (D3, D16): **TalentMaster ehdottaa, seuran linja kumoaa.** Ohitus tapahtuu kehityskohteen/ketjun tasolla, ei liikkeen nimen tasolla. Kaikessa, mitä pelaaja näkee, on `lahde: 'tm' | 'seura'`.

| Kerros | TM-oletus (nyt) | Seuran linja (tavoite) | SJK:n aineisto | Tila |
|---|---|---|---|---|
| 1 Ikävaiheprofiilit | leikkijä/rakentaja/showcase libissä | `valmennuslinja/ikavaiheet` {ika_min, ika_max, dimensio D1–D5, sisalto[], lahde_viite} | 6 ikävaihetaulukkoa (Snadikerho…16–18) + Nevanlinna F8–B17 | puuttuu |
| 2 Jaksoteemat | ei oletusta | `valmennuslinja/teemat` (yksi dok., jaksot[]) | Nevanlinna dia 45 (viikot, ei pvm) | lukija on, lataaja puuttuu |
| 3 Harjoitepankki T/S/D | `PANKKI` libissä | `harjoitepankki/{id}` | keskivartalo, rutiinit, räjähtävyys | puuttuu |
| 4 Fysiikkaohjelmat | 5 kiinteää teemaa | `ohjelmat` + teema_avain, ika_min/max | 10 ohjelmaa (106 liikettä) | kirjasto on, kentät puuttuvat |
| 5 Pelipaikka-KPI | ei | `arviointikehys/seura` (DESIGN_NOTE_SEURA_OMAT_KPI §3) | 7 pelipaikkaa × 4 × 3 = 84 riviä | data+UI puuttuu |
| 6 Valmennusapuri | VALMENNUSOPAS | `valmennusapuri/seurat/{id}/*.md` | pelaamisen periaatteet | toimii |
| 7 Henkilökunnan ikävaihekonfiguraatio | ei | treenimäärät, pelimuodot, UEFA-tasot | SJK:n toiminta/harjoittelu-sarakkeet | **v2** |

Ikävaiheprofiili EI ole pelaajalle eikä huoltajalle näkyvä. Pelaaja näkee vain harjoitteensa ja vahvuutensa.

**Liikehallintaketjut (SBL/SFL/LL/DIAG/DFL) ovat TalentMasterin sisäistä metodologiaa.** Niitä ei näytetä seuran henkilökunnalle tuontipohjissa eikä pyydetä seuralta. Tuontiskripti asettaa ketjun TalentMasterin sisäisestä liikekartasta.

**S1 (suunta lukittu):** TM-oletus ja seuran sisältö samaan skeemaan; moottorilla yksi lukija. Uusi sisältö skeemaan nyt, PANKKI-migraatio myöhemmin.

## 2. Eristys, lähde ja jakaminen (lukittu)
- Seuran sisältö vain `seurat/{id}/…`. Eristystestit parametrisoituina (seuraA/seuraB), ei kovakoodausta.
- Ei valumista TM-oletukseen. Jakaminen vain kopiona, luvalla, `alkupera` + `lupa_pvm`.
- `lahde_viite` kaikkeen sisältöön. Luvat: `docs/LISENSSIT.md`.
- Ravitsemus (Nevanlinna 157–192) ei käytössä.
- Pelaaja lukee fysiikkaohjelman vain jakso-snapshotista (`tukiosa.harjoitteet[]`), ei `ohjelmat`-kokoelmasta, joka pysyy henkilökunnan luettavana. `harjoitepankki` saa pelaajan luvun omaan seuraan (uusi sääntö).

## 3. Streamit

| Stream | Sisältö | Omistaja |
|---|---|---|
| A Jakso & viestintä | D-2 valinta-ilmoitus (#814) · D-3 · R6.4 Veo-linkit + keskustelu (Sibbo, marraskuu) | Code |
| B Seuran linja (SJK 1.11) | Rules v3.40 + eristystestit · lib + T-ohitus · teemalataaja · ohjelma→jakso-snapshot · Pelaaja_v7 lahde · Excel + tuontiskripti · SJK pelipaikat arviointikehykseksi | Code |
| C Kenttä K1+ | lippu `liput.kentta` · KPV U13 testaa marraskuun, SJK:lle tammikuussa | Code |
| D VP-työpöytä | Inbox-design · R6.3c · itsepalvelutuonti-UI · pelipaikka-IDP-malli SJK:n kanssa | Tero + Claude |
| E Perhe | huoltajan viestintä: datamalli + Rules nyt (v3.39), UI myöhemmin · P17 · Perhe-app design | myöhemmin |
| F Infra | auto-merge kaksikaista käytössä 6.10 · SDK 10.7.1 | Code |
| G Onboarding & data | SJK suostumukset · tunnukset · My.Eway-data käsin · koulutus | Tero |
| H Kieli | sv Geminille; seuran sisältö seuran kielellä, ei käännetä | Gemini |

### Auto-merge kaksikaista (F)
Auto: docs/**, tests/**, lib/** ilman UI:ta, *.md (ei CLAUDE.md), scripts ilman datakirjoituksia → `gh pr merge --auto --squash`, odottaa unit-tests + functions-tests + rules-tests. Tero: Rules, functions/**, *.html, sw_*.js, manifest, workflows, CLAUDE.md, --apply-skriptit, seuran onboarding-data. Sekapaketti = Tero. PR-kuvauksen 1. rivi "Kaista: auto|Tero".

### R6.4 Veo-linkit + keskustelu (A)
- Veo-linkki = viesti `seurat/{sid}/viestit` jossa `video_url`; ei upotusta, ei tallennusta meille.
- Ketju jakson alla: `jaksoavain` + `pelaajaId`; vastuuhenkilö saa ilmoituksen (D-2-mekanismi); VP lukee kaiken.
- `nakyvyys`: `pelaaja` (pelaaja+huoltaja+henkilökunta) · `huoltaja` (huoltaja+henkilökunta) · `henkilokunta` (vastaanottaja, lähettäjä, johto). Sama sanasto kuin havainnoissa.
- `video_url` vain henkilökunnalta; pelaajan/huoltajan viesteissä ei linkkejä. Pelaajalle ei XP:tä eikä lukukuittausta.

### SJK:n tuontipohja
- Valmennuspäällikölle lähtee `SJK_valmennuslinja_tarkistettavaksi.xlsx`: kaikki esitäytetty, ei ketjusarakkeita, KUITTAUS (OK / Muutettu / Poista / Uusi) + KOMMENTTI jokaisella rivillä, 10 UUSI-riviä per välilehti.
- Tuontiskripti: `Poista`-rivit pois; kuittaamattomat rivit eritellään dry-runissa Teron päätettäväksi; ketju TM:n liikekartasta; aliaskartta vanhoille sarakenimille.

## 4. Aikajana

| Viikko | Tavoite | Portti |
|---|---|---|
| 41 (6–12.10) | #814 D-2. LISENSSIT.md + KOKONAISKARTOITUS.md (auto). CLAUDE.md §0 (Tero). Excel SJK:lle. | main vihreä |
| 42 (13–19.10) | B: Rules v3.40 + eristystestit, lib + T-ohitus, teemalataaja, ohjelma→jakso-snapshot, Pelaaja_v7 lahde, arviointikehys. D-3 alkaa. SJK palauttaa Excelin 17.10. | characterization + eristystestit vihreät |
| 43 (20–26.10) | SJK Excel dry-run → Tero → apply. Tunnukset, suostumuskampanja, koulutus. | ≥50 % suostumuksia tai go-live rajataan |
| 44 (27.10–1.11) | Korjaukset. SJK go-live nykyisellä pelaajasovelluksella, Kenttä pois, vain suostuneet. | Sentry hiljainen 48 h |
| 45–46 | K1 lipun takana, KPV U13 testaa. R6.4 alkaa. | — |
| 47 | R6.4 Sibbolle. | marraskuun loppu |
| tammikuu | Kenttä SJK:lle. VP tuonti-UI. Pelipaikka-IDP-malli SJK:n kanssa. | — |

## 5. Skaalautuvuusvaatimukset (seura nro 10 ja 50)
S1 yksi sisältöskeema · S2 itsepalvelutuonti VP:lle ennen seuraa nro 4 · S3 `versio` + `voimassa_alkaen` kaikkeen seuran sisältöön · S4 seurakohtaiset liput (`liput.*`) · S5 geneeriset eristystestit · S6 jakaminen kopiona · S7 seuran sisältö seuran kielellä · S8 kaksikaista (käytössä).

## 6. Päätösloki 6.10.2026
1. Auto-merge kaksikaista — tehty (repo-asetukset + ruleset main: unit/functions/rules).
2. Nevanlinna-lupa — ok, LISENSSIT.md.
3. T-ohitus + fysiikka jakso-snapshotina; ikavaihe + ika_min/max; teemat yksi dokumentti.
4. Kenttä — KPV U13 marraskuu, SJK tammikuu.
5. Ravitsemus — ei.
6. Pelipaikka-KPI — SJK:n 84 riviä arviointikehykseksi samassa tuonnissa; käyttäytymismalli IDP-design-sessiossa.
7. Ikävaiheprofiili — ei julkinen; moottori + henkilökunta.
8. Pelaamisen periaatteet valmennusapuriin — ok.
9. Henkilökunnan ikävaihekonfiguraatio — v2.
10. My.Eway-data — käsin.
11. Kausisuunnitelmat + pelikirjat — pyydetään SJK:lta erikseen.
12. Sibbo Veo + keskustelu — R6.4 marraskuussa; huoltajan viestintä datamallina nyt, UI myöhemmin.
13. Liikehallintaketjut piilossa seuran henkilökunnalta tuontipohjissa.
14. `henkilokunta`-viestit: vain vastaanottaja, lähettäjä ja johto lukevat (VP:n mentorointiviestit eivät näy muille valmentajille).

## 7. Riskit
Suostumukset (G) · sisällön tuplautuminen (ohitus kohteen tasolla, testi) · moottorin haarautuminen (S1) · Coden aika: B-stream vs R6.4 marraskuussa · Pelaaja_v7:n S/D-kortit eivät käytä libiä (hyväksytty rajaus v1).
