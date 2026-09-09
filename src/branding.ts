import { loadEnvFile } from 'node:process';

export function loadBranding(envPath = '.env') {
  try { loadEnvFile(envPath); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return brandingFromEnv(process.env);
}

export function brandingFromEnv(env: NodeJS.ProcessEnv) {
  const value = (key: string, fallback: string) => env[key]?.trim() || fallback;
  return {
    author: value('CARD_AUTHOR', 'Manjunath HK'),
    website: value('CARD_WEBSITE', 'manjunathhk.in'),
    series: value('CARD_SERIES', 'Architecture Notes'),
    monogram: value('CARD_MONOGRAM', 'MHK'),
    footerMark: value('CARD_FOOTER_MARK', 'M'),
    issueLabel: value('CARD_ISSUE_LABEL', 'Field Note'),
  };
}
