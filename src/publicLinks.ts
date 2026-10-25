export const canonicalGiftHosts = new Set([
  'plan.for-you-always.my.id',
  'the-plan-iota.vercel.app',
  'localhost',
  '127.0.0.1',
]);

export function normalizeCustomHostname(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const input = value.trim().toLowerCase();
  if (!input) return '';
  let hostname = input;
  try {
    const url = new URL(input.includes('://') ? input : `https://${input}`);
    if (url.protocol !== 'https:' || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash || url.port) return null;
    hostname = url.hostname.toLowerCase();
  } catch { return null; }
  if (canonicalGiftHosts.has(hostname)) return null;
  if (hostname.length > 253 || !hostname.includes('.') || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/.test(hostname) || hostname.includes('..')) return null;
  return hostname;
}

export function isCustomGiftHostname(hostname: string): boolean {
  return !canonicalGiftHosts.has(hostname.trim().toLowerCase());
}

export function publicGiftUrl(frontendOrigin: string, projectId: string, customHostname?: string | null): string {
  return customHostname ? `https://${customHostname}/` : new URL(`/gift/${projectId}`, frontendOrigin).href;
}
