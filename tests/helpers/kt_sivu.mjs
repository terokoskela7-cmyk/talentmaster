/* B7 · selaintestien ja kuvien yhteinen harness: TalentMaster_Kehitystyopoyta.html OIKEA sivu file://-osoitteesta, Firebase-SDK korvataan muistissa olevalla stubilla (page.route) — ei verkkoa, ei oikeaa dataa.
   Sivua EI muokata: stubi vastaa gstatic-SDK-pyyntöihin. Fixture: keksitty "Demo FC", joukkue Demo U13 (demo_u13) + toinen joukkue; pelaajat vain keksityillä nimillä.
   kaynnista(selain, { rooli:'valmentaja'|'vp'|'super_admin', lippu:bool, hash:'#pelaaja/p2/tanaan', leveys, korkeus, teema, dokit:{polku:data}, pelaajat:[...] }) → { sk, p, virheet, kirj, ... } */
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SIVU = 'file://' + join(JUURI, 'TalentMaster_Kehitystyopoyta.html');
export const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => existsSync(p));
const NYT = Date.parse('2026-10-19T09:00:00+03:00');
const ALKOI = new Date(NYT - 16 * 86400000).toISOString();

export const PELAAJAT = [
  { id: 'p1', etunimi: 'Aatu', sukunimi: 'Aalto', syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'Demo U13', joukkueet: ['demo_u13'] },
  { id: 'p2', etunimi: 'Bertta', sukunimi: 'Bergh', syntymaVuosi: 2013, sukupuoli: 'N', joukkue: 'Demo U13', joukkueet: ['demo_u13'],
    jaksofokus: { konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: ALKOI, kesto_vk: 6, lahde: 'valmentaja', domeeni: 'teknis_taktinen' } },
  { id: 'p3', etunimi: 'Cecil', sukunimi: 'Carlsson', syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'Demo U13', joukkueet: ['demo_u13'] },
  { id: 'p9', etunimi: 'Dani', sukunimi: 'Dahl', syntymaVuosi: 2011, sukupuoli: 'M', joukkue: 'Demo U15', joukkueet: ['demo_u15'] },
];
export const DOKIT = (opts) => Object.assign({
  'seurat/demo': { nimi: 'Demo FC', kieli: 'fi' },
  'seurat/demo/liput/julkiset': { kentta: true, valmentaja_v2: opts.vkoti !== false, kehitystyopoyta_v2: opts.lippu !== false },
  'seurat/demo/kayttajat/u1': { rooli: opts.rooli === 'vp' ? 'vp' : 'valmentaja', joukkueet: ['demo_u13'], joukkue: 'Demo U13', etunimi: 'Testi', sukunimi: 'Valmentaja' },
  'seurat/demo/joukkueet/demo_u13': { nimi: 'Demo U13', ika: 'U13' },
  'seurat/demo/joukkueet/demo_u15': { nimi: 'Demo U15', ika: 'U15' },
}, opts.dokit || {});

const STUB = (cfg) => '(function(){var D=' + JSON.stringify(cfg.dokit) + ',U=' + JSON.stringify(cfg.kayttaja) + ';window.__kirj=[];window.__pyynnot=[];'
  + 'function clone(x){return JSON.parse(JSON.stringify(x))}'
  + 'function getP(o,p){return p.split(".").reduce(function(a,k){return a==null?a:a[k]},o)}'
  + 'function setP(o,p,v){var k=p.split("."),c=o;for(var i=0;i<k.length-1;i++){if(c[k[i]]==null||typeof c[k[i]]!=="object")c[k[i]]={};c=c[k[i]]}c[k[k.length-1]]=v}'
  + 'function snap(path){return{id:path.split("/").pop(),exists:D[path]!==undefined,data:function(){return clone(D[path])}}}'
  + 'function doc(path){return{path:path,id:path.split("/").pop(),get:async function(){window.__pyynnot.push(path);if((window.__vika||[]).some(function(x){return path.indexOf(x)>=0}))throw new Error("stub-vika "+path);return snap(path)},update:async function(u){window.__kirj.push({path:path,update:clone(u)});var d=D[path]||(D[path]={});Object.keys(u).forEach(function(k){setP(d,k,clone(u[k]))})},set:async function(v,o){window.__kirj.push({path:path,set:clone(v)});D[path]=o&&o.merge?Object.assign(D[path]||{},clone(v)):clone(v)},collection:function(c){return col(path+"/"+c)}}}'
  + 'function col(path,f){f=f||[];function lista(){var n=path.split("/").length+1;return Object.keys(D).filter(function(k){return k.indexOf(path+"/")===0&&k.split("/").length===n}).map(function(k){return{id:k.split("/").pop(),data:function(){return clone(D[k])},_d:D[k]}}).filter(function(x){return f.every(function(w){var v=x._d[w[0]];return w[1]==="=="?v===w[2]:w[1]==="array-contains"?Array.isArray(v)&&v.indexOf(w[2])>=0:true})})}'
  + 'var o={doc:function(id){return doc(path+"/"+id)},where:function(a,b,c){return col(path,f.concat([[a,b,c]]))},limit:function(){return o},orderBy:function(){return o},get:async function(){window.__pyynnot.push(path);if((window.__vika||[]).some(function(x){return path.indexOf(x)>=0}))throw new Error("stub-vika "+path);var l=lista();return{docs:l,size:l.length,empty:!l.length,forEach:function(g){l.forEach(g)}}}};return o}'
  + 'var user={uid:"u1",isAnonymous:false,getIdToken:async function(){return"t"},getIdTokenResult:async function(){return{claims:' + JSON.stringify(cfg.claims) + '}}};'
  + 'var A={currentUser:user,onAuthStateChanged:function(cb){setTimeout(function(){cb(' + (cfg.kirjautunut === false ? 'null' : 'user') + ')},30);return function(){}}};'
  + 'var F=function(){return{}};F.initializeApp=function(){return{}};F.auth=function(){return A};F.auth.GoogleAuthProvider=function(){};F.appCheck=function(){return{activate:function(){}}};F.appCheck.ReCaptchaEnterpriseProvider=function(){};'
  + 'F.firestore=function(){return{collection:function(c){return col(c)},doc:function(p){return doc(p)},batch:function(){var ops=[];return{set:function(r,v,o){ops.push({path:r.path,set:clone(v),opts:o||null})},update:function(r,u){ops.push({path:r.path,update:clone(u)})},commit:async function(){(window.__batch=window.__batch||[]).push(ops)}}}}};'
  + 'F.firestore.Timestamp={fromDate:function(d){return{toDate:function(){return d}}},fromMillis:function(m){return{toMillis:function(){return m},toDate:function(){return new K(m)}}}};F.firestore.FieldValue={serverTimestamp:function(){return"TS"},delete:function(){return"DEL"},arrayUnion:function(){return{__arrayUnion:[].slice.call(arguments)}}};'
  + 'window.firebase=F;var K=Date;var N=' + NYT + ';Date=class extends K{constructor(){var a=[].slice.call(arguments);if(a.length)super(...a);else super(N)}static now(){return N}};})();';

export async function kaynnista(selain, opts) {
  opts = Object.assign({ rooli: 'valmentaja', lippu: true, leveys: 1280, korkeus: 900, teema: 'dark', hash: '#pelaaja/p2/tanaan' }, opts || {});
  const dokit = DOKIT(opts); (opts.pelaajat || PELAAJAT).forEach((p) => { dokit['seurat/demo/pelaajat/' + p.id] = p; });
  const rooli = opts.rooli === 'super_admin' ? 'super_admin' : opts.rooli;
  if (rooli === 'super_admin') dokit['admins/u1'] = { email: 'sa@example.test' };
  const cfg = { dokit, claims: rooli === 'super_admin' ? {} : { seuraId: 'demo', rooli }, kayttaja: {}, kirjautunut: opts.kirjautunut };
  const sk = await selain.newContext({ viewport: { width: opts.leveys, height: opts.korkeus } }), p = await sk.newPage(), virheet = [];
  p.on('pageerror', (e) => virheet.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') virheet.push('console: ' + m.text()); });
  await p.route('**/*', (r) => {
    const u = r.request().url();
    if (/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: STUB(cfg) });
    if (/gstatic\.com\/firebasejs\//.test(u)) return r.fulfill({ contentType: 'application/javascript', body: '' });
    if (/sentry-cdn\.com/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: '' });
    if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u)) return r.fulfill({ contentType: 'text/css', body: '' });
    if (u.startsWith('file://') || u.startsWith('data:')) return r.continue();
    return r.abort();
  });
  if (opts.vika) await p.addInitScript((v) => { window.__vika = v; }, opts.vika);   // stub: näillä poluilla get() heittää (virhetilojen selaintestit)
  await p.addInitScript((t) => { try { localStorage.setItem('tm-theme', t); } catch (e) { /* ei */ } }, opts.teema);
  await p.goto(SIVU + (opts.hash || ''), { waitUntil: 'load' });
  return { sk, p, virheet, dokit };
}
export const selainKaynnista = async () => { const { chromium } = require('playwright-core'); return chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }); };
