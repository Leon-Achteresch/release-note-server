import type { CommitType, ParsedCommit, GeneratorOptions } from '../types/index.js';

const SECTION_HEADERS: Record<CommitType, string> = {
  feat: 'Neue Features',
  fix: 'Fehlerbehebungen',
  perf: 'Performance-Verbesserungen',
  refactor: 'Refactoring',
  docs: 'Dokumentation',
  test: 'Tests',
  build: 'Build-System',
  ci: 'CI/CD',
  style: 'Code-Stil',
  chore: 'Wartung',
  revert: 'Reverts',
};

const SECTION_ORDER: CommitType[] = [
  'feat', 'fix', 'perf', 'refactor', 'docs',
  'test', 'build', 'ci', 'style', 'chore', 'revert',
];

function formatCommit(commit: ParsedCommit): string {
  const scope = commit.scope ? `**${commit.scope}:** ` : '';
  let line = `- ${scope}${commit.description}`;

  if (commit.body) {
    const bodyLines = commit.body.split('\n').map(l => `  > ${l}`);
    line += '\n' + bodyLines.join('\n');
  }

  return line;
}

export function generateMarkdown(commits: ParsedCommit[], options: GeneratorOptions = {}): string {
  const date = options.date ?? new Date().toISOString().slice(0, 10);
  const version = options.version;

  const lines: string[] = [];

  if (version) {
    lines.push(`# Release Notes v${version} (${date})`);
  } else {
    lines.push(`# Release Notes (${date})`);
  }

  // Breaking changes section
  const breaking = commits.filter(c => c.breaking);
  if (breaking.length > 0) {
    lines.push('');
    lines.push('## !! Wichtige Aenderungen (Breaking Changes)');
    lines.push('');
    for (const commit of breaking) {
      lines.push(formatCommit(commit));
    }
  }

  // Grouped sections
  for (const type of SECTION_ORDER) {
    const group = commits.filter(c => c.type === type && !c.breaking);
    if (group.length === 0) continue;

    lines.push('');
    lines.push(`## ${SECTION_HEADERS[type]}`);
    lines.push('');
    for (const commit of group) {
      lines.push(formatCommit(commit));
    }
  }

  return lines.join('\n') + '\n';
}
