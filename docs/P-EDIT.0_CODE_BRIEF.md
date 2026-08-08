# CODE BRIEF — P-EDIT.0 · Rebuild-primitiivi (`tmRakennaPikakentatArkistosta`)

**Tyyppi:** korjaus / foundation (jaettu, puhdas primitiivi). **Kohde:** `lib/tm_pikakentat.js` (+ `tests/tm_pikakentat.test.js`). **Kukin vaihe oma PR — tämä on Vaihe 0, ei sisällä UI:ta.**

**Design-totuus:** Ei visuaalista pintaa tässä vaiheessa. Tämä on laskennallinen selkäranka, jonka päälle E2 (pelaajakortin *Korjaa*/*Poista*) ja myöhemmin E1 (tapahtumatason siivous) rakentuvat. Brief on itsenäinen: kaikki tarvittava on alla, Code voi aloittaa avaamatta muita dokumentteja.

**Periaate:** mitään ei pakoteta, asiantuntija päättää. Pehmeä poisto (mitätöinti) on palautettavissa; kova poisto ei kuulu tähän vaiheeseen lainkaan.

---

## KOHDE / TAVOITETILA

Yksi puhdas funktio joka **laskee pelaajan §26-pikakentät ja mittaushistorian uudelleen alusta** kaikista hänen testituloksistaan — molemmista arkistoista (tapahtumapohjaiset testitulokset **ja** tapahtumattomat Pikakirjaukset) — kun yksittäinen tulos on **korjattu** tai **pehmeästi poistettu**.

### Miksi tämä tarvitaan (ongelman ydin)

Nykyinen `tmLaskePikakentat(pelaajaDoc, tulokset, pvm, optDeps)` on **inkrementaalinen** ja sisältää *VIIMEISIN-VARTIJAn* (koodissa jo merkitty `§26/P-EDIT`):

```js
var saaHH  = !d.hh_pvm  || String(pvm) >= String(d.hh_pvm);
var saaTKI = !d.tki_pvm || String(pvm) >= String(d.tki_pvm);
```

Se kirjoittaa pikakentän vain jos uusi `pvm >= tallennettu *_pvm`. Tämä on oikein eteenpäin kirjattaessa, mutta **ei osaa perua taaksepäin**: jos poistat tai korjaat *viimeisimmän* mittauksen, `hh_pvm`/`tki_pvm` osoittavat yhä poistettuun päivään, eikä vanhempi tulos pääse enää ylikirjoittamaan. Pikakenttä jää haamuarvoon.

Ratkaisu ei ole muuttaa vartijaa vaan **toistaa koko historia puhtaalta pöydältä**: nollaa omistetut kentät, käy kaikki (ei-mitätöidyt) merkinnät läpi kronologisessa järjestyksessä, ja anna saman `tmLaskePikakentat`-vartijan asettua luonnostaan oikeaan viimeisimpään.

---

## LÄPILEIKKAAVAT PERIAATTEET

1. **Uudelleenkäytä, älä toista.** §26-mäppäys tehdään `tmLaskePikakentat`-kutsulla; historia `tmHhSnapshot`/`tmTkiSnapshot`/`tmHistoriaLisaa`-kutsuilla (`lib/tm_historia.js`). Primitiivi on **vain orkestrointi**: suodata → järjestä → nollaa → fold. Älä kopioi §26-logiikkaa tai historian cap/upsert-logiikkaa uudelleen.
2. **Arkisto-agnostinen.** Primitiivi ei tunne Firestorea eikä arkistojen rakennetta. Kutsuja normalisoi molemmat arkistot yhdeksi `merkinnat`-listaksi ennen kutsua — täsmälleen kuten `tm_historia.js` on "testijoukko-agnostinen".
3. **Puhtaus (DoD-ehto).** Ei Firestorea, ei DOMia, ei `Date.now()`-riippuvuutta lopputulokseen. Sama sisään → sama ulos (idempotentti). `module.exports` + globaali, kuten muut libit.
4. **Poisto katoaa oikeasti.** Jos viimeinen tulos poistetaan, pikakentän on **regressoitava** edelliseen — ja jos mittausta ei enää ole yhtään, kentän on **hävittävä** (ei jäätävä vanhaan arvoon). Siksi primitiivi palauttaa myös listan poistettavista kentistä.

---

## VAIHE 0 — `tmRakennaPikakentatArkistosta` (oma PR)

### Allekirjoitus

```js
// lib/tm_pikakentat.js — tmLaskePikakentat-funktion viereen, samaan IIFE:hen (jakaa _resolve/deps).
function tmRakennaPikakentatArkistosta(pelaajaDoc, merkinnat, optDeps) { … }
```

- **`pelaajaDoc`** — pelaajan perustiedot (identiteetti): `syntymaVuosi`/`syntymaaika`, `sukupuoli`, `joukkue`, **ja** nykyiset stored-kentät (tarvitaan D2-ristilähteen tunnistukseen, ks. reunaehto). Ei mutatoida.
- **`merkinnat`** — taulukko yhtenäistettyjä testimerkintöjä **molemmista arkistoista**:
  ```
  { pvm: 'YYYY-MM-DD', tulokset: { …raaka-avaimet kuten tmLaskePikakentat odottaa… }, mitatoitu?: true }
  ```
  Kutsuja muodostaa tämän (tapahtumatestit + Pikakirjaukset → yksi lista). `tulokset` on täsmälleen se muoto jonka `tmLaskePikakentat` ottaa toisena argumenttina.
- **`optDeps`** — sama valinnainen dep-injektio kuin `tmLaskePikakentat`illa (`_resolve()`-fallback).

### Toteutus (orkestrointi)

1. **Suodata:** pudota merkinnät joilla `mitatoitu === true` tai joilta puuttuu `pvm`. (Tyhjä/pvm-tön suodattuu pois — sama sääntö kuin `_vpTestitViimeksi`.)
2. **Järjestä:** nouseva `pvm` (ISO-string-vertailu = kronologinen). Vanhin ensin — näin VIIMEISIN-VARTIJA asettuu oikein.
3. **Nollaa omistetut kentät** puhtaaseen `base`-objektiin (kopio `pelaajaDoc`ista, ks. *omistetut kentät* alla) — jotta poisto pääsee regressoimaan.
4. **Fold:** käy järjestetyt merkinnät läpi, kutsu jokaisesta `tmLaskePikakentat(base, m.tulokset, m.pvm, D)` ja yhdistä `upd` `base`en (`Object.assign`). Näin seuraava merkintä näkee edellisen tuloksen `*_pvm`:t → vartija toimii.
5. **Rakenna historia rinnalla:** jokaisesta merkinnästä `tmHhSnapshot(pvm, …)` / `tmTkiSnapshot(pvm, …)` ja kerää `tmHistoriaLisaa(arr, snap)`illa `hh_historia`- ja `tki_historia`-aikasarjat alusta. (Upsert pvm:llä + cap 20 hoituu libissä; älä toista.)
6. **Laske poistettavat:** vertaa mitkä *omistetut* kentät olivat `pelaajaDoc`issa mutta puuttuvat uudesta tuloksesta → ne on **poistettava** dokumentista (muuten haamuarvo jää).

### Paluuarvo

```js
return {
  upd:       { …asetettavat kentät ja arvot… },   // caller: doc.set(upd, {merge:true})
  poistetut: [ 'hh_pvm', 'hh_viimeisin', … ]        // caller: FieldValue.delete() näille
};
```

Kaksiosaisuus on korjauksen/poiston ydin: `upd` ei yksin riitä, koska Firestore-merge ei koskaan poista kenttää — täysin poistettu mittari **on** listattava `poistetut`iin tai se jää näkyviin.

### Omistetut kentät (nollattavat + poisto-ehdokkaat)

`hh_viimeisin`, `hh_pvm`, `hh_taso`, `d1_taso`, `d1_lahde`, `d1_kattavuus`, `d1_pvm`, `tki_viimeisin`, `tki_pvm`, `tki_merkki`, `tk_lajit_viimeisin`, `tk_lajit_pvm`, `tk_kokonaistulos_viimeisin`, `hh_historia`, `tki_historia`.

**D2 on erikoistapaus — lue reunaehto alla.**

### ÄLÄ tässä vaiheessa

- **Ei UI:ta** — ei nappeja, ei modaaleja, ei renderöintiä. (Korjaa/Poista-pinta = E2, seuraava vaihe.)
- **Ei Firestore-kirjoituksia** primitiivin sisällä — se palauttaa `{upd, poistetut}`, caller kirjoittaa.
- **Ei kovaa poistoa** eikä `mitatoitu`-lipun *kirjoittamista* — primitiivi vain **lukee** sen (E2 kirjoittaa).
- **Älä koske** `tmLaskePikakentat`in vartijalogiikkaan — rebuild kiertää sen puhtaalla pöydällä, ei muokkaamalla.

**Hyväksymiskriteeri:** viimeisimmän tuloksen poisto regressoi pikakentän edelliseen; kaikkien poisto tyhjentää kentän (`poistetut`); korjaus tuottaa saman tuloksen kuin jos oikea arvo olisi kirjattu alusta; sama sisään → sama ulos; `tmLaskePikakentat`in nykyiset testit pysyvät vihreinä.

---

## REUNAEHDOT (non-negotiable)

- **D2 ristilähde-suojaus.** `d2_taso` voi tulla muualtakin kuin H-H/TKI:sta (teknistaktinen `tk`, `sm`, `sm_pallo`). `tmLaskePikakentat`in oma d2-guardi ylikirjoittaa vain kun `d2_lahde ∈ {hh, sm, sm_pallo, tk}` tai `d2_taso == null`. **Nollaa `d2_*` vain jos nykyinen `d2_lahde` on tämän foldin omistama; muuten jätä ulkoinen D2 koskematta.** Tämä on ainoa herkkä kohta — sille oma testi.
- **`mitatoitu`-sopimus.** Kenttä `mitatoitu: true` merkinnällä = pehmeästi poistettu → suodatetaan pois rebuildissa. Tässä vaiheessa vain **luetaan**; kirjoittaminen on E2.
- **Cache-versio.** `lib/tm_pikakentat.js` muuttuu → bumppaa `?v=1` → `?v=2` **kaikissa** sen lataavissa tiedostoissa (VP `TalentMaster_VP_v25.html`, sekä Master/Testaus jos lataavat).
- **Puhtaus.** Ei Firestorea, ei DOMia, `module.exports` säilyy (vitest ajaa Nodessa).
- **Uudelleenkäyttö.** `tmLaskePikakentat` + `tm_historia`-API — ei §26- tai historia-logiikan kopiointia.

## DoD (tämä vaihe)

1. **Ei UI:ta → ei teema-screenshotteja.** (Poikkeus vakio-DoD:hen, koska puhdas primitiivi.)
2. Ei sisältö-/datahukkaa; `tmLaskePikakentat` + `tm_historia` uudelleenkäytetty, ei kopioitu.
3. `npx vitest run` **vihreä**; `tests/tm_pikakentat.test.js` laajennettu kattamaan vähintään:
   - poisto regressoi viimeisimmän pikakentän edelliseen,
   - kaikkien mittausten poisto → kenttä listalla `poistetut`,
   - korjaus = identtinen alusta-kirjaukseen,
   - idempotenssi (sama sisään → sama ulos, myös kahdesti ajettuna),
   - **D2 ristilähde: ulkoinen `d2_lahde` (esim. `tk`) säilyy rebuildin yli**,
   - `mitatoitu:true` -merkinnät jätetään huomiotta.
4. Pieni, stackattu PR; kuvaus linkkaa tähän briefiin.
5. **Verifioi Node-tasolla ennen seuraavaa vaihetta** (live-UI:ta ei ole ennen E2:ta).
