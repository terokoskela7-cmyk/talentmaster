#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════════════════════
   i18n_curriculum.cjs — teknis-taktisen curriculumin KÄÄNNÖSPUTKI (irrotus · merge · round-trip).

   Miksi: lib/tm_teknistaktiset.js:n proosa (konseptinimet · pelitilanteet · cue-tekstit · kysymykset ·
   harjoitesisältö) on liian iso reititettäväksi vpT-avaimina. Putki irrottaa sen avaimelliseksi JSON:ksi
   (käännettäväksi ulkoisesti) ja yhdistää käännöksen takaisin libiin RINNAKKAISINA _sv-kenttinä.

   ⚠ LIB ON GENEROITU (`docs/data/parse_oma_versio.py`, "ÄLÄ MUOKKAA KÄSIN"). Inline-merge (_sv-kentät
   tiedostoon) TOIMII, mutta seuraava parseriajo pyyhkii käännöksen. Siksi `yhdista --sidecar` kirjoittaa
   sen sijaan erillisen `lib/tm_teknistaktiset_sv.js`:n (avain→sv, sama avainskeema) joka SÄILYY
   regeneroinnin yli — sama kuvio kuin tm_vp_i18n/HARJOITE_I18N. Suositus: sidecar.

   INVARIANTIT
     1. Lib pysyy kielineutraalina datana: merge VAIN LISÄÄ kenttiä (nimi_sv, kysymykset_sv, …).
        fi-arvoja ei korvata koskaan. Kielivalinta tehdään renderissä (oma erä), ei täällä.
     2. Avain on deterministinen ja rekonstruoitava: '<avain>.<kenttä>' · '<avain>.kpi.<koodi>.teksti'
        · '<avain>.kysymys.<i>' · 'harjoite.<koodi>…' · 'pelipaikka.<koodi>.nimi' · 'asteikko.taso.<n>'.
     3. Häviöttömyys todistetaan: irrota → merge samoilla arvoilla → jokainen arvo päätyy TÄSMÄLLEEN
        oikeaan kenttään ja fi-sisältö on bitilleen ennallaan (komento `tarkista`, testi round-trip).
     4. Puuttuva/tyhjä/fi:n kanssa identtinen sv → OHITETAAN (ei kirjoiteta). Siksi fi-arvoilla täytetty
        irrotustiedosto on merge-no-op: kääntämätön kenttä ei tuota _sv-kenttää eikä valheellista käännöstä.

   KÄYTTÖ
     node scripts/i18n_curriculum.cjs irrota   [--out=docs/i18n/curriculum_kaannettava.sv.json] [--osiot=a,b]
     node scripts/i18n_curriculum.cjs yhdista  <sv.json> [--apply] [--sidecar] [--pakota]   (oletus = kuivaajo)
     node scripts/i18n_curriculum.cjs tarkista                                     (round-trip fi→fi)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const JUURI = path.join(__dirname, '..');
const LIB = path.join(JUURI, 'lib', 'tm_teknistaktiset.js');
const OLETUS_OUT = path.join(JUURI, 'docs', 'i18n', 'curriculum_kaannettava.sv.json');

/* ── Skeema: mitä käännetään. Kaikki muu (avain/koodi/dim/faasi/ryhma/pelimuoto/ika/jatkuu/
   kpi[].koodi/yksilo/pelipaikat/numerot/max) on dataa tai enum → EI käännetä. ── */
const TEKSTIKENTAT = ['nimi', 'pelitilanne', 'painotus', 'pelaaja_miksi', 'konseptipeli', 'teema', 'painopisteet', 'pelipaikka'];
const OSIOT = {
  // konseptilistat: avain on globaalisti uniikki (109 konseptia) → avainetuliitettä ei tarvita
  youth: { muuttuja: 'TM_TT_YOUTH', muoto: 'konseptilista' },
  fundamentit: { muuttuja: 'TM_TT_FUNDAMENTIT', muoto: 'konseptiryhmat' },   // { MV:[…], LP:[…] }
  joukkue: { muuttuja: 'TM_TT_JOUKKUE', muoto: 'konseptilista' },
  harjoitteet: { muuttuja: 'TM_TT_HARJOITTEET', muoto: 'harjoitekartta', etuliite: 'harjoite' },
  pelipaikat: { muuttuja: 'TM_TT_PELIPAIKAT', muoto: 'nimikartta', etuliite: 'pelipaikka' },
  asteikko: { muuttuja: 'TM_TT_ASTEIKKO', muoto: 'asteikko', etuliite: 'asteikko' }
};
const OSIO_JARJESTYS = Object.keys(OSIOT);

/* ══ 1. IRROTUS — ajetaan ladatusta modulista (ei lähdetekstistä) ══════════════════════════ */
// Kerää { avain → fi } + kenttäjakauma. Palauttaa myös osioittaiset määrät raportointia varten.
function irrota(osiot) {
  const T = ladaaLib();
  const ulos = {};
  const jakauma = {};
  const osioMaarat = {};
  const lisaa = (avain, arvo, kenttaTyyppi) => {
    if (typeof arvo !== 'string' || !arvo.trim()) return;            // vain ei-tyhjät
    if (Object.prototype.hasOwnProperty.call(ulos, avain)) throw new Error('Avaintörmäys: ' + avain);
    ulos[avain] = arvo;
    jakauma[kenttaTyyppi] = (jakauma[kenttaTyyppi] || 0) + 1;
  };
  const konsepti = (k) => {
    TEKSTIKENTAT.forEach((f) => { if (typeof k[f] === 'string') lisaa(k.avain + '.' + f, k[f], f); });
    (k.kpi || []).forEach((c) => { if (c && typeof c.teksti === 'string') lisaa(k.avain + '.kpi.' + c.koodi + '.teksti', c.teksti, 'kpi'); });
    (k.kysymykset || []).forEach((q, i) => lisaa(k.avain + '.kysymys.' + i, q, 'kysymys'));
  };

  (osiot || OSIO_JARJESTYS).forEach((nimi) => {
    const o = OSIOT[nimi];
    if (!o) throw new Error('Tuntematon osio: ' + nimi);
    const ennen = Object.keys(ulos).length;
    const data = T[o.muuttuja];
    if (o.muoto === 'konseptilista') data.forEach(konsepti);
    else if (o.muoto === 'konseptiryhmat') Object.keys(data).forEach((ryhma) => data[ryhma].forEach(konsepti));
    else if (o.muoto === 'harjoitekartta') {
      Object.keys(data).forEach((koodi) => {
        const v = data[koodi];
        if (Array.isArray(v)) {
          v.forEach((it, i) => TEKSTIKENTAT.forEach((f) => {
            if (typeof it[f] === 'string') lisaa(o.etuliite + '.' + koodi + '.' + i + '.' + f, it[f], f);
          }));
        } else if (v && typeof v === 'object') {
          TEKSTIKENTAT.forEach((f) => { if (typeof v[f] === 'string') lisaa(o.etuliite + '.' + koodi + '.' + f, v[f], f); });
        }
      });
    } else if (o.muoto === 'nimikartta') {
      Object.keys(data).forEach((koodi) => { if (data[koodi] && typeof data[koodi].nimi === 'string') lisaa(o.etuliite + '.' + koodi + '.nimi', data[koodi].nimi, 'nimi'); });
    } else if (o.muoto === 'asteikko') {
      Object.keys(data.tasot || {}).forEach((n) => lisaa(o.etuliite + '.taso.' + n, data.tasot[n], 'asteikko'));
    }
    osioMaarat[nimi] = Object.keys(ulos).length - ennen;
  });
  return { avaimet: ulos, jakauma: jakauma, osiot: osioMaarat };
}

function ladaaLib(polku) {
  const p = polku || LIB;
  delete require.cache[require.resolve(p)];
  return require(p);
}

/* ══ 2. MERGE — AST-pohjainen lisäys lähdetiedostoon (offsetit, ei regexiä) ════════════════ */
// Kerää käännettävien kenttien Property-solmut samalla avainskeemalla kuin irrota().
// Palauttaa [{ avain, tyyppi:'string'|'lista'|'asteikko', node, nimi }] — node = lisäyksen ankkuri.
function keraaAnkkurit(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest' });
  const muuttujat = {};
  ast.body.forEach((n) => {
    if (n.type !== 'VariableDeclaration') return;
    n.declarations.forEach((d) => { if (d.id && d.id.name && d.init) muuttujat[d.id.name] = d.init; });
  });
  const ank = [];
  const prop = (obj, nimi) => (obj.properties || []).find((p) => !p.computed && p.key && (p.key.name === nimi || p.key.value === nimi));
  const arvoStr = (p) => (p && p.value && p.value.type === 'Literal' && typeof p.value.value === 'string') ? p.value.value : null;

  const konsepti = (objNode) => {
    const avainP = prop(objNode, 'avain');
    const avain = arvoStr(avainP);
    if (!avain) return;
    TEKSTIKENTAT.forEach((f) => {
      const p = prop(objNode, f);
      if (arvoStr(p) != null) ank.push({ avain: avain + '.' + f, tyyppi: 'string', node: p, nimi: f });
    });
    const kpi = prop(objNode, 'kpi');
    if (kpi && kpi.value.type === 'ArrayExpression') {
      kpi.value.elements.forEach((el) => {
        if (!el || el.type !== 'ObjectExpression') return;
        const koodi = arvoStr(prop(el, 'koodi'));
        const tek = prop(el, 'teksti');
        if (koodi && arvoStr(tek) != null) ank.push({ avain: avain + '.kpi.' + koodi + '.teksti', tyyppi: 'string', node: tek, nimi: 'teksti' });
      });
    }
    const kys = prop(objNode, 'kysymykset');
    if (kys && kys.value.type === 'ArrayExpression' && kys.value.elements.length) {
      ank.push({
        avain: avain + '.kysymys', tyyppi: 'lista', node: kys, nimi: 'kysymykset',
        alkiot: kys.value.elements.map((e, i) => ({ avain: avain + '.kysymys.' + i, fi: (e && e.type === 'Literal') ? e.value : null }))
      });
    }
  };

  OSIO_JARJESTYS.forEach((osioNimi) => {
    const o = OSIOT[osioNimi];
    const init = muuttujat[o.muuttuja];
    if (!init) return;
    if (o.muoto === 'konseptilista') init.elements.forEach((el) => { if (el && el.type === 'ObjectExpression') konsepti(el); });
    else if (o.muoto === 'konseptiryhmat') (init.properties || []).forEach((rp) => {
      if (rp.value.type === 'ArrayExpression') rp.value.elements.forEach((el) => { if (el && el.type === 'ObjectExpression') konsepti(el); });
    });
    else if (o.muoto === 'harjoitekartta') (init.properties || []).forEach((hp) => {
      const koodi = hp.key.value != null ? hp.key.value : hp.key.name;
      if (hp.value.type === 'ArrayExpression') {
        hp.value.elements.forEach((el, i) => {
          if (!el || el.type !== 'ObjectExpression') return;
          TEKSTIKENTAT.forEach((f) => {
            const p = prop(el, f);
            if (arvoStr(p) != null) ank.push({ avain: o.etuliite + '.' + koodi + '.' + i + '.' + f, tyyppi: 'string', node: p, nimi: f });
          });
        });
      } else if (hp.value.type === 'ObjectExpression') {
        TEKSTIKENTAT.forEach((f) => {
          const p = prop(hp.value, f);
          if (arvoStr(p) != null) ank.push({ avain: o.etuliite + '.' + koodi + '.' + f, tyyppi: 'string', node: p, nimi: f });
        });
      }
    });
    else if (o.muoto === 'nimikartta') (init.properties || []).forEach((pp) => {
      const koodi = pp.key.value != null ? pp.key.value : pp.key.name;
      const p = prop(pp.value, 'nimi');
      if (arvoStr(p) != null) ank.push({ avain: o.etuliite + '.' + koodi + '.nimi', tyyppi: 'string', node: p, nimi: 'nimi' });
    });
    else if (o.muoto === 'asteikko') {
      const tasot = prop(init, 'tasot');
      if (tasot && tasot.value.type === 'ObjectExpression') {
        ank.push({
          avain: o.etuliite + '.taso', tyyppi: 'asteikko', node: tasot, nimi: 'tasot',
          alkiot: tasot.value.properties.map((p) => ({ avain: o.etuliite + '.taso.' + (p.key.value != null ? p.key.value : p.key.name), nro: (p.key.value != null ? p.key.value : p.key.name), fi: p.value.value }))
        });
      }
    }
  });
  return ank;
}

// sv-arvo kelpaa vain jos se on ei-tyhjä merkkijono JA eri kuin fi (muuten: kääntämätön → ohita).
function svKelpaa(sv, fi, pakota) {
  if (typeof sv !== 'string' || !sv.trim()) return false;
  return pakota ? true : sv !== fi;
}

// Yhdistä sv-kartta lähdetekstiin. Palauttaa { src, lisatyt, ohitetut, tuntemattomat, kentat }.
function yhdista(src, svKartta, opts) {
  opts = opts || {};
  const ank = keraaAnkkurit(src);
  const tunnetut = new Set();
  const lisaykset = [];
  let lisatyt = 0, ohitetut = 0;

  ank.forEach((a) => {
    if (a.tyyppi === 'string') {
      tunnetut.add(a.avain);
      const fi = a.node.value.value;
      const sv = svKartta[a.avain];
      if (!svKelpaa(sv, fi, opts.pakota)) { if (sv !== undefined) ohitetut++; return; }
      if (a.node.value.end == null) return;
      lisaykset.push({ pos: a.node.end, teksti: ', ' + JSON.stringify(a.nimi + '_sv') + ': ' + JSON.stringify(sv) });
      lisatyt++;
    } else if (a.tyyppi === 'lista' || a.tyyppi === 'asteikko') {
      a.alkiot.forEach((x) => tunnetut.add(x.avain));
      const kaannetyt = a.alkiot.filter((x) => svKelpaa(svKartta[x.avain], x.fi, opts.pakota));
      if (!kaannetyt.length) { if (a.alkiot.some((x) => svKartta[x.avain] !== undefined)) ohitetut += a.alkiot.length; return; }
      // Osittain käännetty lista: kääntämätön alkio saa fi:n (paikkojen on vastattava indeksiltä).
      let teksti;
      if (a.tyyppi === 'lista') {
        teksti = ', ' + JSON.stringify(a.nimi + '_sv') + ': [' + a.alkiot.map((x) => JSON.stringify(svKelpaa(svKartta[x.avain], x.fi, opts.pakota) ? svKartta[x.avain] : x.fi)).join(', ') + ']';
      } else {
        teksti = ', ' + JSON.stringify(a.nimi + '_sv') + ': { ' + a.alkiot.map((x) => JSON.stringify(String(x.nro)) + ': ' + JSON.stringify(svKelpaa(svKartta[x.avain], x.fi, opts.pakota) ? svKartta[x.avain] : x.fi)).join(', ') + ' }';
      }
      lisaykset.push({ pos: a.node.end, teksti: teksti });
      lisatyt += kaannetyt.length;
    }
  });

  const tuntemattomat = Object.keys(svKartta).filter((k) => !tunnetut.has(k));
  // Lisäykset lopusta alkuun → aiemmat offsetit pysyvät voimassa.
  lisaykset.sort((a, b) => b.pos - a.pos);
  let ulos = src;
  lisaykset.forEach((l) => { ulos = ulos.slice(0, l.pos) + l.teksti + ulos.slice(l.pos); });
  return { src: ulos, lisatyt: lisatyt, ohitetut: ohitetut, tuntemattomat: tuntemattomat, kentat: tunnetut.size };
}

/* ══ 3. ROUND-TRIP — todistaa että avainskeema osuu takaisin täsmälleen oikeisiin kenttiin ══ */
// irrota → yhdistä SAMAT fi-arvot _sv-kenttiin (--pakota) → lataa tulos → jokaisen avaimen _sv === fi
// JA fi-sisältö ennallaan. Jos tämä ei mene läpi, putki on rikki eikä käännöstä saa ajaa.
function roundTrip() {
  const src = fs.readFileSync(LIB, 'utf8');
  const { avaimet } = irrota();
  const tulos = yhdista(src, avaimet, { pakota: true });
  const tmp = path.join(require('os').tmpdir(), 'tm_teknistaktiset_roundtrip_' + process.pid + '.js');
  fs.writeFileSync(tmp, tulos.src);
  let ero = [];
  try {
    const A = ladaaLib(LIB), B = ladaaLib(tmp);
    // (a) fi-sisältö bitilleen ennallaan
    OSIO_JARJESTYS.forEach((o) => {
      const m = OSIOT[o].muuttuja;
      if (JSON.stringify(riisuSv(B[m])) !== JSON.stringify(A[m])) ero.push('fi-sisältö muuttui: ' + m);
    });
    // (b) jokainen irrotettu avain löytyy _sv-kentästä samasta paikasta, sama arvo
    const svArvot = lueSvArvot(B);
    Object.keys(avaimet).forEach((k) => {
      if (!(k in svArvot)) ero.push('avain ei osunut takaisin: ' + k);
      else if (svArvot[k] !== avaimet[k]) ero.push('arvo muuttui: ' + k);
    });
    Object.keys(svArvot).forEach((k) => { if (!(k in avaimet)) ero.push('ylimääräinen _sv-kenttä: ' + k); });
  } finally { fs.unlinkSync(tmp); }
  return { ok: ero.length === 0, avaimia: Object.keys(avaimet).length, ero: ero.slice(0, 20), lisatyt: tulos.lisatyt };
}

// Poista kaikki *_sv-kentät (syvä) → vertailu alkuperäiseen fi-dataan.
function riisuSv(o) {
  if (Array.isArray(o)) return o.map(riisuSv);
  if (o && typeof o === 'object') {
    const ulos = {};
    Object.keys(o).forEach((k) => { if (!/_sv$/.test(k)) ulos[k] = riisuSv(o[k]); });
    return ulos;
  }
  return o;
}

// Lue _sv-kentät takaisin samalla avainskeemalla (peilikuva irrota():lle).
function lueSvArvot(T) {
  const ulos = {};
  const konsepti = (k) => {
    TEKSTIKENTAT.forEach((f) => { if (typeof k[f + '_sv'] === 'string') ulos[k.avain + '.' + f] = k[f + '_sv']; });
    (k.kpi || []).forEach((c) => { if (typeof c.teksti_sv === 'string') ulos[k.avain + '.kpi.' + c.koodi + '.teksti'] = c.teksti_sv; });
    (k.kysymykset_sv || []).forEach((q, i) => { ulos[k.avain + '.kysymys.' + i] = q; });
  };
  T.TM_TT_YOUTH.forEach(konsepti);
  Object.keys(T.TM_TT_FUNDAMENTIT).forEach((r) => T.TM_TT_FUNDAMENTIT[r].forEach(konsepti));
  T.TM_TT_JOUKKUE.forEach(konsepti);
  Object.keys(T.TM_TT_HARJOITTEET).forEach((koodi) => {
    const v = T.TM_TT_HARJOITTEET[koodi];
    if (Array.isArray(v)) v.forEach((it, i) => TEKSTIKENTAT.forEach((f) => { if (typeof it[f + '_sv'] === 'string') ulos['harjoite.' + koodi + '.' + i + '.' + f] = it[f + '_sv']; }));
    else if (v && typeof v === 'object') TEKSTIKENTAT.forEach((f) => { if (typeof v[f + '_sv'] === 'string') ulos['harjoite.' + koodi + '.' + f] = v[f + '_sv']; });
  });
  Object.keys(T.TM_TT_PELIPAIKAT).forEach((k) => { if (typeof T.TM_TT_PELIPAIKAT[k].nimi_sv === 'string') ulos['pelipaikka.' + k + '.nimi'] = T.TM_TT_PELIPAIKAT[k].nimi_sv; });
  if (T.TM_TT_ASTEIKKO.tasot_sv) Object.keys(T.TM_TT_ASTEIKKO.tasot_sv).forEach((n) => { ulos['asteikko.taso.' + n] = T.TM_TT_ASTEIKKO.tasot_sv[n]; });
  return ulos;
}

/* ══ 4. SIDECAR — regeneroinnin kestävä vaihtoehto inline-mergelle ════════════════════════ */
// Kirjoittaa lib/tm_teknistaktiset_sv.js:n: litteä { avain → sv } samalla avainskeemalla. Renderin
// (oma erä) resolvi: TM_TT_SV[avain] → fallback fi. Generoitu curriculum-tiedosto pysyy koskemattomana.
function sidecarSisalto(svKartta, fiKartta, opts) {
  opts = opts || {};
  const kaannetyt = {};
  Object.keys(fiKartta).forEach((k) => { if (svKelpaa(svKartta[k], fiKartta[k], opts.pakota)) kaannetyt[k] = svKartta[k]; });
  const rivit = Object.keys(kaannetyt).sort().map((k) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(kaannetyt[k]) + ',');
  if (rivit.length) rivit[rivit.length - 1] = rivit[rivit.length - 1].replace(/,$/, '');
  return [
    '/* tm_teknistaktiset_sv.js — GENEROITU (scripts/i18n_curriculum.cjs yhdista --sidecar). ÄLÄ MUOKKAA KÄSIN.',
    '   Teknis-taktisen curriculumin sv-käännökset. Avain = sama skeema kuin docs/i18n/curriculum_kaannettava.sv.json:',
    "   '<avain>.<kenttä>' · '<avain>.kpi.<koodi>.teksti' · '<avain>.kysymys.<i>' · 'harjoite.<koodi>…' ·",
    "   'pelipaikka.<koodi>.nimi' · 'asteikko.taso.<n>'. Puuttuva avain → fi (render tekee fallbackin).",
    '   Erillinen tiedosto koska lib/tm_teknistaktiset.js on GENEROITU (parse_oma_versio.py) — sv säilyy regeneroinnin yli. */',
    'var TM_TT_SV = {',
    rivit.join('\n'),
    '};',
    "if (typeof module !== 'undefined' && module.exports) module.exports = { TM_TT_SV: TM_TT_SV };",
    "else if (typeof window !== 'undefined') window.TM_TT_SV = TM_TT_SV;",
    ''
  ].join('\n');
}

/* ══ CLI ══════════════════════════════════════════════════════════════════════════════════ */
function main(argv) {
  const komento = argv[0];
  const lippu = (nimi) => { const a = argv.find((x) => x.startsWith('--' + nimi + '=')); return a ? a.split('=').slice(1).join('=') : null; };
  const on = (nimi) => argv.includes('--' + nimi);

  if (komento === 'irrota') {
    const osiot = (lippu('osiot') || '').split(',').filter(Boolean);
    const r = irrota(osiot.length ? osiot : null);
    const out = lippu('out') || OLETUS_OUT;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(r.avaimet, null, 2) + '\n');
    console.log('Irrotettu ' + Object.keys(r.avaimet).length + ' avainta → ' + path.relative(JUURI, out));
    console.log('Osioittain: ' + Object.keys(r.osiot).map((k) => k + ' ' + r.osiot[k]).join(' · '));
    console.log('Kentittäin: ' + Object.keys(r.jakauma).sort().map((k) => k + ' ' + r.jakauma[k]).join(' · '));
    return 0;
  }
  if (komento === 'yhdista') {
    const sv = argv.find((x) => !x.startsWith('--') && x !== komento);
    if (!sv) { console.error('Anna sv-JSON: node scripts/i18n_curriculum.cjs yhdista <sv.json> [--apply]'); return 2; }
    const svKartta = JSON.parse(fs.readFileSync(sv, 'utf8'));
    const src = fs.readFileSync(LIB, 'utf8');
    const sidecar = on('sidecar');
    const r = yhdista(src, svKartta, { pakota: on('pakota') });
    console.log('Käännettäviä kenttiä libissä: ' + r.kentat);
    console.log('sv-avaimia tiedostossa: ' + Object.keys(svKartta).length + ' · kirjoitetaan: ' + r.lisatyt + ' · ohitettu (tyhjä/sama kuin fi): ' + r.ohitetut);
    if (r.tuntemattomat.length) console.log('⚠ TUNTEMATTOMIA avaimia (ei vastaavaa fi-kenttää): ' + r.tuntemattomat.length + ' → ' + r.tuntemattomat.slice(0, 10).join(', '));
    const kattavuus = r.kentat ? Math.round(r.lisatyt / r.kentat * 100) : 0;
    console.log('Kattavuus: ' + kattavuus + ' % käännettävistä kentistä');
    if (sidecar) console.log('KOHDE: sidecar lib/tm_teknistaktiset_sv.js (suositus — curriculum-lib on generoitu)');
    else console.log('KOHDE: inline lib/tm_teknistaktiset.js  ⚠ tiedosto on GENEROITU → parseriajo pyyhkii; harkitse --sidecar');
    if (!on('apply')) { console.log('KUIVAAJO — ei kirjoitettu. Aja --apply kun haluat tallentaa.'); return 0; }
    if (r.tuntemattomat.length) { console.error('Ei kirjoiteta: tuntemattomia avaimia (korjaa sv-tiedosto ensin).'); return 3; }
    if (sidecar) {
      const ulos = path.join(JUURI, 'lib', 'tm_teknistaktiset_sv.js');
      fs.writeFileSync(ulos, sidecarSisalto(svKartta, irrota().avaimet, { pakota: on('pakota') }));
      delete require.cache[require.resolve(ulos)];
      const n = Object.keys(require(ulos).TM_TT_SV).length;
      console.log('✓ Kirjoitettu ' + n + ' sv-avainta → lib/tm_teknistaktiset_sv.js');
      return 0;
    }
    fs.writeFileSync(LIB, r.src);
    ladaaLib();   // varmistus: tulos on ladattavissa (syntaksi ehjä)
    console.log('✓ Kirjoitettu ' + r.lisatyt + ' sv-kenttää → lib/tm_teknistaktiset.js');
    return 0;
  }
  if (komento === 'tarkista') {
    const r = roundTrip();
    console.log('Round-trip: ' + (r.ok ? '✓ HÄVIÖTÖN' : '✗ RIKKI') + ' · avaimia ' + r.avaimia);
    if (!r.ok) { r.ero.forEach((e) => console.error('  ' + e)); return 1; }
    return 0;
  }
  console.error('Komennot: irrota | yhdista <sv.json> [--apply] | tarkista');
  return 2;
}

module.exports = { irrota, yhdista, keraaAnkkurit, roundTrip, lueSvArvot, riisuSv, sidecarSisalto, OSIOT, TEKSTIKENTAT, LIB };
if (require.main === module) process.exit(main(process.argv.slice(2)));
