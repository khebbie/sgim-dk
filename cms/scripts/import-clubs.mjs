/**
 * Import clubs from JSON file into Strapi
 * Usage: node scripts/import-clubs.mjs <input-file> <strapi-url> <admin-token>
 */
import { readFileSync } from 'node:fs';
import he from 'he';

async function run(inputFile, strapiUrl, adminToken) {
  const clubs = JSON.parse(readFileSync(inputFile, 'utf8'));
  console.log(`Importing ${clubs.length} clubs...`);

  const url = `${strapiUrl}/api/clubs`;
  let ok = 0;
  let fail = 0;

  for (const club of clubs) {
    try {
      // Decode any HTML entities in the data
      const cleanClub = {
        name: he.decode(club.name),
        slug: club.slug,
        description: he.decode(club.description),
        shortDescription: he.decode(club.shortDescription || ''),
        targetAudience: club.targetAudience,
        isActive: club.isActive !== false,
      };

      if (club.meetingDay) cleanClub.meetingDay = club.meetingDay;
      if (club.meetingTime) cleanClub.meetingTime = club.meetingTime;
      if (club.location) cleanClub.location = he.decode(club.location);
      if (club.contactPerson) cleanClub.contactPerson = he.decode(club.contactPerson);
      if (club.contactEmail) cleanClub.contactEmail = he.decode(club.contactEmail);
      if (club.contactPhone) cleanClub.contactPhone = he.decode(club.contactPhone);
      if (club.websiteUrl) cleanClub.websiteUrl = club.websiteUrl;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ data: cleanClub }),
      });

      if (res.ok) {
        ok++;
      } else {
        fail++;
        console.error(`Failed to import club "${club.name}": ${res.status}`);
      }
    } catch (error) {
      fail++;
      console.error(`Error importing club "${club.name}": ${error.message}`);
    }

    if ((ok + fail) % 10 === 0) process.stdout.write(` ${ok + fail}`);
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`);
}

const [, , inputFile, strapiUrl, adminToken] = process.argv;
if (!inputFile || !strapiUrl || !adminToken) {
  console.error('Usage: node import-clubs.mjs <file> <url> <token>');
  process.exit(1);
}
run(inputFile, strapiUrl, adminToken).catch(console.error);
