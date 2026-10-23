import { demo } from './demo';
import type { GiftProject } from './project';

export const demoEnglish: GiftProject = {
  ...demo, locale: 'en',
  opening: { ...demo.opening, eyebrow: 'A little piece is missing', title: 'One last piece,\nand the story begins.', note: 'There is a little day I have been quietly planning for you.' },
  hero: { ...demo.hero, subtitle: 'Nothing grand. Just a little day I want to remember for a long time, with you.' },
  invitation: {
    ...demo.invitation, title: 'You, me, and a little plan',
    message: 'I have saved this time for us. Just come as you are; I will take care of the little surprises.',
    venue: 'A little dinner place', address: 'South Jakarta', dressCode: 'Something you feel lovely in',
    rundown: [
      { id: 'meet', time: '17:30', title: 'Meet me there', note: 'We will start the evening slowly.' },
      { id: 'dinner', time: '18:15', title: 'Dinner together', note: 'Good food and all the stories.' },
      { id: 'surprise', time: '20:00', title: 'One little surprise', note: 'This part stays a secret for now.' },
    ],
  },
  letter: {
    title: 'A note before we go',
    paragraphs: [
      'Nara, I love the ordinary days we spend together. The conversations that run long and the way you make an unfamiliar place feel like home.',
      'This time, I want to plan one little day just for us. It does not have to be perfect. I only want to be there with you, hear your stories, and make one more memory we can look back on.',
    ], signoff: 'Love, Ari',
  },
  gallery: { ...demo.gallery, subtitle: 'Little pieces of the days I want to keep.' },
  closing: { ...demo.closing, message: 'I have saved the date. There will always be a place for you beside me.', question: 'Will you go with me?' },
};
