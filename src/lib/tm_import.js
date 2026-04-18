/**
 * TalentMaster™ — tm_import.js
 * Excel-rekisteripohjan tuontilogiikka Seura-näkymään.
 * Päivitetty: 2026-03-25
 *
 * TOIMINTAPERIAATE:
 *   Sihteeri täyttää TalentMaster_Pelaajarekisteri_Pohja.xlsx:n ja
 *   lataa sen takaisin järjestelmään. Tämä komponentti:
 *     1. Lukee XLSX-tiedoston SheetJS:llä (selaimessa)
 *     2. Validoi rivit (pakolliset kentät, sähköpostimuoto, duplikaatit)
 *     3. Näyttää esikatselun: N pelaajaa / N joukkuetta / N huoltajan s-posti
 *     4. VP/sihteeri vahvistaa → massakutsu Cloud Functionin kautta
 *     5. Pelaajat tallennetaan Firestoreen (kutsut/-kokoelmaan ensin)
 *     6. Tapahtumaloki Firestoreen (seurat/{id}/tapahtumat/)
 *
 * KÄYTTÖ Seura-näkymässä:
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
 *   <script src="tm_import.js"></script>
 *
 *   Käynnistä tuonti:
 *     TMImport.avaaValitsin(seuraId, joukkueetMap, db, functions, kayttajaEmail);
 *
 * EXCEL-RAKENNE (TalentMaster_Pelaajarekisteri_Pohja.xlsx):
 *   Välilehti "Pelaajat", rivit 5+ (1-4 = otsikot + tilastot)
 *   Sarakkeet: A=# | B=Etunimi* | C=Sukunimi* | D=HuoltajanEmail* | E=PalloID | F=Joukkue* | G=Rooli | H=Muistiinpanot
 */

(function (global) {
  "use strict";

  // ─────────────────────────────────────────────────────────────────────────
  // SISÄINEN TILA
  // Pidetään kaikki tuontiprosessin data yhdessä paikassa — selkeämpää
  // kuin hajottaa se useisiin muuttujiin.
  // ─────────────────────────────────────────────────────────────────────────
  let _tila = {
    seuraId: null,
    joukkueetMap: {},    // { "kpv_u14": "U14 (2012)", ... }
    db: null,
    functions: null,
    kayttajaEmail: null,
    rivit: [],           // Validoidut pelaajadatarivit
    virheet: [],         // Validointivirheet
    varoitukset: [],     // Ei-kriittiset huomiot (esim. PalloID puuttuu)
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 1. JULKINEN API
  // ─────────────────────────────────────────────────────────────────────────
  const TMImport = {

    /**
     * Avaa tiedostonvalitsin ja käynnistää tuontiprosessin.
     * Kutsutaan Seura-näkymän "Tuo Excel" -napista.
     *
     * @param {string} seuraId       - Seuran Firestore-ID (esim. "kpv")
     * @param {object} joukkueetMap  - { joukkueId: joukkueNimi, ... }
     * @param {object} db            - Firestore-instanssi
     * @param {object} functions     - Cloud Functions -instanssi
     * @param {string} kayttajaEmail - Kirjautuneen käyttäjän email (audit trail)
     */
    avaaValitsin(seuraId, joukkueetMap, db, functions, kayttajaEmail) {
      _tila = { ...(_tila), seuraId, joukkueetMap, db, functions, kayttajaEmail,
                rivit: [], virheet: [], varoitukset: [] };

      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".xlsx,.xls";
      input.style.display = "none";
      input.addEventListener("change", e => {
        const tiedosto = e.target.files[0];
        if (tiedosto) _lueTiedosto(tiedosto);
        document.body.removeChild(input);
      });
      document.body.appendChild(input);
      input.click();
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TIEDOSTON LUKEMINEN
  //    SheetJS lukee XLSX:n selaimessa — ei palvelinpyyntöä tarvita.
  //    Huom: SheetJS pitää olla ladattu ennen tätä skriptiä.
  // ─────────────────────────────────────────────────────────────────────────
  function _lueTiedosto(tiedosto) {
    if (typeof XLSX === "undefined") {
      _naytaVirhe("SheetJS (xlsx.full.min.js) ei ole ladattu. Tarkista script-tagit.");
      return;
    }
    if (tiedosto.size > 5 * 1024 * 1024) { // 5MB raja
      _naytaVirhe("Tiedosto on liian suuri (max 5MB). Tarkista että pohja on oikea.");
      return;
    }

    _naytaLataaja("Luetaan tiedostoa...");

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });

        // Etsitään "Pelaajat"-välilehti — nimi on suomenkielinen kuten pohjassa
        const sheetNimi = wb.SheetNames.find(n =>
          n.toLowerCase().includes("pelaajat") || n.toLowerCase().includes("player")
        ) || wb.SheetNames[0];

        const ws = wb.Sheets[sheetNimi];
        if (!ws) {
          _naytaVirhe(`"Pelaajat"-välilehteä ei löydy. Löydetyt välilehdet: ${wb.SheetNames.join(", ")}`);
          return;
        }

        // header: 1 → rivit taulukossa eikä objekteina (nopeampaa validoida)
        // range: hypätään ensimmäiset 4 otsikkoriviä
        const kaikki = XLSX.utils.sheet_to_json(ws, { header: 1, range: 4, defval: "" });

        // Suodatetaan pois täysin tyhjät rivit
        const data = kaikki.filter(rivi =>
          rivi.some(solu => String(solu).trim() !== "")
        );

        if (data.length === 0) {
          _naytaVirhe("Tiedostossa ei ole pelaajadataa. Täytä Pelaajat-välilehti ensin.");
          return;
        }

        _validoiJaNaytaEsikatselu(data);
      } catch (err) {
        _naytaVirhe("Tiedoston lukeminen epäonnistui: " + err.message);
      }
    };
    reader.onerror = () => _naytaVirhe("Tiedoston lukeminen epäonnistui.");
    reader.readAsArrayBuffer(tiedosto);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. VALIDOINTI
  //    Jokainen rivi tarkistetaan ennen esikatselua.
  //    Kriittiset virheet estävät tuonnin kokonaan.
  //    Varoitukset näytetään mutta eivät estä.
  // ─────────────────────────────────────────────────────────────────────────
  function _validoiJaNaytaEsikatselu(rivit) {
    const validoidut = [];
    const virheet = [];
    const varoitukset = [];
    const nahtyEmailit = new Set(); // Duplikaattisähköpostien tunnistus

    rivit.forEach((rivi, idx) => {
      const riviNro = idx + 5; // Excelin rivinumero (otsikot 1-4)

      // Sarakkeiden indeksit: B=1, C=2, D=3, E=4, F=5, G=6, H=7
      const etunimi   = String(rivi[1] || "").trim();
      const sukunimi  = String(rivi[2] || "").trim();
      const hEmail    = String(rivi[3] || "").trim().toLowerCase();
      const palloID   = String(rivi[4] || "").trim();
      const joukkue   = String(rivi[5] || "").trim();
      const rooli     = String(rivi[6] || "Pelaaja").trim() || "Pelaaja";
      const muistiinpanot = String(rivi[7] || "").trim();

      // ── PAKOLLISET KENTÄT ──
      if (!etunimi)  virheet.push(`Rivi ${riviNro}: Etunimi puuttuu`);
      if (!sukunimi) virheet.push(`Rivi ${riviNro}: Sukunimi puuttuu`);
      if (!hEmail)   virheet.push(`Rivi ${riviNro}: Huoltajan sähköposti puuttuu`);
      else if (!_validoiEmail(hEmail)) virheet.push(`Rivi ${riviNro}: Sähköposti ei ole kelvollinen (${hEmail})`);
      if (!joukkue)  virheet.push(`Rivi ${riviNro}: Joukkue puuttuu`);

      if (etunimi && sukunimi && hEmail && joukkue && _validoiEmail(hEmail)) {
        // ── DUPLIKAATTICHECK ──
        if (nahtyEmailit.has(hEmail)) {
          varoitukset.push(`Rivi ${riviNro}: Sähköposti ${hEmail} esiintyy useamman kerran`);
        }
        nahtyEmailit.add(hEmail);

        // ── JOUKKUEEN TUNNISTUS ──
        // Etsitään joukkue nimellä tai ID:llä (joustava — sihteeri voi kirjoittaa eri tavoin)
        const joukkueId = _etsiJoukkueId(joukkue);
        if (!joukkueId) {
          varoitukset.push(`Rivi ${riviNro}: Joukkuetta "${joukkue}" ei löydy seuran joukkueista — tarkista Joukkueet-välilehti`);
        }

        // ── PALLOID-MUOTO ──
        if (palloID && !/^\d{6,10}$/.test(palloID)) {
          varoitukset.push(`Rivi ${riviNro}: PalloID "${palloID}" näyttää epätavalliselta (odotettiin 6-10 numeroa)`);
        }

        validoidut.push({
          etunimi, sukunimi, hEmail, palloID: palloID || null,
          joukkue: joukkueId || joukkue, // käytetään ID:tä jos löytyy, muuten nimeä
          joukkueNimi: _tila.joukkueetMap[joukkueId] || joukkue,
          rooli: rooli === "Maalivahti" ? "maalivahti" : "pelaaja",
          muistiinpanot: muistiinpanot || null,
        });
      }
    });

    _tila.rivit = validoidut;
    _tila.virheet = virheet;
    _tila.varoitukset = varoitukset;

    _naytaEsikatselu();
  }

  // Sähköpostin validointi — yksinkertainen regex riittää tähän käyttöön
  function _validoiEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Etsii joukkueen ID:n nimellä tai osalla siitä
  function _etsiJoukkueId(hakusana) {
    const haku = hakusana.toLowerCase().replace(/\s+/g, "");
    return Object.keys(_tila.joukkueetMap).find(id => {
      const nimi = (_tila.joukkueetMap[id] || "").toLowerCase().replace(/\s+/g, "");
      return id.toLowerCase() === haku || nimi.includes(haku) || haku.includes(id.toLowerCase().split("_").pop());
    }) || null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. ESIKATSELU — modal jossa yhteenveto + varoitukset + vahvistusnappi
  // ─────────────────────────────────────────────────────────────────────────
  function _naytaEsikatselu() {
    _poistaModal(); // Siivotaan edellinen

    const { rivit, virheet, varoitukset } = _tila;

    // Lasketaan tilastot esikatseluun
    const joukkueetJaarat = {};
    rivit.forEach(r => {
      joukkueetJaarat[r.joukkueNimi] = (joukkueetJaarat[r.joukkueNimi] || 0) + 1;
    });
    const uniikitEmailit = new Set(rivit.map(r => r.hEmail)).size;

    // Joukkuetaulukko esikatseluun
    const joukkueTaulukko = Object.entries(joukkueetJaarat)
      .sort((a, b) => a[0].localeCompare(b[0], "fi"))
      .map(([nimi, maara]) => `
        <div class="tm-imp-joukkuerivi">
          <span class="tm-imp-jnimi">${nimi}</span>
          <span class="tm-imp-jmaara">${maara} pelaajaa</span>
        </div>`).join("");

    // Virheblokit
    const virheHTML = virheet.length ? `
      <div class="tm-imp-virhe-blokki">
        <div class="tm-imp-blokki-otsikko tm-imp-virhe-otsikko">
          ⚠ ${virheet.length} virhettä — korjaa ennen tuontia
        </div>
        <ul class="tm-imp-lista">
          ${virheet.slice(0, 10).map(v => `<li>${v}</li>`).join("")}
          ${virheet.length > 10 ? `<li>...ja ${virheet.length - 10} muuta virhettä</li>` : ""}
        </ul>
      </div>` : "";

    const varoitusHTML = varoitukset.length ? `
      <div class="tm-imp-varoitus-blokki">
        <div class="tm-imp-blokki-otsikko tm-imp-varoitus-otsikko">
          ○ ${varoitukset.length} huomiota — voidaan ohittaa
        </div>
        <ul class="tm-imp-lista">
          ${varoitukset.slice(0, 5).map(v => `<li>${v}</li>`).join("")}
          ${varoitukset.length > 5 ? `<li>...ja ${varoitukset.length - 5} muuta</li>` : ""}
        </ul>
      </div>` : "";

    // Vahvistusnappi pois käytöstä jos kriittisiä virheitä
    const voiTuoda = virheet.length === 0 && rivit.length > 0;
    const napiHTML = voiTuoda
      ? `<button class="tm-imp-btn-primary" id="tm-imp-vahvista">
           Lähetä ${uniikitEmailit} kutsua huoltajille →
         </button>`
      : `<button class="tm-imp-btn-disabled" disabled>
           Korjaa virheet ennen tuontia
         </button>`;

    // Modal
    const modal = document.createElement("div");
    modal.id = "tm-imp-modal-overlay";
    modal.innerHTML = `
      <div id="tm-imp-modal">
        <div id="tm-imp-modal-header">
          <div id="tm-imp-modal-otsikko">Tuontiesikatselu</div>
          <button id="tm-imp-sulje" title="Sulje">✕</button>
        </div>
        <div id="tm-imp-modal-sisalto">

          <!-- KPI-rivistö -->
          <div class="tm-imp-kpi-rivi">
            <div class="tm-imp-kpi">
              <div class="tm-imp-kpi-arvo ${rivit.length > 0 ? "tm-imp-ok" : "tm-imp-nolla"}">${rivit.length}</div>
              <div class="tm-imp-kpi-nimi">pelaajaa</div>
            </div>
            <div class="tm-imp-kpi">
              <div class="tm-imp-kpi-arvo">${Object.keys(joukkueetJaarat).length}</div>
              <div class="tm-imp-kpi-nimi">joukkuetta</div>
            </div>
            <div class="tm-imp-kpi">
              <div class="tm-imp-kpi-arvo">${uniikitEmailit}</div>
              <div class="tm-imp-kpi-nimi">s-postia</div>
            </div>
            <div class="tm-imp-kpi">
              <div class="tm-imp-kpi-arvo ${virheet.length > 0 ? "tm-imp-virhe-arvo" : "tm-imp-ok"}">${virheet.length}</div>
              <div class="tm-imp-kpi-nimi">virhettä</div>
            </div>
          </div>

          <!-- Joukkuejakauma -->
          ${Object.keys(joukkueetJaarat).length > 0 ? `
          <div class="tm-imp-sektio">
            <div class="tm-imp-sektio-otsikko">Joukkuejakauma</div>
            ${joukkueTaulukko}
          </div>` : ""}

          <!-- Virheet ja varoitukset -->
          ${virheHTML}
          ${varoitusHTML}

          <!-- Mitä tapahtuu seuraavaksi -->
          ${voiTuoda ? `
          <div class="tm-imp-info-blokki">
            <div class="tm-imp-blokki-otsikko">Mitä vahvistus tekee</div>
            <div class="tm-imp-info-teksti">
              Järjestelmä tallentaa ${rivit.length} pelaajaa Firestoreen ja lähettää
              ${uniikitEmailit} sähköpostikutsua huoltajille. Huoltaja saa linkin
              suostumuslomakkeeseen, jossa hän voi myös täyttää PalloID:n
              jos se puuttuu. Voit seurata kutsuja Pelaajat-välilehden
              statusampeleista.
            </div>
          </div>` : ""}

        </div>
        <div id="tm-imp-modal-footer">
          <button class="tm-imp-btn-secondary" id="tm-imp-peruuta">Peruuta</button>
          ${napiHTML}
        </div>
      </div>`;

    // Tyylit
    _lisaaTyylit();
    document.body.appendChild(modal);

    // Kuuntelijat
    document.getElementById("tm-imp-sulje").addEventListener("click", _poistaModal);
    document.getElementById("tm-imp-peruuta").addEventListener("click", _poistaModal);
    modal.addEventListener("click", e => { if (e.target === modal) _poistaModal(); });

    if (voiTuoda) {
      document.getElementById("tm-imp-vahvista").addEventListener("click", _kaynnistaTuonti);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. TUONTI — tallentaa Firestoreen ja lähettää massakutsun
  // ─────────────────────────────────────────────────────────────────────────
  async function _kaynnistaTuonti() {
    const btn = document.getElementById("tm-imp-vahvista");
    if (btn) { btn.disabled = true; btn.textContent = "Lähetetään kutsuja..."; }

    const { rivit, seuraId, db, functions, kayttajaEmail } = _tila;
    const tulokset = { onnistuneet: 0, epaonnistuneet: 0, virheet: [] };

    try {
      // Lähetetään kutsut Cloud Functionin kautta erissä (max 10 kerrallaan)
      // jotta ei kuormiteta Firebasea liikaa
      const erakoko = 10;
      for (let i = 0; i < rivit.length; i += erakoko) {
        const era = rivit.slice(i, i + erakoko);
        if (btn) btn.textContent = `Lähetetty ${i}/${rivit.length}...`;

        // Jokainen pelaaja käsitellään erikseen — virhe yhdessä ei kaada muita
        await Promise.allSettled(era.map(async pelaaja => {
          try {
            await _tallennaYksiPelaaja(pelaaja, seuraId, db);
            await _lahetaKutsu(pelaaja, seuraId, functions);
            tulokset.onnistuneet++;
          } catch (err) {
            tulokset.epaonnistuneet++;
            tulokset.virheet.push(`${pelaaja.etunimi} ${pelaaja.sukunimi}: ${err.message}`);
          }
        }));
      }

      // Tapahtumaloki Firestoreen
      await _tallennaTapahtumaloki(seuraId, db, kayttajaEmail, rivit.length, tulokset);

      _naytaTulos(tulokset);
    } catch (err) {
      _naytaVirhe("Tuonti keskeytyi odottamattomaan virheeseen: " + err.message);
    }
  }

  // Tallentaa yhden pelaajan Firestoreen kutsut/-kokoelmaan
  async function _tallennaYksiPelaaja(pelaaja, seuraId, db) {
    const kutsuId = `kutsu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await db.collection("seurat").doc(seuraId).collection("kutsut").doc(kutsuId).set({
      etunimi:     pelaaja.etunimi,
      sukunimi:    pelaaja.sukunimi,
      nimi:        `${pelaaja.etunimi} ${pelaaja.sukunimi}`,
      hEmail:      pelaaja.hEmail,
      palloID:     pelaaja.palloID || null,
      joukkue:     pelaaja.joukkue,
      joukkueNimi: pelaaja.joukkueNimi,
      rooli:       pelaaja.rooli,
      muistiinpanot: pelaaja.muistiinpanot || null,
      tila:        "lahetetty",
      lahde:       "excel_tuonti",
      lahetetty:   new Date().toISOString(),
      lahettaja:   _tila.kayttajaEmail,
    });
    return kutsuId;
  }

  // Kutsuu Cloud Functionia joka lähettää sähköpostin
  async function _lahetaKutsu(pelaaja, seuraId, functions) {
    if (!functions) {
      // Jos Cloud Functions ei ole käytössä, skipataan sähköposti
      // (demo-tilassa tai kehitysympäristössä)
      console.warn("tm_import: Cloud Functions ei ole käytössä — sähköpostia ei lähetetä");
      return;
    }
    const lahetaKutsu = functions.httpsCallable("lahetaHuoltajaKutsu");
    await lahetaKutsu({
      seuraId,
      etunimi:     pelaaja.etunimi,
      sukunimi:    pelaaja.sukunimi,
      hEmail:      pelaaja.hEmail,
      joukkue:     pelaaja.joukkue,
      joukkueNimi: pelaaja.joukkueNimi,
    });
  }

  // Tallentaa auditoinnin seurat/{id}/tapahtumat/
  async function _tallennaTapahtumaloki(seuraId, db, kayttajaEmail, yhtTotal, tulokset) {
    try {
      await db.collection("seurat").doc(seuraId).collection("tapahtumat").add({
        tyyppi: "excel_massakutsu",
        lataaja: kayttajaEmail,
        aika: new Date().toISOString(),
        yhteensa: yhtTotal,
        onnistuneet: tulokset.onnistuneet,
        epaonnistuneet: tulokset.epaonnistuneet,
      });
    } catch (e) {
      console.warn("tm_import: Tapahtumalogiin kirjoitus epäonnistui:", e.message);
      // Ei kriittinen — tuonti on jo onnistunut
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. TULOSMODALIT
  // ─────────────────────────────────────────────────────────────────────────
  function _naytaTulos(tulokset) {
    _poistaModal();
    const kaikki = _tila.rivit.length;
    const ok = tulokset.onnistuneet;
    const ep = tulokset.epaonnistuneet;

    const modal = document.createElement("div");
    modal.id = "tm-imp-modal-overlay";
    modal.innerHTML = `
      <div id="tm-imp-modal">
        <div id="tm-imp-modal-header">
          <div id="tm-imp-modal-otsikko">${ok === kaikki ? "✓ Tuonti valmis" : "Tuonti osittain valmis"}</div>
          <button id="tm-imp-sulje">✕</button>
        </div>
        <div id="tm-imp-modal-sisalto">
          <div class="tm-imp-kpi-rivi">
            <div class="tm-imp-kpi">
              <div class="tm-imp-kpi-arvo tm-imp-ok">${ok}</div>
              <div class="tm-imp-kpi-nimi">kutsu lähetetty</div>
            </div>
            <div class="tm-imp-kpi">
              <div class="tm-imp-kpi-arvo ${ep > 0 ? "tm-imp-virhe-arvo" : "tm-imp-ok"}">${ep}</div>
              <div class="tm-imp-kpi-nimi">epäonnistui</div>
            </div>
          </div>
          ${ep > 0 ? `
          <div class="tm-imp-virhe-blokki">
            <div class="tm-imp-blokki-otsikko tm-imp-virhe-otsikko">Epäonnistuneet kutsut</div>
            <ul class="tm-imp-lista">
              ${tulokset.virheet.slice(0, 8).map(v => `<li>${v}</li>`).join("")}
            </ul>
          </div>` : ""}
          <div class="tm-imp-info-blokki">
            <div class="tm-imp-info-teksti">
              Huoltajat saavat sähköpostin jossa on linkki suostumuslomakkeeseen.
              Näet kutsutilan Pelaajat-välilehden statusampeleista.
              Vihreä = suostumus OK, keltainen = kutsu lähetetty, harmaa = ei kutsuttu.
            </div>
          </div>
        </div>
        <div id="tm-imp-modal-footer">
          <button class="tm-imp-btn-primary" id="tm-imp-sulje-tulos">Sulje</button>
        </div>
      </div>`;

    _lisaaTyylit();
    document.body.appendChild(modal);
    document.getElementById("tm-imp-sulje").addEventListener("click", _poistaModal);
    document.getElementById("tm-imp-sulje-tulos").addEventListener("click", () => {
      _poistaModal();
      // Päivitetään Seura-näkymä jos callback on asetettu
      if (typeof _tila.onValmis === "function") _tila.onValmis(tulokset);
    });
  }

  function _naytaVirhe(viesti) {
    _poistaModal();
    const modal = document.createElement("div");
    modal.id = "tm-imp-modal-overlay";
    modal.innerHTML = `
      <div id="tm-imp-modal">
        <div id="tm-imp-modal-header">
          <div id="tm-imp-modal-otsikko">Virhe</div>
          <button id="tm-imp-sulje">✕</button>
        </div>
        <div id="tm-imp-modal-sisalto">
          <div class="tm-imp-virhe-blokki">
            <div class="tm-imp-blokki-otsikko tm-imp-virhe-otsikko">⚠ ${viesti}</div>
          </div>
        </div>
        <div id="tm-imp-modal-footer">
          <button class="tm-imp-btn-secondary" id="tm-imp-sulje-virhe">Sulje</button>
        </div>
      </div>`;
    _lisaaTyylit();
    document.body.appendChild(modal);
    document.getElementById("tm-imp-sulje").addEventListener("click", _poistaModal);
    document.getElementById("tm-imp-sulje-virhe").addEventListener("click", _poistaModal);
  }

  function _naytaLataaja(viesti) {
    _poistaModal();
    const modal = document.createElement("div");
    modal.id = "tm-imp-modal-overlay";
    modal.innerHTML = `
      <div id="tm-imp-modal" style="padding: 32px; text-align: center;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(232,238,248,0.4);margin-bottom:16px;">${viesti}</div>
        <div class="tm-imp-spinner"></div>
      </div>`;
    _lisaaTyylit();
    document.body.appendChild(modal);
  }

  function _poistaModal() {
    const m = document.getElementById("tm-imp-modal-overlay");
    if (m) m.remove();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. TYYLIT
  //    Injektoidaan kerran — ID-tarkistus estää duplikaatit.
  // ─────────────────────────────────────────────────────────────────────────
  function _lisaaTyylit() {
    if (document.getElementById("tm-imp-css")) return;
    const s = document.createElement("style");
    s.id = "tm-imp-css";
    s.textContent = `
      /* ── OVERLAY ── */
      #tm-imp-modal-overlay {
        position: fixed; inset: 0; z-index: 99000;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
        font-family: 'DM Sans','Inter',system-ui,sans-serif;
      }
      #tm-imp-modal {
        background: #0C1018; border: 1px solid rgba(232,238,248,0.1);
        border-radius: 12px; width: 100%; max-width: 520px;
        max-height: 90vh; display: flex; flex-direction: column;
        box-shadow: 0 24px 64px rgba(0,0,0,0.6);
      }
      #tm-imp-modal-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 20px 24px 16px; border-bottom: 1px solid rgba(232,238,248,0.07);
        flex-shrink: 0;
      }
      #tm-imp-modal-otsikko { font-size: 14px; font-weight: 700; color: #E8EEF8; }
      #tm-imp-sulje {
        background: none; border: none; cursor: pointer; padding: 4px 8px;
        color: rgba(232,238,248,0.35); font-size: 14px; border-radius: 4px;
        transition: color 0.15s, background 0.15s;
      }
      #tm-imp-sulje:hover { color: #E8EEF8; background: rgba(232,238,248,0.06); }
      #tm-imp-modal-sisalto {
        padding: 20px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px;
      }
      #tm-imp-modal-footer {
        display: flex; justify-content: flex-end; gap: 10px;
        padding: 16px 24px 20px; border-top: 1px solid rgba(232,238,248,0.07); flex-shrink: 0;
      }

      /* ── KPI-RIVISTÖ ── */
      .tm-imp-kpi-rivi { display: flex; gap: 12px; }
      .tm-imp-kpi {
        flex: 1; background: rgba(232,238,248,0.03); border: 1px solid rgba(232,238,248,0.07);
        border-radius: 8px; padding: 14px; text-align: center;
      }
      .tm-imp-kpi-arvo { font-size: 28px; font-weight: 700; color: #E8EEF8; line-height: 1; margin-bottom: 4px; }
      .tm-imp-kpi-arvo.tm-imp-ok { color: #3EC9A7; }
      .tm-imp-kpi-arvo.tm-imp-nolla { color: rgba(232,238,248,0.3); }
      .tm-imp-kpi-arvo.tm-imp-virhe-arvo { color: #D96060; }
      .tm-imp-kpi-nimi { font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(232,238,248,0.35); }

      /* ── SEKTIOT ── */
      .tm-imp-sektio { display: flex; flex-direction: column; gap: 4px; }
      .tm-imp-sektio-otsikko { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(232,238,248,0.3); margin-bottom: 4px; }
      .tm-imp-joukkuerivi { display: flex; justify-content: space-between; align-items: center; padding: 7px 10px; background: rgba(232,238,248,0.03); border-radius: 5px; }
      .tm-imp-jnimi { font-size: 12px; color: rgba(232,238,248,0.7); }
      .tm-imp-jmaara { font-size: 11px; font-weight: 600; color: #4A7ED9; }

      /* ── BLOKKIT ── */
      .tm-imp-blokki-otsikko { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; margin-bottom: 8px; }
      .tm-imp-virhe-blokki { background: rgba(217,96,96,0.07); border: 1px solid rgba(217,96,96,0.2); border-radius: 8px; padding: 14px; }
      .tm-imp-virhe-otsikko { color: #D96060; }
      .tm-imp-varoitus-blokki { background: rgba(224,160,64,0.07); border: 1px solid rgba(224,160,64,0.2); border-radius: 8px; padding: 14px; }
      .tm-imp-varoitus-otsikko { color: #E0A040; }
      .tm-imp-info-blokki { background: rgba(74,126,217,0.06); border: 1px solid rgba(74,126,217,0.15); border-radius: 8px; padding: 14px; }
      .tm-imp-lista { padding-left: 18px; margin: 0; }
      .tm-imp-lista li { font-size: 11px; color: rgba(232,238,248,0.55); margin-bottom: 3px; }
      .tm-imp-info-teksti { font-size: 12px; color: rgba(232,238,248,0.5); line-height: 1.6; }

      /* ── NAPIT ── */
      .tm-imp-btn-primary {
        background: #4A7ED9; color: #fff; border: none; border-radius: 6px;
        padding: 10px 18px; font-size: 11px; font-weight: 700; letter-spacing: 0.8px;
        cursor: pointer; transition: background 0.15s;
      }
      .tm-imp-btn-primary:hover { background: #3A6EC9; }
      .tm-imp-btn-secondary {
        background: rgba(232,238,248,0.06); color: rgba(232,238,248,0.5);
        border: 1px solid rgba(232,238,248,0.1); border-radius: 6px;
        padding: 10px 18px; font-size: 11px; font-weight: 700; letter-spacing: 0.8px;
        cursor: pointer; transition: background 0.15s;
      }
      .tm-imp-btn-secondary:hover { background: rgba(232,238,248,0.1); }
      .tm-imp-btn-disabled {
        background: rgba(232,238,248,0.05); color: rgba(232,238,248,0.2);
        border: 1px solid rgba(232,238,248,0.07); border-radius: 6px;
        padding: 10px 18px; font-size: 11px; font-weight: 700; letter-spacing: 0.8px;
        cursor: not-allowed;
      }

      /* ── SPINNER ── */
      .tm-imp-spinner {
        width: 28px; height: 28px; border: 2px solid rgba(74,126,217,0.2);
        border-top-color: #4A7ED9; border-radius: 50%;
        animation: tm-spin 0.8s linear infinite; margin: 0 auto;
      }
      @keyframes tm-spin { to { transform: rotate(360deg); } }

      /* ── MOBIILI ── */
      @media (max-width: 600px) {
        #tm-imp-modal { max-width: 100%; border-radius: 12px 12px 0 0; margin-top: auto; }
        .tm-imp-kpi-arvo { font-size: 22px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. VIENTI GLOBAALIIN NIMIAVARUUTEEN
  //    window.TMImport.avaaValitsin(...) käytettävissä Seura-näkymässä
  // ─────────────────────────────────────────────────────────────────────────
  global.TMImport = TMImport;

})(window);
