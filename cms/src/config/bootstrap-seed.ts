/**
 * Sample-content seed (dev only). Gated behind BOOTSTRAP_SEED=true and
 * idempotent (skips a type that already has entries), so it is safe to leave
 * wired in. Lets you see the site with realistic Danish content without
 * clicking through the admin. draftAndPublish is off, so entries are live.
 */
import type { Core } from '@strapi/strapi';

export async function bootstrapSeed(strapi: Core.Strapi): Promise<void> {
  if (process.env.BOOTSTRAP_SEED !== 'true') return;
  await seedSingle(strapi, 'api::site-setting.site-setting', siteSettings);
  await seedSingle(strapi, 'api::aktuelt.aktuelt', aktuelt);
  await seedCollection(strapi, 'api::navigation.navigation', navigation);
  await seedCollection(strapi, 'api::club.club', clubs);
  await seedCollection(strapi, 'api::event.event', events);
  await seedCollection(strapi, 'api::static-page.static-page', staticPages);
  await seedMember(strapi);
  strapi.log.info(
    JSON.stringify({ operation: 'bootstrap-seed', message: 'sample content ensured' })
  );
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
  title: 'Sommerpause',
  content: '<p>Vi holder sommerpause i juli. Vi ses til august!</p>',
  ctaType: 'none',
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
