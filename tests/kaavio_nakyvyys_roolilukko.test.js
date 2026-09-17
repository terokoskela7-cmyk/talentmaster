/**
 * TalentMaster™ — näkyvyystason roolilukko.
 *
 * Hallintomalli: valmentaja luo ja kohdistaa OMAN joukkueensa sisältöä; seuran yhteisen
 * kirjaston kuratoi metodologiajohto (VP / urheilutoimenjohtaja / SA). Aiemmin luontilomake
 * tarjosi 'seura'-näkyvyyden kaikille eikä sääntö estänyt valmentajaa merkitsemästä kaaviota
 * seuratasoiseksi.
 *
 *   A) SÄÄNTÖ ON TOTUUS — portin lauseke ja sen FAIL-CLOSED-oletus (pakotus emulaattorissa:
 *      tests/rules/kaavio.rules.test.js)
 *   B) LOMAKE — valikko rooliporttaa; UI ei lupaa mitä palvelin hylkäisi
 *   C) NOSTO — kuratointitoimi hyväksyjälle, ei tilasiirto
 *   D) REGRESSIO — luku, luonti ja review-ketju muuten ennallaan
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
// TAKTIIKKATAULUN UI ON NYT JAETUSSA LIBISSÄ (lib/tm_kaavio_ui.js) — sama koodi ajaa VP:ssä ja
// valmentajan apissa. Siksi UI:ta koskevat väitteet luetaan LIBISTÄ; `VP` jää niihin väitteisiin
// jotka koskevat nimenomaan VP:n omaa kytkentää (script-tagit, host-adapteri, sivupalkki).
const UI = readFileSync(join(ROOT, 'lib', 'tm_kaavio_ui.js'), 'utf8');
const RULES = readFileSync(join(ROOT, 'tm_admin', 'firestore.rules'), 'utf8');
const P = require_(join(ROOT, 'lib', 'tm_kaavio_policy.js'));
const RIVIT = UI.split('\n');
const runko = (nimi) => {
  const a = RIVIT.findIndex((l) => new RegExp('^(?:async\\s+)?function ' + nimi + '\\s*\\(').test(l));
  if (a < 0) throw new Error('ei löytynyt: ' + nimi);
  for (let i = a + 1; i < RIVIT.length; i++) if (RIVIT[i] === '}') return RIVIT.slice(a, i + 1).join('\n');
  throw new Error('sulku puuttuu: ' + nimi);
};
const sääntö = (nimi) => {
  const i = RULES.indexOf('function ' + nimi + '(');
  expect(i, nimi).toBeGreaterThan(0);
  return RULES.slice(i, RULES.indexOf('\n    }', i) + 6);
};

describe('A — sääntö on totuus', () => {
  it('luontiportti: seurataso vain hyväksyjältä', () => {
    const f = sääntö('kaavioNakyvyysLuontiOk');
    // 'valmentaja' on mukana: se on HENKILÖSTÖREITITYS (kaavioKohdistuu → false), ei
    // pelaajayleisö, joten se ei laajenna näkyvyyttä eikä vaadi hyväksyjää. 'seura' EI ole.
    expect(f).toMatch(/in \['joukkue', 'pelaaja', 'valmentaja'\]/);
    expect(f).not.toMatch(/in \[[^\]]*'seura'[^\]]*\]/);
    expect(f).toContain('onKaavioHyvaksyja()');
    expect(RULES).toMatch(/allow create:[\s\S]*kaavioNakyvyysLuontiOk\(\)/);
  });
  it('muokkausportti koskee NOSTOA, ei absoluuttista arvoa', () => {
    // Jo seuratasoisen kaavion sisältömuokkaus säilyy valmentajalla — muuten VP:n hyväksymän
    // kaavion pieninkin korjaus olisi yhtäkkiä kielletty.
    const f = sääntö('kaavioNakyvyysMuutosOk');
    expect(f).toMatch(/kaavioNakyvyys\(request\.resource\.data\) != 'seura'/);
    expect(f).toMatch(/kaavioNakyvyys\(resource\.data\) == 'seura'/);
    expect(f).toContain('onKaavioHyvaksyja()');
    expect(RULES).toMatch(/allow update:[\s\S]*kaavioNakyvyysMuutosOk\(\)/);
  });
  it('FAIL-CLOSED: puuttuva nakyvyys tulkitaan seuratasoksi', () => {
    expect(RULES).toMatch(/function kaavioNakyvyys\(d\)[^\n]*'nakyvyys', 'seura'/);
  });
  it('hyväksyjälista on sama kuin muualla kaaviosäännöissä (ei rinnakkaista roolilistaa)', () => {
    const h = RULES.match(/function onKaavioHyvaksyja\(\)[\s\S]*?rooli in \[([^\]]*)\]/);
    const roolit = h[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
    expect([...roolit].sort()).toEqual(['urheilutoimenjohtaja', 'vp']);
    roolit.forEach((r) => expect(P.kaavioOnHyvaksyja({ rooli: r, seuraId: 'A' }), r).toBe(true));
    ['valmentaja', 'talenttivalmentaja', 'seurasihteeri'].forEach((r) =>
      expect(P.kaavioOnHyvaksyja({ rooli: r, seuraId: 'A' }), r).toBe(false));
  });
});

describe('B — lomake rooliporttaa valikon', () => {
  // Valikko rakennetaan nyt POLICYSTA (kaavioNakyvyysTasot = peili rulesin
  // kaavioNakyvyysLuontiOk:sta), ei kovakoodatusta option-listasta. Väite on siksi
  // policyn KÄYTÖKSESTÄ + siitä ettei lomake rakenna omaa rinnakkaista listaansa.
  it('seura-taso VAIN hyväksyjälle', () => {
    expect(P.kaavioNakyvyysTasot({ rooli: 'valmentaja', seuraId: 'A' })).not.toContain('seura');
    expect(P.kaavioNakyvyysTasot({ rooli: 'talenttivalmentaja', seuraId: 'A' })).not.toContain('seura');
    expect(P.kaavioNakyvyysTasot({ rooli: 'vp', seuraId: 'A' })).toContain('seura');
    expect(P.kaavioNakyvyysTasot({ superAdmin: true })).toContain('seura');
  });
  it('joukkue, valmentaja ja pelaaja tarjotaan aina', () => {
    ['valmentaja', 'vp'].forEach((r) => {
      const t = P.kaavioNakyvyysTasot({ rooli: r, seuraId: 'A' });
      ['joukkue', 'valmentaja', 'pelaaja'].forEach((x) => expect(t, r + '/' + x).toContain(x));
    });
  });
  it('lomake EI rakenna omaa tasolistaansa — se kutsuu valitsinta', () => {
    const f = runko('_kaavioUusiLomake');
    expect(f).toContain("_kaavioNakyvyysValitsinHTML('_kvU'");
    expect(f).not.toMatch(/<option value="(seura|joukkue|pelaaja)"/);
  });
  it('valitsin ottaa tasot policysta, ei roolilistasta', () => {
    const v = runko('_kaavioTasotNyt');
    expect(v).toContain('kaavioNakyvyysTasot(');
    expect(v).not.toMatch(/'vp'|'urheilutoimenjohtaja'|super_admin/);
  });
  it('ei-hyväksyjälle kerrotaan MIKSI seurataso puuttuu (ei hiljaista rajoitetta)', () => {
    expect(runko('_kaavioUusiLomake')).toMatch(/if \(!_hyv\) h \+=[\s\S]*Seuratason kaavion asettaa valmennuspäällikkö/);
  });
  it('hyväksyjyys tulee policy-libistä, ei omasta roolilistasta', () => {
    const h = runko('_kaavioOnHyvaksyjaNyt');
    expect(h).toContain('kaavioOnHyvaksyja(_kaavioCtxNyt())');
    expect(h).not.toMatch(/'vp'|'urheilutoimenjohtaja'|super_admin/);
  });
  it('OLETUS on kapein taso myös hyväksyjälle — seura on kuratointipäätös, ei luonnin oletus', () => {
    const v = runko('_kaavioNakyvyysValitsinHTML');
    expect(v).toContain("tasot.indexOf('joukkue') >= 0");
    expect(v).not.toMatch(/'seura'/);
  });
});

describe('C — nosto seuratasolle on kuratointitoimi', () => {
  const fn = () => runko('_kaavioNostaSeuratasolle');
  it('kirjoittaa VAIN nakyvyyden ja version — status ei muutu', () => {
    const f = fn();
    expect(f).toMatch(/'review\.nakyvyys': 'seura'/);
    expect(f).toMatch(/'review\.versio': kaavioSeuraavaVersio\(k\)/);
    expect(f).not.toMatch(/review\.status/);
  });
  it('tarkistaa oikeuden myös itse (nappi ei ole ainoa vartija)', () => {
    expect(fn()).toContain('_kaavioOnHyvaksyjaNyt()');
  });
  it('kanonista ei kuratoida seurakerroksessa', () => {
    expect(fn()).toMatch(/if \(!k \|\| k\.kanoninen\) return;/);
  });
  it('nappi näkyy vain hyväksyjälle, vain ei-seuratasoiselle ja vain seurakaaviolle', () => {
    const kortti = UI.slice(UI.indexOf('function _kaavioKorttiHTML('), UI.indexOf('function _kaavioNappiHTML('));
    expect(kortti).toMatch(/!k\.kanoninen && k\.review && k\.review\.nakyvyys !== 'seura' &&[\s\S]*kaavioOnHyvaksyja\(ctx\)/);
  });
  it('nosto ei ole review-elinkaaren toiminto (ei kaavioToiminnot-listalla)', () => {
    const pol = readFileSync(join(ROOT, 'lib', 'tm_kaavio_policy.js'), 'utf8');
    expect(pol).not.toContain('nosta');
    expect(P.kaavioToiminnot({ seuraId: 'A', review: { status: 'hyvaksytty', nakyvyys: 'joukkue', joukkueId: 'u13' } },
      { rooli: 'vp', seuraId: 'A' })).not.toContain('nosta');
  });
  it('kaikki uudet tekstit ovat sv-kartassa', () => {
    const sv = readFileSync(join(ROOT, 'lib', 'tm_i18n_common.js'), 'utf8')
      + readFileSync(join(ROOT, 'lib', 'tm_vp_i18n.js'), 'utf8');   // C1: avain on TASAN toisessa
    ['Nosta seuratasolle', 'Kaavio nostettu seuratasolle', 'Ei oikeutta nostaa seuratasolle',
     'Seuratason kaavion asettaa valmennuspäällikkö katselmuksessa.'].forEach((k) => {
      expect(UI, k).toContain("_kuiT('" + k + "')");
      expect(sv, k).toContain("'" + k + "':");
    });
  });
});

describe('D — regressio: muu ketju ennallaan', () => {
  it('pelaajan lukuoikeus koskematta (vain hyvaksytty; kohdistus yhä UI-suodatin)', () => {
    const i = RULES.indexOf('match /kaaviot/{kaavioId}');
    const lohko = RULES.slice(i, RULES.indexOf('allow delete', i));
    expect(lohko).toContain("kaavioTila(resource.data) == 'hyvaksytty'");
    expect(lohko).not.toMatch(/allow read:[\s\S]*nakyvyys/);
  });
  it('statussiirrot ja versiolukko ennallaan', () => {
    expect(RULES).toMatch(/allow update: if kaavioVersioOk\(\)/);
    expect(RULES).toMatch(/kaavioSiirtoOk\(kaavioTila\(resource\.data\), kaavioTila\(request\.resource\.data\)\)/);
  });
  it('luonti kirjoittaa yhä luonnos + versio 0', () => {
    const t = runko('_kaavioTallenna');
    expect(t).toMatch(/status: 'luonnos'/);
    expect(t).toMatch(/versio: 0/);
  });
  it('EI-VACUOUS: portti on sekä määritelty ETTÄ kytketty (ei kuollut funktio)', () => {
    // Kommentit pois: muutoshistoria tiedoston alussa mainitsee funktiot nimeltä.
    const koodi = RULES.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    ['kaavioNakyvyysLuontiOk', 'kaavioNakyvyysMuutosOk'].forEach((f) => {
      expect(koodi, f + ' määrittely').toContain('function ' + f + '(');
      expect((koodi.match(new RegExp(f + '\\(\\)', 'g')) || []).length, f + ' kytkentä').toBe(2);
    });
  });
});
