import type { Locale } from '../project';
import type { ThemeId } from '../themes';

export type FormMusicMode = 'playlist' | 'request' | 'team' | 'upload';
export type FormMediaType = 'image' | 'video';
export type FormContentLanguage = 'id' | 'id-en' | 'en';
export type FormLetterMode = 'expand' | 'keep';
export type FormTone = 'casual' | 'poetic' | 'romantic' | 'heartfelt' | 'playful';

export interface FormMedia {
  id: string;
  url: string;
  name: string;
  type: FormMediaType;
}

export interface FormMusicSelection {
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl: string;
}
export interface FormAudio {
  id: string;
  url: string;
  name: string;
  type: 'audio';
}

export interface PlanFormAnswers {
  version: 1;
  locale: Locale;
  contentLanguage: FormContentLanguage;
  deadline: string;
  people: {
    sender: string;
    recipient: string;
    recipientNickname: string;
    relationship: string;
    occasion: string;
    customOccasion: string;
  };
  event: {
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    address: string;
    mapsUrl: string;
    dressCode: string;
    rundownNotes: string;
  };
  story: {
    message: string;
    letterMode: FormLetterMode;
    tone: FormTone[];
  };
  theme: ThemeId;
  music: {
    mode: FormMusicMode;
    selected: FormMusicSelection | null;
    request: string;
    uploaded: FormAudio | null;
    uploadTitle: string;
    uploadArtist: string;
  };
  media: {
    featured: FormMedia | null;
    gallery: FormMedia[];
  };
}

export interface PublicFormRecord {
  projectId: string;
  orderId: string;
  status: 'open' | 'submitted';
  draft: PlanFormAnswers | null;
  submittedAt: string | null;
}

