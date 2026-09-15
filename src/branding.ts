import { loadEnvFile } from 'node:process';

export type Branding = {
  author: string;
  website: string;
  series: string;
  monogram: string;
  footerMark: string;
  issueLabel: string;
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

export function brandingFromEnv(env: NodeJS.ProcessEnv): Branding {
  const read = (key: string, fallback: string) => env[key]?.trim() || fallback;
  const author = read('CARD_AUTHOR', 'Your Name');
  return {
    author,
    website: read('CARD_WEBSITE', 'example.com'),
    series: read('CARD_SERIES', 'Field Notes'),
    monogram: read('CARD_MONOGRAM', initials(author)),
    footerMark: read('CARD_FOOTER_MARK', ''),
    issueLabel: read('CARD_ISSUE_LABEL', 'Note'),
  };
}

/** "Manjunath HK" → "MH"; single-word names use their first two letters. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  return (words[0] ?? 'YN').slice(0, 2).toUpperCase();
}
