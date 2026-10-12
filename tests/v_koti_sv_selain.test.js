/* V-KOTI sv-läpiajo (Tero 13.10.2026; ehto lipun liput.valmentaja_v2 kytkemiselle Sibbolle). Playwright + Chrome; chrome-tests-job. PYSYVÄ PORTTI:
   valmentajan Navigaatio v2 + Koti v2 Masterin OIKEASSA kuoressa mock-Firestorella (ei verkkoa, ei oikeaa dataa), lippu PÄÄLLÄ, kieli sv:
   (a) Koti: kaikki kortit (Seuraava, Tehtävät + Näytä kaikki, Tämä viikko, Pelaajat joihin kannattaa tarttua, Syke, Viestit) oikealla renderKotiV2:lla
       + kaikki tehtävä-/nostotyypit (FLEI, läsnäolot, jakso, havainnot, D3, huoltajaviesti, klippi; läsnä < 50 %, ei omatoimisia, ei havaintoa, kehu)
       libin mallista Masterin masterT:llä + tyhjät tilat (Ei tulevia, Viikko on tyhjä) ja Aloita-tilat (0 pelaajaa / pelaajia),
   (b) vasen laita: Koti/Viestit/Kalenteri/Joukkue/Pelaajat/Ryhmät, Työkalut auki (6) + Asetukset; title/aria-label; otsikkorivi (tervehdys, päivä),
   (c) joukkuevalitsin: SA (seura + joukkue, "— Kaikki joukkueet —") ja valmentaja usealla joukkueella (aria-label),
   (d) Joukkue-välilehdet Tilanne (renderPulse) + Kausi ja jaksot (renderSeason): näkymän näkyvä sisältö,
   (e) mobiili 390: alapalkki, Viestit-nappi (aria-label), Valikko-vetolaatikko (Joukkue/Ryhmät/Työkalut/Asetukset + valitsin + kielivalitsin),
   (f) "+ Havainto" -pääpainike (desktop + mobiili) ja Ryhmät-näkymä (ryhmät + sääntöryhmä + tyhjä).
   Kerätään näkyvä teksti (näkyvät tekstisolmut + näkyvien elementtien title/aria-label/placeholder) ja toastit. Suomen tunnistus kuten klippi_sv_selain:
   (i) TARKKA — nav/koti-libien fi-tekstit ja Masterin masterT-avaimet (≥ 4 kirjainta) eivät saa esiintyä; (ii) HEURISTIIKKA — suomen sanat + tools/i18n/sv_lapiajo_fi.mjs,
   suomalainen viikonpäivä ("Ma 19"); (iii) ENGLANTI — en-kartan arvot ja englannin UI-sanat (sv puuttuu → ei saa näkyä englantia). Käyttäjän data (nimet, joukkue, seura) sallittu.
   Geminiltä odottavat fi-avaimet: SV_ODOTTAA (ELÄVÄ: kaatuu, jos sv on jo kartassa tai rivi puuttuu Gemini-erätiedostoista). Negatiivitesti: fi-tilassa suomi löytyy.
   Lippu POIS: vanha navigaatio EI ole tämän portin kohde — testi varmistaa vain, ettei v2-elementtejä ole (vuodot raportoidaan TM_V_KOTI_SV_RAPORTTI=1). */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
import { onkoSuomea } from '../tools/i18n/sv_lapiajo_fi.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(JUURI, f), 'utf8');
const MASTER = lue('TalentMaster_Master_v16.html');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const CMN = require('../lib/tm_i18n_common.js'), MI = require('../lib/tm_master_i18n.js'), LIB = require('../lib/tm_lib_i18n.js');

/* ── Geminiltä odottavat (fi-avain = masterT-avain; sv tyhjä erätiedostossa). ELÄVÄ: sv saapui koodiin → poista rivi (testi alla kaatuu muuten). ── */
/* Erätiedostot: uudet rivit docs/i18n/sv_kaannoserae_38.json (Havainto, Tilanne, huoltaja, TM_SELITTEET, pre-harkka); muut ovat jo aiemmissa erissä sv tyhjänä
   (30/32/33/34 nav+koti, 18 tm_nakyma_ryhmat + master, 19_gemini, 28 Aamutreeni, 29 estynyt, 15 vp_kartta; 'Ryhmät': Gemini-sv on VP-kartassa, ei Masterin) → viittaus, ei duplikaattia. */
export const SV_ODOTTAA = [
  '30% KOHDENNETTU', '360° hengitys + cat-cow + dead bug', '360° palleahengitys 3×5. Dead bug 3×5 per puoli. Cat-cow 3×8.', '70% VAHVUUS', 'AKTIVOINTI', 'Aamutreeni',
  'Aloita kahdella askeleella: täytä viikon harjoitukset kalenteriin ja kirjaa ensimmäinen havainto.',
  'Aloita kolmella askeleella: lisää pelaajat joukkueeseen, täytä viikon harjoitukset kalenteriin ja kirjaa ensimmäinen havainto.', 'Avaa Pulssi', 'Avaa jakso', 'Avaa kalenteri',
  'D1 Fyysinen — testitasojen keskiarvo, 1–5 (3 = ikäluokan keskitaso)', 'D2 Tekninen — TKI- tai SM-testipohjainen, 1–5 (3 = ikäluokan keskitaso)', 'D2 Tekninen — luokitus', 'D3-itsearvio odottaa',
  'Ei havaintoa 30 pv', 'Ei luokkaa', 'Ei omatoimisia 3 viikkoon', 'Ei tulevia tapahtumia. Lisää harjoitus tai ottelu kalenteriin.', 'Eniten omatoimisia tällä viikolla — kehu?', 'Havainto', 'Jaa klippi',
  'Jakson kooste tehty', 'Jakson viikko', 'Kausi ja jaksot', 'Kehon valmius alle 40 (klinikkalähetys)', 'Klippi odottaa jakamista', 'Kuorma ja fiilis', 'Lankku + bird dog', 'Lukemattomat viestit',
  'Läsnä alle puolessa treeneistä (4 vk)', 'Läsnäolo 4 vk', 'Normaali, ei maksiminopeus.', 'Normaali, pidennä kestoa.', 'Näytä kaikki', 'Omatoimisia tällä viikolla', 'PELILLINEN KYTKENTÄ',
  'Pelaajat, joihin kannattaa tarttua', 'Pieni alue, 1 kosketus. Keskellä vaihtuu häviäjä.', 'Rondo 4v1', 'Ryhmät', 'Sinulla ei ole ryhmiä.', 'Syke', 'T-rata hidas', 'Tehtävät',
  'Tekniikka kehityskohteena', 'Tervetuloa', 'Tilanne', 'Tuore tulos, ei kehityskohde.', 'Täytä viikko', 'Uusi havainto', 'Vahvista läsnäolot', 'Vastaa', 'Vastaamatta yli vuorokauden',
  'Viikko on tyhjä.', 'ei vielä mitattu', 'estynyt', 'huoltaja', 'jakso päättyi', 'jakso päättyy', 'kypsyys ratkaisee', 'mitattu {n}/{yht} · alle kattavuusrajan (70 %) — osuutta ei näytetä', 'päättyy',
  'seuraava tekniikkakisa päivittää', 'sääntöryhmä', 'vahvistanut', '{n} ilman tulosta', '{n} kypsyys ratkaisee', '{n} pelaajalla vain yli {kk} kk vanha tulos', '{n} tulosta yli {kk} kk vanhoja',
  '{n}/{yht} mitattu tuoreesti'
];

/* sv-resoluutio Nodessa samalla järjestyksellä kuin masterT: lib-avain → COMMON → TM_MASTER_I18N → (puuttuu) */
const svOf = (k) => { const l = LIB.tmLibT(k, 'sv'); if (l !== undefined) return l; const c = CMN.TM_I18N_COMMON.sv[k]; if (typeof c === 'string') return c; const m = MI.TM_MASTER_I18N.sv[k]; return typeof m === 'string' ? m : undefined; };
/* Kaikki Gemini-erätiedostojen fi-rivit (missä tahansa osiossa) */
const ERA_RIVIT = (() => { const s = new Map(); for (const f of readdirSync(join(JUURI, 'docs/i18n')).filter((x) => /^sv_kaannoserae_.*\.json$/.test(x))) { let j; try { j = JSON.parse(lue('docs/i18n/' + f)); } catch (e) { continue; } for (const v of Object.values(j.osiot || {})) for (const [k, r] of Object.entries((v && v.rivit) || {})) if (!s.has(k)) s.set(k, { f, sv: r && r.sv }); for (const r of (Array.isArray(j.rivit) ? j.rivit : [])) if (r && r.fi && !s.has(r.fi)) s.set(r.fi, { f, sv: r.sv }); } return s; })();

/* ── tunnistus ── */
const NAV = lue('lib/tm_valmentaja_nav.js'), KOTI = lue('lib/tm_valmentaja_koti.js'), KN = lue('lib/tm_valmentaja_koti_nakyma.js');
const LIB_FI = (() => {   // nav/koti-libien käyttäjälle näkyvät fi-literaalit (teksti/syy-kentät, t('…'), it(id, '…'), viikonpäivät)
  const s = new Set();
  for (const src of [NAV, KOTI, KN]) {
    for (const re of [/(?:teksti|syy):\s*'([^']+)'/g, /\bit\('[a-z]+',\s*'([^']+)'/g, /_lista\('([^']+)'/g, /'(Ottelu|Harjoitus|Aamutreeni)'/g]) for (const m of src.matchAll(re)) s.add(m[1]);
    for (const m of src.matchAll(/\bt\(([^()]*)\)/g)) for (const l of m[1].matchAll(/'([^']+)'/g)) s.add(l[1]);   // t('…') ja t(ehto ? '…' : '…')
  }
  for (const m of KN.matchAll(/VPV = \[([^\]]+)\]/g)) for (const l of m[1].matchAll(/'([^']+)'/g)) s.add(l[1]);
  return s;
})();
const MASTER_KEYS = (() => { const s = new Set(Object.keys(MI.TM_MASTER_I18N.sv).concat(Object.keys(CMN.TM_I18N_COMMON.sv))); for (const m of MASTER.matchAll(/masterT\('((?:[^'\\]|\\.)+)'\)/g)) s.add(m[1].replace(/\\'/g, "'")); for (const m of MASTER.matchAll(/data-i18n(?:-title|-ph|-aria)?="([^"]+)"/g)) s.add(m[1]); return s; })();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const kirj = (x) => (String(x).match(/\p{L}/gu) || []).length;
const PALAT = (() => {   // [lähde, fi, regex] — vain ne, joiden sv ≠ fi (sv puuttuu TAI eroaa); odottavat poistetaan erikseen
  const out = [], nahty = new Set();
  const lisaa = (lahde, fi) => { for (const x of String(fi).split(/\{\w+\}/).map((y) => y.trim())) { if (kirj(x) < 4 || nahty.has(x) || svOf(x) === x) continue; nahty.add(x); out.push([lahde, x, new RegExp('(^|[^\\p{L}])' + esc(x) + '($|[^\\p{L}])', 'u')]); } };
  LIB_FI.forEach((x) => lisaa('lib', x)); MASTER_KEYS.forEach((x) => lisaa('master', x));
  return out;
})();
const SANAT = ['koti', 'viestit', 'kalenteri', 'joukkue', 'pelaajat', 'ryhmät', 'työkalut', 'asetukset', 'havainto', 'valikko', 'tilanne', 'kausi', 'jaksot', 'seuraava', 'tehtävät', 'viikko', 'syke', 'avaa', 'vahvista', 'arvioi', 'vastaa', 'kaikki', 'näytä', 'tervetuloa', 'aloita', 'pelaajaa', 'vahvistanut', 'estynyt', 'ottelu', 'harjoitus', 'aamutreeni', 'läsnäolo', 'omatoimisia', 'päättyy', 'päättyi', 'jakso', 'jakson', 'kooste', 'klippi', 'jaa', 'lähetä', 'kirjaudu', 'ulos', 'valitse', 'ryhmiä', 'testit', 'kuorma', 'fiilis', 'itsearvio', 'tänään', 'pulssi', 'komennot', 'valmentaja', 'kehittyminen', 'taktiikkataulu', 'hyvää', 'päivää', 'iltaa', 'aamua'];
const SANA_RE = new RegExp('(^|[^\\p{L}])(' + SANAT.join('|') + ')($|[^\\p{L}])', 'iu');
const VIIKONPAIVA_RE = /(^|[^\p{L}])(Ma|Ke|Pe|La|Su|ma|ke|pe|la|su) \d{1,2}(\.|\s|$)/u;   // Ti/To ovat myös ruotsin lyhenteet (tisdag/torsdag) → ei tunnisteta
const EN_ARVOT = new Set([].concat(Object.values(CMN.TM_I18N_COMMON.en || {}), Object.values(MI.TM_MASTER_I18N.en || {})).filter((x) => typeof x === 'string' && kirj(x) >= 4));
const EN_SANAT = ['the', 'and', 'your', 'with', 'this', 'next', 'save', 'cancel', 'close', 'show', 'loading', 'week', 'today', 'home', 'messages', 'calendar', 'players', 'player', 'settings', 'tools', 'inbox', 'dashboard', 'pulse', 'season', 'welcome', 'tasks', 'open', 'new', 'sign', 'logout', 'commands', 'search'];
const EN_RE = new RegExp('(^|[^\\p{L}])(' + EN_SANAT.join('|') + ')($|[^\\p{L}])', 'iu');
const ODOTTAA_RE = () => SV_ODOTTAA.flatMap((k) => k.split(/\{\w+\}/).map((x) => x.trim()).filter((x) => kirj(x) >= 2)).sort((a, b) => b.length - a.length).map((x) => new RegExp('(^|[^\\p{L}])' + esc(x) + '($|[^\\p{L}])', 'gu'));   // {n}-paikat: jokainen kiinteä pala erikseen
/* Sallittu data (fixture): pelaajat, joukkueet, seura, valmentaja, ryhmät, paikka; brändi; kielivalitsimen lyhenteet; versio */
export const NIMET = ['Alva Berg', 'Elis Lund', 'Noel Ek', 'Ines Holm', 'Otto Dahl', 'Vera Sund', 'Alva B.', 'Elis L.', 'Noel E.', 'Ines H.', 'Otto D.', 'Vera S.', 'Demo U13', 'Demo U14', 'DEMO U13', 'DEMO U14', 'FC Demo', 'Alex Coach', 'Alex', 'G1 Demo', 'G2 Demo', 'Arena 2', 'TalentMaster', 'Talent', 'Master', '™', 'FI', 'SV', 'EN', 'v16.0', '⌘K', 'MD', 'MD+1', 'MD-1', 'MD-2', 'MD-3', '👍'];
export function suomiJaanteet(kerätyt, sallitut) {
  const ok = (t) => { let r = t; for (const s of (sallitut || []).slice().sort((a, b) => b.length - a.length)) r = r.split(s).join(''); return r.replace(/[\s·—–:,.()„“"'0-9✓＋+@/%›▸&#;-]/g, '').length === 0; };
  const odo = ODOTTAA_RE(), ulos = [];
  for (const { vaihe, teksti } of kerätyt) {
    const t0 = teksti.replace(/^@[a-z-]+:/, ''), t = odo.reduce((x, re) => x.replace(re, '$1$2'), t0);
    if (ok(t)) continue;
    const syyt = [];
    for (const [l, x, re] of PALAT) if (re.test(t)) syyt.push('fi-teksti(' + l + ') ' + JSON.stringify(x));
    if (SANA_RE.test(t)) syyt.push('fi-sana ' + t.match(SANA_RE)[2]);
    if (VIIKONPAIVA_RE.test(t)) syyt.push('fi-viikonpäivä');
    if (!syyt.length && onkoSuomea(t).fi) syyt.push('heuristiikka');
    for (const e of EN_ARVOT) if (t.indexOf(e) >= 0) syyt.push('englanti(en-kartta) ' + JSON.stringify(e));
    if (EN_RE.test(t)) syyt.push('englanti-sana ' + t.match(EN_RE)[2]);
    if (syyt.length) ulos.push(vaihe + ' :: ' + JSON.stringify(teksti) + ' ← ' + Array.from(new Set(syyt)).join(', '));
  }
  return Array.from(new Set(ulos));
}

/* Sivulla: näkyvät tekstisolmut + näkyvien elementtien title/aria-label/placeholder valitsimien alta (ei syöttökenttien arvoja). Vetolaatikko (ruudun ulkopuolella) lasketaan näkyväksi. */
const KERAA = 'window.__nak=function(e){return !e.checkVisibility||e.checkVisibility({visibilityProperty:true})};window.__keraa=function(sel){var out=[];document.querySelectorAll(sel).forEach(function(r){if(!window.__nak(r))return;var w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT),n;while((n=w.nextNode())){var s=n.nodeValue.replace(/\\s+/g," ").trim(),pe=n.parentElement;if(!s||!pe||pe.tagName==="TEXTAREA"||pe.tagName==="SCRIPT"||pe.tagName==="STYLE")continue;if(pe.tagName==="OPTION"){var sl=pe.closest("select");if(sl&&!window.__nak(sl))continue}else if(!window.__nak(pe))continue;out.push(s)}[r].concat(Array.prototype.slice.call(r.querySelectorAll("*"))).forEach(function(e){if(!window.__nak(e))return;["title","aria-label","placeholder"].forEach(function(a){var v=e.getAttribute&&e.getAttribute(a);if(v&&v.trim())out.push("@"+a+":"+v.trim())})})});return out};';

/* ── fixture: keksityt, kieliltään neutraalit nimet; "nyt" = ma 19.10.2026 12.00 (kalenteri_sivu) ── */
const LIPPU = { 'seurat/demo': { nimi: 'FC Demo', liput: { valmentaja_v2: true } } };
const TUORE = '2026-03-10', VANHA = '2024-08-15', pv = (o) => Object.assign({ joukkue: 'Demo U13', joukkueet: ['demo_u13'], syntymaVuosi: 2013, sukupuoli: 'M' }, o);
const PELAAJAT = [   // Kausi-näkymää varten D1/D2-tuloksia: tuore kehityskohde, tuore ok, vanha, SM-pohjainen, ei dataa
  pv({ id: 'p1', etunimi: 'Alva', sukunimi: 'Berg', flei_viimeisin: 35, tki_viimeisin: 34, tki_pvm: TUORE, d2_taso: 2, d2_lahde: 'tk', d2_pvm: TUORE, hh_viimeisin: { cmj: 25, mas: 10 }, hh_pvm: TUORE, d1_taso: 2.5, d1_pvm: TUORE }),
  pv({ id: 'p2', etunimi: 'Elis', sukunimi: 'Lund', d3_varmuus: 'itsearvio', tki_viimeisin: 52, tki_pvm: TUORE, d2_taso: 3.5, d2_lahde: 'tk', d2_pvm: TUORE, hh_viimeisin: { cmj: 40, mas: 17 }, hh_pvm: TUORE, d1_taso: 3, d1_pvm: TUORE }),
  pv({ id: 'p3', etunimi: 'Noel', sukunimi: 'Ek', adar_pvm: '2026-10-15', adar_havaintoja: 2, tki_viimeisin: 44, tki_pvm: VANHA, d2_taso: 3, d2_lahde: 'tk', d2_pvm: VANHA }),
  pv({ id: 'p4', etunimi: 'Ines', sukunimi: 'Holm', sm_pallo_viimeisin: 9, sm_juoksu_viimeisin: 7.75, tsi_pvm: TUORE, tsi_recalc: true, d2_taso: 3, d2_lahde: 'sm_pallo', d2_taso_recalc: true, d2_pvm: TUORE }),
  pv({ id: 'p5', etunimi: 'Otto', sukunimi: 'Dahl', tki_viimeisin: 47, tki_pvm: '2025-05-20', d2_taso: 3, d2_lahde: 'tk', d2_pvm: '2025-05-20' }),
  pv({ id: 'p6', etunimi: 'Vera', sukunimi: 'Sund' })
];
const JDOC = { id: 'demo_u13', nimi: 'Demo U13', ika: 'U13', pelimuoto: '8v8', jaksofokus: { alku: '2026-09-24', kesto_vk: 4, osa_alueet: { tekninen_taktinen: { nimi: 'Demo U13' } } } };
/* sivulla ajettava data: tapahtumat (tänään päättynyt treeni → läsnäolot, aamutreeni, ottelu la → MD-merkinnät), kirjaukset (kehu), viestit, saatavuus */
const DATA = 'var __d=function(o,h,m){var t=new Date(Date.now()+o*864e5);t.setHours(h,m||0,0,0);return t},__mk=function(id,o,h,e){var a=__d(o,h),b=new Date(a.getTime()+90*6e4),z=function(n){return("0"+n).slice(-2)};return Object.assign({id:id,nimi:"",tyyppi:"harjoitus",pvm:tmPaivaIso(a),alkaa:z(h)+":00",paattyy:z(h+1)+":30",_alkaaMs:a.getTime(),_paattyyMs:b.getTime(),joukkue:"Demo U13",joukkueet:["demo_u13"],paikka:"Arena 2"},e||{})};'
  + 'window.__EV=[__mk("e1",0,7),__mk("e2",1,17),__mk("e3",2,7,{alalaji:"aamutreeni",pelaajat_id:["p1","p2","p3"]}),__mk("e4",3,17),__mk("e5",5,11,{tyyppi:"ottelu"})];'
  + 'window.__KIRJ=[{_pelaajaId:"p4",t:Date.now()-3600e3,tyyppi:"T",tehty:true},{_pelaajaId:"p4",t:Date.now()-7200e3,tyyppi:"T",tehty:true}];'
  + 'window.__VIESTIT=[{_firestoreId:"m1",fromNimi:"Alex Coach",teksti:"👍",luettu:false,t:Date.now()}];'
  + 'window.__PEL=' + JSON.stringify(PELAAJAT) + ';window.__JDOC=' + JSON.stringify(JDOC) + ';'
  + 'window.__aseta=function(o){o=o||{};_pelaajatData=o.pelaajat?o.pelaajat:window.__PEL.slice();_kalenteriTapahtumat=o.tapahtumat?o.tapahtumat:window.__EV.slice();_kirjaukset=window.__KIRJ.slice();_kirjauksetLadattu=true;_vpViestit=window.__VIESTIT.slice();_mJoukkueDocs=[window.__JDOC];window._kotiSaatHaettu="e2";window._kotiSaat={e2:{tulossa:4,estynyt:[{nimi:"Vera Sund",syy:"👍"}]}}};';
const MT_SEURANTA = 'window.__puuttuu={};var __mt=masterT;masterT=function(k){var r=__mt(k);if(typeof k==="string"&&r===k&&/\\p{L}{3}/u.test(k)&&tmNykyinenKieli()==="sv")window.__puuttuu[k]=1;return r};';   // raportti: reititetyt avaimet, joilta sv puuttuu
const KUTSU = (kieli, ryhmat) => KERAA + MT_SEURANTA + DATA + 'window.__toastit=[];var __t0=toast;toast=function(m,a){window.__toastit.push(String(m));return __t0(m,a)};'
  + 'window._mRyLista=' + JSON.stringify(ryhmat || []) + ';_lataaPelaajat=async function(){};_lataaTestitapahtumat=async function(){};_lataaKalenteriTapahtumat=async function(){};_mLataaJoukkueDocs=async function(){return _mJoukkueDocs};'
  + 'window.__aseta();masterVaihdaKieli("' + kieli + '");_setGreet("Alex");_setDate();document.getElementById("sbSeura").textContent="FC Demo";_paivitaKaikkiNakymat();'   // kuten _alusta + datan lataus
  + 'TM_VALMENTAJA_NAV.tmNavAsenna({db:_db,seuraId:"demo",t:masterT,ws:function(){return _ws},ryhmia:function(){return _mRyHaeLista().then(function(l){return l.length>0})}}).then(function(on){window.__navOn=on;if(on)setWs("koti")});';
const JOUKKUEET = { 'seurat/demo/joukkueet': [{ id: 'demo_u13', data: { nimi: 'Demo U13' } }, { id: 'demo_u14', data: { nimi: 'Demo U14' } }] };
const RYHMAT = [{ id: 'g1', nimi: 'G1 Demo', pelaajat_id: ['p1', 'p2'], aktiivinen: true }, { id: 'g2', nimi: 'G2 Demo', tyyppi: 'saanto', pelaajat_id: ['p3'], aktiivinen: true }];

const kaynnista = async () => { const { chromium } = require('playwright-core'); return chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }); };
const avaaSivu = async (selain, kieli, koko, o) => {
  o = o || {};
  const sk = await selain.newContext({ viewport: koko }), p = await sk.newPage(); const virheet = []; p.on('pageerror', (e) => virheet.push(e.message));
  await p.goto('file://' + sivu(MASTER, JUURI, { rooli: 'valmentaja', pohjat: false, dokit: o.lippu === false ? {} : LIPPU, kokoelmat: o.kokoelmat || {}, kutsu: KUTSU(kieli, o.ryhmat === undefined ? RYHMAT : o.ryhmat) }));
  await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 }); expect(await p.locator('#probe-out').textContent()).toBe('ok');
  await p.waitForFunction(() => window.__navOn !== undefined, null, { timeout: 15000 }); await p.waitForTimeout(150);
  return { sk, p, virheet };
};
const suodata = (v) => v.filter((e) => !/Firebase|firebase|permission|Sentry|appCheck|recaptcha|cancelled/i.test(e));

/* ── desktop 1280: (a) Koti, (b) vasen laita, (c) valitsin, (d) Joukkue, (f) + Havainto, Ryhmät ── */
async function desktopPolku(selain, kieli) {
  const kerätyt = [], k = async (p, vaihe, sel) => { for (const t of await p.evaluate((s) => window.__keraa(s), sel)) kerätyt.push({ vaihe, teksti: t }); };
  const { sk, p, virheet } = await avaaSivu(selain, kieli, { width: 1280, height: 900 }, { kokoelmat: JOUKKUEET });
  expect(await p.evaluate(() => window.__navOn)).toBe(true);
  const RUNKO = '#sidebar, .h-top, #nvTabs, .ws-view.active, #toast-wrap';
  const toastit = async (vaihe) => { for (const t of await p.evaluate(() => window.__toastit.splice(0))) kerätyt.push({ vaihe: vaihe + ' [toast]', teksti: t }); };
  // (a) Koti oikealla renderKotiV2:lla (FLEI, läsnäolot, jakso, havainnot, D3 → 3 + Näytä kaikki; nostot; Syke; Viestit; Seuraava saatavuus)
  await p.evaluate(() => { window.__aseta(); setWs('koti'); }); await p.waitForSelector('#kotiView .vk');
  await k(p, 'Koti (täysi)', RUNKO); expect(await p.locator('#kotiView .vk-kaikki').count()).toBe(1);
  await p.locator('#kotiView .vk-kaikki').click(); await k(p, 'Koti (Näytä kaikki auki)', '#kotiView');
  // (a) kaikki tehtävä-/nostotyypit libin mallista Masterin masterT:llä (huoltajaviesti, klippi, läsnä < 50 % eivät tule Masterin datasta vielä)
  const libKoti = (o) => p.evaluate((o) => {
    const DAY = 864e5, nyt = Date.now(), pel = window.__PEL.map((x, i) => ({ id: x.id, nimi: x.etunimi + ' ' + x.sukunimi, flei: i === 0 ? 30 : null, d3Odottaa: i === 1, historia: [] }));
    const m = TM_VALMENTAJA_KOTI.tmKotiMalli(Object.assign({ tapahtumat: window.__EV, nyt, joukkue: { id: 'demo_u13', nimi: 'Demo U13' }, pelaajat: pel, havainnot: { p3: tmPaivaIso(new Date(nyt - 2 * DAY)) },
      kirjaukset: [{ pelaajaId: 'p4', pvm: tmPaivaIso(new Date(nyt)), tyyppi: 'T', tehty: true }, { pelaajaId: 'p4', pvm: tmPaivaIso(new Date(nyt)), tyyppi: 'T', tehty: true }],
      lasnaolot: { p5: { treeni: { lasna: 1, yht: 4 } }, p1: { treeni: { lasna: 4, yht: 4 } } }, jakso: { nimi: 'Demo U13', alku: '2026-09-24', loppu: '2026-10-22', vk: 4, vkYht: 4 },
      viestit: [{ id: 'm1', kuka: '', teksti: '👍', luettu: false, vastattu: false, huoltaja: true, aika: nyt - 2 * DAY }], saatavuus: { e2: { tulossa: 4, estynyt: [{ nimi: 'Vera Sund', syy: '👍' }] } }, klipit: [{ id: 'k1', jaettu: false }], kertyma: { viikot: [{ vk: 'v40', ohjattu: 3, omatoimi: 2 }, { vk: 'v41', ohjattu: 4, omatoimi: 1 }] } }, o.malli));
    if (o.muokkaa === 'paattynyt' && m.tehtavat.length) m.tehtavat.forEach((x) => { if (x.avain === 'jakso') x.paattynyt = true; });
    document.getElementById('kotiView').innerHTML = TM_VALMENTAJA_KOTI_NAKYMA.tmKotiHTML(m, { t: masterT, on: () => '' });
    const b = document.querySelector('#kotiView .vk-kaikki'); if (b) b.click();
    return { teht: m.tehtavat.concat(m.lisaTehtavat).map((x) => x.avain), nostot: m.nostot.map((x) => x.kohta) };
  }, o || {});
  const kaikki = await libKoti({}); await k(p, 'Koti (kaikki tehtävätyypit, lib)', '#kotiView');
  expect(kaikki.teht).toEqual(['flei', 'lasnaolot', 'jakso', 'havainnot', 'd3', 'viesti', 'klippi']); expect(kaikki.nostot).toEqual(expect.arrayContaining(['lasnaolo', 'omatoimi', 'havainnot', 'kehu']));
  await libKoti({ muokkaa: 'paattynyt' }); await k(p, 'Koti (jakso päättyi, lib)', '#kotiView');
  await libKoti({ malli: { tapahtumat: [], uusi: true } }); await k(p, 'Koti (Aloita: pelaajia, lib)', '#kotiView');
  await p.evaluate(() => { window.__aseta({ tapahtumat: [] }); renderKoti(); }); await k(p, 'Koti (ei tapahtumia)', '#kotiView');
  await p.evaluate(() => { window.__aseta({ tapahtumat: [], pelaajat: [] }); renderKoti(); }); await k(p, 'Koti (Aloita: 0 pelaajaa)', '#kotiView');
  await p.evaluate(() => { window.__aseta(); renderKoti(); });
  // (b) vasen laita: Työkalut auki (6) + Asetukset; title/aria-label
  if (!(await p.locator('#nvSide .nv-tyokalut').count())) await p.locator('[data-nv-tyokalut]').click();
  expect(await p.locator('#nvSide .nv-tyokalut .nv-item').count()).toBe(6); await k(p, 'Vasen laita (Työkalut auki)', '#sidebar, .h-top');
  // (f) + Havainto (desktop) → valintamodaali
  await p.locator('#nvPlus .nv-plus').click(); await p.waitForTimeout(250); await k(p, '+ Havainto (modaali)', '#_tmPhValinta, #_pkModal, #nvPlus'); await toastit('+ Havainto');
  await p.keyboard.press('Escape'); await p.evaluate(() => { const v = document.getElementById('_tmPhValinta'); if (v) v.remove(); const m = document.getElementById('_pkModal'); if (m) m.remove(); });
  // (d) Joukkue: Tilanne + Kausi ja jaksot
  await p.evaluate(() => setWs('pulse')); await p.waitForTimeout(200); await k(p, 'Joukkue / Tilanne', RUNKO); await toastit('Tilanne');
  await p.locator('[data-nv-v="kausi"]').click(); await p.waitForTimeout(200); await k(p, 'Joukkue / Kausi ja jaksot', RUNKO); await toastit('Kausi');
  // (f) Ryhmät-näkymä (ryhmä + sääntöryhmä) + tyhjä tila
  await p.locator('[data-nv="ryhmat"]').click(); await p.waitForFunction(() => document.querySelector('#ryhmatView .nv-ryhma-nimi')); await k(p, 'Ryhmät', '#ryhmatView, #nvTabs');
  await p.evaluate(() => { document.getElementById('ryhmatView').innerHTML = TM_VALMENTAJA_NAV.tmRyhmatHTML([], {}, { t: masterT }); }); await k(p, 'Ryhmät (tyhjä)', '#ryhmatView');
  // (c) joukkuevalitsin: valmentaja usealla joukkueella; SA seura + joukkue ("— Kaikki joukkueet —")
  await p.evaluate(() => { window._valmentajaData = { joukkueetNimet: ['Demo U13', 'Demo U14'] }; _rakennaValmentajaJoukkueValitsin(); setWs('koti'); });
  expect(await p.locator('#valm-joukkue-valitsin').isVisible()).toBe(true); await k(p, 'Valitsin (valmentaja)', '#sidebar');
  await p.evaluate(async () => { document.getElementById('valm-joukkue-valitsin').remove(); const s = document.createElement('select'); s.id = 'sa-joukkue-sel'; s.innerHTML = '<option value="demo">FC Demo</option>'; document.querySelector('.sb-nav').insertBefore(s, document.querySelector('.sb-nav').firstChild); await _rakennaSAJoukkueValitsin('demo', { oletusKaikki: true }); setWs('koti'); });
  expect(await p.locator('#sa-joukkue-valitsin').isVisible()).toBe(true); await k(p, 'Valitsin (SA)', '#sidebar'); await toastit('Valitsin');
  const puuttuu = await p.evaluate(() => Object.keys(window.__puuttuu || {})); await sk.close();
  return { kerätyt, virheet: suodata(virheet), puuttuu };
}

/* ── (e) mobiili 390: alapalkki, Viestit-nappi, Valikko-vetolaatikko (+ valitsin + kielivalitsin), + Havainto ── */
async function mobiiliPolku(selain, kieli) {
  const kerätyt = [], k = async (p, vaihe, sel) => { for (const t of await p.evaluate((s) => window.__keraa(s), sel)) kerätyt.push({ vaihe, teksti: t }); };
  const { sk, p, virheet } = await avaaSivu(selain, kieli, { width: 390, height: 844 }, { kokoelmat: JOUKKUEET });
  await p.evaluate(async () => { await _rakennaSAJoukkueValitsin('demo', { oletusKaikki: true }); window.TM_VALMENTAJA_NAV.tmNavBadge(3); setWs('koti'); });
  expect(await p.locator('#nvMob').isVisible()).toBe(true);
  await k(p, 'Mobiili Koti + alapalkki + Viestit', '#nvMob, #nvViesti, .h-top, .ws-view.active');
  await p.locator('#nvMob .nv-mitem').last().click(); await p.waitForTimeout(350); await k(p, 'Mobiili Valikko (vetolaatikko)', '#sidebar');
  await p.locator('#nvSide [data-nv="joukkue"]').click(); await p.waitForTimeout(300); await k(p, 'Mobiili Joukkue', '#nvTabs, .ws-view.active, #nvMob');
  await p.locator('#nvMob .nv-mplus').click(); await p.waitForTimeout(250); await k(p, 'Mobiili + Havainto (modaali)', '#_tmPhValinta, #_pkModal');
  const puuttuu = await p.evaluate(() => Object.keys(window.__puuttuu || {})); await sk.close();
  return { kerätyt, virheet: suodata(virheet), puuttuu };
}

/* ── kielen vaihto lennossa (fi → sv vetolaatikon kielivalitsimesta): jo piirretyt näkymät + valitsimet päivittyvät ── */
async function vaihtoPolku(selain) {
  const kerätyt = [], k = async (p, vaihe, sel) => { for (const t of await p.evaluate((s) => window.__keraa(s), sel)) kerätyt.push({ vaihe, teksti: t }); };
  const { sk, p, virheet } = await avaaSivu(selain, 'fi', { width: 1280, height: 900 }, { kokoelmat: JOUKKUEET });
  await p.evaluate(async () => { const s = document.createElement('select'); s.id = 'sa-joukkue-sel'; s.innerHTML = '<option value="demo">FC Demo</option>'; document.querySelector('.sb-nav').insertBefore(s, document.querySelector('.sb-nav').firstChild); await _rakennaSAJoukkueValitsin('demo', { oletusKaikki: true }); window._valmentajaData = { joukkueetNimet: ['Demo U13', 'Demo U14'] }; _rakennaValmentajaJoukkueValitsin(); setWs('season'); });
  await p.evaluate(() => masterVaihdaKieli('sv')); await p.waitForTimeout(200);
  await k(p, 'Vaihto → Kausi ja jaksot', '#sidebar, .h-top, #nvTabs, .ws-view.active');
  for (const [ws, n] of [['pulse', 'Tilanne'], ['koti', 'Koti']]) { await p.evaluate((w) => setWs(w), ws); await p.waitForTimeout(150); await k(p, 'Vaihto → ' + n, '.ws-view.active, #nvTabs'); }
  const puuttuu = await p.evaluate(() => Object.keys(window.__puuttuu || {})); await sk.close(); return { kerätyt, virheet: suodata(virheet), puuttuu };
}

/* ── lippu POIS: vanha navigaatio (ei tämän portin kohde) — vain raportti ── */
async function vanhaPolku(selain, kieli) {
  const kerätyt = [], k = async (p, vaihe, sel) => { for (const t of await p.evaluate((s) => window.__keraa(s), sel)) kerätyt.push({ vaihe, teksti: t }); };
  const { sk, p } = await avaaSivu(selain, kieli, { width: 1280, height: 900 }, { lippu: false });
  const on = await p.evaluate(() => window.__navOn), v2 = await p.locator('#nvSide, #nvPlus, #nvMob, #nvTabs').count();
  await p.evaluate(() => setWs('koti')); await k(p, 'VANHA Koti', '#sidebar, .h-top, .wsbar, .ws-view.active');
  await sk.close(); return { on, v2, kerätyt };
}

describe('V-KOTI sv · tunnistin ja odotuslista', () => {
  it('SV_ODOTTAA on elävä: jokaisella rivillä EI vielä ole sv:tä koodissa, ja rivi on jossain Gemini-erätiedostossa (sv saapui → poista rivi)', () => {
    for (const a of SV_ODOTTAA) { expect(svOf(a), a + ' sai sv:n → poista SV_ODOTTAA-listalta').toBeUndefined(); expect(ERA_RIVIT.has(a), a + ' puuttuu docs/i18n/sv_kaannoserae_*.json:sta').toBe(true); }
    expect(new Set(SV_ODOTTAA).size).toBe(SV_ODOTTAA.length);
  });
  it('tunnistin löytää suomen ja englannin ja päästää ruotsin/nimet läpi', () => {
    const r = suomiJaanteet([{ vaihe: 'x', teksti: 'Kirjaudu ulos' }, { vaihe: 'x', teksti: 'Ma 19' }, { vaihe: 'x', teksti: 'Open settings' }, { vaihe: 'x', teksti: svOf('Kalenteri') }, { vaihe: 'x', teksti: 'Alva Berg' }, { vaihe: 'x', teksti: 'Demo U13 · 3' }], NIMET);
    expect(r).toHaveLength(3);
  });
  it('nav/koti-libien fi-tekstit on kerätty tarkkaan tunnistimeen', () => {
    for (const x of ['Koti', 'Kausi ja jaksot', 'Työkalut', 'Pelaajat, joihin kannattaa tarttua', 'Jakson kooste tehty', 'Eniten omatoimisia tällä viikolla — kehu?', 'Sinulla ei ole ryhmiä.', 'Aamutreeni']) expect(LIB_FI.has(x), x).toBe(true);
  });
});

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('V-KOTI sv · selain (lippu valmentaja_v2 päällä)', () => {
  const PUUTTUU = new Set();
  const raportti = (nimi, r, kaikki, puuttuu) => { if (process.env.TM_V_KOTI_SV_RAPORTTI === '1' && puuttuu) { const nak = (kaikki || []).map((x) => x.teksti).join('\n'); puuttuu.filter((k) => k.split(/\{\w+\}/).map((x) => x.trim()).filter((x) => kirj(x) >= 3).some((x) => nak.indexOf(x) >= 0)).forEach((k) => PUUTTUU.add(k)); console.log('\n== PUUTTUU (reititetty, sv puuttuu, näkyvissä; kertymä ' + PUUTTUU.size + ')\n' + JSON.stringify(Array.from(PUUTTUU).sort(), null, 0)); } if (process.env.TM_V_KOTI_SV_RAPORTTI === '1') console.log('\n== ' + nimi + ' (' + r.length + ')\n' + r.join('\n') + (kaikki && process.env.TM_V_KOTI_SV_KAIKKI === '1' ? '\n-- kerätyt (uniikit):\n' + Array.from(new Set(kaikki.map((x) => x.vaihe + ' | ' + x.teksti))).join('\n') : '')); };
  it('desktop 1280: Koti (kaikki kortit, tehtävä-/nostotyypit, tyhjät/Aloita), vasen laita + Työkalut, + Havainto, Joukkue Tilanne/Kausi, Ryhmät, valitsimet — ei suomea eikä englantia sv-tilassa', async () => {
    const selain = await kaynnista(); try {
      const sv = await desktopPolku(selain, 'sv'); const r = suomiJaanteet(sv.kerätyt, NIMET); raportti('desktop sv', r, sv.kerätyt, sv.puuttuu);
      expect(sv.kerätyt.length).toBeGreaterThan(150); expect(sv.virheet).toEqual([]); expect(r).toEqual([]);
      const fi = await desktopPolku(selain, 'fi'); expect(suomiJaanteet(fi.kerätyt, NIMET).length, 'negatiivitesti: fi-tilassa tunnistin löytää suomen').toBeGreaterThan(40);
    } finally { await selain.close(); }
  }, 300000);
  it('mobiili 390: alapalkki, Viestit-nappi, Valikko-vetolaatikko (valitsin + kielivalitsin), Joukkue, + Havainto — ei suomea eikä englantia sv-tilassa', async () => {
    const selain = await kaynnista(); try {
      const sv = await mobiiliPolku(selain, 'sv'); const r = suomiJaanteet(sv.kerätyt, NIMET); raportti('mobiili sv', r, sv.kerätyt, sv.puuttuu);
      expect(sv.kerätyt.length).toBeGreaterThan(40); expect(sv.virheet).toEqual([]); expect(r).toEqual([]);
      const fi = await mobiiliPolku(selain, 'fi'); expect(suomiJaanteet(fi.kerätyt, NIMET).length, 'negatiivitesti').toBeGreaterThan(10);
    } finally { await selain.close(); }
  }, 240000);
  it('kielen vaihto lennossa fi → sv: jo piirretty Kausi, Tilanne, Koti, otsikkorivi ja valitsimet päivittyvät ruotsiksi', async () => {
    const selain = await kaynnista(); try {
      const sv = await vaihtoPolku(selain); const r = suomiJaanteet(sv.kerätyt, NIMET); raportti('vaihto fi→sv', r, sv.kerätyt, sv.puuttuu);
      expect(sv.kerätyt.length).toBeGreaterThan(60); expect(sv.virheet).toEqual([]); expect(r).toEqual([]);
    } finally { await selain.close(); }
  }, 180000);
  it('lippu POIS: v2-navigaatiota ei asenneta (vanha navigaatio ei ole tämän portin kohde; vuodot raportoidaan)', async () => {
    const selain = await kaynnista(); try {
      const v = await vanhaPolku(selain, 'sv'); expect(v.on).toBe(false); expect(v.v2).toBe(0); raportti('VANHA navigaatio sv (ei porttia)', suomiJaanteet(v.kerätyt, NIMET));
    } finally { await selain.close(); }
  }, 120000);
});
