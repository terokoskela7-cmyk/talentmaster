'use strict';
/* VP_v25:n Kodin renderöijä vm-sandboxissa (muisti: runtime-verifiointi — ei vain new Function): oikeat funktiot lähteestä, ympäristö tynkinä.
   Käyttö: const y = luoYmparisto(vpLahde, { liput, koosteet, ... }); await y.renderoi(); y.html */
const vm = require('vm');

function funktio(src, nimi) {
  const i = src.indexOf('function ' + nimi + '(');
  if (i < 0) throw new Error('funktiota ' + nimi + ' ei löydy');
  const alku = src.slice(i - 6, i) === 'async ' ? i - 6 : i;
  let syv = 0, loppu = -1;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') syv++; else if (src[k] === '}') { syv--; if (syv === 0) { loppu = k + 1; break; } } }
  return src.slice(alku, loppu);
}

function luoYmparisto(src, o) {
  o = o || {};
  const els = {};
  const el = (id) => (els[id] = els[id] || { id, innerHTML: '', textContent: '', style: {} });
  const ctx = {
    console, Date, JSON, Math, Promise, Object, Array, String, Number, isNaN, parseInt, setTimeout, clearTimeout,
    _seuraId: o.seuraId || 'demo-fc', _pelaajat: o.pelaajat || [], _kalenteriTapahtumat: o.kalenteri || [], _currentWs: 'koti', _vpJoukkueDocs: o.joukkueDocs || [], _joukkueNimet: o.joukkueNimet || {},
    vpT: (x) => x, _jsvEsc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    toast(m, t) { (o.toastit = o.toastit || []).push([m, t]); }, setWs() {}, renderVpAloitaKortti() { el('vpAloitaKortti').innerHTML = '<AOPAS/>'; },
    // klassisen Kodin riippuvuudet: kiinteät tynkät → vertailu on rakenteellinen (lippu pois → täsmälleen sama HTML kuin ennen)
    _vpSignaaliKortit: () => ({ kortit: [{ ik: 'I', sev: 'var(--teal)', txt: 'T1', cta: 'C1', fn: 'F1()' }, { ik: 'J', sev: 'var(--amber)', txt: 'T2', cta: 'C2', fn: 'F2()' }], tuotu: 10, kutsuttu: 6, odottaa: 4, annettu: 2, ilman: 8, konv: 33 }),
    _vpRaeRakenneHTML: (p, s) => '<RAE s=' + !!s + '/>', vpKayttoasteLataa() {},
    avaaJoukkueSyvanakyma() {}, _vpNaviUusi: () => false, _vpaFlag: () => false, _vpaPiilotaAvain: () => 'x',
    document: { getElementById: (id) => (o.eiElementteja && o.eiElementteja.indexOf(id) >= 0 ? null : el(id)), createElement: () => ({ style: {} }), head: { appendChild() {} } },
    firebase: { firestore: { FieldPath: { documentId: () => '__id' }, FieldValue: { serverTimestamp: () => '__palvelinaika' } }, app: () => ({ functions: () => ({ httpsCallable: () => async () => ({}) }) }), auth: () => ({ currentUser: { uid: 'vp-uid', getIdToken: async (pakota) => { (o.tokenit = o.tokenit || []).push(pakota); return 't'; } } }) },
    db: { collection: (c) => ({ doc: (id) => ({ collection: (n) => ({
      doc: (did) => ({ set: async (d) => { if (o.kirjoitusVirhe) { const e = new Error('permission-denied'); e.code = 'permission-denied'; throw e; } (o.kirjoitukset = o.kirjoitukset || []).push({ polku: [c, id, n, did].join('/'), data: d }); } }),
      where: () => ({ limit: () => ({ get: async () => ({ docs: n === 'toimenpiteet' ? (o.kuittaukset || []).map((k) => ({ data: () => k })) : (o.ensimmainenVk ? [{ id: o.ensimmainenVk }] : []) }) }) }) }) }) }) },
  };
  ctx.window = ctx;
  if (o.liput !== undefined) ctx._vpLiput = { [ctx._seuraId]: o.liput };
  ctx.TM_KOTI_LUVUT = require('../../lib/tm_koti_luvut.js');
  if (!o.eiPulssia) ctx.TM_SEURAN_PULSSI = require('../../lib/tm_seuran_pulssi.js');
  ctx.TM_ALOITA_JAKSO = require('../../lib/tm_aloita_jakso.js');
  ctx.TM_KAYTTOASTE = { tmKayttoasteLueKoosteet: async () => { if (o.lukuVirhe) throw new Error('permission-denied'); return o.koosteet || []; } };
  vm.createContext(ctx);
  const nimet = ['_vpPaivitaToimenpideLaskuri', 'renderKotiVP', '_vpJaksoVk', '_vpSeuraavaKatselmus', '_vpKatselmusPv', '_vpPulssiLataa', '_renderKotiPulssi'].filter((n) => src.indexOf('function ' + n + '(') >= 0);
  vm.runInContext(nimet.map((n) => funktio(src, n)).join('\n'), ctx);
  const ikkunaFn = (nimi) => { const a = src.indexOf('window.' + nimi + ' = '); if (a < 0) return ''; let syv = 0, k = src.indexOf('{', src.indexOf(')', a)), l = -1; for (; k < src.length; k++) { if (src[k] === '{') syv++; else if (src[k] === '}') { syv--; if (syv === 0) { l = k + 1; break; } } } return src.slice(a, l) + ';'; };
  vm.runInContext(['_vpPulssiKuittaa'].map(ikkunaFn).join('\n'), ctx);
  return {
    ctx, o, els, get html() { return (els.vpKotiView || {}).innerHTML; },
    async renderoi() { ctx.renderKotiVP(); await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r)); },
  };
}
module.exports = { funktio, luoYmparisto };
