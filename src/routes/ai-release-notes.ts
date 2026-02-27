import type { FastifyInstance } from 'fastify';
import { generateAiReleaseNotes } from '../ai/ai-generator.js';
import { OpenRouterError } from '../ai/openrouter.js';
import type { AiReleaseNotesRequest, AiReleaseNotesResponse } from '../types/index.js';

const requestSchema = {
  type: 'object',
  required: ['commits'],
  properties: {
    commits: { type: 'string' },
    version: { type: 'string' },
    date: { type: 'string' },
    model: { type: 'string' },
    language: { type: 'string' },
    extraInstructions: { type: 'string' },
  },
} as const;

export async function aiReleaseNotesRoute(app: FastifyInstance) {
  app.post<{ Body: AiReleaseNotesRequest; Reply: AiReleaseNotesResponse }>(
    '/api/release-notes/ai',
    { schema: { body: requestSchema } },
    async (request, reply) => {
      try {
        const result = await generateAiReleaseNotes(request.body);
        return result;
      } catch (err) {
        if (err instanceof OpenRouterError) {
          const statusCode = err.statusCode ?? 502;
          reply.status(statusCode === 401 ? 401 : statusCode >= 500 ? 502 : statusCode);
          return reply.send({ error: err.message });
        }
        throw err; // Let Fastify handle unexpected errors
      }
    },
  );
}
