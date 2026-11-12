package com.github.DooMx3.inzynierka.dto.pest;

import com.github.DooMx3.inzynierka.entities.PestObservation;
import com.github.DooMx3.inzynierka.enums.PestObservationType;
import java.time.LocalDate;
import java.util.UUID;

public record PestObservationResponse(
    UUID id,
    UUID fieldId,
    PestObservationType type,
    String name,
    LocalDate observedAt,
    String description,
    boolean active) {

  public static PestObservationResponse from(PestObservation observation) {
    return new PestObservationResponse(
        observation.getId(),
        observation.getField().getId(),
        observation.getType(),
        observation.getName(),
        observation.getObservedAt(),
        observation.getDescription(),
        observation.isActive());
  }
}
