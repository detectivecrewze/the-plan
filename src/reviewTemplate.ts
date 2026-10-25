import type { GiftProject, Locale } from './project';

export function reviewTemplate(project: GiftProject, url: string, locale: Locale): string {
  const name = project.sender?.split('(')[0].trim() || '';
  if (locale === 'en') return `Hi${name ? ` ${name}` : ''},\n\nCould you review your The Plan gift first? This is a preview for your feedback:\n${url}\n\nIf you would like changes, please send them as a short list. Once everything feels right, let me know and I will send the final link and QR stamp.\n\nA personal link or custom domain is also available as an optional add-on. Let me know if you would like one.`;
  return `Halo kak${name ? ` ${name}` : ''},\n\nBoleh tolong preview dulu hasil gift The Plan-nya? Ini masih untuk dicek sebelum final:\n${url}\n\nKalau ada bagian yang ingin direvisi, tolong kirim daftarnya per poin ya kak. Kalau sudah cocok semua, kabari saya agar link final dan barcode stamp-nya bisa saya kirim.\n\nKalau kakak ingin nama link personal atau custom domain, fitur tersebut juga tersedia sebagai add-on. Tinggal kabari saya ya kak.`;
}
