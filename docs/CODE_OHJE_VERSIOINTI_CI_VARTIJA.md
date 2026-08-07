# CODE — Versiointi: CI-vartija estää feature-haaran version.json/APP_VERSION-muutokset

**Tyyppi:** CI-infra (GitHub Actions) + valinnainen hook-kovennus. **Ei sovelluskoodimuutosta.** **Pieni PR.**
**Kohde:** `.github/workflows/test.yml` (uusi job) · (valinnainen) `.claude/hooks/check_edit.mjs`.
**Juurisyy:** #53 / CLAUDE.md §33 — feature-haaran ei pidä bumpata versiota; `bump-version.yml` auto-bumppaa
mainissa mergen jälkeen. Nykysuoja (`.claude/hooks/pre_bash_guard.mjs`) estää vain `npm run version:bump`
-**komennon** Claude-sessiossa — se **ei kata suoraa tiedostomuokkausta eikä aja CI:ssä / muiden työkalujen
tekemänä**. Siksi esim. PR #284 leimasi `version.json` + `APP_VERSION` feature-haarassa. Tämä vartija tukkii aukon
kaikille (ihminen, Code-agentti, mikä tahansa työkalu).

## Taustafaktat (vahvistettu)
- `scripts/bump_version.js` kirjoittaa `version.json = {v: Date.now()}` ja leimaa `APP_VERSION`-rivin **neljään
  appiin**: `TalentMaster_Master_v16.html`, `TalentMaster_Pelaaja_v7.html`, `TalentMaster_Vanhempi_v2.html`,
  `TalentMaster_Admin.html`.
- `.github/workflows/bump-version.yml` ajaa **vain mainissa** (push→main) ja committaa `[skip ci]`.
- `.github/workflows/test.yml` ajaa `on: push[main]` + `pull_request[main]`, jobit: `unit-tests`, `lint`,
  `audit` (continue-on-error), `rules-tests`.
- **Feature-PR:llä ei ole koskaan laillista syytä muuttaa `version.json`:ia tai `APP_VERSION`-rivejä** → kova fail on oikein.

## OSA A — Uusi job `version-guard` (`test.yml`)

Lisää job joka ajaa **vain pull_requestissa** (ei mainin pushissa — main SAA bumpata). Failaa jos PR:n diff
main-haaraa vasten koskee `version.json`:ia TAI muuttaa `APP_VERSION`-riviä missä tahansa `TalentMaster_*.html`:ssä.

```yaml
  # #53 — versiointivartija: feature-PR EI saa bumpata versiota (bump-version.yml hoitaa sen mainissa).
  version-guard:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Estä version.json / APP_VERSION -muutokset feature-PR:ssä
        run: |
          BASE="origin/${{ github.base_ref }}"
          git fetch origin "${{ github.base_ref }}" --depth=1
          CHANGED=$(git diff --name-only "$BASE"...HEAD)
          FAIL=0
          if echo "$CHANGED" | grep -qx 'version.json'; then
            echo "::error::version.json muuttuu feature-PR:ssä — ÄLÄ bumppaa versiota haarassa (#53/§33). bump-version.yml hoitaa sen mainissa mergen jälkeen."
            FAIL=1
          fi
          if git diff "$BASE"...HEAD -- 'TalentMaster_*.html' | grep -qE '^[+-].*var APP_VERSION='; then
            echo "::error::APP_VERSION muuttuu feature-PR:ssä — ÄLÄ leimaa versiota haarassa (#53/§33). Poista bump ja anna bump-version.yml:n hoitaa se mainissa."
            FAIL=1
          fi
          if [ "$FAIL" = "1" ]; then exit 1; fi
          echo "OK — ei versiotiedostomuutoksia."
```

- **Tarkista tarkka `github.base_ref`-käyttö** (PR:n kohdehaara = main). `fetch-depth: 0` tarvitaan diffiä varten
  (tai `git fetch origin main` erikseen kuten yllä).
- **Sanamuoto ::error::-viesteissä pysyy ohjaavana** (mitä tehdä: poista bump, anna mainin hoitaa).
- Älä lisää tätä `push`-triggeriin — mainin oma bump-commit muuttaa version.jsonia laillisesti.

## OSA B (valinnainen, defense-in-depth) — `check_edit.mjs`-hook

`.claude/hooks/check_edit.mjs` (PostToolUse Edit/Write) ei nyt tarkista versiotiedostoja. Lisää sama
haaratarkistus kuin `pre_bash_guard.mjs`:ssä: jos muokataan `version.json` TAI `APP_VERSION`-riviä **ei-main-haarassa**
→ estä (exit koodilla joka hook-konventiossa merkitsee estoa, kuten pre_bash_guard käyttää) selkeällä #53-viestillä.
Tämä kattaa suoran Edit/Write-reitin Claude-sessiossa; **CI-vartija (Osa A) on silti pääsuoja** (kattaa kaikki reitit).
Jos hook-logiikka on monimutkainen, **Osa B voidaan jättää pois** — Osa A riittää juurisyyn korjaamiseen.

## Reunaehdot
- **Ei sovelluskoodimuutosta.** Vain CI + (valinnainen) hook.
- **Älä muuta `bump-version.yml`:ia eikä `scripts/bump_version.js`:ia** — auto-bump mainissa toimii, sitä ei kosketa.
- Vartija **ei saa** laueta mainin omasta bump-commitista (siksi `if: pull_request`).
- Ei uutta riippuvuutta; pelkkä bash + git.

## Definition of Done
- **L1:** `test.yml`:ssä uusi `version-guard`-job, `if: github.event_name == 'pull_request'`, failaa kun PR-diff
  koskee `version.json`:ia tai `APP_VERSION`-riviä, muuten läpäisee. Ohjaava virheviesti (#53).
- **L2 (todennus):** avaa testi-PR joka lisää rivin `version.json`:iin → job **failaa** odotetusti; PR ilman
  versiomuutosta → job **vihreä**. (Voit demonstroida logilla tai kuvata odotetun käytöksen PR-kuvauksessa.)
- **CI muut jobit ennallaan** (unit-tests/lint/audit/rules-tests vihreät).
- Pieni PR. **Huom:** tämä PR itse EI saa koskea version.jsoniin (muuten oma vartija failaisi — hyvä itsetesti).
