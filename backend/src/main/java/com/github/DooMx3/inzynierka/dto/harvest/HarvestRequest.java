package com.github.DooMx3.inzynierka.dto.harvest;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import java.util.UUID;

public record HarvestRequest(
    @NotNull UUID fieldId, @NotNull @Positive Integer amountKg, @NotNull LocalDate harvestDate) {}
