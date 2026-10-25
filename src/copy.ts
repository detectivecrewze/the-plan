import type { Locale } from './project';

export const copy = {
  id: {
    open: 'Pasangkan keping foto', openAssist: 'Buka tanpa menggeser',
    puzzleHint: 'Pasangkan tiga keping foto ke ruang yang sesuai', puzzleProgress: 'KEPING TERPASANG',
    pictureComplete: 'the picture is complete', continueStory: 'Lanjut ke ceritanya', openingLoading: 'Membuka ceritanya...',
    openingError: 'Belum berhasil membuka. Periksa koneksimu lalu coba lagi.', enterWithoutAudio: 'Buka tanpa musik',
    scroll: 'GULIR UNTUK MELIHAT RENCANANYA', play: 'Putar lagu', pause: 'Jeda lagu', noAudio: 'Lagu akan dipasang saat gift dibuat',
    openingAria: 'Puzzle pembuka', madeWithLove: 'DIBUAT DENGAN CINTA', nowPlaying: 'SEDANG DIPUTAR', songProgress: 'Progres lagu', video: 'VIDEO',
    invitation: 'UNDANGAN KECIL', date: 'TANGGAL', time: 'WAKTU', place: 'TEMPAT', dress: 'DRESS CODE', plan: 'RENCANA KITA', map: 'Lihat lokasi',
    invitationNote: 'sesuatu yang kecil untuk kita', letter: 'SEBUAH SURAT', letterStamp: 'dengan seluruh hatiku', gallery: 'ALBUM KECIL', oneMoreThing: 'satu hal lagi...',
    closing: 'SATU PERTANYAAN', yes: 'Iya, aku mau pergi', print: 'Mencetak undanganmu...', ready: 'Undangan untukmu sudah siap',
    download: 'Unduh PNG', share: 'Bagikan', close: 'Tutup', saved: 'Jawabanmu tersimpan.',
    responseError: 'Jawaban belum tersimpan. Periksa koneksimu lalu coba lagi.', forYou: 'UNTUKMU', ticketKicker: 'SATU HARI KECIL, DIRENCANAKAN DENGAN CINTA', keepDate: 'SIMPAN TANGGAL INI.', from: 'dari', madeForYou: 'dibuat untukmu', audioUnavailable: 'Audio belum dapat diputar',
    shareFallback: 'Fitur Bagikan tidak tersedia di browser ini. PNG sudah diunduh.',
    downloadError: 'PNG gagal dibuat. Coba lagi.', retry: 'Coba lagi',
  },
  en: {
    open: 'Place the photo piece', openAssist: 'Open without dragging',
    puzzleHint: 'Match all three photo pieces with their spaces', puzzleProgress: 'PIECES PLACED',
    pictureComplete: 'the picture is complete', continueStory: 'Continue to the story', openingLoading: 'Opening the story...',
    openingError: 'We could not open it yet. Check your connection and try again.', enterWithoutAudio: 'Open without music',
    scroll: 'SCROLL TO SEE THE PLAN', play: 'Play song', pause: 'Pause song', noAudio: 'The song will be added when the gift is made',
    openingAria: 'Opening puzzle', madeWithLove: 'MADE WITH LOVE', nowPlaying: 'NOW PLAYING', songProgress: 'Song progress', video: 'VIDEO',
    invitation: 'A LITTLE INVITATION', date: 'DATE', time: 'TIME', place: 'PLACE', dress: 'DRESS CODE', plan: 'OUR LITTLE PLAN', map: 'View location',
    invitationNote: 'a little something for us', letter: 'A LETTER', letterStamp: 'with all my heart', gallery: 'A LITTLE ALBUM', oneMoreThing: 'one more thing...',
    closing: 'ONE QUESTION', yes: 'Yes, I would love to go', print: 'Printing your invitation...', ready: 'Your invitation is ready',
    download: 'Download PNG', share: 'Share', close: 'Close', saved: 'Your answer has been saved.',
    responseError: 'Your answer was not saved. Check your connection and try again.', forYou: 'FOR YOU', ticketKicker: 'A LITTLE DAY, PLANNED WITH LOVE', keepDate: 'KEEP THIS DATE.', from: 'from', madeForYou: 'made for you', audioUnavailable: 'Audio unavailable',
    shareFallback: 'Sharing is unavailable in this browser. The PNG was downloaded instead.',
    downloadError: 'Could not create the PNG. Please try again.', retry: 'Try again',
  },
} satisfies Record<Locale, Record<string, string>>;

export function t(locale: Locale) { return copy[locale]; }

export function eventDate(value: string, locale: Locale): { day: string; month: string; weekday: string; full: string } {
  const date = new Date(`${value}T12:00:00`);
  const lang = locale === 'id' ? 'id-ID' : 'en-US';
  return {
    day: new Intl.DateTimeFormat(lang, { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat(lang, { month: 'long' }).format(date),
    weekday: new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(date),
    full: new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(date),
  };
}
