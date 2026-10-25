import { demo } from './demo';
import { apiBase } from './apiBase';
import { isCustomGiftHostname } from './publicLinks';
import { projectSchema } from './projectSchema';
import type { GiftProject } from './project';

const idPattern = /^[a-z0-9][a-z0-9-]{2,63}$/;

export const isPreview = new URLSearchParams(location.search).has('preview') ||
  (location.pathname === '/' && new URLSearchParams(location.search).get('sample') === '1');

export async function loadGiftProject(): Promise<GiftProject> {
  const previewId = new URLSearchParams(location.search).get('preview');
  if (previewId !== null) {
    if (!idPattern.test(previewId)) throw new Error('Invalid preview project ID');
    const draft = sessionStorage.getItem(`the-plan:preview:${previewId}`);
    if (!draft) throw new Error('Preview is unavailable. Open it from Studio.');
    return projectSchema.parse(JSON.parse(draft));
  }

  if (location.pathname === '/' && isCustomGiftHostname(location.hostname)) {
    const response = await fetch(`${apiBase}/api/public/domains/${encodeURIComponent(location.hostname.toLowerCase())}`);
    if (response.status === 404) throw new Error('This custom gift link is not connected yet.');
    if (!response.ok) throw new Error('Could not load this custom gift link. Please try again.');
    const payload = await response.json() as { project: unknown };
    return projectSchema.parse(payload.project);
  }

  const match = location.pathname.match(/^\/gift\/([^/]+)\/?$/);
  if (!match) return demo;
  const id = decodeURIComponent(match[1]);
  if (!idPattern.test(id)) throw new Error('Invalid gift link');
  const response = await fetch(`${apiBase}/api/public/gifts/${encodeURIComponent(id)}`);
  if (response.status === 404) throw new Error('This gift has not been published yet.');
  if (!response.ok) throw new Error('Could not load this gift. Please try again.');
  const payload = await response.json() as { project: unknown };
  return projectSchema.parse(payload.project);
}
