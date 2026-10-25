import { studioSession, StudioApiError } from '../studio/api';
import { apiBase } from '../apiBase';
import type { CreateOrderPayload, DashboardData, OrderStatus } from './types';

const base = apiBase;

async function send<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = studioSession.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...options, headers });
  if (!response.ok) {
    let detail: { error?: string } = {};
    try { detail = await response.json() as typeof detail; } catch { /* keep status fallback */ }
    throw new StudioApiError(detail.error || `Request failed (${response.status})`, response.status);
  }
  return response.json() as Promise<T>;
}

export const adminApi = {
  dashboard: () => send<DashboardData>('/api/internal/dashboard'),
  createOrder: (payload: CreateOrderPayload) => send<{ createdAt: string; orderId: string; projectId: string }>('/api/internal/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }),
  updateOrder: (orderId: string, status: OrderStatus, notes: string) => send<{ updatedAt: string }>(`/api/internal/orders/${encodeURIComponent(orderId)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, notes }),
  }),
};
