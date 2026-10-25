import { projectSchema } from '../src/projectSchema';
import type { GiftProject } from '../src/project';
import { validateProject } from '../src/project';
import type { AdminOrder, DashboardData, OrderStatus, ProjectSummary, RecipientResponse } from '../src/admin/types';
import { planFormDraftSchema, planFormSchema } from '../src/form/schema';
import type { PlanFormAnswers } from '../src/form/types';
import { applyFormAnswersToProject } from '../src/form/applyToProject';
import { createProjectStarter } from '../src/projectStarter';

export interface Env {
  THE_PLAN_KV: KVNamespace;
  THE_PLAN_MEDIA: R2Bucket;
  STUDIO_PASSWORD: string;
  SESSION_SECRET: string;
  ORDER_INGEST_SECRET?: string;
  ALLOWED_ORIGIN?: string;
  FRONTEND_ORIGIN?: string;
  MEDIA_PUBLIC_ORIGIN?: string;
}

const projectId = /^[a-z0-9][a-z0-9-]{2,63}$/;
const orderId = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,79}$/;
const orderStatuses: OrderStatus[] = ['waiting_form', 'ready_to_craft', 'in_progress', 'review', 'done'];
const sessionLifetime = 8 * 60 * 60 * 1000;
const encoder = new TextEncoder();

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function encode64(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode64(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')), (character) => character.charCodeAt(0));
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return encode64(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

async function passwordMatches(given: string, expected: string): Promise<boolean> {
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  const [a, b] = await Promise.all([digest(given), digest(expected)]);
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  return difference === 0;
}

async function createSession(env: Env): Promise<{ token: string; expiresAt: string }> {
  const expires = Date.now() + sessionLifetime;
  const payload = encode64(encoder.encode(JSON.stringify({ exp: expires, role: 'studio' })));
  return { token: `${payload}.${await hmac(env.SESSION_SECRET, payload)}`, expiresAt: new Date(expires).toISOString() };
}

async function validSession(request: Request, env: Env): Promise<boolean> {
  const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token || !env.SESSION_SECRET) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;
  try {
    const expected = await hmac(env.SESSION_SECRET, payload);
    if (signature.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < signature.length; index++) difference |= signature.charCodeAt(index) ^ expected.charCodeAt(index);
    if (difference) return false;
    const data = JSON.parse(new TextDecoder().decode(decode64(payload))) as { exp?: number; role?: string };
    return data.role === 'studio' && typeof data.exp === 'number' && data.exp > Date.now();
  } catch { return false; }
}

function allowedOrigin(origin: string | null, env: Env): boolean {
  if (!origin) return true;
  const configured = (env.ALLOWED_ORIGIN || '').split(',').map((entry) => entry.trim()).filter(Boolean);
  return configured.includes(origin) || (configured.length === 0 && ['http://127.0.0.1:5173', 'http://localhost:5173'].includes(origin));
}

function withCors(response: Response, origin: string | null): Response {
  if (!origin) return response;
  const result = new Response(response.body, response);
  result.headers.set('Access-Control-Allow-Origin', origin);
  result.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  result.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-File-Name, X-Form-Token');
  result.headers.set('Vary', 'Origin');
  return result;
}

async function readProject(request: Request, expectedId?: string): Promise<GiftProject | Response> {
  if (Number(request.headers.get('Content-Length') || 0) > 256_000) return json({ error: 'Project data is too large' }, 413);
  let raw: unknown;
  try { raw = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: 'Invalid project', issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) }, 400);
  }
  if (expectedId && parsed.data.id !== expectedId) return json({ error: 'Project ID does not match URL' }, 400);
  return parsed.data;
}

async function listValues<T>(kv: KVNamespace, prefix: string): Promise<T[]> {
  const values: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await kv.list({ prefix, cursor, limit: 1000 });
    for (const key of page.keys) {
      const value = await kv.get<T>(key.name, 'json');
      if (value !== null) values.push(value);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return values;
}

function textValue(value: unknown, limit: number): string | null {
  return typeof value === 'string' && value.length <= limit ? value.trim() : null;
}

interface FormAccess { orderId: string; formToken: string }

interface PaymentOrderRequest {
  orderId?: unknown;
  customerName?: unknown;
  customerEmail?: unknown;
  customerWhatsapp?: unknown;
}

function frontendOrigin(env: Env): string {
  return env.FRONTEND_ORIGIN || (env.ALLOWED_ORIGIN || '').split(',')[0] || 'http://127.0.0.1:5173';
}

function mediaPublicUrl(env: Env, requestUrl: URL, id: string, filename: string): string {
  const origin = env.MEDIA_PUBLIC_ORIGIN?.trim() || requestUrl.origin;
  return new URL(`/api/media/${id}/${filename}`, origin).href;
}

async function stablePaymentProjectId(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return `plan-${[...digest].slice(0, 12).map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}

function paymentLinks(env: Env, id: string, formToken: string) {
  const origin = frontendOrigin(env);
  return {
    formUrl: new URL(`/form/${id}?token=${encodeURIComponent(formToken)}`, origin).href,
    studioUrl: new URL(`/studio/${id}`, origin).href,
  };
}

async function getFormContext(request: Request, env: Env, id: string): Promise<{ access: FormAccess; order: AdminOrder } | Response> {
  if (!projectId.test(id)) return json({ error: 'Invalid form ID' }, 400);
  const access = await env.THE_PLAN_KV.get<FormAccess>(`form-access:${id}`, 'json');
  if (!access) return json({ error: 'Form not found' }, 404);
  const given = request.headers.get('X-Form-Token') || '';
  if (!given || !(await passwordMatches(given, access.formToken))) return json({ error: 'Invalid form link' }, 403);
  const order = await env.THE_PLAN_KV.get<AdminOrder>(`order:${access.orderId}`, 'json');
  if (!order || order.projectId !== id) return json({ error: 'Order not found' }, 404);
  return { access, order };
}

async function readFormAnswers(request: Request, complete = true): Promise<PlanFormAnswers | Response> {
  if (Number(request.headers.get('Content-Length') || 0) > 180_000) return json({ error: 'Form data is too large' }, 413);
  let raw: unknown;
  try { raw = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const parsed = (complete ? planFormSchema : planFormDraftSchema).safeParse(raw);
  if (!parsed.success) {
    return json({ error: 'Please complete the required form fields', issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) }, 400);
  }
  return parsed.data;
}

const mediaTypes: Record<string, number> = {
  'image/jpeg': 15_000_000, 'image/png': 15_000_000, 'image/webp': 15_000_000, 'image/avif': 15_000_000,
  'video/mp4': 80_000_000, 'video/webm': 80_000_000,
  'audio/mpeg': 30_000_000, 'audio/mp4': 30_000_000, 'audio/wav': 30_000_000, 'audio/ogg': 30_000_000,
};

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  if (!env.THE_PLAN_KV || !env.THE_PLAN_MEDIA) return json({ error: 'Worker bindings are not configured' }, 503);

  if (request.method === 'POST' && url.pathname === '/api/internal/session') {
    if (!env.STUDIO_PASSWORD || !env.SESSION_SECRET) return json({ error: 'Studio login is not configured' }, 503);
    let password: unknown;
    try { ({ password } = await request.json() as { password: unknown }); } catch { return json({ error: 'Invalid request' }, 400); }
    if (typeof password !== 'string' || !(await passwordMatches(password, env.STUDIO_PASSWORD))) return json({ error: 'Invalid password' }, 401);
    return json(await createSession(env));
  }

  // Service-to-service fulfillment endpoint used by the payment gateway.
  // The deterministic project ID and form token make webhook retries safe.
  if (request.method === 'POST' && url.pathname === '/api/integrations/orders') {
    if (!env.ORDER_INGEST_SECRET) return json({ error: 'Payment integration is not configured' }, 503);
    const supplied = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1] || '';
    if (!supplied || !(await passwordMatches(supplied, env.ORDER_INGEST_SECRET))) return json({ error: 'Unauthorized' }, 401);
    if (Number(request.headers.get('Content-Length') || 0) > 24_000) return json({ error: 'Order data is too large' }, 413);

    let raw: PaymentOrderRequest;
    try { raw = await request.json() as PaymentOrderRequest; } catch { return json({ error: 'Invalid JSON' }, 400); }
    const id = textValue(raw.orderId, 80);
    if (!id || !orderId.test(id)) return json({ error: 'Invalid Order ID' }, 400);

    const linkedProjectId = await stablePaymentProjectId(id);
    const formToken = await hmac(env.ORDER_INGEST_SECRET, `the-plan-form:${id}`);
    const existing = await env.THE_PLAN_KV.get<AdminOrder>(`order:${id}`, 'json');
    if (existing) {
      if (existing.projectId !== linkedProjectId) return json({ error: 'Order ID conflict' }, 409);
      return json({ orderId: id, projectId: linkedProjectId, ...paymentLinks(env, linkedProjectId, existing.formToken || formToken), createdAt: existing.createdAt });
    }

    const now = new Date().toISOString();
    const project = createProjectStarter(linkedProjectId);
    const order: AdminOrder = {
      orderId: id,
      projectId: linkedProjectId,
      formToken,
      source: 'payment',
      status: 'waiting_form',
      customerName: textValue(raw.customerName, 160) || '',
      customerEmail: textValue(raw.customerEmail, 320) || '',
      customerWhatsapp: textValue(raw.customerWhatsapp, 80) || '',
      recipient: '',
      sender: '',
      locale: project.locale,
      theme: project.theme,
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    await Promise.all([
      env.THE_PLAN_KV.put(`draft:${linkedProjectId}`, JSON.stringify({ project, savedAt: now })),
      env.THE_PLAN_KV.put(`order:${id}`, JSON.stringify(order)),
      env.THE_PLAN_KV.put(`form-access:${linkedProjectId}`, JSON.stringify({ orderId: id, formToken } satisfies FormAccess)),
    ]);
    return json({ orderId: id, projectId: linkedProjectId, ...paymentLinks(env, linkedProjectId, formToken), createdAt: now }, 201);
  }

  if (request.method === 'GET' && segments[0] === 'api' && segments[1] === 'media' && segments.length === 4) {
    const id = segments[2];
    const filename = segments[3];
    if (!projectId.test(id) || !/^[a-z0-9-]{36}\.[a-z0-9]+$/.test(filename)) return json({ error: 'Invalid media URL' }, 400);
    const object = await env.THE_PLAN_MEDIA.get(`the-plan/${id}/${filename}`);
    if (!object) return json({ error: 'Media not found' }, 404);
    return new Response(object.body, { headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  }

  if (request.method === 'GET' && segments[0] === 'api' && segments[1] === 'public' && segments[2] === 'gifts' && segments.length === 4) {
    const id = segments[3];
    if (!projectId.test(id)) return json({ error: 'Invalid gift ID' }, 400);
    const published = await env.THE_PLAN_KV.get<{ project: GiftProject; publishedAt: string }>(`gift:${id}`, 'json');
    return published ? json({ project: published.project, publishedAt: published.publishedAt }) : json({ error: 'Gift not found' }, 404);
  }

  if (request.method === 'POST' && segments[0] === 'api' && segments[1] === 'public' && segments[2] === 'responses' && segments.length === 4) {
    const id = segments[3];
    if (!projectId.test(id)) return json({ error: 'Invalid gift ID' }, 400);
    if (!(await env.THE_PLAN_KV.get(`gift:${id}`))) return json({ error: 'Gift not found' }, 404);
    const existing = await env.THE_PLAN_KV.get<RecipientResponse>(`response:${id}`, 'json');
    if (existing) return json(existing);
    const response: RecipientResponse = { projectId: id, answer: 'yes', answeredAt: new Date().toISOString() };
    await env.THE_PLAN_KV.put(`response:${id}`, JSON.stringify(response));
    return json(response, 201);
  }

  if (segments[0] === 'api' && segments[1] === 'public' && segments[2] === 'forms' && segments.length >= 4) {
    const id = segments[3];
    const context = await getFormContext(request, env, id);
    if (context instanceof Response) return context;
    const { order } = context;

    if (request.method === 'GET' && segments.length === 4) {
      const saved = await env.THE_PLAN_KV.get<{ answers: PlanFormAnswers; savedAt: string }>(`form-draft:${id}`, 'json');
      return json({ projectId: id, orderId: order.orderId, status: order.submittedAt ? 'submitted' : 'open', draft: saved?.answers || order.answers || null, submittedAt: order.submittedAt || null });
    }

    if (request.method === 'PUT' && segments.length === 4) {
      if (order.submittedAt) return json({ error: 'Form has already been submitted' }, 410);
      const answers = await readFormAnswers(request, false);
      if (answers instanceof Response) return answers;
      const savedAt = new Date().toISOString();
      await env.THE_PLAN_KV.put(`form-draft:${id}`, JSON.stringify({ answers, savedAt }));
      return json({ savedAt });
    }

    if (request.method === 'POST' && segments[4] === 'submit' && segments.length === 5) {
      if (order.submittedAt) return json({ orderId: order.orderId, submittedAt: order.submittedAt });
      const answers = await readFormAnswers(request);
      if (answers instanceof Response) return answers;
      const submittedAt = new Date().toISOString();
      const draft = await env.THE_PLAN_KV.get<{ project: GiftProject; savedAt: string }>(`draft:${id}`, 'json');
      if (!draft?.project) return json({ error: 'Studio draft not found' }, 409);
      const applied = projectSchema.safeParse(applyFormAnswersToProject(draft.project, answers));
      if (!applied.success) return json({ error: 'Form data could not be applied to the Studio draft' }, 422);
      const updated: AdminOrder = {
        ...order,
        status: 'ready_to_craft',
        customerName: '',
        customerEmail: '',
        customerWhatsapp: '',
        recipient: answers.people.recipient,
        sender: answers.people.sender,
        locale: answers.locale,
        theme: answers.theme,
        answers,
        submittedAt,
        draftAppliedAt: submittedAt,
        updatedAt: submittedAt,
      };
      // Mark the order submitted only after its editable draft and raw form are durable.
      await env.THE_PLAN_KV.put(`draft:${id}`, JSON.stringify({ project: applied.data, savedAt: submittedAt }));
      await env.THE_PLAN_KV.put(`form-draft:${id}`, JSON.stringify({ answers, savedAt: submittedAt }));
      await env.THE_PLAN_KV.put(`order:${order.orderId}`, JSON.stringify(updated));
      return json({ orderId: order.orderId, submittedAt });
    }

    if (request.method === 'POST' && segments[4] === 'media' && segments.length === 5) {
      if (order.submittedAt) return json({ error: 'Form has already been submitted' }, 410);
      const type = request.headers.get('Content-Type')?.split(';')[0].toLowerCase() || '';
      const limit = mediaTypes[type];
      if (!limit || (!type.startsWith('image/') && !type.startsWith('video/') && !type.startsWith('audio/'))) return json({ error: 'Unsupported file format' }, 415);
      if (Number(request.headers.get('Content-Length') || 0) > limit) return json({ error: 'File is too large' }, 413);
      const body = await request.arrayBuffer();
      if (!body.byteLength || body.byteLength > limit) return json({ error: 'File is empty or too large' }, 413);
      const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/ogg': 'ogg' } as Record<string, string>)[type];
      if (!extension) return json({ error: 'Unsupported file format' }, 415);
      const idValue = crypto.randomUUID();
      const filename = `${idValue}.${extension}`;
      const encodedName = textValue(request.headers.get('X-File-Name'), 900) || filename;
      let originalName = encodedName;
      try { originalName = decodeURIComponent(encodedName).slice(0, 300); } catch { originalName = encodedName.slice(0, 300); }
      await env.THE_PLAN_MEDIA.put(`the-plan/${id}/${filename}`, body, { httpMetadata: { contentType: type } });
      return json({ media: { id: idValue, url: mediaPublicUrl(env, url, id, filename), name: originalName, type: type.startsWith('video/') ? 'video' : type.startsWith('audio/') ? 'audio' : 'image' } }, 201);
    }
  }

  if (!url.pathname.startsWith('/api/internal/') || !(await validSession(request, env))) return json({ error: 'Unauthorized' }, 401);

  if (request.method === 'GET' && url.pathname === '/api/internal/dashboard') {
    const [drafts, published, orders, responses] = await Promise.all([
      listValues<{ project: GiftProject; savedAt: string }>(env.THE_PLAN_KV, 'draft:'),
      listValues<{ project: GiftProject; publishedAt: string }>(env.THE_PLAN_KV, 'gift:'),
      listValues<AdminOrder>(env.THE_PLAN_KV, 'order:'),
      listValues<RecipientResponse>(env.THE_PLAN_KV, 'response:'),
    ]);
    const publishedById = new Map(published.map((record) => [record.project.id, record.publishedAt]));
    const projects: ProjectSummary[] = drafts.map((record) => ({
      id: record.project.id,
      recipient: record.project.recipient || '',
      sender: record.project.sender || '',
      locale: record.project.locale,
      theme: record.project.theme,
      savedAt: record.savedAt,
      publishedAt: publishedById.get(record.project.id) || null,
    })).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    const data: DashboardData = {
      projects,
      orders: orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      responses: responses.sort((a, b) => b.answeredAt.localeCompare(a.answeredAt)),
    };
    return json(data);
  }

  if (request.method === 'POST' && url.pathname === '/api/internal/orders') {
    if (Number(request.headers.get('Content-Length') || 0) > 320_000) return json({ error: 'Order data is too large' }, 413);
    let raw: { project?: unknown; order?: Record<string, unknown> };
    try { raw = await request.json() as typeof raw; } catch { return json({ error: 'Invalid JSON' }, 400); }
    const parsed = projectSchema.safeParse(raw.project);
    if (!parsed.success) return json({ error: 'Invalid project starter' }, 400);
    const source = raw.order || {};
    const id = textValue(source.orderId, 80);
    const linkedProjectId = textValue(source.projectId, 64);
    const formToken = textValue(source.formToken, 120);
    if (!id || !orderId.test(id)) return json({ error: 'Invalid Order ID' }, 400);
    if (!linkedProjectId || linkedProjectId !== parsed.data.id) return json({ error: 'Project ID does not match order' }, 400);
    if (!formToken || formToken.length < 24) return json({ error: 'Invalid form token' }, 400);
    if (await env.THE_PLAN_KV.get(`order:${id}`)) return json({ error: 'Order already exists' }, 409);
    if (await env.THE_PLAN_KV.get(`draft:${linkedProjectId}`)) return json({ error: 'Project already exists' }, 409);
    const now = new Date().toISOString();
    const order: AdminOrder = {
      orderId: id,
      projectId: linkedProjectId,
      formToken,
      source: 'manual',
      status: 'waiting_form',
      customerName: '',
      customerEmail: '',
      customerWhatsapp: '',
      recipient: '',
      sender: '',
      locale: parsed.data.locale,
      theme: parsed.data.theme,
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    await Promise.all([
      env.THE_PLAN_KV.put(`draft:${linkedProjectId}`, JSON.stringify({ project: parsed.data, savedAt: now })),
      env.THE_PLAN_KV.put(`order:${id}`, JSON.stringify(order)),
      env.THE_PLAN_KV.put(`form-access:${linkedProjectId}`, JSON.stringify({ orderId: id, formToken } satisfies FormAccess)),
    ]);
    return json({ createdAt: now, orderId: id, projectId: linkedProjectId }, 201);
  }

  if (request.method === 'PUT' && segments[0] === 'api' && segments[1] === 'internal' && segments[2] === 'orders' && segments.length === 4) {
    const id = segments[3];
    if (!orderId.test(id)) return json({ error: 'Invalid Order ID' }, 400);
    const order = await env.THE_PLAN_KV.get<AdminOrder>(`order:${id}`, 'json');
    if (!order) return json({ error: 'Order not found' }, 404);
    let raw: { status?: unknown; notes?: unknown };
    try { raw = await request.json() as typeof raw; } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (typeof raw.status !== 'string' || !orderStatuses.includes(raw.status as OrderStatus)) return json({ error: 'Invalid order status' }, 400);
    const notes = textValue(raw.notes, 3000);
    if (notes === null) return json({ error: 'Invalid notes' }, 400);
    const updatedAt = new Date().toISOString();
    await env.THE_PLAN_KV.put(`order:${id}`, JSON.stringify({ ...order, status: raw.status, notes, updatedAt }));
    return json({ updatedAt });
  }

  if (request.method === 'POST' && url.pathname === '/api/internal/drafts') {
    const project = await readProject(request);
    if (project instanceof Response) return project;
    if (await env.THE_PLAN_KV.get(`draft:${project.id}`)) return json({ error: 'Project already exists' }, 409);
    const savedAt = new Date().toISOString();
    await env.THE_PLAN_KV.put(`draft:${project.id}`, JSON.stringify({ project, savedAt }));
    return json({ project, savedAt, publishedAt: null }, 201);
  }

  if (segments[0] === 'api' && segments[1] === 'internal' && segments[2] === 'drafts' && segments.length >= 4) {
    const id = segments[3];
    if (!projectId.test(id)) return json({ error: 'Invalid project ID' }, 400);
    const draftKey = `draft:${id}`;
    if (request.method === 'GET' && segments.length === 4) {
      const [draft, published] = await Promise.all([
        env.THE_PLAN_KV.get<{ project: GiftProject; savedAt: string }>(draftKey, 'json'),
        env.THE_PLAN_KV.get<{ publishedAt: string }>(`gift:${id}`, 'json'),
      ]);
      return draft ? json({ ...draft, publishedAt: published?.publishedAt || null }) : json({ error: 'Draft not found' }, 404);
    }
    if (request.method === 'PUT' && segments.length === 4) {
      if (!(await env.THE_PLAN_KV.get(draftKey))) return json({ error: 'Draft not found' }, 404);
      const project = await readProject(request, id);
      if (project instanceof Response) return project;
      const savedAt = new Date().toISOString();
      await env.THE_PLAN_KV.put(draftKey, JSON.stringify({ project, savedAt }));
      return json({ savedAt });
    }
    if (request.method === 'POST' && segments[4] === 'publish' && segments.length === 5) {
      const draft = await env.THE_PLAN_KV.get<{ project: unknown }>(draftKey, 'json');
      if (!draft) return json({ error: 'Draft not found' }, 404);
      const parsed = projectSchema.safeParse(draft.project);
      if (!parsed.success || parsed.data.id !== id) return json({ error: 'Draft is invalid' }, 400);
      const issues = validateProject(parsed.data);
      if (issues.length) return json({ error: 'Draft is not ready to publish', issues }, 400);
      const publishedAt = new Date().toISOString();
      await env.THE_PLAN_KV.put(`gift:${id}`, JSON.stringify({ project: parsed.data, publishedAt }));
      const frontend = frontendOrigin(env);
      return json({ publishedAt, giftUrl: new URL(`/gift/${id}`, frontend).href });
    }
  }

  if (request.method === 'POST' && segments[0] === 'api' && segments[1] === 'internal' && segments[2] === 'media' && segments.length === 4) {
    const id = segments[3];
    if (!projectId.test(id)) return json({ error: 'Invalid project ID' }, 400);
    if (!(await env.THE_PLAN_KV.get(`draft:${id}`))) return json({ error: 'Draft not found' }, 404);
    const type = request.headers.get('Content-Type')?.split(';')[0].toLowerCase() || '';
    const limit = mediaTypes[type];
    if (!limit) return json({ error: 'Unsupported file format' }, 415);
    if (Number(request.headers.get('Content-Length') || 0) > limit) return json({ error: 'File is too large' }, 413);
    const body = await request.arrayBuffer();
    if (!body.byteLength || body.byteLength > limit) return json({ error: 'File is empty or too large' }, 413);
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/ogg': 'ogg' } as Record<string, string>)[type];
    const filename = `${crypto.randomUUID()}.${extension}`;
    await env.THE_PLAN_MEDIA.put(`the-plan/${id}/${filename}`, body, { httpMetadata: { contentType: type } });
    return json({ url: mediaPublicUrl(env, url, id, filename) }, 201);
  }

  return json({ error: 'Route not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    if (!allowedOrigin(origin, env)) return json({ error: 'Origin not allowed' }, 403);
    if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), origin);
    try { return withCors(await handle(request, env), origin); }
    catch (error) {
      console.error('The Plan API failure', error);
      return withCors(json({ error: 'Server error' }, 500), origin);
    }
  },
};
