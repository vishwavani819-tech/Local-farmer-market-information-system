/**
 * Downloads real, freely licensed agricultural photographs.
 * Crop photos come from the lead image of each Wikipedia article (accurate and
 * high resolution); the hero photo comes from Wikimedia Commons.
 *
 *   node scripts/fetch-images.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('frontend/public/img');
const UA = 'FarmerMarketDemo/1.0 (educational college project; contact: student@example.com)';

const crops = [
  ['tomato', 'Tomato'],
  ['onion', 'Onion'],
  ['potato', 'Potato'],
  ['brinjal', 'Eggplant'],
  ['spinach', 'Spinacia oleracea'],
  ['cauliflower', 'Cauliflower'],
  ['green-chilli', 'Green chili pepper'],
  ['carrot', 'Carrot'],
  ['mango', 'Mango'],
  ['banana', 'Banana'],
  ['papaya', 'Papaya'],
  ['pomegranate', 'Pomegranate'],
  ['guava', 'Guava'],
  ['rice', 'Paddy field'],
  ['wheat', 'Wheat'],
  ['ragi', 'Finger millet'],
  ['maize', 'Sweet corn'],
  ['toor-dal', 'Cajanus cajan'],
  ['chickpea', 'Chickpea'],
  ['turmeric', 'Turmeric'],
  ['red-chilli', 'Chili pepper'],
  ['coriander', 'Coriandrum sativum'],
  ['ginger', 'Ginger'],
  ['groundnut', 'Peanut'],
  ['milk', 'Milk'],
];

const heroQueries = ['Agriculture in India', 'Farmer', 'Paddy field'];

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function wikiLeadImage(title) {
  const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1' +
    '&prop=pageimages&piprop=thumbnail&pithumbsize=1200&titles=' + encodeURIComponent(title);
  const json = await getJson(url);
  const pages = Object.values(json?.query?.pages ?? {});
  return pages[0]?.thumbnail?.source ?? null;
}

async function commonsSearch(query) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search' +
    '&gsrnamespace=6&gsrlimit=10&gsrsearch=' + encodeURIComponent(`filetype:bitmap ${query}`) +
    '&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=1400';
  const json = await getJson(url);
  const pages = Object.values(json?.query?.pages ?? {});
  const usable = pages
    .map((p) => p.imageinfo?.[0])
    .filter((info) => info && info.mime === 'image/jpeg' && info.width > info.height * 1.2)
    .sort((a, b) => b.width - a.width);
  return usable[0]?.thumburl ?? usable[0]?.url ?? null;
}

async function save(file, url) {
  const target = path.join(OUT, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  // The API appends utm_* tracking params, which the image CDN rejects with 403.
  const clean = new URL(url);
  clean.search = '';
  url = clean.toString();
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    // Wikimedia rate-limits bursts; back off and request a smaller thumbnail on retry.
    const attemptUrl = attempt > 2 ? url.replace('/1200px-', '/640px-').replace('/1400px-', '/640px-') : url;
    const res = await fetch(attemptUrl, {
      headers: { 'User-Agent': UA, Accept: 'image/*', Referer: 'https://en.wikipedia.org/' },
    });
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 12000) throw new Error(`tiny file (${buffer.length}b)`);
      await fs.writeFile(target, buffer);
      console.log(`ok     ${file}  ${(buffer.length / 1024).toFixed(0)}kb`);
      return true;
    }
    if (attempt === 5) {
      console.log(`FAIL   ${file} HTTP ${res.status}`);
      return false;
    }
    await new Promise((r) => setTimeout(r, 2500 * attempt));
  }
  return false;
}

const onlyMissing = process.argv.includes('--missing');

for (const [slug, title] of crops) {
  const target = path.join(OUT, 'crops', `${slug}.jpg`);
  if (onlyMissing) {
    const stat = await fs.stat(target).catch(() => null);
    if (stat && stat.size > 15000) continue;
  }
  await fs.rm(target, { force: true });
  try {
    const url = await wikiLeadImage(title);
    if (!url) throw new Error('no lead image');
    await save(`crops/${slug}.jpg`, url);
  } catch (error) {
    console.log(`wiki miss ${slug} (${error.message}), trying Commons`);
    const url = await commonsSearch(title);
    if (url) await save(`crops/${slug}.jpg`, url);
  }
  await new Promise((r) => setTimeout(r, 1200));
}

const heroStat = await fs.stat(path.join(OUT, 'hero-farmer.jpg')).catch(() => null);
if (!onlyMissing || !heroStat) {
  await fs.rm(path.join(OUT, 'hero-farmer.jpg'), { force: true });
  for (const query of heroQueries) {
    try {
      const url = await wikiLeadImage(query) ?? await commonsSearch(`${query} field`);
      if (url && await save('hero-farmer.jpg', url)) break;
    } catch (error) {
      console.log(`hero miss ${query}: ${error.message}`);
    }
  }
}
