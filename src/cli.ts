import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
// Load .env before anything else
import './config.js';
import { parseCommits } from './parser/commit-parser.js';
import { dedup } from './utils/dedup.js';
import { generateMarkdown } from './generator/markdown-generator.js';
import { generateAiReleaseNotes } from './ai/ai-generator.js';
import type { ReleaseNotesMeta } from './types/index.js';

interface CliArgs {
  from?: string;
  to?: string;
  version?: string;
  date?: string;
  output?: string;
  stdin: boolean;
  help: boolean;
  /** Use AI (OpenRouter) to generate release notes */
  ai: boolean;
  /** OpenRouter model override, e.g. "anthropic/claude-3.5-sonnet" */
  model?: string;
  /** Language for AI-generated notes, e.g. "de", "en" */
  language?: string;
  /** Extra instructions passed to the AI */
  aiInstructions?: string;
}

const HELP_TEXT = `
release-note-server CLI

Generiert Release Notes aus Conventional Commits.

Nutzung:
  npm run cli                                    Auto-detect aus Git-Tags
  npm run cli -- --output RELEASE.md             Ausgabe in Datei
  npm run cli -- --from v1.0.0 --to v1.1.0       Manuelle Commit-Range
  echo "feat: test" | npm run cli -- --stdin     Stdin-Modus
  npm run cli -- --ai                            KI-generierte Release Notes (OpenRouter)
  npm run cli -- --ai --model anthropic/claude-3.5-sonnet  Modell-Override

Optionen:
  --from <ref>             Start-Ref (Tag/Commit). Default: vorheriger Tag
  --to <ref>               End-Ref. Default: aktueller Tag oder HEAD
  --version <v>            Version ueberschreiben. Default: aus Tag-Name
  --date <YYYY-MM-DD>      Datum ueberschreiben. Default: heute
  --output <datei>         In Datei schreiben. Default: stdout
  --stdin                  Commits von stdin lesen
  --ai                     KI-Modus: Release Notes via OpenRouter generieren
  --model <model-id>       OpenRouter-Modell (z.B. openai/gpt-4o). Nur mit --ai
  --language <lang>        Sprache der KI-Ausgabe (de, en, fr, ...). Default: de
  --ai-instructions <txt>  Zusaetzliche Anweisungen fuer die KI. Nur mit --ai
  --help                   Diese Hilfe anzeigen

Umgebungsvariablen:
  OPENROUTER_API_KEY    API-Key fuer OpenRouter (erforderlich fuer --ai)
  OPENROUTER_MODEL      Standard-Modell (Default: openai/gpt-4o-mini)
  PORT                  HTTP-Server-Port (Default: 3000)
`.trim();

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { stdin: false, help: false, ai: false };

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
      case '--stdin':
        args.stdin = true;
        break;
      case '--ai':
        args.ai = true;
        break;
      case '--model':
        args.model = argv[++i];
        break;
      case '--language':
        args.language = argv[++i];
        break;
      case '--ai-instructions':
        args.aiInstructions = argv[++i];
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

export async function run(argv: string[]): Promise<void> {
  const args = parseArgs(argv);

  if (args.help) {
    process.stdout.write(HELP_TEXT + '\n');
    return;
  }

  let input: string;
  let version = args.version;
  const date = args.date;

  if (args.stdin) {
    // Stdin mode (explicit flag)
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

  let markdown: string;
  let meta: ReleaseNotesMeta;

  if (args.ai) {
    // ----- AI mode -----
    process.stderr.write('[AI] Generating release notes via OpenRouter...\n');
    const result = await generateAiReleaseNotes({
      commits: input,
      version,
      date,
      model: args.model,
      language: args.language,
      extraInstructions: args.aiInstructions,
    });

    markdown = result.markdown;
    meta = {
      total: result.meta.total,
      duplicatesRemoved: result.meta.duplicatesRemoved,
      unparseable: result.meta.unparseable,
    };

    // Print AI-specific info to stderr
    process.stderr.write(
      `[AI] Model: ${result.meta.model} | ` +
      `Tokens: ${result.meta.promptTokens ?? '?'} in / ${result.meta.completionTokens ?? '?'} out\n`,
    );
  } else {
    // ----- Deterministic mode -----
    const parsed = parseCommits(input);
    const deduped = dedup(parsed.commits);
    markdown = generateMarkdown(deduped.commits, { version, date });
    meta = {
      total: parsed.commits.length,
      duplicatesRemoved: deduped.removed,
      unparseable: parsed.unparseable.length,
    };
  }

  if (args.output) {
    writeFileSync(args.output, markdown, 'utf-8');
  } else {
    process.stdout.write(markdown);
  }

  // Meta info to stderr as JSON
  process.stderr.write(JSON.stringify(meta) + '\n');
}

// Main execution
const cliArgv = process.argv.slice(2);
run(cliArgv).catch((err) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
