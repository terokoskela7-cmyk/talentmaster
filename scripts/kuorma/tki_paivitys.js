'use strict';
/* tki_paivitys.js — jaettu apu: "mikä muuttui, kun profiilille kytkettiin tkiVaihtelu (#1306)?" ja Firestore-dokumentin vertailu generoituun.
 * Generaattori on deterministinen ja TKI-vaihtelu ei lisää r()-kutsuja → profiilin virta ilman tkiVaihtelua (= #1306:ta edeltävä staging-aineisto) ja virta sen kanssa kulkevat samassa
 * järjestyksessä samoilla poluilla; vain valittujen pelaajien (pelaajadokumentti + tekniikkakilpailu-testitulokset) data eroaa. Ajetaan rinnakkain (lockstep) → muisti vakio.
 * Ei Firestorea, ei kelloa. Käyttäjät: generoi_aineisto.js (--paivita-tki), tarkista_staging.js (otosvertailu). */

/** Firestore-arvo → vertailukelpoinen JSON-arvo (Timestamp/Date → ISO, avaimet järjestyksessä). */
function normaali(x) {
  if (x && typeof x.toDate === 'function') return x.toDate().toISOString();
  if (x instanceof Date) return x.toISOString();
  if (Array.isArray(x)) return x.map(normaali);
  if (x && typeof x === 'object') { const o = {}; Object.keys(x).sort().forEach((k) => { o[k] = normaali(x[k]); }); return o; }
  return x;
}
const sama = (a, b) => JSON.stringify(normaali(a)) === JSON.stringify(normaali(b));

/** Profiili ilman TKI-vaihtelua = staging-aineisto ennen #1306:ta. */
const ilmanTki = (profiili) => Object.assign({}, profiili, { tkiVaihtelu: false });

/** Kaksoisvirta: jokaiselle dokumentille { polku, vanha, uusi } (vanha = ilman tkiVaihtelua). Heittää, jos virrat eivät ole samassa järjestyksessä (determinismi rikki). */
function* parivirta(A, profiili, siemen) {
  const a = A.generoi(ilmanTki(profiili), siemen), b = A.generoi(profiili, siemen);
  for (;;) {
    const x = a.next(), y = b.next();
    if (x.done || y.done) { if (x.done !== y.done) throw new Error('Virrat eri pituiset — generaattorin determinismi rikki.'); return; }
    if (x.value.polku !== y.value.polku) throw new Error('Virtojen polut eroavat — generaattorin determinismi rikki.');
    yield { polku: y.value.polku, vanha: x.value.data, uusi: y.value.data };
  }
}

/** Kentät (ylätaso), joiden arvo eroaa kahden dokumentin välillä (avainten unioni; puuttuva = undefined). */
function eroavatKentat(a, b) {
  const ks = new Set(Object.keys(a || {}).concat(Object.keys(b || {})));
  return [...ks].filter((k) => !sama((a || {})[k], (b || {})[k])).sort();
}

/** Luokittele Firestoren nykyinen dokumentti suhteessa generoituun vanhaan/uuteen versioon. TKI-kentät = ne kentät, jotka tkiVaihtelu muuttaa (vanha ≠ uusi) — ei nimimallia.
 *  → { tila: 'puuttuu' | 'jo' | 'vanha' | 'muokattu', tki:[kentät], paivita:[TKI-kentät joiden nykyarvo = vanha], muutErot:[ei-TKI-kentät, joissa nykyinen ≠ vanha (käsin/palvelimella muokattu)],
 *       tkiRistiriita:[TKI-kentät, joiden nykyarvo on muu kuin vanha tai uusi] }.  'muokattu' + tkiRistiriita tyhjä = merge-kelpoinen (vain TKI-kentät kirjoitetaan, muut säilyvät). */
function luokittele(vanha, uusi, nykyinen) {
  if (nykyinen == null) return { tila: 'puuttuu', tki: [], paivita: [], muutErot: [], tkiRistiriita: [] };
  const tki = eroavatKentat(vanha, uusi);
  if (sama(nykyinen, uusi)) return { tila: 'jo', tki, paivita: [], muutErot: [], tkiRistiriita: [] };
  const paivita = tki.filter((k) => sama(nykyinen[k], vanha[k]) && !sama(nykyinen[k], uusi[k]));
  const tkiRistiriita = tki.filter((k) => !sama(nykyinen[k], vanha[k]) && !sama(nykyinen[k], uusi[k]));
  const muutErot = eroavatKentat(nykyinen, vanha).filter((k) => tki.indexOf(k) < 0);
  return { tila: sama(nykyinen, vanha) ? 'vanha' : 'muokattu', tki, paivita, muutErot, tkiRistiriita };
}

/** Dokumentit, joiden data muuttuu tkiVaihtelun myötä → [{ polku, vanha, uusi }]. */
function tkiMuuttuneet(A, profiili, siemen) {
  const ulos = [];
  for (const d of parivirta(A, profiili, siemen)) if (!sama(d.vanha, d.uusi)) ulos.push(d);
  return ulos;
}

/** Otos: joka n:s dokumentti, enintään max kpl → [{ polku, vanha, uusi }]. */
function otos(A, profiili, siemen, max) {
  const yht = A.laske(profiili, siemen).yht, n = Math.max(1, Math.ceil(yht / max)), ulos = []; let i = 0;
  for (const d of parivirta(A, profiili, siemen)) { if (i++ % n === 0) ulos.push(d); }
  return ulos;
}

/** Hae dokumentit erissä (db.getAll) → Map polku → { exists, data }. */
async function haeDokumentit(db, polut, era) {
  const e = era || 300, ulos = new Map();
  for (let i = 0; i < polut.length; i += e) {
    const osa = polut.slice(i, i + e), snaps = await db.getAll.apply(db, osa.map((p) => db.doc(p)));
    snaps.forEach((s, j) => ulos.set(osa[j], { exists: !!s.exists, data: s.exists ? s.data() : null }));
  }
  return ulos;
}

module.exports = { normaali, sama, ilmanTki, parivirta, tkiMuuttuneet, otos, haeDokumentit, eroavatKentat, luokittele };
