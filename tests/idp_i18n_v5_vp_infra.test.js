/**
 * TalentMaster - i18n Vaihe 5 (henkilöstö) · VP_v25 · Vaihe 0: infra + aina-näkyvä chrome.
 * String-avainkartta (fi → sv) lib/tm_vp_i18n.js (Kim-muisti, sanktioitu) + vpT()/vpLokalisoi(data-i18n).
 * Chrome (nav/topbar/page-titlet/login) tagattu data-i18n:llä; kielivalitsin + Osa B (seura.kieli) kytketty.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

afterEach(() => { delete global.tmNykyinenKieli; });

describe('lib/tm_vp_i18n.js — string-avainkartta + vpT', () => {
  const M = require('../lib/tm_vp_i18n.js');
  it('sv-kartta iso (Kim-muisti, >=2000 paria)', () => {
    expect(Object.keys(M.TM_VP_I18N.sv).length).toBeGreaterThanOrEqual(2000);
  });
  it('vpT: sv chrome-käännökset (fi-avain → sv)', () => {
    global.tmNykyinenKieli = () => 'sv';
    ['Pelaajat:Spelare', 'Kalenteri:Kalender', 'Tilanne:Läge', 'Valmentajat:Tränare',
      'Raportointi:Rapportering', 'Asetukset:Inställningar', 'Kirjaudu ulos:Logga ut',
      'Koti:Hem', 'Joukkueet:Lag', 'Raportit:Rapporter', 'Testit:Tester', 'Lisää:Mer',
      'Kirjaa ja tuo testituloksia:Registrera och importera testresultat'].forEach((p) => {
      const [fi, sv] = p.split(':');
      expect(M.vpT(fi)).toBe(sv);
    });
  });
  it('fi ei rikkoudu: ei kieltä → fi; puuttuva avain → fi', () => {
    expect(M.vpT('Pelaajat')).toBe('Pelaajat');   // ei globaalia → fi
    global.tmNykyinenKieli = () => 'sv';
    expect(M.vpT('EI OLE KARTASSA XYZ')).toBe('EI OLE KARTASSA XYZ');
    expect(M.vpT(null)).toBe(null);
  });
});

describe('VP_v25 infra kytketty', () => {
  it('lataa tm_lang ?v=9 (ei stale ?v=1) + tm_vp_i18n', () => {
    expect(VP).toMatch(/lib\/tm_lang\.js\?v=([9]|\d\d)/);
    expect(VP).toContain('lib/tm_vp_i18n.js');
    expect(VP).not.toContain('lib/tm_lang.js?v=1"');
  });
  it('kielivalitsin kytketty (FI/SV/EN → vpVaihdaKieli, ei staattinen)', () => {
    expect(VP).toContain("vpVaihdaKieli('fi')");
    expect(VP).toContain("vpVaihdaKieli('sv')");
    expect(VP).toContain("vpVaihdaKieli('en')");
    expect(VP).toContain('function vpVaihdaKieli(lang)');
    expect(VP).toContain('function vpPaivitaKielivalitsin()');
  });
  it('Osa B: seura.kieli → tmKieliInitSeura (VP autentikoitu → lukee seura-dokin) + vpLokalisoi kutsuttu', () => {
    expect(VP).toContain('tmKieliInitSeura');
    expect(VP).toContain("collection('seurat').doc(_seuraId).get()");
    expect(VP).toContain('vpLokalisoi()');
  });
});

describe('VP_v25 chrome tagattu data-i18n:llä', () => {
  it('nav-tabit data-i18n (6)', () => {
    ['Koti', 'Joukkueet', 'Valmentajat', 'Raportit', 'Testit', 'Lisää'].forEach((t) =>
      expect(VP).toContain('<span class="tb-lbl" data-i18n="' + t + '">' + t + '</span>'));
  });
  it('page-titlet data-i18n (8)', () => {
    ['Asetukset', 'Kalenteri', 'Pelaajat', 'Raportointi', 'Seuranta', 'Valmentajat'].forEach((t) =>
      expect(VP).toContain('<div class="page-title" data-i18n="' + t + '">' + t + '</div>'));
  });
  it('login + topbar tagattu (data-i18n / -ph / -title)', () => {
    expect(VP).toContain('data-i18n="Valmennuspäällikkö"');
    expect(VP).toContain('data-i18n="Kirjaudu sisään"');
    expect(VP).toContain('data-i18n-ph="Salasana"');
    expect(VP).toContain('data-i18n-title="Kirjaudu ulos"');
    expect(VP).toContain('data-i18n="Ilmoitukset"');
  });
});

describe('VP_v25 Vaihe 0 -täydennys: koko aina-näkyvä chrome reititetty (kielineutraali portti)', () => {
  // Chrome-blokki = #sLogin .. juuri ennen <!-- MAIN --> (login+topbar+tabbar+sidebar+notif).
  const a = VP.indexOf('<div id="sLogin">');
  const b = VP.indexOf('<!-- MAIN -->');
  const block = VP.slice(a, b).replace(/<!--[\s\S]*?-->/g, '');   // HTML-kommentit näkymättömiä → pois

  it('0 reitittämätöntä tekstisolmua chrome-kontainereissa (brändi pl.)', () => {
    // Kevyt tekstisolmu-portti: >teksti< joka ei ole elementissä jolla data-i18n, ≥3 kirjainta.
    const stack = [];
    const orphan = [];
    const tokRe = /<\/?([a-zA-Z][\w-]*)((?:[^<>]|"[^"]*")*)>|([^<]+)/g;
    const voidT = new Set(['input', 'br', 'img', 'path', 'circle', 'rect', 'svg', 'line', 'polyline', 'polygon', 'use', 'meta', 'hr']);
    let m;
    while ((m = tokRe.exec(block))) {
      if (m[1] !== undefined) {
        const tag = m[1].toLowerCase();
        const closing = m[0][1] === '/';
        if (closing) { for (let i = stack.length - 1; i >= 0; i--) { if (stack[i].tag === tag) { stack.length = i; break; } } continue; }
        if (voidT.has(tag)) continue;
        stack.push({ tag, i18n: /\bdata-i18n(?:-ph|-title)?\s*=/.test(m[2]) });
      } else {
        const t = m[3].replace(/&[a-z]+;/gi, ' ').trim();
        if ((t.match(/[A-Za-zÀ-ÿ]/g) || []).length < 3) continue;
        if (t === 'Master' || t === 'Talent') continue;                 // brändilogo
        if (t === 'Kirjaudu Google-tilillä') continue;                  // tunnettu sanktioimaton sv-aukko (reititetty, fi-fallback)
        if (stack.some((s) => s.i18n)) continue;
        orphan.push(t.slice(0, 40));
      }
    }
    expect(orphan).toEqual([]);
  });

  it('sivupalkin nav-labelit + section-labelit reititetty', () => {
    ['Työtilat', 'Työkalut', 'Koti', 'Seuranta', 'Raportointi', 'Kalenteri',
      'Pelihavainto', 'Jaksofokus', 'Ohjelmakirjasto', 'Bio-banding', 'Arvioi harjoitus'].forEach((t) =>
      expect(block).toContain('data-i18n="' + t + '"'));
  });

  it('login/breadcrumb/notif jäännökset reititetty', () => {
    expect(block).toContain('data-i18n="tai"');
    expect(block).toContain('data-i18n="Kokeile demona →"');
    expect(block).toContain('data-i18n="Kirjaudu Google-tilillä"');   // reititetty vaikka sv-sanktio kesken
    expect(block).toContain('data-i18n="Hae pelaajaa, joukkuetta..."');
    expect(block).toContain('data-i18n-title="Ilmoitusasetukset"');
    expect(block).toContain('<span class="bc-active" data-i18n="Tilanne">');
  });

  it('uudet Kim-poimitut sv-arvot (sanktioitu full-HTML-avaimista)', () => {
    const Mod = require('../lib/tm_vp_i18n.js');
    global.tmNykyinenKieli = () => 'sv';
    expect(Mod.vpT('Arvioi harjoitus')).toBe('Bedöm träning');
    expect(Mod.vpT('Ohjelmakirjasto')).toBe('Programbibliotek');
    expect(Mod.vpT('Bio-banding')).toBe('Bio-banding');
  });
});
