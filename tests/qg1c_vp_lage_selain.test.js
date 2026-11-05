/* QG-1c · hyväksyntä (PM 2.11.2026): kielivartija löytää VP → Läge -näkymän suomen oikean datan tiloissa (fixture-seuran Läge-muunnelma, sv-tila).
   Niin kauan kuin erä 96 odottaa PM:ää, jokainen PM:n listan kohta on löydettävä; erän viennin jälkeen (5.11.2026) yksikään ei saa enää näkyä suomeksi
   EIKÄ Läge-paneelissa (#tilanne…, .tt-*) saa näkyä mitään muutakaan suomea (yläpalkki, piilomodaalit ja muut työtilat eivät ole Läge-näkymää).
   Lisäksi dump: tuplaosa ("6/6 uppmätta · … · 6/6 uppmätta") ei toistu. Ajetaan vain chrome-tests-vaiheessa (.github/chrome_testit.txt). */
import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const ODOTTAA = /const ODOTTAVAT_ERAT = \[([^\]]*)\]/.exec(readFileSync(join(JUURI, 'tools/i18n/sv_kattavuus.mjs'), 'utf8'))[1].split(',').map((x) => x.trim()).includes('96');
/* PM:n lista (.briefit/CODE_BRIEF_LAATUPORTIT_QG.md, LISÄYS 2.11.) sv-tilan renderöintinä */
const PM = [/^kooste /, /^Kausi on alussa\.$/, /Tärkein asia on, että joukkueet aloittavat jaksonsa\./, /^Onko mitattu tällä kaudella\?$/, /^Fysiska tester som utvecklingsområde · \d+ joukkuetta$/,
  /^Fyysiset testit asteikon alarajalla · \d+ joukkuetta$/, /^Taso laskenut kahden viimeisen testin välillä · \d+ joukkuetta$/, /Fyysinen profiili epätasainen/, /testattu \d+ kk sitten/, /^teknik · profiili$/,
  /^Mittaus on vanha$/, /^viimeksi \d{4} · ei tasoarviota$/, /^Kypsyys mittaamatta · \d+ pelaajaa$/, /^Fyysisiä tuloksia ei tulkita ennen kypsyyden mittaamista\.$/,
  /^Tekniikkaharjoittelua för ett lag$/, /^Tekniikka on kehityskohteena\.$/, / \d+ joukkueelle$/, /^\/\d+ yli 12 kk vanha$/, /^talenttia · \d+ ehdokasta$/, /\d+ odottaa mittausta\.$/, /^\/\d+ syntymäaikaa$/];

function aja(lisa) {
  const d = mkdtempSync(join(tmpdir(), 'qg1c-'));
  const r = spawnSync(process.execPath, [join(JUURI, 'tools/i18n/sv_lapiajo.mjs'), '--sovellus=fx_vp_lage', ...lisa(d)], { encoding: 'utf8', env: Object.assign({}, process.env, { TM_CHROME_PATH: CHROME }), timeout: 240000 });
  return { d, koodi: r.status, ulos: (r.stdout || '') + (r.stderr || '') };
}

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('QG-1c · kielivartija VP Läge -tiloissa', () => {
  let fi = [], fiRivit = [], kaikki = [];
  beforeAll(() => {
    const a = aja((d) => ['--ulos=' + join(d, 't.json')]); expect(a.koodi, a.ulos.slice(-800)).toBe(0);
    fiRivit = Object.values(JSON.parse(readFileSync(join(a.d, 't.json'), 'utf8')).nakymat).flatMap((v) => v.fi); fi = fiRivit.map((r) => r.teksti); rmSync(a.d, { recursive: true, force: true });
    const b = aja((d) => ['--dump=' + join(d, 'd.json')]); expect(b.koodi, b.ulos.slice(-800)).toBe(0);
    kaikki = Object.values(JSON.parse(readFileSync(join(b.d, 'd.json'), 'utf8'))).flat(); rmSync(b.d, { recursive: true, force: true });
  }, 600000);

  it(ODOTTAA ? 'erä 96 odottaa → vartija löytää jokaisen PM:n listan kohdan' : 'erä 96 viety → yksikään PM:n listan kohta ei näy suomeksi', () => {
    for (const re of PM) { const osuma = fi.some((t) => re.test(t)); expect(osuma, String(re)).toBe(ODOTTAA); }
  });
  it.skipIf(ODOTTAA)('erä 96 viety → Läge-paneelissa ei yhtään suomenkielistä tekstiä', () => {
    const LAGE = /#tilanne|\.tt(?:-|\b)/;   // paneeli: #tilanneKausi/#tilannePoikkeamat/#tilanneEhdotukset/…, .tt / .tt-list / .tt-it / .tt-ryhma
    const lage = fiRivit.filter((r) => LAGE.test(r.polku)); expect(lage.map((r) => r.teksti + '  @ ' + r.polku)).toEqual([]);
  });
  it('näkymä renderöi tilat: profiilirivi, kypsyys, vanha mittaus, ehdotus yhdelle ja usealle joukkueelle', () => {
    const t = kaikki.join('\n');
    for (const s of ['QG P14:', 'QG P11:', 'QG T15:']) expect(t, s).toContain(s);
    expect(t).toMatch(/för ett lag/); expect(t).toMatch(/ \d+ (joukkueelle|lag)\b/);
  });
  it('bugi: sama osa ei toistu huomiorivin metassa (PM: "9/14 uppmätta · 9/14 uppmätta")', () => {
    for (const r of kaikki) { const m = r.match(/(\d+\/\d+ uppmätta)(?: · [^·]+)* · \1/); expect(m, r).toBe(null); }
  });
});
