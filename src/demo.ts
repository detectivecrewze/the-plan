import type { GiftProject } from './project';

// All demo copy and media live here. Later the Worker adapter can supply the same shape.
export const demo: GiftProject = {
  schemaVersion: 1,
  id: 'demo-the-plan',
  locale: 'id',
  recipient: 'Nara',
  sender: 'Ari',
  opening: {
    eyebrow: 'A little piece is missing',
    title: 'Satu keping lagi,\nlalu ceritanya dimulai.',
    note: 'Ada sebuah hari yang diam-diam kusiapkan untukmu.',
    photo: { id: 'opening', src: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1000&q=85', alt: 'Pasangan berjalan bersama', caption: 'us, on an ordinary day' },
  },
  hero: {
    eyebrow: 'A day made for you',
    title: 'Can I borrow\none whole day\nwith you?',
    subtitle: 'Bukan hari yang besar. Cuma hari kecil yang ingin kuingat lama, bersama kamu.',
    photo: { id: 'hero', src: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1200&q=85', alt: 'Momen hangat bersama', caption: 'our little plan' },
  },
  music: {
    title: 'Our little soundtrack', artist: 'a song for this day',
    cover: { id: 'cover', src: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=500&q=80', alt: 'Ilustrasi musik', caption: '' },
    // Original instrumental demo loop. Replace with an approved R2 track for a customer gift.
    audioUrl: '/demo-soundtrack.wav',
  },
  invitation: {
    title: 'You, me, and a little plan',
    message: 'Aku sudah menyiapkan waktu untuk kita. Datang saja sebagai dirimu sendiri; sisanya biar jadi kejutan kecil.',
    date: '2026-11-19', startTime: '17:30', endTime: '21:00',
    venue: 'A little dinner place', address: 'Jakarta Selatan', dressCode: 'Something you feel lovely in',
    rundown: [
      { id: 'meet', time: '17:30', title: 'Meet me there', note: 'Kita mulai sore ini pelan-pelan.' },
      { id: 'dinner', time: '18:15', title: 'Dinner together', note: 'Makan enak, cerita panjang.' },
      { id: 'surprise', time: '20:00', title: 'One little surprise', note: 'Yang ini belum boleh kamu tahu.' },
    ],
  },
  letter: {
    title: 'A note before we go',
    paragraphs: [
      'Nara, aku suka sekali hari-hari biasa saat kita bersama. Dari obrolan yang tidak selesai-selesai sampai cara kamu membuat tempat asing terasa akrab.',
      'Jadi kali ini, aku ingin menyiapkan satu hari yang hanya milik kita. Tidak harus sempurna. Aku cuma ingin hadir, mendengarkan ceritamu, dan membuat kenangan kecil yang bisa kita ingat lagi nanti.',
    ],
    signoff: 'Love, Ari',
  },
  gallery: {
    title: 'Proof that little things stay',
    subtitle: 'Potongan hari-hari yang ingin kusimpan.',
    photos: [
      { id: 'g1', src: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=750&q=82', alt: 'Teman-teman menikmati waktu bersama', caption: 'the first laugh' },
      { id: 'g2', src: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=750&q=82', alt: 'Kenangan hangat', caption: 'a quiet afternoon' },
      { id: 'g3', src: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=750&q=82', alt: 'Perayaan bersama', caption: 'the good kind of chaos' },
      { id: 'g4', src: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=750&q=82', alt: 'Berjalan bersama', caption: 'and more to come' },
    ],
  },
  closing: {
    title: 'So, what do you say?',
    message: 'Tanggalnya sudah kusiapkan. Tempat untukmu selalu ada di sampingku.',
    question: 'Mau pergi denganku?',
    ticketMessage: 'One little day. A thousand things to remember.',
  },
};
