/**
 * TalentMaster - i18n V4-A: harjoitesisalto (harjoitelogiikka_v4.js) sv.
 * Pelaajan paivittainen TANAAN-sisalto (harjoitteen nimi / "Nain teet" -ohje / tarina / cue /
 * "miksi tama" -lause) lokalisoidaan. Kielitila = tmNykyinenKieli()-globaali (fi-fallback).
 * INVARIANTIT: sv taydellinen reachable-joukolle - fi ei rikkoudu (puuttuva avain/kieli -> fi) -
 * getter + content-map niin etta en on triviaali lisays. S7.22: sisalto ei tuo tasolukuja/XP:ta lapselle.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const H = require('../harjoitelogiikka_v4.js');
const PEL = readFileSync(join(__dir, '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');

// Reachable player-visible strings (sama logiikka kuin valitsePaivanHarjoite)
function reachableStrings() {
  const set = new Set();
  const fields = ['nimi', 'ohje_leikkija', 'ohje_rakentaja', 'ohje_showcase', 'ohje', 'cue', 'tarina'];
  Object.keys(H.T_MESOSYKLI_KOHDE).forEach((meso) => {
    const s = H.PANKKI.T[meso]; if (!s) return;
    ['vk1', 'vk2', 'vk3', 'vk4'].forEach((vk) => {
      const h = s[vk]; if (!h) return;
      fields.forEach((f) => { if (typeof h[f] === 'string' && h[f].trim()) set.add(h[f]); });
    });
  });
  Object.keys(H.T_KOHDE_PANKKI).forEach((k) => (H.T_KOHDE_PANKKI[k] || []).forEach((h) =>
    fields.forEach((f) => { if (typeof h[f] === 'string' && h[f].trim()) set.add(h[f]); })));
  return set;
}

function withLang(lang, fn) {
  const prev = global.tmNykyinenKieli;
  global.tmNykyinenKieli = () => lang;
  try { return fn(); } finally {
    if (prev === undefined) delete global.tmNykyinenKieli; else global.tmNykyinenKieli = prev;
  }
}

afterEach(() => { delete global.tmNykyinenKieli; });

describe('HARJOITE_I18N.sv - sisalto kattaa reachable-joukon taydellisesti', () => {
  it('sv.sisalto: jokainen pelaajalle nakyva fi-merkkijono on kaannetty (0 puuttuvaa)', () => {
    const map = H.HARJOITE_I18N.sv.sisalto;
    const puuttuu = [];
    reachableStrings().forEach((fi) => { if (typeof map[fi] !== 'string' || !map[fi].trim()) puuttuu.push(fi.slice(0, 40)); });
    expect(puuttuu).toEqual([]);
  });
  it('sv.sisalto avaimet ovat kaikki live-PANKKIsta (ei orpoja avaimia)', () => {
    const live = reachableStrings();
    const orvot = Object.keys(H.HARJOITE_I18N.sv.sisalto).filter((k) => !live.has(k));
    expect(orvot).toEqual([]);
  });
  it('miksi-jarjestelma sv taydellinen (kohde_nimet/otsikko + lause1/2/3)', () => {
    const sv = H.HARJOITE_I18N.sv;
    ['pallonhallinta', 'koordinaatio', 'nopeus', 'syotto', 'ponnauttelu'].forEach((k) => {
      expect(typeof sv.kohde_nimet[k]).toBe('string');
      expect(typeof sv.kohde_otsikko[k]).toBe('string');
      ['leikkija', 'rakentaja', 'showcase'].forEach((iv) => expect(typeof sv.miksi_lause2[k][iv]).toBe('string'));
    });
    ['tki', 'tsi', 'hh', 'leikkija', 'rakentaja', 'showcase'].forEach((k) => expect(typeof sv.miksi_l1[k]).toBe('string'));
    expect(sv.miksi_l1.tki).toContain('{kohde}');
    expect(sv.miksi_l1.tsi).toContain('{s}');
    expect(typeof sv.miksi_l3.leikkija).toBe('string');
    expect(typeof sv.miksi_l3.muu).toBe('string');
  });
});

describe('fi ei rikkoudu (ei kielta / puuttuva avain / tuntematon kieli -> fi)', () => {
  const p = { luotu: '2026-01-01', tki_kehityskohde: 'syotto', tsi_viimeisin: 0.8 };
  it('ilman tmNykyinenKieli-globaalia -> fi-lahdetekstit', () => {
    const d = H.valitsePaivanHarjoite(p, H.PANKKI, '2026-08-25');
    expect(d.nimi).toBe('Sisäteräsyöttö — tarkka ja toistettava');
    expect(H.tmKohdeOtsikko('syotto')).toBe('Syöttö');
    expect(H.generoiMiksiteksti(p, { kohde: 'syotto', lahde: 'tki' }, 'rakentaja').miksi_lause1)
      .toBe('Tekniikkakilpailusi näytti että syöttö on kasvun paikka.');
  });
  it('_hT: puuttuva avain -> palauttaa fi:n; null -> null', () => {
    withLang('sv', () => {
      expect(H._hT('EI OLE KARTASSA XYZ')).toBe('EI OLE KARTASSA XYZ');
      expect(H._hT(null)).toBe(null);
    });
  });
  it('tuntematon kieli (esim. de, ei karttaa) -> fi', () => {
    withLang('de', () => {
      expect(H.valitsePaivanHarjoite(p, H.PANKKI, '2026-08-25').nimi).toBe('Sisäteräsyöttö — tarkka ja toistettava');
      expect(H.tmKohdeOtsikko('syotto')).toBe('Syöttö');
    });
  });
});

describe('sv - harjoitesisalto lokalisoituu (nimi/ohje/cue/tarina + miksi + otsikko)', () => {
  const p = { luotu: '2026-01-01', tki_kehityskohde: 'syotto', tsi_viimeisin: 0.8 };
  it('valitsePaivanHarjoite palauttaa sv-sisallon', () => {
    withLang('sv', () => {
      const d = H.valitsePaivanHarjoite(p, H.PANKKI, '2026-08-25');
      expect(d.nimi).toBe('Insidepassning — precis och repeterbar');
      expect(d.ohje).toMatch(/repetitioner|Insidepassning/);
      expect(d.cue).toContain('Maestros regel');
    });
  });
  it('generoiMiksiteksti sv (interpolointi {kohde}/{s} + kaikki lahteet)', () => {
    withLang('sv', () => {
      expect(H.generoiMiksiteksti(p, { kohde: 'syotto', lahde: 'tki' }, 'rakentaja').miksi_lause1)
        .toBe('Din tekniktävling visade att passning är ett tillväxtområde.');
      expect(H.generoiMiksiteksti(p, { kohde: 'nopeus', lahde: 'tsi' }, 'rakentaja').miksi_lause1)
        .toBe('Mätningen visar att bollen saktar ner dig 0.8 sekunder.');
      expect(H.generoiMiksiteksti(p, { kohde: 'nopeus', lahde: 'hh' }, 'leikkija').miksi_lause1)
        .toBe('Din fysiska profil visar var utveckling ger mest.');
      const mk = H.generoiMiksiteksti(p, { kohde: 'syotto', lahde: 'tki' }, 'leikkija');
      expect(mk.miksi_lause2).toBe('En precis passning håller bollen hos kompisarna.');
      expect(mk.miksi_lause3).toBe('Gör det här varje dag så börjar bollen lyda.');
    });
  });
  it('tmKohdeOtsikko sv', () => {
    withLang('sv', () => { expect(H.tmKohdeOtsikko('pallonhallinta')).toBe('Bollkontroll'); });
  });
  it('S7.22: sv-sisalto ei tuo XP-kielta lapselle', () => {
    const osumat = Object.values(H.HARJOITE_I18N.sv.sisalto).filter((v) => /\bXP\b/.test(v));
    expect(osumat).toEqual([]);
  });
});

describe('Pelaaja_v7 kytkenta + cache-bust', () => {
  it('KOHDE_OTS-paikallikartat korvattu tmKohdeOtsikko-getterilla', () => {
    expect(PEL).toContain('tmKohdeOtsikko(kk.kohde)');
    expect(PEL).toContain('tmKohdeOtsikko(kohde)');
    expect(PEL).not.toContain("const KOHDE_OTS = { pallonhallinta:'Pallonhallinta'");
  });
  it('harjoitelogiikka_v4.js ?v=10 + SW-cache >= v16', () => {
    expect(PEL).toContain('harjoitelogiikka_v4.js?v=10');
    expect(readFileSync(join(__dir, '..', 'sw_pelaaja.js'), 'utf8')).toMatch(/const CACHE = 'tm-pelaaja-v(1[6-9]|[2-9]\d)'/);
  });
});
