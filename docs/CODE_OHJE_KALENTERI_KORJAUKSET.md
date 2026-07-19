# CODE — Kalenteri-korjaukset: (1) Master viikkonavigointi rikki · (2) VP-muokkaus ei salli paivamaaran vaihtoa

**Tyyppi:** Bugikorjaus (luonti/muokkaus-UI). **Ei Rules-muutosta.** Molemmat live-raportoituja.
**Kohteet:** `TalentMaster_Master_v16.html` (Bugi 1) · `TalentMaster_VP_v25.html` (Bugi 2).
**Prioriteetti:** korkea — valmentaja ei voi lisata tapahtumia ensi viikolle, VP ei voi siirtaa tapahtumaa toiselle paivalle.

---

## BUGI 1 — Master (valmentaja): kalenteria ei voi liikuttaa, ei voi lisata ensi viikolle

**Juurisyy (verifioitu koodista):** `calNav(dir)` (~rivi 8337) paivittaa viikko-offsetin mutta EI piirra kalenteria uudelleen:
```js
function calNav(dir) {
  _calWkOffset += dir;
  toast((dir>0?'Seuraava':'Edellinen') + ' viikko', 'cal-nav');
}
```
`renderCal()` (rivi 8192) on funktio joka tayttaa `#calWeek`:n ja lukee `_calWkOffset`:n (rivi 8196). Koska `calNav` ei kutsu sita -> nakyma jaa nykyiseen viikkoon. Seuraus: ei paase ensi viikkoon -> `calSlotClick` (laskee paivan `_calWkOffset`:sta) ei voi avata luontimodaalia oikealle paivalle -> "ei voi lisata ensi viikolle".

### Korjaus 1a (pakollinen)
`calNav` kutsuu `renderCal()`:n offsetin muutoksen jalkeen (+ paivittaa viikkolabelin `#calWkLabel`/`#calWkSub` jos renderCal ei jo tee sita). Esim:
```js
function calNav(dir) {
  _calWkOffset += dir;
  renderCal();   // <- puuttui: nakyma ei liikkunut
}
```

### Korjaus 1b (liitannaishavainto — luonnin paivamaara)
Master-luontimodaalissa `_avaaUusiTapahtuma(pvm, klo)` (rivi 8784) nayttaa paivan **read-only-tekstina** otsikossa — ei muokattavaa paivamaara-kenttaa. Lisaksi otsikon "Lisaa harjoitus / ottelu" -nappi (rivi 1632) kovakoodaa `new Date().toISOString().slice(0,10)` = **tanaan**. -> Vaikka navigointi korjataan, tuo nappi luo aina talle paivalle.
**Lisaa luontimodaaliin `type='date'` paivamaara-input** (esitaytto `pvm`), ja kayta tallennuksessa sen arvoa (`alkaaTs = new Date(<date-input> + 'T' + alkaa + ':00')`). Toistuvuus-esikatselu (`_calToistEsik`/`tmKalenteriOccurrences`) kayttaa samaa valittua alkupaivaa.

### DoD-1
- Viikkonuolet liikuttavat kalenterinakymaa (renderCal ajetaan); viikkolabel paivittyy.
- Ensi viikon slotin klikkaus avaa luontimodaalin oikealla paivalla -> tallennus menee oikealle paivalle.
- Luontimodaalissa muokattava paivamaara-kentta; "Lisaa harjoitus/ottelu" -napista voi valita paivan (ei tanaan-lukkoa).
- Ei regressiota nykyviikon nakymaan; 0 konsolivirhetta.

---

## BUGI 2 — VP: tapahtuman muokkauksessa ei voi vaihtaa paivamaaraa

**Juurisyy (verifioitu koodista):** `_vpMuokkaaTapahtuma(t)` (~rivi 11138) modaalissa Alkaa/Paattyy ovat **`type='time'` (vain kellonaika)**; paivamaara-inputtia EI ole. Tallennus (rivit 11224-11228) rakentaa `alkaa`/`paattyy` = alkuperaisen dokin paiva (`dISO`, johdettu `d.alkaa`:sta, muuten `pvmISO`) + uusi kellonaika:
```js
var dISO = dDate ? (…d.alkaa:n paiva…) : pvmISO;
if (alkaaI.value) upd.alkaa = Timestamp.fromDate(new Date(dISO + 'T' + alkaaI.value + ':00'));
```
-> Paiva on lukittu alkuperaiseen; vain kellonaikaa voi muuttaa.

### Korjaus 2
Lisaa modaaliin `type='date'` paivamaara-kentta (esitaytto `pvmISO`, joka jo lasketaan rivilla 11143). Kayta tallennuksessa sen arvoa `dISO`:n sijaan yksittaiselle tapahtumalle:
```js
var pvmI = document.createElement('input'); pvmI.type = 'date'; pvmI.value = pvmISO; …
// tallennuksessa:
var uusiPvm = pvmI.value || dISO;
if (alkaaI.value)  upd.alkaa  = Timestamp.fromDate(new Date(uusiPvm + 'T' + alkaaI.value + ':00'));
if (paattyyI.value) upd.paattyy = Timestamp.fromDate(new Date(uusiPvm + 'T' + paattyyI.value + ':00'));
```
**Toistuva sarja (huom):** nykyinen `_vpSkooppiDocit` laajentaa muutoksen sarjaan per-esiintyma paivalla. Jos kayttaja vaihtaa paivamaaran:
- **Skooppi "vain tama"** -> aseta uusi paiva suoraan talle dokille (yllä).
- **Skooppi "koko sarja"** -> paivamaaran absoluuttinen asetus KAIKILLE ei ole mielekas (romuttaisi toistuvuuden). **Suositus: salli paivamuutos VAIN "vain tama" -skoopissa** (disabloi/ohita pvm-kentta sarjaskoopissa); sarjan siirto on erillinen isompi feature.

### DoD-2
- VP-muokkausmodaalissa paivamaara-kentta (esitaytto tapahtuman paiva); paivan vaihto tallentuu `alkaa`/`paattyy`:hyn.
- Yksittaisen tapahtuman paiva siirtyy oikein; toistuvassa sarjassa paivamuutos rajattu turvallisesti (suositus: vain "vain tama").
- Kellonajan/paikan/logistiikan/pelaajaviestin muokkaus ennallaan; 0 konsolivirhetta.

---

## Reunaehdot (molemmat)
- Ei Rules-muutosta, ei datamallimuutosta (`alkaa`/`paattyy` jo olemassa).
- **Topias = testi-OK**; palauta testidata. Demo-polku ennallaan.
- **Verifioi live:** (1) Master: navigoi ensi viikkoon -> lisaa harjoitus -> tallentuu oikealle paivalle + nakyy pelaajan/vanhemman aikataulussa (P7-c.1). (2) VP: muokkaa "KPV - SJK" -> vaihda paiva -> tallentuu; kuluttaja nakee uuden paivan. 790 vitest vihrea. Pieni-keskikokoinen PR (voi jakaa Bugi 1 / Bugi 2).
