'use strict';
/**
 * VALMENNUSAPURI · K1 kustannus (CODE_BRIEF_K1_APURI_KUSTANNUS, 29.10.2026) — puhtaat apufunktiot.
 *   pilkoOsiot        tietopohjan tiedostot → osiot `## `-otsikoiden kohdalta (sisältöä ei muuteta)
 *   valitseOsiot      ydin aina + kysymykseen osuvat osiot merkkibudjettiin asti; epävarmassa → koko tietopohja
 *   rakennaSystemOsiot system-lohkot; K1c: välimuisti vain [ohjeistus + ydin] -lohkolle
 *   hintaArvio        tokenit → $ (hinnasto parametrina)
 * Ei I/O:ta → yksikkötestattava (functions/test/valmennusapuri.test.js).
 * Budjetti (merkkiä) sisältää ytimen: VA 60 000 ≈ 17 000 tokenia, HP 120 000 ≈ 34 000 (HP:n ydin yksin on ~77 000).
 */

// ── Aihesanat (siirretty valmennusapuri.js:stä; aihejako käyttää samoja) ─────
const AIHE_YDIN = ['00', '01'];
const AIHE_PAKETIT = {
  fysiikka: ['30', '40', '41', '42', '50'],
  tekniikka: ['10', '11', '12', '13', '14', '50'],
  joukkue: ['10', '11', '12', '13', '14', '20', '21', '30', '50'],   // joukkueteemat linkittyvät yksilön konsepteihin → ei fysiikkatiedostoja
};
const AIHE_SANAT = {
  fysiikka: /voima|fysiikka|fyysi|testi|nopeus|sprint|hyppy|kestävyys|liikkuvuus|kartoitus|harjoitettavuus|\b30 ?m\b|\b5 ?rm\b|kuorma|painot|lisäpaino|kuminauha|ennätys|tavoitetaso|\bmas\b|kasvupyrähd|\bphv\b|kasvumittaus|nordic|copenhagen|ponnist|ketteryys|portti|matriisi|lihaskunto/i,
  tekniikka: /tekniik|konseptipeli|konsepti|yksilöharjoit|syöttö|vastaanot|harhaut|kuljetus|1v1|\b(?:Y|J)-[HPSE]\d/i,
  joukkue: /taktiik|prässi|pressi|avaus|erikoistilan|kulmapotk|vapaapotk|pelitapa|pelimalli|puolustaminen|hyökkääminen|siirtymäpeli|joukkueteema|pelaamisen malli/i,
};
const AIHE_KAIKKI = /kausisuunn|vuosisuunn|\bkausi|periodis|kehityskeskust|arviointi|\bIDP\b|yleiskuva|kokonaisuus/i;

// Ydin: aina mukana (tiedostonimen alku). HP:n opas_00/opas_01 = valmennusoppaan järjestelmä + koodisto.
const YDIN = {
  valmennusapuri: ['00_', '01_'],
  hp: ['00_aani', '10_periaatteet', '20_termit_sv', 'opas_00_', 'opas_01_'],
};
const KYNNYS = 3;   // osio on osuma vasta tästä pistemäärästä (otsikko-osuma, konsepti tai ikä/pelimuoto)
const STOP = new Set(('miten mitä mikä mitkä millä mistä mihin minkä voiko voisi pitää pitäisi kanssa olla ovat olisi jotka joka jota tämä tässä tähän tätä mutta myös kuinka paljon sitten vielä kaikki kaikkia meidän minun sinun heidän niiden siitä siihen asti ennen jälkeen aikana hyvä hyviä esimerkki esimerkiksi kerro anna haluan tarvitsen ' +
  'vilka vilken vilket kan ska skulle borde måste med för och som det den att inte eller till från våra mina hans hennes deras efter före under mycket bara också finns göra gör hjälp').split(/\s+/));

function _slug(s) {
  return String(s || '').toLowerCase().replace(/[äå]/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'osio';
}
function _pohja(nimi) { return String(nimi || '').replace(/\.md$/, ''); }

const ISO_OSIO = 6000;   // tätä isompi osio pilkotaan seuraavan tason (### / ####) otsikoista, jos niitä on

function _leikkaa(s, re) {   // alkukohdat otsikoille; teksti ennen ensimmäistä otsikkoa = oma pala
  const alut = [];
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(s))) alut.push(m.index);
  if (!alut.length || alut[0] !== 0) alut.unshift(0);
  return alut.map(function (a, i) { return s.slice(a, i + 1 < alut.length ? alut[i + 1] : s.length); });
}
function _palat(s) {   // `## ` → isot palat vielä `### ` → `#### ` (vain jos taso löytyy palasta)
  let palat = _leikkaa(s, /^## .*$/gm);
  [/^### .*$/gm, /^#### .*$/gm].forEach(function (re) {
    palat = [].concat.apply([], palat.map(function (p) {
      re.lastIndex = 0;
      return p.length > ISO_OSIO && re.test(p.slice(1)) ? _leikkaa(p, re) : [p];
    }));
  });
  return palat;
}

/**
 * Tiedostot [{nimi, sisalto}] → osiot [{id, tiedosto, otsikko, teksti, merkit}]. Pilkkominen `## `-otsikoista;
 * yli ISO_OSIO-merkkiset osiot lisäksi `### `/`#### `-otsikoista. Osioiden tekstit peräkkäin = tiedosto sellaisenaan.
 */
function pilkoOsiot(tiedostot) {
  const ulos = [], kaytetyt = {};
  (tiedostot || []).slice().sort(function (a, b) { return a.nimi.localeCompare(b.nimi); }).forEach(function (t) {
    const s = String(t.sisalto || '');
    _palat(s).forEach(function (teksti) {
      const rivi = teksti.split('\n')[0], ots = rivi.match(/^#{2,4} (.+)$/);
      const otsikko = ots ? ots[1].trim() : ((s.match(/^# (.+)$/m) || [])[1] || '').trim();
      let id = _pohja(t.nimi) + '#' + (ots ? _slug(otsikko) : 'alku');
      if (kaytetyt[id]) { kaytetyt[id]++; id = id + '-' + kaytetyt[id]; } else kaytetyt[id] = 1;
      ulos.push({ id: id, tiedosto: t.nimi, otsikko: otsikko, teksti: teksti, merkit: teksti.length });
    });
  });
  return ulos;
}

function _onYdin(osio, rooli) {
  return (YDIN[rooli] || YDIN.valmennusapuri).some(function (p) { return _pohja(osio.tiedosto).indexOf(p) === 0; });
}
function _kysely(viestit) {   // viimeinen käyttäjän viesti + enintään 2 edellistä käyttäjän viestiä
  return (viestit || []).filter(function (v) { return v && v.role === 'user'; }).slice(-3)
    .map(function (v) { return String(v.content || ''); }).join('\n');
}
function _vartalo(sana) { return sana.length >= 7 ? sana.slice(0, 6) : sana; }   // taivutus: "haltuunotossa" ~ "haltuunotto"
function _sanat(teksti) {
  return (String(teksti).toLowerCase().match(/[\p{L}][\p{L}\d-]{3,}/gu) || []).filter(function (w) { return !STOP.has(w); });
}
/** Ikä ja pelimuoto: U8–U19, P13/T2014 (P/T + luku), 3v3/5v5/7v7/8v8/11v11 → normalisoidut merkit. */
function _ikaMerkit(teksti) {
  const ulos = new Set(), t = String(teksti).toLowerCase();
  (t.match(/\bu(?:[89]|1\d)\b/g) || []).forEach(function (x) { ulos.add(x); });
  (t.match(/\b[pt] ?(?:\d{2}|20\d{2})\b/g) || []).forEach(function (x) {
    x = x.replace(' ', ''); ulos.add(x);
    if (x.length === 3) ulos.add('u' + x.slice(1));   // P13 ~ U13
  });
  (t.match(/\b(?:3v3|5v5|7v7|8v8|11v11)\b/g) || []).forEach(function (x) { ulos.add(x); });
  return ulos;
}
/** Konseptit 01_koodisto- ja 10_yksilokonseptit-otsikoista ("## Y-H1 Haltuunotto", "#### Y-H1: HALTUUNOTTO"). */
function _konseptit(osiot) {
  const k = new Map();
  osiot.forEach(function (o) {
    if (!/(^|_)(01_koodisto|10_yksilokonseptit)/.test(_pohja(o.tiedosto))) return;
    const re = /^#{2,4}\s+((?:Y|J)-[HPSE]\d{1,2}[a-h]?|(?:T|LP|KK|KY|KH|LA|MV)-[HP]\d[a-h]?):?\s+(.+?)\s*$/gm;
    let m;
    while ((m = re.exec(o.teksti))) k.set(m[1].toLowerCase(), m[2].toLowerCase());
  });
  return k;
}
/** sv → fi -sanasto taulukoista (`| fi | sv |`), esim. HP:n 20_termit_sv. Avain = sv-sanan vartalo, arvo = fi-sanat. */
function _svSanasto(osiot) {
  const kartta = new Map();
  osiot.filter(function (o) { return /20_termit_sv/.test(o.tiedosto); }).forEach(function (o) {
    o.teksti.split('\n').forEach(function (r) {
      const s = r.split('|').map(function (x) { return x.trim(); });
      if (s.length < 4 || !s[1] || !s[2] || /^-+$/.test(s[1]) || s[1] === 'fi') return;
      const fi = _sanat(s[1].replace(/\(.*?\)/g, ''));
      _sanat(s[2].replace(/\(.*?\)/g, '')).forEach(function (sv) { kartta.set(_vartalo(sv), (kartta.get(_vartalo(sv)) || []).concat(fi)); });
    });
  });
  return kartta;
}
function _numero(tiedosto) { const m = String(tiedosto).match(/^(?:opas_)?(\d\d)_/); return m ? m[1] : null; }

/**
 * Valinta. Palauttaa { kaikki, syy, ydin, valitut, merkit }.
 *   kaikki=true (syy 'aihe-kaikki' | 'ei-osumia') → ydin + kaikki muut osiot (koko tietopohja).
 *   kaikki=false, syy 'osiot' → ydin + parhaat osiot; ytimen ja valittujen merkit yhteensä ≤ budjetti.
 *   kaikki=false, syy 'ei-mahdu' → osumia oli, mutta mikään ei mahtunut: vain ydin (+ huomautus), valitut = [].
 */
function valitseOsiot(osiot, viestit, budjetti, rooli) {
  const kaikkiOsiot = osiot || [];
  const ydin = kaikkiOsiot.filter(function (o) { return _onYdin(o, rooli); });
  const muut = kaikkiOsiot.filter(function (o) { return !_onYdin(o, rooli); });
  const summa = function (l) { return l.reduce(function (s, o) { return s + o.merkit; }, 0); };
  const koko = function (syy) { return { kaikki: true, syy: syy, ydin: ydin, valitut: muut, merkit: summa(ydin) + summa(muut) }; };
  const kysely = _kysely(viestit);
  if (!kysely.trim() || AIHE_KAIKKI.test(kysely)) return koko('aihe-kaikki');

  const sv = _svSanasto(kaikkiOsiot);
  const termit = new Set();
  _sanat(kysely).forEach(function (w) {
    termit.add(_vartalo(w));
    (sv.get(_vartalo(w)) || []).forEach(function (fi) { termit.add(_vartalo(fi)); });
  });
  const kq = kysely.toLowerCase();
  const konseptit = [];
  _konseptit(kaikkiOsiot).forEach(function (nimi, koodi) {
    if (kq.indexOf(koodi) >= 0 || kq.indexOf(nimi) >= 0 || (nimi.indexOf(' ') < 0 && nimi.length >= 7 && kq.indexOf(_vartalo(nimi)) >= 0)) konseptit.push([koodi, nimi]);
  });
  const ika = _ikaMerkit(kysely);
  const aiheet = Object.keys(AIHE_SANAT).filter(function (k) { return AIHE_SANAT[k].test(kysely); });

  const pisteet = muut.map(function (o, i) {
    const t = o.teksti.toLowerCase(), ots = o.otsikko.toLowerCase();
    let p = 0;
    termit.forEach(function (w) { if (ots.indexOf(w) >= 0) p += 3; else if (t.indexOf(w) >= 0) p += 1; });
    konseptit.forEach(function (k) { if (t.indexOf(k[0]) >= 0 || t.indexOf(k[1]) >= 0) p += 6; });
    if (ika.size) { const oi = _ikaMerkit(o.teksti); ika.forEach(function (x) { if (oi.has(x)) p += 3; }); }
    const nro = _numero(o.tiedosto);
    aiheet.forEach(function (a) { if (nro && AIHE_PAKETIT[a].indexOf(nro) >= 0) p += 1; });
    return { o: o, i: i, p: p };
  }).filter(function (x) { return x.p >= KYNNYS; });
  if (!pisteet.length) return koko('ei-osumia');

  pisteet.sort(function (a, b) { return b.p - a.p || a.o.merkit - b.o.merkit; });
  let kaytetty = summa(ydin);
  const valitut = [];
  pisteet.forEach(function (x) { if (kaytetty + x.o.merkit <= budjetti) { valitut.push(x); kaytetty += x.o.merkit; } });
  // Osumia oli, mutta yksikään ei mahdu: vain ydin + huomautus (Tero 29.10.: ei koko tietopohjaa).
  if (!valitut.length) return { kaikki: false, syy: 'ei-mahdu', ydin: ydin, valitut: [], merkit: kaytetty };
  valitut.sort(function (a, b) { return a.i - b.i; });
  return { kaikki: false, syy: 'osiot', ydin: ydin, valitut: valitut.map(function (x) { return x.o; }), merkit: kaytetty };
}

function _tiedostoina(osiot) {   // peräkkäiset saman tiedoston osiot yhteen <tiedosto>-elementtiin (sama muoto kuin rakennaSystem)
  const ryhmat = [];
  osiot.forEach(function (o) {
    const v = ryhmat[ryhmat.length - 1];
    if (v && v.nimi === o.tiedosto) v.osat.push(o.teksti); else ryhmat.push({ nimi: o.tiedosto, osat: [o.teksti] });
  });
  return ryhmat.map(function (r) { return '<tiedosto nimi="' + r.nimi + '">\n' + r.osat.join('') + '\n</tiedosto>'; }).join('\n\n');
}
const HUOMAUTUS_OSA = '<huomautus>Tässä kutsussa on mukana vain osa tietopohjasta: ydin ja kysymykseen liittyvät osiot. ' +
  'Jos vastaus vaatisi osaa, jota ei ole mukana, sano lyhyesti mitä et tämän kysymyksen pohjalta voi vastata ja pyydä käyttäjää kysymään se erikseen.</huomautus>\n';

/** cache_control-olio: ttl '1h' vain kun lippu on päällä (malli, joka ei tue sitä, palauttaa ValidationExceptionin). */
function valimuisti(ttl) { return ttl === '1h' ? { type: 'ephemeral', ttl: '1h' } : { type: 'ephemeral' }; }

/**
 * opts.vmYdin (K1c): [ohjeistus + ydin] cache_control → [valitut osiot] ilman. Muuten sama rakenne kuin ennen:
 * [ohjeistus] + [koko valinta, cache_control]. Koko tietopohja (valinta.kaikki) pysyy aina vanhassa rakenteessa:
 * ~145 k merkkiä ilman välimuistia maksaisi enemmän kuin kerran kirjoitettu ja usein luettu välimuisti.
 */
function rakennaSystemOsiot(ohjeistus, valinta, opts) {
  const o = opts || {}, huom = valinta.kaikki ? '' : HUOMAUTUS_OSA, cc = valimuisti(o.ttl);
  if (o.vmYdin && !valinta.kaikki) {
    const lohkot = [{ type: 'text', text: ohjeistus + '\n\n<tietopohja osa="ydin">\n' + huom + _tiedostoina(valinta.ydin) + '\n</tietopohja>', cache_control: cc }];
    if (valinta.valitut.length) lohkot.push({ type: 'text', text: '<tietopohja osa="valitut">\n' + _tiedostoina(valinta.valitut) + '\n</tietopohja>' });
    return lohkot;
  }
  const kaikki = valinta.ydin.concat(valinta.valitut).sort(function (a, b) { return a.tiedosto.localeCompare(b.tiedosto); });
  return [
    { type: 'text', text: ohjeistus },
    { type: 'text', text: '<tietopohja>\n' + huom + _tiedostoina(kaikki) + '\n</tietopohja>', cache_control: cc },
  ];
}

/** $ per kutsu. h = { syote, tuotos, vmKirj, vmLuku } $/M tokenia. Anthropicin input_tokens EI sisällä välimuistitokeneita. */
function hintaArvio(tokenit, h) {
  const t = tokenit || {};
  const usd = ((t.syote || 0) * h.syote + (t.tuotos || 0) * h.tuotos + (t.valimuistiKirjoitettu || 0) * h.vmKirj + (t.valimuistiLuettu || 0) * h.vmLuku) / 1e6;
  return Math.round(usd * 1e6) / 1e6;
}

/** Seurabudjetin kuukausi (Suomen aika): 'YYYY-MM'. */
function kuukausiAvain(nyt) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit' }).format(nyt || new Date());
}

module.exports = {
  AIHE_YDIN, AIHE_PAKETIT, AIHE_SANAT, AIHE_KAIKKI, YDIN,
  pilkoOsiot, valitseOsiot, rakennaSystemOsiot, valimuisti, hintaArvio, kuukausiAvain,
};
