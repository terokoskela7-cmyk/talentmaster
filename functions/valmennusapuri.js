'use strict';
/**
 * VALMENNUSAPURI — pilotin Cloud Function (Vaihe 2)
 * ==================================================
 * Valmentaja kysyy → funktio lisää ohjeistuksen + tietopohjan (VALMENNUSOPAS) → Claude → vastaus.
 *
 * MIKSI OMA FUNKTIO EIKÄ aiProxy:
 *   aiProxy ottaa tehtävän ja datan selaimesta. Valmennusapurin system prompt (ohjeistus + koko
 *   tietopohja) EI SAA koskaan kulkea selaimen kautta: opasta ei luovuteta valmentajille. Siksi
 *   funktio lataa ohjeistuksen ja tietopohjan itse, palvelinpuolella.
 *
 * MISTÄ TIETOPOHJA TULEE:
 *   Cloud Storage, polku `valmennusapuri/` (oletus-bucket). EI git-repoon: repo on GitHubissa.
 *   Storage-säännöt estävät kaiken client-luvun (storage.rules: default deny) → vain tämä funktio
 *   (Admin SDK) lukee tiedostot.
 *     valmennusapuri/OHJEISTUS_v0.7.md          ← uusin versio valitaan automaattisesti
 *     valmennusapuri/tietopohja/00_jarjestelma.md … 50_arviointi_ja_kehityskeskustelu.md
 *
 * MALLI: oletuksena Claude AWS Bedrockista EU:ssa (Plan B, 28.9.2026). Vertex EU: VALMENNUSAPURI_PROVIDER=vertex. Kehityksessä voi
 *   käyttää suoraa Anthropic API:a: VALMENNUSAPURI_PROVIDER=anthropic (ANTHROPIC_API_KEY-secret).
 *   Plan B (2026-09-28): VALMENNUSAPURI_PROVIDER=bedrock → Claude AWS Bedrockista EU:ssa
 *   (eu-north-1, `eu.`-inference-profiili). Avaimet Secret Managerissa:
 *   AWS_BEDROCK_ACCESS_KEY_ID + AWS_BEDROCK_SECRET_ACCESS_KEY (IAM-käyttäjä talentmaster-aiproxy,
 *   vain bedrock:InvokeModel). Allekirjoitus SigV4 Noden cryptolla → ei AWS SDK -riippuvuutta.
 *   EU-VARTIJA: bedrock-kutsu estetään, jos alue ei ole eu-* tai malli-ID ei ole eu./in-region
 *   (global./us./apac. poistaisivat EU-rajan — alaikäisten data, ei neuvoteltavissa).
 *
 * PÄÄSY: super admin aina (CLAUDE.md §3) + pilottilista `valmennusapuri_pilotti/{uid}`
 *   ({ aktiivinen: true, seuraId, nimi, roolit? }). Muut → permission-denied.
 *
 * ROOLIT (2026-09-28): data.rooli = 'valmennusapuri' (oletus) | 'hp' (HP-johtaja).
 *   HP-johtajan ohjeistus + tietopohja: Storage `valmennusapuri/hp_johtaja/` (kootaan yksityisestä
 *   kansiosta kokoa_apuri.py:llä, EI repossa). HP-rooli: SA aina, pilottikäyttäjä vain jos
 *   pilottidokumentissa roolit: ['hp'].
 *
 * SYÖTTÖSUOJA (2026-09-28): ennen mallikutsua valmentajan viesteistä poistetaan seuran pelaajien
 *   nimet (pelaajarekisteristä, myös taivutetut muodot), "Etunimi Sukunimi-nen"-parit, PalloID- ja
 *   muut numerotunnisteet, henkilötunnukset, sähköpostit ja puhelinnumerot → [nimi] / [tunniste] /
 *   [yhteystieto]. Malli EI näe niitä, eikä loki tallenna niitä (loki saa vain lukumäärät).
 *
 * KONTEKSTI (HP-rooli): palvelin lisää viimeiseen viestiin rivin "Konteksti: …" pilottidokumentista
 *   (tehtava, lisenssi) ja seuran dokumentista (nimi, taso). Ei SA:lle eikä jos viesti alkaa jo
 *   "Konteksti:"-rivillä (testaus).
 *
 * LOKI: jokainen kysymys + vastaus → `valmennusapuri_loki/{id}` (laadunseuranta, NotebookLM-
 *   pistokokeet). Ei client-pääsyä (Firestore Rules: ei match-blokkia = deny); SA lukee Consolesta.
 *
 * Tämä moduuli EI koske firebase-adminiin latausvaiheessa → index.js:n offline-testit (e2e_node22)
 * lataavat sen ilman GCP-projektia. Kaikki I/O tulee kasittelija()-tehtaan riippuvuuksina.
 */

// ── Vakiot ──────────────────────────────────────────────────────────────────
const SA_UID = 'dqUzvJA61Wb9fgj5UiK0riSA4NI2';            // CLAUDE.md §3 — ei koskaan riko
const KIELET = ['fi', 'sv', 'en'];
const MAX_VIESTEJA = 12;                                    // historiasta mukaan viimeiset N viestiä
const MAX_MERKKEJA_VIESTI = 4000;
const MAX_MERKKEJA_YHTEENSA = 24000;
const MAX_TOKENS = 4000;
const TIETOPOHJA_CACHE_MS = 10 * 60 * 1000;

// Sama koodisto kuin testiajurissa (valmennusapuri/testaus/aja_testit.mjs)
const KOODI = /\b(?:Y|J)-[HPSE]\d{1,2}[a-h]?\b|\b(?:T|LP|KK|KY|KH|LA|MV)-[HP]\d[a-h]?\b/g;

// Bedrock-oletukset: Sonnet 4.6 EU-profiililla (Sonnet 5 vaatii AWS-tuen avauksen → vaihda
// VALMENNUSAPURI_MALLI=eu.anthropic.claude-sonnet-5... kun pääsy on auki, ks. Bedrock_EU_runbook.md).
const BEDROCK_OLETUSMALLI = 'eu.anthropic.claude-sonnet-4-6';
const BEDROCK_OLETUSALUE = 'eu-north-1';

function asetukset(env) {
  const e = env || process.env;
  // Oletus bedrock (28.9.2026): Vertex EU -kiintiö on 0. Oletus on koodissa eikä vain functions/.env:ssä,
  // koska CI-deploy (deploy-functions.yml) ei näe paikallista .env:iä → sama tulos koneelta ja CI:stä.
  const provider = (e.VALMENNUSAPURI_PROVIDER || 'bedrock').toLowerCase();
  const bedrock = provider === 'bedrock';
  return {
    provider: provider,
    malli: e.VALMENNUSAPURI_MALLI || (bedrock ? BEDROCK_OLETUSMALLI : 'claude-sonnet-5'),
    // Vertex: EU-monialue-endpoint (aiplatform.eu.rep.googleapis.com) — data pysyy EU:ssa. 'europe-west1' EI ole tuettu Claude Sonnet 5:lle.
    // Bedrock: AWS-alue (eu-north-1 = Tukholma).
    alue: e.VALMENNUSAPURI_ALUE || (bedrock ? BEDROCK_OLETUSALUE : 'eu'),
    projekti: e.GCLOUD_PROJECT || e.GCP_PROJECT || 'talentmaster-pilot',
    bucket: e.VALMENNUSAPURI_BUCKET || '',                  // tyhjä = Firebasen oletus-bucket
    polku: e.VALMENNUSAPURI_POLKU || 'valmennusapuri/',
    hpPolku: e.VALMENNUSAPURI_HP_POLKU || 'valmennusapuri/hp_johtaja/',
    paivaKiintio: Number(e.VALMENNUSAPURI_PAIVAKIINTIO || 40),
  };
}

// ── Virheet ─────────────────────────────────────────────────────────────────
function virhe(koodi, viesti) {
  const e = new Error(viesti);
  e.tmKoodi = koodi;
  return e;
}

// ── Puhtaat apufunktiot (testattavat) ───────────────────────────────────────

/** Validoi keskustelun. Palauttaa { viestit, kieli } tai heittää tmKoodi='invalid-argument'. */
function validoiKysely(data) {
  if (!data || !Array.isArray(data.viestit) || data.viestit.length === 0) {
    throw virhe('invalid-argument', 'viestit puuttuu');
  }
  const viestit = data.viestit.map(function (v) {
    if (!v || (v.role !== 'user' && v.role !== 'assistant') || typeof v.content !== 'string') {
      throw virhe('invalid-argument', 'virheellinen viesti');
    }
    const content = v.content.trim();
    if (!content) throw virhe('invalid-argument', 'tyhjä viesti');
    if (content.length > MAX_MERKKEJA_VIESTI) throw virhe('invalid-argument', 'viesti on liian pitkä');
    return { role: v.role, content: content };
  });
  if (viestit[viestit.length - 1].role !== 'user') {
    throw virhe('invalid-argument', 'viimeisen viestin pitää olla valmentajan');
  }
  const kieli = KIELET.indexOf(data.kieli) >= 0 ? data.kieli : 'fi';
  return { viestit: rajaaHistoria(viestit), kieli: kieli };
}

/** Pitää viimeiset MAX_VIESTEJA viestiä ja merkkikaton; ensimmäinen on aina valmentajan. */
function rajaaHistoria(viestit) {
  let v = viestit.slice(-MAX_VIESTEJA);
  while (v.length && v[0].role !== 'user') v = v.slice(1);
  let yhteensa = v.reduce(function (s, x) { return s + x.content.length; }, 0);
  while (yhteensa > MAX_MERKKEJA_YHTEENSA && v.length > 1) {
    yhteensa -= v[0].content.length;
    v = v.slice(1);
    while (v.length > 1 && v[0].role !== 'user') { yhteensa -= v[0].content.length; v = v.slice(1); }
  }
  // Rooleja ei saa olla kahta peräkkäin samaa → yhdistä
  const ulos = [];
  v.forEach(function (x) {
    if (ulos.length && ulos[ulos.length - 1].role === x.role) {
      ulos[ulos.length - 1] = { role: x.role, content: ulos[ulos.length - 1].content + '\n\n' + x.content };
    } else {
      ulos.push(x);
    }
  });
  return ulos;
}

/**
 * Varmistus: poistaa sisäiset koodit vastauksesta. Ohjeistus kieltää koodit jo, tämä on toinen
 * suojakerros. Poikkeus (ohjeistus sääntö 0): jos valmentaja käytti itse koodia, ei suodateta.
 */
function suodataKoodit(teksti, kayttajanTekstit) {
  const valmentajaKaytti = (kayttajanTekstit || []).some(function (t) {
    KOODI.lastIndex = 0;
    return KOODI.test(t);
  });
  KOODI.lastIndex = 0;
  if (valmentajaKaytti) return { teksti: teksti, poistettu: [] };
  const poistettu = teksti.match(KOODI) || [];
  if (!poistettu.length) return { teksti: teksti, poistettu: [] };
  const k = KOODI.source;
  const sulkeissa = new RegExp('\\s*\\(\\s*(?:' + k + ')(?:\\s*[,/–-]\\s*(?:' + k + '))*\\s*\\)', 'g');
  const kauttaviivalla = new RegExp('\\s*/\\s*(?:' + k + ')', 'g');
  const puhdas = teksti
    .replace(sulkeissa, '')
    .replace(kauttaviivalla, '')
    .replace(new RegExp('(?:' + k + ')\\s*[:–-]?\\s*', 'g'), '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;:!?)])/g, '$1');
  return { teksti: puhdas, poistettu: Array.from(new Set(poistettu)) };
}

/** Valitsee uusimman OHJEISTUS_vX.Y.md:n (numeerinen järjestys: v0.10 > v0.9). */
function valitseOhjeistus(nimet) {
  const versioidut = nimet.filter(function (n) { return /^OHJEISTUS_v[\d.]+\.md$/.test(n); })
    .sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
  return versioidut.length ? versioidut[versioidut.length - 1] : null;
}

/** Sama system-rakenne kuin laatutestauksessa (aja_testit.mjs) → testattu kokoonpano. */
function rakennaSystem(ohjeistus, tiedostot) {
  const tietopohja = tiedostot
    .slice()
    .sort(function (a, b) { return a.nimi.localeCompare(b.nimi); })
    .map(function (t) { return '<tiedosto nimi="' + t.nimi + '">\n' + t.sisalto + '\n</tiedosto>'; })
    .join('\n\n');
  return [
    { type: 'text', text: ohjeistus },
    { type: 'text', text: '<tietopohja>\n' + tietopohja + '\n</tietopohja>', cache_control: { type: 'ephemeral' } },
  ];
}

function ohjeVersio(ohjeistus) {
  const m = ohjeistus.match(/\(versio ([\d.]+)\)/);
  return m ? m[1] : '?';
}

/** Päiväkiintiön avain: uid + päivämäärä (Suomen aika). */
function paivanAvain(uid, nyt) {
  const pvm = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Helsinki' }).format(nyt || new Date());
  return uid + '_' + pvm;
}

/** Pyydetty rooli: puuttuva = valmennusapuri; tuntematon arvo = virhe (ei hiljaista oletusta). */
const ROOLIT = ['valmennusapuri', 'hp'];
function valitseRooli(data) {
  const r = data && data.rooli;
  if (r === undefined || r === null || r === '') return 'valmennusapuri';
  if (ROOLIT.indexOf(r) < 0) throw virhe('invalid-argument', 'tuntematon rooli');
  return r;
}

/** Käyttäjän roolit: SA kaikki; pilottikäyttäjä valmennusapuri + pilottidokumentin roolit. */
function roolitKayttajalle(onSA, pilottiData) {
  if (onSA) return ROOLIT.slice();
  const lisat = (pilottiData && Array.isArray(pilottiData.roolit)) ? pilottiData.roolit : [];
  return ROOLIT.filter(function (r) { return r === 'valmennusapuri' || lisat.indexOf(r) >= 0; });
}

/** Pääsypäätös: SA aina; muuten aktiivinen pilottidokumentti. */
function onKayttoOikeus(onSA, pilottiData) {
  if (onSA) return true;
  if (!pilottiData) return false;
  return pilottiData.aktiivinen !== false;
}

/** Mallin vastauksen tekstiosat + käyttötiedot. */
function puraVastaus(json) {
  const teksti = (json.content || [])
    .filter(function (b) { return b.type === 'text'; })
    .map(function (b) { return b.text; })
    .join('\n')
    .trim();
  const u = json.usage || {};
  return {
    teksti: teksti,
    syy: json.stop_reason || null,
    tokenit: {
      syote: u.input_tokens || 0,
      tuotos: u.output_tokens || 0,
      valimuistiLuettu: u.cache_read_input_tokens || 0,
      valimuistiKirjoitettu: u.cache_creation_input_tokens || 0,
    },
  };
}

// ── Syöttösuoja (henkilötiedot pois ennen mallikutsua) ──────────────────────
const SUOJA_KUVIOT = [
  ['yhteystieto', /[^\s@]+@[^\s@]+\.[a-z]{2,}/gi],                                   // sähköposti
  ['tunniste', /\b\d{6}[-+A-FU-Y]\d{3}[0-9A-Y]\b/gi],                                 // henkilötunnus
  ['yhteystieto', /(?:\+358|\b0)[\s-]?\d{1,3}(?:[\s-]?\d){5,8}\b/g],                 // puhelin
  ['tunniste', /\b\d{7,10}\b/g],                                                      // PalloID ym. numerotunnisteet
];
// "Etunimi Sukunimi" kun sukunimi päättyy -nen (yleisin suomalainen sukunimimuoto), myös taivutettuna.
const NEN_NIMI = /(?<!\p{L})\p{Lu}\p{Ll}+ \p{Lu}\p{Ll}*(?:nen|sen|se)\p{Ll}{0,5}(?!\p{L})/gu;

function _escRe(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Pelaajarekisterin nimistä kuviot, jotka tunnistavat myös taivutetut muodot (Matti → Matin, Matille). */
function nimiKuviot(nimet) {
  const osat = new Set();
  (nimet || []).forEach(function (n) {
    String(n || '').split(/[\s-]+/).forEach(function (o) {
      o = o.trim();
      if (o.length >= 3 && /^\p{Lu}/u.test(o)) osat.add(o);
    });
  });
  return Array.from(osat).map(function (o) {
    const runko = o.length <= 4 ? o : o.slice(0, o.length - 2);   // Aino → Aino…, Matti → Mat…, Virtanen → Virtan…
    return new RegExp('(?<!\\p{L})' + _escRe(runko) + '\\p{L}{0,8}(?!\\p{L})', 'gu');
  });
}

/** Puhdas: poistaa henkilötiedot tekstistä. Palauttaa tekstin ja lukumäärät (EI poistettuja arvoja). */
function syottosuoja(teksti, kuviot) {
  const maarat = { nimet: 0, tunnisteet: 0, yhteystiedot: 0 };
  let t = String(teksti || '');
  SUOJA_KUVIOT.forEach(function (k) {
    t = t.replace(k[1], function () { maarat[k[0] === 'tunniste' ? 'tunnisteet' : 'yhteystiedot']++; return '[' + k[0] + ']'; });
  });
  (kuviot || []).concat([NEN_NIMI]).forEach(function (re) {
    t = t.replace(re, function () { maarat.nimet++; return '[nimi]'; });
  });
  return { teksti: t, maarat: maarat };
}

// ── Seuran datan kooste HP-johtajalle (porras 1: agentti lukee, ei kirjoita) ──
// Vain koosteita: ei nimiä, ei yksittäisen pelaajan arvoja. Kasvuvaihe (terveystietoa) vain lukumäärinä.
const PHV_NIMET = { PRE: 'ennen kasvupyrähdystä', LAH: 'lähestyy', PH: 'huipussa', POST: 'ohi', AN: 'ohi yli vuoden' };

function _kk(pvm) {
  if (!pvm) return null;
  const d = pvm.toDate ? pvm.toDate() : new Date(pvm);
  if (isNaN(d.getTime())) return null;
  return String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + d.getUTCFullYear();
}
function _uusinEnsin(lista) {
  return lista.filter(function (x) { return x.pvm; })
    .sort(function (a, b) { return (b.pvm.toDate ? b.pvm.toDate() : new Date(b.pvm)) - (a.pvm.toDate ? a.pvm.toDate() : new Date(a.pvm)); });
}

/** Puhdas: seuran datasta lyhyt koosteteksti kontekstiriville. joukkueet = pilotin joukkueet (valinnainen). */
function koostaSeuranData(d, joukkueet) {
  d = d || {};
  const pelaajat = d.pelaajat || [];
  const kart = _uusinEnsin(d.kartoitukset || []);
  const testit = _uusinEnsin(d.testit || []);
  const osat = [];
  if (kart.length) {
    const nahty = new Set();
    const rivit = [];
    kart.forEach(function (k) {
      const avain = k.joukkue || 'joukkue ei tiedossa';
      if (nahty.has(avain) || rivit.length >= 4) return;
      nahty.add(avain);
      rivit.push(avain + ' ' + (_kk(k.pvm) || ''));
    });
    osat.push('harjoitettavuuskartoitus tehty (' + rivit.join(', ').trim() + ')');
  } else {
    osat.push('harjoitettavuuskartoitusta ei ole tehty');
  }
  const mitatut = pelaajat.filter(function (p) { return p.phv && PHV_NIMET[p.phv]; });
  osat.push(mitatut.length ? 'kasvumittaus ' + mitatut.length + '/' + pelaajat.length + ' pelaajalla' : 'kasvumittausta ei ole tehty');
  if (testit.length) osat.push('testitapahtumia ' + testit.length + ' (viimeisin ' + (_kk(testit[0].pvm) || '?') + ')');
  osat.push('kuormakirjaukset ei tiedossa');
  let teksti = 'Seuran data: ' + osat.join('; ') + '.';

  if (mitatut.length) {
    const rajatut = (joukkueet && joukkueet.length)
      ? mitatut.filter(function (p) { return joukkueet.indexOf(p.joukkue) >= 0; }) : mitatut;
    const ryhmat = {};
    rajatut.forEach(function (p) {
      const j = (joukkueet && joukkueet.length) ? p.joukkue : 'koko seura';
      ryhmat[j] = ryhmat[j] || {};
      ryhmat[j][p.phv] = (ryhmat[j][p.phv] || 0) + 1;
    });
    const kuvaukset = Object.keys(ryhmat).map(function (j) {
      return j + ': ' + Object.keys(PHV_NIMET).filter(function (k) { return ryhmat[j][k]; })
        .map(function (k) { return PHV_NIMET[k] + ' ' + ryhmat[j][k]; }).join(', ');
    });
    if (kuvaukset.length) teksti += ' Kasvuvaiheet (lukumäärät) – ' + kuvaukset.join('; ') + '.';
  }
  return teksti;
}

/** Puhdas: HP-johtajan kontekstirivi palvelimen tiedoista. null = ei riviä (ei pilottia eikä SA:n seuravalintaa). */
function rakennaKonteksti(onSA, pilotti, seura, dataTeksti) {
  if (!pilotti) return null;
  const osat = [pilotti.tehtava || 'valmentaja'];
  const seuraNimi = (seura && seura.nimi) || pilotti.seuraId;
  if (seuraNimi) osat.push('seura ' + seuraNimi + (seura && seura.taso ? ' (' + seura.taso + ')' : ''));
  osat.push(pilotti.lisenssi ? 'koulutus ' + pilotti.lisenssi : 'koulutus ei tiedossa');
  return 'Konteksti: ' + osat.join(', ') + '. ' + (dataTeksti || 'Seuran data: ei tiedossa.');
}

// Seuran pelaajanimet ja seuradokumentti (välimuisti 10 min / seura)
const _seuraCache = {};
async function haeSeuranTiedot(db, seuraId) {
  if (!seuraId) return { nimet: [], seura: null };
  const v = _seuraCache[seuraId];
  if (v && Date.now() - v.aika < TIETOPOHJA_CACHE_MS) return v.arvo;
  const seuraRef = db.collection('seurat').doc(seuraId);
  const [seuraSnap, pelSnap, kartSnap, testiSnap] = await Promise.all([
    seuraRef.get(),
    seuraRef.collection('pelaajat').get(),
    // select(): vain kooste-kentät, ei tuloksia eikä pelaajalistoja (testitapahtumassa on nimiä)
    seuraRef.collection('kartoitukset').select('joukkue', 'testauspvm').get().catch(function () { return null; }),
    seuraRef.collection('testitapahtumat').select('joukkue', 'pvm').get().catch(function () { return null; }),
  ]);
  const nimet = [];
  const pelaajat = [];
  pelSnap.forEach(function (d) {
    const x = d.data() || {};
    [x.nimi, x.etunimi, x.sukunimi, x.kutsumanimi].forEach(function (n) { if (n) nimet.push(n); });
    pelaajat.push({ joukkue: x.joukkue || null, phv: x.phv_tila || null });
  });
  const kartoitukset = [];
  if (kartSnap) kartSnap.forEach(function (d) { const x = d.data() || {}; kartoitukset.push({ joukkue: x.joukkue, pvm: x.testauspvm }); });
  const testit = [];
  if (testiSnap) testiSnap.forEach(function (d) { const x = d.data() || {}; testit.push({ joukkue: x.joukkue, pvm: x.pvm }); });
  const arvo = { nimet: nimet, seura: seuraSnap.exists ? seuraSnap.data() : null,
    data: { pelaajat: pelaajat, kartoitukset: kartoitukset, testit: testit } };
  _seuraCache[seuraId] = { aika: Date.now(), arvo: arvo };
  return arvo;
}

// ── Mallikutsu (Vertex EU, Bedrock EU tai suora Anthropic) ──────────────────────────────
function vertexUrl(a) {
  // 'global' -> yhteinen globaali endpoint. 'eu'/'us' -> monialue-endpoint (data pysyy alueella,
  // mutta reititetään usean alueen kesken -> parempi saatavuus). Muu arvo (esim. 'europe-west1')
  // -> perinteinen yhden alueen endpoint (Claude Sonnet 5:lle EI tuettu, ks. VAIHE2_KAYTTOONOTTO.md).
  let host;
  if (a.alue === 'global') {
    host = 'aiplatform.googleapis.com';
  } else if (a.alue === 'eu' || a.alue === 'us') {
    host = 'aiplatform.' + a.alue + '.rep.googleapis.com';
  } else {
    host = a.alue + '-aiplatform.googleapis.com';
  }
  return 'https://' + host + '/v1/projects/' + a.projekti + '/locations/' + a.alue +
    '/publishers/anthropic/models/' + a.malli + ':rawPredict';
}

// ── AWS Bedrock (Plan B): SigV4 + EU-vartija ────────────────────────────────
const crypto = require('crypto');

function _sha256hex(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function _hmac(k, s) { return crypto.createHmac('sha256', k).update(s, 'utf8').digest(); }
/** RFC 3986 -koodaus AWS:n tapaan (encodeURIComponent jättää !'()* koodaamatta). */
function _awsUriEnc(s) {
  return encodeURIComponent(s).replace(/[!'()*]/g, function (c) { return '%' + c.charCodeAt(0).toString(16).toUpperCase(); });
}

/**
 * AWS Signature Version 4. Puhdas funktio (aika annetaan) → testataan AWS:n julkaistulla vektorilla.
 * p: { method, canonicalUri, canonicalQuery, headers (pienet kirjaimet), payload, region, service,
 *      accessKeyId, secretAccessKey, amzDate 'YYYYMMDDTHHMMSSZ' }
 */
function allekirjoitaSigV4(p) {
  const nimet = Object.keys(p.headers).sort();
  const kanonisetOtsakkeet = nimet.map(function (k) {
    return k + ':' + String(p.headers[k]).trim().replace(/\s+/g, ' ') + '\n';
  }).join('');
  const allekirjoitetut = nimet.join(';');
  const kanoninen = [p.method, p.canonicalUri, p.canonicalQuery || '', kanonisetOtsakkeet,
    allekirjoitetut, _sha256hex(p.payload || '')].join('\n');
  const pvm = p.amzDate.slice(0, 8);
  const scope = pvm + '/' + p.region + '/' + p.service + '/aws4_request';
  const allekirjoitettava = ['AWS4-HMAC-SHA256', p.amzDate, scope, _sha256hex(kanoninen)].join('\n');
  let k = _hmac('AWS4' + p.secretAccessKey, pvm);
  k = _hmac(k, p.region);
  k = _hmac(k, p.service);
  k = _hmac(k, 'aws4_request');
  const signature = crypto.createHmac('sha256', k).update(allekirjoitettava, 'utf8').digest('hex');
  return {
    signature: signature,
    authorization: 'AWS4-HMAC-SHA256 Credential=' + p.accessKeyId + '/' + scope +
      ', SignedHeaders=' + allekirjoitetut + ', Signature=' + signature,
  };
}

/** EU-raja: vain eu-*-alue ja eu.-profiili tai alueen oma malli-ID. Muuten failed-precondition. */
function tarkistaBedrockEU(a) {
  if (!/^eu-[a-z]+-\d$/.test(a.alue || '')) {
    throw virhe('failed-precondition', 'Bedrock-alueen on oltava EU-alue (eu-*), nyt: ' + a.alue);
  }
  if (!/^(eu\.)?anthropic\./.test(a.malli || '')) {
    throw virhe('failed-precondition', 'Bedrock-mallin on oltava eu.-profiili tai EU-alueen malli-ID, nyt: ' + a.malli);
  }
}

/** Rakentaa allekirjoitetun InvokeModel-pyynnön. Puhdas (avaimet ja aika annetaan). */
function bedrockPyynto(a, runko, avaimet, nyt) {
  tarkistaBedrockEU(a);
  const host = 'bedrock-runtime.' + a.alue + '.amazonaws.com';
  const osat = ['model', a.malli, 'invoke'];
  // Pyyntöpolku koodataan kerran; kanoninen URI (muut palvelut kuin S3) koodataan kahdesti.
  const polku = '/' + osat.map(_awsUriEnc).join('/');
  const kanoninenUri = '/' + osat.map(function (o) { return _awsUriEnc(_awsUriEnc(o)); }).join('/');
  const amzDate = (nyt || new Date()).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const sisaltoHash = _sha256hex(runko);   // kuten AWS SDK: x-amz-content-sha256 allekirjoitetaan mukaan
  const otsakkeet = { accept: 'application/json', 'content-type': 'application/json', host: host,
    'x-amz-content-sha256': sisaltoHash, 'x-amz-date': amzDate };
  const s = allekirjoitaSigV4({
    method: 'POST', canonicalUri: kanoninenUri, canonicalQuery: '', headers: otsakkeet, payload: runko,
    region: a.alue, service: 'bedrock', accessKeyId: avaimet.id, secretAccessKey: avaimet.salainen, amzDate: amzDate,
  });
  // host-otsakkeen asettaa fetch itse (sama arvo kuin allekirjoituksessa).
  return {
    url: 'https://' + host + polku,
    headers: { accept: 'application/json', 'content-type': 'application/json', 'x-amz-content-sha256': sisaltoHash,
      'x-amz-date': amzDate, authorization: s.authorization },
  };
}

async function kutsuMallia(admin, a, system, viestit) {
  let url;
  let headers;
  let body;
  let bedrockAvaimet = null;
  if (a.provider === 'bedrock') {
    bedrockAvaimet = { id: process.env.AWS_BEDROCK_ACCESS_KEY_ID, salainen: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY };
    if (!bedrockAvaimet.id || !bedrockAvaimet.salainen) throw virhe('failed-precondition', 'AWS_BEDROCK_*-avaimet puuttuvat');
    tarkistaBedrockEU(a);
    // Bedrockin InvokeModel käyttää Anthropicin Messages-muotoa → sama system (cache_control) ja puraVastaus.
    body = { anthropic_version: 'bedrock-2023-05-31', max_tokens: MAX_TOKENS, system: system, messages: viestit };
  } else if (a.provider === 'anthropic') {
    const avain = process.env.ANTHROPIC_API_KEY;
    if (!avain) throw virhe('failed-precondition', 'ANTHROPIC_API_KEY puuttuu');
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'content-type': 'application/json', 'x-api-key': avain, 'anthropic-version': '2023-06-01' };
    body = { model: a.malli, max_tokens: MAX_TOKENS, system: system, messages: viestit };
  } else {
    const token = await admin.credential.applicationDefault().getAccessToken();
    url = vertexUrl(a);
    headers = { 'content-type': 'application/json', authorization: 'Bearer ' + token.access_token };
    body = { anthropic_version: 'vertex-2023-10-16', max_tokens: MAX_TOKENS, system: system, messages: viestit };
  }
  let viimeisin = '';
  for (let yritys = 1; yritys <= 2; yritys++) {
    const runko = JSON.stringify(body);
    if (bedrockAvaimet) {
      // Allekirjoitus uusitaan joka yrityksellä (x-amz-date on osa allekirjoitusta).
      const pyynto = bedrockPyynto(a, runko, bedrockAvaimet);
      url = pyynto.url;
      headers = pyynto.headers;
    }
    const res = await fetch(url, { method: 'POST', headers: headers, body: runko });
    if (res.ok) {
      const tulos = puraVastaus(await res.json());
      if (tulos.teksti) return tulos;
      viimeisin = 'tyhjä vastaus (' + tulos.syy + ')';
    } else {
      viimeisin = 'HTTP ' + res.status + ': ' + (await res.text()).slice(0, 300);
      const uudelleen = res.status === 429 || res.status === 529 || res.status >= 500;
      if (!uudelleen) break;
    }
    if (yritys < 2) await new Promise(function (r) { setTimeout(r, 1500); });
  }
  throw virhe('unavailable', 'Mallikutsu epäonnistui: ' + viimeisin);
}

// ── Tietopohja Storagesta (välimuistissa instanssin eliniän, max 10 min) ────
const _tpCache = {};   // polku → { aika, arvo }

async function haeTietopohja(admin, a, polku) {
  polku = polku || a.polku;
  const valimuisti = _tpCache[polku];
  if (valimuisti && Date.now() - valimuisti.aika < TIETOPOHJA_CACHE_MS) return valimuisti.arvo;
  const bucket = a.bucket ? admin.storage().bucket(a.bucket) : admin.storage().bucket();
  const [tiedostot] = await bucket.getFiles({ prefix: polku });
  const juuri = [];
  const tp = [];
  tiedostot.forEach(function (f) {
    const suhteellinen = f.name.slice(polku.length);
    if (!suhteellinen.endsWith('.md')) return;
    if (suhteellinen.indexOf('tietopohja/') === 0) tp.push(f);
    else if (suhteellinen.indexOf('/') < 0) juuri.push(f);
  });
  const ohjeNimi = valitseOhjeistus(juuri.map(function (f) { return f.name.slice(polku.length); }));
  if (!ohjeNimi || !tp.length) {
    throw virhe('failed-precondition', 'Tietopohja puuttuu Storagesta (' + polku + ')');
  }
  const ohjeTiedosto = juuri.find(function (f) { return f.name === polku + ohjeNimi; });
  const ohjeistus = (await ohjeTiedosto.download())[0].toString('utf8');
  const sisallot = await Promise.all(tp.map(async function (f) {
    return { nimi: f.name.slice((polku + 'tietopohja/').length), sisalto: (await f.download())[0].toString('utf8') };
  }));
  const arvo = { system: rakennaSystem(ohjeistus, sisallot), versio: ohjeVersio(ohjeistus), tiedostoja: sisallot.length };
  _tpCache[polku] = { aika: Date.now(), arvo: arvo };
  return arvo;
}

// ── Kiintiö (transaktio) ─────────────────────────────────────────────────────
async function kuluKiintio(db, uid, kiintio) {
  const ref = db.collection('valmennusapuri_kaytto').doc(paivanAvain(uid));
  return db.runTransaction(async function (tx) {
    const snap = await tx.get(ref);
    const kaytetty = snap.exists ? (snap.data().maara || 0) : 0;
    if (kaytetty >= kiintio) throw virhe('resource-exhausted', 'Päivän kysymyskiintiö (' + kiintio + ') on täynnä');
    tx.set(ref, { uid: uid, maara: kaytetty + 1, paivitetty: new Date().toISOString() }, { merge: true });
    return kaytetty + 1;
  });
}

async function lueKaytetty(db, uid) {
  const snap = await db.collection('valmennusapuri_kaytto').doc(paivanAvain(uid)).get();
  return snap.exists ? (snap.data().maara || 0) : 0;
}

// ── Käsittelijä (onCall) ─────────────────────────────────────────────────────
/**
 * @param {object} admin      firebase-admin
 * @param {object} functions  firebase-functions/v1 (HttpsError)
 * @param {object} [riip]     testejä varten: { haeTietopohja, kutsuMallia, env }
 */
function kasittelija(admin, functions, riip) {
  const r = riip || {};
  const _hae = r.haeTietopohja || haeTietopohja;
  const _kutsu = r.kutsuMallia || kutsuMallia;
  const _seura = r.haeSeuranTiedot || haeSeuranTiedot;

  function httpsVirhe(e) {
    if (e instanceof functions.https.HttpsError) return e;
    const koodi = e.tmKoodi || 'internal';
    return new functions.https.HttpsError(koodi, koodi === 'internal' ? 'Sisäinen virhe' : e.message);
  }

  return async function (data, context) {
    if (!context || !context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu sisään.');
    }
    const uid = context.auth.uid;
    const a = asetukset(r.env);
    const db = admin.firestore();
    try {
      const adminSnap = await db.collection('admins').doc(uid).get();
      const onSA = uid === SA_UID || adminSnap.exists;
      const pilottiSnap = onSA ? null : await db.collection('valmennusapuri_pilotti').doc(uid).get();
      const pilotti = pilottiSnap && pilottiSnap.exists ? pilottiSnap.data() : null;
      if (!onKayttoOikeus(onSA, pilotti)) {
        throw new functions.https.HttpsError('permission-denied', 'Ei pilottioikeutta.');
      }

      const toiminto = (data && data.toiminto) || 'kysy';

      if (toiminto === 'tila') {
        return { oikeus: true, paivaKiintio: onSA ? null : a.paivaKiintio, kaytetty: onSA ? 0 : await lueKaytetty(db, uid),
          roolit: roolitKayttajalle(onSA, pilotti) };
      }

      if (toiminto === 'palaute') {
        const lokiId = data && data.lokiId;
        const arvio = data && data.arvio;
        if (typeof lokiId !== 'string' || !lokiId || ['hyva', 'huono'].indexOf(arvio) < 0) {
          throw virhe('invalid-argument', 'virheellinen palaute');
        }
        const kommentti = typeof data.kommentti === 'string' ? data.kommentti.trim().slice(0, 1000) : '';
        const ref = db.collection('valmennusapuri_loki').doc(lokiId);
        const snap = await ref.get();
        if (!snap.exists || (snap.data().uid !== uid && !onSA)) {
          throw new functions.https.HttpsError('permission-denied', 'Ei oikeutta tähän vastaukseen.');
        }
        await ref.update({ palaute: { arvio: arvio, kommentti: kommentti, aika: new Date().toISOString() } });
        return { ok: true };
      }

      if (toiminto !== 'kysy') throw virhe('invalid-argument', 'tuntematon toiminto');

      const kysely = validoiKysely(data);
      const rooli = valitseRooli(data);
      if (roolitKayttajalle(onSA, pilotti).indexOf(rooli) < 0) {
        throw new functions.https.HttpsError('permission-denied', 'Ei oikeutta tähän rooliin.');
      }
      if (!onSA) await kuluKiintio(db, uid, a.paivaKiintio);

      const alku = Date.now();
      // SA voi testata seuran datalla: data.seuraId (vain SA; muilla aina oma pilottiseura).
      const saSeura = onSA && typeof (data && data.seuraId) === 'string' && /^[a-z0-9_-]{1,40}$/.test(data.seuraId) ? data.seuraId : null;
      const seuraId = (pilotti && pilotti.seuraId) || saSeura;
      const kontekstiPilotti = pilotti || (saSeura ? { seuraId: saSeura, tehtava: 'valmentaja' } : null);
      const seuraTiedot = await _seura(db, seuraId);
      const kuviot = nimiKuviot(seuraTiedot.nimet);
      const suojaYht = { nimet: 0, tunnisteet: 0, yhteystiedot: 0 };
      const viestit = kysely.viestit.map(function (v) {
        if (v.role !== 'user') return v;
        const sj = syottosuoja(v.content, kuviot);
        Object.keys(suojaYht).forEach(function (k) { suojaYht[k] += sj.maarat[k]; });
        return { role: v.role, content: sj.teksti };
      });
      let konteksti = null;
      const viimeinen = viestit[viestit.length - 1];
      if (rooli === 'hp' && !/^\s*Konteksti:/i.test(viimeinen.content)) {
        const joukkueet = kontekstiPilotti && (Array.isArray(kontekstiPilotti.joukkueet) ? kontekstiPilotti.joukkueet
          : (kontekstiPilotti.joukkue ? [kontekstiPilotti.joukkue] : []));
        konteksti = rakennaKonteksti(onSA, kontekstiPilotti, seuraTiedot.seura,
          seuraTiedot.data ? koostaSeuranData(seuraTiedot.data, joukkueet) : null);
      }
      const mallille = konteksti
        ? viestit.slice(0, -1).concat([{ role: 'user', content: konteksti + '\n\n' + viimeinen.content }])
        : viestit;
      const tp = await _hae(admin, a, rooli === 'hp' ? a.hpPolku : a.polku);
      const malli = await _kutsu(admin, a, tp.system, mallille);
      const kayttajan = viestit.filter(function (v) { return v.role === 'user'; }).map(function (v) { return v.content; });
      const suodatettu = suodataKoodit(malli.teksti, kayttajan);
      if (suodatettu.poistettu.length) {
        console.warn('[valmennusapuri] koodit poistettu vastauksesta:', suodatettu.poistettu.join(', '));
      }

      const loki = await db.collection('valmennusapuri_loki').add({
        uid: uid,
        seuraId: seuraId || null,
        kysymys: kayttajan[kayttajan.length - 1],
        historiaViesteja: kysely.viestit.length,
        vastaus: suodatettu.teksti,
        kieli: kysely.kieli,
        rooli: rooli,
        konteksti: konteksti,
        syottosuoja: suojaYht,
        ohjeVersio: tp.versio,
        provider: a.provider,
        malli: a.malli,
        alue: a.provider === 'anthropic' ? null : a.alue,
        tokenit: malli.tokenit,
        stopReason: malli.syy,
        poistetutKoodit: suodatettu.poistettu,
        kestoMs: Date.now() - alku,
        aika: new Date().toISOString(),
        palaute: null,
      });

      return { vastaus: suodatettu.teksti, lokiId: loki.id, ohjeVersio: tp.versio, rooli: rooli, katkesi: malli.syy === 'max_tokens' };
    } catch (e) {
      if (!(e instanceof functions.https.HttpsError) && !e.tmKoodi) console.error('[valmennusapuri]', e);
      throw httpsVirhe(e);
    }
  };
}

module.exports = {
  kasittelija,
  // testattavat puhtaat funktiot
  validoiKysely,
  rajaaHistoria,
  suodataKoodit,
  valitseOhjeistus,
  rakennaSystem,
  ohjeVersio,
  paivanAvain,
  onKayttoOikeus,
  valitseRooli,
  roolitKayttajalle,
  syottosuoja,
  nimiKuviot,
  rakennaKonteksti,
  koostaSeuranData,
  puraVastaus,
  vertexUrl,
  asetukset,
  allekirjoitaSigV4,
  tarkistaBedrockEU,
  bedrockPyynto,
  kutsuMallia,
  SA_UID,
};
