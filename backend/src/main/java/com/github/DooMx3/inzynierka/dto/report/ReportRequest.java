package com.github.DooMx3.inzynierka.dto.report;

import com.github.DooMx3.inzynierka.enums.ReportAggregation;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

public record ReportRequest(
    LocalDate fromDate,
    LocalDate toDate,
    Set<UUID> batchIds,
    Set<UUID> fieldIds,
    Set<UUID> operationIds,
    ReportAggregation aggregation) {
  public ReportRequest {
    batchIds = batchIds == null ? Set.of() : Set.copyOf(batchIds);
    fieldIds = fieldIds == null ? Set.of() : Set.copyOf(fieldIds);
    operationIds = operationIds == null ? Set.of() : Set.copyOf(operationIds);
  }
}
