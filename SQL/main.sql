CREATE TABLE IF NOT EXISTS "user" (
	"id" UUID NOT NULL,
	"organisationId" UUID,
	-- Enum { NONE, PENDING, MEMBER }
	-- Invitation status sent by the Owner. Before sending: NONE, after sending: PENDING, after accepting: MEMBER, after rejecting: NONE.
	"membershipStatus" VARCHAR(8) DEFAULT 'NONE',
	-- User''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''s name
	"firstName" VARCHAR(128) NOT NULL,
	-- User''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''s surname
	"lastName" VARCHAR(128) NOT NULL,
	"phoneNumber" VARCHAR(16),
	"passwordHash" VARCHAR(255) NOT NULL,
	"email" VARCHAR(255) NOT NULL,
	"active" BOOLEAN NOT NULL DEFAULT true,
	PRIMARY KEY("id")
);


COMMENT ON COLUMN "user"."membershipStatus" IS 'Enum { NONE, PENDING, MEMBER }
Invitation status sent by the Owner. Before sending: NONE, after sending: PENDING, after accepting: MEMBER, after rejecting: NONE.';
COMMENT ON COLUMN "user"."firstName" IS 'User''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''s name';
COMMENT ON COLUMN "user"."lastName" IS 'User''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''s surname';


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
	"completedAt" DATE,
	-- Additional user''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''s notes
	"description" TEXT NOT NULL,
	"due" DATE,
	"blendedWineID" UUID,
	"agedWineID" UUID,
	"bottledWineID" UUID,
	"fermentingMustsID" UUID,
	"mustID" UUID,
	PRIMARY KEY("id")
);


COMMENT ON COLUMN "task"."description" IS 'Additional user''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''s notes';


CREATE TABLE IF NOT EXISTS "field" (
	"id" UUID NOT NULL,
	"grapeTypeId" UUID NOT NULL,
	"organisationId" UUID NOT NULL,
	"active" BOOLEAN NOT NULL DEFAULT true,
	"area" INTEGER,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "spraying" (
	"id" UUID NOT NULL,
	"fieldId" UUID NOT NULL,
	"organisationId" UUID NOT NULL,
	"equipmentId" UUID NOT NULL,
	"sprayingDate" DATE NOT NULL,
	"substanceId" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	"completedAt" DATE,
	"due" DATE,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "substance" (
	"id" UUID NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	"organisationId" UUID NOT NULL,
	"active" BOOLEAN NOT NULL DEFAULT true,
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
	"active" BOOLEAN NOT NULL DEFAULT true,
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
	"taxId" VARCHAR(20),
	"street" VARCHAR(255),
	"postalCode" VARCHAR(20),
	"city" VARCHAR(255) NOT NULL,
	"logoPath" VARCHAR(255),
	"motto" VARCHAR(512),
	"active" BOOLEAN NOT NULL DEFAULT true,
	"createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "harvest" (
	"id" UUID NOT NULL,
	"fieldId" UUID NOT NULL,
	"organisationId" UUID NOT NULL,
	"date" DATE NOT NULL,
	"amount" INTEGER NOT NULL,
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
	"quantity" INTEGER NOT NULL,
	"organisationID" UUID NOT NULL,
	"isSpoiled" BOOLEAN NOT NULL,
	"name" VARCHAR(255),
	"deleted" BOOLEAN NOT NULL,
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
	"quantity" INTEGER NOT NULL,
	"idSpoiled" BOOLEAN NOT NULL,
	"name" VARCHAR(255),
	"deleted" BOOLEAN NOT NULL,
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
	"name" VARCHAR(255) NOT NULL,
	"description" TEXT,
	"toBeBottledID" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	"productPhotoPath" VARCHAR(255),
	"deleted" BOOLEAN NOT NULL,
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
	"quantity" INTEGER NOT NULL,
	"isSpoiled" BOOLEAN NOT NULL,
	"name" VARCHAR(255),
	"deleted" BOOLEAN NOT NULL,
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
	"quantity" INTEGER NOT NULL,
	"isSpoiled" BOOLEAN NOT NULL,
	"name" VARCHAR(255),
	"deleted" BOOLEAN NOT NULL,
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




CREATE TABLE IF NOT EXISTS "disease" (
	"id" UUID NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	"dateObserved" DATE NOT NULL,
	"fieldId" UUID NOT NULL,
	PRIMARY KEY("id")
);



ALTER TABLE "user_role"
ADD FOREIGN KEY("roleId") REFERENCES "role"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "user_role"
ADD FOREIGN KEY("userId") REFERENCES "user"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "refreshTokens"
ADD FOREIGN KEY("userID") REFERENCES "user"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "user"
ADD FOREIGN KEY("organisationId") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "equipment"
ADD FOREIGN KEY("organisationId") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "equipment"
ADD FOREIGN KEY("typeId") REFERENCES "equipment_type"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "field"
ADD FOREIGN KEY("organisationId") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "field"
ADD FOREIGN KEY("grapeTypeId") REFERENCES "grape_type"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "grape_type"
ADD FOREIGN KEY("colorId") REFERENCES "grape_color"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "spraying"
ADD FOREIGN KEY("fieldId") REFERENCES "field"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "spraying"
ADD FOREIGN KEY("organisationId") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "spraying"
ADD FOREIGN KEY("equipmentId") REFERENCES "equipment"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "spraying"
ADD FOREIGN KEY("substanceId") REFERENCES "substance"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "substance"
ADD FOREIGN KEY("organisationId") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "disease"
ADD FOREIGN KEY("fieldId") REFERENCES "field"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "harvest"
ADD FOREIGN KEY("organisationId") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "harvest"
ADD FOREIGN KEY("fieldId") REFERENCES "field"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "field_harvest"
ADD FOREIGN KEY("fieldId") REFERENCES "field"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "field_harvest"
ADD FOREIGN KEY("harvestId") REFERENCES "harvest"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task"
ADD FOREIGN KEY("userId") REFERENCES "user"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task"
ADD FOREIGN KEY("taskTypeId") REFERENCES "task_type"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task"
ADD FOREIGN KEY("organisationId") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task"
ADD FOREIGN KEY("equipmentId") REFERENCES "equipment"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task"
ADD FOREIGN KEY("fieldId") REFERENCES "field"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task"
ADD FOREIGN KEY("blendedWineID") REFERENCES "blendedWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task"
ADD FOREIGN KEY("agedWineID") REFERENCES "agedWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task"
ADD FOREIGN KEY("bottledWineID") REFERENCES "bottledWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task"
ADD FOREIGN KEY("fermentingMustsID") REFERENCES "fermentingMust"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task"
ADD FOREIGN KEY("mustID") REFERENCES "must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("organisationId") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("recordTypeId") REFERENCES "recordType"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("blendedWineID") REFERENCES "blendedWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("agedWineID") REFERENCES "agedWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("bottledWineID") REFERENCES "bottledWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("fermentingMustID") REFERENCES "fermentingMust"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("mustID") REFERENCES "must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "must"
ADD FOREIGN KEY("organisationID") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "mustHarvests"
ADD FOREIGN KEY("harvestID") REFERENCES "harvest"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "mustHarvests"
ADD FOREIGN KEY("mustID") REFERENCES "must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentationMusts"
ADD FOREIGN KEY("mustID") REFERENCES "must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentationMusts"
ADD FOREIGN KEY("fermentationMustID") REFERENCES "fermentingMust"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentationIngredients"
ADD FOREIGN KEY("ingredientsID") REFERENCES "ingredients"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentationIngredients"
ADD FOREIGN KEY("fermentingMustID") REFERENCES "fermentingMust"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "agedWineFermentation"
ADD FOREIGN KEY("fermentingMustID") REFERENCES "fermentingMust"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "agedWineFermentation"
ADD FOREIGN KEY("agedWIneID") REFERENCES "agedWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "blendedWineIngredients"
ADD FOREIGN KEY("fermentingMustID") REFERENCES "fermentingMust"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "blendedWineIngredients"
ADD FOREIGN KEY("agedWineID") REFERENCES "agedWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "blendedWineIngredients"
ADD FOREIGN KEY("blendedWineID") REFERENCES "blendedWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "toBeBottled"
ADD FOREIGN KEY("blendedWineID") REFERENCES "blendedWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "toBeBottled"
ADD FOREIGN KEY("agedWineID") REFERENCES "agedWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "toBeBottled"
ADD FOREIGN KEY("fermentingMustID") REFERENCES "fermentingMust"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "bottledWine"
ADD FOREIGN KEY("toBeBottledID") REFERENCES "toBeBottled"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "offering"
ADD FOREIGN KEY("organisationId") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "offering"
ADD FOREIGN KEY("wineId") REFERENCES "bottledWine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
