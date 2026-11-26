/** Fallback image grabber: tries several Commons search results per crop. */
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('frontend/public/img/crops');
const UA = 'FarmerMarketDemo/1.0 (educational college project; contact: student@example.com)';

const wanted = {
  'spinach.jpg': ['spinach leaves', 'palak spinach vegetable'],
  'banana.jpg': ['bananas bunch market', 'ripe bananas'],
  'ragi.jpg': ['ragi millet grain', 'finger millet seeds'],
  'maize.jpg': ['maize cob corn', 'corn cob yellow'],
  'toor-dal.jpg': ['toor dal pigeon peas', 'pigeon peas dried'],
  'coriander.jpg': ['coriander leaves', 'cilantro bunch'],
};

const BAD = ['map', 'diagram', 'chart', 'logo', 'icon', 'drawing', 'illustration', 'painting',
  'stamp', 'packet', 'label', 'botanical', 'kohler', 'herbarium', 'seed', 'plant', 'flower'];

async function candidates(query) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search' +
    '&gsrnamespace=6&gsrlimit=15&gsrsearch=' + encodeURIComponent(`filetype:bitmap ${query}`) +
    '&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=1000';
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const json = await res.json();
  return Object.values(json?.query?.pages ?? {})
    .map((p) => ({ title: p.title, info: p.imageinfo?.[0] }))
    .filter(({ title, info }) => info && info.mime === 'image/jpeg'
      && !BAD.some((word) => title.toLowerCase().includes(word)))
    .map(({ title, info }) => ({ title, url: info.thumburl?.split('?')[0] || info.url.split('?')[0] }));
}

for (const [file, queries] of Object.entries(wanted)) {
  const target = path.join(OUT, file);
  const existing = await fs.stat(target).catch(() => null);
  if (existing && existing.size > 15000) {
    console.log(`skip  ${file}`);
    continue;
  }
  let saved = false;
  for (const query of queries) {
    if (saved) break;
    for (const candidate of await candidates(query)) {
      try {
        const res = await fetch(candidate.url, {
          headers: { 'User-Agent': UA, Accept: 'image/*' },
        });
        if (!res.ok) continue;
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length < 20000) continue;
        await fs.writeFile(target, buffer);
        console.log(`ok    ${file}  ${(buffer.length / 1024).toFixed(0)}kb  ${candidate.title}`);
        saved = true;
        break;
      } catch {
        /* try the next candidate */
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  if (!saved) console.log(`FAIL  ${file}`);
  await new Promise((r) => setTimeout(r, 500));
}
