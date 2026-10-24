import { demo } from './demo';
import type { GiftProject } from './project';

export const demoEnglish: GiftProject = {
  ...demo, locale: 'en',
  opening: { ...demo.opening, eyebrow: 'Two celebrations are almost complete', title: 'Three pieces left,\nthen our special day\nbegins.', note: 'To celebrate your birthday and our journey together.' },
  hero: { ...demo.hero, eyebrow: 'Your birthday · our anniversary', title: 'Two reasons\nto celebrate\nyou, and us.', subtitle: 'Today is about another year of you, and another year of us choosing one another.' },
  invitation: {
    ...demo.invitation, title: 'A birthday & anniversary date',
    message: 'I planned one evening for your birthday and our journey together. Just come and bring the smile that has always been my favorite.',
    venue: 'The Garden Table', address: 'South Jakarta', dressCode: 'Our favorite date-night look',
    rundown: [
      { id: 'meet', time: '17:30', title: 'Meet me there', note: 'We will begin this special evening slowly.' },
      { id: 'dinner', time: '18:15', title: 'Birthday dinner for you', note: 'Your favorite food and stories from this year.' },
      { id: 'rewind', time: '19:30', title: 'Our anniversary rewind', note: 'Looking back at the moments that brought us here.' },
      { id: 'surprise', time: '20:15', title: 'Cake, a wish, and one promise', note: 'Blow out your candles, then open a surprise for our next chapter.' },
    ],
  },
  letter: {
    title: 'For your day, and for us',
    paragraphs: [
      'Nara, happy birthday to the person who makes so many ordinary days feel special. I hope your new year brings more of what you love, courage for everything you want to pursue, and a reason to smile every day.',
      'Today also reminds me how far we have come together. Thank you for choosing us through both easy and difficult days. Tonight I want to celebrate you, our journey, and every memory still waiting for us.',
    ], signoff: 'Love, Ari',
  },
  gallery: { ...demo.gallery, title: 'You, us, and all the little moments', subtitle: 'Pieces of our journey toward your birthday and our anniversary.' },
  closing: { ...demo.closing, title: 'One night, two reasons to celebrate', message: 'I have saved the date. Now I only need you to celebrate your birthday and our story.', question: 'Will you celebrate your birthday and our anniversary with me?' },
};
