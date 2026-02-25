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
