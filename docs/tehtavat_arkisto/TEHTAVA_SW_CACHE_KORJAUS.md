# Tehtävä: Service Worker -cachebugi — sw_vanhempi/sw_pelaaja kaappaavat kaikki sivut

## Bugi (todennettu selaimessa 2026-06-11)

`sw_vanhempi.js` (ja todennäköisesti `sw_pelaaja.js`) on rekisteröity scopella
`/talentmaster/` ja cachettaa Cache First -strategialla KAIKKI scopen fetchit —
todennettu: `tm-vanhempi-v1`-cachesta löytyi `TalentMaster_VP_v25.html` (sekä
raw.githubusercontent-kopio). Seuraus:
- VP/Master/Excel-sivut jäätyvät SW-cacheen; edes `?v=`-cache-bust EI auta
  (SW vastaa ennen verkkoa).
- Jokainen käyttäjä joka on avannut Vanhempi/Pelaaja-PWA:n samassa selaimessa
  näkee muista sovelluksista pysyvästi vanhan version.
- Tämä on aiheuttanut toistuvat "vanha versio ajossa" -tilanteet (mm. recalc-ajo
  vanhalla Excel_Tuonnilla 2026-06-10).

## Korjaus

1. **Rajaa cachetus omiin tiedostoihin (allowlist):** sw_vanhempi.js cachettaa
   VAIN: `TalentMaster_Vanhempi_v2.html`, `manifest_vanhempi.json`, omat ikonit,
   fontit/SDK:t joita Vanhempi tarvitsee. sw_pelaaja.js vastaavasti vain Pelaajan
   tiedostot. KAIKKI muut pyynnöt → `fetch(event.request)` suoraan (ei cachea).
2. **HTML-navigaatiot network-first:** myös oman appin HTML:lle strategia
   network-first → fallback cacheen vain offline-tilassa (kenttäkäyttö säilyy).
   Staattiset assetit (ikonit, fontit) saavat jäädä cache-firstiksi.
3. **Cache-versiot:** nosta `tm-pelaaja-v1` → `v2` ja `tm-vanhempi-v1` → `v2` +
   `activate`-handleriin vanhojen cachejen siivous (`caches.delete` kaikille
   muille kuin nykyiselle avaimelle). Versionosto pakottaa vanhojen cachejen
   tyhjenemisen kaikilta käyttäjiltä SW-päivityksen yhteydessä.
4. **`self.skipWaiting()` + `clients.claim()`** activate-vaiheeseen jos ei jo ole
   — uusi SW käyttöön ilman että käyttäjän pitää sulkea kaikki välilehdet.
5. **Harkitse scopen kaventamista** (rekisteröinti `{scope: ...}` ei voi ylittää
   SW-tiedoston sijaintia; jos tiedostot ovat juuressa, allowlist hoitaa saman).
6. Päivitä CLAUDE.md §27.4-kohtaan: SW EI saa cachettaa muiden appien sivuja;
   allowlist-periaate.

## Verifiointi

1. Selaimessa (SW-päivityksen jälkeen): avaa Vanhempi_v2 → avaa VP_v25 →
   `caches.keys()` + cachen sisältö: VP_v25.html EI saa löytyä mistään cachesta.
2. Päivitä VP:tä (uusi commit/`?v=`) → VP latautuu tuoreena vaikka Vanhempi-SW
   on aktiivinen.
3. Vanhempi offline: oma HTML latautuu cachesta (lentokonetila-testi).
4. Commit + push + `npm run version:bump`.

## Huom käyttäjille (pilottiviestintä)

Jo asennetut vanhat SW:t päivittyvät kun käyttäjä avaa Vanhempi/Pelaaja-appin
seuraavan kerran (SW-tiedosto haetaan aina verkosta). Sitkeissä tapauksissa:
selaimen sivudata tyhjennettävä. VP-käyttäjille joilla VP näyttää vanhalta:
kertaluonteinen ohje "Tyhjennä sivustotiedot" tai odota SW-päivitystä.
