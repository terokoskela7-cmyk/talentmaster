# CODE BRIEF · S2-demodata — Demo FC:n pulssi näkyväksi

**Kaista: Tero** (`tm_admin/`-skripti kirjoittaa tuotantotietokantaan; Tero ajaa). PR-kuvauksen ensimmäinen rivi: "Kaista: Tero".
**Miksi:** pilottiseuroissa pulssi on nollaa (kooste v5 9.10.: 1 harjoitekirjaus 467 pelaajasta), joten uutta Kotia (`docs/CODE_BRIEF_S2_KOTI.md`) ei voi arvioida eikä esitellä oikealla datalla. Demo FC:hen tehdään synteettinen silmukkadata, joka tuottaa mockupin 23 tilat oikean koosteen kautta.
**Järjestys:** tämä PR ennen S2:n PR 1:tä tai sen rinnalla. S2:n näkymätestit voivat käyttää samaa dataa fixtuurina.

## Rajat (ehdottomat, kuten `tm_admin/setup_demo_kehitys.js`)
- Kirjoittaa **vain** polkuihin `seurat/demo-fc/**`. Jokainen kirjoitus tarkistetaan, muuten keskeytys. Ei vanhaa `demo`-seuraa, ei oikeita seuroja, ei suojattuja pelaajia.
- Jokainen dokumentti `demo: true`. Ei oikeita henkilöitä; nimet "Demo"-muotoisia.
- Oletus kuiva-ajo; kirjoitus vain `--kirjoita`. Tuloste vain lukumääriä.
- Ei Auth-muutoksia (vp.demo on jo olemassa). Ei salasanoja.
- Ei `functions/`-, Rules- eikä sovellusmuutoksia.

## Toteutus
Laajenna `tm_admin/setup_demo_kehitys.js` uudella tilalla `--vain=pulssi` (sama malli kuin `--vain=omat_tavoitteet`). **Päivämäärät suhteessa ajohetkeen** (ei kiinteää `DEMO_NYT`), jotta 7 päivän ikkunat osuvat. Skripti on toistettava: sama ajo ennen jokaista demoa päivittää datan tähän viikkoon.

1. **Lippu:** `seurat/demo-fc/liput/julkiset = { kentta: true }` (D67).
2. **Joukkueet:** nykyiset P14, T14 ja T12 (n=4, pieni joukkue) + lisää niin, että mockupin 23 rivit toteutuvat. Ehdotus:

   | Joukkue | Ikävaihe | Tyyppi / profiili | Tila, jonka rivi näyttää |
   |---|---|---|---|
   | P10 Demo | Leikkijä | kilpa / oto | Käyttö = perheen kuittaukset ("perhe mukana") |
   | P11 Demo | Leikkijä | harraste / oto | harrasteen tavoitteet |
   | P12 Demo | Kilpailija | kilpa / ammatti | kaikki tavoitteessa (●) |
   | P13 Demo | Kilpailija | kilpa / ammatti | katselmusikkuna auki → signaali |
   | P14 Demo | Rakentaja | kilpa / ammatti | viikkokatsaus laskenut 3 vk → signaali |
   | P15 Demo | Rakentaja | kilpa / oto | ei jaksoa ≥ 2 vk → signaali |
   | P16 Demo | Rakentaja | harraste / oto | käyttö alle tavoitteen (▲) |
   | T12 Demo | Kilpailija | kilpa / oto | pieni joukkue (3/4) |
   | T14 Demo | Rakentaja | kilpa / ammatti | selvästi alle (■) jossain sarakkeessa |

   Ikävaiheet ja tyypit oikeista kentistä (`tyyppi`, `valmentajaprofiili`, `joukkueet[]`, syntymävuosi). Yksi pelaaja kahdessa joukkueessa (§7.18), jotta Koko seura -rivin uniikit pelaajat näkyvät.
3. **Silmukkadata kuluvalle viikolle** samoilla kentillä kuin oikeat kirjoittajat (Pelaaja_v7, Master_v16, VP_v25, lib):
   - `jaksofokus` (voimassa oleva jakso, reitti, katselmusikkuna) pelaajille ja joukkueen jakso
   - `viikkokatsaukset/{pvm}` vastaukset
   - `kirjaukset/{pvm}`: `tehty: true, lahde: 'pelaaja', kirjaustapa: 'heti', tyyppi: 'T'` (→ `n_harjoite_7`)
   - Leikkijöille huoltajan `jakso_kuittaus` (→ `n_perhe_kuittaus_7`)
   - kevyet katselmukset (ajallaan / myöhässä) niin, että katselmussarake vaihtelee
   - suostumus: osa `annettu` niin, että seura on käyttöönottotilan nauhassa (alle 90 %)
4. **Trendi:** neljä edellistä viikkoa kirjoitetaan suoraan koostedokumentteina `seurat/demo-fc/kooste/{vk}` ja `kooste_joukkue/{jid}_{vk}` samalla rakenteella kuin palvelin (versio 5, `demo: true`, **ei** `arvio: true`). Laskeva 3 vk P14:lle, nouseva tai tasainen muille. Kuluvan viikon kooste lasketaan palvelimella (alla), ei skriptillä.
5. **Käyttöönottotila:** valitse ensimmäisen koosteen viikko niin, että demo näyttää täydet värit (yli 4 viikkoa käyttöönotosta). Lisää valitsin `--kayttoonotto`, joka siirtää alkua niin, että tila näkyy ilman värejä.

## Ajo (Tero)
```
node tm_admin/setup_demo_kehitys.js --vain=pulssi            # kuiva-ajo: lukumäärät
node tm_admin/setup_demo_kehitys.js --vain=pulssi --kirjoita
```
Sen jälkeen Excel_Tuonti → valitse Demo FC → "📊 Päivitä seuran kooste". Kirjaudu VP_v25:een vp.demo-tunnuksella ja avaa Koti.

## Tarkistukset ennen PR:ää
- Admin-näkymän käyttöaste ja muut seurojen väliset luvut eivät laske Demo FC:tä (tarkista `demo: true`- tai `demo`-seuran suodatus; raportoi, jos ei ole).
- Ajastettu kooste (su 21) laskee Demo FC:n kuten muutkin; varmista, ettei se ylikirjoita skriptin historiaviikkoja.

## Testit
- Polkuvartija: yksikään kirjoitus ei osu `seurat/demo-fc/`:n ulkopuolelle (kuten nykyinen).
- Kuiva-ajo ei kirjoita mitään.
- Lasketaan kirjoitettava data koosteen puhtaalla funktiolla (`tmKoosteAnalysoi`/`tmKoosteTulos`) ja tarkistetaan, että jokainen taulukon tila syntyy (Leikkijä perhe, harraste, pieni joukkue, ●/▲/■, kolme signaalia D73:n järjestyksessä, laskeva 3 vk).
- Päivämäärät suhteessa annettuun `nytMs`:ään; ajetaan myös `TZ=UTC`.
- Raportoi `Test Files` ja `Tests`.
