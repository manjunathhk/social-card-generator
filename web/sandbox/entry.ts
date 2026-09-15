/**
 * Browser entry for the sandbox. Everything here is the same core the CLI
 * uses; the build script swaps in browser variants for the two Node-only
 * modules (fonts from disk, Shiki with the WASM engine) and exposes the
 * result on `window.SocialCard` for the page script in index.template.html.
 */
import { toBlob } from 'html-to-image';
import { brandingFromEnv } from '../../src/branding.js';
import { FIT_SCRIPT } from '../../src/fit-script.js';
import { parseMarkdown } from '../../src/markdown.js';
import { LAYOUTS, LAYOUT_RULES } from '../../src/schema.js';
import { renderCard } from '../../src/template.js';
import { baseCss, getTheme, THEME_NAMES, THEMES } from '../../src/themes/index.js';
import { validateCard } from '../../src/validate.js';
import { SANDBOX_LANGUAGES } from './browser-highlight.js';
// Provided by scripts/build-sandbox.ts as virtual modules.
import examples from 'virtual:examples';
import { FONT_CSS } from 'virtual:fonts';

declare global {
  interface Window {
    SocialCard: typeof api;
  }
}

const api = {
  parseMarkdown,
  validateCard,
  renderCard,
  baseCss,
  getTheme,
  THEME_NAMES,
  THEMES,
  FIT_SCRIPT,
  brandingFromEnv,
  LAYOUTS,
  LAYOUT_RULES,
  FONT_CSS,
  SANDBOX_LANGUAGES,
  toBlob,
  examples,
};

window.SocialCard = api;
