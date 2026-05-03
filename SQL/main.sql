CREATE TABLE IF NOT EXISTS "user" (
	"id" UUID NOT NULL,
	"organisationId" INTEGER,
	-- Enum { NONE, PENDING, MEMBER }
	-- Invitation status sent by the Owner. Before sending: NONE, after sending: PENDING, after accepting: MEMBER, after rejecting: NONE.
	"membershipStatus" VARCHAR(8) DEFAULT 'NONE',
	-- User''''s name
	"firstName" VARCHAR(128) NOT NULL,
	-- User''''s surname
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
COMMENT ON COLUMN "user"."firstName" IS 'User''''''''s name';
COMMENT ON COLUMN "user"."lastName" IS 'User''''''''s surname';
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
	-- Additional user''''s notes
	"description" TEXT,
	PRIMARY KEY("id")
);


COMMENT ON COLUMN "job"."description" IS 'Additional user''''''''s notes';


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




CREATE TABLE IF NOT EXISTS "record" (
	"id" UUID NOT NULL,
	"organisationId" INTEGER NOT NULL,
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
	"fieldId" UUID NOT NULL,
	"organisationId" INTEGER NOT NULL,
	"amount" INTEGER,
	"grapeTypeId" UUID NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "offering" (
	"id" UUID NOT NULL,
	"organisationId" INTEGER NOT NULL,
	"wineId" INTEGER NOT NULL,
	"price" INTEGER NOT NULL,
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




CREATE TABLE IF NOT EXISTS "field_harvest" (
	"id" UUID NOT NULL,
	"fieldId" INTEGER NOT NULL,
	"harvestId" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "must" (
	"id" UUID NOT NULL,
	"creationDate" DATE NOT NULL,
	"quantity" INTEGER NOT NULL,
	"organisationID" UUID NOT NULL,
	"isSpoiled" BOOLEAN NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "mustHarvests" (
	"id" UUID NOT NULL,
	"harvestID" UUID NOT NULL,
	"mustID" UUID NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "fermentingMust" (
	"id" UUID NOT NULL,
	"startDate" DATE NOT NULL,
	"endDate" DATE,
	"quantity" INTEGER NOT NULL,
	"organisationID" UUID NOT NULL,
	"idSpoiled" BOOLEAN NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "mustRecords" (
	"id" UUID NOT NULL,
	"mustID" UUID NOT NULL,
	"recordID" UUID NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "fermentingMustRecords" (
	"id" UUID NOT NULL,
	"fermentingMustID" UUID NOT NULL,
	"recordID" UUID NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "fermentationMusts" (
	"id" UUID NOT NULL,
	"mustID" UUID NOT NULL,
	"fermentationMustID" UUID NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "ingredients" (
	"id" UUID NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "fermentationIngredients" (
	"id" UUID NOT NULL,
	"ingredientsID" UUID NOT NULL,
	"fermentingMustID" UUID NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "bottledWine" (
	"id" UUID NOT NULL,
	"toBeBottledID" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	"organisationID" UUID NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "toBeBottled" (
	"id" UUID NOT NULL,
	"fermentingMustID" UUID,
	"agedWineID" UUID,
	"blendedWineID" UUID,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "botteledWineRecords" (
	"id" UUID NOT NULL,
	"botteledWineID" UUID NOT NULL,
	"recordID" UUID NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "agedWine" (
	"id" UUID NOT NULL,
	"startDate" DATE NOT NULL,
	"endDate" DATE,
	"organisationID" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	"isSpoiled" BOOLEAN NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "agedWineRecords" (
	"id" UUID NOT NULL,
	"agedWineID" UUID NOT NULL,
	"recordID" UUID NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "agedWineFermentation" (
	"id" UUID NOT NULL,
	"fermentingMustID" UUID NOT NULL,
	"agedWIneID" UUID NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "blendedWine" (
	"id" UUID NOT NULL,
	"blendDate" DATE NOT NULL,
	"organistationID" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	"isSpoiled" BOOLEAN NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "blendedWineIngredients" (
	"id" UUID NOT NULL,
	"fermentingMustID" UUID,
	"agedWineID" UUID,
	"blendedWineID" UUID NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "blendedWineRecords" (
	"id" UUID NOT NULL,
	"blendedWineID" UUID NOT NULL,
	"recordID" UUID NOT NULL,
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
ALTER TABLE "job"
ADD FOREIGN KEY("recordId") REFERENCES "record"("id")
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
ALTER TABLE "harvest"
ADD FOREIGN KEY("id") REFERENCES "job"("harvestId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "harvest"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "offering"("organisationId")
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
ALTER TABLE "field"
ADD FOREIGN KEY("id") REFERENCES "field_harvest"("fieldId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "harvest"
ADD FOREIGN KEY("id") REFERENCES "field_harvest"("harvestId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "harvest"
ADD FOREIGN KEY("fieldId") REFERENCES "field"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "grape_type"
ADD FOREIGN KEY("id") REFERENCES "harvest"("grapeTypeId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "must"("organisationID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "mustHarvests"
ADD FOREIGN KEY("harvestID") REFERENCES "harvest"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "mustHarvests"
ADD FOREIGN KEY("mustID") REFERENCES "must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("id") REFERENCES "mustRecords"("recordID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "mustRecords"
ADD FOREIGN KEY("mustID") REFERENCES "must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentingMustRecords"
ADD FOREIGN KEY("fermentingMustID") REFERENCES "fermentingMust"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentingMustRecords"
ADD FOREIGN KEY("recordID") REFERENCES "record"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentationMusts"
ADD FOREIGN KEY("mustID") REFERENCES "must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentationMusts"
ADD FOREIGN KEY("fermentationMustID") REFERENCES "fermentingMust"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentingMust"
ADD FOREIGN KEY("id") REFERENCES "fermentationIngredients"("fermentingMustID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentationIngredients"
ADD FOREIGN KEY("ingredientsID") REFERENCES "ingredients"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentingMust"
ADD FOREIGN KEY("organisationID") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "toBeBottled"
ADD FOREIGN KEY("fermentingMustID") REFERENCES "fermentingMust"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "bottledWine"
ADD FOREIGN KEY("toBeBottledID") REFERENCES "toBeBottled"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "bottledWine"("organisationID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "botteledWineRecords"
ADD FOREIGN KEY("botteledWineID") REFERENCES "bottledWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "botteledWineRecords"
ADD FOREIGN KEY("recordID") REFERENCES "record"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "agedWine"
ADD FOREIGN KEY("organisationID") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "agedWineRecords"
ADD FOREIGN KEY("agedWineID") REFERENCES "agedWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "agedWineRecords"
ADD FOREIGN KEY("recordID") REFERENCES "record"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "agedWine"
ADD FOREIGN KEY("id") REFERENCES "toBeBottled"("agedWineID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "agedWineFermentation"
ADD FOREIGN KEY("fermentingMustID") REFERENCES "fermentingMust"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "agedWineFermentation"
ADD FOREIGN KEY("agedWIneID") REFERENCES "agedWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "blendedWine"("organistationID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "blendedWine"
ADD FOREIGN KEY("id") REFERENCES "toBeBottled"("blendedWineID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentingMust"
ADD FOREIGN KEY("id") REFERENCES "blendedWineIngredients"("fermentingMustID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "agedWine"
ADD FOREIGN KEY("id") REFERENCES "blendedWineIngredients"("agedWineID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "blendedWine"
ADD FOREIGN KEY("id") REFERENCES "blendedWineIngredients"("blendedWineID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "blendedWineRecords"
ADD FOREIGN KEY("blendedWineID") REFERENCES "blendedWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "blendedWineRecords"
ADD FOREIGN KEY("recordID") REFERENCES "record"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
