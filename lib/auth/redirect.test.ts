import { describe, expect, it } from 'vitest';

import { safeNextPath } from './redirect';

describe('safeNextPath', () => {
  it('keeps same-site paths with query and hash', () => {
    expect(safeNextPath('/giza')).toBe('/giza');
    expect(safeNextPath('/giza?tab=views#guide')).toBe('/giza?tab=views#guide');
  });

  it('falls back for missing, external or tricky values', () => {
    for (const bad of [
      null,
      undefined,
      '',
      'giza',
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '\\\\evil.example',
      '/a/..//evil.example',
      '/sign-in',
      `/${'a'.repeat(600)}`,
    ]) {
      expect(safeNextPath(bad)).toBe('/');
    }
  });

  it('uses the given fallback', () => {
    expect(safeNextPath('https://evil.example', '/giza')).toBe('/giza');
  });
});
