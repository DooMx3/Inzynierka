CREATE TYPE membership_status AS ENUM ('NONE', 'PENDING', 'MEMBER');
CREATE TYPE user_role_type    AS ENUM ('OWNER', 'WORKER', 'OENOLOGIST');
CREATE TYPE batch_stage       AS ENUM ('MUST', 'FERMENTING', 'AGED', 'BLENDED');

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

CREATE TABLE "equipment_type" (
	"id"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" VARCHAR(255) NOT NULL
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
	"grapeType"    VARCHAR(255) NOT NULL,
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
	"organisationId" UUID NOT NULL REFERENCES "organisation"("id"),
	"deleted"        BOOLEAN NOT NULL DEFAULT false,
	"createdAt"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Skad sie wziela partia: z partii A przelano X litrow do partii B
CREATE TABLE "batch_source" (
	"id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"sourceBatchId" UUID NOT NULL REFERENCES "batch"("id"),
	"targetBatchId" UUID NOT NULL REFERENCES "batch"("id"),
	"organisationId" UUID NOT NULL REFERENCES "organisation"("id"),
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
	"organisationId" UUID NOT NULL REFERENCES "organisation"("id"),
	UNIQUE ("harvestId", "batchId")
);

-- Skladniki dodane do partii
CREATE TABLE "batch_ingredient" (
	"id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"batchId"      UUID NOT NULL REFERENCES "batch"("id"),
	"ingredientId" UUID NOT NULL REFERENCES "ingredient"("id"),
	"quantity"     NUMERIC(10,2) NOT NULL  -- gramy
	"organisationId" UUID NOT NULL REFERENCES "organisation"("id"),
);

-- ---------------------------------------------------------------------
-- Butelkowanie i oferta
-- ---------------------------------------------------------------------
CREATE TABLE "bottling" (
	"id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"organisation_id" UUID NOT NULL REFERENCES "organisation"("id"),
	"batch_id"        UUID NOT NULL REFERENCES "batch"("id"),
	"name"             VARCHAR(255) NOT NULL,
	"description"      TEXT,
	"quantity"       NUMERIC(10,2) NOT NULL,  -- litry
	"bottled_at"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"active"         BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "offering" (
	"id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"organisationId" UUID NOT NULL REFERENCES "organisation"("id"),
	"wineId"         UUID NOT NULL REFERENCES "bottling"("id"),
	"price"          INTEGER NOT NULL
);

-- ---------------------------------------------------------------------
-- Pomiary i zadania
-- ---------------------------------------------------------------------
CREATE TABLE "record" (
	"id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"organisation_id"  UUID NOT NULL REFERENCES "organisation"("id"),
	"record_typeId"   UUID NOT NULL REFERENCES "record_type"("id"),
	"batch_id"         UUID REFERENCES "batch"("id"),
	"sugar_level"      NUMERIC(6,2),  -- g/l
	"acidity"         NUMERIC(5,2),  -- g/l
	"ph"              NUMERIC(4,2),
    "temperature"     NUMERIC(5,2),  -- deg C
	"alcohol_content" NUMERIC(4,2),   -- % obj
	"active"          BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "task" (
	"id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"organisation_id" UUID NOT NULL REFERENCES "organisation"("id"),
	"created_by_id"  UUID NOT NULL REFERENCES "user"("id"),
	"creator_role_at_creation" user_role_type NOT NULL,
	"assigned_to_id" UUID NOT NULL REFERENCES "user"("id"),
	"task_type"      VARCHAR(32) NOT NULL CHECK ("task_type" IN
		('GENERAL', 'SPRAYING', 'HARVEST', 'FIELD_WORK', 'EQUIPMENT_MAINTENANCE')),
	"name"           VARCHAR(255) NOT NULL,
	"description"    VARCHAR(2000),
	"field_id"       UUID REFERENCES "field"("id"),
	"equipment_id"   UUID REFERENCES "equipment"("id"),
	"substance_id"   UUID REFERENCES "substance"("id"),
	"batch_id"       UUID REFERENCES "batch"("id"),
	"bottling_id"    UUID REFERENCES "bottling"("id"),
	"record_id"      UUID REFERENCES "record"("id"),
	"started_at"     DATE,
	"completed_at"   DATE,
	"due_date"       DATE,
	"active"         BOOLEAN NOT NULL DEFAULT true,
	CHECK (
		("task_type" = 'GENERAL')
		OR ("task_type" = 'SPRAYING'
			AND "field_id" IS NOT NULL AND "substance_id" IS NOT NULL
			AND "batch_id" IS NULL AND "bottling_id" IS NULL AND "record_id" IS NULL)
		OR ("task_type" IN ('HARVEST', 'FIELD_WORK')
			AND "field_id" IS NOT NULL AND "substance_id" IS NULL
			AND "batch_id" IS NULL AND "bottling_id" IS NULL AND "record_id" IS NULL)
		OR ("task_type" = 'EQUIPMENT_MAINTENANCE'
			AND "field_id" IS NULL AND "equipment_id" IS NOT NULL AND "substance_id" IS NULL
			AND "batch_id" IS NULL AND "bottling_id" IS NULL AND "record_id" IS NULL)
	)
);

CREATE INDEX ON "user"("organisationId");
CREATE INDEX ON "refresh_token"("userId");

CREATE INDEX ON "field"("organisationId");
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
CREATE INDEX ON "batch_source"("organisationId");
CREATE INDEX ON "harvest_batch"("batchId");
CREATE INDEX ON "batch_ingredient"("batchId");
CREATE INDEX ON "batch_ingredient"("ingredientId");
CREATE INDEX ON "batch_ingredient"("organisationId");

CREATE INDEX ON "bottling"("organisation_id");
CREATE INDEX ON "bottling"("batch_id");
CREATE INDEX ON "offering"("organisationId");
CREATE INDEX ON "offering"("wineId");

CREATE INDEX ON "record"("organisation_id");
CREATE INDEX ON "record"("record_typeId");
CREATE INDEX ON "record"("batch_id");

CREATE INDEX ON "task"("organisation_id", "due_date");
CREATE INDEX ON "task"("assigned_to_id");
CREATE INDEX ON "task"("created_by_id");
CREATE INDEX ON "task"("batch_id");
CREATE INDEX ON "task"("bottling_id");
CREATE INDEX ON "task"("record_id");

