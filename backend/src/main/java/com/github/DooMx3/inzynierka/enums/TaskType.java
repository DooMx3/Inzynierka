package com.github.DooMx3.inzynierka.enums;

public enum TaskType {
  GENERAL(
      RelationRequirement.OPTIONAL,
      RelationRequirement.OPTIONAL,
      RelationRequirement.OPTIONAL,
      RelationRequirement.OPTIONAL,
      RelationRequirement.OPTIONAL,
      RelationRequirement.OPTIONAL),
  SPRAYING(
      RelationRequirement.REQUIRED,
      RelationRequirement.OPTIONAL,
      RelationRequirement.REQUIRED,
      RelationRequirement.FORBIDDEN,
      RelationRequirement.FORBIDDEN,
      RelationRequirement.FORBIDDEN),
  HARVEST(
      RelationRequirement.REQUIRED,
      RelationRequirement.OPTIONAL,
      RelationRequirement.FORBIDDEN,
      RelationRequirement.FORBIDDEN,
      RelationRequirement.FORBIDDEN,
      RelationRequirement.FORBIDDEN),
  FIELD_WORK(
      RelationRequirement.REQUIRED,
      RelationRequirement.OPTIONAL,
      RelationRequirement.FORBIDDEN,
      RelationRequirement.FORBIDDEN,
      RelationRequirement.FORBIDDEN,
      RelationRequirement.FORBIDDEN),
  EQUIPMENT_MAINTENANCE(
      RelationRequirement.FORBIDDEN,
      RelationRequirement.REQUIRED,
      RelationRequirement.FORBIDDEN,
      RelationRequirement.FORBIDDEN,
      RelationRequirement.FORBIDDEN,
      RelationRequirement.FORBIDDEN);

  private final RelationRequirement fieldRequirement;
  private final RelationRequirement equipmentRequirement;
  private final RelationRequirement substanceRequirement;
  private final RelationRequirement batchRequirement;
  private final RelationRequirement bottlingRequirement;
  private final RelationRequirement recordRequirement;

  TaskType(
      RelationRequirement fieldRequirement,
      RelationRequirement equipmentRequirement,
      RelationRequirement substanceRequirement,
      RelationRequirement batchRequirement,
      RelationRequirement bottlingRequirement,
      RelationRequirement recordRequirement) {
    this.fieldRequirement = fieldRequirement;
    this.equipmentRequirement = equipmentRequirement;
    this.substanceRequirement = substanceRequirement;
    this.batchRequirement = batchRequirement;
    this.bottlingRequirement = bottlingRequirement;
    this.recordRequirement = recordRequirement;
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

  public RelationRequirement batchRequirement() {
    return batchRequirement;
  }

  public RelationRequirement bottlingRequirement() {
    return bottlingRequirement;
  }

  public RelationRequirement recordRequirement() {
    return recordRequirement;
  }

  public enum RelationRequirement {
    REQUIRED,
    OPTIONAL,
    FORBIDDEN
  }
}
