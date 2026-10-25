export const themeIds = [
  'burgundy-keepsake',
  'antique-rose',
  'sage-botanical',
  'espresso-journal',
  'midnight-navy',
  'lavender-dusk',
] as const;

export type ThemeId = typeof themeIds[number];

export interface ThemeDefinition {
  name: string;
  description: string;
  colors: {
    page: string;
    shell: string;
    paper: string;
    paperBright: string;
    surface: string;
    surfaceAlt: string;
    ink: string;
    inkSoft: string;
    primary: string;
    primaryDark: string;
    accent: string;
    border: string;
    shadow: string;
    tape: string;
    light: string;
  };
}

export const themes: Record<ThemeId, ThemeDefinition> = {
  'burgundy-keepsake': {
    name: 'Burgundy Keepsake',
    description: 'Krem hangat, merah anggur, dan nuansa scrapbook klasik',
    colors: { page: '#f0e7db', shell: '#f7efe5', paper: '#fbf5ee', paperBright: '#fffaf1', surface: '#e6d0c2', surfaceAlt: '#f5ebde', ink: '#4b2a29', inkSoft: '#8c6d60', primary: '#a34239', primaryDark: '#762c2a', accent: '#a5463e', border: '#dcb4a2', shadow: '#c8a998', tape: '#d7b8a0', light: '#f6bc81' },
  },
  'antique-rose': {
    name: 'Antique Rose',
    description: 'Dusty rose, kertas ivory, dan tinta mawar antik',
    colors: { page: '#eadfda', shell: '#f4ebe7', paper: '#fbf6f1', paperBright: '#fffaf7', surface: '#dfc9c9', surfaceAlt: '#f1e4e1', ink: '#452e32', inkSoft: '#81676c', primary: '#8b4854', primaryDark: '#65313b', accent: '#aa6672', border: '#d5b6b8', shadow: '#bea0a2', tape: '#ceb2aa', light: '#e4b275' },
  },
  'sage-botanical': {
    name: 'Sage Botanical',
    description: 'Sage lembut, warm ivory, dan aksen herbarium',
    colors: { page: '#e6e5dc', shell: '#f1eddf', paper: '#f8f4e8', paperBright: '#fffcf2', surface: '#d7d9c8', surfaceAlt: '#ecebdd', ink: '#30372d', inkSoft: '#626a59', primary: '#68745b', primaryDark: '#46513d', accent: '#897250', border: '#c2c2ad', shadow: '#a8aa94', tape: '#c5b89e', light: '#d9b877' },
  },
  'espresso-journal': {
    name: 'Espresso Journal',
    description: 'Mocha paper, espresso ink, dan aksen copper',
    colors: { page: '#dac8b7', shell: '#e6d5c2', paper: '#f4e9dc', paperBright: '#fbf4ea', surface: '#ceb79f', surfaceAlt: '#dfcdbc', ink: '#30231f', inkSoft: '#6c574d', primary: '#724c40', primaryDark: '#4e332b', accent: '#9c695c', border: '#bfa58f', shadow: '#a98d78', tape: '#c5a78f', light: '#d6a363' },
  },
  'midnight-navy': {
    name: 'Midnight Navy',
    description: 'Navy romantis, kertas dingin, dan aksen biru klasik',
    colors: { page: '#cfd8df', shell: '#e7ecef', paper: '#f6f4ee', paperBright: '#fffdf7', surface: '#becbd4', surfaceAlt: '#dde4e7', ink: '#182733', inkSoft: '#5a6d79', primary: '#274c63', primaryDark: '#142f40', accent: '#3d6f82', border: '#9fb2bd', shadow: '#899faa', tape: '#a8b5b9', light: '#e0b369' },
  },
  'lavender-dusk': {
    name: 'Lavender Dusk',
    description: 'Lavender berdebu, plum lembut, dan kertas pucat',
    colors: { page: '#ded9e5', shell: '#eeeaf2', paper: '#f8f4f7', paperBright: '#fffafd', surface: '#d3c7dc', surfaceAlt: '#e8e0ec', ink: '#352c3d', inkSoft: '#6c5d74', primary: '#725a7d', primaryDark: '#4d3859', accent: '#92719b', border: '#c1afc9', shadow: '#aa98b3', tape: '#c8b5bd', light: '#d9ad72' },
  },
};

export const defaultTheme: ThemeId = 'burgundy-keepsake';

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && themeIds.includes(value as ThemeId);
}

const storefrontDemoHosts = new Set(['localhost', '127.0.0.1', 'the-plan-iota.vercel.app']);

export function getDemoThemeOverride(pathname: string, hostname: string, search: string): ThemeId | undefined {
  if (pathname !== '/' || !storefrontDemoHosts.has(hostname.toLowerCase())) return undefined;
  const requestedTheme = new URLSearchParams(search).get('theme');
  return isThemeId(requestedTheme) ? requestedTheme : undefined;
}

export function applyTheme(themeId: ThemeId): void {
  const root = document.documentElement;
  const colors = themes[themeId].colors;
  root.dataset.theme = themeId;
  Object.entries(colors).forEach(([key, value]) => {
    const cssName = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    root.style.setProperty(`--theme-${cssName}`, value);
  });
}

