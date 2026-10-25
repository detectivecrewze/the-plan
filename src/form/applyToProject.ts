import type { GiftProject, PlanItem, Photo } from '../project';
import type { FormMedia, PlanFormAnswers } from './types';

const nonEmpty = (value: string, fallback: string): string => value.trim() || fallback;

function formMedia(media: FormMedia, index: number): Photo {
  return {
    id: media.id || `form-media-${index + 1}`,
    src: media.url,
    alt: '',
    caption: '',
    type: media.type,
  };
}

export function parseRundown(value: string): PlanItem[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 30).map((line, index) => {
    const match = line.match(/^((?:[01]?\d|2[0-3])[.:][0-5]\d|END)\s*(?:[-–—|:]\s*)?(.*)$/i);
    const time = match?.[1]?.replace('.', ':').toUpperCase() || '';
    const remainder = (match?.[2] || line).trim();
    const [title, ...noteParts] = remainder.split(/\s+[|–—]\s+/);
    return {
      id: `form-plan-${index + 1}`,
      time,
      title: title?.trim() || remainder,
      ...(noteParts.length ? { note: noteParts.join(' — ').trim() } : {}),
    };
  });
}

export function applyFormAnswersToProject(base: GiftProject, answers: PlanFormAnswers): GiftProject {
  const project = structuredClone(base);
  const featured = answers.media.featured;
  const gallery = answers.media.gallery.map(formMedia);
  const recipientReference = answers.people.recipientNickname.trim() || answers.people.recipient.trim();
  const isEnglish = answers.contentLanguage === 'en';
  const letterParagraphs = answers.story.message.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const rundown = parseRundown(answers.event.rundownNotes);

  project.locale = answers.locale;
  project.theme = answers.theme;
  project.recipient = answers.people.recipient.trim();
  project.sender = answers.people.sender.trim();
  project.opening.eyebrow = isEnglish ? 'A LITTLE PLAN FOR YOU' : 'SEBUAH RENCANA UNTUKMU';
  project.opening.title = isEnglish ? 'A day planned for you.' : 'Satu hari untukmu.';
  project.opening.note = '';
  project.hero.eyebrow = isEnglish ? 'MADE WITH YOU IN MIND' : 'DISIAPKAN KHUSUS UNTUKMU';
  project.hero.title = isEnglish ? 'A little plan for us.' : 'Rencana kecil untuk kita.';
  project.hero.subtitle = '';
  project.invitation = {
    ...project.invitation,
    title: isEnglish ? 'Our little plan' : 'Rencana hari kita',
    message: '',
    date: nonEmpty(answers.event.date, project.invitation.date),
    startTime: nonEmpty(answers.event.startTime, project.invitation.startTime),
    endTime: answers.event.endTime.trim() || undefined,
    venue: answers.event.venue.trim() || undefined,
    address: answers.event.address.trim() || undefined,
    mapsUrl: answers.event.mapsUrl.trim() || undefined,
    dressCode: answers.event.dressCode.trim() || undefined,
    rundown,
  };
  project.letter = {
    ...project.letter,
    title: recipientReference ? (isEnglish ? `For ${recipientReference}` : `Untuk ${recipientReference}`) : project.letter.title,
    paragraphs: letterParagraphs.length ? letterParagraphs : project.letter.paragraphs,
    signoff: answers.people.sender.trim()
      ? (isEnglish ? `Love, ${answers.people.sender.trim()}` : `Dengan sayang, ${answers.people.sender.trim()}`)
      : project.letter.signoff,
  };

  if (featured) {
    const photo = formMedia(featured, 0);
    project.opening.photo = photo;
    project.hero.photo = { ...photo, id: `${photo.id}-hero` };
  }
  project.gallery = { title: isEnglish ? 'Our memories' : 'Kenangan kita', subtitle: '', photos: gallery };
  project.closing = {
    title: isEnglish ? 'One more thing...' : 'Satu hal lagi...',
    message: '',
    question: isEnglish ? 'Will you come with me?' : 'Mau pergi bersamaku?',
    ticketMessage: '',
  };
  project.music = { title: '', artist: '', audioUrl: undefined, cover: featured ? { ...formMedia(featured, 0), id: 'form-music-cover' } : project.music.cover };

  if (answers.music.mode === 'playlist' && answers.music.selected) {
    project.music = {
      title: answers.music.selected.title,
      artist: answers.music.selected.artist,
      audioUrl: answers.music.selected.audioUrl,
      cover: {
        id: 'form-music-cover',
        src: answers.music.selected.coverUrl,
        alt: '',
        caption: '',
      },
    };
  }
  if (answers.music.mode === 'upload' && answers.music.uploaded) {
    project.music = {
      title: answers.music.uploadTitle.trim(),
      artist: answers.music.uploadArtist.trim(),
      audioUrl: answers.music.uploaded.url,
      cover: featured ? { ...formMedia(featured, 0), id: 'form-music-cover' } : project.music.cover,
    };
  }

  return project;
}
