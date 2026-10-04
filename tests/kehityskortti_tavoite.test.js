/**
 * Kehityskortin etupuoli ei saa leikata "Minun tavoitteeni" -laatikkoa (havainto PR E:n kuvissa, myös mainissa).
 * Mitattu (Playwright 360×780): rakentaja-kortti ylitti .fc-body:n 18 px, leikkijä 50 px, pitkä oma tavoite 48 px.
 * Korjaus: tiivistetyt välit → tavallinen rakentaja mahtuu 470 px:iin; pidempi sisältö vierittyy SISÄISESTI (.fc-front .fc-body).
 * Skaalaus (.fc-scale, PR E) ja flip ennallaan. Visuaalinen todennus: kuvat docs/kuvakaappaukset/kehityskortti_tavoite/.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const PEL = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const saanto = (sel) => { const i = PEL.indexOf(sel + '{'); expect(i, sel).toBeGreaterThan(-1); return PEL.slice(i, PEL.indexOf('}', i) + 1); };

describe('Kehityskortti · etupuolen sisältö ei leikkaudu', () => {
  it('etupuoli vierittyy sisäisesti kun sisältö ei mahdu (ei overflow:hidden-leikkausta)', () => {
    const r = saanto('.fc-front .fc-body');
    expect(r).toContain('overflow-y:auto');
    expect(r).toContain('overscroll-behavior:contain');
    expect(PEL).toContain('.fc-front .fc-body::-webkit-scrollbar{display:none}');
  });
  it('tiivistetyt välit (mitattu: rakentaja mahtuu 470 px:iin ilman vieritystä)', () => {
    expect(saanto('.fc-av')).toContain('width:40px;height:40px');
    expect(saanto('.fc-j')).toContain('padding:6px 11px;margin-top:4px');
    expect(saanto('.fc-goal')).toContain('margin-top:3px');
  });
  it('skaalaus ja kortin mitat ennallaan (PR E): .fc-wrap 286×470, .fc-scale-in transform', () => {
    expect(PEL).toContain('.fc-wrap{width:286px;height:470px;');
    expect(saanto('.fc-scale-in')).toContain('transform:scale(var(--fc-s))');
  });
});
