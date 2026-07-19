# CODE — Pelaaja-kalenteri latch/race-bugi (uudet tapahtumat eivat nay, ei korjaannu hard reloadilla)

**Tyyppi:** Bugikorjaus (kuluttaja-lataus). **Ei Rules-/datamallimuutosta.** Korkea prioriteetti.
**Kohde:** `TalentMaster_Pelaaja_v7.html` -> `_p7LataaKalenteri` + auth/pelaaja-valmistumisen hook.
**Sama luokka kuin Vanhempi-fix2 Osa A** — sita EI sovellettu Pelaaja-appiin. Peilaa se tanne.

## Bugi (verifioitu Topiaan LIVE-sessiosta)
Konsolidiagnostiikka Topiaan istunnossa:
- `auth.anon = true`, `pelaaja.seuraId = "kpv"`, luku `lukuOK: true, docs: 5` -> **luku toimii, sessio on anon.**
- Suodatin osuu: `_p7EvKuuluu("KPV - Tarmo") = true`, `future: true`, `poistettu: false`.
- **`window._p7Kalenteri = []` (tyhja)** — MUTTA sama logiikka nyt ajettuna -> `pitaisiNakya: ["KPV - Tarmo"]`.

Eli latausvaihe jatti kalenterin tyhjaksi ja lukitsi sen. `_p7LataaKalenteri`:
```js
if (_ladattu.kalenteri) return; _ladattu.kalenteri = true;   // <- latchaa HETI
if (_isDemoUser) { … return; }
if (!_pelaaja || !_pelaaja.seuraId || !window._db) { window._p7Kalenteri = []; _rerender(); return; }  // <- not-ready -> [] + latch jaa
```
Lataus laukeaa renderissa (`_p7AikatauluHTML` -> `_p7LataaKalenteri`). Jos nakyma piirtyy ennen kuin `onAuthStateChanged` (~rivi 3205) on asettanut `_pelaaja`:n (tuore `signInAnonymously` kesken), loader latchaa `_ladattu.kalenteri=true` ja asettaa `[]`. Kun `_pelaaja` sitten valmistuu ja `draw()` ajetaan, `_p7AikatauluHTML` nakee `_ladattu.kalenteri === true` -> **ei lataa uudelleen** -> jaa tyhjaksi pysyvasti, myos hard reloadilla.

"Aikaisemmin toimi": persistoitu anon-sessio -> auth heti -> `_pelaaja` valmis ennen 1. renderia (race voitettu). Nyt tuore anon-kirjautuminen valmistuu renderin jalkeen -> race havitaan deterministisesti.

## Korjaus (peilaa Vanhempi-fix2 Osa A:ta)
`_p7LataaKalenteri`:
1. **Demo vain `_isDemoUser`:lla** (ennallaan) — latch OK demossa.
2. **ALA latchaa not-ready-tilassa.** Jos `!_pelaaja || !_pelaaja.seuraId || !window._db` (tai auth ei valmis) -> **palaa asettamatta `_ladattu.kalenteri=true`** ja pida `_p7Kalenteri = null` (latautuu-tila), jotta seuraava render/valmistuminen yrittaa uudelleen. ALA aseta `[]`:aa not-ready-tilassa.
3. **Latchaa vasta kun oikea yritys tehdaan** (demo tai varsinainen `.get()`).
4. **Yrita uudelleen kun `_pelaaja`/auth valmistuu:** siina kohdassa jossa `_pelaaja` asetetaan (onAuthStateChanged / PIN-success -polut ~3266/3278/3411), aseta `_ladattu.kalenteri = false; window._p7Kalenteri = null;` ja kutsu `_p7LataaKalenteri()` (tai `draw()` joka laukaisee sen). Nain luku tapahtuu kun seka `_pelaaja` etta anon-auth ovat valmiit.
5. Virhe/tyhja oikea tulos -> pehmea tyhja tila (ennallaan), EI latchia joka estaa myohemman onnistumisen.

Malliksi (ydin):
```js
async function _p7LataaKalenteri() {
  if (_ladattu.kalenteri) return;
  var _rerender = function () { … };
  if (_isDemoUser) { _ladattu.kalenteri = true; window._p7Kalenteri = _p7DemoKalenteri(); _rerender(); return; }
  if (!_pelaaja || !_pelaaja.seuraId || !window._db) { return; }   // <- EI latchia, EI [] -> yritetaan uudelleen kun valmis
  _ladattu.kalenteri = true;   // vasta kun oikea luku tehdaan
  try { … .get() … window._p7Kalenteri = evs; }
  catch (e) { console.warn('[p7 kalenteri]', e && e.message); window._p7Kalenteri = []; }
  _rerender();
}
// _pelaaja:n asetuksen jalkeen (onAuthStateChanged / PIN-success):
_ladattu.kalenteri = false; window._p7Kalenteri = null; if (typeof _p7LataaKalenteri === 'function') _p7LataaKalenteri();
```

## Tarkista samalla: Vanhempi yhdenmukainen
Varmista etta Vanhempi-fix2-A:n logiikka ja tama Pelaaja-korjaus ovat samat (odota `_pelaaja`/auth, ei latchia not-ready-tilassa, retry valmistuessa) — sama bugiluokka molemmissa kuluttaja-apeissa.

## Reunaehdot
- Ei Rules-/datamallimuutosta, read-only. Demo-polku ennallaan. P7-c.3 lasnaolijat-read-back sailyy.
- **Verifioi live (Topias, tuore lataus, EI konsolitemppuja):** "KPV – Tarmo" (20.7.) nakyy TANAAN-aikataulussa heti latauksen jalkeen; lisaa uusi tapahtuma VP:ssa -> nakyy pelaajalla ilman uudelleenkaynnistysta. 790 vitest vihrea. Pieni PR.

## Toissijainen (erillinen, ei tassa pakko): luonnin joukkue-slug
Uusi "KPV – Tarmo" tallentui `joukkue: "KPV U13"` (nayttonimi) slugin `kpv_u13` sijaan. Normalisoitu suodatin sietaa sen, mutta VP/Master-luonti kannattaa kanonisoida slugiin erikseen (ei taman briefin skooppi).
