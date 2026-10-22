# Tuoja-korjaus + erä 77 vienti + odottavat-lista siivous (pieni PR)

Kaista: Tero (HTML + lib). Ei Rules-muutoksia, ei uusia kenttiä, ei tuotantoskriptejä.

1. **`tuoja` (tietoturva).** `TalentMaster_Seura.html` kirjoitti henkilökunnan sähköpostin (`tuoja: tila.kayttaja?.email`) pelaajadokumenttiin (yksittäinen lisäys + Excel-tuonti); pelaaja ja huoltaja voivat lukea dokumentin, koodissa ei lukijaa (712 dokumenttia). Poistetaan kirjoitus molemmista paikoista. Uutta henkilökunnan kenttää ei lisätä; `sisainen/tiedot` tulee PR 1a:ssa. Seura ei kirjoita `tuojaUid`-kenttää; `muokkaajaUid` (uid, ei sähköposti) jää sellaisenaan. Vanhoja `tuoja`-arvoja EI kosketa: poisto tehdään PR 2:n skriptillä. Testi ajaa oikean Seura-koodin vm:ssä.
2. **Erä 77 vienti.** PM:n kirjoittama ja tarkistama palautus (3 riviä: `kt_viikon_fokus`, `kt_viikon_fokus_asetettu`, `k1_talla_viikolla`) vietiin koodiin vasta nyt. `scripts/i18n_vie_sv_era77.cjs` kopioi sv:n merkki merkiltä `lib/tm_lib_i18n.js`:ään (ei ruotsin kirjoitusta, §0). Testi: sha, avaimet = lähetetty erä, fi = koodi, idempotentti.
3. **Odottavat-lista.** `ODOTTAVAT_ERAT = [77, 80]` -> `[]`: erä 77 viety tässä, erä 80 oli viety jo #1109:ssä (lista vanhentunut). Poistetaan erän 77 poikkeamat testeistä (`LIB_SV_ODOTTAA`, `era77`-laskenta). Erän 80 rivit tarkistetaan koodin sv-kartoista.
4. **Versiot.** `tm_lib_i18n.js` muuttuu: ?v+1 kaikissa sivuissa, `lib_versiot.js --kirjoita`, SW-cachet (§27.4), lib_vartijat- ja kuoret_kasvukatto tarkistetaan.
