import { describe, expect, it } from 'vitest';

import { parsePackageTaskArgs } from './package-task.js';

describe('package-task argument parsing', () => {
  it('parses direct package name for test action', () => {
    const result = parsePackageTaskArgs(['test', '@mission-platform/components']);
    expect(result.action).toBe('test');
    expect(result.packageName).toBe('@mission-platform/components');
    expect(result.extraArgs).toEqual([]);
  });

  it('parses direct package name for build action', () => {
    const result = parsePackageTaskArgs(['build', '@mission-platform/tokens']);
    expect(result.action).toBe('build');
    expect(result.packageName).toBe('@mission-platform/tokens');
    expect(result.extraArgs).toEqual([]);
  });

  it('parses --filter flag syntax', () => {
    const result = parsePackageTaskArgs(['test', '--filter', '@mission-platform/components']);
    expect(result.action).toBe('test');
    expect(result.packageName).toBe('@mission-platform/components');
    expect(result.extraArgs).toEqual([]);
  });

  it('parses --filter= syntax', () => {
    const result = parsePackageTaskArgs(['build', '--filter=@mission-platform/components']);
    expect(result.action).toBe('build');
    expect(result.packageName).toBe('@mission-platform/components');
    expect(result.extraArgs).toEqual([]);
  });

  it('strips trailing ellipsis and upstream selectors', () => {
    const withEllipsis = parsePackageTaskArgs(['test', '@mission-platform/components...']);
    expect(withEllipsis.packageName).toBe('@mission-platform/components');

    const withUpstream = parsePackageTaskArgs(['test', '@mission-platform/components^...']);
    expect(withUpstream.packageName).toBe('@mission-platform/components');
  });

  it('collects additional turbo arguments', () => {
    const result = parsePackageTaskArgs(['test', '@mission-platform/components', '--force', '--', '--run']);
    expect(result.packageName).toBe('@mission-platform/components');
    expect(result.extraArgs).toEqual(['--force', '--', '--run']);
  });

  it('throws an error when action is invalid or missing', () => {
    expect(() => parsePackageTaskArgs([])).toThrow('Action must be either "test" or "build"');
    expect(() => parsePackageTaskArgs(['lint'])).toThrow('Action must be either "test" or "build"');
  });

  it('throws an error when target package name is missing', () => {
    expect(() => parsePackageTaskArgs(['test'])).toThrow('A target package name is required');
  });
});
