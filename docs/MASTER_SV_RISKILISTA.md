# MASTER_SV_RISKILISTA — dual-use- ja logiikka-stringit (EI data-i18n-karttaan)

Lähde: `TalentMaster_Master_v16.html` (9 792 riviä, valmentajan näkymä).
Kartta: `docs/MASTER_SV_KAANNOSMUISTI.json` (1 194 avainta, validi JSON).
Alla olevat stringit näytetään käyttäjälle MUTTA niitä myös verrataan koodissa,
tallennetaan Firestoreen tai käytetään logiikassa — eivät sovi sokeaan
data-i18n-korvaukseen, vaan vaativat näyttökerros-mappauksen tai koodimuutoksen.

---

## 1. Enum-arvot, jotka renderöidään raakana ruudulle

### 1.1 Kalenteritapahtuman `tila`
- **Rivi 8520:** `addRow('Tila', t.tila || '—')` — enum-arvo (`'suunniteltu'` /
  `'vahvistettu'` / `'valmis'` / `'peruttu'` jne.) näytetään sellaisenaan.
- Arvoa verrataan koodissa useissa kohdissa.
- **Päätös:** ei karttaan. Tarvitaan display-mappi (esim. `_tilaLbl`) kuten
  aiemmassa SV-forkissa tehtiin.

### 1.2 IDP-tavoitteen status-fallback
- **Rivi 6365:** `(st === 'aktiivinen' ? '● Aktiivinen' : st === 'ehdotettu' ?
  '○ Ehdotettu' : _mEsc(st))` — tunnetut tilat kääntyvät kartalla
  ("● Aktiivinen"→"● Aktiv", "○ Ehdotettu"→"○ Föreslagen" ovat kartassa), mutta
  tuntematon status renderöityy raakana `_mEsc(st)`:llä.
- **Päätös:** fallback vaatii display-mapin. Kartassa oleva "Kesken"→"Pågående"
  on turvallinen vain jos korvaus on **case-sensitiivinen** (enum `'kesken'`
  pienaakkosin — ks. §5.1).

### 1.3 RSVP-saatavuus `'tulossa'` / `'estynyt'`
- **Rivit 8667, 8669:** lasketaan `state[pid].saatavuus`-enumeista ja
  renderöidään dynaamisesti: `'RSVP: ' + rsvp.tulossa + ' tulossa · ' + rsvp.estynyt + ' estynyt'`.
- **Päätös:** ei karttaan (dynaaminen + enum). SV-suositus:
  `RSVP: {x} kommer · {y} förhindrade`.

## 2. Briefin §3 mukaiset no-translate-arvot (löydökset + rivit)

| Kategoria | Esimerkkirivejä | Huom |
|---|---|---|
| Kirjaustyypit `'T'/'D'/'S'/'P'` | 5330, 6823, 9561 | indeksilaskenta |
| Cadence-avaimet `'kerran'/'viikoittain'/'2_viikottain'/'kuukausittain'` | 7814, 9086, 9095, 9101–9103, 9188 | option/select **value**-attribuutit; näyttönimet ("En gång", "Varje vecka"…) OVAT kartassa |
| Poisto-scope `'vain'/'seuraavat'/'sarja'` | 8789, 8796, 8812, 8818, 8824, 8898 | näyttönimet kartassa ("Endast detta" jne.) |
| Ilmoituskadenssi `'paivittain'/'viikoittain'` | 7804, 7814 | option value; näyttö "Varje dag/vecka" kartassa |
| sukupuoli `'M'/'N'` | 2041, 2044–2045, 2771, 4948–4949 ym. (14 kpl) | EI käännetä pojke/flicka-muotoon |
| lahde `'manuaalinen'/'catapult'/'polar'` | 8535, 9175 | |
| Testi-id:t | 2618–2623 ym. (25 kpl) | briefin §3.4-lista: lin_5m…pituuspotku |
| Työtila-avaimet `setWs('koti'…'testit')` | nav-lohko ~1590–1660 | data-ws-attribuutit; näyttölabelit (Inbox/Idag/Puls/Utveckling/Säsong/Kalender/Tester) kartassa |

## 3. Pelipaikat, joukkuenimet, roolit

- Pelipaikka- ja joukkuenimet ovat **dataa** (Firestore), ei karttaan.
- Master-tiedostosta ei löytynyt suoria `=== 'Maalivahti'`-tyyppisiä
  vertailuja pelipaikoille, mutta Pelaaja-näkymän POS-mappi riippuu
  samoista suomenkielisistä arvoista — älä käännä dataa.
- Roolistringit (`'valmentaja'`, `'talenttivalmentaja'` jne.) pienaakkosin
  Custom Claims -arvoina — ei karttaan. Näyttömuodot (Huvudtränare,
  Talangtränare, Testansvarig, Sportchef) ovat kartassa.

## 4. Demo-data

- Demo-pelaajien suomalaiset nimet jätetty (dataa).
- Demo-TEKSTIT käännetty karttaan: kausitekstit ("Kausi 25/26"→"Säsong 25/26"),
  kalenterisignaalit, omatoimi-demot ("3&nbsp;vs&nbsp;3 piha"→"3&nbsp;vs&nbsp;3 gård" jne.).
- Huom: demo-signaalin "Kuormitus nousussa…" -teksti esiintyy kahdessa muodossa
  (JS-stringissä `\u00a0`-escape ja HTML:ssä `&nbsp;`-entiteetti) — kartassa
  molemmat variantit tavu-tarkasti.

## 5. Tekniset ankat

### 5.1 Case-sensitiivisuusvaatimus
Kartassa on avaimia jotka ovat case-erolla erotettu enum-arvoista
("Kesken" vs `'kesken'`, "Saavutettu" vs `'saavutettu'`). Sweep-funktion
on oltava **case-sensitiivinen** tai nämä avaimet pitää jättää kytkemättä.

### 5.2 Split-tekstit (tagi katkaisee lauseen)
- Rivi 3667: `Kuitatut löytyvät <b>Arkisto</b>-välilehdeltä` — kolme
  tekstisolmua; kartassa "Kuitatut löytyvät"→"Kvitterade finns" ja
  "Arkisto"→"Arkiv", mutta ruotsin sanajärjestys ei toimi
  osa-korvauksilla → **käsiteltävä koodissa** (suositus: koko lause
  "Kvitterade finns i fliken <b>Arkiv</b>").

## 6. Dynaamiset (muuttujia sisältävät) tekstit — käännettävä koodissa

| Rivi | FI (pohja) | SV (suositus) |
|---|---|---|
| 3483 | `{n}/{tot} valittu` | `{n}/{tot} valda` |
| 3990 | title: `{nimi} · {pv}: {v} kirjausta · fiilis {x}` | `{n} registreringar · mående {x}` |
| 4046 | toast `{nimi} kirjasi treenin` | `{nimi} registrerade ett pass` |
| 4512 | `{nimi} · Peliäly {x} · {n} havaintoa` | `{n} · Spelintelligens {x} · {n} observationer` |
| 5869 | `{n} vaihetta · {x} vk` | `{n} faser · {x} v` |
| 6715 | `Pallo hidastaa pelaajaa {x}s verrattuna pallottomaan nopeuteen. Tavoite: alle 0.5s.` | `Bollen saktar spelaren {x} s jämfört med farten utan boll. Mål: under 0,5 s.` |
| 7945 | `{n}/{m} kahdesti mitattua parani` / `tarvitsee 2 mittausta/pelaaja` | `{n}/{m} av två uppmätta förbättrades` / `kräver 2 mätningar/spelare` |
| 8065 | `{n} pelaajaa · {x} signaalia · {y} testiä ({z} avoinna) · {k} kirjausta` | `{n} spelare · {x} signaler · {y} tester ({z} öppna) · {k} registreringar` |
| 8268 | `{x}/{n} kirjasi RPE:n` | `{x}/{n} registrerade RPE` |
| 8297 | `{x}/{n} kirjasi fiiliksen` | `{x}/{n} registrerade måendet` |
| 8669 | `RSVP: {x} tulossa · {y} estynyt` | `RSVP: {x} kommer · {y} förhindrade` |

Lisäksi toast-/confirm-templateja löytyy rivivyöhykkeiltä 4606, 6079, 6429,
7055, 7895 — sama kaava: interpoloidut nimet/luvut ruotsinnetaan koodissa,
staattiset osat löytyvät kartasta.

## 7. Yleishuomiot

- **`lib/`-riippuvuudet:** osa näkyvistä teksteistä tulee lib-tiedostoista
  (tm_eerikkila_normit, tm_teknistaktiset ym.). Ne on käännetty erikseen
  (`lib_sv/`-kansio, oma luovutusbriefi) — jos Master kytketään lib_sv:hen,
  huolehdi ettei samaa tekstiä korvata kahteen kertaan.
- **tm_lang.js** on valmiiksi kolmikielinen (fi/sv/en) — pitkän tähtäimen
  ratkaisu olisi siirtää tekstit sinne.
- Kartassa on identtisiä avain=arvo-pareja (esim. "Inbox", tuotetermit
  X-Factor / Hidden Gem / Underdog — briefin §5 mukaisesti säilytetty
  englanniksi).
