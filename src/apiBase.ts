const configuredBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

export const apiBase = configuredBase || (import.meta.env.DEV
  ? ''
  : 'https://the-plan-prod-api.aldoramadhan16.workers.dev');
