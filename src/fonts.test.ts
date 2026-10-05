import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fontFaceCss } from './fonts.js';
import { DESIGN_TOKEN_FONTS } from './themes/design-tokens.js';

test('design-token fonts are read from the package stylesheet, normal style only', async () => {
  const css = await fontFaceCss([DESIGN_TOKEN_FONTS]);
  for (const family of DESIGN_TOKEN_FONTS.families) {
    assert.ok(css.includes(`font-family:"${family}"`), `${family} is embedded`);
  }
  assert.ok(css.includes('data:font/woff2;base64,'));
  assert.ok(!/https?:\/\//.test(css), 'no external URLs');
});

test('a token family with no face in the stylesheet is an error naming it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'fonts-'));
  const stylesheet = join(dir, 'fonts.css');
  await writeFile(join(dir, 'a.woff2'), 'x');
  await writeFile(
    stylesheet,
    '@font-face { font-family: "Present"; font-style: normal; font-weight: 400; src: url("a.woff2") format("woff2"); }',
  );
  const css = await fontFaceCss([{ stylesheet, families: ['Present'] }]);
  assert.ok(css.includes('font-family:"Present";font-weight:400'));
  await assert.rejects(fontFaceCss([{ stylesheet, families: ['Present', 'Gone'] }]), /family "Gone"/);
});
