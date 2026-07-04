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

// Järjestä kelvolliset kandidaatit heikoin ensin. §28: pre-PHV → tekniikka/taito (D2) etusijalla; ILMAN PHV-dataa
// → ei-fyysiset (ei-D1) etusijalla (§4: fyysinen taso ei luotettava kypsyyttä varmentamatta). Palauttaa suodatetun+järjestetyn.
function idpJarjestaKandidaatit(kandidaatit, p) {
  var phv = p ? p.phv_tila : null;
  var kelpo = (kandidaatit || []).filter(function (c) { return !idpKypsyysEstetty(c.avain, phv); });
  var pre = (phv === 'PRE' || phv === 'LAH');
  var eiPhv = !phv;   // §4 — kypsyysdataa ei ole
  var lahdePrio = { mitattu: 0, havaittu: 1, pelihavainto: 2 };
  kelpo.sort(function (a, b) {
    if (pre) { var ad = (a.dim === 'D2') ? 0 : 1, bd = (b.dim === 'D2') ? 0 : 1; if (ad !== bd) return ad - bd; }    // §28 taito etusijalla
    if (eiPhv) { var af = (a.dim === 'D1') ? 1 : 0, bf = (b.dim === 'D1') ? 1 : 0; if (af !== bf) return af - bf; }   // §4 ei-fyysinen etusijalla
    var at = (a.taso == null) ? 2.5 : a.taso, bt = (b.taso == null) ? 2.5 : b.taso;   // tki_kehityskohde (taso null) = keskiprioriteetti
    if (at !== bt) return at - bt;   // heikoin ensin
    return (lahdePrio[a.lahde] || 3) - (lahdePrio[b.lahde] || 3);
  });
  return kelpo;
}
// Valitse kandidaatti indeksillä (idx kiertää listaa; oletus 0 = heikoin). Palauttaa null jos ei kelpaa.
function idpValitseHeikoin(kandidaatit, p, idx) {
  var lista = idpJarjestaKandidaatit(kandidaatit, p);
  if (!lista.length) return null;
  var i = (idx == null) ? 0 : (((idx % lista.length) + lista.length) % lista.length);
  return lista[i];
}
// Järjestetyt kelvolliset kandidaatit suoraan pelaajasta (VP: kierto + kandidaattimäärä). §26.
function idpKandidaatitJarjestetty(p, opts) {
  return idpJarjestaKandidaatit(idpKeraaKandidaatit(p, opts), p);
}
// Rakenna kandidaatti ANNETULLE taksonomia-avaimelle (VP:n fokus-valinta dropdownista). lahde:'valmentaja'.
function idpKohdeKandidaatti(p, avain, opts) {
  opts = opts || {};
  var byAvain = opts.tmTaksonomiaByAvain || function () { return null; };
  var it = byAvain(avain);
  var nimi = it ? it.nimi_fi : avain, dim = it ? it.dim : null;
  var mit = (it && it.mitattavissa && it.mitta) ? it.mitta : null;
  if (mit && mit.tyyppi === 'd1osa') {
    var tm = IDP_OSA_TESTI[mit.avain];
    var raaka = (tm && p.hh_viimeisin) ? p.hh_viimeisin[tm.testId] : null;
    return { avain: avain, dim: dim, nimi: nimi, taso: null, lahde: 'valmentaja', tyyppi: 'mitattu_d1', osaindeksi: mit.avain,
      raaka: (raaka != null ? raaka : null), mittariTestId: tm ? tm.testId : avain, mittariYks: tm ? tm.yks : 'taso', mittariSuunta: tm ? tm.suunta : 'suurempi' };
  }
  if (mit && mit.tyyppi === 'tklaji') {
    var raaka2 = p.tk_lajit_viimeisin ? p.tk_lajit_viimeisin[mit.laji + '_s'] : null;
    return { avain: avain, dim: dim, nimi: nimi, taso: null, lahde: 'valmentaja', tyyppi: 'mitattu_d2', laji: mit.laji,
      raaka: (raaka2 != null ? raaka2 : null), mittariTestId: mit.laji, mittariYks: 's', mittariSuunta: 'pienempi' };
  }
  var hav = p.arviointi_havaittu || {};
  var v = (hav[avain] && hav[avain].arvo != null) ? hav[avain].arvo : hav[avain];
  return { avain: avain, dim: dim, nimi: nimi, taso: (v != null && !isNaN(v)) ? +v : null, lahde: 'valmentaja',
    tyyppi: 'havaittu', mittariTestId: avain, mittariYks: 'taso', mittariSuunta: 'suurempi' };
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
// §7b — pelaaminen-linkitys: kehittyminen + tavoite linkittyvät AINA pelaamiseen. Fokus → lyhyt pelisovelluslause.
// Datavetoinen mäppäys (avain → pelilause), fallback dim-tasolle, sitten geneerinen. Ei irrallinen testisuoritus.
var IDP_PELILAUSE = {
  short_passing: 'Näkyy ottelussa: uskallus avata peli eteenpäin paineessa.',
  long_passing: 'Näkyy pelissä: pelin kääntö ja tilanvaihto pitkällä syötöllä.',
  passing_variety: 'Näkyy pelissä: oikea syöttötapa tilanteeseen.',
  hide_pass: 'Näkyy pelissä: syötön piilottaminen puolustajalta.',
  ball_control: 'Näkyy pelissä: ensikosketus pitää pallon pelissä.',
  ball_striking: 'Näkyy pelissä: pallonkäsittely liikkeessä.',
  ball_protection: 'Näkyy pelissä: pallon suojaus selkä maaliin päin.',
  dribbling: 'Näkyy pelissä: pelaajan ohitus ahtaassa tilassa.',
  running_with_ball: 'Näkyy pelissä: tilan voittaminen kuljettamalla.',
  link_up: 'Näkyy pelissä: yhteispeli hyökkäyksen rakentelussa.',
  finishing: 'Näkyy pelissä: viimeistely maalipaikasta.',
  shooting_accuracy: 'Näkyy pelissä: laukauksen tarkkuus maalintekopaikassa.',
  heading: 'Näkyy pelissä: pääpeli erikoistilanteissa.',
  weaker_foot: 'Näkyy pelissä: molempijalkaisuus ratkaisuhetkellä.',
  vision: 'Näkyy pelissä: syöttöikkunan näkeminen ennen palloa.',
  decision_making: 'Näkyy pelissä: oikea ratkaisu oikeaan aikaan.',
  anticipation: 'Näkyy pelissä: pelin lukeminen ennakkoon.',
  positioning: 'Näkyy pelissä: oikea paikka ennen palloa.',
  play_under_pressure: 'Näkyy pelissä: rauhallisuus prässin alla.',
  timing: 'Näkyy pelissä: liikkeen ajoitus ratkaisuhetkellä.',
  defending_1v1: 'Näkyy pelissä: kaksinkamppailun voittaminen puolustaen.',
  tackling: 'Näkyy pelissä: pallon riisto oikealla hetkellä.',
  pressing: 'Näkyy pelissä: prässin ajoitus ja intensiteetti.',
  acceleration: 'Näkyy pelissä: räjähtävä lähtö kaksinkamppailuun.',
  speed: 'Näkyy pelissä: irtiotto ja tilan voittaminen.',
  mobility: 'Näkyy pelissä: suunnanmuutos ja tasapaino tilanteissa.',
  power: 'Näkyy pelissä: kaksinkamppailuvoima ja ilmapallot.',
  endurance: 'Näkyy pelissä: työteho koko ottelun ajan.',
  balance: 'Näkyy pelissä: tasapaino kontaktissa.'
};
var IDP_PELILAUSE_DIM = {
  D1: 'Näkyy pelissä: fyysinen kilpailukyky tilanteissa.',
  D2: 'Näkyy pelissä: pallollinen ratkaisu ottelussa.',
  D3: 'Näkyy pelissä: pää kestää ratkaisuhetkellä.',
  D4: 'Näkyy pelissä: pelin lukeminen ja ratkaisut.',
  D5: 'Näkyy pelissä: joukkueen tukeminen ja vuorovaikutus.'
};
function idpPelilause(k) {
  if (!k) return 'Tavoite näkyy pelissä — ei irrallinen testisuoritus.';
  return IDP_PELILAUSE[k.avain] || IDP_PELILAUSE_DIM[k.dim] || 'Tavoite näkyy pelissä — ei irrallinen testisuoritus.';
}

// Rakenna tavoite ANNETUSTA kandidaatista k (moottorin valitsema TAI VP:n dropista). §4 kypsyysvaroitus fyysiselle ilman PHV:tä.
function idpRakennaTavoite(p, k, opts) {
  opts = opts || {};
  if (!p || !k) return null;
  var tav = idpTavoitearvo(k, p, opts);
  var vahvin = idpVahvinDim(p, opts);
  var nyt = opts.nyt || new Date();
  var phv = p.phv_tila;
  var pre = (phv === 'PRE' || phv === 'LAH');
  var kultaikkuna = (k.dim === 'D2') || pre;   // taito/tekniikkaikkuna auki pre/circa-PHV
  var lahde = (k.lahde === 'valmentaja') ? 'valmentaja' : 'moottori';
  var vapaa = (k.mittariYks === 'vapaa');
  // §4 — ilman PHV-dataa fyysinen (D1) fokus epävarma → varoitus (kypsyysvahti ei laukea).
  var kypsyysvaroitus = (!phv && k.dim === 'D1' && !vapaa)
    ? 'Kypsyysdataa (PHV) ei ole — fyysinen tavoite epävarma. Harkitse taito/tekninen kohde tai varmista kasvupyrähdystila.'
    : null;
  var perusteluOsat = [];
  if (vapaa) perusteluOsat.push('Valmentajan asettama vapaa tavoite.');
  else if (k.tyyppi === 'havaittu') perusteluOsat.push('Kehityskohde (' + (k.lahde === 'pelihavainto' ? 'pelihavainto' : k.lahde === 'valmentaja' ? 'valmentajan valinta' : 'arvio') + (k.taso != null ? ' taso ' + k.taso + '/5' : '') + ').');
  else if (tav.lahto != null && tav.arvo != null) perusteluOsat.push('Lähtö ' + tav.lahto + ' ' + k.mittariYks + ' → tavoite ' + tav.arvo + ' ' + k.mittariYks + '.');
  if (kultaikkuna && !vapaa) perusteluOsat.push('Taitoikkuna auki — sama työ tuottaa nyt moninkertaisen vaikutuksen (§28).');
  if (kypsyysvaroitus) perusteluOsat.push(kypsyysvaroitus);
  var pelilause = idpPelilause(k);   // §7b pelaaminen-linkitys (myös vapaa fokus → dim-/geneerinen lause)
  perusteluOsat.push(pelilause);
  return {
    fokus: { alue: k.avain, dim: k.dim, nimi: k.nimi, lahde: (k.fokusLahde || lahde), vapaa: !!k.vapaa },
    mittari: { testId: k.mittariTestId, yksikko: k.mittariYks, suunta: k.mittariSuunta },
    lahto: { arvo: (vapaa ? null : tav.lahto), pvm: (vapaa ? null : tav.lahtoPvm) },
    tavoitearvo: (vapaa ? null : tav.arvo),
    kuvaus: '',
    aikaraami: { kausi: (nyt.getMonth() >= 6 ? 'syksy ' : 'kevät ') + nyt.getFullYear(), kesto_vk: 6,
      arvio_pvm: new Date(nyt.getTime() + 42 * 86400000).toISOString().slice(0, 10) },
    perustelu: { teksti: perusteluOsat.join(' '), pelilause: pelilause, kultaikkuna: kultaikkuna, kypsyysvaroitus: kypsyysvaroitus, lahde: lahde },
    ankkuri_7030: vahvin ? { vahvuus_dim: vahvin.dim, teksti: 'Integroi ' + k.nimi + ' vahvuuteen (' + vahvin.nimi + ', ' + vahvin.dim + ').' } : null,
    pelaajan_tavoite: '',
    omistaja: 'yhdessa',
    status: 'ehdotettu',
    lahde: lahde,
    luotu: nyt.toISOString(),
    arviot: []
  };
}
// Moottorin ehdotus: kerää + järjestä + valitse opts.ehdotusIdx:llä (kierto). null jos ei kelpaa kandidaattia (§28).
function idpEhdotaTavoite(p, opts) {
  opts = opts || {};
  if (!p) return null;
  var k = idpValitseHeikoin(idpKeraaKandidaatit(p, opts), p, opts.ehdotusIdx);
  if (!k) return null;
  return idpRakennaTavoite(p, k, opts);
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
    idpJarjestaKandidaatit: idpJarjestaKandidaatit,
    idpValitseHeikoin: idpValitseHeikoin,
    idpKandidaatitJarjestetty: idpKandidaatitJarjestetty,
    idpKohdeKandidaatti: idpKohdeKandidaatti,
    idpTavoitearvo: idpTavoitearvo,
    idpVahvinDim: idpVahvinDim,
    idpKausivuosi: idpKausivuosi,
    idpPelilause: idpPelilause,
    idpRakennaTavoite: idpRakennaTavoite,
    idpEhdotaTavoite: idpEhdotaTavoite,
    idpPikakentat: idpPikakentat
  };
}
