/**
 * LITTEROINTI (`voice_transcribe`) EI SAA VUOTAA GENEERISEEN TEKSTIMALLIKUTSUUN.
 *
 * MIKSI: `aiProxy`:n whisper-haara asetti tuloksen muttei returnannut:
 *
 *     let aiResult;
 *     if (task === 'voice_transcribe') { aiResult = await _handleWhisper(data); }  // ← ei returnia
 *     if (task === 'adar_vision_narratiivi') { … } else { … aiResult = { text }; } // ← ylikirjoitus
 *
 * → litterointi putosi läpi geneeriseen chat-malliin, joka sai audio-taskin ja kieltäytyi
 * ("Valitettavasti en voi toistaa ääntä…"). Se kieltäytyminen palautui litterointina ja
 * Whisper-tulos hukattiin. Ominaisuus näytti toimivan: HTTP 200, `text`-kenttä, ei virhettä.
 *
 * Portti lukee haaran KOODISTA sulkeita laskemalla ja vaatii että se on täysin käsitelty
 * (oma `return res`) ennen geneeristä `_buildProviderConfig`-polkua. Ilman tätä returnin
 * poistaminen refaktorissa — juuri niin kuin kävi — menisi läpi vihreänä.
 *
 * ⚠ functionsilla EI ole CI-deploy-workflowia (rules/hosting/pages on) → vihreä portti kertoo
 * vain REPON tilan. Tuotanto vaatii erikseen: firebase deploy --only functions:aiProxy
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const CF = readFileSync(join(juuri, 'functions/index.js'), 'utf8');

/** Poimii `if (task === 'voice_transcribe') { … }` -lohkon sulkeita laskemalla. */
function whisperHaara() {
  const otsikko = /if \(task === 'voice_transcribe'\)\s*\{/.exec(CF);
  expect(otsikko, 'voice_transcribe-haaraa ei löytynyt functions/index.js:stä').not.toBeNull();
  const alku = otsikko.index;
  let syvyys = 0, loppu = -1;
  for (let j = alku + otsikko[0].length - 1; j < CF.length; j++) {
    if (CF[j] === '{') syvyys++;
    else if (CF[j] === '}') { syvyys--; if (syvyys === 0) { loppu = j + 1; break; } }
  }
  expect(loppu, 'lohkon sulkeva } puuttuu').toBeGreaterThan(alku);
  return { teksti: CF.slice(alku, loppu), alku, loppu };
}

describe('aiProxy · voice_transcribe ei vuoda tekstimallille', () => {
  it('EI VACUOUS: haara on olemassa ja kutsuu Whisperiä', () => {
    const { teksti } = whisperHaara();
    expect(teksti).toContain('_handleWhisper(data)');
    expect(CF, 'aiProxy on se joka deployataan').toContain('exports.aiProxy');
  });

  it('haara returnaa vastauksen itse — ei putoa eteenpäin', () => {
    const { teksti } = whisperHaara();
    expect(
      /return res\.status\(200\)\.json\(/.test(teksti),
      'voice_transcribe-haarassa ei ole omaa `return res.status(200).json(…)` → '
        + 'tulos putoaa geneeriseen provider-polkuun joka ylikirjoittaa sen',
    ).toBe(true);
  });

  it('return tulee _handleWhisperin JÄLKEEN (muuten Whisper ei ehdi ajoon)', () => {
    const { teksti } = whisperHaara();
    expect(teksti.indexOf('_handleWhisper')).toBeLessThan(teksti.indexOf('return res'));
  });

  it('haara sulkeutuu ENNEN geneeristä _buildProviderConfig-polkua', () => {
    const { loppu } = whisperHaara();
    /* Huom: KUTSU, ei määrittely — `function _buildProviderConfig(providerName, task, data)`
       on tiedostossa aiemmin, ja siihen osuminen tekisi portista aina vihreän. */
    const kutsu = /const cfg\s*=\s*_buildProviderConfig\(/.exec(CF);
    expect(kutsu, 'EI VACUOUS: geneerinen provider-kutsu löytyy').not.toBeNull();
    expect(loppu).toBeLessThan(kutsu.index);
  });

  it('EI VACUOUS: geneerinen polku todella ylikirjoittaisi tuloksen', () => {
    /* Tämä on se rivi joka teki viasta hiljaisen: sama muuttuja, uusi arvo.
       Jos tämä katoaa, yllä oleva portti vartioi ongelmaa jota ei enää ole. */
    expect(CF).toMatch(/aiResult = \{ text \};/);
  });

  it('litterointi auditoidaan onnistuneena omassa haarassaan (GDPR-loki ei jää vajaaksi)', () => {
    const { teksti } = whisperHaara();
    expect(teksti).toMatch(/_auditLog\(uid, task, providerName, durationMs, true\)/);
  });
});
