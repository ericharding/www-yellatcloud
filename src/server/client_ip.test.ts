import { describe, expect, it } from 'vitest';
import { clientIp } from './client_ip.ts';

describe('clientIp', () => {
  it('uses the right-most forwarded entry, which the proxy appended', () => {
    expect(clientIp('6.6.6.6, 203.0.113.9', '10.0.0.1')).toBe('203.0.113.9');
    expect(clientIp('203.0.113.9', undefined)).toBe('203.0.113.9');
  });

  it('falls back to the socket address, then a placeholder', () => {
    expect(clientIp(undefined, '10.0.0.1')).toBe('10.0.0.1');
    expect(clientIp('', '10.0.0.1')).toBe('10.0.0.1');
    expect(clientIp(undefined, undefined)).toBe('unknown');
  });
});
