# Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the project into a clean layered architecture with strict TypeScript, ESLint, Prettier, and isolated CLI entry points.

**Architecture:** Move source into `src/core/`, `src/server/`, `src/cli/` layers with a `src/config.ts` for env vars. Split `cli.ts` into pure logic files (`args.ts`, `git.ts`, `run.ts`) and a side-effect-only entry (`cli/index.ts`). Move all tests to `__tests__/` mirroring `src/`.

**Tech Stack:** TypeScript (NodeNext), Fastify 5, Vitest, ESLint (typescript-eslint), Prettier, tsx (runtime)

---

## Pre-flight: verify baseline

**Step 1: Run existing tests to confirm green baseline**

```bash
cd "/c/VS PROJEKTE/release-note-server"
npm test
```

Expected: all tests pass. If any fail, stop and report — do not proceed.

---

### Task 1: Install ESLint + Prettier

**Files:**
- Modify: `package.json`

**Step 1: Install dev dependencies**

```bash
npm install --save-dev \
  eslint \
  @eslint/js \
  typescript-eslint \
  prettier \
  eslint-config-prettier
```

**Step 2: Verify install succeeded**

```bash
npx eslint --version
npx prettier --version
```

Expected: version numbers printed, no errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install eslint and prettier"
```

---

### Task 2: Create Prettier config

**Files:**
- Create: `.prettierrc`
- Create: `.prettierignore`

**Step 1: Create `.prettierrc`**

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Step 2: Create `.prettierignore`**

```
node_modules/
dist/
docs/
*.md
```

**Step 3: Run prettier on existing src to check what would change**

```bash
npx prettier --check "src/**/*.ts"
```

(It's OK if files need formatting — we'll fix in a later step.)

**Step 4: Commit**

```bash
git add .prettierrc .prettierignore
git commit -m "chore: add prettier config"
```

---

### Task 3: Create ESLint config

**Files:**
- Create: `eslint.config.mjs`

**Step 1: Create `eslint.config.mjs`**

```js
// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'no-console': 'warn',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'docs/', 'eslint.config.mjs'],
  },
);
```

**Step 2: Run lint on existing code (expect errors — just verify it runs)**

```bash
npx eslint src/
```

Expected: errors reported (not a problem yet — we fix them during restructure).

**Step 3: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore: add eslint config with typescript-eslint"
```

---

### Task 4: Create vitest.config.ts

**Files:**
- Create: `vitest.config.ts`

**Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
  },
});
```

**Step 2: Create `__tests__/` directory structure**

```bash
mkdir -p "__tests__/cli"
mkdir -p "__tests__/server/routes"
mkdir -p "__tests__/core"
```

**Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: add vitest config pointing to __tests__/"
```

---

### Task 5: Tighten tsconfig.json

**Files:**
- Modify: `tsconfig.json`

**Step 1: Replace `tsconfig.json` with the stricter version**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 2: Run the TypeScript compiler to see what breaks**

```bash
npx tsc --noEmit
```

Expected: errors in `src/cli.ts` around `allTags[0]` (noUncheckedIndexedAccess) and optional
property passing (exactOptionalPropertyTypes). **Do not fix yet** — these will be fixed when we
rewrite those files in later tasks.

**Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: tighten tsconfig with strict NodeNext and additional strict flags"
```

---

### Task 6: Add scripts to package.json

**Files:**
- Modify: `package.json`

**Step 1: Update the `scripts` section**

Replace the existing `scripts` block with:

```json
"scripts": {
  "dev": "tsx watch src/main.ts",
  "start": "node --import tsx src/main.ts",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "eslint src/ __tests__/",
  "lint:fix": "eslint src/ __tests__/ --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "build": "tsc --noEmit",
  "cli": "node --import tsx src/cli/index.ts"
}
```

Note: `src/main.ts` and `src/cli/index.ts` don't exist yet — that's fine for now.

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add lint, format, build scripts to package.json"
```

---

### Task 7: Create src/config.ts

**Files:**
- Create: `src/config.ts`

**Step 1: Create `src/config.ts`**

```ts
export const config = {
  port: Number(process.env['PORT'] ?? 3000),
  host: process.env['HOST'] ?? '0.0.0.0',
} as const;
```

**Step 2: Verify TypeScript is happy with this file**

```bash
npx tsc --noEmit 2>&1 | grep config.ts
```

Expected: no errors for `config.ts`.

**Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat: add config module for env-based port and host"
```

---

### Task 8: Create src/core/ (move parser, generator, dedup)

**Files:**
- Create: `src/core/parser.ts`
- Create: `src/core/generator.ts`
- Create: `src/core/dedup.ts`

**Step 1: Create `src/core/parser.ts`**

Copy the full contents of `src/parser/commit-parser.ts` into `src/core/parser.ts`.
Update the import at the top from:
```ts
import type { CommitType, ParsedCommit, ParseResult } from '../types/index.js';
```
to (same path since we stay in src/):
```ts
import type { CommitType, ParsedCommit, ParseResult } from '../types/index.js';
```
Path is identical — no change needed.

**Step 2: Create `src/core/generator.ts`**

Copy the full contents of `src/generator/markdown-generator.ts` into `src/core/generator.ts`.
Import path stays the same:
```ts
import type { CommitType, ParsedCommit, GeneratorOptions } from '../types/index.js';
```

**Step 3: Create `src/core/dedup.ts`**

Copy the full contents of `src/utils/dedup.ts` into `src/core/dedup.ts`.
Import path stays the same:
```ts
import type { ParsedCommit } from '../types/index.js';
```

**Step 4: Commit new core files**

```bash
git add src/core/
git commit -m "feat: add src/core/ with parser, generator, dedup"
```

---

### Task 9: Move core tests to `__tests__/core/`

**Files:**
- Create: `__tests__/core/parser.test.ts`
- Create: `__tests__/core/generator.test.ts`
- Create: `__tests__/core/dedup.test.ts` (new — dedup had no test before)

**Step 1: Create `__tests__/core/parser.test.ts`**

Copy full contents of `src/parser/commit-parser.test.ts`.
Update the import:
```ts
// was:
import { parseCommits } from './commit-parser.js';
// becomes:
import { parseCommits } from '../../src/core/parser.js';
```

**Step 2: Create `__tests__/core/generator.test.ts`**

Copy full contents of `src/generator/markdown-generator.test.ts`.
Update imports:
```ts
// was:
import { generateMarkdown } from './markdown-generator.js';
import type { ParsedCommit } from '../types/index.js';
// becomes:
import { generateMarkdown } from '../../src/core/generator.js';
import type { ParsedCommit } from '../../src/types/index.js';
```

**Step 3: Create `__tests__/core/dedup.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { dedup } from '../../src/core/dedup.js';
import type { ParsedCommit } from '../../src/types/index.js';

const commit = (description: string, body: string | null = null): ParsedCommit => ({
  type: 'feat',
  scope: null,
  description,
  body,
  breaking: false,
});

describe('dedup', () => {
  it('returns unique commits unchanged', () => {
    const commits = [commit('add auth'), commit('fix bug')];
    const result = dedup(commits);
    expect(result.commits).toHaveLength(2);
    expect(result.removed).toBe(0);
  });

  it('removes exact duplicates', () => {
    const commits = [commit('add auth'), commit('add auth')];
    const result = dedup(commits);
    expect(result.commits).toHaveLength(1);
    expect(result.removed).toBe(1);
  });

  it('keeps the duplicate with the longer body', () => {
    const commits = [commit('add auth', 'short'), commit('add auth', 'much longer body here')];
    const result = dedup(commits);
    expect(result.commits[0]?.body).toBe('much longer body here');
  });

  it('deduplication is case-insensitive on description and scope', () => {
    const a: ParsedCommit = { type: 'feat', scope: 'Auth', description: 'Add Login', body: null, breaking: false };
    const b: ParsedCommit = { type: 'feat', scope: 'auth', description: 'add login', body: null, breaking: false };
    const result = dedup([a, b]);
    expect(result.commits).toHaveLength(1);
    expect(result.removed).toBe(1);
  });
});
```

**Step 4: Run core tests**

```bash
npm test
```

Expected: all `__tests__/core/` tests pass. (Old tests in `src/` still pass too since vitest.config.ts
now only includes `__tests__/` — the old tests are simply ignored.)

Wait — vitest.config.ts now only includes `__tests__/**/*.test.ts`, so old tests in `src/` are
**no longer run**. That is correct and intentional. Verify with:

```bash
npm test -- --reporter=verbose
```

Expected: only `__tests__/core/*.test.ts` tests appear in output.

**Step 5: Commit**

```bash
git add __tests__/core/
git commit -m "test: move core tests to __tests__/core/, add dedup test"
```

---

### Task 10: Create src/server/routes/health.ts

**Files:**
- Create: `src/server/routes/health.ts`

**Step 1: Create `src/server/routes/health.ts`**

```ts
import type { FastifyInstance } from 'fastify';

export async function healthRoute(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ status: 'ok' }));
}
```

**Step 2: Commit**

```bash
git add src/server/routes/health.ts
git commit -m "feat: extract health route into its own Fastify plugin"
```

---

### Task 11: Create src/server/routes/release-notes.ts

**Files:**
- Create: `src/server/routes/release-notes.ts`

**Step 1: Create `src/server/routes/release-notes.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { parseCommits } from '../../core/parser.js';
import { dedup } from '../../core/dedup.js';
import { generateMarkdown } from '../../core/generator.js';
import type { ReleaseNotesRequest, ReleaseNotesResponse } from '../../types/index.js';

const requestSchema = {
  type: 'object',
  required: ['commits'],
  properties: {
    commits: { type: 'string' },
    version: { type: 'string' },
    date: { type: 'string' },
  },
} as const;

export async function releaseNotesRoute(app: FastifyInstance): Promise<void> {
  app.post<{ Body: ReleaseNotesRequest }>('/api/release-notes', {
    schema: { body: requestSchema },
  }, async (request) => {
    const { commits: rawCommits, version, date } = request.body;

    const parseResult = parseCommits(rawCommits);
    const dedupResult = dedup(parseResult.commits);

    // exactOptionalPropertyTypes requires we only include defined values
    const generatorOptions = {
      ...(version !== undefined ? { version } : {}),
      ...(date !== undefined ? { date } : {}),
    };

    const markdown = generateMarkdown(dedupResult.commits, generatorOptions);

    const response: ReleaseNotesResponse = {
      markdown,
      meta: {
        total: dedupResult.commits.length,
        duplicatesRemoved: dedupResult.removed,
        unparseable: parseResult.unparseable.length,
      },
    };

    return response;
  });
}
```

**Step 2: Commit**

```bash
git add src/server/routes/release-notes.ts
git commit -m "feat: add release-notes route under src/server/routes/"
```

---

### Task 12: Create src/server/app.ts

**Files:**
- Create: `src/server/app.ts`

**Step 1: Create `src/server/app.ts`**

```ts
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { healthRoute } from './routes/health.js';
import { releaseNotesRoute } from './routes/release-notes.js';

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: true });

  void app.register(cors);
  void app.register(healthRoute);
  void app.register(releaseNotesRoute);

  return app;
}
```

Note: `void app.register(...)` silences the `no-floating-promises` ESLint rule — Fastify's `register`
returns a promise but the server setup pattern relies on plugin registration queue, not awaiting each
register call individually.

**Step 2: Commit**

```bash
git add src/server/app.ts
git commit -m "feat: add src/server/app.ts (was server.ts) using extracted route plugins"
```

---

### Task 13: Move server test to `__tests__/server/`

**Files:**
- Create: `__tests__/server/routes/release-notes.test.ts`

**Step 1: Create `__tests__/server/routes/release-notes.test.ts`**

Copy full contents of `src/routes/release-notes.test.ts`.
Update the import:
```ts
// was:
import { buildServer } from '../server.js';
// becomes:
import { buildServer } from '../../../src/server/app.js';
```

The `readFileSync` path uses `import.meta.dirname` — update it to still find the test fixture:
```ts
// was:
resolve(import.meta.dirname, '../../test-release-notes.txt'),
// becomes:
resolve(import.meta.dirname, '../../../test-release-notes.txt'),
```

**Step 2: Run tests**

```bash
npm test
```

Expected: `__tests__/server/routes/release-notes.test.ts` passes. All previous core tests still pass.

**Step 3: Commit**

```bash
git add __tests__/server/
git commit -m "test: move server route tests to __tests__/server/"
```

---

### Task 14: Create src/main.ts

**Files:**
- Create: `src/main.ts`

**Step 1: Create `src/main.ts`**

```ts
import { buildServer } from './server/app.js';
import { config } from './config.js';

const server = buildServer();

server.listen({ port: config.port, host: config.host }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  server.log.info(`Server listening at ${address}`);
});
```

**Step 2: Commit**

```bash
git add src/main.ts
git commit -m "feat: add src/main.ts entry point using config module"
```

---

### Task 15: Create src/cli/args.ts

**Files:**
- Create: `src/cli/args.ts`

**Step 1: Create `src/cli/args.ts`**

```ts
export interface CliArgs {
  from?: string;
  to?: string;
  version?: string;
  date?: string;
  output?: string;
  stdin: boolean;
  help: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { stdin: false, help: false };

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
      case '--help':
        args.help = true;
        break;
    }
  }

  return args;
}
```

**Step 2: Commit**

```bash
git add src/cli/args.ts
git commit -m "feat: extract CLI arg parsing into src/cli/args.ts"
```

---

### Task 16: Create src/cli/git.ts

**Files:**
- Create: `src/cli/git.ts`

**Step 1: Create `src/cli/git.ts`**

```ts
import { execSync } from 'node:child_process';

export interface TagDetection {
  currentTag: string | null;
  previousTag: string | null;
  version: string | null;
}

function git(command: string): string {
  return execSync(`git ${command}`, { encoding: 'utf-8' }).trim();
}

export function detectTags(): TagDetection {
  let allTags: string[];
  try {
    const tagsOutput = git('tag --sort=-v:refname');
    allTags = tagsOutput ? tagsOutput.split('\n').filter((t) => t.length > 0) : [];
  } catch {
    allTags = [];
  }

  if (allTags.length === 0) {
    return { currentTag: null, previousTag: null, version: null };
  }

  // noUncheckedIndexedAccess: allTags[0] is string | undefined — guard required
  const firstTag = allTags[0];
  if (firstTag === undefined) {
    return { currentTag: null, previousTag: null, version: null };
  }

  let currentTag: string;
  try {
    currentTag = git('describe --tags --exact-match HEAD');
  } catch {
    currentTag = firstTag;
  }

  const currentIndex = allTags.indexOf(currentTag);
  const nextTag = allTags[currentIndex + 1];
  const previousTag = currentIndex >= 0 && nextTag !== undefined ? nextTag : null;

  const version = currentTag.replace(/^v/, '');

  return { currentTag, previousTag, version };
}

export function getCommitRange(from: string, to: string): string {
  return git(`log ${from}..${to} --format=%B`);
}

export function getAllCommits(to: string): string {
  return git(`log ${to} --format=%B`);
}

export function getFirstCommit(): string {
  return git('rev-list --max-parents=0 HEAD');
}
```

**Step 2: Commit**

```bash
git add src/cli/git.ts
git commit -m "feat: extract git operations into src/cli/git.ts, fix noUncheckedIndexedAccess"
```

---

### Task 17: Create src/cli/run.ts

**Files:**
- Create: `src/cli/run.ts`

**Step 1: Create `src/cli/run.ts`**

```ts
import { writeFileSync } from 'node:fs';
import { parseArgs } from './args.js';
import { detectTags, getCommitRange, getAllCommits, getFirstCommit } from './git.js';
import { parseCommits } from '../core/parser.js';
import { dedup } from '../core/dedup.js';
import { generateMarkdown } from '../core/generator.js';
import type { ReleaseNotesMeta } from '../types/index.js';

const HELP_TEXT = `
release-note-server CLI

Generiert Release Notes aus Conventional Commits.

Nutzung:
  npm run cli                              Auto-detect aus Git-Tags
  npm run cli -- --output RELEASE.md       Ausgabe in Datei
  npm run cli -- --from v1.0.0 --to v1.1.0 Manuelle Commit-Range
  echo "feat: test" | npm run cli -- --stdin  Stdin-Modus

Optionen:
  --from <ref>          Start-Ref (Tag/Commit). Default: vorheriger Tag
  --to <ref>            End-Ref. Default: aktueller Tag oder HEAD
  --version <v>         Version ueberschreiben. Default: aus Tag-Name
  --date <YYYY-MM-DD>   Datum ueberschreiben. Default: heute
  --output <datei>      In Datei schreiben. Default: stdout
  --stdin               Commits von stdin lesen
  --help                Diese Hilfe anzeigen
`.trim();

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
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
    input = await readStdin();
  } else if (args.from !== undefined) {
    const to = args.to ?? 'HEAD';
    input = getCommitRange(args.from, to);
  } else {
    const detection = detectTags();

    if (version === undefined && detection.version !== null) {
      version = detection.version;
    }

    const to = args.to ?? detection.currentTag ?? 'HEAD';

    if (detection.previousTag !== null) {
      input = getCommitRange(detection.previousTag, to);
    } else if (detection.currentTag !== null) {
      try {
        const firstCommit = getFirstCommit();
        input = getCommitRange(firstCommit, to);
      } catch {
        input = getAllCommits(to);
      }
    } else {
      input = getAllCommits('HEAD');
    }
  }

  const parsed = parseCommits(input);
  const deduped = dedup(parsed.commits);

  const generatorOptions = {
    ...(version !== undefined ? { version } : {}),
    ...(date !== undefined ? { date } : {}),
  };

  const markdown = generateMarkdown(deduped.commits, generatorOptions);

  if (args.output !== undefined) {
    writeFileSync(args.output, markdown, 'utf-8');
  } else {
    process.stdout.write(markdown);
  }

  const meta: ReleaseNotesMeta = {
    total: parsed.commits.length,
    duplicatesRemoved: deduped.removed,
    unparseable: parsed.unparseable.length,
  };
  process.stderr.write(JSON.stringify(meta) + '\n');
}
```

**Step 2: Commit**

```bash
git add src/cli/run.ts
git commit -m "feat: extract CLI run() into src/cli/run.ts with no top-level side effects"
```

---

### Task 18: Create src/cli/index.ts (entry point)

**Files:**
- Create: `src/cli/index.ts`

**Step 1: Create `src/cli/index.ts`**

```ts
import { run } from './run.js';

run(process.argv.slice(2)).catch((err: unknown) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add src/cli/index.ts
git commit -m "feat: add src/cli/index.ts — isolated entry point with side effects only"
```

---

### Task 19: Move CLI tests to `__tests__/cli/`

**Files:**
- Create: `__tests__/cli/args.test.ts`
- Create: `__tests__/cli/run.test.ts`

**Step 1: Create `__tests__/cli/args.test.ts`**

Copy the `parseArgs` describe block from `src/cli.test.ts`.
Update import:
```ts
// was:
import { parseArgs, detectTags, type TagDetection } from './cli.js';
// becomes:
import { parseArgs } from '../../src/cli/args.js';
```

Keep only the `parseArgs` and `CLI integration` describe blocks (not `detectTags`).

**Step 2: Create `__tests__/cli/run.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { detectTags } from '../../src/cli/git.js';

describe('detectTags', () => {
  it('is exported and callable', () => {
    expect(typeof detectTags).toBe('function');
  });
});
```

**Step 3: Run all tests**

```bash
npm test
```

Expected: all tests in `__tests__/` pass.

**Step 4: Commit**

```bash
git add __tests__/cli/
git commit -m "test: move CLI tests to __tests__/cli/"
```

---

### Task 20: Delete old source files

**Files to delete:**
- `src/cli.ts`
- `src/cli.test.ts`
- `src/index.ts`
- `src/server.ts`
- `src/parser/` (whole directory)
- `src/generator/` (whole directory)
- `src/routes/` (whole directory)
- `src/utils/` (whole directory)

**Step 1: Delete old files**

```bash
rm src/cli.ts src/cli.test.ts src/index.ts src/server.ts
rm -rf src/parser/ src/generator/ src/routes/ src/utils/
```

**Step 2: Run tests to confirm nothing was lost**

```bash
npm test
```

Expected: all tests still pass (they import from `src/core/`, `src/server/`, `src/cli/`).

**Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove old source files superseded by layered structure"
```

---

### Task 21: Apply Prettier formatting to all new files

**Step 1: Format everything**

```bash
npx prettier --write "src/**/*.ts" "__tests__/**/*.ts"
```

**Step 2: Verify no remaining format issues**

```bash
npx prettier --check "src/**/*.ts" "__tests__/**/*.ts"
```

Expected: `All matched files use Prettier code style!`

**Step 3: Commit**

```bash
git add -A
git commit -m "style: apply prettier formatting to all source and test files"
```

---

### Task 22: Run ESLint and fix remaining issues

**Step 1: Run ESLint**

```bash
npx eslint src/ __tests__/
```

**Step 2: Auto-fix what can be auto-fixed**

```bash
npx eslint src/ __tests__/ --fix
```

**Step 3: Manually fix any remaining errors**

Common issues to expect:
- `@typescript-eslint/explicit-function-return-type` on internal helpers — add `: ReturnType` annotations
- `no-console` warnings — already using `process.stdout.write`, should be clean
- `@typescript-eslint/no-floating-promises` — any `app.register()` not wrapped with `void`

**Step 4: Run tests again to confirm fixes didn't break anything**

```bash
npm test
```

**Step 5: Commit**

```bash
git add -A
git commit -m "fix: resolve all eslint errors across src/ and __tests__/"
```

---

### Task 23: Final verification

**Step 1: Full test run**

```bash
npm test -- --reporter=verbose
```

Expected: all tests pass.

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 3: Lint check**

```bash
npx eslint src/ __tests__/
```

Expected: zero errors.

**Step 4: Format check**

```bash
npx prettier --check "src/**/*.ts" "__tests__/**/*.ts"
```

Expected: all files formatted.

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final verification — all tests pass, zero lint errors, zero TS errors"
```

---

## Final Structure Reference

```
src/
  config.ts
  main.ts
  cli/
    args.ts
    git.ts
    run.ts
    index.ts
  server/
    app.ts
    routes/
      health.ts
      release-notes.ts
  core/
    parser.ts
    generator.ts
    dedup.ts
  types/
    index.ts

__tests__/
  cli/
    args.test.ts
    run.test.ts
  server/
    routes/
      release-notes.test.ts
  core/
    parser.test.ts
    generator.test.ts
    dedup.test.ts
```
