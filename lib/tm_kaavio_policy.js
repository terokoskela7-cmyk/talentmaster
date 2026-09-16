/* tm_kaavio_policy.js — kaavioiden näkyvyys-, muokkaus- ja hyväksyntäpolitiikka.
   PUHDAS: ei Firestorea, ei DOMia, ei globaalia tilaa → sama funktio ajetaan UI:ssa ja
   PARITEETTITESTISSÄ sääntöjä vasten. Tämä moduuli on UI:n totuus; tm_admin/firestore.rules on
   PALVELIMEN totuus. Ne eivät saa erota — pariteettitesti väittää ne identtisiksi
   (tests/rules/kaavio_policy_pariteetti.emulator.test.js).

   ⚠ YKSI TIETOINEN ERO, joka EI ole bugi (dokumentoitu myös sääntöjen viereen):
   PIN-pelaaja kirjautuu Anonymous Authilla, jolloin tokenissa EI ole pelaaja- eikä seura-
   identiteettiä (rules: onAnonymous() tarkistaa vain sign_in_provider). Siksi palvelin pakottaa
   pelaajalle VAIN status=='hyvaksytty'. Kohdistus (seura/joukkue/pelaaja) on UI-tasoinen suodatus
   — kaavioVoiLukea() toteuttaa sen, mutta SE EI OLE PAKOTETTU. Älä väitä sitä pakotetuksi.
   Kuittaus (ymmarretty) hoidetaan siksi Cloud Functionilla PIN-kontekstista (erä C). */

var TM_KAAVIO_TILAT = ['luonnos', 'odottaa', 'hyvaksytty', 'hylatty'];
var TM_KAAVIO_NAKYVYYDET = ['seura', 'joukkue', 'pelaaja'];

/* Sallitut statussiirrot. Suora luonnos→hyvaksytty on KIELLETTY (katselmus ei saa ohittua). */
var TM_KAAVIO_SIIRROT = {
  luonnos:    ['odottaa'],
  odottaa:    ['hyvaksytty', 'hylatty'],
  hyvaksytty: ['odottaa'],           // uudelleenhyväksyntä muokkauksen jälkeen
  hylatty:    ['odottaa']
};

function _kaavioCtx(ctx) {
  ctx = ctx || {};
  return {
    rooli: ctx.rooli || null,
    uid: ctx.uid || null,
    seuraId: ctx.seuraId || null,
    joukkueet: Array.isArray(ctx.joukkueet) ? ctx.joukkueet : [],
    superAdmin: ctx.superAdmin === true,
    anon: ctx.anon === true
  };
}

/* Hyväksyjä = VP tai urheilutoimenjohtaja tai SA. HUOM: EI onJohtoRooli-vastinetta —
   se sisältäisi seurasihteerin, joka ei ole valmennusrooli eikä saa hyväksyä kaavioita. */
function kaavioOnHyvaksyja(ctx) {
  var c = _kaavioCtx(ctx);
  return c.superAdmin || c.rooli === 'vp' || c.rooli === 'urheilutoimenjohtaja';
}

/* LUONTIPORTTI — peili firestore.rules kaaviot-create-ehdosta:
     onSuperAdmin() || (onOmaSeura(seuraId) && onValmentajaRooli() && status∈[luonnos,odottaa] && versio==0)
   Tässä vain ROOLI/SEURA-osuus; status+versio ovat kirjoittajan vastuulla (luonti kirjoittaa aina
   luonnos/0). HUOM: tämä on TARKOITUKSELLA löysempi kuin kaavioVoiKirjoittaa() — se vaatii lisäksi
   joukkueosuman, jota UUDELLA kaaviolla ei vielä ole. Ilman erillistä porttia seuratason kaavion
   luonti näyttäisi kielletyltä kaikille paitsi johdolle, vaikka säännöt sallivat sen. */
function kaavioVoiLuoda(ctx) {
  var c = _kaavioCtx(ctx);
  if (c.superAdmin) return true;
  if (c.anon || !c.rooli || !c.seuraId) return false;
  return kaavioOnValmentaja(c);
}

function kaavioOnValmentaja(ctx) {
  var c = _kaavioCtx(ctx);
  return ['valmentaja', 'talenttivalmentaja', 'fysiikkavalmentaja', 'vp', 'urheilutoimenjohtaja'].indexOf(c.rooli) >= 0;
}

/* Joukkuerajaus: valmentaja saa kirjoittaa vain oman joukkueensa kaavioihin. Talenttivalmentaja
   ja johto ohittavat rajauksen seuran sisällä (sama kuvio kuin onOmanJoukkueenValmentaja).
   Fail-closed: jos kaaviolla on joukkueId jota valmentajalla ei ole → false. */
function kaavioJoukkueOsuu(doc, ctx) {
  var c = _kaavioCtx(ctx);
  if (c.superAdmin || kaavioOnHyvaksyja(c) || c.rooli === 'talenttivalmentaja') return true;
  var jid = doc && doc.review && doc.review.joukkueId;
  if (!jid) return false;                      // joukkueeton kaavio = seuratason → vain johto
  return c.joukkueet.indexOf(jid) >= 0;
}

/* ── LUKU ─────────────────────────────────────────────────────────────────────────────────
   kanoninen (kaaviot/{avain}): kuka tahansa kirjautunut.
   seurakohtainen: SA · oman seuran johto/valmentaja kaikki tilat · muut vain hyväksytty. */
function kaavioVoiLukea(doc, ctx) {
  var c = _kaavioCtx(ctx);
  if (!doc) return false;
  if (doc.kanoninen) return c.superAdmin || !!c.rooli || c.anon;
  if (c.superAdmin) return true;
  var omaSeura = !!c.seuraId && c.seuraId === doc.seuraId;
  if (omaSeura && (kaavioOnHyvaksyja(c) || kaavioOnValmentaja(c))) return true;
  // pelaaja/anon/muu: vain hyväksytty. Kohdistus on UI-suodatus, EI pakotus (ks. tiedoston ylälaita).
  return !!doc.review && doc.review.status === 'hyvaksytty';
}

/* UI-suodatin pelaajalle: kohdistuuko kaavio hänelle. EI PAKOTETTU palvelimella. */
function kaavioKohdistuu(doc, pelaaja) {
  if (!doc || !doc.review) return false;
  var r = doc.review, p = pelaaja || {};
  if (r.nakyvyys === 'seura') return !doc.seuraId || doc.seuraId === p.seuraId;
  if (r.nakyvyys === 'joukkue') return !!r.joukkueId && (p.joukkueet || []).indexOf(r.joukkueId) >= 0;
  if (r.nakyvyys === 'pelaaja') return (r.pelaajaIds || []).indexOf(p.pelaajaId) >= 0;
  return false;
}

/* ── KIRJOITUS ────────────────────────────────────────────────────────────────────────────
   kanoninen: VAIN SA. seurakohtainen: oman seuran valmentaja (joukkuerajattu) tai johto. */
function kaavioVoiKirjoittaa(doc, ctx) {
  var c = _kaavioCtx(ctx);
  if (!doc) return false;
  if (c.superAdmin) return true;
  if (doc.kanoninen) return false;
  if (c.anon || !c.rooli) return false;
  if (!c.seuraId || c.seuraId !== doc.seuraId) return false;   // seura-skooppi
  if (!kaavioOnValmentaja(c)) return false;
  return kaavioJoukkueOsuu(doc, c);
}

function kaavioSiirtoSallittu(vanha, uusi, ctx) {
  if (vanha === uusi) return true;
  if (TM_KAAVIO_TILAT.indexOf(uusi) < 0) return false;
  var sallitut = TM_KAAVIO_SIIRROT[vanha] || [];
  if (sallitut.indexOf(uusi) < 0) return false;
  // hyväksyntä/hylkäys vain hyväksyjältä
  if (uusi === 'hyvaksytty' || uusi === 'hylatty') return kaavioOnHyvaksyja(ctx);
  return true;
}

/* Uudelleenhyväksyntä: hyväksytyn kaavion SPECIN muokkaus pudottaa sen takaisin odottamaan.
   Poikkeus: muokkaaja on jo hyväksyntävaltuutettu (VP/UTJ/SA) → itse-kierros ei lisää kontrollia. */
function kaavioTilaMuokkauksenJalkeen(doc, ctx) {
  var nyt = (doc && doc.review && doc.review.status) || 'luonnos';
  if (nyt !== 'hyvaksytty') return nyt;
  return kaavioOnHyvaksyja(ctx) ? 'hyvaksytty' : 'odottaa';
}

/* OPTIMISTINEN VERSIOLUKKO (B2). Client lukee versio:n auki avatessaan ja kirjoittaa TÄSMÄLLEEN
   +1. Sääntö (kaavioVersioOk) on todellinen portti; tämä on sen UI-puolinen vastinpari, jotta
   client ei edes yritä laitonta kirjoitusta. Sääntö koskee myös SA:ta — lukko on datan eheyttä. */
function kaavioSeuraavaVersio(doc) {
  var v = (doc && doc.review && doc.review.versio);
  return (typeof v === 'number' ? v : 0) + 1;
}
function kaavioVersioKelpaa(vanhaDoc, uusiVersio) {
  return uusiVersio === kaavioSeuraavaVersio(vanhaDoc);
}

/* UI-toiminnot. Peilaa yllä olevia portteja — ei omaa logiikkaa. */
function kaavioToiminnot(doc, ctx) {
  var c = _kaavioCtx(ctx), A = [];
  if (!doc) return A;
  var st = (doc.review && doc.review.status) || 'luonnos';
  if (kaavioVoiKirjoittaa(doc, c)) {
    A.push('muokkaa');
    if (st === 'luonnos' || st === 'hylatty') A.push('ehdota');
  }
  if (st === 'odottaa' && kaavioOnHyvaksyja(c) && (c.superAdmin || c.seuraId === doc.seuraId)) {
    A.push('hyvaksy'); A.push('hylkaa');
  }
  if (c.anon || c.rooli === 'pelaaja') { if (st === 'hyvaksytty') { A.push('ymmarretty'); A.push('kysy'); } }
  if (c.superAdmin) A.push('poista');
  return A;
}

var TM_KAAVIO_POLICY = {
  TM_KAAVIO_TILAT: TM_KAAVIO_TILAT, TM_KAAVIO_NAKYVYYDET: TM_KAAVIO_NAKYVYYDET, TM_KAAVIO_SIIRROT: TM_KAAVIO_SIIRROT,
  kaavioOnHyvaksyja: kaavioOnHyvaksyja, kaavioOnValmentaja: kaavioOnValmentaja, kaavioVoiLuoda: kaavioVoiLuoda, kaavioJoukkueOsuu: kaavioJoukkueOsuu,
  kaavioVoiLukea: kaavioVoiLukea, kaavioKohdistuu: kaavioKohdistuu, kaavioVoiKirjoittaa: kaavioVoiKirjoittaa,
  kaavioSiirtoSallittu: kaavioSiirtoSallittu, kaavioTilaMuokkauksenJalkeen: kaavioTilaMuokkauksenJalkeen,
  kaavioSeuraavaVersio: kaavioSeuraavaVersio, kaavioVersioKelpaa: kaavioVersioKelpaa,
  kaavioToiminnot: kaavioToiminnot
};
if (typeof module !== 'undefined' && module.exports) module.exports = TM_KAAVIO_POLICY;
if (typeof window !== 'undefined') { for (var _kpk in TM_KAAVIO_POLICY) { try { window[_kpk] = TM_KAAVIO_POLICY[_kpk]; } catch (e) {} } }
