# IDP-ydin — spec: strukturoitu tavoite + pelaajan johtama review-sykli (V2/V3)

> Lähde: co-design 2026-07-03. Osa `IDP_KORTTI_MAAILMANLUOKKA.md` (§3.3 aukot → §4 pilarit) + selkäranka V2/V3. Kohde: `IDP_Kortti_v4.html` Kehitys-paneeli. Toteutus vaiheistetaan — tämä on datamalli + UI-rakenne, ei vielä koodibrief.

## 1. Miksi (aukko kv-huippuun)
Nykyinen tavoite = vapaa teksti (`omaTavoiteInput`). Maailmanluokka vaatii **strukturoidun, mitattavan, pelaajan omistaman tavoitteen + säännöllisen kaksisuuntaisen review-syklin** (FA/ILP §2). Tämä spec määrittää sen niin että se on (a) datasta johdettavissa (V2), (b) seurattava (V3), (c) standardoitu ja kansallisesti koostettava (§0/V6).

## 2. Tavoite-objekti (strukturoitu, SMART + kypsyys + 70/30)
```
tavoite = {
  fokus:        { alue: 'syotto', dim: 'D2', nimi: 'Syöttö' },   // datasta (tki/hh_kehityskohde) tai valittu
  mittari:      { testId: 'syotto', yksikko: 's', suunta: 'pienempi' },
  lahto:        { arvo: 46.1, pvm: '2026-04-05' },                // measurable start
  tavoitearvo:  44.0,                                            // measurable target
  aikaraami:    { kausi: 'kevät 2026', kesto_vk: 6, arvio_pvm: '2026-08-15' },
  perustelu:    { teksti: '...', kultaikkuna: true, normigap_s: 2.0, lahde: 'moottori'|'valmentaja' },  // V2
  ankkuri_7030: { vahvuus_dim: 'D1', teksti: 'integroi syöttö nopeuteen' },  // 70/30 vahvuusperusta
  pelaajan_tavoite: '"Haluan uskaltaa syöttää eteenpäin."',      // pelaajan ääni (omistajuus)
  omistaja:     'yhdessa',   // 'pelaaja'|'valmentaja'|'yhdessa'
  status:       'aktiivinen' // 'ehdotettu'|'aktiivinen'|'saavutettu'|'jatkuu'|'hylatty'
}
```
**Pakolliset kv-elementit:** mitattava lähtö+tavoite (S+M), aikaraami (T), perustelu (R + kypsyys), pelaajan ääni (omistajuus), 70/30-ankkuri (vahvuusperusta). **Achievable (A)** = tavoitearvo johdettu normigap/kultaikkuna-kontekstista (§28), ei epärealistinen.

## 3. Review-objekti (pelaaja johtaa, kaksisuuntainen)
```
arvio = {
  pvm: '2026-05-15',
  arvo: 45.5,                       // mitattu (testi uusittu) → DVI
  pelaajan_arvio: 3,                // 1–5 itsearvio (pelaaja arvioi edistymän ENSIN)
  pelaajan_note: '"Menee eteenpäin."',
  valmentajan_kommentti: '...',     // valmentaja vastaa (kaksisuuntainen)
  dvi_suunta: 'up'                  // johdettu arvo vs edellinen
}
```
Tavoite pitää `arviot[]`-listan → **kehityskaari** (mockupin timeline). DVI (§ nykyinen kehitysvauhti) lasketaan arvoista.

## 4. Elinkaari + rytmi
`ehdotettu` (V2 moottori tai valmentaja) → pelaaja/valmentaja hyväksyy → `aktiivinen` → **periodiset yhteisarviot** (`arvio_pvm`, kk/kvartaali; muistutus) → `saavutettu` (tavoitearvo saavutettu) tai `jatkuu` (uusi tavoitearvo) → historia. Pikakenttä listalle (V1): `idp_tila` = status · `idp_edistyma` = "X %" tai "n/N".

## 5. Kytkös maailmanluokka-pilareihin (IDP_KORTTI_MAAILMANLUOKKA §4)
| Pilari | Toteutus tässä |
|---|---|
| Kokonaisvaltainen | fokus mihin tahansa 4-corner/5D-alueeseen (ei vain fyysinen) |
| Kypsyys ennen kronologiaa | perustelu sisältää kultaikkuna/PHV-kontekstin; tavoitearvo §28-neutraali pre-PHV |
| Pelaaja omistaa | `pelaajan_tavoite` + `pelaajan_arvio` johtaa review'ta |
| Mitattava + seurattava | lähtö→tavoite + `arviot[]` + DVI |
| Vahvuusperustainen | `ankkuri_7030` |
| Valmentaja omistaa kentän | tavoite+mittari+perustelu = TM; kenttäharjoite = valmentaja |
| Näyttö + uskottavuus | mittari = normitettu testi; perustelu = normigap + tiede |
| Kv-muoto | kentät kieliriippumattomia (arvot/koodit); i18n `tm_lang.js` (V6) |
| §7.22 turvallinen | pelaajalle: prosessikehu, ei vertailua muihin; VP:lle luvut |

## 6. Firestore (§11)
`seurat/{sid}/pelaajat/{pid}/idp_kausi/{vuosi}` → `tavoitteet: [tavoite-objekti]` (arviot upotettuna). Pikakentät pelaajadokkiin (§26): `idp_tila`, `idp_edistyma`, `idp_fokus` (lista + kortti lukevat ilman alikokoelmakyselyä). GDPR §33 B4 (alaikäiset; kansallinen koonti V6 suostumuksella).

## 7. Vaiheistus
- **V2:** ehdotusmoottori luo `tavoite`-luonnoksen datasta (fokus+lähtö+tavoitearvo+perustelu+70/30) → pelaaja/valmentaja täydentää `pelaajan_tavoite` + hyväksyy.
- **V3:** review-sykli (arviot[], rytmi/muistutus, pelaaja johtaa, DVI, saavutettu/jatkuu) + kehityskaari-UI (mockup).
- Läpileikkaava: pikakentät (V1-lista), i18n (V6), §37-raporttilinkitys (V4).

## 8. Invariantit
Metodologia ennallaan (mittari = normitettu testi) · §7.22 · valmentaja omistaa kentän · §26 pikakentät · GDPR §33 · standardoitu rakenne (kansallinen, ei seurakohtaisia poikkeamia kenttänimissä).
