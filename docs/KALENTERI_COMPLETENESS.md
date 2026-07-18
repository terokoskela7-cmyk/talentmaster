# Kalenteri — kokonaisuuden completeness-arvio ("onko kaikki tarvittava?")

**Näkökulma:** ei "mitä on rakennettu" (se on auditissa) vaan **onko koko kalenterikonseptissa kaikki mitä nuoren jalkapalloseuran kalenteri tarvitsee** — kaikki sidosryhmät × työtehtävät, tuoreesti ajateltuna. Grounded koodiin (main) + `KALENTERI_ARKKITEHTUURI.md`:hen.

---

## Ydinhavainto (headline)

**Kalenteri on tällä hetkellä _kirjoitustyökalu ilman lukijoita_.** VP + valmentaja *luovat* tapahtumia, mutta **kukaan vastaanottava ei näe kalenteria sovelluksessa:**
- **Pelaajalla ei ole kalenteria** — Pelaaja_v7:ssä se on placeholder-teksti ("Joukkue, valmentajat, viestit, kalenteri — Vaihe B3"). Pelaaja kirjaa RPE/fiiliksen mutta **ei näe omia treenejään/otteluitaan/testejään**.
- **Vanhemmalla ei aikataulua** — vain "Viimeisimmät tapahtumat" (testihistoria). Ei tulevaa, ei logistiikkaa, ei kalenterisynkkaa.
- **Ei ulospäin lähteviä muistutuksia** — VP:n sisäinen notifikaatiokeskus on olemassa, mutta pelaajalle/vanhemmalle ei mene tapahtuma-/muutos-/peruutusilmoituksia.

Nuorisotuotteessa tämä on iso puute: **vanhemmat ja pelaajat elävät aikataulusta** — se on kilpailijoiden (PlayMetrics, Teamworks, 360Player) käytetyin pinta. Suurin puuttuva arvo ei ole lisää VP-valtaa vaan **vastaanottajapuoli**.

---

## ⚠️ KORJAUS (demo + koodi-tarkistus 2026-07-18)

Alkuperäinen väite "vastaanottopuoli puuttuu kokonaan" oli **osittain väärä**. Live-demo (`?demo=1`) + koodi paljastivat että kuluttajanäkymät **ovat rakennettu** — grep ei löytänyt niitä koska ne eivät käytä "kalenteri"-termiä:

- **Pelaaja — OMA TREENI** (`_tallennaVapaa`): pelaaja kirjaa omat treenit (pihapeli/kaveri/keho/pallo/muu + kesto) → **kirjoittaa `kirjaukset`iin** → **tämä on P6a-silta** (P6a lukee kirjaukset). ✅ Rakennettu.
- **Vanhempi_v2 (oikea vanhempi-appi):** viikkonäkymä (`rViikko`, ikäadaptoitu) + **narratiivinen "tarina"** `_viikkoKirjaukset`istä ("ei numeroita — kertomus") + koti/viimeisimmät. ✅ Rakennettu (rikkaampi kuin aiemmin väitin).
- **Narratiivinen viikkopulssi ilman numeroita/talentti-leimoja** — jonka Kimi ehdotti "uutena" — **on jo olemassa vanhemmalle.** ✅

**Tarkka jäljellä oleva aukko (kapeampi + paremmin skoupattu):** molemmat kuluttaja-appit on rakennettu **`kirjaukset`-datan päälle** (pelaajan OMA aktiivisuus) ja **kumpikaan ei lue seuran `kalenteri`-kokoelmaa** (0 osumaa `Pelaaja_v7` + `Vanhempi_v2`). Eli **seuran ajastetut tapahtumat** (ottelut · testit · joukkuetreenit aikoineen/paikkoineen/logistiikkoineen) **eivät virtaa** kuluttajanäkymiin. Kuori + narratiivi + itsekirjaus ovat valmiit; **johdotus seuran kalenteriin puuttuu.**

→ Tämä tekee **P7-consumerista pienemmän ja tarkemman:** ei "rakenna koko kuluttajapuoli" vaan **kytke olemassa olevat näkymät `kalenteri`-dataan** + lisää logistiikka + etukäteinen poissaolo + ilmoitukset. Vaikea osa (UI + pulssi + itsekirjaus + P6a-silta) on jo tehty. Alla oleva matriisi/aukot A & F korjattava tämän mukaisesti.

---

## Completeness-matriisi — sidosryhmä × työtehtävä

Legenda: ✅ on · 🟡 visiossa (dokissa, ei koodia) · 🔴 puuttuu kokonaan

| Työtehtävä (job-to-be-done) | VP | Valmentaja | **Pelaaja** | **Vanhempi** | Fysio |
|---|---|---|---|---|---|
| Luo/muokkaa tapahtumia | ✅ | ✅ (viikko) | – | – | 🔴 |
| **Näe oma/lapsen aikataulu (app)** | ✅ | ✅ | 🔴 | 🔴 | 🔴 |
| Kuukausi-/päivänäkymä | ✅ | 🔴 (tynkä) | 🔴 | 🔴 | – |
| Merkitse läsnäolo | ✅ | ✅ | 🟡 (RSVP-malli) | 🔴 | – |
| **Ilmoita poissaolo etukäteen** | 🔴 | 🔴 | 🔴 | 🔴 | – |
| **Saa muistutus/ilmoitus** (tapahtuma, muutos, peruutus) | 🟡 sis. | 🟡 sis. | 🔴 | 🔴 | 🔴 |
| Logistiikka (saapumisaika, peliasu, kyyti, kartta) | 🔴 | 🔴 | 🔴 | 🔴 | – |
| Synkka omaan kalenteriin (Google/Outlook/Apple) | 🟡 iCal | 🟡 | 🟡 | 🟡 | – |
| Päällekkäisyyksien havaitseminen (talentti 2 joukkueessa) | 🟡 | 🔴 | 🔴 | 🔴 | – |
| Kuormitus × kalenteri (kehitysspine) | 🟡 (P6a-siemen) | 🟡 (Session-RPE) | – | – | 🟡 |
| Vuosikello (testaus/kasvu-rytmi) | 🟡 | – | – | – | 🔴 |

---

## Genuine puuttuvat palat (auditin "työläys/kahdennus/integraatio" -kolmikon lisäksi)

### A. Vastaanottajapuoli — pelaaja + vanhempi näkevät kalenterin (🔴 kriittisin)
Nuorisotuotteen käytetyin pinta puuttuu kokonaan sovelluksesta. Pelaaja tarvitsee **oman viikon/aikataulun** (treenit, ottelut, testit) — ja se sitoo suoraan P6a:han (pelaaja näkee viikon jota vasten kirjaa). Vanhempi tarvitsee **lapsen konsolidoidun aikataulun + logistiikan** (PlayMetrics-erottautuja, dokissa nimetty "TM oppi" mutta ei rakennettu).

### B. Ilmoitukset / muistutukset ulos (🔴 kriittinen)
Tapahtumat, **muutokset ja peruutukset** eivät tavoita ketään automaattisesti. RSVP-tilat (kutsuttu/vahvistettu/peruttu) ovat datassa, mutta ilman **toimituskanavaa** (push/email; Suomessa myös WhatsApp-todellisuus). Ilman tätä kalenteri jää sisäiseksi muistioksi.

### C. Etukäteinen poissaolo / saatavuus (🔴)
Vain päivä-tason läsnäolo. Puuttuu: pelaaja/vanhempi ilmoittaa **etukäteen** poissaolon (koulu, loma, sairaus, **maajoukkuekutsu**) → syöttää suunnittelun + kuorman + rosterin. Teamworks "Sign-Ups" -mallin ydin.

### D. Logistiikkakentät (🔴)
Away-otteluihin: **saapumisaika, peliasu, kyyti/kimppakyyti, kartta/ajo-ohje.** Skeemassa vain `paikka`/`paikka_id`. Tämä on juuri se, mitä vanhempi kalenterilta odottaa.

### E. Talenttien päällekkäisyys (🔴, ydinarvoon osuva)
Talentti pelaa usein **omassa + talenttijoukkueessa (+ maajoukkue/piiri)** → tuplavaraukset. Talentit ovat tuotteen ydinarvo ja **eniten päällekkäin varattuja** — mutta konfliktien laskentaa/varoitusta ei ole. Tapahtumatyypeistä puuttuu **maajoukkue-/piirijoukkuekutsu**.

### F. Oma/omatoiminen harjoitus kalenteriin (🟡→🔴 silta)
P6a:ssa pelaaja kirjaa omat harjoitukset (`kirjaukset`), mutta ne **eivät näy kalenteritapahtumina**. Silta oman treenin ja kalenterin välillä puuttuu (kokonaiskuorma = seura + oma).

### G. Kuormitus/periodisointi kehitysspineksi (🟡, dokin pääerottautuja)
Kalenteri kehitystyökaluna (§28 herkkyysvaiheet → kausipainotus, kuorma × ikkuna) on visio, ei koodia. P6a + Session-RPE ovat siemenet.

---

## Mitä EI puutu (älä rakenna uudelleen)
Tapahtumatyypit (12, kattava), toistuvuus (3-skooppi), läsnäolon datamalli + kooste, roolit, soft-delete + audit, yksi lähde (`kalenteri`), P6a `tapahtuma_id`-linkki. Integraatiot (MyClub/TASO/iCal/JOPOX/Outlook) + vuosikello ovat **visiossa kattavasti** — toteutus puuttuu, mutta suunnittelu on tehty.

---

## Vastaus kysymykseen "onko kaikki tarvittava?"

**Kirjoituspuoli:** kyllä, pääosin (tyypit, toistuvuus, läsnäolo, roolit) — vain työläs + kahdennettu (audit).
**Vastaanottopuoli:** **ei** — se puuttuu lähes kokonaan. Pelaajan/vanhemman näkymä, ilmoitukset, etukäteinen saatavuus ja logistiikka ovat nuorisoseura-kalenterin *tärkein* kokonaisuus, eikä niitä ole sovelluksessa.

**Suositus completeness-mielessä — lisää P7-raamiin uusi kärki:**
- **P7-consumer (uusi, korkea arvo):** pelaajan + vanhemman kalenterinäkymä (lue olemassa olevaa `kalenteri`-dataa) + ilmoitukset (push/email) + etukäteinen poissaolo + logistiikkakentät. Tämä tekee kalenterista *käytetyn*, tukee P6a:ta (pelaaja näkee viikkonsa) ja palvelee rekrytointiteesiä (sitoutuneet pelaajat/vanhemmat).
- Yhdistä auditin vaiheisiin: **P7a** työläys (kirjoituspuoli) · **P7-consumer** vastaanottopuoli · **P7c** iCal (kaksoissyöttö) · **P7b** yhdistäminen · **P7d** kuorma/vuosikello-erottautuja.

Ilman vastaanottopuolta kalenteri jää sisäiseksi työkaluksi. Sen lisääminen on todennäköisesti **suurempi käyttö- ja arvovaikutus kuin mikään kirjoituspuolen hionta** — ja iso osa datasta on jo olemassa (`kalenteri`, `lasnaolijat`, P6a).
