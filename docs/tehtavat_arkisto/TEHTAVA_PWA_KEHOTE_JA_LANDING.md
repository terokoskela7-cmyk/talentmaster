# Tehtävä: PWA-asennuskehotteet + linkkimailin ohjeet + talentmasterid.com-landing

> Tausta: ensimmäiset oikeat rekisteröintikutsut lähtevät (SJK). Huoli: perheet
> hukkaavat nettisivujen osoitteet. Ratkaisu kolmessa osassa: kotinäyttöasennus,
> paremmat mailiohjeet, muistettava domain.

## ⚠️ ARKKITEHTUURIPÄÄTÖS — ÄLÄ kytke custom domainia talentmaster-repoon

Custom domain projektisivulla siirtäisi KOKO sovelluksen juureen
(`/talentmaster/`-polku katoaisi) → rikkoisi: SW-scopet (§27), PWA-manifestien
absoluuttiset polut, Firebase Auth authorized domains, Firestoreen tallennetut
pelaajaLinkki-osoitteet, functions/index.js baseUrl:t, CDN-versiotarkistukset.
→ Landing tehdään ERILLISEEN repoon (osatehtävä C). Täysi domain-migraatio on
oma projektinsa joskus myöhemmin (§33 B-luokka).

## Osatehtävä A — Asennuskehote Pelaaja_v7 + Vanhempi_v2

Molempiin appeihin (ne ovat jo PWA:ita — manifest + SW + ikonit kunnossa):

1. **Android/Chrome:** kuuntele `beforeinstallprompt` → `e.preventDefault()` +
   talteen → näytä oma diskreetti banneri kirjautumisen JÄLKEEN (ei login-
   ruudussa): "📲 Lisää [appin nimi] kotinäytölle — aina yhden napautuksen
   päässä" + [Lisää]-nappi (`prompt()`) + [×]. 
2. **iOS/Safari:** ei beforeinstallprompt-tukea → tunnista
   (`navigator.standalone === false` && iOS-UA) → sama banneri mutta ohjeella:
   "Napauta Jaa-kuvaketta ja valitse 'Lisää Kotivalikkoon'".
3. **Käyttäytyminen:** banneri näytetään max 1×/sessio; [×] → localStorage-
   lippu (`tm_pwa_kehote_ohitettu`) → ei näytetä 14 pv:ään; standalone-tilassa
   (`display-mode: standalone`) EI koskaan. Pelaajan puolella §7.22-sävy:
   lyhyt, positiivinen, ei toistuvaa nagia.
4. SW-cacheversiot + ?v + version:bump (§27.4).

## Osatehtävä B — pohjaPelaajaSivu-mailin täydennys (functions/index.js)

Lisää kolme asiaa ②-osion linkkien yhteyteen:
1. Pelaajan napin alle: "⚽ Pelaaja kirjautuu omalla PIN-koodillaan. PIN näkyy
   Vanhemman sivulla kirjautumisen jälkeen."
2. Salasanaosioon: "Jos linkki ehti vanhentua, ei hätää — käytä Vanhemman
   sivun 'Unohtuiko salasana?' -toimintoa."
3. Loppuun vinkki: "💡 Lisää sivut puhelimen kotinäytölle (selaimen valikosta
   'Lisää aloitusnäytölle'), niin ne ovat aina tallessa. Osoitteen voi aina
   palauttaa mieleen: talentmasterid.com"
4. Samalla: vaihda mailipohjien #3EC9A7 → #28B090 (§5 canonical;
   pohjaRekisteriKutsu/pohjaPelaajaSivu/pohjaSalasanaAsetus).
5. Deploy: functions deployataan CI:llä (deploy_functions.yml) — varmista
   että muutos menee normaalin functions-deployn kautta.

## Osatehtävä C — Landing-sivu talentmasterid.com:lle (ERILLINEN repo)

1. Luo uusi public repo `terokoskela7-cmyk/talentmasterid-landing` (gh CLI jos
   käytettävissä: `gh repo create`; muuten ohjeista käyttäjää luomaan GitHubissa
   ja lisää remote). Sisältö:
   - `index.html` — yksi sivu, mobile-first, design-tokenit (§5: Carbon-tausta
     #111110, teal #28B090, Cormorant-otsikko "TalentMaster™", DM Sans):
     kaksi ISOA nappia pinossa:
     "⚽ Pelaajan sivu" → https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Pelaaja_v7.html
     "👨‍👩‍👦 Vanhemman sivu" → https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Vanhempi_v2.html
     + pienempi linkkirivi alle: "Seuran työkalut" → VP_v25 · Valmentaja
     (Master_v16) · Seurahallinta (Seura.html)
     + footer: "TalentMaster™ — Pelaaja ensin, hallinto vahvistaa"
   - `CNAME`-tiedosto sisällöllä: `talentmasterid.com`
   - Ei JS-riippuvuuksia, ei SW:tä (yksinkertaisuus = ei cache-ongelmia).
2. Pushaa + ohjeista: Settings → Pages → Source: main → odota deploy →
   Custom domain -kenttä täyttyy CNAME-tiedostosta → "Enforce HTTPS" päälle
   kun sertifikaatti on valmis (voi kestää ~1 h DNS:n jälkeen).
3. DNS-asetukset ovat KÄYTTÄJÄN manuaalinen osa (rekisteröijän hallinta) —
   älä yritä tehdä niitä; ohjeet on annettu erikseen.

## Verifiointi

1. npm test + inline-syntaksit (Pelaaja/Vanhempi) + functions lint jos on
2. Selaimessa: banneri näkyy kirjautumisen jälkeen, [×] piilottaa, standalone
   ei näytä; iOS-haara UA-emuloinnilla
3. Landing: validi HTML, napit oikeisiin osoitteisiin, toimii 360 px leveydellä
4. Commit + push molemmat repot + version:bump (Pelaaja/Vanhempi SW-versiot)
