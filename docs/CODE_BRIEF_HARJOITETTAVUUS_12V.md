# CODE BRIEF · Lapsuusvaiheen harjoitettavuuskartoitus 12-vuotiaille (Palloliiton päätös, Tero 10.10.2026)

**Kaista: Tero** (Testaus_v9, VP_v25, Master_v16, lib). PR-kuvauksen ensimmäinen rivi: "Kaista: Tero".
**Päätös (Palloliitto, "edetään tällä"):** lisätään lapsuusvaiheen harjoitettavuuskartoitus, joka ohjaa laadukkaaseen lapsuusvaiheen harjoitteluun ja luo valmiudet nuoruus- ja erikoistumisvaiheeseen. **Kohdennus vain yhteen ikäluokkaan, 12-vuotiaat**, kuormituksen pitämiseksi matalana.
**Lähde:** Palloliiton "Jalkapallon harjoitettavuuskartoitus, työversio 2026" (projektin tiedostot), 10–12-vuotiaiden osio: painopiste taidollisissa elementeissä (perusmotoriset liikkeet, ominaisuusharjoittelun perustekniikat).

## Nykytila
- Testaus_v9:ssä on U12-harjoitettavuusprotokolla (9 testiä, max 27 p), tallennus `testitapahtumat/{id}/tulokset/{pid}` ja historiapohja `testitulokset/{pvm}_harjoitettavuus_u12`.
- FLEI-laskenta ja pikakentät (`flei_viimeisin`, §26 pari-invariantti) ovat olemassa.

## Tehtävä
1. **Protokolla on jo oikea** (Tero 10.10.: TalentMasterin U12-harjoitettavuusprotokolla = Palloliiton työversio). Ei vertailua eikä protokollamuutoksia.
2. **Kohdennus 12-vuotiaille:** Testaus_v9 ehdottaa U12-harjoitettavuutta vain pelaajille, joiden ikä testipäivänä (`normiIka`) on 12; muille protokolla ei ole oletusvalinta. Ikä syntymävuodesta, ei joukkueesta (§7.18).
3. **Ohjausvaikutus valmentajalle:** kartoituksen jälkeen joukkueen yhteenveto (mockup 22:n komponentit): mitkä liiketaidot ovat joukkueessa vahvoja ja mitkä harjoiteltavia, ja 2–3 suositeltua harjoitetta seuran harjoitepankista (`harjoitepankki`, hyväksytyt) tai kaanonista. Kieli: "harjoiteltava", ei "heikko".
4. **Pelaajalle ja huoltajalle (§7.22):** ei pisteitä, tasoja eikä vertailua. Korkeintaan "Seuraavaksi harjoitellaan: …" sanoin.
5. **§28-portti:** 12-vuotiaan fyysinen tulos ei ole kehityskohde ilman kypsyystietoa (`idpKypsyysEstetty`, `tmPhvTila`). Taidolliset kohteet sallittuja.

## Ei tässä
Muiden ikäluokkien muutokset · uudet normit · Excel-tuonnin muutokset (ellei protokollan tunniste muutu).

## Testit
- Kohdennus: 11-, 12- ja 13-vuotiaat testipäivänä; vuodenvaihde.
- Yhteenveto: vahvat/harjoiteltavat oikein fixtuurilla; suositukset vain hyväksytyistä harjoitteista.
- §7.22- ja §28-vartijat. Koko sarja, raportoi `Test Files` ja `Tests`.
