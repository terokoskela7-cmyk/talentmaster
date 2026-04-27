/* ═══════════════════════════════════════════════════════════════════
   TalentMaster — Profiili-library
   
   Vastuu: muuntaa testitulokset ja pelaajadata → pelaajaprofiiliksi,
   jota ohjelmageneraattori (tm-prescription.js) ymmärtää.
   
   Pääfunktiot:
   - laskeEfektiivinenStage(pisteet, phvTila, ika, jakso)
       → { stage, lahtoStage, peruste, rajattu, perusteKansankielella }
   - laskeKetjuProfiili(pelaaja)
       → { jarjestys, heikoin, toiseksiHeikoin, vahvin, painot }
   - laskeJoukkuenKetjut(pelaajat)
       → [{ ketju, ka, nimi }, ...]  heikoin ensin
   - rakenna30ProsenttiYhteenveto(pelaajat)
       → { SBL: [{nimi, arvo}], ... }  kuka tarvitsee mitä
   - perusteKaikille(peruste, rooli)
       → Sama peruste kolmella kielellä (pelaaja/valmentaja/TD)
   
   Lähde: Master v9:n laskeEfektiivinenStage + laskeJoukkuenKetjut
          + harjoitelogiikka_v4_2.js:n laskeKetjuProfiili
   ═══════════════════════════════════════════════════════════════════ */

(function(root) {
  'use strict';

  var M = (root.TM && root.TM.metodologia) || null;
  if (!M) {
    console.warn('[tm-profile] tm-methodology.js puuttuu — lataa se ensin');
  }

  // ═══════════════════════════════════════════════════════════════════
  // EFEKTIIVINEN STAGE — Master v9:stä, laajennettu perusteKielellä
  //
  // Porttien järjestys:
  //   1. FLEI-pisteet → raakaStage (1–5)
  //   2. + jakso.stageModif (0/+1/+2) — 8 vk sykli
  //   3. PHV-rajoitus (PH → max S2)
  //   4. Ikärajoitus (<10 → S1, <12 → S2, <14 → S3, <16 → S4)
  // ═══════════════════════════════════════════════════════════════════
  function laskeEfektiivinenStage(pisteet, phvTila, ika, jakso) {
    // 1. Pisteet → raakaStage
    var s;
    if (!pisteet || pisteet === 0) s = 1;
    else if (pisteet < 40) s = 1;
    else if (pisteet < 55) s = 2;
    else if (pisteet < 70) s = 3;
    else if (pisteet < 85) s = 4;
    else                   s = 5;
    var lahto = s;

    // 2. Jakso nostaa
    var jaksoModif = jakso ? (jakso.stageModif || 0) : 0;
    s = Math.min(5, s + jaksoModif);
    var nostettuJaksolla = s;

    // 3. Rajoitteet
    var rajattu = false;
    var rajoitusSyy = null;

    if (phvTila === 'PH' && s > 2) {
      s = 2;
      rajattu = true;
      rajoitusSyy = 'PHV';
    }
    if (ika && ika < 10 && s > 1) {
      s = 1;
      rajattu = true;
      rajoitusSyy = 'alle 10v';
    } else if (ika && ika < 12 && s > 2) {
      s = 2;
      rajattu = true;
      rajoitusSyy = 'alle 12v';
    } else if (ika && ika < 14 && s > 3) {
      s = 3;
      rajattu = true;
      rajoitusSyy = 'alle 14v';
    } else if (ika && ika < 16 && s > 4) {
      s = 4;
      rajattu = true;
      rajoitusSyy = 'alle 16v';
    }

    // Peruste-string
    var peruste = 'Pisteet ' + (pisteet || '?') + 'p → S' + lahto;
    if (jaksoModif > 0) {
      peruste += ', jakso +' + jaksoModif + ' → S' + nostettuJaksolla;
    }
    if (rajattu) {
      peruste += ', max S' + s + ' (' + rajoitusSyy + ')';
    }

    return {
      stage: s,
      lahtoStage: lahto,
      nostettuJaksolla: nostettuJaksolla,
      peruste: peruste,
      rajattu: rajattu,
      rajoitusSyy: rajoitusSyy,
      perusteKielella: perusteKaikille(
        { pisteet: pisteet, lahto: lahto, jaksoModif: jaksoModif,
          nostettu: nostettuJaksolla, lopullinen: s, rajoitusSyy: rajoitusSyy, rajattu: rajattu }
      )
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PERUSTEKAIKILLE — sama Stage-peruste kolmella kielellä
  // Tämä on keskeinen UX-päätös: jokainen käyttäjä näkee miksi,
  // mutta omalla kielellään.
  // ═══════════════════════════════════════════════════════════════════
  function perusteKaikille(data) {
    var pelaaja, valmentaja, td;

    // PELAAJA — yksinkertainen, rohkaiseva, ikätason kieli
    if (data.rajattu) {
      pelaaja = 'Olet tasolla ' + data.lopullinen + '. ' +
                (data.rajoitusSyy === 'PHV' ? 'Nyt kasvat nopeasti — jätämme kovimmat harjoitteet myöhemmäksi.' :
                 'Tasosi avautuu lisää kun kasvat.');
    } else if (data.jaksoModif > 0) {
      pelaaja = 'Olet tasolla ' + data.lopullinen + '. Vaikeutamme juuri nyt — sinä pystyt tähän.';
    } else {
      pelaaja = 'Olet tasolla ' + data.lopullinen + '.';
    }

    // VALMENTAJA — asiallinen, datapohjainen, päätöksentekoon
    valmentaja = 'Pelaaja S' + data.lopullinen + '. ';
    valmentaja += 'Testipisteet ' + (data.pisteet || '?') + ' → perustaso S' + data.lahto;
    if (data.jaksoModif > 0) {
      valmentaja += ', jakso +' + data.jaksoModif;
    }
    if (data.rajattu) {
      valmentaja += '. Rajoitettu S' + data.lopullinen + ' (' + data.rajoitusSyy + ')';
    }
    valmentaja += '.';

    // TD — täydellinen jäljitettävyys
    td = 'FLEI ' + (data.pisteet || 0) + 'p ⇒ S' + data.lahto;
    if (data.jaksoModif > 0) td += ' ⇒ +jakso(' + data.jaksoModif + ') = S' + data.nostettu;
    if (data.rajattu) td += ' ⇒ rajoitus(' + data.rajoitusSyy + ') = S' + data.lopullinen;
    else td += ' ⇒ lopullinen S' + data.lopullinen;

    return {
      pelaaja: pelaaja,
      valmentaja: valmentaja,
      td: td
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // FLEI-KOKONAISINDEKSI — pelaajan yleistaso (0–100)
  //
  // Lähde: v3 docx (TalentMaster_Profiilikartta_v1) — FLEI = neljän
  // alaindeksin painotettu summa:
  //   LAI (Lihaksisto-asento)   30%
  //   TCI (Tendon-Connective)   25%
  //   MTI (Movement-Tekniikka)  25%
  //   IVI (Injury-Vulnerability) 20%
  //
  // Hyväksyy kolme syöttömuotoa, prioriteettijärjestyksessä:
  //   1. pelaaja.flei.kokonaisindeksi (jo laskettu)
  //   2. pelaaja.flei = { LAI, TCI, MTI, IVI } (lasketaan painoilla)
  //   3. fallback: ketjujen keskiarvo (jos FLEI-rakenne puuttuu)
  //
  // Palauttaa: { arvo: 0..100, lahde: 'flei'|'osaindeksit'|'ketjut',
  //              ampeli: 'vihrea'|'keltainen'|'oranssi'|'punainen' }
  // ═══════════════════════════════════════════════════════════════════
  function laskeFLEIKokonaisindeksi(pelaaja) {
    pelaaja = pelaaja || {};
    var arvo = null;
    var lahde = null;

    // 1. Suora FLEI-kokonaisindeksi
    var flei = pelaaja.flei || pelaaja.FLEI;
    if (flei && typeof flei.kokonaisindeksi === 'number') {
      arvo = flei.kokonaisindeksi;
      lahde = 'flei';
    }
    // 2. Osaindeksit → painotettu summa
    else if (flei && (flei.LAI != null || flei.TCI != null || flei.MTI != null || flei.IVI != null)) {
      var lai = flei.LAI || 0, tci = flei.TCI || 0, mti = flei.MTI || 0, ivi = flei.IVI || 0;
      arvo = Math.round(lai * 0.30 + tci * 0.25 + mti * 0.25 + ivi * 0.20);
      lahde = 'osaindeksit';
    }
    // 3. Fallback: ketjujen keskiarvo
    else {
      var prof = laskeKetjuProfiili(pelaaja);
      var summa = 0, lkm = 0;
      Object.keys(prof.painot).forEach(function(k) {
        if (prof.painot[k] > 0) { summa += prof.painot[k]; lkm++; }
      });
      arvo = lkm > 0 ? Math.round(summa / lkm) : 0;
      lahde = 'ketjut';
    }

    // Ampeli — liikennevalo pelaajan UI:lle (ei numeroita pelaajalle alle 12v)
    var ampeli;
    if (arvo >= 70)      ampeli = 'vihrea';
    else if (arvo >= 55) ampeli = 'keltainen';
    else if (arvo >= 40) ampeli = 'oranssi';
    else                 ampeli = 'punainen';

    return { arvo: arvo, lahde: lahde, ampeli: ampeli };
  }

  // ═══════════════════════════════════════════════════════════════════
  // KETJUPROFIILI — yksittäiselle pelaajalle
  // Palauttaa ketjut järjestyksessä heikoin → vahvin
  // ═══════════════════════════════════════════════════════════════════
  function laskeKetjuProfiili(pelaaja) {
    pelaaja = pelaaja || {};
    // Hyväksy sekä uusi että vanha kenttämuoto
    var k = pelaaja.flei_ketjut || pelaaja.ketjut || {};

    // DIAG voi olla annettu suoraan, TAI laskettu vanhoista SL+FL-kentistä
    var diag = k.DIAG || k.diag;
    if (!diag && (k.SL || k.FL)) {
      diag = k.SL && k.FL ? Math.round((k.SL + k.FL) / 2) : (k.SL || k.FL);
    }
    diag = diag || 0;

    var painot = {
      SBL:  k.SBL  || k.sbl  || 0,
      SFL:  k.SFL  || k.sfl  || 0,
      LL:   k.LL   || k.ll   || 0,
      DIAG: diag,
      DFL:  k.DFL  || k.dfl  || 0
    };

    // Järjestä heikoin → vahvin (vain ne joissa data)
    var jarjestys = Object.keys(painot)
      .filter(function(kk) { return painot[kk] > 0; })
      .sort(function(a, b) { return painot[a] - painot[b]; });

    return {
      painot: painot,
      jarjestys: jarjestys,
      heikoin: jarjestys[0] || null,
      toiseksiHeikoin: jarjestys[1] || null,
      vahvin: jarjestys[jarjestys.length - 1] || null
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // JOUKKUEEN KETJUT — aggregoitu heikoin ensin
  // Käytössä valmentajan pre-harkkageneraattorilla
  // ═══════════════════════════════════════════════════════════════════
  function laskeJoukkuenKetjut(pelaajat) {
    var nimet = {
      SBL: 'Vauhtiketju', SFL: 'Lähtöketju', LL: 'Sivuketju',
      DIAG: 'Diagonaaliketju', DFL: 'Hallintaketju'
    };
    var emojit = { SBL: '⚡', SFL: '🦵', LL: '↔️', DIAG: '🔄', DFL: '🏗️' };
    var sum = { SBL: 0, SFL: 0, LL: 0, DIAG: 0, DFL: 0 };
    var lkm = { SBL: 0, SFL: 0, LL: 0, DIAG: 0, DFL: 0 };

    (pelaajat || []).forEach(function(p) {
      var prof = laskeKetjuProfiili(p);
      Object.keys(prof.painot).forEach(function(kk) {
        if (prof.painot[kk] > 0) {
          sum[kk] += prof.painot[kk];
          lkm[kk]++;
        }
      });
    });

    return Object.keys(sum)
      .map(function(kk) {
        return {
          ketju: kk,
          ka: lkm[kk] > 0 ? Math.round(sum[kk] / lkm[kk]) : 0,
          lkm: lkm[kk],
          nimi: nimet[kk],
          emoji: emojit[kk]
        };
      })
      .filter(function(t) { return t.ka > 0; })
      .sort(function(a, b) { return a.ka - b.ka; });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 30%-YHTEENVETO — kuka tarvitsee mitä
  // Per pelaaja heikoin ketju → aggregoituna kenttä per ketju
  // ═══════════════════════════════════════════════════════════════════
  function rakenna30ProsenttiYhteenveto(pelaajat) {
    var ryhmitys = {};
    (pelaajat || []).forEach(function(p) {
      var prof = laskeKetjuProfiili(p);
      if (!prof.heikoin) return;

      ryhmitys[prof.heikoin] = ryhmitys[prof.heikoin] || [];
      ryhmitys[prof.heikoin].push({
        id: p.id || null,
        nimi: (p.etunimi || '') + ' ' + ((p.sukunimi || '')[0] || '') + '.',
        arvo: prof.painot[prof.heikoin]
      });
    });
    return Object.keys(ryhmitys).length > 0 ? ryhmitys : null;
  }

  // ═══════════════════════════════════════════════════════════════════
  // KOOSTE PELAAJASTA — kaikki mitä geneattori tarvitsee
  // ═══════════════════════════════════════════════════════════════════
  function koostaProfiili(pelaaja, paiva) {
    pelaaja = pelaaja || {};
    paiva = paiva || new Date();

    var ika = pelaaja.ika;
    if (!ika && pelaaja.syntymaaika) {
      var sa = pelaaja.syntymaaika.toDate
        ? pelaaja.syntymaaika.toDate()
        : (pelaaja.syntymaaika.seconds ? new Date(pelaaja.syntymaaika.seconds * 1000)
           : new Date(pelaaja.syntymaaika));
      ika = Math.floor((Date.now() - sa.getTime()) / (365.25 * 24 * 3600 * 1000));
    }
    ika = ika || 13;

    var phvTila = pelaaja.phv_tila || 'AN';
    var ketjut = laskeKetjuProfiili(pelaaja);
    var flei = laskeFLEIKokonaisindeksi(pelaaja);
    var jakso = M ? M._laskeJakso(paiva) : null;
    var mesosykli = M ? M._laskeMesosykli(paiva) : null;
    var kielitaso = M ? M._ikatyyppi(ika) : (ika <= 12 ? 'leikkija' : ika <= 15 ? 'rakentaja' : 'showcase');

    // KOKONAIS-Stage — pelaajan yleistaso FLEI-kokonaisindeksistä
    // Käytetään: pelaajakortti, profiilinäkymä, yleisarviot
    var stageKokonais = laskeEfektiivinenStage(flei.arvo, phvTila, ika, jakso);

    // KOHDISTETTU Stage — heikoimman ketjun pisteistä
    // Käytetään: 30%-kohdistettu harjoite (mihin ketjuun puututaan)
    var heikoimmanPisteet = ketjut.heikoin ? ketjut.painot[ketjut.heikoin] : 0;
    var stageKohdistettu = laskeEfektiivinenStage(heikoimmanPisteet, phvTila, ika, jakso);

    // VAHVUUS Stage — vahvimman ketjun pisteistä
    // Käytetään: 70%-vahvuusharjoite (mitä pidetään terävänä)
    var vahvimmanPisteet = ketjut.vahvin ? ketjut.painot[ketjut.vahvin] : 0;
    var stageVahvuus = laskeEfektiivinenStage(vahvimmanPisteet, phvTila, ika, jakso);

    return {
      pelaaja: pelaaja,
      ika: ika,
      phvTila: phvTila,
      kielitaso: kielitaso,
      ketjut: ketjut,
      flei: flei,
      jakso: jakso,
      mesosykli: mesosykli,
      stageKokonais: stageKokonais,
      stageKohdistettu: stageKohdistettu,
      stageVahvuus: stageVahvuus
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXPORTIT
  // ═══════════════════════════════════════════════════════════════════
  var TM = root.TM || (root.TM = {});
  TM.profile = {
    laskeEfektiivinenStage: laskeEfektiivinenStage,
    laskeFLEIKokonaisindeksi: laskeFLEIKokonaisindeksi,
    laskeKetjuProfiili: laskeKetjuProfiili,
    laskeJoukkuenKetjut: laskeJoukkuenKetjut,
    rakenna30ProsenttiYhteenveto: rakenna30ProsenttiYhteenveto,
    perusteKaikille: perusteKaikille,
    koostaProfiili: koostaProfiili,
    VERSIO: '1.1.0'
  };

})(typeof window !== 'undefined' ? window : this);
