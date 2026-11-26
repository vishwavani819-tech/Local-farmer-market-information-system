# 🌿 Local Farmer Market Information System

**Farmer Market** — _Empowering Farmers. Connecting Communities. Delivering Freshness._

A complete full-stack agricultural marketplace that connects local Indian farmers directly with
consumers. Farmers list their harvest with real photographs, set their own price per kilogram and
manage stock; customers discover local produce, compare transparent prices and contact farmers
directly. Three role-based dashboards keep the marketplace honest.

| Layer | Technology |
| --- | --- |
| Front end | React 18 + Vite 5, hand-written CSS design system, React Router 6 |
| Back end | Java 21, Spring Boot 3.3, Spring Data JPA, Bean Validation |
| Database | MySQL 8.0 (8 relational tables, foreign keys, check constraints) |
| Security | BCrypt password hashing, HMAC-SHA256 JWT sessions, role-based authorisation, image validation |

---

## Table of contents

1. [What works](#what-works)
2. [Demo accounts](#demo-accounts)
3. [Project structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Database setup](#database-setup)
6. [Running the application](#running-the-application)
7. [Building a single deployable jar](#building-a-single-deployable-jar)
8. [Configuration reference](#configuration-reference)
9. [REST API reference](#rest-api-reference)
10. [Security notes](#security-notes)
11. [Sample data disclaimer](#sample-data-disclaimer)
12. [Image credits](#image-credits)
13. [Troubleshooting](#troubleshooting)

---

## What works

### Public site
- **Home** — hero with live search, real photography, featured categories, newest listings,
  how-it-works, why-choose-us and a farmer call to action.
- **Marketplace** — live (debounced) text search, category, district, min/max price and
  availability filters, five sort orders and pagination. Every card shows the crop photo, price
  per kg, stock, farmer name, village, availability badge, **View details** and **Contact farmer**.
- **Product detail** — full crop and farmer information, harvest date, an enquiry form for
  customers, WhatsApp/call buttons for signed-in users, similar crops.
- **Farmers directory** — search by name, village or district; contact details reveal only after
  sign-in.
- **About / Contact** — mission, technology, privacy and terms, FAQ and a working email draft form.
- **Language switch** — English ⇄ ಕನ್ನಡ for navigation, hero, section headings and marketplace
  controls (falls back to English where a translation is not provided).
- All pages are responsive and use labelled form controls, visible focus states and
  `prefers-reduced`-friendly animations.

### Farmer
- Account registration (name, mobile, email, password, village, district, state, farm address).
- Dashboard: total listed crops, available stock, customer enquiries (with unread count),
  active listings, recent listings and recent enquiries.
- Add / edit / delete crop listings with **image upload** (JPG/PNG/WebP ≤ 5 MB, magic-byte checked).
- Manage prices, manage stock, pause a listing, availability status (available / busy / on leave).
- Enquiry inbox with reply, mark-read and close actions, plus WhatsApp contact to the customer.
- Profile management.

### Customer
- Registration, login, profile.
- Save / remove favourite crops; browse with all marketplace filters.
- Send enquiries directly to farmers (quantity + message) and read replies.
- Dashboard with saved crops, enquiries sent, farmers contacted and open enquiries.

### Administrator
- Platform statistics (farmers, customers, listings, active/available listings, enquiries).
- Manage farmers and customers — search, pagination, activate/deactivate accounts.
- Moderate listings — search, filter by status, remove with a reason, restore.
- Reports page — category and state distribution, enquiry pipeline, printable summary.

### Cross-cutting
- Every form is validated on the client **and** on the server; server errors are mapped to fields.
- Success/error toasts, loading spinners, skeleton cards and empty states everywhere.
- Protected routes redirect to login and return you to the page you wanted.
- Prices are labelled as farmer-entered sample data — the app never claims live mandi rates.

---

## Demo accounts

Seeded automatically on first start (see `DataSeeder`). Passwords are BCrypt-hashed in the database.

| Role | Email | Password |
| --- | --- | --- |
| Farmer | `ramesh.patil@example.com` | `Farmer@123` |
| Farmer | `lakshmi.gowda@example.com` | `Farmer@123` |
| Farmer | `suresh.naik@example.com` | `Farmer@123` |
| Customer | `priya.sharma@example.com` | `Customer@123` |
| Customer | `arjun.menon@example.com` | `Customer@123` |
| Admin | `admin@farmermarket.in` | `Admin@123` |

The login page has one-click buttons for these accounts.

---

## Project structure

```
local Farmer/
├── backend/                         Spring Boot REST API
│   ├── pom.xml
│   ├── uploads/                     Runtime image uploads (git-ignored)
│   └── src/main/
│       ├── java/com/farmermarket/
│       │   ├── FarmerMarketApplication.java
│       │   ├── config/              CORS, static uploads, BCrypt bean
│       │   ├── security/            JWT service, auth interceptor, @RequireRole
│       │   ├── entity/              User, Farmer, Customer, Admin, Crop, CropListing, Enquiry, Favourite
│       │   ├── repo/                Spring Data repositories + specifications
│       │   ├── service/             Auth, marketplace, farmer, customer, admin, upload
│       │   ├── web/                 REST controllers + global exception handler
│       │   ├── dto/                 Validated requests and response records
│       │   └── seed/                Realistic demo data
│       └── resources/
│           ├── application.properties
│           └── static/              Built React app (generated by `npm run build`)
├── frontend/                        React + Vite SPA
│   ├── public/img/                  Hero and 25 real crop photographs
│   └── src/
│       ├── lib/                     API client, auth context, i18n, helpers
│       ├── components/              Navbar, footer, cards, dashboard shell, UI kit
│       └── pages/                   Public, farmer, customer and admin pages
├── db/schema.sql                    Database DDL: 8 tables, FKs, checks, indexes, app user
└── scripts/                         Image fetcher, smoke test, local start helpers
```

---

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| JDK | 21 | `java -version` |
| Maven | 3.9+ | `mvn -v` |
| Node.js | 18+ | `node -v`, includes npm |
| MySQL | 8.0 | Server running locally |

> **This machine already has a portable toolchain** in `.tools/` (JDK 21, Maven 3.9.16 and
> MySQL 8.0.40 on port **3307**, database already loaded). Use the helper scripts in `scripts/`
> to restart MySQL and the API after a reboot.

---

## Database setup

The schema is the single source of truth — Hibernate never creates tables
(`spring.jpa.hibernate.ddl-auto=none`).

```bash
mysql -u root -p < db/schema.sql
```

This creates:

- database `farmer_market` (utf8mb4),
- tables `users`, `farmers`, `customers`, `admins`, `crops`, `crop_listings`, `enquiries`,
  `favourites` with primary keys, foreign keys (`ON DELETE CASCADE`/`RESTRICT`), unique keys,
  check constraints on price/quantity, indexes and timestamps,
- a least-privilege application user `farmer_app` with `SELECT, INSERT, UPDATE, DELETE` only.

Default connection used by the app (`backend/src/main/resources/application.properties`):

```properties
spring.datasource.url=${DB_URL:jdbc:mysql://127.0.0.1:3307/farmer_market?...}
spring.datasource.username=${DB_USERNAME:farmer_app}
spring.datasource.password=${DB_PASSWORD:FarmerApp@2026}
```

**Using a standard MySQL install on port 3306?** Override the URL instead of editing code:

```bash
export DB_URL="jdbc:mysql://127.0.0.1:3306/farmer_market?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata&characterEncoding=UTF-8"
```

Because `farmer_app` is a restricted user, run `schema.sql` as an administrator (root).

---

## Running the application

### Option A — development (two servers, hot reload)

Terminal 1 — API on <http://localhost:8080>:

```bash
cd backend
mvn spring-boot:run
```

Terminal 2 — React dev server on <http://localhost:5173>:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` and `/uploads` to the Spring Boot server.

> On this machine you can simply run `bash scripts/start-mysql.sh` (if MySQL is stopped) and
> `bash scripts/start-backend.sh`.

### Option B — production (one jar, one port)

```bash
cd frontend && npm install && npm run build     # writes into backend/src/main/resources/static
cd ../backend && mvn clean package -DskipTests
java -jar target/farmer-market-1.0.0.jar
```

Open **http://localhost:8080** — the API and the compiled React app are served together, and
deep links (`/marketplace/12`) fall back to `index.html`.

### Verify everything

With the application running:

```bash
node scripts/smoke-test.mjs
```

The script exercises 58 checks across public browsing, authentication, RBAC, farmer CRUD,
customer favourites/enquiries, admin moderation, upload validation and the static site.

---

## Configuration reference

All values can be provided as environment variables.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_URL` | `jdbc:mysql://127.0.0.1:3307/farmer_market…` | JDBC connection string |
| `DB_USERNAME` | `farmer_app` | Database user |
| `DB_PASSWORD` | `FarmerApp@2026` | Database password |
| `JWT_SECRET` | development value | **Change in production** — signs login tokens |
| `JWT_TTL_HOURS` | `24` | Token lifetime |
| `UPLOAD_DIR` | `./uploads` | Where crop photographs are stored |
| `SEED_ENABLED` | `true` | Seed demo data when the `users` table is empty |

---

## REST API reference

All endpoints are under `/api`. Authenticated requests send `Authorization: Bearer <token>`.

### Authentication
| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register/farmer` | Public | Create a farmer account + farm profile |
| POST | `/auth/register/customer` | Public | Create a customer account |
| POST | `/auth/login` | Public | Returns JWT + user + role profile |
| GET | `/auth/me` | Any signed-in | Current profile |
| POST | `/auth/logout` | Public | Stateless sign-out acknowledgement |

### Marketplace (public)
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/marketplace/crops` | Search with `q, category, minPrice, maxPrice, location, sort, availableOnly, page, size` |
| GET | `/marketplace/crops/{id}` | Listing detail (+ farmer, contact if signed in) |
| GET | `/marketplace/featured` | Newest available listings |
| GET | `/marketplace/filters` | Categories, districts, states, price range |
| GET | `/marketplace/categories` | Category counts |
| GET | `/marketplace/farmers` | Farmer directory (`q` optional) |
| GET | `/marketplace/farmers/{id}` | Single farmer card |

### Farmer — requires role `FARMER`
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/farmer/dashboard` | Stats + recent activity |
| GET/POST | `/farmer/listings` | List / create crops |
| PUT/DELETE | `/farmer/listings/{id}` | Update / remove a listing |
| PATCH | `/farmer/listings/{id}/price` | Update price |
| PATCH | `/farmer/listings/{id}/stock` | Update quantity and availability |
| GET | `/farmer/enquiries` | Enquiry inbox |
| PATCH | `/farmer/enquiries/{id}` | Reply / change status |
| PATCH | `/farmer/enquiries/{id}/read` | Mark as read |
| GET/PUT | `/farmer/profile` | Read / update farm profile |
| GET | `/farmer/categories`, `/farmer/crop-suggestions` | Form helpers |

### Customer — requires role `CUSTOMER`
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/customer/dashboard` | Stats, favourites, enquiries |
| GET | `/customer/favourites` | Saved crops |
| POST/DELETE | `/customer/favourites/{listingId}` | Save / unsave |
| GET/POST | `/customer/enquiries` | History / send an enquiry |
| GET/PUT | `/customer/profile` | Read / update profile |

### Administrator — requires role `ADMIN`
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/dashboard` | Platform statistics and breakdowns |
| GET | `/admin/farmers`, `/admin/customers` | Paged, searchable account lists |
| GET | `/admin/listings` | Paged listings with status filter |
| PATCH | `/admin/users/{id}/active` | Activate / deactivate an account |
| PATCH | `/admin/listings/{id}/remove?reason=` | Remove a listing |
| PATCH | `/admin/listings/{id}/restore` | Restore a listing |
| GET | `/admin/report` | Aggregated marketplace report |

### Uploads
| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/uploads/crop-image` | Farmer / admin | Multipart image upload, returns `{ url }` |

Errors are returned as `{ "message": "...", "errors": { "field": "..." } }` with the appropriate
HTTP status (400 validation, 401 unauthenticated, 403 wrong role, 404 missing, 409 conflict).

---

## Security notes

- Passwords are hashed with **BCrypt (strength 10)** and never returned by any endpoint.
- Sessions use **HS256 JWTs** signed with `JWT_SECRET`; tokens expire after 24 hours.
- A `HandlerInterceptor` resolves the token and enforces `@RequireRole` on every protected
  controller, so authorisation cannot be bypassed from the client.
- Farmers may only edit their **own** listings; customers only their own favourites and enquiries.
- Uploads are limited to 5 MB, restricted to JPG/PNG/WebP and verified by **magic bytes**, so a
  renamed script cannot be stored.
- Listing and registration inputs are validated with Jakarta Bean Validation plus business rules
  (price > 0, quantity ≥ 0, harvest date sanity checks).
- The application connects as a least-privilege MySQL user; `ddl-auto=none` prevents schema drift.
- Farmer phone numbers are only serialised for signed-in users.

---

## Sample data disclaimer

All prices, quantities and listings in this project are **sample data entered by the seeded
demonstration farmers**. The application does not display, fetch or claim live mandi/market prices,
and the interface says so on the homepage, marketplace and reports pages.

---

## Image credits

Photographs were downloaded for this academic project from **Wikimedia Commons** and Wikipedia
article lead images, and remain under their respective free licences (CC BY, CC BY-SA or public
domain). They are used unmodified apart from server-side resizing by Wikimedia's thumbnail service.
Sources include, among others:

- Hero: _Corn maize harvest in Himachal Pradesh, India_ (Wikimedia Commons)
- Tomato, Onion, Potato, Eggplant, Cauliflower, Carrot, Mango, Banana, Papaya, Pomegranate, Guava,
  Chickpea, Turmeric, Red chilli, Ginger, Peanut, Milk — Wikipedia lead images for each produce
- Spinach, Bananas (market), Ragi, Maize, Toor dal, Coriander, Rice — Wikimedia Commons files
  (`Spinach leaves.jpg`, `India - Koyambedu Market`, `Food grain finger millet.jpg`,
  `CookedCornOnTheCob.JPG`, `Tur Dal.JPG`, `A scene of Coriander leaves.JPG`, `WhiteRice.jpg`)

The `scripts/fetch-images.mjs` helper documents how each file was retrieved. If you deploy this
publicly, review each file's licence page on Commons and add attribution as required.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Could not reach the server` in the UI | Spring Boot is not running on port 8080. Start it, then reload. |
| `Access denied for user 'farmer_app'` | Run `db/schema.sql` as root — it creates and grants the app user. |
| `Communications link failure` | MySQL is not running, or the port in `DB_URL` is wrong (this machine uses **3307**). |
| Empty marketplace | Seed data only loads when `users` is empty. Set `SEED_ENABLED=true`, or truncate the tables and restart. |
| Port 8080 already in use | `server.port` in `application.properties`, or stop the other process. |
| Uploads fail | Ensure `UPLOAD_DIR` (default `backend/uploads`) is writable; only JPG/PNG/WebP ≤ 5 MB are accepted. |
| Kannada text shows boxes | Install a Kannada-capable system font (Noto Sans Kannada). |

---

_Built as a complete, working college project demonstration: React front end, Spring Boot REST
API and MySQL database with role-based dashboards, secure authentication and real marketplace
workflows._
