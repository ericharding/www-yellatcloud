import { describe, expect, it } from 'vitest';
import { downloadName, sanitizeBaseName } from './download_name.ts';

describe('sanitizeBaseName', () => {
  it('drops the extension and slugifies', () => {
    expect(sanitizeBaseName('My Cool Logo!.png')).toBe('my-cool-logo');
  });

  it('strips path-like and unicode characters', () => {
    expect(sanitizeBaseName('../../etc/passwd.svg')).toBe('etc-passwd');
    expect(sanitizeBaseName('日本語.jpg')).toBe('logo');
  });

  it('falls back when nothing usable remains', () => {
    expect(sanitizeBaseName('')).toBe('logo');
    expect(sanitizeBaseName('.png')).toBe('logo');
    expect(sanitizeBaseName('***')).toBe('logo');
  });

  it('caps the length without leaving a trailing dash', () => {
    const name = sanitizeBaseName(`${'a'.repeat(39)}-bbbbbb.png`);
    expect(name).toBe('a'.repeat(39));
  });
});

describe('downloadName', () => {
  it('appends the suffix and kind', () => {
    expect(downloadName('Acme Corp.jpeg', 'png')).toBe('acme-corp-yells.png');
    expect(downloadName('Acme Corp.jpeg', 'gif')).toBe('acme-corp-yells.gif');
  });
});
