# Arviointi — rauhallinen ilme: provenienssi muotokoodaukseen (teal ainoa aksentti, v3) · Code-brief

> **Miksi:** Tero vertasi Ouraan — rauhallinen = **vähän väriä, muoto kantaa, tilaa**. Live-Arviointi koodaa provenienssin
> KOLMELLA VÄRILLÄ (🟢 teal · 🔵 **sininen** · 👁 **pinkki #c060a8**) + kattavuuspalkki sini-teal-liukuvärinä. **Pinkki
> #c060a8 EI ole brändipaletissa lainkaan** (drift). v3-kartta koodaa saman **muodolla, teal ainoana aksenttina**:
> ● täysi teal (mitattu) · ○ ontto rengas (havaittu) · ⊘ katkoviivarengas (pelihavainto). Sama Oura-periaate + oma
> brändilukko ("teal ainoa aksentti, status-sävyt himmennettyinä ja säästeliäästi"). **Live ajautui väreihin → rauhaton.**
> **HUOM:** selittävä scaffolding on jo `_jspArvSelit`-tapin takana (default kiinni) — sitä EI korjata. Tämä on **väri/merkki-korjaus.**
> **Kartta (SSOT):** `ARVIOINTI_KISS_design_kartta_v3.html` `.pmark` (muotokoodaus) + `.covc .cbar b` (teal, aukko amber).
> **Luonne:** CSS + merkkien vaihto (emoji → muoto-span). Ei sisältölogiikkaa, ei arviointikoneistoa. Ei `?v`.

## CODE-SÄÄNNÖT (protokolla)
- Poikkeama = ilmoita ENNEN · reuse yli reimplementoinnin · älä koske havaittu 1–5 autosaveen / silta / kalibraatio / ADAR-logiikkaan.

---

## MUUTOKSET (v3:n mukaan — teal ainoa aksentti)

**1. Provenienssimerkki → muotokoodaus (v3 `.pmark`), korvaa emoji 🟢🔵👁:**
```css
.jsp-arv-pmark { width:9px; height:9px; border-radius:50%; display:inline-block; flex:0 0 auto; vertical-align:middle; }
.jsp-arv-pmark.mit  { background: var(--teal); }
.jsp-arv-pmark.hav  { background: transparent; border: 1.5px solid var(--ink2); }
.jsp-arv-pmark.peli { background: transparent; border: 1.5px dashed var(--ink3); }
```
Korvaa **kaikki** 🟢/🔵/👁-emojit (legendit · ryhmäotsikot · per-rivi-prov · pelihavainto-badge) näillä muoto-spaneilla.

**2. Ryhmäotsikot `.jsp-arv-ghd` — pois sininen/pinkki:**
```css
.jsp-arv-ghd.mit  { color: var(--teal); }   /* säilyy */
.jsp-arv-ghd.hav  { color: var(--ink2); }   /* oli var(--blue) → neutraali */
.jsp-arv-ghd.peli { color: var(--ink2); }   /* oli #c060a8 → neutraali */
```
Erottelu tulee **muotomerkistä + tekstistä**, ei kolmesta väristä. (Otsikkoteksti teal-eyebrow tai neutraali ink2.)

**3. Kattavuuspalkki `.jsp-arv-covfill` → teal (aukko amber), pois sini-teal-liukuväri:**
```css
.jsp-arv-covfill { background: var(--teal); }                 /* oli linear-gradient(sininen→teal) */
.jsp-arv-covcell.thin .jsp-arv-covfill { background: var(--amber); }   /* aukko = amber (v3 .covc.thin) — jos 'thin'-luokkaa ei ole, lisää kun arvioitu < ~40% */
```

**4. Poista pinkki #c060a8 KOKONAAN:** `.jsp-arv-gfill.peli` (pelihavainto-palkki) → teal tai neutraali himmeä; `.jsp-arv-pelih`
(badge) → teal/ink-pohjainen (`rgba(40,176,144,.12)` + `var(--teal)`) tai neutraali, EI pinkki. Grep-varmista: **0 esiintymää `c060a8`.**

**5. Sininen säästeliäästi:** `.jsp-arv-attrib`/legend-tekstissä oleva 🔵-sininen → neutraali ink2 tai muotomerkki.
Palloliitto-arvio-konteksti (badge) voi säilyttää sinisen sanktioidun sekundäärin, mutta provenienssi-koodaus ei ole värillä.

---

## INVARIANTIT + DoD
- **Brändilukko §5:** **teal ainoa aksentti** · pinkki poistettu (0× c060a8) · sininen vain säästeliäs sanktioitu ·
  amber vain aukko/varoitus · muotokoodaus (● / ○ / ⊘) kuten v3. Molemmat teemat.
- **Ei toiminnallista muutosta:** provenienssin *merkitys* (mitattu/havaittu/pelihavainto) säilyy — vain esitys muuttuu
  väristä muotoon. Havaittu 1–5 autosave · silta · ADAR · kalibraatio ennallaan.
- **Rauhallisuus (Oura):** vähemmän väriä → tyynempi silmäiltävyys; koodaus luettavissa muodosta.
- **LIVE ennen valmista (protokolla):** Arviointi-tab: provenienssi ● täysi teal / ○ ontto / ⊘ katkoviiva (legend + otsikot +
  rivit) · kattavuus teal (aukko amber) · **ei pinkkiä missään** · sininen minimissä · molemmat teemat · assessment toimii.
  Vitest + eslint vihreä. Ei `?v`.

## EI TÄSSÄ
Rivien "otsikko vasen · arvo oikea" -jako (by-design, v3) · leveyskatto (tehty #369) · selittävä ⓘ-lohko (jo tapin takana).
