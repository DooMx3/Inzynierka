package com.github.DooMx3.inzynierka.dto.task;

import com.github.DooMx3.inzynierka.enums.TaskType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

public record TaskRequest(
    @NotNull TaskType type,
    @NotBlank @Size(max = 255) String name,
    @Size(max = 2000) String description,
    UUID assignedUserId,
    UUID fieldId,
    UUID equipmentId,
    UUID substanceId,
    LocalDate startedAt,
    LocalDate dueDate) {}
