import { describe, expect, it } from 'vitest';
import { demo } from '../src/demo';
import { validateProject, safeExternalUrl } from '../src/project';
import { themeIds, themes } from '../src/themes';

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
  it('supports image and playable video stamps', () => {
    const videoProject = {
      ...demo,
      gallery: {
        ...demo.gallery,
        photos: [...demo.gallery.photos, { id: 'clip', type: 'video' as const, src: '/clip.mp4', poster: '/clip.jpg', alt: 'Clip', caption: 'Moving memory' }],
      },
    };
    expect(validateProject(videoProject)).toEqual([]);
  });
  it('ships complete, selectable project themes', () => {
    expect(themeIds).toHaveLength(6);
    themeIds.forEach((theme) => {
      expect(themes[theme].name).toBeTruthy();
      expect(Object.keys(themes[theme].colors)).toHaveLength(15);
      expect(validateProject({ ...demo, theme })).toEqual([]);
    });
    expect(validateProject({ ...demo, theme: 'unknown' as never })).toContain('A supported theme is required');
  });
});
