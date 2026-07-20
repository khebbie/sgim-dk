import { describe, expect, it } from 'vitest';
import { loadConfig, type EnvSource } from './config-loader';

const validEnv: EnvSource = {
	CMS_BASE_URL: 'http://localhost:1337',
	SESSION_SECRET: 'a-very-long-development-secret'
};

describe('loadConfig', () => {
	it('builds a Config from valid env vars', () => {
		const config = loadConfig(validEnv);

		expect(config).toEqual({
			cmsBaseUrl: 'http://localhost:1337',
			cmsRequestTimeoutMs: 5000,
			sessionSecret: 'a-very-long-development-secret'
		});
	});

	it('applies the given CMS_REQUEST_TIMEOUT_MS when set', () => {
		const config = loadConfig({ ...validEnv, CMS_REQUEST_TIMEOUT_MS: '2500' });

		expect(config.cmsRequestTimeoutMs).toBe(2500);
	});

	it('fails fast with a clear message when CMS_BASE_URL is missing', () => {
		const withoutCmsUrl = { ...validEnv, CMS_BASE_URL: undefined };

		expect(() => loadConfig(withoutCmsUrl)).toThrow(/CMS_BASE_URL/);
	});

	it('fails fast with a clear message when SESSION_SECRET is missing', () => {
		const withoutSecret = { ...validEnv, SESSION_SECRET: undefined };

		expect(() => loadConfig(withoutSecret)).toThrow(/SESSION_SECRET/);
	});

	it('rejects a non-numeric CMS_REQUEST_TIMEOUT_MS', () => {
		expect(() => loadConfig({ ...validEnv, CMS_REQUEST_TIMEOUT_MS: 'soon' })).toThrow(
			/CMS_REQUEST_TIMEOUT_MS/
		);
	});

	it('rejects a zero or negative CMS_REQUEST_TIMEOUT_MS', () => {
		expect(() => loadConfig({ ...validEnv, CMS_REQUEST_TIMEOUT_MS: '0' })).toThrow(
			/CMS_REQUEST_TIMEOUT_MS/
		);
	});
});
