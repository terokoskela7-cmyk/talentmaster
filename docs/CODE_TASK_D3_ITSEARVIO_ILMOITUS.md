# D3-itsearvio-ilmoitus — pelaajan itsearvio tavoittaa valmentajan + VP:n (kalibrointikutsu)

> Lähde: live-löytö 2026-07-05 (Selina Autio teki D3-itsearvion `d3_varmuus='itsearvio'`, mutta valmentaja/VP eivät saa siitä ilmoitusta). Pelaajalle sanotaan "tämä auttaa valmentajaa tukemaan sinua" — mutta signaali ei tavoita aikuisia → itsearvio jää hyödyntämättä (ei kalibrointia trianguloiduksi). Kohde: `TalentMaster_VP_v25.html` (signaalit) + `TalentMaster_Master_v16.html` (valmentajan inbox/signaali). §26 · §32 · §7.22. **Ei uutta dataa/kirjoitusta/Rules-muutosta — täysin §26-pikakentistä johdettu.**

## 1. Ydin
`d3_varmuus='itsearvio'` = pelaaja on arvioinut itsensä, **valmentaja ei vielä** → kalibrointi (pelaaja + valmentaja → `'trianguloitu'`) kesken. Nosta tästä **signaali** VP:lle ja valmentajalle, joka ohjaa lisäämään oman D3-arvion (olemassa oleva "Arvioi (VP)" -toiminto). Signaali **poistuu automaattisesti** kun `d3_varmuus` muuttuu `'trianguloitu'`:ksi.

## 2. VP (VP_v25 — signaalit §19/§26)
Lisää `renderSignals`-kokonaisuuteen uusi kattavuussignaali (kuten S6–S9, ladatusta `_pelaajat`-datasta, ei uutta kyselyä):
- **Ehto:** pelaajat joilla `d3_varmuus === 'itsearvio'` (koko seura / valittu joukkue).
- **Teksti:** "D3-itsearvio odottaa kalibrointia — N pelaajaa arvioi itsensä, lisää valmentajan arvio" (amber).
- Klikkaus → suodattaa/vie pelaajalistaan tai avaa ensimmäisen (kuten muut signaalit). Per-pelaaja-kortin D3-osiossa on jo "Arvioi (VP)" (kalibraation aloitus).

## 3. Valmentaja (Master_v16 — inbox/signaali §32)
Valmentaja näkee **omien pelaajiensa** itsearviot (joukkue/joukkueet[] §18):
- **Inbox-tapahtuma** (`_getInboxEvents`-tyylinen) TAI Kehitys/pelaajalista-signaali: "🧠 {pelaaja} teki D3-itsearvion ({pvm}) → lisää oma arviosi" kun `d3_varmuus==='itsearvio'`. Purple/psyyk-tagi.
- Klikkaus → pelaajan D3-arviointi (kalibrointi). Kun valmentaja tallentaa → `d3_varmuus='trianguloitu'` (Pelaaja_v7-logiikan `d3Varmuus(lahteet)` — sama funktio kirjoittaa, kun molemmat lähteet) → signaali poistuu.
- Rajaus §26: lukee `d3_varmuus`/`d3_pvm`-pikakentät ladatusta pelaajadatasta, ei alikokoelmakyselyä.

## 4. §7.22
Signaali on **aikuisnäkymä** (VP/valmentaja). D3-itsearvion tasolukua EI näytetä pelaajalle talenttiarviona (jo §7.22-suojattu Pelaaja_v7:ssä). Signaali ei muuta pelaajanäkymää.

## 5. Invariantit + verifiointi
§26 (pikakentistä `d3_varmuus`/`d3_pvm`, ei uutta kyselyä/kirjoitusta) · §32 (olemassa olevat signaali-/inbox-polut, ei uutta infraa) · §7.22 (aikuisnäkymä) · §5 · ei version.json-bumppia · ei Rules-muutosta. Vitest jos apurifunktio (esim. `d3OdottaaKalibrointia(p)` = `p.d3_varmuus==='itsearvio'`). **Live-verifio SJK: Selina Autio (`d3_varmuus='itsearvio'`) → VP-signaali "D3-itsearvio odottaa kalibrointia" näkyy + Selinan valmentajan Master-näkymässä inbox/signaali; kun VP/valmentaja lisää D3-arvion → `trianguloitu` → signaali poistuu.** `npm test` + lint.

## 6. Vaiheistus
- **A:** VP-signaali (renderSignals) — nopein, näkyy heti.
- **B:** Master-valmentaja-signaali/inbox.
Yksi PR tai A→B. Ei push-notifikaatiota (sähköposti/push = Sprint 6–7, §32); tämä on in-app-signaali.
