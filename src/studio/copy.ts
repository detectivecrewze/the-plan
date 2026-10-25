import type { Locale } from '../project';

const id = {
  brand: 'THE PLAN · STUDIO', loginTitle: 'Masuk ke Studio', password: 'Password tim', login: 'Masuk', loginError: 'Password salah atau sesi tidak tersedia.',
  projectTitle: 'Buka project', projectId: 'Project ID', open: 'Buka Studio', create: 'Buat draft dari demo', createHint: 'Untuk tahap ini, tim dapat menyiapkan project baru dari contoh lalu mengganti seluruh kontennya.',
  invalidId: 'Gunakan 3–64 huruf kecil, angka, atau tanda hubung.', notFound: 'Draft belum ada. Kamu bisa membuatnya dari demo.',
  logout: 'Keluar', dashboard: 'Dashboard', preview: 'Live preview', close: 'Tutup', refresh: 'Muat ulang preview', saveNow: 'Simpan sekarang', publish: 'Publish gift', publishConfirm: 'Publikasikan draft yang sudah diperiksa? Link gift akan memakai isi draft saat ini.', previous: 'Sebelumnya', next: 'Lanjut', step: 'Langkah', barcode: 'Barcode stamp', barcodeReady: 'Gift sudah terbit', barcodeHint: 'QR mengikuti warna gift yang dipublish. Scan untuk membuka link penerima.', downloadBarcode: 'Unduh PNG', copyReview: 'Salin pesan review', openGift: 'Buka gift', barcodeError: 'Barcode gagal dibuat.',
  saved: 'Tersimpan', saving: 'Menyimpan...', unsaved: 'Belum tersimpan', saveFailed: 'Gagal menyimpan. Coba lagi sebelum publish.', published: 'Gift terbit', draft: 'Draft', copyLink: 'Salin link', copied: 'Link tersalin',
  identity: 'Identitas & warna', opening: 'Opening puzzle', hero: 'Halaman utama', music: 'Musik', invitation: 'Undangan & rundown', letter: 'Surat', gallery: 'Galeri', closing: 'Penutup',
  uiLanguage: 'Bahasa Studio', giftLanguage: 'Bahasa gift', theme: 'Palet warna', recipient: 'Penerima', sender: 'Pengirim',
  eyebrow: 'Teks kecil', title: 'Judul', note: 'Catatan', subtitle: 'Subjudul', message: 'Pesan', caption: 'Caption', photoUrl: 'URL foto',
  musicTitle: 'Judul lagu', artist: 'Artis', audioUrl: 'URL audio', coverUrl: 'URL cover', upload: 'Unggah', uploading: 'Mengunggah...',
  date: 'Tanggal', startTime: 'Jam mulai', endTime: 'Jam selesai', endTimeHint: 'Isi jam (mis. 21:00) atau ketik END. Jika kosong, gift menampilkan END.', venue: 'Tempat', address: 'Alamat', mapsUrl: 'Link Maps', dressCode: 'Dress code',
  rundown: 'Agenda', addAgenda: 'Tambah agenda', remove: 'Hapus', agendaTime: 'Jam', agendaTitle: 'Kegiatan', agendaNote: 'Catatan kegiatan',
  paragraphs: 'Isi surat (pisahkan paragraf dengan satu baris kosong)', signoff: 'Tanda tangan',
  galleryItems: 'Foto dan video', addMedia: 'Tambah media', mediaType: 'Jenis media', image: 'Foto', video: 'Video', mediaUrl: 'URL media', posterUrl: 'URL poster video', moveUp: 'Naik', moveDown: 'Turun',
  question: 'Pertanyaan', ticketMessage: 'Pesan pada tiket PNG', presets: 'Pilih preset teks', presetHint: 'Mulai dari contoh, lalu sesuaikan dengan ceritamu.', presetConfirmHint: 'Tinjau perubahan sebelum preset diterapkan.', applyPreset: 'Terapkan preset', cancelPreset: 'Kembali', musicSource: 'Sumber musik', playlistChoice: 'Pilih dari playlist', uploadOwn: 'Unggah lagu sendiri', searchSongs: 'Cari judul atau artis', previewSong: 'Dengarkan', pausePreview: 'Jeda', useSong: 'Pakai lagu ini', selectedSong: 'Dipilih', previewSongError: 'Lagu tidak dapat diputar saat ini.', previewInvalid: 'Lengkapi tanggal, jam, dan media wajib sebelum membuka preview.',
  publishIssues: 'Draft belum siap terbit:', sessionExpired: 'Sesi berakhir. Silakan masuk lagi.', uploadError: 'Unggahan gagal.',
} as const;

const en: Record<keyof typeof id, string> = {
  brand: 'THE PLAN · STUDIO', loginTitle: 'Enter the Studio', password: 'Team password', login: 'Sign in', loginError: 'Incorrect password or login unavailable.',
  projectTitle: 'Open a project', projectId: 'Project ID', open: 'Open Studio', create: 'Create draft from demo', createHint: 'For this stage, the team can start with the sample and replace all content.',
  invalidId: 'Use 3–64 lowercase letters, numbers, or hyphens.', notFound: 'No draft yet. You can create one from the demo.',
  logout: 'Sign out', dashboard: 'Dashboard', preview: 'Live preview', close: 'Close', refresh: 'Refresh preview', saveNow: 'Save now', publish: 'Publish gift', publishConfirm: 'Publish the reviewed draft? The gift link will use its current content.', previous: 'Previous', next: 'Next', step: 'Step', barcode: 'QR stamp', barcodeReady: 'Gift is published', barcodeHint: 'The QR matches the published gift palette. Scan it to open the recipient link.', downloadBarcode: 'Download PNG', copyReview: 'Copy review message', openGift: 'Open gift', barcodeError: 'Could not create the QR stamp.',
  saved: 'Saved', saving: 'Saving...', unsaved: 'Unsaved', saveFailed: 'Save failed. Retry before publishing.', published: 'Published gift', draft: 'Draft', copyLink: 'Copy link', copied: 'Link copied',
  identity: 'Identity & color', opening: 'Opening puzzle', hero: 'Hero', music: 'Music', invitation: 'Invitation & rundown', letter: 'Letter', gallery: 'Gallery', closing: 'Closing',
  uiLanguage: 'Studio language', giftLanguage: 'Gift language', theme: 'Color palette', recipient: 'Recipient', sender: 'Sender',
  eyebrow: 'Small text', title: 'Title', note: 'Note', subtitle: 'Subtitle', message: 'Message', caption: 'Caption', photoUrl: 'Photo URL',
  musicTitle: 'Song title', artist: 'Artist', audioUrl: 'Audio URL', coverUrl: 'Cover URL', upload: 'Upload', uploading: 'Uploading...',
  date: 'Date', startTime: 'Start time', endTime: 'End time', endTimeHint: 'Enter a time (e.g. 21:00) or END. Leaving it blank displays END in the gift.', venue: 'Venue', address: 'Address', mapsUrl: 'Maps link', dressCode: 'Dress code',
  rundown: 'Schedule', addAgenda: 'Add item', remove: 'Remove', agendaTime: 'Time', agendaTitle: 'Activity', agendaNote: 'Activity note',
  paragraphs: 'Letter body (separate paragraphs with a blank line)', signoff: 'Signoff',
  galleryItems: 'Photos and videos', addMedia: 'Add media', mediaType: 'Media type', image: 'Photo', video: 'Video', mediaUrl: 'Media URL', posterUrl: 'Video poster URL', moveUp: 'Move up', moveDown: 'Move down',
  question: 'Question', ticketMessage: 'Message on the PNG ticket', presets: 'Text presets', presetHint: 'Start with an example, then make it your own.', presetConfirmHint: 'Review the changes before applying this preset.', applyPreset: 'Apply preset', cancelPreset: 'Go back', musicSource: 'Music source', playlistChoice: 'Choose from playlist', uploadOwn: 'Upload your own song', searchSongs: 'Search title or artist', previewSong: 'Preview', pausePreview: 'Pause', useSong: 'Use this song', selectedSong: 'Selected', previewSongError: 'This song cannot be played right now.', previewInvalid: 'Complete the required date, time, and media before opening preview.',
  publishIssues: 'Draft is not ready to publish:', sessionExpired: 'Session expired. Please sign in again.', uploadError: 'Upload failed.',
};

export type StudioCopy = typeof en;
export const studioText = (locale: Locale): StudioCopy => locale === 'id' ? id : en;
