# Vaihe 0 — Pelaajan TTI 7,7 → < 5 s: yhteinen suunnitelma (28.11.2026, vain suunnitelma — EI koodia)

Yhdistää kaksi selvitystä: **kattavuus** (`docs/VAIHE0_PELAAJA_KATTAVUUS.md`) ja **modulaarinen Auth** (`docs/VAIHE0_PELAAJA_MODULAARINEN_AUTH.md` §8). Lähtötila: A/B 28.11. (`KYLMA_AVAUS_DIAGNOOSI` §19.7) — puhelin, kylmä: FCP 0,38 s, **auth-haun alku 5,9 s, TTI 7,7 s (≈ auth + 1,8 s)**.

*Merkinnät:* *mitattu* (A/B tai tässä selvityksessä ajettu koe) · *arvio* (laskettu) · *hypoteesi* (ei mitattu). Kaikki sekunnit ovat **synteettisellä puhelinprofiililla** (1,6 Mbit/s, 150 ms, CPU 4×) stagingissa debug-tokenilla.

## 1. Mikä ratkaisee TTI:n

TTI ≈ **auth-haun alku + ~1,8 s** (mitattu). Auth-haku alkaa vasta `DOMContentLoaded`issa, jolloin kaikki deferatut skriptit (~790 kt koodattua + SDK:t) on ladattu ja ajettu. Kaksi erillistä tekijää:
1. **Tavut ennen authia** — kaistavoittoista: ~0,5 s / 100 kt (mallin tarkistus: 790 kt ≈ 4,0 s kaistalla 200 kB/s; auth alkaa 5,9 s). *arvio*
2. **gapi/popupRedirectResolver** — −0,78 s auth-alku, −0,67 s interaktiivinen (gapi-A/B, puhelin; *mitattu*); koskee vain mobiili-UA:ta (kokeilla varmistettu, 4 SDK-versiota).

## 2. Vivut

| Vipu | Kuvaus | Auth-alku | TTI | Tila / luotettavuus | Työ / riski |
|---|---|---|---|---|---|
| **K1** | kielipaketti-malli fi:lle (72 kt) | −0,36 s | −0,36 s | *arvio*, malli jo käytössä | S · matala |
| **K2** | näkymäkohtaiset laiskoiksi (174 kt, erinä) | −0,87 s | −0,87 s | *arvio*, vahvistettava Teron Tänään-kattavuusajolla | M · keski |
| **B** | kaksivaiheinen lataus: auth käynnistyy vaiheen 1 (SDK + appcheck + lang + pääskripti ≈ 310 kt) jälkeen, loput kirjastot taustalla | −2,4 s (sisältää K1+K2:n tavut) | → ~5,3 s | *hypoteesi* ±1 s; vaatii prototyypin | L · korkea (boot-järjestys) |
| **M2** | modulaarinen Firebase ilman resolveria (gapi pois) | −0,7 s | −0,67 s | *mitattu* (gapi-A/B); toteutuksessa pienempi, jos tavuvipu on jo vienyt kaistaa | L · korkea (istunnot, App Check, adapteri) |

K1 ⊂ K2 ⊂ B tavuissa (B sisältää K1/K2-tavut): **ei summata** B:n kanssa.

## 3. Yhteisvaikutus (skenaariot)

Oletus additiivisuudesta: tavuvivut ja gapi kilpailevat osin samasta kaistasta (gapi `api.js` + iframe ladataan rinnakkain skriptien kanssa) → todellinen yhteishyöty ≤ summa. Alla "ylä" = additiivinen, "ala" = gapi-osuudesta 50 % päällekkäistä.

| # | Yhdistelmä | Auth-alku | TTI ylä | TTI ala | Alle 5 s? |
|---|---|---|---|---|---|
| 0 | nykytila | 5,9 s | 7,7 s | — | ei |
| 1 | K1 + K2 | ~4,7 s | ~6,5 s | ~6,5 s | ei |
| 2 | K1 + K2 + M2 | ~4,0 s | ~5,8 s | ~6,1 s | **ei** |
| 3 | B | ~3,5 s | ~5,3 s | ~5,3 s | rajalla (ei) |
| 4 | **B + M2** | ~2,8 s | **~4,6 s** | ~5,0 s | **kyllä (ylä) / rajalla (ala)** |
| 5 | B + M2 + SDK-kevennys (jos löytyy) | <2,8 s | <4,6 s | — | marginaalia |

**Johtopäätös (arvio):** K1+K2+M2 ei yksin riitä (~5,8–6,1 s). **Alle 5 s vaatii B:n** (kaksivaiheinen lataus); B yksin on rajalla, **B + M2 antaa marginaalia** (~4,6–5,0 s). Epävarmuus ±1 s — B on hypoteesi, ja tuotannon ensikäynti on hitaampi kuin staging (reCAPTCHA Enterprise ~353 kt gz, ks. §6).

## 4. Suositeltu järjestys (jokainen oma PR + vuorotteleva A/B, `--sivut=pelaaja --profiilit=puhelin`)

| Vaihe | PR | Miksi tässä kohdassa | Kaista |
|---|---|---|---|
| **1** | **K1** (kielipaketti: `tm_lib_i18n`, `tm_teknistaktiset_sv`, `tm_tt_sv_valinta`, −72 kt) | matalin riski, mitattavissa heti; ottaa käyttöön Pelaajan laiska-testimallin (deploy-muoto) jota B tarvitsee | Tero |
| **1b** (rinnan) | **Teron kattavuusajo** (kirjautunut Tänään, `kattavuus_skriptit.js --sivu=pelaaja`) | vahvistaa K2/K3-rajan **ja B:n vaiheen 1 / 2 -jaon** ennen kuin kirjoitetaan koodia | Tero (komento kattavuusdokissa §5) |
| **2** | **B-prototyyppi** (selvitys + deploy-muodon selaintesti ilman merge-aikomusta): pääskripti ajetaan ennen kirjastoja, `_initFirebase` käynnistyy, Tänään-render odottaa vaiheen 2 -portin; mittaa A/B | ratkaisee, onko B:n hypoteesi (−2,4 s) tosi ennen kuin sitoudutaan M2:n laajuuteen | Tero |
| **3** | **B toteutus** (jos prototyyppi ≥ −1,5 s) — kirjastoryhmät vaiheeseen 2 erinä; K2 jää pois erillisenä | | Tero |
| **4** | **M0→M1→M2** (modulaarinen Firebase: adapteri, sitten kytkentä; ks. Auth §8.3) | M2 on isoin yksittäinen työ ja antaa vain −0,7 s; aloitetaan vasta kun B:n tulos tiedetään (jos B:n jälkeen TTI jo < 4,5 s, M2 voi odottaa) | Tero |
| **5** | M3 Vanhempi samalla adapterilla | vasta Pelaajan jälkeen | Tero |

Jos B-prototyyppi epäonnistuu (< −1,5 s tai pääskriptin ylätaso riippuu kirjastoista): fallback = K1 + K2 + M2 (~5,8–6,1 s) — **ei alle 5 s**; silloin lisävipuja: SDK-kevennys (firestore compat 98 kt gz on suurin yksittäinen erä; `firestore-lite` ei sovi, koska `onSnapshot` tarvitaan), Sentry-CDN pois auth-polulta, Archivo/fontit (jo itse-isännöity).

## 5. Päällekkäisyydet ja ristiriidat (jotta PR:t eivät törmää)

- **B ja M2 koskevat molemmat `_initFirebase()`:a ja SDK-tageja** → ei rinnakkain; B ensin (muuttaa latausjärjestystä ja lisää vaiheportin), M2 sen päälle (SDK-tagit → ESM `type=module`, jotka ovat deferred ja ajetaan dokumenttijärjestyksessä — varmistettava B:n vaihejaon kanssa).
- **Adapteri (M1) ja kirjastot:** libit ottavat `db`:n parametrina compat-muodossa → adapteri kuuluu **vaiheeseen 1** (tarvitaan Firestore-lukuun ennen vaihetta 2). Lisää ~pieni tavumäärä vaiheeseen 1 (arvio < 10 kt gz).
- **SW:** vaihe 2:n kirjastot jo allowlistissä polulla; offline-avaus vaatii, että vaiheen 2 lataus ei jää kesken offlinessa (SW-cache esilataus kuten Masterin L2) — sama testi molemmille.
- **K1 ja B:** K1:n siirtämät kirjastot ovat B:ssä vaiheessa 2 joka tapauksessa; K1 on silti hyödyllinen aikaisena, riskittömänä ja mitattuna askeleena (jos B viivästyy).
- **Ei kosketa:** PIN/kutsulinkki-käyttäytyminen (testataan jokaisessa PR:ssä), SW-päivitysmekanismi, sv-tekstit.

## 6. Mittaus ja hyväksymisportit

- Jokainen PR: `ab_vuorotellen.js --sivut=pelaaja --profiilit=puhelin` (3 kierrosta; sama suunta kaikilla); tavoite per PR: K1 ≥ −0,25 s; B ≥ −1,5 s; M2 ≥ −0,6 s (auth-alku ja interaktiivinen). Dokumentin koon muutoksesta ei tarvitse varoittaa kun muutos on odotettu: `--odotettu-dokero="<syy>"` (PR #1344).
- **Tuotanto ≠ staging:** staging käyttää debug-tokenia → ei reCAPTCHA Enterprise -latausta; tuotannon kylmällä ensikäynnillä (~353 kt gz, ensimmäisessä backend-kutsussa) TTI on hitaampi kuin A/B näyttää. **Ehdotus:** erillinen mittaus ilman debug-tokenia (tai Real User Monitoring/Sentry-perf, jos käytössä) ennen kuin TTI < 5 s kirjataan "saavutetuksi tuotannossa".
- Käyttäjähyöty: FCP jo 0,38 s (odotustila); TTI-tavoite < 5 s koskee *käyttövalmista* näkymää.

## 7. Päätettävää PM:ltä

1. Hyväksytäänkö järjestys K1 ∥ kattavuusajo → B-prototyyppi → (B) → M2? (M2:n aikaistaminen ei auta ilman B:tä: skenaario 2 ≈ 5,8–6,1 s.)
2. Prototyypin porttiehto: B jatkoon jos A/B ≥ −1,5 s (auth-alku) ja deploy-muodon testit vihreinä — sopiiko?
3. Mittaus ilman debug-tokenia tuotantoa vastaavasti — kuka/miten (Tero)?
