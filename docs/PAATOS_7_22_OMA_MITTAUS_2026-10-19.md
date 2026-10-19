# PÄÄTÖS · §7.22-poikkeus: pelaajan oma mittaus · Tero 19.10.2026 (klo 10, palaute-näkyvyys vaihe 0a)

**Päätös:** pelaajan ja huoltajan näkymässä saa näkyä **pelaajan oma mittaus** — oma tulos (aika, matka, cm, MAS-arvo), oma ennätys ja oma kehitys myönteisesti ("Uusi ennätys!", "Paransit 0,3 s"). Tämä on tietoinen poikkeus §7.22:n "ei lukuja" -sääntöön.

**Ei näy (sääntö ennallaan):** valmentajan arviot lukuina (ADAR, pisteet, tasot, tasokuvaukset) · vertailu muihin, sijoitukset ja keskiarvot · etäisyys merkkirajaan ja mitalirajat · tavoite-/viiterajat ("nyt → tavoite") · valmentajan työkaluarvot (harjoitusvyöhykkeet, km/h-vyöhykkeet).

**Heikompi tulos:** näytetään neutraalisti ilman kommenttia — ei punaista, ei alasnuolta, ei sanaa "huonompi". Parannus näytetään vain kun tulos parani.

**Merkit:** ennallaan — nykyinen merkki + "Kohti {seuraava}" (ylin merkki → vain se). Ei sekunteja eikä etäisyyttä merkkiin.

**Toteutus:** yksi sääntö `lib/tm_merkki_nakyma.js` (`tmMerkkiNakyma`, `tmOmaParannus`, `tmOmaLuku`), jaettu Pelaaja_v7:lle ja Vanhempi_v2:lle. Testit: `tests/palaute_nakyvyys_0a.test.js`.
**Muuttaa:** CLAUDE.md §0 / §7.22 -tulkintaa — "ei tasolukuja" koskee arvioita ja tasoja, ei pelaajan omia mittaustuloksia. (CLAUDE.md-teksti päivitetään erikseen, Teron kaista.)
