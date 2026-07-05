# Claude Code -koukut (TalentMaster)

Mekaaniset vartijat CLAUDE.md §7:n dokumentoiduille *hiljaisille faileille*. Kytketty
`.claude/settings.json`:ssa (versioidaan). Kaikki koukut **fail-open**: sisäinen virhe → exit 0,
ei koskaan estä työtä. Estävä löydös → exit 2 + syy stderriin (Claude näkee sen).

## `check_edit.mjs` — PostToolUse (Edit|Write|MultiEdit)

Ajetaan jokaisen muokatun `.html`/`.js`-tiedoston jälkeen (ei `node_modules/`, `tests/`, `.mjs`):

| Tarkistus | § | Logiikka |
|---|---|---|
| **A. Backtick-parillisuus** | §7.1 | REGRESSIO vs `git HEAD`: estää vain jos HEAD oli parillinen (tai uusi tiedosto) ja nyt pariton → rikkinäinen template-literaali (musta ruutu). Ei huuda jo-parittomille (esim. Agent_v1.html). |
| **B. `firebase.functions()`** | §7.4 | Kommentti-stripattu grep: bare-kutsu → us-central1 (väärä region). Käytä `firebase.app().functions('europe-west1')`. |
| **B. `.doc(palloId)`** | §7.13 | PalloID ≠ doc-ID → "not found". Hae `where('tunniste','==',String(palloId))`. |
| **C. ESLint** | — | Muokattu tiedosto; baseline puhdas → mikä tahansa virhe on tämän muokkauksen regressio. |
| **D. Vitest** | §21/§25 | Vain kanonisille logiikkatiedostoille (`lib/*.js`, `src/lib/*.js`, `docs/testit_indeksit.js`, `harjoitelogiikka_v4.js`) joissa vakiokopiot 3 kappaletta — pysyttävä synkassa. |

## `pre_bash_guard.mjs` — PreToolUse (Bash)

Estää `npm run version:bump` / `node scripts/bump_version.js` **feature-haarassa** (komentopaikassa,
ei lainausmerkeissä). Juurisyy #53: käsin-bump leimaa 5 tiedostoa joka PR:ssä → merge-konfliktit.
Konventio (§33): versio bumpataan automaattisesti mainissa (`.github/workflows/bump-version.yml`).
Mainissa/masterissa sallittu.

## Testaus

Koukut ovat puhtaita node-skriptejä; testaa syöttämällä PostToolUse/PreToolUse-JSON stdiniin:
```bash
export CLAUDE_PROJECT_DIR="$PWD"
echo '{"tool_input":{"file_path":"lib/tm_idp.js"}}' | node .claude/hooks/check_edit.mjs; echo $?
```
