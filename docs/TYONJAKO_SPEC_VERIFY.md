# TYÖNJAKO — TalentMaster spec & verify -silmukka

Kanoninen roolijako TalentMasterin kehityssilmukalle. Jokainen kickoff viittaa tähän.
Tavoite: **yksi git-kirjoittaja, yksi review-portti, ei committaamatonta tilaa kädestä toiseen.**

## Roolit (kiinteät)

**Tero — omistaja + portinvartija.**
- Antaa kickoffit Codelle.
- Painaa **merge-napin** — vasta vihreän verdictin jälkeen.
- Ottaa **live-screenshotit** (molemmat teemat) deployn jälkeen — vain hänellä on pääsy auth-seinän taakse.
- Ei committaa käsin, ei kirjoita koodia.

**Code — ainoa git-kirjoittaja.**
- Toteuttaa omalle feature-branchille, ajaa testit + eslint paikallisesti.
- **Committaa + pushaa + avaa PR:n itse.** Ei koskaan jätä committaamatonta tilaa.
- Koodi omaan feature-PR:ään; brief/docs erilliseen **docs-PR:ään ennen** toteutusta.

**Claude (Cowork) — arkkitehti + tarkastaja. EI KOSKE GITIIN.**
- Tuottaa design-kartat, briefit, kickoffit.
- Pudottaa briefin repon **työpuuhun** (ei git-committia) → Code committaa sen docs-PR:ään.
- Verifioi PR:n bridgen kautta **read-only**: git-diff + testit + staattinen review → vihreä/punainen verdict.
- Ei pushaa, ei mergeä, ei bumppaa — vain lukee. (GitHub-SSH on sandboxista estetty; tämä on tarkoituksellista, ei rajoite jota kierretään.)

## Silmukka per vaihe (esim. E2.2)

1. **Claude** → brief + kickoff. Brief pudotetaan työpuuhun `docs/…`.
2. **Tero** → antaa kickoffin Codelle.
3. **Code** → toteutus branchille → testit vihreät → **committaa + pushaa + avaa PR** (docs erikseen, koodi erikseen).
4. **Tero** → "verifioi" (+ PR-numero jos tiedossa).
5. **Claude** → kolmitasoinen tarkastus → verdict (vihreä/punainen, nimeää mitä tarkisti ja mitä ei voinut).
6. **Tero** → vihreällä: **merge**. CI deployaa.
7. **Tero** → **molempien teemojen screenshotit** (live-taso kuitattu) → "seuraava".
8. **Claude** → seuraavan vaiheen brief.

## Portit (ei ohiteta)

- **Yksi review-portti ennen mainia:** Claude vihreä → Tero mergaa. Ei mergeä ilman verdictiä.
- **Yksi git-kirjoittaja:** Code. Tero ei committaa käsin; Claude ei koske gitiin.
- **Briefit ennen koodia:** docs-PR mergataan (tai on vähintään avattu) ennen kuin toteutus-PR:ää arvioidaan.
- **Live vain Terolta:** auth-seinä → Claude ei voi live-testata; screenshotit ovat Teron kuittaus.

## Kickoff-lisärivi (Code)

Jokaiseen kickoffiin loppuun:
> Committaa + pushaa + avaa PR itse. Koodi omaan PR:ään; jos brief on työpuussa committaamatta, laita se erilliseen `docs/`-PR:ään ensin. Älä jätä committaamatonta tilaa. Älä mergeä — Tero mergaa Clauden verdictin jälkeen.
