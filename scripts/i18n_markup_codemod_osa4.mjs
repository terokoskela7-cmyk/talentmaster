/**
 * i18n-MARKUP-ANSAN PURKU — osa 4 (fragmentit, attribuutit, monitekstiset).
 *
 * #603 purki LUOKAN A (kokonainen elementti yhden tekstijakson ympärillä). Jäljelle jäi
 * kolme vaikeampaa luokkaa, jotka kaikki syntyivät samasta massakääröstä:
 *   · FRAGMENTTI  — avain katkeaa kesken tagia:  `'">Ehdota:'` · `'arvioitu">'`
 *   · ATTRIBUUTTI — käännettävä teksti on `title="…"`:n sisällä
 *   · MONITEKSTI  — yhdessä avaimessa monta tekstijaksoa
 *
 * PERIAATE (sama): `vpT` käärii vain TEKSTIN, markup jää JS-konkatenointiin.
 *
 * RENDERÖINTI EI MUUTU. Uusi sv poimitaan vanhasta sv-arvosta SAMASTA kohdasta, ja
 * palat kasataan samassa järjestyksessä → identiteetti-vpT:llä tulos on bitilleen sama.
 * Ruotsin sanajärjestys on siis täsmälleen se mikä se on tänään; jos jokin lause
 * hyötyisi uudelleenmuotoilusta, se on erillinen KÄÄNNÖSTEHTÄVÄ, ei tämän regressio.
 * Skripti ei keksi ruotsia: se siirtää.
 *
 * PORTIT (kuten #603) — mikään ei saa vaihtaa näkyvää ruotsia hiljaa:
 *   1) sv:n ja fi:n palarakenne eroaa            → ei migroida
 *   2) kaksi avainta → sama tekstiavain, eri sv  → ei migroida (kääntäjän päätös)
 *   3) tekstiavain jo kartassa eri sv:llä        → ei migroida
 *   4) tekstiavain yhteiskartassa eri sv:llä     → ei migroida
 *
 * Ajo:  node scripts/i18n_markup_codemod_osa4.mjs [--apply]
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const vaadi = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');

/* ── Palastelu ──────────────────────────────────────────────────────────────
   Markkupi tunnistetaan TAGIMÄISYYDESTÄ, ei pelkästä < / > -merkistä:
   vertailuoperaattori tekstissä ('< 40', '> 1.5 s', '(<3)') EI ole markkupia.

   Vaikein erottelu on avaimen ALKU, joka voi olla kolmea eri asiaa:
     '">Ehdota:'            → sulkeva lainaus + tagin loppu, sitten TEKSTI
     ';border-radius:2px">' → CSS-deklaraatio + tagin loppu, EI tekstiä
     'arvioitu">'           → TEKSTI, ja vasta sitten sulkeva fragmentti
   Siksi alkufragmentiksi kelpaa vain tyhjä, pelkkä lainausmerkki, attribuutti-
   sijoitus (`=`) tai CSS-deklaraatio (`;color:` / `margin-left:`). Muuten alku on
   tekstiä ja fragmentti haetaan lopusta. */
const TAG = /<[a-zA-Z/!][^>]*>/g;
const ALKUFRAG = /<[a-zA-Z/!][^>]*$/;              // katkennut tagin ALKU avaimen lopussa
const LOPPUQ = /"\s*\/?>$/;                        // '…">' avaimen lopussa
const ATTR = /\b(?:title|placeholder|aria-label|alt|label)\s*=\s*"([^"]*)"/;
const merkitseva = (s) => /[\p{L}\p{N}]/u.test(s);
/** Onko `etuliite` (ennen ensimmäistä >) tagin sisuskalua eikä näkyvää tekstiä? */
function tagimainen(etuliite) {
  if (etuliite === '' || etuliite === '"') return true;
  /* Koodin jatke: avain alkaa kesken onclick-attribuutin JS-lausetta, esim.
     `\',\'arviointi\')">✓ Aseta jaksofokukseksi`. Näkyvä teksti ei koskaan ala
     lainausmerkillä/pilkulla/sulkeella JA sisällä `>`:ää ennen itseään. */
  if (/^[\\'",)]/.test(etuliite)) return true;
  if (etuliite.includes('=')) return true;                       // attribuuttisijoitus
  return /^[;\s]*[a-zA-Z-]+\s*:/.test(etuliite);                 // CSS-deklaraatio
}

export function palastele(k) {
  const ulos = [];
  let jaljella = k;

  /* 1) katkennut tagin LOPPU avaimen alussa */
  const lf = jaljella.match(/^([^<>]*)>/);
  if (lf && tagimainen(lf[1])) { ulos.push({ t: 'markup', v: lf[0] }); jaljella = jaljella.slice(lf[0].length); }

  /* 2) katkennut fragmentti avaimen LOPUSSA: tagin alku tai sulkeva '">' */
  let hanta = '';
  const af = jaljella.match(ALKUFRAG);
  if (af) { hanta = af[0]; jaljella = jaljella.slice(0, jaljella.length - hanta.length); }
  else if (!jaljella.includes('<')) {
    const lq = jaljella.match(LOPPUQ);
    if (lq) { hanta = lq[0]; jaljella = jaljella.slice(0, jaljella.length - hanta.length); }
  }

  /* 3) keskiosa: kokonaiset tagit ja niiden väliset tekstit */
  let i = 0, m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(jaljella))) {
    if (m.index > i) ulos.push({ t: 'teksti', v: jaljella.slice(i, m.index) });
    ulos.push({ t: 'markup', v: m[0] });
    i = m.index + m[0].length;
  }
  if (i < jaljella.length) ulos.push({ t: 'teksti', v: jaljella.slice(i) });
  if (hanta) ulos.push({ t: 'markup', v: hanta });

  /* 4) attribuuttitekstit markup-palojen sisältä omiksi teksti-paloiksi */
  const lop = [];
  for (const p of ulos) {
    if (p.t !== 'markup') { lop.push(p); continue; }
    let osa = p.v, a;
    while ((a = osa.match(ATTR)) && merkitseva(a[1])) {
      const alku = osa.indexOf(a[0]);
      lop.push({ t: 'markup', v: osa.slice(0, alku + a[0].indexOf('"') + 1) });
      lop.push({ t: 'teksti', v: a[1] });
      osa = osa.slice(alku + a[0].length - 1);
    }
    if (osa) lop.push({ t: 'markup', v: osa });
  }
  /* 5) yhdistä vierekkäiset markup-palat yhdeksi literaaliksi */
  const yhd = [];
  for (const p of lop) {
    if (p.v === '') continue;
    const e = yhd[yhd.length - 1];
    if (e && e.t === 'markup' && p.t === 'markup') { e.v += p.v; continue; }
    yhd.push({ t: p.t, v: p.v });
  }
  return yhd;
}

const onMarkupAvain = (k) => palastele(k).some((p) => p.t === 'markup');
const rakenne = (ps) => ps.map((p) => (p.t === 'markup' ? 'M:' + p.v : 'T')).join('\u0000');
const jsLit = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const dekoodaa = (raw) => raw.replace(/\\(['\\])/g, '$1');

/* Itsetarkistus: palat kasaavat aina alkuperäisen. */
for (const k of ['">Ehdota:', 'arvioitu">', '>Kaikki', '· ka <span style="color:',
  ';margin-left:auto" title="Kasvutahti (≥7,2 cm/v = loukkaantumisriski)">',
  '< 40 → klinikkajatkumo (§14)', 'pelaajaa 🔴 (pallo hidastaa > 1.5 s) ▾', '— epävarma (<3)']) {
  const kasattu = palastele(k).map((p) => p.v).join('');
  if (kasattu !== k) throw new Error('palastelu ei palauta avainta: ' + JSON.stringify([k, kasattu]));
}

if (process.argv.includes('--itsetesti')) {
  for (const k of ['< 40 → klinikkajatkumo (§14)', 'pelaajaa 🔴 (pallo hidastaa > 1.5 s) ▾', '— epävarma (<3)']) {
    console.log(JSON.stringify(k), '→ markup?', onMarkupAvain(k));
  }
  process.exit(0);
}

/* ── Kohteet ── */
const KOHTEET = [
  { html: 'TalentMaster_VP_v25.html', fn: 'vpT', lib: 'lib/tm_vp_i18n.js', nimi: 'TM_VP_I18N', json: 'docs/VP_SV_KAANNOSMUISTI.json' },
  { html: 'TalentMaster_Master_v16.html', fn: 'masterT', lib: 'lib/tm_master_i18n.js', nimi: 'TM_MASTER_I18N', json: 'docs/MASTER_SV_KAANNOSMUISTI.json' },
];
const YHTEINEN = vaadi(join(juuri, 'lib/tm_i18n_common.js')).TM_I18N_COMMON.sv || {};
/* Kääntäjän erä: sv näille fragmenteille (Kim/Gemini). Vain SIIRTOA, ei käännöstä. */
let ERA = {};
try { ERA = JSON.parse(readFileSync(join(juuri, '..', '..', '..', 'Claude outputs/i18n_vaihe2/sv_RECOMPOSE_markup.json'), 'utf8')); } catch (e) { /* valinnainen */ }
/* #604:ssä kytketty SANKTIOITU erä. Kun markup-avaimen sisään jäänyt vanha ruotsi
   eroaa tästä, kyseessä EI ole ratkaisematon ristiriita vaan jo tehty päätös:
   sanktioitu arvo voittaa ja vanha markup-arvo hylätään. Ilman tätä sääntöä portti
   estäisi juuri ne avaimet joiden käännös on jo päätetty. */
let SANKTIOITU = {};
try { SANKTIOITU = JSON.parse(readFileSync(join(juuri, '..', '..', '..', 'Claude outputs/i18n_vaihe2/sv_LOPULLINEN_kytkettavat.json'), 'utf8')); } catch (e) { /* valinnainen */ }
/* #604:ssä LUKITUT päätökset (osa 2 korvaukset + osa 3 hylkäykset). Näissäkin kartan
   arvo on jo päätetty, joten markup-avaimeen jäänyt vanha muoto hylätään — ei estetä.
   Lukittu myös portissa tests/i18n_vaihe2_sv_kytkenta.test.js. */
const PAATETYT = new Set([
  'Mitattu', 'Viim. kirjaus', 'Lapsuus', 'Nuoruus', '✓ Tulossa',   // osa 2
  'Audit-valmius', 'Avaa pelaajakortti',                            // osa 3
]);

const tila = { siirretty: 0, kaareetPois: 0, dedup: 0, yhteinen: 0, esto: [] };
const tulokset = [];

for (const K of KOHTEET) {
  const alku = lue(K.html);
  const re = new RegExp(K.fn + "\\('((?:[^'\\\\]|\\\\.)*)'\\)", 'g');
  const osumat = [...alku.matchAll(re)];
  const kartat = { lib: vaadi(join(juuri, K.lib))[K.nimi].sv, json: JSON.parse(lue(K.json)) };

  /* VAIHE 1 — ehdokkaat: avaimet joissa on markkupia */
  const ehdokkaat = new Map();          // vanha avain -> [tekstipalat]
  for (const m of osumat) {
    const avain = dekoodaa(m[1]);
    if (!onMarkupAvain(avain)) continue;
    ehdokkaat.set(avain, palastele(avain));
  }

  /* VAIHE 2 — validointi ENNEN muutosta */
  const esto = new Set();
  const svPala = (avain, arvo) => {
    const fiPs = ehdokkaat.get(avain);
    const svPs = palastele(arvo);
    if (rakenne(fiPs) !== rakenne(svPs)) return null;       // portti 1
    return svPs;
  };
  for (const [avain] of ehdokkaat) {
    for (const nimi of ['lib', 'json']) {
      const arvo = kartat[nimi][avain] !== undefined ? kartat[nimi][avain] : ERA[avain];
      if (arvo === undefined) continue;
      if (!svPala(avain, arvo)) { esto.add(avain); tila.esto.push(['rakenne', avain]); }
    }
  }
  /* portit 2–4: tekstiavaimen sv-ristiriidat */
  const ehdotettu = new Map();          // uusi tekstiavain -> sv
  for (const [avain, fiPs] of ehdokkaat) {
    if (esto.has(avain)) continue;
    const arvo = kartat.lib[avain] !== undefined ? kartat.lib[avain] : ERA[avain];
    if (arvo === undefined) continue;
    const svPs = svPala(avain, arvo);
    fiPs.forEach((p, i) => {
      if (p.t !== 'teksti' || !merkitseva(p.v)) return;
      const uusiAvain = p.v, uusiSv = svPs[i].v;
      if (YHTEINEN[uusiAvain] !== undefined && YHTEINEN[uusiAvain] !== uusiSv) {
        esto.add(avain); tila.esto.push(['yhteiskartta', uusiAvain]); return;
      }
      const olemassa = kartat.lib[uusiAvain];
      if (olemassa !== undefined && olemassa !== uusiSv && !ehdokkaat.has(uusiAvain)
          && SANKTIOITU[uusiAvain] === undefined && !PAATETYT.has(uusiAvain)) {
        esto.add(avain); tila.esto.push(['olemassa', uusiAvain + ' :: ' + olemassa + ' vs ' + uusiSv]); return;
      }
      if (ehdotettu.has(uusiAvain) && ehdotettu.get(uusiAvain) !== uusiSv) {
        esto.add(avain); tila.esto.push(['torma', uusiAvain]); return;
      }
      ehdotettu.set(uusiAvain, uusiSv);
    });
  }

  /* VAIHE 3 — lähteen muunnos */
  const muunnokset = [];
  for (const m of osumat) {
    const avain = dekoodaa(m[1]);
    const fiPs = ehdokkaat.get(avain);
    if (!fiPs || esto.has(avain)) continue;
    /* Raakamuoto: palastele RAAKA literaali, jotta escapet säilyvät sellaisinaan. */
    const raakaPs = palastele(m[1]);
    if (raakaPs.map((p) => p.v).join('') !== m[1]) continue;      // varmistus
    const osat = raakaPs.map((p) => (p.t === 'teksti' && merkitseva(p.v)
      ? K.fn + "('" + p.v + "')"
      : jsLit(p.v)));
    if (!osat.some((o) => o.startsWith(K.fn + "('"))) tila.kaareetPois++;
    muunnokset.push({ start: m.index, end: m.index + m[0].length, korvaus: osat.join(' + ') });
  }
  let uusiHtml = alku;
  for (const t of muunnokset.slice().sort((a, b) => b.start - a.start)) {
    uusiHtml = uusiHtml.slice(0, t.start) + t.korvaus + uusiHtml.slice(t.end);
  }

  /* VAIHE 4 — kartat */
  const onLahteessa = (avain) => uusiHtml.includes(avain) || uusiHtml.includes(jsLit(avain).slice(1, -1));
  function paatokset(kartta) {
    const ulos = new Map();
    const jo = new Set(Object.keys(kartta).filter((k) => !ehdokkaat.has(k) || esto.has(k)));
    for (const [avain, arvo] of Object.entries(kartta)) {
      if (ehdokkaat.has(avain) && !esto.has(avain)) {
        const svPs = svPala(avain, arvo);
        const fiPs = ehdokkaat.get(avain);
        const parit = [];
        fiPs.forEach((p, i) => { if (p.t === 'teksti' && merkitseva(p.v)) parit.push([p.v, svPs[i].v]); });
        ulos.set(avain, { tyyppi: 'jaa', parit, jo });
        continue;
      }
      if (onMarkupAvain(avain) && !onLahteessa(avain)) { ulos.set(avain, { tyyppi: 'poista' }); continue; }
      ulos.set(avain, { tyyppi: 'sailyta' });
    }
    return ulos;
  }
  const libP = paatokset(kartat.lib);
  const jsonP = paatokset(kartat.json);

  const uusiJson = {};
  for (const [avain, arvo] of Object.entries(kartat.json)) {
    const p = jsonP.get(avain);
    if (p.tyyppi === 'poista') continue;
    if (p.tyyppi === 'jaa') {
      for (const [fi, sv] of p.parit) {
        if (fi in uusiJson) continue;                       // jo kirjattu
        if (kartat.json[fi] !== undefined) continue;        // säilyy omana rivinään
        uusiJson[fi] = sv;
      }
      continue;
    }
    uusiJson[avain] = arvo;
  }

  const rivi = /^(\s*)'((?:[^'\\]|\\.)*)':\s*'((?:[^'\\]|\\.)*)',?([ \t]*\/\/.*)?$/;
  const libRivit = lue(K.lib).split('\n');
  /* KAKSI VAIHETTA. Yksivaiheinen kirjoitus tuotti duplikaattiavaimia: pari saatettiin
     emitoida ennen kuin sama avain kohdattiin omana rivinään myöhemmin (tai toisesta
     markup-rivistä). Kerätään siksi ENSIN kaikki paikoilleen jäävät avaimet. */
  const pidettavat = new Set();
  for (const r of libRivit) {
    const m = r.match(rivi);
    if (!m) continue;
    const p = libP.get(dekoodaa(m[2]));
    if (!p || p.tyyppi === 'sailyta') pidettavat.add(dekoodaa(m[2]));
  }
  const emitoidut = new Set();
  const uusiLib = [];
  for (const r of libRivit) {
    const m = r.match(rivi);
    if (!m) { uusiLib.push(r); continue; }
    const avain = dekoodaa(m[2]);
    const p = libP.get(avain);
    if (!p || p.tyyppi === 'sailyta') { uusiLib.push(r); continue; }
    if (p.tyyppi === 'poista') continue;
    for (const [fi, sv] of p.parit) {
      if (YHTEINEN[fi] !== undefined) { tila.yhteinen++; continue; }   // yhteiskartta voittaa
      if (pidettavat.has(fi) || emitoidut.has(fi)) { tila.dedup++; continue; }   // rivi on jo/ tulee
      emitoidut.add(fi);
      uusiLib.push(m[1] + jsLit(fi) + ': ' + jsLit(sv) + ',');
      tila.siirretty++;
    }
  }

  tulokset.push({ K, uusiHtml, uusiJson, uusiLib: uusiLib.join('\n'),
    kpl: muunnokset.length, ehdokkaita: ehdokkaat.size, estetty: esto.size });
}

console.log(APPLY ? '=== AJO (--apply) ===' : '=== KUIVA-AJO ===');
for (const T of tulokset) {
  console.log(T.K.html, '· markup-avaimia', T.ehdokkaita, '· muunnettuja kutsuja', T.kpl, '· estetty', T.estetty);
}
console.log('sv-palasiirtoja :', tila.siirretty);
console.log('kääre poistettu :', tila.kaareetPois, '(pelkkää markkupia)');
console.log('yhteiskartalle  :', tila.yhteinen, '· dedup:', tila.dedup);
console.log('ESTOT           :', tila.esto.length);
const ryhmat = {};
tila.esto.forEach(([s]) => { ryhmat[s] = (ryhmat[s] || 0) + 1; });
console.log('   ', JSON.stringify(ryhmat));
tila.esto.slice(0, 12).forEach(([s, k]) => console.log('    [' + s + '] ' + JSON.stringify(String(k).slice(0, 110))));

if (!APPLY) { console.log('\n(kuiva-ajo)'); process.exit(0); }
for (const T of tulokset) {
  writeFileSync(join(juuri, T.K.html), T.uusiHtml);
  writeFileSync(join(juuri, T.K.json), JSON.stringify(T.uusiJson, null, 2) + '\n');
  writeFileSync(join(juuri, T.K.lib), T.uusiLib);
  console.log('kirjoitettu:', T.K.html);
}
