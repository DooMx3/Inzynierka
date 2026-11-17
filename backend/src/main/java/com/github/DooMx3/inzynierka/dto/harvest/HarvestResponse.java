package com.github.DooMx3.inzynierka.dto.harvest;

import com.github.DooMx3.inzynierka.dto.field.FieldResponse;
import com.github.DooMx3.inzynierka.entities.Harvest;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record HarvestResponse(
    UUID id, List<FieldResponse> fields, int amountKg, LocalDate harvestDate, boolean active) {

  public static HarvestResponse from(Harvest harvest) {
    return new HarvestResponse(
        harvest.getId(),
        harvest.getFields().stream().map(FieldResponse::from).toList(),
        harvest.getAmountKg(),
        harvest.getHarvestDate(),
        harvest.isActive());
  }
}
