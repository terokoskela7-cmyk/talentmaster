# Code-fix — I3a: välimuistin versionostot puuttuvat (cache-busting)

> **Konteksti:** I3a (PR #148, commit 99ea7d4) muutti kolmen olemassa olevan kirjaston sisältöä, mutta **niiden `?v=`-
> versiota EI nostettu** VP/Master-HTML:ssä. Sovelluksen cache-busting perustuu `?v=N`-parametriin → paluukäyttäjien selain
> tarjoaa **vanhaa välimuistiversiota**, joten muutokset eivät astu voimaan. Deployatut tiedostot ovat oikeat (fresh-fetch
> vahvisti); kyse on vain versionostosta. Todennettu selaimessa: live `tmTtVaihe` antaa vanhaa `'silta'`-tulosta U14+positiolle,
> ja live `idpRakennaTavoite` ei sisällä `kestoVk`:tä.

## Korjaus — nosta `?v=` molemmissa HTML:issä
Tiedostot: **TalentMaster_VP_v25.html** JA **TalentMaster_Master_v16.html** (molemmissa samat viittaukset).

| Kirjasto | Muutettu I3a:ssa | Nyt | → Nosta |
|---|---|---|---|
| `lib/tm_idp.js` | kyllä (H4 kesto valmentajan asetettavaksi) | `?v=4` | **`?v=5`** |
| `lib/tm_teknistaktiset.js` | kyllä (H6 pelipaikkaportti U14+, H9 harjoite-tägit/jalka) | `?v=4` | **`?v=5`** |
| `lib/tm_arviointi_silta.js` | kyllä (SSOT-kommentti) | `?v=1` | **`?v=2`** |

(`tm_kehityspolku.js?v=1` = uusi tiedosto, OK — ei muutosta.)

## Huom
- Tämä on **ainoa** puuttuva asia I3a:sta — koodi + logiikka on verifioitu oikeaksi (resolver toimii, Vitest 735, resolver-
  järkitesti 8/8, Topiaksen tavoite → Tempokuljetus + havainnointi_vihje live).
- Tarkista ettei muissa I3a:ssa muutetuissa/uusissa liboissa ole sama puute (grep `?v=` HTML:stä vs. muuttuneet libit).
- **Vakiokäytäntö jatkossa:** aina kun libin sisältö muuttuu → nosta sen `?v=` HTML-viittauksessa (muuten paluukäyttäjät cachessa).

## Verifiointi (DoD)
- Selain (kova reload / uusi käyttäjä): `tmTtVaihe({ika:14, tt_positio_aktiivinen:'LA'})` → **`'pelipaikka'`** (ei `'silta'`).
- `idpRakennaTavoite(...).aikaraami.kesto_vk` kunnioittaa `opts.kestoVk`:tä (esim. 8 → 8, oletus 6).
- Harjoite-tägisuodatin (`tmTtHarjoitteet(avain, {tagit:['power']})`) toimii cachetetun sijaan.
- `npm test` + lint ennallaan (ei koodimuutosta, vain versionumero HTML:ssä).
- Branch `fix/i3a-cache-versions`. Merge kun Tero sanoo "live".
