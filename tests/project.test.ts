import { describe, expect, it } from 'vitest';
import { demo } from '../src/demo';
import { validateProject, safeExternalUrl } from '../src/project';

describe('gift project contract', () => {
  it('accepts the full demo and optional venue fields', () => {
    expect(validateProject(demo)).toEqual([]);
    expect(validateProject({ ...demo, invitation: { ...demo.invitation, venue: '', address: '', mapsUrl: '', rundown: [] } })).toEqual([]);
  });
  it('requires a valid event date and time for the invitation and ticket', () => {
    expect(validateProject({ ...demo, invitation: { ...demo.invitation, date: 'soon', startTime: 'later' } })).toEqual(expect.arrayContaining(['Event date must be valid', 'Start time must be HH:mm']));
  });
  it('only permits ordinary web map URLs', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeExternalUrl('https://maps.google.com/example')).toBe('https://maps.google.com/example');
  });
});
