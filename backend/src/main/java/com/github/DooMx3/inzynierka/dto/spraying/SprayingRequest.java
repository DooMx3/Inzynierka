package com.github.DooMx3.inzynierka.dto.spraying;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Instant;
import java.util.UUID;

public record SprayingRequest(
    @NotNull UUID fieldId,
    @NotNull UUID equipmentId,
    @NotNull UUID substanceId,
    Instant sprayingDate,
    @Positive int quantity,
    Instant due) {

  @AssertTrue(message = "Due date is required when spraying date is not provided")
  @JsonIgnore
  public boolean isDueDateValid() {
    return sprayingDate != null || due != null;
  }
}
