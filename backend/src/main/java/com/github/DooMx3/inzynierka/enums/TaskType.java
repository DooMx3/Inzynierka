package com.github.DooMx3.inzynierka.enums;

public enum TaskType {
  GENERAL(RelationRequirement.OPTIONAL, RelationRequirement.OPTIONAL, RelationRequirement.OPTIONAL),
  SPRAYING(
      RelationRequirement.REQUIRED, RelationRequirement.OPTIONAL, RelationRequirement.REQUIRED),
  HARVEST(
      RelationRequirement.REQUIRED, RelationRequirement.OPTIONAL, RelationRequirement.FORBIDDEN),
  FIELD_WORK(
      RelationRequirement.REQUIRED, RelationRequirement.OPTIONAL, RelationRequirement.FORBIDDEN),
  EQUIPMENT_MAINTENANCE(
      RelationRequirement.FORBIDDEN, RelationRequirement.REQUIRED, RelationRequirement.FORBIDDEN);

  private final RelationRequirement fieldRequirement;
  private final RelationRequirement equipmentRequirement;
  private final RelationRequirement substanceRequirement;

  TaskType(
      RelationRequirement fieldRequirement,
      RelationRequirement equipmentRequirement,
      RelationRequirement substanceRequirement) {
    this.fieldRequirement = fieldRequirement;
    this.equipmentRequirement = equipmentRequirement;
    this.substanceRequirement = substanceRequirement;
  }

  public RelationRequirement fieldRequirement() {
    return fieldRequirement;
  }

  public RelationRequirement equipmentRequirement() {
    return equipmentRequirement;
  }

  public RelationRequirement substanceRequirement() {
    return substanceRequirement;
  }

  public enum RelationRequirement {
    REQUIRED,
    OPTIONAL,
    FORBIDDEN
  }
}
