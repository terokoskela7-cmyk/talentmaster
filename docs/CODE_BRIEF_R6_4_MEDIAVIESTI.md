# CODE_BRIEF_R6_4_MEDIAVIESTI — Mediaviesti (klippi + kysymys + vastaus)

**Kaista: Tero** (Master_v16, VP_v25, Pelaaja_v7, Vanhempi_v2, `lib/`, Rules). PR-kuvauksen ensimmäinen rivi on "Kaista: Tero".
**Tila:** sparrattu Teron kanssa 8.10.2026 · tarkastettu (projektinvetäjä) 8.10. · valmis Codelle
**Mockup:** `19_mediaviesti_kentta.html` (artefakti 19) · pohja `04_videokeskustelu_kartta.html` · V4 `18_kehitystyopoyta_v4.html`
**Päätökset:** D55–D64 (tämä briiffi) · nojaa D46–D54 (18), v3.39 (viestit.nakyvyys), K3/K4
**Tavoite:** käytössä kaikilla seuroilla 1.11.2026, Sibbo-Vargarna ensimmäisenä
**Rules:** seuraava vapaa versio mergehetkellä, arvio **v3.50** (R1 ryhmät = v3.47, P0 kalenterin tietosuoja #882 = v3.48, Seuran pulssi S1 = v3.49).

---

## §0 Periaate (07, P-taso)

Kysymys ennen vastausta: valmentajan tulkinta tulee vasta pelaajan oman havainnon jälkeen. Onnistumiset ensin. Silmukka on kolme askelta – klippi + kysymys → pelaajan vastaus → valmentajan lause – ja sulkeutuu ihmisen lauseella. Pelaaja ei näe lukuja, vertailua eikä valmentajan viivettä (§7.22). Oto-valmentajaa ohjataan pohjilla, ei säännöillä (D50). VP voi aina tehdä kaiken.

## §1 Mitä tämä on

Valmentaja liittää pelaajalle https-linkin (VEO, YouTube, kuva, muu) ja yhden kysymyksen. Viesti on `seurat/{sid}/viestit`-dokumentti – **Inboxin ominaisuus, ei Kenttä-lipun**. Lippu päättää vain, pääseekö valmentaja sheettiin V4:n ⋯-valikosta; Inboxin ＋-nappi toimii aina. Pelaaja vastaa ikätasonsa mukaan, huoltaja on mukana U8–14, valmentaja kuittaa yhdellä lauseella.

**Ei tässä briiffissä (v2 / M3):** lataus Storageen ja videolupa, upotus ja esikatselukuvat, push ja sähköpostikooste, harjoitusaikarajaus, ryhmälähetys (R1), klippien ketju katselmukseen, joukkueen yhteinen katselu kalenterissa.

---

## §2 Osat

### M1 · minimi 1.11. — kaksi PR:ää samasta briiffistä

**PR 1 · data, Rules, lähetys, Inbox (Master + VP_v25)**

| # | Tehtävä | Päätös |
|---|---|---|
| 1 | Klippiviesti `viestit`-kokoelmaan, kentät §3. Rules v3.49. | D56, D59 |
| 2 | Lähetyssheet: V4 ⋯ "Lisää klippi" (nyt harmaa → aktiivinen) ja Inbox "＋ klippi". Kuusi kenttää, pakollisia linkki ja kysymys. Tyyppi vaihtaa kysymyspohjat. Osa pelaajan aktiivisesta jaksosta tai tukitavoite, valinnainen. | D57 |
| 3 | Linkin käsittely: vain `https://`, ≤ 500 merkkiä; `domain` = host; `mediatyyppi` domainista (veo.co / youtube / youtu.be / vimeo → video; kuvapäätteet → kuva; muu → linkki); VEO `t=`-parametri → kohta. Ei oEmbed-, ei esikatselukutsuja. Linkki avautuu uuteen välilehteen, domain näytetään aina. | D56 |
| 4 | Vastaanottaja: yksi / valitut / koko joukkue → monistus per pelaaja `writeBatch`illa, sama `klippi_id`. Joukkueklipissä ei osaa, kysymys tilanteesta, vastaus valinnainen. | D60 |
| 5 | Suostumusvartija (tarkennettu 8.10.): `odottaa_lupaa` on **johdettu näyttötila**, ei erillinen lähetysvaihe. Viesti tallentuu heti (`tila:'lahetetty'`); Inbox näyttää "odottaa lupaa", kun pelaajan `suostumusTila ≠ 'annettu'`, ja lähetysnapin teksti on "Tallenna – näkyy kun lupa on annettu". Ei CF:ää eikä uudelleenlähetystä: pelaaja pääsee kirjautumaan vasta suostumuksen jälkeen (PIN syntyy `vahvistaSuostumus`ssa), ja **huoltajan lukuoikeus klippiin vaatii Rulesissa pelaajan `suostumusTila == 'annettu'`** (huoltajalla voi olla sähköposti ennen suostumusta). Ei erillistä videolupaa. | D58 |
| 6 | `nakyva_alkaen` = seuraava klo 07, jos lähetys klo 21–07. Pelaajan ja huoltajan kyselyt suodattavat; Inbox näyttää heti. | D62 |
| 7 | Inbox-rivi 🎬: tilat odottaa (harmaa) · vastattu (teal) · perhe kuittasi (sininen) · odottaa lupaa (amber). Joukkueklipistä yksi koottu rivi ("11/18 katsonut · 4 vastausta"). Rivi vastuuhenkilölle (`pelaaja.vastuuhenkilo`), muuten lähettäjälle. | D59, D60 |
| 8 | Ketjunäkymä: klippi, kysymys, vastaus, kuittauslause ≤ 120 → `tila:'suljettu'`. Ei neljättä viestiä. | D59 |
| 9 | KIELLETYT-vartija saatteessa ja kuittauksessa (sama funktio kuin kevyt katselmus). | D62 |
| 10 | Kaikki tekstit kielikerrokseen. **Code kirjoittaa vain fi** (CLAUDE.md §0: sv vain Geminin kautta) ja tekee PR:ään Geminin käännöslistan; Tero tuo sv-käännökset Geminiltä, ja ne lisätään samaan PR:ään ennen mergeä. Kysymyspohjat 3 × 3 rekisteriä (Leikkijä / Rakentaja / Showcase) × 2 kieltä. Vartija: ei kovakoodattuja merkkijonoja. | D55, D62 |

**PR 2 · pelaaja ja perhe (Pelaaja_v7 + Vanhempi_v2)**

| # | Tehtävä | Päätös |
|---|---|---|
| 11 | Pelaaja_v7: Tänään-signaalin rivi "Valmentajalta klippi" (D48 järjestys, kohta 6). Ketjunäkymä: valmentajan nimi ja päivä, linkki ulos + domain, saate, kysymys. Vastaus U13–14: 3 vaihtoehtoa + "omin sanoin" ≤ 200; U15+: lause. Vastauksen jälkeen "Vastasit · valmentaja lukenut". Teksti "Huoltaja näkee tämän keskustelun" (U13–17). | D57, D59 |
| 12 | Vanhempi_v2: kortti "Katsokaa yhdessä" (U8–12): klippi, saate, kysymys, lapsen 3 valintaa, rasti "Katsoimme yhdessä", "Lähetä valmentajalle". U13+: ketju lukutilassa. | D57, D59 |
| 13 | Tyyppien pelaajanimet: Onnistuminen · Katsotaan yhdessä · Tilanne. Ei lukuja, ei muiden vastauksia, ei "11/18". | D62, §7.22 |
| 14 | Rules (v3.50 arvio): huoltaja saa luoda `klippi_vastaus` / `klippi_kuittaus` omalle lapselleen. | D59 |

**M1:n karsintajärjestys, jos aika loppuu:** ensin joukkueen koottu Inbox-rivi (18 riviä kelpaa), sitten U15+-erottelu (kaikki U13+ saavat vaihtoehdot + lauseen).

### M2 · marraskuu (ennen 1.12. poistoa)

| # | Tehtävä | Päätös |
|---|---|---|
| 15 | Polun osarivi 🎬 n; kevyen katselmuksen kysymys 1 saa "n klippiä tästä jaksosta" -linkin (ei automaattista päättelyä). | D61 |
| 16 | `tm_kentta.js`: merkkidataan `klippeja: n` → osan merkin kulmassa piste; henkilökunnalle määrä, pelaajalle pelkkä piste. Ei uutta merkkityyppiä. | D61 |
| 17 | Pelaajan oma klippi U15+ ("Tässä onnistuin" / "Tätä haluan kysyä", vain video-domainit) – **vain jos** Rules voi tarkistaa ikävaiheen pelaajadokumentista helposti. | D59 |
| 18 | VP Tilanne (17:n kooste): klippejä 30 pv · vastattu % · perhe mukana % · odottaa suostumusta n + poikkeamarivi joukkueittain. Tyyppien suhde ohjauksen tueksi. Ei paremmuuslistaa (D42). | D59 |
| 19 | `jaksofokus_historia[].klippeja` jakson sulkeutuessa. | D61 |

### M3 · v2 — ks. §1 "ei tässä".

---

## §3 Data

Polku `seurat/{sid}/viestit/{id}`. Ei uutta kokoelmaa.

| Kenttä | Arvo | Kirjoittaa |
|---|---|---|
| `tyyppi` | `'klippi' \| 'klippi_vastaus' \| 'klippi_kuittaus'` | henkilökunta / pelaaja / huoltaja |
| `url` · `domain` · `mediatyyppi` | https ≤ 500 · host · `video\|kuva\|linkki` | henkilökunta |
| `kohta_s` | int, valinnainen (VEO `t=`) | henkilökunta |
| `klippityyppi` | `onnistui\|prosessi\|tulos` | henkilökunta |
| `kysymys` · `kysymys_avain` | ≤ 160 · pohjan avain tai `null` | henkilökunta |
| `saate` | ≤ 120 | henkilökunta |
| `osa` · `tukitavoite_id` | `'a'\|'b'\|'c'` tai id, valinnainen | henkilökunta |
| `klippi_id` | sama kaikille monistetuille | henkilökunta |
| `pelaajaId` · `nakyvyys` | yksi · `'pelaaja'` (U13+) / `'huoltaja'` (U8–12) | henkilökunta (v3.39) |
| `vastaanottajaUid` | vastuuhenkilö tai lähettäjä | henkilökunta |
| `tila` | `lahetetty\|odottaa_lupaa\|vastattu\|suljettu` | henkilökunta; `vastattu` johdetaan vastausdokumentista |
| `nakyva_alkaen` | timestamp | henkilökunta |
| `kuittaus_lause` | ≤ 120 | henkilökunta (lähettäjän päivitys omaan dokumenttiin) |
| **vastaus:** `vastaus_viestille` · `valinta` · `teksti` · `kuittaus` | viite · pohjan avain · ≤ 200 · bool | pelaaja / huoltaja |

Kyselyt: pelaaja `pelaajaId == pid && nakyvyys == 'pelaaja' && nakyva_alkaen <= nyt`; huoltaja sama + `'huoltaja'`; Inbox `vastaanottajaUid == uid`, ryhmittely `klippi_id`:llä clientissä. Indeksi `pelaajaId + nakyvyys + nakyva_alkaen`.

## §4 Rules (v3.50 arvio; additiivinen, ei migraatiota)

1. `viestit` create (henkilökunta): `tyyppi == 'klippi'` → `url` string, alkaa `https://`, ≤ 500; `klippityyppi` enum; `kysymys` ≤ 160; `saate` ≤ 120; `nakyvyys in ['pelaaja','huoltaja']`; `pelaajaId` string.
2. Pelaajan luonti (`viestiPelaajanLuonti`): sallitaan `tyyppi in ['klippi_vastaus']`, `vastaus_viestille` string, `teksti` ≤ 200, **ei `url`:ia** (ennallaan), `nakyvyys:'pelaaja'` pakotettu.
3. **Uusi:** huoltajan luonti `onLapsenHuoltaja(seuraId, pelaajaId)` → `tyyppi in ['klippi_vastaus','klippi_kuittaus']`, samat rajat, ei `url`:ia.
4. Kuittaus `klippi`-dokumenttiin: **lähettäjä, vastaanottaja (`vastaanottajaUid` = vastuuhenkilö, joka saa vastauksen Inboxiinsa) tai johto/SA** saa päivittää `affectedKeys().hasOnly(['kuittaus_lause','tila'])`, `kuittaus_lause` ≤ 120, `tila in ['vastattu','suljettu']`. Vastaanottajan `luettu`-päivitys ennallaan.
4b. Huoltajan luku `klippi`-dokumenttiin vaatii lisäksi pelaajan `suostumusTila == 'annettu'` (D58).
5. Pelaaja/huoltaja eivät lue toisten pelaajien klippejä (v3.39 `pelaajaId`-ehto riittää).
6. M2 (jos helppo): U15+ oma klippi – pelaaja saa kirjoittaa `url`:n kun `tyyppi == 'klippi_oma'` ja pelaajadokumentin ikävaihe ≥ U15 (`get()`); muuten M3.

## §5 Testit (KPV P13:n nimetyt testipelaajat: Topias, Toppari Testi, Testi Pelaaja, Testi Test, Tero Testaaja; Rules-testit emulaattorissa. Ei kirjoituksia Sibbon oikeille pelaajille.)

1. Lähetys yhdelle: dokumentti syntyy, `domain`/`mediatyyppi` oikein VEO-, YouTube-, kuva- ja muulle linkille; `http://` hylätään (Rules + client).
2. Koko joukkue: n dokumenttia samalla `klippi_id`:llä, Inboxissa yksi koottu rivi; pelaaja näkee vain oman.
3. Suostumus puuttuu → Inbox näyttää "odottaa lupaa"; huoltaja ei lue klippiä (Rules); suostumus `annettu` → näkyy pelaajalle ja huoltajalle ilman uutta kirjoitusta.
4. Lähetys klo 22 → `nakyva_alkaen` seuraava 07; pelaajan kysely ei palauta ennen sitä; Inbox näyttää heti.
5. Pelaaja vastaa (U13): vastausdokumentti ilman `url`:ia, lähettäjän rivi tilaan vastattu; pelaaja ei voi kirjoittaa `url`:ia (Rules hylkää).
6. Huoltaja kuittaa (U10): sallittu omalle lapselle, hylätty toiselle pelaajalle.
7. Valmentajan kuittauslause → `suljettu`; muu kenttä päivityksessä → Rules hylkää.
8. KIELLETYT-sana saatteessa → ei tallennu; 121 merkkiä → ei tallennu.
9. Pelaajan näkymässä ei lukuja, ei "11/18", ei muiden vastauksia; tyyppien pelaajanimet oikein; sv-kielellä kaikki tekstit (ei kovakoodattuja merkkijonoja – vartija).
10. VP näkee ketjun porautuessaan; toisen seuran VP ei näe.
11. Vastuuhenkilö (ei lähettäjä) voi kuitata ketjun; toisen joukkueen valmentaja ilman roolia ketjussa ei voi.
12. 390 px: lähetyssheet ja pelaajan ketju ilman vaakavieritystä.
13. Testidata palautetaan.

## §6 Päätökset D55–D64

| # | Päätös | Tila |
|---|---|---|
| D55 | Vain uuteen polkuun (V4 + Inbox + pelaaja-/perhe-app); kaikki seurat, siirto 1.11.; uudet tekstit fi + sv (sv Geminiltä) samassa PR:ssä, vartija kovakoodatuille | lukittu 8.10. |
| D56 | v1 vain https-linkit, tyyppi domainista, domain näytetään, ei upotusta/esikatselua; lataus v2 | lukittu 8.10. |
| D57 | Kuusi kenttää (linkki + kysymys pakollisia); tyyppi onnistui/prosessi/tulos vaihtaa kysymyspohjat; kolmen askeleen silmukka; oletus onnistui | lukittu 8.10. |
| D58 | Yleinen suostumus riittää; ilman sitä "odottaa lupaa" (johdettu tila, huoltajan luku Rulesissa vasta suostumuksella); ei erillistä videolupaa v1:ssä | lukittu 8.10. |
| D59 | Kolme askelta; näkyvyys v3.39-sanastolla; VP näkee porautuessaan; vastaus vastuuhenkilölle; oma klippi U15+ vain jos Rules helppo | lukittu 8.10. |
| D60 | Yksi / valitut / koko joukkue, monistettu per pelaaja (`klippi_id`); joukkueklipissä ei osaa, vastaus valinnainen, koottu Inbox-rivi | lukittu 8.10. |
| D61 | Klippi kiinnittyy osaan/tukitavoitteeseen; Polun rivi 🎬 n; osan merkissä piste (määrä henkilökunnalle); katselmukseen linkki; ei uutta merkkityyppiä | lukittu 8.10. |
| D62 | KIELLETYT-vartija; pelaajanimet Onnistuminen / Katsotaan yhdessä / Tilanne; kysymyspohjat 3 rekisteriä fi + sv; toimitus klo 7–21, harjoitusaika v2 | lukittu 8.10. |
| D63 | Ilmoitukset vain sovelluksessa v1:ssä; ei sähköpostia, ei pushia | lukittu 8.10. |
| D64 | M1 (1.11.) / M2 (marraskuu) / M3 (v2); M1 kahtena PR:nä; karsintajärjestys koottu rivi → U15+-erottelu | lukittu 8.10. |

## §7 Coden selvitykset ennen koodausta (eivät päätöksiä)

- (a) Onko huoltajalle jo `onLapsenHuoltaja`-pohjainen luontisääntö jossain kokoelmassa, jota voi kopioida?
- (b) Onko Inboxissa (`renderInbox`) ryhmittelyä valmiina vai tehdäänkö `klippi_id`-kooste clientissä?
- (c) Onko kielikerroksessa ikärekisterikohtainen avainrakenne (Leikkijä/Rakentaja/Showcase) vai pelkkä fi/sv?
- (d) Kuka asettaa `nakyva_alkaen`-siirron – client vai pieni CF `europe-west1`? Suositus client (ei uutta funktiota), CF vain `odottaa_lupaa`-lähetykseen, jos suostumus-triggeri on jo olemassa.

## §8 Tarkastuksen huomiot (8.10., projektinvetäjä)

- **D55:n seuraus — kaikki seurat Kenttä-lipulle 1.11.:** Sibbo saa samalla V4:n ja pelaajan Kentän (K1–K4). Edellytykset ennen lipun kääntämistä Sibbolle: K1–K4:n ja V4:n **sv-tekstit Geminiltä** (lista kootaan erikseen), V4b-1 Näyttö kattaa kaiken vanhasta kortista (✅ #872), ja Sibbon VP/valmentajille lyhyt opastus. Lipun kääntö seuraa kohtaa `liput/julkiset.kentta` (Tero). Jos sv ei ehdi, Inboxin ＋-nappi toimii lipusta riippumatta (§1), joten mediaviesti voi lähteä Sibbolla ilman lipun kääntöä.
- **Kalenterin tietosuoja (#882, v3.48)** on mergettävä ennen tätä; sama periaate pätee viesteihin: pelaaja/huoltaja lukee vain omansa (v3.39 `pelaajaId`-ehto + kyselyn ehdot).
- **Sanasto D54:** mockup 19:n Kenttä-tarrat "ase" → "ydinvahvuus"/"sinun vahvuutesi" korjattu repoversiossa.
- Mockup 19 lataa fontit Google Fontsista (vain design-dokumentti) — toteutus `@fontsource` (D11).
