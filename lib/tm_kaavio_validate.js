/* tm_kaavio_validate.js — §6 VALIDAATTORI. Deterministiset portit ENNEN kirjoitusta/renderiä.
   Uutettu prototyypin validate.cjs:stä. YKSI TOTUUS: sama funktio ajetaan editorin write-pathissa
   (erä B) JA generointi-ingestissä (erä D) — älä tee toista kopiota kumpaankaan.
   Puhdas: ei tiedostoluku, ei DOM, ei Firestore. validoiKaavio(spec, ctx?) → { E:[virheet], W:[varoitukset] }.
   Spec on §3-skeema; avain on curriculum-avain (enum, EI käänny → /^[a-z0-9_]+$/).

   ERÄ C — KPI-PORTTI KAHDESSA TASOSSA, jotta puhtaus säilyy:
     a) SYNTAKTINEN (aina): spec.kpi on yksi kirjain a–d, enum, ei käänny.
     b) SEMANTTINEN (vain jos kutsuja antaa ctx.kpiKoodit): kuuluuko koodi TÄMÄN konseptin
        KPI-listaan. Jäsenyys vaatii kaanon ⊕ seura -resolvoinnin, jota tämä lib ei saa tehdä
        (se tuntisi Firestoren ja seurakerroksen) → kutsuja resolvoi ja syöttää koodit DATANA.
   ctx puuttuu → vain (a). Vanhat kutsut validoiKaavio(spec) toimivat ennallaan. */

const ROOLIT = ["vastaanottaja", "syöttäjä", "vaihtoehto", "paine", "tuki"];
const TYYPIT = ["syotto", "juoksu", "kuljetus", "laukaus"];
const inB = v => typeof v === "number" && v >= 0 && v <= 100;

function capOf(pelimuoto) { const m = /^(\d+)v(\d+)$/.exec(pelimuoto || ""); return m ? [+m[1], +m[2]] : [11, 11]; }

function validate(s, ctx) {
  const E = [], W = [];
  // skeema
  ["avain", "suunta", "pelimuoto"].forEach(k => { if (!s[k]) E.push(`puuttuu kenttä: ${k}`); });
  if (!Array.isArray(s.pelaajat) || !s.pelaajat.length) E.push("pelaajat[] puuttuu tai tyhjä");
  // enum-invariantti: avain ei käännetty
  if (s.avain && !/^[a-z0-9_]+$/.test(s.avain)) E.push(`avain ei ole kanoninen (käännetty?): ${s.avain}`);
  // (a) spec.kpi — VALINNAINEN: kaavio voi olla konseptin yleiskuva ilman KPI:tä. Jos annettu,
  // se on yksi kirjain a–d (konseptimallin KPI-koodit). Laajenna /^[a-z]$/ jos malli ylittää d:n.
  if (s.kpi != null && s.kpi !== '' && !/^[a-d]$/.test(s.kpi)) E.push(`kpi ei kelpaa (odotettu a–d): ${s.kpi}`);
  // (b) jäsenyys — vain kun kutsuja on resolvoinut konseptin. Tyhjä lista + asetettu kpi = E:
  // konseptilla ei ole KPI:itä, joten mihinkään ei voi tagata.
  if (ctx && Array.isArray(ctx.kpiKoodit) && s.kpi != null && s.kpi !== '' && ctx.kpiKoodit.indexOf(s.kpi) < 0)
    E.push(`kpi "${s.kpi}" ei ole konseptin ${s.avain || '?'} KPI-listalla [${ctx.kpiKoodit.join(',')}]`);
  const ids = new Set();
  (s.pelaajat || []).forEach(p => {
    if (!p.id) E.push("pelaaja ilman id:tä");
    if (ids.has(p.id)) E.push(`duplikaatti id: ${p.id}`); ids.add(p.id);
    if (!["oma", "vastustaja"].includes(p.joukkue)) E.push(`${p.id}: joukkue ei sallittu (${p.joukkue})`);
    if (!ROOLIT.includes(p.rooli)) E.push(`${p.id}: rooli ei sallittu (${p.rooli})`);
    if (!inB(p.x) || !inB(p.y)) E.push(`${p.id}: koordinaatti rajan ulkona (${p.x},${p.y})`);
  });
  // pelaajamäärä ≤ pelimuoto
  const [co, cv] = capOf(s.pelimuoto);
  const no = (s.pelaajat || []).filter(p => p.joukkue === "oma").length;
  const nv = (s.pelaajat || []).filter(p => p.joukkue === "vastustaja").length;
  if (no > co) E.push(`omia ${no} > pelimuoto ${co}`);
  if (nv > cv) E.push(`vastustajia ${nv} > pelimuoto ${cv}`);
  // pallo ≤ 1
  const nb = (s.pelaajat || []).filter(p => p.pallo).length;
  if (nb > 1) E.push(`useampi pallollinen (${nb})`);
  // cone → tasan yksi vastaanottaja + avoin
  const recv = (s.pelaajat || []).filter(p => p.rooli === "vastaanottaja");
  if (s.cone) {
    if (recv.length !== 1) E.push(`cone vaatii tasan 1 vastaanottajan (löytyi ${recv.length})`);
    else if (typeof recv[0].avoin !== "number") E.push(`vastaanottajalta ${recv[0].id} puuttuu avoin-kulma`);
  }
  // viite-eheys + rajat: liikkeet
  (s.liikkeet || []).forEach(li => {
    if (!TYYPIT.includes(li.tyyppi)) E.push(`liike ${li.id}: tyyppi ei sallittu (${li.tyyppi})`);
    ["from", "to"].forEach(end => {
      const e = li[end];
      if (!e) { E.push(`liike ${li.id}: ${end} puuttuu`); return; }
      if (e.ref) { if (!ids.has(e.ref)) E.push(`liike ${li.id}: ${end}.ref viittaa tuntemattomaan (${e.ref})`); }
      else if (!inB(e.x) || !inB(e.y)) E.push(`liike ${li.id}: ${end} rajan ulkona (${e.x},${e.y})`);
    });
  });
  // selite-resolve: fi/sv/en läsnä + rajat
  (s.selitteet || []).forEach(se => {
    if (!inB(se.x) || !inB(se.y)) E.push(`selite ${se.id}: koordinaatti rajan ulkona`);
    ["fi", "sv", "en"].forEach(l => { if (!se.t || !se.t[l] || !se.t[l].trim()) E.push(`selite ${se.id}: kieli ${l} puuttuu`); });
  });
  // tilanne trilingvaali (varoitus jos vajaa). `nimi` EI enää: erässä C otsikon lähde siirtyi
  // specistä resolvoituun konseptiin (kaanon ⊕ seura), joten spec.nimi ei ole enää totuuslähde
  // eikä sen vajaus ole puute. Vanhoissa dokumenteissa kenttä siedetään, sitä ei vain lueta.
  // `tilanne` on tämän PIIRROKSEN oma sisältö (ei konseptin yleinen pelitilanne) → jää speciin.
  if (s.tilanne) ["fi", "sv", "en"].forEach(l => { if (!s.tilanne[l]) W.push(`tilanne.${l} puuttuu`); });
  return { E, W };
}

function validoiKaavio(spec, ctx) { return validate(spec || {}, ctx); }
function kaavioKelpaa(spec, ctx) { return validoiKaavio(spec, ctx).E.length === 0; }

var TM_KAAVIO_VALIDATE = {
  validoiKaavio: validoiKaavio, kaavioKelpaa: kaavioKelpaa,
  KAAVIO_ROOLIT: ROOLIT, KAAVIO_LIIKETYYPIT: TYYPIT
};
if (typeof module !== 'undefined' && module.exports) module.exports = TM_KAAVIO_VALIDATE;
if (typeof window !== 'undefined') { for (var _kvk in TM_KAAVIO_VALIDATE) { try { window[_kvk] = TM_KAAVIO_VALIDATE[_kvk]; } catch (e) {} } }
