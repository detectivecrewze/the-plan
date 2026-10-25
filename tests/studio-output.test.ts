import { describe, expect, it } from 'vitest';
import { demo } from '../src/demo';
import { formatEventTime } from '../src/eventTime';
import { validateProject } from '../src/project';
import { makeBarcodeSvg, reviewTemplate } from '../src/studio/barcode';
import { themes } from '../src/themes';
import jsQR from 'jsqr';

describe('Studio publication output', () => {
  it('shows END for an open-ended event and accepts it as an editor value', () => {
    expect(formatEventTime('17:30')).toBe('17:30 – END');
    expect(formatEventTime('17:30', '20:00')).toBe('17:30 – 20:00');
    expect(validateProject({ ...demo, invitation: { ...demo.invitation, endTime: 'END' } })).toEqual([]);
    expect(validateProject({ ...demo, invitation: { ...demo.invitation, endTime: 'later' } })).toContain('End time must be HH:mm or END');
  });

  it('builds a different scannable matrix for each public link in the selected palette', () => {
    const url = 'https://example.com/gift/plan-nara';
    const burgundy = makeBarcodeSvg(url, demo);
    const navy = makeBarcodeSvg(url, { ...demo, theme: 'midnight-navy' });
    expect(burgundy).toContain(themes['burgundy-keepsake'].colors.primaryDark);
    expect(navy).toContain(themes['midnight-navy'].colors.primaryDark);
    expect(burgundy).toContain('SCAN TO OPEN');
    expect(burgundy).not.toBe(makeBarcodeSvg('https://example.com/gift/another-plan', demo));
    expect((burgundy.match(/<rect x=/g) || []).length).toBeGreaterThan(300);
    const matrix = burgundy.match(/<g fill="#[0-9a-fA-F]+">([\s\S]*?)<\/g>/)?.[1];
    expect(matrix).toBeTruthy();
    const width = 700;
    const image = new Uint8ClampedArray(width * width * 4).fill(255);
    for (const match of matrix!.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"\/>/g)) {
      const [, rawX, rawY, rawWidth, rawHeight] = match;
      const left = Number(rawX) - 150;
      const top = Number(rawY) - 245;
      for (let y = top; y < top + Number(rawHeight); y++) for (let x = left; x < left + Number(rawWidth); x++) {
        const position = (y * width + x) * 4;
        image[position] = image[position + 1] = image[position + 2] = 0;
      }
    }
    expect(jsQR(image, width, width)?.data).toBe(url);
  });

  it('copies the public link into the review message without rewriting customer facts', () => {
    const url = 'https://example.com/gift/plan-nara';
    expect(reviewTemplate(demo, url, 'id')).toContain(url);
    expect(reviewTemplate(demo, url, 'id')).toContain('Ari');
    expect(reviewTemplate(demo, url, 'en')).toContain(url);
  });
});
