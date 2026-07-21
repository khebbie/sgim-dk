/**
 * Unit tests for bootstrap-seed helper functions.
 *
 * Covers the Aktuelt singleton fallback seed behavior used by the Strapi
 * bootstrap pipeline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Core } from '@strapi/strapi';
import { seedSingle, seedStaticPages } from './bootstrap-seed';

type MockDocuments = {
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

describe('bootstrap-seed', () => {
  let mockDocuments: MockDocuments;
  let mockStrapi: Core.Strapi;

  beforeEach(() => {
    mockDocuments = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    mockStrapi = {
      documents: vi.fn(() => mockDocuments),
    } as unknown as Core.Strapi;
  });

  it('creates a singleton when none exists', async () => {
    mockDocuments.findFirst.mockResolvedValue(undefined);

    await seedSingle(mockStrapi, 'api::aktuelt.aktuelt', { enabled: true });

    expect(mockDocuments.create).toHaveBeenCalledWith({ data: { enabled: true } });
    expect(mockDocuments.update).not.toHaveBeenCalled();
  });

  it('updates an existing singleton when overwrite is enabled', async () => {
    mockDocuments.findFirst.mockResolvedValue({ documentId: 123 });

    await seedSingle(mockStrapi, 'api::aktuelt.aktuelt', { enabled: true }, { overwrite: true });

    expect(mockDocuments.update).toHaveBeenCalledWith({ documentId: 123, data: { enabled: true } });
  });

  it('does not overwrite an existing singleton when overwrite is disabled', async () => {
    mockDocuments.findFirst.mockResolvedValue({ documentId: 123 });

    await seedSingle(mockStrapi, 'api::aktuelt.aktuelt', { enabled: true });

    expect(mockDocuments.create).not.toHaveBeenCalled();
    expect(mockDocuments.update).not.toHaveBeenCalled();
  });

  // seedStaticPages upserts by slug so the seed stays the source of truth for
  // page content (e.g. the "Om os" copy from the live site), even after the
  // page already exists — the bug where stale content lingered after seeding.
  describe('seedStaticPages', () => {
    it('creates a page when the slug does not exist', async () => {
      mockDocuments.findMany.mockResolvedValue([]);

      await seedStaticPages(mockStrapi, [{ slug: 'om-os', content: 'ny' } as { slug: string }]);

      expect(mockDocuments.create).toHaveBeenCalledWith({ data: { slug: 'om-os', content: 'ny' } });
      expect(mockDocuments.update).not.toHaveBeenCalled();
    });

    it('updates (overwrites) an existing page with the same slug', async () => {
      mockDocuments.findMany.mockResolvedValue([{ documentId: 'abc' }]);

      await seedStaticPages(mockStrapi, [{ slug: 'om-os', content: 'ny' } as { slug: string }]);

      expect(mockDocuments.update).toHaveBeenCalledWith({
        documentId: 'abc',
        data: { slug: 'om-os', content: 'ny' },
      });
      expect(mockDocuments.create).not.toHaveBeenCalled();
    });
  });
});
