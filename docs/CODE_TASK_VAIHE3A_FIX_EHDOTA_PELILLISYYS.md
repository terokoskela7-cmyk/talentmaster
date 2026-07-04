# Vaihe 3a — korjaus: "Ehdota uudelleen" -bugi + pelaaminen-linkitys

> Lähde: live-verify + Teron huomio 2026-07-03 (PR #89 päälle). Kohde: `TalentMaster_VP_v25.html` + `lib/tm_idp.js`. §33 (hiljainen fail) · §26 · §7b (pelaaminen-linkitys).

## 1. BUGI — "Ehdota uudelleen" ei toimi (juurisyy: objektiviittaus)
**Oire:** empty-state "Ehdota tavoite datasta" toimii demossa, mutta "Ehdota uudelleen" (aktiivinen/ehdotettu-kortissa) ei tee mitään livenä.
**Juurisyy:** kortti renderöi `window._vpArvPelaaja`-objektista (= `_jsvPelaajat[idx]`, modaalin lähde). Mutta `_vpEhdotaTavoite`/`_vpTallennaTavoite` hakevat pelaajan `_vpLoytaPelaaja(pid)`:llä joka **priorisoi `_pelaajat`-taulukkoa**. Kun nämä ovat eri objektiviittauksia (live: onSnapshot korvaa `_pelaajat`-refit tuoreilla; demossa ei → ei paljastu), moottori mutatoi eri objektin (`_idpTavoite`) kuin `_vpKausitavoiteReRender` lukee → ei näkyvää muutosta. Klassinen §33 hiljainen fail.

**Korjaus:** IDP-handlerit operoivat SAMAAN objektiin jonka kortti renderöi. Molempiin (`_vpEhdotaTavoite` ~3860, `_vpTallennaTavoite` ~3879):
```js
const p = (window._vpArvPelaaja && window._vpArvPelaaja.id === pid) ? window._vpArvPelaaja : _vpLoytaPelaaja(pid);
```
(korvaa nykyinen `const p = _vpLoytaPelaaja(pid);`). Näin mutaatio + re-render kohdistuvat yhteen objektiin riippumatta siitä kumpi taulukko modaalin täytti. Tarkista myös `_vpLataaTavoite`: se saa `p`:n argumenttina modaalin renderistä (OK), mutta varmista että sama objekti = `_vpArvPelaaja` kun se asettaa `_idpTavoite` (rivi 3908 `_vpKausitavoiteReRender` lukee `_vpArvPelaaja` → jos `_vpLataaTavoite`:n `p` ≠ `_vpArvPelaaja`, sama bugi). Kohdista `_vpLataaTavoite` myös `_vpArvPelaaja`:aan kun id täsmää.
**Verifiointi:** live SJK-talentti → Ehdota → Hyväksy → **Ehdota uudelleen** → kortti päivittyy (status ○ Ehdotettu + uusi luonnos). Testaa myös listasta (renderPelaajatFiltered) JA joukkue-syvänäkymästä (kaksi eri `_jsvPelaajat`-lähdettä).

## 2. PELAAMINEN-LINKITYS (§7b — Teron linjaus: kehittyminen + tavoitteet linkittyvät AINA pelaamiseen)
Teknis-taktiset kohteet **jo nousevat** fokukseksi (`idpKeraaKandidaatit` kerää `arviointi_havaittu ≤2` kaikista dim:eistä + pelihavainto — vahvistettu). Vahvista pelillinen kehystys:
- **Perustelu-rivi "pelillinen sovellus":** `idpEhdotaTavoite` lisää `perustelu.teksti`:iin lyhyen pelisovelluslauseen kohteen mukaan (esim. syöttö → "Näkyy ottelussa: uskallus avata peli eteenpäin paineessa."; sijoittuminen → "Näkyy pelissä: oikea paikka ennen palloa."). Datavetoinen pieni mäppäys (dim/avain → pelilause), fallback geneerinen ("Tavoite näkyy pelissä — ei irrallinen testisuoritus.").
- **Fokus-nimi pelilähtöinen:** havaituille käytä taksonomian `nimi_fi` (jo pelikontekstinen). Mitatuille TK-lajeille lisää pelisana jos luonteva (esim. "Syöttö" → chip-tooltip "pelin avaaminen"). Ei pakoteta jos ei mäppäystä.
- **Kortin UI:** lisää fokus-chippien alle pieni rivi "⚽ Pelillinen sovellus: …" (perustelun pelilause). §5-tokenit.
- **Ankkuri_7030** säilyy pelillisenä integrointina (jo teksti "Integroi X vahvuuteen").
Nämä ovat pieniä lisäyksiä — EI uutta arkkitehtuuria. Vaihe 4 (teknis-taktinen corner) + Vaihe 6 (ottelu-KPI) syventävät myöhemmin.

## 3. Invariantit + verifiointi
§33 (korjaa hiljainen fail, ei uutta) · §26 pikakentät · §7b pelaaminen-linkitys · §7.22 (aikuisnäkymä) · §5 · ei version.json-bumppia · ei Rules-muutosta (idp_kausi jo v3.10). Testit: lisää `idpEhdotaTavoite`-testi että `perustelu.teksti` sisältää pelisovelluslauseen (havaittu + mitattu haara). `npm test` + lint. Live: ref-fix ( Ehdota uudelleen molemmista listalähteistä) + pelilause kortissa.
