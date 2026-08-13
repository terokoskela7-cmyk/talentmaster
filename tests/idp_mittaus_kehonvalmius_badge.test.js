/**
 * TalentMaster™ — R2-viimeistely: Kehon valmius (FLEI) oma lohko + tekniikkabadge selkokielelle.
 * 5a: FLEI irti Teknisestä → oma lohko + heikoin-ketju/§14-klinikkasignaali (renderFleiKortti 3 tilaa säilyy).
 * 5b: "A5"→"5/5 alue" · "V3/3"→"3/3 valtak." — Alue(1–5) ja Valtak(1–3) ERI asteikot (§34/§30, ei yhdistetä).
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
  if (s < 0) throw new Error('ei löytynyt: ' + sig);
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}

let KV;
beforeAll(() => {
  KV = new Function(
    'var _jsvEsc = function(s){return String(s==null?"":s);};\n' +
    'var renderFleiKortti = function(p){ return "<FLEIKORTTI flei=" + (p.flei_viimeisin==null?"none":p.flei_viimeisin) + ">"; };\n' +
    extract('function _vpKehonValmiusHTML(p) {') + '\n' +
    'return { kv: _vpKehonValmiusHTML };'
  )().kv;
});

describe('5a — Kehon valmius: heikoin ketju + §14-klinikka', () => {
  it('heikoin ketju = pienin raaka-arvo (Topias: LL 2.10)', () => {
    const h = KV({ flei_viimeisin: 62, sbl: 2.16, sfl: 2.30, ll: 2.10, diag: 2.40, dfl: 2.20 });
    expect(h).toContain('Heikoin ketju: <b style="color:var(--ink)">LL</b>');
    expect(h).toContain('S-harjoite kohdistuu tähän (§14)');
    expect(h).not.toContain('klinikkalähetys');   // 62 ≥ 40 → ei klinikkaa
    expect(h).toContain('<FLEIKORTTI');           // renderFleiKortti säilyy
  });
  it('FLEI < 40 → §14-klinikkalippu (amber)', () => {
    const h = KV({ flei_viimeisin: 35, sbl: 1.4, sfl: 1.5, ll: 1.2, diag: 1.6, dfl: 1.3 });
    expect(h).toContain('Heikoin ketju: <b style="color:var(--ink)">LL</b>');
    expect(h).toContain('klinikkalähetys (§14)');
    expect(h).toContain('var(--amber)');
  });
  it('ei ketjudataa → ei heikoin-riviä, mutta renderFleiKortti (tyhjä-tila) säilyy', () => {
    const h = KV({});
    expect(h).not.toContain('Heikoin ketju');
    expect(h).toContain('<FLEIKORTTI flei=none>');
  });
  it('eri heikoin ketju kun DIAG matalin', () => {
    expect(KV({ flei_viimeisin: 55, sbl: 2.5, sfl: 2.4, ll: 2.3, diag: 1.9, dfl: 2.6 })).toContain('>DIAG</b>');
  });
});

describe('5a — kytkentä: FLEI oma lohko, EI Teknisessä (renderFleiKortti tasan kerran)', () => {
  it('renderFleiKortti kutsutaan vain _vpKehonValmiusHTML:ssä (poistettu _tekSyva:sta)', () => {
    // 2 osumaa = 1 kutsu (? renderFleiKortti(p) :) + 1 määrittelysignatuuri (function renderFleiKortti(p) {) — ei enää f2-kutsua
    expect((HTML.match(/renderFleiKortti\(p\)/g) || []).length).toBe(2);
    expect(HTML).not.toContain('_tekSyva += renderFleiKortti(p)');
    expect(HTML).toContain('? renderFleiKortti(p) : \'\'');
  });
  it('Kehon valmius -lohko tab-1:ssä Teknisen (f2) jälkeen, nextstepin edellä', () => {
    const iF2 = HTML.indexOf("_mSub('Tekninen · mitattu') + f2");
    const iKv = HTML.indexOf("_mSub('Kehon valmius') + (typeof _vpKehonValmiusHTML");
    const iNext = HTML.indexOf('_vpMittausNextStepHTML(p) :');
    expect(iF2).toBeLessThan(iKv);
    expect(iKv).toBeLessThan(iNext);
  });
});

describe('5b — tekniikkabadge selkokielelle (Alue 1–5 ≠ Valtak 1–3, §34/§30)', () => {
  it('alue-badge "X/5 alue" (ei salakielinen "A"+taso)', () => {
    expect(HTML).toContain("+ d.tkTaso + '/5 alue</span>'");
    expect(HTML).not.toContain("'>A' + d.tkTaso + '</span>'");
  });
  it('valtak-badge "X/3 valtak." (ei salakielinen "V"+/3)', () => {
    expect(HTML).toContain("+ vt + '/3 valtak.</span>'");
    expect(HTML).not.toContain("+ vt + '/3</span>'");
  });
  it('selite kevennetty lähdemaininnaksi, asteikot yhä erillään (ei yhdistetä)', () => {
    expect(HTML).toContain('kilpailukohortti 1–5');
    expect(HTML).toContain('Eerikkilä 1–3 (syöttö/pujottelu)');
  });
  it('sekuntibudjetti/gap-legenda (★/🟡/🔴) säilyy (eri asia kuin asteikko)', () => {
    expect(HTML).toContain('matka alueen kärkeen (★ saavutettu');
  });
});
