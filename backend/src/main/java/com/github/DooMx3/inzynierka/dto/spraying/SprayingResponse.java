package com.github.DooMx3.inzynierka.dto.spraying;

import com.github.DooMx3.inzynierka.entities.Spraying;
import java.time.Instant;
import java.util.UUID;

public record SprayingResponse(
    UUID id,
    UUID fieldId,
    UUID equipmentId,
    UUID substanceId,
    Instant sprayingDate,
    int quantity,
    Instant due) {

  public static SprayingResponse from(Spraying spraying) {
    return new SprayingResponse(
        spraying.getId(),
        spraying.getField().getId(),
        spraying.getEquipment().getId(),
        spraying.getSubstance().getId(),
        spraying.getSprayingDate(),
        spraying.getQuantity(),
        spraying.getDue());
  }
}
