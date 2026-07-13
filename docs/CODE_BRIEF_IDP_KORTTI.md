# CODE BRIEF — IDP-kortti (Claude Design handoff × koodi × arkkitehtuuri)

**Versio:** 1.0 · **Kohde:** IDP-välilehti, kohdistettuna eläviin pintoihin **VP v25** (valmentaja/VP) + **Pelaaja v7** (pelaajan "Minä").
**Design-lähde (visuaalinen totuus):** Claude Design -handoff `Kansainvälisen tason pelaajan IDP-kortti` → `project/IDP-kortti.dc.html` + design system `project/_ds/talentmaster-design-system-*/` (`colors_and_type.css`, `styles.css`).
**Logiikka-lähde:** `CODE_BRIEF_IDP_V2.md` + roadmap-auditointi (main HEAD c0828a2).
**Arkkitehtuuri:** narratiivirakenne, jaksofokus = IDP-välilehden tila (erillinen editori poistuu), data→IDP-silmukka.

> Design on **pixel-tarkka totuus siitä miltä näyttää**. Tämä brief kertoo **mihin se kytketään** (mikä on jo koodissa, mikä uutta) ja **millä säännöillä**. Älä rakenna uutta moottoria äläkä uutta tietokantataulua.

## ⚑ YDINPERIAATE — mitään ei pakoteta, asiantuntija päättää

Järjestelmä **ehdottaa**, ihminen **päättää**. Asiantuntijalla (VP/valmentaja/fysiikkavalmentaja) on aina valta yliajaa kaikki: **teema, painopiste, tavoitteet, jakso, kesto, domeeni — ja teema (light/dark)**. Moottorin ehdotukset (heikoin-ensin, ikävaihe, PHV, teema) ovat oletuksia, eivät lukkoja. Mikään kenttä ei estä tallennusta puuttuessaan (pehmeä vihje, ei virhe). Tämä koskee koko korttia — ei jäykkää järjestelmää.

---

## 0 · BRÄNDI & TEEMA (ei-neuvoteltava)

Käytä **design systemin tokeneita**, älä kovakoodaa värejä/fontteja. Molemmat teemat toimivat automaattisesti `data-theme`-attribuutilla (VP/valmentaja-sivuilla on jo teemanvaihto).

- Paletti: `--carbon #1C1C1A` · `--bone #F2EFE6` · `--teal #1A7A5E` · `--teal-d #28B090` (fokus/dark-aksentti) · `--slate #585751`. Tila-sävyt aina himmennettyinä + reunalla (`--green/amber/red -dim/-brd`).
- Fontit: **Cormorant Garamond** (otsikot h1/h2, KPI-luvut, pelaajan "signal"-lauseet — ei koskaan bold), **DM Sans** (body/label), **DM Mono** (badget, aikaleimat, koodit).
- Muoto: **terävät kulmat oletus** (light-puoli 0–2px), kortit dark-puolella `--tm-radius-md 10px`. Hiusviivarajat `.5px/1px` matalalla opasiteetilla. Ei gradientteja operatiivisessa UI:ssa.
- Tekstityylit valmiina luokkina: `tm-eyebrow` (9px UPPERCASE .2em), `tm-stitle`, `tm-tab`, `tm-badge`, `tm-meta`, `tm-mono`, `tm-body-sm`, `tm-kpi`, `tm-signal`.
- Casing: otsikot Cormorant sentence case; eyebrow/tab/badge **UPPERCASE .14–.22em**. Emoji semanttisina ikoneina (💎🎯📍📋), ei koristeena.

---

## 1 · RAKENNE — IDP-välilehti, 5 osaa (ks. handoff `IDP-kortti.dc.html`)

Narratiivirakenteen välilehdet: **Aloitus · Nykytila · IDP · Kehitys · Viikko**. Aktiivisen välilehden alle 1.5px `--teal-d` -viiva. Tämä brief kattaa **IDP-välilehden**.

1. **Header** — avatar (teal-tint), nimi (Cormorant 26px), meta (`SJK P16 · keskikenttä · ikävaihe 16+ · 💎 Hidden Gem`), badget (IDP aktiivinen · Jakso 1/4 · VP + valmentaja).
2. **Kausitavoite** — 2px teal vasen-reuna, eyebrow "🎯 Kausitavoite · pitkä 6–12 kk", Cormorant 300 29px lause.
3. **Jaksofokus (aktiivinen)** — kortti (teal vasen-reuna), teema (Cormorant 30px), pilli-rivit (Domeeni · Kesto · Ohjelma), "✎ Muokkaa jaksofokus" -nappi → avaa **inline edit -paneeli** (3 valintaa).
4. **SMART-tavoitteet** — jakauma + tasapaino-huomio + tavoiterivit (nro · nimi + tyyppi-chip · mittari `lähtö→tavoite` · deadline · progress-palkki).
5. **Silta** — teema→harjoite (2 korttia: teknis-taktinen teema + konseptitagit; drillit taajuuksin).
6. **Pelaajan ääni & sitoumus** — 3 itsearviolausetta (Cormorant italic) + sitoumus-laatikko (✓/◔ + teksti).

---

## 2 · JAKSOFOKUS — asetetaan tässä (erillinen editori POISTUU)

**Muutos:** poista erillinen `_vpTtKorttiHTML` "Aseta/muokkaa jaksofokus (talentti)". Jaksofokus asetetaan IDP-välilehden "✎ Muokkaa jaksofokus" -paneelista. Paneeli (handoff rivit 70–100):

- **1 · Domeeni:** `Fyysinen · D1` | `Teknis-taktinen · D2/D4` → **korjaa Emil-törmäyksen:** jaksofokuksella on `domeeni`-kenttä; fyysinen ja tekninen eivät kirjoita samaan slottiin päälletysten.
- **2 · Painopiste:** `Korjaa heikkous` | `Jalosta vahvuus` | `Pelipaikka` → moottorin `modus`.
- **3 · Teema + kesto:** ehdotettu teema (esim. Kestävyys) **yliajettavissa**; kesto 4–8 vk manuaalinen. Ikävaihe ohjaa **ehdotusta, ei estä** (joustava gate).

**Hyväksymiskriteeri:** erillistä editoria ei ole; jaksofokus (fyysinen TAI tekninen) asetetaan tästä ilman että toinen ylikirjoittuu.

---

## 3 · LOGIIKAN KYTKENTÄ — mikä on jo koodissa, mikä uutta

| Osa | Koodissa jo | Uutta (tämä brief) |
|---|---|---|
| Kausitavoite / jaksofokus / kaari | `tm_idp.js` idpRakennaTavoite, kausi/väli/jakso-hierarkia | Domeeni-kenttä jaksofokukseen (törmäysfix) |
| Vahvuus-moodi | — (vain heikoin-ensin, `tm_idp.js:99`) | `modus` + `tyyppi`; idpValitseVahvin; tyyppi-chipit |
| SMART-target riville | rakenne on (`mittari/lahto/tavoitearvo/aikaraami`) | renderöi riville; puuttuva = pehmeä vihje, **ei tallennusestoa** |
| Silta (teema→harjoite) | I3a `tm_kehityspolku.js` | — (näytä olemassa oleva) |
| Lähdemerkinnät / pelihavainto→IDP | jo livenä (VP_v25) | — (älä rakenna uudelleen) |
| shooting_efficiency | tulosmittari, ei konsepti | näytä "KPI, ei konsepti" |
| Pelaajan itsearvio | D3-itsearvio Pelaaja_v7 | tavoitetason 3 kysymystä + **sitoumus** (`sitoumus_pvm`) |
| Äänirekisteri | — | `showcase`/`rakentaja` labelit (ks. §4) |
| 8 vk sääntö | pohja `idp_viim_review` | pehmeä ehdotus jos ei edisty 56 vrk |

Tallennus: kaikki `idp_kausi/<vuosi>`-olioon — **ei uutta taulua**. `phv_tila` on jo (`tm_bioika.js`).

---

## 4 · ÄÄNIREKISTERI & SITOUMUS (handoff-logiikka)

Handoff toteuttaa DS:n voice-ohjeen. Toteuta sama:

- **Rekisteri** `showcase` (U16–19): "Vaikeinta juuri nyt" · "Viime jaksolla onnistui" · "Oma tavoitteeni". **`rakentaja`** (U13–15): "Mikä tuntuu nyt vaikealta?" · "Missä onnistuit viime jaksolla?" · "Mitä sinä haluat?". Valinta ikävaiheesta.
- **Sitoumus:** pelaaja sitoutuu → `commitIcon ✓ / ◔`, teksti "Emil sitoutui jaksoon 9.7. · VP vahvisti 9.7." vs "…odottaa VP:n vahvistusta". Kaksivaiheinen: pelaaja sitoutuu, VP vahvistaa.

---

## 5 · KOHDEPINNAT & LINSSIT

Yksi kortti, roolin mukaan rajattu (ei kolmea eri korttia):

- **VP v25** (light/dark teema): IDP-välilehti täysin, "Muokkaa jaksofokus", vahvistaa sitoumuksen. Poistaa vanhan erillisen jaksofokus-editorin.
- **Pelaaja v7** ("Minä"): sama IDP kevyemmin — jaksofokus, kaari, **itsearvio + sitoudun**. `rakentaja`-rekisteri nuoremmille.
- Dashboardit (VP/valmentaja) ovat sisääntulo → sama kortti.

---

## 6 · REUNAEHDOT

- **Cache-versio:** jos `tm_idp.js` tms. lib muuttuu → bumppaa `?v=N` kaikissa lataavissa HTML:issä.
- **Oikeat alaikäiset** (Eino Pajula, Leo Eteläaho, Emil Ahopelto): ei kirjoituksia ilman erillistä vahvistusta. Topias Koskela = testi-OK.
- **GDPR:** terveys/loukkaantuminen `terveys/`-alikokoelmaan, ei vapaatekstiin.
- **Firestore-säännöt:** vain Firebase Consolesta.
- **Kaikki lisät pehmeitä** — ei pakotettuja tallennusesteitä ("ei jäykkää järjestelmää").

---

## 7 · JÄRJESTYS

1. **v1** — IDP-välilehden rakenne DS-tokeneilla + jaksofokus-paneeli (domeeni/painopiste/teema) + erillisen editorin poisto. → korjaa törmäyksen, tuo brändin.
2. **v1.1** — SMART-target riville + vahvuus-moodi + tyyppi-chipit.
3. **v2** — pelaajan itsearvio + sitoumus (Pelaaja v7), äänirekisteri.
4. **v2.1** — 8 vk sääntö.

Design-referenssi jokaisessa: handoff `IDP-kortti.dc.html`. Visuaali = pixel-tarkka; rakenna DS-tokeneilla, älä kopioi prototyypin sisärakennetta jos se ei istu.
