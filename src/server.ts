import Fastify from 'fastify';
import cors from '@fastify/cors';
import { releaseNotesRoute } from './routes/release-notes.js';
import { aiReleaseNotesRoute } from './routes/ai-release-notes.js';
import { config } from './config.js';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors);

  app.get('/health', async () => ({
    status: 'ok',
    ai: {
      configured: Boolean(config.openRouterApiKey),
      model: config.openRouterModel,
    },
  }));

  app.register(releaseNotesRoute);
  app.register(aiReleaseNotesRoute);

  return app;
}
