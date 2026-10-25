import type { PlanFormAnswers, PublicFormRecord } from './types';
import { apiBase } from '../apiBase';

const base = apiBase;

export class FormApiError extends Error {
  constructor(message: string, public status: number, public issues: string[] = []) { super(message); }
}

async function send<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('X-Form-Token', token);
  const response = await fetch(`${base}${path}`, { ...options, headers });
  if (!response.ok) {
    let detail: { error?: string; issues?: Array<{ path?: string; message?: string }> } = {};
    try { detail = await response.json() as typeof detail; } catch { /* status fallback */ }
    throw new FormApiError(detail.error || `Request failed (${response.status})`, response.status, detail.issues?.map((issue) => issue.path || issue.message || '').filter(Boolean) || []);
  }
  return response.json() as Promise<T>;
}

export const formApi = {
  get: (projectId: string, token: string) => send<PublicFormRecord>(`/api/public/forms/${encodeURIComponent(projectId)}`, token),
  save: (projectId: string, token: string, answers: PlanFormAnswers) => send<{ savedAt: string }>(`/api/public/forms/${encodeURIComponent(projectId)}`, token, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(answers),
  }),
  submit: (projectId: string, token: string, answers: PlanFormAnswers) => send<{ orderId: string; submittedAt: string }>(`/api/public/forms/${encodeURIComponent(projectId)}/submit`, token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(answers),
  }),
  upload: async (projectId: string, token: string, file: File): Promise<{ media: { id: string; url: string; name: string; type: 'image' | 'video' | 'audio' } }> => send(`/api/public/forms/${encodeURIComponent(projectId)}/media`, token, {
    method: 'POST', headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) }, body: file,
  }),
};

