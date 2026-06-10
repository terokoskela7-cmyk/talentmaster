# Tehtävä: Pelaaja_v7 tekniikkatavoite-kortti (TKI-analyysimalli §5.3)

> Sulkee analyysiketjun kolmannen yleisön: sama totuus joka VP:llä ja valmentajalla,
> mutta lapsen kielellä. Speksi: `docs/TKI_ANALYYSIMALLI.md` §5.3 + §3.2.
> Tiedosto: `TalentMaster_Pelaaja_v7.html`. HERKIN NÄKYMÄ KOKO JÄRJESTELMÄSSÄ —
> lukijat ovat 8–13-vuotiaita lapsia. §7.22-invariantit ovat ehdottomia.

## Konteksti

- Pelaaja kirjautuu PIN:llä (Anonymous Auth) → lukee oman pelaajadokumenttinsa.
  Kaikki tarvittava data on pikakentissä pelaajadokumentissa: `tki_viimeisin`,
  `tki_merkki`, `tki_vahvuus`, `tki_kehityskohde`, `tk_lajit_viimeisin`,
  `tk_kokonaistulos_viimeisin/_edellinen`, `tki_edellinen` — EI alikokoelmakyselyjä,
  EI Rules-muutoksia.
- Pelaaja_v7:ssä on jo Tekniikkaprofiili-osio (TK-tulokset lähdemerkinnällä, §24).
  Tämä tehtävä lisää KOTI-näkymään **tavoitekortin** + laajentaa Tekniikkaprofiilia.

## SIJOITUSPÄÄTÖS (päivitetty 2026-06-11 kuvakaappauksen perusteella)

MINÄ-sivun Tekniikkaprofiili on JO OLEMASSA ja lähellä speksiä: TKI-luku +
Pronssi-badge + "★ Vahvuutesi" + "Kehityskohde" + per-laji-palkit sekunteina.
**ÄLÄ rakenna uutta korttia KOTI/TÄNÄÄN-sivulle** (se generoi jo tehtäviä —
duplikaatio). Sen sijaan:
- Osatehtävä A = laajenna OLEMASSA OLEVAA MINÄ → Tekniikkaprofiili -korttia
- Osatehtävä C = kytke kehityskohde TÄNÄÄN-sivun tehtävägeneraattoriin
- **TKI-luku SAA säilyä** (on jo tuotannossa pelaajalle eikä aiheuttanut ongelmia)
  — mutta TKI-deltaa alaspäin EI näytetä koskaan (§3.2).

## Osatehtävä A — Laajenna MINÄ-sivun Tekniikkaprofiilia

Olemassa olevaan korttiin lisätään (kun `tk_lajit_viimeisin` on). Rakenne
(järjestys PAKOLLINEN — vahvuus AINA ensin, kuten nykyisinkin):

```
★ Vahvuutesi: Kuljetus-laukaus
  Olet tässä kärkitasoa — hieno juttu!

🎯 Seuraava askel: Pujottelu
  Nyt: 22.5 s → Tavoite: 20.5 s
  Pieni parannus joka treenissä riittää.

📈 Paransit kokonaisaikaasi 6 sekuntia viime kerrasta!
```

**Laskentasäännöt (älä keksi omia):**
1. Vahvuus: `tki_vahvuus`-pikakenttä; jos lajin taso on `erinomainen`
   (tkLajiViite-vertailu) → teksti "kärkitasoa", muuten "vahvin lajisi".
2. Kehityskohde: `tki_kehityskohde`-pikakenttä (yksi laji — EI listaa kaikista).
3. **Välitavoite:** gap = arvo − viite.hyva. Jos gap ≤ 3 s → tavoite = viite.hyva.
   Jos gap > 3 s → tavoite = arvo − 3 s (pyöristä 0.5 s tarkkuuteen). Lapselle
   saavutettava askel, ei koko matka kerralla. Pituuspotku_bonus käänteinen.
4. Parannusrivi (📈) VAIN jos `tk_kokonaistulos_edellinen` on JA abs-delta > 0.
   Jos abs-delta ≤ 0 tai ei edellistä → rivi pois kokonaan (EI "et parantunut").
5. Mitali: jos `tki_merkki` → näytä juhlivasti ("🥉 Sinulla on pronssimerkki!").
   Seuraava mitali VAIN positiivisena tavoitteena ("Matka hopeaan: 8 s — hyvällä
   tiellä!") ja VAIN jos gap seuraavaan ≤ 15 s. Kaukana oleva mitali → ei mainita.
6. Kultaikkuna lapsen kielellä, vain ≤ 12 v: "Nyt on paras ikä oppia uusia
   temppuja pallon kanssa!" (EI "ikkuna sulkeutuu" — se on uhkakehys).

## Osatehtävä B — Per-laji-palkkien hienosäätö (sama kortti)

Nykyiset laji-palkit säilyvät. Lisää: ★ vahvuuslajin riville, 🎯 kehityskohteen
riville, ↑-nuoli kun laji parani edellisestä (vain jos molemmat mittaukset
samalta radalta, §3.3.1; epävarmoissa ei nuolta). **EI viitetaulukkoa, EI
gap-sekunteja, EI percentiilejä** — ne ovat valmentajan työkaluja.

## Osatehtävä C — Kehityskohde → TÄNÄÄN-sivun tehtävägeneraattori

TÄNÄÄN-sivu generoi jo tehtäviä pelaajalle. Kytkös: kun `tki_kehityskohde` on
olemassa, tekniikkatyyppiset (T) tehtävät painottavat kehityskohde-lajia —
esim. kehityskohde 'syotto' → T-harjoitteeksi syöttöpainotteinen variantti +
saateteksti "Tämä vie sinua kohti tavoitettasi: syöttö alle X s".
- ÄLÄ muuta S-harjoitelogiikkaa (se kohdistuu FLEI:n heikoimman ketjun mukaan,
  §14 — eri järjestelmä, ei saa sekoittaa).
- Jos harjoitepankissa ei ole lajikohtaisia T-variantteja, toteuta kevyesti:
  olemassa oleva T-harjoite + tavoitteeseen viittaava saateteksti. Ei uutta
  harjoitesisältöä tässä tehtävässä.

## §7.22-INVARIANTIT — EHDOTTOMAT (lue CLAUDE.md §7.22 + §14)

- EI XP:tä, EI progressbareja, EI loss aversion -kieltä ("menetät", "putoat",
  "vain X päivää aikaa", "ikkuna sulkeutuu")
- EI vertailua muihin pelaajiin, EI sijoituksia, EI joukkueen keskiarvoja
- TKI-luku saa näkyä nykyiseen tapaan (on jo tuotannossa), mutta pääpaino
  sekunneissa, mitaleissa ja omassa kehityksessä
- TKI-laskua EI NÄYTETÄ MILLÄÄN TAVALLA — vain abs-parannus kun se on positiivinen
- Negatiivinen kehys kielletty: tyhjätila = "Tekniikkakisa tulossa — silloin näet
  tuloksesi täällä!" (ei "Ei tuloksia")
- Yksi kehityskohde kerrallaan — lapsi ei priorisoi neljää asiaa
- Terminologia §14: julkinen kieli (ei "indeksi", ei "gap", ei "viitetaso" —
  "tavoite", "vahvuus", "seuraava askel")

## Tekniset rajoitukset

- §7.1: string concatenation `+` — Pelaaja_v7:ssä nested template literal on JO
  KERRAN rikkonut koko appin (musta ruutu v=23) — erityinen varovaisuus
- §16: `getIdToken(true)` ennen kirjoituksia (tässä tehtävässä vain lukuja)
- tkLajiViite-logiikka: inline-kopio kanonisesta synkronointikommentilla (Pelaaja
  ei lataa testit_indeksit.js:ää — tarkista, ja jos lataa, käytä sitä)
- PWA: nosta `?v=N` JA `sw_pelaaja.js`-cacheversio (§27.4) — TÄRKEÄ koska
  Pelaaja-appilla on Service Worker (SW-korjaustehtävän jälkeen tarkista uusi
  versiointikäytäntö sw_pelaaja.js:stä)
- Mobile-first: kortti on puhelimen näytöllä pääelementti, min 14 px tekstit

## Verifiointi

1. Inline-syntaksi (vm.Script) + `npm test` vihreä
2. **Datavaatimus testaukseen:** Topias (KPV, PIN 9278) — KPV:llä EI ole
   TK-dataa → testaa hänellä TYHJÄTILA. Positiivinen polku: aseta Topiakselle
   testi-pikakentät konsolista (SA, Chrome MCP app-tabista §27.6) TAI käytä
   Sibbo-pelaajaa jolla on PIN. Kirjaa kumman teit.
3. Tarkista renderöity teksti §7.22-listaa vasten rivi riviltä — yksikin
   "menetät/putoat/sulkeutuu/indeksi" = bugi
4. Uudet rivit (tavoite/parannus/★🎯) EIVÄT näy kun `tk_lajit_viimeisin` puuttuu —
   Tekniikkaprofiilin nykyinen tyhjätila säilyy. TÄNÄÄN-generaattori toimii
   normaalisti ilman kehityskohdetta (kytkös vain lisää painotuksen kun data on)
5. Commit + push + `npm run version:bump` + SW-cacheversio
