import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * File-based persistence for exported cards: one `<id>.json` (everything
 * needed to reopen the card in the editor) and one `<id>.png` per entry,
 * under `<dataDir>/cards/`. No database — at the scale of a self-hosted,
 * single-user tool, a directory of small files is easier to inspect, back
 * up, and reason about than adding a dependency for it.
 */

export type CardRecord = {
  id: string;
  title: string;
  createdAt: string;
  format: 'markdown' | 'json';
  source: string;
  /** '' means "from source" — the picker was left on its default. */
  layout: string;
  theme: string;
  /** Present only when theme was 'custom': the sandbox's palette inputs. */
  customPalette?: Record<string, string>;
  branding: Record<string, string>;
  scale: number;
  width: number;
  height: number;
};

export type NewCard = Omit<CardRecord, 'id' | 'createdAt'>;

const ID = /^[a-f0-9-]{36}$/;

function cardsDir(dataDir: string): string {
  return join(dataDir, 'cards');
}

function jsonPath(dataDir: string, id: string): string {
  return join(cardsDir(dataDir), `${id}.json`);
}

function pngPath(dataDir: string, id: string): string {
  return join(cardsDir(dataDir), `${id}.png`);
}

/** Rejects anything that isn't an id this module generated itself. */
export function isValidId(id: string): boolean {
  return ID.test(id);
}

export async function createCard(dataDir: string, card: NewCard, png: Buffer): Promise<CardRecord> {
  await mkdir(cardsDir(dataDir), { recursive: true });
  const record: CardRecord = { ...card, id: randomUUID(), createdAt: new Date().toISOString() };
  await Promise.all([
    writeFile(jsonPath(dataDir, record.id), JSON.stringify(record)),
    writeFile(pngPath(dataDir, record.id), png),
  ]);
  return record;
}

/** Newest first. Every field except the PNG bytes — small enough to send whole. */
export async function listCards(dataDir: string): Promise<CardRecord[]> {
  let names: string[];
  try {
    names = await readdir(cardsDir(dataDir));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const records = await Promise.all(
    names
      .filter((name) => name.endsWith('.json'))
      .map(async (name) => JSON.parse(await readFile(join(cardsDir(dataDir), name), 'utf8')) as CardRecord),
  );
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCard(dataDir: string, id: string): Promise<CardRecord | undefined> {
  try {
    return JSON.parse(await readFile(jsonPath(dataDir, id), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

export async function getCardImage(dataDir: string, id: string): Promise<Buffer | undefined> {
  try {
    return await readFile(pngPath(dataDir, id));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

/** True if a record existed to delete. */
export async function deleteCard(dataDir: string, id: string): Promise<boolean> {
  const existed = (await getCard(dataDir, id)) !== undefined;
  await Promise.all([rm(jsonPath(dataDir, id), { force: true }), rm(pngPath(dataDir, id), { force: true })]);
  return existed;
}
