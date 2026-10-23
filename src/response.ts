export interface YesResponse { projectId: string; answer: 'yes'; answeredAt: string }

// Stage 1 demo adapter. Phase 3 replaces this with a Worker endpoint.
export async function saveYesResponse(projectId: string): Promise<YesResponse> {
  const key = `the-plan:demo-response:${projectId}`;
  const existing = localStorage.getItem(key);
  if (existing) return JSON.parse(existing) as YesResponse;
  const answer: YesResponse = { projectId, answer: 'yes', answeredAt: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(answer));
  return answer;
}
