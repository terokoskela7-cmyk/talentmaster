# CODE — Pelaaja-kalenteri jaa "Ladataan…" (retry lataa datan, mutta nakyma ei paivity)

**Tyyppi:** Bugikorjaus (kuluttaja-render), jatko latch-fixille (#230). **Ei Rules-/datamallimuutosta.** Korkea prioriteetti.
**Kohde:** `TalentMaster_Pelaaja_v7.html` -> `_p7LataaKalenteri`/`_p7LataaNotif` `_rerender` + `_kaynnistaAppUI`-retry.

## Bugi (verifioitu Topiaan LIVE-sessiosta)
Latch-fixin jalkeen kalenteri jaa **"Seuran aikataulu — Ladataan aikataulua…"** jumiin. Konsolidiagnostiikka Topiaan istunnossa:
- `authReady: true`, `anon: true`, `_pelaaja` ok, **`_ladattu.kalenteri: true`** (lataus AJETTIIN).
- **`window._p7Kalenteri` sisalsi JO tapahtuman ["KPV -  Tarmo"] ennen mitaan pakotusta** -> data on ladattu oikein.
- Silti UI naytti "Ladataan…". Pakotettu `draw()` korjasi naytön heti.

**Juurisyy:** retry (`_kaynnistaAppUI` -> `_p7LataaKalenteri`) lataa datan async ja kutsuu lopuksi `_rerender`:
```js
var _rerender = function () { if (_tab !== 'mina' && _tab !== 'meista' && _sc === 'main') draw(); };
```
Kun async-lataus resolvoi, hetkellinen `_tab`/`_sc` ei tasmannyt ehtoon (esim. `_sc` ei ollut 'main' tai `_tab` oli transientissa tilassa) -> **`draw()` jai valiin**, eika mikaan myohempi laukaissut uudelleenpiirtoa -> UI jai "Ladataan…"-tilaan vaikka `_p7Kalenteri` oli taytetty.

## Korjaus
Varmista uudelleenpiirto **latauksen resolvoiduttua**, riippumatta hetkellisesta `_tab`/`_sc`-tilasta. Vaihtoehdot (valitse siistein):
1. **`_kaynnistaAppUI`-retry: piirra latauksen jalkeen.** Muuta retry awaittaamaan/`.then`-piirtamaan:
   ```js
   _ladattu.kalenteri = false; window._p7Kalenteri = null;
   Promise.resolve(_p7LataaKalenteri()).then(function(){ if (typeof draw === 'function') draw(); });
   // sama _p7LataaNotif
   ```
2. **TAI loysaa `_rerender`-ehtoa** niin etta se piirtaa aina kun aikataulu on nakyvissa (esim. pudota `_sc === 'main'`-ehto tai piirra aina jos ei olla mina/meista-valilehdella). Aikataulu renderoityy TANAAN-nakymassa (`rA1`), joten sen pitaa paivittya kun data saapuu.

Olennaista: **kun `_p7LataaKalenteri`/`_p7LataaNotif` asettaa `window._p7Kalenteri`/`_p7Notif`:n, nakyva osio piirtyy uudelleen luotettavasti** — ei jaa `null`-aikaiseen "Ladataan…"-tilaan.

## Reunaehdot
- Ei Rules-/datamallimuutosta, read-only. Demo-polku + latch-fix (#230) ennallaan.
- Valta turhaa jatkuvaa uudelleenpiirtoa (piirra kerran kun data saapuu, ala loopissa).
- **Verifioi live (Topias, tuore lataus, EI konsolitemppuja):** "KPV – Tarmo" (20.7.) nakyy TANAAN-aikataulussa **itsestaan** muutamassa sekunnissa latauksesta — ei jaa "Ladataan…"-tilaan. Notif-keskus sama. Lisaa VP:ssa uusi tapahtuma -> nakyy pelaajalla ilman uudelleenkaynnistysta. 790 vitest vihrea. Pieni PR.

## Muistilista (erillisia, ei tassa)
- VP-nav + paivamaara -korjaus (`fix/kalenteri-korjaukset`) yha mergaamatta.
- Luonnin joukkue-slug-kanonisointi (tapahtuma tallentuu `joukkue: "KPV U13"` slugin `kpv_u13` sijaan; normalisoitu suodatin sietaa, mutta siisti erikseen).
