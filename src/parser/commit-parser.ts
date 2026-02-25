import type { CommitType, ParsedCommit, ParseResult } from '../types/index.js';

const COMMIT_TYPES: Set<string> = new Set([
  'feat', 'fix', 'docs', 'style', 'refactor',
  'perf', 'test', 'build', 'ci', 'chore', 'revert',
]);

const HEADER_RE = /^(\w+)(?:\(([^)]*)\))?(!)?\s*:\s+(.+)$/;

export function parseCommits(input: string): ParseResult {
  const commits: ParsedCommit[] = [];
  const unparseable: string[] = [];

  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  let current: ParsedCommit | null = null;
  let bodyLines: string[] = [];
  let inBody = false;

  const flush = () => {
    if (current) {
      if (bodyLines.length > 0) {
        current.body = bodyLines.join('\n');
        // Check for BREAKING CHANGE footer
        if (/^BREAKING CHANGE:\s*/m.test(current.body)) {
          current.breaking = true;
        }
      }
      commits.push(current);
      current = null;
      bodyLines = [];
      inBody = false;
    }
  };

  for (const line of lines) {
    const match = line.match(HEADER_RE);

    if (match && COMMIT_TYPES.has(match[1])) {
      flush();
      current = {
        type: match[1] as CommitType,
        scope: match[2] || null,
        description: match[4],
        body: null,
        breaking: match[3] === '!',
      };
      continue;
    }

    if (current) {
      if (line.trim() === '') {
        if (!inBody) {
          inBody = true;
        } else {
          bodyLines.push(line);
        }
        continue;
      }
      if (inBody) {
        bodyLines.push(line);
      } else {
        // Non-empty, non-header line directly after a commit header (no blank line) -> unparseable
        flush();
        unparseable.push(line);
      }
    } else if (line.trim() !== '') {
      unparseable.push(line);
    }
  }

  flush();

  return { commits, unparseable };
}
