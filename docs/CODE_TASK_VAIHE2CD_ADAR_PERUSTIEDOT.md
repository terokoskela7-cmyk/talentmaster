# Vaihe 2c + 2d — ADAR → havaittu-peliäly + perustiedot (vahvempi jalka + toissijainen pelipaikka)

> Lähde: live-verify 2026-07-03 (Claude + Tero). Jatkaa `CODE_TASK_VAIHE2_OMINAISUUSARVIOINTI.md §5–6` + `§8`-vaiheistusta. 2a+2b ovat tuotannossa ja verifioidut (arviointi-tallennus toimii, Rules v3.9 live). **Kaksi erillistä commit-kokonaisuutta.** §26 · §15 · §7.22 · §5.
>
> Kohteet: `lib/tm_arviointi_taksonomia.js` · `TalentMaster_VP_v25.html` (`_vpArviointiHTML`, `_avaaPerPelaajaPikakatsaus`) · `TalentMaster_Seura.html` (pelaajan muokkausmodaali ~4309).

---

## VAIHE 2c — ADAR → havaittu peliäly (D4)

**Periaate (kriittinen suunnitteluvalinta):** ADAR-johdettu peliäly **lasketaan render-kerroksessa** jo olemassa
olevasta pikakentästä `adar_viimeisin` — **EI uutta Firestore-kirjoitusta, EI Rules-muutosta** (§26-mukainen).
Valmentajan oma 'silma'-arvio **yliajaa aina** ADAR-johdetun.

### 1. Mäppäys (lib — data, ei kovakoodattu UI:hin)
ADAR-pikakenttä `adar_viimeisin: {a, d, ac, r, yht, pvm}` — huom **`ac`** (ei `act`). Kukin komponentti **1–3**
(yht 4–12). Normalisointi 1–3 → 1–5: **`(v-1)*2+1`** (1→1 · 2→3 · 3→5), pyöristys kokonaisluvuksi.

Lisää `lib/tm_arviointi_taksonomia.js`:ään (kehyskohtainen — Palloliitto-kehyksen sisään, jotta kv-kehykset voivat
määritellä oman mäppäyksensä tai jättää pois):

```javascript
// ADAR-dimensio (assess/decide/act/reassess) → havaittu D4-taksonomia-avain.
// Yksi ADAR-arvo voi ruokkia useaa havaittua kohdetta (assess = pelin luku → sekä ennakointi että näkemys).
var ADAR_HAVAITTU_MAP = {
  a:  ['anticipation', 'vision'],       // Assess  → Ennakointi + Näkemys
  d:  ['decision_making'],              // Decide  → Päätöksenteko
  ac: ['play_under_pressure'],          // Act     → Peli paineessa (toteutus pelitilanteessa)
  r:  ['positioning']                   // Reassess→ Sijoittuminen
};

// adar_viimeisin → { <avain>: {arvo(1–5), lahde:'adar', pvm} }. null jos ei ADAR-dataa.
function tmAdarHavaittu(adarViimeisin) {
  if (!adarViimeisin) return null;
  var norm = function (v) { return (v == null) ? null : Math.max(1, Math.min(5, (v - 1) * 2 + 1)); };
  var pvm = adarViimeisin.pvm || null;
  var out = {};
  ['a', 'd', 'ac', 'r'].forEach(function (k) {
    var arvo = norm(adarViimeisin[k]);
    if (arvo == null) return;
    (ADAR_HAVAITTU_MAP[k] || []).forEach(function (avain) {
      out[avain] = { arvo: arvo, lahde: 'adar', pvm: pvm };
    });
  });
  return Object.keys(out).length ? out : null;
}
```
Exportaa molemmat (`window.TM_ARVIOINTI` / `module.exports`-patternin mukaan kuten muut lib-symbolit).

### 2. Render (VP `_vpArviointiHTML`)
Kun renderöidään D4 `football_sense`-kohde jolle mäppäys on olemassa:
1. **Jos** tallennettu `havaittu[avain]` on olemassa (valmentajan 'silma') → näytä se normaalisti (yliajo).
2. **Muuten jos** `tmAdarHavaittu(p.adar_viimeisin)[avain]` löytyy → näytä ADAR-johdettu arvo **himmennettynä**
   (read-only-tyyli) + pieni **"ADAR"-badge** + vihje "ADAR-pohjainen — klikkaa arvioidaksesi itse".
3. Klikkaus → normaali havaittu-syöttö (1–5) → tallentuu `lahde:'silma'` → yliajaa ADAR-johdetun pysyvästi.

ADAR-johdettua arvoa **ei persistoida** `arviointi`-dokkiin (se elää `adar_viimeisin`-pikakentässä). Näin ADAR-havainnon
päivittyessä johdettu peliäly seuraa automaattisesti, kunnes valmentaja antaa oman arvion.

### 3. Kattavuus + yhteenveto
Peliäly-teeman kattavuuslaskenta laskee ADAR-johdetut mukaan "arvioitu"-lukuun (badge erottaa lähteen). 5D-radarin
D4 säilyy nykyisenä (`_dimNorm5Adar`) — tämä ei muuta radaria, vain teemakohtaista havaittu-listaa.

### 4. §7.22
Havaittu-arviointi (myös ADAR-johdettu 1–5, myös "Kehityskohde"=1) on **aikuisten työkalu** — ei renderöidä
pelaajalle/perheelle. Tämä on VP/valmentaja-näkymä; ei muutosta Pelaaja_v7/Vanhempi_v2.

---

## VAIHE 2d — Perustiedot: vahvempi jalka + toissijainen pelipaikka

**Kohde:** `TalentMaster_Seura.html` pelaajan muokkausmodaali (Pelipaikka-`<select>` ~4309). Pieni lisäys, kaksi kenttää.

### 1. Kentät (pelaajadokumenttiin)
- **`vahvempi_jalka`**: `'oikea' | 'vasen' | 'molemmat' | ''` (tyhjä = ei asetettu).
- **`positio_2`**: toissijainen pelipaikka — **sama optiolista kuin ensisijainen** `pelipaikka`/`positio`.

### 2. UI (muokkausmodaali)
Lisää Pelipaikka-kentän alle:
```
Vahvempi jalka   [<select>: — · Oikea · Vasen · Molemmat]
Toissijainen pelipaikka  [<select>: sama lista kuin ensisijainen, "— Ei toissijaista —" oletus]
```
Esitäyttö nykyarvoista (`p.vahvempi_jalka`, `p.positio_2`). Tallennus samaan `.set(..., {merge:true})`-kutsuun kuin muut
modaalikentät. Ei uutta Rules-tarvetta (pelaajadokumentin kirjoitus kattaa jo §12).

### 3. VP-näyttö (read-only)
`_avaaPerPelaajaPikakatsaus` (per-pelaaja `_jspModal`) perustieto-rivi näyttää vahvemman jalan + toissijaisen pelipaikan
kun asetettu (esim. "Pelipaikka: Keskikenttä · 2. LP · Vahvempi jalka: oikea"). Piilota kun tyhjä ("näytä mitä on").

### 4. Palloliitto-taksonomia-kytkös
Nämä ovat Palloliiton Player Development Card §2 -perustietoja ("paras pelipaikka + vahvempi jalka · toissijainen
pelipaikka"). `weaker_foot` (D2-havaittu) on eri asia (heikomman jalan **pelikäyttö** ottelussa) — `vahvempi_jalka`
on perustieto (dominanssi), ei arvioitava kohde.

---

## Vaiheistus + invariantit
- **2c** = lib-mäppäys + VP-render (oma commit). **2d** = Seura-modaali 2 kenttää + VP read-only (oma commit).
- §26 pikakentät (ADAR-johdettu render-ajassa, ei uutta kyselyä/kirjoitusta) · §15 (ei Rules-muutosta kummassakaan) ·
  §7.22 (havaittu = aikuisten työkalu) · §5 app-tokenit (natiivi `<select>`, "ADAR"-badge teal-himmennys) ·
  kehysrekisteri-yhteensopiva (ADAR-mäppäys Palloliitto-kehyksen sisällä).
- **lib-muutos → nosta `lib/tm_arviointi_taksonomia.js?v` (v2→v3) kaikissa lataajissa.** EI version.json-bumppia (main-workflow hoitaa).
- **Testit (Vitest):** `tmAdarHavaittu` — normalisointi 1→1/2→3/3→5 · `ac`-avain (ei `act`) · assess→2 kohdetta (anticipation+vision) ·
  null kun ei ADAR-dataa · lähde `'adar'`. `npm test` + lint vihreät.
- **Verifiointi (live, VP_v25 Sibbo/SJK):** 2c — pelaaja jolla `adar_viimeisin` → peliäly-teemassa ADAR-badge + johdettu arvo,
  klikkaus → oma 'silma'-arvio yliajaa. 2d — Seura-modaali tallentaa vahvempi_jalka+positio_2, VP-pikakatsaus näyttää ne.
