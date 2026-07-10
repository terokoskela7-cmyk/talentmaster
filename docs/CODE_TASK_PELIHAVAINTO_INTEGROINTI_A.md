# Pelihavainto-integrointi (A): ADAR-pikakortti kaanoniksi + IDP-kytkös

> Päätös (Tero 2026-07-10): **A** — pikakortti kaanoniksi, helppo käyttää, kytketty pelaajan **IDP-korttiin**. Sisältöä
> laajennetaan valmentajakoulutuksella (`TalentMaster_ADAR_Koulutus.html`, olemassa). Tämä spec nojaa auditointiin joka
> paljasti: **koko downstream (arviointi + IDP) on jo rakennettu pikakortin 1–3-mallille — P1:n 1–5 vain rikkoi linjauksen.**
> Integrointi on siksi pääosin *P1:n konfliktin poisto + kytkösten viimeistely*, ei uuden rakentamista. Kohde: Master_v16 +
> VP_v25 + `TalentMaster_ADAR_Pikakortti.html` + `lib/tm_idp.js` / `lib/tm_arviointi_taksonomia.js`.

## 0. Auditointilöytö — ketju on jo olemassa

**Pikakortti** (`TalentMaster_ADAR_Pikakortti.html`) osaa jo:
- **1–3 ikävaiheistettu ADAR** (Taso 1 U8–U12 Assess / Taso 2 U13–U15 A·D·Act / Taso 3 U16–U19 +Re-assess), tutkimuspohja.
- **Pikasyöttö** (`_pikaState`): pelaaja → ADAR-osa → 1–3 → tallenna = **3 klik** (valmis nopea kenttähavainto).
- **Offline-first** (IndexedDB-jono, synkkaa kun verkko palaa).
- Päivittää **`adar_viimeisin` + `adar_havaintoja` -pikakentät** (merge).
- Lähettää **`postMessage('tm:adar:saved')`** → suunniteltu upotettavaksi Masteriin.
- Kirjoittaa `seurat/{sid}/pelaajat/{pid}/havainnot`.

**IDP-moottori** (`lib/tm_idp.js`) osaa jo:
- `idpKeraaKandidaatit(p, {tmAdarHavaittu, …})` lukee **pelihavainnon**: `tmAdarHavaittu(p.adar_viimeisin)` → arvo **≤2 →
  kehityskandidaatti** (`lahde:'pelihavainto'`). Kynnys ≤2 = suunniteltu **1–3:lle** (1/2 = kehityskohde, 3 = hallitsee).
- `idpJarjestaKandidaatit` (heikoin ensin, §28-kypsyysvahti), `idpValitseHeikoin` → tavoite.

→ **Ketju pelihavainnosta IDP:hen on jo langoitettu.** P1:n 1–5 vain katkaisi sen (≤2-kynnys + /12-näyttö odottavat 1–3).

## 1. Periaate + tavoite
Pikakortti on **kaanoninen pelihavaintomalli** (1–3, ikävaiheistettu, tutkimuspohja, offline, pikasyöttö). Se on **helppo**
(3 klik kentällä) ja **kytketty IDP-korttiin** olemassa olevan moottorin kautta. P1:n arvo (arviointi-syöttö, yksilölinkki)
säilyy sovitettuna 1–3:een. **Yksi pelihavainto-sisäänkäynti**, ei kahta kilpailevaa. Sisältö laajenee koulutuksella, ei koodilla.

## 2. Työ — mitä integrointi vaatii (pienempi kuin miltä näytti)

**2.1 Pikakortti kaanoniksi, upotettuna Masteriin.**
- Upota pikakortti Masterin **Havainnot**-välilehteen (iframe tai inline). `postMessage('tm:adar:saved')` kuuntelu on jo
  osittain Masterissa → viimeistele: tallennus → sulje paneeli + päivitä pelaajan tila.
- **Pikasyöttö näkyviin oletuksena** (3 klik) — "nopeus ensin". Täysi taso avautuu tarvittaessa.
- Aseta pelaaja/seura-konteksti Masterista (ei erillistä seura-valintaa upotettuna).

**2.2 Poista P1:n konfliktoiva 1–5-talteenotto.**
- Master `_pelihavaintoModal` (P1, `malli:'tm_pelihavainto'`, pisteet 1–5) → **korvaa pikakortilla**. Ei kahta mallia
  `havainnot`-kokoelmaan. Migraatio §5.

**2.3 Asteikko 1–3 kaikkialle (linjaus, ei uutta).**
- IDP-kynnys ≤2 (jo 1–3), Peli-välilehden /12 (jo 1–3) → toimivat kun data on 1–3. Poistetaan vain P1:n 1–5-lähde.
- `tmAdarHavaittu` lukee `adar_viimeisin` → varmista että se tulkitsee pikakortin 1–3-arvot oikein (arvo ≤2 = kehityskohde).

**2.4 IDP-kytkös näkyväksi (Teron ydinpyyntö "helppo yhdistäminen IDP:hen").**
- Ketju toimii jo automaattisesti (kandidaattimoottori). Lisää **näkyvä silta**: pelihavainnon tallennuksen jälkeen (tai
  pelaajaraportissa) **"Tee tästä IDP-tavoite"** -toiminto → `idpValitseHeikoin`/kandidaatti → `tavoite_aktiivinen` →
  näkyy IDP-kortissa (`idp_tila: ehdotettu`). Yksi klik havainnosta tavoitteeksi.
- **Peliäly-tavoitteen harjoitussisältö:** P1:n `tm_pelialy_yksilo` (Kartta A, sovitettuna 1–3) tuottaa teknis-taktisen
  teeman IDP-tavoitteelle (mitä harjoitellaan). Täydentää IDP-moottoria (joka valitsee *minkä* osa-alueen), ei korvaa.

**2.5 P1:n libit — säilytä, sovita 1–3:een.**
- `tmAdarHavaittu`: toimii jo (avainpohjainen). Varmista 1–3-tulkinta.
- `tm_pelialy_yksilo` (Kartta A): säilytä yksilöteeman ehdottajana (IDP-tavoitteen harjoitussisältö); sovita kynnys/arvot 1–3.
- `tm_arviointi_taksonomia` `TM_ARVIOINTI_ASTEIKKO`: varmista 1–3↔taksonomia (arviointi käyttää 1–5-taksonomiaa; ADAR 1–3 →
  mäppäys/normalisointi taksonomian 1–5-akselille §7, tai arviointi näyttää ADAR-lähteen 1–3-omalla merkinnällä). **§7 päätös.**

## 3. Käytettävyys (nopeus ensin, säilyy)
- **Kenttä:** pikasyöttö 3 klik (pelaaja → ADAR-osa → 1–3) — jo olemassa, offline. Ei muutu hitaammaksi.
- **Ikävaihe automaattisesti:** pikakortti valitsee tason pelaajan iän mukaan (U8–U12 vain Assess jne.) → valmentaja ei mieti.
- **Syvennä + IDP:** myöhemmin pöydän ääressä täysi taso + "Tee IDP-tavoite" (§2.4).

## 4. IDP-kortti — mitä näkyy (kytkös)
- IDP-kortti (`tm_idp.js` + IDP-näkymä) näyttää: valitun **tavoitteen** (heikoin kandidaatti, myös pelihavainnosta),
  lähteen (pelihavainto/mitattu/havaittu), tavoitearvon (`idpTavoitearvo`), tilan (odottaa/ehdotettu/aktiivinen), seurannan.
- Pelihavainnon kytkös: kun ADAR-osa ≤2 → se on kandidaatti → valittavissa IDP-tavoitteeksi. **Näytä IDP-kortissa "lähde:
  pelihavainto (ottelu 6.7.)"** jotta ketju havainnosta tavoitteeksi on läpinäkyvä.

## 5. Migraatio + siivous
- P1:n 1–5-testidata (minimaalinen) → poista tai skaalaa ÷ (1–5→1–3). Tee ennen kaanonin käyttöönottoa.
- Poista/piilota P1:n `_pelihavaintoModal` (1–5). Poista P1:n 1–5-oletukset (kynnykset) libeistä.
- ADAR-pikakenttien (`adar_viimeisin`) rakenne: varmista yksi muoto (pikakortti kirjoittaa; arviointi + IDP + Peli-välilehti lukevat).

## 6. Rajaus (EI tässä)
- Sisällön laajennus (uudet KPI:t, pelipaikat) → **valmentajakoulutus** (`ADAR_Koulutus`), ei koodimuutos.
- AI / video → myöhemmin.
- Pikakortin oma iso refaktorointi → ei; upotus + kytkös riittää.

## 7. Avoin päätös — TERO
- **Asteikko-silta arviointiin:** ADAR 1–3 vs taksonomian 1–5. (a) ADAR-lähde näkyy arvioinnissa omana 1–3-merkintänä
  (ei muunneta), vai (b) normalisoidaan 1–3 → 1–5 taksonomian akselille? Suositus **(a)** — säilyttää pikakortin
  tutkimuspohjaisen asteikon, ja arviointi jo erottelee lähteet (mitattu/havaittu/pelihavainto).

## 8. Vaiheistus (briefit tämän jälkeen)
- **I1 — Kaanon + siivous:** upota pikakortti Masteriin, poista P1:n 1–5-modaali, migratoi data, varmista pikakentät+näyttö 1–3.
- **I2 — IDP-kytkös näkyväksi:** "Tee IDP-tavoite" -silta + IDP-kortin lähdemerkintä (pelihavainto).
- **I3 — Harjoitussisältö:** `tm_pelialy_yksilo` (1–3) tuottaa IDP-tavoitteen teknis-taktisen teeman.
- Kukin oma branch + verifiointi (git + emulaattori + selain), Teron "live".

## 9. Verifiointi
- Live: pikasyöttö Masterista (3 klik) → tallentuu → `adar_viimeisin` päivittyy → arviointi näyttää (1–3, oikein, ei 4/3) →
  IDP-kandidaatti syntyy (≤2) → "Tee IDP-tavoite" → näkyy IDP-kortissa lähteellä. Ikävaihe: U10-pelaajalla vain Assess.
  Offline: kirjaus ilman verkkoa → synkkaa. 0 konsolivirhettä. `npm test` + lint.
