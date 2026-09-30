/* sv-odotuslista on elävä: jokainen rivi on yhä fi:ssä ja en:ssä JA yhä ilman sv:tä. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lang.js');
const ODOTTAA = require('./tm_lang_sv_odotuslista.cjs');
const hae = (lang, polku) => polku.split('.').reduce((o, k) => (o == null ? undefined : o[k]), L.TM_LANG[lang]);

describe('tm_lang sv-odotuslista', () => {
  it('jokainen odottava avain on fi:ssä ja en:ssä', () => {
    expect(ODOTTAA.filter((p) => typeof hae('fi', p) !== 'string' || typeof hae('en', p) !== 'string')).toEqual([]);
  });
  it('sv saapui → poista rivi odotuslistalta (tai sv on keksitty)', () => {
    expect(ODOTTAA.filter((p) => typeof hae('sv', p) === 'string')).toEqual([]);
  });
});
