# R1.3-viimeistely — konsepti-ytimen suunnitelmakonformanssi + kortin leveys · Code-brief

> **Miksi:** Tero teki visuaalisen rinnakkaistarkistuksen (suunnitelma vasen · live oikea, Aloitus). Iso osa eroista
> = **sama pelaaja eri datatilassa** → rehellinen-tyhjä toimii oikein (EI korjata). Kun ne siivoaa pois, jää **kolme
> aitoa renderöintipoikkeamaa** jotka näkyisivät täydelläkin datalla + **yksi leveysrajoitus**. Kaikki neljä hyväksytty
> korjattavaksi nyt (Tero: "Kaikki 3 nyt" + "voiko idp-kortin tehdä leveämmäksi").
> **Luonne:** ADDITIIVINEN/esitys — EI uutta laskentaa, EI lib-muutosta (→ **ei `?v`-bumppia**), EI datamallin muutosta.
> Kohteet: `_vpAloitusKonseptiYdinHTML` (rivi ~5688) + yksi CSS-rivi (`.jsp-box`, rivi 1341).
> **Verifiointi: LIVE** (Topias, laitahyökkääjä + pelipaikkapelaaja + tyhjä, molemmat teemat). Arkkitehti verifioi livenä.

---

## KOHDE

- Renderöijä: **`_vpAloitusKonseptiYdinHTML(p)`** (rivi ~5688). Kaikki muutokset tähän funktioon, `typeof`-vartioituna.
- CSS: **`.jsp-box`** (rivi 1341) — vain leveys-cap (pala 4).
- **ÄLÄ** kosketa #349:n pelipaikkakorjausta (`_vpSiltaKonsepti`) — se on hyväksytty. Konsepti-ytimen resoluutio pysyy.

---

## PALA 1 — DVI-pilli (rehellinen tyhjä) · Konsepti % jätetään R4:ään

Suunnitelmassa fokus-heron alalaidassa on rivi **"Konsepti [====62%] · DVI ↑ +0.4/kk"**. Nykyfunktio ei renderöi
kumpaakaan (pala 2 rakensi vain TEE TÄSTÄ). Lisää **DVI-pilli**; **Konsepti % jätetään pois** (ei aitoa kenttää).

- **DVI-pilli:** lue `p.dvi_suunta` (aito §26-pikakenttä: `'up'`/`'down'`/`'flat'`). Renderöi olemassa olevalla
  apurilla `_vpDviPilli(suunta, txt)` (txt: up→"kehittyy" · down→"seuraa" · flat→"vakaa", sama kuin rivit 5985/6007).
  **HONEST-EMPTY:** jos `dvi_suunta` puuttuu → **jätä pilli kokonaan pois** (älä näytä nollaa/flatia oletuksena).
  **ÄLÄ keksi suuruutta** — suunnitelman "+0.4/kk" ei ole tallennettu kenttä; render = nuoli + label, EI numeroa.
- **Konsepti %:** per-konsepti-edistymäkenttää **ei ole** (`idp_edistyma` = *kausitavoitteen* %, EI konseptin — **älä lainaa
  sitä**, älä käytä FLEI/Valmius-lukua). → **jätä Konsepti % pois** tästä palasta. Se on **R4-johdannainen**: kun R4
  kaappaa per-osa-näkyvyyden (osat_tila), % = osuus osista tilassa "itsenäisesti"(3). Dokumentoi kommentilla, älä rakenna nyt.

---

## PALA 2 — TEE TÄSTÄ: toiminta-cue seuraava-askel-osasta + sijainti + reflektio erikseen

**Ongelma (koodivarmistettu):** nyt `Cue: kys[0]` missä `kys = tmTtKysymykset(avain)` → cue on **reflektiokysymys**
(y_h1: "Minne ensimmäinen kosketuksesi vei pallon – ja miksi?"), ei toiminta-ohje. Suunnitelmassa TEE TÄSTÄ on **toiminta**
(osa b:n sisältö) ja reflektio on **erillinen** 🗣-rivi. Libissä youthin `cue`-kenttä on *itsekin* kysymys → toiminta-cuelle
ei ole omaa lähdettä; **suunnitelma johtaa sen seuraava-askel-konseptiosasta.**

**Korjaus:**
1. **Määritä seuraava-askel-osa** (`nextIdx`): matalin/ensimmäinen ei-itsenäinen konseptin osa. **Per-osa-näkyvyyttä ei ole
   vielä tallennettu** (R4 kaappaa) → **oletus = osa b** (indeksi 1, jos `item.kpi.length >= 2`, muuten indeksi 0).
   (Kommentoi: kun R4 tuo osat_tila:n, `nextIdx` = matalin näkyvyys — tämä on jatkopiste, ei nyt.)
2. **TEE TÄSTÄ cue = sen osan teksti** — `item.kpi[nextIdx].teksti` (aito konseptidata, EI parafraasi/keksitty). Näytä
   "tee tästä" + osan teksti + `harj.length` "N harjoitetta" + nappi **→ Viikko** (`_jspVaihda(4)`). Säilytä `.idp-kaction`-tyyli.
3. **Sijainti:** kiinnitä TEE TÄSTÄ **seuraava-askel-osan (nextIdx) rivin alle** osat-listassa (kuten suunnitelma: laatikko
   osa b:n alla) — EI enää yhtä globaalia laatikkoa kaikkien osien jälkeen. (Yksi TEE TÄSTÄ, oikean osan yhteydessä.)
4. **🗣 Reflektio erikseen** (amber-italic, osat-listan jälkeen): `tmTtKysymykset(avain)[0]` (reflektiokysymys — nyt cue
   vapautuu tästä). **HONEST-EMPTY:** ei kysymyksiä → reflektio-rivi pois. (Peili/pelaaja-appi pysyy ennallaan, §7.22.)

**Data-eheys:** cue tulee **konseptin osasta** (kpi), reflektio **kysymyksistä** — kaksi eri lähdettä, ei enää ristiin.
Ei osaa (kpi tyhjä) → TEE TÄSTÄ pois. Graceful kummallekin konseptityypille (youth + pelipaikka #349).

---

## PALA 3 — näkyvyys-skaffold harmaana (rehellinen tyhjä, ei pelkkää tekstiä)

**Nyt:** osat a–e näyttävät pelkän tekstin "arvioi Kehityksessä" (ei glyfejä). **Suunnitelma:** jokaisella osalla
**3-pallo-skaffold** (`●○○`/`●●○`/`●●●`) + label — harmaana kun ei arvioitu.

**Korjaus:** lisää osa-riville näkyvyys-skaffold **harmaana** (kaikki kolme rengasta `var(--ink3)`/himmeä, EI täytettyä
teal-palloa) + säilytä label "arvioi Kehityksessä". Tavoite: suunnitelman rakenne näkyy, mutta **mitään ei fabrikoida** —
harmaa skaffold = "ei vielä arvioitu", ei tasoa. **Kun R4 tuo osat_tila:n**, pallot syttyvät (1→●○○ · 2→●●○ · 3→●●●) ja
label vaihtuu ("ei näy/ohjatusti/itsenäisesti"). Käytä brändinmukaisia glyfejä (ei emoji), hiusviivat `var(--border)`.

**HONEST-EMPTY-invariantti säilyy:** harmaa skaffold EI ole arvio. Ei väri-/tasovihjettä ennen R4-dataa (§7.22/§26).

---

## PALA 4 — kortin leveys (cap ylös)

**Nyt:** `.jsp-box { … width: min(1040px, 96vw); … }` (rivi 1341). Rakenne = pysyvä vasen profiilirail **290px** +
sisältö `1fr` (`.jsp-grid`, rivi 1342) → Aloitus-sisältö nettona **≈ 680px** = ahdas vs suunnitelman ~1360px.

**Korjaus (yksi rivi):** nosta cap **`min(1040px → 1240px, 96vw)`**. Sisältö ≈ 680→**880px** (+29 %), hyödyttää kaikkia 5
välilehteä, `96vw`-suoja pitää pienet näytöt kunnossa, mobiili-@media (rivi 1966, täysleveä 1-sarake) pysyy ennallaan.
**ÄLÄ** muuta `.jsp-grid`-sarakkeita (290px + 1fr) tässä. Matalariskinen, puhtaasti leveys.

> **HUOM (erillinen, EI tässä):** img1:n *tarkka* ilme siirtää 5D-radan + Suunnitelman kaaren narratiivin **viereen**
> (2-sarake Aloitus, ei vasenta railia) — se on rakennemuutos jaettuun modaaliin → oma brief + oma verify. Tämä pala 4
> antaa vain lisää tilaa; relayout päätetään erikseen.

---

## INVARIANTIT (EHDOTTOMAT)

- **§4/§37 — mitään ei pakoteta, asiantuntija päättää:** DVI/osat/cue ovat **luku + sisääntulo**, ei lukittu. Framing
  "ehdottaa", entry "Kehitä jaksofokusta →". Vapaa muokkaus tavoitteissa + jaksofokuksessa säilyy.
- **§7.22** — näkyvyys 1–3 = kehitystila VP/valmentaja-näkymässä; pelaajan peili pysyy cue-only (ei muuteta). Harmaa
  skaffold ei ole taso.
- **§26** — vain pikakentät + lib-data (`dvi_suunta` · `tmTtKysymykset` · `item.kpi`); ei alikokoelmakyselyjä.
- **§37** — curriculum 1–3 ≠ arviointikehys 1–5, ei ristiin · **§34/§30** — asteikot erillään (ei muuteta tässä).
- **Honest-empty (tämän briefin ydin):** DVI puuttuu → pilli pois · ei per-konsepti-% → % pois · ei osat_tila → skaffold
  harmaana "arvioi Kehityksessä" · ei kpi → TEE TÄSTÄ pois · ei kysymyksiä → reflektio pois. **Mitään ei fabrikoida.**
- **Brändilukko §5** — Cormorant ei-bold · teal ainoa aksentti (täytetty pallo vain kun aito taso) · amber vain reflektio ·
  `var(--border)`-hiusviivat (EI `--border2`) · semanttinen emoji (🗣 reflektio · → Viikko) · **molemmat teemat**.

## EI TÄSSÄ

Konsepti % -laskenta (= R4, osat_tila→%) · per-osa-näkyvyyden KAAPPAUS (= R4-editori) · radar/kaari-relayout (erillinen brief)
· peilin/pelaaja-apin muutos (jo livenä) · #349-resoluution muutos · `.jsp-grid`-sarakerakenne.

## JAKO + DoD

Neljä pientä palaa, **voi yhdistää yhteen PR:ään** (kaikki matalariskisiä, samassa funktiossa + yksi CSS-rivi):
- **pala 1** — DVI-pilli honest-empty (`dvi_suunta` + `_vpDviPilli`); Konsepti % dokumentoitu R4:ään, ei rakennettu.
- **pala 2** — TEE TÄSTÄ cue = seuraava-askel-osan teksti (oletus osa b), kiinnitetty sen osan alle; reflektio = `kys[0]` erikseen.
- **pala 3** — näkyvyys-skaffold harmaana + "arvioi Kehityksessä" (ei fabrikoitua tasoa).
- **pala 4** — `.jsp-box` cap 1040→1240px.

**Per PR:** additiivinen · #349 + honest-empty pitävät (Topias `dvi_suunta` puuttuu → pilli pois todistettu · pelipaikkapelaaja
mv_p1 renderöityy · ei-kpi-konsepti graceful) · TEE TÄSTÄ tasan **kerran** oikean osan yhteydessä · cue ≠ reflektio (eri lähde) ·
Vitest + eslint vihreä · **ei `?v`-bumppia** (ei lib-muutosta) · molemmat teemat · **LIVE ennen valmista** (Topias:
DVI-pilli-tila + TEE TÄSTÄ osa b:n alla + skaffold harmaana + kortti leveämpi).
