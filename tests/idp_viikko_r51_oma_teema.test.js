/**
 * TalentMaster™ — R5.1: Viikko oma harjoitusteema + monidomeeni → KALENTERIIN.
 * Valmentaja lisää Viikon päivälle vapaan teeman/muun domeenin (🏃/⚽/🧠/🤝) → viedään seuran kalenteriin (§35, EI
 * pelkkiin kirjauksiin) → näkyy pelaajalle (P7-c.1) + joukkueelle + Viikossa, K2-läsnäolo kiinnittyy.
 * REUSE: _vpJfDomeeniKonseptit (4-domeeni) + avaaUusiTapahtuma (kalenteriluonti). Ei uutta kokoelmaa, ei suoraa Firestore-kirjoitusta.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

function extract(sig) {
  const lines = HTML.split('\n');
  const s = lines.findIndex((l) => l.includes(sig));
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}
function extractWin(sig) {
  const lines = HTML.split('\n');
  const s = lines.findIndex((l) => l.includes(sig));
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '};') { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}

describe('REUSE-arkkitehtuuri — kalenteriin, ei kirjauksiin/uuteen kokoelmaan', () => {
  it('vie kalenteriin olemassa olevan avaaUusiTapahtuma-luontimodaalin kautta (ei suoraa db.set)', () => {
    const V = extractWin('window._vpViikkoVieKalenteriin = function (pid, iso) {');
    expect(V).toContain('avaaUusiTapahtuma(iso, prefill)');
    expect(V).not.toContain('db.collection');   // ei suoraa Firestore-kirjoitusta
    expect(V).toContain("tyyppi: 'harjoitus'");
    expect(V).toContain("lahde: 'viikko'");
  });
  it('4-domeeni-lista tulee _vpJfDomeeniKonseptit:sta (reuse)', () => {
    expect(extract('function _vpViikkoOmaTeemaHTML(pid, day, p) {')).toContain('_vpJfDomeeniKonseptit(p, dom)');
  });
  it('oma-teema-editori mountattu edit-on-tap-paneeliin', () => {
    expect(HTML).toContain('_vpViikkoOmaTeemaHTML(pid, day, p) : \'\'');
  });
});

describe('_vpViikkoOmaTeemaHTML — 4 domeenia + konseptivalinta + kohde + vie-nappi', () => {
  let fn;
  beforeAll(() => {
    fn = new Function(
      'var _jsvEsc=function(s){return String(s==null?"":s);};\n' +
      'var _vpJfDomeeniKonseptit=function(p,dom){return dom==="fyysinen"?[{avain:"nopeus",nimi:"Nopeus"}]:[{avain:"y_h1",nimi:"Haltuunotto"}];};\n' +
      'var window={_vpViikko:{teema:{dom:"fyysinen",kohde:"pelaaja"}}};\n' +
      extract('function _vpViikkoOmaTeemaHTML(pid, day, p) {') + '\n return _vpViikkoOmaTeemaHTML;'
    )();
  });
  it('renderöi 4 domeenia (🏃/⚽/🧠/🤝) + konseptit valitusta domeenista + kohde + vie-nappi', () => {
    const h = fn('p1', { iso: '2026-08-18', nimi: 'Ti', pvm: '18.8.' }, { id: 'p1', joukkue: 'KPV U13' });
    expect(h).toContain('🏃 Fysiikka');
    expect(h).toContain('⚽ Teknis-takt.');
    expect(h).toContain('🧠 Psyykkinen');
    expect(h).toContain('🤝 Sosiaalinen');
    expect(h).toContain('Nopeus');                                   // fyysinen-konsepti (valittu domeeni)
    expect(h).toContain('✎ vapaa teksti…');                          // vapaa-teksti-optio
    expect(h).toContain('👤 Pelaajalle');
    expect(h).toContain('👥 Joukkueelle');
    expect(h).toContain("_vpViikkoVieKalenteriin('p1','2026-08-18')");
    expect(h).toContain('näkyy pelaajalle (Seuran aikataulu) + joukkueelle + Viikossa');
  });
});

describe('_vpViikkoVieKalenteriin — treeniteema-prefill + kohde (pelaaja/joukkue)', () => {
  function run(teema) {
    const calls = [];
    const harness = new Function(
      'var __calls=arguments[0];\n' +
      'var toast=function(){};\n' +
      'var avaaUusiTapahtuma=function(pvm,prefill){__calls.push({pvm:pvm,prefill:prefill});};\n' +
      'var window={_vpViikko:{pid:"p1",p:{id:"p1",joukkue:"KPV U13"},teema:arguments[1]}};\n' +
      extractWin('window._vpViikkoVieKalenteriin = function (pid, iso) {') +
      '\n window._vpViikkoVieKalenteriin("p1","2026-08-18"); return __calls;'
    );
    return harness(calls, teema);
  }
  it('konsepti pelaajalle → treeniteema{tyyppi:dom, avain, nimi, lahde:viikko} + pelaajat_id:[pid]', () => {
    const c = run({ dom: 'fyysinen', avain: 'nopeus', nimi: 'Nopeus', kohde: 'pelaaja' });
    expect(c).toHaveLength(1);
    expect(c[0].pvm).toBe('2026-08-18');
    expect(c[0].prefill.tyyppi).toBe('harjoitus');
    expect(c[0].prefill.treeniteema).toEqual({ tyyppi: 'fyysinen', avain: 'nopeus', nimi: 'Nopeus', koodi: null, lahde: 'viikko' });
    expect(c[0].prefill.pelaajat_id).toEqual(['p1']);
    expect(c[0].prefill.joukkueNimi).toBeUndefined();
  });
  it('vapaa teksti joukkueelle → nimi vapaatekstistä + joukkueNimi', () => {
    const c = run({ dom: 'sosiaalinen', vapaaMode: true, vapaa: 'Ryhmähenki-peli', kohde: 'joukkue' });
    expect(c[0].prefill.treeniteema.nimi).toBe('Ryhmähenki-peli');
    expect(c[0].prefill.treeniteema.avain).toBe('vapaa_sosiaalinen');
    expect(c[0].prefill.joukkueNimi).toBe('KPV U13');
    expect(c[0].prefill.pelaajat_id).toBeUndefined();
  });
  it('ei nimeä (ei konseptia eikä vapaatekstiä) → ei kutsua (guard)', () => {
    const c = run({ dom: 'fyysinen', kohde: 'pelaaja' });
    expect(c).toHaveLength(0);
  });
});

describe('domeeni-handlerit', () => {
  it('_vpViikkoTeemaDom vaihtaa domeenin + nollaa konseptivalinnan', () => {
    const D = extractWin('window._vpViikkoTeemaDom = function (pid, dom) {');
    expect(D).toContain('st.teema.dom = dom');
    expect(D).toContain('st.teema.avain = null');
    expect(D).toContain('st.teema.vapaaMode = false');
  });
  it('_vpViikkoTeemaVapaa EI re-renderöi (input-fokus säilyy)', () => {
    const line = HTML.split('\n').find((l) => l.includes('window._vpViikkoTeemaVapaa = function (pid, val) {'));
    expect(line).toBeTruthy();
    expect(line).toContain('st.teema.vapaa = val');
    expect(line).not.toContain('_vpViikkoReRender()');
  });
});

describe('Täytä-viikko-mappaus laajenee (monidomeeni → oma nimi, ei pakoteta A:han)', () => {
  it('teemaNimi vangitaan kalenterista + non-jaksofokus-teema näyttää oman nimen', () => {
    expect(HTML).toContain('teemaNimi: (t.treeniteema && t.treeniteema.nimi) || null');
    expect(HTML).toContain('else if (ev.teemaNimi) { row.tavoite_tag = null; row.konsepti_avain = ev.teemaAvain || null; row.fokus_nimi = ev.teemaNimi; }');
    // A/B/C-logiikka ennallaan: jaksofokus-teema matchaa yhä tavoitteeseen
    expect(HTML).toContain('const m = ev.teemaAvain ? st.tavoitteet.find(function (t) { return t.avain === ev.teemaAvain; }) : null;');
  });
});
