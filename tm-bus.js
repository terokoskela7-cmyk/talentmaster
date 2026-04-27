/**
 * TalentMaster Event Bus (tm-bus.js)
 * ------------------------------------------------------------
 * Jaettu realtime-state kolmen näkymän välillä:
 *   Pelaaja (player)  ·  Perhe (family)  ·  Valmentaja (coach)  ·  VP (vp)
 *
 * Tuotantokäytössä tämä korvataan Firestore-listenereillä.
 * Demo-käytössä käytämme localStorage + BroadcastChannel + postMessage
 * jotta sama viesti tavoittaa:
 *   - saman selaimen eri välilehdet (BroadcastChannel + storage event)
 *   - saman sivun iframet (postMessage)
 *   - saman sivun sisaret (custom event)
 *
 * MULTITENANCY (ADR-004):
 *   Storage-avain ja BroadcastChannel on scopattu seuran mukaan:
 *     tm_bus_v2__<seuraId>   (localStorage)
 *     tm_bus__<seuraId>      (BroadcastChannel)
 *   Seuran vaihto → täysin eri fyysinen tila. Eri seurat eivät koskaan
 *   jaa samaa tallennuspaikkaa.
 *
 *   Seuran määrittäminen:
 *     <script>window.__TM_SEURA = 'kpv';</script>
 *     <script src="tm-bus.js"></script>
 *   Jos määrittämätön → fallback 'kpv' (demon oletusseura).
 *
 *   Jokainen tapahtuma saa `seuraId`-kentän automaattisesti.
 *   Kuluttajat varmistavat `evt.seuraId === nykyinenSeura` (turvaverkko).
 *
 * Käyttö:
 *   TMBus.ready().then(() => {
 *     TMBus.subscribe('training', (evt) => render(evt));
 *     TMBus.publish('training', { playerId:'eemeli', minutes:45, ... });
 *     const state = TMBus.getState();
 *   });
 *
 * Tapahtumatyypit:
 *   training      — pelaaja kirjasi omatoimisen harjoittelun
 *   parent_log    — vanhempi kirjasi lapsen puolesta (U12)
 *   coach_message — valmentaja lähetti viestin pelaajalle
 *   coach_react   — valmentaja reagoi kirjaukseen
 *   challenge     — haaste annettu / vastaanotettu / suoritettu
 *   injury        — loukkaantumiskirjaus
 *   seen          — joku näki tapahtuman (read-receipts)
 *   presence      — näkymä avattiin / suljettiin
 *   (+ VP-tapahtumat via vp-bus-adapter.js)
 */

(function (global) {
  'use strict';

  const VERSION = '2.0.0';          // 2.x = multitenant
  const STORAGE_PREFIX = 'tm_bus_v2__';
  const CHANNEL_PREFIX = 'tm_bus__';
  const LEGACY_KEY = 'tm_bus_v1';   // migraatio 1.x → 2.x
  const MAX_EVENTS = 200;
  const DEFAULT_SEURA = 'kpv';

  // ──────────────────────────────────────────────────────────
  // Seura-konteksti (ADR-004, Taso 1)
  // ──────────────────────────────────────────────────────────
  function resolveSeuraId() {
    const fromGlobal = global.__TM_SEURA;
    if (fromGlobal && typeof fromGlobal === 'string' && fromGlobal.length) return fromGlobal;
    // Fallback: demo-yhteensopivuus. Tuotannossa pitäisi heittää virhe.
    if (!global.__TM_SEURA_WARNED) {
      console.warn('[TMBus] window.__TM_SEURA ei asetettu — käytetään oletusseuraa "' + DEFAULT_SEURA + '". Tuotannossa pakollinen.');
      global.__TM_SEURA_WARNED = true;
    }
    return DEFAULT_SEURA;
  }

  let currentSeura = resolveSeuraId();
  let STORAGE_KEY = STORAGE_PREFIX + currentSeura;
  let CHANNEL_NAME = CHANNEL_PREFIX + currentSeura;

  // ──────────────────────────────────────────────────────────
  // Seed-data seurakohtaisesti.
  // Tuotannossa nämä tulevat Firestoren /seurat/{seuraId}-kokoelmasta.
  // ──────────────────────────────────────────────────────────
  const SEEDS = {
    kpv: {
      team: {
        id: 'kpv-u15',
        name: 'KPV U15',
        seurName: 'Kokkolan Palloveikot',
        vk: 17,
        vkTotal: 40
      },
      coach: {
        id: 'mika',
        name: 'Mika Virtanen',
        initials: 'MV',
        role: 'Päävalmentaja'
      },
      players: [
        { id:'eemeli',  name:'Eemeli Korhonen',   age:11, ageBand:'u12', num:7,  stage:'Leikkijä',  card:82, streak:14, flags:[] },
        { id:'aino',    name:'Aino Mäkinen',      age:14, ageBand:'u15', num:11, stage:'Rakentaja', card:87, streak:23, flags:['xfactor'] },
        { id:'joonas',  name:'Joonas Rantanen',   age:17, ageBand:'u19', num:9,  stage:'Showcase',  card:91, streak:47, flags:['xfactor','gem'] },
        { id:'venla',   name:'Venla Laine',       age:14, ageBand:'u15', num:4,  stage:'Rakentaja', card:79, streak:6,  flags:[] },
        { id:'niklas',  name:'Niklas Aho',        age:13, ageBand:'u15', num:8,  stage:'Rakentaja', card:74, streak:0,  flags:['risk'] },
        { id:'lauri',   name:'Lauri Seppälä',     age:12, ageBand:'u12', num:3,  stage:'Leikkijä',  card:77, streak:9,  flags:[] },
        { id:'elina',   name:'Elina Virtanen',    age:15, ageBand:'u15', num:14, stage:'Rakentaja', card:84, streak:19, flags:['xfactor'] },
        { id:'oskari',  name:'Oskari Heino',      age:13, ageBand:'u15', num:6,  stage:'Rakentaja', card:72, streak:3,  flags:[] },
        { id:'milla',   name:'Milla Salo',        age:11, ageBand:'u12', num:10, stage:'Leikkijä',  card:80, streak:11, flags:[] },
        { id:'teemu',   name:'Teemu Koski',       age:14, ageBand:'u15', num:2,  stage:'Rakentaja', card:76, streak:7,  flags:[] },
        { id:'iina',    name:'Iina Kallio',       age:12, ageBand:'u12', num:12, stage:'Leikkijä',  card:75, streak:0,  flags:['risk'] },
        { id:'matias',  name:'Matias Juntunen',   age:14, ageBand:'u15', num:5,  stage:'Rakentaja', card:81, streak:15, flags:[] },
      ],
      focusPlayerId: 'eemeli',
      activeRole: 'player'
    },
    // Toinen seura — todistaa että scoping toimii. Täysin eri pelaajat.
    hjk: {
      team: {
        id: 'hjk-u15',
        name: 'HJK U15',
        seurName: 'Helsingin Jalkapalloklubi',
        vk: 17,
        vkTotal: 40
      },
      coach: {
        id: 'sami',
        name: 'Sami Hakanen',
        initials: 'SH',
        role: 'Päävalmentaja'
      },
      players: [
        { id:'aatu',    name:'Aatu Laakso',       age:14, ageBand:'u15', num:10, stage:'Rakentaja', card:85, streak:28, flags:['xfactor'] },
        { id:'robin',   name:'Robin Nyman',       age:14, ageBand:'u15', num:7,  stage:'Rakentaja', card:83, streak:12, flags:[] },
        { id:'kasper',  name:'Kasper Björk',      age:13, ageBand:'u15', num:4,  stage:'Rakentaja', card:78, streak:9,  flags:[] },
        { id:'topi',    name:'Topi Salonen',      age:14, ageBand:'u15', num:9,  stage:'Rakentaja', card:89, streak:35, flags:['xfactor','gem'] },
        { id:'leo',     name:'Leo Manner',        age:13, ageBand:'u15', num:6,  stage:'Rakentaja', card:75, streak:4,  flags:[] },
        { id:'aleksi',  name:'Aleksi Reinikainen', age:14, ageBand:'u15', num:11, stage:'Rakentaja', card:82, streak:18, flags:[] },
      ],
      focusPlayerId: 'aatu',
      activeRole: 'player'
    }
  };

  function getSeed(seuraId) {
    return SEEDS[seuraId] || SEEDS[DEFAULT_SEURA];
  }

  // ──────────────────────────────────────────────────────────
  // Ajan apufunktiot
  // ──────────────────────────────────────────────────────────
  function nowISO() { return new Date().toISOString(); }
  function uid() { return 'e_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  function ts() { return Date.now(); }

  // Muodosta siemen-historia (72h taakse) jotta näkymissä on sisältöä heti
  function seedHistory(seuraId) {
    const now = ts();
    const seed = getSeed(seuraId);
    const h = (minutesAgo, evt) => ({
      ...evt,
      id: uid(),
      t: now - minutesAgo * 60000,
      seuraId,
      seenBy: []
    });

    if (seuraId === 'kpv') {
      return [
        h(60 * 72, { type:'training', playerId:'aino', source:'self', tyyppi:'pihapeli', minutes:40, fiilis:4, kavereita:2, note:'Koulun jälkeen' }),
        h(60 * 70, { type:'coach_react', playerId:'aino', emoji:'💪', coachId:'mika' }),
        h(60 * 48, { type:'training', playerId:'eemeli', source:'parent', tyyppi:'pihapeli', minutes:45, fiilis:5, kavereita:3, note:'Naapurin Jaakon ja Lauran kanssa' }),
        h(60 * 47, { type:'coach_react', playerId:'eemeli', emoji:'❤️', coachId:'mika' }),
        h(60 * 46, { type:'training', playerId:'joonas', source:'self', tyyppi:'oma-keho', minutes:60, fiilis:4, note:'Voimasali' }),
        h(60 * 26, { type:'training', playerId:'milla',  source:'self', tyyppi:'pihapeli', minutes:30, fiilis:4, kavereita:1 }),
        h(60 * 24, { type:'training', playerId:'elina',  source:'self', tyyppi:'pallo-yksin', minutes:25, fiilis:3 }),
        h(60 * 22, { type:'coach_message', playerId:'eemeli', coachId:'mika', text:'Hyvä kun Eemeli oli pihalla! Ei välttämätöntä kirjata kaikkea — rentous on tärkeintä tässä iässä.', channel:'family' }),
        h(60 * 20, { type:'challenge', playerId:'lauri', fromPlayerId:'eemeli', status:'accepted', title:'3 pihaharjoitusta · viikon teema' }),
        h(60 * 18, { type:'training', playerId:'matias', source:'self', tyyppi:'kaveri', minutes:50, fiilis:5, kavereita:1 }),
        h(60 * 8,  { type:'training', playerId:'aino',   source:'self', tyyppi:'oma-keho', minutes:35, fiilis:4 }),
        h(60 * 5,  { type:'training', playerId:'lauri',  source:'self', tyyppi:'pihapeli', minutes:40, fiilis:5, kavereita:2 }),
        h(60 * 4,  { type:'coach_react', playerId:'lauri', emoji:'🔥', coachId:'mika' }),
        h(60 * 3,  { type:'challenge', playerId:'aino',  status:'completed', title:'Keksi 3 erilaista harjoitusta', reps:3 }),
        h(60 * 2,  { type:'training', playerId:'elina',  source:'self', tyyppi:'pihapeli', minutes:30, fiilis:4, kavereita:3 }),
      ].sort((a, b) => a.t - b.t);
    }

    if (seuraId === 'hjk') {
      return [
        h(60 * 50, { type:'training', playerId:'aatu',   source:'self', tyyppi:'pallo-yksin', minutes:35, fiilis:5 }),
        h(60 * 48, { type:'coach_react', playerId:'aatu', emoji:'🔥', coachId:'sami' }),
        h(60 * 30, { type:'training', playerId:'topi',   source:'self', tyyppi:'kaveri', minutes:60, fiilis:5, kavereita:2 }),
        h(60 * 26, { type:'coach_message', playerId:'topi', coachId:'sami', text:'Hyvä teho tänään. Näkyy jo vastustajan painostuksessa.', channel:'player' }),
        h(60 * 10, { type:'training', playerId:'robin',  source:'self', tyyppi:'oma-keho', minutes:40, fiilis:4 }),
        h(60 * 6,  { type:'training', playerId:'aleksi', source:'self', tyyppi:'pihapeli', minutes:45, fiilis:4, kavereita:3 }),
      ].sort((a, b) => a.t - b.t);
    }

    return [];
  }

  // ──────────────────────────────────────────────────────────
  // Migraatio v1 → v2 (ADR-004)
  // ──────────────────────────────────────────────────────────
  function migrateLegacy() {
    try {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (!legacy) return;
      const kpvKey = STORAGE_PREFIX + 'kpv';
      if (localStorage.getItem(kpvKey)) return; // jo migroitu
      // v1-data oli aina KPV:tä
      localStorage.setItem(kpvKey, legacy);
      localStorage.removeItem(LEGACY_KEY);
      console.info('[TMBus] migroitu: ' + LEGACY_KEY + ' → ' + kpvKey);
    } catch (e) { /* ohita */ }
  }
  migrateLegacy();

  // ──────────────────────────────────────────────────────────
  // State storage
  // ──────────────────────────────────────────────────────────
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Sanity-check: jos tallennettu seuraId ei täsmää, hylkää
      if (parsed.seuraId && parsed.seuraId !== currentSeura) {
        console.warn('[TMBus] storage mismatch — hylätään');
        return null;
      }
      return parsed;
    } catch (e) { return null; }
  }

  function saveState(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) { /* quota */ }
  }

  function initState() {
    const existing = loadState();
    if (existing && existing.version === VERSION) return existing;
    const seed = getSeed(currentSeura);
    const fresh = {
      version: VERSION,
      seuraId: currentSeura,
      initialized: nowISO(),
      seed,
      events: seedHistory(currentSeura),
      activeRole: seed.activeRole || 'player',
      focusPlayerId: seed.focusPlayerId
    };
    saveState(fresh);
    return fresh;
  }

  let state = initState();

  // ──────────────────────────────────────────────────────────
  // Kanavat
  // ──────────────────────────────────────────────────────────
  let bc = null;
  function openChannel() {
    try { bc = new BroadcastChannel(CHANNEL_NAME); }
    catch (e) { bc = null; /* Safari <15.4 */ }
    if (bc) {
      bc.onmessage = (e) => {
        if (!validateScope(e.data)) return;
        state = loadState() || state;
        notify(e.data);
      };
    }
  }
  openChannel();

  const listeners = new Set();

  function notify(evt) {
    listeners.forEach(fn => {
      try { fn(evt); } catch (e) { console.error('[TMBus] listener error', e); }
    });
  }

  // ADR-004 Taso 2: payload-tason scope-tarkistus (turvaverkko)
  function validateScope(msg) {
    if (!msg) return false;
    // System-tason viestit (role/focus/reset/seen) eivät sisällä eventtiä
    if (msg.kind && msg.kind !== 'event') return true;
    const evt = msg.evt || msg;
    if (!evt.seuraId) return true; // legacy-salliva; loki alla
    if (evt.seuraId !== currentSeura) {
      console.warn('[TMBus] payload-scope mismatch, hylätään:', evt.seuraId, '!=', currentSeura);
      return false;
    }
    return true;
  }

  function broadcast(msg) {
    // 1) Saman tabin sisarukset + iframet
    try { window.dispatchEvent(new CustomEvent('tm-bus', { detail: msg })); } catch (e) {}
    // 2) Saman selaimen muut tabit ja iframet (storage event)
    try { localStorage.setItem(STORAGE_KEY + '_tx', JSON.stringify({ ...msg, _ping: Math.random() })); } catch (e) {}
    // 3) BroadcastChannel
    if (bc) { try { bc.postMessage(msg); } catch (e) {} }
    // 4) Parent (jos ollaan iframessa) + lapset-iframet
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ __tmbus: true, seuraId: currentSeura, msg }, '*');
      }
      const frames = document.querySelectorAll('iframe');
      frames.forEach(f => {
        try { f.contentWindow.postMessage({ __tmbus: true, seuraId: currentSeura, msg }, '*'); } catch (e) {}
      });
    } catch (e) {}
  }

  // Kuuntelijat
  window.addEventListener('storage', e => {
    if (e.key === STORAGE_KEY + '_tx' && e.newValue) {
      try {
        const msg = JSON.parse(e.newValue);
        if (!validateScope(msg)) return;
        state = loadState() || state;
        notify(msg);
      } catch (er) {}
    }
  });

  window.addEventListener('tm-bus', e => {
    if (!validateScope(e.detail)) return;
    state = loadState() || state;
    notify(e.detail);
  });

  window.addEventListener('message', e => {
    if (e.data && e.data.__tmbus) {
      // ADR-004 Taso 2: hylkää toisesta seurasta tuleva postMessage
      if (e.data.seuraId && e.data.seuraId !== currentSeura) {
        return; // eri seuran iframe — ei näytetä
      }
      const msg = e.data.msg || e.data.evt; // taaksepäin yhteensopiva
      if (!validateScope(msg)) return;
      state = loadState() || state;
      notify(msg);
      // Re-broadcast alas iframe-ketjussa (vain jos scope täsmää)
      try {
        const frames = document.querySelectorAll('iframe');
        frames.forEach(f => {
          if (f.contentWindow !== e.source) {
            f.contentWindow.postMessage(e.data, '*');
          }
        });
      } catch (er) {}
    }
  });

  // ──────────────────────────────────────────────────────────
  // Julkinen API
  // ──────────────────────────────────────────────────────────
  const TMBus = {
    version: VERSION,

    ready() {
      return Promise.resolve(state);
    },

    // ── Seurakonteksti (ADR-004) ───────────────────────────
    getSeuraContext() { return currentSeura; },

    /**
     * Vaihda seura-konteksti. Tyhjentää muistin, avaa uuden kanavan,
     * lataa uuden seuran historian. Listenerit säilyvät.
     */
    setSeuraContext(seuraId) {
      if (!seuraId || seuraId === currentSeura) return;
      // Sulje vanha kanava
      if (bc) { try { bc.close(); } catch (e) {} bc = null; }
      currentSeura = seuraId;
      STORAGE_KEY = STORAGE_PREFIX + currentSeura;
      CHANNEL_NAME = CHANNEL_PREFIX + currentSeura;
      openChannel();
      state = initState();
      notify({ kind: 'seura_changed', seuraId });
    },

    getState() { return state; },
    getSeed() { return state.seed; },

    getPlayers() { return state.seed.players; },
    getPlayer(id) { return state.seed.players.find(p => p.id === id) || null; },
    getCoach() { return state.seed.coach; },
    getTeam() { return state.seed.team; },

    getEvents(filter) {
      if (!filter) return state.events;
      return state.events.filter(e => {
        if (filter.type && e.type !== filter.type) return false;
        if (filter.playerId && e.playerId !== filter.playerId) return false;
        if (filter.since && e.t < filter.since) return false;
        if (filter.sinceHours && e.t < ts() - filter.sinceHours * 3600000) return false;
        return true;
      });
    },

    /** Julkaise uusi tapahtuma — seuraId + publisher lisätään automaattisesti */
    publish(type, payload) {
      // ADR-005: client-side valtuustarkistus (jos TMAuth ladattu)
      if (global.TMAuth && typeof global.TMAuth.canPublish === 'function') {
        const user = global.TMAuth.currentUser();
        if (user) {
          const check = global.TMAuth.canPublish(type, {
            playerId: payload && payload.playerId,
            seuraId: currentSeura
          });
          if (!check.ok) {
            console.warn('[TMBus] publish denied:', type, check.reason, 'user=', user.role);
            throw new Error('PERM_DENIED: ' + type + ' (' + check.reason + ')');
          }
        }
      }
      const user = (global.TMAuth && global.TMAuth.currentUser()) || null;
      const evt = {
        id: uid(),
        type,
        t: ts(),
        seuraId: currentSeura,
        seenBy: [],
        ...payload
      };
      // ADR-004/005: client ei voi yliajaa näitä
      evt.seuraId = currentSeura;
      if (user) {
        evt.publisherId = user.uid;
        evt.publisherRole = user.role[0];
      }
      state.events.push(evt);
      if (state.events.length > MAX_EVENTS) {
        state.events = state.events.slice(-MAX_EVENTS);
      }
      saveState(state);
      broadcast({ kind: 'event', evt });
      return evt;
    },

    /** Merkitse tapahtuma nähdyksi */
    markSeen(eventId, by) {
      const e = state.events.find(x => x.id === eventId);
      if (!e) return;
      if (!e.seenBy.includes(by)) {
        e.seenBy.push(by);
        saveState(state);
        broadcast({ kind: 'seen', eventId, by, seuraId: currentSeura });
      }
    },

    /** Aseta aktiivinen rooli */
    setActiveRole(role) {
      state.activeRole = role;
      saveState(state);
      broadcast({ kind: 'role', role, seuraId: currentSeura });
    },

    getActiveRole() { return state.activeRole; },

    /** Fokusoi tietty pelaaja */
    setFocusPlayer(id) {
      state.focusPlayerId = id;
      saveState(state);
      broadcast({ kind: 'focus', playerId: id, seuraId: currentSeura });
    },

    getFocusPlayer() { return state.focusPlayerId; },

    /** Rekisteröi kuuntelija */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** Nollaa vain nykyinen seura */
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      state = initState();
      broadcast({ kind: 'reset', seuraId: currentSeura });
      return state;
    },

    /** Apufunktioita demo-flowiin */
    sim: {
      playerLogsTraining(playerId, overrides = {}) {
        return TMBus.publish('training', {
          playerId, source: 'self', tyyppi: 'pihapeli',
          minutes: 30, fiilis: 4, ...overrides
        });
      },
      parentLogsForChild(playerId, overrides = {}) {
        return TMBus.publish('training', {
          playerId, source: 'parent', tyyppi: 'pihapeli',
          minutes: 45, fiilis: 5, ...overrides
        });
      },
      coachReacts(playerId, emoji = '❤️') {
        const coachId = (state.seed.coach && state.seed.coach.id) || 'mika';
        return TMBus.publish('coach_react', { playerId, emoji, coachId });
      },
      coachMessages(playerId, text, channel = 'player') {
        const coachId = (state.seed.coach && state.seed.coach.id) || 'mika';
        return TMBus.publish('coach_message', { playerId, coachId, text, channel });
      },
      challenge(playerId, fromPlayerId, title) {
        return TMBus.publish('challenge', { playerId, fromPlayerId, status: 'sent', title });
      }
    },

    // Apu: format
    fmt: {
      timeAgo(t) {
        const diff = ts() - t;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'juuri nyt';
        if (mins < 60) return mins + ' min sitten';
        const h = Math.floor(mins / 60);
        if (h < 24) return h + ' t sitten';
        const d = Math.floor(h / 24);
        if (d < 7) return d + ' pv sitten';
        return new Date(t).toLocaleDateString('fi-FI');
      },
      day(t) {
        const d = new Date(t);
        return ['Su','Ma','Ti','Ke','To','Pe','La'][d.getDay()];
      }
    },

    // Debug
    debug: {
      listSeuras() { return Object.keys(SEEDS); },
      storageKey() { return STORAGE_KEY; },
      channelName() { return CHANNEL_NAME; }
    }
  };

  global.TMBus = TMBus;

  // Debug-apuri
  global.TMBusDebug = {
    dump: () => console.log(state),
    clear: () => TMBus.reset(),
    switchSeura: (s) => TMBus.setSeuraContext(s)
  };

})(window);
