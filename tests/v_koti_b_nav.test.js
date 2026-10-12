/* V-KOTI B — Navigaatio v2 (lib/tm_valmentaja_nav.js): lippu, malli, reitit (jokainen vanha työtila-id), HTML-säännöt, Ryhmät vain omille, kuoren kytkentä + kasvukatto. */
const fs = require('fs'), path = require('path');
const N = require('../lib/tm_valmentaja_nav.js');
const MASTER = fs.readFileSync(path.join(__dirname, '..', 'TalentMaster_Master_v16.html'), 'utf8');
const nimet = (xs) => xs.map((x) => x.teksti);

describe('lippu liput.valmentaja_v2 (sama malli kuin liput.kentta)', () => {
  it('vain täsmälleen true avaa; liput/julkiset voittaa vanhan kentän; puuttuva/merkkijono/1 → pois', () => {
    expect(N.tmNavLippu(null, { liput: { valmentaja_v2: true } })).toBe(true);
    ['true', 1, undefined, null, 'kyllä'].forEach((v) => expect(N.tmNavLippu(null, { liput: { valmentaja_v2: v } })).toBe(false));
    expect(N.tmNavLippu(null, null)).toBe(false); expect(N.tmNavLippu({}, {})).toBe(false);
    expect(N.tmNavLippu({ valmentaja_v2: false }, { liput: { valmentaja_v2: true } })).toBe(false); expect(N.tmNavLippu({ valmentaja_v2: true }, null)).toBe(true);
  });
  it('tmNavAsenna: ilman lippua / lukuvirheessä / ilman dokumenttia EI kosketa DOM:iin ja palauttaa false', async () => {
    let koskettu = 0; const doc = { getElementById: () => { koskettu++; return null; }, querySelector: () => { koskettu++; return null; }, createElement: () => { koskettu++; return {}; }, body: { classList: { add: () => { koskettu++; } } }, head: {} };
    const dbDoc = (data, virhe) => ({ get: async () => { if (virhe) throw new Error('permission-denied'); return data ? { exists: true, data: () => data } : { exists: false }; }, collection: () => ({ doc: () => dbDoc(null, virhe) }) });
    const db = (seura, virhe) => ({ collection: () => ({ doc: () => Object.assign(dbDoc(seura, virhe), { collection: () => ({ doc: () => dbDoc(null, virhe) }) }) }) });
    expect(await N.tmNavAsenna({ db: db({ liput: { kentta: true } }), seuraId: 'demo', doc })).toBe(false);
    expect(await N.tmNavAsenna({ db: db(null), seuraId: 'demo', doc })).toBe(false);
    expect(await N.tmNavAsenna({ db: db(null, true), seuraId: 'demo', doc })).toBe(false);
    expect(await N.tmNavAsenna({ db: db({ liput: { valmentaja_v2: true } }), seuraId: '', doc })).toBe(false);
    expect(koskettu).toBe(0);
  });
});

describe('malli (D243)', () => {
  const m = N.tmNavMalli({ ws: 'koti', lukemattomat: 3, ryhmia: true });
  it('järjestys: Koti · Viestit · Kalenteri · Joukkue | Pelaajat · Ryhmät | Työkalut (6, suljettu oletuksena)', () => {
    expect(nimet(m.vasen)).toEqual(['Koti', 'Viestit', 'Kalenteri', 'Joukkue']); expect(nimet(m.pelaajat)).toEqual(['Pelaajat', 'Ryhmät']);
    expect(nimet(m.tyokalut.rivit)).toEqual(['Testit', 'Kuorma ja fiilis', 'Taktiikkataulu', 'Uusi havainto', 'Itsearvio', 'Valmentajana kehittyminen']); expect(m.tyokalut.auki).toBe(false);
    expect(m.vasen.find((x) => x.id === 'viestit').badge).toBe(3);
  });
  it('Havainnot ja Kehitys eivät ole valikossa; Havainto on pääpainike (D244)', () => {
    const kaikki = [].concat(m.vasen, m.pelaajat, m.tyokalut.rivit).map((x) => x.id); expect(kaikki).not.toContain('havainnot'); expect(kaikki).not.toContain('kehitys');
    const h = N.tmNavHTML(m); expect(h.plus).toContain('+ Havainto'); expect(h.sivu).not.toMatch(/Havainnot|Kehitys/);
  });
  it('Ryhmät näkyy vain jos käyttäjällä on ryhmiä', () => { expect(nimet(N.tmNavMalli({ ryhmia: false }).pelaajat)).toEqual(['Pelaajat']); expect(N.tmNavHTML(N.tmNavMalli({ ryhmia: false })).sivu).not.toContain('Ryhmät'); });
  it('Työkalut avautuu kun työkalu on aktiivinen näkymä tai käyttäjä avasi; Joukkue-välilehdet vain pulse/season', () => {
    expect(N.tmNavMalli({ ws: 'testit' }).tyokalut.auki).toBe(true); expect(N.tmNavMalli({ tyokalutAuki: true }).tyokalut.auki).toBe(true); expect(N.tmNavMalli({ ws: 'cal' }).tyokalut.auki).toBe(false);
    expect(nimet(N.tmNavMalli({ ws: 'pulse' }).valilehdet)).toEqual(['Tilanne', 'Kausi ja jaksot']); expect(N.tmNavMalli({ ws: 'season' }).valilehdet.map((v) => v.aktiivinen)).toEqual([false, true]);
    ['koti', 'inbox', 'cal', 'dev', 'testit', 'kuorma', 'ryhmat'].forEach((w) => expect(N.tmNavMalli({ ws: w }).valilehdet).toBeNull());
  });
  it('aktiivinen kohta: pulse/season → Joukkue · dev → Pelaajat · inbox → Viestit', () => {
    const akt = (ws) => { const x = N.tmNavMalli({ ws, ryhmia: true }); return [].concat(x.vasen, x.pelaajat, x.tyokalut.rivit).filter((i) => i.aktiivinen).map((i) => i.id); };
    expect(akt('pulse')).toEqual(['joukkue']); expect(akt('season')).toEqual(['joukkue']); expect(akt('dev')).toEqual(['pelaajat']); expect(akt('inbox')).toEqual(['viestit']); expect(akt('ryhmat')).toEqual(['ryhmat']);
  });
  it('mobiili: Koti · Kalenteri · [+ Havainto keskellä] · Pelaajat · Valikko; Viestit yläkulmassa badgella', () => {
    expect(m.mobiili.map((x) => x.id)).toEqual(['koti', 'kalenteri', 'havainto', 'pelaajat', 'valikko']); expect(m.mobiili[2].plus).toBe(true);
    const h = N.tmNavHTML(m); expect(h.mobiili.indexOf('nv-mplus')).toBeGreaterThan(h.mobiili.indexOf('data-nv="kalenteri"')); expect(h.mobiili.indexOf('nv-mplus')).toBeLessThan(h.mobiili.indexOf('data-nv="pelaajat"'));
    expect(h.viesti).toContain('nv-mviesti'); expect(h.viesti).toContain('>3<');
  });
});

describe('reitit — jokainen vanha työtila-id ohjautuu', () => {
  const R = N.tmNavReitti;
  it('today → koti · pulse → joukkue/tilanne · season → joukkue/kausi · dev, kehitys → pelaajat · havainnot → koti + havaintomodaali', () => {
    expect(R('today')).toEqual({ ws: 'koti', toiminto: null, valilehti: null }); expect(R('pulse')).toEqual({ ws: 'pulse', toiminto: null, valilehti: 'tilanne' }); expect(R('season')).toEqual({ ws: 'season', toiminto: null, valilehti: 'kausi' });
    expect(R('dev').ws).toBe('dev'); expect(R('kehitys').ws).toBe('dev'); expect(R('havainnot')).toEqual({ ws: 'koti', toiminto: 'havainto', valilehti: null });
  });
  it('pysyvät: koti, inbox, cal, testit, kuorma, ryhmat; tuntematon → koti (ei tyhjää näkymää)', () => {
    ['koti', 'inbox', 'cal', 'testit', 'kuorma', 'ryhmat'].forEach((w) => expect(R(w).ws).toBe(w)); expect(R('roskaa').ws).toBe('koti'); expect(R(undefined).ws).toBe('koti');
  });
  it('kaikki vanhat id:t, joita Master käyttää (setWs-kutsut, wsbar, sivupalkki, komentopaletti, näppäimet 1–7), kuuluvat REITIT-karttaan', () => {
    const kaytossa = new Set(); (MASTER.match(/setWs\('([a-z]+)'\)/g) || []).forEach((x) => kaytossa.add(x.slice(7, -2))); (MASTER.match(/data-ws="([a-z]+)"/g) || []).forEach((x) => kaytossa.add(x.slice(9, -1)));
    expect([...kaytossa].filter((id) => !(id in N.REITIT))).toEqual([]);
  });
  it('jokainen reitin kohde-ws:llä on näkymä Masterissa (data-view) tai lib luo sen (ryhmat)', () => {
    Object.values(N.REITIT).forEach((r) => { if (r.ws !== 'ryhmat') expect(MASTER).toContain('data-view="' + r.ws + '"'); });
  });
});

describe('HTML-säännöt', () => {
  const m = N.tmNavMalli({ ws: 'koti', lukemattomat: 2, ryhmia: true, tyokalutAuki: true });
  it('ei hex-värejä, ei emojeja; onclick-kohteet vain vakioita', () => {
    const h = N.tmNavHTML(m), kaikki = Object.values(h).join('') + N.tmNavCSS(); expect(kaikki.replace(/&#\d+;/g, '')).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(kaikki).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    (kaikki.match(/onclick="([^"]*)"/g) || []).forEach((x) => expect(x).toMatch(/^onclick="(setWs\('[a-z]+'\)|avaaKaaviopankki\(\)|openDrill\('adar'\)|avaaHarjoitusarviointi\(\)|avaaValmentajaKehitys\(\)|avaaCoachProfiili\(\)|toggleTyokalut\(\)|TM_VALMENTAJA_NAV\.tmNavTyokalut\(\))"$/));
  });
  it('tekstit kulkevat C.t:n kautta (kielenvaihto)', () => { const h = N.tmNavHTML(m, { t: (x) => '«' + x + '»' }); expect(h.sivu).toContain('«Koti»'); expect(h.sivu).toContain('«Valmentajana kehittyminen»'); expect(h.plus).toContain('«Havainto»'); });
  it('Ryhmät-näkymä: nimet, jäsenmäärä, jäsenet avaavat pelaajan; tyhjä → viesti; HTML escapataan', () => {
    const h = N.tmRyhmatHTML([{ id: 'g1', nimi: 'MV <b>', tyyppi: 'saanto' }], { g1: [{ id: "p'1", nimi: 'Aatu A' }] });
    expect(h).toContain('MV &lt;b&gt;'); expect(h).toContain('1 pelaajaa'); expect(h).toContain("pickPlayer('p1');setWs('dev')"); expect(N.tmRyhmatHTML([], {})).toContain('Sinulla ei ole ryhmiä');
  });
  it('mobiili < 800 px: yksi @media-lohko; alapalkki + drawer + viestit', () => { const css = N.tmNavCSS(); expect((css.match(/@media/g) || []).length).toBe(1); expect(css).toContain('max-width:799px'); expect(css).toContain('.nav-v2 .nv-mob{display:flex'); });
});

describe('kuoren kytkentä (Master)', () => {
  it('lib ladataan; setWs ohjaa reitit vain lipun (nav-v2) ollessa päällä; alustus lipun kautta; badge-kytkentä', () => {
    expect(MASTER).toContain('lib/tm_valmentaja_nav.js'); expect(MASTER).toMatch(/function setWs\(ws\) \{\n  const _nv = document\.body\.classList\.contains\('nav-v2'\)/);
    expect(MASTER).toContain('window.TM_VALMENTAJA_NAV.tmNavAsenna('); expect(MASTER).toContain('window.TM_VALMENTAJA_NAV.tmNavBadge(unseenN)'); expect(MASTER).toContain('async function renderRyhmat()');
  });
  it('vanha navigaatio säilyy koodissa (wsbar, sb-nav, tabbar) — lippu piilottaa vain CSS:llä', () => {
    ['class="wsbar"', 'class="sb-nav"', 'id="mobTabbar"'].forEach((s) => expect(MASTER).toContain(s)); expect(N.tmNavCSS()).toMatch(/\.nav-v2 \.wsbar,\.nav-v2 #mobTabbar,\.nav-v2 #coachSelfCard\{display:none!important\}/); expect(N.tmNavCSS()).toContain('.nav-v2 .sb-nav>:not(select){display:none!important}');
  });
  it('kasvukatto: Master ei kasva yli kattonsa; lisäys kuoreen pieni (≤ 15 riviä main-haaraan nähden)', () => {
    const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/kuoret_kasvukatto.json'), 'utf8')), n = (MASTER.match(/\n/g) || []).length; expect(n).toBeLessThanOrEqual(fx['TalentMaster_Master_v16.html'].katto);
    expect(n).toBeLessThanOrEqual(11837 + 15);
  });
});

describe('live-tarkistus (FC Demo): valitsin, mobiili, Esc, profiilikortti, Kodin tyhjä tila', () => {
  const css = N.tmNavCSS(), K = require('../lib/tm_valmentaja_koti.js'), KN = require('../lib/tm_valmentaja_koti_nakyma.js');
  it('#1 sb-nav ei piiloudu kokonaan: vain sen muut lapset (valitsimet jäävät näkyviin); seuranimi piiloon kun valitsin on', () => {
    expect(css).not.toMatch(/\.nav-v2 \.sb-nav,/); expect(css).toContain('.nav-v2 .sb-nav>:not(select){display:none!important}'); expect(css).toContain('.nav-v2 .sb-nav:not(:has(select)){display:none!important}'); expect(css).toContain('.sb-nav select) .sb-seura{display:none}');
  });
  it('#2 mobiili: hampurilainen ja Komennot ⌘K piiloon < 800 px (ei leveällä)', () => {
    const mq = css.slice(css.indexOf('@media (max-width:799px)')); expect(mq).toContain('.nav-v2 .nav-burger,.nav-v2 .cmd-btn{display:none!important}'); expect(css.slice(0, css.indexOf('@media'))).not.toContain('.cmd-btn');
  });
  it('#4 profiilikortti piiloon kaikista näkymistä lipun ollessa päällä', () => { expect(css).toContain('.nav-v2 #coachSelfCard{display:none!important}'); });
  it('#3 tmNavHavaintoEsc: sulkee upotetun pikakortin (window._pkSulje) ja valintamodaalin, palauttaa true; ei modaalia → false; fokus palaa + Havainto -painikkeeseen', () => {
    const poistettu = []; let fokus = 0, pkSulje = 0, valinta = { parentNode: { removeChild: (x) => poistettu.push('valinta') } }, pk = { remove: () => poistettu.push('pk') };
    const nap = { offsetParent: {}, focus: () => { fokus++; } }, doc = { getElementById: (id) => ({ _pkModal: pk, _tmPhValinta: valinta }[id] || null), querySelectorAll: () => [nap] };
    expect(N.tmNavHavaintoEsc(doc, { _pkSulje: () => { pkSulje++; } })).toBe(true); expect(pkSulje).toBe(1); expect(poistettu).toEqual(['valinta']);
    expect(N.tmNavHavaintoEsc({ getElementById: () => null }, {})).toBe(false);
    expect(N.tmNavHavaintoEsc({ getElementById: (id) => (id === '_pkModal' ? pk : null) }, {})).toBe(true); expect(poistettu).toEqual(['valinta', 'pk']);   // ilman _pkSulje:a poistetaan suoraan
    expect(N.tmNavPalautaFokus(doc)).toBe(true); expect(fokus).toBe(1); expect(N.tmNavPalautaFokus({ querySelectorAll: () => [{ offsetParent: null, getClientRects: () => [], focus: () => { fokus++; } }] })).toBe(false);
  });
  it('#3 Master kytkee: Esc-haara kutsuu tmNavHavaintoEsc ennen muuta sulkua; upotettu pikakortti paljastaa window._pkSulje; iframen Esc ohjataan samaan', () => {
    expect(MASTER).toMatch(/if \(e\.key === 'Escape'\) \{\n\s+if \(window\.TM_VALMENTAJA_NAV && window\.TM_VALMENTAJA_NAV\.tmNavHavaintoEsc\(document, window\)\) return;/); expect(MASTER).toContain('window._pkSulje = _pkClose;'); expect(MASTER).toMatch(/w\.document\.addEventListener\('keydown'[^\n]*tmNavHavaintoEsc/);
  });
  it('#5 Kodin tyhjä tila: pelaajia → EI "lisää pelaajat"; ei pelaajia → kolme askelta; järjestys Täytä viikko → Uusi havainto', () => {
    const PEL = [{ id: 'p1', nimi: 'Aatu Aalto' }], C = { t: (x) => x, on: () => 'x()' };
    const kaksi = KN.tmKotiHTML(K.tmKotiMalli({ uusi: true, joukkue: { id: 'j', nimi: 'J' }, pelaajat: PEL, tapahtumat: [], nyt: Date.UTC(2026, 9, 14) }), C);
    expect(kaksi).toContain('Aloita kahdella askeleella: täytä viikon harjoitukset kalenteriin ja kirjaa ensimmäinen havainto.'); expect(kaksi).not.toMatch(/lisää pelaajat/i); expect(kaksi.indexOf('Täytä viikko')).toBeGreaterThan(0); expect(kaksi.indexOf('Täytä viikko')).toBeLessThan(kaksi.indexOf('Uusi havainto'));
    const kolme = KN.tmKotiHTML(K.tmKotiMalli({ uusi: true, joukkue: { id: 'j', nimi: 'J' }, pelaajat: [], tapahtumat: [], nyt: Date.UTC(2026, 9, 14) }), C);
    expect(kolme).toContain('Aloita kolmella askeleella: lisää pelaajat joukkueeseen'); expect(kolme.indexOf('Täytä viikko')).toBeLessThan(kolme.indexOf('Uusi havainto'));
  });
});

describe('#1029-live: joukkuevalitsin id/nimi, kirjainkoosta riippumaton täsmäys (tm_joukkue.js)', () => {
  const J = require('../lib/tm_joukkue.js'), K = require('../lib/tm_valmentaja_koti.js'), KN = require('../lib/tm_valmentaja_koti_nakyma.js');
  const DOCS = [{ id: 'demo_u15', nimi: 'FC Demo U15' }, { id: 'demo_u14', nimi: 'FC Demo U14' }];
  const pel = (n, j, ids) => ({ id: 'p' + n, joukkue: j, joukkueet: ids });
  it('tmEtsiJoukkueDoc: id täsmä, nimi mikä tahansa kirjainkoko ("FC DEMO U15"), välilyönnit; ei osumaa → null', () => {
    ['demo_u15', 'FC Demo U15', 'FC DEMO U15', ' fc  demo u15 '].forEach((x) => expect(J.tmEtsiJoukkueDoc(x, DOCS).id, x).toBe('demo_u15')); expect(J.tmEtsiJoukkueDoc('Muu', DOCS)).toBeNull(); expect(J.tmEtsiJoukkueDoc('', DOCS)).toBeNull(); expect(J.tmEtsiJoukkueDoc('x', null)).toBeNull();
  });
  it('tmOnJoukkueessa: SA-valitsimen vanha isoilla kirjoitettu arvo löytää pelaajat (joukkue "FC Demo U15" / joukkueet [demo_u15]); id ja nimi toimivat; toisen joukkueen pelaaja ei', () => {
    const p = pel(1, 'FC Demo U15', ['demo_u15']), q = pel(2, 'FC Demo U14', ['demo_u14']);
    ['FC DEMO U15', 'FC Demo U15', 'demo_u15'].forEach((x) => { expect(J.tmOnJoukkueessa(p, x, DOCS), x).toBe(true); expect(J.tmOnJoukkueessa(q, x, DOCS), x).toBe(false); });
    expect(J.tmOnJoukkueessa(pel(3, 'FC Demo U15', []), 'demo_u15', DOCS)).toBe(true);   // legacy: vain nimi pelaajalla → kanonisoituu docille
  });
  it('ilman joukkue-doceja: normalisoitu nimivertailu legacy-kenttiin', () => { expect(J.tmOnJoukkueessa(pel(1, 'FC Demo U15', []), 'FC DEMO U15', null)).toBe(true); expect(J.tmOnJoukkueessa(pel(1, 'FC Demo U14', []), 'FC DEMO U15', [])).toBe(false); });
  it('SA valitsee U15 → Kodissa 4 pelaajaa (ei tyhjä "lisää pelaajat" -tilaa): malli saa joukkueen docista, pelaajat täsmäävät id:llä', () => {
    const kaikki = [1, 2, 3, 4].map((n) => pel(n, 'FC Demo U15', ['demo_u15'])).concat([5, 6].map((n) => pel(n, 'FC Demo U14', ['demo_u14']))), jd = J.tmEtsiJoukkueDoc('FC DEMO U15', DOCS);
    const rajattu = kaikki.filter((x) => J.tmOnJoukkueessa(x, 'FC DEMO U15', DOCS)).map((x) => ({ id: x.id, nimi: 'Pelaaja ' + x.id })); expect(rajattu).toHaveLength(4);
    const m = K.tmKotiMalli({ nyt: Date.UTC(2026, 9, 14), joukkue: { id: jd.id, nimi: jd.nimi }, pelaajat: rajattu, tapahtumat: [], uusi: !rajattu.length });
    expect(m.syke.pelaajia).toBe(4); expect(m.tyhja).toBeNull(); expect(KN.tmKotiHTML(m, { t: (x) => x, on: () => 'x()' })).not.toMatch(/lisää pelaajat/i);
  });
  it('Master: valitsin kirjoittaa option.value = doc-id, _joukkue = docin nimi; _mOnJoukkueessa ja Kodin jd käyttävät libin täsmäystä', () => {
    expect(MASTER).toContain('opt.value = j.id;'); expect(MASTER).toContain('opt.textContent = j.nimi;'); expect(MASTER).toContain('_joukkue = vj ? vj.nimi : null;'); expect(MASTER).toContain('return tmOnJoukkueessa(p, joukkue, _mJoukkueDocs);'); expect(MASTER).toContain('const jd = tmEtsiJoukkueDoc(_joukkue, _mJoukkueDocs)');
    expect(MASTER).not.toContain('(_mJoukkueDocs || []).find(j => j.nimi === _joukkue)');
  });
});
