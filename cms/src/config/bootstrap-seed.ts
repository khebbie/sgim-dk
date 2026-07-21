/**
 * Bootstrap seeding, two independent parts:
 *
 * 1. Dev sample content — gated behind BOOTSTRAP_SEED=true, idempotent (skips a
 *    type that already has entries). Lets you see the site with realistic Danish
 *    content without clicking through the admin.
 * 2. Bulk import of scraped content — gated behind IMPORT_EVENTS_FILE /
 *    IMPORT_CLUBS_FILE, idempotent by slug, and independent of the sample seed.
 *    This is the intended production import path (real calendar, no samples).
 *
 * draftAndPublish is off, so entries are live on create.
 */
import type { Core } from '@strapi/strapi';
import { readFileSync } from 'node:fs';

export async function bootstrapSeed(strapi: Core.Strapi): Promise<void> {
  // Ensure the `aktuelt` single-type exists with a safe default so the
  // homepage can render predictably even when full sample seeding is
  // disabled. Only overwrite existing Aktuelt content when full sample
  // bootstrap seeding is explicitly enabled.
  await seedSingle(strapi, 'api::aktuelt.aktuelt', aktuelt, {
    overwrite: process.env.BOOTSTRAP_SEED === 'true',
  });

  // Dev sample content — only when explicitly enabled.
  if (process.env.BOOTSTRAP_SEED === 'true') {
    await seedSingle(strapi, 'api::site-setting.site-setting', siteSettings);
    await seedCollection(strapi, 'api::navigation.navigation', navigation);
    await seedCollection(strapi, 'api::club.club', clubs);
    await seedCollection(strapi, 'api::event.event', events);
    await seedStaticPages(strapi, staticPages);
    await seedMember(strapi);
    await seedDuties(strapi);
    strapi.log.info(
      JSON.stringify({ operation: 'bootstrap-seed', message: 'sample content ensured' })
    );
  }

  // Bulk import of scraped content. Production-safe: runs whenever the matching
  // file env var is set, independently of the dev sample seed, and is idempotent
  // (existing slugs are skipped). This is the intended production import path.
  await importEventsFromFile(strapi);
  await importClubsFromFile(strapi);
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

export async function seedSingle(
  strapi: Core.Strapi,
  uid: string,
  data: object,
  options?: { overwrite?: boolean }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs = strapi.documents(uid as any);
  const existing = await docs.findFirst();
  if (!existing) {
    await docs.create({ data: data as never });
    return;
  }

  if (options?.overwrite) {
    await docs.update({ documentId: existing.documentId, data: data as never });
  }
}

async function seedCollection(strapi: Core.Strapi, uid: string, rows: object[]): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs = strapi.documents(uid as any);
  if ((await docs.count({})) > 0) return;
  for (const data of rows) await docs.create({ data: data as never });
}

/**
 * Upsert static pages by slug. Unlike seedCollection this overwrites existing
 * pages, so the seed stays the source of truth for page content (e.g. "Om os"
 * copied from the live site) even after the page has been created once.
 */
export async function seedStaticPages(
  strapi: Core.Strapi,
  rows: { slug: string }[]
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs = strapi.documents('api::static-page.static-page' as any);
  for (const data of rows) {
    const existing = await docs.findMany({
      filters: { slug: data.slug },
      fields: ['documentId'],
      limit: 1,
    });
    if (existing.length > 0) {
      await docs.update({ documentId: existing[0].documentId, data: data as never });
    } else {
      await docs.create({ data: data as never });
    }
  }
}

const siteSettings = {
  siteName: 'Stjær/Galten Indre Mission',
  siteDescription:
    '<p>Velkommen til Stjær/Galten Indre Mission. Vi ønsker at udbrede budskabet om Jesus Kristus til alle aldersgrupper i vores lokalområde.</p>',
  email: 'bestyrelsen@sgim.dk',
  address: 'Missionshuset Bethesda, Østerbro 6, Stjær, 8464 Galten',
  facebookUrl: 'https://www.facebook.com/BethesdaSGIM/',
  instagramUrl: 'https://www.instagram.com/stjaergaltenim/',
  footerText: '<p>Stjær/Galten Indre Mission — et fællesskab for hele familien.</p>',
  copyrightText: '© Stjær/Galten Indre Mission',
};

const aktuelt = {
  enabled: true,
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

// Real "Om os" content copied from the live site. Stored as clean Markdown:
// '##' section headings (the rich-text sanitiser allows h2–h4, not h1) and
// '**bold**' with no trailing space, so markdownToHtml renders it correctly.
// Two trailing spaces mark hard line breaks inside the contact block.
const staticPages = [
  {
    title: 'Om os',
    slug: 'om-os',
    content: [
      '## Kontakt',
      '',
      '**Formand:** Kenneth Sønderby  ',
      '**Email:** bestyrelsen@sgim.dk',
      '',
      '**Kasserer:** Grete Juel Christensen  ',
      'Reg. nr. 7418, kontonr. 000 116 9371  ',
      'MobilePay: 67162',
      '',
      '## Intro til Stjær/Galten Indre Mission',
      '',
      'Stjær/Galten Indre Mission – i daglig tale ofte kaldet SGIM – samles primært i og omkring missionshuset Bethesda, Østerbro 6, Stjær. Der er tilknyttet omkring 150 voksne og børn - heraf kommer de fleste fra den tidligere Galten kommune – og en stor del af disse udgøres af børnefamilier.',
      '',
      'Møderne er delt op i forskellige kategorier, og starter kl. 19.00 med mindre andet er angivet i programmet.',
      '',
      'Til fredagsmøder kommer der typisk mellem 40 og 60 – inklusiv børn. Møderne ledes af en mødeleder, som leder os gennem aftenen med velkomst/indledning, sang, tale og hvad der ellers måtte byde sig. Vi synger en del sammen – både fra den traditionelle sangskat og også af den nyere og mere rytmiske slags. Under talen, som typisk varer 30-45 minutter, er der aktiviteter for børnene lige ved siden af i ”det gule hus”, og der er også sovemuligheder for babyer ”oppe ovenpå”.',
      '',
      'Ved tirsdagsmøder arrangeres der ikke aktiviteter for børn, og her kommer der typisk nogen færre og kun få børn. Ofte vil der efter talen være mulighed for at stille spørgsmål eller komme med kommentarer til talen, eller der vil være drøftelse i mindre grupper i tilknytning til aftenens emne. Aftenen rundes typisk af omkring kl. 21.15, hvorefter der er mulighed for hyggeligt samvær omkring kaffebordet, så længe den enkelte har lyst og tid.',
      '',
      'Fra tid til anden kalder vi fredagsmøderne for fyraftensmøder. Disse aftener mødes vi kl. 18.00, hvor vi begynder med at spise sammen. Maden laves på skift af en af bibelgrupperne, og man skal således blot medbringe tallerken, kop og bestik til sig selv. Selve mødet starter kl. 19.00, og slutter omkring kl. 20.30. Disse aftener kan vi ofte være over 80 deltagere – voksne og børn.',
      '',
      'Desuden har vi et antal bibelgrupper, som mødes 1-2 gange om måneden på skift rundt i private hjem. Her har man mulighed for i en mindre gruppe på typisk 8-12 personer at snakke sammen om en på forhånd aftalt tekst, ligesom der her er mulighed for at have mere fortrolige samtaler og bøn med hinanden.',
      '',
      'Alle møder er offentlige, så har du lyst til at dukke op selv og se hvad Stjær/Galten Indre Mission er for en størrelse – så velkommen!',
      '',
      '## Indre Mission på landsplan',
      '',
      'Indre Mission er en landsdækkende folkekirkelig forening, som blev stiftet i 1861 af præster og lægfolk.',
      '',
      'Foreningens vision er, at budskabet om Kristendommens hovedperson, Jesus Kristus, skal spredes over alt i det danske samfund og til alle aldersgrupper.',
      '',
      'Hver uge mødes ung og gammel, barn og voksen til forskellige arrangementer i de lokale foreninger - f.eks. legestue, søndagsskole, juniorklub, teenklub, ungdomsmøde, familiemøde, fællesmøde, studiegruppe, ældremøde etc. Arrangementerne afholdes typisk i Indre Missions egne huse, kaldet missionshuse.',
      '',
      'Helt centralt for alle arrangementer er fællesskabet om Bibelens ord og fællesskabet med hinanden.',
      '',
      'Ønsker du yderligere information om Indre Mission kan du klikke ind på www.indremission.dk eller kontakte bestyrelsen / formanden.',
    ].join('\n'),
    showInNavigation: true,
    navigationOrder: 1,
  },
];
