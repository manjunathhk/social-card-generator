/**
 * Writes schema/card.schema.json from src/card-schema.ts, which derives every
 * limit from src/schema.ts and the theme registry. Run it after changing any
 * of those; src/card-schema.test.ts fails while the committed file is stale.
 *
 *   npm run schema
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { buildCardSchema } from '../src/card-schema.js';

const target = fileURLToPath(new URL('../schema/card.schema.json', import.meta.url));
const config = await resolveConfig(target);
const json = await format(JSON.stringify(buildCardSchema()), { ...config, filepath: target });
await writeFile(target, json);
console.log(`Wrote ${target}`);
