import assert from 'node:assert/strict';
import test from 'node:test';
import { brandingFromEnv } from './branding.js';
import { escapeHtml } from './html.js';
import { underlineDecorations } from './highlight.js';
import { renderDocument } from './template.js';
import { validateCard } from './validate.js';

const branding = brandingFromEnv({ CARD_AUTHOR: 'Ada Lovelace', CARD_WEBSITE: 'ada.example' });

test('escapes markup in user text', () => {
  assert.equal(escapeHtml('<script>"&\'</script>'), '&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;');
});

test('document embeds fonts, blocks nothing external, and escapes card text', async () => {
  const card = validateCard({
    title: 'Title <b>',
    subtitle: 'Sub',
    tags: ['A&B'],
    panels: [{ language: 'csharp', code: 'var x = "<tag>";' }],
  });
  const html = await renderDocument([card], branding);
  assert.match(html, /@font-face\{font-family:Inter;font-weight:700/);
  assert.match(html, /@font-face\{font-family:Mono/);
  assert.ok(!/https?:\/\//.test(html.replace(/<title>.*<\/title>/, '')), 'no external URLs');
  assert.ok(html.includes('<h1>Title &lt;b&gt;</h1>'));
  assert.ok(html.includes('A&amp;B'));
  assert.ok(html.includes('class="card layout-stack theme-editorial panels-1"'));
  assert.ok(html.includes('data-font-max="20" data-font-min="16"'));
  assert.ok(html.includes('Ada Lovelace'));
  assert.ok(!html.includes('<div class="footer-mark">'));
});

test('panel decorations render as classes, badges, notes and underlines', async () => {
  const card = validateCard({
    title: 'T',
    subtitle: 'S',
    layout: 'columns',
    theme: 'midnight',
    panels: [
      { label: 'Bad', language: 'csharp', code: 'var a = 1;', verdict: 'bad', notes: ['slow <x>'] },
      {
        label: 'Good',
        language: 'csharp',
        code: 'var b = 2;',
        verdict: 'good',
        underline: ['var b'],
        highlightLines: [1],
      },
    ],
  });
  const html = await renderDocument([card], branding);
  assert.ok(html.includes('layout-columns theme-midnight panels-2'));
  assert.ok(html.includes('<section class="panel verdict-bad">'));
  assert.ok(html.includes('<span class="badge">✓</span>'));
  assert.ok(html.includes('<li>slow &lt;x&gt;</li>'));
  assert.ok(html.includes('class="underline"'));
  assert.ok(html.includes('data-highlight="true"'));
  assert.ok(html.includes('.theme-midnight {'), 'theme css included');
});

test('multi-card documents include every used theme once', async () => {
  const base = { title: 'T', subtitle: 'S', panels: [{ language: 'csharp', code: 'x' }] };
  const html = await renderDocument(
    [validateCard(base), validateCard({ ...base, theme: 'midnight' }), validateCard(base)],
    branding,
  );
  assert.equal(html.match(/<main class="card/g)?.length, 3);
  assert.equal(html.match(/\.theme-editorial \{/g)?.length, 1);
  assert.equal(html.match(/\.theme-midnight \{/g)?.length, 1);
});

test('footer mark is optional and escaped', async () => {
  const card = validateCard({ title: 'T', subtitle: 'S', panels: [{ language: 'csharp', code: 'x' }] });
  const html = await renderDocument([card], brandingFromEnv({ CARD_FOOTER_MARK: '<MK>' }));
  assert.ok(html.includes('<div class="footer-mark">&lt;MK&gt;<span>↗</span></div>'));
});

test('underline decorations cover every occurrence and skip overlaps', () => {
  const code = 'Lock a; Lock b;';
  assert.deepEqual(
    underlineDecorations(code, ['Lock']).map((d) => [d.start, d.end]),
    [
      [0, 4],
      [8, 12],
    ],
  );
  assert.deepEqual(
    underlineDecorations(code, ['Lock a', 'a; Lock']).map((d) => [d.start, d.end]),
    [[0, 6]],
  );
});
