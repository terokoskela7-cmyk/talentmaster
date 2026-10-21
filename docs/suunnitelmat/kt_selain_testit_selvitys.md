# kt_k1_selain + k1d_kt_selain: selvitys

**Oire:** molemmat Chrome-selaintestit raportoitiin kaatuviksi puhtaalla origin/mainilla.

**Toistettavuus:** oletus-TZ:ssä (Europe/Helsinki) kaikki 15 testiä läpi, myös kuormassa (load avg 90-300; hitain testi 76 s / 120 s raja). Kaatuminen toistuu **TZ=UTC:ssä** ja deterministisesti (2/2 ajoa): kt_k1_selain "Polku → Lisää klippi" ja k1d_kt_selain "jakso päättyy eräpäivän jälkeen". CI ajaa UTC:ssä, mutta selaintestit on ajettu CI:ssä Helsinki-TZ:llä/ennen aikaa; paikallinen ajo riippuu ympäristön TZ:stä.

**Juurisyy (testin oma virhe, ei tuotantokoodin regressio):** fixturen kello ja päivämäärät oli kirjoitettu kiinteällä +03:00-offsetilla:
- `tests/helpers/kt_sivu.mjs`: kello `2026-10-19T09:00+03:00` = 06:00 UTC. Lib laskee klippien ajastuksen (klo 21-7) *paikallisesta* tunnista, joten UTC:ssä kello on "yö": klippi ajastuu ja rivi näyttää "Ajastettu..." eikä "19.10. · lähetetty".
- `tests/k1d_kt_selain.test.js`: jakson alku `...T00:00:00+03:00` = edellinen päivä 21:00 UTC → jaksopäivä 15.11. (odotettu 16.11.).

**Korjaus (vain testit):** kello = paikallinen keskipäivä `new Date(2026, 9, 19, 12, 0)`; k1d:n päivämäärät paikallisina (`new Date(v,k-1,p,h)`). Tuotantokoodi, HTML ja lib koskemattomia. Tulos 15/15 TZ=UTC, Europe/Helsinki ja America/Los_Angeles.
