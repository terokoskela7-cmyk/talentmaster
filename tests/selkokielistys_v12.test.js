/**
 * TalentMaster™ — SELKOKIELISTYS V1.2 · portti.
 *
 * Kaksi ammattitermiä pois käyttäjäpinnalta:
 *   A) "FLEI" → "Kehon valmius" (§37 julkinen termi). FLEI jää VAIN sisäiseksi:
 *      enum-kentät (p.flei_*), CSS-luokat (.flei-*), muuttujat, kommentit.
 *   B) Myersin Anatomy Trains -lyhenteet (SBL/SFL/LL/DIAG/DFL/SPL) → ketjunimet libistä.
 *   C) Pelaajapinnalla nimi + "mitä ja miksi" lapsen kielellä (§7.22), YHDESTÄ lähteestä.
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
const MASTER = readFileSync(join(ROOT, 'TalentMaster_Master_v16.html'), 'utf8');
const PELAAJA = readFileSync(join(ROOT, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const P = require_(join(ROOT, 'lib', 'tm_piirros.js'));
const SV = require_(join(ROOT, 'lib', 'tm_vp_i18n.js')).TM_VP_I18N.sv;

// Käännösfunktion argumentit = käyttäjälle näkyvä teksti.
const naytettavat = (src, fn) => {
  const out = [];
  const re = new RegExp(fn + "\\('((?:[^'\\\\]|\\\\.)*)'\\)", 'g');
  for (const m of src.matchAll(re)) out.push(m[1]);
  return out;
};

describe('A — "FLEI" ei näy käyttäjälle (mutta säilyy sisäisenä)', () => {
  it('VP: yksikään vpT-merkkijono ei sisällä sanaa FLEI', () => {
    expect(naytettavat(VP, 'vpT').filter((s) => /FLEI/i.test(s))).toEqual([]);
  });
  it('Master: yksikään masterT-merkkijono ei sisällä sanaa FLEI', () => {
    expect(naytettavat(MASTER, 'masterT').filter((s) => /FLEI/i.test(s))).toEqual([]);
  });
  it('Pelaaja: FLEI esiintyy VAIN kommenteissa ja tunnisteissa — ei näyttötekstiä', () => {
    // Pelaaja_v7:n i18n on avainpolkupohjainen (t('pelaaja.x')), joten "näkyvää tekstiä" ei voi
    // tunnistaa käännösfunktion argumentista kuten VP:ssä. Riisutaan siksi KOMMENTIT pois
    // (<!-- -->, /* */, //) ja vaaditaan että jäljelle jäävät osumat ovat tunnisteita.
    const ilmanKommentteja = PELAAJA
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    const jaljella = (ilmanKommentteja.match(/.{0,40}FLEI.{0,40}/g) || [])
      .filter((x) => !/rMinaFLEI|flei_[a-z]/.test(x));
    expect(jaljella).toEqual([]);
  });

  it('TM_TESTI_OHJEET-sisältökartassa ei näkyvää FLEI:tä', () => {
    const lo = VP.indexOf('window.TM_TESTI_OHJEET = {');
    const hi = VP.indexOf('\n};', lo);
    expect(lo).toBeGreaterThan(0);
    expect(VP.slice(lo, hi)).not.toMatch(/FLEI/);
  });
  it('SISÄINEN FLEI säilyy: pikakentät p.flei_* ja CSS-luokat .flei-* ennallaan', () => {
    expect(VP).toContain('p.flei_viimeisin');
    expect(VP).toContain('.flei-ketju-nimi');
    expect(VP).toContain('class="flei-kortti');
    expect(PELAAJA).toContain('flei_viimeisin');
  });
  it('uusille teksteille on sv-rivi', () => {
    for (const k of ['Kehon valmius -prioriteetti — fysiikkajakso', '⚠ Kehon valmius -prioriteetti:',
                     'kehon valmius', 'ei kehon valmius -dataa', 'Ei kehon valmius -dataa.', 'Valmiusjakauma']) {
      expect(typeof SV[k], k).toBe('string');
    }
  });
});

describe('B — fascialyhenne ei näy käyttäjälle; nimi tulee libistä', () => {
  const LYHENTEET = ['SBL', 'SFL', 'DIAG', 'DFL', 'SPL'];   // 'LL' on liian yleinen substringiksi → katetaan kohdistetusti

  it('profiilipalkin label renderöi NIMEN (_fleiKetjuNimi), ei koodia k[0]', () => {
    expect(VP).toContain("'<span class=\"flei-ketju-nimi\">' + _jsvEsc(_fleiKetjuNimi(k[2], k[0])) + '</span>'");
    expect(VP).not.toContain("'<span class=\"flei-ketju-nimi\">' + k[0] + '</span>'");
  });
  it('"Heikoin ketju" renderöi NIMEN, ei koodia', () => {
    expect(VP).toContain("_jsvEsc(_fleiKetjuNimi(heikoin[2], heikoin[0]))");
    expect(VP).not.toContain("_jsvEsc(heikoin[0])");
  });
  it('_fleiKetjuNimi hakee nimen kaanonilibistä ja reitittää vpT:n läpi', () => {
    expect(VP).toContain('function _fleiKetjuNimi(avain, fallbackKoodi)');
    expect(VP).toContain('tmFasciaKetju(avain)');
    expect(VP).toContain('return vpT(k.nimi);');
  });
  it('ⓘ-tooltip luettelee ketjut NIMILLÄ, ei lyhenteillä', () => {
    const lo = VP.indexOf("flei: { otsikko:");
    const rivi = VP.slice(lo, VP.indexOf('\n', lo));
    for (const l of LYHENTEET) expect(rivi, l).not.toContain(l);
    for (const n of ['Vauhtiketju', 'Lähtöketju', 'Sivuketju', 'Diagonaaliketju', 'Hallintaketju']) {
      expect(rivi, n).toContain(n);
    }
    expect(typeof SV[rivi.match(/mita: '((?:[^'\\]|\\.)*)'/)[1]]).toBe('string');   // sv-rivi olemassa
  });
  it('lib-caption piilottaa lyhenteen oletuksena (koodi:false)', () => {
    for (const a of P.tmFasciaAvaimet()) {
      expect(P.tmFasciaKuva(a), a).not.toContain('tmp-koodi');
    }
  });
  it('layout: label on mitoitettu NIMELLE, ei 3-merkkiselle koodille', () => {
    const lo = VP.indexOf('.flei-ketju-nimi {');
    const css = VP.slice(lo, VP.indexOf('}', lo));
    expect(css).not.toMatch(/width:\s*36px/);
    const leveys = css.match(/flex:\s*0\s+0\s+(\d+)px/);
    expect(leveys).toBeTruthy();
    expect(Number(leveys[1])).toBeGreaterThanOrEqual(90);   // "Diagonaaliketju" mahtuu
    expect(VP).toContain('@media (max-width: 420px) { .flei-ketju-nimi');
  });
  it('ketjunimille on sv-käännös (glossaari lukitusta kartasta)', () => {
    for (const k of P.TM_FASCIA) expect(typeof SV[k.nimi], k.nimi).toBe('string');
  });
});

describe('C — pelaajapinta: nimi + miksi, yhdestä lähteestä (§7.22)', () => {
  it('lib tarjoaa nimen JA miksin kaikille viidelle ketjulle', () => {
    expect(P.tmFasciaPelaajaAvaimet()).toEqual(P.tmFasciaAvaimet());
    for (const a of P.tmFasciaPelaajaAvaimet()) {
      const m = P.tmFasciaPelaaja(a);
      expect(m, a).toBeTruthy();
      expect(m.nimi.length, a).toBeGreaterThan(3);
      expect(m.miksi.length, a).toBeGreaterThan(20);
      expect(m.miksi, a).toMatch(/[.!?]$/);
    }
  });
  it('pelaajanimet ovat TARKOITUKSELLA eri kuin kaanon (ei yhtenäistetä)', () => {
    const kaanon = Object.fromEntries(P.TM_FASCIA.map((k) => [k.avain, k.nimi]));
    expect(P.tmFasciaPelaaja('sfl').nimi).toBe('Etuketju');
    expect(kaanon.sfl).toBe('Lähtöketju');
    expect(P.tmFasciaPelaaja('diag').nimi).toBe('Kiertoketju');
    expect(kaanon.diag).toBe('Diagonaaliketju');
    expect(P.tmFasciaPelaaja('dfl').nimi).toBe('Syvyysketju');
    expect(kaanon.dfl).toBe('Hallintaketju');
    expect(P.tmFasciaPelaaja('sbl').nimi).toBe(kaanon.sbl);   // Vauhtiketju on sama molemmissa
  });
  it('Pelaaja_v7 rakentaa ketjut LIBISTÄ (yksi lähde) — ei omaa kovakoodattua taulukkoa', () => {
    expect(PELAAJA).toContain('tmFasciaPelaajaAvaimet()');
    expect(PELAAJA).toContain('tmFasciaPelaaja(a)');
    expect(PELAAJA).not.toMatch(/\{nimi:'Vauhtiketju',\s*koodi:'SBL'/);   // vanha kovakoodattu lista poistettu
  });
  it('sekä ketjurivi että "heikoin ketju" lukevat samasta lähteestä (eivät voi erota)', () => {
    expect(PELAAJA).toContain('${c.miksi}');
    expect(PELAAJA).toContain('${heikoin.nimi}</strong> — ${heikoin.miksi}');
  });
  it('§7.22: "miksi"-teksteissä ei lukuja, tasoja eikä vertailua', () => {
    for (const a of P.tmFasciaPelaajaAvaimet()) {
      const t = P.tmFasciaPelaaja(a).miksi;
      expect(t, a).not.toMatch(/\d/);
      expect(t, a).not.toMatch(/taso|parempi|huonompi|verrattuna|sijoitus|pisteet/i);
    }
  });
});

describe('EI-TYHJYYS — portti tunnistaa paluun vanhaan', () => {
  it('jos palkkilabel palautetaan koodiksi, B-testi punertaa', () => {
    const mutatoitu = VP.replace("_jsvEsc(_fleiKetjuNimi(k[2], k[0]))", "k[0]");
    expect(mutatoitu).not.toBe(VP);
    expect(mutatoitu).toContain("'<span class=\"flei-ketju-nimi\">' + k[0] + '</span>'");   // ← mitä B-testi kieltää
  });
  it('jos yhden ketjun "miksi" poistetaan, C-testi punertaa', () => {
    const ilman = { ...P.TM_FASCIA_PELAAJA, ll: { nimi: 'Sivuketju', miksi: '' } };
    expect(ilman.ll.miksi.length).toBe(0);   // C-testi vaatii > 20
  });
  it('jos vpT-merkkijonoon palautetaan FLEI, A-testi punertaa', () => {
    const mutatoitu = VP.replace("vpT('Valmiusjakauma')", "vpT('Valmiusjakauma (FLEI)')");
    expect(naytettavat(mutatoitu, 'vpT').filter((s) => /FLEI/i.test(s))).toEqual(['Valmiusjakauma (FLEI)']);
  });
});
