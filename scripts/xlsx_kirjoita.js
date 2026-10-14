'use strict';
/**
 * xlsx_kirjoita.js — minimaalinen, riippuvuudeton .xlsx-kirjoittaja (vain Node-sisäiset zlib/Buffer; pari xlsx_luku.js:lle). Vain merkkijonosolut, sarakeleveydet, lihavoitu otsikkorivi, jäädytetty otsikko, pudotusvalikot (data validation, lista-alue) ja rivitys.
 *   kirjoitaXlsx({ sheets: [{ nimi, rivit: string[][], leveys?: number[], otsikko?: boolean, jaa?: boolean, validoinnit?: [{ sqref:'H2:H200', kaava:'listat!$A$1:$A$15' }], rivita?: boolean }] }) → Buffer
 * Syy: SheetJS (npm xlsx) on vanhentunut/haavoittuva (audit-portti), ja pohjan tarvitsee vain taulukkoarvot + valintalistat.
 */
const zlib = require('zlib');

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const kol = (i) => { let s = '', n = i + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

function zip(tiedostot) {   // [{ nimi, data:Buffer }] → Buffer (deflate)
  const osat = [], kesk = []; let ofs = 0;
  tiedostot.forEach((f) => {
    const nimi = Buffer.from(f.nimi, 'utf8'), raaka = f.data, pakattu = zlib.deflateRawSync(raaka), crc = crc32(raaka);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(pakattu.length, 18); lh.writeUInt32LE(raaka.length, 22); lh.writeUInt16LE(nimi.length, 26); lh.writeUInt16LE(0, 28);
    osat.push(lh, nimi, pakattu);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10); ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(pakattu.length, 20); ch.writeUInt32LE(raaka.length, 24); ch.writeUInt16LE(nimi.length, 28); ch.writeUInt32LE(ofs, 42);
    kesk.push(ch, nimi); ofs += lh.length + nimi.length + pakattu.length;
  });
  const keskBuf = Buffer.concat(kesk), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(tiedostot.length, 8); end.writeUInt16LE(tiedostot.length, 10); end.writeUInt32LE(keskBuf.length, 12); end.writeUInt32LE(ofs, 16);
  return Buffer.concat(osat.concat([keskBuf, end]));
}

function taulukko(s) {
  const L = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'];
  L.push('<sheetViews><sheetView workbookViewId="0">' + (s.jaa ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : '') + '</sheetView></sheetViews>');
  if (s.leveys && s.leveys.length) L.push('<cols>' + s.leveys.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>');
  L.push('<sheetData>' + s.rivit.map((r, ri) => '<row r="' + (ri + 1) + '">' + r.map((v, ci) => (v === '' || v == null) ? '' : '<c r="' + kol(ci) + (ri + 1) + '" t="inlineStr" s="' + (s.otsikko && ri === 0 ? 1 : (s.rivita ? 2 : 0)) + '"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>').join('') + '</row>').join('') + '</sheetData>');
  if (s.validoinnit && s.validoinnit.length) L.push('<dataValidations count="' + s.validoinnit.length + '">' + s.validoinnit.map((v) => '<dataValidation type="list" allowBlank="1" showErrorMessage="0" sqref="' + esc(v.sqref) + '"><formula1>' + esc(v.kaava) + '</formula1></dataValidation>').join('') + '</dataValidations>');
  L.push('</worksheet>'); return L.join('');
}

function kirjoitaXlsx(wb) {
  const sh = wb.sheets, X = (t) => Buffer.from(t, 'utf8');
  const tiedostot = [
    { nimi: '[Content_Types].xml', data: X('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sh.map((s, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>') },
    { nimi: '_rels/.rels', data: X('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
    { nimi: 'xl/workbook.xml', data: X('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sh.map((s, i) => '<sheet name="' + esc(s.nimi) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>') },
    { nimi: 'xl/_rels/workbook.xml.rels', data: X('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sh.map((s, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') + '<Relationship Id="rId' + (sh.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>') },
    { nimi: 'xl/styles.xml', data: X('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDE8E2"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>') },
  ].concat(sh.map((s, i) => ({ nimi: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: X(taulukko(s)) })));
  return zip(tiedostot);
}
module.exports = { kirjoitaXlsx, crc32 };
