import { isThemeId, type ThemeId } from './themes';

export type Locale = 'id' | 'en';

export type MediaType = 'image' | 'video';

export interface Photo {
  id: string;
  src: string;
  alt: string;
  caption: string;
  type?: MediaType;
  poster?: string;
}
export interface PlanItem { id: string; time: string; title: string; note?: string }
export interface GiftProject {
  schemaVersion: 1;
  id: string;
  locale: Locale;
  theme: ThemeId;
  recipient?: string;
  sender?: string;
  opening: { eyebrow: string; title: string; note: string; photo: Photo };
  hero: { eyebrow: string; title: string; subtitle: string; photo: Photo };
  music: { title: string; artist: string; audioUrl?: string; cover: Photo };
  invitation: {
    title: string; message: string; date: string; startTime: string; endTime?: string;
    venue?: string; address?: string; mapsUrl?: string; dressCode?: string;
    rundown: PlanItem[];
  };
  letter: { title: string; paragraphs: string[]; signoff: string };
  gallery: { title: string; subtitle: string; photos: Photo[] };
  closing: { title: string; message: string; question: string; ticketMessage: string };
}

export function validateProject(project: GiftProject): string[] {
  const issues: string[] = [];
  if (!project.id.trim()) issues.push('Project ID is required');
  if (!isThemeId(project.theme)) issues.push('A supported theme is required');
  if (!project.opening.title.trim() || !project.hero.title.trim()) issues.push('Opening and hero titles are required');
  if (!project.invitation.title.trim()) issues.push('Invitation title is required');
  if (!project.letter.title.trim() || !project.letter.paragraphs.some((part) => part.trim())) issues.push('Letter title and body are required');
  if (!project.gallery.photos.length) issues.push('Add at least one gallery photo or video');
  if (!project.closing.title.trim()) issues.push('Closing title is required');
  const date = new Date(`${project.invitation.date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(project.invitation.date) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== project.invitation.date) issues.push('Event date must be valid');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(project.invitation.startTime)) issues.push('Start time must be HH:mm');
  if (project.invitation.endTime && !/^(([01]\d|2[0-3]):[0-5]\d|END)$/i.test(project.invitation.endTime.trim())) issues.push('End time must be HH:mm or END');
  if (!project.opening.photo.src || !project.hero.photo.src) issues.push('Opening and hero photos are required');
  if (project.music.audioUrl && (!project.music.title.trim() || !project.music.artist.trim() || !project.music.cover.src.trim())) issues.push('Music title, artist, and cover are required when audio is set');
  if (project.gallery.photos.some((item) => item.type && item.type !== 'image' && item.type !== 'video')) issues.push('Gallery media type must be image or video');
  if (project.gallery.photos.some((item) => item.type === 'video' && !item.src)) issues.push('Gallery videos require a source');
  if (project.gallery.photos.some((item) => !item.src.trim())) issues.push('Every gallery item requires media');
  if (!project.closing.question.trim()) issues.push('Closing question is required');
  return issues;
}

export function safeExternalUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch { return undefined; }
}
