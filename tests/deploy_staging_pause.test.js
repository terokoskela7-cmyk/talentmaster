import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

const SKRIPTI = path.resolve(__dirname, '..', 'scripts', 'staging_pausetaukset.sh');
let hak;
/* Vale-gcloud: list-vastaus/-virhe ja pause-tulos ohjataan ympäristömuuttujilla; kaikki kutsut kirjataan lokiin. */
function aja(env) {
  const r = spawnSync('bash', [SKRIPTI], { env: Object.assign({ PATH: hak + ':' + process.env.PATH, STAGING_PROJEKTI: 'talentmaster-staging', SCHEDULER_ALUE: 'us-central1', LOKI: path.join(hak, 'loki.txt') }, env), encoding: 'utf8' });
  const loki = fs.existsSync(path.join(hak, 'loki.txt')) ? fs.readFileSync(path.join(hak, 'loki.txt'), 'utf8') : '';
  return { koodi: r.status, ulos: r.stdout + r.stderr, loki };
}
beforeEach(() => {
  hak = fs.mkdtempSync(path.join(os.tmpdir(), 'gcloud-vale-'));
  fs.writeFileSync(path.join(hak, 'gcloud'), `#!/usr/bin/env bash
echo "$*" >> "$LOKI"
case "$*" in
  "config get-value account"*) echo "deploy@talentmaster-staging.iam.gserviceaccount.com";;
  "scheduler jobs list"*) if [ -n "\${LISTAVIRHE:-}" ]; then echo "\$LISTAVIRHE" >&2; exit 1; fi; printf '%s' "\${LISTA:-}";;
  "scheduler jobs pause"*) if [ -n "\${PAUSEVIRHE:-}" ] && [[ "$*" == *"\$PAUSEVIRHE"* ]]; then echo "PERMISSION_DENIED pause" >&2; exit 1; fi;;
esac
`, { mode: 0o755 });
});

describe('staging_pausetaukset.sh (deploy-staging.yml pause-vaihe)', () => {
  it('pausettaa jokaisen firebase-schedule-* -jobin, käyttää jobin nimeä (basename), ei koko polkua; ohittaa muut jobit', () => {
    const r = aja({ LISTA: 'firebase-schedule-laskeSeuranKooste-europe-west1\nfirebase-schedule-notifA-europe-west1\nmuu-job\n' });
    expect(r.koodi, r.ulos).toBe(0);
    expect(r.ulos).toMatch(/Pausetettu ajastuksia: 2/);
    expect(r.loki).toMatch(/scheduler jobs pause firebase-schedule-laskeSeuranKooste-europe-west1 --project talentmaster-staging --location us-central1/);
    expect(r.loki).not.toMatch(/pause muu-job/);
    expect(r.loki).toMatch(/jobs list --project talentmaster-staging --location us-central1 --format=value\(name\.basename\(\)\)/);   // --project + --location + basename
    expect(r.ulos).toMatch(/Tili: deploy@/);   // tili näkyy lokissa
  });
  it('listaus epäonnistuu (esim. oikeus puuttuu) → kaatuu, gcloudin stderr näkyy, ei hiljaista nollaa', () => {
    const r = aja({ LISTAVIRHE: 'ERROR: (gcloud.scheduler.jobs.list) PERMISSION_DENIED: cloudscheduler.jobs.list' });
    expect(r.koodi).toBe(1);
    expect(r.ulos).toMatch(/PERMISSION_DENIED: cloudscheduler\.jobs\.list/);
    expect(r.ulos).toMatch(/::error::gcloud scheduler jobs list epäonnistui/);
    expect(r.loki).not.toMatch(/jobs pause/);
  });
  it('tyhjä lista → kaatuu ja kertoo jobien kokonaismäärän (0)', () => {
    const r = aja({ LISTA: '' });
    expect(r.koodi).toBe(1); expect(r.ulos).toMatch(/Jobeja yhteensä \(us-central1\): 0/);
  });
  it('jobeja on mutta ei firebase-schedule-prefiksillä → kaatuu, lista tulostetaan (vääri nimi/sijainti näkyy)', () => {
    const r = aja({ LISTA: 'joku-toinen\n' });
    expect(r.koodi).toBe(1); expect(r.ulos).toMatch(/Jobeja yhteensä \(us-central1\): 1/); expect(r.ulos).toMatch(/- joku-toinen/);
  });
  it('yksittäisen pausen epäonnistuminen kaataa ajon (stderr näkyy), muut yritetään silti', () => {
    const r = aja({ LISTA: 'firebase-schedule-a-europe-west1\nfirebase-schedule-b-europe-west1\n', PAUSEVIRHE: 'schedule-a' });
    expect(r.koodi).toBe(1); expect(r.ulos).toMatch(/Pause epäonnistui: firebase-schedule-a/); expect(r.ulos).toMatch(/PERMISSION_DENIED pause/);
    expect(r.loki).toMatch(/pause firebase-schedule-b-europe-west1/); expect(r.ulos).toMatch(/Pausetettu ajastuksia: 1/);
  });
  it('workflow kutsuu skriptiä (ei inline-kopiota)', () => {
    const y = fs.readFileSync(path.resolve(__dirname, '..', '.github/workflows/deploy-staging.yml'), 'utf8');
    expect(y).toMatch(/run: bash scripts\/staging_pausetaukset\.sh/);
    expect(y).not.toMatch(/jobs list --project/);
  });
});
