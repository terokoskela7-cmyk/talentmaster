/**
 * TalentMaster — Testipelaajien siemen-skripti
 * Luo 6 testipelaajaa KPV:lle (2x U12, 2x U15, 2x U19)
 * 
 * Ajo: node seed_kartoitukset.js
 * Poisto: node seed_kartoitukset.js --poista
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

// ── Firebase Admin alustus ──────────────────────────────────
// Vaihtoehto A: service account JSON
// const serviceAccount = require("./serviceAccountKey.json");
// initializeApp({ credential: cert(serviceAccount) });

const serviceAccount = require("../../serviceAccountKey.json");
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const SEURA_ID = "kpv";

// ── Brzycki 1RM ────────────────────────────────────────────
function brzycki(kg5rm, toistot = 5) {
  return kg5rm / (1.0278 - 0.0278 * toistot);
}
function rel1rm(kg5rm, kehonpaino, toistot = 5) {
  return parseFloat((brzycki(kg5rm, toistot) / kehonpaino).toFixed(3));
}

// ── FLEI-tason laskenta ────────────────────────────────────
function fleiTaso(prosentti) {
  if (prosentti >= 70) return "hyvä";
  if (prosentti >= 50) return "kehitys";
  return "prioriteetti";
}

// ── PHV → kuormarajoitin ───────────────────────────────────
function kuormaRajoitin(phvTila) {
  if (phvTila === "PHV-huippu") return "⚠️ MAX 60%";
  if (phvTila === "Post-PHV")   return "⚡ 80% OK";
  return "✅ Normaali";
}

// ── Testipelaajat ──────────────────────────────────────────
const nyt = Timestamp.now();
const pvmKevat = Timestamp.fromDate(new Date("2026-03-15"));

const TESTIPELAAJAT = [

  // ─── U12 / Poika ───────────────────────────────────────
  {
    _tag: "testi_U12_P",
    seuraId: SEURA_ID,
    luotu: nyt, muokattu: nyt,
    luonutUid: "jIbW7q8nLggswTjefkYuSvtneH92",

    pelaajaId:    "TEST_kpv_001",
    nimi:         "Pekka Testinen",
    sukupuoli:    "P",
    ika:          11,
    syntymavuosi: 2014,
    ikäluokka:    "U12",
    joukkue:      "KPV P11",
    phvTila:      "Varhainen",

    testauspvm:   pvmKevat,
    arvioija:     "TESTI – voidaan poistaa",
    kausi:        "kevat_2026",

    u12: {
      valakyykky:        { tulos: null, pisteet: 3, huomio: "Hyvä syväkyykky, keppi pysyy linjassa" },
      luistelijanKyykky: { tulos: null, pisteet: 2, huomio: "Polvi kääntyy hieman sisään vasemmalla" },
      askelkyykky:       { tulos: null, pisteet: 3, huomio: "" },
      hyvaaHuomenta:     { tulos: null, pisteet: 2, huomio: "Selkä pyöristyy loppuvaiheessa" },
      etunojapunnerrus:  { tulos: null, pisteet: 3, huomio: "" },
      lankku60s:         { tulos: 55,   pisteet: 3, huomio: "" },
      naruhypyt15s:      { tulos: 30,   pisteet: 2, huomio: "" },
      pituushyppy:       { tulos: 1.88, pisteet: 3, huomio: "" },
      loikka5:           { tulos: 9.45, pisteet: 3, huomio: "" },
    },
    u15: null,
    u19: null,
    yhteenveto: {
      pisteetYhteensa: 25,
      pisteetMaksimi:  27,
      fleiProsentti:   93,
      fleiTaso:        "hyvä",
      kuormaRajoitin:  "✅ Normaali",
      asiHuomio:       "",
    },
  },

  // ─── U12 / Tyttö ──────────────────────────────────────
  {
    _tag: "testi_U12_T",
    seuraId: SEURA_ID,
    luotu: nyt, muokattu: nyt,
    luonutUid: "jIbW7q8nLggswTjefkYuSvtneH92",

    pelaajaId:    "TEST_kpv_002",
    nimi:         "Liisa Testinen",
    sukupuoli:    "T",
    ika:          12,
    syntymavuosi: 2013,
    ikäluokka:    "U12",
    joukkue:      "KPV T12",
    phvTila:      "Varhainen",

    testauspvm:   pvmKevat,
    arvioija:     "TESTI – voidaan poistaa",
    kausi:        "kevat_2026",

    u12: {
      valakyykky:        { tulos: null, pisteet: 2, huomio: "Kantapäät nousevat hieman" },
      luistelijanKyykky: { tulos: null, pisteet: 2, huomio: "" },
      askelkyykky:       { tulos: null, pisteet: 3, huomio: "" },
      hyvaaHuomenta:     { tulos: null, pisteet: 3, huomio: "" },
      etunojapunnerrus:  { tulos: null, pisteet: 2, huomio: "Lantio painuu alas lopussa" },
      lankku60s:         { tulos: 42,   pisteet: 2, huomio: "" },
      naruhypyt15s:      { tulos: 28,   pisteet: 2, huomio: "" },
      pituushyppy:       { tulos: 1.72, pisteet: 1, huomio: "Alle viiterajan" },
      loikka5:           { tulos: 8.9,  pisteet: 2, huomio: "" },
    },
    u15: null,
    u19: null,
    yhteenveto: {
      pisteetYhteensa: 19,
      pisteetMaksimi:  27,
      fleiProsentti:   70,
      fleiTaso:        "hyvä",
      kuormaRajoitin:  "✅ Normaali",
      asiHuomio:       "",
    },
  },

  // ─── U15 / Poika (PHV-huippu) ──────────────────────────
  {
    _tag: "testi_U15_P_PHV",
    seuraId: SEURA_ID,
    luotu: nyt, muokattu: nyt,
    luonutUid: "jIbW7q8nLggswTjefkYuSvtneH92",

    pelaajaId:    "TEST_kpv_003",
    nimi:         "Mikko Kasvava",
    sukupuoli:    "P",
    ika:          14,
    syntymavuosi: 2011,
    ikäluokka:    "U15",
    joukkue:      "KPV P14",
    phvTila:      "PHV-huippu",

    testauspvm:   pvmKevat,
    arvioija:     "TESTI – voidaan poistaa",
    kausi:        "kevat_2026",

    u12: null,
    u15: {
      pistoolikyykky:   { tulos: 8,    pisteet: 2, huomio: "Koroke kantapään alla" },
      etunojapunnerrus: { tulos: 26,   pisteet: 2, huomio: "" },
      leuanveto:        { tulos: 7,    pisteet: 2, huomio: "" },
      testi4_valinta:   "jalkojenNosto",
      testi4_tulos:     { tulos: 7,    pisteet: 2, huomio: "" },
      lantionnosto:     { tulos: 28,   pisteet: 1, huomio: "⚠️ Alle 29 tst — referral harkittava" },
      testi6_valinta:   "naruhypyt30s",
      testi6_tulos:     { tulos: 61,   pisteet: 2, huomio: "" },
      slr:              { tulos: null, pisteet: 2, huomio: "Oikea 82°, vasen 87°" },
      thomasTesti:      { tulos: null, pisteet: 2, huomio: "" },
      pituushyppy:      { tulos: 2.08, pisteet: 2, huomio: "" },
      loikka5:          { tulos: 10.3, pisteet: 2, huomio: "" },
    },
    u19: null,
    yhteenveto: {
      pisteetYhteensa: 19,
      pisteetMaksimi:  30,
      fleiProsentti:   63,
      fleiTaso:        "kehitys",
      kuormaRajoitin:  "⚠️ MAX 60%",
      asiHuomio:       "⚡ Lantionnosto < 29 tst + kantakipu → VÄLITÖN terapia-referral",
    },
  },

  // ─── U15 / Tyttö (Post-PHV) ────────────────────────────
  {
    _tag: "testi_U15_T_POST",
    seuraId: SEURA_ID,
    luotu: nyt, muokattu: nyt,
    luonutUid: "jIbW7q8nLggswTjefkYuSvtneH92",

    pelaajaId:    "TEST_kpv_004",
    nimi:         "Anna Nopea",
    sukupuoli:    "T",
    ika:          15,
    syntymavuosi: 2010,
    ikäluokka:    "U15",
    joukkue:      "KPV T15",
    phvTila:      "Post-PHV",

    testauspvm:   pvmKevat,
    arvioija:     "TESTI – voidaan poistaa",
    kausi:        "kevat_2026",

    u12: null,
    u15: {
      pistoolikyykky:   { tulos: 12,   pisteet: 3, huomio: "" },
      etunojapunnerrus: { tulos: 35,   pisteet: 3, huomio: "" },
      leuanveto:        { tulos: 10,   pisteet: 3, huomio: "" },
      testi4_valinta:   "sivulankku60s",
      testi4_tulos:     { tulos: 52,   pisteet: 3, huomio: "" },
      lantionnosto:     { tulos: 48,   pisteet: 3, huomio: "" },
      testi6_valinta:   "pakianousu",
      testi6_tulos:     { tulos: 20,   pisteet: 3, huomio: "" },
      slr:              { tulos: null, pisteet: 3, huomio: "Molemmat ≥90°" },
      thomasTesti:      { tulos: null, pisteet: 3, huomio: "" },
      pituushyppy:      { tulos: 2.52, pisteet: 3, huomio: "" },
      loikka5:          { tulos: 12.5, pisteet: 3, huomio: "" },
    },
    u19: null,
    yhteenveto: {
      pisteetYhteensa: 30,
      pisteetMaksimi:  30,
      fleiProsentti:   100,
      fleiTaso:        "hyvä",
      kuormaRajoitin:  "⚡ 80% OK",
      asiHuomio:       "",
    },
  },

  // ─── U19 / Poika ───────────────────────────────────────
  {
    _tag: "testi_U19_P",
    seuraId: SEURA_ID,
    luotu: nyt, muokattu: nyt,
    luonutUid: "jIbW7q8nLggswTjefkYuSvtneH92",

    pelaajaId:    "TEST_kpv_005",
    nimi:         "Janne Vahva",
    sukupuoli:    "P",
    ika:          17,
    syntymavuosi: 2008,
    ikäluokka:    "U19",
    joukkue:      "KPV P17",
    phvTila:      "Post-PHV",

    testauspvm:   pvmKevat,
    arvioija:     "TESTI – voidaan poistaa",
    kausi:        "kevat_2026",

    u12: null,
    u15: null,
    u19: {
      takakyykky:       { kg5rm: 90,  kehonpaino: 72, rel1rm: rel1rm(90,72),  pisteet: 2, huomio: "" },
      maastaveto:       { kg5rm: 115, kehonpaino: 72, rel1rm: rel1rm(115,72), pisteet: 2, huomio: "" },
      rinnalleveto:     { kg5rm: 65,  kehonpaino: 72, rel1rm: rel1rm(65,72),  pisteet: 2, huomio: "" },
      yhdenJalanKyykky: { kg5rm: 60,  kehonpaino: 72, rel1rm: rel1rm(60,72),  pisteet: 2,
                          puoli: "molemmat", huomio: "Oikea 5% heikompi" },
      penkkipunnerrus:  { kg5rm: 65,  kehonpaino: 72, rel1rm: rel1rm(65,72),  pisteet: 2, huomio: "" },
      leuanveto:        { tulos: 7,    pisteet: 2, huomio: "" },
      jalkojenNosto:    { tulos: 11,   pisteet: 2, huomio: "" },
      pakianousu:       { tulos: 18,   pisteet: 2, huomio: "" },
      lonkanOjennus:    { tulos: null, pisteet: 3, huomio: "" },
      slr:              { tulos: null, pisteet: 3, huomio: "" },
      thomasTesti:      { tulos: null, pisteet: 3, huomio: "" },
      pituushyppy:      { tulos: 2.25, pisteet: 2, huomio: "" },
      loikka5:          { tulos: 11.1, pisteet: 2, huomio: "" },
    },
    yhteenveto: {
      pisteetYhteensa: 31,
      pisteetMaksimi:  39,
      fleiProsentti:   79,
      fleiTaso:        "hyvä",
      kuormaRajoitin:  "⚡ 80% OK",
      asiHuomio:       "⚡ Yhden jalan kyykky: oikea/vasen ero — tarkista ASI",
    },
  },

  // ─── U19 / Tyttö (prioriteetti-taso) ──────────────────
  {
    _tag: "testi_U19_T_prio",
    seuraId: SEURA_ID,
    luotu: nyt, muokattu: nyt,
    luonutUid: "jIbW7q8nLggswTjefkYuSvtneH92",

    pelaajaId:    "TEST_kpv_006",
    nimi:         "Maria Kehittyy",
    sukupuoli:    "T",
    ika:          16,
    syntymavuosi: 2009,
    ikäluokka:    "U19",
    joukkue:      "KPV T16",
    phvTila:      "Post-PHV",

    testauspvm:   pvmKevat,
    arvioija:     "TESTI – voidaan poistaa",
    kausi:        "kevat_2026",

    u12: null,
    u15: null,
    u19: {
      takakyykky:       { kg5rm: 55,  kehonpaino: 60, rel1rm: rel1rm(55,60),  pisteet: 1, huomio: "Tekniikka kehittyvä" },
      maastaveto:       { kg5rm: 75,  kehonpaino: 60, rel1rm: rel1rm(75,60),  pisteet: 1, huomio: "" },
      rinnalleveto:     { kg5rm: 45,  kehonpaino: 60, rel1rm: rel1rm(45,60),  pisteet: 1, huomio: "" },
      yhdenJalanKyykky: { kg5rm: 40,  kehonpaino: 60, rel1rm: rel1rm(40,60),  pisteet: 1,
                          puoli: "molemmat", huomio: "" },
      penkkipunnerrus:  { kg5rm: 40,  kehonpaino: 60, rel1rm: rel1rm(40,60),  pisteet: 1, huomio: "" },
      leuanveto:        { tulos: 5,    pisteet: 1, huomio: "" },
      jalkojenNosto:    { tulos: 8,    pisteet: 1, huomio: "" },
      pakianousu:       { tulos: 12,   pisteet: 1, huomio: "" },
      lonkanOjennus:    { tulos: null, pisteet: 2, huomio: "" },
      slr:              { tulos: null, pisteet: 1, huomio: "Vasen 70°" },
      thomasTesti:      { tulos: null, pisteet: 1, huomio: "" },
      pituushyppy:      { tulos: 2.20, pisteet: 1, huomio: "" },
      loikka5:          { tulos: 11.5, pisteet: 2, huomio: "" },
    },
    yhteenveto: {
      pisteetYhteensa: 15,
      pisteetMaksimi:  39,
      fleiProsentti:   38,
      fleiTaso:        "prioriteetti",
      kuormaRajoitin:  "⚡ 80% OK",
      asiHuomio:       "🔴 SLR vasen 70° — hamstring liikkuvuus kriittinen kehityskohde",
    },
  },
];

// ── Kirjoitus Firestoreen ───────────────────────────────────
async function lisaaTestidata() {
  const col = db.collection(`seurat/${SEURA_ID}/kartoitukset`);
  const lisatyt = [];

  for (const pelaaja of TESTIPELAAJAT) {
    const tag = pelaaja._tag;
    const data = { ...pelaaja };
    delete data._tag;

    const docRef = await col.add(data);
    lisatyt.push({ id: docRef.id, tag, nimi: data.nimi });
    console.log(`✅ Lisätty: ${data.nimi} (${tag}) → ${docRef.id}`);
  }

  // Tallenna id:t poistoa varten
  const fs = require("fs");
  fs.writeFileSync("./testi_idt.json", JSON.stringify(lisatyt, null, 2));
  console.log("\n📁 ID:t tallennettu tiedostoon testi_idt.json");
  console.log("Poista testipelaajat komennolla: node seed_kartoitukset.js --poista");
}

// ── Poisto Firestorestä ─────────────────────────────────────
async function poistaTestidata() {
  const fs = require("fs");
  if (!fs.existsSync("./testi_idt.json")) {
    console.error("❌ testi_idt.json ei löydy — aja ensin lisäys");
    process.exit(1);
  }
  const idt = JSON.parse(fs.readFileSync("./testi_idt.json", "utf8"));
  for (const { id, nimi, tag } of idt) {
    await db.doc(`seurat/${SEURA_ID}/kartoitukset/${id}`).delete();
    console.log(`🗑️  Poistettu: ${nimi} (${tag}) ← ${id}`);
  }
  fs.unlinkSync("./testi_idt.json");
  console.log("\n✅ Kaikki testipelaajat poistettu");
}

// ── Main ────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes("--poista")) {
  poistaTestidata().catch(console.error);
} else {
  lisaaTestidata().catch(console.error);
}
