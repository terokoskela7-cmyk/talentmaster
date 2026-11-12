#!/usr/bin/env bash
# Pausettaa stagingin Firebase-ajastukset (firebase-schedule-*) deployn jälkeen. Kutsutaan deploy-staging.yml:stä; testattava vale-gcloudilla (tests/deploy_staging_pause.test.js).
# Ympäristö: STAGING_PROJEKTI, SCHEDULER_ALUE. EI hiljaista nollaa: lukuvirhe, tyhjä lista, nimiprefiksin puute ja pausen epäonnistuminen kaatavat ajon ja tulostavat gcloudin stderrin.
set -uo pipefail
: "${STAGING_PROJEKTI:?}" "${SCHEDULER_ALUE:?}"

echo "Tili: $(gcloud config get-value account 2>/dev/null || echo '?') · projekti: $STAGING_PROJEKTI · sijainti: $SCHEDULER_ALUE"
virhe=$(mktemp)
# basename(): value(name) antaisi koko polun (projects/…/locations/…/jobs/<nimi>) → vertailu ja pause käyttävät pelkkää jobin nimeä.
if ! lista=$(gcloud scheduler jobs list --project "$STAGING_PROJEKTI" --location "$SCHEDULER_ALUE" --format='value(name.basename())' 2>"$virhe"); then
  echo "gcloud stderr:"; cat "$virhe"
  echo "::error::gcloud scheduler jobs list epäonnistui ($(head -c 300 "$virhe" | tr '\n' ' ')). Tarkista deploy-tilin oikeus cloudscheduler.jobs.list/pause (roles/cloudscheduler.admin), Cloud Scheduler API ja --project/--location."
  exit 1
fi
if [ -s "$virhe" ]; then echo "gcloud stderr (varoituksia):"; cat "$virhe"; fi

yht=$(printf '%s\n' "$lista" | grep -c . || true)
echo "Jobeja yhteensä ($SCHEDULER_ALUE): $yht"
printf '%s\n' "$lista" | grep . | sed 's/^/  - /' || true
nimet=$(printf '%s\n' "$lista" | grep '^firebase-schedule-' || true)

n=0; vikoja=0
for j in $nimet; do
  if gcloud scheduler jobs pause "$j" --project "$STAGING_PROJEKTI" --location "$SCHEDULER_ALUE" --quiet 2>"$virhe"; then n=$((n+1)); else vikoja=$((vikoja+1)); echo "Pause epäonnistui: $j"; cat "$virhe"; fi
done
echo "Pausetettu ajastuksia: $n"
if [ "$n" -eq 0 ]; then
  echo "::error::Yhtään firebase-schedule-* -jobia ei pausetettu (jobeja sijainnissa yhteensä: $yht, location=$SCHEDULER_ALUE) — ajastuksia ei pausetettu"
  exit 1
fi
if [ "$vikoja" -gt 0 ]; then echo "::error::$vikoja ajastuksen pause epäonnistui (ks. yllä)"; exit 1; fi
