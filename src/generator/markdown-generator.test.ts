import { describe, it, expect } from 'vitest';
import { generateMarkdown } from './markdown-generator.js';
import type { ParsedCommit } from '../types/index.js';

describe('generateMarkdown', () => {
  it('generates header with version and date', () => {
    const md = generateMarkdown([], { version: '1.0.0', date: '2026-02-25' });
    expect(md).toContain('# Release Notes v1.0.0 (2026-02-25)');
  });

  it('generates header without version', () => {
    const md = generateMarkdown([], { date: '2026-02-25' });
    expect(md).toContain('# Release Notes (2026-02-25)');
  });

  it('groups commits by type with German headers', () => {
    const commits: ParsedCommit[] = [
      { type: 'feat', scope: null, description: 'add auth', body: null, breaking: false },
      { type: 'fix', scope: null, description: 'resolve bug', body: null, breaking: false },
    ];

    const md = generateMarkdown(commits, { date: '2026-02-25' });
    expect(md).toContain('## Neue Features');
    expect(md).toContain('## Fehlerbehebungen');
    expect(md).toContain('- add auth');
    expect(md).toContain('- resolve bug');
  });

  it('formats scope as bold prefix', () => {
    const commits: ParsedCommit[] = [
      { type: 'feat', scope: 'auth', description: 'add JWT', body: null, breaking: false },
    ];

    const md = generateMarkdown(commits, { date: '2026-02-25' });
    expect(md).toContain('- **auth:** add JWT');
  });

  it('formats body as indented blockquote', () => {
    const commits: ParsedCommit[] = [
      { type: 'feat', scope: null, description: 'add auth', body: 'Line 1\nLine 2', breaking: false },
    ];

    const md = generateMarkdown(commits, { date: '2026-02-25' });
    expect(md).toContain('  > Line 1\n  > Line 2');
  });

  it('puts breaking changes in a separate top section', () => {
    const commits: ParsedCommit[] = [
      { type: 'feat', scope: null, description: 'normal feature', body: null, breaking: false },
      { type: 'feat', scope: 'api', description: 'breaking change', body: null, breaking: true },
    ];

    const md = generateMarkdown(commits, { date: '2026-02-25' });
    const breakingIdx = md.indexOf('## !! Wichtige Aenderungen (Breaking Changes)');
    const featIdx = md.indexOf('## Neue Features');
    expect(breakingIdx).toBeGreaterThan(-1);
    expect(featIdx).toBeGreaterThan(breakingIdx);
    expect(md).toContain('- **api:** breaking change');
  });

  it('omits empty sections', () => {
    const commits: ParsedCommit[] = [
      { type: 'feat', scope: null, description: 'add auth', body: null, breaking: false },
    ];

    const md = generateMarkdown(commits, { date: '2026-02-25' });
    expect(md).not.toContain('## Fehlerbehebungen');
    expect(md).not.toContain('## Wartung');
  });
});
