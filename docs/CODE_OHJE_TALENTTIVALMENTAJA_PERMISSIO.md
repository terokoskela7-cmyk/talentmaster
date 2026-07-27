# CODE_OHJE — Vaihe A: talenttivalmentaja koko seuran havainto-oikeus (ristiinarvion avaus)

**Tyyppi:** firestore.rules -täsmennys (#269 jatko) · **Kohde:** `tm_admin/firestore.rules`
(deploy: PR → N4-CI) · **Base:** `main`. **Pieni PR.**

## Tausta

#269 rajasi valmentajan kirjoitukset omaan joukkueeseen (`onOmanJoukkueenValmentaja`, johto ohittaa).
**Sivuvaikutus:** `onValmentajaRooli` sisältää **talenttivalmentajan**, mutta vain `onJohtoRooli` (vp/UTJ)
ohittaa joukkuelukon. Talenttivalmentajalla ei tyypillisesti ole joukkuetta (skouttaa **koko seuran**
laajuisesti) → `joukkueet` = [] → fail-closed → **estetty kaikkialla**. Tämä estää juuri sen ristiinarvion
(useampi silmä samaan pelaajaan → talenttinosto) jonka haluamme mahdollistaa. Benchmark tukee: huippunuorten
arvioinnin standardi on ≥2 riippumatonta arvioijaa (Frontiers 2018).

## Työ

Anna **talenttivalmentajalle koko seuran havainto-/arviointioikeus** (kuten VP:llä), mutta **VAIN** näissä
pelaajaan sidotuissa kirjoituksissa — EI muita johto-valtuuksia (ei IDP-vahvistusta, ei kalenteri-CRUD:ia).

`onOmanJoukkueenValmentaja`-sisäiseen ohitukseen lisätään talenttivalmentaja:
```
function onOmanJoukkueenValmentaja(seuraId, pelaajaId) {
  return onOmanSeuranValmentaja(seuraId)
      && ( onJohtoRooli()                                              // VP/UTJ
        || request.auth.token.rooli == 'talenttivalmentaja'           // talenttiskoutti: koko seura (ristiinarvio)
        || pelaajaData(seuraId, pelaajaId).get('joukkueet', []).hasAny(valmentajanJoukkueet(seuraId)) );
}
```
- **Seura-lukko säilyy:** `onOmanSeuranValmentaja(seuraId)` vaatii yhä saman `seuraId`:n → toisen seuran
  talenttivalmentaja estetty ennallaan.
- **Vain havainto-polut:** koska tätä funktiota käytetään vain havainnot/arviointi/palautteet + pelaajadok
  ADAR-updateissa, ohitus on oikein skopattu. Älä lisää talenttivalmentajaa `onJohtoRooli`:on.

## Reunaehdot

- **Ei laajenna muita oikeuksia** — talenttivalmentaja saa vain saman havainto-/arviointikirjoituksen kuin
  oman joukkueen valmentaja, mutta koko seuraan. Luku, IDP-vahvistus, kalenteri ym. ennallaan.
- **VP toimii jo** (johto) — ei muutosta VP:hen.
- **Deploy:** PR → N4-CI.

## Definition of Done

- **L1:** `onOmanJoukkueenValmentaja` ohittaa joukkuelukon talenttivalmentajalle; muu ennallaan.
- **L2 (emulaattori):**
  - talenttivalmentaja → OMAN seuran MINKÄ TAHANSA joukkueen pelaaja, ADAR/arviointi-write → **sallittu**.
  - talenttivalmentaja → TOISEN seuran pelaaja → **estetty** (seura-lukko).
  - tavallinen valmentaja → muun joukkueen pelaaja → **estetty** (ennallaan, #269-regressiotesti).
  - talenttivalmentaja ei saa uusia johto-oikeuksia (esim. jos on johto-only-polkuja, ne pysyvät estettyinä).
  - Aiemmat #269-testit vihreinä (ei regressiota).
- Pieni PR, rules-testit vihreät.

## Jatkoketju (tämän jälkeen, erilliset PR:t — design-map v2 referenssinä)

- **Vaihe B — Ristiinarvio + riippumattomuus-suojaus:** VP/talenttivalmentaja lisää oman pelihavaintonsa;
  arvioija EI näe muiden pisteitä ennen omaa tallennusta (anti-anchoring); kortti näyttää N arvioijaa +
  yhtenevyyden; peruste talenttinostolle.
- **Vaihe C — VP-seurantanäkymä:** IDP-aktivoinnit-feed + valmentaja-aktiivisuus + hiljaisuus-hälytys +
  **VP-kuittaus** (audit-jälki, ei hard-delete).
