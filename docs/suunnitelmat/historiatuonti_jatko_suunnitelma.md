# Historiatuonti jatko: edellinen hh_historiasta + yksikkövirhevaroitus

Kaista: Tero (HTML + lib). Edeltäjä: #1116 (uusin voittaa) — merge-järjestys: #1116 ensin, tämä sen jälkeen (PR tehdään origin/mainin päälle).

## 1. `*_edellinen` historiasta
Ongelma: #1116:ssa `*_edellinen` päivittyy vain kun tuotu pvm on tiukasti uudempi kuin nykytila. Jos vanha tiedosto tuodaan uuden jälkeen tai pelaajalla on jo uudempi arvo, kehitysvauhti (edellinen) ei muodostu.
Ratkaisu (lib `tm_historiatuonti.js`, `edellisetHistoriasta`): edellinen = **toiseksi uusin mittaus historiasarjassa** (pvm-järjestys, uusin jää viimeisimmäksi — "uusin voittaa" -sääntöä ei muuteta):
- `hh_taso_edellinen(+_pvm)`: toiseksi uusin `hh_historia`-snapshot jossa `hh_taso`.
- `tki_edellinen(+_pvm)`: toiseksi uusin `tki_historia`-snapshot jossa `tki`.
- `tsi_edellinen(+_pvm)`: `sm_pallo − sm_juoksu` toiseksi uusimmasta `hh_historia`-snapshotista jossa molemmat.
- `tk_kokonaistulos_edellinen`: kokonaistulosta ei ole historiasarjassa → ennallaan (vanha tiukasti-uudempi-sääntö).
Johdettu arvo kirjoitetaan aina kun historiassa on ≥ 2 pistettä → riippumaton tuontijärjestyksestä ja idempotentti (sama historia → sama edellinen); yksi mittaus → ei edellistä (ei nolladeltaa). Vanha tilapohjainen kaappaus jää varalle tk_kokonaistulokselle.

## 2. Yksikkövirhevaroitus (esikatselu/validointi)
Lib `yksikkoVaroitukset(testit)` → suomenkieliset varoitukset (oranssi, ei estä tuontia, arvoja ei muuteta):
- CMJ (`hyppy_cj`) tai SJ (`hyppy_sj`, `sj_jump`) < 5 cm → "Epäilyttävä arvo: CMJ 0,45 — onko yksikkö cm (ei m)?"
- 10 m (`lin10m`) < 1,4 s → "Epäilyttävä arvo: 10 m 1,2 s — alle 1,4 s on epärealistinen, tarkista sekuntiyksikkö."
- tyhjä/ei-numeerinen ei varoita. Rajat: 4,9/5,0 cm; 1,39/1,40 s.
HTML kutsuu vain libiä (validointi → `varoitukset`). Excel_Tuonti ei ole sv-reitissä → ei sv-erää.

## Testit
Vanha tiedosto uuden jälkeen → edellinen muodostuu; kaksi mittausta → edellinen = vanhempi; yksi → ei edellistä; väärä järjestys tiedostossa; re-import ei muuta; rajat varoituksille. Kuiva-ajo v2-tiedostoilla (montako pelaajaa saa edellisen).
