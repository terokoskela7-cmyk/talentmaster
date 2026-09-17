/**
 * TalentMaster™ — Kaavion KOHDISTUS: neljä tasoa + varsinainen kohteen valinta (erä A+B).
 *
 * Lähde (Tero, live): "Edelleen tätä ei voi liittää tiettyyn pelaajaan. … miten VP voi tietää
 * kenelle se tallentuu, tai toisin, että valmentaja ei voi kohdistaa piirrosta pelaajalle."
 *
 * Näkyvyyspicker oli PUOLIKAS: taso valittiin, KOHDE ei. review.pelaajaIds jäi tyhjäksi ja
 * review.joukkueId asettamatta → kortti sanoi "pelaaja" muttei kenelle.
 *
 *   A) MALLI — neljäs taso 'valmentaja' on HENKILÖSTÖREITITYS, ei pelaajayleisö
 *   B) KOHDE-VAATIMUS — mikä taso vaatii kohteen, ja puuttuva kohde on näkyvä tila
 *   C) TASOLISTA — peili rulesista, ei kovakoodattua roolilogiikkaa libissä
 *   D) AJO — picker renderöityy, kohde luetaan, tason vaihto NOLLAA edellisen kohteen
 *   E) KOHDE NÄKYVIIN — kortti ja tallennusrivi kertovat nimet, eivät pelkkää tasoa
 *   F) PARITEETTI — vendoroitu functions/kaavio_policy.js vastaa libiä myös uudella tasolla
 *   G) §7.22 — host-listoissa vain id + nimi, ei arvioita
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const UI = readFileSync(join(ROOT, 'lib', 'tm_kaavio_ui.js'), 'utf8');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
const M = readFileSync(join(ROOT, 'TalentMaster_Master_v16.html'), 'utf8');
const RULES = readFileSync(join(ROOT, 'tm_admin', 'firestore.rules'), 'utf8');
const P = require_(join(ROOT, 'lib', 'tm_kaavio_policy.js'));
const S = require_(join(ROOT, 'functions', 'kaavio_policy.js'));

const RIVIT = UI.split('\n');
const runko = (nimi) => {
  const a = RIVIT.findIndex((l) => new RegExp('^(?:async\\s+)?function ' + nimi + '\\s*\\(').test(l));
  if (a < 0) throw new Error('funktiota ei löytynyt: ' + nimi);
  for (let i = a + 1; i < RIVIT.length; i++) if (RIVIT[i] === '}') return RIVIT.slice(a, i + 1).join('\n');
  throw new Error('sulkua ei löytynyt: ' + nimi);
};

const doc = (nakyvyys, extra) => ({ seuraId: 'A', review: Object.assign({ status: 'hyvaksytty', nakyvyys }, extra || {}) });
const PEL = { seuraId: 'A', joukkueet: ['u13'], pelaajaId: 'p1' };

describe("A — 'valmentaja' on henkilöstöreititys, ei pelaajayleisö", () => {
  it('taso on mallissa', () => {
    expect(P.TM_KAAVIO_NAKYVYYDET).toContain('valmentaja');
  });
  it('EI kohdistu pelaajaan — ei edes sille jolle kaikki muu kohdistuu', () => {
    // Sama pelaaja osuu seura-, joukkue- ja pelaajatasoon → ainoa muuttuja on taso.
    expect(P.kaavioKohdistuu(doc('seura'), PEL)).toBe(true);
    expect(P.kaavioKohdistuu(doc('joukkue', { joukkueId: 'u13' }), PEL)).toBe(true);
    expect(P.kaavioKohdistuu(doc('pelaaja', { pelaajaIds: ['p1'] }), PEL)).toBe(true);
    expect(P.kaavioKohdistuu(doc('valmentaja', { valmentajaId: 'c1' }), PEL)).toBe(false);
  });
  it('ei kohdistu vaikka valmentajaId osuisi pelaajan id:hen (ei sekaannu akselia)', () => {
    expect(P.kaavioKohdistuu(doc('valmentaja', { valmentajaId: 'p1' }), PEL)).toBe(false);
  });
  it('valmentaja NÄKEE sen pankissaan — lukuportti ei riipu näkyvyystasosta', () => {
    const ctx = { rooli: 'valmentaja', seuraId: 'A', uid: 'c1' };
    expect(P.kaavioVoiLukea(doc('valmentaja', { valmentajaId: 'c1' }), ctx)).toBe(true);
    expect(P.kaavioVoiLukea(doc('valmentaja', { valmentajaId: 'joku_muu' }), ctx)).toBe(true);
    // Toisen seuran valmentaja ei näe LUONNOSTA (seura-lukko). HUOM: hyväksytty kaavio on
    // luettavissa kaikille kirjautuneille — se on tietoinen sääntö (rules: kaavioTila=='hyvaksytty'),
    // ei tämän erän muutos, joten vertailu tehdään luonnoksella.
    const luonnos = { seuraId: 'A', review: { status: 'luonnos', nakyvyys: 'valmentaja', valmentajaId: 'c1' } };
    expect(P.kaavioVoiLukea(luonnos, ctx)).toBe(true);
    expect(P.kaavioVoiLukea(luonnos, { rooli: 'valmentaja', seuraId: 'B', uid: 'c1' })).toBe(false);
  });
});

describe('B — kohde-vaatimus', () => {
  it('seura ei vaadi kohdetta, muut vaativat', () => {
    expect(P.kaavioKohdeKentta('seura')).toBe(null);
    expect(P.kaavioKohdeKentta('joukkue')).toBe('joukkueId');
    expect(P.kaavioKohdeKentta('valmentaja')).toBe('valmentajaId');
    expect(P.kaavioKohdeKentta('pelaaja')).toBe('pelaajaIds');
  });
  it('puuttuva kohde tunnistetaan — se oli koko vian oire', () => {
    expect(P.kaavioKohdePuuttuu({ review: { nakyvyys: 'pelaaja', pelaajaIds: [] } })).toBe(true);
    expect(P.kaavioKohdePuuttuu({ review: { nakyvyys: 'joukkue' } })).toBe(true);
    expect(P.kaavioKohdePuuttuu({ review: { nakyvyys: 'valmentaja', valmentajaId: null } })).toBe(true);
  });
  it('valittu kohde EI ole puuttuva (ei-vacuous)', () => {
    expect(P.kaavioKohdePuuttuu({ review: { nakyvyys: 'pelaaja', pelaajaIds: ['p1'] } })).toBe(false);
    expect(P.kaavioKohdePuuttuu({ review: { nakyvyys: 'joukkue', joukkueId: 'u13' } })).toBe(false);
    expect(P.kaavioKohdePuuttuu({ review: { nakyvyys: 'seura' } })).toBe(false);
  });
});

describe('C — tasolista on rulesin peili', () => {
  it('lista vastaa rulesin kaavioNakyvyysLuontiOk():ta', () => {
    const m = RULES.match(/function kaavioNakyvyysLuontiOk\(\)[\s\S]*?in \[([^\]]*)\]/);
    expect(m).toBeTruthy();
    const rulesTasot = m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean).sort();
    expect(P.kaavioNakyvyysTasot({ rooli: 'valmentaja', seuraId: 'A' }).sort()).toEqual(rulesTasot);
  });
  it('hyväksyjä saa lisäksi seuratason (ja vain hän)', () => {
    expect(P.kaavioNakyvyysTasot({ rooli: 'vp' })).toContain('seura');
    expect(P.kaavioNakyvyysTasot({ rooli: 'urheilutoimenjohtaja' })).toContain('seura');
    expect(P.kaavioNakyvyysTasot({ superAdmin: true })).toContain('seura');
    ['valmentaja', 'talenttivalmentaja', 'fysiikkavalmentaja'].forEach((r) =>
      expect(P.kaavioNakyvyysTasot({ rooli: r }), r).not.toContain('seura'));
  });
});

// ── D: AJO. Sandbox ei stubbaa tuntematonta nimeä (sama periaate kuin entry point -testissä).
const LIBIT = ['tm_teknistaktiset.js', 'tm_konsepti_resolve.js', 'tm_kaavio_render.js',
               'tm_kaavio_policy.js', 'tm_kaavio_validate.js', 'tm_kaavio_editori.js',
               'tm_kaavio_konsepti.js', 'tm_kaavio_ui.js'];

function sivu({ rooli, listat }) {
  const el = (id) => ({ id, value: '', innerHTML: '', options: [], textContent: '' });
  const rekisteri = {};
  const sb = {
    console, Math, JSON, String, Number, Object, Array, Boolean, Promise, Date, RegExp, Error,
    setTimeout, clearTimeout, parseFloat, parseInt, isNaN,
    document: {
      getElementById: (id) => rekisteri[id] || null,
      body: { insertAdjacentHTML: () => {} }
    }
  };
  sb.window = {};
  vm.createContext(sb);
  LIBIT.forEach((f) => vm.runInContext(readFileSync(join(ROOT, 'lib', f), 'utf8'), sb));
  sb.window.TM_KAAVIO_HOST = Object.assign({
    db: null, t: (fi) => fi, lang: () => 'fi', toast: () => {},
    ctx: () => ({ rooli: rooli || null, uid: 'u1', seuraId: 'A', joukkueet: ['u13'], superAdmin: false, anon: false })
  }, listat || {});
  return { sb, rekisteri, el };
}
const aja = (sb, expr) => vm.runInContext(expr, sb);

const LISTAT = {
  joukkueet: () => [{ id: 'u13', nimi: 'P13' }, { id: 'u15', nimi: 'P15' }],
  pelaajat: (jid) => [{ id: 'p1', nimi: 'Topias', joukkueId: 'u13' }, { id: 'p2', nimi: 'Aada', joukkueId: 'u13' },
                      { id: 'p3', nimi: 'Eelis', joukkueId: 'u15' }].filter((p) => !jid || p.joukkueId === jid),
  valmentajat: () => [{ id: 'c1', nimi: 'Mikko' }, { id: 'c2', nimi: 'Sanna' }]
};

describe('D — picker ajetaan: renderöityy, luetaan, nollautuu', () => {
  it('jokainen taso renderöi OMAN kohdevalitsimensa', () => {
    const { sb } = sivu({ rooli: 'vp', listat: LISTAT });
    expect(aja(sb, "_kaavioKohdeValitsinHTML('_x','joukkue',null)")).toContain('id="_xKj"');
    expect(aja(sb, "_kaavioKohdeValitsinHTML('_x','valmentaja',null)")).toContain('id="_xKv"');
    expect(aja(sb, "_kaavioKohdeValitsinHTML('_x','pelaaja',null)")).toContain('id="_xKp"');
    expect(aja(sb, "_kaavioKohdeValitsinHTML('_x','seura',null)")).toBe('');   // koko seura → ei kohdetta
  });
  it('pelaajavalitsin on MONIVALINTA ja listaa rosterin nimillä', () => {
    const { sb } = sivu({ rooli: 'vp', listat: LISTAT });
    const h = aja(sb, "_kaavioKohdeValitsinHTML('_x','pelaaja',null)");
    expect(h).toMatch(/<select id="_xKp" multiple/);
    ['Topias', 'Aada', 'Eelis'].forEach((n) => expect(h, n).toContain('data-nimi="' + n + '"'));
  });
  it('joukkuesuodatin rajaa pelaajalistan (VP:n rosteri on koko seura)', () => {
    const { sb } = sivu({ rooli: 'vp', listat: LISTAT });
    const h = aja(sb, "_kaavioPelaajaListaHTML('_x','u15',[])");
    expect(h).toContain('data-nimi="Eelis"');
    expect(h).not.toContain('data-nimi="Topias"');
  });
  it('yksi joukkue → esivalinta (pakollinen klikkaus ei tuota tietoa)', () => {
    const yksi = Object.assign({}, LISTAT, { joukkueet: () => [{ id: 'u13', nimi: 'P13' }] });
    const { sb } = sivu({ rooli: 'valmentaja', listat: yksi });
    expect(aja(sb, "_kaavioKohdeValitsinHTML('_x','joukkue',null)")).toMatch(/value="u13" selected/);
  });
  it('valinta on NÄKYVÄ myös ilman väriä (✓-etuliite) — oma korostus, koska option-tausta syrjäyttää järjestelmän', () => {
    const { sb } = sivu({ rooli: 'vp', listat: LISTAT });
    const h = aja(sb, "_kaavioPelaajaListaHTML('_x','',['p1'])");
    expect(h).toMatch(/value="p1"[^>]*selected>\u2713/);
    expect(h).toMatch(/value="p2"[^>]*>\u00A0/);
    expect(h).toMatch(/value="p1"[^>]*background-color:rgba\(40,176,144/);
    // ja klikkaus päivittää korostuksen PAIKALLAAN (ei listan uudelleenrakennusta)
    expect(h).toContain('onchange="_kaavioPelaajaKorosta(this)"');
    expect(runko('_kaavioPelaajaKorosta')).toContain("getAttribute('data-nimi')");
  });
  it('olemassa oleva kohde tulee esivalituksi (kohdetta voi korjata jälkikäteen)', () => {
    const { sb } = sivu({ rooli: 'vp', listat: LISTAT });
    const h = aja(sb, "_kaavioKohdeValitsinHTML('_x','pelaaja',{pelaajaIds:['p2']})");
    expect(h).toMatch(/value="p2"[^>]*\sselected>/);
    expect(h).not.toMatch(/value="p1"[^>]*\sselected>/);
  });
  it('_kaavioKohdeLue palauttaa AINA kaikki kolme kenttää → tason vaihto nollaa edellisen', () => {
    const { sb, rekisteri } = sivu({ rooli: 'vp', listat: LISTAT });
    rekisteri._xKj = { value: 'u15' };
    const r = aja(sb, "_kaavioKohdeLue('_x','joukkue')");
    expect(r).toEqual({ joukkueId: 'u15', valmentajaId: null, pelaajaIds: [] });
  });
  it('monivalinta luetaan kaikki valitut', () => {
    const { sb, rekisteri } = sivu({ rooli: 'vp', listat: LISTAT });
    rekisteri._xKp = { options: [{ value: 'p1', selected: true }, { value: 'p2', selected: true }, { value: 'p3', selected: false }] };
    expect(aja(sb, "_kaavioKohdeLue('_x','pelaaja')").pelaajaIds).toEqual(['p1', 'p2']);
  });
  it('FAIL-SAFE: host ei tarjoa listaa → tasoa ei tarjota lainkaan', () => {
    const { sb } = sivu({ rooli: 'vp', listat: { joukkueet: LISTAT.joukkueet, pelaajat: LISTAT.pelaajat } });
    expect(aja(sb, '_kaavioTasotNyt()')).not.toContain('valmentaja');
    expect(aja(sb, '_kaavioTasotNyt()')).toContain('pelaaja');
  });
  it('EI-VACUOUS: kun lista ON, taso tarjotaan', () => {
    const { sb } = sivu({ rooli: 'vp', listat: LISTAT });
    expect(aja(sb, '_kaavioTasotNyt()')).toContain('valmentaja');
  });
  it('rooliportti säilyy valitsimessa: valmentajalle ei seuratasoa', () => {
    const { sb } = sivu({ rooli: 'valmentaja', listat: LISTAT });
    expect(aja(sb, '_kaavioTasotNyt()')).not.toContain('seura');
    const { sb: sb2 } = sivu({ rooli: 'vp', listat: LISTAT });
    expect(aja(sb2, '_kaavioTasotNyt()')).toContain('seura');
  });
});

describe('E — kohde näkyviin niminä (Teron vaatimus)', () => {
  const lbl = (review, listat) => {
    const { sb } = sivu({ rooli: 'vp', listat: listat || LISTAT });
    return aja(sb, '_kaavioKohdeLbl(' + JSON.stringify(review) + ')');
  };
  it('pelaajataso listaa NIMET, ei id:itä', () => {
    expect(lbl({ nakyvyys: 'pelaaja', pelaajaIds: ['p1', 'p2'] })).toBe('pelaaja: Topias, Aada');
  });
  it('joukkue ja valmentaja niminä', () => {
    expect(lbl({ nakyvyys: 'joukkue', joukkueId: 'u15' })).toBe('joukkue: P15');
    expect(lbl({ nakyvyys: 'valmentaja', valmentajaId: 'c1' })).toBe('valmentaja: Mikko');
  });
  it('seurataso ei väitä kohdetta', () => {
    expect(lbl({ nakyvyys: 'seura' })).toBe('seura');
  });
  it('PUUTTUVA kohde sanotaan ääneen — se on juuri se tila jonka VP korjaa', () => {
    expect(lbl({ nakyvyys: 'pelaaja', pelaajaIds: [] })).toBe('pelaaja · kohdetta ei valittu');
    expect(lbl({ nakyvyys: 'joukkue' })).toBe('joukkue · kohdetta ei valittu');
  });
  it('lista puuttuu (toinen appi) → id, ei tyhjä', () => {
    expect(lbl({ nakyvyys: 'pelaaja', pelaajaIds: ['p9'] }, {})).toBe('pelaaja: p9');
  });
  it('kortti ja tallennusrivi käyttävät samaa labelia (ei kahta totuutta)', () => {
    expect(runko('_kaavioKorttiHTML')).toContain('_kaavioKohdeLbl(k.review)');
    expect(runko('_kaavioTallennusKohdeHTML')).toContain('_kaavioKohdeLbl(');
  });
});

describe('F — kirjoituspolku vie kohteen dokumenttiin', () => {
  it('kohdistuskentät ovat YKSI lähde luonnille ja muokkaukselle', () => {
    const t = runko('_kaavioTallenna');
    // kolme kutsukohtaa: luonnin kirjoitus · luonnin paikallinen synkka · muokkauksen _kk.
    // Kaikki samasta funktiosta → haarat eivät voi ajautua erilleen.
    expect((t.match(/_kaavioKohdistusKentat\(m\)/g) || []).length).toBe(3);
    expect(t).not.toMatch(/nakyvyys: \(m\.review && m\.review\.nakyvyys\)/);   // vanha kopioitu muoto poissa
  });
  it('muokkaus kirjoittaa kaikki kohdekentät (muuten editorin valitsin olisi näennäinen)', () => {
    const t = runko('_kaavioTallenna');
    ["'review.nakyvyys'", "'review.joukkueId'", "'review.valmentajaId'", "'review.pelaajaIds'"]
      .forEach((k) => expect(t, k).toContain(k));
  });
  it('oletus on KAPEIN taso, ei seura (puuttuva arvo ei saa tarkoittaa laajinta yleisöä)', () => {
    const { sb } = sivu({ rooli: 'valmentaja', listat: LISTAT });
    expect(aja(sb, "_kaavioKohdistusKentat({review:{}})")).toEqual({ nakyvyys: 'joukkue', joukkueId: null, valmentajaId: null, pelaajaIds: [] });
    expect(runko('_kaavioKohdistusKentat')).not.toMatch(/\|\| 'seura'/);
  });
  it('kohdistuksen muutos lasketaan tallentamattomaksi (spec-vertailu ei näkisi sitä)', () => {
    const t = runko('_kaavioTallentamattomia');
    expect(t).toContain('tallennettuKohde');
    expect(runko('_kaavioKohdeLeima')).toMatch(/valmentajaId|r\.valmentajaId/);
  });
});

describe('G — pariteetti ja §7.22', () => {
  it('vendoroitu palvelinpeili tuntee neljännen tason', () => {
    const tapaukset = [
      [doc('seura'), PEL], [doc('joukkue', { joukkueId: 'u13' }), PEL],
      [doc('pelaaja', { pelaajaIds: ['p1'] }), PEL], [doc('valmentaja', { valmentajaId: 'c1' }), PEL],
      [doc('valmentaja', { valmentajaId: 'p1' }), PEL]
    ];
    tapaukset.forEach(([d, p], i) => expect(S.kaavioKohdistuuServer(d, p), 'tapaus ' + i).toBe(P.kaavioKohdistuu(d, p)));
    // ei-vacuous: totuustaulussa on molempia arvoja
    const tulokset = tapaukset.map(([d, p]) => S.kaavioKohdistuuServer(d, p));
    expect(tulokset.filter(Boolean).length).toBeGreaterThan(0);
    expect(tulokset.filter((x) => !x).length).toBeGreaterThan(0);
  });
  it('§7.22: host-listat rakentavat pelaajarivin EKSPLISIITTISESTI (ei spreadia koko objektista)', () => {
    [['VP', VP, '_vpKaavioPelaajat'], ['Master', M, '_mKaavioPelaajat']].forEach(([nimi, src, fn]) => {
      const i = src.indexOf('function ' + fn + '(');
      expect(i, nimi).toBeGreaterThan(0);
      const f = src.slice(i, src.indexOf('\n}', i));
      expect(f, nimi).toMatch(/\{\s*\n?\s*id: p\.id,/);
      expect(f, nimi).not.toMatch(/\.\.\.p|Object\.assign\(\{\}, p\)/);
      // arviointikentät eivät saa vuotaa jaettuun libiin
      ['tki_', 'flei_', 'hh_', 'adar_', 'phv_'].forEach((kielletty) => expect(f, nimi + '/' + kielletty).not.toContain(kielletty));
    });
  });
});
