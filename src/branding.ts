import { loadEnvFile } from 'node:process';

export type Branding = {
  author: string;
  website: string;
  series: string;
  monogram: string;
  footerMark: string;
  issueLabel: string;
  linkedin: string;
  twitter: string;
};

/**
 * Loads `.env` (or the given file) into `process.env` without overriding
 * variables already set in the shell, then reads the branding fields.
 */
export function loadBranding(envPath = '.env'): Branding {
  try {
    loadEnvFile(envPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return brandingFromEnv(process.env);
}

/**
 * Every field is optional: a blank or unset variable leaves that field blank
 * rather than falling back to placeholder text, and the template omits blank
 * fields from the rendered card. The monogram is the one exception — it
 * still derives from the author when left blank, as long as an author is set.
 */
export function brandingFromEnv(env: NodeJS.ProcessEnv): Branding {
  const read = (key: string) => env[key]?.trim() || '';
  const author = read('CARD_AUTHOR');
  return {
    author,
    website: read('CARD_WEBSITE'),
    series: read('CARD_SERIES'),
    monogram: read('CARD_MONOGRAM') || (author ? initials(author) : ''),
    footerMark: read('CARD_FOOTER_MARK'),
    issueLabel: read('CARD_ISSUE_LABEL'),
    linkedin: read('CARD_LINKEDIN'),
    twitter: read('CARD_TWITTER'),
  };
}

/** "Manjunath HK" → "MH"; single-word names use their first two letters. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  return (words[0] ?? 'YN').slice(0, 2).toUpperCase();
}
