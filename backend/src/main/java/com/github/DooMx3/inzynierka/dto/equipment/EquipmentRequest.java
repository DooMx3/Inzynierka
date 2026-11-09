package com.github.DooMx3.inzynierka.dto.equipment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record EquipmentRequest(
    @NotBlank @Size(max = 255) String name,
    @NotBlank @Size(max = 100) String type,
    LocalDate endOfTechnicalInspection) {}
