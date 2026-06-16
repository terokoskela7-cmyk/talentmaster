# Pilotin tila — komentokeskus (spec, ensimmäinen versio)

> Scoping 2026-06-16. Päätös: **read-only komentokeskus** Admin-näkymään, pilotin käyttöönottovaiheen (§9) operatiivinen työkalu.
> Korvaa litteän Tilastot-taulukon laajemmalla "kuka etenee, kuka jumittaa ja miksi" -näkymällä.
> **Periaate: ei uutta infraa, ei uusia raskaita kyselyjä** — rakentuu `renderTilastot`:n JO lataamasta per-seura-pelaajadatasta (Admin.html:1267) + pikakentistä (§26).
> Liittyy: §9 (pilotin live-tila) · §26 (pikakentät) · §30 (seuradatakartta) · PILOTTI_RUNBOOK (go-live >70 %/vk).

---

## 1. ONGELMA

Admin on hallinnollinen rekisteri + suostumuslaskuri. Se ei kerro **käytetäänkö järjestelmää, missä jumitetaan, kuka tarvitsee tukea.** Pilotin omistajalta puuttuu komentokeskus. Seuradatakartta (§30) paljastaa rajun eron seurojen välillä (SJK H-H · Sibbo TKI-only · palloiirot/grifk pelkät rosterit · KPV vain Topias) — Admin ei näytä tätä lainkaan.

## 2. DATALÄHDE (ei uusia kyselyjä)

`renderTilastot` lataa jo `seurat/{id}/pelaajat`-täydet dokumentit per seura. Lisätään **samaan silmukkaan** (Admin.html ~1272) pikakenttä-tallennukset. Kaikki alla oleva luetaan pelaajadokumentin pikakentistä — **ei alikokoelmakyselyjä**.

## 3. NÄYTETTÄVÄT MITTARIT (per seura)

### A. Rekisteröintisuppilo (= go-live-mittari)
`suostumusTila`-kentästä (täysin saatavilla):
- **Tuotu** (`pilotti`) → **Kutsuttu** (`odottaa`) → **Suostumus** (`annettu`)
- **Konversio-%** = annettu / (odottaa + annettu). Go-live-kriteeri >70 %.
- **"Ei vastausta" -lista** = `suostumusTila === 'odottaa'` -pelaajat (nudge-kohde vaiheessa 2).

### B. Datakypsyys (% pelaajista joilla mittaus, pikakentistä)
- **Testattu-%** = `hh_viimeisin || tki_viimeisin || d1_taso != null`
- **ADAR** = % joilla `adar_havaintoja >= 1` (ja ≥3 luotettava)
- **PHV** = % joilla `phv_tila`
- **FLEI** = % joilla `flei_viimeisin`

### C. Viimeisin aktiviteetti
Tuorein mittauspäivä per seura = `max(tki_pvm, hh_pvm, adar_pvm, ...)` pikakentistä → "viimeisin mittaus X pv sitten".

### D. 🟠 Blokkeri + toimenpide-ehdotus (sääntöpohjainen, näytä tärkein)
| Ehto | Blokkeri | Ehdotettu toimenpide |
|---|---|---|
| 0 pelaajaa `phv_tila` | "0 kasvumittausta → PHV lukossa" | Aja kasvumittaus (Testaus_v9) |
| Konversio <70 % & odottaa > 0 | "X kutsua odottaa vastausta" | Muistuta (nudge, vaihe 2) |
| 0 mittausta (vain rosteri) | "0 mittausta — odottaa testidataa" | Tuo testidata / aja testaus |
| Testattu mutta `tki_merkki`/`hh_taso` puuttuu | "Mittaus tuotu, indeksit laskematta" | Aja recalcHH / recalc TKI |
| `annettu` mutta 0 mittausta | "Suostumus annettu, ei dataa" | Aktivoi / tarkista käyttö |

## 4. LAYOUT

- **Yläkooste:** koko pilotin suppilo (Σ tuotu → kutsuttu → annettu, konversio-%) + seurojen lukumäärä.
- **Per seura -kortti/rivi:** nimi · suppilo-minipalkki (tuotu→kutsuttu→annettu) konversio-%:lla · datakypsyys-chipit (Testattu % · ADAR % · PHV %) · viimeisin aktiviteetti · 🟠 blokkeri + toimenpide.
- Klikkaus seuraan → laajenna (porautuminen: "ei vastausta" -lista + blokkeridetaljit). *(Voi olla vaiheen 1 lopussa tai 1.5.)*
- Read-only · design-tokenit §5 · `firebase.app().functions('europe-west1')` jos CF-kutsuja (ei tässä versiossa).

## 5. RAJAUS (ensimmäinen versio EI sisällä)

- **Nudge-lähetys** (muistutus vastaamattomille) → vaihe 2, vaatii CF:n + sähköpostin.
- **Tarkka "kutsu lähetetty X pv sitten"** → vaatii `kutsut`-kokoelman/audit-luvun (kevyt lisäys myöhemmin); ensimmäinen versio listaa vain `odottaa`-pelaajat.
- **Käyttö/login-aktiivisuus** ("kirjautuuko kukaan, streakit, valmentajat jotka eivät kirjaa") → vaatii aktiviteetti-pikakentän (esim. `viimeisin_kirjautuminen`) jota ei vielä ole → vaihe 2.
- **GDPR-ops (B4, vienti/poisto/audit)** · **laskutus (SaaS)** · **täysi Sentry-terveysdashboard** → omat hankkeensa, eivät tähän.

## 6. SEURAAVAT

1. Code-komento: laajenna `renderTilastot` (tai uusi `renderPilotinTila`) — samasta data-ajosta, pikakentät, suppilo+kypsyys+blokkeri, read-only.
2. Vaihe 2: nudge-lähetys (CF) + tarkka kutsupäivä (kutsut/audit) + käyttö-pikakenttä.
3. Aktiviteetti-signaali (`viimeisin_kirjautuminen` pikakenttä) → mahdollistaa "aktiivinen"-suppiluvaiheen + valmentaja-aktiivisuuden.
