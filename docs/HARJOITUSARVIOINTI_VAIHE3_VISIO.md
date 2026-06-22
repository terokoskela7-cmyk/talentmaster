# Harjoitusarviointi — Vaihe 2.3 + Vaihe 3 visio & suunnitelma

> Scoping 2026-06-22 (Tero). Jatkaa Vaihe 1 + 2.1 + 2.2 (kaikki live + verifioitu). Tämä doc = **2.3 (valmentajan oma kehitys)**
> + **Vaihe 3 (white-label + cross-club-aggregaatti)** suunnitelma ja visio ennen koodausta. Periaate: pikakentät (§26),
> data-tietoinen (§29), Carbon (§5), §7.22 (valmentajan kasvu, ei tuomio), §11 (anonyymi benchmark n≥30), §13 (CF europe-west1).

---

## 0. VISIO — mihin koko harjoitusarviointi tähtää

Harjoitusarvioinnista tulee **suljettu valmentajan kehityssilmukka + verkostotason laatujärjestelmä**:
1. **Valmentaja** näkee oman kehityksensä (laatu, taidot, itsetuntemus, saatu palaute) kasvua tukevasti → motivaatio + omistajuus.
2. **Seura/VP** näkee valmennuksen laadun ja kalibraation → kohdennettu mentorointi (jo 2.1/2.2).
3. **Verkosto** tuottaa anonyymin vertailupohjan (TM-cross-club) → jokainen seura näkee missä se on suhteessa muihin TM-seuroihin, ei vain Palloliiton julkaisemiin lukuihin.
4. **Brändi:** seura näkee järjestelmän omanaan (logo/väri) → adoptio + omistajuus + myyntivaltti.

Sama data, kolme yleisöä (valmentaja/seura/verkosto) — kuten pelaajapuolella (pelaaja/valmentaja/VP). Moat: mitä enemmän seuroja + arviointeja, sitä arvokkaampi verkostovertailu (verkostovaikutus).

---

## 1. VAIHE 2.3 — Valmentajan oma kehitysnäkymä (Master)

**Tavoite:** valmentaja näkee oman ammatillisen kehityksensä yhdessä paikassa — **kasvua tukevasti** (§7.22-henki valmentajalle: ei tuomiota, vaan kehitys + omistajuus).

**Sijainti:** Master uusi näkymä **"Valmentajana kehittyminen"** (laajentaa nykyistä "Saatu palaute" -näkymää kokonaiseksi omaksi dashboardiksi).

**Sisältö (kaikki valmentajan OMASTA datasta):**
- **Omat trendit:** harjoituslaatu (malli A, /10) + valmennustaidot (malli B, /5) ajassa. Lukee omat `harjoitusarvioinnit` (`where valmentajaUid==self`) + pikakentät (`harjoituslaatu_ka`/`valmennustaito_ka`).
- **Oma kalibraatio:** itsearvio vs havainnointi -kuilu (vain vahvistetut parit), **myönteisesti** ("havainnoija näki tämän hieman eri tavalla — hyvä keskustelunaihe"; suunta kohti pienenevää kuilua = kasvava itsetuntemus). `harjoitusKalibraatioHistoria` omalla datalla.
- **Saatu palaute koottuna:** `palaute_jaettu` kaikista omista arvioinneista (aikajärjestyksessä). **EI** `palaute_yksityinen` (Rules + ei kyselyä).
- **Oma reflektiopäiväkirja:** omat malli B -reflektiot (onnistui/toisin/kehityskohde) aikajanana → näkee oman kasvunsa sanoissa.
- **Seuraava askel:** uusin sovittu kehityskohde (saadusta palautteesta / omasta reflektiosta) nostettuna.

**Alivaiheistus (lukittu 2026-06-22):**
- **2.3a (ensin):** dashboard — trendit + kalibraatio + saatu palaute + reflektiopäiväkirja **tekstinä** (lukee arviointien reflektiot, `valmentajaUid==self`). Buildattavissa olemassa olevalla datalla + Rulesilla. Ei uutta infraa.
- **2.3b (heti perään):** **standalone-päiväkirjamerkinnät + äänireflektio.** Uusi kokoelma `seurat/{sid}/kayttajat/{uid}/reflektiot/{id}` `{teksti?, audio_url?, pvm, lahde:'oma'}`. Ääni = selain **MediaRecorder** (audio/webm) → **Firebase Storage** `seurat/{sid}/kayttajat/{uid}/reflektiot/{id}.webm` → `audio_url` → toisto `<audio>`. **Storage Rules** (erillinen Storage-ruleset): kirjoitus vain oma uid -polkuun; **Firestore Rules** `kayttajat/{uid}/reflektiot`: read/write oma uid + SA (valmentajan oma yksityinen kasvupäiväkirja — VP näkee arviointiin sidotun reflektion, EI standalone-merkintöjä). §7.22: kasvun työkalu, ei valvonta.

**Data & Rules:** valmentaja lukee oman seuran `harjoitusarvioinnit` (read = onOmaSeura ✓), suodattaa `valmentajaUid==self`. `palaute_jaettu` luettavissa; `palaute_yksityinen` EI. Pikakentät omasta `kayttajat`-dokista. **Ei uutta Rulesia.**

**§7.22-invariantti valmentajalle:** vahvuus ensin · kehitys prosessina · ei vertailua muihin valmentajiin · kalibraatiokuilu kasvun työkaluna, ei arvosanana.

**Lib:** uudelleenkäyttää 2.1/2.2-funktioita (kooste/trendi/kalibraatio) omalla datalla — ei uusia laskureita (mahd. pieni `omaKehitysKooste`-helper).

---

## 2. VAIHE 3A — White-label (logo + brändiväri)

**Tavoite:** seura näkee järjestelmän omanaan. Carbon (§5) säilyy pohjana; vain **aksentti + logo** muokattavissa.

**Konfiguraatio:** `seurat/{sid}/konfiguraatio/brandi { logo_url, accent_hex, accent_paalle_teksti_hex }`.
- **Logo:** lataus Storageen `seurat/{sid}/brandi/logo.*` (SA/johto). Näkyy: harjoitusarviointi-lomakkeen + dashboardin header + **PDF-viennit** (asiakaspintaiset artefaktit ensin).
- **Aksenttiväri:** korvaa teal-aksentin harjoitusarviointi-UI:ssa. **Saavutettavuusrajoite:** kontrasti validoitava (ei salli lukukelvotonta); fallback teal jos kontrasti riittämätön.
- **Skooppi (lukittu 2026-06-22):** **harjoitusarviointi-artefaktit ensin** (lomake/dashboard/PDF, rajattu riski). **Jatkosuunnitelma: platform-laajuinen white-label** omana myöhempänä vaiheena — `konfiguraatio/brandi` suunnitellaan heti niin että sama doc skaalautuu koko platformiin (Master/VP/Pelaaja/Vanhempi header + PDF:t) ilman uudelleenmäärittelyä: aksentti `--accent`-tason override + logo-slotit, jotka muut näkymät voivat ottaa käyttöön vaiheittain.

**Rajaus:** ei muuta Carbon-tokeneita; vain `--accent`-tason override + logo-slotit. Ei riko olemassa olevia näkymiä (oletus = TM-teal + ei logoa).

---

## 3. VAIHE 3B — Cross-club-aggregaatti (TM-verkoston oma kansallinen ka)

**Tavoite:** "vs kansallinen" -vertailuun **toinen lähde** Palloliiton manuaalisten lukujen rinnalle: **TM-verkoston elävä keskiarvo** kaikista TM-seuroista, anonymisoituna.

**Arkkitehtuuri (KRIITTINEN — cross-tenant):**
- Client ei voi lukea muiden seurojen dataa (Rules tenant-isolaatio). → **Cloud Function** (admin SDK, europe-west1, **ajastettu esim. viikoittain**) lukee kaikkien seurojen `harjoitusarvioinnit`, laskee **per ikävaihe per kriteeri** keskiarvon + n, kirjoittaa julkisesti luettavaan aggregaattidokumenttiin:
  ```
  harjoitusarviointi_benchmark/{ikavaihe} { per_kriteeri:{a1:{ka,n}…}, n_arviointeja, n_seuroja, paivitetty }
  ```
- **Yksityisyys (§11-periaate):** vain aggregaatti, **ei koskaan seura-/valmentaja-tunnisteita**. Julkaistaan vain kun **n ≥ 30 arviointia** (ja esim. **≥ 3 seuraa**) per ikävaihe — muuten "ei vielä riittävää otosta". **Opt-in:** seura päättää `konfiguraatio.benchmark_optin` osallistuuko (kuten benchmarks §11).
- **Rules:** `harjoitusarviointi_benchmark/{ikavaihe}` read = onKirjautunut; write = vain CF (admin). Client ei kirjoita.
- **Dashboard:** "vs kansallinen" saa **lähdevalitsimen**: (a) Palloliitto (manuaalinen, 2.1) · (b) TM-verkosto (cross-club, kun n≥30). Näytä AINA lähde + n.

**Datagate-todellisuus:** pilotissa (5 seuraa, vähän arviointeja) cross-club-aggregaatti **ei ole vielä tilastollisesti mielekäs**. → **Rakennetaan putki + gate (n≥30), näkyy vasta kun dataa on.** Pullonkaula = datapisteet, ei koodi (MOAT-doc §4 -periaate).

---

## 4. VAIHEISTUS & RIIPPUVUUDET

| Vaihe | Rakennettavissa nyt? | Huom |
|---|---|---|
| **2.3** valmentajan oma kehitys | ✅ kyllä | uudelleenkäyttää 2.1/2.2-libit; ei uutta Rulesia |
| **3A** white-label | ✅ kyllä | konfiguraatio + Storage-logo + accent-override; skooppi päätettävä |
| **3B** cross-club CF + aggregaatti | ✅ putki nyt, **näkyvyys datagate (n≥30)** | CF ajastettu + opt-in + Rules-blokki (Console-deploy) |

**Suositus järjestys:** 2.3 ensin (valmis silmukka valmentajalle) → 3A white-label (adoptio/omistajuus) → 3B cross-club (verkostovaikutus, datagate).

---

## 5. PÄÄTÖKSET — LUKITTU 2026-06-22

1. **2.3:** uusi Master "Valmentajana kehittyminen" -näkymä (laajentaa "Saatu palaute"). **Oma reflektiopäiväkirja KYLLÄ** + **äänireflektio** → alivaiheistettu 2.3a (dashboard + tekstipäiväkirja) / 2.3b (standalone-merkinnät + ääni, Storage). ✅
2. **3A white-label:** harjoitusarviointi + PDF ensin; `konfiguraatio/brandi` suunnitellaan platform-skaalautuvaksi (jatkovaihe). Logo Storageen (SA/johto). ✅
3. **3B cross-club:** CF-putki rakennetaan nyt, **näkyvyys n≥30 & ≥3 seuraa -gatella + opt-in pakollinen**. ✅
4. **Järjestys:** 2.3a → 2.3b → 3A → 3B, yksi kerrallaan mockup→komento→verify. ✅

## 6. VERIFIOINTI (jokaiselle vaiheelle)

new Function 0 virhettä · npm test vihreä · §17 grep=1/tiedosto · Carbon §5 (3A: accent-override + kontrasti) · string concat ·
RUNTIME + LIVE (?cb=, SA + demo): 2.3 valmentajan oma data + §7.22-kehys + ei `palaute_yksityinen` · 3A logo/accent näkyy + fallback · 3B CF tuottaa aggregaatin + datagate n<30 + lähdevalitsin.
