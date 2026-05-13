CREATE TABLE IF NOT EXISTS "user" (
	"id" UUID NOT NULL,
	"organisationId" UUID,
	-- Enum { NONE, PENDING, MEMBER }
	-- Invitation status sent by the Owner. Before sending: NONE, after sending: PENDING, after accepting: MEMBER, after rejecting: NONE.
	"membershipStatus" VARCHAR(8) DEFAULT 'NONE',
	-- User''''''''''''''''s name
	"firstName" VARCHAR(128) NOT NULL,
	-- User''''''''''''''''s surname
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
COMMENT ON COLUMN "user"."firstName" IS 'User''''''''''''''''''''''''''''''''s name';
COMMENT ON COLUMN "user"."lastName" IS 'User''''''''''''''''''''''''''''''''s surname';
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
	"userId" UUID NOT NULL,
	"roleId" UUID NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "task" (
	"id" UUID NOT NULL,
	"taskTypeId" UUID NOT NULL,
	"organisationId" UUID NOT NULL,
	"userId" UUID NOT NULL,
	"equipmentId" UUID,
	"fieldId" UUID,
	"batchId" UUID,
	"recordId" UUID,
	"harvestId" UUID,
	"startedAt" DATE,
	"completedAt" DATE NOT NULL,
	-- Additional user''''''''''''''''s notes
	"description" TEXT,
	"due" DATE,
	PRIMARY KEY("id")
);


COMMENT ON COLUMN "task"."description" IS 'Additional user''''''''''''''''''''''''''''''''s notes';


CREATE TABLE IF NOT EXISTS "field" (
	"id" UUID NOT NULL,
	"grapeTypeId" UUID NOT NULL,
	"organisationId" UUID NOT NULL,
	"area" INTEGER,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "grape_type" (
	"id" UUID NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	"colorId" UUID NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "equipment" (
	"id" UUID NOT NULL,
	"organisationId" UUID NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	"typeId" UUID NOT NULL,
	"endOfTechnicalInspection" DATE,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "record" (
	"id" UUID NOT NULL,
	"organisationId" UUID NOT NULL,
	"recordTypeId" UUID NOT NULL,
	"sugarLevel" INTEGER,
	"acidity" INTEGER,
	"PH" INTEGER,
	"alcohol_content" INTEGER,
	"blendedWineID" UUID,
	"agedWineID" UUID,
	"bottledWineID" UUID,
	"fermentingMustID" UUID,
	"mustID" UUID,
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
	"organisationId" UUID NOT NULL,
	"amount" INTEGER,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "offering" (
	"id" UUID NOT NULL,
	"organisationId" UUID NOT NULL,
	"wineId" UUID NOT NULL,
	"price" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "equipment_type" (
	"id" UUID NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "task_type" (
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
	"fieldId" UUID NOT NULL,
	"harvestId" UUID NOT NULL,
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
	"quantity" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "fermentingMust" (
	"id" UUID NOT NULL,
	"startDate" DATE NOT NULL,
	"endDate" DATE,
	"quantity" INTEGER NOT NULL,
	"idSpoiled" BOOLEAN NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "fermentationMusts" (
	"id" UUID NOT NULL,
	"mustID" UUID NOT NULL,
	"fermentationMustID" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "ingredients" (
	"id" UUID NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	"energyContent" INTEGER NOT NULL,
	"fat" INTEGER NOT NULL,
	"saturatedFattyAcids" INTEGER NOT NULL,
	"carbs" INTEGER NOT NULL,
	"sugars" INTEGER NOT NULL,
	"protein" INTEGER NOT NULL,
	"salt" INTEGER NOT NULL,
	"fibers" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "fermentationIngredients" (
	"id" UUID NOT NULL,
	"ingredientsID" UUID NOT NULL,
	"fermentingMustID" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "bottledWine" (
	"id" UUID NOT NULL,
	"description" TEXT,
	"toBeBottledID" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	"productPhotoPath" VARCHAR(255),
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "toBeBottled" (
	"id" UUID NOT NULL,
	"fermentingMustID" UUID,
	"agedWineID" UUID,
	"blendedWineID" UUID,
	"quantity" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "agedWine" (
	"id" UUID NOT NULL,
	"startDate" DATE NOT NULL,
	"endDate" DATE,
	"quantity" INTEGER NOT NULL,
	"isSpoiled" BOOLEAN NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "agedWineFermentation" (
	"id" UUID NOT NULL,
	"fermentingMustID" UUID NOT NULL,
	"agedWIneID" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "blendedWine" (
	"id" UUID NOT NULL,
	"blendDate" DATE NOT NULL,
	"quantity" INTEGER NOT NULL,
	"isSpoiled" BOOLEAN NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "blendedWineIngredients" (
	"id" UUID NOT NULL,
	"fermentingMustID" UUID,
	"agedWineID" UUID,
	"blendedWineID" UUID,
	"quantity" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "refreshTokens" (
	"id" UUID NOT NULL,
	"token" VARCHAR(255) NOT NULL,
	"userID" UUID NOT NULL,
	"createdAt" TIMESTAMP NOT NULL,
	"expiresAt" TIMESTAMP NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "recordType" (
	"id" UUID NOT NULL,
	"type" VARCHAR(255) NOT NULL,
	PRIMARY KEY("id")
);



ALTER TABLE "role"
ADD FOREIGN KEY("id") REFERENCES "user_role"("roleId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "user"
ADD FOREIGN KEY("id") REFERENCES "user_role"("userId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "user"
ADD FOREIGN KEY("id") REFERENCES "refreshTokens"("userID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "user"
ADD FOREIGN KEY("organisationId") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "user"
ADD FOREIGN KEY("id") REFERENCES "task"("userId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task_type"
ADD FOREIGN KEY("id") REFERENCES "task"("taskTypeId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "task"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "equipment"
ADD FOREIGN KEY("id") REFERENCES "task"("equipmentId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "equipment"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "equipment_type"
ADD FOREIGN KEY("id") REFERENCES "equipment"("typeId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "field"
ADD FOREIGN KEY("id") REFERENCES "task"("fieldId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "field"
ADD FOREIGN KEY("id") REFERENCES "field_harvest"("fieldId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "grape_color"
ADD FOREIGN KEY("id") REFERENCES "grape_type"("colorId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "harvest"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "harvest"
ADD FOREIGN KEY("id") REFERENCES "field_harvest"("harvestId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "field"
ADD FOREIGN KEY("id") REFERENCES "harvest"("fieldId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "field"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "grape_type"
ADD FOREIGN KEY("id") REFERENCES "field"("grapeTypeId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "offering"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "record"("organisationId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "recordType"
ADD FOREIGN KEY("id") REFERENCES "record"("recordTypeId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "harvest"
ADD FOREIGN KEY("id") REFERENCES "mustHarvests"("harvestID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "must"
ADD FOREIGN KEY("id") REFERENCES "mustHarvests"("mustID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "organisation"
ADD FOREIGN KEY("id") REFERENCES "must"("organisationID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "must"
ADD FOREIGN KEY("id") REFERENCES "fermentationMusts"("mustID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentingMust"
ADD FOREIGN KEY("id") REFERENCES "fermentationMusts"("fermentationMustID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "ingredients"
ADD FOREIGN KEY("id") REFERENCES "fermentationIngredients"("ingredientsID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentingMust"
ADD FOREIGN KEY("id") REFERENCES "fermentationIngredients"("fermentingMustID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "bottledWine"
ADD FOREIGN KEY("id") REFERENCES "offering"("wineId")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentingMust"
ADD FOREIGN KEY("id") REFERENCES "agedWineFermentation"("fermentingMustID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "agedWine"
ADD FOREIGN KEY("id") REFERENCES "agedWineFermentation"("agedWIneID")
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
ALTER TABLE "blendedWine"
ADD FOREIGN KEY("id") REFERENCES "toBeBottled"("blendedWineID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "agedWine"
ADD FOREIGN KEY("id") REFERENCES "toBeBottled"("agedWineID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentingMust"
ADD FOREIGN KEY("id") REFERENCES "toBeBottled"("fermentingMustID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "bottledWine"
ADD FOREIGN KEY("toBeBottledID") REFERENCES "toBeBottled"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "blendedWine"
ADD FOREIGN KEY("id") REFERENCES "record"("blendedWineID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "agedWine"
ADD FOREIGN KEY("id") REFERENCES "record"("agedWineID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "bottledWine"
ADD FOREIGN KEY("id") REFERENCES "record"("bottledWineID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentingMust"
ADD FOREIGN KEY("id") REFERENCES "record"("fermentingMustID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "must"
ADD FOREIGN KEY("id") REFERENCES "record"("mustID")
ON UPDATE NO ACTION ON DELETE NO ACTION;
