/**
 * vp-bus-adapter.js — VP v21 Bus-integraatio
 * ------------------------------------------------------------
 * Sitoo VP-näkymän samaan tm-bus.js:ään jota Pelaaja v7, Master v15 ja
 * Perhe v2 käyttävät. Adapter ei muuta vanhoja tapahtumia — se
 * kuuntelee niitä sellaisenaan ja lisää VP-aikakauden uudet tyypit.
 *
 * Suunnittelupäätökset (ADR-001, ADR-002, docs/sequences.md):
 *   1. Firestore-first semantiikka — demossa stub, tuotannossa oikea.
 *   2. Idempotenssi event.id:n perusteella (30 s cache).
 *   3. `at` on domain-aika, `publishedAt` on wall-clock.
 *   4. Skeemaversion tarkistus — tuntemattomat versiot logitetaan mutta
 *      eivät riko kuluttajaa.
 *   5. Bus on optimointi, Firestore on totuus — adapter voi sammua
 *      milloin tahansa ilman datahukkaa.
 *
 * Tyyppien kaksikielisyys:
 *   LEGACY (tm-bus.js 1.0):  training, coach_message, coach_react,
 *                             challenge, injury, parent_log
 *   VP-ERA (tm-bus.js 1.1+): note.to_coach, idp.proposed, idp.approved,
 *                             idp.rejected, intervention.requested,
 *                             playerPlan.updated, presence.role
 *
 * VP v21 kuuntelee molempia. Muut näkymät saavat lisäykset vapaaehtoisina
 * (Master v15 saa `note.to_coach` + `idp.approved`; Pelaaja/Perhe ei
 * tarvitse uusia tyyppejä lainkaan).
 *
 * Riippuvuudet:
 *   - window.TMBus (tm-bus.js)
 */

(function (global) {
  'use strict';

  if (!global.TMBus) {
    console.error('[VPBusAdapter] TMBus puuttuu — tm-bus.js pitää ladata ensin.');
    return;
  }

  const ADAPTER_VERSION = '1.0.0';
  const SCHEMA_VERSION = 1;
  const IDEMPOTENCY_TTL_MS = 30_000;

  // ──────────────────────────────────────────────────────────
  // Idempotenssi — muistetaan viimeksi nähdyt event.id:t
  // ──────────────────────────────────────────────────────────
  const seenIds = new Map(); // id → wall-clock ms
  function alreadySeen(id) {
    if (!id) return false;
    const now = Date.now();
    // Siivoa vanhat
    for (const [k, t] of seenIds) {
      if (now - t > IDEMPOTENCY_TTL_MS) seenIds.delete(k);
    }
    if (seenIds.has(id)) return true;
    seenIds.set(id, now);
    return false;
  }

  // ──────────────────────────────────────────────────────────
  // Firestore-stub — tuotannossa tämä on oikea Firestore SDK.
  // Demossa tallennamme seurakohtaiseen muistipankkiin ja palautamme
  // Promisen joka resolvoituu mikrotaskissa.
  //
  // ADR-004: jokaisella seuralla oma kokoelmasäiliö. Tuotannossa
  // vastaa rakennetta /seurat/{seuraId}/notes/{noteId} jne.
  // ──────────────────────────────────────────────────────────
  const FirestoreStub = {
    _bySeura: new Map(), // seuraId → { notes, idp, interventions, playerPlans }
    _ensure(seuraId) {
      if (!this._bySeura.has(seuraId)) {
        this._bySeura.set(seuraId, {
          notes: new Map(),
          idp: new Map(),
          interventions: new Map(),
          playerPlans: new Map()
        });
      }
      return this._bySeura.get(seuraId);
    },
    _cols() {
      return this._ensure(TMBus.getSeuraContext());
    },
    async write(collection, id, data) {
      // Simuloi verkkolatenssia 10 ms
      await new Promise(r => setTimeout(r, 10));
      const seuraId = TMBus.getSeuraContext();
      const col = this._cols()[collection];
      if (!col) throw new Error(`Tuntematon kokoelma: ${collection}`);
      col.set(id, { ...data, seuraId, _writtenAt: Date.now() });
      return { id, collection, seuraId, ok: true };
    },
    async transaction(collection, id, updater) {
      await new Promise(r => setTimeout(r, 10));
      const seuraId = TMBus.getSeuraContext();
      const col = this._cols()[collection];
      const current = col.get(id);
      if (!current) throw new Error('Dokumentti ei ole olemassa');
      // ADR-004 lisäturva: hylkää jos seuraId ei täsmää
      if (current.seuraId && current.seuraId !== seuraId) {
        throw new Error('Seuran scope mismatch (' + current.seuraId + ' != ' + seuraId + ')');
      }
      const next = updater(current);
      if (next === null) throw new Error('Transaktio hylätty');
      col.set(id, { ...next, seuraId, _updatedAt: Date.now() });
      return next;
    },
    read(collection, id) {
      return this._cols()[collection]?.get(id) || null;
    }
  };

  // Anna ulos globaalisti jotta VP-sivu voi inspektoida demossa
  global.VPFirestore = FirestoreStub;

  // ──────────────────────────────────────────────────────────
  // Apu: luo normalisoitu VP-era eventti
  // ──────────────────────────────────────────────────────────
  function buildEvent(type, payload, opts = {}) {
    // ADR-004: seuraId tulee automaattisesti TMBus-kontekstista
    const seuraId = opts.seuraId || TMBus.getSeuraContext();
    return {
      // LEGACY-kenttä (tm-bus.js käyttää näitä)
      type,
      t: opts.at ?? Date.now(),
      playerId: payload.playerId || null,
      // VP-ERA skeema (ADR-001, tm-events.md)
      v: SCHEMA_VERSION,
      publisherRole: 'vp',
      publisherId: opts.publisherId || 'vp-demo',
      publishedAt: Date.now(),
      seuraId,
      payload
    };
  }

  // ──────────────────────────────────────────────────────────
  // Kuuntelijarekisteri — VP-sivu rekisteröi tänne
  // ──────────────────────────────────────────────────────────
  const handlers = {
    // Kaikki tapahtumat, jotka pitäisi näkyä VP:n Inboxissa
    inbox: new Set(),
    // Spesifiset vain jos VP haluaa reagoida tiettyyn tyyppiin
    byType: new Map()
  };

  function dispatch(evt) {
    // Idempotenssi
    if (alreadySeen(evt.id)) return;

    // Skeemaversio — v > SCHEMA_VERSION ohitetaan + logitetaan
    if (evt.v && evt.v > SCHEMA_VERSION) {
      console.warn('[VPBusAdapter] skema_unknown_version', {
        id: evt.id, type: evt.type, v: evt.v, supported: SCHEMA_VERSION
      });
      return;
    }

    // Inbox: training, parent_log, challenge, injury, note.to_coach,
    //        idp.proposed, intervention.requested
    const INBOX_TYPES = new Set([
      'training', 'parent_log', 'challenge', 'injury',
      'note.to_coach', 'idp.proposed', 'intervention.requested'
    ]);
    if (INBOX_TYPES.has(evt.type)) {
      handlers.inbox.forEach(fn => {
        try { fn(evt); } catch (e) { console.error('[VPBusAdapter] inbox handler', e); }
      });
    }

    // Spesifiset tyyppikuuntelijat
    const typed = handlers.byType.get(evt.type);
    if (typed) {
      typed.forEach(fn => {
        try { fn(evt); } catch (e) { console.error('[VPBusAdapter] type handler', e); }
      });
    }
  }

  // Liitä tm-bus.js:ään
  TMBus.ready().then(() => {
    TMBus.subscribe((busMsg) => {
      // tm-bus lähettää { kind: 'event', evt } | { kind: 'seen' } | { kind: 'role' } | ...
      if (busMsg.kind === 'event' && busMsg.evt) {
        dispatch(busMsg.evt);
      }
    });
  });

  // ──────────────────────────────────────────────────────────
  // Julkinen API: VPBus
  // ──────────────────────────────────────────────────────────
  const VPBus = {
    version: ADAPTER_VERSION,
    schemaVersion: SCHEMA_VERSION,

    /** Rekisteröi Inbox-kuuntelija (kaikki VP:n työjonoon kuuluvat tapahtumat) */
    onInboxEvent(fn) {
      handlers.inbox.add(fn);
      return () => handlers.inbox.delete(fn);
    },

    /** Rekisteröi yksi-tyyppiä-varten-kuuntelija (esim. seuraa idp.approved-ack:tä) */
    onType(type, fn) {
      if (!handlers.byType.has(type)) handlers.byType.set(type, new Set());
      handlers.byType.get(type).add(fn);
      return () => handlers.byType.get(type)?.delete(fn);
    },

    /** Palauta nykyinen Inbox alkutilassa (legacy + VP-era yhdistettynä) */
    getInboxSnapshot({ sinceHours = 72 } = {}) {
      const cutoff = Date.now() - sinceHours * 3600000;
      return TMBus.getEvents({ sinceHours })
        .filter(e => [
          'training', 'parent_log', 'challenge', 'injury',
          'note.to_coach', 'idp.proposed', 'intervention.requested'
        ].includes(e.type))
        .filter(e => e.t >= cutoff)
        .sort((a, b) => b.t - a.t);
    },

    // ──────────────────────────────────────────────────────
    // Julkaisut — Firestore-first, sitten bus
    // ──────────────────────────────────────────────────────

    /**
     * Lähetä huomio valmentajalle (näkyy Master v15:ssä toastina + Inboxissa)
     */
    async publishNote({ coachId, playerId, priority = 'normal', text }) {
      const noteId = 'note_' + Math.random().toString(36).slice(2, 10);
      // 1) Firestore-kirjoitus ENSIN (docs/sequences.md diagrammi 2)
      await FirestoreStub.write('notes', noteId, {
        coachId, playerId, priority, text, createdBy: 'vp-demo', at: Date.now()
      });
      // 2) Vasta ack:n jälkeen bus
      return TMBus.publish('note.to_coach', {
        ...buildEvent('note.to_coach', { noteId, coachId, playerId, priority, text }),
        id: noteId
      });
    },

    /**
     * Hyväksy valmentajan ehdottama IDP — transaktiolla (docs/sequences.md diagrammi 3)
     */
    async approveIDP({ idpId, note = '' }) {
      try {
        await FirestoreStub.transaction('idp', idpId, (current) => {
          if (current.status !== 'proposed') return null; // hylkää tx
          return { ...current, status: 'approved', approvedBy: 'vp-demo', approvedAt: Date.now(), vpNote: note };
        });
      } catch (err) {
        throw new Error('IDP ei ole enää hyväksyttävässä tilassa (' + err.message + ')');
      }
      return TMBus.publish('idp.approved', {
        ...buildEvent('idp.approved', { idpId, note }),
        id: 'idpapp_' + Math.random().toString(36).slice(2, 10)
      });
    },

    /**
     * Hylkää valmentajan ehdottama IDP
     */
    async rejectIDP({ idpId, reason }) {
      await FirestoreStub.transaction('idp', idpId, (current) => {
        if (current.status !== 'proposed') return null;
        return { ...current, status: 'rejected', rejectedBy: 'vp-demo', rejectedAt: Date.now(), reason };
      });
      return TMBus.publish('idp.rejected', {
        ...buildEvent('idp.rejected', { idpId, reason }),
        id: 'idprej_' + Math.random().toString(36).slice(2, 10)
      });
    },

    /**
     * Pyydä interventio valmentajalta (esim. "puhu pelaajalle viikon sisään")
     */
    async requestIntervention({ coachId, playerId, kind, due, text }) {
      const intId = 'int_' + Math.random().toString(36).slice(2, 10);
      await FirestoreStub.write('interventions', intId, {
        coachId, playerId, kind, due, text, requestedBy: 'vp-demo', at: Date.now()
      });
      return TMBus.publish('intervention.requested', {
        ...buildEvent('intervention.requested', { intId, coachId, playerId, kind, due, text }),
        id: intId
      });
    },

    /**
     * Päivitä pelaajan kausisuunnitelma (Master v15 voi näyttää muutoksen)
     */
    async updatePlayerPlan({ playerId, changes }) {
      const planId = 'plan_' + playerId;
      await FirestoreStub.write('playerPlans', planId, {
        playerId, changes, updatedBy: 'vp-demo', at: Date.now()
      });
      return TMBus.publish('playerPlan.updated', {
        ...buildEvent('playerPlan.updated', { planId, playerId, changes }),
        id: 'planup_' + Math.random().toString(36).slice(2, 10)
      });
    },

    /**
     * Ilmoita presence (VP avasi/sulki näkymän) — Master v15 näyttää "VP katsoo"
     */
    presence(state /* 'online' | 'offline' */) {
      return TMBus.publish('presence.role', {
        ...buildEvent('presence.role', { role: 'vp', state }),
        id: 'pres_' + Date.now()
      });
    },

    // ──────────────────────────────────────────────────────
    // Debug / observability (ADR-003: /admin/bus-log esikatselu)
    // ──────────────────────────────────────────────────────
    debug: {
      seenEventIds: () => [...seenIds.keys()],
      firestoreSnapshot: () => {
        const seuraId = TMBus.getSeuraContext();
        const cols = FirestoreStub._ensure(seuraId);
        return {
          seuraId,
          notes: [...cols.notes.entries()],
          idp: [...cols.idp.entries()],
          interventions: [...cols.interventions.entries()],
          playerPlans: [...cols.playerPlans.entries()]
        };
      },
      allSeurasSnapshot: () => {
        const out = {};
        for (const [seuraId, cols] of FirestoreStub._bySeura) {
          out[seuraId] = {
            notes: cols.notes.size,
            idp: cols.idp.size,
            interventions: cols.interventions.size,
            playerPlans: cols.playerPlans.size
          };
        }
        return out;
      }
    }
  };

  global.VPBus = VPBus;

  // Mark: adapter asentui
  console.info('[VPBusAdapter] valmis. version=' + ADAPTER_VERSION + ' schema=v' + SCHEMA_VERSION);

})(window);
