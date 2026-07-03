// tm_idp.js — Vaihe 3a IDP-kausitavoite: ehdotusmoottori (heikoin arvioinnista) + pikakentät.
// Lukee VAIN Vaihe 2 -pikakentät (§26: ei uutta kyselyä). Datamalli: docs/IDP_YDIN_SPEC.md §2 (tavoite-objekti).
// Puhdas + injektoitavat norm-helperit (opts) → Vitest-testattava ilman Firebase/DOM.
//
// Kandidaatit: havaittu ≤2 (arviointi_havaittu + pelihavainto/ADAR-johdettu) · mitattu D2 (tki_kehityskohde) ·
// mitattu D1 (heikoin osaindeksi laskeD1Osaindeksit:stä). §28-kypsyysvahti: pre-PHV heikko 30m/MAS/CMJ EI kelpaa
// fokukseksi (biologisesti odotettu) → ohita; tekniikka/taito pre-PHV etusijalla (kultaikkuna auki).

// §28 — pre-PHV maturity-gated fyysiset osa-alueet (heikko = biologisesti odotettu, ei kehityskohde).
// speed=30m · endurance=MAS · power=CMJ. EI gated: acceleration(5/10m, neuraalinen), mobility(kasirata), suunnanmuutos.
var IDP_KYPSYYS_GATED = { speed: 1, endurance: 1, power: 1 };
function idpKypsyysEstetty(avain, phvTila) {
  var pre = (phvTila === 'PRE' || phvTila === 'LAH');
  return pre && !!IDP_KYPSYYS_GATED[avain];
}

// Osaindeksi (laskeD1Osaindeksit-avain) → taksonomia-avain + testimäppäys (mittari).
var IDP_OSA_AVAIN = { kiihdytys: 'acceleration', maksinopeus: 'speed', voima: 'power', ketteryys: 'mobility', aerobinen: 'endurance' };
var IDP_OSA_TESTI = {
  kiihdytys:   { testId: 'lin10m', yks: 's',    suunta: 'pienempi' },
  maksinopeus: { testId: 'lin30m', yks: 's',    suunta: 'pienempi' },
  voima:       { testId: 'cmj',    yks: 'cm',   suunta: 'suurempi' },
  ketteryys:   { testId: 'kasirata', yks: 's',  suunta: 'pienempi' },
  aerobinen:   { testId: 'mas',    yks: 'km/h', suunta: 'suurempi' }
};

// Kerää fokus-kandidaatit pikakentistä. opts: { tmTaksonomiaByAvain, tmAdarHavaittu, laskeD1Osaindeksit, tklajiAvain, ika, sp }.
function idpKeraaKandidaatit(p, opts) {
  opts = opts || {};
  var byAvain = opts.tmTaksonomiaByAvain || function () { return null; };
  var out = [];

  // 1) Havaittu ≤2 (arviointi_havaittu = litteä {avain:arvo} TAI {avain:{arvo}}) + pelihavainto (ADAR-johdettu render-ajassa).
  var hav = p.arviointi_havaittu || {};
  var seen = {}, tallennetut = {};
  Object.keys(hav).forEach(function (a) {
    tallennetut[a] = true;   // KAIKKI tallennetut 'silma'-avaimet (myös >2) yliajavat pelihavainnon
    var v = (hav[a] && hav[a].arvo != null) ? hav[a].arvo : hav[a];
    if (v != null && !isNaN(v) && v <= 2) { seen[a] = { arvo: +v, lahde: 'havaittu' }; }
  });
  var pelih = (typeof opts.tmAdarHavaittu === 'function') ? (opts.tmAdarHavaittu(p.adar_viimeisin) || {}) : {};
  Object.keys(pelih).forEach(function (a) {
    if (tallennetut[a]) return;   // tallennettu 'silma' voittaa (myös jos >2 = ei kehityskohde)
    var v = pelih[a].arvo;
    if (v != null && v <= 2) seen[a] = { arvo: v, lahde: 'pelihavainto' };
  });
  Object.keys(seen).forEach(function (a) {
    var it = byAvain(a);
    out.push({ avain: a, dim: it ? it.dim : null, nimi: it ? it.nimi_fi : a, taso: seen[a].arvo, lahde: seen[a].lahde,
      tyyppi: 'havaittu', mittariTestId: a, mittariYks: 'taso', mittariSuunta: 'suurempi' });
  });

  // 2) Mitattu D2 — tki_kehityskohde (laji-id, jo laskettu heikoin TK). taso: opts.tkLajiTaso jos saatavilla.
  if (p.tki_kehityskohde) {
    var laji = p.tki_kehityskohde;
    var taksAvain = (opts.tklajiAvain && opts.tklajiAvain[laji]) || null;
    var it2 = taksAvain ? byAvain(taksAvain) : null;
    var raaka = (p.tk_lajit_viimeisin && p.tk_lajit_viimeisin[laji + '_s'] != null) ? p.tk_lajit_viimeisin[laji + '_s'] : null;
    var taso2 = null, spTk = opts.spTk || opts.sp;   // tkLajiTaso odottaa P/T (opts.sp = M/N eerikkilälle)
    if (typeof opts.tkLajiTaso === 'function' && raaka != null && opts.ika != null && spTk) {
      var tt = opts.tkLajiTaso(laji, +raaka, Math.round(opts.ika), spTk);
      taso2 = (tt != null && tt > 0) ? tt : null;
    }
    out.push({ avain: taksAvain || laji, dim: 'D2', nimi: it2 ? it2.nimi_fi : laji, taso: taso2, lahde: 'mitattu',
      tyyppi: 'mitattu_d2', laji: laji, raaka: raaka, mittariTestId: laji, mittariYks: 's', mittariSuunta: 'pienempi' });
  }

  // 3) Mitattu D1 — heikoin osaindeksi (laskeD1Osaindeksit). sm_pallo pois (D2/TSI).
  if (typeof opts.laskeD1Osaindeksit === 'function' && opts.ika != null && opts.sp && p.hh_viimeisin) {
    var oi = opts.laskeD1Osaindeksit(p.hh_viimeisin, opts.ika, opts.sp);
    if (oi) {
      var min = null;
      Object.keys(IDP_OSA_AVAIN).forEach(function (k) { if (oi[k] != null && (min === null || oi[k] < oi[min])) min = k; });
      if (min) {
        var avainD1 = IDP_OSA_AVAIN[min], tm = IDP_OSA_TESTI[min], it3 = byAvain(avainD1);
        var raakaD1 = (p.hh_viimeisin && p.hh_viimeisin[tm.testId] != null) ? p.hh_viimeisin[tm.testId] : null;
        out.push({ avain: avainD1, dim: 'D1', nimi: it3 ? it3.nimi_fi : avainD1, taso: oi[min], lahde: 'mitattu',
          tyyppi: 'mitattu_d1', osaindeksi: min, raaka: raakaD1, mittariTestId: tm.testId, mittariYks: tm.yks, mittariSuunta: tm.suunta });
      }
    }
  }
  return out;
}

// Valitse heikoin kandidaatti §28-kypsyysvahdilla. pre-PHV: tekniikka/taito (D2) etusijalla; muuten matalin taso.
function idpValitseHeikoin(kandidaatit, p) {
  var phv = p ? p.phv_tila : null;
  var kelpo = (kandidaatit || []).filter(function (c) { return !idpKypsyysEstetty(c.avain, phv); });
  if (!kelpo.length) return null;
  var pre = (phv === 'PRE' || phv === 'LAH');
  var lahdePrio = { mitattu: 0, havaittu: 1, pelihavainto: 2 };
  kelpo.sort(function (a, b) {
    if (pre) { var ad = (a.dim === 'D2') ? 0 : 1, bd = (b.dim === 'D2') ? 0 : 1; if (ad !== bd) return ad - bd; }   // §28 taito etusijalla
    var at = (a.taso == null) ? 2.5 : a.taso, bt = (b.taso == null) ? 2.5 : b.taso;   // tki_kehityskohde (taso null) = keskiprioriteetti
    if (at !== bt) return at - bt;   // heikoin ensin
    return (lahdePrio[a.lahde] || 3) - (lahdePrio[b.lahde] || 3);
  });
  return kelpo[0];
}

// Johda tavoitearvo (Achievable §28). Havaittu 1–5 → current+1 (≤5). Mitattu → normigap/sekuntibudjetti (opts-helperit), fallback %.
function idpTavoitearvo(k, p, opts) {
  opts = opts || {};
  if (k.tyyppi === 'havaittu') {
    return { arvo: Math.min(5, (k.taso || 1) + 1), lahto: (k.taso != null ? k.taso : null), lahtoPvm: p.arviointi_pvm || null };
  }
  // Mitattu: lähtö = raaka; tavoite = seuraavan tason kynnys tai budjetti.
  var lahto = (k.raaka != null) ? +k.raaka : null;
  var lahtoPvm = (k.tyyppi === 'mitattu_d2') ? (p.tk_lajit_pvm || p.tki_pvm || null) : (p.hh_pvm || null);
  var tavoite = null;
  if (k.tyyppi === 'mitattu_d1' && typeof opts.eerikkilaNormiarvo === 'function' && opts.ika != null && opts.sp && lahto != null) {
    // seuraavan tason kynnysarvo (hhSeuraavaTaso jos saatavilla, muuten normiarvo taso 3)
    if (typeof opts.hhSeuraavaTaso === 'function') {
      var st = opts.hhSeuraavaTaso(k.mittariTestId, lahto, Math.round(opts.ika), opts.sp);
      if (st && st.kynnys != null) tavoite = st.kynnys;
    }
    if (tavoite == null) { var n3 = opts.eerikkilaNormiarvo(k.mittariTestId, Math.round(opts.ika), opts.sp); if (n3 != null) tavoite = n3; }
  } else if (k.tyyppi === 'mitattu_d2' && typeof opts.tkSekuntibudjetti === 'function' && lahto != null) {
    // sekuntibudjetti eliittiviitteeseen → tavoite lähempänä hyvää (Achievable-askel: ~puolet gapista)
    var budj = opts.tkLajiViite ? opts.tkLajiViite(k.laji, Math.round(opts.ika), opts.spTk || opts.sp) : null;
    if (budj && budj.hyva != null && lahto > budj.hyva) tavoite = Math.round((lahto - (lahto - budj.hyva) * 0.5) * 100) / 100;
  }
  // Fallback: 5 % parannus suuntaan (Achievable, ei epärealistinen).
  if (tavoite == null && lahto != null) tavoite = (k.mittariSuunta === 'pienempi') ? Math.round(lahto * 0.95 * 100) / 100 : Math.round(lahto * 1.05 * 100) / 100;
  return { arvo: tavoite, lahto: lahto, lahtoPvm: lahtoPvm };
}

// Vahvin dimensio (70/30-ankkuri). d1_taso/d2_taso/adar-norm → korkein.
function idpVahvinDim(p, opts) {
  var kand = [];
  if (p.d1_taso != null) kand.push({ dim: 'D1', nimi: 'nopeus/fysiikka', taso: p.d1_taso });
  if (p.d2_taso != null) kand.push({ dim: 'D2', nimi: 'tekniikka', taso: p.d2_taso });
  if (p.adar_viimeisin && p.adar_viimeisin.yht != null) kand.push({ dim: 'D4', nimi: 'peliäly', taso: p.adar_viimeisin.yht / 12 * 5 });
  if (!kand.length) return null;
  kand.sort(function (a, b) { return b.taso - a.taso; });
  return kand[0];
}

// Kausivuosi (arvio_pvm ~ 6 vk). nyt = Date (injektoitava determinismille).
function idpKausivuosi(nyt) { nyt = nyt || new Date(); return String(nyt.getFullYear()); }

// Rakenna tavoite-luonnos (IDP_YDIN_SPEC §2). Palauttaa null jos ei kelpaa kandidaattia.
function idpEhdotaTavoite(p, opts) {
  opts = opts || {};
  if (!p) return null;
  var kandidaatit = idpKeraaKandidaatit(p, opts);
  var k = idpValitseHeikoin(kandidaatit, p);
  if (!k) return null;
  var tav = idpTavoitearvo(k, p, opts);
  var vahvin = idpVahvinDim(p, opts);
  var nyt = opts.nyt || new Date();
  var pre = (p.phv_tila === 'PRE' || p.phv_tila === 'LAH');
  var kultaikkuna = (k.dim === 'D2') || pre;   // taito/tekniikkaikkuna auki pre/circa-PHV
  var perusteluOsat = [];
  if (k.tyyppi === 'havaittu') perusteluOsat.push('Havaittu kehityskohde (' + (k.lahde === 'pelihavainto' ? 'pelihavainto' : 'arvio') + ' taso ' + k.taso + '/5).');
  else if (tav.lahto != null && tav.arvo != null) perusteluOsat.push('Lähtö ' + tav.lahto + ' ' + k.mittariYks + ' → tavoite ' + tav.arvo + ' ' + k.mittariYks + '.');
  if (kultaikkuna) perusteluOsat.push('Taitoikkuna auki — sama työ tuottaa nyt moninkertaisen vaikutuksen (§28).');
  var tavoite = {
    fokus: { alue: k.avain, dim: k.dim, nimi: k.nimi },
    mittari: { testId: k.mittariTestId, yksikko: k.mittariYks, suunta: k.mittariSuunta },
    lahto: { arvo: tav.lahto, pvm: tav.lahtoPvm },
    tavoitearvo: tav.arvo,
    aikaraami: { kausi: (nyt.getMonth() >= 6 ? 'syksy ' : 'kevät ') + nyt.getFullYear(), kesto_vk: 6,
      arvio_pvm: new Date(nyt.getTime() + 42 * 86400000).toISOString().slice(0, 10) },
    perustelu: { teksti: perusteluOsat.join(' '), kultaikkuna: kultaikkuna, lahde: 'moottori' },
    ankkuri_7030: vahvin ? { vahvuus_dim: vahvin.dim, teksti: 'Integroi ' + k.nimi + ' vahvuuteen (' + vahvin.nimi + ', ' + vahvin.dim + ').' } : null,
    pelaajan_tavoite: '',
    omistaja: 'yhdessa',
    status: 'ehdotettu',
    lahde: 'moottori',
    luotu: nyt.toISOString(),
    arviot: []
  };
  return tavoite;
}

// Pikakentät pelaajadokkiin (§26): idp_tila · idp_edistyma · idp_fokus. edistyma = % lähtö→tavoite (0 alkuun).
function idpPikakentat(tavoite) {
  if (!tavoite) return { idp_tila: null, idp_edistyma: null, idp_fokus: null };
  var edist = null;
  var la = tavoite.lahto ? tavoite.lahto.arvo : null, tv = tavoite.tavoitearvo;
  // Aktiivisen tavoitteen edistymä: nykyarvo = viimeisin arvio tai lähtö. 3a: vasta lähtö → 0 %.
  if (la != null && tv != null && la !== tv) {
    var nyk = (tavoite.arviot && tavoite.arviot.length) ? tavoite.arviot[tavoite.arviot.length - 1].arvo : la;
    var pct = Math.round((nyk - la) / (tv - la) * 100);
    edist = Math.max(0, Math.min(100, pct)) + ' %';
  }
  return {
    idp_tila: tavoite.status || null,
    idp_edistyma: edist,
    idp_fokus: tavoite.fokus ? { alue: tavoite.fokus.alue, dim: tavoite.fokus.dim, nimi: tavoite.fokus.nimi } : null
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    IDP_KYPSYYS_GATED: IDP_KYPSYYS_GATED,
    idpKypsyysEstetty: idpKypsyysEstetty,
    idpKeraaKandidaatit: idpKeraaKandidaatit,
    idpValitseHeikoin: idpValitseHeikoin,
    idpTavoitearvo: idpTavoitearvo,
    idpVahvinDim: idpVahvinDim,
    idpKausivuosi: idpKausivuosi,
    idpEhdotaTavoite: idpEhdotaTavoite,
    idpPikakentat: idpPikakentat
  };
}
