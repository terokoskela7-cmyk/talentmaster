# CODE — P7-c kuluttaja-fix2: (A) vanhemman demo-fallback-bugi + (B) valmentajan pelaajaviesti-kentta

**Riippuvuus:** P7-c.1 (#218) + c.2 (#219) + c.1-fix (#221) mergessa.
**Kohteet:** `TalentMaster_Vanhempi_v2.html` · `TalentMaster_Pelaaja_v7.html` · `TalentMaster_VP_v25.html` · `TalentMaster_Master_v16.html`.
**Prioriteetti:** Osa A korkea (vanhempi nakee feikkitapahtumia oikeana kayttajana).

---

## OSA A — Vanhempi nayttaa demo-tapahtumia oikealle kayttajalle (BUGI)

**Verifioitu livena:** vanhemman appi nayttaa kovakoodattuja demo-tapahtumia (Joukkueharjoitus · Ottelu vs FC Naapuri · Nopeustestit) oikealle vanhemmalle (`_lapsi` = Topias, KPV U13, seuraId "kpv"), EI oikeaa "KPV - SJK":ta.

**Juurisyy:** `_vanhLataaKalenteri` kayttaa `_vanhDemoKalenteri()`:ta yleisena fallbackina:
```js
if (window._vanhKalLadattu) return; window._vanhKalLadattu = true;
var L = window._lapsi;
if (!_db || !L || !L.seuraId) { window._vanhKalenteri = _vanhDemoKalenteri(); ... return; }
```
Vanhemman appissa **ei ole `_isDemoUser`-porttia** (toisin kuin Pelaaja_v7:ssa). Kun kalenterilataus kilpailee `_lapsi`/auth-hydraation edella -> `!L.seuraId` tosi -> nayttaa **feikkitapahtumia** ja latchaa `_vanhKalLadattu=true` -> ei koskaan yrita uudelleen. Lisaksi kuluttajaluku vaatii **anonyymin Firebase-session** (Rules: `onAnonymous()`); jos `signInAnonymously` ei ole viela valmis kun luku ajetaan -> `permission-denied` -> catch -> tyhja/demo.

**Todistettu:** kun anon-sessio on olemassa ja loaderi ajetaan uudelleen -> palauttaa `["KPV - SJK"]`. Rules + suodatin ovat oikein; vika on loaderin demo-fallbackissa + auth-ajoituksessa.

### Korjaus (peilaa Pelaaja_v7:n loaderia)
1. **Demo vain oikeassa demo-tilassa.** Vanhempi tunnistaa demon `?demo=1`:lla (sama kuin muut demo-nakymat). Nayta `_vanhDemoKalenteri()` **vain** jos demo-tila; muuten EI koskaan demoa.
2. **Odota auth valmiiksi ennen lukua.** Varmista `signInAnonymously` valmis (esim. `firebase.auth().currentUser` / `onAuthStateChanged`) ennen `kalenteri.get()`:ia.
3. **Ala latchaa not-ready-tilassa.** Jos `!_lapsi || !_lapsi.seuraId` (ei valmis) -> ALA aseta `_vanhKalLadattu=true`; nayta latautuu/tyhja ja **yrita uudelleen** kun `_lapsi`/auth valmistuu (kutsu latausta samasta kohdasta jossa `_lapsi` asetetaan, tai auth-ready-hookista).
4. **Virhe/tyhja ei ole demo.** `permission-denied`/tyhja tulos -> pehmea tyhja tila ("Ei merkittyja tapahtumia — valmentaja lisaa ne kalenteriin."), EI feikkitapahtumia.

**DoD-A:** oikea vanhempi (Topias/KPV U13) nakee **"KPV - SJK":n** logistiikka-chipeineen (kimppakyyti mukana), EI demo-tapahtumia. Demo-tapahtumat vain `?demo=1`:lla. Ei latch-lukkoa ennen kuin oikea yritys tehty. Verifioi tuoreella latauksella (Topiaan vanhempi).

---

## OSA B — Valmentajan viesti pelaajalle/vanhemmalle (uusi kentta)

**Tarve:** valmentaja kirjoitti tapahtumaan "Muistakaa kengat" (`muistiinpanot`-kenttaan), mutta se EI nay pelaajalla/vanhemmalla — kuluttajakortti ei renderoi `muistiinpanot`:ia (c.1-suunnittelu; se on valmentajan sisainen). Tarvitaan **erillinen pelaajalle/vanhemmalle nakyva viestikentta**, jotta `muistiinpanot` pysyy sisaisena (GDPR: ei vuoda sisaisia muistiinpanoja kuluttajalle).

### Mita tehdaan
1. **Datamalli (additiivinen):** `kalenteri/{id}`-dokkiin valinnainen `pelaajaviesti: string | null` (maxLength ~200). Ei Rules-muutosta (jo-kirjoitettavan dokin sisalla; kuluttajaluku aukesi c.1:ssa). Puuttuva = ei nayteta. **Varmista ettei nimi torma olemassa olevaan kenttaan.**
2. **VP + Master luonti/muokkaus:** lisaa **erillinen** "Viesti pelaajille/vanhemmille" -tekstikentta (ei `muistiinpanot`) tapahtuman modaaliin (`avaaUusiTapahtuma` + `_vpMuokkaaTapahtuma` VP · `_avaaUusiTapahtuma` Master). Tallenna `pelaajaviesti` vain jos ei-tyhja; muokkauksessa tyhjennetty -> `null`.
3. **Kuluttajarender (Pelaaja + Vanhempi):** renderoi `pelaajaviesti` kortin alle pienena rivina (esim. viesti-ikoni + teksti), **escapattuna**, vain jos olemassa. `muistiinpanot` pysyy renderoimatta.
4. **GDPR:** `pelaajaviesti` on eksplisiittisesti kuluttajalle tarkoitettu; ei terveys-/arkaluontoista dataa; lyhyt teksti.

**DoD-B:** valmentaja voi asettaa erillisen pelaajaviestin VP:sta/Masterista -> nakyy pelaajan + vanhemman kortissa; `muistiinpanot` EI nay kuluttajalle; puuttuva = pehmea; additiivinen, ei Rules-muutosta.

---

## Reunaehdot (molemmat osat)
- Additiivinen, **ei Rules-muutosta**, read-only kuluttajalla.
- Ei regressiota: Pelaaja-aikataulu (toimii jo), demo-polku, muut nakymat ennallaan; 0 konsolivirhetta.
- **Topias = testi-OK.** 790 vitest vihrea. Ei cache-bumppia ellei jaettua libia muuteta.
- Voi jakaa kahteen PR:aan (A = bugikorjaus ensin, B = viestikentta) — A on kiireellisempi.

## Verifiointi (live, Topias)
1. **A:** vanhemman appi (tuore lataus) -> "KPV - SJK" nakyy, ei demo-tapahtumia.
2. **B:** aseta VP:sta ottelulle pelaajaviesti "Muistakaa kengat" -> nakyy pelaajan + vanhemman kortissa; muistiinpanot ei nay.
