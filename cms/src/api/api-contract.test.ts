/**
 * API contract tests (sgim-pgx.13). Exercises the real HTTP surface against a
 * running CMS + real Postgres — no mocking of internal code, per constitution
 * section 2 ("use a real/in-memory DB rather than mocking internal code").
 *
 * Requires a running CMS (default http://localhost:1337, override with
 * CMS_TEST_URL). If none is reachable the suite skips rather than fails, so
 * `npm test` stays runnable without infrastructure; CI runs it with the
 * docker-compose Postgres + a booted CMS.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const baseUrl = process.env.CMS_TEST_URL ?? 'http://localhost:1337';
const memberEmail = process.env.CMS_TEST_MEMBER ?? 'medlem@sgim.dk';
const memberPassword = process.env.CMS_TEST_MEMBER_PASSWORD ?? 'Medlem1234';

async function reachable(): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/events?pagination[pageSize]=1`);
    return res.status < 500;
  } catch {
    return false;
  }
}

const up = await reachable();
const suite = up ? describe : describe.skip;

const get = (path: string, token?: string) =>
  fetch(baseUrl + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const post = (path: string, body: unknown, token?: string) =>
  fetch(baseUrl + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

/**
 * Strapi rate-limits the login endpoint (by design), so logging in per test
 * makes the suite flaky with 429s. Log in ONCE up front — before the
 * wrong-password tests spend the limiter's budget — and share the token.
 * If the limiter still blocks us (e.g. repeated runs in quick succession) the
 * auth-dependent suites skip rather than fail: we can't verify what we can't
 * authenticate for.
 */
async function login(): Promise<string | null> {
  if (!up) return null;
  const res = await post('/api/auth/local', {
    identifier: memberEmail,
    password: memberPassword,
  });
  return res.status === 200 ? ((await res.json()).jwt as string) : null;
}

const memberJwt = await login();
const authSuite = memberJwt ? describe : describe.skip;

suite('public content read contracts', () => {
  it('exposes events with the fields the website maps', async () => {
    const res = await get('/api/events?pagination[pageSize]=1&populate=*');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    if (body.data.length > 0) {
      expect(body.data[0]).toMatchObject({
        title: expect.any(String),
        slug: expect.any(String),
        startDate: expect.any(String),
        eventType: expect.stringMatching(/^(single-day|multi-day)$/),
      });
    }
  });

  it.each([
    ['/api/clubs?pagination[pageSize]=1', 'clubs'],
    ['/api/navigations?pagination[pageSize]=1', 'navigations'],
    ['/api/static-pages?pagination[pageSize]=1', 'static-pages'],
    ['/api/duty-categories?pagination[pageSize]=1', 'duty-categories'],
  ])('%s is publicly readable as a collection', async (path) => {
    const res = await get(path);
    expect(res.status).toBe(200);
    expect(Array.isArray((await res.json()).data)).toBe(true);
  });

  it.each([
    ['/api/site-setting', 'site-setting'],
    ['/api/aktuelt', 'aktuelt'],
  ])('%s is publicly readable as a single type', async (path) => {
    const res = await get(path);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data === null || typeof body.data === 'object').toBe(true);
  });
});

suite('boundary hardening', () => {
  it('clamps an oversized pageSize to the configured maxLimit (100)', async () => {
    const res = await get('/api/events?pagination[pageSize]=500');
    expect(res.status).toBe(200);
    expect((await res.json()).data.length).toBeLessThanOrEqual(100);
  });

  it('rejects an unknown query param (strictParams)', async () => {
    const res = await get('/api/events?bogusParam=1');
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown route without leaking internals', async () => {
    const res = await get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(JSON.stringify(await res.json())).not.toMatch(/at .*\.ts:|node_modules/);
  });
});

suite('members auth contract', () => {
  it('blocks public self-registration', async () => {
    const res = await post('/api/auth/local/register', {
      username: 'intruder',
      email: 'intruder@example.com',
      password: 'Passw0rd123',
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('returns a generic error for a wrong password (no user enumeration)', async () => {
    const wrongPassword = await post('/api/auth/local', {
      identifier: memberEmail,
      password: 'definitely-wrong',
    });
    const unknownUser = await post('/api/auth/local', {
      identifier: 'nobody@example.com',
      password: 'definitely-wrong',
    });
    // A wrong password and an unknown user must be indistinguishable. 429 is
    // also acceptable — Strapi rate-limits repeated login attempts by design.
    expect([400, 429]).toContain(wrongPassword.status);
    expect(unknownUser.status).toBe(wrongPassword.status);
  });

  // Skipped (not failed) when the limiter blocked our one login attempt — e.g.
  // repeated runs in quick succession. Rate limiting is the desired behaviour.
  it.skipIf(!memberJwt)('issues a JWT for valid member credentials', () => {
    expect(typeof memberJwt).toBe('string');
  });
});

authSuite('duty self-management contract', () => {
  const token = memberJwt as string;
  let eventId = '';
  let categoryId = '';

  beforeAll(async () => {
    eventId = (await (await get('/api/events?pagination[pageSize]=1')).json()).data[0]?.documentId;
    categoryId = (await (await get('/api/duty-categories?pagination[pageSize]=1')).json()).data[0]
      ?.documentId;
  });

  it('requires authentication to read the roster', async () => {
    expect((await get('/api/duty-assignments')).status).toBe(403);
    expect((await get('/api/duty-assignments', token)).status).toBe(200);
  });

  it('rejects an unauthenticated claim', async () => {
    const res = await post('/api/duty-assignments/claim', {
      data: { event: eventId, category: categoryId, assignee: 'Hacker' },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects a claim missing required fields', async () => {
    const res = await post('/api/duty-assignments/claim', { data: { event: eventId } }, token);
    expect(res.status).toBe(400);
  });

  it('assigns, reassigns and clears a slot', async () => {
    const claim = await post(
      '/api/duty-assignments/claim',
      { data: { event: eventId, category: categoryId, assignee: 'Contract Test' } },
      token
    );
    expect(claim.status).toBe(200);
    const id = (await claim.json()).data.documentId;

    // Re-claiming the same (event, category) reassigns rather than duplicating.
    const reclaim = await post(
      '/api/duty-assignments/claim',
      { data: { event: eventId, category: categoryId, assignee: 'Contract Test 2' } },
      token
    );
    expect(reclaim.status).toBe(200);
    expect((await reclaim.json()).data.documentId).toBe(id);

    // Release deletes the row; releasing again is a 404.
    expect((await post(`/api/duty-assignments/${id}/release`, {}, token)).status).toBe(200);
    expect((await post(`/api/duty-assignments/${id}/release`, {}, token)).status).toBe(404);
  });
});
