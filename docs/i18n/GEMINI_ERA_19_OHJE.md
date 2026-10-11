# Ohje Geminille — sv-käännöserä 19

Tiedosto: `docs/i18n/sv_kaannoserae_19_gemini.json` (475 riviä, 12 osiota). Palautus: `docs/i18n/sv_kaannoserae_19_palautus.json`.
Erä kokoaa kaikki avoimet `sv`-kentät erien 2, 4–18 ja s11 (sama osio + avain = yksi rivi). Rivit, joita ei enää ole koodissa, on pudotettu.

## Valmis kehote (kopioi Geminille tiedoston kanssa)

> Liitteenä on JSON-tiedosto `sv_kaannoserae_19_gemini.json`. Täytä JOKAISEEN tyhjään `"sv"`-kenttään ruotsinkielinen (standardiruotsi, suomenruotsalaisen seuran käyttöön) käännös `"fi"`-tekstistä. `"en"` on vain apuna.
> Säännöt:
> 1. Älä muuta avaimia, osioita, `fi`- tai `en`-arvoja äläkä rakennetta. Älä lisää tai poista rivejä. Palauta KOKO JSON samassa järjestyksessä, vain `sv`-arvot täytettyinä.
> 2. Säilytä muuttujat täsmälleen: `{n}`, `{nimi}`, `{pvm}`, `{aika}`, `{vk}`, `{a}`, `{b}`, `{pros}` jne. Sanajärjestystä saa muuttaa, muuttujia ei saa lisätä, poistaa eikä kääntää. Poikkeus `{gen}`: jos `fi`-tekstissä on `{gen}`, muotoile `sv` ilman sitä.
> 3. Säilytä HTML-tagit, entiteetit (`&amp;`), emojit, nuolet (→ › ▾), symbolit, lyhenteet (PHV, ADAR, H-H, IDP, 5D, VP), luvut, §-viittaukset ja välimerkit sellaisinaan.
> 4. Säilytä alun ja lopun välilyönnit täsmälleen kuten `fi`-tekstissä (osa riveistä on lauseen paloja, jotka koodi liittää toisiin).
> 5. Käytä tiedoston `termisto`-osion termejä sellaisinaan (tila `lukittu`/`paatetty` = valmis; muut ehdotuksia — jos poikkeat perustellusti, kirjoita syy `"kysymys"`-kenttään). Samat termit samoina koko tiedostossa; sama suomenkielinen teksti eri osioissa samoin.
> 6. Lukija ratkaisee sävyn: `_konteksti` kertoo osion lukijan. Henkilökunta (VP, valmentaja): asiallinen, tiivis valmennuskieli, ei syyttävää eikä käskevää sävyä. Huoltaja: selkeä ja lämmin. Pelaaja (lapsi): lyhyt, lämmin; ei XP/pisteitä, ei vertailua muihin, ei menettämisen kieltä, ei tasolukuja (§7.22). Sana "ase" on kielletty (D54).
> 7. Jos rivi on epäselvä, jätä `sv` tyhjäksi ja kirjoita kysymys samaan objektiin kenttään `"kysymys"`. Tuonti kaatuu tyhjään riviin, joten kysymys päätyy Terolle.
> 8. Palauta pelkkä JSON (ei selityksiä, ei koodiaitoja).

## Rakenne

```json
"osiot": {
  "<osio>": {
    "_konteksti": "missä teksti näkyy · lukija · kuvaus",
    "rivit": { "<avain>": { "fi": "…", "en": "…", "sv": "" } }
  }
}
```

## Osiot ja rivimäärät

| osio | rivejä |
|---|---|
| `lib.tm_nakyma_ryhmat` | 40 |
| `lib.tm_seuran_pulssi` | 53 |
| `lib.tm_tanaan_signaali` | 1 |
| `lib.tm_vp_koti` | 107 |
| `lib.tm_vp_navi` | 8 |
| `lib.tm_vp_tilanne` | 146 |
| `lib.tm_vp_tilanne_harva` | 11 |
| `master_kartta` | 20 |
| `s11` | 15 |
| `tm_lang` | 24 |
| `vp_kartta` | 48 |
| `vp_toimenpide_hannat` | 2 |

## Tuonti (Tero, kun palautus on valmis)

1. Tallenna Geminin palauttama JSON nimellä `docs/i18n/sv_kaannoserae_19_palautus.json`.
2. Kuiva-ajo: `node scripts/i18n_kooste.cjs era19-vie` — tarkistaa, että avaimet ja `fi` täsmäävät, `sv` ei ole tyhjä sekä muuttujat, HTML ja alku-/loppuvälilyönnit ovat samat kuin suomessa. Poikkeavat rivit listataan; mitään ei kirjoiteta.
3. Kun kuiva-ajo on puhdas: `node scripts/i18n_kooste.cjs era19-vie --kirjoita` (omana PR:nään).
