# CODE — Kehityskortti: kääntökorjaus (P0) + ikäadaptoitu tasomalli

**Tyyppi:** Bugikorjaus (CSS, P0) + UI/logiikka-adaptio (kuluttaja, Pelaaja_v7). **Ei Rules-/skeemamuutosta.**
**Kohde:** `TalentMaster_Pelaaja_v7.html` → `.fc-face`/`fcRise` (A) · `_fcKorttiData` + kortin etu/kääntö-render (B).
**Tausta:** #236 (MINÄ-kevennys) nosti kehityskortin heron pääteoksi. Live-verifioinnissa (Topias, U13) paljastui kaksi asiaa: kortin **etupuoli ei näy koskaan** (A, estävä) ja **ikäadaptio ei toteudu** aggregaatti-OVR:ssa (B).
**Voi jakaa kahteen PR:ään:** A = pieni kiireellinen CSS-fix, B = suurempi design+logiikka. A ensin.

## OSA A — Kääntökorjaus (P0, estävä)

### Bugi (verifioitu livenä, Topias)
Heron napautus avaa overlayn, mutta se **jää selitys-kääntöpuolelle** ("Miksi 39?"); loistava FUT-**etupuoli ei tule koskaan näkyviin**. Käännä-nappi vaihtaa tekstiä mutta etu ei paljastu. 0 konsolivirhettä (hiljainen CSS-bugi).

### Juurisyy (paikannettu tarkalleen)
```css
.fc-face{ … animation:fcRise 1s … both }          /* rivi ~177 */
@keyframes fcRise{ from{opacity:0…} to{opacity:1…} } /* rivi ~243 */
```
`animation-fill-mode: both` jättää keyframen loppuarvon (`opacity:1`) voimaan, ja **animoitu arvo voittaa normaalit deklaraatiot** kaskadissa. Se ohittaa sekä `.fc-back{opacity:0}` (lepotila) että `.fc-flipped .fc-front{opacity:0}` (kääntö). → molemmat puolet jäävät `opacity:1`, kääntöpuoli (DOM:ssa jälkimmäinen, `position:absolute; inset:0`) peittää etupuolen pysyvästi. Vain `.fc-flipped .fc-back{opacity:1!important}` säilyy → kääntö ei ikinä paljasta etua. Etupuoli renderöityy oikein DOM:iin, se on vain peiton alla. **CSS on pre-existing (ei #236:n diffissä); #236 vain teki kortin tavoitettavaksi.**

### Korjaus (valitse siistein — ydin: rise-animaatio ei saa pinnata opacitya puoliin)
1. **Suositus:** irrota rise-animaatio `.fc-face`:sta → aja se **wrapperissa** (`.fc-wrap`), niin puolet hallitsevat opacityn itse (lepo/kääntö-säännöt toimivat). `.fc-wrap{animation:fcRise 1s … both}`, `.fc-face{/* ei animaatiota */}`.
2. **TAI** poista opacity `fcRise`-keyframeista (animoi vain `transform`), ja tee etu-fade erikseen ei-`both`-tavalla. Näin `.fc-back{opacity:0}` ja `.fc-flipped .fc-front{opacity:0}` jäävät voimaan.
3. **TAI** vähintään: varmista determinismi `!important`-symmetrialla (lepo: `.fc-front{opacity:1}`/`.fc-back{opacity:0}` !important; kääntö: käänteinen). Vähiten siisti — mieluummin 1 tai 2.

### DoD (A)
- Overlay avautuu **etupuoli näkyvissä** (FUT-kortti: OVR/tier/5D/traits), ei "Miksi X?".
- Käännä → näyttää selityksen; käännä takaisin → **etu taas näkyy**. Molemmat suunnat toimivat toistuvasti.
- Rise-sisääntuloanimaatio säilyy (kortti nousee auetessa). 790 vitest vihreä, 0 konsolivirhettä.
- **Verifioi live (Topias):** hero → etupuoli näkyy heti; kääntö molempiin suuntiin; sulje/avaa uudelleen → etu näkyy joka kerta.

---

## OSA B — Ikäadaptoitu tasomalli (OVR-kompromissi)

### Periaate: erota kaksi asiaa
- **Aggregaatti-OVR (yksi kokonaisluku)** = identiteettileima, vertailukelpoisin/pelkistävin elementti → **ikäportitetaan**.
- **Testikohtainen taso + matka seuraavaan** = pelaajan oma mestaruuspalaute (self-referenced) → **näytetään kaikille** ikäadaptoidusti. Tämä on se, mitä pelaaja tarvitsee kehittyäkseen, EIKÄ se ole §7.22-vertailua (oma kynnys, ei muihin vertaaminen).

### Ikävyöhykkeet (lähde: `_laskeStage` / ikä `_fcKorttiData`:ssa)
| Vyöhyke | Aggregaatti-OVR (hero-otsikko) | Testikohtainen taso + seuraava kynnys |
|---|---|---|
| **U16–19 (Showcase)** | **OVR-luku näkyy** (kuten nyt) | Näkyy: arvo + taso + "seuraavaan +X" |
| **U13–15 (Rakentaja)** | **EI kovaa OVR-lukua** → otsikko = tier + "kortti kehittyy" (+ kehityskaari-fiilis, esim. rengas ilman lukua) | **Näkyy** (ydin!): "Nyt: taso X/5 · seuraavaan: [konkreettinen kynnys]", kannustava sävy |
| **U8–12 (Leikkijä)** | Merkit/tähdet, "kortti rakentuu" | "Kokeiltu ✓ · seuraavaksi kokeile…", ei lukuja |

**Miksi juuri näin (kompromissin perustelu):**
- Yksittäinen OVR-luku ei kerro nuorelle *mitä harjoitella* — se vain pelkistää ja houkuttaa vertailuun ("mun kortti 39, sun 52") = §7.22:n ydinhaitta ja huono nuoremmille. Siksi aggregaatti ikäportitetaan.
- **Testikohtainen taso + seuraava kynnys** on juuri se "millä tasolla olen ja paljonko seuraavaan" -tieto (kriteeripohjainen, oma matka) → annetaan KAIKILLE ikäadaptoidusti. Tämä palvelee tavoitetta paremmin kuin raaka OVR.
- Näin Topias (U13) näkee heron otsikkona "Sharp · kortti kehittyy" (ei "39"), mutta 5D + kääntö kertoo per-testi tason ja seuraavan kynnyksen → hän tietää tasonsa ja kehitystarpeensa, ikä huomioiden.

### Toteutus
- `_fcKorttiData(p)`: lisää **`ikavyohyke`** (showcase/rakentaja/leikkija `_laskeStage`:sta) ja per-dimensio **`{ taso, seuraavaKynnys, matka }`**. Käytä olemassa olevia: fyysinen `hhLaskeTaso` (+ kynnystaulukot), tekniikka `_kkMerkkiTaso`/`tki`. Ei uutta datamallia — johdetaan pikakentistä (§26).
- **Hero (`rMinaHero`) + etupuoli:** aggregaatti-OVR-lohko renderöityy vain `ikavyohyke==='showcase'`. Muille otsikko = tier + "kortti kehittyy" (rakentaja) / "kortti rakentuu" (leikkija). 5D-statit: showcase = arvo; rakentaja = taso X/5; leikkija = merkki/🌱.
- **Kääntö ("Miksi X?" / "Kortti rakentuu"):** tähän per-testi-tikapuut: "Syöttö — taso 3/5 · seuraavaan: alle 41 s (nyt 43 s)". Kannustava sävy nuorille. **Vain kriteeripohjainen** ("seuraavaan tarvitset X") — EI "parempi/huonompi kuin Y % ikäisistä" (percentiili/vertailu = vain valmentaja, §7.22).

### §7.22-vartijat (ehdottomat)
- Pelaajalle: **oma taso + oma seuraava kynnys** (self/kriteeripohjainen) OK. **Percentiilit, ikäluokkavertailu, sijoitus, talent-/X-Factor-signaalit = vain valmentaja/VP.**
- Aggregaatti-OVR-luku vain U16–19. Nuoremmille ei kovaa kokonaislukua identiteettinä.
- Sävy ikävyöhykkeen mukaan (design-system "Showcase/Rakentaja/Leikkijä"). Ei leimoja ("heikko/vahva").

### DoD (B)
- Topias (U13) hero: otsikko **tier + "kortti kehittyy"** (ei "39"); 5D tasoina; kääntö näyttää per-testi tason + seuraavan kynnyksen kannustavasti.
- U16–19-testipelaaja: OVR-luku näkyy edelleen + per-testi taso/seuraava kynnys.
- Yksikään ikävyöhyke ei näytä percentiiliä/vertailua pelaajalle. 790 vitest vihreä, 0 konsolivirhettä.
- **Verifioi live:** Topias (U13) = ei kovaa OVR-lukua, mutta testitaso + "seuraavaan" näkyy; (jos saatavilla) U16+ demo/testi = OVR näkyy.

## Reunaehdot
- Ei Rules-/skeemamuutosta; kaikki johdettua pikakentistä. Demo-polku ennallaan. Topias = testi-OK.
- **A on kiireellinen ja itsenäinen** (pieni CSS) — sen voi mergata ennen B:tä. B vaatii Teron OK:n mallille (portitus ikä, ei OVR-lukua U13–15) — malli on tässä ehdotus, säädä tarvittaessa.
