# VP per-pelaaja -kortti — Aloitusnäkymä + selkeysuudistus

> Lähde: visuaalinen katselmus 2026-07-05 (Tero + Claude). Kortti kasvoi tiheäksi kun 3a/3b lisättiin → selkeytys. Kohde: `TalentMaster_VP_v25.html` `_avaaPerPelaajaPikakatsaus` (per-pelaaja `_jspModal`). Visuaaliset referenssit: `docs/mockups/vp_kortti_aloitusnakyma.html` (pääsuunta) + `docs/mockups/vp_kortti_selkeys_ehdotus.html` (5 muutosta). §26 · §28 · §5. **Ei uutta dataa** — kaikki pikakentistä.

## 1. Ydin
Pelaajakortti avautuu nyt suoraan "Fyysinen"-tabiin (raakadataan) ja kausitavoite-lomake on haudattu pohjalle. Uusi **"Aloitus"-välilehti (oletus, aukeaa ensin)** nostaa **fokuksen** ylimmäksi: näet heti *missä fokus ja mitä kohti mennään*. Raakadata = drill-down-välilehdillä.

## 2. Aloitus-välilehti (uusi oletusvälilehti)
Järjestys: **● Aloitus** · Fyysinen · Tekninen · Peli · Kehitys · Arviointi. Aloitus = oletusaktiivinen.
Sisältö (mockupin mukainen, kaikki §26-pikakentistä):
1. **Fokus-herot rinnakkain:**
   - **🎯 Kausifokus** (makro) — IDP-kausitavoite `idp_fokus` + `idp_tila` (○ Ehdotettu / ● Aktiivinen) + `fokus.nimi`+dim + pelillinen sovellus (`perustelu.pelilause`). **Toimii heti** (3a/3b livenä).
   - **📍 Jaksofokus** (meso, 1–6 vk) — **placeholder**: renderöi "Jakso tulossa (Vaihe 4)" himmennettynä kunnes jaksotaso rakennetaan. Rakenne valmiina, ei estä.
   - Ladder-teksti: "jakso laddaa kausifokukseen · kausi laddaa isoon tavoitteeseen".
2. **Status-nauha** (yksi silmäys): viimeisin mittaus (`hh_pvm`/`tki_pvm` uusin), edistymä (`idp_edistyma`), seuraava review (`idp_viim_review` + arvio_pvm → "~N vk"), kypsyys (`phv_tila` → "PHV-herkkä 🌱" jne).
3. **Seuraava askel** -CTA:t: `＋ Kirjaa review` (→ 3b review-modaali) · `Avaa tavoite` (→ Kehitys-välilehti) · `Arvioi (havaittu)` (→ Arviointi-välilehti).
4. **Mini-kehityskaari** (kausifokus): `arviot[]` → sparkline lähtö→nyt→tavoite (kompakti; täysi kaari Kehitys-välilehdellä).
Tyhjät tilat: ei tavoitetta → "Ehdota kausitavoite" -CTA (kuten nyt).

## 3. Viisi selkeysmuutosta (koko kortti)
1. **Fokus ylös** — toteutuu Aloitus-herolla (yllä).
2. **Kypsyysneutraali väritys (§28 — INVARIANTTIKORJAUS):** pre-PHV heikko fyysinen (MAS/CMJ/kestävyys ilman PHV-varmennusta) **EI punainen hälytys** vaan **🌱 neutraali** (harmaa/himmennetty + "kehittyy PHV:n jälkeen"). Koskee Fyysinen-tabia + vasenta 5D-snapshotia. Väri = merkitys; nyt punainen "1" on ristiriidassa oman kypsyysvaroituksen kanssa. Käytä olemassa olevaa `phv_tila`/§28-logiikkaa; kun PHV puuttuu → fyysinen taso näytetään neutraalina, ei severity-punaisena.
3. **Vasen sarake tiiviiksi:** poista täysi D1/D2-testilista (10m/30m/CMJ/MAS/SM…) vasemmalta — se toistaa Fyysinen/Tekninen-välilehden. Vasen = radar + **5D-snapshot** (D1–D5 yksi luku each) + signaalit (X-Factor, late developer) + ikävaihe-note.
4. **Katso vs. tee -erottelu:** kausitavoitteen **muokkaus** (fokus-dropdown, vapaa sana, tavoitearvo, Ehdota/Hyväksy) siirtyy **Kehitys-välilehteen**. Fyysinen/Tekninen/Peli = pelkkä luku. Aloitus näyttää fokuksen **read-only** + CTA joka vie Kehitykseen.
5. **Progressiivinen paljastus:** "MAS syvä analyysi" + harjoitteluvyöhykkeet piiloon `▸ Näytä lisää` -taakse (Fyysinen-tab). Oletuksena rauhallinen.

## 4. Invariantit + verifiointi
§26 (kaikki pikakentistä, ei alikokoelmakyselyjä renderissä) · §28 (kypsyysneutraali väri — pre-PHV fyysinen ei severity-punainen) · §5 tokenit (teal/amber/carbon; ei kiellettyjä värejä) · §7.22 ei koske tätä (VP-aikuisnäkymä) · ei version.json-bumppia · ei Rules-muutosta · lib `?v` jos tm_idp muuttuu. **Ei uutta dataa** — Aloitus lukee `idp_*`/`hh_*`/`phv_tila`/`arviot[]` jotka ovat jo olemassa.
Verifiointi (live, VP_v25 SJK): kortti avautuu Aloitus-välilehteen · kausifokus-hero näkyy (Vilma: Kestävyys D1) · MAS **ei punainen** vaan 🌱 · vasen ei toista testilistaa · kausitavoite-editointi Kehitys-välilehdellä · CTA:t toimivat · tyhjä tila (ei tavoitetta) OK. `npm test` + lint vihreät.

## 5. Vaiheistus (jos pilkotaan)
- **A (heti):** kypsyysneutraali väri (#2, §28-korjaus) — pieni, tärkein invariantti.
- **B:** Aloitus-välilehti (fokus-herot + status + CTA + mini-kaari) + oletusaktiivinen.
- **C:** vasen tiivistys (#3) + katso/tee-erottelu (#4, kausitavoite→Kehitys) + progressiivinen paljastus (#5).
Yksi PR tai A→B→C — toteuttajan valinta; A kannattaa joka tapauksessa ensin.
