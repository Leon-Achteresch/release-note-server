# Refactor Design: Layered Structure + TypeScript Strictness

**Date:** 2026-02-26
**Status:** Approved

## Problem

The project has several senior-dev-level issues:

- `cli.ts` runs `run(process.argv.slice(2))` at module level — side effects at import time make
  `run()` untestable without manipulating `process.argv`
- Port `3000` is hardcoded in `index.ts` — no env-based config abstraction
- `tsconfig.json` missing critical strict flags (`noUncheckedIndexedAccess` etc.) — real bugs go
  undetected (e.g. unguarded `allTags[0]`)
- No ESLint or Prettier — no enforcement of code style or TypeScript best practices
- `GET /health` is an inline handler in `server.ts` — not a proper Fastify plugin
- All tests colocated with source — moving to `__tests__/` for cleaner separation

## Decisions

- **Locale:** German section headers stay unchanged
- **Tests:** Moved to a separate `__tests__/` folder mirroring `src/`
- **Tooling:** Add ESLint (typescript-eslint) + Prettier

## Target Folder Structure

```
src/
  config.ts              — reads PORT/HOST from env, exports typed config object
  main.ts                — server entry: calls buildServer() + listen()
  cli/
    args.ts              — CliArgs interface + parseArgs()
    git.ts               — git(), detectTags(), getCommitRange(), getAllCommits()
    run.ts               — run() function, pure logic, no side effects at module level
    index.ts             — entry: run(process.argv.slice(2)).catch(...) only
  server/
    app.ts               — buildServer(): registers CORS + plugins
    routes/
      health.ts          — GET /health Fastify plugin
      release-notes.ts   — POST /api/release-notes Fastify plugin
  core/
    parser.ts            — parseCommits()
    generator.ts         — generateMarkdown()
    dedup.ts             — dedup()
  types/
    index.ts             — CommitType, ParsedCommit, ParseResult, GeneratorOptions,
                           ReleaseNotesRequest, ReleaseNotesMeta, ReleaseNotesResponse

__tests__/               — mirrors src/
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

## TypeScript Config Changes

Added to `tsconfig.json`:
- `"module": "NodeNext"` (was `"ES2022"`) — enforces strict ESM
- `"moduleResolution": "NodeNext"` (was `"bundler"`) — correct for Node.js ESM
- `"noUncheckedIndexedAccess": true` — array/object index access returns `T | undefined`
- `"noImplicitReturns": true` — all code paths must return a value
- `"noFallthroughCasesInSwitch": true` — switch case safety
- `"exactOptionalPropertyTypes": true` — stricter optional property handling
- `"noPropertyAccessFromIndexSignature": true` — forces bracket notation on index signatures

## ESLint + Prettier

**Prettier** (`.prettierrc`): single quotes, 2-space indent, trailing commas, 100 char line width.

**ESLint** (`.eslintrc.cjs`) rules:
- `@typescript-eslint/no-explicit-any` — error
- `@typescript-eslint/explicit-function-return-type` — error
- `@typescript-eslint/no-unused-vars` — error
- `@typescript-eslint/consistent-type-imports` — enforces `import type`
- `@typescript-eslint/no-floating-promises` — error
- `no-console` — warn

**New `package.json` scripts:**
- `lint` / `lint:fix`
- `format` / `format:check`
- `build` (tsc --noEmit)

## Key Code Changes

### `src/config.ts` (new)
```ts
export const config = {
  port: Number(process.env['PORT'] ?? 3000),
  host: process.env['HOST'] ?? '0.0.0.0',
} as const;
```

### CLI split (src/cli/)
- `args.ts`: pure `parseArgs()` + `CliArgs` — no Node imports
- `git.ts`: all `execSync`-based git functions
- `run.ts`: `run()` function with imports from `args`, `git`, `core/*` — no top-level side effects
- `index.ts`: 3-line entry point — all side effects isolated here

### `src/server/app.ts`
`buildServer()` uses `app.register()` for both health and release-notes routes — no inline handlers.

### `vitest.config.ts` (new)
```ts
export default defineConfig({
  test: { include: ['__tests__/**/*.test.ts'] },
});
```

## Zero Logic Changes

`parseCommits`, `generateMarkdown`, `dedup` logic is **moved, not rewritten**.
All existing tests pass after path updates.
