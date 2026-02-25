import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildServer } from '../server.js';

describe('POST /api/release-notes', () => {
  const app = buildServer();

  it('returns markdown and meta for simple input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/release-notes',
      payload: {
        commits: 'feat: add auth\nfix: resolve bug',
        version: '1.0.0',
        date: '2026-02-25',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.markdown).toContain('# Release Notes v1.0.0');
    expect(body.markdown).toContain('## Neue Features');
    expect(body.markdown).toContain('- add auth');
    expect(body.meta.total).toBe(2);
    expect(body.meta.duplicatesRemoved).toBe(0);
    expect(body.meta.unparseable).toBe(0);
  });

  it('processes test-release-notes.txt correctly', async () => {
    const testFile = readFileSync(
      resolve(import.meta.dirname, '../../test-release-notes.txt'),
      'utf-8',
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/release-notes',
      payload: {
        commits: testFile,
        version: '2.0.0',
        date: '2026-02-25',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    // 21 commit headers parsed, 1 duplicate removed -> 20 unique
    expect(body.meta.duplicatesRemoved).toBe(1);
    expect(body.meta.total).toBe(20);
    expect(body.meta.unparseable).toBe(0);

    // Breaking changes section should exist
    expect(body.markdown).toContain('## !! Wichtige Aenderungen (Breaking Changes)');
    expect(body.markdown).toContain('change authentication flow to OAuth2');
    expect(body.markdown).toContain('remove legacy environment variables');

    // The duplicate with body should be kept
    expect(body.markdown).toContain('Implements access and refresh tokens.');
  });

  it('returns 400 for missing commits field', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/release-notes',
      payload: { version: '1.0.0' },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('GET /health', () => {
  const app = buildServer();

  it('returns ok status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
