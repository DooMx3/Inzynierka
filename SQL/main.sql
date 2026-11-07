-- =========================`============================================
-- Schemat bazy winnicy (PostgreSQL 13+)
-- Skrypt dla pustej bazy. Wykonywany w jednej transakcji.
-- Konwencje jednostek:
--   * ilosci partii (batch, bottling)  -> litry
--   * field.area                       -> m2
--   * spraying.quantity                -> ml substancji
--   * bottled_wine.quantity            -> liczba butelek
--   * sugarLevel, acidity              -> g/l
--   * alcohol_content                  -> % obj.
--   * ingredient (wartosci odzywcze)   -> na 100 g
-- =====================================================================

-- ---------------------------------------------------------------------
-- Typy wyliczeniowe
-- ---------------------------------------------------------------------
CREATE TYPE membership_status AS ENUM ('NONE', 'PENDING', 'MEMBER');
CREATE TYPE user_role_type    AS ENUM ('OWNER', 'WORKER', 'OENOLOGIST');
CREATE TYPE batch_stage       AS ENUM ('MUST', 'FERMENTING', 'AGED', 'BLENDED');

-- ---------------------------------------------------------------------
-- Organizacje i uzytkownicy
-- ---------------------------------------------------------------------
CREATE TABLE "organisation" (
	"id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"name"       VARCHAR(255) NOT NULL,
	"taxId"      VARCHAR(20),
	"street"     VARCHAR(255),
	"postalCode" VARCHAR(20),
	"city"       VARCHAR(255) NOT NULL,
	"logoPath"   VARCHAR(255),
	"motto"      VARCHAR(512),
	"active"     BOOLEAN NOT NULL DEFAULT true,
	"createdAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "user" (
	"id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"organisationId"   UUID REFERENCES "organisation"("id"),
	"membershipStatus" membership_status NOT NULL DEFAULT 'NONE',
	"firstName"        VARCHAR(128) NOT NULL,
	"lastName"         VARCHAR(128) NOT NULL,
	"phoneNumber"      VARCHAR(16),
	"passwordHash"     VARCHAR(255) NOT NULL,
	"email"            VARCHAR(255) NOT NULL UNIQUE,
	"active"           BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON COLUMN "user"."membershipStatus" IS
	'NONE = brak organizacji, PENDING = zaproszenie czeka na odpowiedz, MEMBER = zaakceptowane czlonkostwo.';
COMMENT ON COLUMN "user"."firstName" IS 'Imie uzytkownika';
COMMENT ON COLUMN "user"."lastName"  IS 'Nazwisko uzytkownika';

CREATE TABLE "user_role" (
	"id"     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"userId" UUID NOT NULL REFERENCES "user"("id"),
	"role"   user_role_type NOT NULL,
	UNIQUE ("userId", "role")
);

CREATE TABLE "refresh_token" (
	"id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"token"     VARCHAR(255) NOT NULL UNIQUE,
	"userId"    UUID NOT NULL REFERENCES "user"("id"),
	"createdAt" TIMESTAMP NOT NULL,
	"expiresAt" TIMESTAMP NOT NULL
);

-- ---------------------------------------------------------------------
-- Slowniki
-- ---------------------------------------------------------------------
CREATE TABLE "grape_color" (
	"id"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" VARCHAR(255) NOT NULL
);

CREATE TABLE "grape_type" (
	"id"      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"name"    VARCHAR(255) NOT NULL,
	"colorId" UUID NOT NULL REFERENCES "grape_color"("id")
);

CREATE TABLE "equipment_type" (
	"id"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" VARCHAR(255) NOT NULL
);

CREATE TABLE "task_type" (
	"id"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" VARCHAR(255)
);

CREATE TABLE "record_type" (
	"id"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"type" VARCHAR(255) NOT NULL
);

CREATE TABLE "ingredient" (
	"id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"name"                VARCHAR(255) NOT NULL,
	"energyContent"       NUMERIC(8,2) NOT NULL,  -- kcal / 100 g
	"fat"                 NUMERIC(8,2) NOT NULL,
	"saturatedFattyAcids" NUMERIC(8,2) NOT NULL,
	"carbs"               NUMERIC(8,2) NOT NULL,
	"sugars"              NUMERIC(8,2) NOT NULL,
	"protein"             NUMERIC(8,2) NOT NULL,
	"salt"                NUMERIC(8,2) NOT NULL,
	"fibers"              NUMERIC(8,2) NOT NULL
);

-- ---------------------------------------------------------------------
-- Winnica: pola, sprzet, opryski, choroby
-- ---------------------------------------------------------------------
CREATE TABLE "field" (
	"id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"grapeTypeId"    UUID NOT NULL REFERENCES "grape_type"("id"),
	"organisationId" UUID NOT NULL REFERENCES "organisation"("id"),
	"active"         BOOLEAN NOT NULL DEFAULT true,
	"area"           INTEGE
);

CREATE TABLE "equipment" (
	"id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"organisationId"           UUID NOT NULL REFERENCES "organisation"("id"),
	"name"                     VARCHAR(255) NOT NULL,
	"typeId"                   UUID NOT NULL REFERENCES "equipment_type"("id"),
	"endOfTechnicalInspection" DATE,
	"active"                   BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "substance" (
	"id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"name"           VARCHAR(255) NOT NULL,
	"organisationId" UUID NOT NULL REFERENCES "organisation"("id"),
	"active"         BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "spraying" (
	"id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"fieldId"        UUID NOT NULL REFERENCES "field"("id"),
	"organisationId" UUID NOT NULL REFERENCES "organisation"("id"),
	"equipmentId"    UUID NOT NULL REFERENCES "equipment"("id"),
	"sprayingDate"   DATE,
	"substanceId"    UUID NOT NULL REFERENCES "substance"("id"),
	"quantity"       INTEGER NOT NULL,
	"due"            DATE
);

CREATE TABLE "disease" (
	"id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"name"         VARCHAR(255) NOT NULL,
	"dateObserved" DATE NOT NULL,
	"fieldId"      UUID NOT NULL REFERENCES "field"("id")
);

-- ---------------------------------------------------------------------
-- Zbiory
-- ---------------------------------------------------------------------
CREATE TABLE "harvest" (
	"id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"organisationId" UUID NOT NULL REFERENCES "organisation"("id"),
	"date"           DATE NOT NULL,
	"amount"         INTEGER NOT NULL  -- kg winogron
);

CREATE TABLE "field_harvest" (
	"id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"fieldId"   UUID NOT NULL REFERENCES "field"("id"),
	"harvestId" UUID NOT NULL REFERENCES "harvest"("id"),
	UNIQUE ("fieldId", "harvestId")
);

-- ---------------------------------------------------------------------
-- Partie (moszcz -> fermentacja -> dojrzewanie -> blend)
-- ---------------------------------------------------------------------
CREATE TABLE "batch" (
	"id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"organisationId" UUID NOT NULL REFERENCES "organisation"("id"),
	"name"           VARCHAR(255),
	"stage"          batch_stage NOT NULL,
	"quantity"       NUMERIC(10,2) NOT NULL,  -- litry
	"isSpoiled"      BOOLEAN NOT NULL DEFAULT false,
	"deleted"        BOOLEAN NOT NULL DEFAULT false,
	"createdAt"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Skad sie wziela partia: z partii A przelano X litrow do partii B
CREATE TABLE "batch_source" (
	"id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"sourceBatchId" UUID NOT NULL REFERENCES "batch"("id"),
	"targetBatchId" UUID NOT NULL REFERENCES "batch"("id"),
	"quantity"      NUMERIC(10,2) NOT NULL,
	CHECK ("sourceBatchId" <> "targetBatchId"),
	UNIQUE ("sourceBatchId", "targetBatchId")
);

-- Zbior -> partia moszczu
CREATE TABLE "harvest_batch" (
	"id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"harvestId" UUID NOT NULL REFERENCES "harvest"("id"),
	"batchId"   UUID NOT NULL REFERENCES "batch"("id"),
	"quantity"  NUMERIC(10,2) NOT NULL,  -- litry moszczu
	UNIQUE ("harvestId", "batchId")
);

-- Skladniki dodane do partii
CREATE TABLE "batch_ingredient" (
	"id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"batchId"      UUID NOT NULL REFERENCES "batch"("id"),
	"ingredientId" UUID NOT NULL REFERENCES "ingredient"("id"),
	"quantity"     NUMERIC(10,2) NOT NULL  -- gramy
);

-- ---------------------------------------------------------------------
-- Butelkowanie i oferta
-- ---------------------------------------------------------------------
CREATE TABLE "bottling" (
	"id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"organisationId" UUID NOT NULL REFERENCES "organisation"("id"),
	"batchId"        UUID NOT NULL REFERENCES "batch"("id"),
	"quantity"       NUMERIC(10,2) NOT NULL,  -- litry
	"bottledAt"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "bottled_wine" (
	"id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"organisationId"   UUID NOT NULL REFERENCES "organisation"("id"),
	"bottlingId"       UUID NOT NULL REFERENCES "bottling"("id"),
	"name"             VARCHAR(255) NOT NULL,
	"description"      TEXT,
	"quantity"         INTEGER NOT NULL CHECK,
	"productPhotoPath" VARCHAR(255),
	"deleted"          BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE "offering" (
	"id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"organisationId" UUID NOT NULL REFERENCES "organisation"("id"),
	"wineId"         UUID NOT NULL REFERENCES "bottled_wine"("id"),
	"price"          INTEGER NOT NULL
);

-- ---------------------------------------------------------------------
-- Pomiary i zadania
-- ---------------------------------------------------------------------
CREATE TABLE "record" (
	"id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"organisationId"  UUID NOT NULL REFERENCES "organisation"("id"),
	"record_typeId"   UUID NOT NULL REFERENCES "record_type"("id"),
	"batchId"         UUID REFERENCES "batch"("id"),
	"sugarLevel"      NUMERIC(6,2),  -- g/l
	"acidity"         NUMERIC(5,2),  -- g/l
	"PH"              NUMERIC(4,2),
	"alcohol_content" NUMERIC(4,2)   -- % obj.
);

CREATE TABLE "task" (
	"id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"taskTypeId"     UUID NOT NULL REFERENCES "task_type"("id"),
	"organisationId" UUID NOT NULL REFERENCES "organisation"("id"),
	"userId"         UUID NOT NULL REFERENCES "user"("id"),
	"equipmentId"    UUID REFERENCES "equipment"("id"),
	"fieldId"        UUID REFERENCES "field"("id"),
	"batchId"        UUID REFERENCES "batch"("id"),
	"bottledWineId"  UUID REFERENCES "bottled_wine"("id"),
	"recordId"       UUID REFERENCES "record"("id"),
	"harvestId"      UUID REFERENCES "harvest"("id"),
	"startedAt"      DATE,
	"completedAt"    DATE,
	"description"    TEXT NOT NULL,
	"due"            DATE
);

CREATE INDEX ON "user"("organisationId");
CREATE INDEX ON "refresh_token"("userId");
CREATE INDEX ON "grape_type"("colorId");

CREATE INDEX ON "field"("organisationId");
CREATE INDEX ON "field"("grapeTypeId");
CREATE INDEX ON "equipment"("organisationId");
CREATE INDEX ON "equipment"("typeId");
CREATE INDEX ON "substance"("organisationId");
CREATE INDEX ON "spraying"("organisationId");
CREATE INDEX ON "spraying"("fieldId");
CREATE INDEX ON "spraying"("equipmentId");
CREATE INDEX ON "spraying"("substanceId");
CREATE INDEX ON "disease"("fieldId");

CREATE INDEX ON "harvest"("organisationId");
CREATE INDEX ON "field_harvest"("harvestId");

CREATE INDEX ON "batch"("organisationId", "stage") WHERE NOT "deleted";
CREATE INDEX ON "batch_source"("targetBatchId");
CREATE INDEX ON "harvest_batch"("batchId");
CREATE INDEX ON "batch_ingredient"("batchId");
CREATE INDEX ON "batch_ingredient"("ingredientId");

CREATE INDEX ON "bottling"("organisationId");
CREATE INDEX ON "bottling"("batchId");
CREATE INDEX ON "bottled_wine"("organisationId");
CREATE INDEX ON "bottled_wine"("bottlingId");
CREATE INDEX ON "offering"("organisationId");
CREATE INDEX ON "offering"("wineId");

CREATE INDEX ON "record"("organisationId");
CREATE INDEX ON "record"("record_typeId");
CREATE INDEX ON "record"("batchId");

CREATE INDEX ON "task"("organisationId");
CREATE INDEX ON "task"("userId");
CREATE INDEX ON "task"("taskTypeId");
CREATE INDEX ON "task"("batchId");
CREATE INDEX ON "task"("fieldId");
CREATE INDEX ON "task"("equipmentId");
CREATE INDEX ON "task"("bottledWineId");
CREATE INDEX ON "task"("recordId");
CREATE INDEX ON "task"("harvestId");

