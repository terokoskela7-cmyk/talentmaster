# Kehityskaari K2 — Katselmus (jakson sulku): kohdennetun ominaisuuden kaari + jaksosidos-evidenssi · Code-brief

> **Miksi:** Katselmus (jakson sulku, EPPP) on **"toimiko fokus?" -keskustelu, ei arvosana (§37)**. Juuri tähän Kehityskaari kuuluu:
> näytä **jaksofokuksen kohdentaman ominaisuuden kaari + jaksosidos-delta** (ennen/jälkeen fokusikkunan) → keskustelu on dataperusteinen
> ja **silmukka sulkeutuu** (fokus → viikot → katselmus näyttää kaaren taipuvan tai ei → jatka/vaihda → arkistoituu jaksohistoriaan).
> **Varmistettu koodista:** sulku-modaali on `_vpSulku*` (VP ~7436–7632, "Sulje jakso · <konsepti>", `_vpSulkuTallenna`). Moottorissa on **valmis**
> `tmKaariJaksoSidos(jakso, avain, sarja)` → `{ ennen, jalkeen, delta, parani }`. **Vain kytkentä.** VP-only. Ei `?v`.

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN.** Reuse `tmKaariJaksoSidos` + `tmKehityskaari` (rooli='vp'). **Älä koske:** sulku-logiikkaan (`_vpSulkuTallenna`, `tmJaksokooste`) ·
  kalibraatioon · jaksohistorian kirjoitukseen. **Vain lisää evidenssilohko sulku-modaaliin.**
- **§37:** katselmus = keskustelu; kaari on **peruste, ei tuomio**. **§28:** pre-PHV "ennallaan" EI ole epäonnistuminen (näytä neutraalina). **§7.22:** VP-näkymä.

## MUUTOS 1 — domeeni → mitattava sarja -mappaus (rehellinen kun ei ole)
Sulkeutuvan jaksofokuksen `domeeni` → näytettävä kaari:
- **fyysinen** → relevantti fyysinen sarja (jakson konseptin mukainen; fallback FLEI `flei_historia`).
- **teknis_taktinen** → TKI (`tki_historia`, kaksi deltaa).
- **psyykkinen / sosiaalinen** → **ei mitattavaa kaarta** → näytä rehellinen tyhjä: "Tälle domeenille ei numeraalista kaarta — arvio keskustelussa + havainnot." **Ei keksittyä viivaa.**

## MUUTOS 2 — evidenssilohko sulku-modaaliin (`_vpSulku*`-render)
Otsikon "Sulje jakso · <konsepti>" alle, ennen tulos-valintaa:
```
const sarja = tmKaariSarja(<historia>, <avain>);
if (tmKaariKattavuusOk(sarja)) {
  const sidos = tmKaariJaksoSidos(jakso, <avain>, sarja);   // {ennen, jalkeen, delta, parani}
  // renderöi: pieni tmKehityskaari-kortti (kohdennettu ominaisuus) + "Tämän jakson aikana: <ennen> → <jalkeen> (<±delta>)"
} else { /* "Kaari tarvitsee ≥2 mittausta jaksolta — arvio keskustelussa." */ }
```
- **`jakso`** = sulkeutuvan jaksofokuksen aikaikkuna (alkoi/paattyi) — sama minkä `tmKaariJaksot` tuottaa `jaksofokus`ista.
- Delta **neutraali väri** kun `parani=false` mutta pre-PHV (§28) → ei punaista. `parani=true` → teal. Ei amber-varoitusta katselmuksessa.
- **Reuse `tmKehityskaari`** kompaktina (sama komponentti kuin Mittaus, pienempi säiliö).

## MUUTOS 3 — kytkös tulokseen (ei pakota)
Kaari on **evidenssi tulos-valinnan (`_VP_KATSELMUS_TULOS`) vieressä** — EI automaattista arvosanaa. Valmentaja päättää jatka/vaihda/saavutettu
katsoen kaarta. `_vpSulkuTallenna` ennallaan (ei uutta kirjoitusta kaaresta).

## INVARIANTIT + DoD
- **Silmukka näkyy:** sulku-modaalissa kohdennetun ominaisuuden kaari + jaksosidos-delta. Reuse `tmKaariJaksoSidos` + `tmKehityskaari`.
- **Rehellinen:** psyykkinen/sosiaalinen → ei kaarta (teksti) · <2 pistettä → "arvio keskustelussa" · pre-PHV ennallaan neutraali (§28).
- **§37:** ei arvosanaa kaaresta; keskustelu säilyy. **Brändi:** 0 pinkkiä, teal/neutraali, molemmat teemat.
- **LIVE:** sulje teknis_taktinen-jakso pelaajalla jolla ≥2 TKI-pistettä → kaari + "TKI ennen→jälkeen" näkyy · sulje psyykkinen-jakso → rehellinen tyhjä · sulku tallentuu ennallaan. Vitest + eslint vihreä. Ei `?v`.

## EI TÄSSÄ
- Jaksohistorian (Player Journey) nimikorjaus → K3. ADAR → K5.
