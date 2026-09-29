CREATE TABLE IF NOT EXISTS "user" (
	"id" UUID NOT NULL,
	"organisationId" UUID,
	-- Enum { NONE, PENDING, MEMBER }
	-- NONE means no organisation, PENDING means an invitation awaits a response, MEMBER means accepted membership.
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
NONE means no organisation, PENDING means an invitation awaits a response, MEMBER means accepted membership.';
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
	"blended_wineId" UUID,
	"aged_wineId" UUID,
	"bottled_wineId" UUID,
	"fermenting_mustsId" UUID,
	"mustId" UUID,
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
	"sprayingDate" DATE,
	"substanceId" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
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
	"record_typeId" UUID NOT NULL,
	"sugarLevel" INTEGER,
	"acidity" INTEGER,
	"PH" INTEGER,
	"alcohol_content" INTEGER,
	"blended_wineId" UUID,
	"aged_wineId" UUID,
	"bottled_wineId" UUID,
	"fermenting_mustId" UUID,
	"mustId" UUID,
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
	"organisationId" UUID NOT NULL,
	"isSpoiled" BOOLEAN NOT NULL,
	"name" VARCHAR(255),
	"deleted" BOOLEAN NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "must_harvest" (
	"id" UUID NOT NULL,
	"harvestId" UUID NOT NULL,
	"mustId" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "fermenting_must" (
	"id" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	"idSpoiled" BOOLEAN NOT NULL,
	"name" VARCHAR(255),
	"deleted" BOOLEAN NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "fermentation_must" (
	"id" UUID NOT NULL,
	"mustId" UUID NOT NULL,
	"fermentationMustId" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "ingredient" (
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




CREATE TABLE IF NOT EXISTS "fermentation_ingredient" (
	"id" UUID NOT NULL,
	"ingredientId" UUID NOT NULL,
	"fermenting_mustId" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "bottled_wine" (
	"id" UUID NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	"description" TEXT,
	"to_be_bottledId" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	"productPhotoPath" VARCHAR(255),
	"deleted" BOOLEAN NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "to_be_bottled" (
	"id" UUID NOT NULL,
	"fermenting_mustId" UUID,
	"aged_wineId" UUID,
	"blended_wineId" UUID,
	"quantity" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "aged_wine" (
	"id" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	"isSpoiled" BOOLEAN NOT NULL,
	"name" VARCHAR(255),
	"deleted" BOOLEAN NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "aged_wine_fermentation" (
	"id" UUID NOT NULL,
	"fermenting_mustId" UUID NOT NULL,
	"agedWIneId" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "blended_wine" (
	"id" UUID NOT NULL,
	"quantity" INTEGER NOT NULL,
	"isSpoiled" BOOLEAN NOT NULL,
	"name" VARCHAR(255),
	"deleted" BOOLEAN NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "blended_wine_ingredient" (
	"id" UUID NOT NULL,
	"fermenting_mustId" UUID,
	"aged_wineId" UUID,
	"blended_wineId" UUID,
	"quantity" INTEGER NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "refresh_token" (
	"id" UUID NOT NULL,
	"token" VARCHAR(255) NOT NULL,
	"userId" UUID NOT NULL,
	"createdAt" TIMESTAMP NOT NULL,
	"expiresAt" TIMESTAMP NOT NULL,
	PRIMARY KEY("id")
);




CREATE TABLE IF NOT EXISTS "record_type" (
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
ALTER TABLE "refresh_token"
ADD FOREIGN KEY("userId") REFERENCES "user"("id")
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
ADD FOREIGN KEY("blended_wineId") REFERENCES "blended_wine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task"
ADD FOREIGN KEY("aged_wineId") REFERENCES "aged_wine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task"
ADD FOREIGN KEY("bottled_wineId") REFERENCES "bottled_wine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task"
ADD FOREIGN KEY("fermenting_mustsId") REFERENCES "fermenting_must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "task"
ADD FOREIGN KEY("mustId") REFERENCES "must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("organisationId") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("record_typeId") REFERENCES "record_type"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("blended_wineId") REFERENCES "blended_wine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("aged_wineId") REFERENCES "aged_wine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("bottled_wineId") REFERENCES "bottled_wine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("fermenting_mustId") REFERENCES "fermenting_must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "record"
ADD FOREIGN KEY("mustId") REFERENCES "must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "must"
ADD FOREIGN KEY("organisationId") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "must_harvest"
ADD FOREIGN KEY("harvestId") REFERENCES "harvest"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "must_harvest"
ADD FOREIGN KEY("mustId") REFERENCES "must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentation_must"
ADD FOREIGN KEY("mustId") REFERENCES "must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentation_must"
ADD FOREIGN KEY("fermentationMustId") REFERENCES "fermenting_must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentation_ingredient"
ADD FOREIGN KEY("ingredientId") REFERENCES "ingredient"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "fermentation_ingredient"
ADD FOREIGN KEY("fermenting_mustId") REFERENCES "fermenting_must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "aged_wine_fermentation"
ADD FOREIGN KEY("fermenting_mustId") REFERENCES "fermenting_must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "aged_wine_fermentation"
ADD FOREIGN KEY("agedWIneId") REFERENCES "aged_wine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "blended_wine_ingredient"
ADD FOREIGN KEY("fermenting_mustId") REFERENCES "fermenting_must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "blended_wine_ingredient"
ADD FOREIGN KEY("aged_wineId") REFERENCES "aged_wine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "blended_wine_ingredient"
ADD FOREIGN KEY("blended_wineId") REFERENCES "blended_wine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "to_be_bottled"
ADD FOREIGN KEY("blended_wineId") REFERENCES "blended_wine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "to_be_bottled"
ADD FOREIGN KEY("aged_wineId") REFERENCES "aged_wine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "to_be_bottled"
ADD FOREIGN KEY("fermenting_mustId") REFERENCES "fermenting_must"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "bottled_wine"
ADD FOREIGN KEY("to_be_bottledId") REFERENCES "to_be_bottled"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "offering"
ADD FOREIGN KEY("organisationId") REFERENCES "organisation"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "offering"
ADD FOREIGN KEY("wineId") REFERENCES "bottled_wine"("id")
ON UPDATE NO ACTION ON DELETE NO ACTION;
