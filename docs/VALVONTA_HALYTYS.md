# Erottelun valvonta: sähköpostin vastaanottaja ja "valvonta pysähtyi" -hälytys

Projekti 07 / PR 4 (P4, P6, P8). Tero tekee nämä kerran GCP:ssä; koodi ei muuta Rulesia eikä luo resursseja.

## 1. Vastaanottaja (P6): Secret Manager `VALVONTA_VASTAANOTTAJA`

**Tee ennen kuin tämä PR deployataan.** Functions-deploy epäonnistuu, jos `runWith({ secrets })`-listan salaisuutta ei ole olemassa.

Osoite ei päädy repoon, shell-historiaan eikä chattiin (`read -s` ei näytä eikä tallenna syötettä). zsh:

```sh
read -s "OSOITE?Valvonnan vastaanottaja (yksi sähköpostiosoite): "; echo
printf '%s' "$OSOITE" | gcloud secrets create VALVONTA_VASTAANOTTAJA \
  --project=talentmaster-pilot --replication-policy=automatic --data-file=-
unset OSOITE
```

Osoitteen vaihto myöhemmin (uusi versio, ei koodimuutosta, mutta functions pitää deployata uudelleen, jotta ne poimivat uuden version):

```sh
read -s "OSOITE?Uusi osoite: "; echo
printf '%s' "$OSOITE" | gcloud secrets versions add VALVONTA_VASTAANOTTAJA --project=talentmaster-pilot --data-file=-
unset OSOITE
```

- Vain **yksi** osoite (v1). Useita pilkulla/puolipisteellä → moduuli hylkää arvon ja jättää lähettämättä (lokiin vain `vastaanottaja_puuttuu`).
- Käyttöoikeus: `SENDGRID_API_KEY` toimii jo samalla tavalla; Firebase deploy antaa funktion ajotunnukselle `secretAccessor`-oikeuden julistetuille salaisuuksille.
- Tarkistus ilman arvon näyttämistä: `gcloud secrets describe VALVONTA_VASTAANOTTAJA --project=talentmaster-pilot` (näyttää vain metadatan).
- Sähköposti lähtee vasta kirjoitusjaksolla (ajo 17.11.2026 →), ei kuivalla jaksolla. Muu kuin tuotantoprojekti ei lähetä mitään (`sahkoposti_esto`).

### Milloin posti tulee
- **Päivittäin** (05:30): vain jos on **uusi tai kasvanut virhe** tai seura, jota ei ehditty käsitellä. Sama virhe edelleen auki → ei uutta postia.
- **Viikoittain** (ma 05:00): yhteenveto (virheet + varoitukset), jos on mitään kerrottavaa.
- Sisältö: vain seura-id, tarkistuskoodi, kokoelma ja lukumäärät.

## 2. "Valvonta pysähtyi" -hälytys (P8 b): Cloud Monitoring, ei koodia

Jokainen ajo (myös kuiva) kirjoittaa Cloud Loggingiin rivin, jonka alku on vakiomuotoinen (testi lukitsee muodon):

```
valvonta paivittain valmis · ERROR 0 · WARN 0 · …
valvonta viikko KUIVA valmis · ERROR 0 · WARN 0 · …
```

### 2.1 Lokipohjainen mittari

```sh
gcloud logging metrics create valvonta_ajo_valmis --project=talentmaster-pilot \
  --description="Erottelun valvonta-ajo valmistui (paivittain tai viikko, myös kuiva)" \
  --log-filter='resource.type="cloud_function" AND resource.labels.function_name=("valvontaPaivittain" OR "valvontaViikko") AND textPayload=~"^valvonta (paivittain|viikko)( KUIVA)? valmis"'
```

### 2.2 Hälytyskäytäntö (Console: Monitoring → Alerting → Create policy)

1. **Select a metric:** `logging/user/valvonta_ajo_valmis` (Cloud Function). Jos mittari ei vielä näy, odota ensimmäistä ajoa tai kytke "Active" pois suodattimesta.
2. **Ehto:** ajoja **alle 1** viimeisen **2 vuorokauden** aikana (PM:n päätös P8: 2 vrk; päivittäisen ajon vuoksi 8 pv olisi liian pitkä). Helpoin tapa: *Add query → PromQL*: `sum(increase(logging_googleapis_com:user_valvonta_ajo_valmis[2d])) < 1`, tai MQL/rolling window 2 d, aggregation sum, "is below 1".
   - **Tarkista Consolessa, sallitaanko 2 vrk:n ikkuna.** Jos ei (Monitoringin "absence"/retest-ikkunalla on yläraja n. vuorokausi), käytä vuorokauden ikkunaa ja jätä "retest window" mahdollisimman pitkäksi; hälytys tulee silloin jo yhden ohitetun ajon jälkeen (herkempi kuin P8, mutta ei hiljaisempi).
3. **Notification channel:** sähköposti (Teron osoite; tämä on eri kanava kuin `VALVONTA_VASTAANOTTAJA`, joten Monitoring ei tarvitse salaisuutta).
4. **Nimi:** `Valvonta pysähtyi (ei ajoja 2 vrk)`.

### 2.3 Hälytys itse ajon virheestä (suositus, ei P8-pakollinen)

Funktio kirjoittaa epäonnistuessaan `valvonta <tyyppi> epäonnistui koodi=…` (severity ERROR) ja heittää virheen, joten Cloud Functionsin oma virhemittari (`cloudfunctions.googleapis.com/function/execution_count`, status ≠ ok) kattaa sen. Lisää tarvittaessa toinen politiikka samalla kanavalla.

### 2.4 Testaus (kerran, ennen kuin luotat hälytykseen)

1. Console → Cloud Scheduler → keskeytä (`Pause`) `firebase-schedule-valvontaPaivittain-europe-west1` ja `…valvontaViikko…`.
2. Odota ikkunan verran ja varmista, että hälytys sähköposti tulee. (Pidempi odotus; vaihtoehtoisesti väliaikaisesti lyhennä ikkuna 1 tuntiin ja pakota yksi ajo "Force run" -toiminnolla.)
3. Jatka työt (`Resume`) ja palauta ikkuna.
