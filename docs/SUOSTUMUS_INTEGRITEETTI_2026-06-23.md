# Suostumus-integriteetti — löydös + korjaus (2026-06-23)

> Pilottilöydös (SJK, testipelaaja Kerkko Keskikenttä) + systeeminen korjaus. Liittyy CLAUDE.md §33
> (onboarding-integriteetti) · §13 (suostumus-CF:t) · §18 (kaksivaiheinen massakutsu) · §12 (Rules).

---

## Oire
Vanhempi (hhl.kysymykset@outlook.com) sai vanhempi-apissa virheen **"Kehu ei lähtenyt"**.

## Juurisyy 1 — kehu (ei bugi, identiteetti)
Kehun kirjoitus `kehut`-alikokoelmaan vaatii Rules `onLapsenHuoltaja` = **kirjautunut token-email ==
pelaajan `huoltajaEmail`** (pienaakkosin). Vanhempi oli kirjautunut väärällä kirjoitusasulla
(`hll…` vs rekisteröity `hhl…`) → permission-denied → catch → harhaanjohtava toast *"tarkista yhteys"*.
**Ratkaisu:** kirjautuminen oikealla `hhl…`-osoitteella → kehu toimii. Rules/polku/`luotu`(A5) olivat kunnossa.
**Avoin parannus (ei tehty):** erottele `permission-denied` verkkovirheestä → selkeämpi viesti
("varmista että olet kirjautunut samalla sähköpostilla jolla sait kutsun").

## Juurisyy 2 — suostumusTila nollautui (AITO BUGI, korjattu)
Kerkon suostumus oli **aidosti annettu 11.6.2026** (kaikki suostumukset ✓, kutsu 11.6 "Hyväksytty"),
mutta pelaajadokumentin `suostumusTila` oli **`odottaa`**. Syy: **23.6 lähetetty uusi kutsu nollasi
`suostumusTila:'annettu'` → `'odottaa'`** (massakutsu/single-invite/re-import kirjoitti 'odottaa'
tarkistamatta nykytilaa). Itse suostumukset säilyivät, mutta denormalisoitu status oli väärä →
suostumussuppilo/raportit laskivat pelaajan väärin.

### Korjaukset
1. **Data:** Kerkon `suostumusTila` korjattu SA:lla `odottaa → annettu` (vastaamaan 11.6 annettua suostumusta).
2. **Systeeminen (invariantti: EI KOSKAAN `annettu → odottaa`)** — 3 client-kirjoittajaa vartioitu:
   - `TalentMaster_Seura.html` massakutsu (~5111): jo `annettu` → ei `.update('odottaa')`, `ohitettuSuostumus++`,
     yhteenveto *"N oli jo antanut suostumuksen — status säilytetty"*. Esikatselu suodattaa annetut pois
     lähetyslistalta (ei turhia sähköposteja).
   - `TalentMaster_Seura.html` single-invite (~3175): `_joAnnettu` → `suostumusTila:'odottaa'` vain jos ei jo annettu.
   - `TalentMaster_Admin.html` re-import (~2805): jo annettu → `delete _paivitys.suostumusTila` + `suostumusSailytetty++`.
   - **CF (`functions/index.js`):** ei muutosta — varmistettu ettei mikään CF kirjoita `'odottaa'`-tilaa
     pelaajadokkiin (vain query rivi 376 + `vahvistaSuostumus` rivi 978 `'annettu'`-upgrade).

### Invariantti (pysyvä)
**Kutsun lähetys tai Excel-re-import EI saa koskaan alentaa pelaajan `suostumusTila:'annettu'`-tilaa
takaisin `'odottaa'`-tilaan.** Jokainen tämän kentän kirjoittaja lukee nykytilan ensin; jo annettu säilytetään.
Tunnistus: `suostumusTila === 'annettu' || !!suostumus?.annettu` (sekä uusi pikakenttä että vanha map).

### Avoin (valinnainen)
- Palvelinpuolinen audit-jälki (`suostumus_sailytetty_re_invite`) vaatisi CF-reitityksen + deployn — ei tehty
  (downgrade oli puhtaasti client-puolella; operaattorinäkyvyys hoidettu client-yhteenvedon laskureilla).
- Kehu-virheviestin tarkennus (permission-denied vs verkko) — ei tehty.
