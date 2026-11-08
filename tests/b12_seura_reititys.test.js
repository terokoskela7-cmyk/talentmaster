/* B12 (PM 7.11.2026) — Seurahallinnan sv-reititys, vaihe 1: 40 tekstiä, joilla on jo sv-rivi.
 * Code EI kirjoita ruotsia (CLAUDE.md §0): reititys käyttää olemassa olevia rivejä (yhteinen kartta, henkilöstökartta, tm_lang-avaimet).
 * Yhdeksän riviä on vain VP-/Master-kartassa → kopioitu henkilöstökarttaan SELLAISENAAN ("lainat"); tämä testi vaatii arvon olevan sama kuin lähteessä.
 * Loput 61 Seuran tekstiä menevät PM-erään (vaihe 2). fi-renderöinti ei muutu (sv_lapiajo --kieli=fi --dump ennen/jälkeen, PR-kuvaus). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import vm from 'vm';
const req = createRequire(import.meta.url);
const { lueKuori } = req('../scripts/kuoren_lahde.js');   // Seura.html + seura/-osat

const SEURA = lueKuori('TalentMaster_Seura.html');
const KUORI = req('fs').readFileSync(req('path').join(__dirname, '..', 'TalentMaster_Seura.html'), 'utf8');
const H = req('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv;
const C = req('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;
const VP = req('../lib/tm_vp_i18n.js').TM_VP_I18N.sv;
const MA = req('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv;
const L = req('../lib/tm_lang.js').TM_LANG;
const hae = (o, k) => k.split('.').reduce((a, x) => (a == null ? undefined : a[x]), o);
const norm = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase();

/* 40 reititettyä tekstiä (sv-läpiajo fx_seura + fx_seura_lage, PM:n B12-luku): reitti = 'tmHT' (yhteinen/henkilöstökartta) tai tm_lang-avain. */
const REITIT = {
  'Kirjaudu ulos': 'tmHT', 'Seura': 'seura.seura', 'HALLINTA': 'nav.hallinta', 'Yhteenveto': 'nav.yhteenveto', 'Kehitystilanne': 'nav.kehitystilanne',
  'Pelaajat': 'tmHT', 'Joukkueet': 'tmHT', 'Talentit': 'tmHT', 'ORGANISAATIO': 'nav.organisaatio', 'Henkilöstö': 'nav.henkilosto', 'ASETUKSET': 'nav.asetukset',
  'TOIMINNOT': 'nav.toiminnot', 'Rekisteröintikutsu': 'nav.rekisterointi', 'Tuo Excel': 'nav.tuo_excel', 'Massakutsu': 'nav.massakutsu', 'VP Dashboard': 'nav.vp_dashboard',
  'Valmentaja': 'tmHT', 'Suostumuslomake': 'nav.suostumuslomake', 'aktiivista': 'tmHT', 'Pelaajia': 'tmHT', 'Suostumus': 'tmHT', '✕ Sulje': 'tmHT',
  'Lähetä rekisteröintikutsu': 'rekisterointi.otsikko', 'Pelaajan etunimi': 'rekisterointi.pelaajan_etunimi', 'Pelaajan sukunimi': 'rekisterointi.pelaajan_sukunimi',
  'Joukkue *': 'seura.excel_tagi_joukkue', 'huoltaja@email.fi': 'suostumus.rek_huoltaja_email_esim', 'Kaikki': 'tmHT', 'Jakso': 'tmHT', 'Ikävaihe': 'tmHT', 'Seuraavaksi': 'tmHT',
  'Kutsu lähetetty': 'tmHT', 'Kaikki pelaajat': 'tmHT', 'Synt.': 'tmHT', 'Hae nimellä...': 'tmHT',
  'Joukkueen tiedot tallennetaan Firestoreen ja ne näkyvät heti valmentajille.': 'joukkueet.lisaa_modal_kuvaus', 'Vuosi (syntymävuosi)': 'joukkueet.syntymavuosi',
  'Tallenna joukkue': 'tmHT', 'Rooli': 'henkilosto.rooli', 'Aktiivinen': 'tmHT',
};
/* Lainat: Seuran fi-avain → [lähdekartta, lähdeavain]. Uusi laina vaatii rivin tähän (testi lukee lohkon kartasta). */
const LAINAT = { 'Talentit': [VP, 'Talentit'], 'aktiivista': [MA, 'aktiivista'], 'Pelaajia': [VP, 'Pelaajia'], 'Suostumus': [VP, 'Suostumus'], 'Jakso': [VP, 'Jakso'],
  'Ikävaihe': [VP, 'Ikävaihe'], 'Seuraavaksi': [VP, 'Seuraavaksi'], 'Kaikki pelaajat': [VP, 'Kaikki pelaajat'], 'Synt.': [VP, 'synt.'] };

describe('B12 vaihe 1: 40 reititystä olemassa oleviin sv-riveihin', () => {
  it('lista on täsmälleen 40 tekstiä; "Rekisteröity" EI ole reititys (ainoa sv-rivi on VP:n monikko "registrerade" → PM-erään)', () => {
    expect(Object.keys(REITIT)).toHaveLength(40);
    expect(REITIT).not.toHaveProperty('Rekisteröity');
    expect(H).not.toHaveProperty('Rekisteröity');
  });
  it('jokaisella reitillä on sv-rivi: tmHT → yhteinen tai henkilöstökartta; tm_lang-avain → fi vastaa tekstiä (isot kirjaimet = CSS) ja sv on täytetty', () => {
    for (const [fi, r] of Object.entries(REITIT)) {
      if (r === 'tmHT') { expect(C[fi] || H[fi], fi).toBeTruthy(); continue; }
      expect(norm(hae(L.fi, r)), fi).toBe(norm(fi));
      expect(hae(L.sv, r), fi).toBeTruthy();
    }
  });
  it('jokainen teksti kulkee reitittimen kautta Seuran lähteessä (tmHT / data-i18n / data-tm-t / _seuraT) tai Kehitystilanne-kirjaston T():n kautta', () => {
    const KT = req('fs').readFileSync(req('path').join(__dirname, '..', 'lib/tm_kehitystilanne.js'), 'utf8');
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const [fi, r] of Object.entries(REITIT)) {
      const reitit = r === 'tmHT'
        ? [new RegExp("tmHT\\('" + esc(fi) + "'\\)"), new RegExp('data-i18n(?:-ph)?="' + esc(fi) + '"'), new RegExp("\\bT\\('" + esc(fi) + "'\\)")]
        : [new RegExp('data-tm-t(?:-ph)?="' + esc(r) + '"'), new RegExp("_seuraT\\('" + esc(r) + "'")];
      expect(reitit.some((re) => re.test(SEURA) || re.test(KT)), fi).toBe(true);
    }
  });
  it('lainat = sama arvo kuin lähdekartassa (ei uutta käännöstä); lohkossa vain testatut rivit', () => {
    for (const [fi, [m, a]] of Object.entries(LAINAT)) { expect(typeof m[a], fi).toBe('string'); expect(H[fi], fi).toBe(m[a]); }
    const src = req('fs').readFileSync(req('path').join(__dirname, '..', 'lib/tm_henkilosto_i18n.js'), 'utf8');
    const lohkossa = [...src.matchAll(/^\s*'((?:[^'\\]|\\.)*)':\s*'(?:[^'\\]|\\.)*',\s*\/\/ laina:/gm)].map((m) => m[1]);
    expect(lohkossa.sort()).toEqual(Object.keys(LAINAT).sort());
  });
  it('staattiset merkinnät: attribuutin arvo = elementin fi-teksti (fi-tila ei muutu)', () => {
    const d = [...KUORI.matchAll(/data-i18n="([^"]+)"[^>]*>\s*([^<]*?)\s*</g)];
    expect(d.length).toBeGreaterThan(5);
    for (const [, a, t] of d) expect(t, a).toBe(a);
    for (const [, k, t] of KUORI.matchAll(/data-tm-t="([^"]+)"[^>]*>\s*([^<]*?)\s*</g)) expect(norm(hae(L.fi, k)), k).toBe(norm(t));
    for (const [, ph, k] of KUORI.matchAll(/placeholder="([^"]+)"\s+data-tm-t-ph="([^"]+)"/g)) expect(hae(L.fi, k), k).toBe(ph);
  });
});

describe('B12: reititys ei saa muuttaa tunnisteita (CSS-luokka, onclick-funktio)', () => {
  const RIKKI = /[A-Za-z_$]'\s*\+\s*tmHT\('[^']*'\)\s*\+\s*'[A-Za-z_$(]/;
  it('Seurassa ei ole tunnisteen keskelle osuvaa tmHT-kutsua', () => {
    expect(SEURA.split('\n').filter((r) => RIKKI.test(r))).toEqual([]);
  });
  it('negatiivitesti: #913:n rikkomat muodot tunnistetaan', () => {
    for (const r of ["'<button class=\"modal' + tmHT('Sulje') + 'Nappi\" onclick=\"x()\">Sulje</button>'", "onclick=\"kt' + tmHT('Tallenna') + 'Tavoitteet()\"", "onclick=\"_brandi' + tmHT('Tallenna') + '()\""]) expect(RIKKI.test(r), r).toBe(true);
    expect(RIKKI.test("'<span>' + tmHT('Tallenna') + '</span>'")).toBe(false);
  });
  it('korjatut napit kutsuvat olemassa olevia funktioita', () => {
    for (const f of ['ktTallennaTavoitteet', 'ktTallennaSeuratuki']) { expect(SEURA).toContain('onclick="' + f + '()"'); expect(SEURA).toMatch(new RegExp('async function ' + f + '\\(')); }
    expect(SEURA).toContain('onclick="_brandiTallenna()"'); expect(SEURA).toContain('window._brandiTallenna = async function');
    expect(SEURA).toContain('<button class="modalSuljeNappi" onclick="document.getElementById(\\\'ktModal\\\')');
  });
});

describe('B12: seuraLokalisoi (ajettu oikeilla kirjastoilla)', () => {
  const pura = (alku) => { const a = SEURA.indexOf(alku); if (a < 0) throw new Error(alku); let d = 0; for (let j = SEURA.indexOf('{', a); j < SEURA.length; j++) { if (SEURA[j] === '{') d++; else if (SEURA[j] === '}') { d--; if (!d) return SEURA.slice(a, j + 1); } } throw new Error('loppu ' + alku); };
  function dom(kieli) {
    const el = (attrs, text) => ({ attrs: Object.assign({}, attrs), textContent: text, getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; }, setAttribute(n, v) { this.attrs[n] = v; }, hasAttribute(n) { return n in this.attrs; } });
    const els = [el({ 'data-tm-t': 'nav.hallinta' }, 'HALLINTA'), el({ 'data-i18n': 'Kirjaudu ulos' }, 'Kirjaudu ulos'), el({ 'data-i18n': 'Talentit' }, 'Talentit'),
      el({ 'data-tm-t-ph': 'suostumus.rek_huoltaja_email_esim', placeholder: 'huoltaja@email.fi' }, '')];
    const document = { querySelectorAll: (sel) => { const a = sel.match(/^\[([\w-]+)\]$/); return a ? els.filter((e) => e.hasAttribute(a[1])) : []; } };
    const ls = new Map([['tm_kieli', kieli]]);
    const ctx = { console: { log() {}, warn() {} }, document, localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, v) }, navigator: { language: 'fi' } };
    ctx.window = ctx; vm.createContext(ctx);
    for (const f of ['lib/tm_lang.js', 'lib/tm_i18n_common.js', 'lib/tm_henkilosto_i18n.js']) vm.runInContext(lueKuori(f), ctx);
    vm.runInContext([pura('function _tkKieli('), pura('function _seuraKieli('), pura('function _seuraT('), pura('function seuraLokalisoi(')].join('\n'), ctx);
    return { ctx, els };
  }
  it('fi: DOMiin ei kosketa', () => {
    const { ctx, els } = dom('fi'); const ennen = JSON.stringify(els.map((e) => [e.textContent, e.attrs]));
    ctx.seuraLokalisoi(); expect(JSON.stringify(els.map((e) => [e.textContent, e.attrs]))).toBe(ennen);
  });
  it('sv: tm_lang-avain, yhteinen kartta, laina ja placeholder vaihtuvat olemassa oleviin sv-riveihin', () => {
    const { ctx, els } = dom('sv'); ctx.seuraLokalisoi();
    expect(els[0].textContent).toBe(L.sv.nav.hallinta);
    expect(els[1].textContent).toBe(C['Kirjaudu ulos']);
    expect(els[2].textContent).toBe(VP['Talentit']);
    expect(els[3].attrs.placeholder).toBe(L.sv.suostumus.rek_huoltaja_email_esim);
  });
  it('kuori kutsuu seuraLokalisoi() inline-lohkon lopussa (staattinen markup on jo jäsennetty)', () => {
    const i = KUORI.lastIndexOf('</script>'); expect(KUORI.slice(i - 40, i)).toMatch(/\nseuraLokalisoi\(\);\n$/);
  });
});

describe('B12: Kehitystilanne-kirjasto (renderEnsinakyma) — opts.t', () => {
  const KT = req('../lib/tm_kehitystilanne.js');
  const DATA = req('./helpers/kehitystilanne_demodata.cjs')(req('path').join(__dirname, '..'));
  const m = KT.rakennaMalli(DATA, { nyt: '2026-10-02' });
  it('ilman t:tä ja identiteetti-t:llä HTML on sama (fi ennallaan)', () => {
    expect(KT.renderEnsinakyma(m, { t: (x) => x })).toBe(KT.renderEnsinakyma(m, {}));
  });
  it('t reitittää Kaikki / Jakso / Ikävaihe / Seuraavaksi; suodattimien tunnisteet (ktSuodata-avaimet) eivät muutu', () => {
    const h = KT.renderEnsinakyma(m, { t: (x) => 'X' + x + 'X' });
    for (const s of ['Kaikki', 'Jakso', 'Ikävaihe', 'Seuraavaksi']) expect(h, s).toContain('X' + s + 'X');
    expect(h).toContain("ktSuodata('jakso',this.value)");
    expect(h).toContain("ktSuodata('ikävaihe',this.value)");
    expect(h).toContain("ktSuodata('sukupuoli','kaikki')");
  });
  it('Seura välittää tmHT:n kirjastolle', () => {
    expect(SEURA).toMatch(/kaikki: !!v\.kaikki, t: tmHT \};/);
  });
});
