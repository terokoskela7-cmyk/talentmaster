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

describe('(2+3) fwh-otsikko + VP-oversight status-nauha prependattu työpöytään', () => {
  it('_kehExtra alkaa otsikolla + statuksella ENNEN moottoria', () => {
    const iOts = HTML.indexOf('_kehExtra += _vpKehOtsikkoHTML();');
    const iStat = HTML.indexOf('_kehExtra += _vpKehStatusHTML(p);');
    const iMoot = HTML.indexOf('_kehExtra += _vpMoottoriKortitHTML(p, p.id);');
    expect(iOts).toBeGreaterThan(0);
    expect(iOts).toBeLessThan(iStat);
    expect(iStat).toBeLessThan(iMoot);
  });
  it('otsikko = "Suunnitelman muokkauskoti"', () => {
    const T = extract('function _vpKehOtsikkoHTML(');
    expect(T).toContain('Jaksofokus-työpöytä');
    expect(T).toContain('Suunnitelman muokkauskoti');
  });
});

describe('(4) jaksofokus = INLINE-FOCAL editori (aina auki, ei modaalia)', () => {
  it('_vpJfInlineHTML mounttaa SAMAT slot-ID:t (re-render-reuse) #_jfInlineEditor:iin', () => {
    const T = extract('function _vpJfInlineHTML(');
    expect(T).toContain('id="_jfInlineEditor" class="jsp-jf-focal"');
    expect(T).toContain('id="_vpJfToggle"');
    expect(T).toContain('id="_jfOhjausSlot"');
    expect(T).toContain('id="_jfLinkitSlot"');
    expect(T).toContain('_vpJfToggleHTML(p)');
    expect(T).toContain('_vpJfBodyHTML(p)');
    expect(T).toContain('_vpJfLinkitHTML(p)');
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
    expect(T).toContain("document.getElementById('_jfModal')?.remove()");   // modaali säilyy fallbackina
  });
  it('TASO 2 body = inline-editori työpöydässä (avoin=true) · read-only raportissa', () => {
    const T = extract('function _vpKehSuunnitelmaHTML(p, opts) {');
    expect(T).toContain('const _inlineEditori = !opts || opts.editori !== false;');
    expect(T).toContain('_vpJfInlineHTML(p)');
    expect(T).toContain('_vpTyopoytaJaksofokusHTML(p)');       // read-only fallback (raportti) säilyy
    expect(T).toContain("row('_accJaksofokus', '📍', 'TASO 2 · TÄMÄ JAKSO · MESO 4–8 VK', 'Jaksofokus'");   // IDP-vihje ⓘ voi olla otsikon perässä
    expect(T).toContain("jfSum, jfChip, jfNimi && !jfUmp, jfBody + jfEvid, _inlineEditori);");   // K3: jfBody + kohdennetun ominaisuuden evidenssi (jfEvid)
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
    expect(T).toContain("<span class=\"chip\" style=\"color:var(--ink3);margin-left:4px\">◎ pelihavainto");
    expect(T).toContain("<span class=\"chip\" style=\"color:var(--ink3);border-color:var(--border)\">' + vpT('◎ Lähde: pelihavainto')");  // i18n V6: teksti vpT-reititetty; väri-guard säilyy
  });
  it('"Mitä pelaajan tulee osata" havainnointi-otsikko = var(--ink3)', () => {
    const T = extract('function _vpMitaOsattavaHTML(p) {');
    expect(T).not.toContain('#c060a8');
    expect(T).toContain('color:var(--ink3);font-weight:700;text-transform:uppercase;margin:6px 0 2px">👁 Havainnointi');
  });
});

describe('status-nauha & otsikko suoritettuina (data-vetoinen, ei uutta dataa)', () => {
  let statusFn, otsikkoFn;
  beforeAll(() => {
    const pre =
      'var _jsvEsc = function(s){return String(s==null?"":s);};\n' +
      'var idpJumissa = function(){return false;};\n' +
      'var window = { TM_JAKSOFOKUS: { tmJfUmpeutunut: function(jf){ if(!jf||!jf.alkoi) return false; return false; } } };\n';
    statusFn = new Function(pre + extract('function _vpKehStatusHTML(p) {') + '\n return _vpKehStatusHTML;')();
    otsikkoFn = new Function(pre + extract('function _vpKehOtsikkoHTML(') + '\n return _vpKehOtsikkoHTML;')();
  });
  it('tyhjä työpöytä (ei tavoitetta eikä fokusta) → ei status-nauhaa', () => {
    expect(statusFn({})).toBe('');
  });
  it('aktiivinen kausitavoite + jaksofokus (ilman alkoi) → aikataulussa · hyväksytty · kesto · periaate', () => {
    const h = statusFn({ _idpTavoite: { status: 'aktiivinen' }, jaksofokus: { konsepti_nimi: 'Haltuunotto', kesto_vk: 4 } });
    expect(h).toContain('● Aikataulussa');
    expect(h).toContain('Kausitavoite <b>hyväksytty</b>');
    expect(h).toContain('Jaksofokus <b>kesto 4 vk</b>');
    expect(h).toContain('Yksi prioriteetti · vähemmän on enemmän');
    expect(h).toContain('VP-oversight · tila yhdellä silmäyksellä');
  });
  it('ei jaksofokusta mutta tavoite → "○ Ei jaksofokusta" (warn)', () => {
    const h = statusFn({ _idpTavoite: { status: 'ehdotettu' } });
    expect(h).toContain('○ Ei jaksofokusta');
    expect(h).toContain('Kausitavoite <b>ehdotettu</b>');
    expect(h).not.toContain('Jaksofokus <b>');
  });
  it('otsikko renderöi muokkauskoti-tekstin', () => {
    expect(otsikkoFn()).toContain('Suunnitelman muokkauskoti');
  });
});
