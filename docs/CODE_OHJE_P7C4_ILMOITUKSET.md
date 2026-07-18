# CODE — P7-c.4: Kalenteri-ilmoitukset pelaajalle + vanhemmalle (muistutus · muutos · peruutus)

**Tyyppi:** Infra (Cloud Functions) + kuluttaja-notif-UI. **Isoin P7-consumer-vaihe.** **Riippuvuus:** P7-c.1 (+ c.2/c.3 sisällölle).
**Kohteet:** `functions/` (CF-triggerit) · `TalentMaster_Pelaaja_v7.html` + `TalentMaster_Vanhempi_v2.html` (notif-keskus) · Firestore Rules (kuluttaja-notif-luku).
**Perusta:** **`docs/NOTIFIKAATIOT_JA_MOBIILI.md`** on jo olemassa (koko notifikaatiokehys: CF kirjoittaa notifin, client lukee omat; opt-out; frekvenssikatto; hiljaiset tunnit; GDPR minimi-PII; ei cross-user-väärennöstä). **P7-c.4 laajentaa sitä kalenteritriggereillä kuluttajille** — älä keksi uutta arkkitehtuuria, seuraa dokin §B mallia.

## Miksi
Kalenteri jää sisäiseksi muistioksi, jos tapahtumat/muutokset/**peruutukset eivät tavoita** pelaajaa/vanhempaa. Ilmoitukset "pyörittävät silmukkaa" — sama periaate kuin notifikaatiodokin lähtökohta. Nykyinen notif-kehys kohdistuu valmentajaan/VP:hen (T1–T4); c.4 tuo **kuluttaja-kohdennuksen** (pelaaja/vanhempi) kalenteritapahtumille.

## Mitä tehdään (dokin §B-arkkitehtuurilla)

### 1. Uudet kalenteritriggerit (CF, admin-kirjoitus)
Lisää notif-kehykseen (dokin taulukkoon T5–T6):
- **T5 · Tuleva tapahtuma -muistutus** — ajastettu CF (esim. edellisiltana / X h ennen `alkaa`): kohdistuu tapahtuman **roster**iin (`joukkue`/`pelaajat_id`) → kirjoittaa notifin ao. **pelaajille + vanhemmille**.
- **T6 · Tapahtuma peruttu / muuttunut** — Firestore-trigger CF `onUpdate kalenteri/{id}` kun `poistettu:true` TAI aika/paikka muuttuu → notif rosterille ("Lauantain ottelu peruttu / siirretty klo …").
- Kirjoitus **CF:llä (admin SDK)**, ei clientillä (dokin §B "turvallinen kirjoitus"). Kohdennus rosterista.

### 2. Kuluttaja-notif-keskus (Pelaaja_v7 + Vanhempi_v2)
- Notif-tallennus: `seurat/{sid}/pelaajat/{pid}/notifikaatiot/{id}` `{ tyyppi, teksti, linkki, luotu, luettu }` (kuluttaja-variantti dokin `kayttajat/{uid}/notifikaatiot`-mallista; pelaaja/vanhempi lukee pelaajan alta).
- UI: kellomerkki + badge + lista + merkitse luetuksi + deep-link tapahtumaan (kuten VP:n N1-keskus, kuluttaja-ilmeellä, ikäadaptoitu).
- **Rules:** client lukee/merkitsee luetuksi **vain omat** (PIN-pelaaja/vanhempi ao. pelaajan notifit); **create vain CF (admin)** → client ei voi väärentää. Lisää Rules-blokki `pelaajat/{pid}/notifikaatiot` (read/update anon-oma + SA; ei client-create).

### 3. Hallinta (dokin §"Hallinta")
Opt-out + frekvenssikatto + hiljaiset tunnit + per-tyyppi/-kanava-asetukset (`notif_asetukset`). **GDPR/alaikäisyys:** minimitieto notifissa; ei ylimääräistä PII:tä; sairaus-/terveyssyyt eivät notifin tekstiin.

### 4. Kanavat (vaiheistus dokin mukaan)
- **c.4a (nyt): in-app** (kuluttaja-notif-keskus) — ei uutta push-infraa (pl. Firestore + CF).
- **c.4b: sähköposti** vanhemmalle (dokin Nodemailer-CF §13; frekvenssikatto).
- **c.4c: web push (PWA)** — myöhemmin (push-infra + lupa; dokin N3).

## Reunaehdot
- **Seuraa `NOTIFIKAATIOT_JA_MOBIILI.md`:tä** (arkkitehtuuri, turvallinen kirjoitus, hallinta, GDPR) — c.4 on sen laajennus kalenteriin + kuluttajiin, ei uusi kehys.
- **CF-deploy tarvitaan** (`firebase deploy --only functions`) + Rules-blokki (Console/PR). Isompi kuin c.1–c.3.
- **Turvallisuus:** kuluttaja ei voi luoda toisen notifia (create vain CF); client vain lukee/merkitsee omat.
- **Ei spämmiä:** frekvenssikatto + hiljaiset tunnit + opt-out pakollisia.
- **Alaikäiset:** minimi-PII; **Topias = testi-OK** (verifiointi).

## EI tässä
- VP/valmentaja-triggerit (T1–T4) = notifikaatiodokin oma N1 (erillinen, osin jo suunniteltu).
- Push/PWA (c.4c) + email (c.4b) jos aloitetaan in-appista (c.4a).

## DoD
1. CF-triggerit **T5 (muistutus, ajastettu)** + **T6 (peruttu/muuttunut, onUpdate)** kirjoittavat kuluttaja-notifit rosterille (admin SDK); kohdennus joukkue/pelaajat_id.
2. Kuluttaja-notif-keskus Pelaaja_v7 + Vanhempi_v2:ssa (badge + lista + merkitse luetuksi + deep-link, ikäadaptoitu).
3. **Rules:** `pelaajat/{pid}/notifikaatiot` read/update vain oma (anon-PIN + SA); create vain CF; verifioitu ettei client voi väärentää.
4. Hallinta: opt-out + frekvenssikatto + hiljaiset tunnit; GDPR minimi-PII, ei terveyssyytä.
5. **Verifioi live + runtime (Topias):** peru testitapahtuma → pelaajan/vanhemman notif + badge + deep-link; ajastettu muistutus tuottaa notifin; merkitse luetuksi; opt-out; ei cross-user-väärennöstä. new Function 0 virhettä · npm test.
6. Vaiheistettava PR (c.4a in-app ensin); kuvaus linkkaa `NOTIFIKAATIOT_JA_MOBIILI.md` + design-totuus + P7-c.4.
