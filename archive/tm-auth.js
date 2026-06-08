/**
 * tm-auth.js — TalentMaster Authentication & Authorization
 * ------------------------------------------------------------
 * ADR-005 mukainen toteutus. Kaksi polkua, sama API:
 *
 *   1) FakeAuth (demo) — kun Firebase puuttuu. Rooli URL-paramista:
 *        index.html?role=vp&seura=kpv&uid=demo-vp
 *      Tallentuu localStorageen → säilyy navigoinnissa.
 *
 *   2) FirebaseAuth (tuotanto) — kun window.firebase on ladattu.
 *      Lukee claimsit JWT-tokenista.
 *
 * Julkaisumatriisi on tässä tiedostossa DATANA (PUBLISH_MATRIX).
 * Sama taulukko kuin docs/auth-matrix.md — molemmat on pidettävä synkassa.
 *
 * API:
 *   TMAuth.ready()                 → Promise<User|null>
 *   TMAuth.currentUser()           → User|null (synkroninen, cache)
 *   TMAuth.signIn(opts)            → Promise<User>   (demo: vaihda rooli)
 *   TMAuth.signOut()               → Promise<void>
 *   TMAuth.onAuthChange(fn)        → unsubscribe
 *   TMAuth.canPublish(type, ctx)   → { ok: bool, reason?: string }
 *   TMAuth.requireRole(...roles)   → throw jos ei täsmää
 *   TMAuth.isDemo()                → bool
 *
 * User-objekti:
 *   { uid, email, role: string[], seuraId, playerIds?, teamIds? }
 *
 * Rooli-gate sivulle (lataa ennen sovelluskoodia):
 *   TMAuth.ready().then(user => {
 *     if (!user) location.href = '/login';
 *     else if (!user.role.includes('vp')) location.href = '/';
 *   });
 */

(function (global) {
  'use strict';

  const VERSION = '1.0.0';
  const DEMO_SESSION_KEY = 'tm_auth_demo_session';

  // ──────────────────────────────────────────────────────────
  // PUBLISH_MATRIX — ADR-005 / docs/auth-matrix.md
  //
  // Kartta: tapahtumatyyppi → roolit joille sallittu.
  // 'player_self' = vain jos playerId === user.playerIds[0]
  // 'family_linked' = vain jos playerId ∈ user.playerIds
  // 'coach_team' = vain jos pelaaja on valmentajan joukkueessa
  //   (teamIds-tarkistus vaatii pelaajadatan — tehdään context.playerTeamId)
  // ──────────────────────────────────────────────────────────
  const PUBLISH_MATRIX = {
    // type: [{role, constraint?}]
    'training':              [{r:'player', c:'player_self'}, {r:'family', c:'family_linked'}, {r:'admin'}],
    'parent_log':            [{r:'family', c:'family_linked'}, {r:'admin'}],
    'coach_message':         [{r:'coach',  c:'coach_team'}, {r:'vp'}, {r:'admin'}],
    'coach_react':           [{r:'coach',  c:'coach_team'}, {r:'vp'}, {r:'admin'}],
    'challenge':             [{r:'player', c:'player_self'}, {r:'coach', c:'coach_team'}, {r:'vp'}, {r:'admin'}],
    'injury':                [{r:'family', c:'family_linked'}, {r:'coach', c:'coach_team'}, {r:'vp'}, {r:'admin'}],
    'seen':                  [{r:'player'},{r:'family'},{r:'coach'},{r:'vp'},{r:'admin'}],
    'presence.role':         [{r:'player'},{r:'family'},{r:'coach'},{r:'vp'},{r:'admin'}],
    'note.to_coach':         [{r:'vp'}, {r:'admin'}],
    'idp.proposed':          [{r:'coach', c:'coach_team'}, {r:'admin'}],
    'idp.approved':          [{r:'vp'}, {r:'admin'}],
    'idp.rejected':          [{r:'vp'}, {r:'admin'}],
    'intervention.requested':[{r:'vp'}, {r:'admin'}],
    'playerPlan.updated':    [{r:'coach', c:'coach_team'}, {r:'vp'}, {r:'admin'}]
  };

  // ──────────────────────────────────────────────────────────
  // Demo-roolioletukset
  // ──────────────────────────────────────────────────────────
  const DEMO_PROFILES = {
    player: {
      uid: 'demo-player-eemeli',
      email: 'eemeli@demo.kpv.fi',
      role: ['player'],
      seuraId: 'kpv',
      playerIds: ['eemeli']
    },
    family: {
      uid: 'demo-family-korhonen',
      email: 'korhonen@demo.kpv.fi',
      role: ['family'],
      seuraId: 'kpv',
      playerIds: ['eemeli']
    },
    coach: {
      uid: 'demo-coach-mika',
      email: 'mika@demo.kpv.fi',
      role: ['coach'],
      seuraId: 'kpv',
      teamIds: ['kpv-u15']
    },
    vp: {
      uid: 'demo-vp-01',
      email: 'vp@demo.kpv.fi',
      role: ['vp'],
      seuraId: 'kpv'
    },
    admin: {
      uid: 'demo-admin-01',
      email: 'admin@demo.kpv.fi',
      role: ['admin'],
      seuraId: 'kpv'
    }
  };

  // ──────────────────────────────────────────────────────────
  // Ympäristö: Firebase vai demo?
  // ──────────────────────────────────────────────────────────
  function detectDemo() {
    if (global.__TM_FORCE_DEMO === true) return true;
    if (global.__TM_FORCE_DEMO === false) return false;
    // Oletus: jos firebase.auth puuttuu, ollaan demossa
    return !(global.firebase && global.firebase.auth);
  }

  const isDemo = detectDemo();

  // ──────────────────────────────────────────────────────────
  // Session-luku URL-paramista + localStoragesta
  // ──────────────────────────────────────────────────────────
  function readDemoSessionFromUrl() {
    try {
      const params = new URLSearchParams(location.search);
      const role = params.get('role');
      if (!role) return null;
      const profile = DEMO_PROFILES[role];
      if (!profile) return null;
      // URL voi ylittää oletusarvot
      const user = {
        ...profile,
        uid: params.get('uid') || profile.uid,
        seuraId: params.get('seura') || profile.seuraId,
        playerIds: params.get('player') ? [params.get('player')] : profile.playerIds,
        teamIds: params.get('team') ? [params.get('team')] : profile.teamIds
      };
      return user;
    } catch (e) { return null; }
  }

  function readDemoSessionFromStorage() {
    try {
      const raw = localStorage.getItem(DEMO_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function writeDemoSession(user) {
    try {
      if (user) localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user));
      else localStorage.removeItem(DEMO_SESSION_KEY);
    } catch (e) {}
  }

  // URL-param on autoratiivinen (uusi rooli kirjautuu sisään); ilman paramia
  // käytetään tallennettua sessiota.
  function initialDemoUser() {
    const fromUrl = readDemoSessionFromUrl();
    if (fromUrl) {
      writeDemoSession(fromUrl);
      // Synkka TMBus:in seura-konteksti
      if (global.TMBus && typeof global.TMBus.setSeuraContext === 'function') {
        global.TMBus.setSeuraContext(fromUrl.seuraId);
      }
      return fromUrl;
    }
    return readDemoSessionFromStorage();
  }

  // ──────────────────────────────────────────────────────────
  // Listener-rekisteri
  // ──────────────────────────────────────────────────────────
  const authListeners = new Set();
  function notifyAuth(user) {
    authListeners.forEach(fn => {
      try { fn(user); } catch (e) { console.error('[TMAuth] listener', e); }
    });
  }

  // ──────────────────────────────────────────────────────────
  // Current user cache
  // ──────────────────────────────────────────────────────────
  let currentUser = isDemo ? initialDemoUser() : null;
  let readyPromise = null;

  // ──────────────────────────────────────────────────────────
  // canPublish — valtuuslogiikka (sama kuin rules tulee tekemään)
  // ──────────────────────────────────────────────────────────
  function evalConstraint(constraint, user, ctx) {
    if (!constraint) return true;
    if (constraint === 'player_self') {
      if (!ctx || !ctx.playerId) return false;
      return user.playerIds && user.playerIds[0] === ctx.playerId;
    }
    if (constraint === 'family_linked') {
      if (!ctx || !ctx.playerId) return false;
      return user.playerIds && user.playerIds.includes(ctx.playerId);
    }
    if (constraint === 'coach_team') {
      // Vaatii context.playerTeamId — jos puuttuu, demo-moodi olettaa true
      if (!user.teamIds) return false;
      if (!ctx || !ctx.playerTeamId) return true; // best-effort demossa
      return user.teamIds.includes(ctx.playerTeamId);
    }
    return false;
  }

  function canPublish(type, ctx) {
    if (!currentUser) return { ok: false, reason: 'UNAUTHENTICATED' };
    const allowed = PUBLISH_MATRIX[type];
    if (!allowed) return { ok: false, reason: 'UNKNOWN_TYPE' };
    // Seura-matchi pakollinen (paitsi platform_admin)
    const isPlatformAdmin = currentUser.role && currentUser.role.includes('platform_admin');
    if (!isPlatformAdmin && ctx && ctx.seuraId && ctx.seuraId !== currentUser.seuraId) {
      return { ok: false, reason: 'WRONG_SEURA' };
    }
    for (const rule of allowed) {
      if (!currentUser.role.includes(rule.r)) continue;
      if (evalConstraint(rule.c, currentUser, ctx)) {
        return { ok: true, matchedRole: rule.r };
      }
    }
    return { ok: false, reason: 'ROLE_DENIED' };
  }

  // ──────────────────────────────────────────────────────────
  // Julkinen API
  // ──────────────────────────────────────────────────────────
  const TMAuth = {
    version: VERSION,

    isDemo() { return isDemo; },

    ready() {
      if (readyPromise) return readyPromise;
      if (isDemo) {
        readyPromise = Promise.resolve(currentUser);
      } else if (global.firebase && global.firebase.auth) {
        readyPromise = new Promise(resolve => {
          const unsub = global.firebase.auth().onAuthStateChanged(async (u) => {
            unsub();
            if (!u) { currentUser = null; resolve(null); return; }
            const tok = await u.getIdTokenResult();
            currentUser = {
              uid: u.uid,
              email: u.email,
              role: Array.isArray(tok.claims.role) ? tok.claims.role : [tok.claims.role || 'player'],
              seuraId: tok.claims.seuraId,
              playerIds: tok.claims.playerIds,
              teamIds: tok.claims.teamIds
            };
            if (global.TMBus && typeof global.TMBus.setSeuraContext === 'function' && currentUser.seuraId) {
              global.TMBus.setSeuraContext(currentUser.seuraId);
            }
            resolve(currentUser);
          });
        });
      } else {
        readyPromise = Promise.resolve(null);
      }
      return readyPromise;
    },

    currentUser() { return currentUser; },

    /**
     * Demo-moodi: vaihda rooli. Tuotanto: kirjaudu emailillä + salasanalla.
     */
    async signIn(opts = {}) {
      if (isDemo) {
        // Demossa "signIn" = roolin vaihto
        const roleKey = opts.role || 'player';
        const profile = DEMO_PROFILES[roleKey];
        if (!profile) throw new Error('Tuntematon demo-rooli: ' + roleKey);
        currentUser = {
          ...profile,
          seuraId: opts.seuraId || profile.seuraId,
          playerIds: opts.playerIds || profile.playerIds,
          teamIds: opts.teamIds || profile.teamIds
        };
        writeDemoSession(currentUser);
        if (global.TMBus && typeof global.TMBus.setSeuraContext === 'function') {
          global.TMBus.setSeuraContext(currentUser.seuraId);
        }
        notifyAuth(currentUser);
        return currentUser;
      }
      // Tuotanto
      const { email, password } = opts;
      const cred = await global.firebase.auth().signInWithEmailAndPassword(email, password);
      const tok = await cred.user.getIdTokenResult();
      currentUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        role: Array.isArray(tok.claims.role) ? tok.claims.role : [tok.claims.role || 'player'],
        seuraId: tok.claims.seuraId,
        playerIds: tok.claims.playerIds,
        teamIds: tok.claims.teamIds
      };
      notifyAuth(currentUser);
      return currentUser;
    },

    async signOut() {
      if (isDemo) {
        currentUser = null;
        writeDemoSession(null);
      } else {
        await global.firebase.auth().signOut();
        currentUser = null;
      }
      notifyAuth(null);
    },

    onAuthChange(fn) {
      authListeners.add(fn);
      // Kutsu heti nykyisellä arvolla
      queueMicrotask(() => fn(currentUser));
      return () => authListeners.delete(fn);
    },

    canPublish,

    requireRole(...roles) {
      if (!currentUser) throw new Error('UNAUTHENTICATED');
      const match = roles.some(r => currentUser.role.includes(r));
      if (!match) throw new Error('PERM_DENIED: vaadittu rooli ' + roles.join('|') + ', on ' + currentUser.role.join(','));
      return currentUser;
    },

    // ── Debug / testit ───────────────────────────────────────
    debug: {
      matrix: () => PUBLISH_MATRIX,
      profiles: () => DEMO_PROFILES,
      forceUser: (u) => { currentUser = u; writeDemoSession(u); notifyAuth(u); }
    }
  };

  global.TMAuth = TMAuth;

  // Jos TMBus on ladattu, synkronoi seura-konteksti demo-käyttäjältä
  if (isDemo && currentUser && global.TMBus && typeof global.TMBus.setSeuraContext === 'function') {
    global.TMBus.setSeuraContext(currentUser.seuraId);
  }

  console.info('[TMAuth] valmis. mode=' + (isDemo ? 'demo' : 'firebase') + ' user=' + (currentUser ? currentUser.role.join(',') : 'none'));

})(window);
