import { describe, expect, it } from 'vitest';
import { rasterSide } from './rasterize_svg.ts';

describe('rasterSide', () => {
  it('scales small icons up and caps huge ones', () => {
    expect(rasterSide(24)).toBe(256);
    expect(rasterSide(500)).toBe(500);
    expect(rasterSide(5000)).toBe(1024);
  });
});
