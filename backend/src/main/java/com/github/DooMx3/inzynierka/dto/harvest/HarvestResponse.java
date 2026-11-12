package com.github.DooMx3.inzynierka.dto.harvest;

import com.github.DooMx3.inzynierka.entities.Harvest;
import com.github.DooMx3.inzynierka.enums.GrapeVariety;
import java.time.LocalDate;
import java.util.UUID;

public record HarvestResponse(
    UUID id,
    UUID fieldId,
    GrapeVariety grapeVariety,
    String grapeVarietyName,
    int amountKg,
    LocalDate harvestDate,
    boolean active) {

  public static HarvestResponse from(Harvest harvest) {
    GrapeVariety grapeVariety = harvest.getField().getGrapeVariety();
    String grapeVarietyName =
        grapeVariety == GrapeVariety.OTHER
            ? harvest.getField().getOtherGrapeVariety()
            : grapeVariety.getDisplayName();
    return new HarvestResponse(
        harvest.getId(),
        harvest.getField().getId(),
        grapeVariety,
        grapeVarietyName,
        harvest.getAmountKg(),
        harvest.getHarvestDate(),
        harvest.isActive());
  }
}
