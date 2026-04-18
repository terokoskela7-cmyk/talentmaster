/**
 * TalentMaster™ — tm_empty_state.js
 * Empty state + ohjattu onboarding ensimmäisille kirjautumiskerroille.
 * Päivitetty: 2026-03-25
 *
 * MIKSI TÄMÄ ON KRIITTINEN (SESSION_SUMMARY.md, kilpailija-analyysi):
 *   Kun käyttäjä kirjautuu ensimmäistä kertaa ja näkee tyhjän järjestelmän,
 *   suurin osa lopettaa. Tämä komponentti korvaa tyhjän ruudun toimintakutsulla
 *   joka ohjaa kädestä pitäen ensimmäiset 48h.
 *
 *   PlayMetrics-eroa: "one-on-one video chats, group trainings, emails replied to
 *   within minutes" — heidän onboardinginsa on eksplisiittinen tuote, ei sattuma.
 *   TalentMasterin kilpailuetu on henkilökohtainen tuki pilotin aikana, ja tämä
 *   komponentti tekee sen näkyväksi.
 *
 * KOLME TILAA:
 *   A) Täysin tyhjä seura   → 3-vaiheen onboarding-ohjain
 *   B) Joukkueet OK, ei pelaajia → Excel-tuontikehotus
 *   C) Pelaajia, ei kirjauksia  → Valmentajan aktivointikehotus
 *
 * KÄYTTÖ Seura-näkymässä:
 *   TMEmptyState.tarkistaJaNayta(seuraId, seuraTilastot, db);
 *   // Palaa null jos data löytyy (ei näytetä mitään)
 *   // Palauttaa HTML-elementin jos empty state aktivoituu
 *
 * KÄYTTÖ Master-näkymässä (valmentaja):
 *   TMEmptyState.valmentajaTyhja(joukkueNimi, onAddCallback);
 */

(function (global) {
  "use strict";

  // ─────────────────────────────────────────────────────────────────────────
  // ONBOARDING-VAIHEET — Seura-näkymä, VP tai sihteeri
  //
  // Jokainen vaihe on itsenäinen toimintayksikkö. Järjestelmä tietää missä
  // vaiheessa seura on (Firestore-data) ja näyttää aina seuraavan askeleen.
  // "Aloita lisäämällä joukkueet → 2 min" on konkreettisempi kuin "Aloita".
  // ─────────────────────────────────────────────────────────────────────────
  const ONBOARDING_VAIHEET = [
    {
      id: "joukkueet",
      nro: 1,
      otsikko: "Lisää joukkueet",
      kuvaus: "Luo seuran joukkueet — tämä aktivoi pelaajien rekisteröinnin ja valmentajien kutsumisen.",
      aika: "~2 min",
      toiminto: "Siirry Joukkueet-välilehdelle",
      toimintoId: "tab-joukkueet",
      ikoni: "◈",
      valmis: stats => stats.joukkueet > 0,
    },
    {
      id: "pelaajat",
      nro: 2,
      otsikko: "Rekisteröi pelaajat",
      kuvaus: "Lataa Excel-rekisteripohja, täytä pelaajien tiedot ja lähetä massakutsu huoltajille suostumuslomakkeen kera.",
      aika: "~10 min",
      toiminto: "Lataa rekisteripohja",
      toimintoId: "tm-es-lataa-pohja",
      ikoni: "◉",
      valmis: stats => stats.pelaajat > 0,
    },
    {
      id: "valmentajat",
      nro: 3,
      otsikko: "Kutsu valmentajat",
      kuvaus: "Kutsu valmentajat sähköpostitse — he saavat tunnukset ja pääsevät kirjaamaan heti.",
      aika: "~3 min",
      toiminto: "Siirry Henkilöstö-välilehdelle",
      toimintoId: "tab-henkilosto",
      ikoni: "◑",
      valmis: stats => stats.valmentajat > 0,
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // JULKINEN API
  // ─────────────────────────────────────────────────────────────────────────
  const TMEmptyState = {

    /**
     * Tarkistaa onko seura tyhjä ja näyttää oikean empty staten.
     * Kutsutaan Seura-näkymässä datan latauksen jälkeen.
     *
     * @param {string} kontaineriId - HTML-elementin ID johon renderöidään
     * @param {object} stats        - { joukkueet: N, pelaajat: N, valmentajat: N, kutsut: N }
     * @param {object} options      - { seuraId, seuraNimi, onLataaExcel, onTabSiirry }
     * @returns {boolean}           - true = empty state näytetty, false = data löytyy
     */
    tarkistaJaNayta(kontaineriId, stats, options) {
      const kontaineri = document.getElementById(kontaineriId);
      if (!kontaineri) return false;

      // Seura on aktiivinen — ei empty statea
      if (stats.pelaajat > 0 && stats.valmentajat > 0) return false;

      // Näytetään oikea empty state tilan mukaan
      const html = _rakennaSeuraTyhja(stats, options);
      kontaineri.innerHTML = html;
      _lisaaKuuntelijat(kontaineri, options);
      return true;
    },

    /**
     * Yksinkertaisempi empty state valmentajan näkymään (Master v8).
     * Näytetään kun joukkueessa ei vielä ole pelaajia.
     *
     * @param {string} kontaineriId - HTML-elementin ID
     * @param {string} joukkueNimi
     * @param {function} onSiirrySeura - Callback "Siirry Seura-näkymään" -napista
     */
    valmentajaTyhja(kontaineriId, joukkueNimi, onSiirrySeura) {
      const kontaineri = document.getElementById(kontaineriId);
      if (!kontaineri) return;
      kontaineri.innerHTML = _rakennaValmentajaTyhja(joukkueNimi);
      const btn = kontaineri.querySelector("#tm-es-siirry-seura");
      if (btn && onSiirrySeura) btn.addEventListener("click", onSiirrySeura);
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SEURAN EMPTY STATE — kolmivaiheinen onboarding-ohjain
  // ─────────────────────────────────────────────────────────────────────────
  function _rakennaSeuraTyhja(stats, options) {
    const seuraNimi = options?.seuraNimi || "Seuranne";

    // Tunnistetaan missä vaiheessa seura on
    const seuraavaVaihe = ONBOARDING_VAIHEET.find(v => !v.valmis(stats)) || null;
    const valmiitVaiheet = ONBOARDING_VAIHEET.filter(v => v.valmis(stats)).length;

    const vaiheKortit = ONBOARDING_VAIHEET.map(v => {
      const valmis = v.valmis(stats);
      const aktiivinen = seuraavaVaihe?.id === v.id;
      return `
        <div class="tm-es-vaihe ${valmis ? "tm-es-valmis" : ""} ${aktiivinen ? "tm-es-aktiivinen" : ""}">
          <div class="tm-es-vaihe-vasen">
            <div class="tm-es-vaihe-nro">${valmis ? "✓" : v.nro}</div>
          </div>
          <div class="tm-es-vaihe-oikea">
            <div class="tm-es-vaihe-otsikko">${v.otsikko}</div>
            <div class="tm-es-vaihe-kuvaus">${v.kuvaus}</div>
            ${aktiivinen ? `
            <div class="tm-es-vaihe-toiminto">
              <button class="tm-es-btn-toiminto" data-toiminto="${v.toimintoId}">
                ${v.toiminto}
              </button>
              <span class="tm-es-aika">${v.aika}</span>
            </div>` : ""}
          </div>
        </div>`;
    }).join("");

    const edistymisProsentti = Math.round((valmiitVaiheet / ONBOARDING_VAIHEET.length) * 100);

    return `
      <div class="tm-es-wrapper" id="tm-es-root">

        <!-- Tervetuloa-header -->
        <div class="tm-es-header">
          <div class="tm-es-eyebrow">Tervetuloa TalentMasteriin</div>
          <div class="tm-es-paaOtsikko">${seuraNimi}</div>
          <div class="tm-es-alaotsikko">
            Järjestelmä on valmis. Alla olevat kolme vaihetta käynnistävät
            seuran toiminnan — ensimmäiset pelaajat rekisteröityinä ja
            valmentajat kirjautuneet sisään.
          </div>
        </div>

        <!-- Edistymispalkki -->
        <div class="tm-es-edistyminen">
          <div class="tm-es-edistymis-teksti">
            <span>${valmiitVaiheet} / ${ONBOARDING_VAIHEET.length} vaihetta valmis</span>
            <span>${edistymisProsentti}%</span>
          </div>
          <div class="tm-es-palkki-tausta">
            <div class="tm-es-palkki-tila" style="width: ${edistymisProsentti}%"></div>
          </div>
        </div>

        <!-- Vaiheet -->
        <div class="tm-es-vaiheet">
          ${vaiheKortit}
        </div>

        <!-- Tuki-kortti — TalentMasterin kilpailuetu pilotin aikana -->
        <div class="tm-es-tuki-kortti">
          <div class="tm-es-tuki-ikoni">◎</div>
          <div class="tm-es-tuki-sisalto">
            <div class="tm-es-tuki-otsikko">Henkilökohtainen tuki käynnistyksen aikana</div>
            <div class="tm-es-tuki-kuvaus">
              Pilotin aikana saat suoran tuen käyttöönotossa.
              Ota yhteyttä jos jokin jää epäselväksi —
              vastaus yleensä saman päivän aikana.
            </div>
            <a href="mailto:talentmasterid@gmail.com" class="tm-es-tuki-linkki">
              talentmasterid@gmail.com
            </a>
          </div>
        </div>

      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VALMENTAJAN EMPTY STATE — yksinkertaisempi, tehtäväorientoitunut
  // ─────────────────────────────────────────────────────────────────────────
  function _rakennaValmentajaTyhja(joukkueNimi) {
    return `
      <div class="tm-es-wrapper">
        <div class="tm-es-header" style="text-align:left;max-width:420px;">
          <div class="tm-es-eyebrow">Ei pelaajia vielä</div>
          <div class="tm-es-paaOtsikko" style="font-size:clamp(22px,4vw,32px);">${joukkueNimi || "Joukkue"}</div>
          <div class="tm-es-alaotsikko">
            Pelaajat ilmestyvät tähän kun VP tai sihteeri on rekisteröinyt heidät
            ja huoltajat ovat antaneet suostumuksen. Et tarvitse tehdä mitään —
            järjestelmä ilmoittaa kun pelaajia on tulossa.
          </div>
        </div>
        <div class="tm-es-valmentaja-toiminnot">
          <button class="tm-es-btn-ghost" id="tm-es-siirry-seura">
            ← Siirry Seura-näkymään
          </button>
        </div>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KUUNTELIJAT — napit ja toiminnot
  // ─────────────────────────────────────────────────────────────────────────
  function _lisaaKuuntelijat(kontaineri, options) {
    kontaineri.querySelectorAll("[data-toiminto]").forEach(btn => {
      btn.addEventListener("click", () => {
        const toiminto = btn.dataset.toiminto;

        if (toiminto === "tm-es-lataa-pohja") {
          // Käynnistää Excel-pohjan latauksen
          if (typeof options?.onLataaExcel === "function") {
            options.onLataaExcel();
          }
          return;
        }

        // Tab-siirtymät (Joukkueet-välilehti, Henkilöstö-välilehti jne.)
        if (toiminto.startsWith("tab-")) {
          if (typeof options?.onTabSiirry === "function") {
            options.onTabSiirry(toiminto.replace("tab-", ""));
          } else {
            // Fallback: etsitään tab-nappi DOM:ista nimellä
            const tabNappi = document.querySelector(`[data-tab="${toiminto.replace("tab-", "")}"]`);
            if (tabNappi) tabNappi.click();
          }
        }
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TYYLIT — TalentMasterin värimaailma
  // ─────────────────────────────────────────────────────────────────────────
  function _lisaaTyylit() {
    if (document.getElementById("tm-es-css")) return;
    const s = document.createElement("style");
    s.id = "tm-es-css";
    s.textContent = `
      .tm-es-wrapper {
        max-width: 560px; margin: 0 auto; padding: 40px 20px 60px;
        font-family: 'DM Sans','Inter',system-ui,sans-serif;
      }

      /* ── HEADER ── */
      .tm-es-header { text-align: center; margin-bottom: 36px; }
      .tm-es-eyebrow {
        font-size: 10px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase;
        color: #4A7ED9; margin-bottom: 12px;
        display: flex; align-items: center; justify-content: center; gap: 10px;
      }
      .tm-es-eyebrow::before, .tm-es-eyebrow::after {
        content: ''; width: 24px; height: 1px; background: #4A7ED9; opacity: 0.5;
      }
      .tm-es-paaOtsikko {
        font-size: clamp(28px, 5vw, 42px); font-weight: 700;
        color: #E8EEF8; letter-spacing: -0.5px; margin-bottom: 14px; line-height: 1.1;
      }
      .tm-es-alaotsikko { font-size: 14px; color: rgba(232,238,248,0.45); line-height: 1.7; max-width: 400px; margin: 0 auto; }

      /* ── EDISTYMISPALKKI ── */
      .tm-es-edistyminen { margin-bottom: 28px; }
      .tm-es-edistymis-teksti {
        display: flex; justify-content: space-between;
        font-size: 10px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;
        color: rgba(232,238,248,0.3); margin-bottom: 6px;
      }
      .tm-es-palkki-tausta { height: 3px; background: rgba(232,238,248,0.07); border-radius: 2px; }
      .tm-es-palkki-tila { height: 100%; background: #4A7ED9; border-radius: 2px; transition: width 0.6s ease; }

      /* ── VAIHEET ── */
      .tm-es-vaiheet { display: flex; flex-direction: column; gap: 2px; margin-bottom: 32px; }
      .tm-es-vaihe {
        display: flex; gap: 16px; padding: 18px 20px;
        background: rgba(232,238,248,0.02);
        border: 1px solid rgba(232,238,248,0.06);
        border-radius: 10px; transition: border-color 0.2s, background 0.2s;
      }
      .tm-es-vaihe.tm-es-valmis {
        background: rgba(62,201,167,0.04); border-color: rgba(62,201,167,0.15);
        opacity: 0.7;
      }
      .tm-es-vaihe.tm-es-aktiivinen {
        background: rgba(74,126,217,0.06); border-color: rgba(74,126,217,0.25);
        box-shadow: 0 0 0 1px rgba(74,126,217,0.1);
      }
      .tm-es-vaihe-vasen { flex-shrink: 0; padding-top: 2px; }
      .tm-es-vaihe-nro {
        width: 26px; height: 26px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; font-weight: 700;
        background: rgba(74,126,217,0.12); border: 1px solid rgba(74,126,217,0.25);
        color: #4A7ED9;
      }
      .tm-es-vaihe.tm-es-valmis .tm-es-vaihe-nro {
        background: rgba(62,201,167,0.12); border-color: rgba(62,201,167,0.3); color: #3EC9A7;
      }
      .tm-es-vaihe-oikea { flex: 1; min-width: 0; }
      .tm-es-vaihe-otsikko { font-size: 13px; font-weight: 700; color: #E8EEF8; margin-bottom: 4px; }
      .tm-es-vaihe.tm-es-valmis .tm-es-vaihe-otsikko { color: rgba(232,238,248,0.5); }
      .tm-es-vaihe-kuvaus { font-size: 12px; color: rgba(232,238,248,0.38); line-height: 1.55; }
      .tm-es-vaihe-toiminto { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
      .tm-es-btn-toiminto {
        background: #4A7ED9; color: #fff; border: none; border-radius: 6px;
        padding: 8px 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
        cursor: pointer; transition: background 0.15s, transform 0.1s;
        white-space: nowrap;
      }
      .tm-es-btn-toiminto:hover { background: #3A6EC9; transform: translateY(-1px); }
      .tm-es-aika { font-size: 10px; color: rgba(232,238,248,0.25); font-weight: 600; letter-spacing: 0.5px; }

      /* ── TUKI-KORTTI ── */
      .tm-es-tuki-kortti {
        display: flex; gap: 16px; padding: 20px;
        background: rgba(74,126,217,0.05); border: 1px solid rgba(74,126,217,0.13);
        border-radius: 10px;
      }
      .tm-es-tuki-ikoni { font-size: 20px; color: rgba(74,126,217,0.5); flex-shrink: 0; padding-top: 2px; }
      .tm-es-tuki-otsikko { font-size: 12px; font-weight: 700; color: rgba(232,238,248,0.7); margin-bottom: 6px; }
      .tm-es-tuki-kuvaus { font-size: 11px; color: rgba(232,238,248,0.35); line-height: 1.6; margin-bottom: 8px; }
      .tm-es-tuki-linkki { font-size: 11px; font-weight: 600; color: #4A7ED9; text-decoration: none; }
      .tm-es-tuki-linkki:hover { text-decoration: underline; }

      /* ── GHOST NAPPI ── */
      .tm-es-btn-ghost {
        background: none; border: 1px solid rgba(232,238,248,0.1); border-radius: 6px;
        padding: 9px 16px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
        color: rgba(232,238,248,0.3); cursor: pointer; transition: all 0.15s;
      }
      .tm-es-btn-ghost:hover { border-color: rgba(232,238,248,0.2); color: rgba(232,238,248,0.6); }
      .tm-es-valmentaja-toiminnot { margin-top: 24px; }

      /* ── MOBIILI ── */
      @media (max-width: 600px) {
        .tm-es-wrapper { padding: 28px 16px 48px; }
        .tm-es-vaihe { padding: 14px 14px; gap: 12px; }
        .tm-es-vaihe-toiminto { flex-direction: column; align-items: flex-start; gap: 8px; }
      }
    `;
    document.head.appendChild(s);
  }

  // Injektoidaan tyylit heti kun skripti latautuu
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _lisaaTyylit);
  } else {
    _lisaaTyylit();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIENTI GLOBAALIIN NIMIAVARUUTEEN
  // ─────────────────────────────────────────────────────────────────────────
  global.TMEmptyState = TMEmptyState;

})(window);
