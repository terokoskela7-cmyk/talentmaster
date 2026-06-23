# Rollback — CF Node 22 → Node 20 (firebase-functions 6.6.0 → 4.9.0)

> Liittyy: `NODE22_JA_GDPR_SUUNNITELMA.md §A` · `CLAUDE.md §33`. Migraatio tehty 2026-06-23 (commit `3386ef8`).
> **Mitattu redeploy-nopeus:** yksi funktio **95 s** (canary Node 20 -rollback-testi 2026-06-23) · koko 18 funktion deploy ~3–4 min → **rollback << 15 min** ✅.

Cloud Functions 1st-gen ei tarjoa "yhden napin" revisio-rollbackia ilman gcloudia → rollback = **edellisen revision uudelleen-deploy gitistä**. Kaksi tasoa:

---

## A. Pelkkä runtime takaisin Node 20:een (nopein, jos vika on AJONAIKAINEN Node 22:ssa)

SDK 6.6.0 toimii sekä Node 20:ssä että 22:ssa → pelkkä runtime-flip riittää, ei SDK-downgradea.

```bash
# 1. firebase.json: "runtime": "nodejs22" → "nodejs20"
# 2. Deploy kaikki (tai vain epäilty funktio):
firebase deploy --only functions --project talentmaster-pilot --force
# 3. Varmista:
firebase functions:list --project talentmaster-pilot | grep -oE "nodejs2[02]" | sort | uniq -c   # → 18 nodejs20
```
Kesto: ~3–4 min koko floteille. **Testattu canarylla: 95 s / funktio.**

---

## B. Täysi rollback edelliseen revisioon (Node 20 + firebase-functions 4.9.0 + root-import)

Jos vika on SDK 6.x:ssä (esim. `/v1`-import tai secrets-injektio) → palauta koko edellinen revisio.

```bash
cd ~/projects/talentmaster

# 1. Revertoi Node 22 -commit (firebase.json + functions/package.json + functions/index.js:n /v1-rivi)
git revert --no-edit 3386ef8
#    TAI manuaalisesti:
#    - firebase.json:        "runtime": "nodejs20"
#    - functions/package.json: "firebase-functions": "^4.8.0"  (admin ^12.0.0 pysyy)
#    - functions/index.js:10:  const functions = require('firebase-functions');   (poista /v1)

# 2. Asenna vanhat riippuvuudet (palauttaa firebase-functions 4.9.0)
cd functions && npm install && cd ..

# 3. Deploy
firebase deploy --only functions --project talentmaster-pilot --force

# 4. Varmista runtime + ettei ajossa-virheitä
firebase functions:list --project talentmaster-pilot | grep -oE "nodejs2[02]" | sort | uniq -c   # → 18 nodejs20
firebase functions:log --project talentmaster-pilot | grep -iE "error|MODULE_NOT_FOUND" | tail
```

**Huom:** `node-fetch`/`form-data` lisättiin eksplisiittisiksi deps:eiksi Node 22 -commitissa. Ne ovat
yhteensopivia myös vanhan SDK:n kanssa → revert voi jättää ne pakettiin (eivät haittaa) tai poistaa.
`runWith({secrets})` (Secret Manager) toimii molemmissa SDK-versioissa → secret-binding säilyy rollbackissa.

---

## Päätöspuu

| Oire | Toimi |
|---|---|
| Funktio kaatuu ajossa Node 22:lla, mutta koodi/SDK ok | **A** (runtime → 20) |
| SDK 6.x rikkoo (import/secrets/signature) | **B** (täysi revert 4.9.0) |
| Yksi funktio rikki, muut ok | `firebase deploy --only functions:NIMI` (kohdenna) |

## Rollbackin jälkeen
- Node 20 decommission **2026-10-31** → rollback on väliaikainen; korjaa juurisyy ja deployaa Node 22 uudelleen ennen takarajaa.
- Päivitä `CLAUDE.md §33` vastaamaan todellista tuotantotilaa.
