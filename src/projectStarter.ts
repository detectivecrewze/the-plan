import type { GiftProject } from './project';

/**
 * Neutral draft used by both manual orders and payment fulfillment.
 * Customer facts and media are deliberately empty until the form is submitted.
 */
export function createProjectStarter(id: string): GiftProject {
  return {
    schemaVersion: 1,
    id,
    locale: 'id',
    theme: 'burgundy-keepsake',
    recipient: '',
    sender: '',
    opening: {
      eyebrow: 'SEBUAH RENCANA UNTUKMU',
      title: 'Satu hari untukmu.',
      note: '',
      photo: { id: 'opening', src: '', alt: '', caption: '' },
    },
    hero: {
      eyebrow: 'DISIAPKAN KHUSUS UNTUKMU',
      title: 'Rencana kecil untuk kita.',
      subtitle: '',
      photo: { id: 'hero', src: '', alt: '', caption: '' },
    },
    music: {
      title: '',
      artist: '',
      cover: { id: 'music-cover', src: '', alt: '', caption: '' },
    },
    invitation: {
      title: 'Rencana hari kita',
      message: '',
      date: '',
      startTime: '',
      rundown: [],
    },
    letter: {
      title: 'Untukmu',
      paragraphs: ['Tulisan personal dari customer akan tampil di sini.'],
      signoff: '',
    },
    gallery: {
      title: 'Kenangan kita',
      subtitle: '',
      photos: [],
    },
    closing: {
      title: 'Satu hal lagi...',
      message: '',
      question: 'Mau pergi bersamaku?',
      ticketMessage: '',
    },
  };
}
