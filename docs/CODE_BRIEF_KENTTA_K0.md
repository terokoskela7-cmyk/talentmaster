# CODE BRIEF · Kenttä K0 · `lib/tm_kentta.js` + tokenit

**Tila:** odottaa päätöksiä D10 (tokenit) ja D11 (fontti), ks. `docs/design/idp-v2/07_avoimet_paatokset.html`. Älä aloita ennen kuin Tero on vastannut molempiin.

**Mockup, jota noudatetaan:** `docs/design/idp-v2/09_pelaaja_kentta.html`, osio *0 · Idea* (kerrokset) ja kaikki `data-pitch`-variantit. Suunnitelma ja vaiheet: `docs/design/idp-v2/10_pelaaja_v7_kentta_suunnitelma.html`, osiot 4 ja 5.

**Ei UI-muutosta.** K0 tuo kirjaston, tokenit ja testit. Pelaaja_v7:n, Vanhempi_v2:n, Master_v16:n ja VP_v25:n renderöinti ei muutu tässä PR:ssä.

## 1 · Tiedostot

| Tiedosto | Muutos |
|---|---|
| `lib/tm_kentta.js` | uusi |
| `tests/kentta_k0.test.js` | uusi |
| `docs/design/idp-v2/mockups/kentta_demo.html` | uusi demosivu, joka renderöi kaikki variantit kirjastolla (ei mockupin omalla JS:llä) |
| `TalentMaster_Pelaaja_v7.html`, `TalentMaster_Vanhempi_v2.html` | vain `:root`-tokenit lisätään (D10) ja `<script src="lib/tm_kentta.js?v=1">`; ei muuta |
| `CLAUDE.md` §5 | D10-tokenit ja D11-fonttipoikkeus kirjataan |

## 2 · Kirjaston sopimus

Mallina `lib/tm_piirros.js`: inline-SVG merkkijonona, **ei hex-värejä eikä rgb():tä** (brändiportti-testi), ei Firebasea, i18n `opts.t`:n kautta, toimii offline.

```js
// Palauttaa { svg: '<svg …>', html: '<div class="kt-layer">…</div>' } tai yhdistetyn merkkijonon opts.wrap=true.
tmKentta(spec, opts)

spec = {
  koko: 'puoli' | 'koko',           // puoli = hyökkäyspää, viewBox 0 0 100 84; koko = 0 0 100 140
  ase: { alue:{x,y,w,h}, nimi, sub, tila:'ok'|'puuttuu' } | null,
  reitti: { loppu:'maali'|'kaveri'|'kausitavoite', col:'teal'|'blue', faint:bool } | null,
  viikot: { n, tehty, valmis:bool } | null,     // merkit reitillä: tehty / nyt / tyhjä
  osat: [ { k:'a', nimi, x, y, tila:'itsenaisesti'|'ohjatusti'|'ei_viela'|'nyt' } ],
  historia: [ { loppu } ],                       // haaleat jäljet
  lempipaikka: { x, y } | null,                  // U8–12, pallo
  vaihtoehdot: [ { k:'A', loppu:'maali' }, { k:'B', loppu:'kaveri' } ] | null
}
opts = { t: fn, wrap: bool, luokka: string, ariaLabel: string }
```

Säännöt:
- Koordinaatit 0–100 leveys, 0–140 pituus, hyökkäyssuunta ylös. Alue annetaan 0–100-asteikolla; `koko:'puoli'` leikkaa vain näkymän, ei muuta koordinaatteja.
- Reitin pisteet lasketaan `ase.alue`-keskipisteestä `loppu`-pisteeseen (maali (48,8), kaveri (74,24), kausitavoite (50,30)) kolmella välipisteellä. Ei vapaata piirtoa.
- Viikkomerkit tasavälein reitillä. Tila: `i < tehty` → täysi teal, `i === tehty && !valmis` → amber "nyt", muuten tyhjä teal-reunus. `valmis` → kaikki täynnä.
- Ilman `ase.alue`-arvoa alue on oletus `{x:30,y:48,w:40,h:30}` ja `tila:'puuttuu'` (katkoviiva, ei täyttöä).
- Kaikki värit luokilla `.kt-line .kt-line2 .kt-ase .kt-ase-puuttuu .kt-reitti .kt-reitti-b .kt-vk .kt-vk-tehty .kt-vk-nyt .kt-osa .kt-osa-nyt .kt-historia .kt-pallo`, jotka osoittavat tokeneihin `--chalk --chalk2 --teal --teal-dim --amber --amber-dim --blue --ink --bg`.
- Tekstit (`sinun aseesi`, `nyt`, `ase puuttuu` jne.) menevät `opts.t`:n läpi; kirjasto ei käännä itse.

## 3 · Tokenit (D10, molemmat teemat)

Lisätään Pelaaja_v7:n ja Vanhempi_v2:n `:root`-lohkoon ja vaalean teeman lohkoon. Arvot: 09:n `<style>`-lohko (`--chalk`, `--chalk2`, `--amber`, `--amber-dim`, `--blue`). Ei kosketa vanhoja tokeneita. Fontti (D11): `--font-k` = Archivo (A) tai `var(--font-d)` (B); K0 määrittelee tokenin, K1 käyttää.

## 4 · Testit (`tests/kentta_k0.test.js`)

1. Brändiportti: `lib/tm_kentta.js` ei sisällä `#[0-9a-f]{3,6}` eikä `rgb(`.
2. Kerrokset: spec ilman asetta → ei `.kt-ase`-elementtiä, mutta `.kt-ase-puuttuu` on; spec ilman reittiä → ei `.kt-reitti`.
3. Viikkomerkit: `{n:6, tehty:1}` → 1 × `.kt-vk-tehty`, 1 × `.kt-vk-nyt`, 4 × `.kt-vk`; `{n:6, tehty:6, valmis:true}` → 6 × tehty, 0 × nyt.
4. Reitti päättyy: `loppu:'maali'` → viimeinen piste (48,8); `'kaveri'` → (74,24).
5. `koko:'puoli'` → viewBox `0 0 100 84`; `'koko'` → `0 0 100 140`.
6. i18n: `opts.t` kutsutaan jokaiselle näkyvälle tekstille; ilman `t`:tä palautuu avain sellaisenaan.
7. §7.22-portti: tuloste ei sisällä merkkijonoja `/5`, `OVR`, `elite`, `sharp`, `heikko`, `heikkous`, `rajoite`, `kriittinen`.
8. Demosivu renderöi kaikki 09:n `data-pitch`-variantit ilman JS-virheitä (Playwright, `pageerror` tyhjä).

## 5 · PR:n raportointi (CLAUDE.md §5)

- Mockup ja näkymä: `09_pelaaja_kentta.html`, osio 0 ja osion 1 kenttävariantit.
- Kuvakaappaus rinnakkain: `docs/design/vertailut/k0_kentta_demo.png` (demosivu vs. 09:n osio 1, 390 px, tumma ja vaalea). Fontit paikallisesti `@fontsource`-paketeista, koska Google Fonts ei lataudu headless-ajossa.
- Haara `feat/kentta-k0` origin/mainin päältä, PR Terolle, ei pushia mainiin.

## 6 · Mitä K0 ei tee

Ei muuta Tänään- tai Minä-sivua (K1, K2), ei lisää Firestore-kenttiä (K3), ei kosketa rulesiin, ei poista FIFA-korttia (D12). Jos jokin 09:n variantti ei ole piirrettävissä sopimuksella, kirjaa se PR:ään kysymyksenä, älä laajenna sopimusta itse.
