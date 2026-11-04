# Vaihe 1 · PR 2d — kirjoittajat fail-closed, K1, biologinenIka B-muoto

Lähde: `.briefit/INVENTAARIO_VAIHE1_PR2.md` §3/§6. PM-päätökset: talenttiOhjelma = C (a), historia_sisainen (R8) oma viipaleensa.

## Mitä muuttui

| Kohta | Ennen | 2d |
|---|---|---|
| Liput (`RYHMAT.s4/henkilokunta/jaksofokus_sisainen.kirjoitus`, CF `liputPaalla`) | ohjasivat dual-writea ja dual-readia | aina päällä, ei lippuriippuvuutta. Rollback = koodin palautus |
| A-kentät pelaajadokumentissa | dual-write (pelaaja + sisainen) | **vain** `sisainen/tiedot` (tai `sisainen/terveys`). Apurit riisuvat pelaajaosan (`tmS4Riisu`, `tmHenkilokuntaRiisu`, `tmSisainenRiisu`) |
| A-kentän poisto (`FieldValue.delete`) | — | menee **myös** pelaajadokumenttiin (myös pistepolut `jaksofokus.<A>`), ettei siivoamaton vanha arvo palaa dual-readissa |
| `tmVahvistaMerkinnat` (`tukitarve` vahvista) | osittainen `{merkitty_pvm}` → syvä set-merge pelaajaan | KOKO kartta: sisainen-kirjoitus (`mergeFields`) korvaa kentän, joten osittainen kartta hävittäisi alue/rooli/kuvaus |
| permission-denied | uusi yritys ilman sisainen:ia (A-kenttä pelaajalle) | virhe kutsujalle, näkyvä toast (fail-closed) |
| `TM_SISAINEN ? apuri : raaka` | raaka kirjoitus, jos lib puuttuu | apuri suoraan; lib puuttuu → `TM_SISAINEN_PUUTTUU` |
| `tmS4Sisainen` | ei koskaan heittänyt | heittää. `{hiljainen:true}` → `{ok:false}` |
| `biologinenIka_viimeisin` | koko `biologinen_ika`-dokumentti pelaajalla | jaettu arvo (kuten `signaali`): koko dokumentti sisainen:iin, pelaajalle B-muoto `{phv_tila, phv_tila_koodi, phv_ika, ika_mittaushetkella, mittauspaiva}` (`tmBioIkaJaa`) |

### K-kohdat

- **K1** VP `_vpHhPaivitaPikakentat`: konsensus ja kumoaminen kulkevat `tmS4Kirjoita`:n kautta. Epäonnistuminen → false → "Tallennus epäonnistui", ei enää virheellistä "Merkintä peruttu" -toastia, kun konsensus jäi voimaan.
- **K2** VP scout, **K3** VP havaittu: transaktio kirjoittaa pelaajalle vain riisutun osan, A-osat menevät `tm*Lisaa`:lla.
- **K4/K5** ADAR-pikakortti: adar_* `tmS4Kirjoita`:lla (yksi batch). `havainto_viimeisin_pvm` menee havainnon batchiin `tmS4Lisaa`:lla, vain sisainen:iin (§26 atomisuus säilyy; Rules: sama `onOmanJoukkueenValmentaja` kuin `havainnot.create`).
- **K6** Testaus_v9: `b.update(baseRef, tmS4Riisu(upd))` + `tmS4Lisaa`.
- **K7** Seura Excel-luonti: pelaajalle vain `talenttiOhjelma`. Taso, alku ja aktivoija menevät `tmS4Sisainen`:lla, ja virhe näkyy rivillä.
- **K8** CF `vahvistaSuostumus`: `tmSisainenRiisu(paivitys)`. **K9** CF `arviointikertaOnWrite`: vain `tmS4Lisaa`.
- **K10** demo (`tm_admin/setup_demo_kehitys.js`): pelaajalle `tmSisainenRiisu`, A-osat sisainen:iin. `tallensiUid`/`tuojaUid` poistettu testituloksista.
- Master (7 varapolkua), libit `tm_idp_lomake`, `tm_kehitystyopoyta`, `tm_kt_arviointi`, `tm_kt_hylkaa`, `tm_kt_jakso`, `tm_kt_keskustelu_sheet`: fail-closed.

## Deploy-järjestys

1. **Rules v3.76** (`tm_admin/firestore.rules`): testivastaavan sisainen-avaimiin lisätään `biologinenIka_viimeisin`. Ilman tätä testivastaavan kasvumittaus hylätään kokonaan.
2. Functions (K8/K9).
3. Klientit.

## Avoimet / ei tässä PR:ssä

- **Vanhat A-arvot pelaajadokumenteissa** jäävät, kunnes PR 3 -siivous ajetaan. Dual-read antaa sisainen-arvon etusijan, joten henkilökunnalle ne eivät näy, mutta pelaaja ja huoltaja voivat yhä lukea ne pelaajadokumentista.
- **`biologinen_ika/{pvm}`-alikokoelma**: pelaajan luku poistettu Rules v3.77:ssä (B10, PM 4b). Huoltajan luku on ennallaan, ja sen kohtalo on PM-päätös.
- **R8 `historia_sisainen`**: `jaksofokus_historia`-rivien A-osat menevät yhä pelaajadokumenttiin (oma viipale).
- `tmIdpPelaajaVarapolulla` (pelaajan oma `idp_pelaaja`-dokumentti) ei kuulu A-kenttiin, ennallaan.

## Testit

- `tests/sisainen_2d_portti.test.js`:
  - grep-portti: ei A-avainta pelaajaviitteen `.set/.update`-riville, ei raakoja varapolkuja.
  - Lib-ajot: pelaajadokumentissa ei A-avaimia, poisto ei palaa.
  - vm-ajot ilman vanhoja kenttiä: PHV-lukijat B-muodolla, P7 `hist_n`.
- `tests/rules/sisainen.rules.test.js`: v3.76 testivastaava + `biologinenIka_viimeisin`.
- Vanhaa lippu- ja varapolkukäytöstä testanneet tapaukset on kirjoitettu uudelleen testaamaan 2d-käytöstä.
