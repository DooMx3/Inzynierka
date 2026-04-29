CREATE TABLE IF NOT EXISTS "user" (
	"id" UUID NOT NULL,
	"organisationId" INTEGER,
	-- Enum { NONE, PENDING, MEMBER }
	-- Invitation status sent by the Owner. Before sending: NONE, after sending: PENDING, after accepting: MEMBER, after rejecting: NONE.
	"membershipStatus" VARCHAR(8) DEFAULT 'NONE',
	-- User''s name
	"firstName" VARCHAR(128) NOT NULL,
	-- User''s surname
	"lastName" VARCHAR(128) NOT NULL,
	-- First part of the address
	"address_1" VARCHAR(255) NOT NULL,
	-- Second part of the address
	"address_2" VARCHAR(255) NOT NULL,
	-- IBAN
	"bankAccountNumber" VARCHAR(28) NOT NULL,
	"phoneNumber" VARCHAR(16),
	"passwordHash" VARCHAR(255) NOT NULL,
	"email" VARCHAR(255) NOT NULL,
	PRIMARY KEY("id")
);


COMMENT ON COLUMN "user"."membershipStatus" IS 'Enum { NONE, PENDING, MEMBER }
Invitation status sent by the Owner. Before sending: NONE, after sending: PENDING, after accepting: MEMBER, after rejecting: NONE.';
COMMENT ON COLUMN "user"."firstName" IS 'User''''s name';
COMMENT ON COLUMN "user"."lastName" IS 'User''''s surname';
COMMENT ON COLUMN "user"."address_1" IS 'First part of the address';
COMMENT ON COLUMN "user"."address_2" IS 'Second part of the address';
COMMENT ON COLUMN "user"."bankAccountNumber" IS 'IBAN';


CREATE TABLE IF NOT EXISTS "role" (
	"id" UUID NOT NULL,
	-- Readable, full name
	"name" VARCHAR(64) NOT NULL,
	-- Short description of a role
	"description" TEXT,
	PRIMARY KEY("id")
);


COMMENT ON COLUMN "role"."name" IS 'Readable, full name';
COMMENT ON COLUMN "role"."description" IS 'Short description of a role';


CREATE TABLE IF NOT EXISTS "user_role" (
	"id" UUID NOT NULL,
	"userId" INTEGER NOT NULL,
	"roleId" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "job" (
	"id" UUID NOT NULL,
	"jobTypeId" INTEGER NOT NULL,
	"organisationId" INTEGER NOT NULL,
	"userId" INTEGER NOT NULL,
	"equipmentId" INTEGER,
	"fieldId" INTEGER,
	"batchId" INTEGER,
	"recordId" INTEGER,
	"harvestId" INTEGER,
	"startedAt" DATE,
	"completedAt" DATE NOT NULL,
	-- Additional user''s notes
	"description" TEXT,
	PRIMARY KEY("id")
);


COMMENT ON COLUMN "job"."description" IS 'Additional user''''s notes';


CREATE TABLE IF NOT EXISTS "field" (
	"id" UUID NOT NULL,
	"grapeTypeId" INTEGER NOT NULL,
	"organisationId" INTEGER NOT NULL,
	"area" INTEGER,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "grape_type" (
	"id" UUID NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	"colorId" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "equipment" (
	"id" UUID NOT NULL,
	"organisationId" INTEGER NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	"typeId" INTEGER NOT NULL,
	"unitCost" DECIMAL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "batch" (
	"id" UUID NOT NULL,
	"currentLocationId" INTEGER NOT NULL,
	"grapeId" INTEGER NOT NULL,
	"organisationId" INTEGER NOT NULL,
	"harvestId" INTEGER,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "record" (
	"id" UUID NOT NULL,
	"organisationId" INTEGER NOT NULL,
	"batchId" INTEGER,
	"recordTypeId" INTEGER NOT NULL,
	"sugarLevel" INTEGER,
	"acidity" INTEGER,
	"PH" INTEGER,
	"alcohol_content" INTEGER,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "organisation" (
	"id" UUID NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	"address_1" VARCHAR(255) NOT NULL,
	"address_2" VARCHAR(255) NOT NULL,
	"city" VARCHAR(255) NOT NULL,
	"logoPath" VARCHAR(255),
	"description" TEXT,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "harvest" (
	"id" UUID NOT NULL,
	"fieldId" INTEGER NOT NULL,
	"organisationId" INTEGER NOT NULL,
	"amount" INTEGER,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "offering" (
	"id" UUID NOT NULL,
	"organisationId" INTEGER NOT NULL,
	"wineId" INTEGER NOT NULL,
	"price" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "wine" (
	"id" UUID NOT NULL,
	"organisationId" INTEGER NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	"description" TEXT,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "equipment_type" (
	"id" UUID NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "job_type" (
	"id" UUID NOT NULL,
	"name" VARCHAR(255),
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "grape_color" (
	"id" UUID NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "wine_batch" (
	"id" UUID NOT NULL,
	"wineId" INTEGER NOT NULL,
	"batchId" INTEGER NOT NULL,
	PRIMARY KEY("id")
);


COMMENT ON COLUMN "wine_batch"."spoiled" IS 'representing percentage of spoiled wine';



CREATE TABLE IF NOT EXISTS "field_harvest" (
	"id" UUID NOT NULL,
	"fieldId" INTEGER NOT NULL,
	"harvestId" INTEGER NOT NULL,
	PRIMARY KEY("id")
);



ALTER TABLE "role"
ADD FOREIGN KEY("id") REFERENCES "user_role"("roleId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "user"
ADD FOREIGN KEY("id") REFERENCES "user_role"("userId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "user"
ADD FOREIGN KEY("id") REFERENCES "job"("userId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "field"
ADD FOREIGN KEY("id") REFERENCES "job"("fieldId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "grape_type"
ADD FOREIGN KEY("id") REFERENCES "field"("grapeTypeId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "equipment"
ADD FOREIGN KEY("id") REFERENCES "job"("equipmentId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "batch"
ADD FOREIGN KEY("id") REFERENCES "job"("batchId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "batch"
ADD FOREIGN KEY("currentLocationId") REFERENCES "equipment"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "grape_type"
ADD FOREIGN KEY("id") REFERENCES "batch"("grapeId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "job"
ADD FOREIGN KEY("recordId") REFERENCES "record"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "batch"
ADD FOREIGN KEY("id") REFERENCES "record"("batchId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "user"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "field"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "equipment"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "job"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "record"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "batch"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "harvest"
ADD FOREIGN KEY("id") REFERENCES "job"("harvestId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "harvest"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "harvest"
ADD FOREIGN KEY("id") REFERENCES "batch"("harvestId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "offering"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "wine"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "wine"
ADD FOREIGN KEY("id") REFERENCES "offering"("wineId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "equipment"
ADD FOREIGN KEY("typeId") REFERENCES "equipment_type"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "job"
ADD FOREIGN KEY("jobTypeId") REFERENCES "job_type"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "grape_type"
ADD FOREIGN KEY("colorId") REFERENCES "grape_color"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "wine_batch"
ADD FOREIGN KEY("wineId") REFERENCES "wine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "wine_batch"
ADD FOREIGN KEY("batchId") REFERENCES "batch"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "field"
ADD FOREIGN KEY("id") REFERENCES "field_harvest"("fieldId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "harvest"
ADD FOREIGN KEY("id") REFERENCES "field_harvest"("harvestId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
