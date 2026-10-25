export interface YesResponse { projectId: string; answer: 'yes'; answeredAt: string }

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function saveYesResponse(projectId: string): Promise<YesResponse> {
  if (location.pathname.startsWith('/gift/')) {
    const response = await fetch(`${apiBase}/api/public/responses/${encodeURIComponent(projectId)}`, { method: 'POST' });
    if (!response.ok) throw new Error('Could not save response');
    return response.json() as Promise<YesResponse>;
  }
  const key = `the-plan:demo-response:${projectId}`;
  const existing = localStorage.getItem(key);
  if (existing) return JSON.parse(existing) as YesResponse;
  const answer: YesResponse = { projectId, answer: 'yes', answeredAt: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(answer));
  return answer;
}
