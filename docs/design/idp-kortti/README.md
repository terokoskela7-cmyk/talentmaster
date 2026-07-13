# IDP-kortti — design-lähteet

Visuaalinen totuus IDP-välilehdelle. Lähde: **Claude Design -handoff** *"Kansainvälisen tason pelaajan IDP-kortti"* (claude.ai/design), pohjautuu TalentMaster-design-systemiin (extract commit `539cb72`).

## Tiedostot
- `IDP-kortti.dc.html` — IDP-välilehden komponentti (pixel-tarkka referenssi). Sisältää: header · kausitavoite · jaksofokus + inline "Muokkaa jaksofokus" -paneeli (domeeni/painopiste/teema) · SMART-tavoitteet (tyyppi-chip + mittari) · silta (teema+drillit) · pelaajan ääni & sitoumus. Propseissa: `showEditPanel`, `voiceRegister` (showcase/rakentaja), `vpConfirmed`.

## Design-tokenit (design system — käytä näitä, älä kovakoodaa)
Brändilukko: `--carbon #1C1C1A` · `--bone #F2EFE6` · `--teal #1A7A5E` · `--teal-d #28B090` · `--slate #585751`.
Fontit: **Cormorant Garamond** (display/KPI), **DM Sans** (body), **DM Mono** (badget/aikaleimat). Terävät kulmat, hiusviivarajat, ei gradientteja. Molemmat teemat `data-theme`-attribuutilla.
Tekstiluokat: `tm-eyebrow · tm-stitle · tm-tab · tm-badge · tm-meta · tm-mono · tm-body-sm · tm-kpi · tm-signal`.

Täysi DS (colors_and_type.css, styles.css, _ds_bundle.js) on Claude Design -handoff-paketissa. Toteutusohjeet: `docs/CODE_BRIEF_IDP_KORTTI.md` (+ `CODE_BRIEF_IDP_V2.md` logiikalle).
