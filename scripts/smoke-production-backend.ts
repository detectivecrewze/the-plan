import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { demo } from '../src/demo';
import type { PlanFormAnswers } from '../src/form/types';

const base = process.argv[2]?.replace(/\/$/, '') || 'https://the-plan-prod-api.aldoramadhan16.workers.dev';
const vars = readFileSync(resolve('.dev.vars'), 'utf8');
const password = vars.match(/^STUDIO_PASSWORD=(.*)$/m)?.[1]?.trim().replace(/^"|"$/g, '');
if (!password) throw new Error('STUDIO_PASSWORD is missing from .dev.vars');

const suffix = Date.now().toString(36);
const projectId = `qa-plan-${suffix}`;
const orderId = `qa-order-${suffix}`;
const formToken = crypto.randomUUID();
const uploadedUrls: string[] = [];

async function request(path: string, init: RequestInit = {}, expected = 200) {
  const response = await fetch(`${base}${path}`, init);
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (response.status !== expected) throw new Error(`${init.method || 'GET'} ${path}: expected ${expected}, got ${response.status}: ${text}`);
  return { response, body };
}

const login = await request('/api/internal/session', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
});
const auth = { Authorization: `Bearer ${login.body.token}` };

const project = structuredClone(demo);
project.id = projectId;
await request('/api/internal/orders', {
  method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ project, order: { projectId, orderId, formToken } }),
}, 201);

await request(`/api/public/forms/${projectId}`, { headers: { 'X-Form-Token': 'wrong-token-that-is-long-enough' } }, 403);

async function uploadForm(file: string, type: string) {
  const bytes = readFileSync(resolve(file));
  const result = await request(`/api/public/forms/${projectId}/media`, {
    method: 'POST',
    headers: { 'X-Form-Token': formToken, 'Content-Type': type, 'X-File-Name': encodeURIComponent(file.split(/[\\/]/).at(-1)!) },
    body: bytes,
  }, 201);
  uploadedUrls.push(result.body.media.url);
  const media = await request(new URL(result.body.media.url).pathname);
  if (Number(media.response.headers.get('content-length') || bytes.length) !== bytes.length) throw new Error(`Retrieved size differs for ${file}`);
  return result.body.media;
}

const featured = await uploadForm('public/demo-media/opening.jpeg', 'image/jpeg');
const video = await uploadForm('public/demo-media/memory-video.mp4', 'video/mp4');
const audio = await uploadForm('public/demo-soundtrack.wav', 'audio/wav');

const answers: PlanFormAnswers = {
  version: 1,
  locale: 'id',
  contentLanguage: 'id-en',
  deadline: '2026-11-18T18:00',
  people: { sender: 'QA Sender', recipient: 'QA Recipient', recipientNickname: 'Q', relationship: 'partner', occasion: 'anniversary', customOccasion: '' },
  event: { date: '2026-11-19', startTime: '19:30', endTime: 'END', venue: 'QA Venue', address: 'QA Address', mapsUrl: 'https://maps.google.com/', dressCode: 'Smart casual', rundownNotes: '19:30 - Dinner\n21:00 - Surprise' },
  story: { message: 'Ini adalah pesan pengujian backend The Plan.\n\nSemua data harus masuk ke draft Studio.', letterMode: 'expand', tone: ['casual', 'romantic'] },
  theme: 'burgundy-keepsake',
  music: { mode: 'upload', selected: null, request: '', uploaded: audio, uploadTitle: 'QA Song', uploadArtist: 'QA Artist' },
  media: { featured, gallery: [featured, video] },
};

await request(`/api/public/forms/${projectId}`, {
  method: 'PUT', headers: { 'X-Form-Token': formToken, 'Content-Type': 'application/json' }, body: JSON.stringify(answers),
});
await request(`/api/public/forms/${projectId}/submit`, {
  method: 'POST', headers: { 'X-Form-Token': formToken, 'Content-Type': 'application/json' }, body: JSON.stringify(answers),
});

const dashboard = await request('/api/internal/dashboard', { headers: auth });
const order = dashboard.body.orders.find((item: any) => item.orderId === orderId);
if (!order || order.status !== 'ready_to_craft' || !order.draftAppliedAt || order.answers?.contentLanguage !== 'id-en') throw new Error('Dashboard order is incomplete');

const draft = await request(`/api/internal/drafts/${projectId}`, { headers: auth });
if (draft.body.project.music.audioUrl !== audio.url || draft.body.project.gallery.photos.length !== 2) throw new Error('Form media was not applied to Studio draft');

const studioAudioBytes = readFileSync(resolve('public/demo-soundtrack.wav'));
const studioAudio = await request(`/api/internal/media/${projectId}`, {
  method: 'POST', headers: { ...auth, 'Content-Type': 'audio/wav', 'X-File-Name': 'studio-test.wav' }, body: studioAudioBytes,
}, 201);
uploadedUrls.push(studioAudio.body.url);
await request(new URL(studioAudio.body.url).pathname);

const published = await request(`/api/internal/drafts/${projectId}/publish`, { method: 'POST', headers: auth });
const publicGift = await request(`/api/public/gifts/${projectId}`);
if (publicGift.body.project.id !== projectId || !published.body.giftUrl) throw new Error('Published gift is unavailable');
await request(`/api/public/responses/${projectId}`, { method: 'POST' }, 201);

console.log(JSON.stringify({ ok: true, base, projectId, orderId, uploadedUrls, checks: ['login', 'order', 'form-auth', 'form-image', 'form-video', 'form-audio', 'autosave', 'submit', 'dashboard', 'studio-draft', 'studio-audio', 'publish', 'gift', 'response'] }));
