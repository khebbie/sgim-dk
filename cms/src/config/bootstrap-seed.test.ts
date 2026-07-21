/**
 * Unit tests for bootstrap-seed helper functions.
 *
 * Covers the Aktuelt singleton fallback seed behavior used by the Strapi
 * bootstrap pipeline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Core } from '@strapi/strapi';
import { seedDuties, seedSingle, seedStaticPages } from './bootstrap-seed';

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

  it('creates duty assignments for newly added events when some already exist', async () => {
    const events = [{ documentId: 'event-1' }, { documentId: 'event-2' }];
    const categories = [{ documentId: 'cat-1' }];
    const existingAssignments = [
      { event: { documentId: 'event-1' }, category: { documentId: 'cat-1' } },
    ];

    const eventDocs = { findMany: vi.fn().mockResolvedValue(events), create: vi.fn() };
    const categoryDocs = {
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn().mockResolvedValue(categories),
    };
    const assignmentDocs = {
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn().mockResolvedValue(existingAssignments),
      create: vi.fn().mockResolvedValue(undefined),
    };

    mockStrapi.documents = vi.fn((uid: string) => {
      switch (uid) {
        case 'api::duty-category.duty-category':
          return categoryDocs;
        case 'api::duty-assignment.duty-assignment':
          return assignmentDocs;
        default:
          return eventDocs;
      }
    }) as Core.Strapi['documents'];

    await seedDuties(mockStrapi);

    expect(assignmentDocs.create).toHaveBeenCalledWith({
      data: { event: 'event-2', category: 'cat-1', member: null },
    });
  });
});
