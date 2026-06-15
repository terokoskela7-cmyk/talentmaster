# ADAR Jatkokehitys — Analyysi ja toimenpidesuunnitelma

> Päivitetty: 2026-06-15 · Perustuu: ADAR_Master.html (2706r) + D3_Kyselylomake.html (445r) + ADAR_Jatkokehitys_Plan.md

---

## 1. NYKYTILA — MITÄ ON OLEMASSA

### 1.1 TalentMaster_ADAR_Pikakortti.html (TUOTANTO)
**Tila: REAL — Firebase-integraatio toimii**

- `saveCard(level)` kirjoittaa Firestoreen: `seurat/{sid}/pelaajat/{pid}/havainnot/{id}`
- Kentät: `tyyppi:'adar_pikakortti'`, `adar_taso`, `tila:'valmis'`, `pelaaja_lukenut:false`, ADAR-pisteet, `media[]`
- `_pikaTallenna()` kirjoittaa `tila:'luonnos'` pikasyötöllä (3-vaiheinen pikatila §15)
- ADAR Vision: kuva → Storage → `ai_narratiivi` aiProxy kautta
- **PUUTTUU:** `paivitaAdarPikakentat()` ei kutsuta saveCard():sta → adar-pikakentät pelaajadokumentissa eivät täyty
- **PUUTTUU:** T1/T2/T3 tier-valinta — kaikki havainnot taso-agnostisia
- **PUUTTUU:** Kaksoisvalidointi — yksivalmentajahavainto, ei `tila:'ehdotettu'` -flowta

### 1.2 TalentMaster_ADAR_Master.html (PROTO, UPLOADATTU)
**Tila: DEMO — localStorage only, EI Firebase-yhteyttä**

5-välilehtiarkkitehtuuri:
| Tab | Nimi | Tila |
|---|---|---|
| 1 | Kirjaa (kenttätyökalu) | Demo — localStorage |
| 2 | Profiili (CoachProfile + kalibrointi + D3) | Demo — localStorage |
| 3 | Vahvista (kaksoisarviointi) | Demo — localStorage |
| 4 | Trendi | Demo — hardcoded data |
| 5 | D3 Kysely | Demo — renderöi D3_Kyselylomake |

**Arkkitehtuuripäätös: EI korvata Pikakorttia.** ADAR Master on prototyyppi jonka parhaat osat
integroidaan Pikakorttin ja Master_v16:een. Pikakortti on tuotannossa Firebase-integraatiolla.

### 1.3 TalentMaster_D3_Kyselylomake.html (PROTO, UPLOADATTU)
**Tila: DEMO — `saveToPlayer()` on stub (localStorage-kommentti)**

- 5 dimensiota: Inner Drive, Coachability, Resilience, Focus, Emotional Control
- 10 kysymystä, Likert 1–5, U12 ja U15+ versiot
- **Kriittinen yhteys ADAR-vaiheisiin** (eksplisiittisesti koodattu kyselylomakkeeseen):
  - `id1/id2` (Inner Drive) → DVI — kehittyykö pelaaja odotettua nopeammin?
  - `co1/co2` (Coachability) → DVI — growth mindset, reagointi palautteeseen
  - `re1/re2` (Resilience) → **ADAR Re-assess** — palautumisaika virheen jälkeen, jähmettyminen >15s
  - `fo1/fo2` (Focus) → **ADAR Assess** — skannaustiheys ennen kosketusta
  - `ec1/ec2` (Emotional Control) → **ADAR Act** — tekninen laatu paineessa
- Kohde-Firestore: `seurat/{sid}/pelaajat/{pid}/d3_profiili/`
- Toteutusestimaat: 3–4 h Firestore-kytkennällä

---

## 2. TOTEUTETTAVAT OMINAISUUDET — PRIORISOITU

### VAIHE 0: ADAR-pikakentät (P0 — AKUUTTI, 1–2 h)
**Ongelma:** `paivitaAdarPikakentat()`-helper on kirjoitettu Master_v16:een (§26 TODO)
mutta saveCard() Pikakorttissa ei kutsu sitä → joukkuepulssin ADAR-sarake on aina tyhjä.

**Toteutus Pikakortti `saveCard()`-funktioon** (saveCard():n loppuun, havaintoRef.set():n jälkeen):
```javascript
// Päivitä ADAR-pikakentät pelaajadokumenttiin
try {
  const havainnot = await window._tmDB
    .collection('seurat').doc(seuraId)
    .collection('pelaajat').doc(pelaajaId)
    .collection('havainnot')
    .where('tyyppi','==','adar_pikakortti')
    .where('tila','==','valmis')
    .orderBy('luotu','desc').limit(10).get();

  if (!havainnot.empty) {
    const docs = havainnot.docs.map(d => d.data());
    const avg = f => docs.reduce((s,d)=>s+(d.pisteet?.[f]||0),0)/docs.length;
    const pikakentat = {
      adar_viimeisin: {
        a: docs[0].pisteet?.A || 0,
        d: docs[0].pisteet?.D || 0,
        ac: docs[0].pisteet?.Act || 0,
        r: docs[0].pisteet?.R || 0,
        yht: Object.values(docs[0].pisteet||{}).reduce((a,b)=>a+b,0),
        pvm: docs[0].luotu
      },
      adar_pvm: docs[0].luotu,
      adar_havaintoja: havainnot.size,
      adar_vahvin: ['A','D','Act','R'].reduce((best,k) =>
        (docs[0].pisteet?.[k]||0) > (docs[0].pisteet?.[best]||0) ? k : best, 'A'),
      adar_heikoin: ['A','D','Act','R'].reduce((worst,k) =>
        (docs[0].pisteet?.[k]||0) < (docs[0].pisteet?.[worst]||0) ? k : worst, 'A'),
    };
    await window._tmDB
      .collection('seurat').doc(seuraId)
      .collection('pelaajat').doc(pelaajaId)
      .set(pikakentat, { merge: true });
  }
} catch(e) { console.warn('ADAR pikakentät:', e); }
```

**Hyöty:** joukkuepulssin ADAR-sarake + S9-signaali syttyy välittömästi kun havaintoja on riittävästi.

---

### VAIHE 1: T1/T2/T3 Tier + CoachProfile (Jatkokehitys_Plan §1, ~8 h)

#### 1A. Tier-valinta Pikakorttiin (2 h)
ADAR Master:n `setTier(tier)` / `updateTileLabels()` -logiikka portattavissa suoraan Pikakorttiin.

**T1-invariantti (§7.22-periaate lapsille):** T1-pelaajalle (U8-12) ei näytetä lukuja:
```javascript
const T1_LABELS = { 1: 'Vielä', 2: 'Kasvaa', 3: 'Super!' };
// tile-napit: T1 → tekstitarra, T2+ → numero
```
Tallennukseen lisätään `adar_tier: 'T1'|'T2'|'T3'` -kenttä havaintodokumenttiin.

#### 1B. CoachProfile + sertifikaattiseuranta (6 h)
Valmentajadokumenttiin (`seurat/{sid}/kayttajat/{uid}`) uudet kentät:
```javascript
{
  adar_havaintoja:    0,        // kumulatiivinen laskuri
  adar_skenaariot:    0,        // läpäistyt kalibrointiharjoitukset
  adar_sertifikaatti: 'Aloittelija', // Aloittelija/Harjoittaja/Vahvistunut/Mestari
  adar_luotettavuus:  { A:0.92, D:0.81, Act:0.86, R:0.74 }, // per vaihe
  adar_rae_bias:      null,     // RAE-bias-indeksi kalibroinnista
  adar_kalibrointi_historia: [] // [{pvm, delta, tulos}]
}
```
Sertifikaattirajat (kynnykset ADAR Master:sta):
- Aloittelija: 0 havaintoa, 0 skenaariota
- Harjoittaja: 50 havaintoa, 2 skenaariota
- Vahvistunut: 150 havaintoa, 6 skenaariota
- Mestari: 300 havaintoa, 8 skenaariota

**Päivityslogiikka:** `saveCard()`:n jälkeen `adar_havaintoja++` valmentajadokumentissa → sertifikaattitaso lasketaan lennossa kynnysarvoista.

---

### VAIHE 2: Kaksoisvalidointi-flow (Jatkokehitys_Plan §2, ~10 h)

#### 2A. "Ehdotettu" -tila Pikakorttiin (4 h)
Nykyinen flow: `saveCard()` → `tila:'valmis'` (pelaaja voi lukea heti).
Uusi vaihtoehtoinen flow: tallenna `tila:'ehdotettu'` + lähetä inbox-ilmoitus Coach B:lle.

```javascript
// Uusi nappi Pikakorttiin: "Pyydä vahvistus" vs "Tallenna suoraan"
const tilaValinta = kaytetaankoVahvistusta ? 'ehdotettu' : 'valmis';
await havaintoRef.set({ ...havaintoData, tila: tilaValinta });
if (tilaValinta === 'ehdotettu') {
  // Lisää inbox-entry valitulle vahvistajalle (VP tai nimetty toinen valmentaja)
  await window._tmDB.collection('seurat').doc(seuraId)
    .collection('adar_inbox').add({
      havaintoId: havaintoRef.id,
      pelaajaId, seuraId,
      coachAUid: user.uid,
      coachANimi: user.displayName,
      vahvistajaUid: _vahvistajaUid,  // VP tai valittu toinen valmentaja
      luotu: new Date().toISOString(),
      tila: 'odottaa'
    });
}
```

#### 2B. Vahvistus-inbox Master_v16:een (6 h)
Master_v16:n uusi välilehti "ADAR-inbox" (tai VP-dashboardiin VP:lle):
- `onSnapshot` `seurat/{sid}/adar_inbox` jossa `vahvistajaUid==currentUser.uid` + `tila:'odottaa'`
- Coach B näkee: pelaaja, Coach A:n narratiivi, pisteet, media (ei muokattavissa)
- Valitsee oman pisteytyksen → `submitValidation()`
- Delta-logiikka ADAR Master:sta (delta=0 → vahvistettu; delta<1.5 → pehmeä; delta≥1.5 → kalibrointi-trigger)
- Vahvistettu → `havainnot/{id}.tila:'valmis'` (pelaaja voi lukea) + Coach A:n luotettavuuslaskurin päivitys

**Security Rules lisäys** (v3.3 jälkeiseen versioon):
```javascript
match /seurat/{sid}/adar_inbox/{iid} {
  allow read: onSuperAdmin() || (onOmaSeura(sid) && (
    resource.data.coachAUid == request.auth.uid ||
    resource.data.vahvistajaUid == request.auth.uid ||
    onJohtoRooli()
  ));
  allow create: onOmanSeuranValmentaja(sid) || onSuperAdmin();
  allow update: onSuperAdmin() || (onOmaSeura(sid) &&
    resource.data.vahvistajaUid == request.auth.uid);
}
```

---

### VAIHE 3: D3 Kyselylomake — Firestore-kytkentä (Jatkokehitys_Plan §3, ~4 h)

#### 3A. `saveToPlayer()` -toteutus
```javascript
async function saveToPlayer() {
  if (!window._tmDB || !window._tmAuth?.currentUser) {
    showToast('Kirjaudu sisään tallentaaksesi');
    return;
  }
  const qs = currentAge === 'U12' ? QUESTIONS_U12 : QUESTIONS_U15;
  const dims = {};
  qs.forEach(q => {
    if(!dims[q.dim]) dims[q.dim] = {sum:0,count:0};
    dims[q.dim].sum += answers[q.id]||0;
    dims[q.dim].count++;
  });
  const dimScores = {};
  Object.entries(dims).forEach(([dim,d]) => {
    dimScores[dim] = { avg: d.sum/d.count, pct: Math.round(d.sum/(d.count*5)*100) };
  });
  const profiili = {
    versio: currentAge,
    pisteet: dimScores,       // {Inner Drive:{avg,pct}, ...}
    vastaukset: answers,      // {id1:4, co1:3, ...}
    lahde: 'kyselylomake',
    pvm: new Date().toISOString(),
    tayttaja_uid: window._tmAuth.currentUser.uid
  };
  // Tallenna alikokoelmaan (päivittäinen historiadokumentti)
  const pvm = new Date().toISOString().split('T')[0];
  await window._tmDB
    .collection('seurat').doc(window._tmSeuraId)
    .collection('pelaajat').doc(window._tmPelaajaId)
    .collection('d3_profiili').doc(pvm)
    .set(profiili);
  // Päivitä pikakenttä pelaajadokumenttiin
  await window._tmDB
    .collection('seurat').doc(window._tmSeuraId)
    .collection('pelaajat').doc(window._tmPelaajaId)
    .set({ d3_viimeisin: profiili, d3_pvm: pvm }, { merge: true });
  showToast('Profiili tallennettu ✓');
}
```

#### 3B. Pikakenttä `d3_viimeisin` → VP-signaali (1 h)
Uusi kattavuussignaali (**S10**, lisätään `renderSignals`:iin):
- joukkue > 5 pelaajaa mutta < 30 % täyttänyt D3-lomakkeen → amber
- Hyöty: valmentaja tietää kenen Re-assess- ja Focus-taidot ovat dokumentoitu

#### 3C. D3-ADAR-linkki validointimodaalissa
ADAR Master:n validointimodaalissa on jo UI `valD3Link` + `valD3Text` — aktivoituu kun `obs.d3.hasProfile === true`.
Kun D3-pikakenttä on olemassa, välitetään `d3: { hasProfile: true, relevance: d3_viimeisin.pisteet['Resilience']... }` havaintodokumentissa.

---

### VAIHE 4: Kalibrointiharjoitus + T4 (Jatkokehitys_Plan §1.2 + §4, ~12 h)

> Matala prioriteetti — ei vielä pilottitarvetta. Dokumentoitu viitteeksi.

- 8 skenaariota videoklipeineen + kultastandardi (Gold Standard data Firestoreen: `konfiguraatio/adar_kalibrointiskenaario/{id}`)
- 80% yhteensopivuus = läpäisy, max 3 yritystä
- RAE-bias-indeksi: BQ4-pelaajien havaintojen delta Coach-omaan ka:han
- T4: U19+ / Akatemia, taktinen kerros pelipaikkakohtaisilla kysymyksillä

---

## 3. FIRESTORE-RAKENNE — UUDET KENTÄT

### Pelaajadokumentti (seurat/{sid}/pelaajat/{pid}) — lisäykset
```javascript
// Olemassa (§26): adar_viimeisin, adar_pvm, adar_havaintoja, adar_vahvin, adar_heikoin
// Uudet (Vaihe 1–3):
{
  adar_tier_viimeisin: 'T1'|'T2'|'T3',   // viimeisin havainto-tier
  d3_viimeisin: {                          // D3 pikakenttä (Vaihe 3)
    versio: 'U15',
    pisteet: { 'Inner Drive':{avg,pct}, 'Coachability':{avg,pct}, ... },
    pvm: '2026-06-15'
  },
  d3_pvm: '2026-06-15'
}
```

### Havaintodokumentti — lisäykset
```javascript
// Olemassa: tyyppi, adar_taso, pisteet, narratiivi, tila, pelaaja_lukenut, media[]
// Uudet:
{
  adar_tier: 'T1'|'T2'|'T3',              // Vaihe 1A
  vahvistus_status: 'ehdotettu'|'vahvistettu'|'pehmeaero'|'kalibrointi', // Vaihe 2
  coachB_uid: null,
  coachB_pisteet: null,
  vahvistus_delta: null,
  vahvistus_pvm: null
}
```

### Valmentajadokumentti (seurat/{sid}/kayttajat/{uid}) — lisäykset
```javascript
// Uudet (Vaihe 1B):
{
  adar_havaintoja: 0,
  adar_sertifikaatti: 'Aloittelija',
  adar_skenaariot: 0,
  adar_luotettavuus: { A:null, D:null, Act:null, R:null }
}
```

### Uusi kokoelma: adar_inbox (Vaihe 2)
```
seurat/{sid}/adar_inbox/{id}:
  havaintoId, pelaajaId, seuraId
  coachAUid, coachANimi
  vahvistajaUid
  luotu (ISO-string)
  tila: 'odottaa'|'vahvistettu'|'hylätty'|'kalibrointi'
```

### Uusi alikokoelma: d3_profiili (Vaihe 3)
```
seurat/{sid}/pelaajat/{pid}/d3_profiili/{pvm}:
  versio: 'U12'|'U15'
  pisteet: { dim: {avg, pct} }
  vastaukset: { qid: 1-5 }
  lahde: 'kyselylomake'
  pvm: ISO-string
  tayttaja_uid
```

---

## 4. ARKKITEHTUURIPÄÄTÖKSET

### Mitä EI tehdä
- **Älä korvaa Pikakorttia ADAR Masterilla** — Pikakortti on tuotannossa Firebase-integraatiolla. ADAR Master on prototyyppi.
- **Älä lisää Firebasea ADAR Masteriin** — kehitä ADAR Master erillisellä branchilla visuaalisena protona; integroi kentät yksitellen Pikakorttiin.
- **Älä siirrä kalibrointiskenaarioita Firestoreen ennen Vaihe 4** — dataa ei ole, arvo matala pilotin kannalta.

### Mitä tehdään
- **Enhance Pikakortti** uusilla kentillä (tier, vahvistus_status) ja `paivitaAdarPikakentat()` -kytkennällä
- **D3 Kyselylomake** → oma sivu `TalentMaster_D3_Kyselylomake.html` + Firebase-kytkentä
- **Vahvistus-inbox** → Master_v16:een uutena välilehtenä (tai paneelina)
- **CoachProfile** → VP_v25:een valmentajakortissa (jo on `avaaCoachPanel`-modaali)

### Security Rules muutokset (v3.4, seuraava Console-deploy)
```javascript
// Lisätään v3.3:een:
match /seurat/{sid}/pelaajat/{pid}/d3_profiili/{pvm} {
  allow read: onSuperAdmin() || onSeuranJasen(sid) ||
    (onAnonymous() && resource.data.tayttaja_uid == request.auth.uid);
  allow create, update: onSuperAdmin() || onOmanSeuranValmentaja(sid) ||
    (onAnonymous() && request.resource.data.tayttaja_uid == request.auth.uid);
}
match /seurat/{sid}/adar_inbox/{iid} {
  allow read: onSuperAdmin() || (onOmaSeura(sid) && (
    resource.data.coachAUid == request.auth.uid ||
    resource.data.vahvistajaUid == request.auth.uid ||
    onJohtoRooli()
  ));
  allow create: onSuperAdmin() || onOmanSeuranValmentaja(sid);
  allow update: onSuperAdmin() || (onOmaSeura(sid) &&
    resource.data.vahvistajaUid == request.auth.uid);
}
```

---

## 5. TOTEUTUSJÄRJESTYS JA ESTIMAATIT

| # | Tehtävä | Tiedosto | Arvio | Arvo |
|---|---|---|---|---|
| **V0** | **`paivitaAdarPikakentat` → saveCard()** | ADAR_Pikakortti.html | 1–2 h | 🔴 KORKEIN |
| **V1A** | Tier-valinta (T1/T2/T3) Pikakorttiin | ADAR_Pikakortti.html | 2 h | 🔴 KORKEA |
| **V3A** | D3 Firestore-kytkentä + pikakenttä | D3_Kyselylomake.html | 3–4 h | 🔴 KORKEA |
| **V1B** | CoachProfile-kentät + sertifikaattilaskuri | Pikakortti + kayttajat/{uid} | 4 h | 🟡 KESKI |
| **V2A** | "Ehdotettu"-tila Pikakorttiin | ADAR_Pikakortti.html | 3–4 h | 🟡 KESKI |
| **V2B** | Vahvistus-inbox Master_v16:een | Master_v16.html | 6 h | 🟡 KESKI |
| **V3B** | S10-signaali VP:hen (D3-kattavuus) | VP_v25.html | 1 h | 🟢 MATALA |
| **V4** | Kalibrointiharjoitus + T4 | ADAR_Master.html | 12 h | 🟢 MATALA |

**Suositeltu aloitusjärjestys:**
1. V0 (pikakentät) → välitön hyöty joukkuepulssin ADAR-sarakkeeseen
2. V3A (D3-save) → D3-ADAR-link aktivoituu validointimodaalissa heti kun D3-data on olemassa
3. V1A (tier-valinta) → T1-invariantti ("ei numeroita U8-12:lle") pilottivaatimus ennen laajentumista

---

## 6. CLAUDE CODE -KOMENTO — VAIHE 0 (pikakentät)

```
Lisää paivitaAdarPikakentat-logiikka TalentMaster_ADAR_Pikakortti.html:n saveCard()-funktioon.

TEHTÄVÄ:
Funktion saveCard(level) lopussa (havaintoRef.set():n jälkeen, ennen btn.textContent muutosta)
lisää try/catch-blokki joka:
1. Hakee 10 viimeisintä 'adar_pikakortti'-havaintoa tälle pelaajaId:lle (tila=='valmis', orderBy luotu desc)
2. Laskee adar_viimeisin: {a,d,ac,r,yht,pvm} viimeisimmästä
3. Laskee adar_havaintoja: haettujen dokumenttien määrä
4. Laskee adar_vahvin: se pisteet-avain (A/D/Act/R) jolla suurin arvo viimeisimmässä
5. Laskee adar_heikoin: se pisteet-avain jolla pienin arvo viimeisimmässä
6. Kirjoittaa nämä pelaajadokumenttiin .set({...pikakentät}, {merge:true})

KENTTÄNIMET FIRESTOREEN (kanoninen §26):
adar_viimeisin: {a, d, ac, r, yht, pvm}
adar_pvm: ISO-string
adar_havaintoja: number
adar_vahvin: 'A'|'D'|'Act'|'R'
adar_heikoin: 'A'|'D'|'Act'|'R'

INVARIANTIT:
- Kaikki Firestore-kirjoitukset await getIdToken(true) ennen (sessio voi olla vanhentunut)
- try/catch — pikakentät on best-effort, EI saa estää havinnon tallennusta
- Pikakortti ei käytä firebase.functions() — ei CF-kutsuja
- Tiedoston rakenne: IIFE, window-globaalit; ei ES6-moduuleita

ÄLÄ MUUTA:
- saveCard():n varsinaista havaintologiikkaa tai Firestore-rakennetta
- _pikaTallenna():a (pikasyöttö kirjoittaa luonnoksen, ei päivitä pikakenttiä)
- ADAR Vision -kuvien käsittelyä

TESTAA:
1. Kirjaudu super-adminilla
2. Avaa Pikakortti, tee testihavainto Topias Koskelalle (KPV, PIN testiarvo)
3. Tarkista Firestoresta: seurat/kpv/pelaajat/{uid} → adar_viimeisin-kenttä täyttynyt
4. Avaa VP_v25 → KPV:n joukkuepulssin ADAR-sarake ei ole enää tyhjä
```
