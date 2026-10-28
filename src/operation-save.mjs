// Persistent operation data only. No renderer, account credentials or runtime globals.
export const SAVE_FORMAT = 1;
export const ENTITY_KINDS = Object.freeze(['vehicles', 'enemies', 'civilians', 'structures', 'items', 'explosives']);
const MAX_BYTES = 16 * 1024 * 1024;
export class SaveError extends Error {
  constructor(code, message) { super(message); this.name = 'SaveError'; this.code = code; }
}
const fail = (code, message) => { throw new SaveError(code, message); };
const id = value => typeof value === 'string' && /^[a-zA-Z0-9:_-]{1,160}$/.test(value);
const object = value => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || (Object.getPrototypeOf(prototype) === null &&
    Object.prototype.toString.call(value) === '[object Object]');
};
const uint = n => Number.isSafeInteger(n) && n >= 0;
function plain(value, depth = 0, seen = new Set()) {
  if (depth > 40) fail('INVALID', 'Dades massa profundes');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (!Array.isArray(value) && !object(value)) fail('INVALID', 'Només es poden desar dades JSON finites');
  if (seen.has(value)) fail('INVALID', 'El desament conté referències circulars');
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key) || !('value' in descriptor))
      fail('INVALID', 'Propietat no admesa al desament');
    plain(descriptor.value, depth + 1, seen);
  }
  seen.delete(value);
}
export function entityId(kind, generationKey) {
  if (!ENTITY_KINDS.includes(kind) || !id(generationKey) || !id(kind + ':' + generationKey))
    fail('INVALID', 'Identificador d’entitat invàlid');
  return kind + ':' + generationKey;
}
export function newOperationId() {
  if (!globalThis.crypto?.randomUUID) fail('UNAVAILABLE', 'No es poden generar identificadors segurs');
  return 'op:' + crypto.randomUUID();
}
export function validateSnapshot(snapshot, compatibility = {}) {
  plain(snapshot);
  const s = snapshot;
  if (!object(s) || s.format !== SAVE_FORMAT) fail('FORMAT', 'Versió de desament incompatible');
  if (!id(s.operationId) || !uint(s.revision) || typeof s.name !== 'string' || !s.name.trim() || s.name.length > 100 ||
      !uint(s.createdAt) || !uint(s.updatedAt) || s.updatedAt < s.createdAt ||
      !object(s.world) || !object(s.participants) || !object(s.stats)) fail('INVALID', 'Operació invàlida');
  const w = s.world;
  if (!uint(w.seed) || w.seed > 0xffffffff || ![1, 2].includes(w.mapScale) ||
      typeof w.generatorVersion !== 'string' || !w.generatorVersion ||
      typeof s.gameVersion !== 'string' || !s.gameVersion ||
      !Number.isFinite(w.time) || w.time < 0 || !object(w.objectives) || !object(w.entities))
    fail('INVALID', 'Món invàlid');
  for (const [key, expected] of Object.entries(compatibility)) {
    if (!['gameVersion', 'generatorVersion'].includes(key)) fail('INVALID', 'Criteri de compatibilitat desconegut');
    if (expected !== (key === 'gameVersion' ? s.gameVersion : w.generatorVersion))
      fail('INCOMPATIBLE', 'La partida necessita una versió compatible del joc i del generador');
  }
  const entityIds = new Set();
  for (const kind of ENTITY_KINDS) {
    const entities = w.entities[kind];
    if (!Array.isArray(entities)) fail('INVALID', 'Falta una col·lecció d’entitats');
    for (const entity of entities) {
      if (!object(entity) || !id(entity.id) || !entity.id.startsWith(kind + ':') || entityIds.has(entity.id))
        fail('INVALID', 'Identificador d’entitat duplicat o invàlid');
      entityIds.add(entity.id);
    }
  }
  const participants = Object.entries(s.participants), seats = new Set();
  if (!participants.length || participants.length > 32) fail('INVALID', 'Participants invàlids');
  for (const [participantId, p] of participants) {
    if (!id(participantId) || !object(p) || !object(p.state) || !object(p.stats) ||
        !(p.accountId === null || id(p.accountId))) fail('INVALID', 'Participant invàlid');
    const seat = p.state.vehicleSeat;
    if (seat !== null) {
      if (!object(seat) || !id(seat.vehicleId) || !seat.vehicleId.startsWith('vehicles:') ||
          !entityIds.has(seat.vehicleId) || !uint(seat.seat)) fail('INVALID', 'Seient de vehicle invàlid');
      const key = seat.vehicleId + '/' + seat.seat;
      if (seats.has(key)) fail('INVALID', 'Dos participants ocupen el mateix seient');
      seats.add(key);
    }
  }
  if (new TextEncoder().encode(JSON.stringify(s)).byteLength > MAX_BYTES) fail('TOO_LARGE', 'Partida massa gran');
  return s;
}
const copy = value => JSON.parse(JSON.stringify(value));
export function createOperation({operationId = newOperationId(), name, gameVersion, generatorVersion,
  seed, mapScale, participantId = 'local', accountId = null, playerState = {}, now = Date.now()}) {
  const snapshot = {
    format: SAVE_FORMAT, operationId, revision: 0, name, gameVersion, createdAt: now, updatedAt: now,
    world: {seed, mapScale, generatorVersion, time: 0, objectives: {},
      entities: Object.fromEntries(ENTITY_KINDS.map(kind => [kind, []]))},
    participants: {[participantId]: {accountId, state: {...playerState, vehicleSeat: null}, stats: {}}}, stats: {}
  };
  return copy(validateSnapshot(snapshot));
}

// A single readwrite transaction reads the revision and replaces current/previous.
// IndexedDB serialises these transactions across connections/tabs.
export function createOperationStore({indexedDB = globalThis.indexedDB, name = 'hunter-operations', now = Date.now} = {}) {
  let opening = null;
  function open() {
    if (!indexedDB) return Promise.reject(new SaveError('UNAVAILABLE', 'Desament local no disponible'));
    if (!opening) opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      let blocked = false;
      request.onupgradeneeded = () => request.result.createObjectStore('operations', {keyPath: 'operationId'});
      request.onerror = () => { opening = null; reject(new SaveError('STORAGE', 'No s’ha pogut obrir el desament local')); };
      request.onblocked = () => { blocked = true; opening = null; reject(new SaveError('BLOCKED', 'Tanca les altres pestanyes del joc i torna-ho a provar')); };
      request.onsuccess = () => {
        const db = request.result;
        if (blocked) { db.close(); return; }
        db.onversionchange = () => { db.close(); opening = null; };
        resolve(db);
      };
    });
    return opening;
  }
  async function transaction(mode, work) {
    const db = await open();
    return new Promise((resolve, reject) => {
      let result, error;
      const tx = db.transaction('operations', mode), store = tx.objectStore('operations');
      const abort = e => { error = e; tx.abort(); };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(error || new SaveError('STORAGE', 'No s’ha pogut completar el desament; es conserva la còpia anterior'));
      tx.onerror = () => {}; // onabort reports request failures, including quota errors.
      try { work(store, value => { result = value; }, abort); } catch (e) { abort(e); }
    });
  }
  async function save(snapshot, {expectedRevision} = {}) {
    const input = copy(validateSnapshot(snapshot)); // Detach before the first await.
    if (!uint(expectedRevision) || input.revision !== expectedRevision)
      throw new SaveError('CONFLICT', 'Cal indicar la revisió llegida abans de desar');
    return transaction('readwrite', (store, done, abort) => {
      const request = store.get(input.operationId);
      request.onsuccess = () => {
        try {
          const record = request.result, current = record?.current;
          if ((current?.revision ?? 0) !== expectedRevision || (!record && expectedRevision !== 0))
            fail('CONFLICT', 'Una altra sessió ha modificat aquesta operació');
          if (current) {
            validateSnapshot(current);
            if (current.createdAt !== input.createdAt || current.world.seed !== input.world.seed ||
                current.world.mapScale !== input.world.mapScale || current.world.generatorVersion !== input.world.generatorVersion)
              fail('INVALID', 'La identitat del món no pot canviar dins una operació');
          }
          input.revision = expectedRevision + 1;
          input.updatedAt = Math.max(input.updatedAt, current?.updatedAt ?? 0, now());
          validateSnapshot(input);
          store.put({operationId: input.operationId, current: input, previous: current ?? null});
          done(copy(input));
        } catch (e) { abort(e); }
      };
    });
  }
  async function load(operationId, {previous = false, ...compatibility} = {}) {
    if (!id(operationId)) fail('INVALID', 'Operació invàlida');
    return transaction('readonly', (store, done, abort) => {
      const request = store.get(operationId);
      request.onsuccess = () => {
        try {
          const snapshot = request.result?.[previous ? 'previous' : 'current'];
          done(snapshot ? copy(validateSnapshot(snapshot, compatibility)) : null);
        } catch (e) { abort(e); }
      };
    });
  }
  async function list() {
    return transaction('readonly', (store, done, abort) => {
      const rows = [], request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) { done(rows.sort((a, b) => b.updatedAt - a.updatedAt)); return; }
        try {
          const s = validateSnapshot(cursor.value.current);
          rows.push({operationId: s.operationId, name: s.name, revision: s.revision,
            updatedAt: s.updatedAt, createdAt: s.createdAt, seed: s.world.seed, mapScale: s.world.mapScale,
            gameVersion: s.gameVersion, generatorVersion: s.world.generatorVersion,
            time: s.world.time, participantCount: Object.keys(s.participants).length, hasPrevious: !!cursor.value.previous});
          cursor.continue();
        } catch (e) { abort(e); }
      };
    });
  }
  async function remove(operationId, {expectedRevision} = {}) {
    if (!id(operationId) || !uint(expectedRevision)) fail('INVALID', 'Cal una operació i revisió vàlides');
    return transaction('readwrite', (store, done, abort) => {
      const request = store.get(operationId);
      request.onsuccess = () => {
        if (!request.result || request.result.current.revision !== expectedRevision) {
          abort(new SaveError('CONFLICT', 'L’operació ha canviat o ja no existeix')); return;
        }
        store.delete(operationId); done(true);
      };
    });
  }
  async function close() { const pending = opening; opening = null; if (pending) (await pending).close(); }
  return Object.freeze({save, load, list, remove, close});
}
