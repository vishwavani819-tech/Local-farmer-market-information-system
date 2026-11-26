-- =====================================================================
--  LOCAL FARMER MARKET INFORMATION SYSTEM
--  MySQL 8.0 relational schema
--
--  Run with:
--    mysql -u root -p < db/schema.sql
--
--  The application never creates tables itself (spring.jpa.hibernate.ddl-auto=none)
--  so this file is the single source of truth for the database structure.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS farmer_market
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE farmer_market;

-- Drop child tables first so the script can be re-run safely.
DROP TABLE IF EXISTS favourites;
DROP TABLE IF EXISTS enquiries;
DROP TABLE IF EXISTS crop_listings;
DROP TABLE IF EXISTS crops;
DROP TABLE IF EXISTS farmers;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS users;

-- ---------------------------------------------------------------------
-- users: every person who can log in (farmers, customers, admins)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id             BIGINT       NOT NULL AUTO_INCREMENT,
  full_name      VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL,
  mobile         VARCHAR(15)  NOT NULL,
  password_hash  VARCHAR(100) NOT NULL,
  role           ENUM('FARMER','CUSTOMER','ADMIN') NOT NULL,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- farmers: farm location and availability for a FARMER user (1 to 1)
-- ---------------------------------------------------------------------
CREATE TABLE farmers (
  id                  BIGINT       NOT NULL AUTO_INCREMENT,
  user_id             BIGINT       NOT NULL,
  village             VARCHAR(120) NOT NULL,
  district            VARCHAR(120) NOT NULL,
  state               VARCHAR(120) NOT NULL,
  farm_address        VARCHAR(400) NOT NULL,
  about               VARCHAR(600) NULL,
  availability_status ENUM('AVAILABLE','BUSY','ON_LEAVE') NOT NULL DEFAULT 'AVAILABLE',
  contact_whatsapp    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_farmers_user (user_id),
  KEY idx_farmers_district (district),
  CONSTRAINT fk_farmers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- customers: marketplace buyers (1 to 1 with a CUSTOMER user)
-- ---------------------------------------------------------------------
CREATE TABLE customers (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  user_id     BIGINT       NOT NULL,
  city        VARCHAR(120) NULL,
  state       VARCHAR(120) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_user (user_id),
  CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- admins: platform administrators (1 to 1 with an ADMIN user)
-- ---------------------------------------------------------------------
CREATE TABLE admins (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  user_id     BIGINT       NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_user (user_id),
  CONSTRAINT fk_admins_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- crops: master catalogue of crop types (re-usable across farmers)
-- ---------------------------------------------------------------------
CREATE TABLE crops (
  id           BIGINT       NOT NULL AUTO_INCREMENT,
  name         VARCHAR(120) NOT NULL,
  category     ENUM('VEGETABLES','FRUITS','GRAINS','PULSES','SPICES','DAIRY','OTHER') NOT NULL,
  image_url    VARCHAR(500) NULL,
  description  VARCHAR(600) NULL,
  default_unit VARCHAR(16)  NOT NULL DEFAULT 'kg',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crops_name (name),
  KEY idx_crops_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- crop_listings: what a farmer is selling right now
-- ---------------------------------------------------------------------
CREATE TABLE crop_listings (
  id                 BIGINT        NOT NULL AUTO_INCREMENT,
  farmer_id          BIGINT        NOT NULL,
  crop_id            BIGINT        NOT NULL,
  price_per_kg       DECIMAL(10,2) NOT NULL,
  available_quantity DECIMAL(10,2) NOT NULL,
  unit               VARCHAR(16)   NOT NULL DEFAULT 'kg',
  location_label     VARCHAR(160)  NOT NULL,
  district           VARCHAR(120)  NOT NULL,
  state              VARCHAR(120)  NOT NULL,
  harvest_date       DATE          NULL,
  description        VARCHAR(1200) NULL,
  image_url          VARCHAR(500)  NULL,
  is_available       BOOLEAN       NOT NULL DEFAULT TRUE,
  status             ENUM('ACTIVE','REMOVED') NOT NULL DEFAULT 'ACTIVE',
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_listings_farmer (farmer_id),
  KEY idx_listings_crop (crop_id),
  KEY idx_listings_price (price_per_kg),
  KEY idx_listings_status (status, is_available),
  CONSTRAINT fk_listings_farmer FOREIGN KEY (farmer_id) REFERENCES farmers (id) ON DELETE CASCADE,
  CONSTRAINT fk_listings_crop   FOREIGN KEY (crop_id)   REFERENCES crops (id)   ON DELETE RESTRICT,
  CONSTRAINT chk_listings_price CHECK (price_per_kg > 0),
  CONSTRAINT chk_listings_qty   CHECK (available_quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- enquiries: a customer message about a specific listing
-- ---------------------------------------------------------------------
CREATE TABLE enquiries (
  id              BIGINT        NOT NULL AUTO_INCREMENT,
  crop_listing_id BIGINT        NOT NULL,
  customer_id     BIGINT        NOT NULL,
  farmer_id       BIGINT        NOT NULL,
  message         VARCHAR(1000) NOT NULL,
  quantity_needed DECIMAL(10,2) NULL,
  status          ENUM('NEW','READ','RESPONDED','CLOSED') NOT NULL DEFAULT 'NEW',
  reply           VARCHAR(1000) NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  replied_at      DATETIME      NULL,
  PRIMARY KEY (id),
  KEY idx_enquiries_farmer (farmer_id, status),
  KEY idx_enquiries_customer (customer_id),
  KEY idx_enquiries_listing (crop_listing_id),
  CONSTRAINT fk_enquiries_listing  FOREIGN KEY (crop_listing_id) REFERENCES crop_listings (id) ON DELETE CASCADE,
  CONSTRAINT fk_enquiries_customer FOREIGN KEY (customer_id)     REFERENCES customers (id)     ON DELETE CASCADE,
  CONSTRAINT fk_enquiries_farmer   FOREIGN KEY (farmer_id)       REFERENCES farmers (id)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- favourites: crops a customer has saved
-- ---------------------------------------------------------------------
CREATE TABLE favourites (
  id              BIGINT   NOT NULL AUTO_INCREMENT,
  customer_id     BIGINT   NOT NULL,
  crop_listing_id BIGINT   NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fav_customer_listing (customer_id, crop_listing_id),
  CONSTRAINT fk_fav_customer FOREIGN KEY (customer_id)     REFERENCES customers (id)     ON DELETE CASCADE,
  CONSTRAINT fk_fav_listing  FOREIGN KEY (crop_listing_id) REFERENCES crop_listings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The application connects as this dedicated, least-privilege user.
CREATE USER IF NOT EXISTS 'farmer_app'@'localhost' IDENTIFIED BY 'FarmerApp@2026';
CREATE USER IF NOT EXISTS 'farmer_app'@'127.0.0.1' IDENTIFIED BY 'FarmerApp@2026';
GRANT SELECT, INSERT, UPDATE, DELETE ON farmer_market.* TO 'farmer_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON farmer_market.* TO 'farmer_app'@'127.0.0.1';
FLUSH PRIVILEGES;
