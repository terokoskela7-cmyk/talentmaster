# Laskutusaikataulu — TalentMaster™ (SJK + Sibbo)

> Laadittu käyttöönoton pohjalta. Maksullinen käyttö alkaa **1.10.2026**. Hinnoittelu: `docs/HINNOITTELU_LASKUTUS.md`.
> Kaikki hinnat **alv 0 %** (TalentMasterID Oy ei arvonlisäverovelvollinen, ks. §5). **EI kirjanpidollinen neuvonta.**

## 1. Aikajana

| Vaihe | Aika | Laskutus |
|---|---|---|
| Käyttöönotto (koulutus + datan tuonti + suostumukset) | nyt – **30.9.2026** | **maksuton** |
| Maksullinen käyttö alkaa | **1.10.2026** | ensimmäinen lasku |
| Jatkuva | 1.10.2026 → | kuukausittain |

- **Ensimmäinen lasku: lokakuu 2026.** Laskutetaan lokakuun seuralisenssi + lokakuun aktiivipelaajat (kuun lopun tilanne).
- **Laskutusrytmi:** kuukausittain. **Maksuehto:** 14 pv netto. **Viivästyskorko:** korkolain mukaan.
- **Käytännön ajankohta:** lasku voidaan lähettää kuukauden alussa (kiinteä lisenssi) tai kuukauden lopussa
  (kun aktiivipelaajamäärä on lukittu). **Suositus:** laskuta **kuukauden lopussa / seuraavan alussa**, jolloin
  aktiivipelaajamäärä on tarkka. Ensimmäinen lasku siis **~1.11.2026 lokakuun käytöstä**, eräpäivä +14 pv.

## 2. Seurakohtaiset hinnat (alv 0 %)

Molemmat seurat liittyvät **perustajaseuroina** (lukittu perustajahinta 70 €/kk, 24 kk sitoumus, täysi moduulipääsy + mahdollisuus brändättyyn hallintanäkymään — ks. sopimusten kohta 6):

| Seura | Taso | Seuralisenssi/kk (perustaja, lukittu) | Pelaajamaksu/kk | Sisältyy |
|---|---|---|---|---|
| **Sibbo-Vargarna** | 1 · Kehitys | **70 €** | **2,5 € / aktiivipelaaja** | koulutus + seuranta 2×/v + täysi moduulipääsy |
| **SJK** | 2 · Akatemia | **70 €** | **5 € / aktiivipelaaja** | koulutus + seuranta 2×/v + kasvumittaus-ohjeistus + täysi moduulipääsy |

> Perustajahinta 70 €/kk on lukittu 24 kk:n sitoumusajaksi. SJK:n Taso 2:n **vakiohinta** on 150–400 €/kk; perustajaetu
> = tämä lukittuna 70 €:oon. Per-pelaajamaksu on tasoittain (Sibbo 2,5 € / SJK 5 €).

## 3. Laskun rakenne (malli)

**Esimerkki — Sibbo, lokakuu 2026** (N = lokakuun lopun aktiivipelaajat):

| Rivi | Määrä | à | Yhteensä |
|---|---|---|---|
| Seuralisenssi (perustajahinta, lukittu), 10/2026 | 1 kk | 70,00 € | 70,00 € |
| Pelaajamaksu, aktiiviset pelaajat 10/2026 | N | 2,50 € | N × 2,50 € |
| **Yhteensä (alv 0 %)** | | | **70,00 € + N × 2,50 €** |

Laskulle maininta: *"Ei arvonlisäverovelvollinen (liikevaihto alle 20 000 €/v)."*

**Esimerkki — SJK, lokakuu 2026** (M = lokakuun lopun aktiiviset akatemiapelaajat):

| Rivi | Määrä | à | Yhteensä |
|---|---|---|---|
| Akatemialisenssi (Taso 2, perustajahinta, lukittu), 10/2026 | 1 kk | 70,00 € | 70,00 € |
| Pelaajamaksu, aktiiviset pelaajat 10/2026 | M | 5,00 € | M × 5,00 € |
| **Yhteensä (alv 0 %)** | | | **70,00 € + M × 5,00 €** |

## 4. "Aktiivinen pelaaja" — laskennan peruste
- **Aktiivinen = pelaaja jolla `suostumusTila: 'annettu'` JA joka kuuluu aktiiviseen joukkueeseen.**
- EI lasketa: `pilotti`/`odottaa`-tilassa olevat (ei suostumusta), deaktivoidut, demo.
- Laskenta: `seurat/{seuraId}/pelaajat` joissa `suostumusTila=='annettu'` → **kalenterikuukauden lopun** lukumäärä.
- Järjestelmä laskee tämän olemassa olevasta datasta (pikakenttä, §26). Pilottivaiheessa määrä otetaan käsin;
  automatisointi (kuukausittainen Cloud Function -ajo → aktiivimäärä per seura → laskurivi) on myöhempi vaihe.
- **Käyttöönottotavoite:** mahdollisimman moni huoltajan suostumus **annettu**-tilaan ennen 1.10., jotta lokakuun
  laskutuspohja on täysi. (Suostumusten kertymää seurataan Seurahallinnan/Admin "Pilotin tila" -näkymässä.)

## 5. Arvonlisävero
- Nyt: laskut **ilman ALV:tä**, maininta verottomuudesta. Ei oikeutta vähentää ostojen ALV:tä.
- **Seuranta:** kun kalenterivuoden liikevaihto lähestyy **20 000 €**, rekisteröidy ALV:hen ennen rajan ylitystä.
  Kaksi maksavaa seuraa (SJK ~150 €/kk + Sibbo ~50 €/kk + pelaajamaksut) = arviolta ~2 500–4 000 €/v → **raja ei ylity
  vielä**, mutta uusien seurojen (esim. EIF) myötä seuraa tilannetta. Sopimuksissa on ALV-ehto (netto + ALV erikseen),
  joten rekisteröityessä ALV tulee asiakkaan maksettavaksi katteen päälle.

## 6. Tarkistuslista ennen ensimmäistä laskua (1.10./1.11.2026)
- [ ] Molemmat sopimukset **allekirjoitettu** (täydennä [TÄYDENNÄ]-kentät: Y-tunnukset, yhteyshenkilöt, oikeushenkilö, oikeuspaikka).
- [ ] Perustajahinta 70 €/kk + 24 kk sitoumus kirjattu molempiin sopimuksiin (kohta 6) — ✅ tehty.
- [ ] TalentMasterID Oy:n **laskutusohjelma** valmis (verkkolasku/lasku, verottomuusmaininta, maksuehto 14 pv netto).
- [ ] Seurojen **laskutusosoitteet / verkkolaskuosoitteet** (OVT/operaattori) kerätty.
- [ ] **Aktiivipelaajamäärät** lokakuun lopusta per seura (suostumus annettu + aktiivijoukkue).
- [ ] Liite: tietosuojaseloste + palvelun kuvaus mukaan sopimukseen.

## 7. Avoimet päätökset (Tero vahvistaa)
1. **Perustajahinta 70 €/kk molemmille — PÄÄTETTY** (lukittu 24 kk). *(Vahvista sitoumusaika 24 kk vai 12 kk.)*
2. **Laskutushetki:** kuukauden alussa (kiinteä) vai lopussa (tarkka pelaajamäärä). *(Suositus: lopussa.)*
3. **Laskutusohjelma:** mikä (esim. laskutusohjelma X / verkkolaskuoperaattori) — vaikuttaa verkkolaskun tekniseen muotoon.
4. Halutaanko **koko lisenssi kerralla** joltain seuralta (esim. 6 kk) vai puhtaasti kuukausittain.
