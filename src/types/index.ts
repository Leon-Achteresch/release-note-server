export type CommitType =
  | 'feat'
  | 'fix'
  | 'docs'
  | 'style'
  | 'refactor'
  | 'perf'
  | 'test'
  | 'build'
  | 'ci'
  | 'chore'
  | 'revert';

export interface ParsedCommit {
  type: CommitType;
  scope: string | null;
  description: string;
  body: string | null;
  breaking: boolean;
}

export interface ParseResult {
  commits: ParsedCommit[];
  unparseable: string[];
}

export interface GeneratorOptions {
  version?: string;
  date?: string;
}

export interface ReleaseNotesRequest {
  commits: string;
  version?: string;
  date?: string;
}

export interface ReleaseNotesMeta {
  total: number;
  duplicatesRemoved: number;
  unparseable: number;
}

export interface ReleaseNotesResponse {
  markdown: string;
  meta: ReleaseNotesMeta;
}

// ---------------------------------------------------------------------------
// AI types
// ---------------------------------------------------------------------------

export interface AiReleaseNotesRequest {
  commits: string;
  version?: string;
  date?: string;
  /** Override the OpenRouter model for this request */
  model?: string;
  /** Language for the generated release notes (default: "de") */
  language?: string;
  /** Additional instructions appended to the system prompt */
  extraInstructions?: string;
}

export interface AiReleaseNotesResponse {
  markdown: string;
  meta: ReleaseNotesMeta & {
    model: string;
    promptTokens?: number;
    completionTokens?: number;
  };
}
