package com.github.DooMx3.inzynierka.dto.batch;

import com.github.DooMx3.inzynierka.entities.HarvestBatch;
import java.math.BigDecimal;
import java.util.UUID;

public record HarvestBatchResponse(UUID id, UUID harvestId, BigDecimal quantity) {
  public static HarvestBatchResponse from(HarvestBatch source) {
    return new HarvestBatchResponse(
        source.getId(), source.getHarvest().getId(), source.getQuantity());
  }
}
