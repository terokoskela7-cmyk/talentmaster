/**
 * tm_tapahtumat.js — TalentMaster™ jaettu tapahtumamoduuli
 * 
 * Hoitaa kaiken tapahtumaliikenteen Firestoren kanssa.
 * Importoidaan sekä Master v8:ssa (valmentaja) että
 * Seura-näkymässä (VP) — yksi lähde, sama data.
 * 
 * Firestore-rakenne:
 *   seurat/{seuraId}/tapahtumat/{tapahtumaId}
 *     tyyppi:       'harjoitettavuus' | 'hh_testit' | 'tekniikka' | 'adar' | 'harjoitus' | 'peli'
 *     tila:         'suunniteltu' → 'vahvistettu' → 'käynnissä' → 'valmis'
 *     joukkueId:    'kpv_u13'
 *     joukkueNimi:  'KPV U13'
 *     nimi:         'Kevään harjoitettavuuskartoitus'
 *     pvm:          '2026-04-15'
 *     alkuAika:     '09:00'   (valinnainen)
 *     vastuuUid:    '...'     ← kuka vastaa toteutuksesta
 *     luonutUid:    '...'
 *     luotu:        Timestamp
 *     pelaajat:     [{pelaajaId, nimi, paikalla: true}]   ← esitäytetty joukkueesta
 *     osallistujat: [pelaajaId1, ...]   ← vahvistettu testipäivänä
 *     muistiinpanot: ''
 */

(function(global) {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     TAPAHTUMA-TYYPIT JA TILAT
  ═══════════════════════════════════════════════════════ */
  const TAPAHTUMATYYPIT = {
    harjoitettavuus: { nimi: 'Harjoitettavuuskartoitus', emoji: '📋', vari: '#4A7ED9' },
    hh_testit:       { nimi: 'HH-polun testit',          emoji: '🏃', vari: '#22C55E' },
    tekniikka:       { nimi: 'Tekniikkakilpailu',         emoji: '⚽', vari: '#F59E0B' },
    adar:            { nimi: 'ADAR-arviointi',            emoji: '🧠', vari: '#8B5CF6' },
    harjoitus:       { nimi: 'Harjoitus',                 emoji: '🔵', vari: '#3EC9A7' },
    peli:            { nimi: 'Peli',                      emoji: '🟢', vari: '#5EC97A' },
  };

  const TAPAHTUMATILAT = {
    suunniteltu:  { nimi: 'Suunniteltu', vari: '#9AAAC4',  nappi: 'Vahvista' },
    vahvistettu:  { nimi: 'Vahvistettu', vari: '#4A7ED9',  nappi: 'Aloita testaus' },
    kaynnissa:    { nimi: 'Käynnissä',   vari: '#F59E0B',  nappi: 'Merkitse valmiiksi' },
    valmis:       { nimi: 'Valmis',      vari: '#22C55E',  nappi: null },
  };

  /* ═══════════════════════════════════════════════════════
     CRUD-OPERAATIOT
  ═══════════════════════════════════════════════════════ */

  /**
   * Luo uusi tapahtuma Firestoreen.
   * Esitäyttää pelaajat-listan koko joukkueesta.
   */
  async function luoTapahtuma(db, seuraId, data, kayttajaUid) {
    // Hae joukkueen pelaajat esitäyttöä varten
    let pelaajat = [];
    try {
      const snap = await db.collection('seurat').doc(seuraId)
        .collection('joukkueet').doc(data.joukkueId)
        .collection('pelaajat').orderBy('sukunimi').get();
      pelaajat = snap.docs.map(d => ({
        pelaajaId: d.id,
        nimi: `${d.data().sukunimi||''}, ${d.data().etunimi||''}`.trim(),
        paikalla: true,  // Oletus: kaikki paikalla
      }));
      // Fallback: hae seuran pelaajat joukkue-kentällä
      if (pelaajat.length === 0) {
        const snap2 = await db.collection('seurat').doc(seuraId)
          .collection('pelaajat')
          .where('joukkue', '==', data.joukkueId)
          .orderBy('sukunimi').get();
        pelaajat = snap2.docs.map(d => ({
          pelaajaId: d.id,
          nimi: `${d.data().sukunimi||''}, ${d.data().etunimi||''}`.trim(),
          paikalla: true,
        }));
      }
    } catch(e) {
      console.warn('Pelaajien haku esitäyttöön epäonnistui:', e);
    }

    const tapahtuma = {
      tyyppi:       data.tyyppi       || 'harjoitettavuus',
      tila:         'suunniteltu',
      joukkueId:    data.joukkueId,
      joukkueNimi:  data.joukkueNimi  || data.joukkueId,
      nimi:         data.nimi         || TAPAHTUMATYYPIT[data.tyyppi]?.nimi || 'Tapahtuma',
      pvm:          data.pvm,
      alkuAika:     data.alkuAika     || '',
      vastuuUid:    data.vastuuUid    || kayttajaUid,
      luonutUid:    kayttajaUid,
      luotu:        firebase.firestore.FieldValue.serverTimestamp(),
      pelaajat:     pelaajat,
      osallistujat: [],
      muistiinpanot: '',
    };

    const ref = await db.collection('seurat').doc(seuraId)
      .collection('tapahtumat').add(tapahtuma);
    return { id: ref.id, ...tapahtuma };
  }

  /**
   * Hae tapahtumat — voidaan filtteröidä joukkueen, tyypin tai päivämäärävälin mukaan.
   */
  async function haeTapahtumat(db, seuraId, opts = {}) {
    let q = db.collection('seurat').doc(seuraId).collection('tapahtumat');

    if (opts.joukkueId) q = q.where('joukkueId', '==', opts.joukkueId);
    if (opts.tyyppi)    q = q.where('tyyppi', '==', opts.tyyppi);
    if (opts.pvmAlku)   q = q.where('pvm', '>=', opts.pvmAlku);
    if (opts.pvmLoppu)  q = q.where('pvm', '<=', opts.pvmLoppu);

    q = q.orderBy('pvm', opts.jarjestys || 'asc');

    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  /**
   * Hae avoimet testitapahtumat — käytetään harjoitettavuuslomakkeessa
   * kun testaaja valitsee minkä tapahtuman pelaajia testaa.
   */
  async function haeAvoimetTestitapahtumat(db, seuraId) {
    const tana = new Date().toISOString().split('T')[0];
    const viikkoSitten = new Date(Date.now() - 7*24*60*60*1000)
      .toISOString().split('T')[0];

    try {
      const snap = await db.collection('seurat').doc(seuraId)
        .collection('tapahtumat')
        .where('tyyppi', 'in', ['harjoitettavuus', 'hh_testit', 'tekniikka', 'adar'])
        .where('pvm', '>=', viikkoSitten)
        .where('tila', 'in', ['suunniteltu', 'vahvistettu', 'kaynnissa'])
        .orderBy('pvm', 'asc')
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
      // Composite index puuttuu — fallback ilman tila-filtteröintiä
      console.warn('Testitapahtumahaku: composite index puuttuu, fallback:', e.message);
      const snap2 = await db.collection('seurat').doc(seuraId)
        .collection('tapahtumat')
        .where('pvm', '>=', viikkoSitten)
        .orderBy('pvm', 'asc').get();
      return snap2.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(t => ['harjoitettavuus','hh_testit','tekniikka','adar'].includes(t.tyyppi)
               && ['suunniteltu','vahvistettu','kaynnissa'].includes(t.tila));
    }
  }

  /**
   * Päivitä tapahtuman tila.
   */
  async function paivitaTila(db, seuraId, tapahtumaId, uusiTila) {
    await db.collection('seurat').doc(seuraId)
      .collection('tapahtumat').doc(tapahtumaId)
      .update({ tila: uusiTila });
  }

  /**
   * Vahvista osallistujat testipäivänä.
   * Testaaja merkitsee ketkä todella tulivat paikalle.
   */
  async function vahvistaOsallistujat(db, seuraId, tapahtumaId, pelaajatPaikalla) {
    // pelaajatPaikalla: [{pelaajaId, nimi, paikalla: true/false}]
    const osallistujat = pelaajatPaikalla
      .filter(p => p.paikalla)
      .map(p => p.pelaajaId);

    await db.collection('seurat').doc(seuraId)
      .collection('tapahtumat').doc(tapahtumaId)
      .update({
        pelaajat: pelaajatPaikalla,
        osallistujat,
        tila: 'vahvistettu',
      });
    return osallistujat;
  }

  /**
   * Poista tapahtuma.
   */
  async function poistaTapahtuma(db, seuraId, tapahtumaId) {
    await db.collection('seurat').doc(seuraId)
      .collection('tapahtumat').doc(tapahtumaId).delete();
  }

  /* ═══════════════════════════════════════════════════════
     UI-APUFUNKTIOT — käytetään molemmissa näkymissä
  ═══════════════════════════════════════════════════════ */

  /** Luo tapahtuman tila-badgen HTML */
  function tilaBadge(tila) {
    const t = TAPAHTUMATILAT[tila] || TAPAHTUMATILAT.suunniteltu;
    return `<span style="
      font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;
      background:${t.vari}22;color:${t.vari};border:1px solid ${t.vari}44;
      white-space:nowrap;">${t.nimi}</span>`;
  }

  /** Luo tapahtuman tyyppi-emojin ja nimen */
  function tyyppiBadge(tyyppi) {
    const t = TAPAHTUMATYYPIT[tyyppi] || { nimi: tyyppi, emoji: '📌', vari: '#9AAAC4' };
    return `<span style="
      font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;
      background:${t.vari}18;color:${t.vari};
      white-space:nowrap;">${t.emoji} ${t.nimi}</span>`;
  }

  /** Formatoi päivämäärä suomeksi */
  function formatPvm(pvmStr) {
    if (!pvmStr) return '—';
    const [y, m, d] = pvmStr.split('-');
    const kuukaudet = ['tam','hel','maa','huh','tou','kes','hei','elo','syy','lok','mar','jou'];
    return `${parseInt(d)}.${parseInt(m)}. (${kuukaudet[parseInt(m)-1]})`;
  }

  /** Onko tapahtuma tänään tai lähitulevaisuudessa */
  function onLahipvm(pvmStr, paivat = 7) {
    if (!pvmStr) return false;
    const nyt = new Date();
    const pvm = new Date(pvmStr);
    const ero = (pvm - nyt) / (1000 * 60 * 60 * 24);
    return ero >= -1 && ero <= paivat;
  }

  /* ═══════════════════════════════════════════════════════
     EXCEL-POHJAN GENEROINTI TAPAHTUMASTA
     Käytetään harjoitettavuuslomakkeessa "Lataa pohja" -napista.
  ═══════════════════════════════════════════════════════ */
  function generoi_excel_pohja_csv(tapahtuma, testiOtsikot, testiIdt) {
    const CRLF = '\r\n';

    function csvRivi(kentat) {
      return kentat.map(function(s) {
        s = String(s || '');
        return (s.indexOf(',') >= 0 || s.indexOf('"') >= 0)
          ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }

    const otsikot = [
      'PelaajaID','Sukunimi','Etunimi','Syntymävuosi','Sukupuoli',
      'Joukkue','IkäLuokka','Testipäivä','PHV-tila',
      ...testiOtsikot, 'FLEI %','Huomiot'
    ];

    const rivit = (tapahtuma.pelaajat || [])
      .filter(p => p.paikalla !== false)
      .map(p => {
        const nimiOsat = (p.nimi || '').split(',');
        return [
          p.pelaajaId || '',
          (nimiOsat[0] || '').trim(),
          (nimiOsat[1] || '').trim(),
          '', '', // syntymävuosi, sukupuoli — haetaan rekisteristä
          tapahtuma.joukkueNimi || tapahtuma.joukkueId,
          '', // ikäluokka — lasketaan automaattisesti
          tapahtuma.pvm || '',
          '', // PHV-tila — testaaja täyttää
          ...testiIdt.map(() => ''),
          '', '' // FLEI, huomiot
        ];
      });

    const csvRivit = [
      csvRivi(['TalentMaster - Harjoitettavuuskartoitus', '', '', '', '', '', '', '',
               'Seura:', '', '', 'Joukkue: ' + (tapahtuma.joukkueNimi || '')]),
      csvRivi(['Palloliiton protokolla 2026', '', '', '', '', '', '', '',
               'Testipäivä: ' + (tapahtuma.pvm || ''), '', '', 'Tapahtuma: ' + (tapahtuma.nimi || '')]),
      csvRivi(['PHV-tila: AN = Pre-PHV  |  PH = PHV-huippu MAX 60% kuorma  |  VA = Post-PHV']),
      '',
      csvRivi(otsikot),
      ...rivit.map(r => csvRivi(r)),
      '',
      csvRivi(['PISTEYTYS: 1p = rajoitteita  |  2p = kehitettävää  |  3p = hallitsee hyvin']),
    ];

    return csvRivit.join(CRLF);
  }

  /* ═══════════════════════════════════════════════════════
     EXPORTOI GLOBAALIIN NIMIAVARUUTEEN
  ═══════════════════════════════════════════════════════ */
  global.TmTapahtumat = {
    // CRUD
    luoTapahtuma,
    haeTapahtumat,
    haeAvoimetTestitapahtumat,
    paivitaTila,
    vahvistaOsallistujat,
    poistaTapahtuma,
    // UI-apufunktiot
    tilaBadge,
    tyyppiBadge,
    formatPvm,
    onLahipvm,
    generoi_excel_pohja_csv,
    // Vakiot
    TAPAHTUMATYYPIT,
    TAPAHTUMATILAT,
  };

})(typeof window !== 'undefined' ? window : global);
