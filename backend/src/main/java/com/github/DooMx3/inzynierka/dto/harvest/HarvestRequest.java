package com.github.DooMx3.inzynierka.dto.harvest;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

public record HarvestRequest(
    @NotEmpty Set<@NotNull UUID> fieldIds,
    @NotNull @Positive Integer amountKg,
    @NotNull LocalDate harvestDate) {}
