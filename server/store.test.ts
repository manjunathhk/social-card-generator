import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  createCard,
  deleteCard,
  getCard,
  getCardImage,
  isValidId,
  listCards,
  pruneExpiredCards,
  type NewCard,
} from './store.js';

const sample: NewCard = {
  title: 'Slice, don’t copy.',
  format: 'markdown',
  source: '---\ntitle: T\n---\n',
  layout: 'columns',
  theme: 'vesper',
  branding: { author: 'Test Author' },
  scale: 1,
  width: 1080,
  height: 1350,
};

async function withTempDir(work: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'sandbox-store-'));
  try {
    await work(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('isValidId accepts only UUIDs', () => {
  assert.equal(isValidId('123e4567-e89b-12d3-a456-426614174000'), true);
  assert.equal(isValidId('../../etc/passwd'), false);
  assert.equal(isValidId(''), false);
});

test('create, list, get and delete a card', () =>
  withTempDir(async (dir) => {
    assert.deepEqual(await listCards(dir), [], 'empty before the cards directory exists');
    const record = await createCard(dir, sample, Buffer.from('fake-png'));
    assert.ok(isValidId(record.id));
    assert.equal(record.title, sample.title);
    assert.ok(record.createdAt);

    const listed = await listCards(dir);
    assert.equal(listed.length, 1);
    assert.deepEqual(listed[0], record);

    const fetched = await getCard(dir, record.id);
    assert.deepEqual(fetched, record);
    assert.equal((await getCardImage(dir, record.id))?.toString(), 'fake-png');

    assert.equal(await deleteCard(dir, record.id), true);
    assert.equal(await getCard(dir, record.id), undefined);
    assert.equal(await getCardImage(dir, record.id), undefined);
    assert.equal(await deleteCard(dir, record.id), false, 'deleting twice reports nothing existed');
  }));

test('listCards sorts newest first', () =>
  withTempDir(async (dir) => {
    const first = await createCard(dir, sample, Buffer.from('a'));
    await new Promise((r) => setTimeout(r, 2));
    const second = await createCard(dir, { ...sample, title: 'Second' }, Buffer.from('b'));
    const [newest, oldest] = await listCards(dir);
    assert.equal(newest.id, second.id);
    assert.equal(oldest.id, first.id);
  }));

test('pruneExpiredCards deletes only cards older than maxAgeMs', () =>
  withTempDir(async (dir) => {
    const card = await createCard(dir, sample, Buffer.from('x'));

    // The card is only milliseconds old, well inside a one-day window: nothing to prune yet.
    assert.equal(await pruneExpiredCards(dir, 24 * 60 * 60 * 1000), 0);
    assert.ok(await getCard(dir, card.id));

    // A zero-width window means "older than right now" — the already-created card qualifies.
    assert.equal(await pruneExpiredCards(dir, 0), 1);
    assert.equal(await getCard(dir, card.id), undefined);
    assert.equal(await getCardImage(dir, card.id), undefined);
  }));

test('optional customPalette survives a round trip', () =>
  withTempDir(async (dir) => {
    const record = await createCard(dir, { ...sample, customPalette: { bg: '#000', fg: '#fff' } }, Buffer.from('x'));
    assert.deepEqual((await getCard(dir, record.id))?.customPalette, { bg: '#000', fg: '#fff' });
  }));
