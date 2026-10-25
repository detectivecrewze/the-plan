import { z } from 'zod';
import { themeIds } from '../themes';

const shortText = (max = 300) => z.string().trim().max(max);
const media = z.object({
  id: z.string().min(1).max(120),
  url: z.string().url().max(2048),
  name: z.string().max(300),
  type: z.enum(['image', 'video']),
});

export const planFormDraftSchema = z.object({
  version: z.literal(1),
  locale: z.enum(['id', 'en']),
  contentLanguage: z.enum(['id', 'id-en', 'en']).default('id'),
  deadline: z.string().max(16).default(''),
  people: z.object({
    sender: shortText(120),
    recipient: shortText(120),
    recipientNickname: shortText(120).default(''),
    relationship: shortText(120),
    occasion: shortText(120),
    customOccasion: shortText(300),
  }),
  event: z.object({
    date: z.string().max(10),
    startTime: z.string().max(5),
    endTime: z.string().max(5),
    venue: shortText(500),
    address: shortText(1200),
    mapsUrl: z.string().trim().max(2048),
    dressCode: shortText(500),
    rundownNotes: z.string().trim().max(5000),
  }),
  story: z.object({
    message: z.string().trim().max(8000),
    letterMode: z.enum(['expand', 'keep']).default('expand'),
    tone: z.array(z.enum(['casual', 'poetic', 'romantic', 'heartfelt', 'playful'])).min(1).max(5),
  }),
  theme: z.enum(themeIds),
  music: z.object({
    mode: z.enum(['playlist', 'request', 'team', 'upload']),
    selected: z.object({
      title: shortText(300).min(1),
      artist: shortText(300).min(1),
      audioUrl: z.string().url().max(2048),
      coverUrl: z.string().url().max(2048),
    }).nullable(),
    request: shortText(500),
    uploaded: z.object({ id: z.string().min(1), url: z.string().url(), name: z.string().max(300), type: z.literal('audio') }).nullable().default(null),
    uploadTitle: shortText(300).default(''),
    uploadArtist: shortText(300).default(''),
  }),
  media: z.object({
    featured: media.nullable(),
    gallery: z.array(media),
  }),
});

export const planFormSchema = planFormDraftSchema.superRefine((value, context) => {
  if (!value.people.sender || !value.people.recipient) {
    context.addIssue({ code: 'custom', path: ['people'], message: 'Sender and recipient names are required' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.event.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.event.startTime)) {
    context.addIssue({ code: 'custom', path: ['event'], message: 'Event date and start time are required' });
  }
  if (value.story.message.length < 10) {
    context.addIssue({ code: 'custom', path: ['story', 'message'], message: 'Main message is too short' });
  }
  if (value.deadline && !/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(value.deadline)) {
    context.addIssue({ code: 'custom', path: ['deadline'], message: 'Deadline must include a valid date and time' });
  }
  if (value.people.occasion === 'other' && !value.people.customOccasion) {
    context.addIssue({ code: 'custom', path: ['people', 'customOccasion'], message: 'Custom occasion is required' });
  }
  if (value.event.endTime && !/^(([01]\d|2[0-3]):[0-5]\d|END)$/i.test(value.event.endTime)) {
    context.addIssue({ code: 'custom', path: ['event', 'endTime'], message: 'End time must be HH:mm or END' });
  }
  if (value.event.mapsUrl) {
    try {
      const parsed = new URL(value.event.mapsUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      context.addIssue({ code: 'custom', path: ['event', 'mapsUrl'], message: 'Maps URL must be http or https' });
    }
  }
  if (value.music.mode === 'playlist' && !value.music.selected) {
    context.addIssue({ code: 'custom', path: ['music', 'selected'], message: 'Choose a song' });
  }
  if (value.music.mode === 'request' && !value.music.request) {
    context.addIssue({ code: 'custom', path: ['music', 'request'], message: 'Song request is required' });
  }
  if (value.music.mode === 'upload' && (!value.music.uploaded || !value.music.uploadTitle || !value.music.uploadArtist)) {
    context.addIssue({ code: 'custom', path: ['music'], message: 'Upload a song and enter its title and artist' });
  }
  if (!value.media.featured) {
    context.addIssue({ code: 'custom', path: ['media', 'featured'], message: 'Featured photo is required' });
  }
  if (!value.media.gallery.length) {
    context.addIssue({ code: 'custom', path: ['media', 'gallery'], message: 'Add at least one gallery item' });
  }
});

export type ValidPlanFormAnswers = z.infer<typeof planFormSchema>;

