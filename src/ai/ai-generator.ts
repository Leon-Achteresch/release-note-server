import { parseCommits } from '../parser/commit-parser.js';
import { dedup } from '../utils/dedup.js';
import { complete } from './openrouter.js';
import type { AiReleaseNotesRequest, AiReleaseNotesResponse, ParsedCommit } from '../types/index.js';

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  de: 'Schreibe die Release Notes auf Deutsch.',
  en: 'Write the release notes in English.',
  fr: 'Écris les notes de version en français.',
  es: 'Escribe las notas de la versión en español.',
};

function buildSystemPrompt(language: string, extraInstructions?: string): string {
  const langInstruction =
    LANGUAGE_INSTRUCTIONS[language] ?? `Write the release notes in the language: ${language}.`;

  const base = `You are an expert technical writer specialising in software release notes.
Your task is to transform a list of Conventional Commits into polished, human-readable release notes in Markdown format.

Rules:
- Output ONLY valid Markdown — no surrounding code fences, no explanations.
- Start with a level-1 heading: "# Release Notes" followed by version and date if provided.
- Group commits by type under level-2 headings (Features, Bug Fixes, Performance, etc.).
- If there are breaking changes, add them first in a prominently marked section.
- Use bullet points for individual entries.
- Make descriptions concise yet informative — rewrite raw commit messages into user-friendly sentences.
- Omit empty sections.
- ${langInstruction}${extraInstructions ? `\n- ${extraInstructions}` : ''}`;

  return base;
}

function buildUserPrompt(
  commits: ParsedCommit[],
  version?: string,
  date?: string,
): string {
  const resolvedDate = date ?? new Date().toISOString().slice(0, 10);
  const header = version
    ? `Version: ${version}\nDate: ${resolvedDate}`
    : `Date: ${resolvedDate}`;

  const commitLines = commits
    .map((c) => {
      const scope = c.scope ? `(${c.scope})` : '';
      const breaking = c.breaking ? '!' : '';
      const body = c.body ? `\n  ${c.body.split('\n').join('\n  ')}` : '';
      return `${c.type}${scope}${breaking}: ${c.description}${body}`;
    })
    .join('\n');

  return `${header}\n\nCommits:\n${commitLines}`;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generates AI-enhanced release notes via OpenRouter.
 *
 * The function:
 * 1. Parses and deduplicates the raw commit string (same pipeline as the
 *    deterministic generator).
 * 2. Builds a structured prompt from the parsed commits.
 * 3. Sends the prompt to the configured OpenRouter model.
 * 4. Returns the Markdown response along with usage metadata.
 */
export async function generateAiReleaseNotes(
  request: AiReleaseNotesRequest,
): Promise<AiReleaseNotesResponse> {
  const { commits: rawCommits, version, date, model, language = 'de', extraInstructions } =
    request;

  // Parse + dedup (reuse existing pipeline)
  const parseResult = parseCommits(rawCommits);
  const dedupResult = dedup(parseResult.commits);

  const systemPrompt = buildSystemPrompt(language, extraInstructions);
  const userPrompt = buildUserPrompt(dedupResult.commits, version, date);

  const result = await complete(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model,
  );

  return {
    markdown: result.content.trim() + '\n',
    meta: {
      total: parseResult.commits.length,
      duplicatesRemoved: dedupResult.removed,
      unparseable: parseResult.unparseable.length,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    },
  };
}
