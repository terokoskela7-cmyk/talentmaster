// ============================================================
// tm_ai.js — TalentMaster Provider-Agnostic AI Layer v2.1
// ============================================================
// Selain kutsuu AINA tätä kerrosta — ei suoria API-kutsuja.
// Provider valitaan Cloud Functionin ympäristömuuttujalla.
// API-avaimet eivät koskaan näy selaimessa.
//
// KORJAUKSET v2.0 → v2.1:
//   #1  PROXY_URL: talentmaster-prod → talentmaster-pilot (oikea projekti)
//   #2  model: claude-opus-4-6 → claude-sonnet-4-5 (oikea malli, kustannustehokas)
//   #3  CORS: lisätty terokoskela7-cmyk.github.io (nykyinen frontend)
//   #4  Pohjoismaiset domainit valmiina laajentumista varten
// ============================================================

const TM_AI = (() => {

  // ----------------------------------------------------------
  // KONFIGURAATIO
  // ----------------------------------------------------------
  const CONFIG = {
    // KRIITTINEN: talentmaster-pilot — ei talentmaster-prod (ei ole olemassa)
    PROXY_URL: 'https://europe-west1-talentmaster-pilot.cloudfunctions.net/aiProxy',
    TIMEOUT_MS: 15000,
    RETRY_COUNT: 2,
    RETRY_DELAY_MS: 800,
    VERSION: '2.1.0'
  };

  // ----------------------------------------------------------
  // TEHTÄVÄTYYPIT
  // UI kutsuu tehtävää nimellä, ei koskaan provider-nimellä.
  // Backend valitsee providerin — provider on UI:lle näkymätön.
  // ----------------------------------------------------------
  const TASK = {
    PLAYER_NARRATIVE:  'player_narrative',  // Anthropic — behavioural science
    COACH_INSIGHT:     'coach_insight',      // Anthropic — pedagoginen analyysi
    GAME_VISION:       'game_vision',        // OpenAI GPT-4o vision
    VOICE_TRANSCRIBE:  'voice_transcribe',   // OpenAI Whisper
    FLEI_DIAGNOSIS:    'flei_diagnosis',     // Anthropic — ketjuanalyysi
    STREAK_NUDGE:      'streak_nudge',       // Gemini Flash — micro-copy
    PARENT_SUMMARY:    'parent_summary',     // Anthropic — vanhemmalle
    DRILL_SUGGEST:     'drill_suggest',      // Gemini Pro — harjoitesuositus
    RETURN_WELCOME:    'return_welcome',     // Anthropic — paluunarratiivi
    WEEKLY_STORY:      'weekly_story',       // Anthropic — viikkonarratiivi
  };

  // ----------------------------------------------------------
  // VIRHELUOKKA — strukturoitu virheenhallinta
  // ----------------------------------------------------------
  class TMError extends Error {
    constructor(code, message, retryable = false) {
      super(message);
      this.code = code;
      this.retryable = retryable;
      this.name = 'TMError';
    }
  }

  // ----------------------------------------------------------
  // VÄLIMUISTI — toistuvat kutsut eivät kuormita Firestore/AI
  // Avain = tehtävä + payload-hash, TTL per tehtävätyyppi
  // ----------------------------------------------------------
  const _cache = new Map();

  function _cacheKey(task, payload) {
    return task + ':' + JSON.stringify(payload);
  }

  function _getCached(key, ttlMs) {
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > ttlMs) { _cache.delete(key); return null; }
    return entry.data;
  }

  function _setCached(key, data) {
    _cache.set(key, { data, ts: Date.now() });
  }

  // ----------------------------------------------------------
  // APUFUNKTIOT
  // ----------------------------------------------------------
  function _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Välimuistin tyhjennys — kutsutaan uloskirjautumisen yhteydessä
  function clearCache() { _cache.clear(); }

  // ----------------------------------------------------------
  // SISÄINEN: autentikoitu fetch Firebase ID-tokenilla
  // Cloud Function validoi tokenin — ei sessioevästeitä
  // ----------------------------------------------------------
  async function _authedFetch(payload, signal) {
    const user = firebase.auth().currentUser;
    if (!user) throw new TMError('AUTH_REQUIRED', 'Kirjaudu ensin sisään', false);

    // getIdToken(false) käyttää välimuistia — Firebase uusii automaattisesti
    const token = await user.getIdToken(false);

    const res = await fetch(CONFIG.PROXY_URL, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type':    'application/json',
        'Authorization':   'Bearer ' + token,
        'X-TM-Version':    CONFIG.VERSION,
        'X-TM-UID':        user.uid
      },
      body: JSON.stringify({
        ...payload,
        _meta: { uid: user.uid, ts: Date.now(), version: CONFIG.VERSION }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const retryable = res.status >= 500 || res.status === 429;
      throw new TMError(
        err.code    || 'HTTP_' + res.status,
        err.message || 'Verkkovirhe ' + res.status,
        retryable
      );
    }

    return res.json();
  }

  // ----------------------------------------------------------
  // SISÄINEN: retry-wrapper eksponentiaalisella viiveellä
  // ----------------------------------------------------------
  async function _fetchWithRetry(payload, options) {
    const maxRetries = (options && options.retries != null) ? options.retries : CONFIG.RETRY_COUNT;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await _authedFetch(payload, controller.signal);
        clearTimeout(timeout);
        return result;
      } catch (err) {
        lastError = err;
        if (!err.retryable || attempt === maxRetries) break;
        await _sleep(CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }

    clearTimeout(timeout);
    throw lastError;
  }

  // ----------------------------------------------------------
  // JULKINEN API — ainoa rajapinta jonka UI koskaan näkee
  // ----------------------------------------------------------

  /**
   * Pääkutsumetodi — kaikki AI-kutsut tämän kautta.
   * UI ei koskaan tiedä mitä provideria käytetään taustalla.
   *
   * @param {string} task    — TASK-vakio, esim. TM_AI.TASK.WEEKLY_STORY
   * @param {object} data    — tehtäväkohtainen payload
   * @param {object} options — { cache: bool, cacheTtl: ms, retries: n }
   * @returns {object}       — { text: string, ...muut kentät }
   */
  async function call(task, data, options) {
    data    = data    || {};
    options = options || {};

    const useCache = options.cache || false;
    const cacheKey = _cacheKey(task, data);

    if (useCache) {
      const cached = _getCached(cacheKey, options.cacheTtl || 300000);
      if (cached) return cached;
    }

    const result = await _fetchWithRetry({ task, data }, options);
    if (useCache) _setCached(cacheKey, result);
    return result;
  }

  // ----------------------------------------------------------
  // ERIKOISTUNEET METODIT — kutsu TASK-nimen eikä call():n kautta
  // Jokainen metodi dokumentoi milloin sitä käytetään UX-periaatteiden
  // mukaisesti (behavioural science -dokumentin mukaan)
  // ----------------------------------------------------------

  /**
   * WEEKLY_STORY — Viikkonarratiivi
   * Käytetään: lauantaina/sunnuntaina viikkonäkymässä.
   * Näkyy kultareunaisessa kortissa. Max 5 lausetta.
   * Ei koskaan syyllistä — pelkkä tarina.
   */
  async function weeklyStory(playerData) {
    return call(TASK.WEEKLY_STORY, {
      feelings:    playerData.feelings,              // [{day, emoji, rpe}]
      streakWeeks: playerData.streakWeeks,
      ageGroup:    playerData.ageGroup,              // 'leikkija'|'rakentaja'|'showcase'
      language:    playerData.language || 'fi'
    }, { cache: true, cacheTtl: 3600000 });          // 1h — narratiivi ei muutu tunnissa
  }

  /**
   * RETURN_WELCOME — Paluunarratiivi tauon jälkeen
   * Käytetään: kun pelaaja avaa appin 7+ päivän hiljaisuuden jälkeen.
   * KRIITTISIN yksittäinen AI-hetki koko ekosysteemissä.
   * Ei koskaan mainitse poissaoloaikaa negatiivisesti.
   * Max 3 lausetta. Aina tuore — ei cachea.
   */
  async function returnWelcome(playerData) {
    return call(TASK.RETURN_WELCOME, {
      lastFeeling: playerData.lastFeeling,           // viimeisin emoji ennen taukoa
      lastRpe:     playerData.lastRpe,
      daysSince:   playerData.daysSince,             // backend käyttää, UI ei näytä
      language:    playerData.language || 'fi'
    }, { cache: false });
  }

  /**
   * STREAK_NUDGE — Micro-copy putkivaarassa
   * Käytetään: VAIN kun putki vaarassa (3 pv ilman kirjausta).
   * EI päivittäiseen käyttöön. Behavioural science: hiljaisuus on
   * design-valinta — AI puhuu vain kolmessa tilanteessa.
   * Max 12 sanaa.
   */
  async function streakNudge(playerData) {
    return call(TASK.STREAK_NUDGE, {
      streakWeeks:  playerData.streakWeeks,
      lastActivity: playerData.lastActivity,
      ageGroup:     playerData.ageGroup,
      language:     playerData.language || 'fi'
    }, { cache: false });
  }

  /**
   * PARENT_SUMMARY — Vanhempien viikkoyhteenveto
   * Käytetään: sunnuntaisin vanhemman näkymässä.
   * Tarina, ei tilasto: "Eetu kirjasi kolme treeniä".
   * GDPR: ei paljasta muiden pelaajien tietoja.
   */
  async function parentSummary(data) {
    return call(TASK.PARENT_SUMMARY, {
      playerName:     data.playerName,
      weeklyFeelings: data.weeklyFeelings,
      sessionsLogged: data.sessionsLogged,
      coachNote:      data.coachNote || null,
      language:       data.language  || 'fi'
    }, { cache: true, cacheTtl: 3600000 });
  }

  /**
   * FLEI_DIAGNOSIS — Ketjuanalyysi
   * Käytetään: kun FLEI-data päivittyy (ei jokaisen kirjauksen yhteydessä).
   * Heikoin ketju = S-training kohde, ei rangaistus.
   * 24h cache — FLEI ei muutu tunnissa.
   */
  async function fleiDiagnosis(fleiData) {
    return call(TASK.FLEI_DIAGNOSIS, {
      sbl:      fleiData.sbl,
      sfl:      fleiData.sfl,
      ll:       fleiData.ll,
      diag:     fleiData.diag,
      dfl:      fleiData.dfl,
      ageGroup: fleiData.ageGroup,
      language: fleiData.language || 'fi'
    }, { cache: true, cacheTtl: 86400000 });          // 24h
  }

  /**
   * COACH_INSIGHT — Valmentajan pedagoginen analyysi
   * Käytetään: valmentajan näkymässä ryhmätason analyysiin.
   * Ei koskaan nimeä yksittäistä pelaajaa heikkona.
   */
  async function coachInsight(squadData) {
    return call(TASK.COACH_INSIGHT, {
      players:     squadData.players,                // [{uid, ageGroup, recentFeelings, rpe}]
      sessionType: squadData.sessionType,
      focusArea:   squadData.focusArea,
      language:    squadData.language || 'fi'
    }, { cache: true, cacheTtl: 1800000 });           // 30 min
  }

  /**
   * DRILL_SUGGEST — Harjoitesuositus
   * Käytetään: IDP-kortissa tai harjoitusnäkymässä.
   * Perustuu FLEI-heikkouteen, ei rankingiin.
   */
  async function drillSuggest(playerData) {
    return call(TASK.DRILL_SUGGEST, {
      weakestChain: playerData.weakestChain,
      ageGroup:     playerData.ageGroup,
      recentDrills: playerData.recentDrills || [],
      language:     playerData.language      || 'fi'
    }, { cache: true, cacheTtl: 43200000 });          // 12h
  }

  /**
   * TRANSCRIBE_VOICE — Äänikirjaus (OpenAI Whisper proxyn kautta)
   * Käytetään: Hetki 2 (treenin aikana, vapaaehtoinen snapshot).
   * Ääni lähetetään base64-enkoodattuna — API-avain pysyy proxyssä.
   */
  async function transcribeVoice(audioBlob, language) {
    const base64 = await _blobToBase64(audioBlob);
    return call(TASK.VOICE_TRANSCRIBE, {
      audio:    base64,
      mimeType: audioBlob.type,
      language: language || 'fi'
    }, { cache: false });
  }

  /**
   * ANALYZE_GAME_VISION — Pelivision analyysi (OpenAI GPT-4o)
   * Käytetään: ADAR-kortin yhteydessä videoframesta tai kuvasta.
   */
  async function analyzeGameVision(imageBase64, context) {
    context = context || {};
    return call(TASK.GAME_VISION, {
      image:          imageBase64,
      playerPosition: context.position,
      drillType:      context.drillType,
      language:       context.language || 'fi'
    }, { cache: false });
  }

  // ----------------------------------------------------------
  // JULKINEN API
  // ----------------------------------------------------------
  return {
    TASK,
    call,
    weeklyStory,
    returnWelcome,
    streakNudge,
    parentSummary,
    fleiDiagnosis,
    coachInsight,
    drillSuggest,
    transcribeVoice,
    analyzeGameVision,
    clearCache
  };

})();
