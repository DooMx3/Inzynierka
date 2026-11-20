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
	"name"             VARCHAR(255) NOT NULL,
	"description"      TEXT,
	"quantity"       NUMERIC(10,2) NOT NULL,  -- litry
	"bottledAt"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
	"organisationId" UUID NOT NULL REFERENCES "organisation"("id"),
	"createdById"  UUID NOT NULL REFERENCES "user"("id"),
	"creatorRoleAtCreation" user_role_type NOT NULL,
	"assignedToId" UUID NOT NULL REFERENCES "user"("id"),
	"taskType"      VARCHAR(32) NOT NULL CHECK ("taskType" IN
		('GENERAL', 'SPRAYING', 'HARVEST', 'FIELD_WORK', 'EQUIPMENT_MAINTENANCE')),
	"name"           VARCHAR(255) NOT NULL,
	"description"    VARCHAR(2000),
	"fieldId"       UUID REFERENCES "field"("id"),
	"equipmentId"   UUID REFERENCES "equipment"("id"),
	"substanceId"   UUID REFERENCES "substance"("id"),
	"startedAt"     DATE,
	"completedAt"   DATE,
	"dueDate"       DATE,
	"active"         BOOLEAN NOT NULL DEFAULT true,
	CHECK (
		("taskType" = 'GENERAL')
		OR ("taskType" = 'SPRAYING' AND "fieldId" IS NOT NULL AND "substanceId" IS NOT NULL)
		OR ("taskType" IN ('HARVEST', 'FIELD_WORK')
			AND "fieldId" IS NOT NULL AND "substanceId" IS NULL)
		OR ("taskType" = 'EQUIPMENT_MAINTENANCE'
			AND "fieldId" IS NULL AND "equipmentId" IS NOT NULL AND "substanceId" IS NULL)
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
CREATE INDEX ON "harvest_batch"("batchId");
CREATE INDEX ON "batch_ingredient"("batchId");
CREATE INDEX ON "batch_ingredient"("ingredientId");

CREATE INDEX ON "bottling"("organisationId");
CREATE INDEX ON "bottling"("batchId");
CREATE INDEX ON "offering"("organisationId");
CREATE INDEX ON "offering"("wineId");

CREATE INDEX ON "record"("organisationId");
CREATE INDEX ON "record"("record_typeId");
CREATE INDEX ON "record"("batchId");

CREATE INDEX ON "task"("organisationId", "dueDate");
CREATE INDEX ON "task"("assignedToId");
CREATE INDEX ON "task"("createdById");

