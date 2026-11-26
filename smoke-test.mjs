/**
 * End-to-end smoke test against the running application.
 *   node scripts/smoke-test.mjs
 */
const BASE = process.env.BASE_URL || 'http://localhost:8080';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function call(path, { method = 'GET', body, token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: form ? form : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function login(email, password) {
  const res = await call('/api/auth/login', { method: 'POST', body: { email, password } });
  return res;
}

console.log('\n== Public marketplace ==');
const list = await call('/api/marketplace/crops?size=5&sort=price_asc&availableOnly=true');
check('GET /crops returns 200', list.status === 200, String(list.status));
check('seeded listings are present', list.data?.totalElements > 0, `total=${list.data?.totalElements}`);
check('price sort is ascending', (() => {
  const prices = (list.data?.content ?? []).map((item) => Number(item.pricePerKg));
  return prices.every((value, index) => index === 0 || prices[index - 1] <= value);
})(), JSON.stringify((list.data?.content ?? []).map((i) => i.pricePerKg)));
check('availableOnly hides unavailable crops', (list.data?.content ?? []).every((item) => item.available));
check('guest cannot see farmer mobile', (list.data?.content ?? []).every((item) => item.farmerMobile === null));

const filtered = await call('/api/marketplace/crops?category=FRUITS&size=20');
check('category filter works', filtered.data?.content?.length > 0 && filtered.data.content.every((item) => item.category === 'FRUITS'));
const fruitNames = new Set((filtered.data?.content ?? []).map((item) => item.cropName));
check('all demo fruits appear in the marketplace',
  ['Banana', 'Guava', 'Mango', 'Papaya', 'Pomegranate'].every((name) => fruitNames.has(name)),
  [...fruitNames].join(', '));

const vegetables = await call('/api/marketplace/crops?category=VEGETABLES&size=20');
const vegetableNames = new Set((vegetables.data?.content ?? []).map((item) => item.cropName));
check('all demo vegetables appear in the marketplace',
  ['Brinjal', 'Carrot', 'Cauliflower', 'Green Chilli', 'Onion', 'Potato', 'Spinach', 'Tomato']
    .every((name) => vegetableNames.has(name)),
  [...vegetableNames].join(', '));

const searched = await call('/api/marketplace/crops?q=tomato');
check('text search finds tomato', searched.data?.content?.some((item) => /tomato/i.test(item.cropName)));

const priceCap = await call('/api/marketplace/crops?maxPrice=30&size=20');
check('max price filter works', (priceCap.data?.content ?? []).every((item) => Number(item.pricePerKg) <= 30));

const detailId = list.data.content[0].id;
const detail = await call(`/api/marketplace/crops/${detailId}`);
check('GET /crops/:id returns 200', detail.status === 200);
check('detail includes farmer location', Boolean(detail.data.farmerVillage && detail.data.farmerDistrict));
const missing = await call('/api/marketplace/crops/999999');
check('unknown listing returns 404', missing.status === 404, String(missing.status));

const filters = await call('/api/marketplace/filters');
check('filters expose districts and categories', filters.data?.districts?.length > 0 && filters.data?.categories?.length === 7);

const farmers = await call('/api/marketplace/farmers');
check('farmer directory returns farmers', farmers.data?.length >= 5);
check('farmer cards hide phone for guests', farmers.data.every((farmer) => farmer.mobile === null));

console.log('\n== Authentication & RBAC ==');
const farmerLogin = await login('ramesh.patil@example.com', 'Farmer@123');
check('farmer login works', farmerLogin.status === 200 && farmerLogin.data.token?.length > 20);
check('login response has farmer role', farmerLogin.data?.user?.role === 'FARMER');
check('password hash never returned', !JSON.stringify(farmerLogin.data).toLowerCase().includes('password'));

const customerLogin = await login('priya.sharma@example.com', 'Customer@123');
const adminLogin = await login('admin@farmermarket.in', 'Admin@123');
check('customer login works', customerLogin.status === 200);
check('admin login works', adminLogin.status === 200);

const badLogin = await login('ramesh.patil@example.com', 'wrong-password');
check('wrong password returns 401', badLogin.status === 401, String(badLogin.status));

const noToken = await call('/api/farmer/dashboard');
check('farmer API without token returns 401', noToken.status === 401, String(noToken.status));

const crossRole = await call('/api/farmer/dashboard', { token: customerLogin.data.token });
check('customer cannot open farmer API (403)', crossRole.status === 403, String(crossRole.status));

const adminOnly = await call('/api/admin/dashboard', { token: farmerLogin.data.token });
check('farmer cannot open admin API (403)', adminOnly.status === 403, String(adminOnly.status));

const me = await call('/api/auth/me', { token: customerLogin.data.token });
check('/auth/me returns profile', me.status === 200 && me.data?.user?.role === 'CUSTOMER');

const duplicate = await call('/api/auth/register/customer', {
  method: 'POST',
  body: {
    fullName: 'Duplicate User', mobile: '9876500011', email: 'priya.sharma@example.com',
    password: 'Testpass1', city: 'Bengaluru', state: 'Karnataka',
  },
});
check('duplicate email returns 409', duplicate.status === 409, String(duplicate.status));

const invalid = await call('/api/auth/register/customer', {
  method: 'POST',
  body: { fullName: 'A', mobile: '123', email: 'not-an-email', password: 'short', city: '', state: '' },
});
check('invalid registration returns 400 with field errors', invalid.status === 400 && Boolean(invalid.data?.errors));

console.log('\n== Farmer workflows ==');
const token = farmerLogin.data.token;
const dashboard = await call('/api/farmer/dashboard', { token });
check('farmer dashboard 200', dashboard.status === 200);
check('farmer stats present', typeof dashboard.data?.stats?.totalListings === 'number');
check('farmer sees own listings', dashboard.data?.recentListings?.length > 0);

const created = await call('/api/farmer/listings', {
  method: 'POST',
  token,
  body: {
    cropName: 'Smoke Test Pumpkin',
    category: 'VEGETABLES',
    imageUrl: null,
    pricePerKg: 31.5,
    availableQuantity: 44,
    unit: 'kg',
    locationLabel: 'Nandgaon village',
    district: 'Kolar',
    state: 'Karnataka',
    harvestDate: new Date().toISOString().slice(0, 10),
    description: 'Created by the automated smoke test.',
    available: true,
  },
});
check('farmer can create a listing', created.status === 201, `${created.status} ${JSON.stringify(created.data).slice(0, 120)}`);
const newId = created.data?.id;

const badListing = await call('/api/farmer/listings', {
  method: 'POST',
  token,
  body: { cropName: 'X', category: 'VEGETABLES', pricePerKg: -4, availableQuantity: -1, locationLabel: '', district: '', state: '' },
});
check('invalid listing rejected (400)', badListing.status === 400, String(badListing.status));

const priceUpdate = await call(`/api/farmer/listings/${newId}/price`, { method: 'PATCH', token, body: { pricePerKg: 27 } });
check('price update works', priceUpdate.status === 200 && Number(priceUpdate.data.pricePerKg) === 27);

const stockUpdate = await call(`/api/farmer/listings/${newId}/stock`, {
  method: 'PATCH', token, body: { availableQuantity: 0, available: true },
});
check('zero stock forces unavailable', stockUpdate.status === 200 && stockUpdate.data.available === false);

const otherFarmer = await login('lakshmi.gowda@example.com', 'Farmer@123');
const foreignEdit = await call(`/api/farmer/listings/${newId}/price`, {
  method: 'PATCH', token: otherFarmer.data.token, body: { pricePerKg: 1 },
});
check('farmer cannot edit another farmer listing (403)', foreignEdit.status === 403, String(foreignEdit.status));

const enquiries = await call('/api/farmer/enquiries', { token });
check('farmer enquiry inbox loads', enquiries.status === 200 && Array.isArray(enquiries.data));
const enquiryId = enquiries.data?.[0]?.id;
if (enquiryId) {
  const reply = await call(`/api/farmer/enquiries/${enquiryId}`, {
    method: 'PATCH', token, body: { reply: 'Thank you, the produce is ready for collection.', status: 'RESPONDED' },
  });
  check('farmer can reply to an enquiry', reply.status === 200 && reply.data.status === 'RESPONDED');
}

const profileUpdate = await call('/api/farmer/profile', {
  method: 'PUT',
  token,
  body: {
    fullName: 'Ramesh Patil', mobile: '9845012301', village: 'Nandgaon', district: 'Kolar',
    state: 'Karnataka', farmAddress: 'Sy. No. 42, near Hanuman temple, Nandgaon post',
    about: 'Updated by the smoke test.', availability: 'AVAILABLE', contactWhatsapp: true,
  },
});
check('farmer profile update works', profileUpdate.status === 200);

console.log('\n== Customer workflows ==');
const cToken = customerLogin.data.token;
const cDash = await call('/api/customer/dashboard', { token: cToken });
check('customer dashboard 200', cDash.status === 200);
check('customer stats present', typeof cDash.data?.stats?.savedCrops === 'number');

const favourite = await call(`/api/customer/favourites/${newId}`, { method: 'POST', token: cToken });
check('customer can save a favourite', favourite.status === 201, String(favourite.status));
const favourites = await call('/api/customer/favourites', { token: cToken });
check('favourite appears in saved list', favourites.data?.some((item) => item.id === newId));
const unfavourite = await call(`/api/customer/favourites/${newId}`, { method: 'DELETE', token: cToken });
check('customer can remove a favourite', unfavourite.status === 200);

const enquiry = await call('/api/customer/enquiries', {
  method: 'POST', token: cToken,
  body: { listingId: newId, message: 'Is this pumpkin still available for collection tomorrow?', quantityNeeded: 5 },
});
check('customer can send an enquiry', enquiry.status === 201, `${enquiry.status} ${JSON.stringify(enquiry.data).slice(0, 100)}`);
const enquiriesAfter = await call('/api/customer/enquiries', { token: cToken });
check('enquiry is stored for the customer', enquiriesAfter.data?.some((item) => item.id === enquiry.data?.id));

const contactVisible = await call(`/api/marketplace/crops/${newId}`, { token: cToken });
check('signed-in customer sees farmer phone', Boolean(contactVisible.data?.farmerMobile));

console.log('\n== Admin workflows ==');
const aToken = adminLogin.data.token;
const adminDash = await call('/api/admin/dashboard', { token: aToken });
check('admin dashboard 200', adminDash.status === 200);
check('admin stats include farmers and customers',
  adminDash.data?.stats?.totalFarmers >= 5 && adminDash.data?.stats?.totalCustomers >= 2);

const adminFarmers = await call('/api/admin/farmers?q=ramesh', { token: aToken });
check('admin can search farmers', adminFarmers.data?.content?.some((farmer) => /Ramesh/i.test(farmer.name)));

const adminListings = await call('/api/admin/listings?status=ACTIVE', { token: aToken });
check('admin listing moderation list loads', adminListings.data?.content?.length > 0);

const removed = await call(`/api/admin/listings/${newId}/remove?reason=Automated%20test`, { method: 'PATCH', token: aToken });
check('admin can remove a listing', removed.status === 200);
const hidden = await call(`/api/marketplace/crops/${newId}`);
check('removed listing is hidden from the public', hidden.status === 404, String(hidden.status));
const restored = await call(`/api/admin/listings/${newId}/restore`, { method: 'PATCH', token: aToken });
check('admin can restore a listing', restored.status === 200);

const report = await call('/api/admin/report', { token: aToken });
check('admin report returns summary', report.data?.summary?.farmers >= 5);

const selfDeactivate = await call(`/api/admin/users/${adminLogin.data.user.id}/active`, {
  method: 'PATCH', token: aToken, body: { active: false },
});
check('admin cannot deactivate an admin account', selfDeactivate.status === 403, String(selfDeactivate.status));

console.log('\n== Uploads & static site ==');
const form = new FormData();
form.append('file', new Blob([Buffer.from('<?php echo "not an image"; ?>')], { type: 'image/png' }), 'evil.png');
const upload = await call('/api/uploads/crop-image', { method: 'POST', token, form });
check('fake image upload is rejected', upload.status === 400, String(upload.status));

const root = await fetch(`${BASE}/`);
check('built React app is served', root.status === 200 && (await root.text()).includes('<div id="root">'));
const deepLink = await fetch(`${BASE}/marketplace/1`);
check('deep link serves the SPA shell', deepLink.status === 200 && (await deepLink.text()).includes('<div id="root">'));

const cleanup = await call(`/api/farmer/listings/${newId}`, { method: 'DELETE', token });
check('farmer can delete the test listing', cleanup.status === 200, String(cleanup.status));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) {
  console.log('\nFailures:');
  failures.forEach((item) => console.log(` - ${item}`));
  process.exit(1);
}
