package com.github.DooMx3.inzynierka.dto.batch;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;

public record HarvestBatchRequest(
    @NotNull UUID harvestId,
    @NotNull @Positive @Digits(integer = 8, fraction = 2) BigDecimal quantity) {}
