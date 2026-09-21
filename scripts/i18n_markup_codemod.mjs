/**
 * i18n-MARKUP-ANSAN PURKU — vaihe 1 (luokka A).
 *
 * JUURISYY: i18n-massakäärössä VP:hen (ja 7 kohtaan Masteriin) kääriytyi kokonaisia
 * HTML-elementtejä käännösavaimiksi:
 *     vpT('<div style="…">Ei pelihavaintoja vielä — …</div>')
 * → markup on SEKÄ avaimessa ETTÄ sv-arvossa. Kun tyyli, luokka tai leveys muuttuu
 * fi-puolella, avain ei enää täsmää karttaan → ruotsinnos katoaa HILJAA (miss → fi).
 * Puolet kartan markup-avaimista oli jo orpoutunut juuri tällä mekanismilla.
 *
 * KORJAUS: `vpT`/`masterT` käärii vain käännettävän TEKSTIN; markup jää JS-konkatenointiin:
 *     '<div style="…">' + vpT('Ei pelihavaintoja vielä — …') + '</div>'
 * Tekstiavain on vakaa yli tyylimuutosten ja antaa kääntäjälle kokonaisen lauseen.
 *
 * RAJAUS — VAIN LUOKKA A: tasan yksi merkitsevä tekstijakso, tagit tasapainossa, EI
 * käännettävää attribuuttitekstiä (title/placeholder/aria-label/alt). Muut luokat
 * (attribuutit · monta tekstijaksoa · kesken tagia katkenneet) jäävät vaiheeseen 2:
 * ne vaativat lauseen uudelleenkoontia ja siten käännösputken.
 *
 * RUOTSIA EI ARVATA. Uusi sv-arvo poimitaan AINA vanhasta sv-arvosta samasta kohdasta,
 * ja vain jos tagirakenne on identtinen. Kaksi porttia estävät hiljaisen käännöskadon:
 *   1) RAKENNE-ERO → avainta ei migroida lainkaan (ei lähteessä eikä kartoissa).
 *   2) TÖRMÄYS (sama fi-teksti, ERI sanktioitu sv) → kumpaakaan ei migroida; kumman
 *      käännös voittaa, on kääntäjän päätös eikä skriptin.
 * Siksi validointi ajetaan ENNEN lähteen muuntamista: muunnos ja kartan päätös eivät
 * saa erota, muuten käännös katoaisi juuri niin kuin alkuperäisessä ansassa.
 *
 * Kartat: lib RIVIPOHJAISESTI (käännöspäätöksiä selittävät kommentit säilyvät),
 * JSON-muisti samoilla säännöillä (round-trip verifioitu byte-vakaaksi).
 *
 * Ajo:  node scripts/i18n_markup_codemod.mjs [--apply]
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const vaadi = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');

/* ── Avaimen analyysi ── */
const ATTR = /\b(title|placeholder|aria-label|alt)\s*=\s*(\\?["'])((?:(?!\2).)*)\2/;
const merkitseva = (s) => /[\p{L}\p{N}]/u.test(s);
const onMarkup = (k) => /<\/?[a-zA-Z][^>]*>/.test(k) || /^[^<]*>/.test(k) || /<[^>]*$/.test(k);
const midTag = (k) => (k.match(/</g) || []).length !== (k.match(/>/g) || []).length;

/** Markup-/tekstipalat. `<` ja `>` eivät ole JS-escapattuja → sama jako pätee
    raakaan literaaliin ja dekoodattuun arvoon. */
function palat(k) {
  const out = [];
  const re = /<[^>]*>/g;
  let i = 0, m;
  while ((m = re.exec(k))) {
    if (m.index > i) out.push({ t: 'teksti', v: k.slice(i, m.index) });
    out.push({ t: 'markup', v: m[0] });
    i = m.index + m[0].length;
  }
  if (i < k.length) out.push({ t: 'teksti', v: k.slice(i) });
  return out;
}
function luokkaA(k) {
  if (!onMarkup(k) || midTag(k)) return null;
  const ps = palat(k);
  for (const p of ps) {
    if (p.t !== 'markup') continue;
    const a = p.v.match(ATTR);
    if (a && merkitseva(a[3])) return null;
  }
  const osumat = ps.map((p, i) => [p, i]).filter(([p]) => p.t === 'teksti' && merkitseva(p.v));
  if (osumat.length !== 1) return null;
  return { ps, idx: osumat[0][1] };
}
const rakenne = (ps) => ps.filter((p) => p.t === 'markup').map((p) => p.v).join('\u0000');
const jsLit = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const dekoodaa = (raw) => raw.replace(/\\(['\\])/g, '$1');

const KOHTEET = [
  { html: 'TalentMaster_VP_v25.html', fn: 'vpT', lib: 'lib/tm_vp_i18n.js', nimi: 'TM_VP_I18N', json: 'docs/VP_SV_KAANNOSMUISTI.json' },
  { html: 'TalentMaster_Master_v16.html', fn: 'masterT', lib: 'lib/tm_master_i18n.js', nimi: 'TM_MASTER_I18N', json: 'docs/MASTER_SV_KAANNOSMUISTI.json' },
];

/* YHTEISKARTTA: sivukartta EI saa duplikoida `TM_I18N_COMMON`-avaimia (dedupe-vartija
   tests/i18n_common.test.js + kaavio_moduulit.test.js). Purettu tekstiavain osuu usein
   yhteiskartan yleissanaan ('Teema', 'Tallenna', 'Valmis') → se resolvoituu yhteiskartasta,
   eikä sitä saa kirjoittaa sivukarttaan. */
const YHTEINEN = vaadi(join(juuri, 'lib/tm_i18n_common.js')).TM_I18N_COMMON.sv || {};

const tila = { siirretty: 0, orvot: 0, dedup: 0, yhteinen: 0, estoRakenne: [], estoTorma: [], estoYhteinen: [], estoOlemassa: [] };
const tulokset = [];

for (const K of KOHTEET) {
  const alku = lue(K.html);
  const re = new RegExp(K.fn + "\\('((?:[^'\\\\]|\\\\.)*)'\\)", 'g');
  const osumat = [...alku.matchAll(re)];
  const kartat = {
    lib: vaadi(join(juuri, K.lib))[K.nimi].sv,
    json: JSON.parse(lue(K.json)),
  };

  /* ══ VAIHE 1 — EHDOKKAAT (luokka A lähteessä) ══ */
  const ehdokkaat = new Map();   // dekoodattu vanha avain -> dekoodattu uusi teksti
  for (const m of osumat) {
    const A = luokkaA(m[1]);
    if (A) ehdokkaat.set(dekoodaa(m[1]), dekoodaa(A.ps[A.idx].v));
  }

  /* ══ VAIHE 2 — VALIDOINTI ennen mitään muutosta ══ */
  const esto = new Set();
  /* (a) rakenne-ero kummassa tahansa kartassa → ei migroida lainkaan */
  for (const [vanha] of ehdokkaat) {
    const A = luokkaA(vanha);
    for (const kartta of Object.values(kartat)) {
      const arvo = kartta[vanha];
      if (arvo === undefined) continue;
      const svPs = palat(arvo);
      if (rakenne(svPs) !== rakenne(A.ps) || svPs.length !== A.ps.length) {
        esto.add(vanha);
        tila.estoRakenne.push(vanha);
      }
    }
  }
  /* (b) törmäys: sama uusi tekstiavain, ERI sanktioitu sv → kumpaakaan ei migroida.
     Kumman käännös voittaa, on kääntäjän päätös. */
  for (const kartta of Object.values(kartat)) {
    const nahty = new Map();   // uusiAvain -> [vanhaAvain, svTeksti]
    for (const [vanha, uusi] of ehdokkaat) {
      if (esto.has(vanha)) continue;
      const arvo = kartta[vanha];
      if (arvo === undefined) continue;
      const A = luokkaA(vanha);
      const svT = palat(arvo)[A.idx].v;
      if (nahty.has(uusi)) {
        const [toinen, toinenSv] = nahty.get(uusi);
        if (toinenSv !== svT) {
          esto.add(vanha); esto.add(toinen);
          tila.estoTorma.push([uusi, toinenSv, svT]);
        } else tila.dedup++;
        continue;
      }
      nahty.set(uusi, [vanha, svT]);
    }
  }
  /* (c) yhteiskartta-ristiriita: purettu tekstiavain on jo `TM_I18N_COMMON`issa MUTTA
     eri käännöksellä → migraatio vaihtaisi sv-tekstin hiljaa. Ei migroida. */
  for (const [vanhaAvain, uusiAvain] of ehdokkaat) {
    if (esto.has(vanhaAvain) || !(uusiAvain in YHTEINEN)) continue;
    for (const kartta of Object.values(kartat)) {
      const arvo = kartta[vanhaAvain];
      if (arvo === undefined) continue;
      const svT = palat(arvo)[luokkaA(vanhaAvain).idx].v;
      if (svT !== YHTEINEN[uusiAvain]) {
        esto.add(vanhaAvain);
        tila.estoYhteinen.push([uusiAvain, YHTEINEN[uusiAvain], svT]);
      }
    }
  }

  /* (d) purettu tekstiavain on JO kartassa omana rivinään MUTTA eri sanktioidulla
     käännöksellä (esim. 'Yksilökonsepti' → 'Individkoncept' vs markup-avaimen
     'Individuellt koncept'). Migraatio pudottaisi toisen ja VAIHTAISI näkyvän ruotsin.
     Kumpi jää, on kääntäjän päätös → ei migroida. */
  for (const [vanhaAvain, uusiAvain] of ehdokkaat) {
    if (esto.has(vanhaAvain)) continue;
    for (const kartta of Object.values(kartat)) {
      const oma = kartta[vanhaAvain];
      const olemassa = kartta[uusiAvain];
      if (oma === undefined || olemassa === undefined) continue;
      if (ehdokkaat.has(uusiAvain)) continue;          // itse myös ehdokas → (b) hoitaa
      const svT = palat(oma)[luokkaA(vanhaAvain).idx].v;
      if (svT !== olemassa) {
        esto.add(vanhaAvain);
        tila.estoOlemassa.push([uusiAvain, olemassa, svT]);
      }
    }
  }

  /* Karttojen välinen ristiriita: sama avain, eri uusi sv kummassakin kartassa on OK
     (lib ja JSON ovat eriytyneet), koska kumpikin migroidaan omasta arvostaan. */

  const migD = new Map([...ehdokkaat].filter(([v]) => !esto.has(v)));

  /* ══ VAIHE 3 — LÄHTEEN MUUNNOS (vain hyväksytyt) ══ */
  const muunnokset = [];
  for (const m of osumat) {
    const raaka = m[1];
    if (!migD.has(dekoodaa(raaka))) continue;
    const A = luokkaA(raaka);
    const ennen = A.ps.slice(0, A.idx).map((p) => p.v).join('');
    const teksti = A.ps[A.idx].v;
    const jalkeen = A.ps.slice(A.idx + 1).map((p) => p.v).join('');
    /* VARMISTUS: palat kasaavat avaimen täsmälleen → identiteetti-vpT:llä renderöity
       merkkijono on bitilleen sama kuin ennen muunnosta. */
    if (ennen + teksti + jalkeen !== raaka) throw new Error('kasaus ei palauta avainta: ' + raaka);
    const osat = [];
    if (ennen) osat.push(jsLit(ennen));
    osat.push(K.fn + "('" + teksti + "')");
    if (jalkeen) osat.push(jsLit(jalkeen));
    muunnokset.push({ start: m.index, end: m.index + m[0].length, korvaus: osat.join(' + ') });
  }
  let uusiHtml = alku;
  for (const t of muunnokset.slice().sort((a, b) => b.start - a.start)) {
    uusiHtml = uusiHtml.slice(0, t.start) + t.korvaus + uusiHtml.slice(t.end);
  }

  /* ══ VAIHE 4 — KARTTOJEN PÄÄTÖKSET ══
     LÖYDÖS: lib ja JSON ovat jo eriytyneet (VP: 1203 avainta vain libissä, 65 eri
     arvolla). LIB on ajonaikainen totuus (appi lataa sen), JSON on käännösmuisti →
     kumpikin migroidaan OMISTA arvoistaan. */
  /* ELÄVÄ = avaimen teksti esiintyy lähteessä MISSÄ TAHANSA, ei vain `vpT('…')`-kutsun
     argumenttina. Kaikki käännettävä ei tule kutsuliteraalista: esim. `TM_TESTI_OHJEET`
     on datataulukko, jonka HTML-kentät kierrätetään `vpT(ohje.teksti)`:n läpi ajonaikana.
     Kapeampi sääntö (vain kutsuargumentit) luokitteli ne orvoiksi ja poisti niiden
     sv-rivit — todettu regressiona sv-kattavuusportissa (V8l), ei arvauksena. */
  /* Vertailu MOLEMMISSA muodoissa: kartan avain on dekoodattu, mutta lähteessä sama
     merkkijono esiintyy JS-literaalina, jossa \' on escapattu. Pelkkä dekoodattu
     vertailu luokitteli escapatut avaimet orvoiksi ja poisti niiden sv-rivit
     (todettu sv-kattavuusportissa) — sama hiljainen käännöskato jota korjataan. */
  const onLahteessa = (avain) =>
    uusiHtml.includes(avain) || uusiHtml.includes(jsLit(avain).slice(1, -1));

  function paatokset(kartta) {
    const ulos = new Map();
    const emitoidut = new Set(Object.keys(kartta).filter((k) => !migD.has(k)));
    for (const [avain, arvo] of Object.entries(kartta)) {
      if (migD.has(avain)) {
        const uAvain = migD.get(avain);
        /* Yhteiskartta voittaa: älä duplikoi sivukarttaan (dedupe-vartija). */
        if (uAvain in YHTEINEN) { tila.yhteinen++; ulos.set(avain, { tyyppi: 'poista' }); continue; }
        /* Sama tekstiavain jo kartassa → yksi rivi riittää (arvon yhtäsuuruus varmistettu
           vaiheen 2 törmäysportissa). */
        if (emitoidut.has(uAvain)) { tila.dedup++; ulos.set(avain, { tyyppi: 'poista' }); continue; }
        emitoidut.add(uAvain);
        ulos.set(avain, { tyyppi: 'siirra', avain: uAvain, arvo: palat(arvo)[luokkaA(avain).idx].v });
        tila.siirretty++;
        continue;
      }
      if (onMarkup(avain) && !onLahteessa(avain)) {
        tila.orvot++;
        ulos.set(avain, { tyyppi: 'poista' });   // orpo: ei vastaa mitään lähteessä
        continue;
      }
      ulos.set(avain, { tyyppi: 'sailyta' });
    }
    return ulos;
  }
  const jsonPaatos = paatokset(kartat.json);
  const libPaatos = paatokset(kartat.lib);

  const uusiJson = {};
  for (const [avain, arvo] of Object.entries(kartat.json)) {
    const p = jsonPaatos.get(avain);
    if (p.tyyppi === 'poista') continue;
    if (p.tyyppi === 'siirra') { uusiJson[p.avain] = p.arvo; continue; }
    uusiJson[avain] = arvo;
  }

  /* PERÄSSÄ OLEVA KOMMENTTI on osa riviä: kartassa on rivejä muotoa
       'avain': 'värde',   // V8d: avain oli lähdekoodia ('+t+'), ei runtime-arvoa
     Ilman kommenttiryhmää kaava ei osu → rivi jäisi ENNALLEEN vaikka lähde
     muunnettiin. Se desynkronoisi kartan lähteestä eli tuottaisi täsmälleen sen
     hiljaisen käännöskadon jota tämä korjaus poistaa (todettu sv-kattavuusportissa). */
  const rivi = /^(\s*)'((?:[^'\\]|\\.)*)':\s*'((?:[^'\\]|\\.)*)',?([ \t]*\/\/.*)?$/;
  const uusiLib = [];
  for (const r of lue(K.lib).split('\n')) {
    const m = r.match(rivi);
    if (!m) { uusiLib.push(r); continue; }
    const p = libPaatos.get(dekoodaa(m[2]));
    if (!p || p.tyyppi === 'sailyta') { uusiLib.push(r); continue; }
    if (p.tyyppi === 'poista') continue;
    uusiLib.push(m[1] + jsLit(p.avain) + ': ' + jsLit(p.arvo) + ',' + (m[4] || ''));
  }

  tulokset.push({
    K, uusiHtml, uusiJson, uusiLib: uusiLib.join('\n'),
    kpl: muunnokset.length, uniikki: migD.size, estetty: esto.size,
    json: [Object.keys(kartat.json).length, Object.keys(uusiJson).length],
  });
}

/* ── Raportti ── */
console.log(APPLY ? '=== AJO (--apply) ===' : '=== KUIVA-AJO (ei kirjoiteta) ===');
for (const T of tulokset) {
  console.log(T.K.html);
  console.log('   muunnettuja kutsuja :', T.kpl, '(uniikkeja avaimia ' + T.uniikki + ')');
  console.log('   estettyjä avaimia   :', T.estetty);
  console.log('   JSON-muistin avaimia:', T.json[0], '→', T.json[1]);
}
console.log('sv-käännöksiä siirretty :', tila.siirretty, '(lib + JSON yhteensä)');
console.log('orpoja poistettu        :', tila.orvot, '(lib + JSON yhteensä)');
console.log('duplikaatteja yhdistetty:', tila.dedup);
console.log('yhteiskartalle jätetty  :', tila.yhteinen, '(ei duplikoida sivukarttaan)');
console.log('ESTO · olemassa oleva sv:', tila.estoOlemassa.length, '→ kääntäjän päätös');
tila.estoOlemassa.forEach(([k, a, b]) => console.log('    ' + JSON.stringify(k) + ': kartassa ' + JSON.stringify(a) + ' vs markup ' + JSON.stringify(b)));
console.log('ESTO · yhteiskartta-ero :', tila.estoYhteinen.length);
tila.estoYhteinen.forEach(([k, a, b]) => console.log('    ' + JSON.stringify(k) + ': yhteinen ' + JSON.stringify(a) + ' vs sivu ' + JSON.stringify(b)));
console.log('ESTO · rakenne-ero      :', tila.estoRakenne.length);
tila.estoRakenne.forEach((k) => console.log('    ' + JSON.stringify(k.slice(0, 90))));
console.log('ESTO · sv-törmäys       :', tila.estoTorma.length, '→ kääntäjän päätös, ei skriptin');
tila.estoTorma.forEach(([k, a, b]) => console.log('    ' + JSON.stringify(k) + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b)));

if (!APPLY) { console.log('\n(kuiva-ajo — aja --apply kirjoittaaksesi)'); process.exit(0); }

for (const T of tulokset) {
  writeFileSync(join(juuri, T.K.html), T.uusiHtml);
  writeFileSync(join(juuri, T.K.json), JSON.stringify(T.uusiJson, null, 2) + '\n');
  writeFileSync(join(juuri, T.K.lib), T.uusiLib);
  console.log('kirjoitettu:', T.K.html, '·', T.K.json, '·', T.K.lib);
}
