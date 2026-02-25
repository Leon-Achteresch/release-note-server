import type { FastifyInstance } from 'fastify';
import { parseCommits } from '../parser/commit-parser.js';
import { dedup } from '../utils/dedup.js';
import { generateMarkdown } from '../generator/markdown-generator.js';
import type { ReleaseNotesRequest, ReleaseNotesResponse } from '../types/index.js';

const requestSchema = {
  type: 'object',
  required: ['commits'],
  properties: {
    commits: { type: 'string' },
    version: { type: 'string' },
    date: { type: 'string' },
  },
} as const;

export async function releaseNotesRoute(app: FastifyInstance) {
  app.post<{ Body: ReleaseNotesRequest }>('/api/release-notes', {
    schema: { body: requestSchema },
  }, async (request) => {
    const { commits: rawCommits, version, date } = request.body;

    const parseResult = parseCommits(rawCommits);
    const dedupResult = dedup(parseResult.commits);
    const markdown = generateMarkdown(dedupResult.commits, { version, date });

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
