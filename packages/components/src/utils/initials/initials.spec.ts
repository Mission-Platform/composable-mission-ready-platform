import { describe, expect, it } from 'vitest';

import { initialsForName } from './initials';

describe('initialsForName', () => {
  it('returns up to two initials from a display name', () => {
    expect(initialsForName('Ada Lovelace')).toBe('AL');
    expect(initialsForName('  Grace   Hopper  ')).toBe('GH');
  });

  it('returns an empty string for blank names', () => {
    expect(initialsForName('   ')).toBe('');
  });
});
