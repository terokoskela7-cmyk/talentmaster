# Korjaus — epävarma-tila: näytä sen hetkinen taso harmaana (ei piilota lukua)

> Lähde: Tero, live-katselmus 2026-07-05 (Vilma, Fyysinen-välilehti). §28-epavarma näyttää nyt vain "🌱 epävarma" ilman lukua. Tero: *"voidaan näyttää tulos samalla tavalla harmaalla vaikka PHV-kasvumittausta ei ole tehty — se hyvin ilmenee, mutta näytetään sen hetkinen taso."* Kohde: `TalentMaster_VP_v25.html` (`friv()` palkkibadge + per-testi-radar `_tmRadar5D` epavarma-akseli). §28 · §5.

## Muutos
Epävarma-tila (`kypsyysTila`='epavarma', gated-fyysinen ilman PHV-dataa): **näytä taso-luku himmennettynä (`--ink3` harmaa) — ÄLÄ korvaa sitä "🌱 epävarma" -tekstillä eikä piilota.**
- **Palkkibadge (`friv`):** `badgeSisalto` epävarmalle = **taso-luku** (esim. `1`) värillä `--ink3` (harmaa), ei `🌱` eikä tyhjä. Säilytä konteksti "· kypsyysdataa puuttuu" nimen perässä + harmaa palkki.
- **Radar-akseli (`_tmRadar5D` epavarma):** akselin arvorivi = **taso-luku harmaana** (`--ink3`), ei tekstiä "🌱 epävarma". Piste piirtyy tason kohdalle (kuten nyt) mutta harmaana.
- **Valinnainen pieni 🌱-merkki** tason viereen sallittu (esim. "1 🌱") jos halutaan vihje, mutta **luku näkyy aina**.

## Periaate (säilyy §28)
Harmaa väri = "kypsyysvarmentamaton, ei tulkita kehityskohteeksi" (ei punainen hälytys). Mutta **nykytaso informoi** — valmentaja näkee missä mennään, ymmärtää ettei se ole varma. Tavoiteviiva (taso 3) säilyy. H-H kokonais sama logiikka.

## Invariantit + verifiointi
§28 (harmaa ei punainen; taso näkyy) · §5 (`--ink3` himmennys) · §26 · ei version.json-bumppia · ei Rules-muutosta · ei lib-muutosta (paitsi jos `_tmRadar5D` on libissä — VP-inline). Live-verifio SJK (Vilma): MAS-akseli + -palkki näyttää **taso-luvun harmaana** (ei "epävarma"-tekstiä lukun tilalla); ei punaista. `npm test` + lint.
