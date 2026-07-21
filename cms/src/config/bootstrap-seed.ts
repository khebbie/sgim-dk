/**
 * Sample-content seed (dev only). Gated behind BOOTSTRAP_SEED=true and
 * idempotent (skips a type that already has entries), so it is safe to leave
 * wired in. Lets you see the site with realistic Danish content without
 * clicking through the admin. draftAndPublish is off, so entries are live.
 */
import type { Core } from '@strapi/strapi';
import { readFileSync } from 'node:fs';

export async function bootstrapSeed(strapi: Core.Strapi): Promise<void> {
  // Ensure the `aktuelt` single-type exists with a safe default so the
  // homepage can render predictably even when full sample seeding is
  // disabled. `seedSingle` is idempotent so this is safe to run unguarded.
  await seedSingle(strapi, 'api::aktuelt.aktuelt', aktuelt);

  if (process.env.BOOTSTRAP_SEED !== 'true') return;
  await seedSingle(strapi, 'api::site-setting.site-setting', siteSettings);
  await seedCollection(strapi, 'api::navigation.navigation', navigation);
  await seedCollection(strapi, 'api::club.club', clubs);
  await seedCollection(strapi, 'api::event.event', events);
  await seedCollection(strapi, 'api::static-page.static-page', staticPages);
  await seedMember(strapi);
  await seedDuties(strapi);
  await importEventsFromFile(strapi);
  await importClubsFromFile(strapi);
  strapi.log.info(
    JSON.stringify({ operation: 'bootstrap-seed', message: 'sample content ensured' })
  );
}

interface ScrapedEvent {
  title: string;
  slug: string;
  startDate: string;
  eventType?: string;
  description?: string;
  endDate?: string;
  startTime?: string;
  speaker?: string;
  location?: string;
}

interface ScrapedClub {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  targetAudience?: string;
  isActive?: boolean;
  meetingDay?: string;
  meetingTime?: string;
  location?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
}

/** One-off bulk import of scraped events (set IMPORT_EVENTS_FILE=/path/to.json). */
async function importEventsFromFile(strapi: Core.Strapi): Promise<void> {
  const file = process.env.IMPORT_EVENTS_FILE;
  if (!file) return;
  const rows = JSON.parse(readFileSync(file, 'utf8')) as ScrapedEvent[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = strapi.documents('api::event.event' as any);
  const existing = await events.findMany({ fields: ['slug'], pagination: { pageSize: 5000 } });
  const seen = new Set(existing.map((e) => (e as { slug?: string }).slug));

  let created = 0;
  for (const row of rows) {
    if (!row.slug || seen.has(row.slug)) continue;
    await events.create({ data: toEvent(row) as never });
    created += 1;
  }
  strapi.log.info(JSON.stringify({ operation: 'import-events', created, total: rows.length }));
}

/** One-off bulk import of scraped clubs (set IMPORT_CLUBS_FILE=/path/to.json). */
async function importClubsFromFile(strapi: Core.Strapi): Promise<void> {
  const file = process.env.IMPORT_CLUBS_FILE;
  if (!file) return;
  const rows = JSON.parse(readFileSync(file, 'utf8')) as ScrapedClub[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clubs = strapi.documents('api::club.club' as any);
  const existing = await clubs.findMany({ fields: ['slug'], pagination: { pageSize: 5000 } });
  const seen = new Set(existing.map((c) => (c as { slug?: string }).slug));

  let created = 0;
  for (const row of rows) {
    if (!row.slug || seen.has(row.slug)) continue;
    await clubs.create({ data: toClub(row) as never });
    created += 1;
  }
  strapi.log.info(JSON.stringify({ operation: 'import-clubs', created, total: rows.length }));
}

function toClub(row: ScrapedClub): Record<string, unknown> {
  const data: Record<string, unknown> = {
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    isActive: row.isActive !== false,
  };
  if (row.shortDescription) data.shortDescription = row.shortDescription;
  if (row.targetAudience) data.targetAudience = row.targetAudience;
  if (row.meetingDay) data.meetingDay = row.meetingDay;
  if (row.meetingTime) data.meetingTime = row.meetingTime;
  if (row.location) data.location = row.location;
  if (row.contactPerson) data.contactPerson = row.contactPerson;
  if (row.contactEmail) data.contactEmail = row.contactEmail;
  if (row.contactPhone) data.contactPhone = row.contactPhone;
  if (row.websiteUrl) data.websiteUrl = row.websiteUrl;
  return data;
}

function toEvent(row: ScrapedEvent): Record<string, unknown> {
  const data: Record<string, unknown> = {
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    eventType: row.eventType === 'multi-day' ? 'multi-day' : 'single-day',
    startDate: row.startDate,
  };
  if (row.endDate) data.endDate = row.endDate;
  const time = normalizeTime(row.startTime);
  if (time) data.startTime = time;
  if (row.speaker) data.organizer = row.speaker;
  if (row.location) data.location = row.location;
  return data;
}

/** Strapi time fields require HH:mm:ss.SSS; the scrape yields HH:MM. */
function normalizeTime(value?: string): string | undefined {
  if (!value) return undefined;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (!match) return undefined;
  return `${match[1].padStart(2, '0')}:${match[2]}:${match[3] ?? '00'}.000`;
}

const DUTY_CATEGORIES = [
  'Mødeledere',
  'Kaffetjanser',
  'Lydmænd',
  'Bønneteam',
  'Børnepassere',
  'Junioraktivister',
];

/** Seeds duty categories and one open slot per (event, category). */
async function seedDuties(strapi: Core.Strapi): Promise<void> {
  const catUid = 'api::duty-category.duty-category';
  const asgUid = 'api::duty-assignment.duty-assignment';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cats = strapi.documents(catUid as any);
  if ((await cats.count({})) === 0) {
    for (let i = 0; i < DUTY_CATEGORIES.length; i++) {
      await cats.create({ data: { name: DUTY_CATEGORIES[i], order: i } as never });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignments = strapi.documents(asgUid as any);
  if ((await assignments.count({})) > 0) return;

  const events = await strapi
    .documents('api::event.event' as any)
    .findMany({ fields: ['documentId'] });
  const categories = await cats.findMany({ fields: ['documentId'] });
  for (const event of events) {
    for (const category of categories) {
      await assignments.create({
        data: { event: event.documentId, category: category.documentId, member: null } as never,
      });
    }
  }
}

/** Seeds a test member (Users & Permissions) so the members-area login works. */
async function seedMember(strapi: Core.Strapi): Promise<void> {
  const email = 'medlem@sgim.dk';
  const existing = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { email } });
  if (existing) return;
  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } });
  // The user service hashes the password.
  await strapi.plugin('users-permissions').service('user').add({
    username: 'medlem',
    email,
    password: 'Medlem1234',
    provider: 'local', // required for /api/auth/local login
    confirmed: true,
    blocked: false,
    role: role?.id,
  });
  strapi.log.info(JSON.stringify({ operation: 'seed-member', email }));
}

async function seedSingle(strapi: Core.Strapi, uid: string, data: object): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs = strapi.documents(uid as any);
  const existing = await docs.findFirst();
  if (!existing) await docs.create({ data: data as never });
}

async function seedCollection(strapi: Core.Strapi, uid: string, rows: object[]): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs = strapi.documents(uid as any);
  if ((await docs.count({})) > 0) return;
  for (const data of rows) await docs.create({ data: data as never });
}

const siteSettings = {
  siteName: 'Stjær/Galten Indre Mission',
  siteDescription:
    '<p>Velkommen til Stjær/Galten Indre Mission. Vi ønsker at udbrede budskabet om Jesus Kristus til alle aldersgrupper i vores lokalområde.</p>',
  email: 'kontakt@sgim.dk',
  phone: '12 34 56 78',
  address: 'Missionshuset, Bakkevej 1, 8464 Galten',
  facebookUrl: 'https://facebook.com/sgim',
  instagramUrl: 'https://instagram.com/sgim',
  footerText: '<p>Stjær/Galten Indre Mission — et fællesskab for hele familien.</p>',
  copyrightText: '© Stjær/Galten Indre Mission',
};

const aktuelt = {
  enabled: false,
  title: 'Velkommen i Stjær/Galten Indre Mission',
  content:
    '<p>Indre Mission er en landsdækkende folkekirkelig forening, som blev stiftet i 1861 af præster og lægfolk.</p>\n<p>Foreningens vision er, at budskabet om kristendommens hovedperson, Jesus Kristus, skal spredes over alt i det danske samfund og til alle aldersgrupper.</p>\n<p>Stjær / Galten Indre Mission er en underafdeling af Indre Mission på landsplan.</p>\n<p>Du kan læse mere under punktet <a href="/om-os">Om os</a></p>',
  ctaType: 'internal',
  ctaText: 'Om os',
  ctaUrl: '/om-os',
};

const navigation = [
  { title: 'Hjem', slug: 'hjem', isPrimary: true, location: 'header' },
  { title: 'Kalender', slug: 'kalender', isPrimary: true, location: 'header' },
  { title: 'Klubber', slug: 'klubber', isPrimary: true, location: 'header' },
  { title: 'Om os', slug: 'om-os', isPrimary: true, location: 'header' },
];

const clubs = [
  {
    name: 'Juniorklub',
    slug: 'juniorklub',
    description: '<p>For børn fra 3.-6. klasse. Leg, hygge og bibelhistorier.</p>',
    targetAudience: '9-13 år',
    meetingDay: 'tuesday',
    meetingTime: '19:00',
    contactPerson: 'Anne Jensen',
    contactEmail: 'junior@sgim.dk',
    isActive: true,
  },
  {
    name: 'Teenklub',
    slug: 'teenklub',
    description: '<p>For unge fra 7.-9. klasse.</p>',
    targetAudience: '13-16 år',
    meetingDay: 'friday',
    meetingTime: '19:30',
    contactPerson: 'Peter Nielsen',
    contactEmail: 'teen@sgim.dk',
    isActive: true,
  },
  {
    name: 'IMU',
    slug: 'imu',
    description: '<p>Indre Missions Unge — for unge fra 16 år og opefter.</p>',
    targetAudience: '16+ år',
    meetingDay: 'sunday',
    meetingTime: '19:30',
    contactPerson: 'Kenneth Sønderby',
    contactEmail: 'imu@sgim.dk',
    isActive: true,
  },
];

const events = [
  {
    title: 'Asylbandet — sang og vidnesbyrd',
    slug: 'asylbandet',
    description: '<p>En aften med Asylbandet, som synger og fortæller.</p>',
    eventType: 'single-day',
    startDate: '2026-08-14',
    startTime: '19:30:00.000',
    location: 'Missionshuset, Galten',
    organizer: 'Stjær/Galten Indre Mission',
  },
  {
    title: 'Forventninger og hvad de gør ved os',
    slug: 'forventninger',
    description: '<p>Foredrag om forventninger og hvordan de påvirker os.</p>',
    eventType: 'single-day',
    startDate: '2026-08-21',
    startTime: '19:30:00.000',
    location: 'Missionshuset, Galten',
    organizer: 'Kristian Lindholm, Regionsleder, Indre Mission',
  },
  {
    title: 'Bibeluge — uge 44',
    slug: 'bibeluge-uge-44',
    description: '<p>En uge med bibelundervisning og fællesskab.</p>',
    eventType: 'multi-day',
    startDate: '2026-10-26',
    endDate: '2026-10-30',
    startTime: '19:30:00.000',
    location: 'Missionshuset, Galten',
  },
];

const staticPages = [
  {
    title: 'Om os',
    slug: 'om-os',
    content:
      '<p>Indre Mission er en folkekirkelig bevægelse grundlagt i 1861. Stjær/Galten Indre Mission er den lokale afdeling.</p>',
    showInNavigation: true,
    navigationOrder: 1,
  },
];
