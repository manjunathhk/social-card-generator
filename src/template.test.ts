import { dark, light } from '@manjunathhk/design-tokens';
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
  assert.match(html, /@font-face\{font-family:"Inter";font-weight:400/);
  assert.match(html, /@font-face\{font-family:"JetBrains Mono"/);
  assert.ok(!/https?:\/\//.test(html.replace(/<title>.*<\/title>/, '')), 'no external URLs');
  assert.ok(html.includes('<h1>Title &lt;b&gt;</h1>'));
  assert.ok(html.includes('A&amp;B'));
  assert.ok(html.includes('class="card layout-stack theme-light panels-1"'));
  assert.ok(html.includes('data-font-max="28" data-font-min="18"'));
  assert.match(html, /style="--h1:65px;--subtitle:26px;/);
  assert.ok(html.includes('Ada Lovelace'));
  assert.ok(!html.includes('<div class="footer-mark">'));
});

test('panel decorations render as classes, badges, notes and underlines', async () => {
  const card = validateCard({
    title: 'T',
    subtitle: 'S',
    layout: 'columns',
    theme: 'dark',
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
  assert.ok(html.includes('layout-columns theme-dark panels-2'));
  assert.match(html, /style="--h1:58px;/);
  assert.ok(html.includes('font-family:"JetBrains Mono"'));
  assert.ok(html.includes('<section class="panel verdict-bad" style="--weight:5">'));
  assert.ok(html.includes('<span class="badge">✓</span>'));
  assert.ok(html.includes('<li>slow &lt;x&gt;</li>'));
  assert.ok(html.includes('class="underline"'));
  assert.ok(html.includes('data-highlight="true"'));
  assert.ok(html.includes('.theme-dark {'), 'theme css included');
});

test('multi-card documents include every used theme once', async () => {
  const base = { title: 'T', subtitle: 'S', panels: [{ language: 'csharp', code: 'x' }] };
  const html = await renderDocument(
    [validateCard(base), validateCard({ ...base, theme: 'dark' }), validateCard(base)],
    branding,
  );
  assert.equal(html.match(/<main class="card/g)?.length, 3);
  assert.equal(html.match(/\.theme-light \{/g)?.length, 1);
  assert.equal(html.match(/\.theme-dark \{/g)?.length, 1);
  assert.equal(html.match(/font-family:"Inter";font-weight:400/g)?.length, 1, 'shared font embedded once');
});

test('light and dark take their palette and Inter and JetBrains Mono faces from @manjunathhk/design-tokens', async () => {
  const base = { title: 'T', subtitle: 'S', panels: [{ language: 'csharp', code: 'x' }] };
  const html = await renderDocument(
    [validateCard({ ...base, theme: 'light' }), validateCard({ ...base, theme: 'dark' })],
    branding,
  );
  assert.ok(html.includes('class="card layout-stack theme-light panels-1"'));
  assert.ok(html.includes('class="card layout-stack theme-dark panels-1"'));
  assert.match(html, new RegExp(`\\.theme-light \\{\\s*--bg: ${light['color.bg']};`));
  assert.match(html, new RegExp(`\\.theme-dark \\{\\s*--bg: ${dark['color.bg']};`));
  assert.equal(
    html.match(/font-family:"JetBrains Mono";font-weight:400/g)?.length,
    1,
    'font files shared by the two themes are embedded once',
  );
  assert.ok(!/https?:\/\//.test(html.replace(/<title>.*<\/title>/, '')), 'no external URLs');
});

test('footer mark is optional and escaped', async () => {
  const card = validateCard({ title: 'T', subtitle: 'S', panels: [{ language: 'csharp', code: 'x' }] });
  const html = await renderDocument([card], brandingFromEnv({ CARD_FOOTER_MARK: '<MK>' }));
  assert.ok(html.includes('<div class="footer-mark">&lt;MK&gt;<span>↗</span></div>'));
});

test('footer puts the author left and series, website and socials right, each only when set', async () => {
  const card = validateCard({ title: 'T', subtitle: 'S', panels: [{ language: 'csharp', code: 'x' }] });

  const full = await renderDocument(
    [card],
    brandingFromEnv({
      CARD_AUTHOR: 'Ada',
      CARD_SERIES: 'Notes',
      CARD_WEBSITE: 'example.com',
      CARD_LINKEDIN: 'in/<x>',
      CARD_TWITTER: '@x',
    }),
  );
  assert.ok(full.includes('<strong class="author">Ada</strong>'));
  assert.match(full, /<div class="footer-items"><span class="series-name">Notes<\/span><span>example\.com<\/span>/);
  assert.match(full, /<span class="social"><svg class="social-logo".*<\/svg>\/&lt;x&gt;<\/span><span>@x<\/span>/);
  assert.equal(full.match(/class="series-name"/g)?.length, 1, 'the series appears once, in the footer');

  const bare = await renderDocument([card], brandingFromEnv({}));
  assert.ok(!bare.includes('<strong class="author">'));
  assert.ok(!bare.includes('class="footer-items"'));
});

test('LinkedIn shows the logo and the handle whether given a URL, a path or a bare name', async () => {
  const card = validateCard({ title: 'T', subtitle: 'S', panels: [{ language: 'csharp', code: 'x' }] });
  for (const value of ['https://www.linkedin.com/in/ada/', 'linkedin.com/in/ada', 'in/ada', '@ada', 'ada']) {
    const html = await renderDocument([card], brandingFromEnv({ CARD_LINKEDIN: value }));
    assert.match(html, /<\/svg>\/ada<\/span>/, value);
  }
});

test('the running head carries the issue and only exists when there is one', async () => {
  const panels = [{ language: 'csharp', code: 'x' }];
  const withIssue = await renderDocument(
    [validateCard({ title: 'T', subtitle: 'S', issue: '07', panels })],
    brandingFromEnv({ CARD_AUTHOR: 'Ada', CARD_ISSUE_LABEL: 'Note' }),
  );
  assert.ok(
    withIssue.includes(
      '<span class="issue-label">Note</span><span class="issue-sep">/</span><span class="issue-no">07</span>',
    ),
  );
  assert.ok(!withIssue.includes('class="mark"'), 'no author initials in the head');

  const withoutIssue = await renderDocument(
    [validateCard({ title: 'T', subtitle: 'S', panels })],
    brandingFromEnv({ CARD_AUTHOR: 'Ada', CARD_SERIES: 'Notes', CARD_ISSUE_LABEL: 'Note' }),
  );
  assert.ok(!withoutIssue.includes('<header class="masthead">'));
  assert.ok(!withoutIssue.includes('issue-no'));
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
