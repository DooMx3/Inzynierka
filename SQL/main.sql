
Table "user" {
  "id" UUID [not null]
  "organisationId" UUID
  "membershipStatus" VARCHAR(8) [default: 'NONE', note: '''Enum { NONE, PENDING, MEMBER }
Invitation status sent by the Owner. Before sending: NONE, after sending: PENDING, after accepting: MEMBER, after rejecting: NONE.''']
  "firstName" VARCHAR(128) [not null, note: '''User\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'s name''']
  "lastName" VARCHAR(128) [not null, note: '''User\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'s surname''']
  "phoneNumber" VARCHAR(16)
  "passwordHash" VARCHAR(255) [not null]
  "email" VARCHAR(255) [not null]
  "active" BOOLEAN [not null, default: true]

  Indexes {
    id [pk]
  }
}

Table "role" {
  "id" UUID [not null]
  "name" VARCHAR(64) [not null, note: 'Readable, full name']
  "description" TEXT [note: 'Short description of a role']

  Indexes {
    id [pk]
  }
}

Table "user_role" {
  "id" UUID [not null]
  "userId" UUID [not null]
  "roleId" UUID [not null]

  Indexes {
    id [pk]
  }
}

Table "task" {
  "id" UUID [not null]
  "taskTypeId" UUID [not null]
  "organisationId" UUID [not null]
  "userId" UUID [not null]
  "equipmentId" UUID
  "fieldId" UUID
  "batchId" UUID
  "recordId" UUID
  "harvestId" UUID
  "startedAt" DATE
  "completedAt" DATE
  "description" TEXT [not null, note: '''Additional user\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'\'s notes''']
  "due" DATE
  "blendedWineID" UUID
  "agedWineID" UUID
  "bottledWineID" UUID
  "fermentingMustsID" UUID
  "mustID" UUID

  Indexes {
    id [pk]
  }
}

Table "field" {
  "id" UUID [not null]
  "grapeTypeId" UUID [not null]
  "organisationId" UUID [not null]
  "active" BOOLEAN [not null, default: true]
  "area" INTEGER

  Indexes {
    id [pk]
  }
}

Table "spraying" {
  "id" UUID [not null]
  "fieldId" UUID [not null]
  "organisationId" UUID [not null]
  "equipmentId" UUID [not null]
  "sprayingDate" DATE [not null]
  "substanceId" UUID [not null]
  "quantity" INTEGER [not null]
  "completedAt" DATE
  "due" DATE

  Indexes {
    id [pk]
  }
}

Table "substance" {
  "id" UUID [not null]
  "name" VARCHAR(255) [not null]
  "organisationId" UUID [not null]
  "active" BOOLEAN [not null, default: true]

  Indexes {
    id [pk]
  }
}

Table "grape_type" {
  "id" UUID [not null]
  "name" VARCHAR(255) [not null]
  "colorId" UUID [not null]

  Indexes {
    id [pk]
  }
}

Table "equipment" {
  "id" UUID [not null]
  "organisationId" UUID [not null]
  "name" VARCHAR(255) [not null]
  "typeId" UUID [not null]
  "endOfTechnicalInspection" DATE
  "active" BOOLEAN [not null, default: true]

  Indexes {
    id [pk]
  }
}

Table "record" {
  "id" UUID [not null]
  "organisationId" UUID [not null]
  "recordTypeId" UUID [not null]
  "sugarLevel" INTEGER
  "acidity" INTEGER
  "PH" INTEGER
  "alcohol_content" INTEGER
  "blendedWineID" UUID
  "agedWineID" UUID
  "bottledWineID" UUID
  "fermentingMustID" UUID
  "mustID" UUID

  Indexes {
    id [pk]
  }
}

Table "organisation" {
  "id" UUID [not null]
  "name" VARCHAR(255) [not null]
  "taxId" VARCHAR(20)
  "street" VARCHAR(255)
  "postalCode" VARCHAR(20)
  "city" VARCHAR(255) [not null]
  "logoPath" VARCHAR(255)
  "motto" VARCHAR(512)
  "active" BOOLEAN [not null, default: true]
  "createdAt" TIMESTAMP [not null, default: `CURRENT_TIMESTAMP`]

  Indexes {
    id [pk]
  }
}

Table "harvest" {
  "id" UUID [not null]
  "fieldId" UUID [not null]
  "organisationId" UUID [not null]
  "date" DATE [not null]
  "amount" INTEGER [not null]

  Indexes {
    id [pk]
  }
}

Table "offering" {
  "id" UUID [not null]
  "organisationId" UUID [not null]
  "wineId" UUID [not null]
  "price" INTEGER [not null]

  Indexes {
    id [pk]
  }
}

Table "equipment_type" {
  "id" UUID [not null]
  "name" VARCHAR(255) [not null]

  Indexes {
    id [pk]
  }
}

Table "task_type" {
  "id" UUID [not null]
  "name" VARCHAR(255)

  Indexes {
    id [pk]
  }
}

Table "grape_color" {
  "id" UUID [not null]
  "name" VARCHAR(255) [not null]

  Indexes {
    id [pk]
  }
}

Table "field_harvest" {
  "id" UUID [not null]
  "fieldId" UUID [not null]
  "harvestId" UUID [not null]

  Indexes {
    id [pk]
  }
}

Table "must" {
  "id" UUID [not null]
  "quantity" INTEGER [not null]
  "organisationID" UUID [not null]
  "isSpoiled" BOOLEAN [not null]
  "name" VARCHAR(255)
  "deleted" BOOLEAN [not null]

  Indexes {
    id [pk]
  }
}

Table "mustHarvests" {
  "id" UUID [not null]
  "harvestID" UUID [not null]
  "mustID" UUID [not null]
  "quantity" INTEGER [not null]

  Indexes {
    id [pk]
  }
}

Table "fermentingMust" {
  "id" UUID [not null]
  "quantity" INTEGER [not null]
  "idSpoiled" BOOLEAN [not null]
  "name" VARCHAR(255)
  "deleted" BOOLEAN [not null]

  Indexes {
    id [pk]
  }
}

Table "fermentationMusts" {
  "id" UUID [not null]
  "mustID" UUID [not null]
  "fermentationMustID" UUID [not null]
  "quantity" INTEGER [not null]

  Indexes {
    id [pk]
  }
}

Table "ingredients" {
  "id" UUID [not null]
  "name" VARCHAR(255) [not null]
  "energyContent" INTEGER [not null]
  "fat" INTEGER [not null]
  "saturatedFattyAcids" INTEGER [not null]
  "carbs" INTEGER [not null]
  "sugars" INTEGER [not null]
  "protein" INTEGER [not null]
  "salt" INTEGER [not null]
  "fibers" INTEGER [not null]

  Indexes {
    id [pk]
  }
}

Table "fermentationIngredients" {
  "id" UUID [not null]
  "ingredientsID" UUID [not null]
  "fermentingMustID" UUID [not null]
  "quantity" INTEGER [not null]

  Indexes {
    id [pk]
  }
}

Table "bottledWine" {
  "id" UUID [not null]
  "name" VARCHAR(255) [not null]
  "description" TEXT
  "toBeBottledID" UUID [not null]
  "quantity" INTEGER [not null]
  "productPhotoPath" VARCHAR(255)
  "deleted" BOOLEAN [not null]

  Indexes {
    id [pk]
  }
}

Table "toBeBottled" {
  "id" UUID [not null]
  "fermentingMustID" UUID
  "agedWineID" UUID
  "blendedWineID" UUID
  "quantity" INTEGER [not null]

  Indexes {
    id [pk]
  }
}

Table "agedWine" {
  "id" UUID [not null]
  "quantity" INTEGER [not null]
  "isSpoiled" BOOLEAN [not null]
  "name" VARCHAR(255)
  "deleted" BOOLEAN [not null]

  Indexes {
    id [pk]
  }
}

Table "agedWineFermentation" {
  "id" UUID [not null]
  "fermentingMustID" UUID [not null]
  "agedWIneID" UUID [not null]
  "quantity" INTEGER [not null]

  Indexes {
    id [pk]
  }
}

Table "blendedWine" {
  "id" UUID [not null]
  "quantity" INTEGER [not null]
  "isSpoiled" BOOLEAN [not null]
  "name" VARCHAR(255)
  "deleted" BOOLEAN [not null]

  Indexes {
    id [pk]
  }
}

Table "blendedWineIngredients" {
  "id" UUID [not null]
  "fermentingMustID" UUID
  "agedWineID" UUID
  "blendedWineID" UUID
  "quantity" INTEGER [not null]

  Indexes {
    id [pk]
  }
}

Table "refreshTokens" {
  "id" UUID [not null]
  "token" VARCHAR(255) [not null]
  "userID" UUID [not null]
  "createdAt" TIMESTAMP [not null]
  "expiresAt" TIMESTAMP [not null]

  Indexes {
    id [pk]
  }
}

Table "recordType" {
  "id" UUID [not null]
  "type" VARCHAR(255) [not null]

  Indexes {
    id [pk]
  }
}

Table "disease" {
  "id" UUID [not null]
  "name" VARCHAR(255) [not null]
  "dateObserved" DATE [not null]
  "fieldId" UUID [not null]

  Indexes {
    id [pk]
  }
}

Ref:"role"."id" < "user_role"."roleId" [update: no action, delete: no action]

Ref:"user"."id" < "user_role"."userId" [update: no action, delete: no action]

Ref:"user"."id" < "refreshTokens"."userID" [update: no action, delete: no action]

Ref:"organisation"."id" < "user"."organisationId" [update: no action, delete: no action]

Ref:"organisation"."id" < "equipment"."organisationId" [update: no action, delete: no action]

Ref:"equipment_type"."id" < "equipment"."typeId" [update: no action, delete: no action]

Ref:"organisation"."id" < "field"."organisationId" [update: no action, delete: no action]

Ref:"grape_type"."id" < "field"."grapeTypeId" [update: no action, delete: no action]

Ref:"grape_color"."id" < "grape_type"."colorId" [update: no action, delete: no action]

Ref:"field"."id" < "spraying"."fieldId" [update: no action, delete: no action]

Ref:"organisation"."id" < "spraying"."organisationId" [update: no action, delete: no action]

Ref:"equipment"."id" < "spraying"."equipmentId" [update: no action, delete: no action]

Ref:"substance"."id" < "spraying"."substanceId" [update: no action, delete: no action]

Ref:"organisation"."id" < "substance"."organisationId" [update: no action, delete: no action]

Ref:"field"."id" < "disease"."fieldId" [update: no action, delete: no action]

Ref:"organisation"."id" < "harvest"."organisationId" [update: no action, delete: no action]

Ref:"field"."id" < "harvest"."fieldId" [update: no action, delete: no action]

Ref:"field"."id" < "field_harvest"."fieldId" [update: no action, delete: no action]

Ref:"harvest"."id" < "field_harvest"."harvestId" [update: no action, delete: no action]

Ref:"user"."id" < "task"."userId" [update: no action, delete: no action]

Ref:"task_type"."id" < "task"."taskTypeId" [update: no action, delete: no action]

Ref:"organisation"."id" < "task"."organisationId" [update: no action, delete: no action]

Ref:"equipment"."id" < "task"."equipmentId" [update: no action, delete: no action]

Ref:"field"."id" < "task"."fieldId" [update: no action, delete: no action]

Ref:"blendedWine"."id" < "task"."blendedWineID" [update: no action, delete: no action]

Ref:"agedWine"."id" < "task"."agedWineID" [update: no action, delete: no action]

Ref:"bottledWine"."id" < "task"."bottledWineID" [update: no action, delete: no action]

Ref:"fermentingMust"."id" < "task"."fermentingMustsID" [update: no action, delete: no action]

Ref:"must"."id" < "task"."mustID" [update: no action, delete: no action]

Ref:"organisation"."id" < "record"."organisationId" [update: no action, delete: no action]

Ref:"recordType"."id" < "record"."recordTypeId" [update: no action, delete: no action]

Ref:"blendedWine"."id" < "record"."blendedWineID" [update: no action, delete: no action]

Ref:"agedWine"."id" < "record"."agedWineID" [update: no action, delete: no action]

Ref:"bottledWine"."id" < "record"."bottledWineID" [update: no action, delete: no action]

Ref:"fermentingMust"."id" < "record"."fermentingMustID" [update: no action, delete: no action]

Ref:"must"."id" < "record"."mustID" [update: no action, delete: no action]

Ref:"organisation"."id" < "must"."organisationID" [update: no action, delete: no action]

Ref:"harvest"."id" < "mustHarvests"."harvestID" [update: no action, delete: no action]

Ref:"must"."id" < "mustHarvests"."mustID" [update: no action, delete: no action]

Ref:"must"."id" < "fermentationMusts"."mustID" [update: no action, delete: no action]

Ref:"fermentingMust"."id" < "fermentationMusts"."fermentationMustID" [update: no action, delete: no action]

Ref:"ingredients"."id" < "fermentationIngredients"."ingredientsID" [update: no action, delete: no action]

Ref:"fermentingMust"."id" < "fermentationIngredients"."fermentingMustID" [update: no action, delete: no action]

Ref:"fermentingMust"."id" < "agedWineFermentation"."fermentingMustID" [update: no action, delete: no action]

Ref:"agedWine"."id" < "agedWineFermentation"."agedWIneID" [update: no action, delete: no action]

Ref:"fermentingMust"."id" < "blendedWineIngredients"."fermentingMustID" [update: no action, delete: no action]

Ref:"agedWine"."id" < "blendedWineIngredients"."agedWineID" [update: no action, delete: no action]

Ref:"blendedWine"."id" < "blendedWineIngredients"."blendedWineID" [update: no action, delete: no action]

Ref:"blendedWine"."id" < "toBeBottled"."blendedWineID" [update: no action, delete: no action]

Ref:"agedWine"."id" < "toBeBottled"."agedWineID" [update: no action, delete: no action]

Ref:"fermentingMust"."id" < "toBeBottled"."fermentingMustID" [update: no action, delete: no action]

Ref:"toBeBottled"."id" < "bottledWine"."toBeBottledID" [update: no action, delete: no action]

Ref:"organisation"."id" < "offering"."organisationId" [update: no action, delete: no action]

Ref:"bottledWine"."id" < "offering"."wineId" [update: no action, delete: no action]
