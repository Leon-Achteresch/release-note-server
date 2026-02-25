import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseArgs, detectTags, type TagDetection } from './cli.js';

describe('parseArgs', () => {
  it('parses --from and --to', () => {
    const args = parseArgs(['--from', 'v1.0.0', '--to', 'v1.1.0']);
    expect(args.from).toBe('v1.0.0');
    expect(args.to).toBe('v1.1.0');
  });

  it('parses --version and --date', () => {
    const args = parseArgs(['--version', '2.0.0', '--date', '2025-01-15']);
    expect(args.version).toBe('2.0.0');
    expect(args.date).toBe('2025-01-15');
  });

  it('parses --output', () => {
    const args = parseArgs(['--output', 'RELEASE.md']);
    expect(args.output).toBe('RELEASE.md');
  });

  it('parses --help', () => {
    const args = parseArgs(['--help']);
    expect(args.help).toBe(true);
  });

  it('returns defaults for empty args', () => {
    const args = parseArgs([]);
    expect(args.from).toBeUndefined();
    expect(args.to).toBeUndefined();
    expect(args.version).toBeUndefined();
    expect(args.date).toBeUndefined();
    expect(args.output).toBeUndefined();
    expect(args.help).toBe(false);
  });

  it('handles all flags combined', () => {
    const args = parseArgs([
      '--from', 'v1.0.0',
      '--to', 'v2.0.0',
      '--version', '2.0.0',
      '--date', '2025-06-01',
      '--output', 'notes.md',
    ]);
    expect(args.from).toBe('v1.0.0');
    expect(args.to).toBe('v2.0.0');
    expect(args.version).toBe('2.0.0');
    expect(args.date).toBe('2025-06-01');
    expect(args.output).toBe('notes.md');
    expect(args.help).toBe(false);
  });
});

describe('detectTags', () => {
  const execSyncMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  it('is exported and callable', () => {
    expect(typeof detectTags).toBe('function');
  });
});

describe('CLI integration', () => {
  it('parseArgs ignores unknown flags', () => {
    const args = parseArgs(['--unknown', 'value', '--from', 'abc']);
    expect(args.from).toBe('abc');
    expect(args.help).toBe(false);
  });

  it('parseArgs handles --from without value gracefully', () => {
    const args = parseArgs(['--from']);
    expect(args.from).toBeUndefined();
  });
});
