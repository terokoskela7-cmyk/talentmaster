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
/* Erä 80 (K1d; sanasto + ADAR-nimet; vienti 21.10.2026) korvasi 100+ aiemman erän sv-riviä (granskning / utvärdering / Återhämtning / IDP → jakson yhteenveto, kehityssuunnitelma, Reagering…).
   Vanhojen erien testit vertaavat koodin sv:tä erän omaan palautukseen: E80(osio, avain, vanhaArvo) palauttaa erän 80 palautuksen arvon, jos kyseinen (osio, avain) on korvattu, muuten vanhan arvon.
   Avain-tarkka (EI arvopohjainen kuten S67): sama vanha sv voi esiintyä korvaamattomalla avaimella. */
const P80 = lue('sv_kaannoserae_80_palautus.json');
export const E80 = (osio, avain, vanha) => { const r = P80[osio] && P80[osio].rivit[avain]; return r ? r.sv : vanha; };
import { createRequire } from 'module';
const K1D = createRequire(import.meta.url)('./k1d_korvaukset.cjs');   // vanha fi-avain → uusi (sanastomuutos)
export const E80AVAIN = (avain, vanha) => { for (const k of [avain, K1D.uusi(avain)]) for (const o of Object.values(P80)) if (o.rivit[k]) return o.rivit[k].sv; return vanha; };   // osiosta riippumaton (avain jaetaan osioiden kesken)
/* sv-korjauserä B5 (PM 4.11.2026; docs/i18n/sv_korjaus_b5_utforande.json): "Aktion" → "Utförande" kolmessa avaimessa. Vanhojen erien testit vertaavat erän omaan arvoon:
   KB5(kohde, avain, vanha) palauttaa korjauserän sv:n, jos (kohde = 'tm_lang' | 'lib', avain) on korjattu ja vanha = korjauserän sv_vanha; muuten vanhan arvon. Avain-tarkka. */
const B5 = JSON.parse(readFileSync(new URL('../../docs/i18n/sv_korjaus_b5_utforande.json', import.meta.url), 'utf8')).osiot;
export const KB5 = (kohde, avain, vanha) => { const r = B5[kohde] && B5[kohde].rivit[avain]; return r && r.sv_vanha === vanha ? r.sv : vanha; };
