/* Laiskojen kirjastojen käyttökohtien staattinen analyysi (vartija: tests/laiska_varmista_vartija.test.js).
   Selvittää HTML:n `data-tm-laiska`-skripteistä, mitä globaaleja laiskat kirjastot määrittelevät, ja etsii Masterin
   (inline-skriptit + eager-ladatut skriptit) viittaukset niihin. Viittaus on "turvallinen", jos
     (a) saman funktion (tai sen ympäröivän funktion) sisällä on `.varmista(`/`varmista(`-kutsu ENNEN viittausta, tai
     (b) viittaus on laiskassa kirjastossa, joka kuuluu samaan ryhmään kuin määrittelevä kirjasto (ladataan yhdessä).
   Muut viittaukset (typeof-varapolku tai suora kutsu) raportoidaan → sallittu lista perusteluineen tai korjaus.
   Viittaus tunnistetaan eslint-scopella: vain RATKAISEMATON (globaali) viittaus lasketaan, paikalliset samannimiset muuttujat eivät. */
import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const acorn = require('acorn'), eslintScope = require('eslint-scope'), estraverse = require('estraverse');

export function skriptit(html) {
  const out = []; let m;
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  while ((m = re.exec(html))) {
    const attr = m[1], src = (/\bsrc="([^"?]+)/.exec(attr) || [])[1] || null;
    out.push({ attr, src, koodi: m[2], laiska: /data-tm-laiska/.test(attr), ryhma: (/data-tm-ryhma="([^"]*)"/.exec(attr) || [, ''])[1], myos: ((/data-tm-myos="([^"]*)"/.exec(attr) || [, ''])[1] || '').split(',').filter(Boolean), kielipaketti: /data-tm-kielipaketti/.test(attr), pohja: html.slice(0, m.index).split('\n').length });
  }
  return out;
}
function jasenna(koodi) { return acorn.parse(koodi, { ecmaVersion: 'latest', sourceType: 'script', locations: true, ranges: true, allowHashBang: true, allowReturnOutsideFunction: true }); }
/** Kirjaston globaalit: ylätason function/const/let/var/class + window./root.-sijoitukset (myös IIFE:n sisältä). */
export function maaritelmat(koodi) {
  const ast = jasenna(koodi), nimet = new Set();
  for (const n of ast.body) {
    if (n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') nimet.add(n.id.name);
    else if (n.type === 'VariableDeclaration') n.declarations.forEach((d) => { if (d.id.type === 'Identifier') nimet.add(d.id.name); else collect(d.id, nimet); });
  }
  estraverse.traverse(ast, { enter(n) {
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && !n.left.computed && n.left.object.type === 'Identifier' && /^(window|root|global|globalThis|self)$/.test(n.left.object.name)) nimet.add(n.left.property.name);
  } });
  return nimet;
}
function collect(p, set) { if (p.type === 'Identifier') set.add(p.name); else if (p.type === 'ObjectPattern') p.properties.forEach((x) => collect(x.value || x.argument, set)); else if (p.type === 'ArrayPattern') p.elements.forEach((x) => x && collect(x, set)); }

/** Palauttaa viittaukset laiskojen kirjastojen globaaleihin yhdestä koodilohkosta. lasketaanOmaksi: lohkon omat ylätason nimet (ei viittaus). */
export function viittaukset(koodi, laiskaNimet, offsetRivi = 0) {
  const ast = jasenna(koodi), scopeMgr = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' });
  const global = scopeMgr.globalScope, omat = new Set(global.variables.map((v) => v.name));
  const parent = new Map(); estraverse.traverse(ast, { enter(n, p) { parent.set(n, p); } });
  const tulos = [];
  global.through.forEach((ref) => {
    const nimi = ref.identifier.name; if (!laiskaNimet.has(nimi) || omat.has(nimi) && !laiskaNimet.has(nimi)) return;
    if (omat.has(nimi)) return;   // lohko määrittelee itse (esim. toinen kirjasto samalla nimellä) → ei laiskan käyttäjä
    // ympäröivät funktiot (sisin ensin)
    const funktiot = []; for (let n = parent.get(ref.identifier); n; n = parent.get(n)) if (/Function/.test(n.type)) funktiot.push(n);
    const sijainti = ref.identifier.start;
    const varmistettu = funktiot.some((f) => varmistaEnnen(f, sijainti));
    const typeofKaytto = parent.get(ref.identifier) && parent.get(ref.identifier).type === 'UnaryExpression' && parent.get(ref.identifier).operator === 'typeof';
    tulos.push({ nimi, rivi: ref.identifier.loc.start.line + offsetRivi, funktio: funktioNimi(funktiot, parent), varmistettu, typeofKaytto });
  });
  return tulos;
}
function varmistaEnnen(f, sijainti) {
  let loytyi = false;
  estraverse.traverse(f.body, { enter(n) {
    if (loytyi) return estraverse.VisitorOption.Break;
    if (n.type === 'CallExpression' && n.start < sijainti) {
      const c = n.callee;
      if ((c.type === 'Identifier' && /^varmista/.test(c.name)) || (c.type === 'MemberExpression' && !c.computed && /^varmista/.test(c.property.name))) loytyi = true;
    }
  } });
  return loytyi;
}
function funktioNimi(funktiot, parent) {
  for (const f of funktiot) {   // sisin nimetty
    if (f.id) return f.id.name;
    const p = parent.get(f);
    if (p && p.type === 'VariableDeclarator' && p.id.type === 'Identifier') return p.id.name;
    if (p && p.type === 'AssignmentExpression' && p.left.type === 'MemberExpression' && !p.left.computed) return p.left.property.name;
    if (p && p.type === 'Property' && !p.computed && p.key) return p.key.name || String(p.key.value);
  }
  return '(ylätaso)';
}

/** Koko analyysi: palauttaa { laiskat: [{src,ryhma,nimet}], loydot: [{tiedosto,rivi,nimi,funktio,varmistettu,typeofKaytto}] } */
export function analysoi(juuri, sivuTiedosto = 'TalentMaster_Master_v16.html') {
  const html = fs.readFileSync(path.join(juuri, sivuTiedosto), 'utf8'), sk = skriptit(html);
  const laiskat = sk.filter((s) => s.laiska && s.src).map((s) => ({ src: s.src, ryhma: s.ryhma, myos: s.myos, nimet: maaritelmat(fs.readFileSync(path.join(juuri, s.src), 'utf8')) }));
  const nimiRyhmat = new Map();   // nimi → Set(ryhmät joissa määritelty)
  laiskat.forEach((l) => l.nimet.forEach((n) => { (nimiRyhmat.get(n) || nimiRyhmat.set(n, new Set()).get(n)).add(l.src); }));
  // Nimi on "laiska" vain jos mikään EAGER-skripti ei määrittele sitä (muuten se on aina saatavilla)
  const eager = sk.filter((s) => !s.laiska && !s.kielipaketti);
  const eagerNimet = new Set();
  eager.forEach((s) => { try { const k = s.src ? fs.readFileSync(path.join(juuri, s.src), 'utf8') : s.koodi; if (!s.src || /\.js$/.test(s.src)) maaritelmat(k).forEach((n) => eagerNimet.add(n)); } catch (e) { /* ei-js */ } });
  const laiskaNimet = new Set([...nimiRyhmat.keys()].filter((n) => !eagerNimet.has(n) && n.length > 2));
  const loydot = [];
  const kasittele = (tiedosto, koodi, offset, nimet) => {
    let v; try { v = viittaukset(koodi, nimet || laiskaNimet, offset); } catch (e) { e.message = 'analyysi ' + tiedosto + ': ' + e.message; throw e; }
    v.forEach((x) => loydot.push(Object.assign({ tiedosto }, x)));
  };
  eager.forEach((s) => {
    if (s.src && /\.js$/.test(s.src) && fs.existsSync(path.join(juuri, s.src))) kasittele(s.src, fs.readFileSync(path.join(juuri, s.src), 'utf8'), 0);
    else if (!s.src && s.koodi.trim() && !/type="(?!text\/javascript|module)/.test(s.attr)) kasittele(sivuTiedosto, s.koodi, s.pohja - 1);
  });
  // laiska kirjasto viittaa toisen RYHMÄN nimeen (ryhmä '' ← kaavio ym.) → ei saman ryhmän latausta
  laiskat.forEach((l) => {
    const omaRyhmat = new Set([l.ryhma, ...l.myos]);
    const muut = new Set([...laiskaNimet].filter((n) => ![...nimiRyhmat.get(n)].some((src) => { const m = laiskat.find((x) => x.src === src); return omaRyhmat.has(m.ryhma) || m.myos.some((g) => omaRyhmat.has(g)); })));
    if (!muut.size) return;
    kasittele(l.src, fs.readFileSync(path.join(juuri, l.src), 'utf8'), 0, muut);
  });
  return { laiskat, loydot, laiskaNimet };
}
