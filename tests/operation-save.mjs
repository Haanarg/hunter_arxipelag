import assert from 'node:assert/strict';
import {indexedDB, IDBObjectStore} from 'fake-indexeddb';
import {createOperation, createOperationStore, entityId, validateSnapshot} from '../src/operation-save.mjs';

const options = {operationId: 'op:test', name: 'Operació de prova', gameVersion: '0.6.2',
  generatorVersion: 'world:0.6.2', seed: 67, mapScale: 1, now: 100};
const fresh = () => createOperation(options);
const a = createOperationStore({indexedDB, name: 'save-test', now: () => 200});
const b = createOperationStore({indexedDB, name: 'save-test', now: () => 300});
const code = expected => e => e.code === expected;
assert.equal(entityId('vehicles', 'generated:0'), 'vehicles:generated:0');
assert.throws(() => entityId('vehicles', '../bad'), code('INVALID'));
const snapshot = fresh();
snapshot.world.entities.vehicles.push({id: entityId('vehicles', 'generated:0'), life: 70});
snapshot.participants.local.state.vehicleSeat = {vehicleId: 'vehicles:generated:0', seat: 0};
snapshot.participants.friend = {accountId: null, state: {vehicleSeat: {vehicleId: 'vehicles:generated:0', seat: 1}}, stats: {}};
validateSnapshot(snapshot);
const collision = structuredClone(snapshot);
collision.participants.friend.state.vehicleSeat.seat = 0;
assert.throws(() => validateSnapshot(collision), code('INVALID'));
const dangling = structuredClone(snapshot);
dangling.participants.local.state.vehicleSeat.vehicleId = 'vehicles:missing';
assert.throws(() => validateSnapshot(dangling), code('INVALID'));
const bad = fresh(); bad.world.time = NaN;
assert.throws(() => validateSnapshot(bad), code('INVALID'));
const circular = fresh(); circular.stats.self = circular;
assert.throws(() => validateSnapshot(circular), code('INVALID'));
assert.throws(() => validateSnapshot({...fresh(), format: 99}), code('FORMAT'));
const first = await a.save(snapshot, {expectedRevision: 0});
assert.equal(first.revision, 1);
assert.equal(snapshot.revision, 0);
assert.equal((await a.load(first.operationId)).participants.friend.state.vehicleSeat.seat, 1);
await assert.rejects(b.load(first.operationId, {generatorVersion: 'world:future'}), code('INCOMPATIBLE'));
const [left, right] = await Promise.all([a.load(first.operationId), b.load(first.operationId)]);
left.world.time = 60; right.world.time = 90;
const results = await Promise.allSettled([
  a.save(left, {expectedRevision: 1}), b.save(right, {expectedRevision: 1})
]);
assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
assert.equal(results.find(r => r.status === 'rejected').reason.code, 'CONFLICT');
const current = await a.load(first.operationId);
assert.equal(current.revision, 2);
assert.equal((await a.load(first.operationId, {previous: true})).world.time, 0);
await a.close();
assert.equal((await a.load(first.operationId)).revision, 2, 'survives closing and reopening the database');
const changedWorld = structuredClone(current); changedWorld.world.seed++;
await assert.rejects(a.save(changedWorld, {expectedRevision: 2}), code('INVALID'));
assert.equal((await a.load(first.operationId)).revision, 2, 'failed transaction preserves current');
assert.equal((await a.load(first.operationId, {previous: true})).revision, 1);
const originalPut = IDBObjectStore.prototype.put;
try {
  IDBObjectStore.prototype.put = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
  await assert.rejects(a.save(current, {expectedRevision: 2}), e => e.name === 'QuotaExceededError');
} finally { IDBObjectStore.prototype.put = originalPut; }
assert.equal((await a.load(first.operationId)).revision, 2, 'quota failure preserves current');
assert.equal((await a.load(first.operationId, {previous: true})).revision, 1, 'quota failure preserves backup');
const other = await a.save(createOperation({...options, operationId: 'op:other', name: '<b>Una altra</b>'}), {expectedRevision: 0});
assert.equal((await a.list()).length, 2);
await assert.rejects(a.remove(first.operationId, {expectedRevision: 1}), code('CONFLICT'));
assert.equal((await a.list()).length, 2);
await a.remove(other.operationId, {expectedRevision: other.revision});
assert.equal((await a.list()).length, 1);
assert.equal(await a.load(other.operationId), null);
await assert.rejects(createOperationStore({indexedDB: null}).list(), code('UNAVAILABLE'));
await a.close(); await b.close();
console.log('operation-save: validation, multiple operations, persistence, backup, compatibility and concurrent revision checks passed');
