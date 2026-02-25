import type { ParsedCommit } from '../types/index.js';

function dedupKey(commit: ParsedCommit): string {
  return `${commit.type}|${(commit.scope ?? '').toLowerCase()}|${commit.description.toLowerCase()}`;
}

export function dedup(commits: ParsedCommit[]): { commits: ParsedCommit[]; removed: number } {
  const seen = new Map<string, ParsedCommit>();
  let removed = 0;

  for (const commit of commits) {
    const key = dedupKey(commit);
    const existing = seen.get(key);

    if (existing) {
      removed++;
      // Keep the version with the longer body
      const existingLen = existing.body?.length ?? 0;
      const currentLen = commit.body?.length ?? 0;
      if (currentLen > existingLen) {
        seen.set(key, commit);
      }
    } else {
      seen.set(key, commit);
    }
  }

  return { commits: Array.from(seen.values()), removed };
}
