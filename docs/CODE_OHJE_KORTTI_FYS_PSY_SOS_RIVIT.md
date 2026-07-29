# CODE — Kortti: FYS/PSY/SOS-rivien kehitysteksti (kääntöpuoli)

**Tyyppi:** Copy-rubriikki (uusi lib) + UI (kortin kääntöpuoli, olemassa olevan rubriikkikuvion uudelleenkäyttö).
**Ei Rules-/skeema-/laskentamuutosta.** **Pieni PR.**
**Kohteet:** `lib/tm_kortti_rubriikit.js` (UUSI, malli = `lib/tm_adar_rubriikki.js`) · `TalentMaster_Pelaaja_v7.html`
→ `naytaFcOverlay` kääntöpuolen `bar()` **FYS- ja PSY-haarat**.
**Jatkoa `docs/CODE_OHJE_KORTTI_ALY4_JA_TEK_KEHITYSTEKSTI.md`:lle** — se teki TEK + ÄLY rikkaiksi ja jätti
eksplisiittisesti *"FYS/PSY/SOS geneerisiä toistaiseksi"*. Tämä briiffi tekee ne loppuun.

## Tausta (Teron livehavainto, kortin kääntöpuoli "OMA TASOSI & SEURAAVA ASKEL")
Kääntöpuolella **TEK** ja **ÄLY** näyttävät rikkaan kuvauksen ("Nyt: *Näet pelin askeleen edellä* 🌟 / Seuraava
askel: …"), mutta **PSY** näyttää pelkän geneerisen `"Nyt taso 3/5 · seuraavaan: taso 4/5"` ja **FYS** putoaa
samaan geneeriseen fallbackiin (tai lukko/🌱-tilaan). Epäjohdonmukaista. **SOS** on pehmeä lukko — se on OK.

## Malli (ÄLY, jo koodissa — matki tätä)
`lib/tm_adar_rubriikki.js` → `TASOT[1..5] = {nimi, nyt, askel}`, `alyTaso(t)` palauttaa `{taso,nimi,nyt,askel}`
tai `null` (→ geneerinen fallback). Kortin `bar()` ÄLY-haara renderöi `r.nyt` + "Seuraava askel: " + `r.askel`.
**FYS ja PSY tekevät jatkossa täsmälleen saman kuvion** omilla rubriikeillaan.

---

## OSA A — Uusi lib `lib/tm_kortti_rubriikit.js`

IIFE + dual-export (root-global `TM_KORTTI_RUBRIIKIT` + `module.exports`, kuten `tm_adar_rubriikki.js`).
Kaksi funktiota: **`fysTaso(t)`** ja **`psyTaso(t, pisteet?)`** → `{taso,nimi,nyt,askel[,vahvuus]}` tai `null`.
Sama guard kuin `alyTaso`: `t=Math.round(Number(taso)); if(!(t>=1)) return null; if(t>5)t=5;`.
Copy on **lapsen kielellä (§7.22)** — kriteeripohjainen oma taso + oma seuraava askel, **EI vertailua muihin**,
prosessikehu (Dweck), ei uhkakieltä. Ei tasonumeroa tekstiin (kortti näyttää numeron erikseen toissijaisena).

### A.1 — `fysTaso(t)` (fyysiset taidot, D1)
§28-turvallinen: **kannustava jokaisella tasolla**, ei "olet hidas". (Pre-PHV 🌱-tila EI kutsu tätä — ks. B.)
```
1: { nimi:'Perusta',       nyt:'Rakennat liikkumisen perustaa 🌱', askel:'Leiki, juokse ja hyppää paljon — keho vahvistuu.' }
2: { nimi:'Vahvistuva',    nyt:'Liikut yhä ketterämmin 🏃',        askel:'Harjoittele nopeita lähtöjä ja suunnanmuutoksia.' }
3: { nimi:'Ketterä',       nyt:'Olet nopea ja tasapainoinen ⚡',   askel:'Yhdistä nopeus ja pallo — kiihdytä hallitusti.' }
4: { nimi:'Räjähtävä',     nyt:'Kiihdytät ja hyppäät voimalla 💥', askel:'Muista palautuminen — voima kasvaa levolla.' }
5: { nimi:'Huippukunto',   nyt:'Liikut huipputasolla 🌟',          askel:'Pidä yllä ja monipuolista liikkumista.' }
```

### A.2 — `psyTaso(t, pisteet?)` (mielen taidot, D3)
D3-osa-alueet (Pelaaja_v7 `_MINA_D3_KYS`): `inner_drive · coachability · resilience · focus · emotional_control`.
Taso-rubriikki:
```
1: { nimi:'Alku',          nyt:'Harjoittelet keskittymistä ja sinnikkyyttä 🌱', askel:'Yritä jatkaa vielä hetki, vaikka tuntuisi vaikealta.' }
2: { nimi:'Kasvava sisu',  nyt:'Jaksat yrittää uudelleen 💪',                   askel:'Kuuntele yksi vinkki ja kokeile sitä heti.' }
3: { nimi:'Keskittyjä',    nyt:'Pysyt mukana ja rauhoitut 🎯',                  askel:'Pidä pää pelissä koko treenin — myös lopussa.' }
4: { nimi:'Sinnikäs',      nyt:'Palaudut pettymyksistä nopeasti 🔄',            askel:'Kun ärsyttää, hengitä ja jatka — virhe ei jää päähän.' }
5: { nimi:'Vahva mieli',   nyt:'Johdat itseäsi ja pysyt rauhallisena 🌟',       askel:'Näytä esimerkkiä muille — pidä yllä.' }
```
**Valinnainen ⭐vahvuus (kuten TEK):** jos `pisteet`-olio annetaan (= `p.d3_viimeisin.pisteet`, per-dim `{key:{avg|pelaaja|valmentaja}}`),
poimi **korkein osa-alue** ja palauta `vahvuus`-kenttänä lapsen sana. Mäppäys (näyttönimet):
`inner_drive→'Oma into' · coachability→'Ohjeiden kuuntelu' · resilience→'Sinnikkyys' · focus→'Keskittyminen' · emotional_control→'Rauhallisuus'`.
Käytä per-dim arvoa `pisteet[key].avg` (fallback `.pelaaja` → `.valmentaja`); tasapelissä ensimmäinen `_MINA_D3_KYS`-järjestyksessä.
Jos `pisteet` puuttuu → `vahvuus` jätetään pois (ei pakoteta).

---

## OSA B — Kortin `bar()` FYS- ja PSY-haarat (`naytaFcOverlay`)

Kortin kääntöpuolen `bar(d)` (`TalentMaster_Pelaaja_v7.html`) rakentaja/leikkijä-polussa. **Lisää FYS- ja PSY-haarat
ENNEN geneeristä fallbackia**, samalla kuviolla kuin ÄLY-haara (`window.TM_ADAR_RUBRIIKKI`):

### B.1 — FYS
- **Ennallaan säilytettävät tilat (§28/§30 "näytä mitä on"):** `d.tila==='tulossa'` → "⏳ Tulossa — valmentaja mittaa";
  `d.state==='grow'` (pre-PHV) → "🌱 Kasvuvaiheessa …". **Nämä EIVÄT kutsu `fysTaso`:a** (pre-PHV pysyy neutraalina, §28).
- **Vain mitatulle** (`d.taso5 != null` ja ei grow/tulossa): kutsu `window.TM_KORTTI_RUBRIIKIT.fysTaso(d.taso5)` →
  renderöi `r.nyt` + "Seuraava askel: " + `r.askel` (sama markup kuin ÄLY-haara). Fallback geneeriseen jos `null`.

### B.2 — PSY
- `d.tila==='seura-avaa'` (ei D3-dataa) → **ennallaan** pehmeä lukko "🤝 Seura avaa myöhemmin — ei sinusta kiinni".
- **Mitatulle** (`d.taso5 != null`): kutsu `psyTaso(d.taso5, p.d3_viimeisin && p.d3_viimeisin.pisteet)`. Renderöi:
  - jos `r.vahvuus` → rivi "⭐ Vahvuutesi: **<r.vahvuus>**" (kuten TEK),
  - sitten `r.nyt` + "Seuraava askel: " + `r.askel`.
  - Fallback geneeriseen jos `null`.

### B.3 — SOS (EI muutosta)
SOS pysyy pehmeänä lukkona ("🤝 Seura avaa myöhemmin — ei sinusta kiinni"). **Ei mittaria → ei rubriikkia, ei
keksittyä lukua.** Älä koske.

### B.4 — Showcase (U16–19) EI muutosta
`naytaOvr`-polku (arvo-palkit) ennallaan — rubriikkitekstit ovat rakentaja/leikkijä-polkua varten (kuten TEK/ÄLY).

---

## KRIITTINEN reunaehto — clippaus (sama kuin edellisessä briiffissä, nyt korostuneena)
Kääntöpuoli (`fc-back`) on **kiinteä 470px, `overflow:hidden`**. Nyt neljä riviä (FYS·TEK·PSY·ÄLY) voi olla
monirivisiä yhtä aikaa → **ylivuotoriski kasvaa.** Vaatimus:
- Pidä **jokainen rivi max 2 riviä** (mieluiten 1–2). Jos ei mahdu, **tiivistä copyt / pienennä rivivälejä** —
  **ÄLÄ venytä korttia** (ei muuta 470px-korkeutta).
- Verifioi pelaajalla jolla **FYS + TEK + PSY + ÄLY kaikki mitattu** (pilottidatassa harvinaista — injektoi
  testiin `d1_taso` + `d3_viimeisin.pisteet` esim. Topiaalle, TAI käytä synteettistä `_pelaaja`-oliota harnessissa).

## Reunaehdot
- **Ei Rules-/skeema-/laskentamuutosta.** Vain uusi rubriikki-lib + kaksi render-haaraa. Read-only kuluttajanäkymä.
- **§7.22:** lapsen kieli, oma taso + oma askel, ei vertailua muihin, ei percentiiliä, ei uhkakieltä. Ei tasonumeroa
  tekstiin (numero on jo kortin toissijainen elementti).
- **§28:** pre-PHV FYS (🌱-grow) EI kutsu `fysTaso`:a — pysyy neutraalina.
- **Yksi lähde:** rubriikit vain `lib/tm_kortti_rubriikit.js`:ssä (ei inline-copyja korttiin), kuten `tm_adar_rubriikki.js`.
- **`?v=`-bump:** uusi lib ladataan Pelaaja_v7:ään → lisää `<script src="lib/tm_kortti_rubriikit.js?v=1">` ja
  nosta Pelaaja_v7:n oma `?v=`. **Vanhempi_v2 EI kuulu tähän** (perhe-kortti erillinen, oma briiffi myöhemmin jos halutaan).
- **Design-lukko + molemmat teemat** (kortin tummat tierit; DM Sans -teksti, Cormorant otsikot). Emojit semanttisina.

## Definition of Done
- **L1:** uusi `lib/tm_kortti_rubriikit.js` (`fysTaso`/`psyTaso`, dual-export, guard kuten `alyTaso`); kortin `bar()`
  FYS- ja PSY-haarat kutsuvat niitä ja renderöivät "Nyt + Seuraava askel" (+ PSY:n ⭐vahvuus kun pisteet on);
  grow/tulossa/seura-avaa-tilat + SOS + showcase ennallaan; fallback geneeriseen kun rubriikki `null`.
- **L2 (vitest):** `fysTaso(1..5)`/`psyTaso(1..5)` palauttavat oikeat `{nimi,nyt,askel}`; `psyTaso` `vahvuus`-poiminta
  (korkein osa-alue → oikea näyttönimi, tasapeli-järjestys, puuttuva pisteet → ei vahvuutta); guard (`0`/`null`/`>5`).
  ~795+ vihreä, 0 regressiota.
- **L3 (elävä, molemmat teemat):** kortin kääntöpuoli näyttää **FYS** ja **PSY** rikkaana ("Nyt … / Seuraava askel: …",
  PSY:llä ⭐vahvuus kun D3-pisteet on); **SOS** pehmeä lukko ennallaan; **mikään ei leikkaudu** 470px:ssä kun FYS+TEK+PSY+ÄLY
  kaikki näkyvät. Pre-PHV FYS näyttää yhä 🌱 (ei fysTaso-tekstiä).
- Pieni PR. Lataa Pelaaja_v7 uudelleen deployn jälkeen (`?v=`-bump).

## Huom Codelle
- Copy-luonnokset yllä ovat **valmiita** — käytä niitä sellaisenaan (Tero on hyväksynyt sävyn). Jos jokin rivi ei
  mahdu 470px:ään, **lyhennä `askel`-tekstiä**, älä poista riviä.
- `bar()`-haarojen järjestys: `seura-avaa` / `tulossa` / `grow` -tarkistukset ensin (ne ohittavat rubriikin),
  sitten `naytaOvr`, sitten ÄLY, TEK, **FYS, PSY** (uudet), lopuksi geneerinen fallback.
