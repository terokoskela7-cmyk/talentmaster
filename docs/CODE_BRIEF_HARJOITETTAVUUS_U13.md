# CODE BRIEF · Lapsuusvaiheen harjoitettavuuskartoitus U13-ikäluokalle (Palloliiton päätös, Tero 10.10.2026)

**Kaista: Tero** (Testaus_v9, VP_v25, Master_v16, lib). PR-kuvauksen ensimmäinen rivi: "Kaista: Tero".
**Päätös (Palloliitto, "edetään tällä"):** lisätään lapsuusvaiheen harjoitettavuuskartoitus, joka ohjaa laadukkaaseen lapsuusvaiheen harjoitteluun ja luo valmiudet nuoruus- ja erikoistumisvaiheeseen. **Kohdennus vain yhteen ikäluokkaan**, kuormituksen pitämiseksi matalana.
**Tarkennus (Tero 10.10.):** kyse on **alle 13-vuotiaista (P13/T13)**. Tänä vuonna 12-vuotiaat (syntyneet 2014) siirtyvät seurannan piiriin ja ovat ensi vuonna 13-vuotiaita. Seuranta alkaa tammikuussa 2027 samaan aikaan kuin kokonaisliikunta.
**Lähde:** Palloliiton "Jalkapallon harjoitettavuuskartoitus, työversio 2026" (projektin tiedostot), 10–12-vuotiaiden osio: painopiste taidollisissa elementeissä (perusmotoriset liikkeet, ominaisuusharjoittelun perustekniikat).

## Nykytila
- Testaus_v9:ssä on U12-harjoitettavuusprotokolla (9 testiä, max 27 p), tallennus `testitapahtumat/{id}/tulokset/{pid}` ja historiapohja `testitulokset/{pvm}_harjoitettavuus_u12`.
- FLEI-laskenta ja pikakentät (`flei_viimeisin`, §26 pari-invariantti) ovat olemassa.

## Tehtävä
1. **Protokolla on jo oikea** (Tero 10.10.: TalentMasterin U12-harjoitettavuusprotokolla = Palloliiton työversio). Ei vertailua eikä protokollamuutoksia.
2. **Kohdennus U13-ikäluokkaan:** ikäluokka lasketaan kausi-vuosisäännöllä (§14 JOUKKUENIMI-INVARIANTTI): `testivuosi − syntymaVuosi = 13`. Kaudella 2027 kohde = syntyneet 2014 (vuoden 2026 12-vuotiaat). Testaus_v9 ehdottaa U12-harjoitettavuusprotokollaa (lapsuusvaiheen kartoitus) oletuksena vain tälle ikäluokalle; muille se ei ole oletusvalinta mutta on valittavissa. Ikäluokka syntymävuodesta, ei joukkueesta (§7.18). Vuosi luetaan testipäivästä (`tmPaivaIso`), ei kiinteänä.
3. **Ohjausvaikutus valmentajalle:** kartoituksen jälkeen joukkueen yhteenveto (mockup 22:n komponentit): mitkä liiketaidot ovat joukkueessa vahvoja ja mitkä harjoiteltavia, ja 2–3 suositeltua harjoitetta seuran harjoitepankista (`harjoitepankki`, hyväksytyt) tai kaanonista. Kieli: "harjoiteltava", ei "heikko".
4. **Pelaajalle ja huoltajalle (§7.22):** ei pisteitä, tasoja eikä vertailua. Korkeintaan "Seuraavaksi harjoitellaan: …" sanoin.
5. **§28-portti:** 12-vuotiaan fyysinen tulos ei ole kehityskohde ilman kypsyystietoa (`idpKypsyysEstetty`, `tmPhvTila`). Taidolliset kohteet sallittuja.

## Ei tässä
Muiden ikäluokkien muutokset · uudet normit · Excel-tuonnin muutokset (ellei protokollan tunniste muutu).

## Testit
- Kohdennus: kausi 2026 vs 2027 (syntyneet 2013 / 2014 / 2015), testi tammikuussa ja joulukuussa, sama pelaaja kahtena vuonna.
- Yhteenveto: vahvat/harjoiteltavat oikein fixtuurilla; suositukset vain hyväksytyistä harjoitteista.
- §7.22- ja §28-vartijat. Koko sarja, raportoi `Test Files` ja `Tests`.
