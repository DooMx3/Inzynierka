package com.github.DooMx3.inzynierka.dto.batch;

import java.util.List;

public record BatchHistoryResponse(
    BatchResponse batch,
    List<HarvestBatchResponse> harvestSources,
    List<BatchSourceResponse> sourceChanges,
    List<BatchSourceResponse> targetChanges) {}
