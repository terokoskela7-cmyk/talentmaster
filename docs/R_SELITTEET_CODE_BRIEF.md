# CODE BRIEF — R-selitteet · Arviointitaksonomian kuvaukset + ⓘ-vihje + D5-roll-up

**Tyyppi:** sisältölisäys jaettuun libiin + UI-vihje + yksi roll-up-korjaus. **Tausta:** SJK:n VP ja Head of Talent toivoivat että arviointiin tuodaan **selite per ominaisuus** ("mitä tasapaino tarkoittaa?"), jotta valmentajan/VP:n on helpompi arvioida pelaajaa. Nykytaksonomia (57 attribuuttia) sisältää nimet + dimit muttei kuvauksia (`on_kuvaus:false`).

**Sisältölähde:** `docs/ARVIOINTI_TAKSONOMIA_KUVAUKSET.md` (valmentajakieliset selitteet; FA Player Scouting Template 2026 + valmentajakieli). Aloitus kattaa vahvistetut attribuutit — **täydennä kaikkiin 57:ään**.

**Periaate:** sisältö + vihje, ei uutta laskentaa (paitsi D5-roll-up joka käyttää olemassa olevaa dim-keskiarvopatternia).

---

## VAIHE 1 — `kuvaus_fi` taksonomiaan (jaettu lib)

- **Kohde:** `lib/tm_arviointi_taksonomia.js` (`var ARVIOINTI_TAKSONOMIA = [...]`, 57 riviä; rivi = `{avain, nimi_fi, nimi_en, dim, kategoria, mitattavissa, mitta}`).
- Lisää jokaiseen riviin **`kuvaus_fi`** (docs-referenssistä; valinnainen `kuvaus_en`). Yksi tiivis lause per attribuutti — "mitä tässä katsotaan".
- **Cache-bump:** tämä on jaettu lib → nosta `tm_arviointi_taksonomia.js?v=6` → **`?v=7`** kaikissa HTML-tiedostoissa jotka sen lataavat (grep `tm_arviointi_taksonomia.js`). Näin selitteet tulevat **kaikille pinnoille** (VP-arviointi, player-kortti, valmentaja-appi) kerralla.
- Valinnainen: paljasta kuvaus myös `tmTaksonomiaByAvain(avain).kuvaus_fi` kautta (jos helperi rakentaa olion) — jolloin mikä tahansa pinta voi lukea sen.

## VAIHE 2 — ⓘ-vihje arviointi-UI:hin

- **Kohde:** `_vpArviointiHTML(p)` (VP_v25) — renderöi Ominaisuusarvioinnin `ARVIOINTI_TAKSONOMIA`sta (kehys `tmKehys().taksonomia`).
- Jokaisen attribuutin nimen viereen **ⓘ**-elementti, joka näyttää `kuvaus_fi`n (title-tooltip + tap-tuki mobiilissa; ei pelkkä `title=` jos kosketuslaitteet ovat kohde — pieni popover/tooltip). Molemmat teemat; §7.22 (VP-facing → 1–5 + värit sallittu).
- **Player-kortti perii tämän ilmaiseksi** jos se lukee samaa taksonomiaa (design-mockup `docs/PLAYER_CARD_TOPIAS.html` "FA 1–5" -kerros näyttää mallin: attribuutti + ⓘ + arvo dimeittäin).

## VAIHE 3 — D5-roll-up-korjaus (verify + fix)

- **Bugi (löytyi Topiaksesta):** hänelle on arvioitu D5-attribuutit `arviointi_havaittu`ssa (social_interaction / team_role / versatility = 4/4/4), mutta **`d5_taso` on tyhjä** → kortti/tutka näyttää "D5 —" vaikka data on olemassa.
- **Syy:** D2:lla on roll-up (`laskeD2Taso`), D5:llä ei ole vastaavaa — `d5_taso` luetaan (rivit ~8365/10108/12938) mutta sitä ei koskaan koota havaittu-attribuuteista.
- **Korjaus:** kokoa `d5_taso` niiden `arviointi_havaittu`-attribuuttien keskiarvona joiden taksonomia-`dim === 'D5'` (kategoria `sosiaalinen`), **kun muuta D5-lähdettä ei ole** — samalla `dimKa`/keskiarvo-patternilla kuin D2. **Verify ensin:** älä riko D1–D4:n nykyistä laskentaa; D5 vain lisätään puuttuvana.
- Tyhjä pysyy "—" (ei 0) kun D5-attribuutteja ei ole arvioitu (domain: empty ≠ 0).

---

## INVARIANTIT
1. **Selitteet = sisältöä, ei dataa.** `kuvaus_fi` elää taksonomia-libissä, **ei Firestoressa** — ei datamigraatiota, ei pelaajadokkien muutosta.
2. **Ei uutta laskentaa paitsi D5-roll-up**, joka uudelleenkäyttää olemassa olevan dim-keskiarvon (ei uutta kaavaa).
3. **Cache-bump vain jaetulle libille** (`tm_arviointi_taksonomia.js` v6→v7) + sitä lataavat HTML:t. VP_v25:n `_vpArviointiHTML`-muutos ei yksin vaadi bumppia, mutta lib vaatii.
4. Molemmat teemat; §7.22; ei nimien/dimien/asteikon muutosta (ne ovat jo oikein — TM kattaa FA-mallin).

## SKOOPIN ULKOPUOLELLA
- **Potentiaaliasteikko** (FA-tähdet 1–5: TOP 5 -liigat … Veikkausliiga … muut) → myöhempi lisä **Scouting-linssiin**, ei arviointiin.
- Taksonomian uudelleenjärjestely (ei tarpeen — nimet/dimit/kategoriat ovat jo paikallaan).
- Player-kortin OOTB-toteutus (erillinen, käyttäjätestin jälkeen).

## HYVÄKSYMISKRITEERI (kolmitasoinen)
- **L1 git-diff:** `kuvaus_fi` lisätty kaikkiin 57:ään; ⓘ vain UI-kerros; D5-roll-up rajattu D5:een eikä koske D1–D4:ää; cache-bump oikein.
- **L2 testit:** taksonomia-eheys (jokaisella rivillä `kuvaus_fi`, ei tyhjiä); D5-roll-up puhtaana funktiona (D5-attribuutit → keskiarvo; ei attribuutteja → null/"—"); suite vihreä, eslint puhdas.
- **L3 live (Claude, sanktioitu Topias):** ⓘ näkyy arvioinnissa molemmilla teemoilla ja näyttää oikean kuvauksen; **Topiaksen D5-taso ei enää tyhjä** (koostuu 4/4/4 → ~4); muut dimit ennallaan. Data ennallaan.

## DoD
1. `kuvaus_fi` × 57; ⓘ molemmissa teemoissa (screenshotit); D5-roll-up verifioitu.
2. Cache-bump v7 kaikissa lataavissa HTML:issä.
3. Puhtaat yksikkötestit; suite vihreä; eslint puhdas.
4. Pieni PR; kuvaus linkkaa tähän briiffiin + `docs/ARVIOINTI_TAKSONOMIA_KUVAUKSET.md`.
5. **Älä mergeä** ennen L1-diffiä + L3-liveä.
