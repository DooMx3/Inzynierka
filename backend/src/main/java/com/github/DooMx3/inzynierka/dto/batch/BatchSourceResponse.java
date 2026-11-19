package com.github.DooMx3.inzynierka.dto.batch;

import com.github.DooMx3.inzynierka.entities.BatchSource;
import java.math.BigDecimal;
import java.util.UUID;

public record BatchSourceResponse(
    UUID id, UUID sourceBatchId, UUID targetBatchId, BigDecimal quantity) {
  public static BatchSourceResponse from(BatchSource source) {
    return new BatchSourceResponse(
        source.getId(),
        source.getSourceBatch().getId(),
        source.getTargetBatch().getId(),
        source.getQuantity());
  }
}
