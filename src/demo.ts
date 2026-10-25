import type { GiftProject } from './project';

// All demo copy and media live here. Later the Worker adapter can supply the same shape.
export const demo: GiftProject = {
  schemaVersion: 1,
  id: 'demo-the-plan',
  locale: 'id',
  theme: 'burgundy-keepsake',
  recipient: 'Nara',
  sender: 'Ari',
  opening: {
    eyebrow: 'Two celebrations are almost complete',
    title: 'Tiga keping lagi,\nlalu hari istimewa\nkita dimulai.',
    note: 'Untuk merayakan hari lahirmu dan perjalanan kita.',
    photo: { id: 'opening', src: '/demo-media/opening.webp', alt: 'Pasangan berciuman saat matahari terbenam', caption: 'your day, our story, one celebration' },
  },
  hero: {
    eyebrow: 'Your birthday · our anniversary',
    title: 'Two reasons\nto celebrate\nyou, and us.',
    subtitle: 'Hari ini bukan hanya tentang bertambahnya usiamu, tetapi juga tentang satu tahun lagi kita memilih satu sama lain.',
    photo: { id: 'hero', src: '/demo-media/hero.webp', alt: 'Pasangan tersenyum bersama di luar ruangan', caption: 'another year of you, another year of us' },
  },
  music: {
    title: 'About You', artist: 'The 1975',
    cover: { id: 'cover', src: 'https://arcade-edition.aldoramadhan16.workers.dev/files/1773904442555-tjdyhk.jpg', alt: 'Cover album About You oleh The 1975', caption: '' },
    audioUrl: 'https://arcade-edition.aldoramadhan16.workers.dev/files/1773904364430-4b7hn9.mp3',
  },
  invitation: {
    title: 'A birthday & anniversary date',
    message: 'Aku sudah menyiapkan satu malam untuk merayakan hari lahirmu dan perjalanan kita. Kamu cukup datang dan bawa senyum favoritku.',
    date: '2026-11-19', startTime: '17:30', endTime: '21:00',
    venue: 'The Garden Table', address: 'Jakarta Selatan', dressCode: 'Our favorite date-night look',
    rundown: [
      { id: 'meet', time: '17:30', title: 'Meet me there', note: 'Kita mulai malam istimewa ini pelan-pelan.' },
      { id: 'dinner', time: '18:15', title: 'Birthday dinner for you', note: 'Makanan favoritmu dan semua cerita tahun ini.' },
      { id: 'rewind', time: '19:30', title: 'Our anniversary rewind', note: 'Melihat kembali momen kecil yang membawa kita sampai sini.' },
      { id: 'surprise', time: '20:15', title: 'Cake, wish, and one promise', note: 'Tiup lilinmu, lalu buka satu kejutan untuk bab kita berikutnya.' },
    ],
  },
  letter: {
    title: 'For your day, and for us',
    paragraphs: [
      'Nara, selamat ulang tahun untuk orang yang membuat banyak hari biasa terasa istimewa. Aku berharap tahun barumu membawa lebih banyak hal yang kamu cintai, keberanian untuk mengejar yang kamu mau, dan alasan untuk tersenyum setiap hari.',
      'Hari ini juga menjadi pengingat bahwa kita sudah berjalan sejauh ini bersama. Terima kasih karena tetap memilih kita di hari yang mudah maupun sulit. Malam ini aku ingin merayakan dirimu, perjalanan kita, dan semua kenangan yang masih menunggu untuk dibuat.',
    ],
    signoff: 'Love, Ari',
  },
  gallery: {
    title: 'You, us, and all the little moments',
    subtitle: 'Potongan perjalanan menuju ulang tahunmu dan hari jadi kita.',
    photos: [
      { id: 'g1', src: '/demo-media/memory-01.webp', alt: 'Pasangan tersenyum di depan dinding bata', caption: 'the smile I keep choosing' },
      { id: 'g2-video', type: 'video', src: '/demo-media/memory-video-02.mp4', poster: '/demo-media/memory-02.webp', alt: 'Video pasangan menikmati satu hari bersama', caption: 'one ordinary date, kept forever' },
      { id: 'g3', src: '/demo-media/memory-03.webp', alt: 'Pasangan berjalan sambil bergandengan tangan', caption: 'always finding our way back' },
      { id: 'g4', src: '/demo-media/memory-04.webp', alt: 'Pasangan menikmati pemandangan pegunungan', caption: 'the view was better with you' },
      { id: 'g5', src: '/demo-media/memory-05.webp', alt: 'Pasangan bercanda sambil berjalan', caption: 'the good kind of chaos' },
      { id: 'g6', src: '/demo-media/memory-06.webp', alt: 'Pasangan berfoto di photo booth', caption: 'proof that we were this happy' },
      { id: 'g7-video', type: 'video', src: '/demo-media/memory-video.mp4', poster: '/demo-media/memory-08.webp', alt: 'Video singkat kenangan pasangan', caption: 'one memory, still moving' },
      { id: 'g8', src: '/demo-media/memory-07.webp', alt: 'Pasangan berdiri berdekatan', caption: 'close, just like this' },
      { id: 'g9', src: '/demo-media/memory-08.webp', alt: 'Pasangan berpelukan di tepi pantai', caption: 'another sunset for our story' },
    ],
  },
  closing: {
    title: 'One night, two reasons to celebrate',
    message: 'Tanggalnya sudah kusiapkan. Sekarang aku hanya butuh kamu untuk merayakan hari lahirmu dan kisah kita.',
    question: 'Mau merayakan ulang tahunmu dan anniversary kita bersamaku?',
    ticketMessage: 'Your new year. Our next chapter. One night to remember.',
  },
};
