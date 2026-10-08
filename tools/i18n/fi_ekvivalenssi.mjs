#!/usr/bin/env node
/* fi-EKVIVALENSSITARKISTUS reitityskorjauksille (sv-läpiajo PR 2): varmistaa, ettei literaalien siirto T()-kutsuiksi muuta suomenkielistä tekstiä.
   Menetelmä: jokainen merkkijonoketju (a + 'x' + b, template-literaali, yksittäinen literaali) linearisoidaan tekstiksi, jossa ei-literaaliset osat ovat paikanvaraajia (\u0001) ja
   reititinkutsu T('avain'[, {…}]) korvautuu avaimen fi-tekstillä ({muuttuja} → paikanvaraaja). Ketjut vertaillaan ylätason lauseittain monijoukkoina: välilyönnit, järjestys
   ketjun sisällä ja kadonneet/tuplamerkit näkyvät erona. Rajoitus: ketjun ulkopuoliset rakenteet (ternary-haarat) vertaillaan omina ketjuinaan.
   Käyttö: node tools/i18n/fi_ekvivalenssi.mjs <vanha.html> <uusi.html> [ryhmä=pelaaja]   (vanha esim. `git show origin/main:TalentMaster_Pelaaja_v7.html > /tmp/vanha.html`)
   Poistuu koodilla 1 jos eroja; erot listataan `-` (vain vanhassa) / `+` (vain uudessa). Ero ei aina ole virhe (esim. kaksihaaraisen ternaryn yhdistäminen) — katselmoi. */
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import * as acorn from 'acorn';
import { ROUTERIT } from './sv_staattinen.mjs';

const L = createRequire(import.meta.url)('../../lib/tm_lang.js'); L.tmAsetaKieli('fi', false);
const P = '\u0001';
const TMAP = (src) => { try { const i = src.indexOf('var _TMAP = {'); if (i < 0) return {}; const j = src.indexOf('};', i); return new Function(src.slice(i, j + 2) + '\nreturn _TMAP;')(); } catch (e) { return {}; } };

function reititinTeksti(solmu, tmap, ryhma) {   // → fi-teksti tai null
  if (solmu.type !== 'CallExpression' || solmu.callee.type !== 'Identifier' || !ROUTERIT.has(solmu.callee.name)) return null;
  const a0 = solmu.arguments[0]; if (!a0 || a0.type !== 'Literal' || typeof a0.value !== 'string') return null;
  const nimi = solmu.callee.name, avain = a0.value;
  let polku;
  if (nimi === 't' || nimi === '_pt') polku = avain;
  else if (nimi === 'T' || nimi === '_pT') polku = avain.indexOf('.') >= 0 ? avain : (tmap[avain] || (ryhma + '.' + avain));
  else return null;
  const v = L.t(polku); return v === polku ? null : v.replace(/\{[A-Za-z0-9_]+\}/g, P);
}
function analysoi(src, ryhma) {
  const tmap = TMAP(src); const kartta = new Map();
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(src))) {
    let ast; try { ast = acorn.parse(m[1], { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true }); } catch (e) { continue; }
    for (const n of ast.body) {
      const ketjut = [];
      const lin = (x) => {   // palauttaa tekstin ketjulle; sivuvaikutuksena kerää sisäkkäiset ketjut
        if (!x) return '';
        if (x.type === 'Literal') return typeof x.value === 'string' ? x.value : P;
        if (x.type === 'TemplateLiteral') { let s = ''; x.quasis.forEach((q, i) => { s += (q.value.cooked != null ? q.value.cooked : q.value.raw); if (i < x.expressions.length) { const e = x.expressions[i], rt = reititinTeksti(e, tmap, ryhma); if (rt != null) { s += rt; e.arguments.slice(1).forEach(kerää); } else { s += P; kerää(e); } } }); return s; }
        if (x.type === 'BinaryExpression' && x.operator === '+') return lin(x.left) + lin(x.right);
        const t = reititinTeksti(x, tmap, ryhma);
        if (t != null) { x.arguments.slice(1).forEach(kerää); return t; }
        if (x.type === 'ParenthesizedExpression') return lin(x.expression);
        kerää(x); return P;
      };
      const kerää = (x) => {   // käy läpi solmun lapset; jokainen merkkijonoketju talteen
        if (!x || typeof x.type !== 'string') return;
        if (x.type === 'Literal') { if (typeof x.value === 'string') ketjut.push(x.value); return; }
        if (x.type === 'TemplateLiteral' || (x.type === 'BinaryExpression' && x.operator === '+') || reititinTeksti(x, tmap, ryhma) != null) { const s = lin(x); if (s.replace(new RegExp(P, 'g'), '').trim()) ketjut.push(s); return; }
        for (const k of Object.keys(x)) { if (k === 'loc' || k === 'type') continue; if (k === 'key' && x.type === 'Property' && !x.computed) continue; const v = x[k]; if (Array.isArray(v)) v.forEach(kerää); else if (v && typeof v.type === 'string') kerää(v); }
      };
      kerää(n);
      const nimi = n.type === 'FunctionDeclaration' ? 'function ' + n.id.name : n.type === 'VariableDeclaration' ? 'var ' + n.declarations.map((d) => d.id.name || '?').join(',') : '(muut ylätason lauseet)';
      kartta.set(nimi, (kartta.get(nimi) || []).concat(ketjut));
    }
  }
  return kartta;
}
const monijoukkoEro = (a, b) => { const c = new Map(); a.forEach((s) => c.set(s, (c.get(s) || 0) + 1)); b.forEach((s) => c.set(s, (c.get(s) || 0) - 1)); const v = [], u = []; for (const [s, n] of c) for (let i = 0; i < Math.abs(n); i++) (n > 0 ? v : u).push(s); return { vain_vanha: v, vain_uusi: u }; };
const nayta = (s) => JSON.stringify(s.replace(new RegExp(P, 'g'), '◆')).slice(0, 170);

if (process.argv[1] && process.argv[1].endsWith('fi_ekvivalenssi.mjs')) {
  const [vanha, uusi, ryhma = 'pelaaja'] = process.argv.slice(2);
  const A = analysoi(readFileSync(vanha, 'utf8'), ryhma), B = analysoi(readFileSync(uusi, 'utf8'), ryhma);
  let ero = 0; const kaikki = new Set([...A.keys(), ...B.keys()]);
  for (const nimi of kaikki) {
    const e = monijoukkoEro(A.get(nimi) || [], B.get(nimi) || []);
    if (!e.vain_vanha.length && !e.vain_uusi.length) continue;
    ero++; console.log('── ' + nimi); e.vain_vanha.forEach((s) => console.log('  - ' + nayta(s))); e.vain_uusi.forEach((s) => console.log('  + ' + nayta(s)));
  }
  console.error(ero + ' lausetta/funktiota joissa fi-tekstiketjut eroavat');
  process.exit(ero ? 1 : 0);
}
