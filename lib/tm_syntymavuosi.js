/* ════════════════════════════════════════════════════════════════════════
   tm_syntymavuosi.js — Seura: "Muokkaa pelaajatietoja" syntymävuosi/-päivä (PURE; ei Firestorea eikä DOMia).
   Seuroilla on usein vain syntymävuosi → vuosi tallennetaan ILMAN keksittyä syntymäpäivää (§7.11: syntymaVuosi numerona).
   Täysi päivä on vapaaehtoinen: kun se annetaan, vuosi = päivän vuosi ja syntymaaika kirjoitetaan (Date.UTC, ei new Date(string)).
   tmSyntymaAvaus(p)           → { pvm:'YYYY-MM-DD'|'', vuosi:number|null }  (date-kenttää EI esitäytetä pelkästä vuodesta)
   tmSyntymaPaivitys(pvm,vuosi)→ { kentat:{syntymaVuosi[,syntymaaika]}, virhe:null } | { kentat:{}, virhe:'...' };
                                 molemmat tyhjiä → kentat {} (ei muuteta eikä poisteta olemassa olevaa)
   tmIkaluokkaVaroitus(vuosi, joukkueDocs, kausiVuosi) → true jos vuosi ei vastaa YHTÄÄN valituista joukkueista (ikä tiedossa); varoitus, ei este.
   Dual-export: module.exports || window.
════════════════════════════════════════════════════════════════════════ */
var TM_SYNTYMA_MIN_VUOSI = 2000;

function _tmSyntMaxVuosi(nyt) { return (nyt || new Date()).getFullYear(); }

function tmSyntymaAvaus(p) {
  var s = p && p.syntymaaika;
  var sek = s && (s.seconds != null ? s.seconds : s._seconds);
  if (sek != null) {
    var d = new Date(sek * 1000);
    return { pvm: d.toISOString().slice(0, 10), vuosi: d.getUTCFullYear() };
  }
  var v = p && p.syntymaVuosi != null ? parseInt(p.syntymaVuosi, 10) : NaN;
  return { pvm: '', vuosi: isNaN(v) ? null : v };
}

function tmSyntymaPaivitys(pvm, vuosi, nyt) {
  var maxV = _tmSyntMaxVuosi(nyt);
  var pvmStr = pvm == null ? '' : String(pvm).trim();
  var vuosiStr = vuosi == null ? '' : String(vuosi).trim();
  if (pvmStr) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pvmStr);
    if (!m) return { kentat: {}, virhe: 'Syntymäpäivä ei ole kelvollinen.' };
    var y = +m[1], kk = +m[2], pp = +m[3];
    var aika = new Date(Date.UTC(y, kk - 1, pp));
    if (aika.getUTCFullYear() !== y || aika.getUTCMonth() !== kk - 1 || aika.getUTCDate() !== pp || y < TM_SYNTYMA_MIN_VUOSI || y > maxV)
      return { kentat: {}, virhe: 'Syntymäpäivä ei ole kelvollinen.' };
    return { kentat: { syntymaaika: new Date(Date.UTC(y, kk - 1, pp)), syntymaVuosi: y }, virhe: null };
  }
  if (vuosiStr) {
    var v = /^\d{4}$/.test(vuosiStr) ? parseInt(vuosiStr, 10) : NaN;
    if (isNaN(v) || v < TM_SYNTYMA_MIN_VUOSI || v > maxV)
      return { kentat: {}, virhe: 'Syntymävuosi pitää olla ' + TM_SYNTYMA_MIN_VUOSI + '–' + maxV + '.' };
    return { kentat: { syntymaVuosi: v }, virhe: null };
  }
  return { kentat: {}, virhe: null };
}

/* Joukkueen ikäluokan numero: ikaryhma ('P10'/'U10'), muuten nimen "P10"-osa, muuten vuosi-kenttä (kausi − vuosi). null = ei tiedossa. */
function _tmSyntJoukkueIka(d, kausi) {
  if (!d) return null;
  var m = /(\d{1,2})\s*$/.exec(String(d.ikaryhma || '')) || /\b[PTU]\s?(\d{1,2})\b/i.exec(String(d.nimi || ''));
  if (m) return parseInt(m[1], 10);
  var v = parseInt(d.vuosi, 10);
  return isNaN(v) ? null : kausi - v;
}

function tmIkaluokkaVaroitus(vuosi, joukkueDocs, kausiVuosi) {
  var v = parseInt(vuosi, 10);
  if (isNaN(v) || !Array.isArray(joukkueDocs)) return false;
  var kausi = kausiVuosi || _tmSyntMaxVuosi();
  var ika = kausi - v, tiedossa = 0;
  for (var i = 0; i < joukkueDocs.length; i++) {
    var j = _tmSyntJoukkueIka(joukkueDocs[i], kausi);
    if (j == null) continue;
    tiedossa++;
    if (j === ika) return false;
  }
  return tiedossa > 0;
}

/* Lukeva tarkistus (scripts/tarkista_syntymaaika_1_1.js): pelaajat joiden syntymaaika on 1.1. (UTC) ja jotka on muokattu Seura-sivulta
   (muokkaajaUid/muokattu) = todennäköisesti lomakkeen vuodesta keksimä päivä. Palauttaa VAIN lukumäärät. */
function tmSyntyma11Tilasto(pelaajat) {
  var t = { pelaajia: 0, ykkosyksi: 0, ykkosyksi_ja_muokattu: 0 };
  (Array.isArray(pelaajat) ? pelaajat : []).forEach(function (p) {
    t.pelaajia++;
    var s = p && p.syntymaaika, sek = s && (s.seconds != null ? s.seconds : s._seconds);
    if (sek == null) return;
    var d = new Date(sek * 1000);
    if (d.getUTCMonth() !== 0 || d.getUTCDate() !== 1) return;
    t.ykkosyksi++;
    if (p.muokkaajaUid || p.muokattu) t.ykkosyksi_ja_muokattu++;
  });
  return t;
}

var TM_SYNTYMAVUOSI = { tmSyntymaAvaus: tmSyntymaAvaus, tmSyntymaPaivitys: tmSyntymaPaivitys, tmIkaluokkaVaroitus: tmIkaluokkaVaroitus, tmSyntyma11Tilasto: tmSyntyma11Tilasto, TM_SYNTYMA_MIN_VUOSI: TM_SYNTYMA_MIN_VUOSI };
if (typeof module !== 'undefined' && module.exports) module.exports = TM_SYNTYMAVUOSI;
if (typeof window !== 'undefined') { for (var _tsv in TM_SYNTYMAVUOSI) { try { window[_tsv] = TM_SYNTYMAVUOSI[_tsv]; } catch (e) {} } }
