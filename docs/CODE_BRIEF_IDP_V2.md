# CODE BRIEF — IDP-kortti v2 (vahvuus-moodi · SMART-mittarit · itsearvio · 8vk-sääntö)

**Versio:** 1.0 · **Pohja:** IDP-mockup v2 (`idp_mockup_v2.html`, Kimin mockup + auditin lisät) + roadmap-auditointi (main HEAD c0828a2)
**Periaate:** Älä rakenna uutta moottoria äläkä uutta tietokantataulua. Suurin osa roadmapin P0/P1:stä on jo koodissa — tämä brief lisää **vain kolme aitoa puutetta** + kohdistaa UI:n mockupiin. Ja: **järjestelmä ei saa muuttua jäykäksi** — kaikki uusi on ehdotus/pehmeä, ei pakotettu tallennuseste.

---

## 0 · ÄLÄ tee uudelleen (jo livenä — verified koodista)

Nämä roadmap-kohdat ovat JO toteutettu. **Ei kosketa:**

- **Lähde-indikaattori** — lähderyhmät + legenda + per-rivi 🔒/PELIH. + IDP-lähdesiru ovat jo (`VP_v25:4297,4313–4352,4670`).
- **Pelihavainto → IDP -nappi** — "＋ IDP-tavoite" -pill on jo ≤2-riveillä (`VP_v25:4261,4336,4351,4485`).
- **shooting_efficiency** — jo tulosmittari, ei konseptikartassa, `mitattavissa:false` (`tm_kehityspolku.js:50,119`). Näytä "KPI, ei konsepti" (kuten mockup).
- **long_passing alt-vihje** — y_h2 + y_h8 jo (`tm_kehityspolku.js:26,41`). Näytä molemmat tagit.
- **PHV ohjaa moottoria** — IDP_KYPSYYS_GATED + pre-PHV-priorisointi jo (`tm_idp.js:11,91,96`). ÄLÄ tee kovaa ikäfilteriä (ristiriita joustavan pelipaikka-gaten kanssa).

---

## 1 · VAHVUUS-MOODI (P1 — tärkein) 💚

**Miksi:** "Jos keskitytään koko ajan vain heikkouksiin, se ei kanna pitkällä." Kansainvälinen malli (EPPP/PDP) sallii aina myös vahvuuden jalostamisen *superstrengthiksi*. Nyt moottori on vain heikoin-ensin (`tm_idp.js:99`).

**Toteutus:**

1. **Tavoitetyyppi** jokaiselle tavoitteelle: `tyyppi: 'heikkous' | 'vahvuus' | 'pelipaikka'` (kenttä tavoiteolioon `tm_idp.js` idpRakennaTavoite). Oletus `'heikkous'`.
2. **Moottorin painopiste** (jaksotaso): `modus: 'heikkous'|'vahvuus'|'pelipaikka'`, oletus `'heikkous'`.
   - `heikkous` → nykyinen logiikka (min D2/D4, `idpValitseHeikoin`).
   - `vahvuus` → valitse **vahvin** osa-alue (max D2/D4) → tavoite "jalosta erottavaksi aseeksi" (nykytila 4/5 → huipputaso 5/5).
   - `pelipaikka` → pelipaikkafundamentit (kuten nyt U14+, **joustava** gate).
3. **UI (Kehitys-välilehti, ks. mockup):**
   - Segmentti "IDP-moottorin painopiste: [Korjaa heikkous] [Jalosta vahvuus] [Pelipaikan vaatimus]".
   - Tyyppi-chip jokaisessa tavoiterivissä (heikkous=amber, vahvuus=vihreä, pelipaikka=sininen).
   - Jakauma-teksti "4 heikkous · 1 vahvuus · 1 pelipaikka".
   - Pehmeä tasapaino-huomio: *"vähintään yksi vahvuustavoite / jakso — suositus, ei pakko."* EI estä tallennusta ilman vahvuustavoitetta.

**Tiedostot:** `tm_idp.js` (idpJarjestaKandidaatit — lisää `modus`-haara + idpValitseVahvin; idpRakennaTavoite — `tyyppi`-kenttä), `VP_v25` (segmentti + tyyppi-chipit).
**Hyväksymiskriteeri:** VP valitsee "Jalosta vahvuus" → moottori ehdottaa vahvinta osa-aluetta. Tavoiterivissä näkyy tyyppi-chip. Jakso, jossa on vain heikkoustavoitteita, tallentuu silti (pehmeä huomio, ei esto).

---

## 2 · SMART-MITTARI NÄKYVÄKSI (P1) — rakenne on jo, pinta puuttuu

**Miksi:** "SMART-tavoitteet ovat erittäin tärkeitä. Jos tavoitteeseen linkitetään mittareita, erittäin hienoa." Rakenteiset kentät ovat jo olemassa (`mittari{testId,yksikko,suunta}`, `lahto{arvo}`, `tavoitearvo`, `aikaraami{arvio_pvm}` — `tm_idp.js:258–274`). Ne eivät vain näy kortissa selkeästi.

**Toteutus (ks. mockup Kehitys):** renderöi jokainen tavoite muodossa:
> **[Tavoitteen nimi]** · Mittari: [mittari] · Nykytila: [lahto] → Tavoite: [tavoitearvo] · Deadline: [arvio_pvm] · [progress-palkki].

- Progress = (nyky − lähtö)/(tavoite − lähtö), värit good/warn/bad.
- **Pehmeä täydennys, EI pakotus:** jos mittari/tavoitearvo puuttuu, näytä hillitty "◔ mittari puuttuu — lisää" -vihje. **VP voi tallentaa ilman.** (Periaate: ei jäykkää järjestelmää.)

**Tiedostot:** `VP_v25` (IDP-kortin tavoiterivin render). Ei moottorimuutosta.
**Hyväksymiskriteeri:** Tavoiterivi näyttää mittarin, lähtö→tavoite ja deadlinen + progress-palkin. Puuttuva mittari näkyy pehmeänä vihjeenä, ei estä tallennusta.

---

## 3 · 8 VIIKON SÄÄNTÖ (P2) — datapohja on jo

**Miksi:** jos tavoite ei etene 8 viikossa, harjoite/tavoite pitää harkita uudelleen (kv-malli). Datapohja on jo: `idp_viim_review` (`tm_idp.js:384`), delta 7.2b:stä.

**Toteutus:**
- Apufunktio `tm_idp.js`: `idpJumissa(tavoite, now)` → true jos `(now − luotu) > 56 vrk` JA `(nyky − lähtö) < 0.5` (asteikko 1–5) TAI mitattu delta ≈ 0.
- UI (VP IDP-kortti tai avattaessa): pehmeä banneri *"Tavoite ei ole edennyt 8 viikkoon — harkitse harjoitteen/konseptin vaihtoa · katso 7.2b-analytiikka."* Ei automaattista muutosta, vain ehdotus.

**Tiedostot:** `tm_idp.js` (idpJumissa, pure), `VP_v25` (banneri).
**Hyväksymiskriteeri:** Tavoite jonka luonnista >56 vrk eikä edistystä → näkyy pehmeä ehdotus. Etenevä tai tuore tavoite ei näytä bannereita.

---

## 4 · PELAAJAN ITSEARVIO + SITOUMUS (P2)

**Miksi:** kv-mallissa pelaaja omistaa IDP:n (itsearvio + sitoutuminen). Nyt VP/valmentaja omistaa; itsearvio on vain D3-tasolla, ei tavoitetasolla.

**Toteutus (MVP — laajenna olemassa olevaa, ei uutta appia):** Pelaaja-PWA:n "Minä"-välilehti (`Pelaaja_v7`) hostaa jo D3-itsearvion + IDP-kaaren. Lisää sinne:
- 3 kysymystä (lapsen kieli): "Vaikeinta juuri nyt", "Viime jaksolla onnistui", "Oma tavoitteeni tälle jaksolle".
- Nappi **"Sitoudun tähän jaksoon"** → tallentaa `sitoumus_pvm` (+ vapaaehtoinen VP-vahvistus).
- Tallennus: kevyet kentät `idp_kausi/<vuosi>` -olioon (EI uutta taulua — ks. Q2), reuse D3-itsearvion kirjoituskuvio (Rules v3.10 sallii pelaajan oman kirjoituksen).
- VP näkee itsearvion + sitoumuksen (Kehitys/Arviointi-välilehti, kuten mockup "Pelaajan ääni & sitoumus" -kortti).

**Tiedostot:** `Pelaaja_v7` (Minä-välilehti), `VP_v25` (näyttö).
**Hyväksymiskriteeri:** Pelaaja näkee jaksofokuksensa, täyttää itsearvion ja painaa "Sitoudun" → VP näkee sitoumuksen pvm:n + tekstit.

---

## 5 · UI-RAKENNE MOCKUPISTA (adoptio, progressiivinen)

Kohdista IDP-kortti mockupin rakenteeseen kun yllä olevat on tehty. Ei pakollinen kerralla:
- Välilehdet: **Aloitus · Mittaus · Arviointi · Kehitys · Viikko**.
- Arviointi: lähde-pilli-legenda + ○ ei-arvioidulle + "KPI, ei konsepti" laukaustehokkuudelle.
- Review-rytmi -kortti (4 vk / 8 vk / kausireview).
- 5D-radar: **korjaa viewBox** ettei reunalabelit (D2, D5) leikkaudu (mockupissa `viewBox="-90 -22 400 264"`).
- Kausitavoite (pitkä) erilliseksi jaksofokuksen (lyhyt) yläpuolelle. **Älä käytä oikean pelaajan nimeä** oletuksena.

---

## 6 · VASTAUKSET DATAKYSYMYKSIIN (koodista)

- **phv:** on jo, nimellä `phv_tila` (PRE/LAH/PH/POST/AN), laskettu `src/lib/tm_bioika.js`. Ei laskettava uudelleen.
- **idp_kandidaatti-taulu:** ei ole eikä tarvita — kandidaatit lennossa (`idpKeraaKandidaatit`), pysyvyys `idp_kausi/<vuosi>.tavoitteet[]`. Itsearvio/sitoumus samaan olioon.
- **itsearvio-pinta:** on jo — `Pelaaja_v7` "Minä"-välilehti. Laajenna sitä, ei uutta appia.

---

## 7 · MUISTETTAVAT REUNAEHDOT

- **Cache-versiot:** jos `tm_idp.js` tai muu lib muuttuu, **bumppaa `?v=N`** kaikissa sitä lataavissa HTML:issä (VP, Master, IDP-kortti). (Oppi I3a:sta.)
- **Oikeat alaikäiset (Eino Pajula, Leo Eteläaho):** ei kirjoituksia ilman erillistä vahvistusta. Testipelaaja Topias Koskela = OK.
- **GDPR:** loukkaantumis-/terveystieto `terveys/`-alikokoelmaan, ei vapaatekstiin.
- **Firestore-säännöt:** deploy vain Firebase Consolesta, ei GitHub Actions.
- **Prosessirehellisyys (§29):** ka_delta vain mitatuista — säilytä.

---

## 8 · JÄRJESTYS

1. **v1 — Vahvuus-moodi + SMART-mittari näkyväksi** (§1 + §2) — suurin arvo, pieni koodi.
2. **v1.1 — 8 vk sääntö** (§3) — datapohja jo olemassa.
3. **v2 — Pelaajan itsearvio + sitoumus** (§4) — omistajuus mukaan.
4. **v2.1 — UI-rakenne mockupista** (§5) — progressiivinen viimeistely.

Jokainen vaihe itsenäinen ja julkaistavissa. Mockup (`idp_mockup_v2.html`) on visuaalinen referenssi.
