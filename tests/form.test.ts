import { describe, expect, it } from 'vitest';
import { demo } from '../src/demo';
import { applyFormAnswersToProject, parseRundown } from '../src/form/applyToProject';
import { planFormSchema } from '../src/form/schema';
import type { FormContentLanguage, PlanFormAnswers } from '../src/form/types';
import { validateProject } from '../src/project';

function answers(contentLanguage: FormContentLanguage = 'id'): PlanFormAnswers {
  return {
    version: 1,
    locale: contentLanguage === 'en' ? 'en' : 'id',
    contentLanguage,
    deadline: '',
    people: {
      sender: 'Aldo', recipient: 'Nara Putri', recipientNickname: 'Nara', relationship: 'partner', occasion: 'anniversary', customOccasion: '',
    },
    event: {
      date: '2026-11-19', startTime: '18:30', endTime: 'END', venue: 'The Garden', address: 'Jakarta Selatan', mapsUrl: 'https://maps.google.com/', dressCode: 'Earth tone',
      rundownNotes: '18:30 - Dinner | meja favorit kita\n20:00 - Tukar hadiah\nEND - Pulang kalau sudah siap',
    },
    story: { message: 'Ini paragraf pertama untuk Nara.\n\nIni paragraf kedua yang lebih personal.', letterMode: 'expand', tone: ['casual', 'romantic'] },
    theme: 'midnight-navy',
    music: { mode: 'playlist', selected: { title: 'About You', artist: 'The 1975', audioUrl: 'https://example.com/song.mp3', coverUrl: 'https://example.com/cover.jpg' }, request: '', uploaded: null, uploadTitle: '', uploadArtist: '' },
    media: {
      featured: { id: 'featured', url: 'https://example.com/featured.jpg', name: 'featured.jpg', type: 'image' },
      gallery: [
        { id: 'memory-1', url: 'https://example.com/memory.jpg', name: 'memory.jpg', type: 'image' },
        { id: 'memory-2', url: 'https://example.com/memory.mp4', name: 'memory.mp4', type: 'video' },
      ],
    },
  };
}

describe('The Plan customer form contract', () => {
  it.each<FormContentLanguage>(['id', 'id-en', 'en'])('accepts %s without email or WhatsApp', (language) => {
    expect(planFormSchema.safeParse(answers(language)).success).toBe(true);
  });

  it('applies submitted facts, letter, theme, music, and media to the Studio draft', () => {
    const project = applyFormAnswersToProject({ ...structuredClone(demo), id: 'plan-form-test' }, answers());
    expect(project.recipient).toBe('Nara Putri');
    expect(project.sender).toBe('Aldo');
    expect(project.theme).toBe('midnight-navy');
    expect(project.invitation).toMatchObject({ date: '2026-11-19', startTime: '18:30', endTime: 'END', venue: 'The Garden', dressCode: 'Earth tone' });
    expect(project.invitation.rundown).toHaveLength(3);
    expect(project.letter.title).toBe('Untuk Nara');
    expect(project.letter.paragraphs).toEqual(['Ini paragraf pertama untuk Nara.', 'Ini paragraf kedua yang lebih personal.']);
    expect(project.music).toMatchObject({ title: 'About You', artist: 'The 1975', audioUrl: 'https://example.com/song.mp3' });
    expect(project.opening.photo.src).toBe('https://example.com/featured.jpg');
    expect(project.gallery.photos.map((item) => item.type)).toEqual(['image', 'video']);
    expect(project.opening.note).toBe('');
    expect(project.hero.subtitle).toBe('');
    expect(project.closing.message).toBe('');
    expect(validateProject(project)).toEqual([]);
  });

  it('parses a practical free-text rundown without inventing entries', () => {
    expect(parseRundown('18.30 - Dinner | meja pojok\nEND - Selesai')).toEqual([
      { id: 'form-plan-1', time: '18:30', title: 'Dinner', note: 'meja pojok' },
      { id: 'form-plan-2', time: 'END', title: 'Selesai' },
    ]);
  });
  it('accepts an uploaded song and applies it to the draft', () => {
    const intake = answers();
    intake.music = { mode: 'upload', selected: null, request: '', uploaded: { id: 'song-1', url: 'https://example.com/upload.mp3', name: 'our-song.mp3', type: 'audio' }, uploadTitle: 'Our Song', uploadArtist: 'The Artist' };
    expect(planFormSchema.safeParse(intake).success).toBe(true);
    const project = applyFormAnswersToProject({ ...structuredClone(demo), id: 'plan-form-audio' }, intake);
    expect(project.music).toMatchObject({ title: 'Our Song', artist: 'The Artist', audioUrl: 'https://example.com/upload.mp3' });
    expect(project.music.cover.src).toBe('https://example.com/featured.jpg');
  });
});
