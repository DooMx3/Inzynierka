package com.github.DooMx3.inzynierka.dto.batch;

import com.github.DooMx3.inzynierka.entities.Batch;
import com.github.DooMx3.inzynierka.enums.BatchStage;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record BatchResponse(
    UUID id,
    String name,
    BatchStage stage,
    BigDecimal quantity,
    boolean isSpoiled,
    boolean deleted,
    LocalDateTime createdAt) {
  public static BatchResponse from(Batch batch) {
    return new BatchResponse(
        batch.getId(),
        batch.getName(),
        batch.getStage(),
        batch.getQuantity(),
        batch.isSpoiled(),
        batch.isDeleted(),
        batch.getCreatedAt());
  }
}
