# Juristibriiffi — TalentMaster GDPR (yksi sivu)

> Vie tämä maksuttomaan lakineuvontaan (Suomen Yrittäjien lakipuhelin jos jäsen, tai Uusyrityskeskuksen kumppanuusjuristi).
> Tavoite: vahvistus rekisterinpitäjä-mallille + suostumustekstin ja tietosuojaselosteen tarkistus + suurimmat riskit.
> Taustadokumentit: `GDPR_POLICY_PLAN.md`, `TIETOSUOJASELOSTE_LUONNOS.md`, `GDPR_TEKNIIKKA_SPEC.md`.

## 1. Yritys ja tuote
TalentMasterID Oy (Y 3616734-7, Vaasa). Jalkapallon (ja laajemmin urheilun) **talenttiarviointi- ja
kehitysseuranta-SaaS**. Seurat, valmennuspäälliköt, valmentajat, pelaajat ja perheet käyttävät. Pilotti käynnissä
~5 seurassa. Suunnitteilla myös suora kuluttajatuote (Solo, perhe maksaa itse).

## 2. Käsiteltävä data (olennaista riskille)
- **Pääosin alaikäisiä** (n. 8–17 v) pelaajia.
- Sisältää **GDPR Art. 9 erityisiä henkilötietoryhmiä**: biologisen iän / kasvun arviointi (pituus, paino, istumapituus),
  hyvinvointi-/palautumis-/unikyselyt → **terveyteen liittyvää dataa.**
- Lisäksi: mittaustulokset (fyysiset testit, lajitaidot), video/pelianalyysi, itsearviot, valmentajan arviot, profilointi.

## 3. Valittu malli (haluamme vahvistuksen)
**Malli A: TalentMasterID Oy = rekisterinpitäjä** (controller). Seura saa käyttöoikeuden omiin pelaajiinsa edustusajaksi
(ei käsittelijä, ei seuratason DPA). Perustelu: pelaajan "digitaalinen passi" seuraa pelaajaa seurasta toiseen →
skaalautuu suoraan seuroille ja kuluttajille ilman per-seura-sopimuksia. Malli-esikuva: Eerikkilän MyE.Way (Palloilu Säätiö
toimii rekisterinpitäjänä vastaavassa palvelussa).

## 4. Oikeusperuste ja suostumus
Suunniteltu oikeusperuste = **huoltajan suostumus** (Art. 6(1)(a) + alaikäisen osalta Art. 8; terveysdatan osalta Art. 9(2)(a)).
Suostumus kerätään sovelluksen sisäisellä suostumuslomakkeella (huoltaja vahvistaa sähköpostilinkistä).

## 5. Tekninen valmius (toteutettu)
- Kaikki data **EU-alueella** (Firestore eur3, Cloud Functions europe-west1, virhemonitorointi EU). Ei siirtoa EU:n ulkopuolelle.
- **Oikeus tulla unohdetuksi (RTBF)** ja **datan export (Art. 20)** toteutettu ja verifioitu (poistaa/vie kaikki henkilödatan).
- Salaus, pääsynhallinta (roolit), auditointi, varmuuskopiot.

## 6. Kysymykset juristille
1. **Riittääkö sovelluksen sisäinen huoltajan suostumus** kattamaan Art. 9 (terveys/biologinen ikä) vaatimukset — vai
   tarvitaanko erillinen nimenomainen suostumus terveysdatalle?
2. **Suurimmat juridiset riskit** Malli A:ssa (TM rekisterinpitäjänä alaikäisten terveysdatasta)?
3. Onko **DPIA (Art. 35) pakollinen**, ja kuka sen laatii / mitä se vaatii?
4. Tarvitaanko **tietosuojavastaava (DPO)** (Art. 37)?
5. Onko **säilytysaika** ("toistaiseksi, suostumuksen peruutukseen asti") hyväksyttävä, vai tarvitaanko määräaika?
6. Miten **seuran käyttöoikeus** (ei rekisterinpitäjä eikä käsittelijä) muotoillaan oikein sopimuksessa?
7. **Solo (B2C)**: kun perhe rekisteröityy suoraan ilman seuraa — eroaako suostumus/oikeusperuste?
8. Tarkista **tietosuojaseloste-luonnos** ja **suostumusteksti**.

## 7. Mitä juristilta halutaan
- Vahvistus Malli A:lle (tai perusteltu vaihtoehto).
- Suostumustekstin + tietosuojaselosteen tarkistus/hyväksyntä.
- Selkeä lista pakollisista toimista ennen laajaa käyttöönottoa (DPIA? DPO? muuta?).
