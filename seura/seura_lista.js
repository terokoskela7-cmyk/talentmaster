/* Seuran lista_seura -näkymän apurit (PR 2/3; siirretty pois Seura.html-kuoresta kasvukaton takia). Globaalit (db, tila, naytaToast, tmHT, henkiloNimi …) tulevat kuoresta. */
/* ═══ lista_seura (27.11.2026) — Seuran pelaajalista palvelimen koosteesta ═══════════════════════════════════
   Lippu seurat/{sid}/liput/julkiset.lista_seura (SA asettaa). Päällä → lista_seura (_meta + sivut): 1 000 pelaajaa = 5 lukua. Pois / virhe / vanhaversioinen → vanha pelaajaluku (kaikki tai ei mitään).
   Rivillä EI ole PIN:iä, huoltajan sähköpostia eikä terveystietoa (vain _onPin/_onHuoltaja-merkit). Toiminnot, jotka tarvitsevat arvon (kortit, tunnusten lähetys, PIN:n vaihto, Linkki),
   lukevat pelaajadokumentin vasta tekohetkellä (_taydennaKohde / lahetaPelaajaLinkkiRivilta; Q4). Poistetut/arkistoidut/deaktivoidut eivät ole listalla → "Arkistoidut"-näkymä hakee ne erikseen pyydettäessä. */
const _listaLippuValimuisti = {};
function _seuraListaLippuTiedossa() { return _listaLippuValimuisti[tila.seuraId]; }   // true | false | undefined (ei vielä luettu)
async function _seuraListaLippu() {
  const sid = tila.seuraId; if (!sid) return false; if (sid in _listaLippuValimuisti) return _listaLippuValimuisti[sid];
  let arvo = false;
  try {
    const j = await db.collection('seurat').doc(sid).collection('liput').doc('julkiset').get();
    arvo = !!window.TM_LIPUT && window.TM_LIPUT.tmLippuTila('lista_seura', j.exists ? j.data() : null, tila.seura || null).arvo === true;
  } catch (e) { console.warn('[Seura] lista_seura-lippua ei voitu lukea → vanha polku:', e && (e.code || e.message)); arvo = false; }
  _listaLippuValimuisti[sid] = arvo; return arvo;
}
async function _lataaSeuranLista() {
  const sid = tila.seuraId; window._seuraListaTila = { lahde: 'vanha', laskettuMs: null, laskurit: null };   if (await _seuraListaLippu() && window.TM_LISTA_LATAUS) {
    const r = await window.TM_LISTA_LATAUS.tmListaSeuraLataa(db, sid);
    if (sid !== tila.seuraId) return { pelaajat: [] };   // seura vaihtui kesken latauksen (SA)
    if (r.ok) { window._seuraListaTila = { lahde: 'lista', laskettuMs: r.laskettuMs, laskurit: r.laskurit }; return { pelaajat: r.pelaajat }; }
    console.warn('[Seura] lista_seura ei käyttökelpoinen (' + r.syy + ') → vanha polku');
  }
  const snap = await tmLuePelaajatSnap(db, sid);
  return { pelaajat: snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.sukunimi || '').localeCompare(b.sukunimi || '')) };
}
function _paivitaListaTilaRivi() {
  const el = document.getElementById('listaTilaRivi'); if (!el) return;
  const t = window._seuraListaTila || {}; if (t.lahde !== 'lista') { el.innerHTML = ''; return; }
  const aika = window.TM_LISTA_LATAUS.tmListaPaivitettyTeksti(t.laskettuMs);
  el.innerHTML = (aika ? '<span>' + tmHT('päivitetty') + ' ' + aika + '</span>' : '')
    + '<button class="toimNappi" id="listaPaivitaNappi" onclick="paivitaSeuranLista()">' + tmHT('Päivitä nyt') + '</button>'
    + '<button class="toimNappi" onclick="avaaArkistoidut()">' + tmHT('Arkistoidut') + '</button>';
}
/* "Päivitä nyt": palvelin rakentaa koosteen heti (ei jäähyä, kun muutoksia odottaa). tuonninJalkeen: Excel-tuonnin viimeiset kirjoitukset voivat vielä olla matkalla → kokeillaan uudelleen (≤ 3 ×). */
async function paivitaSeuranLista(opts) {
  const nappi = document.getElementById('listaPaivitaNappi'); if (nappi) { nappi.disabled = true; nappi.textContent = '…'; }
  const fn = firebase.app().functions('europe-west1').httpsCallable('paivitaListaSeura', { timeout: 120000 });
  try {
    let r = null;
    for (let i = 0; i < ((opts && opts.tuonninJalkeen) ? 3 : 1); i++) {
      r = (await fn({ seuraId: tila.seuraId })).data || {};
      if (!r.tuore) break;
      if (i < 2 && opts && opts.tuonninJalkeen) await new Promise((res) => setTimeout(res, 4000));
    }
    if (r && r.tuore && !(opts && opts.tuonninJalkeen)) naytaToast(tmHT('Lista on jo ajan tasalla.'), 'info');
  } catch (e) {
    naytaToast(tmHT('Listan päivitys epäonnistui:') + ' ' + ((e && e.message) || e), 'virhe');
    if (nappi) { nappi.disabled = false; nappi.textContent = tmHT('Päivitä nyt'); } return;
  }
  const alue = document.getElementById('nakymaAlue'); if (alue && tila.aktiivNakyma === 'pelaajat') await renderPelaajat(alue); else _paivitaListaTilaRivi();
}
/* Excel-tuonnin jälkeen: vihje + yksi painallus (lista päivittyy muuten ~1 min kuluessa). Vain kun lista luetaan koosteesta. */
function ehdotaListanPaivitysta() {
  if ((window._seuraListaTila || {}).lahde !== 'lista') return;
  document.getElementById('listaPaivitaVihje')?.remove();
  const d = document.createElement('div'); d.id = 'listaPaivitaVihje';
  d.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;background:var(--bg2,#1c1c1a);border:1px solid var(--border);border-radius:10px;padding:12px 16px;display:flex;gap:12px;align-items:center;font-size:13px;box-shadow:0 6px 24px rgba(0,0,0,.35);max-width:92vw;';
  d.innerHTML = '<span>' + tmHT('Pelaajalista päivittyy noin minuutissa.') + '</span><button class="toimNappi" id="listaVihjeNappi">' + tmHT('Päivitä nyt') + '</button><button class="toimNappi" id="listaVihjeSulje" aria-label="' + tmHT('Sulje') + '">✕</button>';
  document.body.appendChild(d);
  document.getElementById('listaVihjeSulje').onclick = () => d.remove();
  document.getElementById('listaVihjeNappi').onclick = () => { d.remove(); paivitaSeuranLista({ tuonninJalkeen: true }); };
}
/* Tekohetken täydennys: lista-rivit → täydet pelaajadokumentit (pin, huoltajaEmail, syntymaaika …) vain valituille. Q4: PIN-lista/kortit lukevat dokumentit tulostushetkellä, kuten ennenkin. */
async function _taydennaKohde(k) {
  if (!k.lista.some((p) => p._listaRivi)) return k;
  const idt = {}; k.lista.forEach((p) => { idt[p.id] = 1; });
  tmPelaajatEsiTyhjenna();
  const snap = await db.collection('seurat').doc(tila.seuraId).collection('pelaajat').get();
  const tayd = {}; snap.docs.forEach((d) => { if (idt[d.id]) tayd[d.id] = { id: d.id, ...d.data() }; });
  k.lista = k.lista.map((p) => tayd[p.id]).filter(Boolean);   // dokumentti poistunut välissä → pois
  return k;
}
async function lahetaPelaajaLinkkiRivilta(pid) {
  const snap = await db.collection('seurat').doc(tila.seuraId).collection('pelaajat').doc(pid).get();
  if (!snap.exists) { naytaToast(tmHT('Pelaajan tietoja ei löydy.'), 'virhe'); return; }
  const p = snap.data();
  return lahetaPelaajaLinkki(pid, tila.seuraId, p.etunimi || '', p.sukunimi || '', p.huoltajaEmail || '', p.joukkue || '');
}
/* Arkistoidut: poistetut / arkistoidut / deaktivoidut pelaajat eivät ole listalla → rajattu haku PYYDETTÄESSÄ (3 yksikenttäkyselyä, ≤ 100 kpl kukin; ei koko seuraa). Palautus nollaa vain asetetut liput. */
const ARKISTO_RAJA = 100;
async function _haeArkistoidut() {
  const col = db.collection('seurat').doc(tila.seuraId).collection('pelaajat');
  const kyselyt = [['poistettu', col.where('poistettu', '==', true)], ['arkistoitu', col.where('arkistoitu', '==', true)], ['aktiivinen', col.where('aktiivinen', '==', false)]];
  const tulos = await Promise.all(kyselyt.map(([syy, q]) => q.limit(ARKISTO_RAJA).get().then((sn) => ({ syy, docs: sn.docs, täynnä: sn.size >= ARKISTO_RAJA }))));
  const mapa = {}; let rajaTaynna = false;
  tulos.forEach((t) => { if (t.täynnä) rajaTaynna = true; t.docs.forEach((d) => { (mapa[d.id] = mapa[d.id] || { id: d.id, data: d.data(), syyt: [] }).syyt.push(t.syy); }); });
  return { rivit: Object.values(mapa).sort((a, b) => String(a.data.sukunimi || '').localeCompare(String(b.data.sukunimi || ''), 'fi')), rajaTaynna };
}
/* Palautussääntö (PM 27.11.2026): arkistoitu / aktiivinen===false → palautus johdolle. poistettu===true → VAIN SA, eikä lainkaan jos suostumus on peruttu (tmSuostumusPeruttu: poisto voi olla suostumuksen perumisen / oikeuden tulla unohdetuksi seuraus).
   Huom: poistaPelaajaGDPR poistaa dokumentin kokonaan (ei jää poistettu-lippua); poistettu-lipun asettajaa pelaajalle ei löydy koodista → varovaisuus kunnes varmistuu. Palauttaa { sallittu, syy (tmHT-avain) }. */
function _palautusSalli(x, rooli) {
  x = x || {}; if (x.poistettu !== true) return { sallittu: true, syy: '' };
  if (_suostumusPeruttu(x)) return { sallittu: false, syy: 'Suostumus peruttu — poistettua pelaajaa ei palauteta.' };
  if (rooli !== 'superadmin' && rooli !== 'super_admin') return { sallittu: false, syy: 'Poistetun pelaajan palauttaa vain Super Admin.' };
  return { sallittu: true, syy: '' };
}
async function avaaArkistoidut() {
  document.getElementById('arkistoModaali')?.remove();
  const m = document.createElement('div'); m.id = 'arkistoModaali'; m.className = 'modalTausta auki';
  m.innerHTML = '<div class="modalKortti" style="max-width:640px;"><div class="modalOtsikko">' + tmHT('Arkistoidut pelaajat') + '</div><div id="arkistoSisalto" style="padding:12px 0;font-size:13px;color:var(--ink3);">' + tmHT('Ladataan…') + '</div><div style="text-align:right;"><button class="toimNappi" onclick="document.getElementById(\'arkistoModaali\').remove()">' + tmHT('Sulje') + '</button></div></div>';
  document.body.appendChild(m);
  const sis = document.getElementById('arkistoSisalto'); const esc = (v) => (window.tmEsc ? window.tmEsc(v) : String(v == null ? '' : v));
  try {
    const { rivit, rajaTaynna } = await _haeArkistoidut();
    if (!rivit.length) { sis.textContent = tmHT('Ei arkistoituja, poistettuja tai deaktivoituja pelaajia.'); return; }
    const syyTeksti = { poistettu: tmHT('Poistettu'), arkistoitu: tmHT('Arkistoitu'), aktiivinen: tmHT('Ei aktiivinen') };
    sis.innerHTML = (rajaTaynna ? '<div style="color:var(--amber);margin-bottom:8px;">' + tmHT('Näytetään enintään {n} pelaajaa / syy.').replace('{n}', ARKISTO_RAJA) + '</div>' : '')
      + '<table style="width:100%;"><tbody>' + rivit.map((r) => '<tr><td style="font-weight:600;">' + esc(henkiloNimi(r.data)) + '</td><td>' + esc(r.data.joukkue || '—') + '</td><td>' + esc(r.data.syntymaVuosi || '—') + '</td><td style="font-size:11px;">' + r.syyt.map((x) => syyTeksti[x]).join(', ') + '</td>'
        + '<td>' + (() => { const p = _palautusSalli(r.data, tila.rooli); return p.sallittu ? '<button class="toimNappi" data-pid="' + esc(r.id) + '" onclick="palautaArkistoitu(this.dataset.pid)">' + tmHT('Palauta') + '</button>' : '<span style="font-size:11px;color:var(--ink3);">' + tmHT(p.syy) + '</span>'; })() + '</td></tr>').join('') + '</tbody></table>';
  } catch (e) { sis.textContent = tmHT('Lataus epäonnistui:') + ' ' + ((e && (e.code || e.message)) || e); }
}
async function palautaArkistoitu(pid) {
  const ref = db.collection('seurat').doc(tila.seuraId).collection('pelaajat').doc(pid);
  try {
    const d = await ref.get(); if (!d.exists) { naytaToast(tmHT('Pelaajan tietoja ei löydy.'), 'virhe'); return; }
    const x = d.data(), upd = {}; { const p = _palautusSalli(x, tila.rooli); if (!p.sallittu) { naytaToast(tmHT(p.syy), 'varoitus'); return; } }   // sama sääntö kuin napissa (ei vain UI-esto)
    if (x.poistettu === true) upd.poistettu = false; if (x.arkistoitu === true) upd.arkistoitu = false; if (x.aktiivinen === false) upd.aktiivinen = true;
    if (!Object.keys(upd).length) return;
    if (!confirm(tmHT('Palautetaanko pelaaja listalle?') + ' ' + henkiloNimi(x))) return;
    tmPelaajatEsiTyhjenna();
    if (tila.kayttaja) await tila.kayttaja.getIdToken(true);   // §7.2: tuore token ennen kirjoitusta (roolimuutos / vanhentunut istunto)
    await ref.update(Object.assign(upd, { muokattu: firebase.firestore.FieldValue.serverTimestamp() }));
    document.getElementById('arkistoModaali')?.remove();
    naytaToast(tmHT('Pelaaja palautettu.') + ' ' + tmHT('Lista päivittyy noin minuutissa.'), 'ok');
    ehdotaListanPaivitysta();
  } catch (e) { naytaToast(tmHT('Palautus epäonnistui:') + ' ' + ((e && (e.code || e.message)) || e), 'virhe'); }
}
