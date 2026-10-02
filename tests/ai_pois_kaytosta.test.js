/**
 * VARTIJA: yksikään pyyntö ei lähde OpenAI:lle, Geminille tai Anthropicin suorarajapintaan (2.10.2026, EU:n ulkopuolinen siirto).
 *  - aiProxy palauttaa heti 410 eikä sido secreteja
 *  - functions/-koodissa ei viitata api.openai.com / generativelanguage.googleapis.com
 *  - api.anthropic.com vain valmennusapuri.js:ssä, ja sen provider-oletus on bedrock (suora Anthropic vain kehityslipun takaa)
 *  - selain (lib/ + juuren sivut) ei kutsu aiProxya
 * Valmennusapurin Bedrock EU -reitti ei kuulu tähän: sitä ei muuteta.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const FN = join(juuri, 'functions');
const funktioTiedostot = readdirSync(FN).filter((f) => f.endsWith('.js'));

describe('aiProxy suljettu', () => {
  const CF = lue('functions/index.js');
  const i = CF.indexOf('exports.aiProxy');
  const runko = CF.slice(i, CF.indexOf('\n  });', i) + 6);
  it('EI VACUOUS: export on olemassa', () => {
    expect(i).toBeGreaterThan(0);
    expect(funktioTiedostot).toContain('index.js');
  });
  it('palauttaa 410 {virhe:ai_pois_kaytosta} eikä sido secreteja', () => {
    expect(runko).toMatch(/status\(410\)\.json\(\{ virhe: 'ai_pois_kaytosta' \}\)/);
    expect(runko).not.toMatch(/secrets|process\.env|require\(|verifyIdToken/);
  });
});

describe('functions/: ei EU:n ulkopuolisia tekoälyrajapintoja', () => {
  it.each(['api.openai.com', 'generativelanguage.googleapis.com'])('%s ei esiinny missään functions/*.js:ssä', (host) => {
    for (const f of funktioTiedostot) expect(lue('functions/' + f), f).not.toContain(host);
  });
  it('api.anthropic.com vain valmennusapuri.js:ssä', () => {
    const missa = funktioTiedostot.filter((f) => lue('functions/' + f).includes('api.anthropic.com'));
    expect(missa).toEqual(['valmennusapuri.js']);
  });
  it('valmennusapurin provider-oletus on bedrock (suora Anthropic vain VALMENNUSAPURI_PROVIDER=anthropic -lipun takaa)', () => {
    const v = lue('functions/valmennusapuri.js');
    expect(v).toMatch(/VALMENNUSAPURI_PROVIDER \|\| 'bedrock'/);
    expect(v).toMatch(/a\.provider === 'anthropic'/);
    expect(v).not.toMatch(/VALMENNUSAPURI_PROVIDER\s*=\s*['"]anthropic/);
  });
  it('OPENAI_API_KEY ei sidottu mihinkään funktioon', () => {
    expect(lue('functions/index.js')).not.toMatch(/secrets:\s*\[[^\]]*OPENAI_API_KEY/);
  });
});

describe('selain ei kutsu aiProxya', () => {
  const kohteet = [
    ...readdirSync(join(juuri, 'lib')).filter((f) => f.endsWith('.js')).map((f) => 'lib/' + f),
    ...readdirSync(juuri).filter((f) => /\.(html|js)$/.test(f) && !/^(eslint|vitest)\.config/.test(f)),
  ];
  it('EI VACUOUS: kohdejoukko on iso', () => { expect(kohteet.length).toBeGreaterThan(50); });
  it('yksikään lib/- tai juurisivu ei viittaa cloudfunctions.net/aiProxy', () => {
    const rikkojat = kohteet.filter((p) => /cloudfunctions\.net\/aiProxy/.test(lue(p)));
    expect(rikkojat).toEqual([]);
  });
  it('tm_ai.js ei ole enää juuressa (arkistoitu, ei lataajia)', () => {
    expect(existsSync(join(juuri, 'tm_ai.js'))).toBe(false);
    expect(existsSync(join(juuri, 'archive', 'tm_ai.js'))).toBe(true);
  });
});

describe('tm_aani: litterointi poissa, tallennus ennallaan', () => {
  const A = lue('lib/tm_aani.js');
  it('ei verkkokutsua eikä litterointinappia', () => {
    expect(A).not.toMatch(/fetch\(/);
    expect(A).not.toMatch(/Litteroi \(valinnainen\)|voice_transcribe/);
  });
  it('tallennus + Storage-lataus säilyvät', () => {
    expect(A).toContain('new MediaRecorder');
    expect(A).toContain('.put(blob');
  });
  it('litteroi() on no-op joka resolvaa null (ei toastia, ei verkkoa)', () => {
    expect(A).toMatch(/function litteroi\(\) \{ return Promise\.resolve\(null\); \}/);
  });
  it('lataajat nostettu ?v=3', () => {
    for (const s of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html']) {
      expect(lue(s), s).toContain('lib/tm_aani.js?v=3');
    }
  });
});
