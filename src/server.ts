import Fastify from 'fastify';
import cors from '@fastify/cors';
import { releaseNotesRoute } from './routes/release-notes.js';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors);

  app.get('/health', async () => ({ status: 'ok' }));

  app.register(releaseNotesRoute);

  return app;
}
