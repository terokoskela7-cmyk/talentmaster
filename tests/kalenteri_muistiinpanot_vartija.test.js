/**
 * Vartija (#882 vaihe 3, Rules v3.52): `muistiinpanot`-kenttää EI kirjoiteta kalenteritapahtuman dokumenttiin (pelaaja lukee kalenterin).
 * Sallittu ainoastaan: poisto (`muistiinpanot = FieldValue.delete()`) ja henkilokunta/muistiinpanot-alikokoelma.
 * Poikkeus: Excel_Tuonti (SA-siirtotyökalu, idempotentti; poistetaan R0-poiston yhteydessä 1.12.2026).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const SOVELLUKSET = ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Seura.html', 'TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'];

// Koodirivit ilman //-kommentteja; palauttaa [rivinro, rivi] -parit joissa kenttä kirjoitetaan (avain `muistiinpanot:` tai sijoitus `.muistiinpanot =`)
function kirjoitukset(src) {
  const l = [];
  src.split('\n').forEach((rivi, i) => {
    const koodi = rivi.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
    if (/\bmuistiinpanot\s*:/.test(koodi) || /\.muistiinpanot\s*=(?!=)/.test(koodi)) l.push([i + 1, rivi.trim()]);
  });
  return l;
}

describe('vartija: tapahtumadokumentin muistiinpanot-kenttää ei kirjoiteta', () => {
  for (const f of SOVELLUKSET) {
    it(f + ': ei `muistiinpanot:`-avainta eikä muuta sijoitusta kuin FieldValue.delete()', () => {
      const huonot = kirjoitukset(lue(f)).filter(([, r]) => !/\.muistiinpanot\s*=\s*firebase\.firestore\.FieldValue\.delete\(\)/.test(r));
      expect(huonot).toEqual([]);
    });
  }
  it('vartija oikeasti nappaa: kirjoitus-avain ja sijoitus havaitaan, delete ei', () => {
    expect(kirjoitukset('const d = { muistiinpanot: null };').length).toBe(1);
    expect(kirjoitukset("upd.muistiinpanot = 'teksti';").length).toBe(1);
    expect(kirjoitukset('const muistiinpanot = await lataa(); // muistiinpanot: kommentti').length).toBe(0);
    expect(kirjoitukset('upd.muistiinpanot = firebase.firestore.FieldValue.delete();').length).toBe(1);   // havaitaan, mutta suodatetaan pois vartijassa
  });
  it('Rules v3.52: create ja update kieltävät kentän; poistava update mahdollinen (kielto request.resource.data-puolella)', () => {
    const r = lue('tm_admin/firestore.rules');
    expect(r).toContain('firestore.rules v3.52'); expect(r).toContain('Muutokset v3.51 → v3.52');
    expect(r).toMatch(/allow create: if !\('muistiinpanot' in request\.resource\.data\)/);
    expect(r).toMatch(/allow update: if !\('muistiinpanot' in request\.resource\.data\)/);
    expect(r).toContain('match /henkilokunta/{dokId}');
  });
});
