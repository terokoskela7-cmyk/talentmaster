/**
 * TalentMaster™ — R4: Kehitys v2 jaksofokus-työpöytä (KEHITYS_KISS_design_kartta_v2).
 * 5 poikkeamaa kartasta korjattu: (1) rail-vapaa 940 · (2) fwh-otsikko · (3) VP-oversight status-nauha ·
 * (4) jaksofokus-editori inline-focal (aina auki, ei modaalia) · (5) off-palette-pinkki pois lähdechipeistä.
 * Luonne: asettelu + render-järjestys + editorin uudelleen-mount (REUSE) + CSS-väri. Ei uutta arviointilogiikkaa.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

function extract(sig) {
  const lines = HTML.split('\n');
  const s = lines.findIndex((l) => l.includes(sig));
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}

describe('(1) rail-vapaa kattaa Kehityksen (tab 3) + leveyskatto 940', () => {
  it('_jspVaihda togglaa railvapaan tabeille 0/1/2/3', () => {
    expect(HTML).toContain("_grid.classList.toggle('jsp-railvapaa', n === 0 || n === 1 || n === 2 || n === 3 || n === 4)");
  });
  it('#_jspTab3 mukana 940px-lukumitassa (kartan .wrap)', () => {
    expect(HTML).toContain('.jsp-grid.jsp-railvapaa #_jspTab1, .jsp-grid.jsp-railvapaa #_jspTab2, .jsp-grid.jsp-railvapaa #_jspTab3 { width: 100%; max-width: 940px;');
  });
});

/* PR B (KISS, taso 1 = TILANNE) poisti nama kolme elementtia valilehden karjesta: tyopoydan
   otsikko (_vpKehOtsikkoHTML), VP-oversight-nauha (_vpKehStatusHTML) ja moottorin kortit.
   Jarjestys-invariantti ei ole enaa mitattavissa — sen tilalle jaa poistovartija, jotta clutter
   ei palaa takaisin ensimmaiseksi asiaksi jonka valmentaja nakee. */
describe('(2+3) tason 1 kärki: Seuraava askel, EI otsikkoa/nauhaa/moottoria', () => {
  it('_kehExtra alkaa Seuraava askel -laatikolla', () => {
    const iAskel = HTML.indexOf('_kehExtra += \'<div id="_jspKehAskel">\' + _vpKehSeuraavaAskelHTML(p)');
    expect(iAskel, 'Seuraava askel puuttuu tason 1 kärjestä').toBeGreaterThan(0);
    const iSuun = HTML.indexOf('_kehExtra += \'<div id="_jspKehSuunnitelma"');
    expect(iSuun, 'rivit puuttuvat').toBeGreaterThan(0);
    expect(iAskel, 'Seuraava askel ei ole ensimmäisenä').toBeLessThan(iSuun);
  });
  it('poistetut elementit eivät ole palanneet', () => {
    expect(HTML).not.toContain('_kehExtra += _vpKehOtsikkoHTML();');
    expect(HTML).not.toContain('_kehExtra += \'<div id="_jspKehStatus">\'');
    expect(HTML).not.toContain('_kehExtra += _vpMoottoriKortitHTML(p, p.id);');
    expect(HTML, 'kuollut funktio jäi lähteeseen').not.toContain('function _vpKehOtsikkoHTML(');
    expect(HTML, 'kuollut funktio jäi lähteeseen').not.toContain('function _vpKehStatusHTML(p) {');
  });
});

describe('(4) jaksofokus = INLINE-FOCAL editori (aina auki, ei modaalia)', () => {
  /* Taso 2 jaettiin tilanteeksi (oletus) ja muokkaukseksi: wrapperi mounttaa #_jfInlineEditor:in ja
     valitsee sisallon tilan mukaan, ja osa-alue/runko-slotit elavat VAIHTOnakymassa (siella ne myos
     re-renderoidaan). Invariantti on sama: yksi mount-piste + samat slot-id:t niiden omassa
     nakymassa, joten _vpJfSetDomeeni loytaa ne yha. */
  it('_vpJfInlineHTML mounttaa #_jfInlineEditor:in ja valitsee sisällön tilan mukaan', () => {
    const T = extract('function _vpJfInlineHTML(');
    expect(T).toContain('id="_jfInlineEditor" class="jsp-jf-focal"');
    expect(T).toContain('_vpJfInlineSisaltoHTML(p)');
    const D = extract('function _vpJfInlineSisaltoHTML(p) {');
    expect(D).toContain('_vpJfVaihtoHTML(p)');
    expect(D).toContain('_vpJfTavoitteetMuokkaaHTML(p)');
    expect(D).toContain('_vpJfTilanneHTML(p)');
  });
  it('vaihtonäkymä mounttaa SAMAT slot-ID:t (re-render-reuse)', () => {
    const T = extract('function _vpJfVaihtoHTML(p) {');
    expect(T).toContain('id="_vpJfToggle"');
    expect(T).toContain('id="_jfOhjausSlot"');
    expect(T).toContain('_vpJfToggleHTML(p)');
    expect(T).toContain('_vpJfBodyHTML(p)');
    // tavoitteet ovat oma tila, eivät enää samassa näkymässä taidon valinnan kanssa
    expect(extract('function _vpJfTavoitteetMuokkaaHTML(p) {')).toContain('_vpJfLinkitHTML(p)');
  });
  it('init erotettu jaettuun _jfOhjausAlusta (REUSE, ei kahta versiota)', () => {
    expect(HTML).toContain('function _jfOhjausAlusta(pid, esiValinta, lahde, domeeni) {');
    // inline mount + modaali käyttävät samaa alustusta
    expect(extract('function _vpJfInlineHTML(')).toContain('_jfOhjausAlusta(p.id)');
    expect(HTML).toContain('const p = _jfOhjausAlusta(pid, esiValinta, lahde, domeeni);');
  });
  it('_jfOhjaa reitittää inlineen jos editori mountattu (ei duplikaatti-modaalia)', () => {
    const T = extract('window._jfOhjaa = function (pid, esiValinta, lahde, domeeni) {');
    expect(T).toContain("const _inl = document.getElementById('_jfInlineEditor');");
    expect(T).toContain('_jspVaihda(3)');                     // → Kehitys-työpöytä
    expect(T).toContain("document.getElementById('_accJaksofokus')");   // avaa TASO 2
    /* Modaali säilyy fallbackina. Väite kohdistuu INVARIANTTIIN (fallback
       rakentaa yhä `_jfModal`:n), ei toteutusriviin: paneeli siirtyi jaettuun
       alasivu-shelliin, joka hoitaa edellisen instanssin sulkemisen itse. */
    expect(T).toContain("id: '_jfModal'");
  });
  it('TASO 2 body = inline-editori työpöydässä (avoin=true) · read-only raportissa', () => {
    const T = extract('function _vpKehSuunnitelmaHTML(p, opts) {');
    expect(T).toContain('const _inlineEditori = !opts || opts.editori !== false;');
    expect(T).toContain('_vpJfInlineHTML(p)');
    expect(T).toContain('_vpTyopoytaJaksofokusHTML(p)');       // read-only fallback (raportti) säilyy
    /* Otsikkohierarkia (Oura v2): row(...) ottaa nyt OBJEKTIN positionaalisten argumenttien sijaan, ja
       "TASO 2 · …"-eyebrow poistui riveiltä (järjestys näkyy murupolusta). Väitteet kohdistuvat samoihin
       INVARIANTTEIHIN kuin ennen: oikea id + nimi, body = jfBody + jfEvid.
       PR B: rivi EI ole enaa aina auki cockpitissa — taso 1 on tilanne, taso 2 avataan rivilta. */
    expect(T).toContain("_accJaksofokus'");   // id-etuliite (idp) vain raportissa — invariantti = rivin tunniste
    expect(T).toContain("nimi: vpT('Nyt harjoitellaan')");   // PR B (B6): riviotsikko selkokielelle   // IDP-vihje ⓘ voi olla nimen perässä
    expect(T).toContain('body: jfBody + jfEvid');     // K3: jfBody + kohdennetun ominaisuuden evidenssi (jfEvid)
    expect(T).toContain('avoin: !_inlineEditori && !jfNimi,');
  });
  it('Pelaajaraportti (PDC) käyttää read-only-tilaa (ei inline-editoria/duplikaatti-ID:itä)', () => {
    expect(HTML).toContain("_vpKehSuunnitelmaHTML(p, { editori: false })");
  });
});

describe('(5) off-palette-pinkki (#c060a8) pois Kehitys-lähdechipeistä', () => {
  it('kausitavoite-summary + fokus-lähdesiru = var(--ink3) (ei pinkki)', () => {
    const T = extract('function _vpKausitavoiteHTML(p) {');
    expect(T).not.toContain('#c060a8');
    expect(T).not.toContain('rgba(192,96,168');
    /* i18n-markup-purku: teksti irtosi omaksi vpT-avaimekseen; VÄRI-guard on yhä
       markupissa ja siksi yhä valvottavissa. */
    expect(T).toContain("<span class=\"chip\" style=\"color:var(--ink3);margin-left:4px\">' + vpT('◎ pelihavainto')");
    expect(T).toContain("<span class=\"chip\" style=\"color:var(--ink3);border-color:var(--border)\">' + vpT('◎ Lähde: pelihavainto')");  // i18n V6: teksti vpT-reititetty; väri-guard säilyy
  });
  it('"Mitä pelaajan tulee osata" havainnointi-otsikko = var(--ink3)', () => {
    const T = extract('function _vpMitaOsattavaHTML(p) {');
    expect(T).not.toContain('#c060a8');
    /* i18n-markup-purku: otsikkoteksti omaksi vpT-avaimekseen; väri-guard säilyy markupissa. */
    expect(T).toContain('color:var(--ink3);font-weight:700;text-transform:uppercase;margin:6px 0 2px">' + "' + vpT('👁 Havainnointi");
  });
});

/* Nama neljä tapausta suorittivat poistetut funktiot. Niiden tilalle jaa RENDEROITY todiste
   siita, etta sama tieto on yha saatavilla — mutta yhtena asiana (Seuraava askel) eika nauhana,
   ja etta nauhan sanasto ("VP-oversight", "Suunnitelman muokkauskoti") on poissa valilehdelta. */
describe('tason 1 kärki suoritettuna (data-vetoinen, ei uutta dataa)', () => {
  let askelFn;
  beforeAll(() => {
    /* window._pdcPaatos on Seuraava askel -laatikon AINOA paatoslahde (sama kuin raportissa).
       Tynka palauttaa null = hiljainen tila. */
    const pre =
      'var _jsvEsc = function(s){return String(s==null?"":s);};\n'
      + 'var vpT = function(x){return x;};\n'
      + 'var _pvmFiVP = function(x){return String(x);};\n'
      + 'var window = { _pdcPaatos: function(){ return { tila: "hiljainen" }; } };\n';
    askelFn = new Function(pre
      + extract('function _vpAskelNappi(avain) {')
      + extract('function _vpKehSeuraavaAskelHTML(p) {')
      + '\n return _vpKehSeuraavaAskelHTML;')();
  });
  it('hiljainen tila (ei päätöstä) → yksi rivi, ei laatikkoa', () => {
    const h = askelFn({ id: 'p1' });
    expect(h).toContain('Ajan tasalla');
    expect(h, 'hiljainen tila maalattiin toimenpiteeksi').not.toContain('jsp-keh-askel toimi');
  });
  it('vanha nauhasanasto on poissa lähteestä', () => {
    expect(HTML, 'oversight-kieli jäi käyttöliittymään').not.toContain('VP-oversight · tila yhdellä silmäyksellä');
    expect(HTML, 'työpöytä-kieli jäi käyttöliittymään').not.toContain('Suunnitelman muokkauskoti');
  });
});
