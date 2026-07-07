# Vaihe 4a — roolimalli (kuka asettaa pelitavoitteet) + dropdown-suunta

> Lähde: Tero 2026-07-05. Kysymys: kuka asettaa teknis-taktiset pelitavoitteet (jaksofokus) — valmentaja, talenttivalmentaja vai VP? + VP:n ja talenttivalmentajan pitää voida hallinnoida talenttipelaajia. + toimintakortin dropdown aukeaa ylös → alas. Kohde: `Master_v16` + `VP_v25` + `tm_admin/firestore.rules`. §4 · §26 · §32 · §37.

## 1. ROOLIMALLI — kaksi tasoa (lukittu)
Erottele **operatiivinen** (jakso, teknis-taktinen) ja **strateginen** (kausi, IDP):
- **Jaksofokus / pelitavoitteet (meso, teknis-taktinen — toimintakortti):** asettaa **valmentaja** (omat pelaajat, omistaa kentän) · **talenttivalmentaja** (talenttipelaajat) · **VP** (talenttipelaajat + oversight/override). Ei vaadi erillistä hyväksyntää — kenttäomistajuus (ei byrokratisoida päivittäistä valmennusta).
- **Kausitavoite (makro, IDP — 3a/3b):** asettaa/**hyväksyy VP** (strateginen suunta, jo VP_v25:ssä). Valmentaja voi ehdottaa (Pelaajaraportti §37); VP hyväksyy.
- **VP-hyväksyntä:** kohdistuu **kausitavoitteeseen**, EI jokaiseen jaksoon. VP näkee jaksofokukset (oversight 4c) + voi ohjata/override talenteilla.

> Tiivistys: **valmentaja/talenttivalmentaja omistaa kentän (jakso) · VP omistaa suunnan (kausi) + hallinnoi talentteja.** Talenttipelaajilla (`talenttiOhjelma:true`) VP + talenttivalmentaja ovat ensisijaisia.

## 2. Mitä rakennetaan — pääsy toimintakorttiin
- **Valmentaja:** on jo (Master_v16 4a). ✓
- **Talenttivalmentaja:** Master-pääsy on jo (§4 operatiivinen rooli) — varmista että toimintakortti näkyy hänelle (roolilista) + talenttipelaajat.
- **VP (UUSI):** lisää toimintakortti **VP_v25:een talenttipelaajille** (per-pelaaja-pikakatsaus / aloitusnäkymä → "Aseta/muokkaa jaksofokus"). Sama `_ttKorttiHTML`-logiikka (jaettu tai replikoitu). VP asettaa jaksofokuksen talenteille + näkee kaikki.
- **Rules:** `jaksofokus` + `tt_positio_aktiivinen` -kirjoitus sallittu: valmentaja/talenttivalmentaja (omat) + VP/johto (seuran talentit). Sama pattern kuin arviointi/idp_kausi. → PR → N4-CI.

## 3. Dropdown-suunta (ylös → alas)
Toimintakortin konseptivalinta on **natiivi `<select>`** → aukeamissuunnan päättää selain (aukeaa ylös kun tilaa alhaalla vähän, esim. modaalin pohjalla). **Natiivilla ei voi pakottaa suuntaa CSS:llä.** Korjaus:
- **Suositus: custom-dropdown** (styled `<div>`-lista, `position:absolute; top:100%` → aina alas; sulkeutuu klikkauksella/Escillä). Näin suunta on hallittu + tyyli §5-yhtenäinen. Klaviatuuri­tuki (nuolet/Enter) + `aria`-attribuutit saavutettavuuteen.
- **Vaihtoehto (kevyt):** pidä natiivi mutta varmista tila alhaalla (kortti/valinta ei modaalin pohjalla — siirrä ylemmäs / scroll). Vähemmän luotettava.
- Valitse custom, jos halutaan varma "alas".

## 4. Invariantit + verifiointi
§4 roolit · §26 (jaksofokus/tt_positio pikakentät) · §32 (olemassa olevat polut) · §37 (VP/valmentaja-yhteistyö) · §5 (custom-dropdown tokenit) · §7.22 (aikuisnäkymä) · ei version.json-bumppia · Rules → PR-deploy. Vitest jos authz-apuria. **Live-verifio:** (1) valmentaja + talenttivalmentaja + VP voivat asettaa talenttipelaajan jaksofokuksen; (2) dropdown aukeaa alas; (3) tallennus + näkyy VP-aloitusnäkymässä. `npm test` + lint.

## 5. Rajaus
Tämä = rooli-pääsy (VP+talenttivalmentaja) + dropdown-suunta. VP-oversight-dashboard (4c laaja) + kalenteri (4d) + joukkuetaktinen (4e) + pelaaja/perhe (4b) erikseen.
