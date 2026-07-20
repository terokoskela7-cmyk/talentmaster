# CODE — Lasnaolo: erota pelaajan ennakkoilmoitus (RSVP) valmentajan toteutuneesta lasnaolosta

**Tyyppi:** Datamalli + Rules + UI (kuluttaja + VP/valmentaja). **Rules-muutos.** **Jatko/korjaus P7-c.3:lle.**
**Kohteet:** `TalentMaster_Pelaaja_v7.html` + `TalentMaster_Vanhempi_v2.html` (RSVP-kirjoitus) · `TalentMaster_VP_v25.html` + `TalentMaster_Master_v16.html` (lasnaolo-UI nayttaa RSVP:n) · `tm_admin/firestore.rules` + `tests/rules/`.

## Bugi (verifioitu livena)
Pelaaja merkitsi "Tulossa" -> tallentui `lasnaolijat/{pid}` = `{tila:'vahvistettu', rooli:'pelaaja'}`. **Data on oikein, mutta valmentaja/VP ei nae sita:**
- VP/Master-lasnaolo (`_calRenderLasnaolo` + `_calLasnaoloPaint`) korostaa vain `tila in {paikalla, myohassa, poissa}`. `'vahvistettu'` ei tasmaa -> ei mitaan nakyvaa. Yhteenveto laskee vain nuo kolme.
- **Kenttatormays:** `lasnaolijat.tila` kantaa KAHTA asiaa — pelaajan RSVP (`vahvistettu`/`peruttu`) JA valmentajan toteutunut lasnaolo (`paikalla`/`myohassa`/`poissa`). Ne ylikirjoittavat toisensa: valmentajan "Paikalla" pyyhkii pelaajan RSVP:n (ja painvastoin).

## Korjaus: kaksi eri kenttaa

### 1. Datamalli
`lasnaolijat/{osallistujaId}`:
- **`saatavuus`** in `'tulossa' | 'estynyt' | null` — **pelaajan/vanhemman ennakkoilmoitus (RSVP)**. Vain pelaaja/vanhempi kirjoittaa.
- **`tila`** in `'paikalla' | 'myohassa' | 'poissa' | null` — **valmentajan toteutunut lasnaolo** (ENNALLAAN). Vain valmentaja/johto kirjoittaa.
- `rooli`, `paivitetty` ennallaan. **Ei `syy`-kenttaa** (GDPR).

### 2. Kuluttaja (Pelaaja_v7 + Vanhempi_v2)
c.3-kirjoitus siirtyy `tila` -> `saatavuus`:
- Tulossa -> `{ saatavuus:'tulossa', rooli, paivitetty }` merge · Estynyt -> `{ saatavuus:'estynyt', … }`.
- Read-back: lue oma `saatavuus` (ei `tila`). (`_p7MerkitseLasna`/vastaava + `_p7LataaKalenteri`:n read-back `_omaTila` -> `_omaSaatavuus`.)
- **Kuluttaja EI kirjoita `tila`:aa** (se on valmentajan toteutunut lasnaolo).

### 3. Rules (tm_admin/firestore.rules — lasnaolijat)
Anon create/update: skooppaus **`tila` -> `saatavuus`**:
```
allow create: … || (onAnonymous() && request.resource.data.keys().hasOnly(['saatavuus','paivitetty','rooli']));
allow update: … || (onAnonymous() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['saatavuus','paivitetty','rooli']));
```
- **Turvaparannus:** anon voi kirjoittaa VAIN `saatavuus`:n, **ei `tila`:aa** -> pelaaja ei voi vaarentaa toteutunutta lasnaoloaan (aiemmin anon sai kirjoittaa tila:'paikalla'). Valmentaja/johto `tila`-kirjoitus ennallaan. **Ei `syy`:ta anonille.**
- Rules-testit: anon saa kirjoittaa `saatavuus`, EI `tila`:aa eika `syy`:ta; valmentaja saa kirjoittaa `tila`:n.

### 4. VP + Master — nayta RSVP lasnaolo-UI:ssa
`_calRenderLasnaolo`/`_calLasnaoloPaint` (Master) + VP-vastine: per pelaaja **read-only-indikaattori `saatavuus`:sta** paikalla/myohassa/poissa-nappien rinnalle:
- `saatavuus==='tulossa'` -> "Tulossa" (teal) · `'estynyt'` -> "Estynyt" (punainen) · null -> "—".
- Yhteenveto lisaa: "N ilmoittanut tulevansa · M estynyt" toteutuneen lasnaolon rinnalle.
- Valmentaja asettaa yha `tila`:n (paikalla/myohassa/poissa) — **ei ylikirjoita `saatavuus`:ta** (eri kentta).

## Migraatio (huom)
Olemassa olevat docit joissa `tila in {vahvistettu, peruttu}` (esim. Topiaan nykyinen doc c.3:n vanhasta kirjoituksesta) — joko kevyt kertamigraatio `tila`->`saatavuus`, TAI pelaaja merkitsee uudelleen (kirjoittaa `saatavuus`:n). Valmentajan lasnaolo-UI jattaa ei-lasnaolo-tila-arvot huomiotta siististi. **Mainitse PR:ssa kumpi valittiin.**

## Reunaehdot
- **Topias = testi-OK**, palauta testidata. GDPR: ei syyta/terveysdataa. Demo-polku ennallaan.
- **Verifioi live (Topias):** merkitse Tulossa -> `saatavuus:'tulossa'` -> **VP/valmentaja nakee "Tulossa"**; valmentaja merkitsee Paikalla -> `tila:'paikalla'`, `saatavuus` sailyy (ei tormaa). Rules: anon saa vain `saatavuus`, ei `tila`. 790 vitest + rules-testit vihrea. Keskikokoinen PR (voi jakaa: Rules+kuluttaja / VP+Master-nayttö).
