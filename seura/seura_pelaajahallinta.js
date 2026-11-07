// ── Lähetä pelaajasivu-linkki huoltajalle uudelleen ──────────────────────────
async function lahetaPelaajaLinkki(pelaajaId, seuraId, etunimi, sukunimi, hEmail, joukkue) {
  if (!hEmail) { naytaToast(tmHT('Pelaajalla ei ole huoltajasähköpostia'), 'virhe'); return; }
  naytaToast(tmHT('📨 Lähetetään linkkiä...'), 'info');
  try {
    const fn = firebase.app().functions('europe-west1');
    const lahetaFn = fn.httpsCallable('lahetaPelaajaSivuLinkki');
    const tulos = await lahetaFn({
      hEmail, pelaajaId, seuraId: seuraId || tila.seuraId,
      etunimi: etunimi || '', sukunimi: sukunimi || '',
      seura: tila.seuraNimi || seuraId || tila.seuraId,
      joukkue: joukkue || '',
    });
    if (tulos.data?.ok) {
      naytaToast(tulos.data.vainVanhempi ? '✅ ' + _ikaTeksti(tulos.data.syy) + ' → ' + hEmail : `✅ Linkki lähetetty → ${hEmail}`, 'ok');
    }
  } catch(e) {
    console.error('[lahetaPelaajaLinkki]', e.message);
    naytaToast(_laskutusEsto(e) || (e && e.details && _ikaTeksti(e.details.syy)) || `❌ Lähetys epäonnistui: ${e.message}`, 'virhe');
  }
}

async function naytaPelaajaTiedot(pelaajaId) {
  // Haetaan pelaajan data Firestoresta
  let p = null;
  let kutsut = [];
  try {
    const pSnap = await db.collection('seurat').doc(tila.seuraId)
      .collection('pelaajat').doc(pelaajaId).get();
    if (pSnap.exists) p = { id: pSnap.id, ...pSnap.data() };

    // Haetaan pelaajaan liittyvät kutsut
    const kSnap = await db.collection('seurat').doc(tila.seuraId)
      .collection('kutsut')
      .where('pelaajaId', '==', pelaajaId)
      .get();
    // Kutsuhistoria uusin ensin (1.10.2026)
    const _kutsuMs = (k) => { const t = k.luotu || k.lahetetty; return t && t.seconds ? t.seconds * 1000 : (t ? (Date.parse(t) || 0) : 0); };
    kutsut = kSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => _kutsuMs(b) - _kutsuMs(a));
  } catch(e) {
    console.warn('[Profiili] Haku epäonnistui:', e.message);
  }

  if (!p) { naytaToast(tmHT('Pelaajan tietoja ei löydy.'), 'virhe'); return; }

  const nimi = p.nimi || `${p.etunimi||''} ${p.sukunimi||''}`.trim();
  /* P1 (1.10.2026): käyttäjäperäiset arvot esc():n kautta (osa tulee julkiselta suostumuslomakkeelta), eikä
     niitä upoteta onclickiin — napit lukevat ne window._pkd-oliosta (O'Brien rikkoi ennen napit). */
  const esc = (v) => (window.tmEsc ? window.tmEsc(v) : _escHtml(v));
  window._pkd = { pelaajaId, seuraId: tila.seuraId, etunimi: p.etunimi || '', sukunimi: p.sukunimi || '', joukkue: p.joukkue || '',
    huoltajaEmail: p.huoltajaEmail || '', palloID: p.palloID || '', nimi };
  const onAnnettu = _suostumusAnnettu(p), onPeruttu = _suostumusPeruttu(p);
  const syntVuosi = p.syntymaaika
    ? new Date(p.syntymaaika.seconds*1000).getFullYear() : '—';

  // Suostumukset eriteltynä — selkokieliset nimet lomakkeen järjestyksessä (1.10.2026).
  // 'ei_kaytossa' = lomakkeen piilotettu c7, poistunut suostumus (aina false) → ei näytetä.
  const SUOSTUMUS_NIMET = {
    rekisteri:      tmHT('Tietojen tallentaminen rekisteriin'),
    tietosuoja:     tmHT('Tietosuojaseloste luettu'),
    testaaminen:    tmHT('Testaaminen ja kehitysseuranta'),
    biologinen_ika: tmHT('Biologisen iän arviointi'),
    valmentajajako: tmHT('Tietojen jakaminen valmentajille'),
    anon_data:      'Anonyymi tilastokäyttö',
  };
  const suostumukset = p.suostumus?.hyvaksytyt || {};
  const _jarj = Object.keys(SUOSTUMUS_NIMET);
  const suostumusRivit = Object.entries(suostumukset)
    .filter(([k]) => k !== 'ei_kaytossa')
    .sort(([a], [b]) => (_jarj.indexOf(a) < 0 ? 99 : _jarj.indexOf(a)) - (_jarj.indexOf(b) < 0 ? 99 : _jarj.indexOf(b)))
    .map(([k, v]) => [SUOSTUMUS_NIMET[k] || k, v])
    .map(([k, v]) =>
    `<div style="display:flex;justify-content:space-between;padding:5px 0;
      border-bottom:1px solid rgba(255,255,255,.05);font-size:12px;">
      <span style="color:var(--ink3);">${esc(k)}</span>
      <span style="${v ? 'color:var(--teal)' : 'color:var(--amber)'}">${v ? '✓ Hyväksytty' : tmHT('✗ Ei hyväksytty')}</span>
    </div>`
  ).join('') || '<div style="color:var(--ink3);font-size:12px;">' + tmHT('Ei suostumustietoja') + '</div>';

  // Kutsuhistoria
  const kutsuRivit = kutsut.length > 0
    ? kutsut.map(k => {
        const pvm = k.luotu?.seconds
          ? new Date(k.luotu.seconds*1000).toLocaleDateString('fi-FI') : '—';
        const tila_k = tmHT(TM_SEURA_TUONTI.tmSeuraKutsuTilaTeksti(k.tila));
        const vari = k.tila === 'hyvaksytty' || k.tila === 'lahetetty' ? 'var(--teal)'
          : k.tila === 'odottaa' ? 'var(--amber)' : k.tila === 'epaonnistui' ? 'var(--red)' : 'var(--ink3)';
        return `<div style="display:flex;justify-content:space-between;align-items:center;
          padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:12px;">
          <div>
            <span style="color:var(--ink1);">${esc(k.hEmail || '—')}</span>
            <span style="color:var(--ink3);margin-left:8px;">${pvm}</span>
          </div>
          <span style="color:${vari};">${tila_k}</span>
        </div>`;
      }).join('')
    : '<div style="color:var(--ink3);font-size:12px;">' + tmHT('Ei kutsuhistoriaa') + '</div>';

  // Huoltajan tiedot — kutsuflow (vahvistaSuostumus-CF) tallentaa LITTEÄN huoltajaEmail:in,
  // uusi-rekisteröinti huoltaja-OBJEKTIN. Lue molemmat: objekti ensisijaisesti, muuten litteä email
  // (muuten kortti näytti "—" vaikka huoltajaEmail oli tallessa — kaikki kutsuflow-rekisteröinnit).
  const huoltaja = p.huoltaja;
  const huoltajaEmailNayta = (huoltaja && huoltaja.email) || p.huoltajaEmail || '';
  const huoltajaNimiNayta  = huoltaja ? `${huoltaja.etunimi || ''} ${huoltaja.sukunimi || ''}`.trim() : '';
  const huoltajaHtml = (huoltajaNimiNayta || huoltajaEmailNayta)
    ? `<div style="font-size:13px;color:var(--ink2);">
        ${esc(huoltajaNimiNayta)}
        ${huoltajaEmailNayta ? `<span style="color:var(--ink3);margin-left:8px;">${esc(huoltajaEmailNayta)}</span>` : ''}
        ${huoltaja && huoltaja.puhelin ? `<span style="color:var(--ink3);margin-left:8px;">${esc(huoltaja.puhelin)}</span>` : ''}
       </div>`
    : `<div style="color:var(--ink3);font-size:12px;">—</div>`;

  // Suostumuksen antaja + aika
  // Kanoninen suostumus.antaja; vanhat kentät varalla (suostumuksenAntaja, huoltaja-objekti)
  const antaja = (p.suostumus?.antaja || p.suostumuksenAntaja
    || (huoltaja ? `${huoltaja.etunimi || ''} ${huoltaja.sukunimi || ''}`.trim() : '') || '—');
  const antajaPvm = p.suostumus?.annettu?.seconds
    ? new Date(p.suostumus.annettu.seconds*1000).toLocaleString('fi-FI') : '—';

  // Rakennetaan modaali
  const modalId = 'pelaajaProfiiliModal';
  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modalTausta';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modalSisalto" style="max-width:560px;max-height:85vh;overflow-y:auto;">
      <button class="modalSuljeNappi" onclick="document.getElementById('${modalId}').classList.remove('auki')">${tmHT('✕ Sulje')}</button>

      <!-- Otsikko -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
        <div style="width:48px;height:48px;border-radius:50%;background:var(--primary-dim);
          display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">
          ⚽
        </div>
        <div>
          <div style="font-size:18px;font-weight:700;color:var(--ink1);">${esc(nimi)}</div>
          <div style="font-size:13px;color:var(--ink3);">${esc(p.joukkue || '—')} · ${esc(syntVuosi)}</div>
        </div>
        <span class="badge ${onPeruttu ? 'harmaa' : onAnnettu ? 'ok' : 'odottaa'}" style="margin-left:auto;">
          ${onPeruttu ? '⊘ ' + tmHT('Suostumus peruttu') + ' ' + esc(_peruttuPvm(p)) : onAnnettu ? '✓ Rekisteröity' : tmHT('⏳ Kutsu lähetetty')}
        </span>
      </div>

      <!-- Perustiedot -->
      <div style="margin-bottom:16px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;
          color:var(--ink3);text-transform:uppercase;margin-bottom:8px;">Perustiedot</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${[
            ['Etunimi', p.etunimi || '—'],
            ['Sukunimi', p.sukunimi || '—'],
            [tmHT('Syntymävuosi'), syntVuosi],
            ['Sukupuoli', p.sukupuoli || '—'],
            ['Joukkue', p.joukkue || '—'],
            ['PalloID', p.palloID || p.palloId || '—'],
          ].map(([k,v]) => `
            <div style="background:rgba(255,255,255,.04);border-radius:8px;padding:8px 12px;">
              <div style="font-size:10px;color:var(--ink3);margin-bottom:3px;">${esc(k)}</div>
              <div style="font-size:13px;color:var(--ink1);font-weight:500;">${esc(v)}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- ${tmHT('Huoltaja')} -->
      <div style="margin-bottom:16px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;
          color:var(--ink3);text-transform:uppercase;margin-bottom:8px;">Huoltaja</div>
        ${huoltajaHtml}
      </div>

      <!-- Suostumukset -->
      <div style="margin-bottom:16px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;
          color:var(--ink3);text-transform:uppercase;margin-bottom:8px;">Suostumukset</div>
        ${onAnnettu
          ? `<div style="font-size:12px;color:var(--ink3);margin-bottom:8px;">
              Antaja: <strong style="color:var(--ink2);">${esc(antaja)}</strong> · ${esc(antajaPvm)}
             </div>`
          : ''}
        <div style="background:rgba(255,255,255,.03);border-radius:8px;padding:10px 14px;">
          ${suostumusRivit}
        </div>
      </div>

      <!-- Kutsuhistoria -->
      <div style="margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;
          color:var(--ink3);text-transform:uppercase;margin-bottom:8px;">Kutsuhistoria</div>
        <div style="background:rgba(255,255,255,.03);border-radius:8px;padding:10px 14px;">
          ${kutsuRivit}
        </div>
      </div>

      ${_ikaTila(p) === 'ika_alle_10' ? '<div class="ika-teksti" style="margin-bottom:16px;padding:12px 14px;border:1px solid var(--bord2);border-radius:10px;font-size:12.5px;color:var(--ink2);">' + _ikaTeksti('ika_alle_10') + '</div>' : `<!-- PIN-koodi ja pelaajasivu-linkki; 8–9 v: alle 10-vuotiaalta piilossa -->
      <div style="margin-bottom:16px;padding:12px 14px;background:rgba(0,212,170,.06);
        border:1px solid rgba(0,212,170,.18);border-radius:10px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;
          color:#00D4AA;text-transform:uppercase;margin-bottom:10px;">
          ${tmHT('🔑 Pelaajasivu-kirjautuminen')}
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <div>
            <div style="font-size:10px;color:var(--ink3);margin-bottom:3px;">${tmHT('PIN-koodi')}</div>
            <div id="pin-nakytys-${pelaajaId}" style="font-family:monospace;font-size:22px;font-weight:900;
              color:#00D4AA;letter-spacing:4px;background:rgba(0,0,0,.25);
              padding:6px 14px;border-radius:8px;display:inline-block;min-width:80px;text-align:center;">
              ${esc(_suostumusAnnettu(p) ? (p.pin || '—') : '—')}
            </div>
            ${(!_suostumusAnnettu(p) && p.pin) ? '<div style="font-size:10px;color:var(--amber);margin-top:4px;max-width:180px;">' + tmHT('Suostumus puuttuu – PIN ei ole käytössä.') + '</div>' : ''}${_ikaTila(p) === 'ika_puuttuu' ? '<div class="ika-teksti" style="font-size:12.5px;color:var(--amber);margin-top:4px;max-width:220px;">' + _ikaTeksti('ika_puuttuu') + '</div>' : ''}${_lkPelaaja(p) ? '<div class="lk-teksti" style="font-size:12.5px;color:var(--amber);margin-top:4px;max-width:220px;">' + _laskutusEsto(true) + '</div>' : ''}
          </div>
          <div style="flex:1;min-width:180px;">
            <div style="font-size:10px;color:var(--ink3);margin-bottom:3px;">${tmHT('Huoltajan sähköposti')}</div>
            <div style="font-size:12px;color:var(--ink2);">${esc(p.huoltajaEmail || '—')}</div>
          </div>
        </div>
        <!-- PR 4: PIN vain palvelimella (asetaPelaajanPin). Tyhjä kenttä → palvelin luo 6-numeroisen.
             Vanha PIN lakkaa toimimasta heti (myös jo kirjautuneella pelaajalla). -->
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center;">
          <button class="lisaaNappi" style="background:rgba(0,212,170,.2);border:1px solid rgba(0,212,170,.4);
            color:#00D4AA;font-size:12px;padding:6px 14px;"
            onclick="uusiPelaajaPIN('${pelaajaId}')"${_lkAttr(_lkPelaaja(p))}>
            ${tmHT('🔑 Uusi PIN')}
          </button>
          <input id="pin-syote-${pelaajaId}" type="text" maxlength="6" pattern="[0-9]{6}"
            inputmode="numeric" placeholder="oma PIN (valinnainen)"
            style="width:170px;background:rgba(0,0,0,.3);border:1px solid rgba(0,212,170,.3);
            border-radius:6px;padding:6px 10px;font-size:14px;font-family:monospace;
            color:#00D4AA;letter-spacing:2px;text-align:center;"
            onkeydown="if(event.key==='Enter')uusiPelaajaPIN('${pelaajaId}')">
        </div>
        ${p.huoltajaEmail ? `
        <button class="lisaaNappi" style="margin-top:10px;width:100%;
          background:rgba(0,212,170,.15);border:1px solid rgba(0,212,170,.3);
          color:#00D4AA;font-weight:700;"
          onclick="lahetaPelaajaLinkki(_pkd.pelaajaId, _pkd.seuraId, _pkd.etunimi, _pkd.sukunimi, _pkd.huoltajaEmail, _pkd.joukkue)"${_lkAttr(_lkPelaaja(p))}>
          ${tmHT('📨 Lähetä pelaajasivu-linkki huoltajalle uudelleen')}
        </button>` : `
        <div style="margin-top:8px;font-size:11px;color:var(--amber);">
          ${tmHT('⚠️ Huoltajasähköposti puuttuu — linkkiä ei voi lähettää')}
        </div>`}
      </div>
      `}
      <!-- Toiminnot -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="lisaaNappi" style="background:var(--primary-dim);flex:1;"
          onclick="
            document.getElementById('${modalId}').classList.remove('auki');
            window.open('TalentMaster_VP_v25.html?seura=${encodeURIComponent(tila.seuraId)}&pelaaja=${encodeURIComponent(pelaajaId)}&nakyma=kehitys', '_blank');
          ">
          ${tmHT('📋 Avaa kehityssuunnitelma')}
        </button>
        ${!onAnnettu ? `
        <button class="lisaaNappi" style="background:rgba(42,93,176,.15);flex:1;"
          onclick="document.getElementById('${modalId}').classList.remove('auki'); avaaRekisteriModalPelaajalle(_pkd.pelaajaId, _pkd.etunimi, _pkd.sukunimi, _pkd.joukkue, _pkd.huoltajaEmail, _pkd.palloID);">
          ${tmHT('✉️ Lähetä rekisteröintikutsu')}
        </button>` : ''}
      </div>

      <!-- Muokkaa tietoja — VP, seuran admin ja Super Admin -->
      ${['superadmin','vp','seurasihteeri','urheilutoimenjohtaja'].includes(tila.rooli) ? `
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="lisaaNappi"
            style="background:rgba(42,93,176,.1);border:1px solid rgba(42,93,176,.3);flex:1;font-size:12px;"
            onclick="avaaMuokkaaPelaajaModal('${pelaajaId}')">
            ${tmHT('✏️ Muokkaa tietoja')}
          </button>
          <button class="lisaaNappi"
            style="background:rgba(224,160,64,.1);border:1px solid rgba(224,160,64,.3);flex:1;font-size:12px;"
            onclick="avaaVaihdaJoukkuePelaajaModal(_pkd.pelaajaId, _pkd.joukkue)">
            ${tmHT('🔄 Vaihda joukkue')}
          </button>${onAnnettu ? '<button class="lisaaNappi" style="background:rgba(220,50,50,.08);border:1px solid rgba(220,50,50,.3);flex:1;font-size:12px;" onclick="_seuraPeruSuostumus()">' + tmHT('Peru suostumus') + '</button>' : ''}
        </div>
      </div>` : ''}

      <!-- Poisto — vain Super Admin -->
      ${tila.rooli === 'superadmin' ? `
      <div style="margin-top:10px;">
        <button class="lisaaNappi" style="width:100%;
          background:rgba(220,50,50,.1);border:1px solid rgba(220,50,50,.3);
          color:rgba(255,120,120,.9);font-size:12px;"
          onclick="vahvistaPelaajanPoisto(_pkd.pelaajaId, _pkd.nimi)">
          ${tmHT('🗑️ Poista pelaaja pysyvästi')}
        </button>
      </div>` : ''}
    </div>`;

  modal.classList.add('auki');
}

// ─────────────────────────────────────────────────────────────────
// SUPER ADMIN: PELAAJAN MUOKKAUS
// ─────────────────────────────────────────────────────────────────
async function avaaMuokkaaPelaajaModal(pelaajaId) {
  const pm = document.getElementById('pelaajaProfiiliModal');
  if (pm) pm.classList.remove('auki');

  let p = null;
  try {
    const snap = await db.collection('seurat').doc(tila.seuraId).collection('pelaajat').doc(pelaajaId).get();
    if (snap.exists) p = { id: snap.id, ...snap.data() };
  } catch(e) { naytaToast(tmHT('Tietojen haku epäonnistui.'), 'virhe'); return; }
  if (!p) return; { const l = [p]; if (await _seuraYhdista(l)) return; p = l[0]; }   // PR 2c (R2): sisainen/tiedot yhdistetään; latausvirhe → ikkuna ei aukea (tallennus kirjoittaisi väärän talenttiOhjelma-arvon)

  // Syntymäaika → date-kentäksi (YYYY-MM-DD)
  // Date-kenttää EI esitäytetä pelkästä vuodesta (ei keksittyä 1.1.); vuosi näkyy omassa kentässään.
  const syntyma = tmSyntymaAvaus(p);
  const syntymaPvm = syntyma.pvm;

  const joukkueet = (tila.joukkueet || []);
  // Pelaajan nykyiset joukkueet — tukee sekä vanhaa string-kenttää että uutta array-kenttää
  const nykyisetJoukkueet = Array.isArray(p.joukkueet) ? p.joukkueet
    : (p.joukkue ? [p.joukkue] : []);

  // Joukkue-checkboxit — vertaa sekä ID:llä että nimellä (backward compat)
  const joukkueCheckboxit = joukkueet.length > 0
    ? joukkueet.map(j => {
        const valittu = nykyisetJoukkueet.includes(j.id) || nykyisetJoukkueet.includes(j.nimi);
        return `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;
          padding:7px 10px;border-radius:6px;transition:background .15s;"
          onmouseover="this.style.background='rgba(40,176,144,.06)'"
          onmouseout="this.style.background='transparent'">
          <input type="checkbox" name="mp_joukkue_cb" value="${j.id}"
            ${valittu ? 'checked' : ''} onchange="muokkaaSyntymaPaivita()"
            style="width:15px;height:15px;accent-color:var(--teal);cursor:pointer;flex-shrink:0;">
          <span style="font-size:13px;color:var(--ink);">${j.nimi || j.id}</span>
          <span style="font-size:11px;color:var(--ink3);margin-left:auto;">${j.ikaryhma||''} ${j.vuosi||''}</span>
        </label>`;
      }).join('')
    : '<div style="font-size:12px;color:var(--ink3);padding:8px;">' + tmHT('Ei joukkueita — lisää Joukkueet-välilehdellä ensin.') + '</div>';

  // Talenttistatus — nykytila
  const onTalentti = !!p.talenttiOhjelma;
  const talenttiTaso = p.talenttiTaso || 'perus';

  const isSuperAdmin = tila.rooli === 'superadmin' || tila.rooli === 'super_admin';

  let modal = document.getElementById('muokkaaPelaajaModal');
  if (!modal) { modal = document.createElement('div'); modal.id = 'muokkaaPelaajaModal'; modal.className = 'modalTausta'; document.body.appendChild(modal); }

  modal.innerHTML = `
    <div class="modalSisalto" style="max-width:520px;">
      <button class="modalSuljeNappi" onclick="document.getElementById('muokkaaPelaajaModal').classList.remove('auki')">${tmHT('✕ Sulje')}</button>
      <div class="modalOtsikko">${tmHT('✏️ Muokkaa pelaajatietoja')}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div class="kenttaRyhma">
          <label class="kenttaLabel">${tmHT('Etunimi')}</label>
          <input id="mp_etunimi" class="kenttaInput" value="${p.etunimi||''}">
        </div>
        <div class="kenttaRyhma">
          <label class="kenttaLabel">${tmHT('Sukunimi')}</label>
          <input id="mp_sukunimi" class="kenttaInput" value="${p.sukunimi||''}">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div class="kenttaRyhma">
          <label class="kenttaLabel">${tmHT('Syntymäpäivä')}</label>
          <input id="mp_syntymaaika" class="kenttaInput" type="date" value="${syntymaPvm}" onchange="muokkaaSyntymaPaivita()">
        </div>
        <div class="kenttaRyhma">
          <label class="kenttaLabel">${tmHT('Syntymävuosi')}</label>
          <input id="mp_syntymavuosi" class="kenttaInput" type="number" inputmode="numeric" min="${TM_SYNTYMA_MIN_VUOSI}" max="${new Date().getFullYear()}" value="${syntyma.vuosi || ''}" oninput="muokkaaSyntymaPaivita()">
        </div>
      </div>
      <div id="mp_ikavaroitus" style="display:none;font-size:12px;color:var(--amber);margin:-4px 0 12px;">${tmHT('Syntymävuosi ei vastaa joukkueen ikäluokkaa. Tarkista.')}</div>

      <div style="display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:12px;">
        <div class="kenttaRyhma">
          <label class="kenttaLabel">Sukupuoli</label>
          <select id="mp_sukupuoli" class="kenttaInput">
            <option value="">— valitse —</option>
            <option value="M" ${p.sukupuoli==='M'?'selected':''}>Poika / Mies</option>
            <option value="N" ${p.sukupuoli==='N'?'selected':''}>Tyttö / Nainen</option>
          </select>
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label class="kenttaLabel">${tmHT('Joukkueet (voi valita useamman)')}</label>
        <div style="background:var(--bg3);border:1px solid var(--bord2);border-radius:8px;
          padding:6px;max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;">
          ${joukkueCheckboxit}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div class="kenttaRyhma">
          <label class="kenttaLabel">${tmHT('Pelipaikka')}</label>
          <select id="mp_pelipaikka" class="kenttaInput">
            ${(function(){
              // Arvo=lyhenne (yhtenäistää datan); labelit täsmäävät Pelaaja-näkymän POS-mappiin.
              var PP=[['MV','Maalivahti'],['KP','Keskuspuolustaja'],['LP','Laitapuolustaja'],['KK',tmHT('Keskikenttä')],['HM',tmHT('Hyökkäävä keskik.')],['LH',tmHT('Laitahyökkääjä')],['KH',tmHT('Keskushyökkääjä')]];
              var nyk=String(p.pelipaikka||p.positio||'').trim();
              // Esivalinta: nykyinen arvo voi olla lyhenne ("LH") TAI kokonimi ("Laitahyökkääjä")
              var match=PP.find(function(x){return x[0].toLowerCase()===nyk.toLowerCase()||x[1].toLowerCase()===nyk.toLowerCase();});
              var sel=match?match[0]:nyk;
              var opts='<option value=""'+(sel?'':' selected')+'>— Valitse pelipaikka —</option>';
              opts+=PP.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===sel?' selected':'')+'>'+x[1]+'</option>';}).join('');
              // Tuntematon vanha vapaa teksti → säilytetään ettei katoa
              if(nyk && !match) opts+='<option value="'+nyk+'" selected>'+nyk+' (nykyinen)</option>';
              return opts;
            })()}
          </select>
        </div>
        <div class="kenttaRyhma">
          <label class="kenttaLabel">${tmHT('Huoltajan sähköposti')}</label>
          <input id="mp_hEmail" class="kenttaInput" type="email" value="${p.huoltajaEmail||p.huoltaja?.email||''}">
        </div>
      </div>

      <!-- Perustiedot (2d): vahvempi jalka + toissijainen pelipaikka (Palloliiton Player Development Card §2) -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div class="kenttaRyhma">
          <label class="kenttaLabel">${tmHT('Vahvempi jalka')}</label>
          <select id="mp_vahvempiJalka" class="kenttaInput">
            ${(function(){
              var VJ=[['','—'],['oikea','Oikea'],['vasen','Vasen'],['molemmat','Molemmat']];
              var nyk=String(p.vahvempi_jalka||'').trim().toLowerCase();
              return VJ.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===nyk?' selected':'')+'>'+x[1]+'</option>';}).join('');
            })()}
          </select>
        </div>
        <div class="kenttaRyhma">
          <label class="kenttaLabel">${tmHT('Toissijainen pelipaikka')}</label>
          <select id="mp_positio2" class="kenttaInput">
            ${(function(){
              // Sama optiolista kuin ensisijainen pelipaikka (yhtenäinen data).
              var PP=[['MV','Maalivahti'],['KP','Keskuspuolustaja'],['LP','Laitapuolustaja'],['KK',tmHT('Keskikenttä')],['HM',tmHT('Hyökkäävä keskik.')],['LH',tmHT('Laitahyökkääjä')],['KH',tmHT('Keskushyökkääjä')]];
              var nyk=String(p.positio_2||'').trim();
              var match=PP.find(function(x){return x[0].toLowerCase()===nyk.toLowerCase()||x[1].toLowerCase()===nyk.toLowerCase();});
              var sel=match?match[0]:nyk;
              var opts='<option value=""'+(sel?'':' selected')+'>— Ei toissijaista —</option>';
              opts+=PP.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===sel?' selected':'')+'>'+x[1]+'</option>';}).join('');
              if(nyk && !match) opts+='<option value="'+nyk+'" selected>'+nyk+' (nykyinen)</option>';
              return opts;
            })()}
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
        <div class="kenttaRyhma">
          <label class="kenttaLabel">PalloID</label>
          <input id="mp_palloId" class="kenttaInput" value="${p.palloID||p.palloId||''}">
        </div>
      </div>

      <!-- TALENTTISTATUS -->
      <div style="padding:14px;background:rgba(40,176,144,.06);border:1px solid rgba(40,176,144,.2);
        border-radius:10px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--teal);letter-spacing:.06em;text-transform:uppercase;">${tmHT('⭐ Talenttiohjelma')}</div>
            <div style="font-size:11px;color:var(--ink3);margin-top:2px;">${tmHT('Pelaaja saa IDP:n ja talenttivalmentajan seurannan')}</div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="mp_talentti" ${onTalentti ? 'checked data-oli-talentti="1"' : ''}
              style="width:16px;height:16px;accent-color:var(--teal);cursor:pointer;"
              onchange="document.getElementById('mp_talenttiTasoRivi').style.display=this.checked?'block':'none'">
            <span style="font-size:13px;color:var(--ink);">${onTalentti ? 'Aktiivinen' : tmHT('Ei aktiivinen')}</span>
          </label>
        </div>
        <div id="mp_talenttiTasoRivi" style="display:${onTalentti ? 'block' : 'none'};">
          <label class="kenttaLabel" style="margin-bottom:4px;">${tmHT('Taso')}</label>
          <select id="mp_talenttiTaso" class="kenttaInput" style="font-size:13px;">
            <option value="perus" ${talenttiTaso==='perus'?'selected':''}>${tmHT('Perus — IDP-seuranta')}</option>
            <option value="laajennettu" ${talenttiTaso==='laajennettu'?'selected':''}>${tmHT('Laajennettu — intensiivisempi ohjelma')}</option>
          </select>
        </div>
      </div>

      ${isSuperAdmin ? `
      <div style="margin-top:16px;padding:14px;background:rgba(224,160,64,.06);border:1px solid rgba(224,160,64,.2);border-radius:10px;margin-bottom:12px;">
        <div style="font-size:11px;font-weight:700;color:var(--amber);letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px;">
          🔬 Kehon valmius -ketjut (Super Admin) — asteikko 1.0–3.0
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px;">
          ${[['sbl','SBL'],['sfl','SFL'],['ll','LL'],['diag','DIAG'],['dfl','DFL']].map(([k,l]) => `
            <div>
              <div style="font-size:10px;color:var(--ink3);margin-bottom:3px;">${l}</div>
              <input id="mp_${k}" class="kenttaInput" type="number" min="1" max="3" step="0.01"
                style="padding:6px 8px;font-size:13px;text-align:center;"
                value="${p[k] != null ? p[k] : ''}">
            </div>`).join('')}
        </div>
        <div style="font-size:10px;color:var(--ink3);margin-top:6px;">${tmHT('1.0 = rajoitteita · 2.0 = normi · 3.0 = erinomainen. flei_viimeisin lasketaan automaattisesti.')}</div>
      </div>` : ''}

      <div id="mp_virhe" class="virheViesti" style="display:none;margin-bottom:12px;"></div>

      <div style="display:flex;gap:10px;">
        <button class="lisaaNappi" style="flex:1;"
          onclick="tallennaMusokkausPelaaja('${pelaajaId}')">
          ${tmHT('💾 Tallenna muutokset')}
        </button>
        <button class="lisaaNappi" style="background:none;border:1px solid var(--border);color:var(--ink3);"
          onclick="document.getElementById('muokkaaPelaajaModal').classList.remove('auki')">
          ${tmHT('Peruuta')}
        </button>
      </div>
    </div>`;

  modal.classList.add('auki');
}

// Syntymäpäivä ↔ vuosi: päivä annettu → vuosi täyttyy ja lukittuu; ikäluokkavaroitus (ei este). Logiikka: lib/tm_syntymavuosi.js
window.muokkaaSyntymaPaivita = function muokkaaSyntymaPaivita() {
  const pvmEl = document.getElementById('mp_syntymaaika'), vEl = document.getElementById('mp_syntymavuosi'), w = document.getElementById('mp_ikavaroitus');
  if (!pvmEl || !vEl) return;
  const pvm = /^\d{4}-\d{2}-\d{2}$/.test(pvmEl.value) ? pvmEl.value : '';
  if (pvm) { vEl.value = pvm.slice(0, 4); vEl.readOnly = true; } else { vEl.readOnly = false; }
  if (!w) return;
  const valitut = Array.from(document.querySelectorAll('input[name="mp_joukkue_cb"]:checked')).map(cb => (tila.joukkueet || []).find(j => j.id === cb.value)).filter(Boolean);
  w.style.display = (vEl.value && tmIkaluokkaVaroitus(vEl.value, valitut, new Date().getFullYear())) ? 'block' : 'none';
};

async function tallennaMusokkausPelaaja(pelaajaId) {
  try { if (tila.kayttaja) await tila.kayttaja.getIdToken(true); } catch(e) { console.warn('[Token]', e.message); }
  const etunimi    = document.getElementById('mp_etunimi')?.value.trim() || '';
  const sukunimi   = document.getElementById('mp_sukunimi')?.value.trim() || '';
  const hEmail     = document.getElementById('mp_hEmail')?.value.trim() || '';
  const palloId    = document.getElementById('mp_palloId')?.value.trim() || '';
  const sukupuoli  = document.getElementById('mp_sukupuoli')?.value || '';
  const pelipaikka = document.getElementById('mp_pelipaikka')?.value.trim() || '';
  const vahvempiJalka = document.getElementById('mp_vahvempiJalka')?.value || '';   // 2d: oikea/vasen/molemmat/''
  const positio2 = document.getElementById('mp_positio2')?.value.trim() || '';       // 2d: toissijainen pelipaikka
  const syntymaaika_str = document.getElementById('mp_syntymaaika')?.value || '';
  const syntymavuosi_str = document.getElementById('mp_syntymavuosi')?.value || '';

  // Joukkueet — kerää checkboxeista (uusi malli)
  const cbList = document.querySelectorAll('input[name="mp_joukkue_cb"]:checked');
  const valitutIds = Array.from(cbList).map(cb => cb.value);
  // Muunna ID:t nimiksi (joukkue-kenttä backward compat)
  const valitutNimet = valitutIds.map(id => {
    const j = (tila.joukkueet||[]).find(j => j.id === id);
    return j?.nimi || id;
  });

  // Talenttistatus
  const onTalentti = document.getElementById('mp_talentti')?.checked || false, oliTalentti = !!document.getElementById('mp_talentti')?.dataset.oliTalentti;
  const talenttiTaso = document.getElementById('mp_talenttiTaso')?.value || 'perus';

  if (!etunimi && !sukunimi) {
    const v = document.getElementById('mp_virhe');
    if (v) { v.textContent = tmHT('Nimi on pakollinen.'); v.style.display='block'; }
    return;
  }
  if (hEmail && tmOnPaikkamerkkiOsoite(hEmail)) {
    const v = document.getElementById('mp_virhe');
    if (v) { v.textContent = PAIKKAMERKKI_SYY + '.'; v.style.display='block'; }
    return;
  }

  const paivitys = {
    etunimi, sukunimi,
    nimi: (etunimi + ' ' + sukunimi).trim(),
    // Joukkueet — molemmat kentät (uusi + backward compat)
    joukkueet:   valitutIds,
    joukkue:     valitutNimet[0] || valitutIds[0] || '',   // ensisijainen, vanha kenttä
    sukupuoli,
    // huoltajaEmail EI tässä: Rules v3.33 → vain palvelimella (asetaHuoltajaEmail alla, kun osoite muuttui).
    pelipaikka:  pelipaikka || null,
    positio:     pelipaikka || null,
    vahvempi_jalka: vahvempiJalka || null,   // 2d perustieto (dominanssi; eri kuin weaker_foot-pelikäyttö)
    positio_2:      positio2 || null,         // 2d toissijainen pelipaikka
    ...(palloId && { palloID: palloId }),
    // Talenttistatus
    talenttiOhjelma: onTalentti,
    ...(onTalentti && { talenttiTaso }),
    ...(!onTalentti && { talenttiTaso: null }), ...(!onTalentti && oliTalentti && { talenttiPaattyi: firebase.firestore.FieldValue.serverTimestamp() }),   // 2c: päättymispäivä vain kun ohjelma oikeasti päättyy
    muokattu:    firebase.firestore.FieldValue.serverTimestamp(),
    muokkaajaUid: tila.kayttaja?.uid || 'tuntematon',
  };

  // Talenttiohjelma aktivointi — aseta alkupäivä vain kun aktivoidaan ensi kertaa
  if (onTalentti && !oliTalentti) {   // 2c (R2): data-oli-talentti asetetaan ikkunassa → talenttiAlku ei ylikirjoitu joka tallennuksella
    paivitys.talenttiAlku    = firebase.firestore.FieldValue.serverTimestamp();
    paivitys.talenttiAktivoi = tila.kayttaja?.uid || 'tuntematon';
  }

  // Vain vuosi → syntymaVuosi, ei syntymaaikaa; päivä → molemmat; molemmat tyhjiä → ei muuteta mitään (lib/tm_syntymavuosi.js)
  const synt = tmSyntymaPaivitys(syntymaaika_str, syntymavuosi_str);
  if (synt.virhe) {
    const v = document.getElementById('mp_virhe');
    if (v) { v.textContent = tmHT(synt.virhe); v.style.display='block'; }
    return;
  }
  Object.assign(paivitys, synt.kentat);

  const isSuperAdmin = tila.rooli === 'superadmin' || tila.rooli === 'super_admin';
  if (isSuperAdmin) {
    const ketjut = ['sbl','sfl','ll','diag','dfl'];
    let fleika = 0; let fleiknt = 0;
    for (const k of ketjut) {
      const el = document.getElementById('mp_' + k);
      if (!el || el.value === '') continue;
      const v = parseFloat(el.value);
      if (isNaN(v) || v < 1 || v > 3) {
        const ve = document.getElementById('mp_virhe');
        if (ve) { ve.textContent = k.toUpperCase() + ' pitää olla 1.0–3.0.'; ve.style.display='block'; }
        return;
      }
      paivitys[k] = Math.round(v * 100) / 100;
      fleika += v; fleiknt++;
    }
    if (fleiknt === 5) {
      paivitys.flei_viimeisin = Math.round((fleika/5 - 1) / 2 * 100);
    }
  }

  try {
    /* PR 2d: talentti* (A) VAIN sisainen/tiedot:iin, muu (myös talenttiOhjelma = C) pelaajadokumenttiin — YKSI batch (tm_sisainen riisuu). Ei raakaa varapolkua: lib puuttuu → virhe näkyy. */
    await window.TM_SISAINEN.tmS4Kirjoita(db, tila.seuraId, pelaajaId, paivitys, {});
    const _hUusi = hEmail ? hEmail.trim().toLowerCase() : null;
    const _hVanha = (((window._pelaajatKaikki || []).find((x) => x.id === pelaajaId) || {}).huoltajaEmail || '').trim().toLowerCase() || null;
    if (_hUusi !== _hVanha) {
      await firebase.app().functions('europe-west1').httpsCallable('asetaHuoltajaEmail')({ seuraId: tila.seuraId, pelaajaId, huoltajaEmail: _hUusi });
    }

    document.getElementById('muokkaaPelaajaModal').classList.remove('auki');
    const infot = [etunimi + ' ' + sukunimi];
    if (valitutNimet.length) infot.push(valitutNimet.join(' + '));
    if (onTalentti) infot.push((tmHT('⭐ Talenttiohjelma') + ' ') + talenttiTaso);
    naytaToast(infot.join(' · ') + ' — tallennettu ✓', 'ok');
    setTimeout(() => renderPelaajat(document.getElementById('nakymaAlue')), 600);
  } catch(e) {
    const v = document.getElementById('mp_virhe');
    if (v) { v.textContent = (tmHT('Tallennus epäonnistui:') + ' ') + e.message; v.style.display='block'; }
  }
}

// ─────────────────────────────────────────────────────────────────
// SUPER ADMIN: JOUKKUEEN VAIHTO (pelaajalle)
// ─────────────────────────────────────────────────────────────────
async function avaaVaihdaJoukkuePelaajaModal(pelaajaId, nykyinenJoukkue) {
  const pm = document.getElementById('pelaajaProfiiliModal');
  if (pm) pm.classList.remove('auki');

  const joukkueet = tila.joukkueet || [];
  if (joukkueet.length === 0) {
    naytaToast(tmHT('Ei joukkueita. Luo joukkueet ensin.'), 'virhe'); return;
  }

  // Haetaan pelaajan nykyiset joukkueet — kenttä voi olla merkkijono (vanha)
  // tai taulukko (uusi). Muunnetaan aina taulukoksi.
  let nykyisetJoukkueet = [];
  try {
    const pSnap = await db.collection('seurat').doc(tila.seuraId)
      .collection('pelaajat').doc(pelaajaId).get();
    if (pSnap.exists) {
      const d = pSnap.data();
      if (Array.isArray(d.joukkueet)) nykyisetJoukkueet = d.joukkueet;
      else if (d.joukkue) nykyisetJoukkueet = [d.joukkue];
    }
  } catch(e) { console.warn('[joukkueMuutos] Haku:', e.message); }

  let modal = document.getElementById('vaihdaJoukkuePelaajaModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'vaihdaJoukkuePelaajaModal';
    modal.className = 'modalTausta';
    document.body.appendChild(modal);
  }

  const checkboxit = joukkueet.map(j => `
    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;
      padding:8px 10px;border-radius:7px;transition:background .15s;"
      onmouseover="this.style.background='rgba(42,93,176,.06)'"
      onmouseout="this.style.background='transparent'">
      <input type="checkbox" value="${j.id}"
        ${nykyisetJoukkueet.includes(j.id) ? 'checked' : ''}
        style="width:16px;height:16px;accent-color:var(--teal);cursor:pointer;flex-shrink:0;">
      <span style="font-size:13px;color:var(--ink2);">${j.nimi || j.id}</span>
      <span style="font-size:11px;color:var(--ink3);margin-left:auto;">${j.ikaryhma || ''}</span>
    </label>`).join('');

  modal.innerHTML = `
    <div class="modalKortti" style="max-width:420px;">
      <button class="modalSuljeNappi" onclick="document.getElementById('vaihdaJoukkuePelaajaModal').classList.remove('auki')">${tmHT('✕ Sulje')}</button>
      <div class="modalOtsikko">${tmHT('🔄 Vaihda joukkue')}</div>
      <div class="modalKuvaus">
        Nykyinen: <strong>${nykyinenJoukkue || '—'}</strong><br>
        <span style="font-size:11px;color:var(--ink3);">
          ${tmHT('Pelaaja voi kuulua useampaan joukkueeseen — rastita kaikki joihin hän osallistuu. Joukkuesiirto tallentuu pelaajadokumenttiin ja näkyy valmentajan näkymässä.')}
        </span>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;
        background:var(--bg3);border:1px solid var(--bord2);border-radius:8px;
        padding:8px;max-height:260px;overflow-y:auto;margin-bottom:16px;">
        ${checkboxit}
      </div>
      <div id="vj_virhe" style="display:none;color:var(--red);font-size:12px;margin-bottom:10px;"></div>
      <div style="display:flex;gap:10px;">
        <button class="lisaaNappi" style="flex:1;background:rgba(224,160,64,.15);
          border:1px solid rgba(224,160,64,.4);color:var(--amber);"
          onclick="tallennaPelaajanJoukkue('${pelaajaId}')">
          ${tmHT('🔄 Tallenna joukkueet')}
        </button>
        <button class="lisaaNappi" style="background:none;border:1px solid var(--border);color:var(--ink3);"
          onclick="document.getElementById('vaihdaJoukkuePelaajaModal').classList.remove('auki')">
          ${tmHT('Peruuta')}
        </button>
      </div>
    </div>`;
  modal.classList.add('auki');
}

async function tallennaPelaajanJoukkue(pelaajaId) {
  // Kerätään valitut joukkueet checkboxeista
  const checkboxes = document.querySelectorAll('#vaihdaJoukkuePelaajaModal input[type=checkbox]');
  const valitutIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

  // Rakennetaan nimet tallennusta varten
  const valitutNimet = valitutIds.map(id => {
    const j = tila.joukkueet.find(j => j.id === id);
    return j?.nimi || id;
  });

  const virheEl = document.getElementById('vj_virhe');
  if (valitutIds.length === 0) {
    if (virheEl) { virheEl.textContent = tmHT('Valitse vähintään yksi joukkue.'); virheEl.style.display = 'block'; }
    return;
  }

  try {
    // Tallennetaan sekä uusi taulukkomuoto että vanha yhteensopivuuskenttä
    // joukkueet[] = kaikki joukkueet (uusi)
    // joukkue = ensimmäinen joukkue (vanha yhteensopivuus valmentajan näkymälle)
    await db.collection('seurat').doc(tila.seuraId)
      .collection('pelaajat').doc(pelaajaId)
      .update({
        joukkueet:   valitutIds,
        joukkue:     valitutNimet[0] || valitutIds[0],  // ensisijainen joukkue — NIMI, ei ID
        joukkueNimi: valitutNimet[0] || null,
        muokattu:    firebase.firestore.FieldValue.serverTimestamp(),
        muokkaajaUid: tila.kayttaja?.uid || 'superadmin',
      });

    document.getElementById('vaihdaJoukkuePelaajaModal').classList.remove('auki');
    const nimiLista = valitutNimet.join(', ');
    naytaToast(`Joukkueet päivitetty → ${nimiLista} ✓`, 'ok');
    // Päivitetään pelaajalistaus
    setTimeout(() => renderPelaajat(document.getElementById('nakymaAlue')), 600);
  } catch(e) {
    if (virheEl) { virheEl.textContent = 'Virhe: ' + e.message; virheEl.style.display = 'block'; }
  }
}

// ─────────────────────────────────────────────────────────────────
// SUPER ADMIN: PELAAJAN POISTO (vahvistusdialoogi)
// ─────────────────────────────────────────────────────────────────
function vahvistaPelaajanPoisto(pelaajaId, pelaajanNimi) {
  const pm = document.getElementById('pelaajaProfiiliModal');
  if (pm) pm.classList.remove('auki');

  let modal = document.getElementById('poistoPelaajaModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'poistoPelaajaModal';
    modal.className = 'modalTausta';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modalSisalto" style="max-width:400px;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">⚠️</div>
      <div class="modalOtsikko" style="color:rgba(255,120,120,.9);">${tmHT('Poistetaanko pelaaja?')}</div>
      <div style="font-size:15px;font-weight:600;color:var(--ink1);margin:8px 0;">${pelaajanNimi}</div>
      <div class="modalKuvaus" style="color:var(--ink3);margin-bottom:20px;">
        ${tmHT('Tämä poistaa pelaajan')} <strong>kaikki tiedot pysyvästi</strong> ${tmHT('(GDPR / oikeus tulla unohdetuksi): perustiedot, havainnot, kirjaukset, testitulokset, läsnäolot, kuvat ja kirjautumistili. Näet ensin tarkan esikatselun. Toimintoa ei voi peruuttaa.')}
      </div>

      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="lisaaNappi"
          style="background:rgba(220,50,50,.15);border:1px solid rgba(220,50,50,.4);color:rgba(255,120,120,.9);min-width:140px;"
          onclick="suoritaPelaajanPoisto('${pelaajaId}', '${pelaajanNimi.replace(/'/g,String.fromCharCode(39))}')">
          ${tmHT('🗑️ Kyllä, poista')}
        </button>
        <button class="lisaaNappi"
          style="background:var(--primary-dim);min-width:100px;"
          onclick="document.getElementById('poistoPelaajaModal').classList.remove('auki')">
          ${tmHT('Peruuta')}
        </button>
      </div>
    </div>`;

  modal.classList.add('auki');
}

// GDPR RTBF (#96): poisto kulkee NYT palvelinpuolen CF:n (poistaPelaajaGDPR) kautta — EI client-deletellä
// (joka jätti orvoiksi alikokoelmat + ristiviitteet + Storage + Auth). Kaksivaiheinen: dryRun-esikatselu →
// vahvistus → kova poisto. CF tekee täyden recursiveDelete-siivouksen Admin SDK:lla.
async function suoritaPelaajanPoisto(pelaajaId, pelaajanNimi) {
  const nappi = document.querySelector('#poistoPelaajaModal .lisaaNappi');
  const poistaFn = firebase.app().functions('europe-west1').httpsCallable('poistaPelaajaGDPR');
  try {
    if (nappi) { nappi.disabled = true; nappi.textContent = tmHT('⏳ Lasketaan…'); }
    // VAIHE 1 — esikatselu (dryRun): mitä ja kuinka paljon poistettaisiin.
    const esi = await poistaFn({ seuraId: tila.seuraId, pelaajaId: pelaajaId, dryRun: true });
    const r = (esi && esi.data) || {};
    if (r.loytyi === false) {
      document.getElementById('poistoPelaajaModal').classList.remove('auki');
      naytaToast(`${pelaajanNimi}: ei löytynyt (jo poistettu)`, 'ok');
      setTimeout(() => renderPelaajat(document.getElementById('nakymaAlue')), 600);
      return;
    }
    const c = r.poistettaisiin || {};
    const rivi = (lbl, n) => (n ? '<div>' + lbl + ': <strong>' + n + '</strong></div>' : '');
    const yhteenveto =
      rivi('Perustiedot', c.pelaaja) + rivi('Havainnot', c.havainnot) + rivi('Kirjaukset', c.kirjaukset) +
      rivi('Testitulokset', c.testitulokset) + rivi(tmHT('Biologinen ikä'), c.biologinen_ika) +
      rivi('Pelidata', c.pelidata) + rivi('Kehut', c.kehut) + rivi('Läsnäolot', c.lasnaolo) +
      rivi('Testitapahtumat', c.testitapahtuma_tulokset) + rivi('PalloID-viitteet', c.palloID_viitteet) +
      rivi('Solo-profiili', c.solo) + rivi('Kuvatiedostot', c.media_tiedostoja) + rivi('Kirjautumistili', c.auth);
    // VAIHE 2 — näytä esikatselu samassa modaalissa + lopullinen vahvistus.
    const modal = document.getElementById('poistoPelaajaModal');
    modal.innerHTML =
      '<div class="modalSisalto" style="max-width:420px;text-align:center;">' +
      '<div style="font-size:40px;margin-bottom:12px;">🗑️</div>' +
      '<div class="modalOtsikko" style="color:rgba(255,120,120,.9);">Poistetaan pysyvästi</div>' +
      '<div style="font-size:15px;font-weight:600;color:var(--ink1);margin:8px 0;">' + pelaajanNimi + '</div>' +
      '<div style="text-align:left;font-size:13px;color:var(--ink2);background:rgba(220,50,50,.08);border:1px solid rgba(220,50,50,.25);border-radius:10px;padding:12px 16px;margin:12px 0;line-height:1.7;">' +
      (yhteenveto || '<div>' + tmHT('Ei dataa') + '</div>') + '</div>' +
      '<div class="modalKuvaus" style="color:var(--ink3);margin-bottom:18px;">GDPR — oikeus tulla unohdetuksi. <strong>' + tmHT('Tätä ei voi peruuttaa.') + '</strong></div>' +
      '<div style="display:flex;gap:10px;justify-content:center;">' +
      '<button class="lisaaNappi" id="rtbfVahvista" style="background:rgba(220,50,50,.15);border:1px solid rgba(220,50,50,.4);color:rgba(255,120,120,.9);min-width:170px;">' + tmHT('🗑️ Poista lopullisesti') + '</button>' +
      '<button class="lisaaNappi" style="background:var(--primary-dim);min-width:100px;" onclick="document.getElementById(\'poistoPelaajaModal\').classList.remove(\'auki\')">' + tmHT('Peruuta') + '</button>' +
      '</div></div>';
    document.getElementById('rtbfVahvista').onclick = async function() {
      const vb = this;
      vb.disabled = true; vb.textContent = '⏳ Poistetaan…';
      try {
        await poistaFn({ seuraId: tila.seuraId, pelaajaId: pelaajaId, dryRun: false, vahvistus: true });
        modal.classList.remove('auki');
        naytaToast(`${pelaajanNimi} poistettu pysyvästi ✓`, 'ok');
        setTimeout(() => renderPelaajat(document.getElementById('nakymaAlue')), 600);
      } catch(e) {
        vb.disabled = false; vb.textContent = tmHT('🗑️ Poista lopullisesti');
        naytaToast((tmHT('Poisto epäonnistui:') + ' ') + (e.message || e), 'virhe');
        console.error('[RTBF poisto]', e);
      }
    };
  } catch(e) {
    if (nappi) { nappi.disabled = false; nappi.textContent = tmHT('🗑️ Kyllä, poista'); }
    naytaToast((tmHT('Esikatselu epäonnistui:') + ' ') + (e.message || e), 'virhe');
    console.error('[RTBF esikatselu]', e);
  }
}

// ─────────────────────────────────────────────────────────────────
// PIN-HALLINTA (PR 4) — PIN asetetaan VAIN palvelimella: asetaPelaajanPin / luoPinitSeuralle.
// Hajautus + selväkielinen kopio samassa erässä, lukitukset nollataan (vanha PIN lakkaa toimimasta heti).
// Oikeus: johto/SA koko seura, joukkueen valmentaja oma joukkue (palvelin tarkistaa).
// ─────────────────────────────────────────────────────────────────
function _pinFn(nimi) { return firebase.app().functions('europe-west1').httpsCallable(nimi, { timeout: 300000 }); }
/* Suostumus ennen PIN:iä (1.10.2026): sama ehto kuin palvelimella (functions/suostumus.js). */
function _suostumusPeruttu(p) { return !!p && (p.suostumusTila === 'peruttu' || !!(p.suostumus && p.suostumus.peruttu)); }   /* B9: kanoninen ehto = lib/tm_suostumus.js — peruttu voittaa */ function _suostumusAnnettu(p) { return !!p && !_suostumusPeruttu(p) && (p.suostumusTila === 'annettu' || !!(p.suostumus && p.suostumus.annettu)); } function _peruttuPvm(p) { const a = p && p.suostumus && p.suostumus.peruttu && p.suostumus.peruttu.aika; const d = a && a.seconds ? new Date(a.seconds * 1000) : null; return d ? d.toLocaleDateString('fi-FI') : ''; } window._seuraPeruSuostumus = async function () { const d = window._pkd || {}; if (!d.pelaajaId || !confirm(tmHT('Perutaanko suostumus? Pelaaja ei voi enää kirjautua, ja huoltaja saa kuittauksen sähköpostiin. Tallennetut tiedot säilyvät; tietojen poisto on erillinen pyyntö.'))) return; try { const r = await _pinFn('peruSuostumus')({ seuraId: d.seuraId, pelaajaId: d.pelaajaId }); naytaToast(tmHT('Suostumus peruttu.') + (r && r.data && r.data.emailLahetetty ? ' ' + tmHT('Huoltaja sai kuittauksen.') : '')); naytaPelaajaTiedot(d.pelaajaId); } catch (e) { naytaToast(tmHT('Suostumuksen peruminen epäonnistui:') + ' ' + ((e && e.message) || ''), 'virhe'); } };
/* Suostumuksen päivä: suostumusAnnettu (palvelin) tai suostumus.annettu (Timestamp / {seconds} / ISO) → Date | null. */
function _suostumusPvm(p) {
  const v = p && (p.suostumusAnnettu || (p.suostumus && p.suostumus.annettu));
  if (!v || v === true) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  if (typeof v === 'string') { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  return null;
}
const PIN_SUOSTUMUS_PUUTTUU = 'Huoltajan suostumus puuttuu – PIN luodaan suostumuksen jälkeen.';
/* Laskutus L1c: palvelimen esto (sopimusseuran passiivinen joukkue, details.syy 'joukkue_passiivinen') → sama teksti kuin harmaassa tilassa, ei raakaa virhettä. true → pelkkä teksti. */ function _laskutusEsto(e) { return (e === true || (e && e.details && e.details.syy === 'joukkue_passiivinen')) ? tmHT('Ei käytössä – sovi käyttöönotosta TalentMasterin kanssa') : ''; } function _lkPelaaja(p) { return !!(window.TM_LASKUTUS_ESTO && window.TM_LASKUTUS_ESTO.tmLaskutusPelaajaEstetty({ laskutus_sopimus: tila.laskutusSopimus }, p, tila.joukkueet)); } function _lkJoukkue(j) { return !!(window.TM_LASKUTUS_ESTO && window.TM_LASKUTUS_ESTO.tmLaskutusJoukkueEstetty({ laskutus_sopimus: tila.laskutusSopimus }, j)); } /* 8–9 v -esto (vaihe 0 §7.6): sama sääntö kuin palvelimella; lib puuttuu → 'ok' (palvelin estää silti). */ function _ikaTila(p) { return (typeof window !== 'undefined' && window.TM_PELAAJA_IKA) ? window.TM_PELAAJA_IKA.tmPelaajaAppTila(p) : 'ok'; } function _ikaTeksti(syy) { return syy === 'ika_alle_10' ? tmHT('Alle 10-vuotiaalle ei luoda PIN:iä eikä pelaajalinkkiä – huoltaja seuraa Vanhemman sivulla.') : syy === 'ika_puuttuu' ? tmHT('Syntymävuosi puuttuu – lisää se ennen PIN:iä tai pelaajalinkkiä.') : ''; } function _lkAttr(estetty) { return estetty ? ' disabled data-lk-estetty="1" title="' + _laskutusEsto(true) + '" aria-label="' + _laskutusEsto(true) + '"' : ''; }
function _pinVirheTeksti(e) {
  const koodi = String((e && e.code) || '').replace(/^functions\//, ''); if (_laskutusEsto(e)) return _laskutusEsto(e); if (koodi === 'failed-precondition' && e && e.details && _ikaTeksti(e.details.syy)) return _ikaTeksti(e.details.syy);
  if (koodi === 'failed-precondition' && e && e.details && e.details.syy === 'suostumus_puuttuu') return PIN_SUOSTUMUS_PUUTTUU;
  if (koodi === 'permission-denied') return 'ei oikeutta tälle pelaajalle';
  if (koodi === 'invalid-argument') return (e && e.message) || 'virheellinen PIN';
  return (e && e.message) || 'tuntematon virhe';
}
function _paivitaPinPaikallisesti(pelaajaId, pin) {
  const p = (window._pelaajatKaikki || []).find((x) => x.id === pelaajaId);
  if (p) p.pin = pin;
  const nakytys = document.getElementById('pin-nakytys-' + pelaajaId);
  if (nakytys) {
    nakytys.textContent = pin;
    nakytys.style.background = 'rgba(0,212,170,.15)';
    setTimeout(() => { if (nakytys) nakytys.style.background = 'rgba(0,0,0,.25)'; }, 1500);
  }
}
/* Kohdejoukko tunnustyökaluille: valitut (checkbox) → muuten aktiivinen joukkue → muuten koko seura. */
function _tunnusKohde() {
  const valitut = Array.from(document.querySelectorAll('.pelValinta:checked')).map((c) => c.value);
  const kaikki = window._pelaajatKaikki || [];
  if (valitut.length) return { kuvaus: valitut.length + ' valittua pelaajaa', lista: kaikki.filter((p) => valitut.indexOf(p.id) >= 0), joukkue: null, valitut: true };
  const j = window._aktiiviJoukkue || '';
  if (j) {
    const lista = kaikki.filter((p) => Array.isArray(p.joukkueet) && p.joukkueet.length ? p.joukkueet.includes(j) : p.joukkue === j);
    const nimi = (lista[0] && (lista[0].joukkueNimi || lista[0].joukkue)) || j;
    return { kuvaus: 'joukkue ' + nimi, lista, joukkue: j, valitut: false };
  }
  return { kuvaus: 'koko seura', lista: kaikki, joukkue: null, valitut: false };
}
function _tunnusTila(t) { const el = document.getElementById('tunnusTila'); if (el) el.textContent = t || ''; }
function _pelaajaLinkki(p) {
  const u = new URL('TalentMaster_Pelaaja_v7.html', location.href);
  u.search = '?p=' + encodeURIComponent(p.id) + '&seura=' + encodeURIComponent(tila.seuraId);
  return u.toString();
}
function _pinPalloId(p) { const v = p.palloID || p.palloId || p.tunniste; return v == null || String(v).trim() === '' ? '' : String(v).trim(); }

/* Luo puuttuvat PIN-koodit (luoPinitSeuralle): kuiva-ajo → vahvistus lukumäärällä → luonti. Valituille
   pelaajille ajetaan asetaPelaajanPin yksitellen (vain niille, joilta PIN puuttuu). */
async function luoPuuttuvatPinit() {
  const k = _tunnusKohde();
  try {
    if (k.valitut) {
      const eiSuostumusta = k.lista.filter((p) => !p.pin && !_suostumusAnnettu(p)).length;
      const ilman = k.lista.filter((p) => !p.pin && _suostumusAnnettu(p));
      if (!ilman.length) { naytaToast(eiSuostumusta ? (tmHT('PIN luodaan vasta suostumuksen jälkeen:') + ' ') + eiSuostumusta + ' valitulta puuttuu huoltajan suostumus.' : tmHT('Kaikilla valituilla on jo PIN.'), 'info'); return; }
      if (!confirm((tmHT('Luodaanko PIN-koodi') + ' ') + ilman.length + ' valitulle pelaajalle, joilta se puuttuu?'
        + (eiSuostumusta ? '\n' + eiSuostumusta + ' ohitetaan: huoltajan suostumus puuttuu.' : ''))) return;
      let ok = 0, virhe = 0, esto = 0; const ikaV = {};   // ikaV: 8–9 v -esto syittäin
      for (const p of ilman) {
        _tunnusTila('PIN ' + (ok + virhe + 1) + '/' + ilman.length + '…');
        try { const r = await _pinFn('asetaPelaajanPin')({ seuraId: tila.seuraId, pelaajaId: p.id }); _paivitaPinPaikallisesti(p.id, r.data.pin); ok++; }
        catch (e) { virhe++; if (_laskutusEsto(e)) esto++; else if (e && e.details && _ikaTeksti(e.details.syy)) { esto++; ikaV[e.details.syy] = (ikaV[e.details.syy] || 0) + 1; } console.warn('[PIN]', p.id, e && e.message); }
      }
      _tunnusTila('');
      naytaToast('✅ PIN luotu ' + ok + ' pelaajalle' + (virhe - esto ? ' · ' + (virhe - esto) + ' epäonnistui (ei oikeutta tai virhe)' : '') + (esto - (ikaV.ika_alle_10 || 0) - (ikaV.ika_puuttuu || 0) ? ' · ' + (esto - (ikaV.ika_alle_10 || 0) - (ikaV.ika_puuttuu || 0)) + ': ' + _laskutusEsto(true) : '') + Object.keys(ikaV).map((y) => ' · ' + ikaV[y] + ': ' + _ikaTeksti(y)).join('')
        + (eiSuostumusta ? ' · ' + eiSuostumusta + ' ohitettu (ei suostumusta)' : ''), virhe ? 'varoitus' : 'ok');
    } else {
      const arg = Object.assign({ seuraId: tila.seuraId, vainPuuttuvat: true }, k.joukkue ? { joukkue: k.joukkue } : {});
      _tunnusTila(tmHT('Lasketaan…'));
      const esi = await _pinFn('luoPinitSeuralle')(Object.assign({ kuivaAjo: true }, arg));
      _tunnusTila('');
      const n = esi.data.luotaisiin || 0;
      const eiSuost = esi.data.ohitettuSuostumus || 0;
      const suostTeksti = eiSuost ? eiSuost + ' pelaajalta puuttuu huoltajan suostumus – PIN luodaan suostumuksen jälkeen.' : '', estoTeksti = [esi.data.ohitettuPassiivinen ? esi.data.ohitettuPassiivinen + ': ' + _laskutusEsto(true) : '', esi.data.ohitettuIka ? esi.data.ohitettuIka + ': ' + _ikaTeksti('ika_alle_10') : '', esi.data.ohitettuIkaPuuttuu ? esi.data.ohitettuIkaPuuttuu + ': ' + _ikaTeksti('ika_puuttuu') : ''].filter(Boolean).join(' ');   // L1c: sopimusseuran passiiviset
      if (!n) { naytaToast((eiSuost || estoTeksti) ? 'Ei luotavia PIN-koodeja (' + k.kuvaus + '). ' + [suostTeksti, estoTeksti].filter(Boolean).join(' ') : 'Kaikilla pelaajilla (' + k.kuvaus + ') on jo PIN.', 'info'); return; }
      if (!confirm((tmHT('Luodaanko uusi 6-numeroinen PIN') + ' ') + n + ' pelaajalle (' + k.kuvaus + ')?\nPelaajat, joilla on jo PIN, eivät muutu.'
        + (eiSuost ? '\n' + suostTeksti : '') + (estoTeksti ? '\n' + estoTeksti : ''))) return;
      _tunnusTila(tmHT('Luodaan PIN-koodeja…'));
      const r = await _pinFn('luoPinitSeuralle')(arg);
      _tunnusTila('');
      naytaToast('✅ PIN luotu ' + r.data.luotu + ' pelaajalle (' + k.kuvaus + ')'
        + (r.data.ohitettuSuostumus ? ' · ' + r.data.ohitettuSuostumus + ' ohitettu (ei suostumusta)' : '')
        + (r.data.oliJo ? ' · ' + r.data.oliJo + ' oli jo' : '') + (r.data.ohitettuPassiivinen ? ' · ' + r.data.ohitettuPassiivinen + ': ' + _laskutusEsto(true) : '') + (r.data.ohitettuIka ? ' · ' + r.data.ohitettuIka + ': ' + _ikaTeksti('ika_alle_10') : '') + (r.data.ohitettuIkaPuuttuu ? ' · ' + r.data.ohitettuIkaPuuttuu + ': ' + _ikaTeksti('ika_puuttuu') : ''), 'ok');
    }
    setTimeout(() => renderPelaajat(document.getElementById('nakymaAlue')), 600);
  } catch (e) {
    _tunnusTila('');
    naytaToast((tmHT('PIN-koodien luonti epäonnistui:') + ' ') + _pinVirheTeksti(e), 'virhe');
  }
}

/* PIN-kortit: A4-sivulle 8 korttia (2 × 4). Kortissa nimi, joukkue, PalloID, PIN ja QR pelaajan
   henkilökohtaiseen linkkiin (?p=&seura= → Pelaaja_v7 näyttää pelkän PIN-näppäimistön). Ei muita
   henkilötietoja. QR-kirjasto ladataan cdnjs:stä vasta tarvittaessa. */
function _lataaQrKirjasto() {
  if (window.QRCode) return Promise.resolve();
  return new Promise((ok, virhe) => {
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    sc.onload = () => ok(); sc.onerror = () => virhe(new Error(tmHT('QR-kirjaston lataus epäonnistui')));
    document.head.appendChild(sc);
  });
}
function _qrDataUrl(teksti) {
  const d = document.createElement('div');
  new window.QRCode(d, { text: teksti, width: 180, height: 180, correctLevel: window.QRCode.CorrectLevel.M });
  const c = d.querySelector('canvas');
  return c ? c.toDataURL('image/png') : ((d.querySelector('img') || {}).src || '');
}
/* QR-suostumuskortti (PR B, 1.10.2026): linkissä VAIN kutsuId + seuraId + pelaajaId — EI nimiä, sähköpostia
   eikä PalloID:tä (huoltaja kirjoittaa ne itse → vahvistaSuostumuksen sähköpostitarkistus suojaa). */
function _suostumusLinkki(pelaajaId, kutsuId) {
  const u = new URL('TalentMaster_Rekisterointi_Suostumus.html', location.href);
  u.search = '?kutsuId=' + encodeURIComponent(kutsuId) + '&seuraId=' + encodeURIComponent(tila.seuraId) + '&pelaajaId=' + encodeURIComponent(pelaajaId);
  return u.toString();
}
/* Kortit A4:lle 8 kpl (2 × 4). Pelaajakortti: nimi, joukkue, PalloID, PIN, QR omaan linkkiin.
   Suostumuskortti: etunimi, joukkue, QR suostumuslomakkeeseen + ohje — EI PIN:iä eikä PalloID:tä. */
function _pinKortitHtml(kortit) {
  // Perheille menevä sisältö SEURAN kielellä (tila.seuraKieli), sivu pysyy suomeksi.
  const kieli = (typeof tila !== 'undefined' && tila.seuraKieli) || 'fi';
  const tp = (avain, fi) => _tkKieli(avain, kieli, fi);
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pelaajakortti = (k) => '<div class="k"><div class="n">' + esc(k.nimi) + '</div><div class="j">' + esc(k.joukkue) + '</div>'
    + '<div class="r"><img src="' + k.qr + '" alt="QR"><div class="t">'
    + (k.palloId ? '<div class="l">PalloID</div><div class="v">' + esc(k.palloId) + '</div>' : '')
    + '<div class="l">PIN</div><div class="v pin">' + esc(k.pin) + '</div></div></div>'
    + '<div class="o">' + esc(tp('seura.kortti_skannaa_pin', tmHT('Skannaa ja syötä PIN'))) + '</div></div>';
  const suostumuskortti = (k) => '<div class="k ks"><div class="n">' + esc(k.etunimi) + '</div><div class="j">' + esc(k.joukkue) + '</div>'
    + '<div class="r"><img src="' + k.qr + '" alt="QR"><div class="t sk">'
    + esc(tp('seura.suostumuskortti_teksti', tmHT('Näytä tämä vanhemmallesi. Kun huoltaja antaa luvan (2 min), hän saa tunnuksesi sähköpostiin.')))
    + '</div></div><div class="o">' + esc(tp('seura.suostumuskortti_ala', tmHT('Huoltajan lupa · TalentMaster'))) + '</div></div>';
  const kortti = (k) => (k.tyyppi === 'suostumus' ? suostumuskortti(k) : k.tyyppi === 'estetty' ? '<div class="k"><div class="n">' + esc(k.nimi) + '</div><div class="j">' + esc(k.joukkue) + '</div><div class="o">' + esc(_ikaTeksti(k.syy) || tp('seura.kortti_ei_kaytossa', tmHT('Ei käytössä – sovi käyttöönotosta TalentMasterin kanssa'))) + '</div></div>' : pelaajakortti(k));   // L1c: estetty → ei PIN:iä eikä pelaajalinkkiä
  let sivut = '';
  for (let i = 0; i < kortit.length; i += 8) sivut += '<div class="s">' + kortit.slice(i, i + 8).map(kortti).join('') + '</div>';
  return '<!doctype html><html lang="' + esc(kieli) + '"><head><meta charset="utf-8"><title>' + esc(tp('seura.kortit_otsikko', 'Kortit')) + '</title><style>'
    + '@page{size:A4;margin:10mm}body{margin:0;font-family:Arial,sans-serif;color:#111}'
    + '.s{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(4,1fr);gap:4mm;height:277mm;page-break-after:always}'
    + '.k{border:1px dashed #888;border-radius:3mm;padding:4mm;display:flex;flex-direction:column}'
    + '.ks{border-style:solid;border-color:#28B090}'
    + '.n{font-size:15pt;font-weight:bold}.j{font-size:10pt;color:#555;margin-bottom:2mm}'
    + '.r{display:flex;gap:4mm;align-items:center;flex:1}.r img{width:32mm;height:32mm}'
    + '.l{font-size:8pt;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-top:1mm}.v{font-size:14pt;font-family:monospace;letter-spacing:1.5px}'
    + '.pin{font-size:20pt;font-weight:bold;letter-spacing:4px}.o{font-size:9pt;color:#333;text-align:center;margin-top:1mm}'
    + '.sk{font-size:11pt;line-height:1.4}'
    + '</style></head><body>' + sivut + '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>';
}
/* Tulostusikkunan tilasivu (1.10.2026): ikkuna avataan HETI napinpainalluksessa (muuten selain estää ponnahduksen),
   ja siihen kirjoitetaan tila — ei tyhjää valkoista sivua. Henkilökunnan näkymä → suomeksi (_tk). */
function _korttiIkkuna(w, otsikko, teksti, napit) {
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  try {
    w.document.open();
    w.document.write('<!doctype html><html lang="fi"><head><meta charset="utf-8"><title>' + esc(_tk('seura.kortit_otsikko', 'Kortit')) + '</title>'
      + '<style>body{font-family:Arial,sans-serif;color:#111;max-width:560px;margin:48px auto;padding:0 20px}h1{font-size:18pt}'
      + 'p{white-space:pre-line;line-height:1.5}button{font-size:12pt;padding:10px 20px;margin-right:10px;border-radius:6px;cursor:pointer;border:1px solid #888;background:#fff}'
      + '#tkJatka{background:#28B090;border-color:#28B090;color:#fff;font-weight:bold}</style></head><body>'
      + '<h1>' + esc(otsikko) + '</h1>' + (teksti ? '<p id="tkTeksti">' + esc(teksti) + '</p>' : '')
      + (napit ? '<div><button id="tkJatka">' + esc(_tk('seura.kortit_tulosta_nappi', 'Tulosta')) + '</button>'
        + '<button id="tkPeru">' + esc(_tk('seura.kortit_peruuta', 'Peruuta')) + '</button></div>' : '')
      + '</body></html>');
    w.document.close();
  } catch (e) { /* ikkuna suljettu */ }
}
/* Vahvistus tulostusikkunassa (ei confirm(): uuden ikkunan alla taustavälilehdelle jäävä dialogi ei näy Safarissa).
   → Promise<boolean>; ikkunan sulkeminen = peruutus. */
function _korttiVahvistus(w, otsikko, teksti) {
  return new Promise((valmis) => {
    let tehty = false;
    const lopeta = (arvo) => { if (tehty) return; tehty = true; clearInterval(vahti); valmis(arvo); };
    _korttiIkkuna(w, otsikko, teksti, true);
    const jatka = w.document.getElementById('tkJatka'), peru = w.document.getElementById('tkPeru');
    if (jatka) jatka.addEventListener('click', () => lopeta(true));
    if (peru) peru.addEventListener('click', () => lopeta(false));
    const vahti = setInterval(() => { if (w.closed) lopeta(false); }, 500);
  });
}
const KORTTI_ERA = 10;   // luoSuostumusKortit-kutsut 10 pelaajan erissä → edistyminen X/N näkyy ikkunassa
/* Tulosta kortit (PR B): suostumuksen antaneet → pelaajakortti; suostumus puuttuu + huoltajaEmail → suostumuskortti
   (kutsu palvelimella: luoSuostumusKortit, avoin kutsu uudelleenkäytetään); ilman huoltajaEmailia → ei korttia.
   1.10.2026: ikkuna ENSIN (ponnahdusesto), vahvistus ikkunassa, edistyminen ja virhe ikkunaan. */
async function tulostaKortit() {
  const w = window.open('', '_blank');   // HETI napinpainalluksessa — ennen mitään awaitia tai dialogia
  if (!w) { naytaToast(_tk('seura.kortit_ponnahdus_estetty', 'Selain esti tulostusikkunan. Salli ponnahdusikkunat tälle sivulle ja paina uudelleen.'), 'virhe'); return; }
  _korttiIkkuna(w, _tk('seura.kortit_valmistellaan', 'Valmistellaan kortteja…'));
  const k = _tunnusKohde();
  const jarj = (a, b) => ((a.sukunimi || '') + (a.etunimi || '')).localeCompare((b.sukunimi || '') + (b.etunimi || ''), 'fi');
  const pelaajat = k.lista.filter((p) => _suostumusAnnettu(p) && p.pin).sort(jarj);
  const ilmanPinia = k.lista.filter((p) => _suostumusAnnettu(p) && !p.pin).length;
  const suostumus = k.lista.filter((p) => !_suostumusAnnettu(p) && p.huoltajaEmail).sort(jarj);
  const eiEmailia = k.lista.filter((p) => !_suostumusAnnettu(p) && !p.huoltajaEmail).length;
  const yhteenveto = _tk('seura.kortit_yhteenveto', '{x} pelaajakorttia, {y} suostumuskorttia, {z} ilman huoltajan sähköpostia.',
    { x: pelaajat.length, y: suostumus.length, z: eiEmailia });
  const lisat = (eiEmailia ? '\n' + _tk('seura.kortit_ei_emailia', '{n} pelaajalta puuttuu huoltajan sähköposti – lisää se pelaajakortille.', { n: eiEmailia }) : '')
    + (ilmanPinia ? '\n' + ilmanPinia + ' pelaajalla on suostumus mutta ei PIN:iä – luo ensin PIN-koodit.' : '');
  if (!pelaajat.length && !suostumus.length) {
    _korttiIkkuna(w, _tk('seura.kortit_ei_tulostettavaa', 'Ei tulostettavia kortteja'), k.kuvaus + '\n' + yhteenveto + lisat);
    naytaToast('Ei tulostettavia kortteja (' + k.kuvaus + '). ' + yhteenveto + lisat.replace(/\n/g, ' '), 'varoitus');
    return;
  }
  const jatketaan = await _korttiVahvistus(w, _tk('seura.kortit_tulosta', 'Tulosta kortit') + ' (' + k.kuvaus + ')', yhteenveto + lisat);
  if (!jatketaan) { try { w.close(); } catch (_) {} return; }
  try {
    const kutsut = {};
    for (let i = 0; i < suostumus.length; i += KORTTI_ERA) {
      _korttiIkkuna(w, _tk('seura.kortit_luodaan', 'Luodaan suostumuskortteja… {x}/{n}', { x: i, n: suostumus.length }));
      const era = suostumus.slice(i, i + KORTTI_ERA);
      const r = await _pinFn('luoSuostumusKortit')({ seuraId: tila.seuraId, pelaajaIds: era.map((p) => p.id) });
      (r.data.kortit || []).forEach((x) => { if (x.tyyppi === 'suostumuskortti' && x.kutsuId) kutsut[x.pelaajaId] = x.kutsuId; });
    }
    _korttiIkkuna(w, _tk('seura.kortit_qr', 'Luodaan QR-koodeja…'));
    await _lataaQrKirjasto();
    const kortit = pelaajat.map((p) => ((_ikaTila(p) !== 'ok' || _lkPelaaja(p)) ? { tyyppi: 'estetty', syy: _ikaTila(p), nimi: ((p.etunimi || '') + ' ' + (p.sukunimi || '')).trim(), joukkue: p.joukkueNimi || p.joukkue || '' } : { tyyppi: 'pelaaja', nimi: ((p.etunimi || '') + ' ' + (p.sukunimi || '')).trim(),
      joukkue: p.joukkueNimi || p.joukkue || '', palloId: _pinPalloId(p), pin: p.pin, qr: _qrDataUrl(_pelaajaLinkki(p)) }))
      .concat(suostumus.filter((p) => kutsut[p.id]).map((p) => ({ tyyppi: 'suostumus', etunimi: p.etunimi || '',
        joukkue: p.joukkueNimi || p.joukkue || '', qr: _qrDataUrl(_suostumusLinkki(p.id, kutsut[p.id])) })));
    w.document.open(); w.document.write(_pinKortitHtml(kortit)); w.document.close();
    const puuttui = suostumus.filter((p) => !kutsut[p.id]).length;
    if (puuttui) naytaToast(puuttui + ' suostumuskorttia jäi tekemättä (ei oikeutta tai pelaajaa ei löytynyt).', 'varoitus');
    setTimeout(() => renderPelaajat(document.getElementById('nakymaAlue')), 600);   // tila → "Kutsu lähetetty"
  } catch (e) {
    const syy = _pinVirheTeksti(e);
    _korttiIkkuna(w, _tk('seura.kortit_virhe', 'Korttien teko epäonnistui'), syy);   // virhe ikkunaan, ei hiljaista sulkemista
    naytaToast((tmHT('Korttien teko epäonnistui:') + ' ') + syy, 'virhe');
  }
}

/* Lähetä tunnukset huoltajille: lahetaPelaajaSivuLinkki sarjassa (sähköpostissa PalloID + PIN + linkki).
   Ohitetaan pelaajat ilman huoltajaEmailia tai PIN:iä — lukumäärät näytetään. */
async function lahetaTunnuksetHuoltajille() {
  const k = _tunnusKohde();
  const eiEmailia = k.lista.filter((p) => !p.huoltajaEmail).length;
  // Suostumus ennen kirjautumista (1.10.2026): tunnukset vain suostumuksen antaneille; muille suostumuskutsu.
  const eiSuostumusta = k.lista.filter((p) => p.huoltajaEmail && !_suostumusAnnettu(p)).length;
  const eiPinia = k.lista.filter((p) => p.huoltajaEmail && _suostumusAnnettu(p) && !p.pin).length;
  const kohteet = k.lista.filter((p) => p.huoltajaEmail && p.pin && _suostumusAnnettu(p));
  const suostOhje = eiSuostumusta + ' ilman suostumusta – lähetä heille suostumuskutsu (Kutsut).';
  if (!kohteet.length) { naytaToast('Ei lähetettävää (' + k.kuvaus + '): ' + eiEmailia + ' ilman huoltajan sähköpostia, ' + eiPinia + ' ilman PIN:iä'
    + (eiSuostumusta ? ', ' + suostOhje : '.'), 'varoitus'); return; }
  if (!confirm((tmHT('Lähetetäänkö tunnukset (PalloID, PIN ja linkki)') + ' ') + kohteet.length + ' huoltajalle (' + k.kuvaus + ')?'
    + (eiEmailia ? '\n' + eiEmailia + ' ohitetaan: ei huoltajan sähköpostia.' : '')
    + (eiPinia ? '\n' + eiPinia + ' ohitetaan: ei PIN:iä (luo ensin PIN-koodit).' : '')
    + (eiSuostumusta ? '\n' + eiSuostumusta + ' ohitetaan: huoltajan suostumus puuttuu – lähetä heille suostumuskutsu.' : ''))) return;
  const fn = firebase.app().functions('europe-west1').httpsCallable('lahetaPelaajaSivuLinkki');
  let ok = 0, virhe = 0, esto = 0, ikaP = 0;   // ikaP: syntymävuosi puuttuu (8–9 v -esto, fail-closed)
  for (const p of kohteet) {
    _tunnusTila((tmHT('Lähetetään') + ' ') + (ok + virhe + 1) + '/' + kohteet.length + '…');
    try {
      await fn({ hEmail: p.huoltajaEmail, pelaajaId: p.id, seuraId: tila.seuraId, etunimi: p.etunimi || '', sukunimi: p.sukunimi || '',
        seura: tila.seuraNimi || tila.seuraId, joukkue: p.joukkue || '' });
      ok++;
    } catch (e) { virhe++; if (_laskutusEsto(e)) esto++; else if (e && e.details && e.details.syy === 'ika_puuttuu') ikaP++; console.warn('[tunnukset]', p.id, e && e.message); }
  }
  _tunnusTila('');
  naytaToast((tmHT('✅ Tunnukset lähetetty') + ' ') + ok + ' huoltajalle' + (virhe - esto - ikaP ? ' · ' + (virhe - esto - ikaP) + ' epäonnistui' : '') + (esto ? ' · ' + esto + ': ' + _laskutusEsto(true) : '') + (ikaP ? ' · ' + ikaP + ': ' + _ikaTeksti('ika_puuttuu') : '')
    + (eiEmailia ? ' · ' + eiEmailia + ' ilman sähköpostia' : '') + (eiPinia ? ' · ' + eiPinia + ' ilman PIN:iä' : '')
    + (eiSuostumusta ? ' · ' + suostOhje : ''), virhe ? 'varoitus' : 'ok');
}

async function uusiPelaajaPIN(pelaajaId) {
  const syote = document.getElementById('pin-syote-' + pelaajaId);
  const oma = (syote?.value || '').trim();
  if (oma && !/^[0-9]{6}$/.test(oma)) {
    naytaToast(tmHT('Oman PIN:n on oltava 6 numeroa — tai jätä kenttä tyhjäksi, niin palvelin luo PIN:n.'), 'virhe');
    if (syote) { syote.style.borderColor = 'rgba(217,96,96,.6)'; syote.focus(); }
    return;
  }
  const p = (window._pelaajatKaikki || []).find((x) => x.id === pelaajaId);
  if (p && p.pin && !confirm('Luodaanko uusi PIN? Vanha PIN (' + p.pin + ') lakkaa toimimasta heti.')) return;
  try {
    const r = await _pinFn('asetaPelaajanPin')(Object.assign({ seuraId: tila.seuraId, pelaajaId: pelaajaId }, oma ? { pin: oma } : {}));
    _paivitaPinPaikallisesti(pelaajaId, r.data.pin);
    if (syote) { syote.value = ''; syote.style.borderColor = 'rgba(0,212,170,.3)'; }
    naytaToast((tmHT('✅ Uusi PIN') + ' ') + r.data.pin + ' — vanha PIN ei enää toimi.', 'ok');
  } catch (e) {
    naytaToast((tmHT('PIN:n asetus epäonnistui:') + ' ') + _pinVirheTeksti(e), 'virhe');
  }
}
