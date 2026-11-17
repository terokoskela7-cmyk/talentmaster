// Vastuuhenkilö-valitsimen kaikilla t('…')-literaaleilla on sv-vastine (Master-kartta tai jaettu common).
// Tausta: '— ei vastuuhenkilöä —' puuttui → suomea sv-tilassa, ja klippi_sv_selain (a2) kaatui ajoittain (main d22521d4, 17.11.): valitsin piirtyy vasta kun _mHenkilosto on ladattu → ajoitusriippuvainen.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..');
const MA = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv;
const CO = (require('../lib/tm_i18n_common.js').TM_I18N_COMMON || {}).sv || {};
describe('tm_vastuuhenkilo.js — sv-kattavuus', () => {
  it('jokaisella t(\'…\')-literaalilla on sv-avain (Master tai common)', () => {
    const src = readFileSync(join(ROOT, 'lib/tm_vastuuhenkilo.js'), 'utf8');
    const avaimet = [...src.matchAll(/\bt\('((?:[^'\\]|\\.)*)'\)/g)].map((m) => m[1]);
    expect(avaimet).toContain('— ei vastuuhenkilöä —');
    const puuttuu = avaimet.filter((k) => !(k in MA) && !(k in CO));
    expect(puuttuu).toEqual([]);
  });
});
