/**
 * TalentMaster - S7.22-korjaus: Pelaaja_v7 tasoluku (1-5) + XP pois pelaajapinnalta (S22/S16/S7.22).
 * XP saa elaa vain Firestoressa AI-agentille; TKI-/tasolukuja ei nayteta lapselle. FC-kortti (naytaFcOverlay)
 * = POIKKEUS (S28/S36-suunniteltu turvalliseksi). rTDone-palkintohetki: virstanpylvas-kortti tai _streakViesti.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const PEL = readFileSync(join(__dir, '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');

describe('S7.22 - stray tasoluku/XP-renderoinnit poistettu pelaajapinnalta', () => {
  it('rPin-KPI (Taso hhTaso + XP) poistettu (ei consteja eika renderia)', () => {
    expect(PEL).not.toContain("const hhTaso = (p && p.hh_taso");
    expect(PEL).not.toContain("const xp = (p && p.xp != null) ? p.xp");
    expect(PEL).not.toContain(">Taso</div>\n        <div style=\"font-family:var(--font-d);font-size:20px;color:#F2EFE6;margin-top:2px;line-height:1\">${hhTaso}");
  });
  it('XP-progressbar (Taso N + xp -> xp+40 / xpNext + palkki) poistettu', () => {
    expect(PEL).not.toContain('${xp} → ${xp+40} / ${xpNext}');
    expect(PEL).not.toContain('const xpNext=taso*1000');
  });
  it('rKortti "Taso {p.taso}" (XP-taso) -rivi poistettu', () => {
    expect(PEL).not.toContain("{l:'Taso',        v:p?.taso||1}");
  });
  it('rMinaMAS "taso X/5" poistettu (raaka m/s . km/h jaa)', () => {
    expect(PEL).not.toContain("Aerobinen kapasiteetti: taso ' + (taso");
    expect(PEL).not.toContain("km/h · taso ' + (taso");
    expect(PEL).toContain("km/h</div></div>'");   // raaka-arvo sailyy
  });
  it('rVapaa "+X XP" -teksti + -pilleri poistettu', () => {
    expect(PEL).not.toContain('Saat <span style="color:var(--teal-d);font-weight:600">+${Math.round(_vaMin*0.5)} XP</span>');
    expect(PEL).not.toContain('border-radius:20px;font-size:11px;color:#28B090;font-weight:600">+${Math.round(_vaMin*0.5)} XP</div>');
  });
  it('rA2/rA3-devstubit + a2/a3-devnapit + draw-haarat poistettu', () => {
    expect(PEL).not.toContain('function rA2()');
    expect(PEL).not.toContain('function rA3()');
    expect(PEL).not.toContain('onclick="go(\'a2\')">A2 Signal');
    expect(PEL).not.toContain("_sc==='a2'");
    expect(PEL).not.toContain("_sc==='a3'");
  });
});

describe('FC-kortti (naytaFcOverlay) = POIKKEUS, koskematon (S28/S36)', () => {
  it('naytaFcOverlay + rakentaja taso5/5 + DRI 88 -teaser sailyvat', () => {
    expect(PEL).toContain("vyoh === 'rakentaja'");
    expect(PEL).toContain('d.taso5 != null');
    expect(PEL).toContain('Seuraava taso: DRI 88');
  });
});

describe('rTDone palkintohetki (KOHTA 2b) - S7.22-turvallinen', () => {
  it('virstanpylvas (s===7 || s===14) lukee saavutusrekisterista + CTA kokoelmaan', () => {
    expect(PEL).toContain('var s = _haeStreak();');
    expect(PEL).toContain("(s === 7) ? 'ach_liekki7' : 'ach_liekki14'");
    expect(PEL).toContain('Viikon liekki auennut!');
    expect(PEL).toContain('onclick="go(\\\'mina\\\')"');
    expect(PEL).toContain('${_palkintoHtml}');
  });
  it('muuten positiivinen _streakViesti (ei XP/progressbaria/menetyskehysta palkintokortissa)', () => {
    expect(PEL).toContain("+ '<div style=\"font-size:13px;color:var(--text);line-height:1.5\">' + _streakViesti(s)");
    // palkintokortin lohko ei sisalla XP:ta/progressbaria/menetyskehysta
    const i = PEL.indexOf('var _palkintoHtml;');
    const blk = PEL.slice(i, i + 1200);
    expect(/menetät|progressbar|width:\$\{pct\}|\bXP\b/.test(blk)).toBe(false);
  });
});

describe('Logiikka + Firestore-kirjoitus ennallaan + cache-bump', () => {
  it('XP-kirjoitus (tXP + xp: write) sailyy', () => {
    expect(PEL).toContain("_tallennaKirjaus('T', tXP, true, {");
    expect(PEL).toContain('xp: (_pelaaja.xp || 0) + (xp || 0)');
    expect(PEL).toContain('const tXP = taso===1 ? 20 : taso===2 ? 30 : 40');
  });
  it('SW-cache >= v15 (kestaa myohemmat bumpit, esim. i18n V4-A -> v16)', () => {
    expect(readFileSync(join(__dir, '..', 'sw_pelaaja.js'), 'utf8')).toMatch(/const CACHE = 'tm-pelaaja-v(1[5-9]|[2-9]\d)'/);
  });
});
