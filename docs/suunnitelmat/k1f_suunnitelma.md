# K1f — Masterin ja VP:n kehityskeskustelukirjaukset nollaavat rytmin

Kaista: Tero (HTML). Tausta: Sibbo käyttää vanhaa Master-sovellusta 1.11. alkaen; push-muistutukset (K1d, `tmRytmi` / `functions/rytmi_notif.js`) lukevat `review_viimeisin_pvm`:n pelaajadokumentista.

## Löydös (Vaihe 0 -inventaario + koodin tarkistus)
- **Master "Kirjaa kehityskeskustelu"** (`_mIdpKirjaaReview` → `_mIdpTallennaReview` → `idpLisaaArvio` + `_mIdpTallennaDok`): kirjoitti vain IDP-arvion ja `idp_*`-pikakentät. EI `reviewit/{pvm}`:ää eikä `review_viimeisin_pvm/_tyyppi`:ä → rytmi ja push eivät nollautuneet. **Korjataan.**
- **VP "Merkitse kehityskeskustelu tehdyksi"** (`_mdtMerkitseReview`, bulk `_vpCockpitBulkMerkitse`) kirjoittaa jo `_vpKirjoitaReview` → `tmKirjaaKatselmus` (yksi batch, paikallinen päivä `tmPaivaIso`, aiempaa myöhäisempi säilyy; tyyppi `'mdr'`). `tmRytmi` ei haaraa tyypin mukaan (`review_viimeisin_tyyppi` vain tekstikenttä) → `'mdr'` nollaa rytmin jo. **Ei koodimuutosta; lisätään pariteettitesti.** `'mdr'`-tyyppiä EI vaihdeta.
- VP "Kirjaa kehityskeskustelu" (`_vpTallennaReview`) kirjoittaa jo `'kehityskeskustelu'`, IDP-onnistumisen jälkeen. Ennallaan.
- Rules: `reviewit/{pvm}` create/update sallittu `onOmanSeuranValmentaja` (valmentaja, talenttivalmentaja, fysiikkavalmentaja, vp, urheilutoimenjohtaja) ja johdolle → Masterin valmentaja-rooli kuuluu siihen. **Ei Rules-muutoksia.**

## Muutos
- Master `_mIdpTallennaReview`: kun `_mIdpTallennaDok` onnistui (palauttaa true), kutsutaan `TM_KEHITYSSILMUKKA.tmKirjaaKatselmus(p, {tyyppi:'kehityskeskustelu', pvm: tmPaivaIso(), tekija_uid, tekija_rooli, idp_paivitetty:true, arvio:{arvo, pelaajan_arvio}})` ja kirjoitetaan yhdessä batchissa `reviewit/{pvm}` + pelaajadokumentin pikakentät (sama kuvio kuin VP:n `_vpKirjoitaReview`). Paikallinen tila päivitetään vasta onnistumisen jälkeen. Demo: vain paikallinen tila. IDP-kirjoituksen epäonnistuessa ei kirjoiteta mitään. Virhe batchissa: toast "Tallennus epäonnistui" (olemassa oleva avain).
- Ei uutta lib-koodia (lib on PURE, `tmKirjaaKatselmus` jo jaettu) → ei lib-versionostoa. Ei uusia käyttäjätekstejä → ei sv-erää. Pelaajan sanaa / valmentajan kommenttia ei kopioida reviewit-dokumenttiin (jäävät IDP-arvioon, kuten VP:llä). IDP-arvion sisältö ja ehto (`p._mIdpTavoite` vaaditaan) ennallaan.

## Pariteettitesti (`tests/k1f_kehityskeskustelu_rytmi.test.js`)
Oikea kuorikoodi vm:ssä (`sivu_ajuri`, `_fakeFirestore`): Master `_mIdpTallennaReview`, VP `_mdtMerkitseReview` ja `_vpCockpitBulkMerkitse`. Kirjauksen jälkeen `laskeReviewKadenssi` (tmRytmi) = ajantasalla ja `rytmiNotifit` (push) = ei muistutusta. Lisäksi: aiempaa myöhäisempi pvm säilyy; IDP-virhe → ei katselmusta; batch-virhe → ei paikallista muutosta; ei tavoitetta → ei kirjoitusta; demo; yksi batch; tyyppi ei vaikuta rytmiin.

## Toimintokartta (D158: nappi → avautuu → kirjoittaa → rooli)
| Nappi | Avautuu | Kirjoittaa | Rooli |
|---|---|---|---|
| Master: Kirjaa kehityskeskustelu → Tallenna kehityskeskustelu | 4-vaiheinen modaali | idp_kausi-arvio + idp_*; **uusi:** reviewit/{pvm} (kehityskeskustelu) + review_viimeisin_pvm/-tyyppi | valmentaja, talenttivalm., fysiikkavalm., vp, utj |
| VP: Merkitse kehityskeskustelu tehdyksi (pelaajakortti) | ei (suora kirjaus) | reviewit/{pvm} (mdr) + review_viimeisin_* (ennallaan) | vp / johto |
| VP: Merkitse … tehdyksi (bulk, Reviewit-työlista) | vahvistusdialogi | sama per pelaaja (ennallaan) | vp / johto / oman joukkueen valmentaja |
| VP: Kirjaa kehityskeskustelu | modaali | IDP + reviewit (kehityskeskustelu) + review_viimeisin_* (ennallaan) | vp / valmentaja |

Merge-järjestys: K1e → K1f → K4c → K4b.
