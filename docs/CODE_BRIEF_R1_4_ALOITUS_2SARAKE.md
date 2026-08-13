# R1.4 — Aloitus 2-sarakeasettelu (v7-malli) + R4-valmistelu · Code-brief

> **Miksi:** DESIGN-LINJA (pysyvä): kaikki uudistukset noudattavat KISS-design-karttoja, kaikki välilehdet. Aloitus-kortin
> ilme + konsepti-ydin ovat jo kartan mukaiset (R1.2/R1.3). **Puuttuu asettelu:** v7-kartta on **2-sarakekortti**, live on
> yksisarakkeinen jaetun profiilirailin vieressä. Tero: "tehdään siitä samanlainen" → **Aloitus omaan 2-sarakkeeseen**.
> **Kartta (SSOT):** `docs/idp_design/IDP_KORTTI_KISS_design_kartta_v7.html` — `.cols { grid-template-columns: 1.5fr 1fr }`.
> **Luonne:** rakenteellinen uudelleenasettelu (Aloitus-kohtainen) — EI uutta dataa, EI uutta laskentaa. Kaikki komponentit
> (tutka, Suunnitelman kaari, narratiivi) ovat jo olemassa; kyse on sijoittelusta. **Verifiointi: LIVE** molemmilla teemoilla,
> kartta vieressä. Arkkitehti verifioi.

---

## TAVOITEASETTELU (v7 `.cols`)

Aloitus-välilehti (tab 0) = **2-saraketta**, EI jaettua profiilirailia:
- **VASEN (1.5fr) — narratiivi:** `_vpIdpNarratiiviHTML(p)` (pelaajan ääni · X-factor · jaksofokus-hero + konsepti-ydin ·
  peili · kausitavoite · stat-tiiviste · syvyys-kortit). **Ilman** Suunnitelman kaarta (siirtyy oikealle).
- **OIKEA (1fr) — `.col-r`:** ylhäällä **5D-tutka** (`_tmRadar5D`, sama `radarDims`/`_radarOpts` kuin railissa) +
  sen alla **Suunnitelman kaari** (`_vpAloitusKaariHTML(p, ika)`): Kausitavoite · Jaksofokus·nyt · Kehityskaari ·
  Seuraava katselmus. (Juuri v7:n "radarin alla pelaajan suunnitelma".)

**Muut 4 välilehteä (Mittaus/Arviointi/Kehitys/Viikko): ENNALLAAN** — pitävät jaetun `.jsp-left`-railin (290px + 1fr).

---

## TOTEUTUS (kohteet)

**1) Aloitus-moodin kytkin `_jspVaihda(n)`:iin** (rivi ~7595 alue): kun `n === 0` → lisää `.jsp-grid`:iin luokka
`aloitus-mode`; kun `n !== 0` → poista se. (Säilytä `window._jsvAktiiviTab`-logiikka.)

**2) CSS** (`.jsp-grid`-lohkon lähelle, rivi ~1342):
- `.jsp-grid.aloitus-mode { grid-template-columns: 1fr; }` (rail pois gridistä)
- `.jsp-grid.aloitus-mode .jsp-left { display: none; }` (rail piiloon vain Aloituksessa)
- `.idp-cols { display: grid; grid-template-columns: 1.5fr 1fr; gap: 22px; align-items: start; }`
- `@media (max-width: 820px) { .idp-cols { grid-template-columns: 1fr; } }` (v7:n breakpoint; pinoutuu)
- `.idp-col-r .jsp-radar { width: 100%; max-width: 300px; margin: 0 auto 12px; }` (tutka oikeaan sarakkeeseen)

**3) Modaalin kokoonpano — `_jspTab0`** (rivi ~10852): kääri Aloitus-sisältö 2-sarakkeeseen:
```
<div id="_jspTab0"><div class="idp-cols">
  <div class="idp-col-l"><div id="_jspIdpNarratiivi">{fIdp}</div></div>
  <div class="idp-col-r">{tutka} {suunnitelmanKaari}</div>
</div></div>
```
- `{tutka}` = `'<div class="jsp-radar">' + window._tmRadar5D(radarDims, _radarOpts) + '</div>'` + sama suunta-legenda/band
  kuin railissa (reuse; `_tmRadar5D` on puhdas → turvallista renderöidä myös tähän). Otsikko "5D-profiili · tutka" (v7).
- `{suunnitelmanKaari}` = `_vpAloitusKaariHTML(p, ika)`.
- **Async-koukut:** `_jspIdpNarratiivi`-id säilyy (re-render, rivit 4962/5555/7555). Jos tutka/kaari käyttää id-pohjaista
  hydrataatiota, varmista uniikit id:t (ei törmää railin tutkaan — Aloituksessa rail on piilossa, mutta id-uniikkius silti).

**4) `_vpIdpNarratiiviHTML` — poista inline-kaari:** rivi ~5795 `h += _vpAloitusKaariHTML(p, ika);` **pois** (kaari
renderöidään nyt oikeassa sarakkeessa). Muuten kaari tulisi kahdesti. Muu narratiivi ennallaan.

**5) Rehellinen tyhjä (v7 §5 "tyhjän tilan design"):**
- Tyhjä tutka (<3 ulottuvuutta, §30 OVR-portti) → **dimensiolista + mittaa-CTA**, EI valheellista nollamuotoa (v7 `.radar-c.st`).
  Reuse olemassa oleva tyhjä-tutka-käsittely jos on; muuten dimensiolista.
- Tyhjä kaari (ei kausitavoitetta / ei suljettuja jaksoja) → "— ei asetettu" / "ei suljettuja jaksoja vielä" (v7).

---

## INVARIANTIT

- **DESIGN-LINJA:** täsmää v7:ää (sarakesuhteet 1.5/1 · tutka ylhäällä · kaari alla · rail pois Aloituksesta).
- **Vain Aloitus muuttuu.** Mittaus/Arviointi/Kehitys/Viikko + niiden jaettu rail (nimi · tutka · **Kypsyys/PHV** · signaalit ·
  D1/D2) pysyvät koskemattomina. **HUOM:** Kypsyys/PHV EI ole v7-Aloituksessa → se ei näy Aloituksessa (säilyy muilla
  välilehdillä, mm. Mittaus). Tämä on tietoinen (kartan mukainen).
- **Ei datahukkaa:** kaikki nykyiset Aloitus-lohkot säilyvät (vain kaari siirtyy sarakkeeseen). Tutka renderöityy Aloituksessa
  (oikea sarake) + muilla railissa — ei kadonnut.
- **Brändilukko §5:** Cormorant ei-bold · teal ainoa aksentti · `var(--border)`-hiusviivat (EI `--border2`) · terävät kulmat ·
  semanttinen emoji · **molemmat teemat**. Mobiili pinoutuu (§6).
- **§26/§28/§7.22** ennallaan (ei datamuutosta). Ei `?v`-bumppia (ei lib-muutosta).

## DoD

- Aloitus renderöityy 2-sarakkeisena (narratiivi 1.5fr | tutka+kaari 1fr), rail piilossa **vain** Aloituksessa.
- Muut 4 välilehteä + rail ennallaan (vaihto Aloitus↔muu palauttaa railin oikein, `aloitus-mode`-luokka togglaa).
- Suunnitelman kaari tasan **kerran** (oikeassa sarakkeessa, ei enää narratiivissa). Tutka näkyy Aloituksessa.
- Molemmat teemat · mobiili pinoutuu · Vitest + eslint vihreä · **LIVE ennen valmista** (Topias: 2-sarake, tutka+kaari
  oikealla, rail pois; vaihto Mittaukseen → rail palaa).

---

## R4-VALMISTELU — per-osa-merkintä (erillinen PR myöhemmin, ei tässä)

> Tero: "asettelu + valmistele täytetty tila". Asettelu nyt (yllä); tämä osio speksaa mitä R4 Kehitys tuo, jotta layout on valmis.

Kartan **täytetty tila** näyttää konseptin osilla a–e: **näkyvyys-pallot** (●○○ / ●●○ / ●●●) + label (ei näy / ohjatusti /
itsenäisesti) + **"Konsepti %"**. Nyt live = rehellinen tyhjä ("arvioi Kehityksessä"). Täyttö tulee R4:stä:

- **Uusi pikakenttä `jaksofokus.osat_tila`** (§26): `{ a:1|2|3, b:…, … }` per konseptin osa (TM_TT_ASTEIKKO 1–3 =
  ei näy / ohjatusti / itsenäisesti). Kaapataan **R4 Kehitys -editorissa** (VP/valmentaja merkitsee: osaa(3) / kehitettävää(2) /
  jatketaan opettelua(1) per osa) — §4/§37: ehdotus/merkintä, ei pakotettu.
- **Konsepti-ydin (Aloitus) lukee sen:** kun `osat_tila[koodi]` on → pallot syttyvät (1→●○○ · 2→●●○ · 3→●●●, teal vain
  täydelle) + label vaihtuu "arvioi Kehityksessä" → tila. Puuttuu → nykyinen rehellinen tyhjä.
- **Konsepti % = R4-johdannainen:** osuus osista tilassa "itsenäisesti"(3) (tai painotettu ka). Näytä vain kun `osat_tila`
  on olemassa; muuten pois (ei FLEI/Valmius-lainaa).
- **nextIdx (seuraava-askel-osa)** muuttuu datavetoiseksi: matalin `osat_tila`-arvo (nyt oletus osa b). TEE TÄSTÄ seuraa sitä.

Tämä ei ole R1.4:n PR:ssä — se on R4 Kehitys -briiffin sisältö. R1.4:n layout jättää konsepti-osariville tilan pallo-skaffoldille
(kartan mukaan), jotta R4:n täyttö slottaa suoraan.
