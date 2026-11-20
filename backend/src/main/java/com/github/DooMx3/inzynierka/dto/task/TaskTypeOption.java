package com.github.DooMx3.inzynierka.dto.task;

import com.github.DooMx3.inzynierka.enums.TaskType;
import com.github.DooMx3.inzynierka.enums.TaskType.RelationRequirement;

public record TaskTypeOption(
    TaskType type,
    RelationRequirement field,
    RelationRequirement equipment,
    RelationRequirement substance,
    RelationRequirement batch,
    RelationRequirement bottling,
    RelationRequirement record) {

  public static TaskTypeOption from(TaskType type) {
    return new TaskTypeOption(
        type,
        type.fieldRequirement(),
        type.equipmentRequirement(),
        type.substanceRequirement(),
        type.batchRequirement(),
        type.bottlingRequirement(),
        type.recordRequirement());
  }
}
