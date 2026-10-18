/* Erä 67 (VP = tränarchef; Teron päätös 18.10.2026) korvasi 89 sv-riviä, joissa oli fotbollsutvecklare / FU. Vanhojen erien testit vertaavat koodin sv:tä erän omaan (historialliseen) palautukseen —
   S67(sv) kääntää sellaisen vanhan arvon erän 67 palautuksen arvoksi (sv_nyt → sv), muut arvot palautuvat ennallaan. Yksiselitteinen kartta tarkistetaan (ks. era67_korvatut.test.js). */
import { readFileSync } from 'fs';
const lue = (f) => JSON.parse(readFileSync(new URL('../../docs/i18n/' + f, import.meta.url), 'utf8')).osiot;
const G = lue('sv_kaannoserae_67_gemini.json'), P = lue('sv_kaannoserae_67_palautus.json');
export const KARTTA = new Map(), MONITULKINTA = [];
for (const [osio, o] of Object.entries(G)) for (const [avain, r] of Object.entries(o.rivit)) {
  const uusi = P[osio].rivit[avain].sv;
  if (KARTTA.has(r.sv_nyt) && KARTTA.get(r.sv_nyt) !== uusi) MONITULKINTA.push(r.sv_nyt);
  if (!KARTTA.has(r.sv_nyt)) KARTTA.set(r.sv_nyt, uusi);
}
export const S67 = (sv) => (KARTTA.has(sv) ? KARTTA.get(sv) : sv);
