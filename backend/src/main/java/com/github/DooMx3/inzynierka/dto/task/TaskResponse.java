package com.github.DooMx3.inzynierka.dto.task;

import com.github.DooMx3.inzynierka.entities.Task;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.enums.TaskType;
import java.time.LocalDate;
import java.util.UUID;

public record TaskResponse(
    UUID id,
    TaskType type,
    String name,
    String description,
    UUID createdById,
    RoleName creatorRoleAtCreation,
    UUID assignedUserId,
    UUID fieldId,
    UUID equipmentId,
    UUID substanceId,
    LocalDate startedAt,
    LocalDate completedAt,
    LocalDate dueDate,
    boolean completed) {

  public static TaskResponse from(Task task) {
    return new TaskResponse(
        task.getId(),
        task.getType(),
        task.getName(),
        task.getDescription(),
        task.getCreatedBy().getId(),
        task.getCreatorRoleAtCreation(),
        task.getAssignedTo().getId(),
        task.getField() == null ? null : task.getField().getId(),
        task.getEquipment() == null ? null : task.getEquipment().getId(),
        task.getSubstance() == null ? null : task.getSubstance().getId(),
        task.getStartedAt(),
        task.getCompletedAt(),
        task.getDueDate(),
        task.getCompletedAt() != null);
  }
}
