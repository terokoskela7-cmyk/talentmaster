/* KAUSIAVAIN — yksi lähde neljän kovakoodatun kopion tilalle.
   Suomessa kausi on KALENTERIVUOSI. Neljä paikkaa kovakoodasi heinä–kesä-kauden
   (`getMonth() >= 6`), ja kaksi niistä käytti sitä merkkijonoa `konfiguraatio/tavoitteet`
   -dokumentin AVAIMENA — väärä kausi luki ja kirjoitti siis väärää riviä.

   Vartijat kolmessa kerroksessa:
     1. puhtaat lib-funktiot (kausi, alku, legacy-avaimet, tavoitteiden luku)
     2. AJETTU todiste: _vpKaudenAlku käyttää libiä, ei omaa laskentaansa
     3. repovartija: kovakoodattu kausilaskenta ei saa palata (tm_idp.js:n JAKSO on eri asia) */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const AH = vaadi('../lib/tm_arviointi_historia.js');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const ADMIN = readFileSync(join(juuri, 'TalentMaster_Admin.html'), 'utf8');
const MASTER = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');

const FI = { maa: 'FI' };
const HK = { kausimalli: 'heina_kesa' };

describe('(1) tmKausiNyt — seuran kausimalli ratkaisee', () => {
  it('Suomi = kalenterivuosi, myös heinäkuun jälkeen', () => {
    expect(AH.tmKausiNyt(FI, new Date('2026-09-28T12:00:00Z'))).toBe('2026');
    expect(AH.tmKausiNyt(FI, new Date('2026-02-03T12:00:00Z'))).toBe('2026');
  });

  it('heinä–kesä-malli vaihtaa kauden heinäkuussa', () => {
    expect(AH.tmKausiNyt(HK, new Date('2026-06-30T12:00:00Z'))).toBe('2025-26');
    expect(AH.tmKausiNyt(HK, new Date('2026-07-01T12:00:00Z'))).toBe('2026-27');
  });

  it('vuodenvaihde Helsingin aikaa (31.12. klo 23 on yhä vanha vuosi)', () => {
    expect(AH.tmKausiNyt(FI, new Date('2026-12-31T21:00:00Z'))).toBe('2026');   // 23:00 Helsinki
    expect(AH.tmKausiNyt(FI, new Date('2026-12-31T22:30:00Z'))).toBe('2027');   // 00:30 Helsinki
  });

  it('seura ilman tietoja → FI-oletus (kaikki nykyiset pilottiseurat)', () => {
    expect(AH.tmKausiNyt(null, new Date('2026-09-28T12:00:00Z'))).toBe('2026');
  });
});

describe('(2) tmKausiAlku', () => {
  it('kalenterikausi alkaa 1.1., heinä–kesä 1.7.', () => {
    const k = AH.tmKausiAlku('2026', 'kalenteri');
    expect([k.getFullYear(), k.getMonth(), k.getDate()]).toEqual([2026, 0, 1]);
    const h = AH.tmKausiAlku('2026-27', 'heina_kesa');
    expect([h.getFullYear(), h.getMonth(), h.getDate()]).toEqual([2026, 6, 1]);
  });

  it('alku on paikallinen keskiyö (vertailu tehdään ms-tasolla samassa vyöhykkeessä)', () => {
    const k = AH.tmKausiAlku('2026', 'kalenteri');
    expect([k.getHours(), k.getMinutes(), k.getSeconds()]).toEqual([0, 0, 0]);
  });

  it('roskasyöte → null, ei NaN-päivämäärää', () => {
    expect(AH.tmKausiAlku('', 'kalenteri')).toBeNull();
    expect(AH.tmKausiAlku('ei-kausi', 'kalenteri')).toBeNull();
    expect(AH.tmKausiAlku(null, 'heina_kesa')).toBeNull();
  });
});

describe('(3) tmKausiLegacyAvaimet — vanha slash-muoto', () => {
  /* Kalenterivuosi 2026 osuu KAHTEEN vanhaan kauteen: tammi–kesä kuului kauteen 2025/26 ja
     heinä–joulu kauteen 2026/27. Molemmat on siis tarjottava, uusin ensin. */
  it('kalenterikausi kattaa kaksi vanhaa kautta, uusin ensin', () => {
    expect(AH.tmKausiLegacyAvaimet('2026', 'kalenteri')).toEqual(['2026/27', '2025/26']);
  });

  it('heinä–kesä vastaa yhtä vanhaa avainta', () => {
    expect(AH.tmKausiLegacyAvaimet('2026-27', 'heina_kesa')).toEqual(['2026/27']);
  });

  it('vuosisadan vaihde ei tuota yksinumeroista päätettä', () => {
    expect(AH.tmKausiLegacyAvaimet('2099', 'kalenteri')).toEqual(['2099/00', '2098/99']);
    expect(AH.tmKausiLegacyAvaimet('2100', 'kalenteri')).toEqual(['2100/01', '2099/00']);
  });

  it('roskasyöte → tyhjä lista', () => {
    expect(AH.tmKausiLegacyAvaimet('', 'kalenteri')).toEqual([]);
  });
});

describe('(4) tmTavoitteetKaudelle — data ei saa kadota avaimen vaihtuessa', () => {
  it('uusi avain voittaa legacyn', () => {
    const r = AH.tmTavoitteetKaudelle({ 2026: { a: 1 }, '2026/27': { a: 9 } }, '2026', 'kalenteri');
    expect(r).toEqual({ tavoitteet: { a: 1 }, avain: '2026', legacy: false });
  });

  it('ilman uutta avainta luetaan legacy — uusin ensin', () => {
    const r = AH.tmTavoitteetKaudelle({ '2025/26': { a: 5 }, '2026/27': { a: 9 } }, '2026', 'kalenteri');
    expect(r).toEqual({ tavoitteet: { a: 9 }, avain: '2026/27', legacy: true });
  });

  it('vain vanhin legacy löytyy → sitä käytetään ja se merkitään legacyksi', () => {
    const r = AH.tmTavoitteetKaudelle({ '2025/26': { a: 5 } }, '2026', 'kalenteri');
    expect(r.tavoitteet).toEqual({ a: 5 });
    expect(r.avain).toBe('2025/26');
    expect(r.legacy).toBe(true);
  });

  it('ei mitään → null, ja avain on UUSI kausi (kirjoitus menee sinne)', () => {
    const r = AH.tmTavoitteetKaudelle({}, '2026', 'kalenteri');
    expect(r).toEqual({ tavoitteet: null, avain: '2026', legacy: false });
    expect(AH.tmTavoitteetKaudelle(null, '2026', 'kalenteri').tavoitteet).toBeNull();
  });

  it('null-arvoinen avain ei kelpaa tavoitteiksi (tyhjennetty rivi)', () => {
    const r = AH.tmTavoitteetKaudelle({ 2026: null, '2026/27': { a: 9 } }, '2026', 'kalenteri');
    expect(r.avain).toBe('2026/27');
  });
});

/* ── 2. kerros · AJETTU todiste ───────────────────────────────────────────── */

function paluta(hteksti, tunniste) {
  const alku = hteksti.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let i = hteksti.indexOf('{', alku), syvyys = 0;
  for (let j = i; j < hteksti.length; j++) {
    if (hteksti[j] === '{') syvyys++;
    else if (hteksti[j] === '}') { syvyys--; if (!syvyys) return hteksti.slice(alku, j + 1); }
  }
  throw new Error('sulkeet eivät täsmää: ' + tunniste);
}

function ajaKaudenAlku(opts) {
  const o = opts || {};
  const sandbox = {
    console, Date, Math, JSON, String, Number, Object, Array, RegExp, parseInt, isNaN,
    _seura: o.seura || null,
    window: {},
  };
  if (o.lib !== false) sandbox.window.TM_ARVIOINTI_HISTORIA = AH;
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(paluta(VP, 'function _vpKaudenAlku()'), sandbox);
  vm.runInContext(paluta(VP, 'function _vpKaudenAlkuTeksti()'), sandbox);
  return { alku: sandbox._vpKaudenAlku(), teksti: sandbox._vpKaudenAlkuTeksti() };
}

describe('(5) _vpKaudenAlku johtaa kauden libistä, ei omasta laskennastaan', () => {
  it('suomalainen seura → 1.1. (PÄÄTÖS: kauden kertymä seuraa kautta)', () => {
    const r = ajaKaudenAlku({ seura: FI });
    expect([r.alku.getMonth(), r.alku.getDate()]).toEqual([0, 1]);
    expect(r.teksti).toBe('1.1.');
  });

  it('heinä–kesä-seura → 1.7. (sama koodi, eri kausimalli)', () => {
    const r = ajaKaudenAlku({ seura: HK });
    expect([r.alku.getMonth(), r.alku.getDate()]).toEqual([6, 1]);
    expect(r.teksti).toBe('1.7.');
  });

  it('ilman libiä graceful FI-oletus 1.1. (ei kaadu eikä palaa heinäkuuhun)', () => {
    const r = ajaKaudenAlku({ seura: FI, lib: false });
    expect([r.alku.getMonth(), r.alku.getDate()]).toEqual([0, 1]);
  });

  it('vihjeteksti ei saa olla kovakoodattu: se seuraa oikeaa alkupäivää', () => {
    expect(ajaKaudenAlku({ seura: FI }).teksti).not.toBe(ajaKaudenAlku({ seura: HK }).teksti);
  });
});

function ajaTkKausi(hteksti, tunnisteet, seura) {
  const sandbox = {
    console, Date, Math, JSON, String, Number, Object, Array, RegExp, parseInt, isNaN,
    _seura: seura || null,
    _adminTkData: { sjk: { seura: seura || null } },
    window: { TM_ARVIOINTI_HISTORIA: AH },
  };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  tunnisteet.forEach((tn) => vm.runInContext(paluta(hteksti, tn), sandbox));
  return sandbox;
}

describe('(6) VP, Admin ja Master kertovat SAMAN kauden', () => {
  it('kaikki kolme antavat saman arvon samalle seuralle', () => {
    const vp = ajaTkKausi(VP, ['function _vpKausimalli()', 'function _vpTkKausi()'], FI);
    const ad = ajaTkKausi(ADMIN, ['function _tkSeura(', 'function _tkKausimalli(', 'function _tkKausi('], FI);
    const ma = ajaTkKausi(MASTER, ['function _mkKausi()'], FI);
    const odotettu = String(new Date().getFullYear());
    expect(vp._vpTkKausi()).toBe(odotettu);
    expect(ad._tkKausi('sjk')).toBe(odotettu);
    expect(ma._mkKausi()).toBe(odotettu);
  });

  /* VP ja Admin kirjoittavat SAMAAN konfiguraatio/tavoitteet-dokumenttiin. Jos ne johtavat
     avaimen eri tavalla, toinen lukee rivin jota toinen ei kirjoita. */
  it('VP ja Admin käyttävät samaa avainta myös heinä–kesä-seuralle', () => {
    const vp = ajaTkKausi(VP, ['function _vpKausimalli()', 'function _vpTkKausi()'], HK);
    const ad = ajaTkKausi(ADMIN, ['function _tkSeura(', 'function _tkKausimalli(', 'function _tkKausi('], HK);
    expect(vp._vpTkKausi()).toBe(ad._tkKausi('sjk'));
    expect(vp._vpTkKausi()).toMatch(/^\d{4}-\d{2}$/);
  });

  it('Admin lukee kausimallin KOHDESEURASTA, ei yhdestä globaalista', () => {
    const ad = ajaTkKausi(ADMIN, ['function _tkSeura(', 'function _tkKausimalli(', 'function _tkKausi('], HK);
    expect(ad._tkKausi('sjk')).toMatch(/^\d{4}-\d{2}$/);      // välimuistista löytyvä seura
    expect(ad._tkKausi('tuntematon')).toBe(String(new Date().getFullYear()));   // tuntematon → FI
  });
});

describe('(7) kirjoitus menee vain uuteen avaimeen', () => {
  it('VP:n tallennus käyttää _vpTkKausi:a eikä koske legacy-avaimiin', () => {
    const f = paluta(VP, 'window._vpTallennaTavoitteet = async function()');
    expect(f).toContain('var kausi = _vpTkKausi()');
    expect(f).toContain('doc[kausi] = tav');
    expect(f).toContain("{ merge: true }");          // legacy-rivit säilyvät
    expect(f).not.toContain('tmKausiLegacyAvaimet');  // legacya ei kirjoiteta eikä poisteta
  });

  it('Adminin tallennus käyttää _tkKausi:a eikä koske legacy-avaimiin', () => {
    const f = paluta(ADMIN, 'async function _tallennaTavoitteet(seuraId)');
    expect(f).toContain('_tkKausi(seuraId)');
    expect(f).toContain('doc[kausi] = tav');
    expect(f).toContain('{ merge: true }');
    expect(f).not.toContain('tmKausiLegacyAvaimet');
  });

  /* Adminin legacy-luku johtaa avainlistan KAUSIMALLISTA: kalenterikaudelle kaksi avainta,
     heinä–kesälle yksi. Jos kausimalli jää lukematta, HK-seuran kausi '2026-27' ei vastaa
     kalenterimallin legacy-kaavaa lainkaan → tavoitteet katoaisivat hiljaa näkyvistä. */
  it('Admin löytää legacy-tavoitteet myös heinä–kesä-seuralle', () => {
    const ad = ajaTkKausi(ADMIN, ['function _tkSeura(', 'function _tkKausimalli(', 'function _tkKausi(',
      'function _tkTavoitteet('], HK);
    const kausi = ad._tkKausi('sjk');                          // esim. '2026-27'
    const vanha = AH.tmKausiLegacyAvaimet(kausi, 'heina_kesa')[0];
    const doc = {}; doc[vanha] = { taso3_pct: { tavoite: 60 } };
    const r = ad._tkTavoitteet(doc, 'sjk');
    expect(r.tavoitteet, 'legacy-tavoitteet katosivat').toEqual({ taso3_pct: { tavoite: 60 } });
    expect(r.avain).toBe(vanha);
    expect(r.legacy).toBe(true);
  });

  it('Admin löytää legacy-tavoitteet kalenteriseuralle (kaksi mahdollista avainta)', () => {
    const ad = ajaTkKausi(ADMIN, ['function _tkSeura(', 'function _tkKausimalli(', 'function _tkKausi(',
      'function _tkTavoitteet('], FI);
    const vanhat = AH.tmKausiLegacyAvaimet(ad._tkKausi('sjk'), 'kalenteri');
    expect(vanhat.length).toBe(2);
    vanhat.forEach((avain) => {
      const doc = {}; doc[avain] = { a: 1 };
      expect(ad._tkTavoitteet(doc, 'sjk').avain, avain + ' ei kelvannut').toBe(avain);
    });
  });

  it('LUKU sen sijaan hyväksyy legacyn molemmissa', () => {
    expect(VP).toContain('AH.tmTavoitteetKaudelle(d, _vpTkKausi(), _vpKausimalli())');
    expect(ADMIN).toContain('AH.tmTavoitteetKaudelle(d, _tkKausi(x), _tkKausimalli(x))');
  });
});

/* ── 3. kerros · repovartija ──────────────────────────────────────────────── */

describe('(8) kovakoodattu kausilaskenta ei saa palata', () => {
  /* tm_idp.js:n `getMonth() >= 6` on PUOLIVUOTISJAKSO (kevät/syksy), ei kausi — se on
     johdonmukainen tmAhJakso:n kanssa ja jää tietoisesti ennalleen. */
  const SALLITUT = ['lib/tm_idp.js'];
  const TIEDOSTOT = ['TalentMaster_VP_v25.html', 'TalentMaster_Admin.html', 'TalentMaster_Master_v16.html',
    'TalentMaster_Seura.html', 'lib/tm_idp.js'];

  it('yksikään näkymä ei laske kautta kuukausirajasta', () => {
    const osumat = [];
    TIEDOSTOT.forEach((f) => {
      if (SALLITUT.indexOf(f) >= 0) return;
      const s = readFileSync(join(juuri, f), 'utf8');
      s.split('\n').forEach((rivi, i) => {
        if (/getMonth\(\)\s*>=\s*6/.test(rivi)) osumat.push(f + ':' + (i + 1) + ' ' + rivi.trim().slice(0, 90));
      });
    });
    expect(osumat, 'kausi johdetaan lib-funktiosta, ei kuukausirajasta').toEqual([]);
  });

  it('EI VACUOUS: sallittu poikkeus on yhä olemassa ja on JAKSO, ei kausi', () => {
    const idp = readFileSync(join(juuri, 'lib/tm_idp.js'), 'utf8');
    expect(idp).toMatch(/getMonth\(\)\s*>=\s*6/);
    expect(idp).toContain("'syksy '");          // puolivuotisjakso, ei kausiavain
  });

  it('lib ja functions-kopio ovat yhä identtiset (deploy pakkaa vain functions/)', () => {
    const a = readFileSync(join(juuri, 'lib/tm_arviointi_historia.js'), 'utf8');
    const b = readFileSync(join(juuri, 'functions/tm_arviointi_historia.js'), 'utf8');
    expect(b).toBe(a);
  });

  it('Admin ja Master lataavat kausikirjaston (muuten funktiot putoaisivat varapolulle)', () => {
    expect(ADMIN).toMatch(/<script src="lib\/tm_arviointi_historia\.js/);
    expect(MASTER).toMatch(/<script src="lib\/tm_arviointi_historia\.js/);
  });
});
