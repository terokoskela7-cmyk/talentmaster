/**
 * D-2 — Masterin Inbox: uusi viestityyppi valinta.odottaa + "Avaa pelaaja" (→ pickPlayer + setWs('dev')); kuuntelija kartoittaa viestit.tyyppi==='valinta'.
 * Fixture: KPV U13 -testipelaaja. Palvelinpuoli: functions/test/valinta_viesti_handler.test.js · Rules: tests/rules (v3.39 viestit.nakyvyys).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const MA = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
const PID = 'm93GBdOaGCUuenMiCL0I';
function pura(t) {
  const i = MA.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0;
  for (let k = MA.indexOf('{', i); k < MA.length; k++) { if (MA[k] === '{') d++; else if (MA[k] === '}') { d--; if (!d) return MA.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const E = (o) => Object.assign({ id: 'vp_v1', type: 'valinta.odottaa', t: Date.UTC(2026, 9, 6, 8), playerId: PID, pelaajaNimi: 'Topias K.', vaihtoehto: 'saattaen vaihtaminen', vastuuhenkilo_nimi: '', luettu: false, _firestoreId: 'valinta_x_u1' }, o || {});

function ymp(opts = {}) {
  const kirj = [], loki = { toastit: [], kutsut: [] }, seen = opts.seen || {};
  const dok = { update: async (d) => { if (opts.kaada) throw new Error('permission-denied'); kirj.push(d); } };
  const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => dok }) }) }) };
  const c = { _seenEvents: seen, _demo: !!opts.demo, _seuraId: 'kpv', _db: db, _mTuoreToken: async () => {}, firebase: { auth: () => ({ currentUser: {} }) }, _vpViestit: [E()],
    masterT: (x) => x, _mEsc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'), _initials: (n) => n.split(' ').map((x) => x[0]).join(''), _fmtTime: () => '8.10.',
    toast: (t, k) => loki.toastit.push([t, k]), console: { warn() {} }, String, Object, Array, Promise,
    pickPlayer: (p) => loki.kutsut.push(['pickPlayer', p]), setWs: (w) => loki.kutsut.push(['setWs', w]) };
  c.window = c; vm.createContext(c);
  vm.runInContext([pura('function _inboxNahty('), pura('function _mValintaKorttiHTML('), pura('window._mAvaaValintaPelaaja = async function')].join(';\n') + ';', c);
  return { c, kirj, loki };
}

describe('D-2 · Master Inbox · valinta.odottaa', () => {
  it('kortti: "[nimi] valitsi ydinvahvuutensa, vahvista jakso." + valittu ydinvahvuus + vastuuhenkilö (jos on) + "Avaa pelaaja"; escape; ei hex-värejä', () => {
    const e = ymp(); const h = e.c._mValintaKorttiHTML(E({ vastuuhenkilo_nimi: 'Veera Valmentaja' }));
    expect(h).toContain('Topias K. valitsi ydinvahvuutensa, vahvista jakso.'); expect(h).toContain('Ydinvahvuus: saattaen vaihtaminen'); expect(h).toContain('Vastuuhenkilö: Veera Valmentaja');
    expect(h).toContain('data-avaa-pelaaja'); expect(h).toContain("_mAvaaValintaPelaaja('" + PID + "','valinta_x_u1')"); expect(h).toContain('inbox-card attention unseen');
    expect(e.c._mValintaKorttiHTML(E())).not.toContain('Vastuuhenkilö:');
    const x = e.c._mValintaKorttiHTML(E({ pelaajaNimi: '<img onerror=1>', vaihtoehto: '"><script>' })); expect(x).not.toContain('<img'); expect(x).not.toContain('<script>');
    expect(h.replace(/<[^>]+>/g, '')).not.toMatch(/heikkous|rajoite|kriittinen/i); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgb\(/);
  });
  it('kuitattu: Firestoren luettu TAI paikallinen kuittaus → ei unseen eikä Kuittaa-painiketta; muiden tyyppien kuittaus ennallaan (luettu ei vaikuta)', () => {
    const e = ymp(); expect(e.c._inboxNahty(E({ luettu: true }))).toBe(true); expect(e.c._inboxNahty(E())).toBe(false);
    expect(ymp({ seen: { vp_v1: 1 } }).c._inboxNahty(E())).toBe(true); expect(e.c._inboxNahty({ id: 'x', type: 'note.to_coach', luettu: true })).toBe(false);
    const lu = e.c._mValintaKorttiHTML(E({ luettu: true })); expect(lu).not.toContain('unseen'); expect(lu).not.toContain('markSeen('); expect(e.c._mValintaKorttiHTML(E())).toContain('markSeen(');
  });
  it('"Avaa pelaaja": merkitsee viestin luetuksi (YKSI update {luettu:true}) ja avaa pelaajan Kehityksessä (pickPlayer + setWs dev)', async () => {
    const e = ymp(); await e.c.window._mAvaaValintaPelaaja(PID, 'valinta_x_u1');
    expect(e.kirj).toEqual([{ luettu: true }]); expect(e.loki.kutsut).toEqual([['pickPlayer', PID], ['setWs', 'dev']]); expect(e.c._vpViestit[0].luettu).toBe(true); expect(e.loki.toastit).toEqual([]);
  });
  it('epäonnistunut luetuksi-merkintä: ei nielaista hiljaa — toimintaohje-toast; pelaaja silti auki; paikallinen luettu EI muutu', async () => {
    const e = ymp({ kaada: true }); await e.c.window._mAvaaValintaPelaaja(PID, 'valinta_x_u1');
    expect(e.loki.toastit.length).toBe(1); expect(e.loki.toastit[0][0]).toContain('kuittaa se käsin'); expect(e.loki.toastit[0][1]).toBe('error'); expect(e.c._vpViestit[0].luettu).toBe(false); expect(e.loki.kutsut).toEqual([['pickPlayer', PID], ['setWs', 'dev']]);
  });
  it('demo / ei viestiId: ei kirjoitusta, pelaaja avautuu', async () => {
    const d = ymp({ demo: true }); await d.c.window._mAvaaValintaPelaaja(PID, 'x'); expect(d.kirj).toEqual([]); expect(d.loki.kutsut.length).toBe(2);
    const n = ymp(); await n.c.window._mAvaaValintaPelaaja(PID, ''); expect(n.kirj).toEqual([]);
  });
  it('lähde: kuuntelija kartoittaa tyyppi "valinta" omaksi tapahtumaksi (muut viestit → note.to_coach ennallaan); renderInbox ohjaa kortin; valinta nousee ylös; badge käyttää _inboxNahty', () => {
    const k = pura('function _kuunteleVpViestit(');
    expect(k).toContain("data.tyyppi === 'valinta'"); expect(k).toContain("type: 'valinta.odottaa'"); expect(k).toContain("type: 'note.to_coach'");
    const r = pura('function renderInbox('); expect(r).toContain("if (e.type === 'valinta.odottaa') return _mValintaKorttiHTML(e);"); expect(r).toContain("e.type==='valinta.odottaa'||e.type==='injury'");
    expect(r).toContain('filter(e=>!_inboxNahty(e)).length'); expect(r.match(/_inboxNahty\(/g).length).toBeGreaterThanOrEqual(3);
  });
  it('Master ei kirjoita pelaajadokumenttiin eikä jaksofokukseen tästä kortista (vain viestit-dokin luettu)', () => {
    const koodi = pura('window._mAvaaValintaPelaaja = async function'); expect(koodi).toContain(".collection('viestit')"); expect(koodi).not.toMatch(/collection\('pelaajat'\)|jaksofokus/);
  });
});
