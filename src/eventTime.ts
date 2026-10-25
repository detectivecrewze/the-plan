/** Display an open-ended invitation without inventing a finish time. */
export function formatEventTime(startTime: string, endTime?: string): string {
  return `${startTime} – ${endTime?.trim() || 'END'}`;
}
