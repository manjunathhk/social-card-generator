import { loadEnvFile } from 'node:process';

export type Branding = {
  author: string;
  website: string;
  series: string;
  footerMark: string;
  issueLabel: string;
  linkedin: string;
  twitter: string;
  credit: boolean;
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
 * fields from the rendered card. `CARD_CREDIT` is opt-in: only an explicit
 * true-ish value adds the credit line.
 */
export function brandingFromEnv(env: NodeJS.ProcessEnv): Branding {
  const read = (key: string) => env[key]?.trim() || '';
  return {
    author: read('CARD_AUTHOR'),
    website: read('CARD_WEBSITE'),
    series: read('CARD_SERIES'),
    footerMark: read('CARD_FOOTER_MARK'),
    issueLabel: read('CARD_ISSUE_LABEL'),
    linkedin: read('CARD_LINKEDIN'),
    twitter: read('CARD_TWITTER'),
    credit: ['true', '1', 'yes', 'on'].includes(read('CARD_CREDIT').toLowerCase()),
  };
}
