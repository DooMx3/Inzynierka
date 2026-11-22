package com.github.DooMx3.inzynierka.dto.record;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.github.DooMx3.inzynierka.entities.Record;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RecordResponse(
    UUID id,
    UUID batchId,
    Instant recordedAt,
    BigDecimal sugarLevel,
    BigDecimal acidity,
    @JsonProperty("pH") BigDecimal ph,
    BigDecimal temperature,
    BigDecimal alcoholContent) {

  public static RecordResponse from(Record record) {
    return new RecordResponse(
        record.getId(),
        record.getBatch().getId(),
        record.getRecordedAt(),
        record.getSugarLevel(),
        record.getAcidity(),
        record.getPh(),
        record.getTemperature(),
        record.getAlcoholContent());
  }
}
