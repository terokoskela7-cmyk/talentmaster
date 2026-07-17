# CODE — P1.1: Aloitus — rauhallinen yhteenveto (dedupe tavoite · tiivistä jaksofokus · detail Kehitykseen)

**Tyyppi:** UI-selkeytys (näyttö, read-only — Aloitus reitittää jo Kehitykseen). **Yksi PR.**
**Kohde:** `TalentMaster_VP_v25.html` — `_vpIdpNarratiiviHTML(p)` (Aloitus-välilehti `_jspTab0`).
**Design-totuus:** hyväksytty `idp_aloitus_selkea.html`. Tiekartta **P1.1**. Ohje on itsenäinen.

## Miksi

Aloitus on kasvanut **11 osioon** ja Kehityksen lähes-kaksoiskappaleeksi. Sama tavoite ("Maalinteon halu") toistuu **kolmesti** — Suunta-yhteenveto (`_vpTavoiteYhteenvetoHTML`) · Kausitavoite · SMART-tavoitteet (`_vpIdpSmartRiviHTML`). Lisäksi jaksofokus on iso lohko, ja kehityskaari (`_vpMesoKaariHTML`) + silta (`_vpSiltaPaneeliHTML`) toistavat sisältöä joka on nyt **Kehitys-työpöydällä** (P4a/P4a.1: kausitavoite TASO 1 · jaksofokus TASO 2 · kaari TASO 3). Aloituksen kuuluu olla **10 sekunnin rauhallinen yhteenveto — tarina + linkit**, ei muokkauspöytä. P1.1 poistaa toiston ja tiivistää; **lämpö (pelaajan ääni, X-factor, sitoumus) säilyy.** Ei uutta dataa — sama sisältö, vähemmän toistoa.

## Mitä tehdään

### 1. Tavoite kerran — yksi "🎯 Suunta · kausitavoite" -solmu (dedupe)
Yhdistä nykyiset **kolme** tavoite-esiintymää yhdeksi solmuksi (design-totuuden `.goal`):
- **Poista erilliset:** Suunta-yhteenveto (`_vpTavoiteYhteenvetoHTML`) · erillinen KAUSITAVOITE-lohko · erillinen "SMART-tavoitteet"-osio (`_stitle('SMART-tavoitteet')` + `_vpIdpSmartRiviHTML`).
- **Yksi solmu näyttää:** tavoitteen nimi (serif) + `dim · tyyppi (heikkous/vahvuus)` + status-chip (○ ehdotettu / ● aktiivinen) + horisontti (kausi · kesto · arviopvm) + **edistymä-palkki + %** (SMART-rivin data) + linkki **"→ Kehitä suunnitelmaa · Kehitys-työpöytä"** (`_jspVaihda(3)`).
- **Uudelleenkäytä olemassaolevaa dataa** (sama lähde jota `_vpTavoiteYhteenvetoHTML`/`_vpIdpSmartRiviHTML` lukevat) — vain renderöi **yksi** kevyt read-only-solmu, ei kolmea. Tyhjä → pehmeä "Aseta kausitavoite Kehityksessä".

### 2. Jaksofokus → yksi rivi (iso lohko tiivistetään)
Nykyinen JAKSOFOKUS-lohko (moniosainen + `_vpJfTukiHTML` + ohjelma-detaljit) tiivistyy **yhden rivin yhteenvedoksi** (design-totuuden `.focus`):
- Näytä: konsepti (serif) + `domeeni · dim · kesto vk` + linkki **"→ Kehitä jaksofokusta"** (`_jspVaihda(3)`).
- Tukikonsepti(t): yksi kevyt rivi "→ Tukena: 🧠 Pelin lukeminen" (`_vpJfTukiHTML`-data tiivistettynä; älä toista koko lohkoa).
- **Ohjelma-detaljit, nelikulmamalli, editointi = Kehitys-työpöydällä** (P4a) — ei Aloituksessa. Tyhjä → "Aseta jaksofokus Kehityksessä".

### 3. Poista Aloituksesta (elävät nyt Kehitys-työpöydällä)
- **Kehityskaari** (`_vpMesoKaariHTML` + KEHITYSKAARI-osio) → pois Aloituksesta (se on Kehitys TASO 3).
- **Silta · teemasta harjoitteeksi** (`_vpSiltaPaneeliHTML` + `_stitle('Silta…')`) → pois Aloituksesta (valmennus-detalji → Kehitys/Viikko).
- **Erillinen "Moottorin ehdotus (korjaa heikkous…) → Kehitys-työpöytä" -rivi** → pois; sen linkki on nyt tavoite-solmussa (kohta 1). Ei erillistä duplikaattiriviä.

### 4. Säilytä (Aloituksen sielu) + tiivistä loppu
- **🎙 Pelaajan ääni** (`_vpPelaajanAaniHTML`, miksi/millainen) — säilyy sellaisenaan (P1).
- **★ Erottava ase** (X-factor) — lyhyt yhden rivin solmu (nimi + `TKI · dim` -tagi).
- **Identiteetti + 5D-radar + tasot** (vasen kisko, `_vpStatTiivisteHTML` ym.) — ennallaan.
- **🤝 Sitoumus** (`_vpSitoumusHTML`) — kompakti (pelaajan omistajuus).
- **🎽 Rooli · Pelipaikkafundamentit** (`_vpPelipaikkaFundamentitHTML`) → **▸ reveal-linkin taakse** (viitesisältö, ei 10 s katsauksessa).
- **Loppuun CTA:** "→ Avaa Kehitys-työpöytä · muokkaa suunnitelmaa" (`_jspVaihda(3)`).
- **Selkäranka** (teal-hiusviiva + solmut, P1) säilyy — nyt ~6 rauhallista solmua 11:n sijaan.

## Reunaehdot
- **Read-only / display-only:** Aloitus reitittää jo Kehitykseen (P4a); P1.1 ei lisää muokkausta. Ei uutta Firestore-kenttää, **ei Rules-muutosta**, ei datamigraatiota, ei kirjoituspolkua.
- **Ei uutta dataa/logiikkaa:** tavoite-solmu + jaksofokus-rivi lukevat **samaa dataa** kuin nykyiset renderöijät (`_vpTavoiteYhteenvetoHTML`, `_vpIdpSmartRiviHTML`, jaksofokus-pikakentät). Vain **yksi kevyt esitys** kolmen/ison sijaan.
- **Ei cache-bumppia:** vain `TalentMaster_VP_v25.html` (ei lib-muutosta).
- **Ei regressiota muualla:** poistetut renderöijät (`_vpMesoKaariHTML`, `_vpSiltaPaneeliHTML`, `_vpIdpSmartRiviHTML`) **säilyvät määriteltyinä** ja käytössä **Kehitys-välilehdellä** — poista vain niiden kutsu Aloitus-narratiivista, älä poista funktioita.
- **P1 säilyy:** pelaajan ääni (miksi/millainen), selkäranka, alkuperä-radar, tavoite-yhteenvedon data — vain esitetään tiiviimmin.
- **Brändi:** design-totuuden `idp_aloitus_selkea.html` mukaan — molemmat teemat, hiusrajat, terävät kulmat, teal-selkäranka, emoji semanttisina ikoneina (🎙 ääni · ★ ase · 🎯 suunta · 📍 jakso · 🤝 sitoumus). Pelaajan lause = kursiivi-serif.
- **Mobiili §6:** kaksisarakkeinen runko pinoutuu; solmut + tavoite-kortti mahtuvat kapealla.
- **Alaikäiset read-only** (Eino·Leo·Emil) — Aloitus on luku; ei kirjoitusriskiä. **Topias = testi-OK** katseluun.

## EI tässä
- **Kehitys/Arviointi/Mittaus** — ennallaan (jo selkeytetty P4a.1/P3.1/P2).
- **Uusi tavoitedata / horisontit** — P4b/P4c erikseen.

## DoD
1. Tavoite ("kausitavoite") esiintyy Aloituksessa **kerran** — yksi "🎯 Suunta · kausitavoite" -solmu (nimi + dim/tyyppi + status + horisontti + edistymä-% + linkki Kehitykseen). Ei Suunta+Kausitavoite+SMART-toistoa.
2. Jaksofokus = **yksi rivi** (konsepti + domeeni/dim/kesto + "→ Kehitä jaksofokusta") + tukikonsepti-rivi; iso lohko/ohjelma-detaljit pois.
3. Kehityskaari + Silta + erillinen moottori-rivi **poistettu Aloituksesta** (funktiot säilyvät Kehityksen käytössä).
4. Säilyy: pelaajan ääni · erottava ase · sitoumus · radar/identiteetti · selkäranka; pelipaikkafundamentit ▸ revealin takana; loppu-CTA → Kehitys-työpöytä.
5. ~6 rauhallista solmua (ei 11); Aloitus lukeutuu 10 sekunnissa.
6. Ei uutta kenttää/Rules/migraatio/cache-bumppia; ei regressiota (Kehitys/Arviointi/Mittaus + poistettujen funktioiden Kehitys-käyttö toimivat).
7. Molemmat teemat + mobiili; 0 konsolivirhettä. **Verifioi live:** Aloitus on rauhallinen yhteenveto, tavoite kerran, jaksofokus 1-rivinen, linkit vievät Kehitykseen; Kehitys-välilehti (kaari/silta) toimii yhä. **Verifioi ennen mergeä.**
8. Pieni/keskikokoinen PR; kuvaus linkkaa `idp_aloitus_selkea.html` + tiekartta P1.1.
