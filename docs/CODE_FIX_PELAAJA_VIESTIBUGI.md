# Code-fix — Pelaajan "Valmentajaltasi" -viestibugi (raaka aikaleima + tyhjät havainnot)

> **Oire (Topias):** pelaajan "Valmentajaltasi"-inbox näyttää kortteja "Valmentaja · 063919273872.029000000", ilman
> sisältöä, UUSI-merkillä. Kaksi juurisyytä. Kohde: **TalentMaster_Pelaaja_v7.html** (`_avaaHavainnot` ~4972, `_p6Tilaa`
> onSnapshot ~4931). Ei datamallin muutosta, ei sääntömuutosta.

## Juurisyy 1 — aikaleima renderöidään raakana
`_avaaHavainnot` (~4977): `const pvm = h.pvm || h.luotu || '';` → (~4985) `tekija + (pvm ? ' · ' + pvm : '')`.
`h.luotu` (ja joissain doceissa `h.pvm`) on **Firestore Timestamp** → merkkijonoon liitettynä tulee "seconds.nanoseconds"
-roska. Muualla samassa tiedostossa (esim. ~4472 `d.luotu?.toDate()`) tämä tehdään oikein — tässä ei, eikä `tm_pvm.js` ole ladattu.

**Korjaus:** johda oikea Date robustisti + muotoile. Esim.:
```js
function _p6Pvm(v) {
  if (!v) return '';
  var d = (v && typeof v.toDate === 'function') ? v.toDate()          // Firestore Timestamp
        : (typeof v === 'string') ? new Date(v)                        // ISO
        : (typeof v === 'number') ? new Date(v)                        // epoch
        : (v instanceof Date) ? v : null;
  if (!d || isNaN(d.getTime())) return '';                            // ei näytetä roskaa
  return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
}
```
Käytä: `const pvm = _p6Pvm(h.pvm || h.luotu);` → jos tyhjä, älä näytä "· " -osaa (nykyinen ehto `pvm ? …` toimii).

## Juurisyy 2 — tyhjät havainnot (ei narratiivia) vuotavat pelaajalle
Kortit ovat ADAR-pikakortin Taso 1 -havaintoja **ilman narratiivia/oppimisnäkökohtaa** (bare ADAR-pisteet). Tiedoston oma
periaate (~4970): *"Pelaaja näkee narratiivin ja oppimisnäkökohdan — ei ADAR-pisteitä. Palaute on tarina, ei arvosana."*
Havainto ilman pelaajalle näytettävää sisältöä → tyhjä kortti; §7.22:n mukaan sen **ei pidä näkyä pelaajalle lainkaan**.

**Korjaus:** suodata **onSnapshot-vaiheessa** (`_p6Tilaa` ~4932) niin että sekä lista ETTÄ laskuri (`_havLkm`, KOTI-merkki)
huomioivat vain pelaajalle näytettävät. Lisää `pelaaja_lukenut===false` -suodattimeen ehto:
```js
var lukemattomat = snap.docs.filter(function (d) {
  var x = d.data();
  var sisaltoa = !!(x.narratiivi || x.teksti || x.oppimisnakokohta);   // pelaajalle näytettävä sisältö
  return x.pelaaja_lukenut === false && sisaltoa;
});
```
→ Bare ADAR-havainnot eivät enää näy pelaajan inboxissa eivätkä nosta UUSI-laskuria. (Valmentajan puolella ne säilyvät ennallaan.)

## Huom (ei korjattava tässä, tiedoksi)
- **Olemassa oleva sekadata:** Topiaksella on jo näitä bare-havaintoja (testeistä). Suodatin piilottaa ne heti; niitä ei
  tarvitse siivota. (Jos halutaan, ne voi merkitä `pelaaja_lukenut:true` erikseen — ei tämän fixin osa.)
- Jos jatkossa halutaan että Taso 1 -havainto tuottaa pelaajalle *jotain* (esim. geneerinen kannustus), se on erillinen
  tuotepäätös — ei tämä bugikorjaus.

## Verifiointi (DoD)
- **Selain (Pelaaja-näkymä, Topias):** "Valmentajaltasi" ei näytä raakoja numeroita; päivämäärät muodossa `d.m.yyyy`.
- Bare ADAR-havainnot (ei narratiivia) eivät näy inboxissa eivätkä nosta KOTI-merkin laskuria.
- Havainto **jolla on** narratiivi näkyy normaalisti (tekijä · pvm + narratiivi + "Mitä opit").
- "Merkitse luetuksi" toimii ennallaan (`_p6Luetuksi` → `pelaaja_lukenut:true`).
- `npm test` + lint. Selain-tarkistus. Branch `fix/pelaaja-viesti-render`. Merge kun Tero sanoo "live".
- Testipelaaja **Topias (KPV)** — kirjoitukset OK.
