import { z } from 'zod';
import { themeIds } from './themes';

const media = z.object({
  id: z.string().min(1).max(120),
  src: z.string().max(2048),
  alt: z.string().max(300),
  caption: z.string().max(600),
  type: z.enum(['image', 'video']).optional(),
  poster: z.string().max(2048).optional(),
});

const text = (limit = 2000) => z.string().max(limit);
const time = z.string().max(5);

export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,63}$/),
  locale: z.enum(['id', 'en']),
  theme: z.enum(themeIds),
  recipient: text(120).optional(),
  sender: text(120).optional(),
  opening: z.object({ eyebrow: text(200), title: text(500), note: text(1200), photo: media }),
  hero: z.object({ eyebrow: text(200), title: text(500), subtitle: text(1500), photo: media }),
  music: z.object({ title: text(300), artist: text(300), audioUrl: text(2048).optional(), cover: media }),
  invitation: z.object({
    title: text(500), message: text(2500),
    date: z.string().max(10),
    startTime: time, endTime: time.optional(),
    venue: text(500).optional(), address: text(1200).optional(), mapsUrl: text(2048).optional(), dressCode: text(500).optional(),
    rundown: z.array(z.object({ id: z.string().min(1).max(120), time, title: text(500), note: text(1200).optional() })).max(30),
  }),
  letter: z.object({ title: text(500), paragraphs: z.array(text(5000)).max(30), signoff: text(500) }),
  gallery: z.object({ title: text(500), subtitle: text(1000), photos: z.array(media) }),
  closing: z.object({ title: text(500), message: text(2000), question: text(800), ticketMessage: text(1000) }),
});
