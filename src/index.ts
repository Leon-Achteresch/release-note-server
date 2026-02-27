import { buildServer } from './server.js';
import { config } from './config.js';

const server = buildServer();

server.listen({ port: config.port, host: config.host }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  server.log.info(`Server listening at ${address}`);
  if (!config.openRouterApiKey) {
    server.log.warn(
      'OPENROUTER_API_KEY is not set — AI endpoints (/api/release-notes/ai) will return 401.',
    );
  }
});
