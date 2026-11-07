// ─────────────────────────────────────────────────────────────────
// REKISTERÖINTILINKKI — ydin toiminto
// PERMISSION_MATRIX: VP, seurasihteeri, UTJ, super-admin voivat lähettää
// ─────────────────────────────────────────────────────────────────
function avaaRekisteriModal() {
  // Nollataan lomake
  ['rek_etunimi','rek_sukunimi','rek_hEmail','rek_palloId','rek_sporttiId','rek_pin']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('rek_joukkue').value = '';
  document.getElementById('rekisteriVirhe').classList.remove('nakyvilla');
  document.getElementById('linkkiBoksi').classList.remove('nakyvilla');
  /* "✓ Lähetetty" ei saa jäädä jumiin (21.10.2026): nappi, linkkiteksti ja kuvaus nollataan JOKA kerta kun ikkuna avataan (uusi ja olemassa oleva pelaaja). */
  { const _n = document.getElementById('lahetaSpostNappi');
    _n.disabled = true; _n.textContent = tmHT('📧 Lähetä sähköpostilla'); _n.style.background = 'var(--teal)'; _n.style.color = ''; _n.style.opacity = '';
    const _lt = document.getElementById('linkkiTekstiEl'); if (_lt) _lt.textContent = '';
    const _kv = document.querySelector('#rekisteriModal .modalKuvaus');
    if (_kv) { if (_kv.dataset.oletus == null) _kv.dataset.oletus = _kv.innerHTML; else _kv.innerHTML = _kv.dataset.oletus; } }
  /* Sisarusbugi (30.9.2026): KAIKKI kutsutila nollataan joka kerta. _rekPelaajaId jäi aiemmin edellisestä
     "Lähetä uudelleen" -toiminnosta → uuden pelaajan kutsu ja suostumus kohdistuivat edelliselle pelaajalle.
     Olemassa olevan pelaajan kutsu asettaa sen uudelleen (avaaRekisteriModalPelaajalle). */
  tila._rekLinkki     = null;
  tila._rekHEmail     = null;
  tila._rekPelaajaId  = null;
  paivitaJoukkueValitsin();
  document.getElementById('rekisteriModal').classList.add('auki');
}


// Avaa rekisterimodaali olemassaolevalle pelaajalle — täyttää kentät ja asettaa pelaajaId
function avaaRekisteriModalPelaajalle(pelaajaId, etunimi, sukunimi, joukkue, hEmail, palloid, sporttiId, pin) {
  avaaRekisteriModal();
  setTimeout(() => {
    var fn = document.getElementById('rek_etunimi');
    var sn = document.getElementById('rek_sukunimi');
    var em = document.getElementById('rek_hEmail');
    var jq = document.getElementById('rek_joukkue');
    var pi = document.getElementById('rek_palloId');
    var si = document.getElementById('rek_sporttiId');
    var pn = document.getElementById('rek_pin');
    if (fn) fn.value = etunimi  || '';
    if (sn) sn.value = sukunimi || '';
    if (em) em.value = hEmail   || '';
    /* Valikon arvot ovat joukkueiden ID:itä → välitetään id (pelaajan joukkueet[0]; varalla nimi → kanoninen id), ei nimeä (21.10.2026: nimi jätti valinnan tyhjäksi). */
    const _vp = (window._pelaajatKaikki || []).find(x => x.id === pelaajaId) || null;
    const _jid = TM_SEURA_TUONTI.tmSeuraModalJoukkueId(_vp, joukkue, tila.joukkueet);
    if (jq && _jid) jq.value = _jid;
    if (pi) pi.value = palloid  || '';
    if (si) si.value = sporttiId || '';
    if (pn) pn.value = pin || '';
    if (pi && palloid) pi.value = palloid;
    // Tallennetaan pelaajaId tilaan — lomake käyttää tätä merge:een
    tila._rekPelaajaId = pelaajaId;
    // Päivitä otsikko
    var kuvaus = document.querySelector('#rekisteriModal .modalKuvaus');
    if (kuvaus) kuvaus.innerHTML = '' + tmHT('Lähetä rekisteröintikutsu pelaajalle') + ' <strong>' + etunimi + ' ' + sukunimi + '</strong>.';
  }, 50);
}

function avaaRekisteriModalJoukkueella(joukkueId, joukkueNimi) {
  avaaRekisteriModal();
  // Asetetaan joukkue valikkoon ja näytetään nimi modalin otsikossa
  setTimeout(() => {
    const select = document.getElementById('rek_joukkue');
    if (select) select.value = joukkueId;
    // Lisähyöty: kerrotaan käyttäjälle mille joukkueelle kutsu menee
    const kuvaus = document.querySelector('#rekisteriModal .modalKuvaus');
    if (kuvaus && joukkueNimi) {
      kuvaus.innerHTML = `${tmHT('Luo kutsulink​ki vanhemmalle joukkueelle')} <strong style="color:var(--teal)">${joukkueNimi}</strong>.
        Vanhempi täyttää pelaajan tiedot ja antaa GDPR-suostumuksen.
        Pelaaja tallentuu automaattisesti järjestelmään.`;
    }
  }, 50);
}

function luoRekisteriLinkki() {
  const hEmail   = document.getElementById('rek_hEmail').value.trim();
  const joukkue  = document.getElementById('rek_joukkue').value;
  const etunimi  = document.getElementById('rek_etunimi').value.trim();
  const sukunimi = document.getElementById('rek_sukunimi').value.trim();
  const palloId  = document.getElementById('rek_palloId').value.trim();
  const sporttiId = document.getElementById('rek_sporttiId')?.value?.trim() || '';

  if (!hEmail) {
    naytaModalVirhe('rekisteriVirhe', tmHT('Huoltajan sähköposti on pakollinen.'));
    return;
  }
  if (tmOnPaikkamerkkiOsoite(hEmail)) { naytaModalVirhe('rekisteriVirhe', PAIKKAMERKKI_SYY + '.'); return; }
  if (!joukkue) {
    naytaModalVirhe('rekisteriVirhe', tmHT('Valitse joukkue.'));
    return;
  }

  // Sisarusbugi: sama huoltajan sähköposti EI ole varoituksen aihe (sisarukset ovat eri pelaajia).
  // Duplikaattivaroitus (sama nimi) tehdään tallennuksessa (lahetaRekisteriSahkoposti).

  document.getElementById('rekisteriVirhe').classList.remove('nakyvilla');

  // Rakennetaan kutsulink​ki
  // Linkki vie suostumuslomakkeelle valmiiksi täytetyillä tiedoilla
  const joukkueObj = tila.joukkueet.find(j => j.id === joukkue);
  const joukkueNimi = joukkueObj?.nimi || joukkue;

  const params = new URLSearchParams({
    seuraId:  tila.seuraId,
    seura:    tila.seuraNimi,
    joukkue:  joukkueNimi,
    ...(etunimi   && { etunimi }),
    ...(sukunimi  && { sukunimi }),
    // hEmail EI kutsulinkkiin (huoltaja kirjoittaa osoitteen itse; vahvistaSuostumus vertaa palvelimella tallennettuun)
    ...(palloId   && { palloid: palloId }),
    ...(sporttiId && { sporttiid: sporttiId }),
    // Lisätään pelaajaId jos pelaaja on jo rekisterissä — estää duplikaatin
    ...(tila._rekPelaajaId && { pelaajaId: tila._rekPelaajaId }),
  });

  const baseUrl = _rekBaseUrl();
  const linkki  = `${baseUrl}?${params.toString()}`;

  tila._rekLinkki = linkki;
  tila._rekHEmail = hEmail;

  // Näytetään linkki
  document.getElementById('linkkiTekstiEl').textContent = linkki;
  document.getElementById('linkkiBoksi').classList.add('nakyvilla');
  document.getElementById('lahetaSpostNappi').disabled = false;

  // WhatsApp-jako — avaa valmiilla viestillä
  const waBtn = document.getElementById('lahetaWhatsAppNappi');
  if (waBtn) {
    const nimi = [etunimi, sukunimi].filter(Boolean).join(' ') || 'pelaaja';
    const waViesti = encodeURIComponent(
      `Hei! 👋 ${tila.seuraNimi} kutsuu teidät rekisteröimään ${nimi} TalentMaster-järjestelmään.\n\n` +
      `Täyttäkää tiedot ja antakaa GDPR-suostumus tästä linkistä:\n${linkki}`
    );
    // Jos puhelinnumero on annettu, avataan suora WhatsApp-chat sille numerolle
    // Muuten avataan yleinen WhatsApp-jako josta voi valita vastaanottajan
    const suuntakoodi = document.getElementById('rek_suuntakoodi')?.value || '+358';
    const puhelinRaaka = (document.getElementById('rek_puhelin')?.value || '').replace(/\D/g, '');
    // Rakennetaan kansainvälinen numero: suuntakoodi + numero ilman johtonollaa
    // esim. +358 + 0407010216 → 358407010216
    const maaKoodi   = suuntakoodi.replace('+', '');
    const puhelinIlmanNollaa = puhelinRaaka.replace(/^0+/, ''); // poistaa kaikki johtonollat
    const puhelinKv  = puhelinRaaka ? maaKoodi + puhelinIlmanNollaa : null;
    const nayttoNro  = puhelinKv ? '+' + puhelinKv : null; // näyttömuoto: +358407010216
    const waUrl = puhelinKv
      ? `https://wa.me/${puhelinKv}?text=${waViesti}`
      : `https://wa.me/?text=${waViesti}`;
    waBtn.onclick = () => window.open(waUrl, '_blank');
    waBtn.disabled = false;
    waBtn.textContent = nayttoNro
      ? `💬 Lähetä WhatsApp (${nayttoNro})`
      : tmHT('💬 Jaa WhatsAppissa');
  }

  naytaToast('Kutsulink​ki luotu!', 'ok');
}

/* Duplikaattiehdokas: sama etunimi + sukunimi (normalisoitu) ja — jos molemmilla tiedossa — sama syntymävuosi.
   Pelkkä sama huoltajan sähköposti EI ole duplikaatti (sisarukset). → pelaaja | null */
function _rekDuplikaatti(etunimi, sukunimi, syntymaVuosi) {
  const n = (x) => String(x || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const e = n(etunimi), su = n(sukunimi);
  if (!e || !su) return null;
  return (window._pelaajatKaikki || []).find((p) => n(p.etunimi) === e && n(p.sukunimi) === su
    && (!syntymaVuosi || !p.syntymaVuosi || String(p.syntymaVuosi) === String(syntymaVuosi))) || null;
}

async function lahetaRekisteriSahkoposti() {
  // Haetaan arvot suoraan kentistä — ei riippuvuutta luoRekisteriLinkki():sta
  const hEmail     = document.getElementById('rek_hEmail')?.value?.trim() || tila._rekHEmail;
  const _etu       = TM_SEURA_TUONTI.tmSeuraNimi(document.getElementById('rek_etunimi')?.value);
  const _suku      = TM_SEURA_TUONTI.tmSeuraNimi(document.getElementById('rek_sukunimi')?.value);
  const _joukkueEl = document.getElementById('rek_joukkue');
  const _joukkue   = _joukkueEl?.options?.[_joukkueEl?.selectedIndex]?.text || _joukkueEl?.value || '';

  if (!hEmail || !hEmail.includes('@')) {
    naytaToast(tmHT('Täytä huoltajan sähköpostiosoite ensin.'), 'virhe');
    return;
  }
  if (tmOnPaikkamerkkiOsoite(hEmail)) { naytaToast(PAIKKAMERKKI_SYY + '.', 'virhe'); return; }
  /* Joukkue * on pakollinen UUDELLE pelaajalle (olemassa olevalla tyhjä valinta jättää joukkuekentät ennalleen). */
  if (!tila._rekPelaajaId && !document.getElementById('rek_joukkue')?.value) { naytaModalVirhe('rekisteriVirhe', tmHT('Valitse joukkue.')); return; }

  /* Suostumuksen uusiminen näkyväksi (2.10.2026): olemassa olevalla pelaajalla on jo annettu suostumus →
     vahvistus ennen lähetystä. Linkkiin päivämäärä (suostumusAnnettu=YYYY-MM-DD), jotta suostumussivu kertoo
     huoltajalle, että lomakkeella uusitaan suostumus. vahvistaSuostumus hyväksyy uusinnan avoimella kutsulla (kutsuId). */
  let _uusintaParam = null;
  const _uusP = tila._rekPelaajaId ? (window._pelaajatKaikki || []).find((x) => x.id === tila._rekPelaajaId) : null;
  if (_uusP && _suostumusAnnettu(_uusP)) {
    const _pvm = _suostumusPvm(_uusP);
    const _pvmTeksti = _pvm ? _pvm.getDate() + '.' + (_pvm.getMonth() + 1) + '.' + _pvm.getFullYear() : '';
    if (!confirm(_tk('seura.uusinta_vahvistus', 'Suostumus on jo annettu {pvm}. Lähetetäänkö huoltajalle suostumuksen uusimispyyntö?',
      { pvm: _pvmTeksti }).replace(/ \./, '.'))) return;
    _uusintaParam = _pvm ? _pvm.getFullYear() + '-' + String(_pvm.getMonth() + 1).padStart(2, '0') + '-' + String(_pvm.getDate()).padStart(2, '0') : 'annettu';
  }

  // Rakennetaan linkki jos sitä ei vielä ole
  if (!tila._rekLinkki) {
    luoRekisteriLinkki();
    await new Promise(r => setTimeout(r, 150));
  }

  // Jos linkki yhä puuttuu, rakennetaan se suoraan
  if (!tila._rekLinkki) {
    const baseUrl = _rekBaseUrl();
    const params  = new URLSearchParams({
      seuraId: tila.seuraId, seura: tila.seuraNimi || tila.seuraId,
      etunimi: _etu, sukunimi: _suku, joukkue: _joukkue,   // ei hEmailia linkkiin
    });
    tila._rekLinkki = baseUrl + '?' + params.toString();
    tila._rekHEmail = hEmail;
  }

  const nappi = document.getElementById('lahetaSpostNappi');
  nappi.disabled    = true;
  nappi.textContent = 'Tallennetaan...';

  const etunimi  = TM_SEURA_TUONTI.tmSeuraNimi(document.getElementById('rek_etunimi')?.value);
  const sukunimi = TM_SEURA_TUONTI.tmSeuraNimi(document.getElementById('rek_sukunimi')?.value);
  const joukkueId  = document.getElementById('rek_joukkue')?.value || '';
  const joukkueObj2 = tila.joukkueet.find(j => j.id === joukkueId);
  const _vanhaP     = tila._rekPelaajaId ? (window._pelaajatKaikki || []).find(x => x.id === tila._rekPelaajaId) : null;
  /* Tyhjä valinta ei saa koskaan korvata olemassa olevaa: linkin/kutsun joukkue = pelaajan nykyinen, jäsenyyttä ei kirjoiteta (_upd). */
  const joukkue     = joukkueObj2?.nimi || joukkueId || (_vanhaP ? (_vanhaP.joukkueNimi || _vanhaP.joukkue || '') : '');
  // §18-jäsenyys yhdestä paikasta (sama rakentaja kuin Excel-tuonnissa); tyhjä valinta → null
  const _jasenyys   = joukkueId ? tmJoukkueJasenyysIdlla(joukkueId, joukkue) : null;

  try {
    /* VAIHE 1 — kenelle kutsu kohdistuu (sisarusbugi 30.9.2026):
       · "Lähetä uudelleen" (pelaajakortti) → tila._rekPelaajaId = KORTIN pelaaja (asetetaan vain siellä).
       · Muuten syntyy AINA uusi pelaaja. Aiempi haku PELKÄLLÄ huoltajan sähköpostilla löysi sisaruksen →
         toisen lapsen kutsu ja suostumus tallentuivat ensimmäiselle, eikä toista lasta luotu.
       · Duplikaattivaroitus vain samalla nimellä (ja syntymävuodella, jos se on tiedossa), ei sähköpostilla. */
    let pelaajaId = tila._rekPelaajaId || null;

    if (etunimi || sukunimi) {
      if (!pelaajaId) {
        const dup = _rekDuplikaatti(etunimi, sukunimi, null);
        if (dup) {
          const luoSilti = confirm((tmHT('Tämä pelaaja näyttää olevan jo rekisterissä:') + ' ') + ((dup.etunimi || '') + ' ' + (dup.sukunimi || '')).trim()
            + (dup.syntymaVuosi ? ' (s. ' + dup.syntymaVuosi + ')' : '') + (dup.joukkue ? ', ' + dup.joukkue : '') + '.\n\n'
            + 'OK = Luo silti uusi pelaaja\nPeruuta = Avaa olemassa oleva');
          if (!luoSilti) {
            nappi.disabled = false; nappi.textContent = tmHT('Lähetä sähköpostilla');
            document.getElementById('rekisteriModal').classList.remove('auki');
            naytaPelaajaTiedot(dup.id);
            return;
          }
        }
      }

      // Luodaan uusi dokumentti vain jos pelaajaa ei löydy
      if (!pelaajaId) {
        // PR 4: PIN asetetaan VAIN palvelimella (asetaPelaajanPin) pelaajan luonnin jälkeen — Rules v3.30
        // hylkää pin-kentän selaimesta. Tyhjä kenttä → palvelin luo 6-numeroisen PIN:n.
        const syotettyPin = document.getElementById('rek_pin')?.value?.trim() || '';

        const palloIdArvo   = (document.getElementById('rek_palloId')?.value?.trim()    || null);   // #60: poistettu skooppaamaton 'palloId' (ReferenceError-riski tyhjällä kentällä — kenttäarvo jo luettu yllä)
        const sporttiIdArvo = (document.getElementById('rek_sporttiId')?.value?.trim()  || null);

        const pelaajaRef = db.collection('seurat').doc(tila.seuraId)
          .collection('pelaajat').doc();
        pelaajaId = pelaajaRef.id;
        await pelaajaRef.set(Object.assign(_tmPelaajanKieli(tila.seuraKieli), {
          etunimi:       etunimi || '',
          sukunimi:      sukunimi || '',
          /* §18: joukkueet[] = team-doc ID:t, EI nimiä. Tässä kirjoitettiin aiemmin NIMI id:n
             paikalle, jolloin seurahallinnan suodatin ja pelaajamäärät eivät löytäneet pelaajaa. */
          joukkue:        _jasenyys.joukkue,   // uudelle pelaajalle joukkue on pakollinen (tarkistus ennen lähetystä)
          joukkueNimi:    _jasenyys.joukkueNimi,
          joukkueet:      _jasenyys.joukkueet,
          joukkueetNimet: _jasenyys.joukkueetNimet,
          seuraId:       tila.seuraId,
          huoltajaEmail: tila._rekHEmail ? tila._rekHEmail.toLowerCase() : null,
          pelaajaId:     pelaajaId,
          suostumusTila: 'odottaa',
          // ── Kirjautumistunnisteet ──────────────────────────────────────
          palloID:       palloIdArvo, // Palloliiton tunniste (null jos ei annettu)
          sporttiID:     sporttiIdArvo, // Universaali urheilija-ID (null toistaiseksi)
          // ──────────────────────────────────────────────────────────────
          tuotu:         firebase.firestore.FieldValue.serverTimestamp(),
          /* Tietoturva (vaihe 1): tuojan sähköpostia EI tallenneta pelaajadokumenttiin (pelaaja/huoltaja lukee). Tuojan uid → sisainen/tiedot (PR 1e-1, _tmKirjaaTuoja). */
        }));
        await _tmKirjaaTuoja(tila.seuraId, pelaajaId);

        /* Suostumus ennen PIN:iä (1.10.2026): uusi pelaaja on tilassa 'odottaa' → PIN:iä EI luoda nyt.
           Palvelin luo sen automaattisesti, kun huoltaja antaa suostumuksen (vahvistaSuostumus). */
        naytaToast(tmHT('✅ Pelaaja luotu. PIN luodaan automaattisesti, kun huoltaja antaa suostumuksen')
          + (syotettyPin ? (' ' + tmHT('(syötettyä PIN:iä ei käytetty).')) : '.'), 'ok');
        console.log(`[TM] Pelaaja ${etunimi} ${sukunimi} luotu, PalloID: ${palloIdArvo}`);
      } else {
        // Päivitetään olemassa oleva dokumentti — §33: EI saa alentaa jo annettua suostumusta (suostumusTila ei tässä).
        /* Nimen päivitys yksin jätti vanhan joukkueet[]-id:n voimaan → pelaaja näkyi yhä
           väärän joukkueen alla. Kirjoitetaan koko jäsenyys (KORVAA, ei lisää). */
        const _upd = { muokattu: firebase.firestore.FieldValue.serverTimestamp(),
          ...(_jasenyys ? { joukkue: _jasenyys.joukkue, joukkueNimi: _jasenyys.joukkueNimi, joukkueet: _jasenyys.joukkueet, joukkueetNimet: _jasenyys.joukkueetNimet } : {}) };   // vain valittu joukkue; tyhjä valinta jättää ennalleen
        // suostumusTila → 'odottaa' asettuu palvelimella (lahetaRekisteriKutsu, Rules v3.33); annettua ei alenneta.
        await db.collection('seurat').doc(tila.seuraId)
          .collection('pelaajat').doc(pelaajaId)
          .update(_upd).catch(() => {});
      }
      // Päivitetään kutsulinkkiin pelaajaId
      const baseUrl = _rekBaseUrl();
      const params = new URLSearchParams({
        seuraId:   tila.seuraId,
        pelaajaId: pelaajaId,
        seura:     tila.seuraNimi || tila.seuraId,
        etunimi, sukunimi, joukkue,   // ei hEmailia linkkiin
      });
      if (_uusintaParam) params.set('suostumusAnnettu', _uusintaParam);   // suostumussivun selite (uusinta)
      tila._rekLinkki = baseUrl + '?' + params.toString();
      // Päivitetään myös UI:hin näkyvä linkki
      const linkkiEl = document.getElementById('linkkiTekstiEl');
      if (linkkiEl) linkkiEl.textContent = tila._rekLinkki;
    }

    // VAIHE 2: Tallennetaan kutsu Firestoreen — ID luodaan etukäteen
    // jotta kutsuId voidaan lisätä rekisteröintilinkkiin.
    // vahvistaSuostumus hyväksyy kutsun palvelimella (Rules v3.33) tällä ID:llä.
    const kutsuRef = db.collection('seurat').doc(tila.seuraId)
      .collection('kutsut').doc();
    const kutsuId = kutsuRef.id;
    // Lisätään kutsuId rekisteröintilinkkiin
    if (tila._rekLinkki && !tila._rekLinkki.includes('kutsuId=')) {
      const sep = tila._rekLinkki.includes('?') ? '&' : '?';
      tila._rekLinkki = tila._rekLinkki + sep + 'kutsuId=' + kutsuId;
      const linkkiEl = document.getElementById('linkkiTekstiEl');
      if (linkkiEl) linkkiEl.textContent = tila._rekLinkki;
    }
    await kutsuRef.set({
      tyyppi:      'yksittainen_kutsu',
      hEmail:      tila._rekHEmail,
      pelaajaNimi: (etunimi + ' ' + sukunimi).trim(),
      pelaajaId:   pelaajaId,
      joukkue,
      linkki:      tila._rekLinkki,
      luotu:       firebase.firestore.FieldValue.serverTimestamp(),
      tila:        'odottaa',   // → 'lahetetty' kun sähköposti lähti, 'epaonnistui' (+ virhe) jos ei (kuten Excel- ja massakutsu)
      lahettaja:   tila.kayttaja?.uid || 'tuntematon',
    });

    // VAIHE 2: Lähetetään sähköposti lahetaRekisteriKutsu Cloud Functionilla
    // Käytetään yksittäisen kutsun muuttujia (ei Excel-tuonnin p-objektia)
    try {
      const lahetaFn = functions.httpsCallable('lahetaRekisteriKutsu');
      await lahetaFn({
        seuraId:  tila.seuraId,
        pelaajaId: pelaajaId || null,   // sisarusbugi: audit-riville kutsun pelaaja
        hEmail:   tila._rekHEmail,
        linkki:   tila._rekLinkki,
        seura:    tila.seuraNimi || tila.seuraId,
        etunimi:  etunimi,
        sukunimi: sukunimi,
        joukkue:  joukkue,
      });
      await kutsuRef.update({ tila: 'lahetetty', lahetetty: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {});
      nappi.textContent = tmHT('✓ Lähetetty');
      nappi.style.background = 'var(--teal)';
      nappi.style.color = '#000';
      nappi.style.opacity = '1';
      naytaToast((tmHT('✅ Rekisteröintikutsu lähetetty osoitteeseen') + ' ') + tila._rekHEmail, 'ok');
    } catch(fnErr) {
      console.warn('[Kutsu] Sähköposti epäonnistui:', fnErr.message);
      await kutsuRef.update({ tila: 'epaonnistui', virhe: String(fnErr.message || fnErr).slice(0, 300) }).catch(() => {});
      naytaToast(_laskutusEsto(fnErr) || ((tmHT('⚠️ Tallennettu mutta sähköposti ei lähtenyt:') + ' ') + fnErr.message), 'virhe');
      nappi.textContent = tmHT('Tallennettu ✓');
      naytaToast(`Kutsu tallennettu: ${tila._rekHEmail}`, 'ok');
    }

    // Näytetään linkki kopioitavaksi — huoltaja voi saada sen myös manuaalisesti
    const linkkiBoksi = document.getElementById('linkkiBoksi');
    if (linkkiBoksi) linkkiBoksi.classList.add('nakyvilla');

    // HUOM: Automaattinen sähköpostilähetys aktivoituu kun
    // Firebase Email Extension asennetaan Firebase Consolesta.
    // Siihen asti lähetä linkki manuaalisesti tai WhatsAppilla.

  } catch (virhe) {
    nappi.disabled    = false;
    nappi.textContent = tmHT('Lähetä sähköpostilla');
    naytaToast((tmHT('Tallennus epäonnistui:') + ' ') + virhe.message, 'virhe');
    console.error('[Kutsu] Virhe:', virhe);
  }
}

function kopioriLinkki() {
  if (!tila._rekLinkki) return;
  navigator.clipboard.writeText(tila._rekLinkki)
    .then(() => naytaToast(tmHT('Linkki kopioitu leikepöydälle!'), 'ok'))
    .catch(() => naytaToast(tmHT('Kopioi linkki manuaalisesti'), 'virhe'));
}

function avaaLinkki() {
  if (tila._rekLinkki) window.open(tila._rekLinkki, '_blank');
}

function lahetaWhatsApp() {
  if (!tila._rekLinkki) return;
  const viesti = `Hei! Tässä on rekisteröintilinkki TalentMaster-järjestelmään. Ole hyvä ja täytä pelaajan tiedot: ${tila._rekLinkki}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(viesti)}`, '_blank');
}

// ─────────────────────────────────────────────────────────────────
// HENKILÖSTÖN TOIMINNOT
// ─────────────────────────────────────────────────────────────────
function avaaKayttajaModal() {
  // Avataan kutsumodal suoraan — ei enää ohjata Admin-näkymään
  const modal = document.getElementById('kutsuModal');
  if (!modal) return;

  // Nollataan kentät
  ['kutsu_etunimi','kutsu_sukunimi','kutsu_email','kutsu_puhelin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const suunta = document.getElementById('kutsu_suuntakoodi');
  if (suunta) suunta.value = '+358';
  const rooli = document.getElementById('kutsu_rooli');
  if (rooli) rooli.value = '';
  const virhe = document.getElementById('kutsuVirhe');
  if (virhe) virhe.textContent = '';
  const nappi = document.getElementById('kutsuNappi');
  if (nappi) { nappi.disabled = false; nappi.textContent = 'Luo käyttäjätunnus'; }

  // Näytä lomake, piilota edellinen tuloskortti
  const lomakeEl = document.getElementById('kutsuLomake');
  const tulosEl  = document.getElementById('kutsuTulos');
  if (lomakeEl) lomakeEl.style.display = '';
  if (tulosEl)  tulosEl.style.display  = 'none';

  // Näytä VP-rooli vain super adminille
  const isSA = tila.rooli === 'superadmin' || tila.rooli === 'super_admin';
  document.querySelectorAll('#kutsu_rooli .rooli-vp-only').forEach(opt => {
    opt.style.display = isSA ? '' : 'none';
  });

  // Hae joukkueet Firestoresta
  lataaKutsuJoukkueet();

  // Avaa modal
  modal.classList.add('auki');
}

async function lataaKutsuJoukkueet() {
  const lista = document.getElementById('kutsuJoukkueetLista');
  if (!lista) return;
  lista.innerHTML = '<div style="font-size:12px;color:var(--ink3);">' + tmHT('Ladataan...') + '</div>';
  try {
    const snap = await db.collection('seurat').doc(tila.seuraId)
      .collection('joukkueet').orderBy('nimi').get();
    if (snap.empty) {
      lista.innerHTML = '<div style="font-size:12px;color:var(--ink3);">' + tmHT('Ei joukkueita — lisää ensin joukkueet.') + '</div>';
      return;
    }
    lista.innerHTML = snap.docs.map(d => {
      const j = d.data();
      return `
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;
          padding:7px 8px;border-radius:7px;transition:background .15s;"
          onmouseover="this.style.background='rgba(255,255,255,.04)'"
          onmouseout="this.style.background='transparent'">
          <input type="checkbox" value="${d.id}"
            data-nimi="${(j.nimi||d.id).replace(/"/g,'&quot;')}"
            style="width:16px;height:16px;accent-color:var(--orange);cursor:pointer;">
          <span style="font-size:13px;">${j.nimi||d.id}</span>
          <span style="font-size:11px;color:var(--ink3);margin-left:auto;">${j.ikaluokka||''}</span>
        </label>`;
    }).join('');
  } catch(e) {
    lista.innerHTML = `<div style="font-size:12px;color:var(--red);">${tmHT('Virhe:')} ${e.message}</div>`;
  }
}


// ─────────────────────────────────────────────────────────────────
// VALMENTAJAKUTSU — tallennaKutsu()
// 1. Validoi lomake
// 2. Kutsuu luoKayttaja Cloud Functionia (Firebase Functions)
// 3. Tallentaa käyttäjätiedot Firestoreen kayttajat-kokoelmaan
// 4. Lähettää salasananvaihtolinkin sähköpostiin
// ─────────────────────────────────────────────────────────────────
async function tallennaKutsu() {
  const etunimi  = (document.getElementById('kutsu_etunimi')?.value || '').trim();
  const sukunimi = (document.getElementById('kutsu_sukunimi')?.value || '').trim();
  const email    = (document.getElementById('kutsu_email')?.value || '').trim().toLowerCase();
  const rooli    = document.getElementById('kutsu_rooli')?.value || '';
  const virheEl  = document.getElementById('kutsuVirhe');
  const nappi    = document.getElementById('kutsuNappi');

  // Validointi
  const naytaVirhe = (t) => { if (virheEl) virheEl.textContent = t; };
  naytaVirhe('');

  if (!etunimi) return naytaVirhe(tmHT('Kirjoita etunimi.'));
  if (!sukunimi) return naytaVirhe(tmHT('Kirjoita sukunimi.'));
  if (!email || !email.includes('@')) return naytaVirhe(tmHT('Kirjoita kelvollinen sähköpostiosoite.'));
  if (!rooli) return naytaVirhe(tmHT('Valitse rooli.'));

  // Kerää valitut joukkueet
  const joukkueetCheckboxes = document.querySelectorAll('#kutsuJoukkueetLista input[type=checkbox]:checked');
  const joukkueet = Array.from(joukkueetCheckboxes).map(cb => ({
    id:   cb.value,
    nimi: cb.dataset.nimi || cb.value
  }));

  // UI — lataus
  if (nappi) { nappi.disabled = true; nappi.textContent = tmHT('Lähetetään...'); }

  try {
    // ── Kutsutaan luoKayttaja Cloud Functionia ──────────────────
    // Funktio luo Firebase Auth -tilin, asettaa custom claims
    // ja palauttaa uuden käyttäjän UID:n
    const luoFn = firebase.app().functions('europe-west1').httpsCallable('luoKayttaja');
    // Palvelin luo kayttajat-dokumentin kaikkine kenttineen (selaimen create estetty, Rules v3.32).
    const tulos = await luoFn({
      email,
      etunimi,
      sukunimi,
      rooli,
      seuraId:      tila.seuraId,
      joukkueet:    joukkueet.map(j => j.id),
      joukkueetNimet: joukkueet.map(j => j.nimi),
      suuntakoodi:  document.getElementById('kutsu_suuntakoodi')?.value || '+358',
      puhelin:      (document.getElementById('kutsu_puhelin')?.value || '').replace(/[^\d]/g, ''),
    });

    const uid = tulos.data?.uid;
    if (!uid) throw new Error(tmHT('Cloud Function ei palauttanut UID:ta'));

    // ── Onnistui — näytetään tuloskortti linkin jakamiseen ────────
    // Linkki tulee luoKayttaja-funktiosta AINA (myös jos sähköposti epäonnistui),
    // joten käyttäjä saadaan kirjautumaan vaikka SendGrid olisi loppu.
    const data   = tulos.data || {};
    const linkki = data.passwordResetLink || data.resetLinkki || null;

    // Tallennetaan jakamista varten
    window._kutsuLinkki  = linkki;
    window._kutsuEmail   = email;
    window._kutsuEtunimi = etunimi;

    // Rakennetaan kansainvälinen puhelinnumero WhatsApp-jakoa varten
    const suuntakoodi  = document.getElementById('kutsu_suuntakoodi')?.value || '+358';
    const puhelinRaaka = (document.getElementById('kutsu_puhelin')?.value || '').replace(/\D/g, '');
    const maaKoodi     = suuntakoodi.replace('+', '');
    window._kutsuPuhelin = puhelinRaaka ? (maaKoodi + puhelinRaaka.replace(/^0+/, '')) : null;

    // Täytetään tuloskortti
    document.getElementById('kutsuTulosNimi').textContent   = etunimi + ' ' + sukunimi;
    document.getElementById('kutsuTulosRooli').textContent  = rooli;
    document.getElementById('kutsuTulosEmail').textContent  = email;
    document.getElementById('kutsuTulosLinkki').textContent = linkki || tmHT('(linkkiä ei saatu — yritä uudelleen)');

    // WhatsApp-nappi on AINA käytettävissä (kuten Rekisteröintikutsussa):
    // puhelin annettu → suora chat; ei puhelinta → yleinen jako (wa.me/?text=)
    const waBtn = document.getElementById('kutsuWhatsappBtn');
    if (waBtn) waBtn.style.display = '';

    // Sähköpostin tila
    const statusEl = document.getElementById('kutsuEmailStatus');
    if (data.emailSent) {
      statusEl.textContent = (tmHT('📧 Sähköposti lähetetty onnistuneesti osoitteeseen') + ' ') + email;
      statusEl.style.color = 'var(--teal)';
    } else {
      statusEl.textContent = tmHT('⚠️ Sähköposti ei lähtenyt — jaa linkki manuaalisesti yllä olevilla napeilla.');
      statusEl.style.color = 'var(--amber)';
    }

    // Vaihda lomake → tuloskortti
    document.getElementById('kutsuLomake').style.display = 'none';
    document.getElementById('kutsuTulos').style.display  = 'block';

    // #70: selkeä "Kutsu lähetetty ✅" -vahvistus (pvm/klo) — heijastaa lähtikö sähköposti (data.emailSent).
    const _kutsuKlo = new Date().toLocaleString('fi-FI', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
    naytaToast(data.emailSent
      ? '✅ Kutsu lähetetty — ' + etunimi + ' ' + sukunimi + ' · ' + _kutsuKlo
      : '✔ ' + etunimi + ' ' + sukunimi + ' lisätty · jaa linkki manuaalisesti', 'ok');

    // Päivitä henkilöstölista taustalla
    renderHenkilosto(document.getElementById('nakymaAlue'));

  } catch(e) {
    console.error('Kutsu epäonnistui:', e);
    const virheViesti = (e.details?.syy === 'sa_tunnus' || e.message === 'sa_tunnus')
      ? tmHT('Tämä on TalentMasterin ylläpitäjän tunnus — sitä ei lisätä seuran henkilöstöön.')
      : (e.details?.syy === 'toisen_seuran_kayttaja' || e.details?.syy === 'paikkamerkki_osoite')
      ? e.details.viesti
      : e.code === 'already-exists' || e.message?.includes('already exists')
      ? tmHT('Sähköpostiosoite on jo käytössä.')
      : (e.code === 'permission-denied' || e.message?.includes('permission'))
      ? tmHT('Ei oikeuksia — tarkista että olet kirjautunut VP:nä tai sihteerinä.')
      : `Virhe: ${e.message}`;
    naytaVirhe(virheViesti);
    // Toast — varmistaa että virhe näkyy vaikka #kutsuVirhe olisi näkymän ulkopuolella (ei hiljaista failia, #71).
    naytaToast((tmHT('Kutsu epäonnistui:') + ' ') + virheViesti, 'virhe');
    if (nappi) { nappi.disabled = false; nappi.textContent = 'Luo käyttäjätunnus'; }
  }
}

// ─────────────────────────────────────────────────────────────────
// KÄYTTÄJÄKUTSU — linkin jako (sähköposti / WhatsApp / kopioi)
// Ei riippuvuutta SendGridistä: linkki on jo muistissa window._kutsuLinkki.
// ─────────────────────────────────────────────────────────────────
window._kutsuJaaSahkoposti = function() {
  if (!window._kutsuLinkki) return;
  const subject = encodeURIComponent('TalentMaster™ — aseta salasanasi');
  const body = encodeURIComponent(
    'Hei ' + (window._kutsuEtunimi || '') + '!\n\n' +
    'Tervetuloa TalentMaster-järjestelmään. Aseta salasanasi tästä linkistä:\n' +
    window._kutsuLinkki
  );
  window.open('mailto:' + (window._kutsuEmail || '') + '?subject=' + subject + '&body=' + body, '_blank');
};

window._kutsuJaaWhatsapp = function() {
  if (!window._kutsuLinkki) return;
  const teksti = encodeURIComponent(
    'Hei ' + (window._kutsuEtunimi || '') + '! Tervetuloa TalentMaster-järjestelmään. ' +
    'Aseta salasanasi tästä linkistä: ' + window._kutsuLinkki
  );
  // Puhelin annettu → suora chat; muuten yleinen WhatsApp-jako (valitse vastaanottaja)
  const url = window._kutsuPuhelin
    ? 'https://wa.me/' + window._kutsuPuhelin + '?text=' + teksti
    : 'https://wa.me/?text=' + teksti;
  window.open(url, '_blank');
};

window._kutsuKopioi = function() {
  if (!window._kutsuLinkki) return;
  navigator.clipboard.writeText(window._kutsuLinkki)
    .then(() => naytaToast(tmHT('📋 Linkki kopioitu!'), 'ok'))
    .catch(() => naytaToast(tmHT('Kopiointi epäonnistui — kopioi linkki manuaalisesti.'), 'virhe'));
};

window._kutsuUusi = function() {
  // Palataan tyhjään lomakkeeseen toista käyttäjää varten
  avaaKayttajaModal();
};
