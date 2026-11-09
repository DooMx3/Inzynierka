package com.github.DooMx3.inzynierka.dto.equipment;

import com.github.DooMx3.inzynierka.entities.Equipment;
import java.time.LocalDate;
import java.util.UUID;

public record EquipmentResponse(
    UUID id, String name, String type, LocalDate endOfTechnicalInspection, boolean active) {

  public static EquipmentResponse from(Equipment equipment) {
    return new EquipmentResponse(
        equipment.getId(),
        equipment.getName(),
        equipment.getType(),
        equipment.getEndOfTechnicalInspection(),
        equipment.isActive());
  }
}
