import type { GiftProject } from '../project';

const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const tokenKey = 'the-plan:studio-session';

export const studioSession = {
  get: () => sessionStorage.getItem(tokenKey),
  set: (token: string) => sessionStorage.setItem(tokenKey, token),
  clear: () => sessionStorage.removeItem(tokenKey),
};

export class StudioApiError extends Error {
  constructor(message: string, readonly status: number, readonly issues: string[] = []) { super(message); }
}

async function send<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (authenticated) {
    const token = studioSession.get();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${base}${path}`, { ...options, headers });
  if (!response.ok) {
    let detail: { error?: string; issues?: Array<string | { path?: string; message: string }> } = {};
    try { detail = await response.json() as typeof detail; } catch { /* Network errors may have no JSON body. */ }
    throw new StudioApiError(detail.error || `Request failed (${response.status})`, response.status,
      (detail.issues || []).map((issue) => typeof issue === 'string' ? issue : `${issue.path || 'field'}: ${issue.message}`));
  }
  return response.json() as Promise<T>;
}

export interface DraftRecord { project: GiftProject; savedAt: string; publishedAt: string | null }

export const studioApi = {
  async login(password: string): Promise<void> {
    const result = await send<{ token: string }>('/api/internal/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
    }, false);
    studioSession.set(result.token);
  },
  getDraft: (id: string) => send<DraftRecord>(`/api/internal/drafts/${encodeURIComponent(id)}`),
  getPublished: (id: string) => send<{ project: GiftProject; publishedAt: string }>(`/api/public/gifts/${encodeURIComponent(id)}`, {}, false),
  createDraft: (project: GiftProject) => send<DraftRecord>('/api/internal/drafts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project),
  }),
  saveDraft: (project: GiftProject) => send<{ savedAt: string }>(`/api/internal/drafts/${encodeURIComponent(project.id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project),
  }),
  publish: (id: string) => send<{ publishedAt: string; giftUrl: string }>(`/api/internal/drafts/${encodeURIComponent(id)}/publish`, { method: 'POST' }),
  upload: (id: string, file: File) => send<{ url: string }>(`/api/internal/media/${encodeURIComponent(id)}`, {
    method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': file.name }, body: file,
  }),
};
