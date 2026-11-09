/**
 * Projekti 03 (PR C) — staattinen vartija: avauskirjoitukset eivät palaa selaimeen.
 * Kirjautumisaikaleima (`viimeisinKirjautuminen`) ja automaattiset toimenpide-ehdotukset kirjoitetaan palvelimella
 * (functions/kirjautumisaika.js, viikkokooste + deterministinen id). Jos kirjoitus palaa koodiin, tämä kaatuu jo ennen savutestiajoa
 * (tools/savutesti: sallittulista tyhjä, mikä tahansa kirjoitus kaataa näkymän).
 *   · HTML (TalentMaster_*.html + Seuran osat seura/*.js) ja lib/*.js: ei kutsuja tmMerkitseKirjautuminen( · merkitseKirjautuminen( · tallennaToimenpide( · generoimToimenpideEhdotukset(
 *   · VP ei luo toimenpiteet-dokumentteja auto-id:llä (.add( / .doc().set). Pulssin deterministinen pulssi_-id on sallittu.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
const { lueKuori } = createRequire(import.meta.url)('../scripts/kuoren_lahde.js');   // Seura.html + seura/-osat

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readdirSync(juuri).filter((f) => /^TalentMaster_.*\.html$/.test(f));
const LIBIT = readdirSync(join(juuri, 'lib')).filter((f) => /\.js$/.test(f)).map((f) => 'lib/' + f);
const lue = (f) => lueKuori(f);
const KIELLETYT = [/\btmMerkitseKirjautuminen\s*\(/, /\bmerkitseKirjautuminen\s*\(/, /\btallennaToimenpide\s*\(/, /\bgeneroimToimenpideEhdotukset\s*\(/];

describe('Avauskirjoitusvartija (projekti 03)', () => {
  it('lähdejoukko on olemassa (vartija ei ole tyhjä)', () => {
    expect(HTML.length).toBeGreaterThan(10);
    expect(HTML).toContain('TalentMaster_VP_v25.html');
    expect(LIBIT.length).toBeGreaterThan(20);
  });
  it.each(KIELLETYT.map((re) => [re.source, re]))('ei kutsua %s HTML- eikä lib-tiedostoissa', (_n, re) => {
    const osumat = HTML.concat(LIBIT).filter((f) => re.test(lue(f)));
    expect(osumat, 'avauskirjoitus palasi koodiin (palvelin hoitaa)').toEqual([]);
  });
  it('lib/tm_aktiivisuus.js: ei kirjoitusta (vain aikaMs + paiviaKirjautumisesta)', () => {
    const lib = readFileSync(join(juuri, 'lib/tm_aktiivisuus.js'), 'utf8');
    expect(lib).not.toMatch(/\.update\(|\.set\(|\.add\(/);
  });
  it('VP ei luo toimenpiteet-dokumentteja auto-id:llä: ei collection(\'toimenpiteet\').add( eikä .doc().set', () => {
    const vp = lue('TalentMaster_VP_v25.html');
    expect(vp, "collection('toimenpiteet').add(").not.toMatch(/collection\('toimenpiteet'\)\s*\.add\s*\(/);
    expect(vp, "collection('toimenpiteet').doc().set(").not.toMatch(/collection\('toimenpiteet'\)\s*\.doc\(\s*\)/);
  });
  it('VP:n sallitut toimenpiteet-kirjoitukset: pulssin deterministinen id + tilamuutokset (update) — ei muita set/add-polkuja', () => {
    const vp = lue('TalentMaster_VP_v25.html');
    const setit = vp.match(/collection\('toimenpiteet'\)\.doc\([^)]*\)\)?\.set\(/g) || [];
    expect(setit.length).toBe(1);
    expect(setit[0]).toContain('tmPulssiKuittausId');   // pulssi_{signaali}_{joukkue}
  });
  it('VP lukee yhä toimenpiteet (lataus + kuittaus + hylkäys + muokkaus säilyvät)', () => {
    const vp = lue('TalentMaster_VP_v25.html');
    for (const f of ['async function lataaAvoimetToimenpiteet(', 'async function _alustaToimenpiteet(', 'window._kuittaaToimenpide', 'window._hylkaaToimenpide', 'window._vpPulssiKuittaa']) expect(vp, f).toContain(f);
    expect(vp).toContain("tila: 'kuitattu'"); expect(vp).toContain("tila: 'hylatty'"); expect(vp).toContain("tila: 'muokattu'");
  });
});
