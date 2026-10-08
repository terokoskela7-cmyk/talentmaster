/**
 * Suostumuskortin teksti + Pelaaja_v7:n 4 numeron PIN-vihje (1.10.2026). Ei logiikkamuutoksia PIN-kirjautumiseen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const lue = (n) => readFileSync(join(ROOT, n), 'utf8');
const PEL = lue('TalentMaster_Pelaaja_v7.html');

describe('tekstit', () => {
  global.window = {};
  require_(join(ROOT, 'lib', 'tm_lang.js'));
  const L = global.window.TM_LANG;
  delete global.window;
  it('suostumuskortti: uusi teksti fi + en; Seuran varateksti sama', () => {
    expect(L.fi.seura.suostumuskortti_teksti).toBe('Näytä tämä vanhemmallesi. Kun huoltaja antaa luvan (2 min), hän saa tunnuksesi sähköpostiin.');
    expect(L.en.seura.suostumuskortti_teksti).toContain('by email');
    expect(lue('TalentMaster_Seura.html')).toContain("'Näytä tämä vanhemmallesi. Kun huoltaja antaa luvan (2 min), hän saa tunnuksesi sähköpostiin.'");
  });
  it('PIN-vihje fi + en + sv (Gemini-erä 8.10.2026)', () => {
    expect(L.fi.pelaaja.pin4_vihje).toBe('Vanha 4-numeroinen PIN? Paina OK');
    expect(L.en.pelaaja.pin4_vihje).toBe('Old 4-digit PIN? Press OK');
    expect(L.sv.pelaaja.pin4_vihje).toBeTruthy();
    expect(require_('./tm_lang_sv_odotuslista.cjs')).not.toContain('pelaaja.pin4_vihje');
  });
});

describe('Pelaaja_v7 PIN-näppäimistö', () => {
  it('vihje näkyy vain 4 numerolla (renderöinti + painallus), OK-nappi teal', () => {
    expect(PEL).toContain(`<div id="pin4Vihje" style="font-size:11px;color:#28B090;text-align:center;margin:-2px 0 8px;visibility:\${_pin.length===4?'visible':'hidden'}">\${t('pelaaja.pin4_vihje')}</div>`);
    expect(PEL).toContain("const v4=body.querySelector('#pin4Vihje'); if(v4) v4.style.visibility=_pin.length===4?'visible':'hidden';");
    expect(PEL).toContain('id="pinOk" data-k="ok" style="font-size:14px;font-weight:700;background:#28B090;color:#fff;border-color:#28B090;');
  });
  it('ei logiikkamuutoksia: OK lähettää vain 4 numerolla, 6. numero lähettää automaattisesti', () => {
    expect(PEL).toContain("if(k==='ok'){ if(_pin.length===4) _kirjaudu(_pin); return; }");
    expect(PEL).toContain('else if(_pin.length<6){_pin+=k;}');
    expect(PEL).toContain('if(_pin.length===6){setTimeout(()=>_kirjaudu(_pin),280);}');
  });
});
