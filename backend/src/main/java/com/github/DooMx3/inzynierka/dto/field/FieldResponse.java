package com.github.DooMx3.inzynierka.dto.field;

import com.github.DooMx3.inzynierka.entities.Field;
import com.github.DooMx3.inzynierka.enums.GrapeColor;
import com.github.DooMx3.inzynierka.enums.GrapeVariety;
import java.math.BigDecimal;
import java.util.UUID;

public record FieldResponse(
    UUID id,
    BigDecimal areaAre,
    GrapeVariety grapeVariety,
    String grapeVarietyName,
    GrapeColor grapeColor,
    boolean active) {

  public static FieldResponse from(Field field) {
    String varietyName =
        field.getGrapeVariety() == GrapeVariety.OTHER
            ? field.getOtherGrapeVariety()
            : field.getGrapeVariety().getDisplayName();
    return new FieldResponse(
        field.getId(),
        field.getAreaAre(),
        field.getGrapeVariety(),
        varietyName,
        field.getGrapeColor(),
        field.isActive());
  }
}
