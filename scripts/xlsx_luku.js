'use strict';
/**
 * xlsx_luku.js — minimaalinen, riippuvuudeton .xlsx-lukija (vain Node-sisäiset zlib/Buffer). Ei kirjoitusta, ei kaavoja (luetaan tallennetut arvot).
 * Syy: SheetJS (npm xlsx) on vanhentunut/haavoittuva (audit-portti) ja skripti lukee vain taulukkoarvoja.
 *   lueXlsx(buffer) → { sheets: { [välilehti]: string[][] } }  (solut merkkijonoina; tyhjä solu = '' ; rivit ja sarakkeet sijainnin mukaan, loppuvyö trimmataan)
 */
const zlib = require('zlib');

function lueZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('xlsx_luku: ei zip-tiedosto (EOCD puuttuu)');
  const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16); const out = {};
  for (let k = 0; k < n; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('xlsx_luku: zip-keskushakemisto rikki');
    const meth = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lho = buf.readUInt32LE(p + 42);
    const nimi = buf.toString('utf8', p + 46, p + 46 + nl);
    const lnl = buf.readUInt16LE(lho + 26), lel = buf.readUInt16LE(lho + 28), ds = lho + 30 + lnl + lel;
    const data = buf.subarray(ds, ds + csize);
    out[nimi] = meth === 0 ? data : meth === 8 ? zlib.inflateRawSync(data) : null;
    if (out[nimi] === null) throw new Error('xlsx_luku: tuntematon pakkaus ' + meth + ' (' + nimi + ')');
    p += 46 + nl + el + cl;
  }
  return out;
}
const dekoodaa = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-fA-F]+);/g, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, '&');
const teksti = (xml) => { let t = ''; const re = /<t[^>]*>([\s\S]*?)<\/t>/g; let m; while ((m = re.exec(xml))) t += dekoodaa(m[1]); return t; };
const sarakeIdx = (ref) => { const l = /^[A-Z]+/.exec(ref)[0]; let n = 0; for (const c of l) n = n * 26 + (c.charCodeAt(0) - 64); return n - 1; };

function lueXlsx(buffer) {
  const z = lueZip(buffer), get = (n) => (z[n] ? z[n].toString('utf8') : null);
  const wb = get('xl/workbook.xml'), rels = get('xl/_rels/workbook.xml.rels');
  if (!wb || !rels) throw new Error('xlsx_luku: workbook puuttuu');
  const ss = []; const sst = get('xl/sharedStrings.xml');
  if (sst) { const re = /<si>([\s\S]*?)<\/si>/g; let m; while ((m = re.exec(sst))) ss.push(teksti(m[1])); }
  const relMap = {}; { const re = /<Relationship\b[^>]*>/g; let m; while ((m = re.exec(rels))) { const id = /Id="([^"]+)"/.exec(m[0]), tg = /Target="([^"]+)"/.exec(m[0]); if (id && tg) relMap[id[1]] = tg[1]; } }
  const sheets = {}; const re = /<sheet\b[^>]*>/g; let m;
  while ((m = re.exec(wb))) {
    const nimi = dekoodaa(/name="([^"]*)"/.exec(m[0])[1]), rid = /r:id="([^"]+)"/.exec(m[0])[1];
    let polku = relMap[rid]; if (!polku) continue; polku = polku.replace(/^\/?(xl\/)?/, 'xl/');
    const xml = get(polku); if (!xml) continue;
    const rows = []; const rr = /<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g; let r;
    while ((r = rr.exec(xml))) {
      const rnum = /\br="(\d+)"/.exec(r[0]); const idx = rnum ? +rnum[1] - 1 : rows.length; const arr = [];
      const cr = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let c;
      while ((c = cr.exec(r[1] || ''))) {
        const at = c[1], body = c[2] || '', ref = /\br="([A-Z]+\d+)"/.exec(at), t = /\bt="([^"]+)"/.exec(at), col = ref ? sarakeIdx(ref[1]) : arr.length;
        let v = '';
        if (t && t[1] === 's') { const x = /<v>([\s\S]*?)<\/v>/.exec(body); v = x ? (ss[+x[1]] || '') : ''; }
        else if (t && t[1] === 'inlineStr') v = teksti(body);
        else { const x = /<v>([\s\S]*?)<\/v>/.exec(body); v = x ? dekoodaa(x[1]) : ''; }
        arr[col] = v;
      }
      for (let i = 0; i < arr.length; i++) if (arr[i] === undefined) arr[i] = '';
      while (rows.length < idx) rows.push([]); rows[idx] = arr;
    }
    while (rows.length && rows[rows.length - 1].every((x) => x === '')) rows.pop();
    sheets[nimi] = rows;
  }
  return { sheets };
}
module.exports = { lueXlsx, lueZip };
