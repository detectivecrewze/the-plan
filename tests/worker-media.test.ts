import { describe, expect, it } from 'vitest';
import worker, { type Env } from '../worker/index';
import { demo } from '../src/demo';

function fixture() {
  const records = new Map<string, string>();
  const files = new Map<string, { body: ArrayBuffer; type: string }>();
  const env = {
    STUDIO_PASSWORD: 'test-password', SESSION_SECRET: 'test-session-secret', ORDER_INGEST_SECRET: 'test-order-ingest-secret', FRONTEND_ORIGIN: 'https://plan.test',
    THE_PLAN_KV: {
      get: async (key: string, format?: string) => {
        const value = records.get(key) ?? null;
        return value && format === 'json' ? JSON.parse(value) : value;
      },
      put: async (key: string, value: string) => { records.set(key, value); },
    },
    THE_PLAN_MEDIA: {
      put: async (key: string, body: ArrayBuffer, options: { httpMetadata?: { contentType?: string } }) => {
        files.set(key, { body, type: options.httpMetadata?.contentType || '' });
      },
      get: async (key: string) => {
        const file = files.get(key);
        return file ? { body: file.body, httpMetadata: { contentType: file.type } } : null;
      },
    },
  } as unknown as Env;
  const projectId = 'plan-media-test';
  const token = 'test-form-token-with-enough-length';
  records.set(`form-access:${projectId}`, JSON.stringify({ orderId: 'order-media-test', formToken: token }));
  records.set('order:order-media-test', JSON.stringify({ orderId: 'order-media-test', projectId, status: 'waiting_form' }));
  records.set(`draft:${projectId}`, JSON.stringify({ project: { ...demo, id: projectId }, savedAt: new Date().toISOString() }));
  return { env, files, projectId, token };
}

describe('The Plan R2 media endpoints', () => {
  it.each([
    ['image/jpeg', 'photo.jpg', 'image'],
    ['video/mp4', 'clip.mp4', 'video'],
    ['audio/mpeg', 'song.mp3', 'audio'],
  ])('accepts %s from the customer form and serves it back', async (mime, filename, expectedType) => {
    const { env, projectId, token } = fixture();
    const upload = await worker.fetch(new Request(`https://plan.test/api/public/forms/${projectId}/media`, {
      method: 'POST', headers: { 'X-Form-Token': token, 'Content-Type': mime, 'X-File-Name': encodeURIComponent(filename) }, body: new Uint8Array([1, 2, 3]),
    }), env);
    expect(upload.status).toBe(201);
    const { media } = await upload.json() as { media: { url: string; type: string; name: string } };
    expect(media).toMatchObject({ type: expectedType, name: filename });
    const retrieved = await worker.fetch(new Request(media.url), env);
    expect(retrieved.status).toBe(200);
    expect(retrieved.headers.get('Content-Type')).toBe(mime);
    expect([...new Uint8Array(await retrieved.arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it('requires the form token and supports authenticated Studio audio upload', async () => {
    const { env, projectId, files } = fixture();
    const denied = await worker.fetch(new Request(`https://plan.test/api/public/forms/${projectId}/media`, {
      method: 'POST', headers: { 'Content-Type': 'audio/mpeg' }, body: new Uint8Array([1]),
    }), env);
    expect(denied.status).toBe(403);
    const login = await worker.fetch(new Request('https://plan.test/api/internal/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'test-password' }),
    }), env);
    expect(login.status).toBe(200);
    const { token } = await login.json() as { token: string };
    const studioUpload = await worker.fetch(new Request(`https://plan.test/api/internal/media/${projectId}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'audio/mpeg' }, body: new Uint8Array([4, 5]),
    }), env);
    expect(studioUpload.status).toBe(201);
    expect(files.size).toBe(1);
    expect([...files.keys()][0]).toMatch(new RegExp(`^the-plan/${projectId}/`));
  });
});

describe('The Plan payment order integration', () => {
  it('creates one form project per paid Order ID and is idempotent', async () => {
    const { env } = fixture();
    const request = () => new Request('https://plan.test/api/integrations/orders', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-order-ingest-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'order-plan-20261025-001', customerName: 'Aldo', customerEmail: 'aldo@example.com' }),
    });
    const first = await worker.fetch(request(), env);
    const second = await worker.fetch(request(), env);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    const firstData = await first.json() as { projectId: string; formUrl: string; studioUrl: string };
    const secondData = await second.json() as typeof firstData;
    expect(secondData).toEqual(expect.objectContaining(firstData));
    expect(firstData.projectId).toMatch(/^plan-[a-f0-9]{24}$/);
    expect(firstData.formUrl).toContain(`/form/${firstData.projectId}?token=`);
    expect(firstData.studioUrl).toBe(`https://plan.test/studio/${firstData.projectId}`);
    const formToken = new URL(firstData.formUrl).searchParams.get('token') || '';
    const form = await worker.fetch(new Request(`https://plan.test/api/public/forms/${firstData.projectId}`, { headers: { 'X-Form-Token': formToken } }), env);
    expect(form.status).toBe(200);
  });

  it('rejects callers without the payment integration secret', async () => {
    const { env } = fixture();
    const denied = await worker.fetch(new Request('https://plan.test/api/integrations/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: 'order-plan-denied' }),
    }), env);
    expect(denied.status).toBe(401);
  });
});
