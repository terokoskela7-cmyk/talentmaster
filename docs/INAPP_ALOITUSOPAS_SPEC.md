# In-app-aloitusopas — spec (4 roolia)

> Scoping 2026-06-23 (Tero). Vie opaskirjan sisältö järjestelmän sisään: roolikohtainen **"Aloita tästä"**
> joka yhdistää **datavetoisen edistymis-checklistin** + **selittävän opasosion** + olemassa olevan
> kontekstuaalisen ℹ️:n. Lähteet: `OPAS_VP_JA_VALMENTAJA.md` (VP/valmentaja) · `OPAS_PERHE.md`
> (vanhempi/pelaaja) · CLAUDE.md §26 (pikakentät) · §7.22/§16 (lapsi-/perhepinta) · §5 (Carbon) · §17.
>
> **Periaate:** sama moottori kuin Admin "Pilotin tila" (§33) — checklist lukee **pikakentät** ja näyttää
> oikean tilan, ei selitä tyhjää. Roolitietoinen: jokainen näkee vain oman roolinsa oppaan. **Ei uutta
> dataa, ei AI-Q&A:ta** (jälkimmäinen on myöhempi AI-agenttivaihe, §21).

---

## 0. YHTEINEN RAKENNE (kaikki roolit)

Jokainen "Aloita tästä" -näkymä = kolme kerrosta:

1. **Edistymis-checklist (datavetoinen):** 3–5 askelta, kukin ✓ / kesken oikeasta pikakenttä-/datatilasta.
   Klikkaus vie suoraan oikeaan näkymään/toimintoon. Etenee itsestään kun käyttäjä toimii.
2. **Selittävä opasosio:** roolin "näin toimit" tiivis (lähde: kirjallinen opas). Avattava, ei pakota.
3. **ℹ️ kontekstuaalinen apu (`TM_SELITTEET`):** jo olemassa — laajennetaan kattavuutta yksittäisille
   luvuille/napeille.

**Sijainti:** Master-näkymässä on jo **"Aloita tästä"** -kohta → se on malli; laajennetaan muille.
**Invariantit:** §26 (pikakentät, ei uusia kyselyjä) · §7.22 (pelaaja/vanhempi: ei lukuja/vertailua) ·
Carbon §5 · §17 yksi `@media` · string concat §7.1. **Piilotettavissa** kun käyty läpi (localStorage-lippu
per rooli + "näytä opas uudelleen" -linkki).

---

## 1. VALMENTAJA (Master_v16) — laajenna olemassa olevaa "Aloita tästä"

**Checklist (pikakentistä / seuran datasta):**
1. Katso oman joukkueesi pelaajat (Pelaajat) — ✓ kun avattu.
2. Tee ensimmäinen pelihavainto (Havainnot) — ✓ kun `adar_havaintoja` > 0 jollekin pelaajalle.
3. Avaa pelaajan **Pelaajaraportti + tavoitteet** — kirjaa 1 tavoite — ✓ kun `tavoite_aktiivinen_kpl` > 0.
4. Tee **itsearvio** ohjatusta harjoituksesta (Valmentajana kehittyminen) — ✓ kun `valmennustaito_n` > 0.
5. Lue **Viestit** (pelaajien kirjaukset + VP:n mentorointi) — ✓ kun avattu.

**Opasosio:** OPAS_VP_JA_VALMENTAJA.md OSA 2 (itsearvio/reflektio/CPD, testaus, havainnot, viestit, rytmi).

## 2. VALMENNUSPÄÄLLIKKÖ (VP_v25) — uusi "Aloita tästä" (Koti)

**Checklist:**
1. Tarkista suostumussuppilo / datakypsyys (Pilotin tila on Adminissa; VP:lle joukkuepulssin kattavuus)
   — ✓ kun joukkueella ≥1 mitattu pelaaja.
2. Lue **joukkuepulssi + signaalit** (Koti) — ✓ kun avattu.
3. Tee **harjoitusarviointi** (malli A) yhdestä harjoituksesta — ✓ kun `harjoituslaatu_n` > 0.
4. Avaa **Pelaajaraportti** (Raportit) yhdelle pelaajalle — ✓ kun avattu.
5. Lähetä **mentorointiviesti** valmentajalle — ✓ kun lähetetty.

**Opasosio:** OPAS_VP_JA_VALMENTAJA.md OSA 1 (seura/joukkueet/valmentajat/pelaajat/perheet + rytmi).

## 3. VANHEMPI (Vanhempi_v2) — uusi "Aloita tästä" (Koti, ensikäynti)

**§7.22/§34: ei tasolukuja, ei vertailua, lämmin sävy.**

**Checklist (kevyt, ei datapainetta):**
1. Lähetä lapsellesi **ensimmäinen kehu** (❤️/🔥) — ✓ kun lähetetty.
2. Katso **kortti + "miten tukea kotona"** — ✓ kun avattu.
3. Lue **valmentajan viestit** — ✓ kun avattu.
4. (alle 13 v) Kokeile **Kirjaa** lapsen harjoittelu — ✓ kun 1 kirjaus.

**Opasosio:** OPAS_PERHE.md OSA 1 (kultainen sääntö, kehu, kortin luku ilman painostusta, mitä EI tehdä).
**Sävy:** kannustava, ei "tehtävälista" vaan "näin olet mukana".

## 4. PELAAJA (Pelaaja_v7) — uusi ensikäynnistys (lapsen kielellä)

**§7.22/§16: ei lukuja, ei tasoja, ei vertailua. Ikävaiheen kieli (leikkijä/rakentaja/showcase).**

**Ensikäynnistys = 3 korttia (ei "checklist"-sanaa lapselle), erittäin lyhyt:**
1. "Tässä on **Tänään** — yksi juttu jonka voit tehdä tänään. Kokeile!"
2. "Tässä on **Minä** — sinun oma korttisi ja juttusi. Se kasvaa kun treenaat."
3. "Paina **fiilis-nappia** kun haluat kertoa valmentajalle miltä tuntuu."

Toteutus: kevyt overlay/tervetulokortti ENSIMMÄISELLÄ kirjautumisella (PIN), ohitettavissa. Ei dataa, ei
tasoja — pelkkä innostava esittely. Ikävaihe määrää sävyn (`_ikavaihe`).

**Profiilin progressiivinen avautuminen (jo koodissa, ei rakenneta uudelleen — ensikäynnistys vain vihjaa):**
Minä-profiili laajenee data-tietoisesti (tekniikka, nopeus/fyysiset testit, kehon valmius/liikehallinta,
kehitysvaihe — kukin "tulossa"-tila kunnes mittaus on) JA syvenee ikävaiheittain (`_laskeStage`:
leikkijä U12 `ovrNayta:false` → rakentaja U13–15 → showcase U16+ täysi tekninen; **PHV-huippu → leikkijä**
iästä riippumatta). Ensikäynnistys voi sanoa korkeintaan "profiilisi kasvaa kun treenaat ja mittaat" —
ei tasoja/lukuja (§7.22). Sama periaate kuvattu perheelle: `OPAS_PERHE.md` OSA 2.2.

---

## 5. SEKVENSSI & VERIFIOINTI

**Suositeltu järjestys (arvo + helppous):**
1. **Pelaaja-ensikäynnistys** (3 korttia) — pienin, suora arvo perheelle, eristetty.
2. **Vanhempi "Aloita tästä"** — perhepinta, korkein adoptioarvo.
3. **VP "Aloita tästä"** — laajentaa Masterin mallia.
4. **Valmentaja** — laajenna olemassa olevaa "Aloita tästä" checklist-kerroksella.

**Per rooli: mockup → Code-komento → live-verify.** Verifiointi: new Function 0 · §17 1×@media · §7.22
(pelaaja/vanhempi: ei lukuja/vertailua — grep + silmämääräinen) · pikakentät (checklist-tilat oikeasta
datasta, ei kovakoodattu) · localStorage-lippu piilottaa käydyn + "näytä uudelleen" · version:bump · Carbon §5.

> **Status:** spec valmis. Rakennus rooli kerrallaan kun työjonoon valitaan. Kirjallinen opas
> (OPAS_VP_JA_VALMENTAJA.md + OPAS_PERHE.md) = sisältölähde kaikille opasosioille.
