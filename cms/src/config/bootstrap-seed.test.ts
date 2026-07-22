/**
 * Unit tests for bootstrap-seed helper functions.
 *
 * Covers the Aktuelt singleton fallback seed behavior used by the Strapi
 * bootstrap pipeline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Core } from '@strapi/strapi';
import {
  ensureDutyCategories,
  seedSingle,
  seedStaticPages,
  toClub,
  toEvent,
  normalizeTime,
} from './bootstrap-seed';

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

  // Duties are derived per event in the UI; only the categories are ensured
  // (idempotently). No per-event assignment rows are seeded.
  describe('ensureDutyCategories', () => {
    it('creates the categories when none exist', async () => {
      const catDocs = { count: vi.fn().mockResolvedValue(0), create: vi.fn() };
      mockStrapi.documents = vi.fn(() => catDocs) as unknown as Core.Strapi['documents'];

      await ensureDutyCategories(mockStrapi);

      expect(catDocs.create).toHaveBeenCalled();
    });

    it('does nothing when categories already exist', async () => {
      const catDocs = { count: vi.fn().mockResolvedValue(6), create: vi.fn() };
      mockStrapi.documents = vi.fn(() => catDocs) as unknown as Core.Strapi['documents'];

      await ensureDutyCategories(mockStrapi);

      expect(catDocs.create).not.toHaveBeenCalled();
    });
  });

  // Pure scrape -> CMS field mappers. These decide what the imported calendar
  // actually looks like, so their edge cases are worth pinning down.
  describe('normalizeTime', () => {
    it('pads HH:MM to the HH:mm:ss.SSS Strapi time fields require', () => {
      expect(normalizeTime('9:30')).toBe('09:30:00.000');
      expect(normalizeTime('19:00')).toBe('19:00:00.000');
    });

    it('keeps explicit seconds', () => {
      expect(normalizeTime('19:30:45')).toBe('19:30:45.000');
    });

    it('returns undefined for missing or unparseable input', () => {
      expect(normalizeTime(undefined)).toBeUndefined();
      expect(normalizeTime('')).toBeUndefined();
      expect(normalizeTime('om aftenen')).toBeUndefined();
    });
  });

  describe('toEvent', () => {
    it('maps a single-day event and omits absent optional fields', () => {
      expect(toEvent({ title: 'Møde', slug: 'moede', startDate: '2026-08-14' })).toEqual({
        title: 'Møde',
        slug: 'moede',
        description: '',
        eventType: 'single-day',
        startDate: '2026-08-14',
      });
    });

    it('maps a multi-day event with its end date and time', () => {
      const event = toEvent({
        title: 'Bibeluge',
        slug: 'bibeluge',
        startDate: '2026-08-03',
        endDate: '2026-08-07',
        eventType: 'multi-day',
        startTime: '19:30',
        speaker: 'Taler',
        location: 'Missionshuset',
        description: 'tekst',
      });
      expect(event).toMatchObject({
        eventType: 'multi-day',
        endDate: '2026-08-07',
        startTime: '19:30:00.000',
        organizer: 'Taler',
        location: 'Missionshuset',
        description: 'tekst',
      });
    });

    it('treats an unknown event type as single-day', () => {
      expect(
        toEvent({ title: 'x', slug: 'x', startDate: '2026-01-01', eventType: 'weird' })
      ).toMatchObject({ eventType: 'single-day' });
    });
  });

  describe('toClub', () => {
    it('defaults isActive to true and omits absent optional fields', () => {
      expect(toClub({ name: 'Juniorklub', slug: 'junior' })).toEqual({
        name: 'Juniorklub',
        slug: 'junior',
        description: '',
        isActive: true,
      });
    });

    it('carries the optional contact/meeting fields through', () => {
      expect(
        toClub({
          name: 'Teenklub',
          slug: 'teen',
          isActive: false,
          meetingDay: 'Fredag',
          meetingTime: '19:00',
          contactPerson: 'Anna',
          websiteUrl: 'https://example.dk',
        })
      ).toMatchObject({
        isActive: false,
        meetingDay: 'Fredag',
        meetingTime: '19:00',
        contactPerson: 'Anna',
        websiteUrl: 'https://example.dk',
      });
    });
  });
});
