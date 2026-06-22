# Harjoitusarviointi — spec (kaksimallinen: Palloliitto-laatu + Valmennustaidot)

> Scoping 2026-06-22 (Tero). Un-stubaa Master "Arvioi harjoitus". **Kaksi täydentävää mallia**: A mittaa *istuntoa* (Palloliiton
> harjoitteluseuranta, kvantitatiivinen määrä/tiheys), B mittaa *valmentajaa* (pedagogiikka + itsereflektio, kvalitatiivinen).
> Kv-benchmark: FA 4-corner -havainnointi / EPPP coaching audit / CoachLogic-reflektio = malli B:n suku; Palloliiton kvantifioitu
> sisältömittaus + kansallinen benchmark = malli A, kv-tasolla erottuva. Periaate: pikakentät (§26), ei alikokoelmakyselyjä renderissä,
> data-tietoinen (§29 "näytä mitä on"), Carbon (§5), string concat (§7.1), yksi `@media 768px`/tiedosto (§17). Kytkeytyy §19 VAI+/SPL,
> §32 valmentajavaikuttavuus, B6 `laskeValmentajaKalibraatio`, VP-tuloskortti III (`VP_TULOSKORTTI_SPEC.md`).

---

## 1. KAKSI MALLIA — sama kokoelma, `malli`-kenttä erottaa

| | **A · Harjoittelun laatu (Palloliitto)** | **B · Valmennustaidot & itsereflektio** |
|---|---|---|
| Mittaa | *istunnon sisältöä* (kosketukset, toistot, liikkeessäolo %) | *valmentajan toimintaa* (organisointi, palaute, pedagogiikka) |
| Luonne | kvantitatiivinen (laskettava) | kvalitatiivinen + reflektio |
| Asteikko | k1/3/4/5/7 = 0–10 · k2/k6 = 0–100 % · k8 = kyllä/ei | b1–b7 = 1–5 + reflektio (vapaa teksti) |
| Arviointitapa | havainnointi (oletus) | **itsearvio** (valmentaja) TAI **havainnointi** (VP/mentori) |
| Pikakenttä | harjoituslaatu-ka → tuloskortti III | valmennustaito-indeksi (+ kalibraatiokuilu) → tuloskortti III |
| Ikävaiheistus | Lapsuus 5–11 / Nuoruus 12–15 (sanamuodot vaihtuvat) | yksi kriteeristö (ikävaihe kirjataan kontekstiksi) |

**Klubivalinta:** seura valitsee `mallit_kaytossa` = A, B tai molemmat + `oletusmalli`. Q7 (seuran oma kysymys) + seuran nimi headeriin.

---

## 2. MALLI A — kriteerit (Palloliiton harjoitteluseuranta)

Kriteeri-id `a1`–`a8`. Sanamuoto vaihtuu ikävaiheen mukaan; **käytä Palloliiton virallisten lomakkeiden tekstiä** (alla TM-versio, Tero hienosäätää).

**Lapsuusvaihe (5–11 v):**
| id | kysymys | asteikko | kuvaus |
|---|---|---|---|
| a1 | Valmennuksen toiminta on innostavaa | 0–10 | Vuorovaikutus aktiivista ja kannustavaa; palaute oppimista tukevaa; huomioi kaikki lapset |
| a2 | Pelaajat ovat harjoitusajasta liikkeessä | 0–100 % | Liikkumisen määrä kellolla; aktiivinen lajinomainen liikkuminen, ei turhaa odottelua |
| a3 | Toistojen määrä, pallokosketukset | 0–10 | Keskim. pallokosketukset/harjoitus. 1 = 100 kosketusta … 10 = 1000 |
| a4 | Toistojen määrä, teknis-taktiset toiminnat | 0–10 | Tilanteet joita on tavoitteena oppia. 1 = 10 toistoa … 10 = 100 |
| a5 | Lapset heittäytyvät pelille | 0–10 | Täysillä yrittäminen; rohkeita pallollisena ja pallottomana; läsnä opetustilanteissa |
| a6 | Maalintekoa mahdollistava harjoittelu | 0–100 % | Osuus harjoitteista joissa pelinomaista viimeistelyä. 2/4 harjoitetta = 50 % |
| a7 | Seuran oma tavoite (Q7) | 0–10 | Teksti `konfiguraatio/harjoitusarviointi.q7_kysymys` (oletus "Seuran oma tavoite") |
| a8 | Annetaanko henkilökohtainen palaute valmentajalle/tiimille | kyllä/ei | — |

**Nuoruusvaihe (12–15 v):** sama 8-kriteerin runko; sanamuodot iän mukaan (esim. a1 "vaativaa & innostavaa", a5 "Pelaajien toiminta on täysivauhtista"). Sama id:t, sama asteikko.

Jokaisella a1–a7: liukuri + **täsmennys** (textarea, max 200). a8: kyllä/ei-toggle.

---

## 3. MALLI B — kriteerit (valmennustaidot, 1–5)

Kriteeri-id `b1`–`b7`, asteikko 1–5 ankkurilabelein. Sama molemmille ikävaiheille.

| id | kysymys | matala (1) | korkea (5) |
|---|---|---|---|
| b1 | Harjoituksen organisointi & rakenne | hajanainen | erinomaisesti jäsennelty (sujuvat siirtymät, vähän jonotusta) |
| b2 | Tavoitteen selkeys | epäselvä | kirkas & kytketty jaksoteemaan/kehityskohteisiin |
| b3 | Palautteen anto — määrä | vähäistä / harvoille | runsasta & kattavaa (tavoittaa kaikki) |
| b4 | Palautteen anto — laatu | yleisluontoista | täsmällistä, oikea-aikaista, oivalluttavaa (kysyvä ote) |
| b5 | Pedagoginen ote & oppimisilmapiiri | ohjaajavetoinen | pelaajakeskeinen (virheet sallittu, autonomian tuki SDT) |
| b6 | Eriyttäminen & yksilöllistäminen | yksi taso kaikille | yksilöity (taitotaso + kypsyysvaihe §28 + kuormitus) |
| b7 | Vuorovaikutus & ilmapiiri | etäinen | lämmin & läsnä (psykologinen turvallisuus) |

Jokaisella b1–b7: 1–5-valinta + täsmennys (vapaaehtoinen).

**Itsereflektio (vain malli B):** kolme vapaata kenttää — `onnistui` (300), `toisin` (300), `kehityskohde` (200). Tämä on reflektion ydin.

---

## 4. ARVIOINTITAPA & KALIBRAATIO (malli B)

`arviointitapa: 'itsearvio' | 'havainnointi'`.
- **Itsearvio:** valmentaja arvioi oman harjoituksensa (Master, oletus).
- **Havainnointi:** VP/mentori havainnoi valmentajan harjoituksen (VP, oletus).
- **Kalibraatio:** kun samasta harjoituksesta on **sekä itsearvio että havainnointi**, lasketaan kuilu per kriteeri (itsearvio − havainnointi) → kytkeytyy B6:n `laskeValmentajaKalibraatio`-logiikkaan (valmentajan itsetuntemus vs ulkoinen arvio).
- **Vaihe 1:** molemmat tavat tallennetaan; `laskeHarjoitusKalibraatio` (lib) valmis. **Parituksen + kuilun UI-surfacing on datagate** (näkyy kun samalle harjoitukselle on molemmat) — ei pakoteta pariutusta Vaihe 1:ssä.

---

## 5. TALLENNUS (Firestore)

```
seurat/{sid}/harjoitusarvioinnit/{id} {
  malli: 'palloliitto' | 'valmennustaidot',
  arviointitapa: 'itsearvio' | 'havainnointi',   // 'havainnointi' oletus mallille A
  ikavaihe: 'lapsuus' | 'nuoruus',
  joukkue, valmentaja, valmentajaUid, arvioija, arvioijaUid,
  pvm (ISO),
  vastaukset:  { a1:8, a2:50, … }  // A: a1–a7 numerot · B: b1–b7 (1–5)
  tasmennykset:{ a1:"…", … },
  reflektio:   { onnistui, toisin, kehityskohde },  // vain B
  henk_palaute: true|false,                         // vain A (a8)
  luotu: serverTimestamp
}
```

**Pikakentät valmentajan dokumenttiin** `seurat/{sid}/kayttajat/{valmentajaUid}` (§26, ei alikokoelmakyselyjä tuloskortissa):
```
harjoituslaatu_ka, harjoituslaatu_n, harjoituslaatu_pvm,           // malli A (0–10 ka)
valmennustaito_ka, valmennustaito_n, valmennustaito_pvm,           // malli B (1–5 ka)
harjoituslaatu_liike_pct, harjoituslaatu_maali_pct (viimeisin)     // A:n %-kriteerit erikseen
```
Pikakentät = juokseva keskiarvo valmentajan arvioinneista (uusin painottaen ei tarpeen — yksinkertainen ka riittää Vaihe 1).

---

## 6. KONFIGURAATIO (klubikohtaisuus)

`seurat/{sid}/konfiguraatio/harjoitusarviointi`:
```
{ q7_kysymys: "Seuran oma tavoite",
  mallit_kaytossa: ['palloliitto','valmennustaidot'],   // seura valitsee
  oletusmalli: 'palloliitto' }
```
- Asettaa: SA / johto. Tyhjä konfiguraatio → oletus molemmat mallit + `palloliitto` oletuksena, Q7 = "Seuran oma tavoite".
- **Vaihe 1:** q7 + mallinvalinta. **Logo/brändiväri (täysi white-label) → Vaihe 3** (Carbon säilyy; header näyttää seuran nimen).

---

## 7. LIB (puhtaat funktiot — `lib/tm_eerikkila_normit.js`, ?v=23 → 24)

- `laskeHarjoituslaatuPalloliitto(vastaukset)` → `{ ka_0_10, liike_pct, maali_pct }` (ka = a1,a3,a4,a5,a7 keskiarvo; %-kriteerit erikseen).
- `laskeValmennustaitoIndeksi(vastaukset)` → b1–b7 keskiarvo (1–5), null jos 0 vastausta.
- `laskeHarjoitusKalibraatio(itsearvio, havainnointi)` → `{ per_kriteeri: {b1:Δ,…}, ka_abs_kuilu }` (itsearvio − havainnointi).
- `laskeValmentajaHarjoitusKooste(arvioinnit)` → koostaa pikakentät (ka + n + pvm) per malli.

**Vitest:** harjoituslaatu-ka (sis. %-erottelu) · valmennustaitoindeksi (+ null tyhjälle) · kalibraatiokuilu (etumerkki) · kooste useasta arvioinnista.

---

## 8. UI — sijainti & lomake

**Lomake (jaettu Master + VP):** data-vetoinen renderöinti kriteeriarrayista (§2/§3). Header: malli-chip + ikävaihe-chip (auto joukkueen iästä, käsin ohitettavissa) + joukkue/valmentaja/arvioija/pvm. Mallinvalitsin näkyy jos `mallit_kaytossa` > 1. Malli B: arviointitapa-toggle + reflektiolohko. "Tallenna arviointi" → doc + pikakentät.

- **Master "Arvioi harjoitus" (un-stub):** valmentaja → oletus `arviointitapa:'itsearvio'`, valmentajaUid = oma. Mallinvalinta `mallit_kaytossa`:sta.
- **VP "Työkalut" → "Arvioi harjoitus":** VP valitsee joukkue + valmentaja → oletus `arviointitapa:'havainnointi'`.

**Tuloskortti III (VP):** lukee `harjoituslaatu_ka` / `valmennustaito_ka` -pikakentät → valmentajavaikuttavuus-alueelle (max 4–5 KPI, drill-down). Datagate: tyhjä → "Ei harjoitusarviointeja vielä".

---

## 9. RULES (§12, Console-deploy)

```
seurat/{sid}/harjoitusarvioinnit/{id}:
  read:          SA || onOmaSeura()    // valmentaja näkee omat, VP/johto kaikki
  create/update: SA || onJohtoRooli() || onOmanSeuranValmentaja()
  delete:        SA
```
- `konfiguraatio/harjoitusarviointi`: kattuu olemassa olevaan `konfiguraatio`-blokkiin (read onOmaSeura · write SA||(onOmaSeura&&onJohtoRooli)).
- **Pikakentät `kayttajat/{uid}`:** kirjoitus = SA || (onOmaSeura && onJohtoRooli) || oma UID. Valmentajan itsearvio kirjoittaa **oman** kayttajat-dokin pikakentät (oma UID ✓); VP havainnointi kirjoittaa kohdevalmentajan (onJohtoRooli ✓). **Varmista ettei pikakenttä-write salli `rooli`-kentän muutosta** (olemassa oleva huoli, ei uusi).

---

## 10. VAIHEISTUS

1. **Vaihe 1 (tämä komento):** kaksimallinen runko + lomake (A + B) + tallennus + pikakentät + lib + vitest + Rules + Master un-stub + VP-sijainti + konfiguraatio (q7 + mallinvalinta) + tuloskortti III -lukukytkös. **Malli A oletus** (seurat käyttävät jo), Malli B mukana heti.
2. **Vaihe 2:** dashboard (Power BI -peili: havaintomäärä + trendi + keskiarvo vs **kansallinen Palloliiton ka** konfiguraatiosta + suodattimet) + kalibraatiokuilun UI-surfacing.
3. **Vaihe 3:** täysi white-label (logo/väri) + kriteerien muokattavuus yli Q7:n + cross-club-aggregaatti (TM:n oma kansallinen ka anonymisoidusti).

---

## 11. VERIFIOINTI

new Function 0 virhettä · `npm test` vihreä (uudet lib-funktiot) · §17 `@media 768`-grep = 1/tiedosto · Carbon §5 · string concat §7.1 ·
RUNTIME + LIVE (?cb= / version:bump, SA): Master "Arvioi harjoitus" avaa lomakkeen (ei enää stub) · mallinvalinta + ikävaihe-chip · malli A
liukurit + a8-toggle, malli B 1–5 + reflektio + arviointitapa · Tallenna → `harjoitusarvioinnit`-doc + valmentajan pikakentät · VP "Työkalut"
-sijainti havainnointi-oletuksella · tuloskortti III lukee pikakentät (tyhjä → siisti datagate-tila) · Q7 konfiguraatiosta.
