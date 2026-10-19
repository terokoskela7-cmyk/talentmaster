# Backlog — palaute-näkyvyys (jatko 0a/0b/#1101:n jälkeen) · kirjattu 19.10.2026

| # | Asia | Tila | Huomio |
|---|---|---|---|
| 1 | **Kolmen kysymyksen vastaukset Historiaan** (`reviewit/{pvm}.kevyt`: näkyikö pelissä / treenattiinko / mukana) henkilökunnalle Polku → Historiassa, Masterissa ja VP:ssä | **Ei nyt** (Tero 19.10.) | Eivät ole koskaan näkyneet Historiassa. Data on jo ladattuna (`lib/tm_historia_lause.js` `tmHlLataa` hakee koko reviewit-kokoelman, `reviewit[sulkupvm].kevyt`); rivin lisääminen = `tmHlKorttiLisa` + `_historiaHTML`. Tekstit: olemassa olevat `kk_q_*` / `kk_nakyi_*` / `kk_treeni_*` / `kk_mukana_*` (sv jo). |
| 2 | `jaksofokus.osa_havainnot` / `osa_havainnot_vk` -lauseet ("+ Lause tai klippi") pelaajadokumentissa | Vaihe 1 (Tero 19.10.) | Ei näy pelaaja-apissa, mutta datatasolla pelaajan luettavissa; siirto suojattuun paikkaan (esim. `reviewit`-tyyppinen alikokoelma) |
| 3 | Vanhan datan siirto pois pelaajan luettavasta paikasta: `jaksofokus_historia[].lause`, `havainnot` joissa `nakyvyys:'pelaaja'` + pisteet/havaitut/tekijä, `palautteet` `nakyvyys:'pelaaja'` + `tki`, `valmentaja_viesti`-tekstit joissa numeroita | Vaihe 1 (marraskuu) | Ks. PR #1100 -kuvaus |
| 4 | Jaksohistorian muut henkilökunnan kentät pelaajadokumentissa (`arvio_itse/valmentaja/vp`, `kalibraatio_ero`, `lasnaolo`), päädokumentin arviokentät, `idp_kausi…valmentajan_kommentti`, `adar_*` | Vaihe 1 | Inventaario A4b, A11–A16, B8 |
