/**
 * VP_v25 yksi polku (D4, 6.10.2026; design docs/design/idp-v2/01): Tänään (vain luku) · Polku (muokkaus) · Mittaus · Arviointi.
 * Funktiot puretaan lähteestä ja ajetaan vm:ssä oikeilla libeillä. Fixture: KPV U13 -testipelaaja Topias (m93GBdOaGCUuenMiCL0I); roolit VP ja valmentaja.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const require = createRequire(import.meta.url);
const VP = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_VP_v25.html'), 'utf8');
const L = {
  JK: require('../lib/tm_jaksokortti.js'), PT: require('../lib/tm_polun_tila.js'), AJ: require('../lib/tm_aloita_jakso.js'), JM: require('../lib/tm_jakso_malli.js'),
  VH: require('../lib/tm_vastuuhenkilo.js'), KH: require('../lib/tm_kotiharjoitteet.js'), VL: require('../lib/tm_valmennuslinja.js'), KS: require('../lib/tm_kehityssilmukka.js'),
};
function pura(tunniste) {
  const i = VP.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) { if (VP[k] === '{') syv++; else if (VP[k] === '}') { syv--; if (!syv) return VP.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const PID = 'm93GBdOaGCUuenMiCL0I';
const NYT = new Date('2026-10-15T09:00:00');
const JF = () => ({ konsepti_avain: 'y_h2', konsepti_nimi: 'Saattaen vaihtaminen', alkoi: '2026-10-01T09:00:00.000Z', kesto_vk: 6, lahde: 'valmentaja', asetti: { rooli: 'vp', pvm: '2026-10-01' }, tukiosa: { alue: 'kestävyys', perustelu: 'Jaksaa pelata', harjoitteet: [{ id: 'o1#1', liike: 'Narulla hyppely', lahde: 'seura', jarjestys: 1 }] } });

function ymp({ pelaaja = {}, kaada = false, rooli = 'vp', teemat } = {}) {
  const p = Object.assign({ id: PID, joukkue: 'KPV U13', etunimi: 'Topias', syntymaVuosi: 2013, jaksofokus: JF(), ydinvahvuus: { kuvaus: 'Näkee pelin hyvin', havaittu_pvm: '2026-10-01', rooli: 'vp' }, vastuuhenkilo: { uid: 'u1', rooli: 'valmentaja', asetettu_pvm: '2026-10-01' } }, pelaaja);
  const kirj = [], log = { toastit: [], renderit: 0, dom: {}, yritykset: 0 };
  const db = { collection: (c) => ({ doc: (a) => ({ update: async (d) => { log.yritykset = (log.yritykset || 0) + 1; if (kaada) throw new Error('permission-denied'); kirj.push({ path: c + '/' + a, data: d }); } }) }) };
  const el = (id) => ({ value: ({ _ajTaito: 'y_h2', _ajYv: 'Näkee pelin hyvin', _ajAlue: 'kestävyys', _ajPer: 'Jaksaa pelata koko ottelun', _ajKesto: '6', _ajVh: 'u1|valmentaja' })[id], remove() { log.dom[id] = 'poistettu'; } });
  const sb = {
    db, _seuraId: 'kpv', _isDemoMode: false, vpT: (x) => x, _jsvEsc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    toast: (t, k) => log.toastit.push([t, k]), console: { warn() {} }, Date, Object, Array, Promise, Math, JSON, String, Number,
    tmPaivaIso: (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'), tmPvmFi: (s) => s,
    firebase: { auth: () => ({ currentUser: { uid: 'vp-uid', getIdToken: async () => 't' } }), firestore: { FieldValue: { arrayUnion: (...a) => ({ __arrayUnion: a }), delete: () => ({ __delete: true }) } } },
    _valmentajat: [{ id: 'u1', nimi: 'Ville Valmentaja', rooli: 'valmentaja' }, { id: 'u2', nimi: 'Vera VP', rooli: 'vp' }],
    window: { TM_JAKSOKORTTI: L.JK, TM_POLUN_TILA: L.PT, TM_ALOITA_JAKSO: L.AJ, TM_JAKSO_MALLI: L.JM, TM_VASTUUHENKILO: L.VH, TM_KOTIHARJOITTEET: L.KH, TM_VALMENNUSLINJA: L.VL, TM_KEHITYSSILMUKKA: L.KS,
      _vpTeemat: teemat === undefined ? L.VL.tmTeemaKerros({ jaksot: [{ tila: 'hyvaksytty', joukkue: 'KPV U13', alkaa: '2026-09-01', paattyy: '2026-10-31', teema: 'Pelaaminen paineessa' }] }, null) : teemat,
      _pdcPaatos: () => ({ avain: 'yllapito', tila: 'hiljainen' }), _vpArvPelaaja: p, _vpRooli: rooli },
    _vpTtPelaaja: () => p, _vpXFactorYdinvahvuus: () => null, _rvcSitoumusOdottaa: () => false, _vpLataaTeemat() {}, _vpKehAskelReRender() { log.renderit++; },
    _dimIkaSp: () => ({ ika: 13 }), _vpTtNormPositio: () => 'KK', _ttItems: () => [{ avain: 'y_h2', nimi: 'Saattaen vaihtaminen', koodi: 'H2' }, { avain: 'y_h3', nimi: 'Toinen', koodi: 'H3' }], _vpTtEhdotus: () => null,
    _vpJfKanonNimi: (a) => 'Saattaen vaihtaminen', _tmHenkiloNimi: () => 'Topias', _vpJfMergeLisakentat() {}, _vpJfInlineHTML: () => '', document: { getElementById: (id) => (/^_aj/.test(id) ? el(id) : null), createElement: () => ({ set innerHTML(h) { log.modalHTML = h; }, get firstChild() { return {}; } }), body: { appendChild() {} } },
  };
  sb._vpJaksoVaihto = (pp, jf) => L.KS.tmAsetaJaksofokus(pp, jf, { nytISO: NYT.toISOString(), lahde: 'vp' });
  sb._vpJfKirjoita = async (pid, upd, viesti, paivita) => { try { await db.collection('seurat').doc('kpv').update(upd); if (paivita) paivita(); } catch (e) { sb.toast('virhe', 'error'); } };
  vm.createContext(sb);
  const nimet = ['function _vpJaksoKorttiHTML(', 'function _vpPolunTilaHTML(', 'function _vpYdinvahvuusRiviHTML(', 'function _vpTanaanYlaHTML(', 'function _vpJaksoReRender(', 'window._vpAloitaJaksoAvaa = async function', 'window._vpAloitaJaksoSulje = function', 'window._vpAloitaJaksoTallenna = async function'];
  vm.runInContext(nimet.map(pura).join(';\n') + ';', sb);
  return { sb, p, kirj, log };
}
const lopeta = () => new Promise((r) => setTimeout(r, 0));

describe('Tänään — vain luku, kaikki jakson tiedot', () => {
  it.each(['vp', 'valmentaja'])('%s: ydinvahvuus · Polun tila · jakso (taito, tukiosa, kesto+päättyy, vastuuhenkilö, joukkueen teema, kotiharjoitteet, lähde) · YKSI toiminto', (rooli) => {
    const e = ymp({ rooli }); const h = e.sb._vpTanaanYlaHTML(e.p);
    for (const s of ['Ydinvahvuus', 'Näkee pelin hyvin', 'Polun tila', 'Etenee', 'Saattaen vaihtaminen', 'kestävyys', 'Jaksaa pelata', '6 vk', 'päättyy 12.11.', 'Ville Valmentaja', 'Pelaaminen paineessa', '1 kpl', 'Asetti: VP · 1.10.', 'Näkyykö fokus?', 'Treenataanko?', 'Onko mukana?'])
      expect(h, s).toContain(s);
    expect((h.match(/<button[^>]*>([^<]*)</g) || []).map((b) => b.replace(/^.*>/, '').replace(/<$/, '')), 'Tänäänissä yksi toiminto (+ Katso = lukulinkki)').toEqual(['Katso', 'Aloita seuraava jakso']);
    expect(h).not.toContain('Muokkaa jaksoa'); expect(h).not.toContain('Liitä');   // vain luku
  });
  it('honest-empty: ilman dataa kysymykset "Ei vielä tietoa"; ilman jaksoa "Ei jaksoa käynnissä." eikä keksittyä tilaa', () => {
    const e = ymp({ pelaaja: { jaksofokus: null, ydinvahvuus: null, vastuuhenkilo: null } }); const h = e.sb._vpTanaanYlaHTML(e.p);
    expect(h).toContain('Ei jaksoa käynnissä.'); expect((h.match(/Ei vielä tietoa/g) || []).length).toBe(3); expect(h).toContain('Ei vielä tietoa');
  });
  it('sanasto: ei "Erottava ase", "sillan ehdotus", D-koodeja eikä "jaksofokus"-sanaa näkyvässä tekstissä', () => {
    const e = ymp(); const h = e.sb._vpTanaanYlaHTML(e.p);
    expect(h).not.toMatch(/Erottava ase|sillan ehdotus|jaksofokus/i); expect(h).not.toMatch(/\bD[1-8]\b/);
  });
  it('ei hex-värejä uudessa markupissa', () => { const e = ymp(); expect(e.sb._vpTanaanYlaHTML(e.p)).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); });
});

describe('Aloita jakso -modaali VP:ssä (jaettu lib)', () => {
  it('avautuu samalla lomakkeella kuin Masterissa; jakso olemassa → "Muokkaa jaksoa"; ei jaksoa → "Aloita jakso"', async () => {
    const a = ymp(); await a.sb.window._vpAloitaJaksoAvaa(PID); expect(a.log.modalHTML).toContain('Muokkaa jaksoa'); expect(a.log.modalHTML).toContain('_vpAloitaJaksoTallenna');
    for (const id of Object.values(L.AJ.IDS)) expect(a.log.modalHTML, id).toContain(id);
    const b = ymp({ pelaaja: { jaksofokus: null } }); await b.sb.window._vpAloitaJaksoAvaa(PID); expect(b.log.modalHTML).toContain('Aloita jakso'); expect(b.log.modalHTML).not.toContain('Muokkaa jaksoa');
  });
  it('tallennus: YKSI update pelaajadokkiin (jaksofokus+ydinvahvuus+vastuuhenkilo), asetti {rooli,pvm}, tila poistettu, paikallinen tila vasta onnistumisen jälkeen', async () => {
    const e = ymp({ pelaaja: { jaksofokus: Object.assign(JF(), { tila: 'valittavana' }) } });
    await e.sb.window._vpAloitaJaksoTallenna(PID); await lopeta();
    expect(e.kirj.length).toBe(1); const d = e.kirj[0].data;
    expect(Object.keys(d).sort()).toEqual(expect.arrayContaining(['jaksofokus', 'ydinvahvuus', 'vastuuhenkilo']));
    expect(d.jaksofokus.tila).toBeUndefined(); expect(d.jaksofokus.asetti.rooli).toBe('vp'); expect(d.jaksofokus.kesto_vk).toBe(6);
    expect(d.ydinvahvuus.kuvaus).toBe('Näkee pelin hyvin'); expect(d.vastuuhenkilo.uid).toBe('u1');
    expect(e.p.jaksofokus.tila).toBeUndefined(); expect(e.log.renderit).toBeGreaterThan(0);
  });
  it('tavoite_alue: pelaajan IDP-fokus linkittyy uuteen jaksoon', async () => {
    const e = ymp({ pelaaja: { idp_fokus: { alue: 'syotto' } } }); await e.sb.window._vpAloitaJaksoTallenna(PID); await lopeta();
    expect(e.kirj[0].data.jaksofokus.tavoite_alue).toBe('syotto');
  });
  it('Tänään → "Aloita seuraava jakso": siirtyy Polkuun (3) ja avaa modaalin', () => {
    const e = ymp(); const kutsut = []; e.sb._jspVaihda = (n) => kutsut.push(n); vm.runInContext(pura('window._vpTanaanAloitaSeuraava = function') + ';', e.sb);
    e.sb.window._vpTanaanAloitaSeuraava(PID); expect(kutsut).toEqual([3]); expect(e.log.modalHTML).toContain('_vpAloitaJaksoTallenna');
  });
  it('kirjoitus epäonnistuu → paikallinen tila EI muutu (ei valheellista onnistumista)', async () => {
    const e = ymp({ kaada: true, pelaaja: { ydinvahvuus: { kuvaus: 'Vanha' } } });
    await e.sb.window._vpAloitaJaksoTallenna(PID); await lopeta();
    expect(e.log.yritykset, 'kirjoitusta yritettiin (ei validointivirhe)').toBe(1); expect(e.p.ydinvahvuus.kuvaus).toBe('Vanha'); expect(e.log.toastit.some(([, k]) => k === 'error')).toBe(true);
  });
  it('validointivirhe (GDPR-sana perustelussa) → ei kirjoitusta + selkeä toast', async () => {
    const e = ymp(); const orig = e.sb.document.getElementById;
    e.sb.document.getElementById = (id) => (id === '_ajPer' ? { value: 'Tämä on heikkous' } : orig(id));
    await e.sb.window._vpAloitaJaksoTallenna(PID); expect(e.kirj.length).toBe(0); expect(e.log.toastit.some(([t, k]) => k === 'error' && /Jaksoa ei voi aloittaa/.test(t))).toBe(true);
  });
});

describe('rakenne ja sanasto lähteessä', () => {
  it('4 välilehteä: Tänään (0) · Polku (3) · Mittaus (1) · Arviointi (2); vanha 4 (Viikko) ohjautuu Polkuun; Viikko-osio Polussa', () => {
    expect(VP).toMatch(/\[\[0, 'ti-home', vpT\('Tänään'\)\], \[3, 'ti-route', vpT\('Polku'\)\], \[1, 'ti-ruler-2', vpT\('Mittaus'\)\], \[2, 'ti-clipboard-check', vpT\('Arviointi'\)\]\]/);
    expect(VP).toContain('if (_viikkoon) n = 3;'); expect(VP).toContain('id="_vpPolkuViikko"'); expect(VP).not.toContain('id="_jspTab4"');
  });
  it('kielletyt sanat pois VP:n näkyvistä teksteistä: Erottava ase · sillan ehdotus · Kehitä jaksofokusta; vanha jaksofokus-editori ei enää pääpolulla', () => {
    expect(VP).not.toMatch(/Erottava ase|ei sillan ehdotus|Kehitä jaksofokusta/);
    expect(VP).toContain("'Aloita jakso moottorin ehdotuksesta tai suoraan.'");
  });
  it('Polun jakso-osio käyttää korttia ja modaalia; "ase" ei esiinny uusien kenttien nimissä (GDPR-sanatesti)', () => {
    expect(VP).toContain('id="_vpJaksokorttiPolku"');
    const uusi = VP.slice(VP.indexOf('/* ═══ YKSI POLKU'), VP.indexOf('/* Vastuuhenkilö per pelaaja'));
    expect(uusi).not.toMatch(/\b(ase|heikkous|rajoite|kriittinen)\b\s*[:=]/);
  });
});
