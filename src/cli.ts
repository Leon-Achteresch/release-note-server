import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { parseCommits } from './parser/commit-parser.js';
import { dedup } from './utils/dedup.js';
import { generateMarkdown } from './generator/markdown-generator.js';
import type { ReleaseNotesMeta } from './types/index.js';

interface CliArgs {
  from?: string;
  to?: string;
  version?: string;
  date?: string;
  output?: string;
  help: boolean;
}

const HELP_TEXT = `
release-note-server CLI

Generiert Release Notes aus Conventional Commits.

Nutzung:
  npm run cli                              Auto-detect aus Git-Tags
  npm run cli -- --output RELEASE.md       Ausgabe in Datei
  npm run cli -- --from v1.0.0 --to v1.1.0 Manuelle Commit-Range
  echo "feat: test" | npm run cli          Stdin-Modus

Optionen:
  --from <ref>          Start-Ref (Tag/Commit). Default: vorheriger Tag
  --to <ref>            End-Ref. Default: aktueller Tag oder HEAD
  --version <v>         Version ueberschreiben. Default: aus Tag-Name
  --date <YYYY-MM-DD>   Datum ueberschreiben. Default: heute
  --output <datei>      In Datei schreiben. Default: stdout
  --help                Diese Hilfe anzeigen
`.trim();

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { help: false };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--from':
        args.from = argv[++i];
        break;
      case '--to':
        args.to = argv[++i];
        break;
      case '--version':
        args.version = argv[++i];
        break;
      case '--date':
        args.date = argv[++i];
        break;
      case '--output':
        args.output = argv[++i];
        break;
      case '--help':
        args.help = true;
        break;
    }
  }

  return args;
}

function git(command: string): string {
  return execSync(`git ${command}`, { encoding: 'utf-8' }).trim();
}

export interface TagDetection {
  currentTag: string | null;
  previousTag: string | null;
  version: string | null;
}

export function detectTags(): TagDetection {
  // Get all tags sorted by version descending
  let allTags: string[];
  try {
    const tagsOutput = git('tag --sort=-v:refname');
    allTags = tagsOutput ? tagsOutput.split('\n').filter(t => t.length > 0) : [];
  } catch {
    allTags = [];
  }

  if (allTags.length === 0) {
    return { currentTag: null, previousTag: null, version: null };
  }

  // Check if HEAD is on a tag
  let currentTag: string | null = null;
  try {
    currentTag = git('describe --tags --exact-match HEAD');
  } catch {
    // HEAD is not on a tag — use the most recent tag
    currentTag = allTags[0];
  }

  // Find previous tag (the one before currentTag)
  const currentIndex = allTags.indexOf(currentTag);
  const previousTag = currentIndex >= 0 && currentIndex < allTags.length - 1
    ? allTags[currentIndex + 1]
    : null;

  // Derive version from tag name (strip v prefix)
  const version = currentTag.replace(/^v/, '');

  return { currentTag, previousTag, version };
}

export function getCommitRange(from: string, to: string): string {
  return git(`log ${from}..${to} --format=%B`);
}

export function getAllCommits(to: string): string {
  return git(`log ${to} --format=%B`);
}

function getFirstCommit(): string {
  return git('rev-list --max-parents=0 HEAD');
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

function isStdinPiped(): boolean {
  return !process.stdin.isTTY;
}

export async function run(argv: string[]): Promise<void> {
  const args = parseArgs(argv);

  if (args.help) {
    process.stdout.write(HELP_TEXT + '\n');
    return;
  }

  let input: string;
  let version = args.version;
  const date = args.date;

  if (isStdinPiped() && !args.from) {
    // Stdin mode
    input = await readStdin();
  } else if (args.from) {
    // Manual refs mode
    const to = args.to ?? 'HEAD';
    input = getCommitRange(args.from, to);
  } else {
    // Auto-detection mode
    const detection = detectTags();

    if (!version && detection.version) {
      version = detection.version;
    }

    const to = args.to ?? detection.currentTag ?? 'HEAD';

    if (detection.previousTag) {
      input = getCommitRange(detection.previousTag, to);
    } else if (detection.currentTag) {
      // Only one tag — get all commits up to it
      try {
        const firstCommit = getFirstCommit();
        input = getCommitRange(firstCommit, to);
      } catch {
        input = getAllCommits(to);
      }
    } else {
      // No tags at all
      input = getAllCommits('HEAD');
    }
  }

  const parsed = parseCommits(input);
  const deduped = dedup(parsed.commits);
  const markdown = generateMarkdown(deduped.commits, { version, date });

  if (args.output) {
    writeFileSync(args.output, markdown, 'utf-8');
  } else {
    process.stdout.write(markdown);
  }

  // Meta info to stderr as JSON
  const meta: ReleaseNotesMeta = {
    total: parsed.commits.length,
    duplicatesRemoved: deduped.removed,
    unparseable: parsed.unparseable.length,
  };
  process.stderr.write(JSON.stringify(meta) + '\n');
}

// Main execution
const cliArgv = process.argv.slice(2);
run(cliArgv).catch((err) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
