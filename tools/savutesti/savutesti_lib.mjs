/* QG-3 · tuotannon savutestin PUHTAAT osat (ei selainta, ei verkkoa) — testit tests/savutesti_lib.test.js.
   Vaihe 0: ~/.briefit/QG3_SAVUTESTI_VAIHE0.md (S1 synteettinen qg_savu · S2 Hosting-kanava + debug-token · S3 kolmikerroksinen kirjoitusesto).
   · secretitPuuttuvat(env)            → puuttuvien secretien nimet (tyhjä = kaikki on)
   · kanavaUrl(url)                     → { ok, url, syy } — VAIN talentmaster-pilot--savutesti-*.web.app (tunnukset ja debug-token eivät koskaan lähde muualle)
   · luokittelePyynto({url, method})    → { paatos: 'sallittu'|'estetty'|'vaimennettu', syy } — verkkoesto (kerros 2, varmistus)
   · luokitteleKirjoitus({op, polku}, sivu) → { tunnettu, syy } — sivun kirjoitusvartijan (kerros 2) kirjaamat yritykset
   · svLoydot(tekstit, { sallitut, baseline }) → { uudet, tunnetut } — sv-ajon suomi (QG-1:n tunnistin + sallittulista + sv-baseline)
   · konsoliVirheet(viestit, sallitut, estetytUrlit) → virheet, joita ei selitä sallittulista eikä savutestin oma esto
   · arvioi(nakyma) → tarkistusten tilat · yhteenvetoMarkdown(tulos) · issueRunko(tulos, ajoUrl) */
import { onkoSuomea } from '../i18n/sv_lapiajo_fi.mjs';

export const SECRETIT = ['TM_SAVU_EMAIL', 'TM_SAVU_SALASANA', 'TM_SAVU_PELAAJA_TUNNISTE', 'TM_SAVU_PELAAJA_PIN', 'TM_SAVU_APPCHECK_DEBUG'];
export const SEURA = 'qg_savu';
export const KANAVA_RE = /^https:\/\/talentmaster-pilot--savutesti-[a-z0-9]+\.web\.app$/;
export const ESTO_VIESTI = 'savutesti: kirjoitus estetty';

/* Mitkä pyynnöt reititetään luokittelijalle. Firestoren luku (Listen-kanava, runQuery) EI kulje reitityksen läpi: pitkä striimi pysyy koskemattomana. */
export const REITITA_RE = /^https:\/\/(?:firestore\.googleapis\.com\/(?:google\.firestore\.v1\.Firestore\/Write\/|v1(?:beta1)?\/projects\/)|[^/]+\.cloudfunctions\.net\/|[^/]+\.run\.app\/|firebasestorage\.googleapis\.com\/|storage\.googleapis\.com\/|identitytoolkit\.googleapis\.com\/|securetoken\.googleapis\.com\/|[^/]*sentry\.io\/)/;

export function secretitPuuttuvat(env) { return SECRETIT.filter((k) => !String((env && env[k]) || '').trim()); }

export function kanavaUrl(url) {
  const u = String(url || '').trim().replace(/\/+$/, '');
  if (!u) return { ok: false, url: '', syy: 'kanavan URL puuttuu (artefakti savutesti-kanava / syöte url / vars.TM_SAVU_URL)' };
  if (!KANAVA_RE.test(u)) return { ok: false, url: u, syy: 'URL ei ole savutesti-kanava (talentmaster-pilot--savutesti-*.web.app): tunnuksia ei lähetetä muualle' };
  return { ok: true, url: u, syy: '' };
}

const FS_KIRJOITUS = /\/google\.firestore\.v1\.Firestore\/Write\//;
const FS_REST_KIRJOITUS = /\/documents(?:\/[^?]*)?:(commit|batchWrite|beginTransaction|rollback)\b/;
const CALLABLE = /^https:\/\/europe-west1-talentmaster-pilot\.cloudfunctions\.net\/([A-Za-z0-9_]+)/;
const AUTH_SALLITUT = /^(?:accounts:(?:signInWithPassword|signInWithCustomToken|lookup)|token)$/;

/* req = { url, method }. callablet = sallittulistan nimet. Tuntematon muu liikenne (CDN, oma kanava) = sallittu: se ei kirjoita backendiin. */
export function luokittelePyynto(req, callablet) {
  const url = String((req && req.url) || ''), m = String((req && req.method) || 'GET').toUpperCase();
  let u; try { u = new URL(url); } catch (e) { return { paatos: 'sallittu', syy: 'ei http-osoite' }; }
  const h = u.hostname, p = u.pathname;
  if (h === 'firestore.googleapis.com') {
    if (FS_KIRJOITUS.test(p)) return { paatos: 'estetty', syy: 'Firestore Write -kanava' };
    if (FS_REST_KIRJOITUS.test(p)) return { paatos: 'estetty', syy: 'Firestore REST ' + p.match(FS_REST_KIRJOITUS)[1] };
    if (/\/documents\//.test(p) && /^(PATCH|DELETE|PUT)$/.test(m)) return { paatos: 'estetty', syy: 'Firestore REST ' + m };
    return { paatos: 'sallittu', syy: 'Firestore-luku' };
  }
  const c = url.match(CALLABLE);
  if (c) return (callablet || []).includes(c[1]) ? { paatos: 'sallittu', syy: 'callable ' + c[1] + ' (sallittulista)' } : { paatos: 'estetty', syy: 'callable ' + c[1] + ' (ei sallittulistalla)' };
  if (/cloudfunctions\.net$|\.run\.app$/.test(h)) return { paatos: 'estetty', syy: 'tuntematon funktio ' + h + p };
  if (h === 'firebasestorage.googleapis.com' || h === 'storage.googleapis.com') return /^(GET|HEAD|OPTIONS)$/.test(m) ? { paatos: 'sallittu', syy: 'Storage-luku' } : { paatos: 'estetty', syy: 'Storage ' + m };
  if (h === 'identitytoolkit.googleapis.com' || h === 'securetoken.googleapis.com') {
    const toim = p.split('/').pop();
    return AUTH_SALLITUT.test(toim) ? { paatos: 'sallittu', syy: 'Auth ' + toim } : { paatos: 'estetty', syy: 'Auth ' + toim };
  }
  if (/(^|\.)sentry\.io$/.test(h)) return { paatos: 'vaimennettu', syy: 'Sentry-raportti (savutestin estämät kirjoitukset eivät kuulu tuotannon virheisiin)' };
  return { paatos: 'sallittu', syy: 'muu liikenne' };
}

/* kirjoitus = { op, polku } (sivun vartija: set/update/delete/add, batch.x, tx.x). sallitut = savutesti_sallitut.json tunnetut_kirjoitukset. */
export function luokitteleKirjoitus(kirjoitus, sivu, sallitut) {
  const op = String((kirjoitus && kirjoitus.op) || '').replace(/^(batch|tx)\./, ''), polku = String((kirjoitus && kirjoitus.polku) || '');
  const r = (sallitut || []).find((s) => s.op === op && new RegExp(s.polku).test(polku) && (!s.sivu || s.sivu === sivu));
  return r ? { tunnettu: true, syy: r.perustelu } : { tunnettu: false, syy: 'tuntematon kirjoitus ' + op + ' ' + polku };
}

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const avain = (s) => norm(s).toLowerCase();
export function onSallittu(t, sallitut) {
  const a = avain(t), S = sallitut || { tekstit: [], alkavat: [] };
  return (S.tekstit || []).includes(a) || (S.alkavat || []).some((p) => a.startsWith(String(p).toLowerCase())) || !/[a-zåäö]{3}/i.test(t);
}
/* Suomi sv-ajossa: sallittu → ohitetaan · sv-baselinessa (tunnettu, PM:n sv-erä odottaa; tools/i18n/sv_lapiajo_baseline.json) → varoitus · muu → virhe. */
export function svLoydot(tekstit, opts) {
  const o = opts || {}, base = new Set(((o.baseline && o.baseline.tekstit) || []).map(avain)), uudet = [], tunnetut = [], nahty = new Set();
  for (const t0 of tekstit || []) {
    const t = norm(t0); if (!t || nahty.has(avain(t))) continue; nahty.add(avain(t));
    if (onSallittu(t, o.sallitut) || !onkoSuomea(t).fi) continue;
    (base.has(avain(t)) ? tunnetut : uudet).push(t);
  }
  return { uudet, tunnetut };
}

/* viestit = [{ tyyppi: 'pageerror'|'console', teksti, url? }]. Pois: sallittulista (malli = RegExp-lähde, valinnainen url-malli), savutestin oma esto (ESTO_VIESTI) ja estettyjen osoitteiden latausvirheet. */
export function konsoliVirheet(viestit, sallitut, estetytUrlit) {
  const est = new Set(estetytUrlit || []);
  return (viestit || []).filter((v) => {
    const t = String(v.teksti || '');
    if (t.includes(ESTO_VIESTI)) return false;
    if (v.url && est.has(v.url)) return false;
    return !(sallitut || []).some((s) => new RegExp(s.malli).test(t) && (!s.url || new RegExp(s.url).test(String(v.url || ''))));
  });
}

/* nakyma = { nimi, kieli, sivu, virheet:[], lohkot:{ ok, puuttuu:[] }, sv?:{uudet,tunnetut}, lippu?:{ ok, syy }, kirjoitukset:{ tuntemattomat:[], tunnetut:[], verkko:[] }, vartija:bool, kaatui? }
   → { virheet, lohkot, kieli, lippu, kirjoitukset }: kukin { tila: 'ok'|'varoitus'|'virhe'|'-', tieto } */
export function arvioi(n) {
  const t = (tila, tieto) => ({ tila, tieto: tieto || '' });
  if (n.kaatui) { const k = t('virhe', n.kaatui); return { virheet: k, lohkot: k, kieli: n.kieli === 'sv' ? k : t('-'), lippu: n.lippu ? k : t('-'), kirjoitukset: k }; }
  const kirj = n.kirjoitukset || { tuntemattomat: [], tunnetut: [], verkko: [] };
  return {
    virheet: (n.virheet || []).length ? t('virhe', n.virheet.slice(0, 5).map((v) => v.teksti).join(' | ')) : t('ok'),
    lohkot: n.lohkot && n.lohkot.ok ? t('ok') : t('virhe', 'puuttuu: ' + ((n.lohkot && n.lohkot.puuttuu) || []).join(', ')),
    kieli: n.kieli !== 'sv' ? t('-') : n.sv && n.sv.uudet.length ? t('virhe', n.sv.uudet.slice(0, 8).join(' | ')) : n.sv && n.sv.tunnetut.length ? t('varoitus', n.sv.tunnetut.length + ' tunnettua (sv-baseline)') : t('ok'),
    lippu: !n.lippu ? t('-') : n.lippu.ok ? t('ok') : t('virhe', n.lippu.syy),
    kirjoitukset: !n.vartija ? t('virhe', 'kirjoitusvartija ei asentunut') : (kirj.tuntemattomat.length || kirj.verkko.length) ? t('virhe', kirj.tuntemattomat.concat(kirj.verkko).slice(0, 5).join(' | ')) : kirj.tunnetut.length ? t('varoitus', kirj.tunnetut.length + ' tunnettua avauskirjoitusta estetty') : t('ok'),
  };
}
export const TARKISTUKSET = [['virheet', 'Ei virheitä'], ['lohkot', 'Lohkot'], ['kieli', 'sv: ei suomea'], ['lippu', 'Lippu → Kehitystyöpöytä'], ['kirjoitukset', 'Ei kirjoituksia']];
const MERKKI = { ok: '✓', varoitus: '⚠', virhe: '✗', '-': '–' };
export function onnistui(tulos) { return !!tulos && !tulos.ohitettu && (tulos.nakymat || []).length > 0 && (tulos.nakymat || []).every((n) => Object.values(arvioi(n)).every((x) => x.tila !== 'virhe')); }
const solu = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 300);

export function yhteenvetoMarkdown(tulos) {
  if (tulos.ohitettu) return '## Savutesti — ohitettu\n\nohitettu: ' + tulos.ohitettu + '\n';
  const r = ['## Savutesti ' + (onnistui(tulos) ? '✓' : '✗') + ' — ' + (tulos.url || ''), '', (tulos.kesto_s != null ? 'Kesto ' + tulos.kesto_s + ' s · ' : '') + 'seura `' + SEURA + '` (synteettinen)', '',
    '| Näkymä | Kieli | ' + TARKISTUKSET.map((x) => x[1]).join(' | ') + ' |', '|---|---|' + TARKISTUKSET.map(() => '---').join('|') + '|'];
  const tiedot = [];
  for (const n of tulos.nakymat || []) {
    const a = arvioi(n);
    r.push('| ' + n.nimi + ' | ' + n.kieli + ' | ' + TARKISTUKSET.map(([k]) => MERKKI[a[k].tila]).join(' | ') + ' |');
    for (const [k, nimi] of TARKISTUKSET) if (a[k].tila === 'virhe' || a[k].tila === 'varoitus') tiedot.push('- ' + MERKKI[a[k].tila] + ' **' + n.nimi + ' (' + n.kieli + ')** · ' + nimi + ': ' + solu(a[k].tieto));
  }
  if (tiedot.length) r.push('', '### Löydökset', '', ...tiedot);
  return r.join('\n') + '\n';
}
export function issueRunko(tulos, ajoUrl) { return 'Savutesti epäonnistui: ' + (ajoUrl || '') + '\n\n' + yhteenvetoMarkdown(tulos); }
