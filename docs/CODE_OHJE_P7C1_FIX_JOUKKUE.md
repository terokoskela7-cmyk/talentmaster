# CODE — P7-c.1-fix: Kuluttaja-kalenterin joukkuesuodatin ei osu oikeaan dataan

**Tyyppi:** Bugikorjaus, näyttö (read). **Riippuvuus:** P7-c.1 (#218) + c.2 (#219) mergessä.
**Kohteet:** `TalentMaster_Pelaaja_v7.html` -> `_p7EvKuuluu` · `TalentMaster_Vanhempi_v2.html` -> `_vanhEvKuuluu`.
**Prioriteetti:** korkea — ilman tata **yksikaan** oikea pelaaja/vanhempi ei nae seuran kalenteria (c.1/c.2 nakyvat vain demossa).

## Bugi (verifioitu livena oikealla seuradatalla)

Pelaaja/vanhempi ei nae seuran kalenteria, koska joukkue-suodatin vertaa pelaajan **nayttonimea** tapahtuman **slugiin**:

- **Kalenteritapahtuma** (VP/valmentaja luo): `joukkue: "kpv_u13"` (slug), `joukkueet: ["kpv_u13"]`
- **Pelaaja-dokki** (`seurat/kpv/pelaajat/*`): `joukkue: "KPV U13"` (nayttonimi), `joukkueet: ["kpv_u13"]`

Nykyinen `_p7EvKuuluu` kayttaa vain `_pelaaja.joukkue` / `_pelaaja.joukkueId` -> `"kpv u13"` (vali) ei ole sama kuin `"kpv_u13"` (alaviiva) -> **false**. Se **ei kayta pelaajan omaa `joukkueet`-slug-taulukkoa** (`["kpv_u13"]`), joka on kanoninen avain ja tasmaisi suoraan. `pelaajat_id` on tyhja -> ei osu sitakaan kautta.

**Juurisyy:** kanoninen joukkueavain on **slug `joukkueet[]`:ssa**, molemmilla puolilla. `joukkue`-kentta on pelaajalla nayttonimi mutta tapahtumalla slug -> niita ei voi verrata suoraan. Demo toimii, koska demo-polku (`_isDemoUser`) ohittaa suodattimen.

## Korjaus (molempiin, sama logiikka)

Rakenna pelaajan/lapsen joukkueavainjoukko **kaikista** kentista (`joukkue`, `joukkueId`, **ja `joukkueet[]`**), normalisoi (lowercase + poista valit/alaviivat), ja vertaa tapahtuman `joukkue` + `joukkueet[]` normalisoituihin avaimiin. Sailyta `pelaajat_id`-polku.

`_p7EvKuuluu` (Pelaaja_v7):
```js
function _p7EvKuuluu(ev) {
  if (!_pelaaja) return false;
  var norm = function (s) { return String(s == null ? '' : s).toLowerCase().replace(/[\s_]+/g, ''); };
  var pKeys = {};
  [_pelaaja.joukkue, _pelaaja.joukkueId].concat(_pelaaja.joukkueet || [])
    .filter(Boolean).forEach(function (x) { pKeys[norm(x)] = 1; });
  var eKeys = [ev.joukkue].concat(ev.joukkueet || []).filter(Boolean).map(norm);
  if (eKeys.some(function (k) { return pKeys[k]; })) return true;
  if (Array.isArray(ev.pelaajat_id) && ev.pelaajat_id.indexOf(_pelaaja.id) >= 0) return true;
  return false;
}
```
`_vanhEvKuuluu` (Vanhempi_v2): sama, mutta lahde `window._lapsi` (`L.joukkue`, `L.joukkueId`, `L.joukkueet`, `L.id`).

Normalisointi saa nayttonimen ja slugin konvergoimaan: `"KPV U13"` -> `kpvu13`, `"kpv_u13"` -> `kpvu13`. **Todistettu livena:** nykyinen -> `false`, korjattu -> `true`.

## Reunaehdot
- Additiivinen, **ei Rules-muutosta**, read-only. Ei muuta muuta suodatuslogiikkaa (poistettu != true, alkaa >= nyt, lajittelu, slice) — vain joukkue-tasmays.
- Ei regressiota demo-polkuun (demo ohittaa `_p7EvKuuluu`:n).
- Ei cache-bumppia (ei jaettua libia).

## EI tassa
- Kanonisen joukkue-ID:n vieminen tokeniin / Rules-skooppaus (erillinen iso muutos).
- Uudet kentat / logistiikka (c.2 valmis) / poissaolo (c.3).

## DoD
1. `_p7EvKuuluu` + `_vanhEvKuuluu` tasmaavat normalisoidulla joukkueavainjoukolla (ml. `joukkueet[]`); `pelaajat_id`-polku ennallaan.
2. **Verifioi livena (Topias PIN, KPV U13, `joukkueet: ["kpv_u13"]`):** tapahtuma **"KPV - SJK" (19.7.)** ilmestyy Topiaan TANAAN-aikatauluun logistiikka-chipeineen (kello/paita/kartta), ja vanhemman "Tulevat tapahtumat" -osioon (kimppakyyti mukana). **Huom:** app cacheaa kalenterin (`_ladattu.kalenteri` / `_vanhKalLadattu`) -> testaa tuoreella latauksella (hard reload).
3. Ei regressiota: demo-nakyma toimii; muut nakymat ennallaan; 0 konsolivirhetta.
4. Pieni PR; kuvaus linkkaa P7-c.1-fix + juurisyy (nayttonimi vs slug).
