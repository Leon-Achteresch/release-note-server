import { describe, it, expect } from 'vitest';
import { parseCommits } from './commit-parser.js';

describe('parseCommits', () => {
  it('parses a simple feat commit', () => {
    const result = parseCommits('feat: add user authentication');
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0]).toEqual({
      type: 'feat',
      scope: null,
      description: 'add user authentication',
      body: null,
      breaking: false,
    });
    expect(result.unparseable).toHaveLength(0);
  });

  it('parses a commit with scope', () => {
    const result = parseCommits('fix(api): handle null response in user endpoint');
    expect(result.commits[0].scope).toBe('api');
    expect(result.commits[0].description).toBe('handle null response in user endpoint');
  });

  it('detects breaking change via exclamation mark', () => {
    const result = parseCommits('feat(api)!: change authentication flow to OAuth2');
    expect(result.commits[0].breaking).toBe(true);
    expect(result.commits[0].type).toBe('feat');
    expect(result.commits[0].scope).toBe('api');
  });

  it('parses body after blank line', () => {
    const input = `feat(auth): add JWT login support

Implements access and refresh tokens.
Adds middleware for token validation.
Closes #123`;

    const result = parseCommits(input);
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0].body).toBe(
      'Implements access and refresh tokens.\nAdds middleware for token validation.\nCloses #123'
    );
  });

  it('detects BREAKING CHANGE in footer', () => {
    const input = `refactor(config): remove legacy environment variables

BREAKING CHANGE: ENV_OLD is no longer supported`;

    const result = parseCommits(input);
    expect(result.commits[0].breaking).toBe(true);
  });

  it('parses multiple commits', () => {
    const input = `feat: add auth
fix: resolve bug
chore: update deps`;

    const result = parseCommits(input);
    expect(result.commits).toHaveLength(3);
    expect(result.commits[0].type).toBe('feat');
    expect(result.commits[1].type).toBe('fix');
    expect(result.commits[2].type).toBe('chore');
  });

  it('tracks unparseable lines', () => {
    const input = `feat: valid commit
this is not a valid commit
fix: another valid one`;

    const result = parseCommits(input);
    expect(result.commits).toHaveLength(2);
    expect(result.unparseable).toEqual(['this is not a valid commit']);
  });

  it('handles empty input', () => {
    const result = parseCommits('');
    expect(result.commits).toHaveLength(0);
    expect(result.unparseable).toHaveLength(0);
  });

  it('parses all commit types', () => {
    const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
    const input = types.map(t => `${t}: some message`).join('\n');

    const result = parseCommits(input);
    expect(result.commits).toHaveLength(types.length);
    result.commits.forEach((c, i) => {
      expect(c.type).toBe(types[i]);
    });
  });
});
