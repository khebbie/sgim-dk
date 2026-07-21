/**
 * Import events from JSON file into Strapi
 * Usage: node scripts/import-events.mjs <input-file> <strapi-url> <admin-token>
 */
import { readFileSync } from 'node:fs';

function mapEventType(type) {
  return type === 'multi-day' ? 'multi-day' : 'single-day';
}

function prepareEvent(event) {
  const out = {
    title: event.title,
    slug: event.slug,
    description: event.description || '',
    eventType: mapEventType(event.eventType),
    startDate: event.startDate,
  };
  if (event.endDate) out.endDate = event.endDate;
  if (event.startTime) out.startTime = event.startTime;
  if (event.speaker) out.organizer = event.speaker;
  if (event.location) out.location = event.location;
  return out;
}

async function run(inputFile, strapiUrl, adminToken) {
  const events = JSON.parse(readFileSync(inputFile, 'utf8'));
  console.log(`Importing ${events.length} events...`);
  const url = `${strapiUrl}/api/events`;
  let ok = 0;
  let fail = 0;
  for (const event of events) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ data: prepareEvent(event) }),
      });
      if (res.ok) ok++;
      else fail++;
    } catch {
      fail++;
    }
    if ((ok + fail) % 50 === 0) process.stdout.write(` ${ok + fail}`);
  }
  console.log(`\nDone: ${ok} ok, ${fail} failed`);
}

const [, , inputFile, strapiUrl, adminToken] = process.argv;
if (!inputFile || !strapiUrl || !adminToken) {
  console.error('Usage: node import-events.mjs <file> <url> <token>');
  process.exit(1);
}
run(inputFile, strapiUrl, adminToken).catch(console.error);
